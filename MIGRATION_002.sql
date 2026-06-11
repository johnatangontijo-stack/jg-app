-- ============================================================
-- MIGRATION 002 — Fix encoding do campo segmento e outros
-- Rodar em: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Corrige segmentos com encoding corrompido
UPDATE clientes SET segmento = 'Construção Civil'   WHERE segmento ILIKE '%Constru%o Civil%' OR segmento ILIKE 'Constru__o Civil';
UPDATE clientes SET segmento = 'Saúde'              WHERE segmento ILIKE 'Sa_de' OR segmento ~ '^Sa.de$';
UPDATE clientes SET segmento = 'Educação'           WHERE segmento ILIKE 'Educa__o' OR segmento ~ '^Educa.+o$';
UPDATE clientes SET segmento = 'Alimentação'        WHERE segmento ILIKE 'Alimenta__o' OR segmento ~ '^Alimenta.+o$';
UPDATE clientes SET segmento = 'Comunicação'        WHERE segmento ILIKE 'Comunica__o' OR segmento ~ '^Comunica.+o$';
UPDATE clientes SET segmento = 'Tecnologia'         WHERE segmento ILIKE 'Tecnologia';
UPDATE clientes SET segmento = 'E-commerce'         WHERE segmento ILIKE 'E-commerce' OR segmento ILIKE 'Ecommerce';
UPDATE clientes SET segmento = 'Moda'               WHERE segmento ILIKE 'Moda';
UPDATE clientes SET segmento = 'Imobiliário'        WHERE segmento ILIKE 'Imobili%rio' OR segmento ~ 'Imobili.rio';
UPDATE clientes SET segmento = 'Jurídico'           WHERE segmento ILIKE 'Jur%dico' OR segmento ~ 'Jur.dico';
UPDATE clientes SET segmento = 'Beleza e Estética'  WHERE segmento ILIKE 'Beleza%Est%tica' OR segmento ~ 'Est.tica';
UPDATE clientes SET segmento = 'Fitness'            WHERE segmento ILIKE 'Fitness';
UPDATE clientes SET segmento = 'Automotivo'         WHERE segmento ILIKE 'Automotivo';
UPDATE clientes SET segmento = 'Contabilidade'      WHERE segmento ILIKE 'Contabilidade';
UPDATE clientes SET segmento = 'Marketing'          WHERE segmento ILIKE 'Marketing';

-- 2. Corrige nome_fantasia com encoding corrompido (varredura ampla)
UPDATE clientes SET nome_fantasia = regexp_replace(nome_fantasia, '\\?', '', 'g')
  WHERE nome_fantasia ~ '\\?';

-- 3. Verifica resultado
SELECT id, nome_fantasia, segmento FROM clientes ORDER BY segmento, nome_fantasia;
