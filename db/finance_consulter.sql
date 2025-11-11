PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- e.g. 'asset','liability','cash'
  currency_code TEXT NOT NULL DEFAULT 'CHF',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  parent_id INTEGER,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'expense','income'
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  category_id INTEGER,
  date TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL,   -- negative = out, positive = in (vereinfacht)
  currency_code TEXT NOT NULL DEFAULT 'EUR',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Optional: Händler + Belege nur wenn benötigt
CREATE TABLE merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  transaction_id INTEGER,
  merchant_id INTEGER,
  purchase_date TEXT NOT NULL,
  total_cents INTEGER,
  raw_file_path TEXT,
  ocr_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
);

CREATE TABLE receipt_line_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price_cents INTEGER,
  total_price_cents INTEGER,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
);

-- Leichte Indizes
CREATE INDEX idx_tx_user_date ON transactions(user_id, date);
CREATE INDEX idx_tx_category ON transactions(category_id);
CREATE INDEX idx_tx_account ON transactions(account_id);
CREATE INDEX idx_receipt_merchant ON receipts(merchant_id);
CREATE INDEX idx_merchant_user ON merchants(user_id);

-- tag (global per user)
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT,                       
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

-- Junction: transaction 
CREATE TABLE transaction_tags (
  transaction_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Junction: Receipt Line Items
CREATE TABLE receipt_line_item_tags (
  line_item_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (line_item_id, tag_id),
  FOREIGN KEY (line_item_id) REFERENCES receipt_line_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Nützliche Indizes für Tag-Abfragen
CREATE INDEX idx_tag_user ON tags(user_id);
CREATE INDEX idx_trx_tag_tag ON transaction_tags(tag_id);
CREATE INDEX idx_line_item_tag_tag ON receipt_line_item_tags(tag_id);

COMMIT;