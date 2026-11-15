// Obra = linha da tabela compartilhada public.obras (PreciCalc/DiGest/PlanSeven)
export interface Obra {
  id: string;
  empresa_id?: string | null;
  nome?: string | null;      // mapeia titulo
  cliente?: string | null;
  localizacao?: string | null; // mapeia endereco
  responsavel_geral?: string | null; // mapeia responsavel
  data_inicio?: string | null;
  prazo_contratual?: string | null;
  previsao_conclusao?: string | null; // mapeia data_fim
  descricao?: string | null;
  situacao?: string | null;  // mapeia status
}

export interface Proposta {
  id: string;
  obra_id: string;
  nome: string;
  descricao?: string | null;
  situacao?: string | null;
}

export interface Servico {
  id: string;
  proposta_id: string;
  nome: string;
  descricao?: string | null;
  modelo_acompanhamento?: string | null;
  unidade_medicao?: string | null;
  quantidade_prevista?: number | null;
  peso?: number | null;
}

export interface Elemento {
  id: string;
  servico_id: string;
  codigo?: string | null;
  nome: string;
  descricao?: string | null;
  quantidade?: number | null;
}

export interface Etapa {
  id: string;
  servico_id: string;
  elemento_id?: string | null;
  nome: string;
  ordem?: number | null;
  peso?: number | null;
  unidade_medicao?: string | null;
  quantidade_prevista?: number | null;
  dependencia_etapa_id?: string | null;
  criterio_conclusao?: string | null;
}

export interface Atividade {
  id?: string;
  obra_id?: string | null;
  proposta_id?: string | null;
  servico_id?: string | null;
  elemento_id?: string | null;
  etapa_id?: string | null;
  data: string;
  hora?: string | null;
  descricao?: string | null;
  microtarefas?: string | null;
  quantidade?: number | null;
  unidade?: string | null;
  percentual_avanco?: number | null;
  responsavel?: string | null;
  equipe?: string | null;
  situacao?: string | null;
  ocorrencias?: string | null;
  observacoes?: string | null;
  status_etapa?: string | null;
}

// --- Tipos do módulo Planejamento Avançado (planos / plano_tarefas) ---

export type StatusPlano = 'rascunho' | 'fechado';

export type StatusTarefa = 'a_fazer' | 'fazendo' | 'concluida' | 'bloqueada' | 'cancelada';

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'critica';

export interface KanbanColumn {
  id: string;
  label: string;
  status: StatusTarefa;
  ordem: number;
  fixa?: boolean; // colunas "A fazer" e "Concluída" não podem ser removidas
}

export interface Plano {
  id: string;
  empresa_id: string;
  obra_id: string;
  nome: string;
  status: StatusPlano;
  kanban_cols?: KanbanColumn[];
  google_calendar_config?: {
    syncEnabled: boolean;
    calendarId?: string;
    accessToken?: string;
    refreshToken?: string;
    lastSync?: string;
  };
  created_at: string;
  updated_at: string;
  fechado_em?: string | null;
}

export interface Equipe {
  id: string;
  empresa_id: string;
  nome: string;
  cor?: string | null;
  created_at?: string;
}

export interface Funcionario {
  id: string;
  empresa_id?: string | null;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  is_gerente?: boolean;
  ativo?: boolean;
  equipe_id?: string | null;
  equipe_ids?: string[];
  custo_diario?: number | null;
  tipo_contrato?: 'CLT' | 'PJ' | null;
  created_at?: string;
}

export interface Tarefa {
  id: string;
  empresa_id: string;
  obra_id: string;
  plano_id: string;
  titulo: string;
  descricao?: string | null;
  status: StatusTarefa;
  prioridade: PrioridadeTarefa;
  responsavel_id?: string | null;
  equipe_id?: string | null;
  parent_id?: string | null;
  ordem: number;
  data_inicio?: string | null;
  data_fim?: string | null;
  data_inicio_real?: string | null;
  data_fim_real?: string | null;
  progresso: number;
  progresso_manual?: boolean;
  horas_estimadas?: number | null;
  peso_tarefa?: number | null;
  responsavel?: { id: string; nome: string } | null;
  responsavelNome?: string | null;
  created_at: string;
  updated_at: string;
}