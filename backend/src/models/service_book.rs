use bigdecimal::BigDecimal;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ServiceBookEntry {
    pub id: Uuid,
    pub vehicle_id: Uuid,
    pub order_id: Option<Uuid>,
    pub master_id: Option<Uuid>,
    pub entry_type: String, // oil_change | filter | brake_pads | ...
    pub title: String,
    pub description: Option<String>,
    pub mileage_at_service: i32,
    pub next_service_mileage: Option<i32>,
    pub next_service_date: Option<NaiveDate>,
    pub parts_used: Option<Value>,
    pub cost: Option<BigDecimal>,
    pub receipt_url: Option<String>,
    pub serviced_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateServiceBookEntryRequest {
    pub entry_type: String,
    pub title: String,
    pub description: Option<String>,
    pub mileage_at_service: i32,
    pub next_service_mileage: Option<i32>,
    pub next_service_date: Option<NaiveDate>,
    pub parts_used: Option<Value>,
    pub cost: Option<f64>,
    pub receipt_url: Option<String>,
    pub serviced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Reminder {
    pub id: Uuid,
    pub vehicle_id: Uuid,
    pub user_id: Uuid,
    pub reminder_type: String, // 'mileage' | 'date'
    pub title: String,
    pub message: Option<String>,
    pub trigger_mileage: Option<i32>,
    pub trigger_date: Option<NaiveDate>,
    pub is_sent: Option<bool>,
    pub is_dismissed: Option<bool>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ServiceBookSummary {
    pub entries: Vec<ServiceBookEntry>,
    pub active_reminders: Vec<Reminder>,
    pub last_oil_change: Option<ServiceBookEntry>,
    pub last_service_mileage: Option<i32>,
}
