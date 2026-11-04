use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub client_id: Uuid,
    pub master_id: Option<Uuid>,
    pub vehicle_id: Option<Uuid>,
    pub service_id: Option<Uuid>,
    pub status: String, // open | accepted | in_progress | completed | cancelled
    pub service_type: String, // 'sos' | 'planned'
    pub title: String,
    pub description: Option<String>,
    pub address: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub price_agreed: Option<BigDecimal>,
    pub payment_status: Option<String>,
    pub client_rating: Option<i32>,
    pub client_review: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Client's vehicle attached to an order, shown to masters.
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct OrderVehicleInfo {
    pub vehicle_make: Option<String>,
    pub vehicle_model: Option<String>,
    pub vehicle_year: Option<i32>,
    pub vehicle_engine_type: Option<String>,
    pub vehicle_engine_volume: Option<String>,
    pub vehicle_transmission: Option<String>,
    pub vehicle_mileage: Option<i32>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct OrderListItem {
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub order: Order,
    pub counterparty_name: Option<String>,
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub vehicle: OrderVehicleInfo,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct OrderDetail {
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub order: Order,
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub vehicle: OrderVehicleInfo,
}

#[derive(Debug, Deserialize)]
pub struct CreateOrderRequest {
    pub vehicle_id: Option<Uuid>,
    pub service_id: Option<Uuid>,
    pub service_type: String,
    pub title: String,
    pub description: Option<String>,
    pub address: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub scheduled_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOrderStatusRequest {
    pub status: String,
    pub price_agreed: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct RateOrderRequest {
    pub rating: i32,
    pub review: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OrderFilter {
    pub status: Option<String>,
    pub service_type: Option<String>,
}
