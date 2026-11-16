-- ORVIAN - Corrigir contexto de empresa para RLS (funcionários via token)
-- set_empresa_context grava app.empresa_id; get_current_empresa_id deve ler o MESMO nome.

create or replace function public.get_current_empresa_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.empresa_id', true), '')::uuid
$$;

-- Remover policies permissivas antigas que deixavam todos verem tudo
drop policy if exists orv_propostas_all on public.orv_propostas;
drop policy if exists orv_servicos_all on public.orv_servicos;
drop policy if exists orv_elementos_all on public.orv_elementos;
drop policy if exists orv_etapas_all on public.orv_etapas;
drop policy if exists orv_controle_all on public.orv_controle_execucao;
drop policy if exists orv_planej_all on public.orv_planejamentos;
drop policy if exists orv_revplan_all on public.orv_revisoes_planejamento;
drop policy if exists orv_diarios_all on public.orv_diarios;
drop policy if exists orv_atividades_all on public.orv_atividades;
drop policy if exists orv_evidencias_all on public.orv_evidencias;
