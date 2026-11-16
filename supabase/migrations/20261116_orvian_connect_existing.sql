-- ORVIAN — Conectar às tabelas EXISTENTES do ecossistema
-- Adiciona colunas onde faltar. NÃO cria tabelas novas (exceto onde não há equivalente).
-- Projeto: pnijzmqygibhwbcnkklm

-- ============================================================
-- 1. public.diario_obra (PlanSeven) — vira também base de atividades
-- ============================================================
alter table public.diario_obra add column if not exists proposta_id uuid;
alter table public.diario_obra add column if not exists servico_id uuid;
alter table public.diario_obra add column if not exists elemento_id uuid;
alter table public.diario_obra add column if not exists etapa_id uuid;
alter table public.diario_obra add column if not exists titulo text;
alter table public.diario_obra add column if not exists resumo_geral text;
alter table public.diario_obra add column if not exists atividades_realizadas text;
alter table public.diario_obra add column if not exists detalhamento_tecnico text;
alter table public.diario_obra add column if not exists equipes text;
alter table public.diario_obra add column if not exists responsaveis text;
alter table public.diario_obra add column if not exists quantidades text;
alter table public.diario_obra add column if not exists ocorrencias text;
alter table public.diario_obra add column if not exists impedimentos text;
alter table public.diario_obra add column if not exists observacoes_finais text;
alter table public.diario_obra add column if not exists versao int default 1;
alter table public.diario_obra add column if not exists finalizado boolean default false;
alter table public.diario_obra add column if not exists deleted_at timestamptz;
alter table public.diario_obra add column if not exists updated_at timestamptz default now();
alter table public.diario_obra add column if not exists tipo_registro text default 'diario';
alter table public.diario_obra add column if not exists hora time;
alter table public.diario_obra add column if not exists quantidade numeric;
alter table public.diario_obra add column if not exists unidade text;
alter table public.diario_obra add column if not exists percentual_avanco numeric;
alter table public.diario_obra add column if not exists equipe text;
alter table public.diario_obra add column if not exists situacao text;
alter table public.diario_obra add column if not exists status_etapa text;
alter table public.diario_obra add column if not exists microtarefas text;

-- ============================================================
-- 2. public.plano_tarefas (PlanSeven) — base do planejamento
-- ============================================================
alter table public.plano_tarefas add column if not exists proposta_id uuid;
alter table public.plano_tarefas add column if not exists servico_id uuid;
alter table public.plano_tarefas add column if not exists elemento_id uuid;
alter table public.plano_tarefas add column if not exists etapa_id uuid;
alter table public.plano_tarefas add column if not exists data_planejada_original date;
alter table public.plano_tarefas add column if not exists data_planejada_atual date;
alter table public.plano_tarefas add column if not exists justificativa_reprogramacao text;
alter table public.plano_tarefas add column if not exists vinculo_atividade_id uuid;
alter table public.plano_tarefas add column if not exists peso numeric default 1;
alter table public.plano_tarefas add column if not exists revisoes jsonb default '[]'::jsonb;
alter table public.plano_tarefas add column if not exists deleted_at timestamptz;

-- ============================================================
-- 3. public.pedidos (base de evidências/fotos — tem foto_url)
-- ============================================================
alter table public.pedidos add column if not exists obra_id uuid;
alter table public.pedidos add column if not exists proposta_id uuid;
alter table public.pedidos add column if not exists servico_id uuid;
alter table public.pedidos add column if not exists elemento_id uuid;
alter table public.pedidos add column if not exists etapa_id uuid;
alter table public.pedidos add column if not exists diario_id uuid;
alter table public.pedidos add column if not exists legenda text;
alter table public.pedidos add column if not exists descricao text;
alter table public.pedidos add column if not exists responsavel_envio text;
alter table public.pedidos add column if not exists principal boolean default false;

-- ============================================================
-- 4. public.clientes — vincular obra ao cliente (se ainda não estiver)
-- ============================================================
-- obras.cliente_id já existe (conforme migrations do di-gest). Garantir:
alter table public.obras add column if not exists cliente_id uuid;

-- ============================================================
-- 5. Índices
-- ============================================================
create index if not exists idx_diario_obra_orv_proposta on public.diario_obra(proposta_id);
create index if not exists idx_diario_obra_orv_tipo on public.diario_obra(empresa_id, obra_id, tipo_registro);
create index if not exists idx_plano_tarefas_orv_proposta on public.plano_tarefas(proposta_id);
create index if not exists idx_pedidos_orv_obra on public.pedidos(empresa_id, obra_id);
