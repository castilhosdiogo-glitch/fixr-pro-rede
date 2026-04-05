-- Migration: Update Plans and Add Elite Features
-- Description: Rename plans, update limits, and add tables for Elite features
-- Date: 2026-04-05

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Update subscription_plans table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Rename existing plans
UPDATE subscription_plans SET name = 'Explorador' WHERE slug = 'free';
UPDATE subscription_plans SET name = 'Parceiro' WHERE slug = 'pro';
UPDATE subscription_plans SET name = 'Elite' WHERE slug = 'premium';

-- Update plan details
UPDATE subscription_plans SET
  monthly_price = 0,
  description = 'Ideal para quem está começando',
  features = jsonb_build_object(
    'pedidos_mensais', 8,
    'chat_texto', true,
    'chat_audio', false,
    'chat_foto', false,
    'chat_video', false,
    'hub_fiscal', false,
    'nfse', false,
    'das_alerts', false,
    'mei_guide', false,
    'comissao_percentual', 15,
    'destaque_busca', false,
    'badge_parceiro', false,
    'badge_elite', false,
    'agenda_integrada', false,
    'orcamento_personalizado', false,
    'gestao_equipe', false,
    'portfolio_publico', false,
    'alerta_limite_mei', false
  )
WHERE slug = 'free';

UPDATE subscription_plans SET
  monthly_price = 19.90,
  description = 'Para profissionais que querem crescer',
  features = jsonb_build_object(
    'pedidos_mensais', -1,
    'chat_texto', true,
    'chat_audio', true,
    'chat_foto', true,
    'chat_video', false,
    'hub_fiscal', true,
    'nfse', true,
    'das_alerts', true,
    'mei_guide', true,
    'comissao_percentual', 12,
    'destaque_busca', true,
    'badge_parceiro', true,
    'badge_elite', false,
    'agenda_integrada', false,
    'orcamento_personalizado', false,
    'gestao_equipe', false,
    'portfolio_publico', false,
    'alerta_limite_mei', false
  )
WHERE slug = 'pro';

UPDATE subscription_plans SET
  monthly_price = 39.90,
  description = 'Para profissionais que dominam o mercado',
  features = jsonb_build_object(
    'pedidos_mensais', -1,
    'chat_texto', true,
    'chat_audio', true,
    'chat_foto', true,
    'chat_video', true,
    'hub_fiscal', true,
    'nfse', true,
    'das_alerts', true,
    'mei_guide', true,
    'comissao_percentual', 10,
    'destaque_busca', true,
    'badge_parceiro', false,
    'badge_elite', true,
    'agenda_integrada', true,
    'orcamento_personalizado', true,
    'gestao_equipe', true,
    'portfolio_publico', true,
    'alerta_limite_mei', true
  )
WHERE slug = 'premium';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Update messages table - add media support
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto', 'audio', 'foto', 'video')),
ADD COLUMN IF NOT EXISTS arquivo_url TEXT,
ADD COLUMN IF NOT EXISTS duracao INTEGER;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Create schedules table (Elite feature)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  disponivel BOOLEAN DEFAULT TRUE,
  servico_id UUID REFERENCES services(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_profissional_id ON schedules(profissional_id);
CREATE INDEX IF NOT EXISTS idx_schedules_data ON schedules(data);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Create quotes table (Elite feature)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  servico_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  itens_json JSONB NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  validade TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_servico_id ON quotes(servico_id);
CREATE INDEX IF NOT EXISTS idx_quotes_profissional_id ON quotes(profissional_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Create team_members table (Elite feature)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  funcao VARCHAR(100) NOT NULL,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_profissional_id ON team_members(profissional_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Create portfolio table (Elite feature)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  legenda TEXT,
  servico_id UUID REFERENCES services(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_profissional_id ON portfolio(profissional_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. Add MEI limit tracking columns to professionals
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS faturamento_acumulado DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS limite_mei_alerta_70_enviado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS limite_mei_alerta_90_enviado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS limite_mei_alerta_100_enviado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ano_fiscal_atual INTEGER DEFAULT EXTRACT(YEAR FROM NOW());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. Create mei_limit_logs table for audit trail
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS mei_limit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  percentual DECIMAL(5, 2) NOT NULL,
  faturamento_atual DECIMAL(15, 2) NOT NULL,
  evento VARCHAR(50) NOT NULL,
  notificacao_enviada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mei_limit_logs_profissional_id ON mei_limit_logs(profissional_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. Enable RLS on new tables
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE mei_limit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for schedules
CREATE POLICY "Profissional pode ver e gerenciar seus agendamentos"
  ON schedules FOR ALL
  USING (profissional_id = auth.uid())
  WITH CHECK (profissional_id = auth.uid());

CREATE POLICY "Clientes podem ver agendamentos disponíveis"
  ON schedules FOR SELECT
  USING (disponivel = true);

-- Policies for quotes
CREATE POLICY "Profissional pode ver e gerenciar seus orçamentos"
  ON quotes FOR ALL
  USING (profissional_id = auth.uid())
  WITH CHECK (profissional_id = auth.uid());

-- Policies for team_members
CREATE POLICY "Profissional pode gerenciar sua equipe"
  ON team_members FOR ALL
  USING (profissional_id = auth.uid())
  WITH CHECK (profissional_id = auth.uid());

-- Policies for portfolio
CREATE POLICY "Profissional pode gerenciar seu portfólio"
  ON portfolio FOR ALL
  USING (profissional_id = auth.uid())
  WITH CHECK (profissional_id = auth.uid());

CREATE POLICY "Qualquer um pode ver portfólio público"
  ON portfolio FOR SELECT
  USING (true);

-- Policies for mei_limit_logs
CREATE POLICY "Usuário pode ver seus logs de limite MEI"
  ON mei_limit_logs FOR SELECT
  USING (profissional_id = auth.uid());
