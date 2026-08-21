/**
 * DDL склада. Выполняется при каждом старте (все выражения идемпотентны),
 * поэтому отдельный шаг миграции для MVP не нужен.
 *
 * Ключевая идея учёта: `stock_movements` — неизменяемый журнал операций и
 * единственный источник правды. `materials.quantity` и `foreman_stock.quantity` —
 * денормализованные остатки, которые меняются ТОЛЬКО в одной транзакции с
 * записью движения. Инварианты закреплены CHECK-ограничениями, поэтому
 * отрицательный остаток невозможен даже при ошибке в коде приложения.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  position      TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('ADMIN', 'WAREHOUSE_WORKER')),
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  address    TEXT NOT NULL DEFAULT '',
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  contact    TEXT NOT NULL DEFAULT '',
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS foremen (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  brigade    TEXT NOT NULL DEFAULT '',
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL,
  unit       TEXT NOT NULL,
  quantity   REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock  REAL NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  is_active  INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Остаток материала на руках у конкретного бригадира.
CREATE TABLE IF NOT EXISTS foreman_stock (
  foreman_id  TEXT NOT NULL REFERENCES foremen(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity    REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (foreman_id, material_id)
);

-- Журнал движений. Записи никогда не изменяются и не удаляются.
CREATE TABLE IF NOT EXISTS stock_movements (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL CHECK (type IN ('RECEIPT', 'ISSUE', 'USAGE', 'RETURN')),
  material_id      TEXT NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity         REAL NOT NULL CHECK (quantity > 0),
  occurred_at      TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  foreman_id       TEXT REFERENCES foremen(id) ON DELETE RESTRICT,
  supplier_id      TEXT REFERENCES suppliers(id) ON DELETE RESTRICT,
  project_id       TEXT REFERENCES projects(id) ON DELETE SET NULL,
  vehicle_number   TEXT NOT NULL DEFAULT '',
  reason           TEXT NOT NULL DEFAULT '',
  comment          TEXT NOT NULL DEFAULT '',
  warehouse_delta  REAL NOT NULL,
  foreman_delta    REAL NOT NULL,
  warehouse_after  REAL NOT NULL CHECK (warehouse_after >= 0),
  foreman_after    REAL CHECK (foreman_after IS NULL OR foreman_after >= 0),
  -- Операциям с бригадиром бригадир обязателен, поступлению — нет.
  CHECK (type = 'RECEIPT' OR foreman_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_movements_occurred  ON stock_movements(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_material  ON stock_movements(material_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_foreman   ON stock_movements(foreman_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type      ON stock_movements(type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_project   ON stock_movements(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_user      ON stock_movements(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_foreman_stock_mat   ON foreman_stock(material_id);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
