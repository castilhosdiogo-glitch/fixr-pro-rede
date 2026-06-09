-- ============================================================
-- geo_dispatch_smoke.sql
-- Smoke test SQL-only do motor de dispatch geográfico (migrations 033-036)
--
-- COMO RODAR
--   1. Abre o SQL editor do Supabase (projeto de produção).
--   2. Cola este arquivo inteiro em uma query nova.
--   3. Clica "Run". Se algum assert falhar, o bloco levanta EXCEPTION
--      e o runtime reverte a transação daquele bloco.
--   4. Ao final, o Bloco 99 limpa todos os dados seedados.
--
-- MARCADOR DE SEED
--   Todos os rows criados aqui usam emails terminando em
--   `@smoketest.local` OU nomes prefixados com `SMOKE_`.
--   O cleanup remove apenas esses.
--
-- SAFETY
--   - Idempotente: roda o cleanup antes do seed.
--   - Não toca em usuários reais (filtro por email/nome).
--   - Usa coords em SP (-23.55, -46.63) pra ficar longe de pros reais
--     (filtro de raio impede colisão).
--
-- ASSUNÇÕES (validar se falhar)
--   - SQL editor do Supabase roda como service_role, então consegue
--     INSERT direto em auth.users (normalmente permitido).
--   - matching_config.id='default' existe (seedado em 004).
--   - Categoria 'encanador' existe (seedada em 002).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Bloco 0 — Pre-cleanup + Seed
-- Remove qualquer lixo de rodadas anteriores, depois cria:
--   cliente SMOKE_cliente, pros SMOKE_a/b/c
-- Coords base (cliente): SP centro  -23.5505, -46.6333
-- ────────────────────────────────────────────────────────────

BEGIN;

-- Pre-cleanup surgical (mesma lógica do Bloco 99)
DELETE FROM public.request_dispatches
 WHERE professional_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );
DELETE FROM public.broadcast_requests
 WHERE client_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );
DELETE FROM public.curation_events
 WHERE professional_user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );
DELETE FROM public.fixr_score_history
 WHERE professional_user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );
DELETE FROM public.professional_metrics
 WHERE user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );
DELETE FROM public.professional_profiles
 WHERE user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );
DELETE FROM public.profiles
 WHERE user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );
DELETE FROM auth.users WHERE email LIKE '%@smoketest.local';

-- Seed dos usuários em auth.users
-- IDs fixos pra facilitar joins nos próximos blocos
-- raw_user_meta_data inclui user_type: trigger handle_new_user lê isso pra
-- decidir se cria professional_profile automaticamente.
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role, encrypted_password, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'smoke_cliente@smoketest.local', now(),
   '{"full_name":"SMOKE Cliente","user_type":"client"}'::jsonb, 'authenticated', 'authenticated', '', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'smoke_a@smoketest.local', now(),
   '{"full_name":"SMOKE Pro A","user_type":"professional","category_id":"encanador","category_name":"Encanador"}'::jsonb, 'authenticated', 'authenticated', '', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'smoke_b@smoketest.local', now(),
   '{"full_name":"SMOKE Pro B","user_type":"professional","category_id":"encanador","category_name":"Encanador"}'::jsonb, 'authenticated', 'authenticated', '', now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'smoke_c@smoketest.local', now(),
   '{"full_name":"SMOKE Pro C","user_type":"professional","category_id":"encanador","category_name":"Encanador"}'::jsonb, 'authenticated', 'authenticated', '', now(), now()),
  ('55555555-5555-5555-5555-555555555555', 'smoke_d@smoketest.local', now(),
   '{"full_name":"SMOKE Pro D","user_type":"professional","category_id":"eletricista","category_name":"Eletricista"}'::jsonb, 'authenticated', 'authenticated', '', now(), now());

-- O trigger on_auth_user_created já populou profiles + professional_profiles
-- (com category_id='geral'). Atualizamos abaixo pra setar cidade/categoria/geo.

-- profiles: completa city/state
UPDATE public.profiles SET city = 'São Paulo', state = 'SP'
 WHERE user_id IN (
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333',
   '44444444-4444-4444-4444-444444444444',
   '55555555-5555-5555-5555-555555555555'
 );

-- professional_profiles: trigger cria com category_id='geral'. Sobrescrevemos
-- com a categoria/geo/disponibilidade de teste.
--   A: ~500m,  disponivel, raio 10km, encanador  → DEVE bater
--   B: ~30km,  disponivel, raio 10km, encanador  → NÃO bate (fora de raio)
--   C: ~1km,   INdisponivel, raio 10km, encanador → NÃO bate (offline)
--   D: ~2km,  disponivel, raio 10km, eletricista → NÃO bate (outra categoria)
UPDATE public.professional_profiles
   SET category_id='encanador', category_name='Encanador',
       description='SMOKE pro A — perto e disponivel', verified=true,
       latitude=-23.5550, longitude=-46.6350, raio_km=10, disponivel=true,
       onboarding_completo=true, nivel_curadoria='fixr_explorador', bloqueado_ate=NULL
 WHERE user_id='22222222-2222-2222-2222-222222222222';

UPDATE public.professional_profiles
   SET category_id='encanador', category_name='Encanador',
       description='SMOKE pro B — 30km fora', verified=true,
       latitude=-23.8000, longitude=-46.6333, raio_km=10, disponivel=true,
       onboarding_completo=true, nivel_curadoria='fixr_explorador', bloqueado_ate=NULL
 WHERE user_id='33333333-3333-3333-3333-333333333333';

UPDATE public.professional_profiles
   SET category_id='encanador', category_name='Encanador',
       description='SMOKE pro C — perto mas offline', verified=true,
       latitude=-23.5600, longitude=-46.6400, raio_km=10, disponivel=false,
       onboarding_completo=true, nivel_curadoria='fixr_explorador', bloqueado_ate=NULL
 WHERE user_id='44444444-4444-4444-4444-444444444444';

UPDATE public.professional_profiles
   SET category_id='eletricista', category_name='Eletricista',
       description='SMOKE pro D — outra categoria', verified=true,
       latitude=-23.5520, longitude=-46.6340, raio_km=10, disponivel=true,
       onboarding_completo=true, nivel_curadoria='fixr_explorador', bloqueado_ate=NULL
 WHERE user_id='55555555-5555-5555-5555-555555555555';

-- professional_metrics (UPSERT — trigger NÃO cria essa tabela)
INSERT INTO public.professional_metrics (user_id, concurrent_active, acceptance_rate, avg_response_minutes, completed_count, last_active_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', 0, 0.9, 30, 10, now()),
  ('33333333-3333-3333-3333-333333333333', 0, 0.9, 30, 10, now()),
  ('44444444-4444-4444-4444-444444444444', 0, 0.9, 30, 10, now()),
  ('55555555-5555-5555-5555-555555555555', 0, 0.9, 30, 10, now())
ON CONFLICT (user_id) DO UPDATE SET
  concurrent_active    = EXCLUDED.concurrent_active,
  acceptance_rate      = EXCLUDED.acceptance_rate,
  avg_response_minutes = EXCLUDED.avg_response_minutes,
  completed_count      = EXCLUDED.completed_count,
  last_active_at       = EXCLUDED.last_active_at;

COMMIT;

-- ────────────────────────────────────────────────────────────
-- Bloco 1 — Happy path
-- Cliente cria broadcast; apenas Pro A deve ser selecionado.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_broadcast_id UUID := '99999999-0001-0000-0000-000000000000';
  v_dispatch_count INT;
  v_matched_pro UUID;
  v_final_status TEXT;
BEGIN
  -- Cleanup de broadcasts anteriores desse UUID fixo (idempotência)
  DELETE FROM public.request_dispatches WHERE broadcast_id = v_broadcast_id;
  DELETE FROM public.broadcast_requests WHERE id = v_broadcast_id;

  -- INSERT dispara _trigger_dispatch_on_broadcast que chama
  -- dispatch_broadcast_request automaticamente. Não chamamos de novo
  -- aqui pra não duplicar (a 2ª chamada excluiria o Pro A via v_excluded).
  INSERT INTO public.broadcast_requests
    (id, client_id, category_id, city, description, status, current_round, latitude, longitude, urgencia)
  VALUES
    (v_broadcast_id, '11111111-1111-1111-1111-111111111111', 'encanador', 'São Paulo',
     'SMOKE B1 — happy path', 'dispatching', 1, -23.5505, -46.6333, 'hoje');

  SELECT COUNT(*) INTO v_dispatch_count
    FROM public.request_dispatches
   WHERE broadcast_id = v_broadcast_id;

  SELECT professional_id INTO v_matched_pro
    FROM public.request_dispatches
   WHERE broadcast_id = v_broadcast_id
   LIMIT 1;

  SELECT status INTO v_final_status
    FROM public.broadcast_requests WHERE id = v_broadcast_id;

  RAISE NOTICE '[B1] dispatches=%, pro=%, status=%', v_dispatch_count, v_matched_pro, v_final_status;

  IF v_dispatch_count <> 1 THEN
    RAISE EXCEPTION '[B1 FAIL] esperado 1 dispatch, veio %', v_dispatch_count;
  END IF;
  IF v_matched_pro <> '22222222-2222-2222-2222-222222222222' THEN
    RAISE EXCEPTION '[B1 FAIL] esperado Pro A, veio %', v_matched_pro;
  END IF;
  IF v_final_status <> 'dispatching' THEN
    RAISE EXCEPTION '[B1 FAIL] status deveria ser dispatching (não expired), veio %', v_final_status;
  END IF;

  RAISE NOTICE '[B1 OK] Pro A matched com filtro de raio.';
END $$;

-- ────────────────────────────────────────────────────────────
-- Bloco 2 — No pros available → expired → sem_profissional
-- Usa categoria 'eletricista' mas com coords longe (500km) pra
-- forçar zero matches mesmo do Pro D.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_broadcast_id UUID := '99999999-0002-0000-0000-000000000000';
  v_dispatch_count INT;
  v_status TEXT;
  v_retry_after TIMESTAMPTZ;
BEGIN
  DELETE FROM public.request_dispatches WHERE broadcast_id = v_broadcast_id;
  DELETE FROM public.broadcast_requests WHERE id = v_broadcast_id;

  -- Rio de Janeiro coords — longe de todos os SMOKE pros.
  -- INSERT dispara _trigger_dispatch_on_broadcast → dispatch_broadcast_request
  -- automaticamente; trigger de 034 converte 'expired' em 'sem_profissional'.
  INSERT INTO public.broadcast_requests
    (id, client_id, category_id, city, description, status, current_round, latitude, longitude, urgencia)
  VALUES
    (v_broadcast_id, '11111111-1111-1111-1111-111111111111', 'eletricista', 'Rio de Janeiro',
     'SMOKE B2 — sem pros', 'dispatching', 1, -22.9068, -43.1729, 'hoje');

  SELECT COUNT(*) INTO v_dispatch_count
    FROM public.request_dispatches WHERE broadcast_id = v_broadcast_id;

  SELECT status, retry_after INTO v_status, v_retry_after
    FROM public.broadcast_requests WHERE id = v_broadcast_id;

  RAISE NOTICE '[B2] dispatches=%, status=%, retry_after=%', v_dispatch_count, v_status, v_retry_after;

  IF v_dispatch_count <> 0 THEN
    RAISE EXCEPTION '[B2 FAIL] esperado 0 dispatches, veio %', v_dispatch_count;
  END IF;
  -- trigger de 034 converte 'expired' pra 'sem_profissional' automaticamente
  IF v_status <> 'sem_profissional' THEN
    RAISE EXCEPTION '[B2 FAIL] status esperado sem_profissional, veio %', v_status;
  END IF;
  IF v_retry_after IS NULL OR v_retry_after < now() + INTERVAL '50 minutes' THEN
    RAISE EXCEPTION '[B2 FAIL] retry_after deveria estar ~1h à frente, veio %', v_retry_after;
  END IF;

  RAISE NOTICE '[B2 OK] broadcast vazio virou sem_profissional com retry_after.';
END $$;

-- ────────────────────────────────────────────────────────────
-- Bloco 3 — Decline penalty (3 recusas em 7 dias → -5 no score)
-- Registra baseline, insere 3 declines em Pro A, verifica
-- que recusas_7d >= 3 e que curation_events tem o alerta.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_pro UUID := '22222222-2222-2222-2222-222222222222';
  v_score_before NUMERIC;
  v_score_after NUMERIC;
  v_recusas INT;
  v_events INT;
  v_fb1 UUID := '99999999-0003-0000-0000-000000000001';
  v_fb2 UUID := '99999999-0003-0000-0000-000000000002';
  v_fb3 UUID := '99999999-0003-0000-0000-000000000003';
BEGIN
  -- Garante score baseline chamando recalculate_fixr_score
  PERFORM public.recalculate_fixr_score(v_pro, 'smoke_baseline');
  SELECT fixr_score INTO v_score_before
    FROM public.professional_profiles WHERE user_id = v_pro;

  RAISE NOTICE '[B3] score_before=%', v_score_before;

  -- Cria 3 broadcasts fake (constraint unique em broadcast_id+professional_id
  -- impede 3 declines do mesmo pro no mesmo broadcast)
  DELETE FROM public.request_dispatches WHERE broadcast_id IN (v_fb1, v_fb2, v_fb3);
  DELETE FROM public.broadcast_requests WHERE id IN (v_fb1, v_fb2, v_fb3);

  INSERT INTO public.broadcast_requests
    (id, client_id, category_id, city, description, status, current_round, latitude, longitude)
  VALUES
    (v_fb1, '11111111-1111-1111-1111-111111111111', 'encanador', 'São Paulo',
     'SMOKE B3 decline 1', 'cancelled', 1, -23.5505, -46.6333),
    (v_fb2, '11111111-1111-1111-1111-111111111111', 'encanador', 'São Paulo',
     'SMOKE B3 decline 2', 'cancelled', 1, -23.5505, -46.6333),
    (v_fb3, '11111111-1111-1111-1111-111111111111', 'encanador', 'São Paulo',
     'SMOKE B3 decline 3', 'cancelled', 1, -23.5505, -46.6333);

  -- Limpa eventos antigos de too_many_declines pra este pro (garante o assert)
  DELETE FROM public.curation_events
    WHERE professional_user_id = v_pro AND event_type = 'too_many_declines';

  -- Insere 3 declines (1 por broadcast). Cada INSERT dispara o trigger
  -- _fixr_trg_dispatch_decline, que recalcula o score e loga curation_event no 3º.
  INSERT INTO public.request_dispatches (broadcast_id, professional_id, round, score, status, dispatched_at, responded_at, expires_at)
  VALUES
    (v_fb1, v_pro, 1, 1.0, 'declined', now() - INTERVAL '3 hours', now() - INTERVAL '3 hours', now() + INTERVAL '1 hour');
  INSERT INTO public.request_dispatches (broadcast_id, professional_id, round, score, status, dispatched_at, responded_at, expires_at)
  VALUES
    (v_fb2, v_pro, 1, 1.0, 'declined', now() - INTERVAL '2 hours', now() - INTERVAL '2 hours', now() + INTERVAL '1 hour');
  INSERT INTO public.request_dispatches (broadcast_id, professional_id, round, score, status, dispatched_at, responded_at, expires_at)
  VALUES
    (v_fb3, v_pro, 1, 1.0, 'declined', now() - INTERVAL '1 hour',  now() - INTERVAL '1 hour',  now() + INTERVAL '1 hour');

  SELECT fixr_score, recusas_7d
    INTO v_score_after, v_recusas
    FROM public.professional_profiles WHERE user_id = v_pro;

  SELECT COUNT(*) INTO v_events
    FROM public.curation_events
   WHERE professional_user_id = v_pro
     AND event_type = 'too_many_declines'
     AND created_at >= now() - INTERVAL '5 minutes';

  RAISE NOTICE '[B3] score_after=%, recusas_7d=%, events=%', v_score_after, v_recusas, v_events;

  IF v_recusas < 3 THEN
    RAISE EXCEPTION '[B3 FAIL] recusas_7d esperado >=3, veio %', v_recusas;
  END IF;
  -- tolerância 0.5 pra variações de outros componentes entre recálculos
  IF v_score_after > v_score_before - 4.5 THEN
    RAISE EXCEPTION '[B3 FAIL] esperada queda de ~5, score_before=% score_after=%',
      v_score_before, v_score_after;
  END IF;
  IF v_events < 1 THEN
    RAISE EXCEPTION '[B3 FAIL] curation_event too_many_declines não foi emitido';
  END IF;

  RAISE NOTICE '[B3 OK] penalidade -5 aplicada e evento logado.';
END $$;

-- ────────────────────────────────────────────────────────────
-- Bloco 4 — Rescue tick reativa sem_profissional
-- Pega broadcast do B2, força retry_after pro passado, seeda
-- um Pro E próximo ao RJ, roda rescue, confirma reativação.
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_broadcast_id UUID := '99999999-0002-0000-0000-000000000000';
  v_processed INT;
  v_status TEXT;
  v_retry_count INT;
  v_round INT;
  v_pro_e UUID := '66666666-6666-6666-6666-666666666666';
BEGIN
  -- Seeda Pro E no RJ (coords do broadcast B2)
  DELETE FROM public.professional_metrics WHERE user_id = v_pro_e;
  DELETE FROM public.professional_profiles WHERE user_id = v_pro_e;
  DELETE FROM public.profiles WHERE user_id = v_pro_e;
  DELETE FROM auth.users WHERE id = v_pro_e;

  INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role, encrypted_password, created_at, updated_at)
  VALUES (v_pro_e, 'smoke_e@smoketest.local', now(),
    '{"full_name":"SMOKE Pro E","user_type":"professional","category_id":"eletricista","category_name":"Eletricista"}'::jsonb,
    'authenticated', 'authenticated', '', now(), now());

  -- trigger já criou profiles e professional_profiles; atualizamos
  UPDATE public.profiles SET city='Rio de Janeiro', state='RJ' WHERE user_id=v_pro_e;

  UPDATE public.professional_profiles
     SET category_id='eletricista', category_name='Eletricista',
         description='SMOKE pro E no RJ', verified=true,
         latitude=-22.9068, longitude=-43.1729, raio_km=10, disponivel=true,
         onboarding_completo=true, nivel_curadoria='fixr_explorador'
   WHERE user_id=v_pro_e;

  INSERT INTO public.professional_metrics (user_id, concurrent_active, acceptance_rate, avg_response_minutes, completed_count, last_active_at)
  VALUES (v_pro_e, 0, 0.9, 30, 10, now())
  ON CONFLICT (user_id) DO UPDATE SET last_active_at = EXCLUDED.last_active_at;

  -- Força retry_after pro passado (simula que 1h passou)
  UPDATE public.broadcast_requests
     SET retry_after = now() - INTERVAL '1 minute'
   WHERE id = v_broadcast_id;

  SELECT public.fixr_dispatch_rescue_tick() INTO v_processed;

  SELECT status, retry_count, current_round
    INTO v_status, v_retry_count, v_round
    FROM public.broadcast_requests WHERE id = v_broadcast_id;

  RAISE NOTICE '[B4] processed=%, status=%, retry_count=%, round=%',
    v_processed, v_status, v_retry_count, v_round;

  IF v_processed < 1 THEN
    RAISE EXCEPTION '[B4 FAIL] rescue_tick retornou %, esperado >=1', v_processed;
  END IF;
  IF v_status <> 'dispatching' THEN
    RAISE EXCEPTION '[B4 FAIL] status esperado dispatching, veio %', v_status;
  END IF;
  IF v_retry_count < 1 THEN
    RAISE EXCEPTION '[B4 FAIL] retry_count esperado >=1, veio %', v_retry_count;
  END IF;

  RAISE NOTICE '[B4 OK] broadcast sem_profissional foi reativado.';
END $$;

-- ────────────────────────────────────────────────────────────
-- Bloco 99 — Cleanup
-- Remove todos os rows criados pelos SMOKE. Idempotente.
-- ────────────────────────────────────────────────────────────

BEGIN;

DELETE FROM public.request_dispatches
 WHERE professional_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );

DELETE FROM public.broadcast_requests
 WHERE client_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );

DELETE FROM public.curation_events
 WHERE professional_user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );

DELETE FROM public.fixr_score_history
 WHERE professional_user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );

DELETE FROM public.professional_metrics
 WHERE user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );

DELETE FROM public.professional_profiles
 WHERE user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );

DELETE FROM public.profiles
 WHERE user_id IN (
   SELECT id FROM auth.users WHERE email LIKE '%@smoketest.local'
 );

DELETE FROM auth.users WHERE email LIKE '%@smoketest.local';

COMMIT;

-- ============================================================
-- FIM. Se chegou aqui sem RAISE EXCEPTION, todos os 4 blocos
-- passaram. Confere os NOTICE no painel "Messages" do SQL editor.
-- ============================================================
