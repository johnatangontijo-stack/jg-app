-- Unique constraints exigidas pelos upserts do edge function eventos-receber.
-- Sem elas, ON CONFLICT erra ("there is no unique or exclusion constraint
-- matching the ON CONFLICT specification"). producoes(id) já é PK → não precisa.
-- Aplicar via Management API (PAT) ou `supabase db push`.

DO $$
BEGIN
  -- aprovacoes: idempotência por id externo
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'aprovacoes_aprovacao_id_key') THEN
    ALTER TABLE public.aprovacoes ADD CONSTRAINT aprovacoes_aprovacao_id_key UNIQUE (aprovacao_id);
  END IF;

  -- trafego_snapshots: 1 snapshot por cliente+plataforma+mês
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trafego_snapshots_cli_plat_mes_key') THEN
    ALTER TABLE public.trafego_snapshots ADD CONSTRAINT trafego_snapshots_cli_plat_mes_key UNIQUE (cliente_id, plataforma, mes);
  END IF;

  -- metas: 1 meta por cliente+mês
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'metas_cliente_mes_key') THEN
    ALTER TABLE public.metas ADD CONSTRAINT metas_cliente_mes_key UNIQUE (cliente_id, mes);
  END IF;

  -- nps_pesquisas: 1 pesquisa por mês (global)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nps_pesquisas_mes_key') THEN
    ALTER TABLE public.nps_pesquisas ADD CONSTRAINT nps_pesquisas_mes_key UNIQUE (mes);
  END IF;

  -- cliente_dna: 1 DNA por cliente
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_dna_cliente_id_key') THEN
    ALTER TABLE public.cliente_dna ADD CONSTRAINT cliente_dna_cliente_id_key UNIQUE (cliente_id);
  END IF;
END $$;
