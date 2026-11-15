# TODO.md — Etapa 2: Migration - FK, empresa_id, Índices, RLS

## 2.1 Nova migration corrigindo FK orv_planejamentos.obra_id → public.obras(id)
- [ ] Criar migration SQL

## 2.2 Adicionar empresa_id em todas as tabelas orv_* que não têm
- [ ] orv_propostas
- [ ] orv_servicos
- [ ] orv_elementos
- [ ] orv_etapas
- [ ] orv_controle_execucao
- [ ] orv_planejamentos
- [ ] orv_revisoes_planejamento
- [ ] orv_diarios
- [ ] orv_atividades
- [ ] orv_evidencias
- [ ] orv_calendario
- [ ] orv_configuracoes
- [ ] orv_historico_alteracoes
- [ ] orv_campos_personalizados
- [ ] orv_valores_campos

## 2.3 Adicionar índices compostos (empresa_id + FKs)
- [ ] Índices por empresa_id + chaves estrangeiras

## 2.4 Reescrever RLS policies para multi-tenant
- [ ] Policies usando auth.uid() para donos
- [ ] Policies usando x-empresa-token para funcionários (via set_empresa_context)