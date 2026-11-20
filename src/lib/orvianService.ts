import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta, Servico, Elemento, Etapa, Atividade } from '@/types';

function mapObra(db: any): Obra {
  return {
    id: db.id, empresa_id: db.empresa_id, nome: db.titulo, cliente: db.cliente,
    localizacao: db.endereco, responsavel_geral: db.responsavel, data_inicio: db.data_inicio,
    previsao_conclusao: db.data_fim, situacao: db.status,
    cliente_id: db.cliente_id,
    projetos: db.projetos || [],
  };
}

// Serviços/contratos da obra (modelo canônico PreciCalc/DiGest).
// Cada item de obras.projetos é um serviço/contrato independente da mesma obra.
export const ServicosObraService = {
  async list(obra: Obra | null): Promise<Servico[]> {
    return servicosDaObra(obra);
  },
  async listByObraId(empresaId: string | null, obraId: string): Promise<Servico[]> {
    // REGRA COMUM DO ECOSSISTEMA: usar a RPC que retorna SOMENTE
    // orçamentos aprovados no PreciCalc (nunca ler obras.projetos cru).
    const { data, error } = await supabase.rpc('listar_servicos_aprovados_obra' as any, { p_obra_id: obraId });
    if (error) throw error;
    return (data || []).map((s: any) => ({
      id: s.id,
      proposta_id: '',
      nome: s.nome,
      descricao: s.valor ? `Valor: ${Number(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : null,
      modelo_acompanhamento: 'simples',
    })) as Servico[];
  },
};

// Serviços da obra vindos de obras.projetos — REGRA DO ECOSSISTEMA:
// obras.projetos é preenchido pelo DiGest APENAS quando o orçamento do PreciCalc
// é aprovado. Rascunhos/draft/enviado nunca aparecem aqui. O ORVIAN apenas lê;
// nunca cria serviços a partir de orçamentos não aprovados.
// Cada item é { nome, valor }. Convertido para o formato de serviço do ORVIAN.
export function servicosDaObra(obra: Obra | null): Servico[] {
  if (!obra) return [];
  const projetos = (obra as any).projetos || [];
  return projetos.map((p: any, i: number) => ({
    id: `projeto:${obra.id}:${i}`,
    proposta_id: '',
    nome: String(p.nome ?? `Serviço ${i + 1}`),
    descricao: p.valor ? `Valor: ${p.valor}` : null,
    modelo_acompanhamento: 'simples',
  }));
}

// ============================================================
// OBRAS — tabela COMPARTILHADA public.obras (PreciCalc/DiGest/PlanSeven)
// ============================================================
export const ObrasService = {
  async list(empresaId?: string | null): Promise<Obra[]> {
    let q = supabase.from('obras').select('id, titulo, cliente, cliente_id, endereco, status, responsavel, data_inicio, data_fim, empresa_id, created_at, projetos');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapObra);
  },
  async create(o: Partial<Obra> & { empresa_id?: string }): Promise<Obra> {
    const payload: any = { titulo: o.nome, cliente: o.cliente, endereco: o.localizacao, status: o.situacao || 'planejada', empresa_id: o.empresa_id };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { data, error } = await supabase.from('obras').insert(payload).select('id, titulo, cliente, cliente_id, endereco, status, responsavel, data_inicio, data_fim, empresa_id, created_at').single();
    if (error) throw error;
    return mapObra(data);
  },
  async update(id: string, o: Partial<Obra>): Promise<Obra> {
    const payload: any = {};
    if (o.nome !== undefined) payload.titulo = o.nome;
    if (o.cliente !== undefined) payload.cliente = o.cliente;
    if (o.localizacao !== undefined) payload.endereco = o.localizacao;
    if (o.situacao !== undefined) payload.status = o.situacao;
    const { data, error } = await supabase.from('obras').update(payload).eq('id', id).select('id, titulo, cliente, cliente_id, endereco, status, responsavel, data_inicio, data_fim, empresa_id, created_at').single();
    if (error) throw error;
    return mapObra(data);
  },
  async remove(_id: string) { throw new Error('Exclusão de obras é gerenciada pelo DiGest/PreciCalc.'); },
};

// ============================================================
// CLIENTES — tabela COMPARTILHADA public.clientes
// ============================================================
export const ClientesService = {
  async list(empresaId?: string | null): Promise<any[]> {
    let q = supabase.from('clientes').select('id, nome, telefone, email, endereco, empresa_id');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('nome');
    if (error) throw error;
    return data || [];
  },
};

// ============================================================
// PROPOSTAS / SERVIÇOS / ELEMENTOS / ETAPAS / CONTROLE
// (sem equivalente exato nas tabelas compartilhadas — usam orv_*)
// ============================================================
export const PropostasService = {
  async listByObra(obraId: string, empresaId?: string | null): Promise<Proposta[]> {
    let q = supabase.from('orv_propostas').select('*').eq('obra_id', obraId).is('deleted_at', null).order('created_at');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Proposta[];
  },
  async create(p: Partial<Proposta>, empresaId?: string | null): Promise<Proposta> {
    const payload: any = { ...p, ...(empresaId ? { empresa_id: empresaId } : {}) };
    const { data, error } = await supabase.from('orv_propostas').insert(payload).select().single();
    if (error) throw error;
    return data as Proposta;
  },
  async update(id: string, p: Partial<Proposta>) { await supabase.from('orv_propostas').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id); },
  async remove(id: string) { await supabase.from('orv_propostas').update({ deleted_at: new Date().toISOString() }).eq('id', id); },
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
    const payload: any = { ...s, ...(empresaId ? { empresa_id: empresaId } : {}) };
    const { data, error } = await supabase.from('orv_servicos').insert(payload).select().single();
    if (error) throw error;
    return data as Servico;
  },
  async update(id: string, s: Partial<Servico>) { await supabase.from('orv_servicos').update({ ...s, updated_at: new Date().toISOString() }).eq('id', id); },
  async remove(id: string) { await supabase.from('orv_servicos').update({ deleted_at: new Date().toISOString() }).eq('id', id); },
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
    const payload: any = { ...e, ...(empresaId ? { empresa_id: empresaId } : {}) };
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
    const payload: any = { ...e, ...(empresaId ? { empresa_id: empresaId } : {}) };
    const { data, error } = await supabase.from('orv_etapas').insert(payload).select().single();
    if (error) throw error;
    return data as Etapa;
  },
};

// ============================================================
// ATIVIDADES — tabela COMPARTILHADA public.diario_obra (tipo_registro='atividade')
// ============================================================
export const AtividadesService = {
  async list(limit = 50, empresaId?: string | null): Promise<Atividade[]> {
    let q = supabase.from('diario_obra').select('*').eq('tipo_registro', 'atividade').is('deleted_at', null);
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('data', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: d.id, obra_id: d.obra_id, proposta_id: d.proposta_id, servico_id: d.servico_id,
      elemento_id: d.elemento_id, etapa_id: d.etapa_id, data: d.data, hora: d.hora,
      descricao: d.descricao, microtarefas: d.microtarefas, quantidade: d.quantidade,
      unidade: d.unidade, percentual_avanco: d.percentual_avanco, responsavel: d.responsaveis,
      equipe: d.equipe, situacao: d.situacao, ocorrencias: d.ocorrencias,
      observacoes: d.observacoes_finais, status_etapa: d.status_etapa,
      fotos: d.foto_urls || [], tarefa_id: d.tarefa_id,
    } as Atividade));
  },
  async create(a: Partial<Atividade>, empresaId?: string | null): Promise<Atividade> {
    const payload: any = {
      empresa_id: empresaId, obra_id: a.obra_id, proposta_id: a.proposta_id,
      servico_id: a.servico_id, elemento_id: a.elemento_id, etapa_id: a.etapa_id,
      data: a.data, hora: a.hora, descricao: a.descricao || '', microtarefas: a.microtarefas,
      quantidade: a.quantidade, unidade: a.unidade, percentual_avanco: a.percentual_avanco,
      responsaveis: a.responsavel, equipe: a.equipe, situacao: a.situacao,
      ocorrencias: a.ocorrencias, observacoes_finais: a.observacoes,
      status_etapa: a.status_etapa, tipo_registro: 'atividade', descricao: a.descricao || 'Lançamento',
      foto_urls: (a as any).fotos?.length ? (a as any).fotos : null,
      tarefa_id: (a as any).tarefa_id || null,
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { data, error } = await supabase.from('diario_obra').insert(payload).select().single();
    if (error) throw error;
    return data as Atividade;
  },
};

// ============================================================
// DIÁRIO — tabela COMPARTILHADA public.diario_obra (tipo_registro='diario')
// ============================================================
export const DiariosService = {
  async list(empresaId?: string | null): Promise<any[]> {
    let q = supabase.from('diario_obra').select('*').eq('tipo_registro', 'diario').is('deleted_at', null);
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q.order('data', { ascending: false });
    if (error) throw error;
    return (data || []) as Diario[];
  },
};

// ============================================================
// PLANEJAMENTO — tabela COMPARTILHADA public.plano_tarefas
// ============================================================
export const PlanejamentosService = {
  async list(empresaId?: string | null, obraId?: string | null): Promise<any[]> {
    let q = supabase.from('plano_tarefas').select('*').is('deleted_at', null);
    if (empresaId) q = q.eq('empresa_id', empresaId);
    if (obraId) q = q.eq('obra_id', obraId);
    const { data, error } = await q.order('data_planejada_original');
    if (error) throw error;
    return (data || []) as Planejamento[];
  },
  async create(p: any, empresaId?: string | null, obraId?: string | null): Promise<any> {
    // plano_tarefas exige plano_id — usar/obter um plano padrão da obra
    let planoId = p.plano_id;
    if (!planoId) {
      let { data: plano } = await supabase.from('planos').select('id').eq('obra_id', obraId).eq('empresa_id', empresaId).order('created_at').limit(1).maybeSingle();
      if (!plano) {
        const created = await supabase.from('planos').insert({ obra_id: obraId, empresa_id: empresaId, nome: 'Planejamento ORVIAN', status: 'rascunho' }).select('id').single();
        plano = created.data;
      }
      planoId = plano?.id;
    }
    const payload: any = {
      empresa_id: empresaId, obra_id: obraId, plano_id: planoId,
      titulo: p.descricao || 'Atividade planejada', descricao: p.descricao,
      proposta_id: p.proposta_id || null, servico_id: p.servico_id || null,
      data_planejada_original: p.data_planejada_original,
      data_planejada_atual: p.data_planejada_atual || p.data_planejada_original,
      data_inicio: p.data_planejada_original, data_fim: p.data_planejada_atual || p.data_planejada_original,
      responsavel_id: p.responsavel_id || null, status: p.situacao || 'planejado',
      prioridade: 'media', ordem: 0, progresso: 0,
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { data, error } = await supabase.from('plano_tarefas').insert(payload).select().single();
    if (error) throw error;
    return data as Planejamento;
  },
  async update(id: string, p: any) {
    await supabase.from('plano_tarefas').update(p).eq('id', id);
  },
  async registrarRevisao(id: string, revisao: any) {
    const { data } = await supabase.from('plano_tarefas').select('revisoes').eq('id', id).single();
    const revisoes = [...((data as any)?.revisoes || []), revisao];
    await supabase.from('plano_tarefas').update({ revisoes, data_planejada_atual: revisao.data_nova, justificativa_reprogramacao: revisao.motivo }).eq('id', id);
  },
};

// ============================================================
// ALERTAS — etapas/tarefas atrasadas (balões clicáveis)
// ============================================================
export const AlertasService = {
  async list(empresaId?: string | null): Promise<any[]> {
    if (!empresaId) return [];
    const hoje = new Date().toISOString().slice(0, 10);
    const alertas: any[] = [];

    // Etapas com previsão vencida e não concluídas
    const { data: etapas } = await supabase.from('orv_controle_execucao' as any)
      .select('id, status, previsao, etapa_id, etapas!inner(nome, servico_id)')
      .eq('empresa_id', empresaId).lt('previsao', hoje).neq('status', 'concluido').limit(20);
    (etapas || []).forEach((c: any) => alertas.push({
      id: `etapa_${c.id}`, tipo: 'etapa',
      titulo: `Etapa atrasada: ${c.etapas?.nome || 'Etapa'}`,
      descricao: `Previsão: ${c.previsao}`,
      to: '/controle', obra_id: null,
    }));

    // Tarefas planejadas vencidas
    const { data: tarefas } = await supabase.from('plano_tarefas' as any)
      .select('id, titulo, descricao, data_planejada_atual, obra_id')
      .eq('empresa_id', empresaId).lt('data_planejada_atual', hoje).neq('status', 'concluida').limit(20);
    (tarefas || []).forEach((t: any) => alertas.push({
      id: `tarefa_${t.id}`, tipo: 'planejamento',
      titulo: `Tarefa atrasada: ${t.titulo || t.descricao || 'Tarefa'}`,
      descricao: `Previsão: ${t.data_planejada_atual}`,
      to: '/planejamento', obra_id: t.obra_id,
    }));

    return alertas;
  },
};

// ============================================================
// EMPRESA — dados da P7Store (logo, nome, cores)
// ============================================================
export const EmpresaService = {
  async get(empresaId?: string | null): Promise<any> {
    if (!empresaId) return null;
    const { data } = await supabase.from('empresa' as any)
      .select('id, nome, subtitle, logo_url, cnpj, endereco, telefone, cor_primaria, cor_secundaria, cor_acento')
      .eq('id', empresaId).maybeSingle();
    return data;
  },
};

// ============================================================
// CUSTOS — orv_custos (projetado) + lancamentos_caixa (real/DiGest)
// ============================================================
export const CustosService = {
  async list(empresaId: string | null, obraId?: string | null): Promise<any[]> {
    let q = supabase.from('orv_custos' as any).select('*').is('deleted_at', null).order('natureza');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    if (obraId) q = q.eq('obra_id', obraId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async create(c: any, empresaId: string | null): Promise<any> {
    const { data, error } = await supabase.from('orv_custos' as any)
      .insert({ ...c, empresa_id: empresaId }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, c: any) {
    await supabase.from('orv_custos' as any).update({ ...c, updated_at: new Date().toISOString() }).eq('id', id);
  },
  async remove(id: string) {
    await supabase.from('orv_custos' as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },
  // Custo REAL (saídas) lido do DiGest — só leitura, nunca grava
  async reais(empresaId: string | null, obraId: string): Promise<any[]> {
    const { data, error } = await supabase.from('lancamentos_caixa' as any)
      .select('id, data, categoria, descricao, valor, servico, provisionado')
      .eq('obra_id', obraId).eq('bpo_only', false);
    if (error) throw error;
    return (data || []).map((l: any) => ({
      id: l.id, data: l.data, natureza: l.categoria || 'Outros',
      descricao: l.descricao, valor: Math.abs(Number(l.valor || 0)),
      provisionado: Number(l.provisionado || 0), servico: l.servico,
    }));
  },
  // Lançamento de PROVISIONAMENTO no fluxo de caixa (modelo DiGest + coluna provisionado)
  async lanarProvisionamento(empresaId: string, obraId: string, natureza: string, descricao: string, valor: number, data: string, servico?: string) {
    const { error } = await supabase.from('lancamentos_caixa' as any).insert({
      empresa_id: empresaId, obra_id: obraId, categoria: natureza, descricao,
      valor: 0, provisionado: Math.abs(valor), data, servico: servico || null,
      bpo_only: false,
    });
    if (error) throw error;
  },
};

// ============================================================
// CONFIGURAÇÕES DA APRESENTAÇÃO (capa, legenda, cores)
// ============================================================
export const ConfigService = {
  async get(empresaId: string | null, chave: string): Promise<any> {
    if (!empresaId) return null;
    const { data } = await supabase.from('orv_configuracoes' as any)
      .select('valor').eq('empresa_id', empresaId).eq('chave', chave).maybeSingle();
    return data?.valor || null;
  },
  async set(empresaId: string | null, chave: string, valor: any): Promise<void> {
    if (!empresaId) return;
    const { data: existing } = await supabase.from('orv_configuracoes' as any)
      .select('id').eq('empresa_id', empresaId).eq('chave', chave).maybeSingle();
    if (existing) {
      await supabase.from('orv_configuracoes' as any).update({ valor, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('orv_configuracoes' as any).insert({ empresa_id: empresaId, chave, valor });
    }
  },
};

// ============================================================
// AVANÇO FÍSICO — calculado no banco (motor orv_avanco_servico/obra)
// ============================================================
export const AvancoService = {
  async obra(obraId: string): Promise<number> {
    const { data, error } = await supabase.rpc('orv_avanco_obra' as any, { p_obra_id: obraId });
    if (error) throw error;
    return Number(data || 0);
  },
  async servico(servicoId: string): Promise<number> {
    const { data, error } = await supabase.rpc('orv_avanco_servico' as any, { p_servico_id: servicoId });
    if (error) throw error;
    return Number(data || 0);
  },
};

// ============================================================
// EVIDÊNCIAS — tabela COMPARTILHADA public.pedidos (foto_url)
// ============================================================
export const EvidenciasService = {
  async list(empresaId?: string | null, obraId?: string | null): Promise<any[]> {
    let q = supabase.from('pedidos').select('*');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    if (obraId) q = q.eq('obra_id', obraId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id, obra_id: p.obra_id, proposta_id: p.proposta_id, servico_id: p.servico_id,
      url: p.foto_url || p.foto_finalizacao_url || '', tipo: 'foto', legenda: p.legenda,
      data: p.data_pedido, principal: p.principal,
    }));
  },
  async create(e: any, empresaId?: string | null): Promise<any> {
    const payload: any = {
      empresa_id: empresaId, obra_id: e.obra_id, proposta_id: e.proposta_id,
      servico_id: e.servico_id, foto_url: e.url, legenda: e.legenda,
      descricao: e.descricao, principal: e.principal, data_pedido: e.data || new Date().toISOString().slice(0,10),
      titulo: e.legenda || 'Evidência ORVIAN', status: 'concluido',
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { data, error } = await supabase.from('pedidos').insert(payload).select().single();
    if (error) throw error;
    return data as Evidencia;
  },
};
