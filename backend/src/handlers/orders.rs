use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::{
    errors::{AppError, AppResult},
    handlers::auth::AppState,
    models::{
        order::{
            CreateOrderRequest, Order, OrderFilter, RateOrderRequest, UpdateOrderStatusRequest,
        },
        user::Claims,
    },
};

pub async fn list_orders(
    State(state): State<AppState>,
    claims: Claims,
    Query(filter): Query<OrderFilter>,
) -> AppResult<Json<Vec<Order>>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let mut query = if claims.role == "master" {
        "SELECT * FROM orders WHERE master_id = $1".to_string()
    } else {
        "SELECT * FROM orders WHERE client_id = $1".to_string()
    };

    // Also show open orders to masters (they can accept them)
    if claims.role == "master" {
        query = "SELECT * FROM orders WHERE (master_id = $1 OR (status = 'open' AND master_id IS NULL))".to_string();
    }

    let mut conditions = vec![];
    if filter.status.is_some() {
        conditions.push("status = $2");
    }
    if filter.service_type.is_some() {
        conditions.push("service_type = $3");
    }

    if !conditions.is_empty() {
        query += &format!(" AND {}", conditions.join(" AND "));
    }
    query += " ORDER BY created_at DESC";

    let mut q = sqlx::query_as::<_, Order>(&query).bind(user_id);

    if let Some(s) = &filter.status {
        q = q.bind(s);
    }
    if let Some(st) = &filter.service_type {
        q = q.bind(st);
    }

    let orders = q.fetch_all(&state.db).await?;

    Ok(Json(orders))
}

pub async fn get_order(
    State(state): State<AppState>,
    claims: Claims,
    Path(order_id): Path<Uuid>,
) -> AppResult<Json<Order>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let order = sqlx::query_as::<_, Order>(
        "SELECT * FROM orders WHERE id = $1 AND (client_id = $2 OR master_id = $2)",
    )
    .bind(order_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    Ok(Json(order))
}

pub async fn create_order(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<CreateOrderRequest>,
) -> AppResult<Json<Order>> {
    if claims.role != "client" {
        return Err(AppError::Forbidden(
            "Only clients can create orders".to_string(),
        ));
    }

    let client_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Validate vehicle ownership if provided
    if let Some(vehicle_id) = req.vehicle_id {
        let count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM vehicles WHERE id = $1 AND owner_id = $2",
        )
        .bind(vehicle_id)
        .bind(client_id)
        .fetch_one(&state.db)
        .await?;

        if count == 0 {
            return Err(AppError::NotFound("Vehicle not found".to_string()));
        }
    }

    let order = sqlx::query_as::<_, Order>(
        r#"INSERT INTO orders
           (client_id, vehicle_id, service_id, service_type, title, description,
            address, latitude, longitude, scheduled_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *"#,
    )
    .bind(client_id)
    .bind(req.vehicle_id)
    .bind(req.service_id)
    .bind(&req.service_type)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.address)
    .bind(req.latitude)
    .bind(req.longitude)
    .bind(req.scheduled_at)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(order))
}

pub async fn update_order_status(
    State(state): State<AppState>,
    claims: Claims,
    Path(order_id): Path<Uuid>,
    Json(req): Json<UpdateOrderStatusRequest>,
) -> AppResult<Json<Order>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let order = sqlx::query_as::<_, Order>("SELECT * FROM orders WHERE id = $1")
        .bind(order_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?;

    // Validate allowed status transitions
    let valid_transition = match (
        claims.role.as_str(),
        order.status.as_str(),
        req.status.as_str(),
    ) {
        ("master", "open", "accepted") => true,
        ("master", "accepted", "in_progress") => true,
        ("master", "in_progress", "completed") => true,
        ("client", _, "cancelled") => true,
        ("master", _, "cancelled") => true,
        _ => false,
    };

    if !valid_transition {
        return Err(AppError::BadRequest(format!(
            "Invalid status transition from '{}' to '{}'",
            order.status, req.status
        )));
    }

    let updated_order =
        if claims.role == "master" && order.status == "open" && req.status == "accepted" {
            // Master accepts the order
            sqlx::query_as::<_, Order>(
                r#"UPDATE orders SET
               status = $1, master_id = $2, price_agreed = $3, updated_at = NOW()
               WHERE id = $4
               RETURNING *"#,
            )
            .bind(&req.status)
            .bind(user_id)
            .bind(req.price_agreed)
            .bind(order_id)
            .fetch_one(&state.db)
            .await?
        } else {
            sqlx::query_as::<_, Order>(
                "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
            )
            .bind(&req.status)
            .bind(order_id)
            .fetch_one(&state.db)
            .await?
        };

    Ok(Json(updated_order))
}

pub async fn rate_order(
    State(state): State<AppState>,
    claims: Claims,
    Path(order_id): Path<Uuid>,
    Json(req): Json<RateOrderRequest>,
) -> AppResult<Json<Order>> {
    if claims.role != "client" {
        return Err(AppError::Forbidden(
            "Only clients can rate orders".to_string(),
        ));
    }

    let client_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    if req.rating < 1 || req.rating > 5 {
        return Err(AppError::BadRequest(
            "Rating must be between 1 and 5".to_string(),
        ));
    }

    let order = sqlx::query_as::<_, Order>(
        r#"UPDATE orders
           SET client_rating = $1, client_review = $2, updated_at = NOW()
           WHERE id = $3 AND client_id = $4 AND status = 'completed'
           RETURNING *"#,
    )
    .bind(req.rating)
    .bind(&req.review)
    .bind(order_id)
    .bind(client_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Completed order not found".to_string()))?;

    // Update master rating
    if let Some(master_id) = order.master_id {
        sqlx::query(
            r#"UPDATE master_profiles SET
               rating = (SELECT AVG(client_rating)::DECIMAL(3,2) FROM orders WHERE master_id = $1 AND client_rating IS NOT NULL),
               review_count = (SELECT COUNT(*) FROM orders WHERE master_id = $1 AND client_rating IS NOT NULL),
               updated_at = NOW()
               WHERE user_id = $1"#,
        )
        .bind(master_id)
        .execute(&state.db)
        .await?;
    }

    Ok(Json(order))
}
