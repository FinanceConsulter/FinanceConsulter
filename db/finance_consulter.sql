PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY CHECK (length(code) = 3),
  name TEXT NOT NULL,
  symbol TEXT,
  decimal_places INTEGER DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS account_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('asset','liability')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_type_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_type_id) REFERENCES account_types(id),
  FOREIGN KEY (currency_code) REFERENCES currencies(code)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_user_name ON accounts(user_id, name);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type_id);

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

CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchants_name ON merchants(name);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  category_id INTEGER,
  merchant_id INTEGER,
  linked_transaction_id INTEGER,
  date TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  direction TEXT NOT NULL CHECK (direction IN ('out','in')),
  status TEXT NOT NULL DEFAULT 'cleared' CHECK (status IN ('pending','cleared')),
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
  FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  FOREIGN KEY (currency_code) REFERENCES currencies(code),
  CONSTRAINT chk_amount_not_zero CHECK (amount_cents != 0),
  CONSTRAINT chk_no_self_link CHECK (linked_transaction_id != id)
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_tx_linked ON transactions(linked_transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_user_external_id 
  ON transactions(user_id, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_values_json TEXT,
  new_values_json TEXT,  
  user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

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
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  raw_file_path TEXT,
  ocr_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  FOREIGN KEY (currency_code) REFERENCES currencies(code)
);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_receipts_tx ON receipts(transaction_id);

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

CREATE TABLE IF NOT EXISTS preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_preferences_user_key ON preferences(user_id, key);

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

CREATE TRIGGER IF NOT EXISTS audit_users_insert
    AFTER INSERT ON users
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values_json, user_id)
    VALUES ('users', NEW.id, 'INSERT', 
            json_object('id', NEW.id, 'email', NEW.email, 'full_name', NEW.full_name, 'is_active', NEW.is_active),
            NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS audit_users_update
    AFTER UPDATE ON users
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values_json, new_values_json, user_id)
    VALUES ('users', NEW.id, 'UPDATE',
            json_object('id', OLD.id, 'email', OLD.email, 'full_name', OLD.full_name, 'is_active', OLD.is_active),
            json_object('id', NEW.id, 'email', NEW.email, 'full_name', NEW.full_name, 'is_active', NEW.is_active),
            NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS audit_users_delete
    AFTER DELETE ON users
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values_json, user_id)
    VALUES ('users', OLD.id, 'DELETE',
            json_object('id', OLD.id, 'email', OLD.email, 'full_name', OLD.full_name, 'is_active', OLD.is_active),
            OLD.id);
END;

CREATE TRIGGER IF NOT EXISTS audit_transactions_insert
    AFTER INSERT ON transactions
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_values_json, user_id)
    VALUES ('transactions', NEW.id, 'INSERT',
            json_object('id', NEW.id, 'account_id', NEW.account_id, 'amount_cents', NEW.amount_cents, 
                       'direction', NEW.direction, 'description', NEW.description, 'linked_transaction_id', NEW.linked_transaction_id),
            NEW.user_id);
END;

CREATE TRIGGER IF NOT EXISTS audit_transactions_update
    AFTER UPDATE ON transactions
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values_json, new_values_json, user_id)
    VALUES ('transactions', NEW.id, 'UPDATE',
            json_object('id', OLD.id, 'account_id', OLD.account_id, 'amount_cents', OLD.amount_cents, 
                       'direction', OLD.direction, 'description', OLD.description, 'linked_transaction_id', OLD.linked_transaction_id),
            json_object('id', NEW.id, 'account_id', NEW.account_id, 'amount_cents', NEW.amount_cents, 
                       'direction', NEW.direction, 'description', NEW.description, 'linked_transaction_id', NEW.linked_transaction_id),
            NEW.user_id);
END;

CREATE TRIGGER IF NOT EXISTS audit_transactions_delete
    AFTER DELETE ON transactions
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values_json, user_id)
    VALUES ('transactions', OLD.id, 'DELETE',
            json_object('id', OLD.id, 'account_id', OLD.account_id, 'amount_cents', OLD.amount_cents, 
                       'direction', OLD.direction, 'description', OLD.description, 'linked_transaction_id', OLD.linked_transaction_id),
            OLD.user_id);
END;