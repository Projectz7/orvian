import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ObrasService, PropostasService } from '@/lib/orvianService';
import { exportarRelatorio, importarRelatorio, type ImportResult } from '@/lib/relatorioService';
import { Download, Upload, Filter, Building2, FileText, Hammer, Users, CalendarDays, TrendingUp, AlertTriangle, CheckCircle2, Clock, Target, PieChart, BarChart3, Layers, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ObraResumo {
  id: string;
  titulo: string;
  cliente: string;
  status: string;
  endereco: string;
  propostas: number;
  servicos: number;
  atividades: number;
  execucaoMedia: number;
  diarios: number;
  planejamentos: number;
}

interface PropostaDetalhe {
  id: string;
  nome: string;
  situacao?: string | null;
  servicos: number;
  atividades: number;
  execucaoMedia: number;
  elementos: number;
  etapas: number;
}

interface ObraListItem {
  id: string;
  titulo: string;
  cliente?: string | null;
  status?: string | null;
}

interface PropostaListItem {
  id: string;
  nome: string;
  obra_id: string;
  situacao?: string | null;
}

export default function ApresentacaoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [obrasList, setObrasList] = useState<ObraListItem[]>([]);
  const [propostasList, setPropostasList] = useState<PropostaListItem[]>([]);
  const [propostasDetalhe, setPropostasDetalhe] = useState<PropostaDetalhe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Export/Import
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [obraFiltro, setObraFiltro] = useState<string>('todas');
  const [propostaFiltro, setPropostaFiltro] = useState<string>('todas');

  const [totals, setTotals] = useState({
    obras: 0, propostas: 0, servicos: 0, atividades: 0,
    execucaoMedia: 0, diarios: 0, planejamentos: 0
  });

  // Carrega lista de obras para o filtro
  useEffect(() => {
    (async () => {
      if (!empresaId) { setLoading(false); return; }
      const list = await ObrasService.list(empresaId);
      setObrasList(list.map((o: any) => ({ id: o.id, titulo: o.titulo, cliente: o.cliente, status: o.status })));
    })();
  }, [empresaId]);

  // Carrega dados agregados (todas as obras ou filtrado)
  useEffect(() => {
    (async () => {
      if (!empresaId) { setLoading(false); return; }
      setLoading(true);
      try {
        const obrasListFull = await ObrasService.list(empresaId);

        // Aplica filtro de obra
        const obrasFiltradas = obraFiltro === 'todas'
          ? obrasListFull
          : obrasListFull.filter((o: any) => o.id === obraFiltro);

        const obraIds = obrasFiltradas.map((o) => o.id);

        if (obraIds.length === 0) {
          setObras([]);
          setTotals({ obras: 0, propostas: 0, servicos: 0, atividades: 0, execucaoMedia: 0, diarios: 0, planejamentos: 0 });
          setLoading(false);
          return;
        }

        const inObra = (q: any) => q.in('obra_id', obraIds);

        const [propostasRes, servicosRes, atividadesRes, etapasRes, planejRes, diariosRes] = await Promise.all([
          inObra(supabase.from('orv_propostas' as any).select('id, obra_id, nome, situacao').is('deleted_at', null)),
          inObra(supabase.from('orv_servicos' as any).select('id, proposta_id').is('deleted_at', null)),
          inObra(supabase.from('orv_atividades' as any).select('id, obra_id, proposta_id').is('deleted_at', null)),
          supabase.from('orv_etapas' as any).select('id, servico_id, percentual'),
          inObra(supabase.from('orv_planejamentos' as any).select('id, obra_id')),
          inObra(supabase.from('orv_diarios' as any).select('id, obra_id')),
        ]);

        let propostasData = propostasRes.data || [];
        // Aplica filtro de proposta (contrato)
        if (propostaFiltro !== 'todas') {
          propostasData = propostasData.filter((p: any) => p.id === propostaFiltro);
        }
        const propostaIds = propostasData.map((p: any) => p.id);

        // Filtra serviços pelas propostas selecionadas
        let servicosData = (servicosRes.data || []).filter((s: any) => propostaIds.includes(s.proposta_id));
        const servicoIds = servicosData.map((s: any) => s.id);

        // Etapas dos serviços selecionados
        const etapasData = (etapasRes.data || []).filter((e: any) => servicoIds.includes(e.servico_id));

        // Atividades filtradas por proposta se aplicável
        let atividadesData = atividadesRes.data || [];
        if (propostaFiltro !== 'todas') {
          atividadesData = atividadesData.filter((a: any) => a.proposta_id === propostaFiltro);
        }

        // Mapeamentos
        const propostasPorObra = new Map<string, number>();
        propostasData.forEach((p: any) => {
          propostasPorObra.set(p.obra_id, (propostasPorObra.get(p.obra_id) || 0) + 1);
        });

        const servicosPorProposta = new Map<string, number>();
        servicosData.forEach((s: any) => {
          servicosPorProposta.set(s.proposta_id, (servicosPorProposta.get(s.proposta_id) || 0) + 1);
        });
        const servicosPorObra = new Map<string, number>();
        propostasData.forEach((p: any) => {
          const count = servicosPorProposta.get(p.id) || 0;
          servicosPorObra.set(p.obra_id, (servicosPorObra.get(p.obra_id) || 0) + count);
        });

        const atividadesPorObra = new Map<string, number>();
        atividadesData.forEach((a: any) => {
          if (a.obra_id) atividadesPorObra.set(a.obra_id, (atividadesPorObra.get(a.obra_id) || 0) + 1);
        });

        // Execução média por serviço → proposta → obra
        const etapasPorServico = new Map<string, { total: number; soma: number }>();
        etapasData.forEach((e: any) => {
          const s = e.servico_id;
          if (!etapasPorServico.has(s)) etapasPorServico.set(s, { total: 0, soma: 0 });
          const cur = etapasPorServico.get(s)!;
          cur.total += 1;
          cur.soma += (e.percentual || 0);
        });

        const execucaoPorProposta = new Map<string, number>();
        servicosData.forEach((s: any) => {
          const ep = etapasPorServico.get(s.id);
          if (ep && ep.total > 0) {
            const media = Math.round(ep.soma / ep.total);
            const pid = s.proposta_id;
            if (!execucaoPorProposta.has(pid)) execucaoPorProposta.set(pid, { soma: 0, count: 0 } as any);
            const cur = execucaoPorProposta.get(pid) as any;
            cur.soma = (cur.soma || 0) + media;
            cur.count = (cur.count || 0) + 1;
            execucaoPorProposta.set(pid, cur);
          }
        });

        const execucaoPorObra = new Map<string, number>();
        propostasData.forEach((p: any) => {
          const ep = execucaoPorProposta.get(p.id) as any;
          if (ep && ep.count > 0) {
            execucaoPorObra.set(p.obra_id, Math.round(ep.soma / ep.count));
          }
        });

        const diariosPorObra = new Map<string, number>();
        (diariosRes.data || []).forEach((d: any) => {
          diariosPorObra.set(d.obra_id, (diariosPorObra.get(d.obra_id) || 0) + 1);
        });

        const planejPorObra = new Map<string, number>();
        (planejRes.data || []).forEach((p: any) => {
          planejPorObra.set(p.obra_id, (planejPorObra.get(p.obra_id) || 0) + 1);
        });

        const obrasResumo: ObraResumo[] = obrasFiltradas.map((o: any) => ({
          id: o.id,
          titulo: o.titulo,
          cliente: o.cliente || '-',
          status: o.status || 'ativa',
          endereco: o.endereco || '-',
          propostas: propostasPorObra.get(o.id) || 0,
          servicos: servicosPorObra.get(o.id) || 0,
          atividades: atividadesPorObra.get(o.id) || 0,
          execucaoMedia: execucaoPorObra.get(o.id) || 0,
          diarios: diariosPorObra.get(o.id) || 0,
          planejamentos: planejPorObra.get(o.id) || 0,
        }));

        setObras(obrasResumo);

        const totalExecucao = obrasResumo.filter(o => o.execucaoMedia > 0);
        const mediaGeral = totalExecucao.length > 0
          ? Math.round(totalExecucao.reduce((s, o) => s + o.execucaoMedia, 0) / totalExecucao.length)
          : 0;

        setTotals({
          obras: obrasFiltradas.length,
          propostas: propostasData.length,
          servicos: servicosData.length,
          atividades: atividadesData.length,
          execucaoMedia: mediaGeral,
          diarios: diariosRes.data?.length || 0,
          planejamentos: planejRes.data?.length || 0,
        });
      } catch (e) {
        console.error('Erro ao carregar apresentação:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaId, obraFiltro, propostaFiltro]);

  // Carrega propostas do filtro quando obra muda
  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      if (obraFiltro === 'todas') {
        // Carrega todas as propostas das obras da empresa
        const obrasAll = await ObrasService.list(empresaId);
        const obraIds = obrasAll.map((o: any) => o.id);
        if (obraIds.length === 0) { setPropostasList([]); return; }
        const { data } = await supabase.from('orv_propostas' as any)
          .select('id, nome, obra_id, situacao')
          .in('obra_id', obraIds)
          .is('deleted_at', null)
          .order('nome');
        setPropostasList((data || []) as PropostaListItem[]);
      } else {
        const props = await PropostasService.listByObra(obraFiltro);
        setPropostasList(props.map((p: any) => ({ id: p.id, nome: p.nome, obra_id: p.obra_id, situacao: p.situacao })));
      }
      // Reset proposta filtro se não existe mais
      setPropostaFiltro('todas');
    })();
  }, [empresaId, obraFiltro]);

  // Carrega detalhe das propostas quando uma obra específica está selecionada
  useEffect(() => {
    (async () => {
      if (!empresaId || obraFiltro === 'todas') {
        setPropostasDetalhe([]);
        return;
      }
      setLoadingDetalhe(true);
      try {
        const [propostas, servicos, atividades, elementos, etapas] = await Promise.all([
          PropostasService.listByObra(obraFiltro),
          supabase.from('orv_servicos' as any).select('id, proposta_id').is('deleted_at', null),
          supabase.from('orv_atividades' as any).select('id, proposta_id').eq('obra_id', obraFiltro).is('deleted_at', null),
          supabase.from('orv_elementos' as any).select('id, servico_id').is('deleted_at', null),
          supabase.from('orv_etapas' as any).select('id, servico_id, percentual'),
        ]);

        const servicosData = (servicos.data || []);
        const propostaIds = (propostas as any[]).map(p => p.id);
        const servicosFiltrados = servicosData.filter((s: any) => propostaIds.includes(s.proposta_id));
        const servicoIds = servicosFiltrados.map((s: any) => s.id);

        const etapasPorServico = new Map<string, { soma: number; count: number }>();
        ((etapas.data || []) as any[]).filter((e: any) => servicoIds.includes(e.servico_id)).forEach((e: any) => {
          const cur = etapasPorServico.get(e.servico_id) || { soma: 0, count: 0 };
          cur.soma += (e.percentual || 0);
          cur.count += 1;
          etapasPorServico.set(e.servico_id, cur);
        });

        const detalhe: PropostaDetalhe[] = (propostas as any[]).map((p: any) => {
          const servsP = servicosFiltrados.filter((s: any) => s.proposta_id === p.id);
          const sIds = servsP.map((s: any) => s.id);
          const elemCount = ((elementos.data || []) as any[]).filter((el: any) => sIds.includes(el.servico_id)).length;
          const etapCount = sIds.reduce((acc: number, sid: string) => {
            const ep = etapasPorServico.get(sid);
            return acc + (ep ? ep.count : 0);
          }, 0);
          let execMedia = 0;
          const execs: number[] = [];
          sIds.forEach((sid: string) => {
            const ep = etapasPorServico.get(sid);
            if (ep && ep.count > 0) execs.push(Math.round(ep.soma / ep.count));
          });
          if (execs.length > 0) execMedia = Math.round(execs.reduce((a, b) => a + b, 0) / execs.length);

          const ativCount = ((atividades.data || []) as any[]).filter((a: any) => a.proposta_id === p.id).length;

          return {
            id: p.id,
            nome: p.nome,
            situacao: p.situacao,
            servicos: servsP.length,
            atividades: ativCount,
            execucaoMedia: execMedia,
            elementos: elemCount,
            etapas: etapCount,
          };
        });

        setPropostasDetalhe(detalhe);
      } catch (e) {
        console.error('Erro ao carregar detalhe da obra:', e);
      } finally {
        setLoadingDetalhe(false);
      }
    })();
  }, [empresaId, obraFiltro]);

  // Propostas disponíveis no filtro de contrato (já filtradas por obra se aplicável)
  const propostasFiltroDisponiveis = useMemo(() => {
    return propostasList;
  }, [propostasList]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ativa: 'default', 'em andamento': 'default', 'em_andamento': 'default',
      concluida: 'secondary', concluída: 'secondary', finalizada: 'secondary',
      paralisada: 'destructive', pausada: 'destructive',
      planejada: 'outline', projeto: 'outline',
    };
    return variants[status?.toLowerCase()] || 'outline';
  };

  const obraSelecionadaInfo = obrasList.find(o => o.id === obraFiltro);
  const propostaSelecionadaInfo = propostasList.find(p => p.id === propostaFiltro);

  const handleExportar = async () => {
    if (!empresaId) return;
    setExportando(true);
    try {
      await exportarRelatorio({
        empresaId,
        obraId: obraFiltro === 'todas' ? null : obraFiltro,
        propostaId: propostaFiltro === 'todas' ? null : propostaFiltro,
      });
    } catch (e: any) {
      alert('Erro ao exportar: ' + (e.message || e));
    } finally {
      setExportando(false);
    }
  };

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;
    setImportando(true);
    setImportResult(null);
    try {
      const res = await importarRelatorio(file, empresaId);
      setImportResult(res);
      // Recarrega dados da página após importação
      setObraFiltro((v) => v); // trigger re-render via state touch
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao importar: ' + (err.message || err));
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Apresentação Executiva</h1>
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-primary bg-clip-text text-transparent">
            Apresentação Executiva
          </h1>
          <p className="text-muted-foreground mt-1">
            {obraFiltro !== 'todas' && obraSelecionadaInfo
              ? `${obraSelecionadaInfo.titulo}${propostaFiltro !== 'todas' && propostaSelecionadaInfo ? ` — Contrato: ${propostaSelecionadaInfo.nome}` : ' — Todas as propostas'}`
              : 'Visão consolidada de todas as obras da empresa'}
            {' · '}{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportar}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importando}
            title="Importar relatório Excel editado e atualizar o app"
          >
            {importando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {importando ? 'Importando...' : 'Importar Excel'}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportar}
            disabled={exportando}
            title="Exportar relatório atual (respeitando filtros) com páginas de apresentação + bases de dados"
          >
            {exportando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            {exportando ? 'Exportando...' : 'Exportar Relatório Excel'}
          </Button>
        </div>
      </header>

      {/* Resultado da Importação */}
      {importResult && (
        <section className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
          <div className="font-medium text-emerald-800 mb-2">Relatório importado com sucesso</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>Abas lidas: <strong>{importResult.sheets.length}</strong></div>
            <div>Inseridos: <strong>{Object.values(importResult.inserted).reduce((a, b) => a + b, 0)}</strong></div>
            <div>Atualizados: <strong>{Object.values(importResult.updated).reduce((a, b) => a + b, 0)}</strong></div>
            <div>Ignorados: <strong>{Object.values(importResult.skipped).reduce((a, b) => a + b, 0)}</strong></div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-2 text-rose-600 text-xs">Erros: {importResult.errors.slice(0, 5).join(' | ')}</div>
          )}
        </section>
      )}

      {/* Barra de Filtros */}
      <section className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="w-4 h-4" /> Filtros:
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Select value={obraFiltro} onValueChange={(v) => { setObraFiltro(v); setPropostaFiltro('todas'); }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todas as obras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as obras</SelectItem>
              {obrasList.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.titulo} {o.cliente ? `(${o.cliente})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <Select value={propostaFiltro} onValueChange={setPropostaFiltro}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todos os contratos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">
                {obraFiltro === 'todas' ? 'Todos os contratos' : 'Todos os contratos desta obra'}
              </SelectItem>
              {propostasFiltroDisponiveis.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} {p.situacao ? `(${p.situacao})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(obraFiltro !== 'todas' || propostaFiltro !== 'todas') && (
          <Button variant="ghost" size="sm" onClick={() => { setObraFiltro('todas'); setPropostaFiltro('todas'); }}>
            Limpar filtros
          </Button>
        )}
      </section>

      {/* KPIs Principais */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Obras', value: totals.obras, icon: <Building2 className="w-5 h-5" />, color: 'bg-blue-500' },
          { label: 'Contratos', value: totals.propostas, icon: <FileText className="w-5 h-5" />, color: 'bg-indigo-500' },
          { label: 'Serviços', value: totals.servicos, icon: <Hammer className="w-5 h-5" />, color: 'bg-amber-500' },
          { label: 'Atividades', value: totals.atividades, icon: <Users className="w-5 h-5" />, color: 'bg-emerald-500' },
          { label: 'Diários', value: totals.diarios, icon: <CalendarDays className="w-5 h-5" />, color: 'bg-violet-500' },
          { label: 'Planejamentos', value: totals.planejamentos, icon: <Target className="w-5 h-5" />, color: 'bg-rose-500' },
          { label: 'Exec. Média', value: `${totals.execucaoMedia}%`, icon: <TrendingUp className="w-5 h-5" />, color: totals.execucaoMedia >= 80 ? 'bg-emerald-500' : totals.execucaoMedia >= 50 ? 'bg-amber-500' : 'bg-rose-500' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${k.color} text-white`}>{k.icon}</div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tabular-nums">{k.value}</div>
                <div className="text-sm text-muted-foreground">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Detalhe por Contrato/Proposta — só quando obra específica selecionada */}
      {obraFiltro !== 'todas' && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Contratos / Propostas — {obraSelecionadaInfo?.titulo}
                {propostaFiltro !== 'todas' && propostaSelecionadaInfo && (
                  <Badge variant="outline" className="ml-2">filtrado: {propostaSelecionadaInfo.nome}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetalhe ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                </div>
              ) : propostasDetalhe.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhum contrato/proposta cadastrado nesta obra.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-3 font-medium">Contrato / Proposta</th>
                        <th className="p-3 font-medium text-center">Situação</th>
                        <th className="p-3 font-medium text-center">Serviços</th>
                        <th className="p-3 font-medium text-center">Elementos</th>
                        <th className="p-3 font-medium text-center">Etapas</th>
                        <th className="p-3 font-medium text-center">Atividades</th>
                        <th className="p-3 font-medium text-center w-48">Execução Física</th>
                      </tr>
                    </thead>
                    <tbody>
                      {propostasDetalhe
                        .filter((p) => propostaFiltro === 'todas' || p.id === propostaFiltro)
                        .map((p) => (
                          <tr key={p.id} className="border-b hover:bg-slate-50">
                            <td className="p-3 font-medium">{p.nome}</td>
                            <td className="p-3 text-center">
                              <Badge variant={getStatusBadge(p.situacao || '')} className="text-xs">{p.situacao || '-'}</Badge>
                            </td>
                            <td className="p-3 text-center tabular-nums">{p.servicos}</td>
                            <td className="p-3 text-center tabular-nums">{p.elementos}</td>
                            <td className="p-3 text-center tabular-nums">{p.etapas}</td>
                            <td className="p-3 text-center tabular-nums">{p.atividades}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${p.execucaoMedia >= 80 ? 'bg-emerald-500' : p.execucaoMedia >= 50 ? 'bg-amber-500' : p.execucaoMedia > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
                                    style={{ width: `${p.execucaoMedia}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium tabular-nums w-10 text-right">{p.execucaoMedia}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Gráfico de Execução por Obra */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Execução Física por Obra</CardTitle>
          </CardHeader>
          <CardContent>
            {obras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma obra encontrada com os filtros atuais.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {obras.map((obra) => (
                  <div key={obra.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-lg">{obra.titulo}</h4>
                          <Badge variant={getStatusBadge(obra.status)} className="text-xs">{obra.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{obra.cliente} · {obra.endereco}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold tabular-nums">{obra.execucaoMedia}%</div>
                        <div className="text-xs text-muted-foreground">execução</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${obra.execucaoMedia >= 80 ? 'bg-emerald-500' : obra.execucaoMedia >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${obra.execucaoMedia}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {obra.propostas} contratos</span>
                      <span className="flex items-center gap-1"><Hammer className="w-3 h-3" /> {obra.servicos} serviços</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {obra.atividades} ativ.</span>
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {obra.diarios} diários</span>
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {obra.planejamentos} plan.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5" /> Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            {obras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  obras.reduce((acc, o) => {
                    const s = (o.status || 'ativa').toLowerCase();
                    acc[s] = (acc[s] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([st, count]) => (
                  <div key={st} className="flex items-center justify-between">
                    <Badge variant={getStatusBadge(st)} className="w-24 text-xs justify-start">{st}</Badge>
                    <div className="flex items-center gap-2 flex-1 ml-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(count / obras.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Alertas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          const obrasParalisadas = obras.filter(o => ['paralisada', 'pausada'].includes(o.status.toLowerCase()));
          const obrasSemAtiv = obras.filter(o => o.atividades === 0 && o.propostas > 0);
          const obrasSemDiario = obras.filter(o => o.diarios === 0 && o.atividades > 0);
          return [
            { title: 'Obras Paralisadas', count: obrasParalisadas.length, icon: <AlertTriangle className="w-5 h-5" />, color: 'border-rose-200 bg-rose-50', items: obrasParalisadas.map(o => o.titulo) },
            { title: 'Sem Atividades', count: obrasSemAtiv.length, icon: <Clock className="w-5 h-5" />, color: 'border-amber-200 bg-amber-50', items: obrasSemAtiv.map(o => o.titulo) },
            { title: 'Sem Diários (com ativ.)', count: obrasSemDiario.length, icon: <CheckCircle2 className="w-5 h-5" />, color: 'border-blue-200 bg-blue-50', items: obrasSemDiario.map(o => o.titulo) },
          ];
        })().map((a) => (
          <Card key={a.title} className={`border-2 ${a.color} hover:shadow-md transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {a.icon}
                  <span className="font-medium text-sm">{a.title}</span>
                </div>
                <span className="text-2xl font-bold tabular-nums">{a.count}</span>
              </div>
              {a.items.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  {a.items.slice(0, 3).map((t, i) => <div key={i} className="truncate">• {t}</div>)}
                  {a.items.length > 3 && <div>• +{a.items.length - 3} outras</div>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Tabela Resumo */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Resumo Consolidado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Obra</th>
                    <th className="p-3 font-medium">Cliente</th>
                    <th className="p-3 font-medium text-center">Contratos</th>
                    <th className="p-3 font-medium text-center">Serviços</th>
                    <th className="p-3 font-medium text-center">Atividades</th>
                    <th className="p-3 font-medium text-center">Execução</th>
                    <th className="p-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {obras.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma obra encontrada</td></tr>
                  ) : (
                    obras.map((obra) => (
                      <tr key={obra.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{obra.titulo}</td>
                        <td className="p-3 text-muted-foreground">{obra.cliente}</td>
                        <td className="p-3 text-center tabular-nums">{obra.propostas}</td>
                        <td className="p-3 text-center tabular-nums">{obra.servicos}</td>
                        <td className="p-3 text-center tabular-nums">{obra.atividades}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${obra.execucaoMedia >= 80 ? 'bg-emerald-500' : obra.execucaoMedia >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${obra.execucaoMedia}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums w-9">{obra.execucaoMedia}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-center"><Badge variant={getStatusBadge(obra.status)}>{obra.status}</Badge></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Rodapé */}
      <footer className="border-t pt-6 text-sm text-muted-foreground text-center">
        <p>ORVIAN — Apresentação Executiva gerada em {new Date().toLocaleString('pt-BR')}</p>
        <p className="mt-1">
          {obraFiltro !== 'todas' && obraSelecionadaInfo ? `Obra: ${obraSelecionadaInfo.titulo}` : 'Todas as obras'}
          {propostaFiltro !== 'todas' && propostaSelecionadaInfo ? ` · Contrato: ${propostaSelecionadaInfo.nome}` : ''}
          {' · Dados filtrados por empresa_id via RLS multi-tenant'}
        </p>
      </footer>
    </div>
  );
}
