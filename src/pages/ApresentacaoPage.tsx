import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ObrasService } from '@/lib/orvianService';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, FileText, Hammer, Users, CalendarDays, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, DollarSign, Target, PieChart, BarChart3
} from 'lucide-react';

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

export default function ApresentacaoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    obras: 0, propostas: 0, servicos: 0, atividades: 0,
    execucaoMedia: 0, diarios: 0, planejamentos: 0
  });

  useEffect(() => {
    (async () => {
      if (!empresaId) { setLoading(false); return; }
      setLoading(true);
      try {
        const obrasList = await ObrasService.list(empresaId);
        const obraIds = obrasList.map((o) => o.id);

        if (obraIds.length === 0) {
          setObras([]);
          setTotals({ obras: 0, propostas: 0, servicos: 0, atividades: 0, execucaoMedia: 0, diarios: 0, planejamentos: 0 });
          setLoading(false);
          return;
        }

        const inObra = (q: any) => q.in('obra_id', obraIds);

        const [propostasRes, servicosRes, atividadesRes, etapasRes, planejRes, diariosRes, controlesRes] = await Promise.all([
          inObra(supabase.from('orv_propostas' as any).select('id, obra_id')),
          inObra(supabase.from('orv_servicos' as any).select('id, proposta_id')),
          inObra(supabase.from('orv_atividades' as any).select('id, obra_id').is('deleted_at', null)),
          inObra(supabase.from('orv_etapas' as any).select('id, servico_id, percentual')),
          inObra(supabase.from('orv_planejamentos' as any).select('id, obra_id')),
          inObra(supabase.from('orv_diarios' as any).select('id, obra_id')),
          supabase.from('orv_controle_execucao' as any).select('id, etapa_id, percentual'),
        ]);

        // Mapear propostas por obra
        const propostasPorObra = new Map<string, number>();
        (propostasRes.data || []).forEach((p: any) => {
          propostasPorObra.set(p.obra_id, (propostasPorObra.get(p.obra_id) || 0) + 1);
        });

        // Mapear serviços por proposta, depois por obra
        const servicosPorProposta = new Map<string, number>();
        (servicosRes.data || []).forEach((s: any) => {
          servicosPorProposta.set(s.proposta_id, (servicosPorProposta.get(s.proposta_id) || 0) + 1);
        });
        const servicosPorObra = new Map<string, number>();
        (propostasRes.data || []).forEach((p: any) => {
          const count = servicosPorProposta.get(p.id) || 0;
          if (count > 0) servicosPorObra.set(p.obra_id, (servicosPorObra.get(p.obra_id) || 0) + count);
        });

        // Atividades por obra
        const atividadesPorObra = new Map<string, number>();
        (atividadesRes.data || []).forEach((a: any) => {
          atividadesPorObra.set(a.obra_id, (atividadesPorObra.get(a.obra_id) || 0) + 1);
        });

        // Execução média por obra via etapas
        const etapasPorServico = new Map<string, { total: number; media: number }>();
        (etapasRes.data || []).forEach((e: any) => {
          const s = e.servico_id;
          if (!etapasPorServico.has(s)) etapasPorServico.set(s, { total: 0, media: 0 });
          const cur = etapasPorServico.get(s)!;
          cur.total += 1;
          cur.media = (cur.media * (cur.total - 1) + (e.percentual || 0)) / cur.total;
        });

        // Proposta -> Servicos -> etapas media
        const execucaoPorObra = new Map<string, number>();
        (propostasRes.data || []).forEach((p: any) => {
          const servicos = (servicosRes.data || []).filter((s: any) => s.proposta_id === p.id);
          let soma = 0, count = 0;
          servicos.forEach((s: any) => {
            const ep = etapasPorServico.get(s.id);
            if (ep) { soma += ep.media; count += 1; }
          });
          if (count > 0) execucaoPorObra.set(p.obra_id, Math.round(soma / count));
        });

        // Diários por obra
        const diariosPorObra = new Map<string, number>();
        (diariosRes.data || []).forEach((d: any) => {
          diariosPorObra.set(d.obra_id, (diariosPorObra.get(d.obra_id) || 0) + 1);
        });

        // Planejamentos por obra
        const planejPorObra = new Map<string, number>();
        (planejRes.data || []).forEach((p: any) => {
          planejPorObra.set(p.obra_id, (planejPorObra.get(p.obra_id) || 0) + 1);
        });

        const obrasResumo: ObraResumo[] = obrasList.map((o) => ({
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
          obras: obrasList.length,
          propostas: propostasRes.data?.length || 0,
          servicos: servicosRes.data?.length || 0,
          atividades: atividadesRes.data?.length || 0,
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
  }, [empresaId]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ativa: 'default', 'em andamento': 'default', 'em_andamento': 'default',
      concluida: 'secondary', concluída: 'secondary', finalizada: 'secondary',
      paralisada: 'destructive', pausada: 'destructive',
      planejada: 'outline', projeto: 'outline',
    };
    return variants[status.toLowerCase()] || 'outline';
  };

  const formatNumber = (n: number) => n.toLocaleString('pt-BR');

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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-primary bg-clip-text text-transparent">
            Apresentação Executiva
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada de todas as obras da empresa — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Exportar PDF
        </Button>
      </header>

      {/* KPIs Principais */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Obras', value: totals.obras, icon: <Building2 className="w-5 h-5" />, color: 'bg-blue-500' },
          { label: 'Propostas', value: totals.propostas, icon: <FileText className="w-5 h-5" />, color: 'bg-indigo-500' },
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

      {/* Gráfico de Execução por Obra (texto) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Execução Física por Obra</CardTitle>
          </CardHeader>
          <CardContent>
            {obras.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma obra cadastrada. Cadastre uma obra em <span className="font-medium">Obras</span>.</p>
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
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
                      <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Propostas</span><br /><span className="font-medium">{obra.propostas}</span></div>
                      <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Serviços</span><br /><span className="font-medium">{obra.servicos}</span></div>
                      <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Atividades</span><br /><span className="font-medium">{obra.atividades}</span></div>
                      <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Diários</span><br /><span className="font-medium">{obra.diarios}</span></div>
                      <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Planejamentos</span><br /><span className="font-medium">{obra.planejamentos}</span></div>
                      <div className="p-2 bg-slate-50 rounded"><span className="text-muted-foreground">Execução</span><br /><span className="font-medium text-lg">{obra.execucaoMedia}%</span></div>
                      <div className="p-2 bg-slate-50 rounded">
                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${
                            obra.execucaoMedia >= 80 ? 'bg-emerald-500' : obra.execucaoMedia >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`} style={{ width: `${obra.execucaoMedia}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5" /> Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            {obras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Sem dados</div>
            ) : (
              <div className="space-y-3">
                {['ativa', 'em andamento', 'concluida', 'paralisada', 'planejada'].map((st) => {
                  const count = obras.filter(o => o.status.toLowerCase() === st).length;
                  if (count === 0) return null;
                  const max = Math.max(...['ativa', 'em andamento', 'concluida', 'paralisada', 'planejada'].map(s => 
                    obras.filter(o => o.status.toLowerCase() === s).length
                  ));
                  return (
                    <div key={st} className="flex items-center gap-2">
                      <Badge variant={getStatusBadge(st)} className="w-24 text-xs justify-start">{st}</Badge>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${st.includes('conclu') ? 'bg-emerald-500' : st.includes('paral') ? 'bg-rose-500' : st.includes('planej') ? 'bg-slate-500' : 'bg-primary'}`}
                             style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }} />
                      </div>
                      <span className="font-mono text-sm w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Alertas e Atenção */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Atenção Necessária</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Obras Paralisadas', count: obras.filter(o => o.status.toLowerCase().includes('paral')).length, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-rose-100 text-rose-700 border-rose-200', desc: 'Requer ação imediata' },
            { title: 'Obras sem Diários', count: obras.filter(o => o.diarios === 0).length, icon: <CalendarDays className="w-5 h-5" />, color: 'bg-amber-100 text-amber-700 border-amber-200', desc: 'Registro diário ausente' },
            { title: 'Obras sem Planejamento', count: obras.filter(o => o.planejamentos === 0).length, icon: <Target className="w-5 h-5" />, color: 'bg-violet-100 text-violet-700 border-violet-200', desc: 'Campo sem planejamento' },
            { title: 'Execução Baixa (<50%)', count: obras.filter(o => o.execucaoMedia > 0 && o.execucaoMedia < 50).length, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-rose-100 text-rose-700 border-rose-200', desc: 'Atraso significativo' },
          ].map((a) => (
            <Card key={a.title} className={`border-2 ${a.color} hover:shadow-md transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${a.color.replace('border-', 'bg-').replace('text-', 'text-')}`}>{a.icon}</div>
                  <span className="text-2xl font-bold">{a.count}</span>
                </div>
                <h4 className="font-medium">{a.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{a.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tabela Resumo Completa */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Detalhamento por Obra</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left p-3 font-medium text-slate-500 uppercase tracking-wider">Obra</th>
                <th className="text-left p-3 font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="text-center p-3 font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-center p-3 font-medium text-slate-500 uppercase tracking-wider">Propostas</th>
                <th className="text-center p-3 font-medium text-slate-500 uppercase tracking-wider">Serviços</th>
                <th className="text-center p-3 font-medium text-slate-500 uppercase tracking-wider">Atividades</th>
                <th className="text-center p-3 font-medium text-slate-500 uppercase tracking-wider">Diários</th>
                <th className="text-center p-3 font-medium text-slate-500 uppercase tracking-wider">Planej.</th>
                <th className="text-center p-3 font-medium text-slate-500 uppercase tracking-wider">Execução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {obras.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">Nenhuma obra cadastrada</td></tr>
              ) : (
                obras.map((obra) => (
                  <tr key={obra.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium">{obra.titulo}</td>
                    <td className="p-3 text-muted-foreground">{obra.cliente}</td>
                    <td className="p-3 text-center"><Badge variant={getStatusBadge(obra.status)}>{obra.status}</Badge></td>
                    <td className="p-3 text-center">{obra.propostas}</td>
                    <td className="p-3 text-center">{obra.servicos}</td>
                    <td className="p-3 text-center">{obra.atividades}</td>
                    <td className="p-3 text-center">{obra.diarios}</td>
                    <td className="p-3 text-center">{obra.planejamentos}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`font-mono font-medium ${obra.execucaoMedia >= 80 ? 'text-emerald-600' : obra.execucaoMedia >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {obra.execucaoMedia > 0 ? `${obra.execucaoMedia}%` : '-'}
                        </span>
                        {obra.execucaoMedia > 0 && (
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              obra.execucaoMedia >= 80 ? 'bg-emerald-500' : obra.execucaoMedia >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`} style={{ width: `${obra.execucaoMedia}%` }} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t pt-6 text-sm text-muted-foreground text-center">
        <p>ORVIAN — Apresentação Executiva gerada em {new Date().toLocaleString('pt-BR')}</p>
        <p className="mt-1">Dados filtrados por empresa_id via RLS multi-tenant · Projeto Supabase: pnijzmqygibhwbcnkklm</p>
      </footer>
    </div>
  );
}