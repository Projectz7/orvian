import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const [counts, setCounts] = useState({ obras: 0, propostas: 0, servicos: 0, atividades: 0, etapas: 0 });

  useEffect(() => {
    (async () => {
      const [o, p, s, a, e] = await Promise.all([
        supabase.from('orv_obras' as any).select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('orv_propostas' as any).select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('orv_servicos' as any).select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('orv_atividades' as any).select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('orv_etapas' as any).select('id', { count: 'exact', head: true }),
      ]);
      setCounts({ obras: o.count || 0, propostas: p.count || 0, servicos: s.count || 0, atividades: a.count || 0, etapas: e.count || 0 });
    })();
  }, []);

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
    </div>
  );
}