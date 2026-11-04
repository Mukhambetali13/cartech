-- Mobile tire service as an SOS category, clearer unlock description
INSERT INTO service_categories (name, slug, icon, service_type, sort_order, description) VALUES
('Выездной шиномонтаж', 'mobile-tire-service', '🛞', 'sos', 7, 'Замена колеса или ремонт прокола на месте')
ON CONFLICT (slug) DO NOTHING;

UPDATE service_categories
SET description = 'Вскрытие замков без повреждений, если ключи остались внутри'
WHERE slug = 'unlock';

UPDATE service_categories
SET name = 'Отогрев авто', description = 'Прогрев двигателя и салона, разморозка замков'
WHERE slug = 'car-heating';
