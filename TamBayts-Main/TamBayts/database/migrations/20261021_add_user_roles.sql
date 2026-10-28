USE tambayts_db;

ALTER TABLE users
  ADD COLUMN role ENUM('student', 'admin') NOT NULL DEFAULT 'student' AFTER password_hash;
