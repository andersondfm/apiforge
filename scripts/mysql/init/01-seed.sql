-- Seed schema for ApiForge local tests (user: demo / password: demo / db: demo)

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sku VARCHAR(64) NULL UNIQUE,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price, sku, active)
VALUES
  ('Widget', 19.90, 'WDG-001', 1),
  ('Gadget', 49.50, 'GDG-002', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO users (username, password)
VALUES
  -- bcrypt hash for "password" (demo only)
  ('demo', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON DUPLICATE KEY UPDATE username = VALUES(username);
