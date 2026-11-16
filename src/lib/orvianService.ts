import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta, Servico, Elemento, Etapa, Atividade } from '@/types';

// Helper to map DB fields to interface
function mapObra(db: any): Obra {
  return {
    id: db.id,
    empresa_id: db.empresa_id,
    nome: db.titulo,
    cliente: db.cliente,
    localizacao: db.endereco,
    responsavel_geral: db.responsavel,
    data_inicio: db.data_inicio,
    previsao_conclusao: db.data_fim,
    situacao: db.status,
    descricao: db.descricao,
  };
}

// Obras reutilizam a tabela compartilhada public.obras (PreciCalc/DiGest/PlanSeven)
// SEMPRE filtradas pela empresa do usuário logado (dono ou funcionário por token)
export const ObrasService = {
  async list(empresaId?: string | null): Promise<Obra[]> {
    let q = supabase.from('obras').select('id, titulo, cliente, endereco, status, responsavel, data_inicio, data_fim, empresa_id, created_at, descricao');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapObra);
  },
  async create(o: Partial<Obra> & { empresa_id?: string }): Promise<Obra> {
    const payload: any = {
      titulo: o.nome,
      cliente: o.cliente,
      endereco: o.localizacao,
      status: o.situacao || 'planejada',
      responsavel: o.responsavel_geral,
      data_inicio: o.data_inicio,
      data_fim: o.previsao_conclusao,
      empresa_id: o.empresa_id,
      descricao: o.descricao,
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { data, error } = await supabase.from('obras').insert(payload).select('id, titulo, cliente, endereco, status, responsavel, data_inicio, data_fim, empresa_id, created_at, descricao').single();
    if (error) throw error;
    return mapObra(data);
  },
  async update(id: string, o: Partial<Obra>): Promise<Obra> {
    const payload: any = {};
    if (o.nome !== undefined) payload.titulo = o.nome;
    if (o.cliente !== undefined) payload.cliente = o.cliente;
    if (o.localizacao !== undefined) payload.endereco = o.localizacao;
    if (o.situacao !== undefined) payload.status = o.situacao;
    if (o.responsavel_geral !== undefined) payload.responsavel = o.responsavel_geral;
    if (o.data_inicio !== undefined) payload.data_inicio = o.data_inicio;
    if (o.previsao_conclusao !== undefined) payload.data_fim = o.previsao_conclusao;
    if (o.descricao !== undefined) payload.descricao = o.descricao;
    const { data, error } = await supabase.from('obras').update(payload).eq('id', id).select('id, titulo, cliente, endereco, status, responsavel, data_inicio, data_fim, empresa_id, created_at, descricao').single();
    if (error) throw error;
    return mapObra(data);
  },
  async remove(_id: string) {
    throw new Error('Exclusão de obras é gerenciada pelo DiGest/PreciCalc.');
  },
};

export const PropostasService = {
  async listByObra(obraId: string, empresaId?: string | null): Promise<Proposta[]> {
    let q = supabase.from('orv_propostas').select('*').eq('obra_id', obraId).is('deleted_at', null).order('created_at');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Proposta[];
  },
  async create(p: Partial<Proposta>, empresaId?: string | null): Promise<Proposta> {
    const payload: any = { ...p };
    if (empresaId) payload.empresa_id = empresaId;
    const { data, error } = await supabase.from('orv_propostas').insert(payload).select().single();
    if (error) throw error;
    return data as Proposta;
  },
  async update(id: string, p: Partial<Proposta>) {
    await supabase.from('orv_propostas').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id);
  },
  async remove(id: string) {
    await supabase.from('orv_propostas').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },
};

export const ServicosService = {
  async listByProposta(propostaId: string, empresaId?: string | null): Promise<Servico[]> {
    let q = supabase.from('orv_servicos').select('*').eq('proposta_id', propostaId).is('deleted_at', null).order('created_at');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Servico[];
  },
  async create(s: Partial<Servico>, empresaId?: string | null): Promise<Servico> {
    const payload: any = { ...s };
    if (empresaId) payload.empresa_id = empresaId;
    const { data, error } = await supabase.from('orv_servicos').insert(payload).select().single();
    if (error) throw error;
    return data as Servico;
  },
  async update(id: string, s: Partial<Servico>) {
    await supabase.from('orv_servicos').update({ ...s, updated_at: new Date().toISOString() }).eq('id', id);
  },
  async remove(id: string) {
    await supabase.from('orv_servicos').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },
};

export const ElementosService = {
  async listByServico(servicoId: string, empresaId?: string | null): Promise<Elemento[]> {
    let q = supabase.from('orv_elementos').select('*').eq('servico_id', servicoId).is('deleted_at', null).order('created_at');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Elemento[];
  },
  async create(e: Partial<Elemento>, empresaId?: string | null): Promise<Elemento> {
    const payload: any = { ...e };
    if (empresaId) payload.empresa_id = empresaId;
    const { data, error } = await supabase.from('orv_elementos').insert(payload).select().single();
    if (error) throw error;
    return data as Elemento;
  },
};

export const EtapasService = {
  async listByServico(servicoId: string, empresaId?: string | null): Promise<Etapa[]> {
    let q = supabase.from('orv_etapas').select('*').eq('servico_id', servicoId).order('ordem');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Etapa[];
  },
  async create(e: Partial<Etapa>, empresaId?: string | null): Promise<Etapa> {
    const payload: any = { ...e };
    if (empresaId) payload.empresa_id = empresaId;
    const { data, error } = await supabase.from('orv_etapas').insert(payload).select().single();
    if (error) throw error;
    return data as Etapa;
  },
};

export const AtividadesService = {
  async list(limit = 50, empresaId?: string | null): Promise<Atividade[]> {
    let obraIds: string[] | null = null;
    if (empresaId) {
      const obras = await ObrasService.list(empresaId);
      obraIds = obras.map((o) => o.id);
      if (obraIds.length === 0) return [];
    }
    let q = supabase.from('orv_atividades').select('*').is('deleted_at', null);
    if (obraIds) q = q.in('obra_id', obraIds);
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('data', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []) as Atividade[];
  },
  async create(a: Partial<Atividade>, empresaId?: string | null): Promise<Atividade> {
    const payload: any = { ...a };
    if (empresaId) payload.empresa_id = empresaId;
    const { data, error } = await supabase.from('orv_atividades').insert(payload).select().single();
    if (error) throw error;
    return data as Atividade;
  },
};