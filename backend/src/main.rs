use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod errors;
mod handlers;
mod middleware;
mod models;
mod routes;

use config::Config;
use handlers::auth::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "automarket=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = Config::from_env()?;
    tracing::info!("Starting AutoMarket backend on {}:{}", config.server_host, config.server_port);

    // Connect to database
    let pool = db::create_pool(&config).await?;
    tracing::info!("Database connected");

    // Run migrations
    db::run_migrations(&pool).await?;
    tracing::info!("Migrations applied");

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build app state
    let state = AppState {
        db: pool,
        config: config.clone(),
    };

    // Create router
    let app = routes::create_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    // Start server
    let addr: SocketAddr = format!("{}:{}", config.server_host, config.server_port)
        .parse()
        .expect("Invalid address");

    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
