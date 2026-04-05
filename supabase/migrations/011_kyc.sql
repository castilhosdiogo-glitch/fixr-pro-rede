-- ============================================================
-- Migration 011: KYC — Professional Identity Verification
-- ============================================================

DO $$
BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS kyc_submissions (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_legal_name       TEXT        NOT NULL,
  document_type         TEXT        NOT NULL CHECK (document_type IN ('cpf', 'rg', 'cnh')),
  document_number       TEXT        NOT NULL,
  selfie_path           TEXT,
  document_front_path   TEXT,
  document_back_path    TEXT,
  status                kyc_status  NOT NULL DEFAULT 'pending',
  rejection_reason      TEXT,
  reviewed_by           UUID        REFERENCES auth.users(id),
  reviewed_at           TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_status  ON kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_submissions(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION _kyc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_kyc_updated_at ON kyc_submissions;
CREATE TRIGGER trg_kyc_updated_at
  BEFORE UPDATE ON kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION _kyc_set_updated_at();

-- On approval: set verified = true + notify; on rejection: notify
CREATE OR REPLACE FUNCTION _on_kyc_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE professional_profiles
    SET verified = TRUE, updated_at = now()
    WHERE user_id = NEW.user_id;

    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.user_id, 'general',
      'Identidade verificada!',
      'Seu perfil agora exibe o selo de profissional verificado.'
    );
  END IF;

  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id, 'general',
      'Verificação não aprovada',
      'Seu envio não foi aprovado. Verifique o motivo e reenvie.',
      jsonb_build_object('reason', COALESCE(NEW.rejection_reason, ''))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_kyc_status_change ON kyc_submissions;
CREATE TRIGGER trg_on_kyc_status_change
  AFTER UPDATE OF status ON kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION _on_kyc_status_change();

-- RLS
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_own_read"    ON kyc_submissions;
DROP POLICY IF EXISTS "kyc_own_insert"  ON kyc_submissions;
DROP POLICY IF EXISTS "kyc_own_update"  ON kyc_submissions;
DROP POLICY IF EXISTS "kyc_admin_all"   ON kyc_submissions;

CREATE POLICY "kyc_own_read" ON kyc_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "kyc_own_insert" ON kyc_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "kyc_own_update" ON kyc_submissions
  FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'rejected'))
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "kyc_admin_all" ON kyc_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON kyc_submissions TO authenticated;
