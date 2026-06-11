-- ============================================================
-- MIGRATION 004 — Tabela de aprovações de peças
-- Rodar em: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS aprovacoes (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aprovacao_id             TEXT UNIQUE NOT NULL,           -- ID externo da JG
  cliente_id               UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome             TEXT,
  social_media_responsavel TEXT,
  tipo_conteudo            TEXT NOT NULL,                  -- 'video' | 'estatico'
  plataforma               TEXT NOT NULL,                  -- 'instagram' | 'facebook' | etc
  data_publicacao_prevista TIMESTAMPTZ,
  descricao_post           TEXT,
  conteudo                 JSONB,                          -- {tipo_entrega, url, nome_arquivo, formato, tamanho_bytes}
  legenda_sugerida         TEXT,
  observacoes_internas     TEXT,
  prazo_resposta           TIMESTAMPTZ,
  callback_url             TEXT,
  callback_token           TEXT,
  status                   TEXT NOT NULL DEFAULT 'aguardando_aprovacao',
  -- 'aguardando_aprovacao' | 'aprovado' | 'reprovado' | 'revisao'
  resposta_comentario      TEXT,
  respondido_em            TIMESTAMPTZ,
  respondido_por           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS aprovacoes_cliente_id_idx  ON aprovacoes(cliente_id);
CREATE INDEX IF NOT EXISTS aprovacoes_status_idx      ON aprovacoes(status);

-- RLS
ALTER TABLE aprovacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "aprovacoes_select" ON aprovacoes
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "aprovacoes_update" ON aprovacoes
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "aprovacoes_insert" ON aprovacoes
  FOR INSERT WITH CHECK (true);

-- Verifica
SELECT 'aprovacoes criada' AS resultado;
