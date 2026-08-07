-- Seed schema for ApiForge local / E2E tests (SQLite file DB)

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  sku TEXT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO products (name, price, sku, active)
VALUES
  ('Widget', 19.90, 'WDG-001', 1),
  ('Gadget', 49.50, 'GDG-002', 1);

INSERT OR IGNORE INTO users (username, password)
VALUES
  -- bcrypt hash for "password" (demo only)
  ('demo', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
