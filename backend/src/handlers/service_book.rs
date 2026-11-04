use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::{
    errors::{AppError, AppResult},
    handlers::auth::AppState,
    models::{
        service_book::{
            CreateServiceBookEntryRequest, Reminder, ServiceBookEntry, ServiceBookSummary,
        },
        user::Claims,
    },
};

pub async fn get_service_book(
    State(state): State<AppState>,
    claims: Claims,
    Path(vehicle_id): Path<Uuid>,
) -> AppResult<Json<ServiceBookSummary>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Verify vehicle ownership
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM vehicles WHERE id = $1 AND owner_id = $2",
    )
    .bind(vehicle_id)
    .bind(owner_id)
    .fetch_one(&state.db)
    .await?;

    if count == 0 {
        return Err(AppError::NotFound("Vehicle not found".to_string()));
    }

    let entries = sqlx::query_as::<_, ServiceBookEntry>(
        "SELECT * FROM service_book_entries WHERE vehicle_id = $1 ORDER BY serviced_at DESC",
    )
    .bind(vehicle_id)
    .fetch_all(&state.db)
    .await?;

    let active_reminders = sqlx::query_as::<_, Reminder>(
        "SELECT * FROM reminders WHERE vehicle_id = $1 AND is_dismissed = false ORDER BY created_at DESC"
    )
    .bind(vehicle_id)
    .fetch_all(&state.db)
    .await?;

    let last_oil_change = entries
        .iter()
        .find(|e| e.entry_type == "oil_change")
        .cloned();

    let last_service_mileage = entries.first().map(|e| e.mileage_at_service);

    Ok(Json(ServiceBookSummary {
        entries,
        active_reminders,
        last_oil_change,
        last_service_mileage,
    }))
}

pub async fn add_service_book_entry(
    State(state): State<AppState>,
    claims: Claims,
    Path(vehicle_id): Path<Uuid>,
    Json(req): Json<CreateServiceBookEntryRequest>,
) -> AppResult<Json<ServiceBookEntry>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Check access: owner or master
    let can_access = if claims.role == "client" {
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM vehicles WHERE id = $1 AND owner_id = $2",
        )
        .bind(vehicle_id)
        .bind(user_id)
        .fetch_one(&state.db)
        .await?
            > 0
    } else {
        // Masters can add entries if they have a completed order for this vehicle
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM orders WHERE vehicle_id = $1 AND master_id = $2 AND status = 'completed'"
        )
        .bind(vehicle_id)
        .bind(user_id)
        .fetch_one(&state.db)
        .await? > 0
    };

    if !can_access {
        return Err(AppError::Forbidden(
            "Access denied to this vehicle".to_string(),
        ));
    }

    let master_id = if claims.role == "master" {
        Some(user_id)
    } else {
        None
    };
    let serviced_at = req.serviced_at.unwrap_or_else(chrono::Utc::now);

    let entry = sqlx::query_as::<_, ServiceBookEntry>(
        r#"INSERT INTO service_book_entries
           (vehicle_id, master_id, entry_type, title, description,
            mileage_at_service, next_service_mileage, next_service_date,
            parts_used, cost, receipt_url, serviced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *"#,
    )
    .bind(vehicle_id)
    .bind(master_id)
    .bind(&req.entry_type)
    .bind(&req.title)
    .bind(&req.description)
    .bind(req.mileage_at_service)
    .bind(req.next_service_mileage)
    .bind(req.next_service_date)
    .bind(&req.parts_used)
    .bind(req.cost)
    .bind(&req.receipt_url)
    .bind(serviced_at)
    .fetch_one(&state.db)
    .await?;

    // Update vehicle current mileage
    sqlx::query(
        "UPDATE vehicles SET current_mileage = $1, updated_at = NOW() WHERE id = $2 AND current_mileage < $1"
    )
    .bind(req.mileage_at_service)
    .bind(vehicle_id)
    .execute(&state.db)
    .await?;

    // Auto-create reminder if next service mileage set
    if let Some(next_km) = req.next_service_mileage {
        let vehicle_owner: Option<Uuid> =
            sqlx::query_scalar("SELECT owner_id FROM vehicles WHERE id = $1")
                .bind(vehicle_id)
                .fetch_optional(&state.db)
                .await?;

        if let Some(owner_id) = vehicle_owner {
            sqlx::query(
                r#"INSERT INTO reminders (vehicle_id, user_id, reminder_type, title, message, trigger_mileage)
                   VALUES ($1, $2, 'mileage', $3, $4, $5)"#,
            )
            .bind(vehicle_id)
            .bind(owner_id)
            .bind(format!("Пора: {}", req.title))
            .bind(format!("Запланировано следующее ТО через {} км", next_km))
            .bind(next_km)
            .execute(&state.db)
            .await?;
        }
    }

    Ok(Json(entry))
}

pub async fn get_reminders(
    State(state): State<AppState>,
    claims: Claims,
    Path(vehicle_id): Path<Uuid>,
) -> AppResult<Json<Vec<Reminder>>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let reminders = sqlx::query_as::<_, Reminder>(
        r#"SELECT r.* FROM reminders r
           JOIN vehicles v ON r.vehicle_id = v.id
           WHERE r.vehicle_id = $1 AND v.owner_id = $2 AND r.is_dismissed = false
           ORDER BY r.created_at DESC"#,
    )
    .bind(vehicle_id)
    .bind(owner_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(reminders))
}

pub async fn dismiss_reminder(
    State(state): State<AppState>,
    claims: Claims,
    Path((_vehicle_id, reminder_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<serde_json::Value>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let result =
        sqlx::query("UPDATE reminders SET is_dismissed = true WHERE id = $1 AND user_id = $2")
            .bind(reminder_id)
            .bind(owner_id)
            .execute(&state.db)
            .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Reminder not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "message": "Reminder dismissed" })))
}

pub async fn delete_service_book_entry(
    State(state): State<AppState>,
    claims: Claims,
    Path((vehicle_id, entry_id)): Path<(Uuid, Uuid)>,
) -> AppResult<Json<serde_json::Value>> {
    let owner_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let result = sqlx::query(
        r#"DELETE FROM service_book_entries e
           USING vehicles v
           WHERE e.id = $1 AND e.vehicle_id = $2 AND v.id = e.vehicle_id AND v.owner_id = $3"#,
    )
    .bind(entry_id)
    .bind(vehicle_id)
    .bind(owner_id)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Service book entry not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "message": "Service book entry deleted" })))
}
