/**
 * DDL склада для PostgreSQL. Все выражения идемпотентны, поэтому скрипт
 * можно запускать повторно — он не тронет уже существующие данные.
 *
 * Ключевая идея учёта: `stock_movements` — неизменяемый журнал операций и
 * единственный источник правды. `materials.quantity` и `foreman_stock.quantity` —
 * денормализованные остатки, которые меняются ТОЛЬКО в одной транзакции с
 * записью движения. Инварианты закреплены CHECK-ограничениями, поэтому
 * отрицательный остаток невозможен даже при ошибке в коде приложения.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  position      text NOT NULL DEFAULT '',
  phone         text NOT NULL DEFAULT '',
  role          text NOT NULL CHECK (role IN ('ADMIN', 'WAREHOUSE_WORKER')),
  is_active     integer NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    text NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id         text PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  address    text NOT NULL DEFAULT '',
  is_active  integer NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id         text PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  contact    text NOT NULL DEFAULT '',
  is_active  integer NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS foremen (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  phone      text NOT NULL DEFAULT '',
  brigade    text NOT NULL DEFAULT '',
  project_id text REFERENCES projects(id) ON DELETE SET NULL,
  is_active  integer NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id         text PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  category   text NOT NULL,
  unit       text NOT NULL,
  quantity   double precision NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock  double precision NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  is_active  integer NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at text NOT NULL,
  updated_at text NOT NULL
);

-- Остаток материала на руках у конкретного бригадира.
CREATE TABLE IF NOT EXISTS foreman_stock (
  foreman_id  text NOT NULL REFERENCES foremen(id) ON DELETE CASCADE,
  material_id text NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity    double precision NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at  text NOT NULL,
  PRIMARY KEY (foreman_id, material_id)
);

-- Журнал движений. Записи никогда не изменяются и не удаляются.
-- Колонка seq задаёт порядок записи операций: у нескольких операций одного дня
-- может совпадать время, и без неё история показывалась бы вразнобой.
CREATE TABLE IF NOT EXISTS stock_movements (
  id               text PRIMARY KEY,
  seq              bigserial NOT NULL,
  type             text NOT NULL CHECK (type IN ('RECEIPT', 'ISSUE', 'USAGE', 'RETURN')),
  material_id      text NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity         double precision NOT NULL CHECK (quantity > 0),
  occurred_at      text NOT NULL,
  created_at       text NOT NULL,
  user_id          text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  foreman_id       text REFERENCES foremen(id) ON DELETE RESTRICT,
  supplier_id      text REFERENCES suppliers(id) ON DELETE RESTRICT,
  project_id       text REFERENCES projects(id) ON DELETE SET NULL,
  vehicle_number   text NOT NULL DEFAULT '',
  reason           text NOT NULL DEFAULT '',
  comment          text NOT NULL DEFAULT '',
  warehouse_delta  double precision NOT NULL,
  foreman_delta    double precision NOT NULL,
  warehouse_after  double precision NOT NULL CHECK (warehouse_after >= 0),
  foreman_after    double precision CHECK (foreman_after IS NULL OR foreman_after >= 0),
  -- Операциям с бригадиром бригадир обязателен, поступлению — нет.
  CHECK (type = 'RECEIPT' OR foreman_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_movements_occurred  ON stock_movements(occurred_at DESC, seq DESC);
CREATE INDEX IF NOT EXISTS idx_movements_material  ON stock_movements(material_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_foreman   ON stock_movements(foreman_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type      ON stock_movements(type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_project   ON stock_movements(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_user      ON stock_movements(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_foreman_stock_mat   ON foreman_stock(material_id);

CREATE TABLE IF NOT EXISTS sessions (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at text NOT NULL,
  expires_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);
`;
