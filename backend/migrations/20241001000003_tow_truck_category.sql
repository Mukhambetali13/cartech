-- SOS category for tow truck services
INSERT INTO service_categories (name, slug, icon, service_type, sort_order, description) VALUES
('Эвакуатор', 'tow-truck', '🚛', 'sos', 6, 'Перевозка автомобиля на эвакуаторе')
ON CONFLICT (slug) DO NOTHING;
