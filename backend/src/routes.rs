use axum::{
    routing::{get, post, put},
    Router,
};

use crate::handlers::{
    auth::{login, me, register, AppState},
    offers::{accept_offer, create_offer, decline_offer, list_offers},
    orders::{create_order, get_order, list_orders, rate_order, update_order_status},
    service_book::{add_service_book_entry, dismiss_reminder, get_reminders, get_service_book},
    services::{create_service, get_service, list_categories, list_master_services, list_services},
    vehicles::{create_vehicle, delete_vehicle, get_vehicle, list_vehicles, update_vehicle},
};

pub fn create_router(state: AppState) -> Router {
    let api = Router::new()
        // Auth routes (public)
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(me))
        // Vehicles (protected)
        .route("/vehicles", get(list_vehicles).post(create_vehicle))
        .route(
            "/vehicles/:id",
            get(get_vehicle).put(update_vehicle).delete(delete_vehicle),
        )
        // Service book
        .route(
            "/vehicles/:id/service-book",
            get(get_service_book).post(add_service_book_entry),
        )
        .route("/vehicles/:id/reminders", get(get_reminders))
        .route(
            "/vehicles/:vehicle_id/reminders/:reminder_id",
            put(dismiss_reminder),
        )
        // Services catalog
        .route("/services/categories", get(list_categories))
        .route("/services", get(list_services).post(create_service))
        .route("/services/:id", get(get_service))
        .route("/services/my", get(list_master_services))
        // Orders
        .route("/orders", get(list_orders).post(create_order))
        .route("/orders/:id", get(get_order))
        .route("/orders/:id/status", put(update_order_status))
        .route("/orders/:id/rate", post(rate_order))
        // Order Offers (bidding)
        .route("/orders/:id/offers", get(list_offers).post(create_offer))
        .route("/orders/:id/offers/:offer_id/accept", put(accept_offer))
        .route("/orders/:id/offers/:offer_id/decline", put(decline_offer));

    Router::new().nest("/api", api).with_state(state)
}

