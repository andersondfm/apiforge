-- Seed schema for ApiForge local tests (sa / Your_strong_Password123 / db: demo)

IF DB_ID(N'demo') IS NULL
BEGIN
  CREATE DATABASE demo;
END
GO

USE demo;
GO

IF OBJECT_ID(N'dbo.products', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL CONSTRAINT DF_products_price DEFAULT 0,
    sku NVARCHAR(64) NULL,
    active BIT NOT NULL CONSTRAINT DF_products_active DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_products_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_products_sku UNIQUE (sku)
  );
END
GO

IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(255) NOT NULL,
    password NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_users_username UNIQUE (username)
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE sku = N'WDG-001')
BEGIN
  INSERT INTO dbo.products (name, price, sku, active)
  VALUES (N'Widget', 19.90, N'WDG-001', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE sku = N'GDG-002')
BEGIN
  INSERT INTO dbo.products (name, price, sku, active)
  VALUES (N'Gadget', 49.50, N'GDG-002', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE username = N'demo')
BEGIN
  INSERT INTO dbo.users (username, password)
  VALUES (N'demo', N'$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
END
GO
