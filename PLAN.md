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
- [x] 1.1 Adicionar interfaces `Plano`, `Tarefa`, `Equipe`, `Funcionario`, `StatusPlano`, `StatusTarefa` em `src/types/index.ts`
- [x] 1.2 Corrigir importações em `ObraPlanoPage.tsx` e `supabaseService.ts`
- [x] 1.3 Executar `npm run build` e confirmar zero erros

### Etapa 2 — Migration: FK, empresa_id, Índices, RLS
- [x] 2.1 Nova migration corrigindo FK `orv_planejamentos.obra_id` → `public.obras(id)`
- [x] 2.2 Adicionar `empresa_id` em todas as tabelas `orv_*` que não têm
- [x] 2.3 Adicionar índices compostos (`empresa_id` + FKs)
- [x] 2.4 Reescrever RLS policies para multi-tenant (dono via auth.uid, funcionário via `x-empresa-token`)

### Etapa 3 — Storage RLS
- [x] 3.1 Policies no bucket `orvian-evidencias` (read/write por empresa via token)

### Etapa 4 — Auth Hardening
- [x] 4.1 Em `AuthContext`: bloquear se `funcionario.ativo === false`
- [x] 4.2 Garantir filtro `empresaId` em todas as queries de `ObraPlanoPage` e `supabaseService`

### Etapa 5 — Unificar/Clarear Planejamentos
- [x] 5.1 Decisão: ambos coexistem — `orv_planejamentos` (planejamento simples por atividade) e `planos`/`plano_tarefas` (gestor com Kanban/Gantt/Agenda)
- [x] 5.2 Documentado no código (comentários nos services)

### Etapa 6 — Types Supabase e Relatórios
- [ ] 6.1 Rodar `supabase gen-types` e atualizar `src/integrations/supabase/types.ts`
- [x] 6.2 Corrigir `RelatoriosPage`: `orv_obras` → `obras`
- [ ] 6.3 Remover casts `as any` desnecessários

### Etapa 7 — Páginas Placeholder → Funcionais
- [x] 7.1 `CapaPage`: Dashboard resumido + KPIs + atalhos
- [x] 7.2 `ApresentacaoPage`: Visão executiva (progresso, custos, cronograma)
- [x] 7.3 `ConfiguracoesPage`: Configurações empresa/app

### Etapa 8 — Ajustes Finais e Deploy
- [x] 8.1 Corrigir `ObrasService.create`: `nome` → `titulo`
- [x] 8.2 Integrar `AgendaView` no switcher (TODO F7.3.6)
- [x] 8.3 Build final, commit, deploy Vercel

### Etapa 9 — Apresentação: Filtros Obra + Contrato/Proposta
- [x] 9.1 Filtro de Obra (Select) na `ApresentacaoPage` — filtra todos os dados pela obra selecionada
- [x] 9.2 Filtro de Contrato/Proposta (Select) — filtra por proposta específica dentro da obra (ou todas as propostas da empresa)
- [x] 9.3 Tabela detalhada de contratos/propostas quando obra específica selecionada (serviços, elementos, etapas, atividades, execução %)
- [x] 9.4 KPIs, gráficos e tabela resumo respeitam os filtros aplicados
- [x] 9.5 Rodapé mostra obra/contrato selecionado

### Etapa 10 — Relatório Excel: exportar modelo + importar de volta
- [x] 10.1 `src/lib/relatorioService.ts`: `exportarRelatorio()` gera Excel com páginas de apresentação (CAPA, DASHBOARD, APRESENTACAO, PLANEJAMENTO, HISTORICO) + bases de dados (OBRAS, PROPOSTAS, SERVICOS, ELEMENTOS, ETAPAS_MODELO, CONTROLE_EXECUCAO, BASE_PLANEJAMENTO, DIARIO_DIAS, ATIVIDADES, EVIDENCIAS) + GUIA_DADOS, respeitando filtros obra/proposta
- [x] 10.2 `importarRelatorio()` recebe o Excel editado e atualiza as bases (update por id, insert sem id, resolve FK por nome)
- [x] 10.3 Botões Exportar/Importar no header da ApresentacaoPage com feedback de resultado

### Etapa 11 — Conectar às tabelas EXISTENTES (auditoria 16/11)
- [x] 11.1 Migration `20261116_orvian_connect_existing.sql`: adiciona colunas em `diario_obra`, `plano_tarefas`, `pedidos`, `obras`, `clientes`
- [x] 11.2 `orvianService.ts`: Atividades → `diario_obra`, Planejamentos → `plano_tarefas`, Evidências → `pedidos`, Obras → `obras`, Clientes → `clientes`
- [x] 11.3 Páginas (Planejamento, Histórico, Diário, Relatórios) reescritas para usar tabelas existentes
- [ ] 11.4 Remover tabelas `orv_*` redundantes do schema (após validação em produção)

### Etapa 12 — Correção de acesso (16/11)
- [x] 12.1 `get_current_empresa_id()` lê `app.empresa_id` (nome correto gravado por `set_empresa_context`)
- [x] 12.2 RLS robusto via `get_empresa_id_orv()` (header `x-empresa-token` em toda requisição)
- [x] 12.3 Tokens `app_id='orvian'` gerados para funcionários ativos
- [x] 12.4 `resolveEmpresaId` resolve funcionários e não cria empresas vazias
- [x] 12.5 `AccessPageFallback` redireciona automaticamente para P7Store (`p7store.vercel.app/apps`)

### Etapa 13 — Melhorias (17/11)
- [x] 13.1 Aba Relatórios: baixar relatório Excel completo (apresentação + bases) e enviar editado de volta (`exportarRelatorio`/`importarRelatorio`)
- [x] 13.2 `relatorioService` usa tabelas existentes (diario_obra, plano_tarefas, pedidos) na exportação e importação
- [x] 13.3 Dashboard e Apresentação mostram gráficos (Recharts) mesmo sem lançamentos
- [x] 13.4 Apresentação com botões Baixar/Enviar Excel e filtros Obra/Contrato
- [x] 13.5 Lançamento pré-configura a última obra usada (localStorage `orvian_ultima_obra`)

### Etapa 14 — Modelo correto serviço/obra + evolução (17/11)
- [x] 14.1 Serviço no lançamento vem de `obras.projetos` (modelo canônico PreciCalc/DiGest), sem exigir "Proposta"
- [x] 14.2 Lançamento aceita fotos (upload → `diario_obra.foto_urls`), unidade e vínculo com tarefa do planejamento
- [x] 14.3 Histórico unifica fotos de atividades (`diario_obra`) + evidências (`pedidos`)
- [x] 14.4 Apresentação: gráfico evolução planejado × executado + Mapa da Obra por serviço
- [x] 14.5 Subtarefas = atividades diárias (diario_obra.tarefa_id) com foto; trigger recalcula progresso da tarefa
- [x] 14.6 REGRA: só orçamentos APROVADOS no PreciCalc viram serviços (obras.projetos). Rascunhos não são compartilhados. ORVIAN apenas LÊ obras.projetos — NUNCA escreve de volta (removida sincronização reversa que violaria a regra)

### Etapa 15 — Subtarefas diárias (17/11)
- [x] 15.1 Migration `20261117_orvian_subtarefas_diarias.sql`: trigger recalcula progresso da tarefa mãe ao registrar atividade
- [x] 15.2 Planejamento: tarefas expansíveis mostrando subtarefas (data, descrição, fotos)
- [x] 15.3 Botão "Registrar atividade diária" dentro da tarefa (marca como concluída)
- [x] 15.4 Lançamento: seleção de tarefa do planejamento marca como executada ao registrar

### Etapa 16 — Modo fábrica (17/11)
- [x] 16.1 Motor de avanço físico por peso/quantidade no banco (`orv_avanco_servico`, `orv_avanco_obra`)
- [x] 16.2 Avanço físico exibido na Apresentação
- [x] 16.3 Gantt visual embutido no Planejamento (barra planejada + barra executada)

### Etapa 17 — Apresentação estilo PPTX (17/11)
- [x] 17.1 Capa editável: upload de imagem, legenda e cor de marcação (salvo em `orv_configuracoes`)
- [x] 17.2 Botão tela cheia (Fullscreen API)
- [x] 17.3 4 abas: Capa, Execução (tabela + atividades + mapa), Dashboard, Próximos Passos (contraste planejado × executado)
- [x] 17.4 Correção: `foto_urls` na consulta de atividades
- [x] 17.5 Capa separada (imagem da empresa) + aba Planta com upload, marcações geométricas (40% opacidade), legenda clicável que muda cor e forma, posicionamento na imagem e modo tela cheia
- [x] 17.6 Storage: policies aceitam capas/{obraId}, plantas/{obraId} (upload funcionando)
- [x] 17.7 Capa sem legenda; logo, nome e cores da empresa vêm da P7Store (`empresa.logo_url/nome/cor_*`)
- [x] 17.8 Galeria de imagens da planta acumulativa (adicionar, selecionar, excluir)
- [x] 17.9 Logo/nome da empresa (P7Store) na barra lateral e topbar mobile do app
- [x] 17.10 Apresentação sem logo (empresas parceiras); tela cheia com abas no topo e conteúdo preenchendo a tela
- [x] 17.11 Planta: legenda em cards separados (não misturam) + slider de tamanho da marcação (8-60%) + forma/cor/posicionar/excluir por card

### Etapa 18 — Custos do Projeto (17/11)
- [x] 18.1 Migration `orv_custos` (obra, serviço opcional, natureza, valor mensal, qtd, total) + RLS
- [x] 18.2 Aba Custos no menu/rota: tabela editável + naturezas padrão do exemplo
- [x] 18.3 Leitura do custo REAL de `lancamentos_caixa` (DiGest) — somente leitura
- [x] 18.4 Indicadores Projetado / Investido / Saldo / Resultado + gráfico comparativo por natureza
- [x] 18.5 Coluna `provisionado` em `lancamentos_caixa` (modelo DiGest, sem nova tabela)
- [x] 18.6 Importar planilha ProvGast (Data|NATUREZA|DESCRIÇÃO|GASTO|PROVISIONADO) → lança provisionamento no caixa
- [x] 18.7 Gráfico Provisionado × Gasto × Saldo mês a mês + tabela detalhada