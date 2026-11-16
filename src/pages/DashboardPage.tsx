import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { ObrasService } from '@/lib/orvianService';

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