use axum::{extract::State, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::Config,
    errors::{AppError, AppResult},
    models::user::{AuthResponse, Claims, LoginRequest, RegisterRequest, User, UserPublic},
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Config,
}

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<Json<AuthResponse>> {
    // Validate role
    let role = req.role.unwrap_or_else(|| "client".to_string());
    if role != "client" && role != "master" {
        return Err(AppError::BadRequest(
            "Role must be 'client' or 'master'".to_string(),
        ));
    }

    // Check if email already exists
    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = $1")
        .bind(&req.email)
        .fetch_one(&state.db)
        .await?;

    if existing > 0 {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    // Hash password
    let password_hash =
        hash(&req.password, DEFAULT_COST).map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    // Create user
    let user = sqlx::query_as::<_, User>(
        r#"INSERT INTO users (email, password_hash, full_name, phone, role)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *"#,
    )
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.full_name)
    .bind(&req.phone)
    .bind(&role)
    .fetch_one(&state.db)
    .await?;

    // If master, create empty master profile
    if role == "master" {
        sqlx::query("INSERT INTO master_profiles (user_id) VALUES ($1)")
            .bind(user.id)
            .execute(&state.db)
            .await?;
    }

    let token = generate_token(&user, &state.config)?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic::from(user),
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let user =
        sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1 AND is_active = true")
            .bind(&req.email)
            .fetch_optional(&state.db)
            .await?
            .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

    let valid = verify(&req.password, &user.password_hash)
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    if !valid {
        return Err(AppError::Unauthorized(
            "Invalid email or password".to_string(),
        ));
    }

    let token = generate_token(&user, &state.config)?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic::from(user),
    }))
}

pub async fn me(State(state): State<AppState>, claims: Claims) -> AppResult<Json<UserPublic>> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::BadRequest("Invalid user ID".to_string()))?;

    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1 AND is_active = true")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await?
        // Deleted or blocked: the app treats 401 as "sign out"
        .ok_or_else(|| AppError::Unauthorized("User not found".to_string()))?;

    Ok(Json(UserPublic::from(user)))
}

fn generate_token(user: &User, config: &Config) -> AppResult<String> {
    let now = Utc::now();
    let exp = now + Duration::hours(config.jwt_expiration_hours);

    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        role: user.role.clone(),
        iat: now.timestamp() as usize,
        exp: exp.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))
}
