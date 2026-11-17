-- ORVIAN — Avanço físico por peso/quantidade (motor de cálculo no banco)
-- Regra: o percentual é calculado no banco, não na interface.

-- Avanço de UM serviço:
--  - modelo 'quantidade': quantidade_executada / quantidade_prevista (somatório das etapas)
--  - demais modelos: média ponderada das etapas (peso * percentual)
create or replace function public.orv_avanco_servico(p_servico_id uuid)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare
  v_modelo text;
  v_prev numeric;
  v_exec numeric;
  v_peso_total numeric;
  v_peso_exec numeric;
  v_ret numeric;
begin
  select modelo_acompanhamento, quantidade_prevista
  into v_modelo, v_prev
  from public.orv_servicos where id = p_servico_id;

  if v_modelo = 'quantidade' and coalesce(v_prev, 0) > 0 then
    select coalesce(sum(quantidade_executada), 0) into v_exec
    from public.orv_controle_execucao ce
    join public.orv_etapas e on e.id = ce.etapa_id
    where e.servico_id = p_servico_id;
    v_ret := least(100, greatest(0, (v_exec / v_prev) * 100));
  else
    select
      coalesce(sum(e.peso), 0),
      coalesce(sum(e.peso * (coalesce(ce.percentual_avanco, 0) / 100)), 0)
    into v_peso_total, v_peso_exec
    from public.orv_etapas e
    left join public.orv_controle_execucao ce on ce.etapa_id = e.id
    where e.servico_id = p_servico_id;
    if v_peso_total > 0 then
      v_ret := least(100, greatest(0, (v_peso_exec / v_peso_total) * 100));
    else
      v_ret := 0;
    end if;
  end if;

  return round(coalesce(v_ret, 0), 1);
end;
$$;

-- Avanço de UMA obra: média ponderada dos serviços (peso de cada serviço)
create or replace function public.orv_avanco_obra(p_obra_id uuid)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare
  v_ret numeric;
begin
  select
    case when coalesce(sum(s.peso), 0) > 0
      then round(sum(s.peso * public.orv_avanco_servico(s.id)) / sum(s.peso), 1)
      else 0 end
  into v_ret
  from public.orv_propostas pr
  join public.orv_servicos s on s.proposta_id = pr.id and coalesce(s.deleted_at, now()) > now()
  where pr.obra_id = p_obra_id and coalesce(pr.deleted_at, now()) > now();
  return coalesce(v_ret, 0);
end;
$$;
