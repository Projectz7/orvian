export interface Obra {
  id: string;
  empresa_id?: string | null;
  nome: string;
  cliente?: string | null;
  localizacao?: string | null;
  responsavel_geral?: string | null;
  data_inicio?: string | null;
  prazo_contratual?: string | null;
  previsao_conclusao?: string | null;
  descricao?: string | null;
  situacao?: string | null;
  foto_destaque_url?: string | null;
  deleted_at?: string | null;
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