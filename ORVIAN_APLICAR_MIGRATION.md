# Aplicar Migration do ORVIAN no Supabase

As tabelas `orv_*` (servicos, etapas, atividades, planejamentos, diarios, evidencias, controle_execucao, propostas) NÃO existem no projeto Supabase `pnijzmqygibhwbcnkklm`. Por isso as abas de lançamento não reconhecem obra/serviço.

## Como aplicar (2 minutos)

1. Abra https://supabase.com/dashboard/project/pnijzmqygibhwbcnkklm/sql/new
2. Cole o conteúdo do arquivo `supabase/migrations/ORVIAN_COMPLETO.sql` (consolidado).
3. Clique em **Run**.

O SQL é idempotente (usa `if not exists` / `on conflict`), pode ser rodado mais de uma vez sem quebrar. Reutiliza as tabelas compartilhadas `obras`, `equipes`, `funcionarios`, `empresa` (PreciCalc/DiGest/PlanSeven) e só adiciona as tabelas `orv_*` novas + bucket de storage `orvian-evidencias`.

Após rodar, as abas de Lançamento, Controle, Diário, Planejamento, Histórico e Exportação passam a funcionar.