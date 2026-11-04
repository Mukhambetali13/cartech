/// SQL expression for the great-circle distance in km between two lat/lng pairs.
/// Evaluates to NULL when any coordinate is NULL.
pub fn distance_km_sql(lat1: &str, lng1: &str, lat2: &str, lng2: &str) -> String {
    format!(
        "(6371 * acos(LEAST(1.0, GREATEST(-1.0,
            cos(radians({lat1})) * cos(radians({lat2})) * cos(radians({lng2}) - radians({lng1}))
            + sin(radians({lat1})) * sin(radians({lat2}))))))"
    )
}
