-- ORVIAN - Schema inicial (gestao de obras)
-- Reutiliza projeto Supabase pnijzmqygibhwbcnkklm (p7store)

-- OBRAS: reutiliza a tabela compartilhada public.obras (PreciCalc/DiGest/PlanSeven)
-- Campos relevantes: id, titulo, cliente, endereco, status, empresa_id, responsavel, data_inicio, data_fim

-- PROPOSTAS / FRENTES
create table if not exists public.orv_propostas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete cascade,
  nome text not null,
  descricao text,
  situacao text default 'em_levantamento',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- SERVICOS
create table if not exists public.orv_servicos (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid references public.orv_propostas(id) on delete cascade,
  nome text not null,
  descricao text,
  modelo_acompanhamento text default 'etapas', -- etapas | quantidade | elementos_etapas | simples | combinado
  unidade_medicao text,
  quantidade_prevista numeric,
  peso numeric default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- ELEMENTOS
create table if not exists public.orv_elementos (
  id uuid primary key default gen_random_uuid(),
  servico_id uuid references public.orv_servicos(id) on delete cascade,
  codigo text,
  nome text,
  descricao text,
  quantidade numeric default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- MODELOS DE ETAPAS
create table if not exists public.orv_modelos_etapas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid,
  nome text not null,
  descricao text,
  created_at timestamptz default now()
);

-- ETAPAS DOS SERVICOS
create table if not exists public.orv_etapas (
  id uuid primary key default gen_random_uuid(),
  servico_id uuid references public.orv_servicos(id) on delete cascade,
  elemento_id uuid references public.orv_elementos(id) on delete cascade,
  modelo_id uuid references public.orv_modelos_etapas(id),
  nome text not null,
  ordem int default 0,
  peso numeric default 1,
  unidade_medicao text,
  quantidade_prevista numeric,
  dependencia_etapa_id uuid references public.orv_etapas(id),
  criterio_conclusao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONTROLE DE EXECUCAO
create table if not exists public.orv_controle_execucao (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid references public.orv_etapas(id) on delete cascade,
  status text default 'nao_iniciado',
  data_inicio_real date,
  data_conclusao_real date,
  previsao date,
  responsavel text,
  quantidade_executada numeric,
  percentual_avanco numeric default 0,
  justificativa text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PLANEJAMENTOS
create table if not exists public.orv_planejamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.orv_obras(id) on delete cascade,
  proposta_id uuid references public.orv_propostas(id),
  servico_id uuid references public.orv_servicos(id),
  elemento_id uuid references public.orv_elementos(id),
  etapa_id uuid references public.orv_etapas(id),
  descricao text,
  data_planejada_original date,
  data_planejada_atual date,
  data_inicio_real date,
  data_conclusao_real date,
  responsavel text,
  peso numeric default 1,
  dependencias text,
  situacao text default 'planejado',
  justificativa_reprogramacao text,
  vinculo_atividade_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- REVISÕES DO PLANEJAMENTO
create table if not exists public.orv_revisoes_planejamento (
  id uuid primary key default gen_random_uuid(),
  planejamento_id uuid references public.orv_planejamentos(id) on delete cascade,
  data_revisao timestamptz default now(),
  data_anterior date,
  data_nova date,
  responsavel text,
  motivo text
);

-- DIARIOS
create table if not exists public.orv_diarios (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.orv_obras(id) on delete cascade,
  proposta_id uuid references public.orv_propostas(id),
  data date not null,
  resumo_geral text,
  atividades_realizadas text,
  detalhamento_tecnico text,
  equipes text,
  responsaveis text,
  quantidades text,
  ocorrencias text,
  impedimentos text,
  observacoes_finais text,
  versao int default 1,
  finalizado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ATIVIDADES
create table if not exists public.orv_atividades (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.orv_obras(id),
  proposta_id uuid references public.orv_propostas(id),
  servico_id uuid references public.orv_servicos(id),
  elemento_id uuid references public.orv_elementos(id),
  etapa_id uuid references public.orv_etapas(id),
  diario_id uuid references public.orv_diarios(id),
  data date not null,
  hora time,
  descricao text,
  microtarefas text,
  quantidade numeric,
  unidade text,
  percentual_avanco numeric,
  responsavel text,
  equipe text,
  situacao text,
  ocorrencias text,
  observacoes text,
  status_etapa text, -- atividade_registrada | etapa_iniciada | parcial | concluida | bloqueada
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- EVIDENCIAS
create table if not exists public.orv_evidencias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.orv_obras(id),
  proposta_id uuid references public.orv_propostas(id),
  servico_id uuid references public.orv_servicos(id),
  elemento_id uuid references public.orv_elementos(id),
  etapa_id uuid references public.orv_etapas(id),
  atividade_id uuid references public.orv_atividades(id),
  diario_id uuid references public.orv_diarios(id),
  tipo text default 'foto', -- foto | pdf | documento | planilha | outro
  url text not null,
  legenda text,
  descricao text,
  data date,
  responsavel_envio text,
  principal boolean default false,
  created_at timestamptz default now()
);

-- EQUIPES/RESPONSÁVEIS: reutiliza as tabelas compartilhadas public.equipes e public.funcionarios

-- CALENDARIO
create table if not exists public.orv_calendario (
  id uuid primary key default gen_random_uuid(),
  data date unique not null,
  dia_semana int,
  semana int,
  mes int,
  ano int
);

-- CONFIGURACOES
create table if not exists public.orv_configuracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid,
  chave text not null,
  valor jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HISTORICO DE ALTERAÇÕES
create table if not exists public.orv_historico_alteracoes (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid,
  usuario text,
  acao text,
  campo text,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz default now()
);

-- CAMPOS PERSONALIZADOS
create table if not exists public.orv_campos_personalizados (
  id uuid primary key default gen_random_uuid(),
  entidade text not null, -- obra | proposta | servico | elemento | etapa
  nome text not null,
  tipo text not null, -- texto | numero | data | lista | sim_nao | quantidade_unidade | documento | foto
  opcoes jsonb,
  obrigatorio boolean default false,
  created_at timestamptz default now()
);

-- VALORES DE CAMPOS PERSONALIZADOS
create table if not exists public.orv_valores_campos (
  id uuid primary key default gen_random_uuid(),
  campo_id uuid references public.orv_campos_personalizados(id) on delete cascade,
  registro_id uuid not null,
  valor jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- STORAGE BUCKET
insert into storage.buckets (id, name, public) values ('orvian-evidencias','orvian-evidencias', true) on conflict (id) do nothing;

-- RLS: habilitar (public.obras já possui RLS do schema compartilhado)
alter table public.orv_propostas enable row level security;
alter table public.orv_servicos enable row level security;
alter table public.orv_elementos enable row level security;
alter table public.orv_etapas enable row level security;
alter table public.orv_controle_execucao enable row level security;
alter table public.orv_planejamentos enable row level security;
alter table public.orv_revisoes_planejamento enable row level security;
alter table public.orv_diarios enable row level security;
alter table public.orv_atividades enable row level security;
alter table public.orv_evidencias enable row level security;

-- Políticas permissivas iniciais (refinar por empresa depois)
-- (replicar para demais tabelas de forma simples)
create policy if not exists orv_propostas_all on public.orv_propostas for all using (true) with check (true);
create policy if not exists orv_servicos_all on public.orv_servicos for all using (true) with check (true);
create policy if not exists orv_elementos_all on public.orv_elementos for all using (true) with check (true);
create policy if not exists orv_etapas_all on public.orv_etapas for all using (true) with check (true);
create policy if not exists orv_controle_all on public.orv_controle_execucao for all using (true) with check (true);
create policy if not exists orv_planej_all on public.orv_planejamentos for all using (true) with check (true);
create policy if not exists orv_revplan_all on public.orv_revisoes_planejamento for all using (true) with check (true);
create policy if not exists orv_diarios_all on public.orv_diarios for all using (true) with check (true);
create policy if not exists orv_atividades_all on public.orv_atividades for all using (true) with check (true);
create policy if not exists orv_evidencias_all on public.orv_evidencias for all using (true) with check (true);