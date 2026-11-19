-- ORVIAN — Adicionar coluna PROVISIONADO no fluxo de caixa compartilhado (DiGest)
-- Não cria tabela nova; apenas acrescenta coluna (os demais apps ignoram).
-- Valor provisionado por natureza/mês; o gasto real continua em `valor` (< 0 = saída).

alter table public.lancamentos_caixa
  add column if not exists provisionado numeric(14,2) default 0;

create index if not exists idx_caixa_provisionado on public.lancamentos_caixa(empresa_id, obra_id, data)
  where provisionado is not null and provisionado <> 0;
