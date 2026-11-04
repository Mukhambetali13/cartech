-- Deleting a vehicle keeps its order history
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_vehicle_id_fkey;
ALTER TABLE orders
    ADD CONSTRAINT orders_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
