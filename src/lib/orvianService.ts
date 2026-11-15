import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta, Servico, Elemento, Etapa, Atividade } from '@/types';

export const ObrasService = {
  async list(): Promise<Obra[]> {
    const { data, error } = await supabase.from('orv_obras' as any).select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Obra[];
  },
  async create(o: Partial<Obra>): Promise<Obra> {
    const { data, error } = await supabase.from('orv_obras' as any).insert(o).select().single();
    if (error) throw error;
    return data as Obra;
  },
  async update(id: string, o: Partial<Obra>): Promise<Obra> {
    const { data, error } = await supabase.from('orv_obras' as any).update({ ...o, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data as Obra;
  },
  async remove(id: string) {
    await supabase.from('orv_obras' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },
};

export const PropostasService = {
  async listByObra(obraId: string): Promise<Proposta[]> {
    const { data, error } = await supabase.from('orv_propostas' as any).select('*').eq('obra_id', obraId).is('deleted_at', null).order('created_at');
    if (error) throw error;
    return (data || []) as Proposta[];
  },
  async create(p: Partial<Proposta>): Promise<Proposta> {
    const { data, error } = await supabase.from('orv_propostas' as any).insert(p).select().single();
    if (error) throw error;
    return data as Proposta;
  },
  async update(id: string, p: Partial<Proposta>) {
    await supabase.from('orv_propostas' as any).update({ ...p, updated_at: new Date().toISOString() }).eq('id', id);
  },
  async remove(id: string) {
    await supabase.from('orv_propostas' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },
};

export const ServicosService = {
  async listByProposta(propostaId: string): Promise<Servico[]> {
    const { data, error } = await supabase.from('orv_servicos' as any).select('*').eq('proposta_id', propostaId).is('deleted_at', null).order('created_at');
    if (error) throw error;
    return (data || []) as Servico[];
  },
  async create(s: Partial<Servico>): Promise<Servico> {
    const { data, error } = await supabase.from('orv_servicos' as any).insert(s).select().single();
    if (error) throw error;
    return data as Servico;
  },
  async update(id: string, s: Partial<Servico>) {
    await supabase.from('orv_servicos' as any).update({ ...s, updated_at: new Date().toISOString() }).eq('id', id);
  },
  async remove(id: string) {
    await supabase.from('orv_servicos' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },
};

export const ElementosService = {
  async listByServico(servicoId: string): Promise<Elemento[]> {
    const { data, error } = await supabase.from('orv_elementos' as any).select('*').eq('servico_id', servicoId).is('deleted_at', null).order('created_at');
    if (error) throw error;
    return (data || []) as Elemento[];
  },
  async create(e: Partial<Elemento>): Promise<Elemento> {
    const { data, error } = await supabase.from('orv_elementos' as any).insert(e).select().single();
    if (error) throw error;
    return data as Elemento;
  },
};

export const EtapasService = {
  async listByServico(servicoId: string): Promise<Etapa[]> {
    const { data, error } = await supabase.from('orv_etapas' as any).select('*').eq('servico_id', servicoId).order('ordem');
    if (error) throw error;
    return (data || []) as Etapa[];
  },
  async create(e: Partial<Etapa>): Promise<Etapa> {
    const { data, error } = await supabase.from('orv_etapas' as any).insert(e).select().single();
    if (error) throw error;
    return data as Etapa;
  },
};

export const AtividadesService = {
  async list(limit = 50): Promise<Atividade[]> {
    const { data, error } = await supabase.from('orv_atividades' as any).select('*').is('deleted_at', null).order('data', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []) as Atividade[];
  },
  async create(a: Partial<Atividade>): Promise<Atividade> {
    const { data, error } = await supabase.from('orv_atividades' as any).insert(a).select().single();
    if (error) throw error;
    return data as Atividade;
  },
};