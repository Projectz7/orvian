-- CORREÇÃO da regra comum: o nome do serviço fica em data->client->>servico
-- (não em data->>servico).匹配 também por obraId.

create or replace view public.v_servicos_obra_aprovados as
select
  o.id as obra_id,
  o.empresa_id,
  p->>'nome' as nome,
  (p->>'valor')::numeric as valor,
  b.id as budget_id,
  b.status as budget_status
from public.obras o
cross join lateral jsonb_array_elements(coalesce(o.projetos, '[]'::jsonb)) p
join lateral (
  select b.id, b.status, b.created_at
  from public.precicalc_budgets b
  where b.status in ('aprovado','approved','converted','concluida')
    and lower(coalesce(b.data->'client'->>'servico','')) = lower(coalesce(p->>'nome',''))
    and (
      nullif(b.data->>'obraId','')::uuid = o.id
      or lower(coalesce(b.data->'client'->>'obra','')) = lower(coalesce(o.titulo,''))
    )
  order by b.created_at desc
  limit 1
) b on true;

create or replace function public.listar_servicos_aprovados_obra(p_obra_id uuid)
returns table (id text, obra_id uuid, empresa_id uuid, nome text, valor numeric, budget_id uuid)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(v.budget_id::text, v.nome) as id,
    v.obra_id, v.empresa_id, v.nome, v.valor, v.budget_id
  from public.v_servicos_obra_aprovados v
  where v.obra_id = p_obra_id
  order by v.nome
$$;

grant execute on function public.listar_servicos_aprovados_obra(uuid) to authenticated, anon;

comment on function public.listar_servicos_aprovados_obra(uuid) is
  'REGRA COMUM: somente serviços com orçamento APROVADO no PreciCalc (data->client->>servico).';