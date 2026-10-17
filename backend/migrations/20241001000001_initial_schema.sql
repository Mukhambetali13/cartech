-- Migration: 001_initial_schema
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'client', -- 'client' | 'master'
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master profiles (extra info for masters/СТО)
CREATE TABLE master_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    work_radius_km INTEGER DEFAULT 20,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Vehicles (cars)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,          -- Марка (Toyota, BMW...)
    model VARCHAR(100) NOT NULL,         -- Модель
    year INTEGER NOT NULL,               -- Год выпуска
    vin VARCHAR(17),                     -- VIN код
    plate_number VARCHAR(20),            -- Госномер
    color VARCHAR(50),
    engine_type VARCHAR(50),             -- petrol, diesel, electric, hybrid
    transmission VARCHAR(20),            -- auto, manual, cvt
    current_mileage INTEGER DEFAULT 0,   -- Текущий пробег (км)
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service categories
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    service_type VARCHAR(20) NOT NULL DEFAULT 'planned', -- 'sos' | 'planned'
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Services offered by masters
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_from DECIMAL(10,2),
    price_to DECIMAL(10,2),
    duration_minutes INTEGER,
    is_mobile BOOLEAN NOT NULL DEFAULT FALSE,  -- Выездная услуга
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders (заявки)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES users(id),
    master_id UUID REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    service_id UUID REFERENCES services(id),
    status VARCHAR(30) NOT NULL DEFAULT 'open', -- open | accepted | in_progress | completed | cancelled
    service_type VARCHAR(20) NOT NULL DEFAULT 'planned', -- 'sos' | 'planned'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    scheduled_at TIMESTAMPTZ,
    price_agreed DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending | paid | refunded
    client_rating INTEGER CHECK (client_rating BETWEEN 1 AND 5),
    client_review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Digital service book entries
CREATE TABLE service_book_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    master_id UUID REFERENCES users(id),
    entry_type VARCHAR(50) NOT NULL, -- 'oil_change' | 'filter' | 'brake_pads' | 'brake_discs' | 'spark_plugs' | 'tire_change' | 'diagnostics' | 'other'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    mileage_at_service INTEGER NOT NULL,
    next_service_mileage INTEGER,    -- Через сколько км следующая замена
    next_service_date DATE,          -- Или по дате
    parts_used JSONB,                -- Список запчастей и расходников
    cost DECIMAL(10,2),
    receipt_url TEXT,                -- Ссылка на чек/акт
    serviced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications / reminders
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'mileage' | 'date'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    trigger_mileage INTEGER,
    trigger_date DATE,
    is_sent BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_master ON orders(master_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_service_book_vehicle ON service_book_entries(vehicle_id);
CREATE INDEX idx_services_master ON services(master_id);
CREATE INDEX idx_services_category ON services(category_id);

-- Seed service categories
INSERT INTO service_categories (name, slug, icon, service_type, sort_order, description) VALUES
('Отогрев авто', 'car-heating', '🔥', 'sos', 1, 'Прогрев двигателя и разморозка замков'),
('Прикурить авто', 'jump-start', '⚡', 'sos', 2, 'Запуск от бустера или другого авто'),
('Компьютерная диагностика', 'diagnostics', '💻', 'sos', 3, 'Выездная диагностика OBD2'),
('Вскрытие авто', 'unlock', '🔓', 'sos', 4, 'Вскрытие замков без повреждений'),
('Подвоз топлива', 'fuel-delivery', '⛽', 'sos', 5, 'Доставка бензина или дизеля'),
('Замена масла ДВС', 'engine-oil', '🛢️', 'planned', 10, 'Замена моторного масла и фильтра'),
('Замена масла АКПП', 'gearbox-oil', '⚙️', 'planned', 11, 'Замена масла в автоматической коробке'),
('Замена фильтров', 'filters', '🌬️', 'planned', 12, 'Воздушный, салонный, топливный фильтр'),
('Замена тормозных колодок', 'brake-pads', '🛑', 'planned', 13, 'Передние и задние тормозные колодки'),
('Замена тормозных дисков', 'brake-discs', '💿', 'planned', 14, 'Тормозные диски с колодками'),
('Замена свечей зажигания', 'spark-plugs', '✨', 'planned', 15, 'Свечи зажигания и свечи накала'),
('Шиномонтаж', 'tire-service', '🔄', 'planned', 16, 'Сезонная смена, балансировка'),
('Автоэлектрика', 'electrics', '🔌', 'planned', 17, 'Диагностика и ремонт электрики'),
('Ходовая часть', 'suspension', '🚗', 'planned', 18, 'Амортизаторы, стойки, рычаги');
