USE tambayts_db;

ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(40) NOT NULL DEFAULT 'cash_on_pickup' AFTER total;
