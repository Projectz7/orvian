# PLAN — ORVIAN (Gestão de Obras)

App de gestão, execução e acompanhamento de obras (PT-BR). Reutiliza Supabase `pnijzmqygibhwbcnkklm` (p7store); repo GitHub e projeto Vercel `orvian`. Stack: Vite+React+TS+Tailwind+shadcn, Supabase (Auth/DB/Storage), ExcelJS (export com imagens), jsPDF.

## Etapas
1. [ ] Scaffold adaptado (auth P7Store, rotas, layout, menu)
2. [ ] Migration Supabase: obras, propostas, servicos, elementos, modelos_etapas, etapas, controle_execucao, planejamentos, revisoes_planejamento, diarios, atividades, evidencias, usuarios, equipes, responsaveis, calendario, configuracoes, historico_alteracoes, campos_personalizados; RLS; RPCs
3. [ ] Cadastros dinâmicos (obras, propostas, serviços, elementos, etapas personalizadas, modelos reutilizáveis)
4. [ ] Lançamento rápido de atividades + atualização automática de progresso
5. [ ] Diário de obras (organização por dia, geração de texto, versões)
6. [ ] Controle físico de execução (tabela, cartões, barra, timeline, filtros)
7. [ ] Cálculo de avanço físico (etapas pesos iguais/personalizados, quantidades, manual justificado; consolidação por peso)
8. [ ] Planejamento (atividades planejadas, revisões de previsão, vínculos, atrasos, Gantt, previsto vs realizado)
9. [ ] Dashboard geral (indicadores, filtros em cascata, gráficos)
10. [ ] Apresentação executiva (capa, modos, exportação PDF)
11. [ ] Histórico fotográfico semanal (dom-sáb, foto principal, galeria)
12. [ ] Módulo de fotografias/documentos (storage separado, galeria, visualizador)
13. [ ] Exportação Excel completa (abas de apresentação + bases, imagens incorporadas)
14. [ ] Exportação PDF
15. [ ] Integração Power BI (views, dimensões, fatos)
16. [ ] Usuários e permissões (admin/gestor/colaborador/visualizador, auditoria)
17. [ ] Responsividade e usabilidade no canteiro (offline rascunhos)
18. [ ] Importação dos dados dos Excel (Diário de Obra + Modelo), migração com conferência
19. [ ] Automações/IA (resumos, alertas) sem inventar dados
20. [ ] Testes funcionais e validação (12 testes da spec)
21. [ ] Integração P7Store (tile, ADMIN_APPS, apps_liberados, SSO /access/:token)
22. [ ] Build, repo GitHub orvian, deploy Vercel