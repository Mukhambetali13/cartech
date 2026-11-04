use dotenvy::dotenv;
use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
    pub server_host: String,
    pub server_port: u16,
    /// Optional Expo access token (only needed if push security is enabled in Expo)
    pub expo_access_token: Option<String>,
    /// Contact shown on the privacy policy and account deletion pages
    pub support_email: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenv().ok();

        Ok(Config {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            jwt_expiration_hours: env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .expect("JWT_EXPIRATION_HOURS must be a number"),
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("SERVER_PORT must be a number"),
            expo_access_token: env::var("EXPO_ACCESS_TOKEN").ok().filter(|t| !t.is_empty()),
            support_email: env::var("SUPPORT_EMAIL").unwrap_or_else(|_| {
                tracing::warn!("SUPPORT_EMAIL is not set; public pages will show a placeholder");
                "support@example.com".to_string()
            }),
        })
    }
}
