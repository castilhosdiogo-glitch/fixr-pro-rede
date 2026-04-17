-- ============================================================
-- geo_dispatch_loadtest.sql
-- Load test SQL-only do motor de dispatch geográfico.
--
-- OBJETIVO
--   Medir latência de dispatch_broadcast_request sob carga:
--   seed N pros no raio, roda K broadcasts, reporta p50/p95/p99.
--
-- COMO RODAR
--   1. Abre o SQL editor do Supabase (preferencialmente em staging).
--   2. AJUSTA N_PROS e K_BROADCASTS nos comandos SET abaixo.
--   3. Cola este arquivo inteiro em uma query nova.
--   4. Clica "Run". O Bloco 99 limpa tudo ao final.
--
-- RECOMENDAÇÃO
--   Roda 3×, dobrando N_PROS: 100 → 500 → 1000.
--   Observa como p95 escala. Se p95 dobrar com N, é O(n) → precisa
--   de índice espacial. Se subir linear/sub-linear, tá ok.
--
-- MARCADOR
--   Todos os emails terminam em '@loadtest.local'. Cleanup cirúrgico.
--
-- ⚠️  NÃO RODAR EM PROD COM USUÁRIOS ATIVOS
--    Insere milhares de pros fake temporariamente. Prefere um
--    branch de staging ou um horário de baixo tráfego.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Config — EDITA AQUI antes de rodar
-- ────────────────────────────────────────────────────────────

SET fixr.loadtest_n_pros       = '500';   -- quantos pros fake no raio
SET fixr.loadtest_k_broadcasts = '20';    -- quantos broadcasts medir

-- ────────────────────────────────────────────────────────────
-- Bloco 0 — Pre-cleanup
-- ────────────────────────────────────────────────────────────

BEGIN;

DELETE FROM public.request_dispatches
 WHERE professional_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local')
    OR broadcast_id IN (SELECT id FROM public.broadcast_requests WHERE description LIKE 'LOADTEST%');
DELETE FROM public.broadcast_requests
 WHERE client_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM public.professional_metrics
 WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM public.professional_profiles
 WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM public.profiles
 WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM auth.users WHERE email LIKE '%@loadtest.local';

COMMIT;

-- ────────────────────────────────────────────────────────────
-- Bloco 1 — Seed 1 cliente + N pros fake
-- Pros com coords aleatórias num quadrado de ~30km em SP.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  n INT := current_setting('fixr.loadtest_n_pros')::INT;
  i INT;
  v_id UUID;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_client_id UUID := '00000000-0000-0000-0000-000000000aaa';
BEGIN
  -- Cliente fixo (reusado pelos K broadcasts)
  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role, encrypted_password, created_at, updated_at)
  VALUES (v_client_id, 'loadtest_client@loadtest.local', now(),
    '{"full_name":"LOADTEST Client","user_type":"client"}'::jsonb,
    'authenticated', 'authenticated', '', now(), now());
  UPDATE public.profiles SET city='São Paulo', state='SP' WHERE user_id = v_client_id;

  -- Pros
  FOR i IN 1..n LOOP
    v_id  := gen_random_uuid();
    -- ~15km N/S e E/W a partir do centro (-23.55, -46.63)
    v_lat := -23.55 + (random() - 0.5) * 0.27;
    v_lng := -46.63 + (random() - 0.5) * 0.27;

    INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role, encrypted_password, created_at, updated_at)
    VALUES (v_id, 'loadtest_' || i || '@loadtest.local', now(),
      ('{"full_name":"LOADTEST Pro ' || i || '","user_type":"professional","category_id":"encanador","category_name":"Encanador"}')::jsonb,
      'authenticated', 'authenticated', '', now(), now());

    UPDATE public.profiles SET city='São Paulo', state='SP' WHERE user_id = v_id;

    UPDATE public.professional_profiles
       SET category_id='encanador', category_name='Encanador',
           description='LOADTEST pro ' || i, verified=true,
           latitude=v_lat, longitude=v_lng, raio_km=10, disponivel=true,
           onboarding_completo=true, nivel_curadoria='fixr_explorador', bloqueado_ate=NULL
     WHERE user_id = v_id;

    INSERT INTO public.professional_metrics (user_id, concurrent_active, acceptance_rate, avg_response_minutes, completed_count, last_active_at)
    VALUES (v_id, 0, 0.9, 30, 10, now())
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE '[SEED] % pros criados no raio', n;
END $$;

-- ────────────────────────────────────────────────────────────
-- Bloco 2 — Warm-up: 1 broadcast pra aquecer cache/planner
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  bc_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.broadcast_requests
    (id, client_id, category_id, city, description, status, current_round, latitude, longitude, urgencia)
  VALUES (bc_id, '00000000-0000-0000-0000-000000000aaa', 'encanador', 'São Paulo',
          'LOADTEST warmup', 'dispatching', 1, -23.55, -46.63, 'hoje');
  RAISE NOTICE '[WARMUP] done';
END $$;

-- ────────────────────────────────────────────────────────────
-- Bloco 3 — Benchmark: K broadcasts, mede latência de cada INSERT
-- (INSERT dispara _trigger_dispatch_on_broadcast → dispatch_broadcast_request)
-- ────────────────────────────────────────────────────────────

CREATE TEMP TABLE IF NOT EXISTS loadtest_results (
  iter        INT,
  duration_ms NUMERIC,
  dispatches  INT
);
TRUNCATE loadtest_results;

DO $$
DECLARE
  k INT := current_setting('fixr.loadtest_k_broadcasts')::INT;
  i INT;
  v_bc UUID;
  v_t_start TIMESTAMPTZ;
  v_t_end   TIMESTAMPTZ;
  v_count INT;
BEGIN
  FOR i IN 1..k LOOP
    v_bc := gen_random_uuid();
    v_t_start := clock_timestamp();

    INSERT INTO public.broadcast_requests
      (id, client_id, category_id, city, description, status, current_round, latitude, longitude, urgencia)
    VALUES (v_bc, '00000000-0000-0000-0000-000000000aaa', 'encanador', 'São Paulo',
            'LOADTEST broadcast ' || i, 'dispatching', 1, -23.55, -46.63, 'hoje');

    v_t_end := clock_timestamp();

    SELECT COUNT(*) INTO v_count
      FROM public.request_dispatches WHERE broadcast_id = v_bc;

    INSERT INTO loadtest_results VALUES (i, EXTRACT(EPOCH FROM (v_t_end - v_t_start)) * 1000, v_count);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- Bloco 4 — Plano de query do core do dispatch
-- Revela se há seq scan em professional_profiles (culpado O(n)).
--
-- Se vir "Seq Scan on professional_profiles" com "rows=<N_PROS>":
-- → precisa de índice. Opções:
--    a) btree composto: (category_id, disponivel) WHERE disponivel
--    b) PostGIS GiST: geography(ST_MakePoint(lng, lat)) com ST_DWithin
-- Se vir "Index Scan": tá ok.
-- ────────────────────────────────────────────────────────────

EXPLAIN (ANALYZE, BUFFERS)
SELECT pp.user_id
  FROM public.professional_profiles pp
  JOIN public.profiles pr ON pr.user_id = pp.user_id
  LEFT JOIN public.professional_metrics pm ON pm.user_id = pp.user_id
 WHERE pp.category_id = 'encanador'
   AND COALESCE(pp.disponivel, false) = true
   AND COALESCE(pp.onboarding_completo, false) = true
   AND COALESCE(pp.nivel_curadoria, 'fixr_explorador') != 'fixr_restrito'
   AND (pp.bloqueado_ate IS NULL OR pp.bloqueado_ate < now())
 LIMIT 20;

-- ────────────────────────────────────────────────────────────
-- Bloco 5 — Relatório de percentis (este é o resultado principal)
-- Última SELECT do arquivo → aparece na aba ativa do SQL editor.
-- ────────────────────────────────────────────────────────────

SELECT
  (SELECT current_setting('fixr.loadtest_n_pros')::INT)       AS n_pros,
  COUNT(*)                                                    AS broadcasts,
  ROUND(AVG(duration_ms)::numeric,    1)                      AS avg_ms,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms)::numeric, 1) AS p50_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 1) AS p95_ms,
  ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)::numeric, 1) AS p99_ms,
  ROUND(MAX(duration_ms)::numeric,    1)                      AS max_ms,
  ROUND(AVG(dispatches)::numeric,     1)                      AS avg_dispatches
FROM loadtest_results;

-- ────────────────────────────────────────────────────────────
-- Bloco 99 — Cleanup
-- ────────────────────────────────────────────────────────────

BEGIN;

DELETE FROM public.request_dispatches
 WHERE professional_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local')
    OR broadcast_id IN (SELECT id FROM public.broadcast_requests WHERE description LIKE 'LOADTEST%');
DELETE FROM public.broadcast_requests
 WHERE client_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM public.professional_metrics
 WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM public.professional_profiles
 WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM public.profiles
 WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@loadtest.local');
DELETE FROM auth.users WHERE email LIKE '%@loadtest.local';

COMMIT;

-- ============================================================
-- INTERPRETAÇÃO DOS RESULTADOS
--
-- p95 sob 200ms com 1000 pros → motor saudável pro MVP.
-- p95 entre 200-500ms com 1000 → ok, mas priorizar índice logo.
-- p95 > 500ms com 1000 → URGENTE, motor não escala.
--
-- Se Bloco 5 mostrar "Seq Scan" com rows ≈ N_PROS:
--   Criar migration 040_geo_indexes.sql com:
--     CREATE INDEX idx_pp_disponivel_category
--       ON professional_profiles (category_id, disponivel, onboarding_completo)
--       WHERE disponivel = true AND onboarding_completo = true;
--   Roda o load test de novo. p95 deve cair ≥ 5×.
--
-- Se push fanout (net.http_post no trigger) estiver no caminho crítico,
-- o INSERT incluirá tempo de edge. Se p95 for instável (varia muito
-- entre runs), o culpado é o push, não o dispatch em si.
-- ============================================================
