-- ============================================================
-- MIGRATION 003 — roteiro em gravacoes, faturamento_diario,
--                 feedback_funcionario, NPS e agenda de exemplo
-- Rodar em: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Campo roteiro em gravacoes (obrigatório para agendar)
ALTER TABLE gravacoes
  ADD COLUMN IF NOT EXISTS roteiro TEXT;

-- 2. Tabela faturamento_diario (cliente preenche o fechamento do dia)
CREATE TABLE IF NOT EXISTS faturamento_diario (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  data         DATE NOT NULL,
  valor        NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacao   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, data)
);

-- RLS faturamento_diario
ALTER TABLE faturamento_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "faturamento_diario_select" ON faturamento_diario FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "faturamento_diario_insert" ON faturamento_diario FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "faturamento_diario_update" ON faturamento_diario FOR UPDATE USING (true);

-- 3. Campo funcionario_avaliado_id em feedbacks (para feedback individual de funcionário)
ALTER TABLE feedbacks
  ADD COLUMN IF NOT EXISTS funcionario_avaliado_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. Dados de teste: NPS
-- (votes ligadas às pesquisas existentes ou cria uma nova)
DO $$
DECLARE
  v_pesquisa_id UUID;
  v_cliente_id  UUID;
  v_func_id     UUID;
BEGIN
  -- Garante pesquisa ativa
  INSERT INTO nps_pesquisas (mes, ativo)
  VALUES ('2026-06', true)
  ON CONFLICT (mes) DO UPDATE SET ativo = true
  RETURNING id INTO v_pesquisa_id;

  IF v_pesquisa_id IS NULL THEN
    SELECT id INTO v_pesquisa_id FROM nps_pesquisas WHERE mes = '2026-06';
  END IF;

  -- Votos fictícios para cada cliente
  FOR v_cliente_id IN SELECT id FROM clientes WHERE status = 'ativo' LOOP
    SELECT id INTO v_func_id FROM profiles WHERE role != 'cliente' AND ativo = true LIMIT 1;

    INSERT INTO nps_votos (pesquisa_id, cliente_id, funcionario_id, nota, comentario)
    VALUES
      (v_pesquisa_id, v_cliente_id, v_func_id, 10, 'Excelente atendimento, resultados acima do esperado!'),
      (v_pesquisa_id, v_cliente_id, v_func_id, 9,  'Equipe muito dedicada e criativa.'),
      (v_pesquisa_id, v_cliente_id, v_func_id, 7,  'Bom trabalho, alguns pontos a melhorar na comunicação.'),
      (v_pesquisa_id, v_cliente_id, v_func_id, 5,  'Esperava resultados mais rápidos.')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 5. Dados de teste: Agenda (slots para a semana atual)
DO $$
DECLARE
  v_func_id   UUID;
  c1 UUID; c2 UUID; c3 UUID; c4 UUID;
  hoje DATE := CURRENT_DATE;
  seg DATE;
BEGIN
  -- Segunda-feira desta semana
  seg := hoje - EXTRACT(DOW FROM hoje)::INT + 1;
  IF EXTRACT(DOW FROM hoje) = 0 THEN seg := hoje - 6; END IF;

  SELECT id INTO v_func_id FROM profiles WHERE role != 'cliente' AND ativo = true LIMIT 1;
  SELECT id INTO c1 FROM clientes WHERE nome_fantasia ILIKE '%TechBrasil%' LIMIT 1;
  SELECT id INTO c2 FROM clientes WHERE nome_fantasia ILIKE '%Saúde%' OR nome_fantasia ILIKE '%Clinica%' LIMIT 1;
  SELECT id INTO c3 FROM clientes WHERE nome_fantasia ILIKE '%Moda%' LIMIT 1;
  SELECT id INTO c4 FROM clientes WHERE nome_fantasia ILIKE '%Construtora%' LIMIT 1;

  -- Limpa exemplos anteriores desta semana para evitar duplicatas
  DELETE FROM agenda_otimizacao WHERE data_hora::DATE BETWEEN seg AND seg + 6;

  -- Insere slots de exemplo
  IF c1 IS NOT NULL THEN
    INSERT INTO agenda_otimizacao (cliente_id, funcionario_id, data_hora, descricao, plataformas, status) VALUES
      (c1, v_func_id, (seg + 0)::TIMESTAMP + INTERVAL '9 hours',  'Otimização de segmentação Meta Ads',       ARRAY['Meta Ads'], 'agendado'),
      (c1, v_func_id, (seg + 2)::TIMESTAMP + INTERVAL '14 hours', 'Análise e ajuste de criativos Google',     ARRAY['Google Ads'], 'agendado'),
      (c1, v_func_id, (seg + 4)::TIMESTAMP + INTERVAL '10 hours', 'Relatório semanal de performance',         ARRAY['Meta Ads','Google Ads'], 'concluido');
  END IF;
  IF c2 IS NOT NULL THEN
    INSERT INTO agenda_otimizacao (cliente_id, funcionario_id, data_hora, descricao, plataformas, status) VALUES
      (c2, v_func_id, (seg + 0)::TIMESTAMP + INTERVAL '11 hours', 'Revisão de campanhas saúde e bem-estar',   ARRAY['Meta Ads'], 'agendado'),
      (c2, v_func_id, (seg + 3)::TIMESTAMP + INTERVAL '9 hours',  'Reunião de alinhamento mensal',            ARRAY['Meta Ads'], 'agendado');
  END IF;
  IF c3 IS NOT NULL THEN
    INSERT INTO agenda_otimizacao (cliente_id, funcionario_id, data_hora, descricao, plataformas, status) VALUES
      (c3, v_func_id, (seg + 1)::TIMESTAMP + INTERVAL '10 hours', 'Lançamento coleção verão — tráfego pago',  ARRAY['Meta Ads','Instagram'], 'agendado'),
      (c3, v_func_id, (seg + 4)::TIMESTAMP + INTERVAL '15 hours', 'Check-in de resultados semanais',          ARRAY['Meta Ads'], 'agendado');
  END IF;
  IF c4 IS NOT NULL THEN
    INSERT INTO agenda_otimizacao (cliente_id, funcionario_id, data_hora, descricao, plataformas, status) VALUES
      (c4, v_func_id, (seg + 2)::TIMESTAMP + INTERVAL '9 hours',  'Campanha de leads para obras residenciais',ARRAY['Google Ads'], 'agendado'),
      (c4, v_func_id, (seg + 4)::TIMESTAMP + INTERVAL '14 hours', 'Revisão de palavras-chave e lances',       ARRAY['Google Ads'], 'agendado');
  END IF;
END $$;

-- 6. Verifica
SELECT 'NPS votos' AS tipo, COUNT(*) FROM nps_votos
UNION ALL
SELECT 'Agenda slots', COUNT(*) FROM agenda_otimizacao;
