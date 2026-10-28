USE tambayts_db;

ALTER TABLE orders
  ADD COLUMN payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid' AFTER payment_method;

UPDATE orders
SET payment_status = 'paid'
WHERE status = 'Completed';
