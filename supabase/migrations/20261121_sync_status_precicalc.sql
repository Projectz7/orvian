-- REGRA COMUM: o PreciCalc é a fonte da verdade para serviços/obras.
-- Se orçamento é aprovado → serviço entra em obras.projetos.
-- Se volta a rascunho/cancelado → serviço SAI e, se a obra não tiver mais
-- nenhum serviço aprovado, ela volta para '1-Orçando' (some dos outros apps).

create or replace function public.trigger_budget_servico_obra()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_status_old text;
  v_obra_id uuid;
  v_nome text;
  v_valor numeric;
  v_aprovado boolean;
  v_aprovado_old boolean;
begin
  v_status := coalesce(new.status, '');
  v_status_old := coalesce(old.status, '');
  v_aprovado := v_status in ('aprovado','approved','converted','concluida');
  v_aprovado_old := v_status_old in ('aprovado','approved','converted','concluida');

  v_obra_id := nullif(new.data->>'obraId','')::uuid;
  v_nome := coalesce(new.data->'client'->>'servico','');
  v_valor := coalesce((new.data->>'valorFinal')::numeric, 0);

  -- Entrou/está aprovado: vincular serviço (4 args corretos)
  if v_aprovado and v_obra_id is not null and v_nome <> '' then
    perform public.vincular_servico_obra(new.empresa_id, v_obra_id, v_nome, v_valor);
    return new;
  end if;

  -- Saiu de aprovado → rascunho/cancelado: remover serviço e, se vazio, rebaixar obra
  if v_aprovado_old and not v_aprovado and v_obra_id is not null and v_nome <> '' then
    update public.obras o
    set projetos = coalesce((
          select jsonb_agg(p) from jsonb_array_elements(coalesce(o.projetos,'[]'::jsonb)) p
          where lower(trim(p->>'nome')) <> lower(v_nome)
        ), '[]'::jsonb),
        valor_total_previsto = coalesce((
          select sum((p->>'valor')::numeric) from jsonb_array_elements(coalesce(o.projetos,'[]'::jsonb)) p
          where lower(trim(p->>'nome')) <> lower(v_nome)
        ), 0),
        updated_at = now()
    where o.id = v_obra_id;

    -- Se não sobrou nenhum serviço aprovado, volta para orçando
    update public.obras o
    set status = '1-Orçando', updated_at = now()
    where o.id = v_obra_id
      and coalesce(jsonb_array_length(o.projetos),0) = 0
      and o.status in ('3-Aprovado','7-Concluído');
  end if;

  return new;
end;
$$;

comment on trigger trg_budget_servico_obra on public.precicalc_budgets is
  'REGRA COMUM: sincroniza serviços aprovados do PreciCalc para obras.projetos e remove ao voltar a rascunho/cancelado.';
