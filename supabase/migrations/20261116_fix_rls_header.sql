-- ORVIAN - RLS robusto: resolver empresa_id pelo header x-empresa-token enviado
-- em TODA requisição pelo customFetch do client.ts (não depende de current_setting
-- entre requisições, que quebra com pool de conexões do PostgREST).

create or replace function public.get_empresa_id_orv()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_token text;
  v_empresa_id uuid;
begin
  -- 1) contexto setado explicitamente (funcionário via RPC)
  v_empresa_id := nullif(current_setting('app.empresa_id', true), '')::uuid;
  if v_empresa_id is not null then
    return v_empresa_id;
  end if;

  -- 2) header x-empresa-token (enviado pelo app em toda requisição)
  v_token := nullif(current_setting('request.headers', true)::jsonb->>'x-empresa-token', '');
  if v_token is not null then
    select f.empresa_id into v_empresa_id
    from public.funcionarios f
    where f.token_acesso = v_token and f.ativo = true
    limit 1;
    if v_empresa_id is null then
      select f.empresa_id into v_empresa_id
      from public.funcionario_app_tokens fat
      join public.funcionarios f on f.id = fat.funcionario_id
      where fat.token = v_token and f.ativo = true
      limit 1;
    end if;
    if v_empresa_id is not null then
      return v_empresa_id;
    end if;
  end if;

  -- 3) dono autenticado via Supabase Auth
  select id into v_empresa_id
  from public.empresa
  where dono_email = auth.email()
  limit 1;
  return v_empresa_id;
end;
$$;

-- Substituir policies para usar a função robusta
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orv_propostas','orv_servicos','orv_elementos','orv_etapas','orv_controle_execucao',
    'orv_planejamentos','orv_revisoes_planejamento','orv_diarios','orv_atividades',
    'orv_evidencias','orv_modelos_etapas','orv_configuracoes','orv_historico_alteracoes',
    'orv_campos_personalizados','orv_valores_campos'
  ]
  LOOP
    EXECUTE format('drop policy if exists %I on public.%I', t || '_select', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_insert', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_update', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_delete', t);
    EXECUTE format('create policy %I on public.%I for select using (empresa_id = public.get_empresa_id_orv())', t || '_select', t);
    EXECUTE format('create policy %I on public.%I for insert with check (empresa_id = public.get_empresa_id_orv())', t || '_insert', t);
    EXECUTE format('create policy %I on public.%I for update using (empresa_id = public.get_empresa_id_orv())', t || '_update', t);
    EXECUTE format('create policy %I on public.%I for delete using (empresa_id = public.get_empresa_id_orv())', t || '_delete', t);
  END LOOP;
END $$;
