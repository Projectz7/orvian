import { useEffect, useState } from 'react';
import { ObrasService, PropostasService, ServicosService, PlanejamentosService, AtividadesService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta, Servico, Atividade } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { ExternalLink, CalendarRange, ChevronDown, ChevronRight, Camera, Plus } from 'lucide-react';

interface Subtarefa { id: string; data: string; descricao: string; fotos: string[]; concluida: boolean; }

/** Planejamento integrado com PlanSeven + subtarefas diárias.
 *  Tarefa planejada = plano_tarefas (também usada pelo PlanSeven).
 *  Subtarefa = atividade diária (diario_obra.tarefa_id) com foto.
 *  O progresso da tarefa é recalculado automaticamente no banco.
 */
export default function PlanejamentoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, Subtarefa[]>>({});
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  const [desc, setDesc] = useState('');
  const [dataOrig, setDataOrig] = useState('');
  const [resp, setResp] = useState('');

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId, empresaId).then(setPropostas); else setPropostas([]); }, [obraId, empresaId]);
  useEffect(() => { if (propostaId) ServicosService.listByProposta(propostaId, empresaId).then(setServicos); else setServicos([]); }, [propostaId, empresaId]);
  useEffect(() => { if (obraId) loadPlans(); }, [obraId, propostaId, servicoId]);

  const loadPlans = async () => {
    const data = await PlanejamentosService.list(empresaId, obraId);
    const filtrados = data.filter((d: any) => (!propostaId || d.proposta_id === propostaId) && (!servicoId || d.servico_id === servicoId));
    setPlans(filtrados);
    // Carrega as atividades diárias (subtarefas) de cada tarefa
    const atividades = await AtividadesService.list(1000, empresaId);
    const map: Record<string, Subtarefa[]> = {};
    (atividades || []).filter((a: any) => a.obra_id === obraId && a.tarefa_id).forEach((a: any) => {
      (map[a.tarefa_id] = map[a.tarefa_id] || []).push({
        id: a.id!, data: a.data, descricao: a.descricao || '', fotos: a.fotos || [],
        concluida: a.status_etapa === 'concluida',
      });
    });
    setSubs(map);
  };

  const add = async () => {
    if (!obraId || !desc.trim() || !dataOrig) return;
    await PlanejamentosService.create({
      descricao: desc, data_planejada_original: dataOrig, data_planejada_atual: dataOrig,
      responsavel_id: resp || null, situacao: 'planejado', proposta_id: propostaId || null, servico_id: servicoId || null,
    }, empresaId, obraId);
    setDesc(''); setDataOrig(''); setResp('');
    loadPlans();
  };

  const updatePrev = async (p: any, nova: string, motivo: string) => {
    await PlanejamentosService.registrarRevisao(p.id, {
      data_anterior: p.data_planejada_atual, data_nova: nova, motivo, responsavel: 'usuario', data_revisao: new Date().toISOString(),
    });
    loadPlans();
  };

  const [subForm, setSubForm] = useState<{ tarefa: any; descricao: string; data: string; fotos: File[] } | null>(null);

  const addSubtarefa = async () => {
    if (!subForm || !subForm.descricao.trim()) return;
    const urls: string[] = [];
    for (const file of subForm.fotos) {
      const path = `subtarefas/${obraId}/${subForm.data}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('orvian-evidencias').upload(path, file, { upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from('orvian-evidencias').getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
    }
    await AtividadesService.create({
      obra_id: obraId, proposta_id: subForm.tarefa.proposta_id, servico_id: subForm.tarefa.servico_id,
      tarefa_id: subForm.tarefa.id, data: subForm.data, descricao: subForm.descricao,
      status_etapa: 'concluida', fotos: urls,
    } as Atividade, empresaId);
    setSubForm(null);
    loadPlans();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Planejamento</h1>
        <a href="https://planseven.vercel.app" target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted">
          <CalendarRange className="w-4 h-4" /> Abrir no PlanSeven <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <strong>Tarefa</strong> = o que foi planejado. <strong>Subtarefa</strong> = cada atividade diária executada (com foto).
        Ao registrar uma subtarefa, o progresso da tarefa é atualizado automaticamente. Dados compartilhados com o PlanSeven.
      </div>

      <div className="grid md:grid-cols-3 gap-2">
        <select className="border rounded p-2" value={obraId} onChange={(e) => { setObraId(e.target.value); setPropostaId(''); setServicoId(''); }}>
          <option value="">Obra</option>
          {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select className="border rounded p-2" value={propostaId} onChange={(e) => { setPropostaId(e.target.value); setServicoId(''); }}>
          <option value="">Proposta</option>
          {propostas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select className="border rounded p-2" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          <option value="">Serviço</option>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle>Nova tarefa planejada</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid md:grid-cols-3 gap-2">
            <Input type="date" placeholder="Data planejada original" value={dataOrig} onChange={(e) => setDataOrig(e.target.value)} />
            <Input placeholder="Responsável" value={resp} onChange={(e) => setResp(e.target.value)} />
            <Button onClick={add}>Adicionar tarefa</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tarefas e Subtarefas ({plans.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {plans.map((p) => {
            const filhas = subs[p.id] || [];
            const prog = p.progresso || 0;
            return (
              <div key={p.id} className="border rounded">
                <div className="p-3 flex items-center justify-between gap-2">
                  <button className="flex items-center gap-2 text-left flex-1" onClick={() => setExpandido({ ...expandido, [p.id]: !expandido[p.id] })}>
                    {expandido[p.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <div>
                      <div className="font-medium text-sm">{p.titulo || p.descricao}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.data_planejada_original} · {p.status} · {filhas.length} subtarefa(s)
                      </div>
                    </div>
                  </button>
                  <div className="w-24">
                    <div className="w-full bg-muted rounded h-2"><div className="bg-emerald-500 h-2 rounded" style={{ width: `${prog}%` }} /></div>
                    <div className="text-xs text-right">{prog}%</div>
                  </div>
                </div>
                {expandido[p.id] && (
                  <div className="border-t p-3 space-y-2 bg-muted/30">
                    {filhas.map((s) => (
                      <div key={s.id} className="text-xs flex items-center gap-2">
                        <span className={s.concluida ? 'text-emerald-600' : ''}>{s.concluida ? '✓' : '○'}</span>
                        <span>{s.data}</span><span>{s.descricao}</span>
                        {s.fotos.length > 0 && <span className="flex items-center gap-1 text-primary"><Camera className="w-3 h-3" />{s.fotos.length}</span>}
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => setSubForm({ tarefa: p, descricao: '', data: new Date().toISOString().slice(0, 10), fotos: [] })}>
                      <Plus className="w-3 h-3 mr-1" /> Registrar atividade diária
                    </Button>
                    <Input type="date" className="w-40" defaultValue={p.data_planejada_atual}
                      onBlur={(e) => { if (e.target.value && e.target.value !== p.data_planejada_atual) { const m = prompt('Motivo da reprogramação:'); if (m) updatePrev(p, e.target.value, m); } }} />
                  </div>
                )}
              </div>
            );
          })}
          {plans.length === 0 && <p className="text-muted-foreground text-sm">Selecione uma obra.</p>}
        </CardContent>
      </Card>

      {subForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSubForm(null)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold">Nova atividade diária</h2>
            <p className="text-xs text-muted-foreground">Tarefa: {subForm.tarefa.titulo || subForm.tarefa.descricao}</p>
            <Input placeholder="O que foi executado?" value={subForm.descricao}
              onChange={(e) => setSubForm({ ...subForm, descricao: e.target.value })} />
            <Input type="date" value={subForm.data}
              onChange={(e) => setSubForm({ ...subForm, data: e.target.value })} />
            <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary">
              <Camera className="w-4 h-4" /> Anexar fotos
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => setSubForm({ ...subForm, fotos: Array.from(e.target.files || []) })} />
            </label>
            {subForm.fotos.length > 0 && <p className="text-xs">{subForm.fotos.length} foto(s) selecionada(s)</p>}
            <div className="flex gap-2">
              <Button onClick={addSubtarefa}>Registrar</Button>
              <Button variant="outline" onClick={() => setSubForm(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}