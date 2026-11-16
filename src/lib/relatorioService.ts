import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import { ObrasService } from '@/lib/orvianService';

// ============================================================
// RELATÓRIO ORVIAN — Exportação e Importação Excel
// Modelo: páginas de apresentação + bases de dados
// O app exporta o relatório completo (respeitando filtros de
// obra/proposta) e recebe de volta para atualizar os dados.
// ============================================================

export interface ExportOptions {
  empresaId: string;
  obraId?: string | null;       // null/undefined = todas
  propostaId?: string | null;   // null/undefined = todas
}

export interface ImportResult {
  sheets: string[];
  inserted: Record<string, number>;
  updated: Record<string, number>;
  skipped: Record<string, number>;
  errors: string[];
}

// ---------- helpers ----------
function downloadBlob(buf: ArrayBuffer, filename: string) {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sheetToObjects(ws: ExcelJS.Worksheet): Record<string, any>[] {
  const rows: any[][] = [];
  ws.eachRow((row) => {
    const vals: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      let v = cell.value;
      if (v && typeof v === 'object' && 'result' in v) v = v.result; // formula
      if (v instanceof Date) v = v.toISOString().slice(0, 10);
      vals.push(v);
    });
    rows.push(vals);
  });
  if (rows.length < 2) return [];
  const headers = rows[0].map((h: any) => String(h ?? '').trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ''))
    .map((r) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { if (h) obj[h] = r[i]; });
      return obj;
    });
}

// Cabeçalhos oficiais das bases (usados mesmo quando não há registros,
// para que o usuário possa preencher o Excel e enviar de volta).
export const COLUNAS_BASES: Record<string, string[]> = {
  OBRAS: ['id', 'titulo', 'cliente', 'endereco', 'status', 'empresa_id', 'data_inicio', 'data_fim'],
  PROPOSTAS: ['id', 'obra_id', 'nome', 'descricao', 'situacao', 'empresa_id'],
  SERVICOS: ['id', 'proposta_id', 'nome', 'descricao', 'modelo_acompanhamento', 'unidade_medicao', 'quantidade_prevista', 'peso', 'empresa_id'],
  ELEMENTOS: ['id', 'servico_id', 'codigo', 'nome', 'quantidade', 'empresa_id'],
  ETAPAS_MODELO: ['id', 'servico_id', 'nome', 'ordem', 'peso', 'unidade_medicao', 'quantidade_prevista', 'empresa_id'],
  CONTROLE_EXECUCAO: ['id', 'etapa_id', 'status', 'data_inicio_real', 'data_conclusao_real', 'previsao', 'responsavel', 'quantidade_executada', 'percentual_avanco', 'empresa_id'],
  BASE_PLANEJAMENTO: ['id', 'obra_id', 'titulo', 'descricao', 'data_planejada_original', 'data_planejada_atual', 'status', 'empresa_id'],
  DIARIO_DIAS: ['id', 'obra_id', 'data', 'descricao', 'observacoes_finais', 'empresa_id'],
  ATIVIDADES: ['id', 'obra_id', 'proposta_id', 'servico_id', 'etapa_id', 'data', 'descricao', 'microtarefas', 'quantidade', 'unidade', 'responsavel', 'ocorrencias', 'observacoes', 'empresa_id'],
  EVIDENCIAS: ['id', 'obra_id', 'proposta_id', 'foto_url', 'legenda', 'descricao', 'data_pedido', 'empresa_id'],
};

function fillSheet(ws: ExcelJS.Worksheet, rows: any[], headers?: string[]) {
  const cols = headers || COLUNAS_BASES[ws.name] || (rows && rows.length > 0 ? Object.keys(rows[0]) : []);
  if (!rows || rows.length === 0) {
    ws.addRow(cols.length ? cols : ['Sem dados']);
    ws.getRow(1).font = { bold: true };
    return;
  }
  ws.addRow(cols);
  // header style
  const hdr = ws.getRow(1);
  hdr.font = { bold: true };
  hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  rows.forEach((r) => ws.addRow(cols.map((c) => r[c] ?? null)));
  ws.getColumn(1).width = 36;
  cols.forEach((_, i) => { if (i > 0) ws.getColumn(i + 1).width = 18; });
}

// ---------- EXPORT ----------
export async function exportarRelatorio(opts: ExportOptions): Promise<void> {
  const { empresaId, obraId, propostaId } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ORVIAN';
  wb.created = new Date();

  // 1. Carrega obras (filtradas)
  const todasObras = await ObrasService.list(empresaId);
  const obras = obraId ? todasObras.filter((o: any) => o.id === obraId) : todasObras;
  const obraIds = obras.map((o: any) => o.id);

  const inObra = (q: any) => q.in('obra_id', obraIds);

  // 2. Busca dados base
  const [propostasRes, servicosRes, atividadesRes, etapasRes, planejRes, diariosRes, evidenciasRes, controleRes, elementosRes] = await Promise.all([
    obraIds.length ? inObra(supabase.from('orv_propostas' as any).select('*').is('deleted_at', null)) : Promise.resolve({ data: [], error: null }),
    supabase.from('orv_servicos' as any).select('*').is('deleted_at', null),
    obraIds.length ? inObra(supabase.from('diario_obra' as any).select('*').eq('tipo_registro', 'atividade').is('deleted_at', null)) : Promise.resolve({ data: [], error: null }),
    supabase.from('orv_etapas' as any).select('*'),
    obraIds.length ? inObra(supabase.from('plano_tarefas' as any).select('*')) : Promise.resolve({ data: [], error: null }),
    obraIds.length ? inObra(supabase.from('diario_obra' as any).select('*').eq('tipo_registro', 'diario').is('deleted_at', null)) : Promise.resolve({ data: [], error: null }),
    obraIds.length ? inObra(supabase.from('pedidos' as any).select('*')) : Promise.resolve({ data: [], error: null }),
    supabase.from('orv_controle_execucao' as any).select('*'),
    supabase.from('orv_elementos' as any).select('*').is('deleted_at', null),
  ]);

  let propostas = (propostasRes.data || []) as any[];
  if (propostaId) propostas = propostas.filter((p: any) => p.id === propostaId);
  const propostaIds = propostas.map((p: any) => p.id);

  let servicos = ((servicosRes.data || []) as any[]).filter((s: any) => propostaIds.includes(s.proposta_id));
  const servicoIds = servicos.map((s: any) => s.id);

  let elementos = ((elementosRes.data || []) as any[]).filter((e: any) => servicoIds.includes(e.servico_id));
  let etapas = ((etapasRes.data || []) as any[]).filter((e: any) => servicoIds.includes(e.servico_id));
  const etapaIds = etapas.map((e: any) => e.id);

  let atividades = (atividadesRes.data || []) as any[];
  if (propostaId) atividades = atividades.filter((a: any) => a.proposta_id === propostaId);

  let controles = ((controleRes.data || []) as any[]).filter((c: any) => etapaIds.includes(c.etapa_id));

  // ---------- PÁGINAS DE APRESENTAÇÃO ----------
  const capa = wb.addWorksheet('CAPA');
  capa.getColumn(1).width = 40;
  capa.getColumn(2).width = 50;
  capa.addRow(['ORVIAN — SISTEMA DE GESTÃO E ACOMPANHAMENTO DE OBRAS']).font = { bold: true, size: 16 };
  capa.addRow([]);
  capa.addRow(['Relatório gerado em', new Date().toLocaleString('pt-BR')]);
  capa.addRow(['Empresa ID', empresaId]);
  capa.addRow(['Filtro Obra', obraId ? (obras[0]?.titulo || obraId) : 'Todas as obras']);
  capa.addRow(['Filtro Contrato/Proposta', propostaId ? (propostas[0]?.nome || propostaId) : 'Todos os contratos']);
  capa.addRow([]);
  capa.addRow(['Total de obras', obras.length]);
  capa.addRow(['Total de contratos', propostas.length]);
  capa.addRow(['Total de serviços', servicos.length]);
  capa.addRow(['Total de atividades', atividades.length]);

  const dash = wb.addWorksheet('DASHBOARD');
  dash.addRow(['Indicador', 'Valor']);
  const execucaoMedia = obras.length > 0 ? obras.reduce((s: number, o: any) => s + (parseFloat(o.execucao_media) || 0), 0) / obras.length : 0;
  dash.addRow(['Obras', obras.length]);
  dash.addRow(['Contratos/Propostas', propostas.length]);
  dash.addRow(['Serviços', servicos.length]);
  dash.addRow(['Elementos', elementos.length]);
  dash.addRow(['Etapas', etapas.length]);
  dash.addRow(['Atividades executadas', atividades.length]);
  dash.addRow(['Diários', (diariosRes.data || []).length]);
  dash.addRow(['Planejamentos', (planejRes.data || []).length]);
  dash.addRow(['Evidências fotográficas', (evidenciasRes.data || []).length]);
  dash.addRow(['Execução média (%)', Math.round(execucaoMedia)]);

  // APRESENTACAO — resumo por obra
  const apres = wb.addWorksheet('APRESENTACAO');
  apres.addRow(['Obra', 'Cliente', 'Endereço', 'Status', 'Contratos', 'Serviços', 'Atividades', 'Diários', 'Execução Média %']);
  for (const o of obras as any[]) {
    const propsO = propostas.filter((p: any) => p.obra_id === o.id);
    const servsO = servicos.filter((s: any) => propsO.some((p: any) => p.id === s.proposta_id));
    const ativO = atividades.filter((a: any) => a.obra_id === o.id);
    const diarO = (diariosRes.data || []).filter((d: any) => d.obra_id === o.id);
    apres.addRow([o.titulo, o.cliente, o.endereco, o.status, propsO.length, servsO.length, ativO.length, diarO.length, Math.round(parseFloat(o.execucao_media) || 0)]);
  }

  const plan = wb.addWorksheet('PLANEJAMENTO');
  fillSheet(plan, (planejRes.data || []) as any[]);

  const hist = wb.addWorksheet('HISTORICO');
  fillSheet(hist, (evidenciasRes.data || []) as any[]);

  // ---------- BASES DE DADOS ----------
  fillSheet(wb.addWorksheet('OBRAS'), obras as any[]);
  fillSheet(wb.addWorksheet('PROPOSTAS'), propostas);
  fillSheet(wb.addWorksheet('SERVICOS'), servicos);
  fillSheet(wb.addWorksheet('ELEMENTOS'), elementos);
  fillSheet(wb.addWorksheet('ETAPAS_MODELO'), etapas);
  fillSheet(wb.addWorksheet('CONTROLE_EXECUCAO'), controles);
  fillSheet(wb.addWorksheet('BASE_PLANEJAMENTO'), (planejRes.data || []) as any[]);
  fillSheet(wb.addWorksheet('DIARIO_DIAS'), (diariosRes.data || []) as any[]);
  fillSheet(wb.addWorksheet('ATIVIDADES'), atividades);
  fillSheet(wb.addWorksheet('EVIDENCIAS'), (evidenciasRes.data || []) as any[]);

  // Guia
  const guia = wb.addWorksheet('GUIA_DADOS');
  guia.addRow(['Aba', 'Tipo', 'Descrição']);
  guia.getRow(1).font = { bold: true };
  const guias: [string, string, string][] = [
    ['CAPA', 'Apresentação', 'Identificação do relatório'],
    ['DASHBOARD', 'Apresentação', 'Indicadores consolidados'],
    ['APRESENTACAO', 'Apresentação', 'Resumo por obra (filtrado)'],
    ['PLANEJAMENTO', 'Apresentação', 'Planejamentos simples'],
    ['HISTORICO', 'Apresentação', 'Evidências fotográficas'],
    ['OBRAS', 'Base de dados', 'Obras (compartilhado — não editar id)'],
    ['PROPOSTAS', 'Base de dados', 'Contratos/frentes de trabalho'],
    ['SERVICOS', 'Base de dados', 'Serviços por proposta'],
    ['ELEMENTOS', 'Base de dados', 'Elementos por serviço'],
    ['ETAPAS_MODELO', 'Base de dados', 'Etapas por serviço'],
    ['CONTROLE_EXECUCAO', 'Base de dados', 'Status/percentual por etapa'],
    ['BASE_PLANEJAMENTO', 'Base de dados', 'Planejamentos (orv_planejamentos)'],
    ['DIARIO_DIAS', 'Base de dados', 'Diário de obras por dia'],
    ['ATIVIDADES', 'Base de dados', 'Atividades lançadas'],
    ['EVIDENCIAS', 'Base de dados', 'Fotos/evidências'],
  ];
  guias.forEach((g) => guia.addRow(g));

  const buf = await wb.xlsx.writeBuffer();
  const obraTag = obraId ? `_obra_${obraId.slice(0, 8)}` : '';
  const propTag = propostaId ? `_prop_${propostaId.slice(0, 8)}` : '';
  downloadBlob(buf as ArrayBuffer, `orvian_apresentacao${obraTag}${propTag}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ---------- IMPORT ----------
// Recebe o relatório Excel de volta e atualiza as bases editáveis.
// Regra: linhas com "id" existente → update; sem id → insert.
export async function importarRelatorio(file: File, empresaId: string): Promise<ImportResult> {
  const result: ImportResult = { sheets: [], inserted: {}, updated: {}, skipped: {}, errors: [] };
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  wb.eachSheet((ws) => result.sheets.push(ws.name));

  const getSheet = (name: string) => wb.getWorksheet(name);

  // Mapeia obra/proposta/serviço/etapa por nome para resolver FKs de novas linhas
  const obraByNome = new Map<string, string>();
  const obrasWs = getSheet('OBRAS');
  if (obrasWs) {
    for (const o of sheetToObjects(obrasWs)) {
      if (o.titulo) obraByNome.set(String(o.titulo).toLowerCase(), o.id);
    }
  }

  // --- PROPOSTAS ---
  const wsProp = getSheet('PROPOSTAS');
  if (wsProp) {
    for (const row of sheetToObjects(wsProp)) {
      try {
        const obraId = row.obra_id || obraByNome.get(String(row.obra || row.Obra || '').toLowerCase());
        if (!obraId) { result.skipped['PROPOSTAS'] = (result.skipped['PROPOSTAS'] || 0) + 1; continue; }
        const payload: any = {
          nome: row.nome || row.Nome,
          obra_id: obraId,
          descricao: row.descricao ?? null,
          situacao: row.situacao ?? 'ativa',
          empresa_id: empresaId,
        };
        if (row.id) {
          await supabase.from('orv_propostas' as any).update(payload).eq('id', row.id);
          result.updated['PROPOSTAS'] = (result.updated['PROPOSTAS'] || 0) + 1;
        } else {
          await supabase.from('orv_propostas' as any).insert(payload);
          result.inserted['PROPOSTAS'] = (result.inserted['PROPOSTAS'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`PROPOSTAS: ${e.message}`); }
    }
  }

  // Recarrega propostas para mapear nome → id
  const { data: propsNow } = await supabase.from('orv_propostas' as any).select('id, nome, obra_id').eq('empresa_id', empresaId);
  const propByNome = new Map<string, string>();
  (propsNow || []).forEach((p: any) => propByNome.set(String(p.nome).toLowerCase(), p.id));

  // --- SERVICOS ---
  const wsServ = getSheet('SERVICOS');
  if (wsServ) {
    for (const row of sheetToObjects(wsServ)) {
      try {
        const propId = row.proposta_id || propByNome.get(String(row.proposta || row.Proposta || '').toLowerCase());
        if (!propId) { result.skipped['SERVICOS'] = (result.skipped['SERVICOS'] || 0) + 1; continue; }
        const payload: any = {
          proposta_id: propId,
          nome: row.nome || row.Nome,
          descricao: row.descricao ?? null,
          modelo_acompanhamento: row.modelo_acompanhamento ?? null,
          unidade_medicao: row.unidade_medicao ?? null,
          quantidade_prevista: row.quantidade_prevista ? Number(row.quantidade_prevista) : null,
          peso: row.peso ? Number(row.peso) : null,
          empresa_id: empresaId,
        };
        if (row.id) {
          await supabase.from('orv_servicos' as any).update(payload).eq('id', row.id);
          result.updated['SERVICOS'] = (result.updated['SERVICOS'] || 0) + 1;
        } else {
          await supabase.from('orv_servicos' as any).insert(payload);
          result.inserted['SERVICOS'] = (result.inserted['SERVICOS'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`SERVICOS: ${e.message}`); }
    }
  }

  const { data: servsNow } = await supabase.from('orv_servicos' as any).select('id, nome, proposta_id').eq('empresa_id', empresaId);
  const servByNome = new Map<string, string>();
  (servsNow || []).forEach((s: any) => servByNome.set(String(s.nome).toLowerCase(), s.id));

  // --- ELEMENTOS ---
  const wsElem = getSheet('ELEMENTOS');
  if (wsElem) {
    for (const row of sheetToObjects(wsElem)) {
      try {
        const servId = row.servico_id || servByNome.get(String(row.servico || row.Servico || '').toLowerCase());
        if (!servId) { result.skipped['ELEMENTOS'] = (result.skipped['ELEMENTOS'] || 0) + 1; continue; }
        const payload: any = {
          servico_id: servId,
          codigo: row.codigo ?? null,
          nome: row.nome || row.Nome,
          descricao: row.descricao ?? null,
          quantidade: row.quantidade ? Number(row.quantidade) : null,
          empresa_id: empresaId,
        };
        if (row.id) {
          await supabase.from('orv_elementos' as any).update(payload).eq('id', row.id);
          result.updated['ELEMENTOS'] = (result.updated['ELEMENTOS'] || 0) + 1;
        } else {
          await supabase.from('orv_elementos' as any).insert(payload);
          result.inserted['ELEMENTOS'] = (result.inserted['ELEMENTOS'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`ELEMENTOS: ${e.message}`); }
    }
  }

  // --- ETAPAS_MODELO ---
  const wsEtap = getSheet('ETAPAS_MODELO');
  if (wsEtap) {
    for (const row of sheetToObjects(wsEtap)) {
      try {
        const servId = row.servico_id || servByNome.get(String(row.servico || row.Servico || '').toLowerCase());
        if (!servId) { result.skipped['ETAPAS_MODELO'] = (result.skipped['ETAPAS_MODELO'] || 0) + 1; continue; }
        const payload: any = {
          servico_id: servId,
          elemento_id: row.elemento_id || null,
          nome: row.nome || row.Nome,
          ordem: row.ordem ? Number(row.ordem) : null,
          peso: row.peso ? Number(row.peso) : null,
          unidade_medicao: row.unidade_medicao ?? null,
          quantidade_prevista: row.quantidade_prevista ? Number(row.quantidade_prevista) : null,
          empresa_id: empresaId,
        };
        if (row.id) {
          await supabase.from('orv_etapas' as any).update(payload).eq('id', row.id);
          result.updated['ETAPAS_MODELO'] = (result.updated['ETAPAS_MODELO'] || 0) + 1;
        } else {
          await supabase.from('orv_etapas' as any).insert(payload);
          result.inserted['ETAPAS_MODELO'] = (result.inserted['ETAPAS_MODELO'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`ETAPAS_MODELO: ${e.message}`); }
    }
  }

  const { data: etapsNow } = await supabase.from('orv_etapas' as any).select('id, nome, servico_id').eq('empresa_id', empresaId);
  const etapByNome = new Map<string, string>();
  (etapsNow || []).forEach((e: any) => etapByNome.set(String(e.nome).toLowerCase(), e.id));

  // --- CONTROLE_EXECUCAO ---
  const wsCtrl = getSheet('CONTROLE_EXECUCAO');
  if (wsCtrl) {
    for (const row of sheetToObjects(wsCtrl)) {
      try {
        const etapId = row.etapa_id || etapByNome.get(String(row.etapa || row.Etapa || '').toLowerCase());
        if (!etapId) { result.skipped['CONTROLE_EXECUCAO'] = (result.skipped['CONTROLE_EXECUCAO'] || 0) + 1; continue; }
        const payload: any = {
          etapa_id: etapId,
          percentual: row.percentual ? Number(row.percentual) : 0,
          status: row.status || 'pendente',
          responsavel_id: row.responsavel_id || null,
          observacao: row.observacao ?? null,
          data_medicao: row.data_medicao || new Date().toISOString().slice(0, 10),
        };
        if (row.id) {
          await supabase.from('orv_controle_execucao' as any).update(payload).eq('id', row.id);
          result.updated['CONTROLE_EXECUCAO'] = (result.updated['CONTROLE_EXECUCAO'] || 0) + 1;
        } else {
          await supabase.from('orv_controle_execucao' as any).insert(payload);
          result.inserted['CONTROLE_EXECUCAO'] = (result.inserted['CONTROLE_EXECUCAO'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`CONTROLE_EXECUCAO: ${e.message}`); }
    }
  }

  // --- BASE_PLANEJAMENTO ---
  const wsPlan = getSheet('BASE_PLANEJAMENTO');
  if (wsPlan) {
    for (const row of sheetToObjects(wsPlan)) {
      try {
        const obraId = row.obra_id || obraByNome.get(String(row.obra || row.Obra || '').toLowerCase());
        if (!obraId) { result.skipped['BASE_PLANEJAMENTO'] = (result.skipped['BASE_PLANEJAMENTO'] || 0) + 1; continue; }
        let { data: plano } = await supabase.from('planos' as any).select('id').eq('obra_id', obraId).eq('empresa_id', empresaId).limit(1).maybeSingle();
        if (!plano) {
          const created = await supabase.from('planos' as any).insert({ obra_id: obraId, empresa_id: empresaId, nome: 'Planejamento ORVIAN', status: 'rascunho' }).select('id').single();
          plano = created.data;
        }
        const payload: any = {
          obra_id: obraId,
          plano_id: plano?.id,
          titulo: row.descricao || row.Descricao || 'Atividade planejada',
          descricao: row.descricao || row.Descricao,
          data_planejada_original: row.data_planejada_original || new Date().toISOString().slice(0, 10),
          data_planejada_atual: row.data_planejada_atual || row.data_planejada_original || new Date().toISOString().slice(0, 10),
          data_inicio: row.data_planejada_original || null,
          data_fim: row.data_planejada_atual || null,
          data_fim_real: row.data_conclusao_real || null,
          status: row.situacao || 'planejado',
          justificativa_reprogramacao: row.justificativa_reprogramacao ?? null,
          empresa_id: empresaId,
          prioridade: 'media',
          ordem: 0,
          progresso: 0,
        };
        if (row.id) {
          await supabase.from('plano_tarefas' as any).update(payload).eq('id', row.id);
          result.updated['BASE_PLANEJAMENTO'] = (result.updated['BASE_PLANEJAMENTO'] || 0) + 1;
        } else {
          await supabase.from('plano_tarefas' as any).insert(payload);
          result.inserted['BASE_PLANEJAMENTO'] = (result.inserted['BASE_PLANEJAMENTO'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`BASE_PLANEJAMENTO: ${e.message}`); }
    }
  }

  // --- DIARIO_DIAS ---
  const wsDiario = getSheet('DIARIO_DIAS');
  if (wsDiario) {
    for (const row of sheetToObjects(wsDiario)) {
      try {
        const obraId = row.obra_id || obraByNome.get(String(row.obra || row.Obra || '').toLowerCase());
        if (!obraId) { result.skipped['DIARIO_DIAS'] = (result.skipped['DIARIO_DIAS'] || 0) + 1; continue; }
        const payload: any = {
          obra_id: obraId,
          data: row.data || new Date().toISOString().slice(0, 10),
          descricao: row.observacoes || row.resumo_geral || 'Diário de obra',
          observacoes_finais: row.observacoes ?? null,
          empresa_id: empresaId,
          tipo_registro: 'diario',
        };
        if (row.id) {
          await supabase.from('diario_obra' as any).update(payload).eq('id', row.id);
          result.updated['DIARIO_DIAS'] = (result.updated['DIARIO_DIAS'] || 0) + 1;
        } else {
          await supabase.from('diario_obra' as any).insert(payload);
          result.inserted['DIARIO_DIAS'] = (result.inserted['DIARIO_DIAS'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`DIARIO_DIAS: ${e.message}`); }
    }
  }

  // --- ATIVIDADES ---
  const wsAtiv = getSheet('ATIVIDADES');
  if (wsAtiv) {
    for (const row of sheetToObjects(wsAtiv)) {
      try {
        const obraId = row.obra_id || obraByNome.get(String(row.obra || row.Obra || '').toLowerCase());
        if (!obraId) { result.skipped['ATIVIDADES'] = (result.skipped['ATIVIDADES'] || 0) + 1; continue; }
        const payload: any = {
          obra_id: obraId,
          proposta_id: row.proposta_id || propByNome.get(String(row.proposta || '').toLowerCase()) || null,
          servico_id: row.servico_id || servByNome.get(String(row.servico || '').toLowerCase()) || null,
          elemento_id: row.elemento_id || null,
          etapa_id: row.etapa_id || etapByNome.get(String(row.etapa || '').toLowerCase()) || null,
          data: row.data || new Date().toISOString().slice(0, 10),
          hora: row.hora ?? null,
          descricao: row.descricao ?? null,
          microtarefas: row.microtarefas ?? null,
          quantidade: row.quantidade ? Number(row.quantidade) : null,
          unidade: row.unidade ?? null,
          percentual_avanco: row.percentual_avanco ? Number(row.percentual_avanco) : null,
          responsaveis: row.responsavel ?? null,
          equipe: row.equipe ?? null,
          situacao: row.situacao ?? null,
          ocorrencias: row.ocorrencias ?? null,
          observacoes_finais: row.observacoes ?? null,
          empresa_id: empresaId,
          tipo_registro: 'atividade',
          descricao: row.descricao || 'Atividade importada',
        };
        if (row.id) {
          await supabase.from('diario_obra' as any).update(payload).eq('id', row.id);
          result.updated['ATIVIDADES'] = (result.updated['ATIVIDADES'] || 0) + 1;
        } else {
          await supabase.from('diario_obra' as any).insert(payload);
          result.inserted['ATIVIDADES'] = (result.inserted['ATIVIDADES'] || 0) + 1;
        }
      } catch (e: any) { result.errors.push(`ATIVIDADES: ${e.message}`); }
    }
  }

  return result;
}
