# PLAN.md — Orvian: Correções Críticas e Implementações

## Objetivo do App
Orvian é o app de planejamento e controle de obras do ecossistema P7Store. Gerencia obras, propostas, serviços, etapas, planejamentos, diários, controles de execução, evidências fotográficas e relatórios — com visão Kanban/Gantt/Lista/Agenda/Tabela e sincronismo Google Calendar.

---

## Problemas Críticos Encontrados na Auditoria

### 🔴 Bloqueiam Build / Segurança
1. **Tipos TypeScript ausentes** — `Plano`, `Tarefa`, `Equipe`, `Funcionario`, `StatusPlano`, `StatusTarefa` importados de `@/types` mas não definidos em `src/types/index.ts`
2. **FK incorreta na migration** — `orv_planejamentos.obra_id` referencia `public.orv_obras(id)` mas a tabela real é `public.obras` (compartilhada)
3. **RLS policies inseguras** — Todas usam `using (true)`; devem filtrar por `empresa_id` via token/header ou auth.uid()
4. **Auth não valida `ativo` do funcionário** — Permite acesso mesmo se `funcionario.ativo === false` (regra do ecossistema)
5. **`ObraPlanoPage` e services não filtram por `empresaId`** — Isolamento multi-tenant quebrado
6. **Storage bucket sem RLS** — `orvian-evidencias` não tem policies
7. **Types Supabase não gerados** — `src/integrations/supabase/types.ts` é placeholder vazio
8. **RelatóriosPage consulta tabela inexistente** — Usa `orv_obras` em vez de `obras`

### 🟠 Duplicação de Sistema
9. **Dois planejamentos** — `PlanejamentoPage` usa `orv_planejamentos` (simples) e `ObraPlanoPage` usa `planos`/`plano_tarefas` (rico). Precisam convergir ou separar claramente.

---

## Etapas de Correção (Priorizadas por Dependência)

### Etapa 1 — Tipos TypeScript e Build Zero Erros
- [ ] 1.1 Adicionar interfaces `Plano`, `Tarefa`, `Equipe`, `Funcionario`, `StatusPlano`, `StatusTarefa` em `src/types/index.ts`
- [ ] 1.2 Corrigir importações em `ObraPlanoPage.tsx` e `supabaseService.ts`
- [ ] 1.3 Executar `npm run build` e confirmar zero erros

### Etapa 2 — Migration: FK, empresa_id, Índices, RLS
- [ ] 2.1 Nova migration corrigindo FK `orv_planejamentos.obra_id` → `public.obras(id)`
- [ ] 2.2 Adicionar `empresa_id` em todas as tabelas `orv_*` que não têm
- [ ] 2.3 Adicionar índices compostos (`empresa_id` + FKs)
- [ ] 2.4 Reescrever RLS policies para multi-tenant (dono via auth.uid, funcionário via `x-empresa-token`)

### Etapa 3 — Storage RLS
- [ ] 3.1 Policies no bucket `orvian-evidencias` (read/write por empresa via token)

### Etapa 4 — Auth Hardening
- [ ] 4.1 Em `AuthContext`: bloquear se `funcionario.ativo === false`
- [ ] 4.2 Garantir filtro `empresaId` em todas as queries de `ObraPlanoPage` e `supabaseService`

### Etapa 5 — Unificar/Clarear Planejamentos
- [ ] 5.1 Decidir: manter `orv_planejamentos` (campo) OU migrar para `planos`/`plano_tarefas` (gestor)
- [ ] 5.2 Documentar propósito no README/código; ajustar páginas

### Etapa 6 — Types Supabase e Relatórios
- [ ] 6.1 Rodar `supabase gen-types` e atualizar `src/integrations/supabase/types.ts`
- [ ] 6.2 Corrigir `RelatoriosPage`: `orv_obras` → `obras`
- [ ] 6.3 Remover casts `as any` desnecessários

### Etapa 7 — Páginas Placeholder → Funcionais
- [ ] 7.1 `CapaPage`: Dashboard resumido + KPIs + atalhos
- [ ] 7.2 `ApresentacaoPage`: Visão executiva (progresso, custos, cronograma)
- [ ] 7.3 `ConfiguracoesPage`: Configurações empresa/app

### Etapa 8 — Ajustes Finais e Deploy
- [ ] 8.1 Corrigir `ObrasService.create`: `nome` → `titulo`
- [ ] 8.2 Integrar `AgendaView` no switcher (TODO F7.3.6)
- [ ] 8.3 Build final, commit, deploy Vercel