import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { ObrasService, AlertasService, AvancoService, CustosService } from '@/lib/orvianService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const CORES = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DashboardPage() {
  const { empresaId } = useAuth();
  const [counts, setCounts] = useState<any>({ obras: 0, propostas: 0, servicos: 0, atividades: 0, etapas: 0, planejadas: 0, concluidas: 0, atrasadas: 0 });
  const [porObra, setPorObra] = useState<any[]>([]);
  const [evolucao, setEvolucao] = useState<any[]>([]);
  const [financeiro, setFinanceiro] = useState({ provisionado: 0, gasto: 0 });

  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      const obras = await ObrasService.list(empresaId);
      const obraIds = obras.map((o) => o.id);
      const inObra = (q: any) => obraIds.length ? q.in('obra_id', obraIds) : q;
      const [p, s, a, e, pl, c] = await Promise.all([
        inObra(supabase.from('orv_propostas' as any).select('id', { count: 'exact', head: true })),
        supabase.from('orv_servicos' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('diario_obra' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('tipo_registro', 'atividade'),
        supabase.from('orv_etapas' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('plano_tarefas' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('plano_tarefas' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'concluida'),
      ]);
      const als = await AlertasService.list(empresaId);

      // Avanço por obra
      const avancos = await Promise.all(obras.slice(0, 12).map(async (o) => ({ nome: (o.nome || '').slice(0, 18), valor: await AvancoService.obra(o.id) })));
      setPorObra(avancos);

      // Evolução mensal de atividades
      const { data: ativs } = await supabase.from('diario_obra' as any).select('data').eq('empresa_id', empresaId).eq('tipo_registro', 'atividade').order('data');
      const porMes: Record<string, number> = {};
      (ativs || []).forEach((x: any) => { const m = String(x.data).slice(0, 7); porMes[m] = (porMes[m] || 0) + 1; });
      let acum = 0;
      setEvolucao(Object.keys(porMes).sort().map((m) => ({ mes: m.slice(5) + '/' + m.slice(0, 4), total: (acum += porMes[m]) })));

      // Financeiro (caixa)
      const caixa = obraIds.length ? await CustosService.reais(empresaId, obraIds[0]) : [];
      setFinanceiro({
        provisionado: caixa.reduce((s, l) => s + Number(l.provisionado || 0), 0),
        gasto: caixa.reduce((s, l) => s + Number(l.valor || 0), 0),
      });

      setCounts({
        obras: obras.length, propostas: p.count || 0, servicos: s.count || 0, atividades: a.count || 0,
        etapas: e.count || 0, planejadas: pl.count || 0, concluidas: c.count || 0, atrasadas: als.length,
      });
    })();
  }, [empresaId]);

  const cards = [
    { label: 'Obras', valor: counts.obras, cor: 'text-blue-600' },
    { label: 'Propostas', valor: counts.propostas, cor: 'text-indigo-600' },
    { label: 'Serviços', valor: counts.servicos, cor: 'text-cyan-600' },
    { label: 'Atividades', valor: counts.atividades, cor: 'text-emerald-600' },
    { label: 'Etapas', valor: counts.etapas, cor: 'text-slate-600' },
    { label: 'Atrasadas', valor: counts.atrasadas, cor: counts.atrasadas ? 'text-red-600' : 'text-slate-500' },
    { label: 'Provisionado', valor: brl(financeiro.provisionado), cor: 'text-sky-600' },
    { label: 'Gasto', valor: brl(financeiro.gasto), cor: 'text-rose-600' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard Geral</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}><CardContent className="p-4">
            <div className={`text-2xl font-bold ${c.cor}`}>{c.valor}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Avanço físico por obra</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porObra} layout="vertical" margin={{ left: 110 }}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0,100]} /><YAxis type="category" dataKey="nome" width={105} />
                  <Tooltip formatter={(v: any) => `${v}%`} /><Bar dataKey="valor" name="Avanço %" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Situação das tarefas</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'Concluídas', value: counts.concluidas }, { name: 'Pendentes', value: Math.max(counts.planejadas - counts.concluidas, 0) }]}
                    dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} label>
                    <Cell fill="#10b981" /><Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução acumulada de atividades</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucao.length ? evolucao : [{ mes: '—', total: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis allowDecimals={false} />
                  <Tooltip /><Line type="monotone" dataKey="total" stroke="#0ea5e9" name="Atividades" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Visão consolidada</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(counts).filter(([k]) => typeof counts[k] === 'number').map(([nome, valor]) => ({ nome, valor }))}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" /><YAxis allowDecimals={false} />
                  <Tooltip /><Bar dataKey="valor" fill="#0ea5e9" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}