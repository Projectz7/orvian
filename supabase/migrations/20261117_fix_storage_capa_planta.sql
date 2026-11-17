-- ORVIAN — Corrigir storage para imagens de capa/planta
-- O path Antigo exigia que o 1º segmento fosse um UUID de obra.
-- Capas/plantas usam "capas/{obraId}/..." e "plantas/{obraId}/...".
-- Nova regra: extrai o obraId do 1º segmento OU do 2º (quando o 1º é capas/plantas).

create or replace function public.orv_storage_obra_id(p_name text)
returns uuid language sql stable security definer set search_path = '' as $$
  select case
    when split_part(p_name, '/', 1) in ('capas','plantas','atividades','subtarefas','anexos')
      then nullif(split_part(p_name, '/', 2), '')::uuid
    else nullif(split_part(p_name, '/', 1), '')::uuid
  end
$$;

drop policy if exists orvian_evidencias_select on storage.objects;
drop policy if exists orvian_evidencias_insert on storage.objects;
drop policy if exists orvian_evidencias_update on storage.objects;
drop policy if exists orvian_evidencias_delete on storage.objects;

create policy orvian_evidencias_select on storage.objects for select using (
  bucket_id = 'orvian-evidencias' and (
    exists (select 1 from public.obras o join public.empresa e on e.id=o.empresa_id
            where o.id = public.orv_storage_obra_id(objects.name) and e.dono_email = auth.email())
    or exists (select 1 from public.obras o
            where o.id = public.orv_storage_obra_id(objects.name) and o.empresa_id = public.get_current_empresa_id())
  )
);
create policy orvian_evidencias_insert on storage.objects for insert with check (
  bucket_id = 'orvian-evidencias' and (
    exists (select 1 from public.obras o join public.empresa e on e.id=o.empresa_id
            where o.id = public.orv_storage_obra_id(objects.name) and e.dono_email = auth.email())
    or exists (select 1 from public.obras o
            where o.id = public.orv_storage_obra_id(objects.name) and o.empresa_id = public.get_current_empresa_id())
  )
);
create policy orvian_evidencias_update on storage.objects for update using (
  bucket_id = 'orvian-evidencias' and (
    exists (select 1 from public.obras o join public.empresa e on e.id=o.empresa_id
            where o.id = public.orv_storage_obra_id(objects.name) and e.dono_email = auth.email())
    or exists (select 1 from public.obras o
            where o.id = public.orv_storage_obra_id(objects.name) and o.empresa_id = public.get_current_empresa_id())
  )
);
create policy orvian_evidencias_delete on storage.objects for delete using (
  bucket_id = 'orvian-evidencias' and (
    exists (select 1 from public.obras o join public.empresa e on e.id=o.empresa_id
            where o.id = public.orv_storage_obra_id(objects.name) and e.dono_email = auth.email())
    or exists (select 1 from public.obras o
            where o.id = public.orv_storage_obra_id(objects.name) and o.empresa_id = public.get_current_empresa_id())
  )
);
