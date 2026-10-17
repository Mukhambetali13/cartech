use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Vehicle {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub make: String,
    pub model: String,
    pub year: i32,
    pub vin: Option<String>,
    pub plate_number: Option<String>,
    pub color: Option<String>,
    pub engine_type: Option<String>,
    pub transmission: Option<String>,
    pub current_mileage: Option<i32>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVehicleRequest {
    pub make: String,
    pub model: String,
    pub year: i32,
    pub vin: Option<String>,
    pub plate_number: Option<String>,
    pub color: Option<String>,
    pub engine_type: Option<String>,
    pub transmission: Option<String>,
    pub current_mileage: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVehicleRequest {
    pub make: Option<String>,
    pub model: Option<String>,
    pub year: Option<i32>,
    pub vin: Option<String>,
    pub plate_number: Option<String>,
    pub color: Option<String>,
    pub engine_type: Option<String>,
    pub transmission: Option<String>,
    pub current_mileage: Option<i32>,
    pub notes: Option<String>,
}
