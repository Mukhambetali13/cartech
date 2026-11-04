-- Client sets their own price; masters may counter-offer up to +10 000 ₸ above it
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_price DECIMAL(12, 2) CHECK (client_price > 0);
