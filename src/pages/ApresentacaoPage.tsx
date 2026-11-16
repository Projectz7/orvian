import { useEffect, useState } from 'react';
import { ObrasService, PropostasService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import { exportarRelatorio, importarRelatorio } from '@/lib/relatorioService';
import type { Obra, Proposta } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Download, Upload, Loader2, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CORES = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ApresentacaoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [dados, setDados] = useState({ atividades: 0, diarios: 0, planejados: 0, concluidos: 0 });
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId, empresaId).then(setPropostas); else setPropostas([]); }, [obraId, empresaId]);

  useEffect(() => {
    (async () => {
      if (!obraId) return;
      let q = supabase.from('diario_obra' as any).select('*', { count: 'exact' }).eq('obra_id', obraId).eq('tipo_registro', 'atividade');
      if (propostaId) q = q.eq('proposta_id', propostaId);
      const { count: atividades } = await q;
      const { count: diarios } = await supabase.from('diario_obra' as any).select('*', { count: 'exact' }).eq('obra_id', obraId).eq('tipo_registro', 'diario');
      const { count: planejados } = await supabase.from('plano_tarefas' as any).select('*', { count: 'exact' }).eq('obra_id', obraId);
      const { count: concluidos } = await supabase.from('plano_tarefas' as any).select('*', { count: 'exact' }).eq('obra_id', obraId).eq('status', 'concluida');
      setDados({ atividades: atividades || 0, diarios: diarios || 0, planejados: planejados || 0, concluidos: concluidos || 0 });
    })();
  }, [obraId, propostaId]);

  const baixar = async () => {
    setExporting(true); setMsg('');
    try { await exportarRelatorio({ empresaId: empresaId || '', obraId: obraId || null, propostaId: propostaId || null }); setMsg('Relatório baixado.'); }
    catch (e: any) { setMsg('Erro: ' + e.message); }
    finally { setExporting(false); }
  };
  const subir = async (file: File) => {
    setMsg('');
    try { const r = await importarRelatorio(file, empresaId || ''); setMsg(`Importado: ${Object.values(r.inserted).reduce((a: number, b: any) => a + b, 0)} novos registros.`); }
    catch (e: any) { setMsg('Erro: ' + e.message); }
  };

  const obra = obras.find((o) => o.id === obraId);
  const semDados = dados.atividades === 0 && dados.planejados === 0;
  const barras = [
    { nome: 'Planejadas', valor: dados.planejados },
    { nome: 'Concluídas', valor: dados.concluidos },
    { nome: 'Lançamentos', valor: dados.atividades },
    { nome: 'Diários', valor: dados.diarios },
  ];
  const pizza = [
    { name: 'Concluídas', value: dados.concluidos || 1 },
    { name: 'Pendentes', value: Math.max(dados.planejados - dados.concluidos, 0) || (dados.planejados === 0 ? 1 : 0) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Apresentação Executiva</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={baixar} disabled={exporting || !obraId}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Baixar Excel
          </Button>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer hover:bg-muted">
            <Upload className="w-4 h-4" /> Enviar Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
          </label>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <select className="border rounded p-2" value={obraId} onChange={(e) => { setObraId(e.target.value); setPropostaId(''); }}>
          <option value="">Selecione a Obra</option>
          {obras.map((o) => <option key={o.id} value={o.id}>{o.nome || 'Obra'}</option>)}
        </select>
        <select className="border rounded p-2" value={propostaId} onChange={(e) => setPropostaId(e.target.value)} disabled={!obraId}>
          <option value="">Toda a obra (ou escolha o contrato)</option>
          {propostas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {obra && (
        <Card>
          <CardHeader><CardTitle>{obra.nome}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-2xl font-bold">{dados.atividades}</div><div className="text-xs text-muted-foreground">Atividades</div></div>
            <div><div className="text-2xl font-bold">{dados.planejados}</div><div className="text-xs text-muted-foreground">Planejadas</div></div>
            <div><div className="text-2xl font-bold">{dados.concluidos}</div><div className="text-xs text-muted-foreground">Concluídas</div></div>
            <div><div className="text-2xl font-bold">{dados.diarios}</div><div className="text-xs text-muted-foreground">Diários</div></div>
          </CardContent>
        </Card>
      )}

      {semDados && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          {obraId
            ? 'Ainda não há lançamentos nesta obra. Os gráficos já estão preparados e serão preenchidos automaticamente conforme a execução é registrada.'
            : 'Selecione uma obra para filtrar. Os gráficos já estão preparados e serão preenchidos automaticamente conforme a execução é registrada.'}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Resumo da Execução</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barras}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#0ea5e9" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieIcon className="w-4 h-4" /> Situação das Atividades</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pizza} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                      {pizza.map((_, i) => <Cell key={i} fill={CORES[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}