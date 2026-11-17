-- ORVIAN — Custos projetados da obra (por natureza)
-- Tabela própria (não existe equivalente no DiGest para "valor projetado por natureza").
-- O custo REAL é lido de lancamentos_caixa (DiGest) — não duplicamos aqui.

create table if not exists public.orv_custos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  obra_id uuid not null references public.obras(id) on delete cascade,
  servico_id uuid,                 -- opcional: vincular a um serviço/contrato
  natureza text not null,
  valor_mensal numeric(14,2) not null default 0,
  quantidade numeric(10,2) not null default 1,
  valor_total numeric(14,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index if not exists idx_orv_custos_empresa_obra on public.orv_custos(empresa_id, obra_id);
create index if not exists idx_orv_custos_servico on public.orv_custos(servico_id);

alter table public.orv_custos enable row level security;
drop policy if exists orv_custos_select on public.orv_custos;
drop policy if exists orv_custos_insert on public.orv_custos;
drop policy if exists orv_custos_update on public.orv_custos;
drop policy if exists orv_custos_delete on public.orv_custos;
create policy orv_custos_select on public.orv_custos for select using (empresa_id = public.get_empresa_id_orv());
create policy orv_custos_insert on public.orv_custos for insert with check (empresa_id = public.get_empresa_id_orv());
create policy orv_custos_update on public.orv_custos for update using (empresa_id = public.get_empresa_id_orv());
create policy orv_custos_delete on public.orv_custos for delete using (empresa_id = public.get_empresa_id_orv());
