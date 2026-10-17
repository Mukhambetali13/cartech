use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ServiceCategory {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub icon: Option<String>,
    pub service_type: String, // 'sos' | 'planned'
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Service {
    pub id: Uuid,
    pub master_id: Uuid,
    pub category_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub price_from: Option<BigDecimal>,
    pub price_to: Option<BigDecimal>,
    pub duration_minutes: Option<i32>,
    pub is_mobile: bool,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ServiceCatalogItem {
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub service: Service,
    pub master_name: String,
    pub master_company: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ServiceWithCategory {
    #[serde(flatten)]
    pub service: Service,
    pub category: ServiceCategory,
}

#[derive(Debug, Deserialize)]
pub struct CreateServiceRequest {
    pub category_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub price_from: Option<f64>,
    pub price_to: Option<f64>,
    pub duration_minutes: Option<i32>,
    pub is_mobile: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ServiceFilter {
    pub service_type: Option<String>, // 'sos' | 'planned'
    pub category_slug: Option<String>,
    pub is_mobile: Option<bool>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
}
