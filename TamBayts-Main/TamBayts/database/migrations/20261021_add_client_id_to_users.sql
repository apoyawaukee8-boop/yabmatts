-- Apply once to databases created before guest checkout was added.
ALTER TABLE users
  ADD COLUMN client_id CHAR(36) NULL,
  ADD UNIQUE KEY uq_users_client_id (client_id);
