-- ============================================================
-- JG App — Schema Supabase completo
-- Cole no SQL Editor do Supabase para criar todas as tabelas
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================================
-- TABELAS
-- ============================================================

-- Profiles (espelha auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gestor_trafego', 'editor', 'social_media', 'freelancer', 'cliente')),
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  segmento TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'inativo', 'inadimplente')),
  mensalidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_renovacao DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  campanha_status TEXT NOT NULL DEFAULT 'ativa' CHECK (campanha_status IN ('ativa', 'pausada')),
  whatsapp_grupo TEXT,
  gestor_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relacionamento cliente-usuário (clientes podem ter múltiplos usuários no app)
CREATE TABLE cliente_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, profile_id)
);

-- DNA da marca
CREATE TABLE cliente_dna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao TEXT,
  diferencial TEXT,
  persona_descricao TEXT,
  persona_interesses TEXT[] NOT NULL DEFAULT '{}',
  tom_de_voz TEXT[] NOT NULL DEFAULT '{}',
  exemplo_copy TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id)
);

-- Ativos da marca (logo, paleta, fotos, vídeos)
CREATE TABLE cliente_ativos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('logo', 'paleta', 'fotos', 'videos')),
  url TEXT NOT NULL,
  nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'atrasado', 'cancelado')),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  competencia TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verbas de tráfego
CREATE TABLE verbas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mes TEXT NOT NULL, -- YYYY-MM
  verba_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  verba_meta NUMERIC(10,2),
  verba_google NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, mes)
);

-- Produções de conteúdo
CREATE TABLE producoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('video', 'imagem', 'copy', 'story', 'reels')),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'editando', 'aguardando_aprovacao', 'aprovada', 'reprovada', 'agendada', 'publicada')),
  responsavel_id UUID REFERENCES profiles(id),
  preview_url TEXT,
  duracao_segundos INTEGER,
  aprovado_em TIMESTAMPTZ,
  aprovado_por UUID REFERENCES profiles(id),
  reprovado_motivo TEXT,
  data_publicacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários em produções
CREATE TABLE producao_comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producao_id UUID NOT NULL REFERENCES producoes(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id),
  mensagem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metas mensais
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mes TEXT NOT NULL, -- YYYY-MM
  valor_meta NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_atual NUMERIC(10,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, mes)
);

-- Itens da meta
CREATE TABLE meta_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meta_id UUID NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  responsavel TEXT NOT NULL CHECK (responsavel IN ('jg', 'cliente')),
  categoria TEXT,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  prazo DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agenda de otimização
CREATE TABLE agenda_otimizacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES profiles(id),
  data_hora TIMESTAMPTZ NOT NULL,
  descricao TEXT NOT NULL,
  plataformas TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'em_andamento', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshots de tráfego
CREATE TABLE trafego_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  plataforma TEXT NOT NULL CHECK (plataforma IN ('meta', 'google', 'tiktok')),
  mes TEXT NOT NULL, -- YYYY-MM
  investido NUMERIC(10,2) NOT NULL DEFAULT 0,
  alcance INTEGER,
  impressoes INTEGER,
  cliques INTEGER,
  leads INTEGER,
  conversoes INTEGER,
  roas NUMERIC(8,2),
  cpc NUMERIC(8,2),
  cpl NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, plataforma, mes)
);

-- Criativos
CREATE TABLE criativos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  plataforma TEXT NOT NULL CHECK (plataforma IN ('meta', 'google', 'tiktok')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  thumbnail_url TEXT,
  ctr NUMERIC(6,3),
  impressoes INTEGER,
  cliques INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pesquisas NPS
CREATE TABLE nps_pesquisas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mes TEXT NOT NULL UNIQUE, -- YYYY-MM
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votos NPS
CREATE TABLE nps_votos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pesquisa_id UUID NOT NULL REFERENCES nps_pesquisas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES profiles(id),
  nota INTEGER NOT NULL CHECK (nota BETWEEN 0 AND 10),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pesquisa_id, cliente_id)
);

-- Feedbacks
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('elogio', 'sugestao', 'reclamacao')),
  mensagem TEXT NOT NULL,
  respondido BOOLEAN NOT NULL DEFAULT false,
  resposta TEXT,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificações in-app
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('campanha_alerta', 'producao_status', 'meta_update', 'pagamento', 'feedback_novo', 'geral')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push tokens
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  plataforma TEXT NOT NULL CHECK (plataforma IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demandas
CREATE TABLE demandas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  responsavel_id UUID NOT NULL REFERENCES profiles(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  prazo DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_clientes_gestor ON clientes(gestor_id);
CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_clientes_health ON clientes(health_score);
CREATE INDEX idx_producoes_cliente ON producoes(cliente_id);
CREATE INDEX idx_producoes_status ON producoes(status);
CREATE INDEX idx_metas_cliente_mes ON metas(cliente_id, mes);
CREATE INDEX idx_meta_itens_meta ON meta_itens(meta_id);
CREATE INDEX idx_trafego_cliente_mes ON trafego_snapshots(cliente_id, mes);
CREATE INDEX idx_agenda_cliente ON agenda_otimizacao(cliente_id);
CREATE INDEX idx_agenda_data ON agenda_otimizacao(data_hora);
CREATE INDEX idx_notificacoes_profile ON notificacoes(profile_id, lida);
CREATE INDEX idx_demandas_responsavel ON demandas(responsavel_id, status);
CREATE INDEX idx_nps_votos_pesquisa ON nps_votos(pesquisa_id);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_producoes_updated_at BEFORE UPDATE ON producoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_metas_updated_at BEFORE UPDATE ON metas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_trafego_updated_at BEFORE UPDATE ON trafego_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_push_tokens_updated_at BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_demandas_updated_at BEFORE UPDATE ON demandas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: criar profile automaticamente após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNÇÃO: calcular_health_score
-- ============================================================

CREATE OR REPLACE FUNCTION calcular_health_score(p_cliente_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 100;
  v_mes TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_pagamento_status TEXT;
  v_nps_nota NUMERIC;
  v_producoes_aprovadas INTEGER;
  v_meta_pct NUMERIC;
  v_dias_sem_otimizacao INTEGER;
BEGIN
  -- Pagamento (-30 se atrasado)
  SELECT status INTO v_pagamento_status
  FROM pagamentos
  WHERE cliente_id = p_cliente_id AND competencia = v_mes
  ORDER BY created_at DESC LIMIT 1;

  IF v_pagamento_status = 'atrasado' THEN v_score := v_score - 30;
  ELSIF v_pagamento_status = 'pendente' THEN v_score := v_score - 10;
  END IF;

  -- NPS recente (-20 se nota <= 6)
  SELECT AVG(nota) INTO v_nps_nota
  FROM nps_votos nv
  JOIN nps_pesquisas np ON np.id = nv.pesquisa_id
  WHERE nv.cliente_id = p_cliente_id AND np.mes = v_mes;

  IF v_nps_nota IS NOT NULL AND v_nps_nota <= 6 THEN v_score := v_score - 20;
  ELSIF v_nps_nota IS NOT NULL AND v_nps_nota <= 7 THEN v_score := v_score - 10;
  END IF;

  -- Produções aprovadas no mês (+/- 10)
  SELECT COUNT(*) INTO v_producoes_aprovadas
  FROM producoes
  WHERE cliente_id = p_cliente_id
    AND status = 'aprovada'
    AND created_at >= DATE_TRUNC('month', NOW());

  IF v_producoes_aprovadas = 0 THEN v_score := v_score - 10; END IF;

  -- Meta do mês
  SELECT CASE WHEN valor_meta > 0 THEN (valor_atual / valor_meta) * 100 ELSE 100 END
  INTO v_meta_pct
  FROM metas WHERE cliente_id = p_cliente_id AND mes = v_mes;

  IF v_meta_pct IS NOT NULL AND v_meta_pct < 50 THEN v_score := v_score - 15;
  ELSIF v_meta_pct IS NOT NULL AND v_meta_pct < 75 THEN v_score := v_score - 5;
  END IF;

  -- Última otimização (>7 dias sem = -10)
  SELECT EXTRACT(EPOCH FROM (NOW() - MAX(data_hora))) / 86400
  INTO v_dias_sem_otimizacao
  FROM agenda_otimizacao
  WHERE cliente_id = p_cliente_id AND status = 'concluido';

  IF v_dias_sem_otimizacao IS NULL OR v_dias_sem_otimizacao > 7 THEN
    v_score := v_score - 10;
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbas ENABLE ROW LEVEL SECURITY;
ALTER TABLE producoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_otimizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE trafego_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE criativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_pesquisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;

-- Profiles: cada um vê o próprio, admin vê todos
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_admin" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Clientes: equipe interna vê todos os seus, cliente vê só o próprio
CREATE POLICY "clientes_interno" ON clientes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','gestor_trafego','editor','social_media','freelancer'))
);
CREATE POLICY "clientes_cliente" ON clientes FOR SELECT USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = clientes.id AND profile_id = auth.uid())
);

-- Notificacoes: cada um vê as próprias
CREATE POLICY "notificacoes_own" ON notificacoes FOR ALL USING (profile_id = auth.uid());

-- Push tokens: próprios
CREATE POLICY "push_tokens_own" ON push_tokens FOR ALL USING (profile_id = auth.uid());

-- Producoes: equipe interna vê todas, cliente vê as suas
CREATE POLICY "producoes_interno" ON producoes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','gestor_trafego','editor','social_media','freelancer'))
);
CREATE POLICY "producoes_cliente" ON producoes FOR SELECT USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = producoes.cliente_id AND profile_id = auth.uid())
);
CREATE POLICY "producoes_cliente_update" ON producoes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = producoes.cliente_id AND profile_id = auth.uid())
);

-- Cliente DNA e Ativos: equipe vê todos, cliente vê os seus
CREATE POLICY "dna_interno" ON cliente_dna FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);
CREATE POLICY "dna_cliente" ON cliente_dna FOR ALL USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = cliente_dna.cliente_id AND profile_id = auth.uid())
);

CREATE POLICY "ativos_interno" ON cliente_ativos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);
CREATE POLICY "ativos_cliente" ON cliente_ativos FOR ALL USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = cliente_ativos.cliente_id AND profile_id = auth.uid())
);

-- Demandas: equipe vê as suas, admin vê todas
CREATE POLICY "demandas_proprio" ON demandas FOR ALL USING (
  responsavel_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Feedbacks: admin vê todos, cliente cria/vê os seus
CREATE POLICY "feedbacks_admin" ON feedbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "feedbacks_cliente" ON feedbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = feedbacks.cliente_id AND profile_id = auth.uid())
);

-- Tráfego: equipe vê tudo, cliente vê o seu
CREATE POLICY "trafego_interno" ON trafego_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);
CREATE POLICY "trafego_cliente" ON trafego_snapshots FOR SELECT USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = trafego_snapshots.cliente_id AND profile_id = auth.uid())
);

-- Criativos: mesmo padrão
CREATE POLICY "criativos_interno" ON criativos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);
CREATE POLICY "criativos_cliente" ON criativos FOR SELECT USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = criativos.cliente_id AND profile_id = auth.uid())
);

-- Metas e itens
CREATE POLICY "metas_interno" ON metas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);
CREATE POLICY "metas_cliente" ON metas FOR SELECT USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = metas.cliente_id AND profile_id = auth.uid())
);

CREATE POLICY "meta_itens_all" ON meta_itens FOR ALL USING (
  EXISTS (
    SELECT 1 FROM metas m
    JOIN cliente_usuarios cu ON cu.cliente_id = m.cliente_id
    WHERE m.id = meta_itens.meta_id AND (
      cu.profile_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
    )
  )
);

-- Agenda
CREATE POLICY "agenda_interno" ON agenda_otimizacao FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);
CREATE POLICY "agenda_cliente" ON agenda_otimizacao FOR SELECT USING (
  EXISTS (SELECT 1 FROM cliente_usuarios WHERE cliente_id = agenda_otimizacao.cliente_id AND profile_id = auth.uid())
);

-- NPS
CREATE POLICY "nps_pesquisas_all" ON nps_pesquisas FOR SELECT USING (true);
CREATE POLICY "nps_votos_all" ON nps_votos FOR ALL USING (
  cliente_id IN (SELECT cliente_id FROM cliente_usuarios WHERE profile_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);

-- Pagamentos e Verbas
CREATE POLICY "pagamentos_interno" ON pagamentos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);
CREATE POLICY "verbas_interno" ON verbas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);

-- Cliente Usuarios
CREATE POLICY "cu_self" ON cliente_usuarios FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "cu_interno" ON cliente_usuarios FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Comentários
CREATE POLICY "comentarios_access" ON producao_comentarios FOR ALL USING (
  profile_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role != 'cliente')
);

-- ============================================================
-- CRON: health score diário às 7h
-- ============================================================
-- Substitua SEU_PROJECT e SEU_ANON_KEY pelos valores reais:
--
-- SELECT cron.schedule('health-score-diario', '0 7 * * *',
--   $$ SELECT net.http_post(
--     url := 'https://SEU_PROJECT.supabase.co/functions/v1/health-score',
--     headers := '{"Authorization": "Bearer SEU_ANON_KEY"}'::jsonb
--   ) $$
-- );

-- ============================================================
-- REALTIME (habilitar nas tabelas que o app usa)
-- ============================================================
-- No painel Supabase > Database > Replication, habilite:
-- trafego_snapshots, notificacoes, producoes, demandas
