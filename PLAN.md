# PLAN — ORVIAN (Gestão de Obras)

App de gestão, execução e acompanhamento de obras (PT-BR). Reutiliza Supabase `pnijzmqygibhwbcnkklm` (p7store); repo GitHub e projeto Vercel `orvian`. Stack: Vite+React+TS+Tailwind+shadcn, Supabase (Auth/DB/Storage), ExcelJS (export com imagens), jsPDF.

## Etapas
1. [x] Scaffold adaptado (auth P7Store, rotas, layout, menu)
2. [x] Migration Supabase: tabelas orv_* criadas + RLS + bucket storage (aplicação manual pendente)
3. [x] Cadastros dinâmicos (obras, propostas, serviços, elementos, etapas) - modelos reutilizáveis pendente
4. [x] Lançamento rápido de atividades (atualização automática de progresso pendente)
5. [x] Diário de obras (organização por dia; geração de texto e versões pendentes)
6. [x] Controle físico de execução (status por etapa; cartões/barra/timeline pendentes)
7. [ ] Cálculo de avanço físico (pendente)
8. [x] Planejamento (atividades planejadas + revisões; Gantt/vínculos pendentes)
9. [ ] Dashboard geral (indicadores, filtros em cascata, gráficos)
10. [ ] Apresentação executiva (capa, modos, exportação PDF)
11. [x] Histórico fotográfico semanal (dom-sáb, upload foto; galeria pendente)
12. [x] Módulo de fotografias/documentos (storage separado; visualizador pendente)
13. [x] Exportação Excel completa (abas + bases; imagens incorporadas pendente)
14. [ ] Exportação PDF
15. [ ] Integração Power BI (views, dimensões, fatos)
16. [ ] Usuários e permissões (admin/gestor/colaborador/visualizador, auditoria)
17. [ ] Responsividade e usabilidade no canteiro (offline rascunhos)
18. [ ] Importação dos dados dos Excel (Diário de Obra + Modelo), migração com conferência
19. [ ] Automações/IA (resumos, alertas) sem inventar dados
20. [ ] Testes funcionais e validação (12 testes da spec)
21. [ ] Integração P7Store (tile, ADMIN_APPS, apps_liberados, SSO /access/:token)
22. [ ] Build, repo GitHub orvian, deploy Vercel