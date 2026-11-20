-- REGRA COMUM: remover de obras.projetos todo serviço SEM orçamento aprovado.
-- Faz backup dos itens removidos em obras.projetos_nao_aprovados antes de limpar.

alter table public.obras add column if not exists projetos_nao_aprovados jsonb default '[]'::jsonb;

update public.obras o
set
  projetos_nao_aprovados = coalesce((
    select jsonb_agg(p) from jsonb_array_elements(coalesce(o.projetos,'[]'::jsonb)) p
    where not exists (
      select 1 from public.precicalc_budgets b
      where b.status in ('aprovado','approved','converted','concluida')
        and lower(coalesce(b.data->'client'->>'servico','')) = lower(coalesce(p->>'nome',''))
        and (
          nullif(b.data->>'obraId','')::uuid = o.id
          or lower(coalesce(b.data->'client'->>'obra','')) = lower(coalesce(o.titulo,''))
        )
    )
  ), '[]'::jsonb),
  projetos = coalesce((
    select jsonb_agg(p) from jsonb_array_elements(coalesce(o.projetos,'[]'::jsonb)) p
    where exists (
      select 1 from public.precicalc_budgets b
      where b.status in ('aprovado','approved','converted','concluida')
        and lower(coalesce(b.data->'client'->>'servico','')) = lower(coalesce(p->>'nome',''))
        and (
          nullif(b.data->>'obraId','')::uuid = o.id
          or lower(coalesce(b.data->'client'->>'obra','')) = lower(coalesce(o.titulo,''))
        )
    )
  ), '[]'::jsonb)
where coalesce(jsonb_array_length(o.projetos),0) > 0;

-- Recalcula o total previsto somando somente os serviços aprovados restantes
update public.obras o
set valor_total_previsto = coalesce((
  select sum((p->>'valor')::numeric) from jsonb_array_elements(coalesce(o.projetos,'[]'::jsonb)) p
), 0)
where coalesce(jsonb_array_length(o.projetos_nao_aprovados),0) > 0;
