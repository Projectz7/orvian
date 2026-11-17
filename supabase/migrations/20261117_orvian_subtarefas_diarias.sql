-- ORVIAN — Atividade diária = subtarefa executada (com foto)
-- A tarefa planejada (plano_tarefas) é a MÃE; cada lançamento diário
-- (diario_obra.tipo_registro='atividade') é uma SUBTAREFA filha via tarefa_id.
-- O progresso da mãe é recalculado automaticamente pelo trigger trg_tarefa_progresso.

-- Garante que o vínculo atividade ↔ tarefa existe (já adicionado em migration anterior)
alter table public.diario_obra add column if not exists tarefa_id uuid references public.plano_tarefas(id) on delete set null;
create index if not exists idx_diario_obra_tarefa on public.diario_obra(tarefa_id);

-- Função: ao registrar uma atividade (subtarefa) com tarefa_id,
-- atualiza o progresso da tarefa mãe conforme a quantidade de execuções.
-- Regra: cada atividade concluída conta como 1 subdivisão executada.
-- progresso = (subtarefas com status_etapa='concluida' / total de subtarefas da tarefa) * 100
create or replace function public.orv_recalc_progresso_tarefa(p_tarefa_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_total int;
  v_concluidas int;
  v_pct int;
begin
  if p_tarefa_id is null then return; end if;

  select count(*), count(*) filter (where status_etapa = 'concluida')
  into v_total, v_concluidas
  from public.diario_obra
  where tarefa_id = p_tarefa_id and tipo_registro = 'atividade' and deleted_at is null;

  if v_total = 0 then return; end if;

  v_pct := round((v_concluidas::numeric / v_total::numeric) * 100);

  update public.plano_tarefas
  set progresso = v_pct,
      status = case when v_pct >= 100 then 'concluida' else status end,
      data_fim_real = case when v_pct >= 100 then current_date else data_fim_real end
  where id = p_tarefa_id
    and coalesce(progresso_manual, false) = false;
end;
$$;

-- Trigger: recalcula a tarefa mãe quando uma atividade é inserida/atualizada/excluída
create or replace function public.orv_atividade_progresso_handler()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    perform public.orv_recalc_progresso_tarefa(old.tarefa_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and new.tarefa_id is distinct from old.tarefa_id then
    perform public.orv_recalc_progresso_tarefa(old.tarefa_id);
  end if;
  if new.tarefa_id is not null then
    perform public.orv_recalc_progresso_tarefa(new.tarefa_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orv_atividade_progresso on public.diario_obra;
create trigger trg_orv_atividade_progresso
after insert or update or delete on public.diario_obra
for each row execute function public.orv_atividade_progresso_handler();
