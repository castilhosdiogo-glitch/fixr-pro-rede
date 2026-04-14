-- ============================================================================
-- 021 — Admin audit log fixes + user suspension columns
-- ============================================================================

-- 1. Fix audit_log FK: reference auth.users directly (user.id in session)
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- 2. Fix RLS policy (profiles use user_id, not id, to match auth.uid())
DROP POLICY IF EXISTS "admins_read_audit" ON public.admin_audit_log;
CREATE POLICY "admins_read_audit" ON public.admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

-- 3. Fix is_admin helper to use user_id
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role IN ('admin', 'superadmin')
  );
$$;

-- 4. Suspension columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_profiles_suspended
  ON public.profiles(suspended_at)
  WHERE suspended_at IS NOT NULL;
