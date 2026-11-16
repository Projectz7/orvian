import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { ObrasService } from '@/lib/orvianService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CORES = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { empresaId } = useAuth();
  const [counts, setCounts] = useState({ obras: 0, propostas: 0, servicos: 0, atividades: 0, etapas: 0 });

  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      const obras = await ObrasService.list(empresaId);
      const obraIds = obras.map((o) => o.id);
      const inObra = (q: any) => obraIds.length ? q.in('obra_id', obraIds) : q;
      const [p, s, a, e] = await Promise.all([
        inObra(supabase.from('orv_propostas' as any).select('id', { count: 'exact', head: true })),
        supabase.from('orv_servicos' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('diario_obra' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('tipo_registro', 'atividade'),
        supabase.from('orv_etapas' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
      ]);
      setCounts({ obras: obras.length, propostas: p.count || 0, servicos: s.count || 0, atividades: a.count || 0, etapas: e.count || 0 });
    })();
  }, [empresaId]);

  const barras = Object.entries(counts).map(([nome, valor]) => ({ nome, valor }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard Geral</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k}>
            <CardHeader><CardTitle className="text-sm capitalize">{k}</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{v}</div></CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Os gráficos abaixo são alimentados automaticamente pelos lançamentos de atividades.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Visão Consolidada</CardTitle></CardHeader>
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
          <CardHeader><CardTitle className="text-base">Distribuição</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={barras} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={75} label>
                    {barras.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}