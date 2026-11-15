# TODO.md — Plano F7

## F7.1 — Kanban Customizável
- [x] 1.1 Migration: adicionar coluna `kanban_cols` JSONB em `planos` (default: 3 colunas padrão)
- [x] 1.2 Atualizar tipos: `Plano` com `kanban_cols`, `KanbanColumn` type
- [x] 1.3 KanbanView: ler colunas do plano ativo, fallback para default
- [x] 1.4 UI Kanban: botão "Gerenciar colunas" → dialog com lista drag-reorder, add, rename, delete, fixar (A Fazer/Concluída sempre visíveis)
- [x] 1.5 Persistir alterações no plano (updatePlano com kanban_cols)
- [x] 1.6 Drag-drop entre colunas customizadas (mapear status da tarefa para coluna)

## F7.2 — View Lista
- [x] 2.1 Criar ListaView.tsx: tabela plana com TanStack Table (sort, filter, group, column visibility)
- [x] 2.2 Agrupamento arrastável (group by: status, responsável, prioridade, equipe, data)
- [x] 2.3 Inline-edit nas células (título, datas, status, prioridade, responsável)
- [x] 2.4 Export CSV/Excel
- [x] 2.5 Integrar no switcher ObraPlanoPage

## F7.3 — View Agenda
- [x] 3.1 Criar AgendaView.tsx: FullCalendar ou custom (mês/semana/dia)
- [x] 3.2 Eventos = tarefas com data_inicio/data_fim; multi-dia = span
- [x] 3.3 Drag event → atualiza datas da tarefa
- [x] 3.4 Click dia vazio → abre dialog nova tarefa com data preenchida
- [x] 3.5 Filtros herdados (busca, status, responsável)
- [ ] 3.6 Integrar no switcher

## F7.4 — Google Calendar Sync
- [x] 4.1 Supabase Edge Function: `google-calendar-sync` (OAuth token via supabase.auth.getSession)
- [x] 4.2 Tabela `google_calendar_sync` (plano_id, calendar_id, access_token, refresh_token, sync_enabled, last_sync)
- [x] 4.3 Mapeamento status↔cores do Calendar; criar/atualizar/deletar eventos
- [x] 4.4 UI config no plano: conectar conta, escolher calendar, ativar sync
- [x] 4.5 Sync automático (cron) + botão sync manual

## F7.5 — Dashboard Executivo
- [ ] 5.1 HomePage v2: cards KPI (projetos ativos, tarefas atrasadas, custo MO total, progresso médio)
- [ ] 5.2 Gráfico barras: progresso por projeto (Recharts)
- [ ] 5.3 Tabela ranking: projetos com % progresso, atraso, custo
- [ ] 5.4 Alertas: tarefas vencidas, projetos parados, orçamento estourado
- [ ] 5.5 Filtros: período, responsável, equipe

## F7.6 — Build + Deploy
- [ ] 6.1 npm run build (verificar sem erros)
- [ ] 6.2 git add -A && commit + push