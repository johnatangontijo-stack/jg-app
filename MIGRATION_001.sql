-- ============================================================
-- MIGRATION 001 — Novos roles + encoding + designação feedback
-- Rodar em: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Atualiza constraint de role no profiles
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','gerencia','head','financeiro','social_media','trafego','ia','sites','cliente'));

-- 2. Adiciona coluna designado_para_id em feedbacks (se não existir)
ALTER TABLE feedbacks
  ADD COLUMN IF NOT EXISTS designado_para_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Fix encoding — Clínica Saúde Plena
UPDATE clientes
  SET nome_fantasia = 'Clínica Saúde Plena'
  WHERE nome_fantasia ILIKE '%nica%de%Plena%'
     OR nome_fantasia ILIKE 'Cl_nica%';

-- 4. Fix encoding — outros nomes que possam ter caracteres corrompidos
UPDATE clientes SET nome_fantasia = 'TechBrasil Store'    WHERE nome_fantasia ILIKE 'TechBrasil%Store%';
UPDATE clientes SET nome_fantasia = 'Moda Feminina Clara'  WHERE nome_fantasia ILIKE 'Moda%Clara%';
UPDATE clientes SET nome_fantasia = 'Construtora Horizonte' WHERE nome_fantasia ILIKE 'Construtora%Horizonte%';

-- 5. Atualiza profiles que ainda têm role='colaborador' para 'social_media'
UPDATE profiles SET role = 'social_media' WHERE role = 'colaborador';

-- 6. Verifica resultado
SELECT id, nome_fantasia FROM clientes ORDER BY nome_fantasia;
SELECT id, nome, role FROM profiles ORDER BY nome;
