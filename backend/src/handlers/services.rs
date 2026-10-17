use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::{
    errors::{AppError, AppResult},
    handlers::auth::AppState,
    models::{
        service::{CreateServiceRequest, Service, ServiceCategory, ServiceFilter},
        user::Claims,
    },
};

pub async fn list_categories(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<ServiceCategory>>> {
    let categories = sqlx::query_as::<_, ServiceCategory>(
        "SELECT * FROM service_categories ORDER BY sort_order ASC",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(categories))
}

pub async fn list_services(
    State(state): State<AppState>,
    Query(filter): Query<ServiceFilter>,
) -> AppResult<Json<Vec<Service>>> {
    // Build dynamic query based on filters
    let mut query = "SELECT s.* FROM services s
        JOIN service_categories sc ON s.category_id = sc.id
        WHERE s.is_active = true"
        .to_string();

    let mut conditions: Vec<String> = vec![];
    let mut param_idx = 1i32;

    if filter.service_type.is_some() {
        conditions.push(format!("sc.service_type = ${}", param_idx));
        param_idx += 1;
    }
    if filter.category_slug.is_some() {
        conditions.push(format!("sc.slug = ${}", param_idx));
        param_idx += 1;
    }
    if filter.is_mobile.is_some() {
        conditions.push(format!("s.is_mobile = ${}", param_idx));
        // param_idx += 1;  // last param, no need to increment
    }

    if !conditions.is_empty() {
        query += &format!(" AND {}", conditions.join(" AND "));
    }
    query += " ORDER BY s.created_at DESC";

    // Use simple query with all optional bindings
    let mut q = sqlx::query_as::<_, Service>(&query);
    if let Some(st) = &filter.service_type {
        q = q.bind(st);
    }
    if let Some(cs) = &filter.category_slug {
        q = q.bind(cs);
    }
    if let Some(im) = filter.is_mobile {
        q = q.bind(im);
    }

    let services = q.fetch_all(&state.db).await?;

    Ok(Json(services))
}

pub async fn get_service(
    State(state): State<AppState>,
    Path(service_id): Path<Uuid>,
) -> AppResult<Json<Service>> {
    let service =
        sqlx::query_as::<_, Service>("SELECT * FROM services WHERE id = $1 AND is_active = true")
            .bind(service_id)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::NotFound("Service not found".to_string()))?;

    Ok(Json(service))
}

pub async fn create_service(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<CreateServiceRequest>,
) -> AppResult<Json<Service>> {
    if claims.role != "master" {
        return Err(AppError::Forbidden(
            "Only masters can create services".to_string(),
        ));
    }

    let master_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    // Verify category exists
    let cat_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM service_categories WHERE id = $1")
            .bind(req.category_id)
            .fetch_one(&state.db)
            .await?;

    if cat_count == 0 {
        return Err(AppError::NotFound("Category not found".to_string()));
    }

    let service = sqlx::query_as::<_, Service>(
        r#"INSERT INTO services
           (master_id, category_id, title, description, price_from, price_to, duration_minutes, is_mobile)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *"#,
    )
    .bind(master_id)
    .bind(req.category_id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(req.price_from)
    .bind(req.price_to)
    .bind(req.duration_minutes)
    .bind(req.is_mobile.unwrap_or(false))
    .fetch_one(&state.db)
    .await?;

    Ok(Json(service))
}

pub async fn list_master_services(
    State(state): State<AppState>,
    claims: Claims,
) -> AppResult<Json<Vec<Service>>> {
    let master_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let services = sqlx::query_as::<_, Service>(
        "SELECT * FROM services WHERE master_id = $1 ORDER BY created_at DESC",
    )
    .bind(master_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(services))
}
