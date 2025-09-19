PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  full_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Accounts (per user)
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_user_name ON accounts(user_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Categories (hierarchical, user-specific or system-wide if user_id NULL)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  parent_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('expense','income','transfer')),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name ON categories(user_id, name);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Merchants
CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchants_name ON merchants(name);

-- Transactions (amounts in cents to avoid float issues)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  category_id INTEGER,
  merchant_id INTEGER,
  date TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  direction TEXT NOT NULL CHECK (direction IN ('out','in')),
  status TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('pending','cleared')),
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions(merchant_id);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  merchant_id INTEGER,
  account_id INTEGER,
  transaction_id INTEGER,
  purchase_date TEXT NOT NULL,
  subtotal_cents INTEGER,
  tax_cents INTEGER,
  total_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'EUR',
  raw_file_path TEXT,
  ocr_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_receipts_tx ON receipts(transaction_id);

-- Receipt line items
CREATE TABLE IF NOT EXISTS receipt_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id INTEGER NOT NULL,
  category_id INTEGER,
  product_name TEXT NOT NULL,
  origin TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_cents INTEGER,
  total_price_cents INTEGER,
  tax_rate REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_line_items_receipt ON receipt_line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_category ON receipt_line_items(category_id);

-- Preferences (per user key/value JSON)
CREATE TABLE IF NOT EXISTS preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_preferences_user_key ON preferences(user_id, key);

-- Suggestions (generated insights/rules results)
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','dismissed','applied')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  applied_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON suggestions(user_id);

-- Auto-categorization rules
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  match_field TEXT NOT NULL CHECK (match_field IN ('merchant','description','amount','category')),
  pattern TEXT NOT NULL,
  action_set_category_id INTEGER,
  action_set_merchant_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (action_set_category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (action_set_merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_rules_user_active ON rules(user_id, is_active);

-- Seeds
INSERT OR IGNORE INTO users (id, email, full_name) VALUES (1, 'demo@example.com', 'Demo User');
INSERT OR IGNORE INTO accounts (user_id, name, type, currency) VALUES (1, 'Wallet', 'cash', 'EUR');

INSERT OR IGNORE INTO categories (user_id, parent_id, name, type, is_system)
VALUES
  (NULL, NULL, 'Groceries', 'expense', 1),
  (NULL, NULL, 'Restaurants', 'expense', 1),
  (NULL, NULL, 'Transport', 'expense', 1),
  (NULL, NULL, 'Utilities', 'expense', 1),
  (NULL, NULL, 'Salary', 'income', 1),
  (NULL, NULL, 'Transfers', 'transfer', 1);

COMMIT;
