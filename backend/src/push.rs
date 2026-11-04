//! Push notifications through the Expo push service.
//! Sending is fire-and-forget: failures are logged and never fail the request.

use bigdecimal::BigDecimal;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{geo::distance_km_sql, handlers::auth::AppState};

const EXPO_PUSH_URL: &str = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE: usize = 100;

pub enum OrderEvent {
    /// New order: goes to the chosen master, or to masters nearby for open orders
    Created,
    NewOffer { price: BigDecimal },
    OfferAccepted,
    StatusChanged { status: String, by_master: bool },
}

#[derive(sqlx::FromRow)]
struct OrderInfo {
    client_id: Uuid,
    master_id: Option<Uuid>,
    service_type: String,
    title: String,
    title_kk: Option<String>,
    address: Option<String>,
    client_price: Option<BigDecimal>,
}

struct Text {
    title: String,
    body: String,
}

#[derive(sqlx::FromRow)]
struct Token {
    token: String,
    language: String,
}

pub fn notify_order(state: &AppState, order_id: Uuid, event: OrderEvent) {
    let db = state.db.clone();
    let access_token = state.config.expo_access_token.clone();
    tokio::spawn(async move {
        if let Err(e) = send_order_event(&db, access_token.as_deref(), order_id, event).await {
            tracing::warn!("push for order {order_id} failed: {e:#}");
        }
    });
}

async fn send_order_event(
    db: &PgPool,
    access_token: Option<&str>,
    order_id: Uuid,
    event: OrderEvent,
) -> anyhow::Result<()> {
    let order = sqlx::query_as::<_, OrderInfo>(
        "SELECT o.client_id, o.master_id, o.service_type, o.title, o.address, o.client_price,
                (SELECT name_kk FROM service_categories WHERE name = o.title LIMIT 1) AS title_kk
         FROM orders o WHERE o.id = $1",
    )
    .bind(order_id)
    .fetch_one(db)
    .await?;

    let tokens = match &event {
        OrderEvent::Created => match order.master_id {
            Some(master_id) => tokens_for(db, &[master_id]).await?,
            None => tokens_for_masters_near(db, order_id).await?,
        },
        OrderEvent::NewOffer { .. } => tokens_for(db, &[order.client_id]).await?,
        OrderEvent::OfferAccepted => tokens_for(db, &order.master_id.into_iter().collect::<Vec<_>>()).await?,
        OrderEvent::StatusChanged { by_master, .. } => {
            let recipient = if *by_master { Some(order.client_id) } else { order.master_id };
            tokens_for(db, &recipient.into_iter().collect::<Vec<_>>()).await?
        }
    };
    if tokens.is_empty() {
        return Ok(());
    }

    let messages: Vec<_> = tokens
        .iter()
        .map(|t| {
            let text = compose(&order, &event, t.language == "kk");
            json!({
                "to": t.token,
                "title": text.title,
                "body": text.body,
                "sound": "default",
                "channelId": "orders",
                "priority": "high",
                "data": { "orderId": order_id },
            })
        })
        .collect();

    send(db, access_token, &tokens, messages).await
}

fn money(value: &BigDecimal) -> String {
    format!("{} ₸", value.with_scale(0))
}

fn compose(order: &OrderInfo, event: &OrderEvent, kk: bool) -> Text {
    let title = if kk {
        order.title_kk.clone().unwrap_or_else(|| order.title.clone())
    } else {
        order.title.clone()
    };
    let sos = order.service_type == "sos";
    match event {
        OrderEvent::Created => {
            let mut body = title;
            if let Some(price) = &order.client_price {
                body += &format!(" · {}", money(price));
            }
            if let Some(address) = order.address.as_deref().filter(|a| !a.is_empty()) {
                body += &format!(" · {address}");
            }
            let heading = match (sos, kk) {
                (true, false) => "🆘 Новая SOS-заявка",
                (true, true) => "🆘 Жаңа SOS-өтінім",
                (false, false) => "📋 Новая заявка",
                (false, true) => "📋 Жаңа өтінім",
            };
            Text { title: heading.to_string(), body }
        }
        OrderEvent::NewOffer { price } => Text {
            title: if kk { "💰 Жаңа ұсыныс" } else { "💰 Новое предложение" }.to_string(),
            body: if kk {
                format!("{title}: шебер {} ұсынады", money(price))
            } else {
                format!("{title}: мастер предлагает {}", money(price))
            },
        },
        OrderEvent::OfferAccepted => Text {
            title: if kk { "✅ Ұсынысыңыз қабылданды" } else { "✅ Ваше предложение принято" }.to_string(),
            body: if kk {
                format!("{title} — клиент сізді таңдады")
            } else {
                format!("{title} — клиент выбрал вас")
            },
        },
        OrderEvent::StatusChanged { status, .. } => {
            let label = match (status.as_str(), kk) {
                ("in_progress", false) => "Мастер начал работу",
                ("in_progress", true) => "Шебер жұмысты бастады",
                ("completed", false) => "Работа завершена — оцените мастера",
                ("completed", true) => "Жұмыс аяқталды — шеберді бағалаңыз",
                ("cancelled", false) => "Заявка отменена",
                ("cancelled", true) => "Өтінім жойылды",
                (_, false) => "Статус заявки изменился",
                (_, true) => "Өтінім күйі өзгерді",
            };
            Text { title: label.to_string(), body: title }
        }
    }
}

async fn tokens_for(db: &PgPool, user_ids: &[Uuid]) -> anyhow::Result<Vec<Token>> {
    if user_ids.is_empty() {
        return Ok(vec![]);
    }
    Ok(sqlx::query_as::<_, Token>(
        "SELECT pt.token, pt.language FROM push_tokens pt
         JOIN users u ON u.id = pt.user_id
         WHERE pt.user_id = ANY($1) AND u.is_active = true",
    )
    .bind(user_ids)
    .fetch_all(db)
    .await?)
}

/// Masters who should hear about an open order. SOS orders only go to masters
/// within their work radius; masters without a known location get everything.
async fn tokens_for_masters_near(db: &PgPool, order_id: Uuid) -> anyhow::Result<Vec<Token>> {
    let distance = distance_km_sql("mp.latitude", "mp.longitude", "o.latitude", "o.longitude");
    Ok(sqlx::query_as::<_, Token>(&format!(
        "SELECT pt.token, pt.language
         FROM orders o
         JOIN users u ON u.role = 'master' AND u.is_active = true
         JOIN push_tokens pt ON pt.user_id = u.id
         LEFT JOIN master_profiles mp ON mp.user_id = u.id
         WHERE o.id = $1
           AND (o.service_type <> 'sos' OR o.latitude IS NULL OR mp.latitude IS NULL
                OR {distance} <= COALESCE(mp.work_radius_km, 20))"
    ))
    .bind(order_id)
    .fetch_all(db)
    .await?)
}

#[derive(Deserialize)]
struct ExpoResponse {
    #[serde(default)]
    data: Vec<ExpoTicket>,
}

#[derive(Deserialize)]
struct ExpoTicket {
    status: String,
    details: Option<serde_json::Value>,
}

async fn send(
    db: &PgPool,
    access_token: Option<&str>,
    tokens: &[Token],
    messages: Vec<serde_json::Value>,
) -> anyhow::Result<()> {
    let client = reqwest::Client::new();
    for (batch, batch_tokens) in messages.chunks(EXPO_BATCH_SIZE).zip(tokens.chunks(EXPO_BATCH_SIZE)) {
        let mut request = client.post(EXPO_PUSH_URL).json(batch);
        if let Some(token) = access_token {
            request = request.bearer_auth(token);
        }
        let response: ExpoResponse = request.send().await?.error_for_status()?.json().await?;

        // Forget devices that uninstalled the app or revoked permission
        let stale: Vec<&str> = response
            .data
            .iter()
            .zip(batch_tokens)
            .filter(|(ticket, _)| {
                ticket.status == "error"
                    && ticket.details.as_ref().and_then(|d| d.get("error")).and_then(|e| e.as_str())
                        == Some("DeviceNotRegistered")
            })
            .map(|(_, t)| t.token.as_str())
            .collect();
        if !stale.is_empty() {
            sqlx::query("DELETE FROM push_tokens WHERE token = ANY($1)")
                .bind(&stale)
                .execute(db)
                .await?;
        }
    }
    Ok(())
}
