use axum::{
    extract::{Path, Query, State},
    Json,
};
use bigdecimal::BigDecimal;
use std::str::FromStr;
use uuid::Uuid;

use crate::{
    errors::{AppError, AppResult},
    geo::distance_km_sql,
    handlers::auth::AppState,
    models::{
        order::{
            CreateOrderRequest, Order, OrderDetail, OrderFilter, OrderListItem, RateOrderRequest,
            UpdateOrderStatusRequest,
        },
        user::Claims,
    },
    push::{notify_order, OrderEvent},
};

const ORDER_VEHICLE_COLUMNS: &str =
    "v.make AS vehicle_make, v.model AS vehicle_model, v.year AS vehicle_year,
     v.engine_type AS vehicle_engine_type, v.engine_volume AS vehicle_engine_volume,
     v.transmission AS vehicle_transmission, v.current_mileage AS vehicle_mileage";

const ORDER_TITLE_KK: &str =
    "(SELECT name_kk FROM service_categories WHERE name = o.title LIMIT 1) AS title_kk";

/// Distance from the viewing master (joined as `me`) to the order
fn order_distance_column() -> String {
    format!(
        "{} AS distance_km",
        distance_km_sql("me.latitude", "me.longitude", "o.latitude", "o.longitude")
    )
}

pub async fn list_orders(
    State(state): State<AppState>,
    claims: Claims,
    Query(filter): Query<OrderFilter>,
) -> AppResult<Json<Vec<OrderListItem>>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let mut query = if claims.role == "master" {
        let distance = order_distance_column();
        format!(
            "SELECT o.*, COALESCE(mp.company_name, client.full_name) AS counterparty_name,
                {ORDER_VEHICLE_COLUMNS}, {ORDER_TITLE_KK}, {distance}
         FROM orders o
         JOIN users client ON client.id = o.client_id
         LEFT JOIN master_profiles me ON me.user_id = $1
         LEFT JOIN vehicles v ON v.id = o.vehicle_id
         LEFT JOIN users master ON master.id = o.master_id
         LEFT JOIN master_profiles mp ON mp.user_id = master.id
         WHERE (o.master_id = $1 OR (o.status = 'open' AND o.master_id IS NULL))"
        )
    } else {
        format!(
            "SELECT o.*, COALESCE(mp.company_name, master.full_name) AS counterparty_name,
                {ORDER_VEHICLE_COLUMNS}, {ORDER_TITLE_KK}, NULL::float8 AS distance_km
         FROM orders o
         LEFT JOIN vehicles v ON v.id = o.vehicle_id
         LEFT JOIN users master ON master.id = o.master_id
         LEFT JOIN master_profiles mp ON mp.user_id = master.id
         WHERE o.client_id = $1"
        )
    };

    let mut conditions = vec![];
    let mut bind_idx = 2;
    if filter.status.is_some() {
        conditions.push(format!("o.status = ${bind_idx}"));
        bind_idx += 1;
    }
    if filter.service_type.is_some() {
        conditions.push(format!("o.service_type = ${bind_idx}"));
    }

    if !conditions.is_empty() {
        query += &format!(" AND {}", conditions.join(" AND "));
    }
    query += " ORDER BY o.created_at DESC";

    let mut q = sqlx::query_as::<_, OrderListItem>(&query).bind(user_id);

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
) -> AppResult<Json<OrderDetail>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let distance = if claims.role == "master" {
        order_distance_column()
    } else {
        "NULL::float8 AS distance_km".to_string()
    };
    // $2 is always the viewer, so `me` is empty for clients
    let select = format!(
        "SELECT o.*, {ORDER_VEHICLE_COLUMNS}, {ORDER_TITLE_KK}, {distance}
         FROM orders o
         LEFT JOIN vehicles v ON v.id = o.vehicle_id
         LEFT JOIN master_profiles me ON me.user_id = $2"
    );

    // Masters can view any open order or orders assigned to them
    // Clients can only view their own orders
    let order = if claims.role == "master" {
        sqlx::query_as::<_, OrderDetail>(&format!(
            "{select} WHERE o.id = $1 AND (o.master_id = $2 OR o.status = 'open')"
        ))
        .bind(order_id)
        .bind(user_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?
    } else {
        sqlx::query_as::<_, OrderDetail>(&format!(
            "{select} WHERE o.id = $1 AND o.client_id = $2"
        ))
        .bind(order_id)
        .bind(user_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".to_string()))?
    };

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

    let (master_id, service_type) = if let Some(service_id) = req.service_id {
        let (master_id, service_type) = sqlx::query_as::<_, (Uuid, String)>(
            "SELECT s.master_id, sc.service_type
             FROM services s
             JOIN service_categories sc ON sc.id = s.category_id
             WHERE s.id = $1 AND s.is_active = true",
        )
        .bind(service_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Service not found".to_string()))?;
        (Some(master_id), service_type)
    } else {
        if req.service_type != "sos" && req.service_type != "planned" {
            return Err(AppError::BadRequest(
                "Service type must be 'sos' or 'planned'".to_string(),
            ));
        }
        (None, req.service_type.clone())
    };

    if req.title.trim().is_empty() {
        return Err(AppError::BadRequest(
            "Order title must not be empty".to_string(),
        ));
    }

    if !req.client_price.is_finite() || req.client_price <= 0.0 {
        return Err(AppError::BadRequest(
            "Client price must be greater than zero".to_string(),
        ));
    }
    let client_price = BigDecimal::from_str(&req.client_price.to_string())
        .map_err(|_| AppError::BadRequest("Invalid price format".to_string()))?;

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
           (client_id, master_id, vehicle_id, service_id, service_type, title, description,
            address, latitude, longitude, scheduled_at, client_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *"#,
    )
    .bind(client_id)
    .bind(master_id)
    .bind(req.vehicle_id)
    .bind(req.service_id)
    .bind(service_type)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.address)
    .bind(req.latitude)
    .bind(req.longitude)
    .bind(req.scheduled_at)
    .bind(client_price)
    .fetch_one(&state.db)
    .await?;

    notify_order(&state, order.id, OrderEvent::Created);

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
    // NOTE: master can no longer directly "accept" an order — that is handled
    //       through the /offers endpoint (price offer system).
    let valid_transition = match (
        claims.role.as_str(),
        order.status.as_str(),
        req.status.as_str(),
    ) {
        // Master: move their accepted order through the workflow
        ("master", "accepted", "in_progress") => order.master_id == Some(user_id),
        ("master", "in_progress", "completed") => order.master_id == Some(user_id),
        ("master", _, "cancelled") => order.master_id == Some(user_id),
        // Client: cancel their own order at any non-terminal stage
        ("client", "open", "cancelled") => order.client_id == user_id,
        ("client", "accepted", "cancelled") => order.client_id == user_id,
        ("client", "in_progress", "cancelled") => order.client_id == user_id,
        _ => false,
    };

    if !valid_transition {
        return Err(AppError::BadRequest(format!(
            "Invalid status transition from '{}' to '{}'",
            order.status, req.status
        )));
    }

    let updated_order = sqlx::query_as::<_, Order>(
        "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    )
    .bind(&req.status)
    .bind(order_id)
    .fetch_one(&state.db)
    .await?;

    notify_order(
        &state,
        order_id,
        OrderEvent::StatusChanged {
            status: req.status.clone(),
            by_master: claims.role == "master",
        },
    );

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
