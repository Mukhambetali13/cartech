use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::{
    errors::{AppError, AppResult},
    handlers::auth::AppState,
    models::{
        user::Claims,
        vehicle::{CreateVehicleRequest, UpdateVehicleRequest, Vehicle},
    },
};

pub async fn list_vehicles(
    State(state): State<AppState>,
    claims: Claims,
) -> AppResult<Json<Vec<Vehicle>>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let vehicles = sqlx::query_as::<_, Vehicle>(
        "SELECT * FROM vehicles WHERE owner_id = $1 ORDER BY created_at DESC"
    )
    .bind(owner_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(vehicles))
}

pub async fn get_vehicle(
    State(state): State<AppState>,
    claims: Claims,
    Path(vehicle_id): Path<Uuid>,
) -> AppResult<Json<Vehicle>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let vehicle = sqlx::query_as::<_, Vehicle>(
        "SELECT * FROM vehicles WHERE id = $1 AND owner_id = $2"
    )
    .bind(vehicle_id)
    .bind(owner_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Vehicle not found".to_string()))?;

    Ok(Json(vehicle))
}

pub async fn create_vehicle(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<CreateVehicleRequest>,
) -> AppResult<Json<Vehicle>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let vehicle = sqlx::query_as::<_, Vehicle>(
        r#"INSERT INTO vehicles
           (owner_id, make, model, year, vin, plate_number, color, engine_type, transmission, current_mileage, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *"#,
    )
    .bind(owner_id)
    .bind(&req.make)
    .bind(&req.model)
    .bind(req.year)
    .bind(&req.vin)
    .bind(&req.plate_number)
    .bind(&req.color)
    .bind(&req.engine_type)
    .bind(&req.transmission)
    .bind(req.current_mileage)
    .bind(&req.notes)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(vehicle))
}

pub async fn update_vehicle(
    State(state): State<AppState>,
    claims: Claims,
    Path(vehicle_id): Path<Uuid>,
    Json(req): Json<UpdateVehicleRequest>,
) -> AppResult<Json<Vehicle>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Check ownership
    let existing = sqlx::query_as::<_, Vehicle>(
        "SELECT * FROM vehicles WHERE id = $1 AND owner_id = $2"
    )
    .bind(vehicle_id)
    .bind(owner_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Vehicle not found".to_string()))?;

    let vehicle = sqlx::query_as::<_, Vehicle>(
        r#"UPDATE vehicles SET
           make = COALESCE($1, make),
           model = COALESCE($2, model),
           year = COALESCE($3, year),
           vin = COALESCE($4, vin),
           plate_number = COALESCE($5, plate_number),
           color = COALESCE($6, color),
           engine_type = COALESCE($7, engine_type),
           transmission = COALESCE($8, transmission),
           current_mileage = COALESCE($9, current_mileage),
           notes = COALESCE($10, notes),
           updated_at = NOW()
           WHERE id = $11
           RETURNING *"#,
    )
    .bind(&req.make)
    .bind(&req.model)
    .bind(req.year)
    .bind(&req.vin)
    .bind(&req.plate_number)
    .bind(&req.color)
    .bind(&req.engine_type)
    .bind(&req.transmission)
    .bind(req.current_mileage)
    .bind(&req.notes)
    .bind(existing.id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(vehicle))
}

pub async fn delete_vehicle(
    State(state): State<AppState>,
    claims: Claims,
    Path(vehicle_id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let result = sqlx::query(
        "DELETE FROM vehicles WHERE id = $1 AND owner_id = $2"
    )
    .bind(vehicle_id)
    .bind(owner_id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Vehicle not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "message": "Vehicle deleted successfully" })))
}
