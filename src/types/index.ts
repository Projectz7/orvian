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
  fotos?: string[];
  tarefa_id?: string | null;
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

// --- Tabelas de apoio / configuração (para tipagem em services) ---
export interface ModeloEtapa {
  id: string;
  empresa_id: string;
  nome: string;
  descricao?: string | null;
  servico_tipo?: string | null;
  etapas_json: any;
  created_at: string;
  updated_at: string;
}

export interface Configuracao {
  id: string;
  empresa_id: string;
  chave: string;
  valor: any;
  descricao?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoricoAlteracao {
  id: string;
  empresa_id: string;
  tabela: string;
  registro_id: string;
  campo: string;
  valor_antigo: any;
  valor_novo: any;
  usuario_id?: string | null;
  created_at: string;
}

export interface CampoPersonalizado {
  id: string;
  empresa_id: string;
  entidade: string;
  nome: string;
  tipo: 'text' | 'number' | 'date' | 'boolean' | 'select';
  opcoes?: string[] | null;
  obrigatorio?: boolean;
  created_at: string;
}

export interface ValorCampo {
  id: string;
  empresa_id: string;
  campo_id: string;
  entidade: string;
  registro_id: string;
  valor: any;
  created_at: string;
}

export interface FuncionarioEquipe {
  funcionario_id: string;
  equipe_id: string;
}

export interface ControleExecucao {
  id: string;
  etapa_id: string;
  percentual: number;
  status: string;
  responsavel_id?: string | null;
  observacao?: string | null;
  data_medicao: string;
  created_at: string;
  updated_at: string;
}

export interface Evidencia {
  id: string;
  empresa_id: string;
  obra_id?: string | null;
  atividade_id?: string | null;
  etapa_id?: string | null;
  url: string;
  legenda?: string | null;
  tipo: 'foto' | 'video' | 'documento';
  uploaded_by?: string | null;
  created_at: string;
}

export interface Diario {
  id: string;
  empresa_id: string;
  obra_id: string;
  data: string;
  condicao_tempo?: string | null;
  temperatura_min?: number | null;
  temperatura_max?: number | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanejamentoCampo {
  id: string;
  empresa_id: string;
  obra_id: string;
  descricao: string;
  data_planejada_original: string;
  data_planejada_atual: string;
  data_conclusao_real?: string | null;
  responsavel?: string | null;
  situacao: string;
  justificativa_reprogramacao?: string | null;
  created_at: string;
  updated_at: string;
}