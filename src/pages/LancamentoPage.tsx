import { useEffect, useState } from 'react';
import { ObrasService, PropostasService, ServicosService, ElementosService, EtapasService, AtividadesService, PlanejamentosService, servicosDaObra } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta, Servico, Elemento, Etapa, Atividade } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Camera, X, CheckCircle2 } from 'lucide-react';

export default function LancamentoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [elementoId, setElementoId] = useState('');
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [etapaId, setEtapaId] = useState('');
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [tarefaId, setTarefaId] = useState('');

  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);

  const obra = obras.find((o) => o.id === obraId) || null;

  useEffect(() => {
    ObrasService.list(empresaId).then((list) => {
      setObras(list);
      const ultima = localStorage.getItem('orvian_ultima_obra');
      if (ultima && list.some((o) => o.id === ultima)) setObraId(ultima);
      else if (list.length === 1) setObraId(list[0].id);
    }).catch((e) => setErr('Erro ao carregar obras: ' + (e?.message || e)));
  }, [empresaId]);

  useEffect(() => {
    // Serviços da obra = projetos do PreciCalc/DiGest + serviços ORVIAN
    const doPrecalc = servicosDaObra(obra);
    if (obraId) {
      PropostasService.listByObra(obraId, empresaId).then(async (props) => {
        const todos: Servico[] = [...doPrecalc];
        for (const p of props) {
          const s = await ServicosService.listByProposta(p.id, empresaId);
          todos.push(...s.map((x) => ({ ...x, proposta_id: p.id } as Servico)));
        }
        setServicos(todos);
      });
      PlanejamentosService.list(empresaId, obraId).then(setTarefas);
    } else {
      setServicos([]); setTarefas([]);
    }
    setServicoId(''); setElementoId(''); setEtapaId('');
  }, [obraId, empresaId, obra]);

  useEffect(() => {
    const servico = servicos.find((s) => s.id === servicoId);
    const real = servico && !servicoId.startsWith('projeto:');
    if (real && servicoId) {
      ElementosService.listByServico(servicoId, empresaId).then(setElementos);
      EtapasService.listByServico(servicoId, empresaId).then(setEtapas);
    } else { setElementos([]); setEtapas([]); }
  }, [servicoId, empresaId, servicos]);

  const uploadFotos = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of fotos) {
      const path = `atividades/${obraId}/${data}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('orvian-evidencias').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('orvian-evidencias').getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    return urls;
  };

  const concluirTarefa = async () => {
    if (!tarefaId) return;
    await supabase.from('plano_tarefas').update({
      status: 'concluida', progresso: 100, data_fim_real: new Date().toISOString().slice(0, 10),
    }).eq('id', tarefaId);
  };

  const save = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const urls = await uploadFotos();
      const servico = servicos.find((s) => s.id === servicoId);
      await AtividadesService.create({
        obra_id: obraId || null,
        proposta_id: servico?.proposta_id || null,
        servico_id: servicoId.startsWith('projeto:') ? null : (servicoId || null),
        elemento_id: elementoId || null,
        etapa_id: etapaId || null,
        data, descricao, quantidade: quantidade ? Number(quantidade) : null,
        unidade: unidade || servico?.unidade_medicao || null,
        responsavel: responsavel || null,
        status_etapa: tarefaId ? 'concluida' : 'atividade_registrada',
        fotos: urls,
        tarefa_id: tarefaId || null,
      } as Atividade, empresaId);
      await concluirTarefa();
      if (obraId) localStorage.setItem('orvian_ultima_obra', obraId);
      setMsg('Atividade registrada. Ela aparecerá no Diário e no Histórico a partir da data informada.');
      setDescricao(''); setQuantidade(''); setFotos([]); setTarefaId('');
    } catch (e: any) { setErr('Erro: ' + (e.message || e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Lançar Atividade</h1>
      <Card>
        <CardHeader><CardTitle>Novo lançamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <select className="border rounded p-2" value={obraId} onChange={(e) => setObraId(e.target.value)}>
              <option value="">Obra</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
              <option value="">Serviço da obra</option>
              {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={elementoId} onChange={(e) => setElementoId(e.target.value)} disabled={!elementos.length}>
              <option value="">Elemento (opcional)</option>
              {elementos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={etapaId} onChange={(e) => setEtapaId(e.target.value)} disabled={!etapas.length}>
              <option value="">Etapa (opcional)</option>
              {etapas.map((e) => <option key={e.id} value={e.id}>{e.ordem}. {e.nome}</option>)}
            </select>
            <select className="border rounded p-2 md:col-span-2" value={tarefaId} onChange={(e) => setTarefaId(e.target.value)} disabled={!tarefas.length}>
              <option value="">Tarefa do planejamento (opcional — ao registrar, marca como executada)</option>
              {tarefas.map((t) => <option key={t.id} value={t.id}>{t.titulo || t.descricao}</option>)}
            </select>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <Textarea placeholder="Descrição do que foi executado" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div className="grid md:grid-cols-3 gap-2">
            <Input placeholder="Quantidade" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            <Input placeholder="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
            <Input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>

          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary">
              <Camera className="w-4 h-4" /> Anexar fotografias
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => setFotos(Array.from(e.target.files || []))} />
            </label>
            {fotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {fotos.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
                    {f.name} <button onClick={() => setFotos(fotos.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={save} disabled={saving || !obraId}>
            {saving ? 'Salvando...' : 'Registrar atividade'}
          </Button>
          {tarefaId && <p className="text-xs text-blue-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> A tarefa selecionada será marcada como concluída.</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}