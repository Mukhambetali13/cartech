-- Migration: Add order_offers table for the price bidding system
-- Masters submit price offers on open orders; clients accept or decline them.

CREATE TABLE IF NOT EXISTS order_offers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    master_id   UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    price       DECIMAL(12, 2) NOT NULL CHECK (price > 0),
    comment     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Один мастер — одно активное предложение на заявку (UPSERT-ключ)
    UNIQUE (order_id, master_id)
);

CREATE INDEX IF NOT EXISTS idx_order_offers_order_id  ON order_offers(order_id);
CREATE INDEX IF NOT EXISTS idx_order_offers_master_id ON order_offers(master_id);
CREATE INDEX IF NOT EXISTS idx_order_offers_status    ON order_offers(status);
