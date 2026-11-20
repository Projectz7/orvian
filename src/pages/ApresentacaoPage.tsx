import { useEffect, useState, useRef } from 'react';
import { ObrasService, ServicosObraService, AvancoService, ConfigService, EmpresaService, CustosService, servicosDaObra } from '@/lib/orvianService';
import { exportarRelatorio, importarRelatorio } from '@/lib/relatorioService';
import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlantaMarcacoes, { type Marcacao } from '@/components/PlantaMarcacoes';
import { useAuth } from '@/context/AuthContext';
import { Download, Upload, Loader2, BarChart3, PieChart as PieIcon, Maximize2, Minimize2, Camera, Palette, CalendarRange, Wallet, Presentation as SlidesIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const CORES = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const CORES_LEGENDA = ['#0f172a', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

export default function ApresentacaoPage() {
  const { empresaId } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [dados, setDados] = useState({ atividades: 0, diarios: 0, planejados: 0, concluidos: 0 });
  const [evolucao, setEvolucao] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [avancoObra, setAvancoObra] = useState(0);
  const [capa, setCapa] = useState<{ url: string; legenda: string }>({ url: '', legenda: '' });
  const [planta, setPlanta] = useState<{ url: string; marcacoes: Marcacao[]; imagens?: string[] }>({ url: '', marcacoes: [], imagens: [] });
  const [empresa, setEmpresa] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [full, setFull] = useState(false);
  const [custos, setCustos] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);
  const [slideAtual, setSlideAtual] = useState(0);

  const obra = obras.find((o) => o.id === obraId) || null;

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) ServicosObraService.listByObraId(empresaId, obraId).then(setPropostas); else setPropostas([]); }, [obraId, empresaId]);
  useEffect(() => {
    if (!empresaId) return;
    ConfigService.get(empresaId, `capa_${obraId}`).then((c) => { if (c) setCapa(c); });
    ConfigService.get(empresaId, `planta_${obraId}`).then((p) => { if (p) setPlanta(p); });
  }, [empresaId, obraId]);
  useEffect(() => { EmpresaService.get(empresaId).then(setEmpresa); }, [empresaId]);

  useEffect(() => {
    (async () => {
      if (!obraId) return;
      let q = supabase.from('diario_obra' as any).select('*', { count: 'exact' }).eq('obra_id', obraId).eq('tipo_registro', 'atividade');
      if (propostaId) q = q.eq('servico_id', propostaId);
      const { count: atividadesCount } = await q;
      const { count: diarios } = await supabase.from('diario_obra' as any).select('*', { count: 'exact' }).eq('obra_id', obraId).eq('tipo_registro', 'diario');
      const { count: planejados } = await supabase.from('plano_tarefas' as any).select('*', { count: 'exact' }).eq('obra_id', obraId);
      const { count: concluidos } = await supabase.from('plano_tarefas' as any).select('*', { count: 'exact' }).eq('obra_id', obraId).eq('status', 'concluida');
      AvancoService.obra(obraId).then(setAvancoObra);

      const { data: ativsRaw } = await supabase.from('diario_obra' as any).select('data, status_etapa, descricao, servico_id, foto_urls').eq('obra_id', obraId).eq('tipo_registro', 'atividade').order('data');
      const ativs = (ativsRaw || []).map((a: any) => ({ ...a, fotos: a.foto_urls || [] }));
      setAtividades(ativs || []);
      const porData: Record<string, number> = {};
      (ativs || []).forEach((a: any) => { porData[a.data] = (porData[a.data] || 0) + 1; });
      let acum = 0;
      setEvolucao(Object.keys(porData).sort().map((d) => ({ data: d.slice(5), executado: (acum += porData[d]), planejado: planejados || 0 })));

      const { data: servs } = await supabase.from('orv_servicos' as any).select('id, nome, proposta_id').eq('empresa_id', empresaId);
      const mapa = (servs || []).map((s: any) => {
        const feitas = (ativs || []).filter((a: any) => a.servico_id === s.id);
        const concluidas = feitas.filter((a: any) => a.status_etapa === 'concluida').length;
        return { nome: s.nome, total: feitas.length, concluidas, progresso: feitas.length ? Math.round((concluidas / feitas.length) * 100) : 0 };
      });
      const doPrecalc = servicosDaObra(obra).map((s) => ({ nome: s.nome, total: 0, concluidas: 0, progresso: 0 }));
      setServicos([...mapa, ...doPrecalc]);
      setDados({ atividades: atividadesCount || 0, diarios: diarios || 0, planejados: planejados || 0, concluidos: concluidos || 0 });

      // Custos (provisionado vs gasto) e slides do diário
      const lancs = await CustosService.reais(empresaId, obraId);
      setCustos(lancs);
      const { data: diariosRaw } = await supabase.from('diario_obra' as any).select('data, descricao, resumo_geral, foto_urls').eq('obra_id', obraId).order('data', { ascending: false }).limit(60);
      const porDia: Record<string, any> = {};
      (diariosRaw || []).forEach((d: any) => {
        const data = d.data;
        porDia[data] = porDia[data] || { data, itens: [], fotos: [] };
        porDia[data].itens.push(d.descricao || d.resumo_geral).filter(Boolean);
        (d.foto_urls || []).forEach((u: string) => porDia[data].fotos.push(u));
      });
      (ativs || []).forEach((a: any) => {
        porDia[a.data] = porDia[a.data] || { data: a.data, itens: [], fotos: [] };
        if (a.descricao) porDia[a.data].itens.push(a.descricao);
        (a.fotos || []).forEach((u: string) => porDia[a.data].fotos.push(u));
      });
      setSlides(Object.values(porDia).sort((a: any, b: any) => String(b.data).localeCompare(String(a.data))));
      setSlideAtual(0);
    })();
  }, [obraId, propostaId, empresaId, obra]);

  const salvarCapa = async (patch: Partial<typeof capa>) => {
    const nova = { ...capa, ...patch };
    setCapa(nova);
    if (empresaId) await ConfigService.set(empresaId, `capa_${obraId}`, nova);
  };

  const uploadImagem = async (file: File, tipo: 'capa' | 'planta') => {
    const path = `${tipo}s/${obraId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('orvian-evidencias').upload(path, file, { upsert: true });
    if (error) { setMsg('Erro no upload: ' + error.message); return; }
    const { data: pub } = supabase.storage.from('orvian-evidencias').getPublicUrl(path);
    if (tipo === 'capa') {
      await salvarCapa({ url: pub.publicUrl });
      setMsg('Imagem da capa atualizada.');
    } else {
      const imagens = [...(planta.imagens || []), pub.publicUrl];
      const nova = { ...planta, url: pub.publicUrl, imagens };
      setPlanta(nova);
      if (empresaId) await ConfigService.set(empresaId, `planta_${obraId}`, nova);
      setMsg('Imagem da planta adicionada.');
    }
  };

  const removerImagemPlanta = async (url: string) => {
    const imagens = (planta.imagens || []).filter((u) => u !== url);
    const nova = { ...planta, imagens, url: imagens[imagens.length - 1] || '' };
    setPlanta(nova);
    if (empresaId) await ConfigService.set(empresaId, `planta_${obraId}`, nova);
  };

  const salvarPlanta = async (marcacoes: Marcacao[]) => {
    const nova = { ...planta, marcacoes };
    setPlanta(nova);
    if (empresaId) await ConfigService.set(empresaId, `planta_${obraId}`, nova);
  };

  const toggleFull = async () => {
    if (!full) { await rootRef.current?.requestFullscreen?.(); setFull(true); }
    else { await document.exitFullscreen?.(); setFull(false); }
  };

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

  const barras = [
    { nome: 'Planejadas', valor: dados.planejados }, { nome: 'Concluídas', valor: dados.concluidos },
    { nome: 'Lançamentos', valor: dados.atividades }, { nome: 'Diários', valor: dados.diarios },
  ];
  const pizza = [
    { name: 'Concluídas', value: dados.concluidos || 1 },
    { name: 'Pendentes', value: Math.max(dados.planejados - dados.concluidos, 0) || (dados.planejados === 0 ? 1 : 0) },
  ];

  return (
    <div ref={rootRef} className={`${full ? 'h-screen flex flex-col overflow-auto bg-slate-900 p-6 text-white' : 'space-y-4'}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Apresentação Executiva</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={toggleFull}>
            {full ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
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
          <option value="">Toda a obra (ou escolha o serviço/contrato)</option>
          {propostas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {!obraId && <p className="text-muted-foreground text-sm">Selecione uma obra para apresentar.</p>}

      {obraId && (
      <Tabs defaultValue="capa" className={full ? 'flex-1 flex flex-col min-h-0' : ''}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="capa">Capa</TabsTrigger>
          <TabsTrigger value="planta">Planta</TabsTrigger>
          <TabsTrigger value="execucao">Execução</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="slides">Slides Diário</TabsTrigger>
          <TabsTrigger value="planejamento">Próximos Passos</TabsTrigger>
        </TabsList>

        {/* CAPA */}
        <TabsContent value="capa" className={full ? 'flex-1 min-h-0 overflow-auto mt-4' : ''}>
          <Card>
            <div className="relative h-80 rounded-t-lg overflow-hidden flex items-end">
              {capa.url ? (
                <img src={capa.url} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${empresa?.cor_primaria || '#0f172a'}, #0f172a)` }} />
              )}
              <div className="relative z-10 w-full p-6" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.75))' }}>
                <div className="text-white">
                  <div className="text-sm uppercase tracking-widest opacity-80">
                    {empresa?.nome || 'ORVIAN'} · Apresentação de Obra
                  </div>
                  <h2 className="text-3xl font-bold" style={{ borderLeft: `6px solid ${empresa?.cor_acento || '#0ea5e9'}`, paddingLeft: 12 }}>{obra?.nome}</h2>
                  <p className="opacity-90">{obra?.cliente} · {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border">
                  <Camera className="w-4 h-4" /> Subir imagem da empresa
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImagem(f, 'capa'); }} />
                </label>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                <div><div className="text-2xl font-bold">{dados.atividades}</div><div className="text-xs text-muted-foreground">Atividades</div></div>
                <div><div className="text-2xl font-bold">{dados.planejados}</div><div className="text-xs text-muted-foreground">Planejadas</div></div>
                <div><div className="text-2xl font-bold">{dados.concluidos}</div><div className="text-xs text-muted-foreground">Concluídas</div></div>
                <div><div className="text-2xl font-bold">{dados.diarios}</div><div className="text-xs text-muted-foreground">Diários</div></div>
                <div><div className="text-2xl font-bold text-emerald-600">{avancoObra}%</div><div className="text-xs text-muted-foreground">Avanço físico</div></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANTA */}
        <TabsContent value="planta" className={`space-y-4 ${full ? 'flex-1 min-h-0 overflow-auto mt-4' : ''}`}>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Imagem da planta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="cursor-pointer inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border">
                <Camera className="w-4 h-4" /> Adicionar imagem da planta
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach((f) => uploadImagem(f, 'planta')); }} />
              </label>
              {(planta.imagens || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(planta.imagens || []).map((url, i) => (
                    <div key={i} className="relative">
                      <button onClick={() => { const nova = { ...planta, url }; setPlanta(nova); if (empresaId) ConfigService.set(empresaId, `planta_${obraId}`, nova); }}
                        className={`w-16 h-16 rounded border-2 overflow-hidden ${planta.url === url ? 'border-primary' : 'border-transparent'}`}>
                        <img src={url} alt={`Planta ${i+1}`} className="w-full h-full object-cover" />
                      </button>
                      <button onClick={() => removerImagemPlanta(url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <PlantaMarcacoes
                imagem={planta.url}
                marcacoes={planta.marcacoes || []}
                onChange={salvarPlanta}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXECUÇÃO */}
        <TabsContent value="execucao" className={`space-y-4 ${full ? 'flex-1 min-h-0 overflow-auto mt-4' : ''}`}>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Evolução planejado × executado</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao.length ? evolucao : [{ data: '—', executado: 0, planejado: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis allowDecimals={false} />
                    <Tooltip /><Legend /><Line type="monotone" dataKey="planejado" stroke="#f59e0b" name="Planejado" />
                    <Line type="monotone" dataKey="executado" stroke="#10b981" name="Executado" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Atividades executadas</CardTitle></CardHeader>
            <CardContent>
              {atividades.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma atividade executada ainda.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2">Data</th><th>Atividade</th><th>Status</th><th>Fotos</th></tr></thead>
                  <tbody>{atividades.slice(0, 50).map((a: any, i: number) => (
                    <tr key={i} className="border-b"><td className="py-1">{a.data}</td><td>{a.descricao}</td>
                      <td>{a.status_etapa === 'concluida' ? 'Concluída' : 'Registrada'}</td><td>{a.fotos?.length || 0}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Mapa da obra — serviços</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="py-2">Serviço</th><th>Atividades</th><th>Concluídas</th><th>Progresso</th></tr></thead>
                <tbody>{servicos.map((s, i) => (
                  <tr key={i} className="border-b"><td className="py-2">{s.nome}</td><td>{s.total}</td><td>{s.concluidas}</td>
                    <td><div className="w-full bg-muted rounded h-2"><div className="bg-emerald-500 h-2 rounded" style={{ width: `${s.progresso}%` }} /></div><span className="text-xs">{s.progresso}%</span></td></tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className={full ? 'flex-1 min-h-0 overflow-auto mt-4' : ''}>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Resumo da execução</CardTitle></CardHeader>
              <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={barras}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} />
                  <Tooltip /><Bar dataKey="valor" fill="#0ea5e9" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer></div></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieIcon className="w-4 h-4" /> Situação das atividades</CardTitle></CardHeader>
              <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={pizza} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                  {pizza.map((_, i) => <Cell key={i} fill={CORES[i]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer></div></CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PRÓXIMOS PASSOS */}
        <TabsContent value="custos" className={full ? 'flex-1 min-h-0 overflow-auto mt-4' : ''}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><div className="text-xl font-bold text-sky-600">
              {custos.reduce((s, c) => s + Number(c.provisionado || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <div className="text-xs text-muted-foreground">Provisionado</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xl font-bold text-rose-600">
              {custos.reduce((s, c) => s + Number(c.valor || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <div className="text-xs text-muted-foreground">Gasto</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xl font-bold">
              {(custos.reduce((s, c) => s + Number(c.provisionado || 0), 0) - custos.reduce((s, c) => s + Number(c.valor || 0), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <div className="text-xs text-muted-foreground">Saldo</div></CardContent></Card>
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="w-4 h-4" /> Provisionado × Gasto</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={custos.slice(0, 20).map((c) => ({ nome: (c.natureza || '').slice(0, 16), provisionado: c.provisionado, gasto: c.valor }))}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" angle={-20} textAnchor="end" height={60} /><YAxis />
                    <Tooltip formatter={(v: any) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /><Legend />
                    <Bar dataKey="provisionado" name="Provisionado" fill="#0ea5e9" />
                    <Bar dataKey="gasto" name="Gasto" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slides" className={full ? 'flex-1 min-h-0 overflow-auto mt-4' : ''}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><SlidesIcon className="w-4 h-4" /> Passagem de Slides — Diário de Obra</span>
                <span className="text-xs text-muted-foreground">{slides.length ? `${slideAtual + 1} / ${slides.length}` : '0 / 0'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slides.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro de diário/atividade para apresentar.</p> : (
                <>
                  <div className="relative h-96 bg-slate-100 rounded overflow-hidden flex flex-col">
                    {slides[slideAtual]?.fotos?.[0] && (
                      <img src={slides[slideAtual].fotos[0]} alt="Foto do dia" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    <div className="relative z-10 p-6 flex-1 flex flex-col justify-center bg-gradient-to-t from-slate-900/80 to-transparent text-white">
                      <div className="text-3xl font-bold">{new Date(slides[slideAtual].data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
                      <div className="mt-4 space-y-1">
                        {(slides[slideAtual].itens || []).slice(0, 8).map((t: string, i: number) => <div key={i} className="text-sm">• {t}</div>)}
                      </div>
                      <div className="mt-2 text-xs opacity-80">{slides[slideAtual].fotos?.length || 0} foto(s)</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setSlideAtual(Math.max(0, slideAtual - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setSlideAtual(Math.min(slides.length - 1, slideAtual + 1))}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planejamento" className={full ? 'flex-1 min-h-0 overflow-auto mt-4' : ''}>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarRange className="w-4 h-4" /> Próximos passos e contraste planejado × executado</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {servicos.length === 0 ? <p className="text-sm text-muted-foreground">Sem serviços cadastrados.</p> : servicos.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_3fr] items-center gap-2">
                    <div className="text-xs truncate">{s.nome}</div>
                    <div className="relative h-6 bg-muted rounded">
                      <div className="absolute h-6 bg-amber-300/60 rounded w-full" />
                      <div className="absolute h-6 bg-emerald-500/70 rounded flex items-center justify-end pr-1" style={{ width: `${s.progresso}%` }}>
                        <span className="text-[10px] text-white">{s.progresso}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Âmbar = planejado · Verde = executado · O restante é o pendente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}