use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use bigdecimal::BigDecimal;
use std::str::FromStr;
use uuid::Uuid;

use crate::{
    errors::{AppError, AppResult},
    handlers::auth::AppState,
    models::{
        offer::{CreateOfferRequest, OrderOffer, OrderOfferWithMaster, MAX_OFFER_MARKUP},
        user::Claims,
    },
    push::{notify_order, OrderEvent},
};

/// GET /orders/:id/offers
/// Клиент — видит все предложения по своей заявке.
/// Мастер — видит только своё предложение.
pub async fn list_offers(
    State(state): State<AppState>,
    claims: Claims,
    Path(order_id): Path<Uuid>,
) -> AppResult<Json<Vec<OrderOfferWithMaster>>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Проверяем доступ к заявке
    if claims.role == "client" {
        let count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM orders WHERE id = $1 AND client_id = $2",
        )
        .bind(order_id)
        .bind(user_id)
        .fetch_one(&state.db)
        .await?;
        if count == 0 {
            return Err(AppError::Forbidden("Not your order".to_string()));
        }
    }

    let offers = if claims.role == "client" {
        // Клиент видит все предложения
        sqlx::query_as::<_, OrderOfferWithMaster>(
            r#"SELECT
                oo.*,
                COALESCE(mp.company_name, u.full_name) AS master_name,
                mp.company_name AS master_company,
                mp.rating AS master_rating,
                mp.review_count AS master_review_count
               FROM order_offers oo
               JOIN users u ON u.id = oo.master_id
               LEFT JOIN master_profiles mp ON mp.user_id = oo.master_id
               WHERE oo.order_id = $1
               ORDER BY oo.price ASC, oo.created_at ASC"#,
        )
        .bind(order_id)
        .fetch_all(&state.db)
        .await?
    } else {
        // Мастер видит только своё предложение
        sqlx::query_as::<_, OrderOfferWithMaster>(
            r#"SELECT
                oo.*,
                COALESCE(mp.company_name, u.full_name) AS master_name,
                mp.company_name AS master_company,
                mp.rating AS master_rating,
                mp.review_count AS master_review_count
               FROM order_offers oo
               JOIN users u ON u.id = oo.master_id
               LEFT JOIN master_profiles mp ON mp.user_id = oo.master_id
               WHERE oo.order_id = $1 AND oo.master_id = $2
               ORDER BY oo.created_at DESC"#,
        )
        .bind(order_id)
        .bind(user_id)
        .fetch_all(&state.db)
        .await?
    };

    Ok(Json(offers))
}

/// POST /orders/:id/offers
/// Мастер создаёт предложение с ценой на открытую заявку.
/// Повторное предложение заменяет предыдущее (UPSERT).
pub async fn create_offer(
    State(state): State<AppState>,
    claims: Claims,
    Path(order_id): Path<Uuid>,
    Json(req): Json<CreateOfferRequest>,
) -> AppResult<(StatusCode, Json<OrderOffer>)> {
    if claims.role != "master" {
        return Err(AppError::Forbidden(
            "Only masters can make offers".to_string(),
        ));
    }

    let master_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    if req.price <= 0.0 {
        return Err(AppError::BadRequest(
            "Price must be greater than zero".to_string(),
        ));
    }

    // Проверяем, что заявка существует и открыта
    let (order_status, client_price) = sqlx::query_as::<_, (String, Option<BigDecimal>)>(
        "SELECT status, client_price FROM orders WHERE id = $1",
    )
    .bind(order_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    if order_status != "open" {
        return Err(AppError::Conflict(
            "This order is no longer accepting offers".to_string(),
        ));
    }

    let price = BigDecimal::from_str(&req.price.to_string())
        .map_err(|_| AppError::BadRequest("Invalid price format".to_string()))?;

    // Мастер может согласиться с ценой клиента или поднять её максимум на MAX_OFFER_MARKUP
    if let Some(client_price) = client_price {
        let max_price = &client_price + BigDecimal::from(MAX_OFFER_MARKUP);
        if price < client_price || price > max_price {
            return Err(AppError::BadRequest(format!(
                "Цена должна быть от {} до {} ₸",
                client_price.with_scale(0),
                max_price.with_scale(0)
            )));
        }
    }

    // UPSERT: если мастер уже делал предложение — обновляем
    let offer = sqlx::query_as::<_, OrderOffer>(
        r#"INSERT INTO order_offers (order_id, master_id, price, comment)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (order_id, master_id)
           DO UPDATE SET price = EXCLUDED.price, comment = EXCLUDED.comment,
                         status = 'pending', updated_at = NOW()
           RETURNING *"#,
    )
    .bind(order_id)
    .bind(master_id)
    .bind(price)
    .bind(&req.comment)
    .fetch_one(&state.db)
    .await?;

    notify_order(&state, order_id, OrderEvent::NewOffer { price: offer.price.clone() });

    Ok((StatusCode::CREATED, Json(offer)))
}

/// PUT /orders/:id/offers/:offer_id/accept
/// Клиент принимает предложение мастера.
/// → заявка переходит в accepted, все остальные оферы — declined.
pub async fn accept_offer(
    State(state): State<AppState>,
    claims: Claims,
    Path((order_id, offer_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<OrderOffer>> {
    if claims.role != "client" {
        return Err(AppError::Forbidden(
            "Only clients can accept offers".to_string(),
        ));
    }

    let client_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Проверяем владельца заявки и статус
    let order = sqlx::query_as::<_, (Uuid, String)>(
        "SELECT client_id, status FROM orders WHERE id = $1",
    )
    .bind(order_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    if order.0 != client_id {
        return Err(AppError::Forbidden("Not your order".to_string()));
    }
    if order.1 != "open" {
        return Err(AppError::Conflict(
            "Order is no longer open".to_string(),
        ));
    }

    // Получаем предложение
    let offer = sqlx::query_as::<_, OrderOffer>(
        "SELECT * FROM order_offers WHERE id = $1 AND order_id = $2 AND status = 'pending'",
    )
    .bind(offer_id)
    .bind(order_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Offer not found or already processed".to_string()))?;

    // Транзакция: принять предложение + обновить заявку + отклонить остальные
    let mut tx = state.db.begin().await?;

    // Принимаем выбранное предложение
    let accepted_offer = sqlx::query_as::<_, OrderOffer>(
        "UPDATE order_offers SET status = 'accepted', updated_at = NOW() WHERE id = $1 RETURNING *",
    )
    .bind(offer_id)
    .fetch_one(&mut *tx)
    .await?;

    // Обновляем заявку: статус, мастер, согласованная цена
    sqlx::query(
        r#"UPDATE orders SET
           status = 'accepted',
           master_id = $1,
           price_agreed = $2,
           updated_at = NOW()
           WHERE id = $3"#,
    )
    .bind(offer.master_id)
    .bind(&offer.price)
    .bind(order_id)
    .execute(&mut *tx)
    .await?;

    // Отклоняем все остальные предложения
    sqlx::query(
        "UPDATE order_offers SET status = 'declined', updated_at = NOW()
         WHERE order_id = $1 AND id != $2",
    )
    .bind(order_id)
    .bind(offer_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    notify_order(&state, order_id, OrderEvent::OfferAccepted);

    Ok(Json(accepted_offer))
}

/// PUT /orders/:id/offers/:offer_id/decline
/// Клиент отклоняет конкретное предложение мастера.
pub async fn decline_offer(
    State(state): State<AppState>,
    claims: Claims,
    Path((order_id, offer_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<OrderOffer>> {
    if claims.role != "client" {
        return Err(AppError::Forbidden(
            "Only clients can decline offers".to_string(),
        ));
    }

    let client_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Проверяем право на заявку
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM orders WHERE id = $1 AND client_id = $2",
    )
    .bind(order_id)
    .bind(client_id)
    .fetch_one(&state.db)
    .await?;

    if count == 0 {
        return Err(AppError::Forbidden("Not your order".to_string()));
    }

    let offer = sqlx::query_as::<_, OrderOffer>(
        r#"UPDATE order_offers SET status = 'declined', updated_at = NOW()
           WHERE id = $1 AND order_id = $2 AND status = 'pending'
           RETURNING *"#,
    )
    .bind(offer_id)
    .bind(order_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Offer not found or already processed".to_string()))?;

    Ok(Json(offer))
}
