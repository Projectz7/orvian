-- REGRA COMUM DO ECOSSISTEMA — só{orçamentos APROVADOS no PreciCalc viram serviço.
-- Vale para DiGest, ORVIAN e todos os apps.
-- Fonte única de verdade: public.listar_servicos_aprovados_obra(p_obra_id)

-- 1) View: serviços de uma obra que possuem orçamento aprovado
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
  where b.empresa_id = o.empresa_id
    and lower(coalesce(b.data->>'servico','')) = lower(coalesce(p->>'nome',''))
    and b.status in ('aprovado','approved','converted','concluida')
  order by b.created_at desc
  limit 1
) b on true;

-- 2) RPC compartilhada (todos os apps devem usar esta função)
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

-- 3) Fechar a brecha: trg_budget_servico_obra só escreve em obras.projetos
--    quando o orçamento está aprovado.
create or replace function public.trigger_budget_servico_obra()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_obra_id uuid;
  v_nome text;
  v_valor numeric;
begin
  v_status := coalesce(new.status, '');
  if v_status not in ('aprovado','approved','converted','concluida') then
    return new;
  end if;

  v_obra_id := nullif(new.data->>'obraId','')::uuid;
  v_nome := coalesce(new.data->>'servico','');
  v_valor := coalesce((new.data->>'valorFinal')::numeric, 0);
  if v_obra_id is null or v_nome = '' then
    return new;
  end if;

  perform public.vincular_servico_obra(v_obra_id, v_nome, v_valor);
  return new;
end;
$$;

-- 4) Comentário de documentação
comment on function public.listar_servicos_aprovados_obra(uuid) is
  'REGRA COMUM: retorna somente serviços com orçamento APROVADO no PreciCalc. Use em todos os apps.';
