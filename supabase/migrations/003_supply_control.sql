-- ============================================================
-- 003_supply_control.sql
-- Supply control system for PROFIX marketplace
-- Controls max professionals per category+city, manages
-- waiting list, and exposes slot occupancy view.
-- ============================================================

-- ─── 1. SUPPLY LIMITS ────────────────────────────────────────
-- One row per (category, city) pair. Admins can adjust max_professionals.
CREATE TABLE IF NOT EXISTS supply_limits (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id        TEXT        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  city               TEXT        NOT NULL,
  max_professionals  INTEGER     NOT NULL DEFAULT 10 CHECK (max_professionals > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, city)
);

-- ─── 2. WAITING LIST ─────────────────────────────────────────
-- Stores prospective professionals who tried to register when
-- a slot was FULL. notified_at is set when a slot reopens and
-- the person is next in line.
CREATE TABLE IF NOT EXISTS waiting_list (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  category_id  TEXT        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  city         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at  TIMESTAMPTZ
);

-- ─── 3. SLOT OCCUPANCY VIEW ──────────────────────────────────
-- Dynamically calculates active professionals per limit row and
-- derives three status states:
--   OPEN        → occupancy < 70%
--   ALMOST_FULL → occupancy 70–99%
--   FULL        → occupancy >= 100%
CREATE OR REPLACE VIEW slot_occupancy AS
SELECT
  sl.id,
  sl.category_id,
  c.name                                                       AS category_name,
  sl.city,
  sl.max_professionals,
  COALESCE(COUNT(pp.id), 0)::INTEGER                           AS active_professionals,
  GREATEST(sl.max_professionals - COALESCE(COUNT(pp.id), 0), 0)::INTEGER AS available_slots,
  CASE
    WHEN sl.max_professionals = 0 THEN 0::NUMERIC
    ELSE ROUND((COALESCE(COUNT(pp.id), 0)::NUMERIC / sl.max_professionals) * 100, 1)
  END                                                          AS occupancy_pct,
  CASE
    WHEN COALESCE(COUNT(pp.id), 0) >= sl.max_professionals THEN 'FULL'
    WHEN sl.max_professionals > 0
      AND (COALESCE(COUNT(pp.id), 0)::NUMERIC / sl.max_professionals) >= 0.7 THEN 'ALMOST_FULL'
    ELSE 'OPEN'
  END                                                          AS status,
  -- Waiting list count for this slot
  (
    SELECT COUNT(*) FROM waiting_list wl
    WHERE wl.category_id = sl.category_id
      AND wl.city        = sl.city
      AND wl.notified_at IS NULL
  )::INTEGER                                                   AS waiting_count
FROM supply_limits sl
JOIN categories c ON c.id = sl.category_id
LEFT JOIN professional_profiles pp ON pp.category_id = sl.category_id
LEFT JOIN profiles pr
       ON pr.user_id = pp.user_id
      AND pr.city    = sl.city
GROUP BY sl.id, sl.category_id, c.name, sl.city, sl.max_professionals;

-- ─── 4. HELPER FUNCTIONS ─────────────────────────────────────

-- Returns TRUE when there is at least one available slot in the
-- given category+city, or when no limit has been configured yet.
CREATE OR REPLACE FUNCTION check_slot_available(p_category_id TEXT, p_city TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT active_professionals < max_professionals
      FROM   slot_occupancy
      WHERE  category_id = p_category_id
        AND  city        = p_city
      LIMIT  1
    ),
    TRUE  -- no limit configured → allow registration
  );
$$;

-- Marks the oldest un-notified waiting list entry for a given
-- slot as notified. Call this whenever a slot is released.
CREATE OR REPLACE FUNCTION notify_waiting_list(p_category_id TEXT, p_city TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE waiting_list
  SET    notified_at = now()
  WHERE  id = (
    SELECT id
    FROM   waiting_list
    WHERE  category_id  = p_category_id
      AND  city         = p_city
      AND  notified_at  IS NULL
    ORDER  BY created_at ASC
    LIMIT  1
  );
$$;

-- ─── 5. TRIGGER: updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION _supply_limits_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supply_limits_updated_at ON supply_limits;
CREATE TRIGGER supply_limits_updated_at
  BEFORE UPDATE ON supply_limits
  FOR EACH ROW EXECUTE FUNCTION _supply_limits_set_updated_at();

-- ─── 6. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE supply_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list  ENABLE ROW LEVEL SECURITY;

-- supply_limits: public read; only admins can write
CREATE POLICY "supply_limits_select"
  ON supply_limits FOR SELECT USING (true);

CREATE POLICY "supply_limits_admin_all"
  ON supply_limits FOR ALL
  USING      (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- waiting_list: anyone can insert; admins can read/update all
CREATE POLICY "waiting_list_insert"
  ON waiting_list FOR INSERT WITH CHECK (true);

CREATE POLICY "waiting_list_admin_select"
  ON waiting_list FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "waiting_list_admin_update"
  ON waiting_list FOR UPDATE
  USING      (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ─── 7. VIEW ACCESS ──────────────────────────────────────────
GRANT SELECT ON slot_occupancy TO authenticated, anon;

-- ─── 8. SEED DEFAULT LIMITS ──────────────────────────────────
-- Insert 10-professional limit for every existing category in
-- each of the six supported cities. On conflict, do nothing so
-- we never overwrite admin-configured values.
INSERT INTO supply_limits (category_id, city, max_professionals)
SELECT c.id, city.name, 10
FROM categories c
CROSS JOIN (VALUES
  ('Porto Alegre'),
  ('Gravataí'),
  ('Canoas'),
  ('Cachoeirinha'),
  ('Viamão'),
  ('Alvorada')
) AS city(name)
ON CONFLICT (category_id, city) DO NOTHING;
