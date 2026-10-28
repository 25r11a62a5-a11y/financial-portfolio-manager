-- ============================================================
-- Financial Portfolio Manager - Database Setup Script
-- DBMS College Project
-- Run this entire file in MySQL Workbench to set up the database.
-- ============================================================

-- Create and select the database
CREATE DATABASE IF NOT EXISTS financial_portfolio;
USE financial_portfolio;

-- ============================================================
-- TABLE 1: investors
-- Stores basic information about investors.
-- For this demo project, we use a single seeded investor.
-- ============================================================
CREATE TABLE IF NOT EXISTS investors (
    investor_id   INT           NOT NULL AUTO_INCREMENT,
    investor_name VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (investor_id)
);

-- ============================================================
-- TABLE 2: stocks
-- Stores information about each stock/company.
-- Prices here are SAMPLE / ILLUSTRATIVE data, not real market prices.
-- ============================================================
CREATE TABLE IF NOT EXISTS stocks (
    stock_id      INT            NOT NULL AUTO_INCREMENT,
    symbol        VARCHAR(10)    NOT NULL UNIQUE,
    company_name  VARCHAR(150)   NOT NULL,
    current_price DECIMAL(10,2)  NOT NULL,
    sector        VARCHAR(80)    NOT NULL,
    risk_level    VARCHAR(20)    NOT NULL,
    PRIMARY KEY (stock_id),
    CONSTRAINT chk_stock_price CHECK (current_price > 0),
    CONSTRAINT chk_risk_level  CHECK (risk_level IN ('Low', 'Medium', 'High'))
);

-- ============================================================
-- TABLE 3: holdings
-- Records which investor bought how many shares of which stock,
-- at what price, and on what date.
-- Foreign keys ensure data integrity.
-- ============================================================
CREATE TABLE IF NOT EXISTS holdings (
    holding_id     INT           NOT NULL AUTO_INCREMENT,
    investor_id    INT           NOT NULL,
    stock_id       INT           NOT NULL,
    quantity       INT           NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    purchase_date  DATE          NOT NULL,
    PRIMARY KEY (holding_id),
    CONSTRAINT fk_holding_investor FOREIGN KEY (investor_id) REFERENCES investors(investor_id),
    CONSTRAINT fk_holding_stock    FOREIGN KEY (stock_id)    REFERENCES stocks(stock_id),
    CONSTRAINT chk_quantity        CHECK (quantity > 0),
    CONSTRAINT chk_purchase_price  CHECK (purchase_price > 0)
);

-- ============================================================
-- TABLE 4: price_history
-- Every time the sample price of a stock is updated through
-- the application, the old/new price is saved here.
-- This demonstrates INSERT inside a database transaction.
-- ============================================================
CREATE TABLE IF NOT EXISTS price_history (
    history_id  INT            NOT NULL AUTO_INCREMENT,
    stock_id    INT            NOT NULL,
    price       DECIMAL(10,2)  NOT NULL,
    recorded_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (history_id),
    CONSTRAINT fk_history_stock FOREIGN KEY (stock_id) REFERENCES stocks(stock_id)
);

-- ============================================================
-- TABLE 5: transactions
-- Records BUY/SELL activity linked to a holding.
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id   INT          NOT NULL AUTO_INCREMENT,
    holding_id       INT          NOT NULL,
    transaction_type VARCHAR(10)  NOT NULL,
    quantity         INT          NOT NULL,
    transaction_date TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id),
    CONSTRAINT fk_txn_holding FOREIGN KEY (holding_id) REFERENCES holdings(holding_id),
    CONSTRAINT chk_txn_type  CHECK (transaction_type IN ('BUY', 'SELL')),
    CONSTRAINT chk_txn_qty   CHECK (quantity > 0)
);

-- ============================================================
-- INDEXES
-- Indexes speed up frequently used lookups.
-- ============================================================
CREATE INDEX idx_holdings_investor ON holdings(investor_id);
CREATE INDEX idx_holdings_stock    ON holdings(stock_id);
CREATE INDEX idx_history_stock     ON price_history(stock_id);

-- ============================================================
-- SAMPLE DATA - INVESTORS
-- One default investor is used for this single-user demo.
-- ============================================================
INSERT INTO investors (investor_name, email) VALUES
('Demo Student',   'demo@college.edu'),
('Priya Sharma',   'priya.sharma@college.edu'),
('Rahul Verma',    'rahul.verma@college.edu');

-- ============================================================
-- SAMPLE DATA - STOCKS
-- These are ILLUSTRATIVE prices only. Not real market data.
-- ============================================================
INSERT INTO stocks (symbol, company_name, current_price, sector, risk_level) VALUES
('RELIND',  'Reliance Industries Ltd (Sample)',  2450.00, 'Energy',          'Medium'),
('TECHSOL', 'TechSolutions Pvt Ltd (Sample)',    1820.50, 'Technology',      'High'),
('BANKCO',  'National Bank Corp (Sample)',        980.75, 'Finance',         'Low'),
('PHARMAX', 'PharmaMax Ltd (Sample)',             640.00, 'Healthcare',      'Medium'),
('AUTODRV', 'AutoDrive Motors (Sample)',         1150.00, 'Automobile',      'Medium'),
('GREENP',  'GreenPower Energy (Sample)',         320.00, 'Renewable Energy','High'),
('FMCGBR',  'FMCG Brands India (Sample)',        455.25, 'Consumer Goods',  'Low'),
('STEELCO', 'SteelCorp Ltd (Sample)',             870.00, 'Metals',          'High'),
('ITSERV',  'IT Services Global (Sample)',       2100.00, 'Technology',      'Medium'),
('INFRAST', 'InfraStructure India (Sample)',      530.00, 'Infrastructure',  'Low');

-- ============================================================
-- SAMPLE DATA - HOLDINGS (for investor_id = 1, the demo user)
-- ============================================================
INSERT INTO holdings (investor_id, stock_id, quantity, purchase_price, purchase_date) VALUES
(1, 1, 10,  2300.00, '2024-01-15'),   -- Reliance
(1, 2,  5,  1750.00, '2024-02-10'),   -- TechSolutions
(1, 3, 20,   950.00, '2024-03-05'),   -- National Bank
(1, 4, 15,   610.00, '2024-03-20'),   -- PharmaMax
(1, 5,  8,  1100.00, '2024-04-12'),   -- AutoDrive
(1, 7, 25,   430.00, '2024-05-01');   -- FMCG Brands

-- ============================================================
-- SAMPLE DATA - PRICE HISTORY (initial prices when stocks were added)
-- ============================================================
INSERT INTO price_history (stock_id, price, recorded_at) VALUES
(1, 2300.00, '2024-01-01 09:00:00'),
(1, 2380.00, '2024-04-01 09:00:00'),
(1, 2450.00, '2024-07-01 09:00:00'),
(2, 1700.00, '2024-01-01 09:00:00'),
(2, 1780.00, '2024-04-01 09:00:00'),
(2, 1820.50, '2024-07-01 09:00:00'),
(3,  920.00, '2024-01-01 09:00:00'),
(3,  950.00, '2024-04-01 09:00:00'),
(3,  980.75, '2024-07-01 09:00:00'),
(4,  600.00, '2024-01-01 09:00:00'),
(4,  625.00, '2024-04-01 09:00:00'),
(4,  640.00, '2024-07-01 09:00:00'),
(5, 1080.00, '2024-01-01 09:00:00'),
(5, 1120.00, '2024-04-01 09:00:00'),
(5, 1150.00, '2024-07-01 09:00:00'),
(7,  430.00, '2024-01-01 09:00:00'),
(7,  445.00, '2024-04-01 09:00:00'),
(7,  455.25, '2024-07-01 09:00:00');

-- ============================================================
-- SAMPLE DATA - TRANSACTIONS (BUY records matching holdings)
-- ============================================================
INSERT INTO transactions (holding_id, transaction_type, quantity, transaction_date) VALUES
(1, 'BUY', 10, '2024-01-15 10:00:00'),
(2, 'BUY',  5, '2024-02-10 11:00:00'),
(3, 'BUY', 20, '2024-03-05 10:30:00'),
(4, 'BUY', 15, '2024-03-20 09:45:00'),
(5, 'BUY',  8, '2024-04-12 14:00:00'),
(6, 'BUY', 25, '2024-05-01 10:00:00');

-- Verify the setup
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS total_investors FROM investors;
SELECT COUNT(*) AS total_stocks    FROM stocks;
SELECT COUNT(*) AS total_holdings  FROM holdings;
