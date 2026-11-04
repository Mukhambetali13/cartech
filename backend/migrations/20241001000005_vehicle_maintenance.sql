-- Extra vehicle data needed for maintenance
ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS engine_volume VARCHAR(10),  -- Объём двигателя, л (например 2.0)
    ADD COLUMN IF NOT EXISTS oil_type VARCHAR(50),       -- Масло ДВС (например 5W-30)
    ADD COLUMN IF NOT EXISTS tire_size VARCHAR(50);      -- Размер шин (например 205/55 R16)

-- More planned work categories
INSERT INTO service_categories (name, slug, icon, service_type, sort_order, description) VALUES
('Замена ремня ГРМ', 'timing-belt', '⛓️', 'planned', 19, 'Ремень или цепь ГРМ, ролики, помпа'),
('Капремонт двигателя', 'engine-overhaul', '🔧', 'planned', 20, 'Капитальный ремонт двигателя')
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_vehicle ON orders(vehicle_id);
