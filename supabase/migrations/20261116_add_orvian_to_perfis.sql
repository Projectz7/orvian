-- ORVIAN — Adicionar o app em TODOS os perfis de acesso existentes
-- Sem isso, validar_app_token retorna "Sem permissao para este aplicativo"
-- para qualquer funcionário com perfil (perfil_id != null).

insert into public.perfil_apps (perfil_id, app_id)
select id, 'orvian' from public.perfis_acesso
on conflict do nothing;
