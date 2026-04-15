-- ============================================================
-- 028_fixr_mandatory_reviews.sql
-- Tacada 4: avaliação obrigatória bidirecional
--
-- • Avaliação do cliente: obrigatória. 72h após conclusão → auto-3★.
-- • Avaliação do profissional sobre cliente: obrigatória.
--   48h bloqueia o pro de aceitar NOVOS pedidos até avaliar.
-- • Multi-campo: pontualidade, qualidade, comunicação, preco_justo (1-5).
-- • Reviews agora são bidirecionais (reviewer_role).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Colunas extras em reviews (mantém compat: legado = client→pro)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewer_role     TEXT NOT NULL DEFAULT 'client'
    CHECK (reviewer_role IN ('client','professional')),
  ADD COLUMN IF NOT EXISTS pontualidade      INTEGER CHECK (pontualidade BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS qualidade         INTEGER CHECK (qualidade BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS comunicacao       INTEGER CHECK (comunicacao BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS preco_justo       INTEGER CHECK (preco_justo BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS auto_generated    BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reviews.reviewer_role IS
  'Quem avaliou: client (review do cliente sobre o pro) ou professional (review do pro sobre o cliente).';
COMMENT ON COLUMN public.reviews.auto_generated IS
  'Review gerado automaticamente por não avaliar em 72h (nota 3★).';

-- Garante uma review por (service_request, reviewer_role)
DROP INDEX IF EXISTS reviews_service_request_unique;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_sr_reviewer_unique
  ON public.reviews (service_request_id, reviewer_role)
  WHERE service_request_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Tabela de pendências de avaliação
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pending_reviews (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id    UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  reviewer_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role         TEXT NOT NULL CHECK (reviewer_role IN ('client','professional')),
  due_at                TIMESTAMPTZ NOT NULL,       -- prazo de cortesia
  blocks_at             TIMESTAMPTZ,                -- quando passa a bloquear (apenas pro)
  fulfilled             BOOLEAN NOT NULL DEFAULT false,
  auto_filled           BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_request_id, reviewer_role)
);

CREATE INDEX IF NOT EXISTS idx_pending_reviews_reviewer
  ON public.pending_reviews (reviewer_id, fulfilled);
CREATE INDEX IF NOT EXISTS idx_pending_reviews_due
  ON public.pending_reviews (fulfilled, due_at);

ALTER TABLE public.pending_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviewer reads own pending" ON public.pending_reviews;
CREATE POLICY "Reviewer reads own pending" ON public.pending_reviews
  FOR SELECT USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

DROP POLICY IF EXISTS "Admin reads pending" ON public.pending_reviews;
CREATE POLICY "Admin reads pending" ON public.pending_reviews
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ────────────────────────────────────────────────────────────
-- 3. Trigger: ao concluir serviço, cria 2 pendências
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_create_pending_reviews()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN

    -- Pendência do cliente avaliar o pro (72h → auto 3★)
    INSERT INTO public.pending_reviews (
      service_request_id, reviewer_id, reviewee_id, reviewer_role,
      due_at, blocks_at
    ) VALUES (
      NEW.id, NEW.client_id, NEW.professional_id, 'client',
      now() + INTERVAL '72 hours', NULL
    ) ON CONFLICT (service_request_id, reviewer_role) DO NOTHING;

    -- Pendência do pro avaliar o cliente (48h → bloqueia novos pedidos)
    INSERT INTO public.pending_reviews (
      service_request_id, reviewer_id, reviewee_id, reviewer_role,
      due_at, blocks_at
    ) VALUES (
      NEW.id, NEW.professional_id, NEW.client_id, 'professional',
      now() + INTERVAL '48 hours', now() + INTERVAL '48 hours'
    ) ON CONFLICT (service_request_id, reviewer_role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_pending_reviews ON public.service_requests;
CREATE TRIGGER trg_fixr_pending_reviews
  AFTER INSERT OR UPDATE OF status ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public._fixr_create_pending_reviews();

-- ────────────────────────────────────────────────────────────
-- 4. Trigger: ao inserir review, marca pendência como fulfilled
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._fixr_fulfill_pending_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.service_request_id IS NOT NULL THEN
    UPDATE public.pending_reviews
       SET fulfilled = true,
           updated_at = now()
     WHERE service_request_id = NEW.service_request_id
       AND reviewer_role = NEW.reviewer_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixr_fulfill_pending ON public.reviews;
CREATE TRIGGER trg_fixr_fulfill_pending
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public._fixr_fulfill_pending_review();

-- ────────────────────────────────────────────────────────────
-- 5. Função: processa pendências vencidas (auto-3★ cliente)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_process_overdue_reviews()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row    RECORD;
  v_count  INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT *
      FROM public.pending_reviews
     WHERE fulfilled = false
       AND reviewer_role = 'client'
       AND due_at <= now()
     LIMIT 500
  LOOP
    -- Cria review automático 3★
    INSERT INTO public.reviews (
      client_id, professional_id, service_request_id,
      rating, comment, reviewer_role, auto_generated,
      pontualidade, qualidade, comunicacao, preco_justo
    ) VALUES (
      v_row.reviewer_id, v_row.reviewee_id, v_row.service_request_id,
      3, 'Avaliação automática: cliente não avaliou em 72h.',
      'client', true, 3, 3, 3, 3
    ) ON CONFLICT (service_request_id, reviewer_role) DO NOTHING;

    UPDATE public.pending_reviews
       SET fulfilled = true, auto_filled = true, updated_at = now()
     WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fixr_process_overdue_reviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fixr_process_overdue_reviews() TO service_role;

-- ────────────────────────────────────────────────────────────
-- 6. Função: pro bloqueado de aceitar novos pedidos?
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fixr_pro_blocked_by_pending(_pro UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pending_reviews
     WHERE reviewer_id = _pro
       AND reviewer_role = 'professional'
       AND fulfilled = false
       AND blocks_at IS NOT NULL
       AND blocks_at <= now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.fixr_pro_blocked_by_pending(UUID) TO authenticated, service_role;

-- ────────────────────────────────────────────────────────────
-- 7. pg_cron: processa reviews vencidos a cada hora
-- ────────────────────────────────────────────────────────────

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('fixr_overdue_reviews');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'fixr_overdue_reviews',
      '5 * * * *',
      'SELECT public.fixr_process_overdue_reviews();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled — reviews vencidos precisam de disparo externo';
  END IF;
END
$outer$;
