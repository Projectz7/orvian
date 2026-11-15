-- ORVIAN - Correção FK, empresa_id, Índices e RLS Multi-tenant
-- Reutiliza projeto Supabase pnijzmqygibhwbcnkklm (p7store)
-- Execute APÓS a migration inicial 20261115_orvian_init.sql

-- ============================================================
-- 1. CORREÇÃO DE FOREIGN KEYS: orv_obras → public.obras
-- ============================================================

-- orv_planejamentos.obra_id
alter table public.orv_planejamentos
  drop constraint if exists orv_planejamentos_obra_id_fkey,
  add constraint orv_planejamentos_obra_id_fkey
    foreign key (obra_id) references public.obras(id) on delete cascade;

-- orv_diarios.obra_id
alter table public.orv_diarios
  drop constraint if exists orv_diarios_obra_id_fkey,
  add constraint orv_diarios_obra_id_fkey
    foreign key (obra_id) references public.obras(id) on delete cascade;

-- orv_atividades.obra_id
alter table public.orv_atividades
  drop constraint if exists orv_atividades_obra_id_fkey,
  add constraint orv_atividades_obra_id_fkey
    foreign key (obra_id) references public.obras(id) on delete set null;

-- orv_evidencias.obra_id
alter table public.orv_evidencias
  drop constraint if exists orv_evidencias_obra_id_fkey,
  add constraint orv_evidencias_obra_id_fkey
    foreign key (obra_id) references public.obras(id) on delete set null;

-- ============================================================
-- 1.5. CRIAR TABELAS DO PLANEJAMENTO AVANÇADO (F7) - planos / plano_tarefas
-- ============================================================

-- PLANOS (um por obra, múltiplos por obra: rascunho/fechado)
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresa(id),
  obra_id uuid not null references public.obras(id) on delete cascade,
  nome text not null,
  status text not null default 'rascunho' check (status in ('rascunho','fechado')),
  kanban_cols jsonb default '[{"id":"col_a_fazer","label":"A fazer","status":"a_fazer","ordem":0,"fixa":true},{"id":"col_fazendo","label":"Fazendo","status":"fazendo","ordem":1,"fixa":false},{"id":"col_concluida","label":"Concluída","status":"concluida","ordem":2,"fixa":true}]'::jsonb,
  google_calendar_config jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  fechado_em timestamptz
);

-- TAREFAS DO PLANO (hierárquicas via parent_id, ordenadas via ordem)
create table if not exists public.plano_tarefas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresa(id),
  obra_id uuid not null references public.obras(id) on delete cascade,
  plano_id uuid not null references public.planos(id) on delete cascade,
  titulo text not null,
  descricao text,
  status text not null default 'a_fazer' check (status in ('a_fazer','fazendo','concluida','bloqueada','cancelada')),
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  responsavel_id uuid references public.funcionarios(id),
  equipe_id uuid references public.equipes(id),
  parent_id uuid references public.plano_tarefas(id) on delete cascade,
  ordem int not null default 0,
  data_inicio date,
  data_fim date,
  data_inicio_real date,
  data_fim_real date,
  progresso int not null default 0 check (progresso >= 0 and progresso <= 100),
  progresso_manual boolean default false,
  horas_estimadas numeric,
  peso_tarefa numeric default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices para planos/plano_tarefas
create index if not exists idx_planos_empresa_obra on public.planos(empresa_id, obra_id);
create index if not exists idx_plano_tarefas_empresa_plano on public.plano_tarefas(empresa_id, plano_id);
create index if not exists idx_plano_tarefas_empresa_obra on public.plano_tarefas(empresa_id, obra_id);
create index if not exists idx_plano_tarefas_parent on public.plano_tarefas(parent_id);

-- RLS para planos
alter table public.planos enable row level security;
alter table public.plano_tarefas enable row level security;

drop policy if exists planos_all on public.planos;
drop policy if exists plano_tarefas_all on public.plano_tarefas;

create policy planos_select on public.planos for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = planos.empresa_id and e.dono_id = auth.uid())
);
create policy planos_insert on public.planos for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = planos.empresa_id and e.dono_id = auth.uid())
);
create policy planos_update on public.planos for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = planos.empresa_id and e.dono_id = auth.uid())
);
create policy planos_delete on public.planos for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = planos.empresa_id and e.dono_id = auth.uid())
);

create policy plano_tarefas_select on public.plano_tarefas for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = plano_tarefas.empresa_id and e.dono_id = auth.uid())
);
create policy plano_tarefas_insert on public.plano_tarefas for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = plano_tarefas.empresa_id and e.dono_id = auth.uid())
);
create policy plano_tarefas_update on public.plano_tarefas for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = plano_tarefas.empresa_id and e.dono_id = auth.uid())
);
create policy plano_tarefas_delete on public.plano_tarefas for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = plano_tarefas.empresa_id and e.dono_id = auth.uid())
);

-- ============================================================
-- 2. ADICIONAR empresa_id NAS TABELAS QUE NÃO TÊM
-- ============================================================

-- orv_propostas
alter table public.orv_propostas
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_servicos
alter table public.orv_servicos
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_elementos
alter table public.orv_elementos
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_etapas
alter table public.orv_etapas
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_controle_execucao
alter table public.orv_controle_execucao
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_planejamentos
alter table public.orv_planejamentos
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_revisoes_planejamento
alter table public.orv_revisoes_planejamento
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_diarios
alter table public.orv_diarios
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_atividades
alter table public.orv_atividades
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_evidencias
alter table public.orv_evidencias
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_calendario
alter table public.orv_calendario
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_configuracoes (já tem empresa_id)

-- orv_historico_alteracoes
alter table public.orv_historico_alteracoes
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_campos_personalizados
alter table public.orv_campos_personalizados
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_valores_campos
alter table public.orv_valores_campos
  add column if not exists empresa_id uuid references public.empresa(id);

-- orv_modelos_etapas (já tem empresa_id)

-- ============================================================
-- 3. PREENCHER empresa_id EXISTENTE VIA obra_id → obras.empresa_id
-- ============================================================

-- Tabelas que têm obra_id direto
update public.orv_propostas p
set empresa_id = o.empresa_id
from public.obras o
where p.obra_id = o.id and p.empresa_id is null;

update public.orv_diarios d
set empresa_id = o.empresa_id
from public.obras o
where d.obra_id = o.id and d.empresa_id is null;

update public.orv_atividades a
set empresa_id = o.empresa_id
from public.obras o
where a.obra_id = o.id and a.empresa_id is null;

update public.orv_evidencias e
set empresa_id = o.empresa_id
from public.obras o
where e.obra_id = o.id and e.empresa_id is null;

update public.orv_planejamentos p
set empresa_id = o.empresa_id
from public.obras o
where p.obra_id = o.id and p.empresa_id is null;

-- Tabelas via proposta_id → orv_propostas.obra_id → obras.empresa_id
update public.orv_servicos s
set empresa_id = o.empresa_id
from public.orv_propostas pr, public.obras o
where s.proposta_id = pr.id and pr.obra_id = o.id and s.empresa_id is null;

update public.orv_elementos e
set empresa_id = o.empresa_id
from public.orv_servicos s, public.orv_propostas pr, public.obras o
where e.servico_id = s.id and s.proposta_id = pr.id and pr.obra_id = o.id and e.empresa_id is null;

update public.orv_etapas et
set empresa_id = o.empresa_id
from public.orv_servicos s, public.orv_propostas pr, public.obras o
where et.servico_id = s.id and s.proposta_id = pr.id and pr.obra_id = o.id and et.empresa_id is null;

update public.orv_controle_execucao ce
set empresa_id = o.empresa_id
from public.orv_etapas et, public.orv_servicos s, public.orv_propostas pr, public.obras o
where ce.etapa_id = et.id and et.servico_id = s.id and s.proposta_id = pr.id and pr.obra_id = o.id and ce.empresa_id is null;

-- ============================================================
-- 4. ÍNDICES COMPOSTOS (empresa_id + FKs principais)
-- ============================================================

create index if not exists idx_orv_propostas_empresa_obra on public.orv_propostas(empresa_id, obra_id);
create index if not exists idx_orv_servicos_empresa_proposta on public.orv_servicos(empresa_id, proposta_id);
create index if not exists idx_orv_elementos_empresa_servico on public.orv_elementos(empresa_id, servico_id);
create index if not exists idx_orv_etapas_empresa_servico on public.orv_etapas(empresa_id, servico_id);
create index if not exists idx_orv_controle_empresa_etapa on public.orv_controle_execucao(empresa_id, etapa_id);
create index if not exists idx_orv_planejamentos_empresa_obra on public.orv_planejamentos(empresa_id, obra_id);
create index if not exists idx_orv_revisoes_empresa_planej on public.orv_revisoes_planejamento(empresa_id, planejamento_id);
create index if not exists idx_orv_diarios_empresa_obra on public.orv_diarios(empresa_id, obra_id);
create index if not exists idx_orv_atividades_empresa_obra on public.orv_atividades(empresa_id, obra_id);
create index if not exists idx_orv_evidencias_empresa_obra on public.orv_evidencias(empresa_id, obra_id);
create index if not exists idx_orv_historico_empresa_tabela on public.orv_historico_alteracoes(empresa_id, tabela);
create index if not exists idx_orv_campos_empresa_entidade on public.orv_campos_personalizados(empresa_id, entidade);
create index if not exists idx_orv_valores_empresa_campo on public.orv_valores_campos(empresa_id, campo_id);
create index if not exists idx_orv_modelos_empresa on public.orv_modelos_etapas(empresa_id);
create index if not exists idx_orv_config_empresa_chave on public.orv_configuracoes(empresa_id, chave);

-- ============================================================
-- 5. RLS POLICIES MULTI-TENANT
-- ============================================================

-- Função auxiliar: retorna empresa_id do contexto atual (token funcionário ou auth.uid dono)
-- Assume que RPC set_empresa_context foi chamado e setou current_setting('app.current_empresa_id')
create or replace function public.get_current_empresa_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.current_empresa_id', true), '')::uuid
$$;

-- Habilitar RLS (já feito na migration inicial, mas garante)
alter table public.orv_propostas enable row level security;
alter table public.orv_servicos enable row level security;
alter table public.orv_elementos enable row level security;
alter table public.orv_etapas enable row level security;
alter table public.orv_controle_execucao enable row level security;
alter table public.orv_planejamentos enable row level security;
alter table public.orv_revisoes_planejamento enable row level security;
alter table public.orv_diarios enable row level security;
alter table public.orv_atividades enable row level security;
alter table public.orv_evidencias enable row level security;
alter table public.orv_modelos_etapas enable row level security;
alter table public.orv_configuracoes enable row level security;
alter table public.orv_historico_alteracoes enable row level security;
alter table public.orv_campos_personalizados enable row level security;
alter table public.orv_valores_campos enable row level security;

-- Remover policies antigas permissivas
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

-- Policy padrão: empresa_id = get_current_empresa_id() OU user é dono da empresa (auth.uid = empresa.dono_id)
-- Para dono: auth.uid() = (select dono_id from empresa where id = empresa_id)
-- Para funcionário: token válido seta app.current_empresa_id via set_empresa_context

-- orv_propostas
create policy orv_propostas_select on public.orv_propostas for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_propostas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_propostas_insert on public.orv_propostas for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_propostas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_propostas_update on public.orv_propostas for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_propostas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_propostas_delete on public.orv_propostas for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_propostas.empresa_id and e.dono_id = auth.uid())
);

-- orv_servicos
create policy orv_servicos_select on public.orv_servicos for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_servicos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_servicos_insert on public.orv_servicos for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_servicos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_servicos_update on public.orv_servicos for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_servicos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_servicos_delete on public.orv_servicos for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_servicos.empresa_id and e.dono_id = auth.uid())
);

-- orv_elementos
create policy orv_elementos_select on public.orv_elementos for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_elementos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_elementos_insert on public.orv_elementos for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_elementos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_elementos_update on public.orv_elementos for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_elementos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_elementos_delete on public.orv_elementos for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_elementos.empresa_id and e.dono_id = auth.uid())
);

-- orv_etapas
create policy orv_etapas_select on public.orv_etapas for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_etapas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_etapas_insert on public.orv_etapas for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_etapas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_etapas_update on public.orv_etapas for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_etapas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_etapas_delete on public.orv_etapas for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_etapas.empresa_id and e.dono_id = auth.uid())
);

-- orv_controle_execucao
create policy orv_controle_select on public.orv_controle_execucao for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_controle_execucao.empresa_id and e.dono_id = auth.uid())
);
create policy orv_controle_insert on public.orv_controle_execucao for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_controle_execucao.empresa_id and e.dono_id = auth.uid())
);
create policy orv_controle_update on public.orv_controle_execucao for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_controle_execucao.empresa_id and e.dono_id = auth.uid())
);
create policy orv_controle_delete on public.orv_controle_execucao for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_controle_execucao.empresa_id and e.dono_id = auth.uid())
);

-- orv_planejamentos
create policy orv_planej_select on public.orv_planejamentos for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_planejamentos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_planej_insert on public.orv_planejamentos for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_planejamentos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_planej_update on public.orv_planejamentos for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_planejamentos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_planej_delete on public.orv_planejamentos for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_planejamentos.empresa_id and e.dono_id = auth.uid())
);

-- orv_revisoes_planejamento
create policy orv_revplan_select on public.orv_revisoes_planejamento for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_revisoes_planejamento.empresa_id and e.dono_id = auth.uid())
);
create policy orv_revplan_insert on public.orv_revisoes_planejamento for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_revisoes_planejamento.empresa_id and e.dono_id = auth.uid())
);
create policy orv_revplan_update on public.orv_revisoes_planejamento for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_revisoes_planejamento.empresa_id and e.dono_id = auth.uid())
);
create policy orv_revplan_delete on public.orv_revisoes_planejamento for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_revisoes_planejamento.empresa_id and e.dono_id = auth.uid())
);

-- orv_diarios
create policy orv_diarios_select on public.orv_diarios for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_diarios.empresa_id and e.dono_id = auth.uid())
);
create policy orv_diarios_insert on public.orv_diarios for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_diarios.empresa_id and e.dono_id = auth.uid())
);
create policy orv_diarios_update on public.orv_diarios for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_diarios.empresa_id and e.dono_id = auth.uid())
);
create policy orv_diarios_delete on public.orv_diarios for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_diarios.empresa_id and e.dono_id = auth.uid())
);

-- orv_atividades
create policy orv_atividades_select on public.orv_atividades for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_atividades.empresa_id and e.dono_id = auth.uid())
);
create policy orv_atividades_insert on public.orv_atividades for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_atividades.empresa_id and e.dono_id = auth.uid())
);
create policy orv_atividades_update on public.orv_atividades for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_atividades.empresa_id and e.dono_id = auth.uid())
);
create policy orv_atividades_delete on public.orv_atividades for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_atividades.empresa_id and e.dono_id = auth.uid())
);

-- orv_evidencias
create policy orv_evidencias_select on public.orv_evidencias for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_evidencias.empresa_id and e.dono_id = auth.uid())
);
create policy orv_evidencias_insert on public.orv_evidencias for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_evidencias.empresa_id and e.dono_id = auth.uid())
);
create policy orv_evidencias_update on public.orv_evidencias for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_evidencias.empresa_id and e.dono_id = auth.uid())
);
create policy orv_evidencias_delete on public.orv_evidencias for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_evidencias.empresa_id and e.dono_id = auth.uid())
);

-- orv_modelos_etapas
create policy orv_modelos_select on public.orv_modelos_etapas for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_modelos_etapas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_modelos_insert on public.orv_modelos_etapas for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_modelos_etapas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_modelos_update on public.orv_modelos_etapas for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_modelos_etapas.empresa_id and e.dono_id = auth.uid())
);
create policy orv_modelos_delete on public.orv_modelos_etapas for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_modelos_etapas.empresa_id and e.dono_id = auth.uid())
);

-- orv_configuracoes
create policy orv_config_select on public.orv_configuracoes for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_configuracoes.empresa_id and e.dono_id = auth.uid())
);
create policy orv_config_insert on public.orv_configuracoes for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_configuracoes.empresa_id and e.dono_id = auth.uid())
);
create policy orv_config_update on public.orv_configuracoes for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_configuracoes.empresa_id and e.dono_id = auth.uid())
);
create policy orv_config_delete on public.orv_configuracoes for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_configuracoes.empresa_id and e.dono_id = auth.uid())
);

-- orv_historico_alteracoes
create policy orv_historico_select on public.orv_historico_alteracoes for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_historico_alteracoes.empresa_id and e.dono_id = auth.uid())
);
create policy orv_historico_insert on public.orv_historico_alteracoes for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_historico_alteracoes.empresa_id and e.dono_id = auth.uid())
);

-- orv_campos_personalizados
create policy orv_campos_select on public.orv_campos_personalizados for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_campos_personalizados.empresa_id and e.dono_id = auth.uid())
);
create policy orv_campos_insert on public.orv_campos_personalizados for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_campos_personalizados.empresa_id and e.dono_id = auth.uid())
);
create policy orv_campos_update on public.orv_campos_personalizados for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_campos_personalizados.empresa_id and e.dono_id = auth.uid())
);
create policy orv_campos_delete on public.orv_campos_personalizados for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_campos_personalizados.empresa_id and e.dono_id = auth.uid())
);

-- orv_valores_campos
create policy orv_valores_select on public.orv_valores_campos for select using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_valores_campos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_valores_insert on public.orv_valores_campos for insert with check (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_valores_campos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_valores_update on public.orv_valores_campos for update using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_valores_campos.empresa_id and e.dono_id = auth.uid())
);
create policy orv_valores_delete on public.orv_valores_campos for delete using (
  empresa_id = public.get_current_empresa_id()
  or exists (select 1 from public.empresa e where e.id = orv_valores_campos.empresa_id and e.dono_id = auth.uid())
);

-- ============================================================
-- 6. STORAGE RLS PARA BUCKET orvian-evidencias
-- ============================================================

-- Habilitar RLS no bucket (storage.objects já tem RLS)
-- Policies baseadas em empresa_id no path ou metadata
-- Path padrão: {obraId}/{data}/{filename} → extrair obraId e validar empresa

create policy if not exists orvian_evidencias_select on storage.objects for select using (
  bucket_id = 'orvian-evidencias'
  and (
    -- Dono da empresa
    exists (
      select 1 from public.obras o
      join public.empresa e on e.id = o.empresa_id
      where o.id = (split_part(name, '/', 1))::uuid
        and e.dono_id = auth.uid()
    )
    or
    -- Funcionário via token (current_setting)
    exists (
      select 1 from public.obras o
      where o.id = (split_part(name, '/', 1))::uuid
        and o.empresa_id = public.get_current_empresa_id()
    )
  )
);

create policy if not exists orvian_evidencias_insert on storage.objects for insert with check (
  bucket_id = 'orvian-evidencias'
  and (
    exists (
      select 1 from public.obras o
      join public.empresa e on e.id = o.empresa_id
      where o.id = (split_part(name, '/', 1))::uuid
        and e.dono_id = auth.uid()
    )
    or
    exists (
      select 1 from public.obras o
      where o.id = (split_part(name, '/', 1))::uuid
        and o.empresa_id = public.get_current_empresa_id()
    )
  )
);

create policy if not exists orvian_evidencias_update on storage.objects for update using (
  bucket_id = 'orvian-evidencias'
  and (
    exists (
      select 1 from public.obras o
      join public.empresa e on e.id = o.empresa_id
      where o.id = (split_part(name, '/', 1))::uuid
        and e.dono_id = auth.uid()
    )
    or
    exists (
      select 1 from public.obras o
      where o.id = (split_part(name, '/', 1))::uuid
        and o.empresa_id = public.get_current_empresa_id()
    )
  )
);

create policy if not exists orvian_evidencias_delete on storage.objects for delete using (
  bucket_id = 'orvian-evidencias'
  and (
    exists (
      select 1 from public.obras o
      join public.empresa e on e.id = o.empresa_id
      where o.id = (split_part(name, '/', 1))::uuid
        and e.dono_id = auth.uid()
    )
    or
    exists (
      select 1 from public.obras o
      where o.id = (split_part(name, '/', 1))::uuid
        and o.empresa_id = public.get_current_empresa_id()
    )
  )
);