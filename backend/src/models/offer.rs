use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Насколько мастер может поднять цену клиента (₸)
pub const MAX_OFFER_MARKUP: i64 = 10_000;

/// Статус предложения мастера
/// pending  — ожидает ответа клиента
/// accepted — клиент принял предложение
/// declined — клиент отклонил или заявка закрыта другим образом
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderOffer {
    pub id: Uuid,
    pub order_id: Uuid,
    pub master_id: Uuid,
    pub price: BigDecimal,
    pub comment: Option<String>,
    pub status: String, // pending | accepted | declined
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Расширенное представление для отображения клиенту — включает данные мастера
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderOfferWithMaster {
    pub id: Uuid,
    pub order_id: Uuid,
    pub master_id: Uuid,
    pub price: BigDecimal,
    pub comment: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // Данные мастера (JOIN)
    pub master_name: Option<String>,
    pub master_company: Option<String>,
    pub master_rating: Option<BigDecimal>,
    pub master_review_count: Option<i32>,
}

/// Запрос мастера на создание предложения
#[derive(Debug, Deserialize)]
pub struct CreateOfferRequest {
    pub price: f64,
    pub comment: Option<String>,
}
