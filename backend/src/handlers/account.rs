use axum::{
    extract::State,
    response::Html,
    Json,
};
use bcrypt::verify;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    errors::{AppError, AppResult},
    handlers::auth::AppState,
    models::user::{Claims, User},
};

#[derive(Debug, Deserialize)]
pub struct DeleteAccountRequest {
    pub password: String,
}

/// DELETE /auth/me
/// Удаляет аккаунт: личные данные обезличиваются, машины и устройства удаляются,
/// активные заявки и предложения отменяются. История заказов остаётся у второй стороны.
pub async fn delete_account(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<DeleteAccountRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1 AND is_active = true")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::Unauthorized("User not found".to_string()))?;

    let valid = verify(&req.password, &user.password_hash)
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
    if !valid {
        return Err(AppError::Unauthorized("Invalid password".to_string()));
    }

    let mut tx = state.db.begin().await?;

    // Заявки клиента и заказы мастера, которые ещё не завершены
    sqlx::query(
        "UPDATE orders SET status = 'cancelled', updated_at = NOW()
         WHERE (client_id = $1 OR master_id = $1)
           AND status IN ('open', 'accepted', 'in_progress')",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "UPDATE order_offers SET status = 'declined', updated_at = NOW()
         WHERE master_id = $1 AND status = 'pending'",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query("UPDATE services SET is_active = false, updated_at = NOW() WHERE master_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "UPDATE master_profiles SET company_name = NULL, description = NULL, address = NULL,
            latitude = NULL, longitude = NULL, is_available = false, updated_at = NOW()
         WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM vehicles WHERE owner_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("DELETE FROM push_tokens WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query(
        "UPDATE users SET
            email = 'deleted-' || id || '@deleted.invalid',
            full_name = 'Удалённый пользователь',
            phone = NULL, avatar_url = NULL, password_hash = '!',
            is_active = false, deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({ "message": "Account deleted" })))
}

#[derive(Debug, Deserialize)]
pub struct UpdateLocationRequest {
    pub latitude: f64,
    pub longitude: f64,
}

/// PUT /auth/me/location
/// Мастер сообщает, где он сейчас — по этому считаются расстояние до заявок и SOS-рассылка.
pub async fn update_location(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<UpdateLocationRequest>,
) -> AppResult<Json<serde_json::Value>> {
    if claims.role != "master" {
        return Err(AppError::Forbidden("Only masters share location".to_string()));
    }
    if !(-90.0..=90.0).contains(&req.latitude) || !(-180.0..=180.0).contains(&req.longitude) {
        return Err(AppError::BadRequest("Invalid coordinates".to_string()));
    }
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    sqlx::query(
        "UPDATE master_profiles SET latitude = $1, longitude = $2, updated_at = NOW()
         WHERE user_id = $3",
    )
    .bind(req.latitude)
    .bind(req.longitude)
    .bind(user_id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "message": "Location updated" })))
}

#[derive(Debug, Deserialize)]
pub struct PushTokenRequest {
    pub token: String,
    pub platform: Option<String>,
    pub language: Option<String>,
}

/// POST /push-tokens — регистрирует устройство (или переносит его на текущего пользователя)
pub async fn register_push_token(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<PushTokenRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;
    if !req.token.starts_with("ExponentPushToken[") && !req.token.starts_with("ExpoPushToken[") {
        return Err(AppError::BadRequest("Invalid push token".to_string()));
    }
    let language = match req.language.as_deref() {
        Some("kk") => "kk",
        _ => "ru",
    };

    sqlx::query(
        "INSERT INTO push_tokens (user_id, token, platform, language)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id,
            platform = EXCLUDED.platform, language = EXCLUDED.language, updated_at = NOW()",
    )
    .bind(user_id)
    .bind(&req.token)
    .bind(&req.platform)
    .bind(language)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "message": "Token saved" })))
}

#[derive(Debug, Deserialize)]
pub struct DeletePushTokenRequest {
    pub token: String,
}

/// DELETE /push-tokens — при выходе из аккаунта устройство перестаёт получать уведомления
pub async fn delete_push_token(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<DeletePushTokenRequest>,
) -> AppResult<Json<serde_json::Value>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    sqlx::query("DELETE FROM push_tokens WHERE token = $1 AND user_id = $2")
        .bind(&req.token)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "message": "Token removed" })))
}

fn render_page(template: &str, state: &AppState) -> Html<String> {
    Html(template.replace("{{SUPPORT_EMAIL}}", &state.config.support_email))
}

/// GET /privacy — политика конфиденциальности (ссылка для Google Play)
pub async fn privacy_page(State(state): State<AppState>) -> Html<String> {
    render_page(include_str!("../../static/privacy.html"), &state)
}

/// GET /account-deletion — как удалить аккаунт (обязательная веб-ссылка для Google Play)
pub async fn account_deletion_page(State(state): State<AppState>) -> Html<String> {
    render_page(include_str!("../../static/account-deletion.html"), &state)
}
