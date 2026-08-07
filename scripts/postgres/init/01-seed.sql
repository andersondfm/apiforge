-- Seed schema for ApiForge local tests (user: demo / password: demo / db: demo)

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sku VARCHAR(64) NULL UNIQUE,
  active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price, sku, active)
VALUES
  ('Widget', 19.90, 'WDG-001', 1),
  ('Gadget', 49.50, 'GDG-002', 1)
ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO users (username, password)
VALUES
  -- bcrypt hash for "password" (demo only)
  ('demo', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username;
