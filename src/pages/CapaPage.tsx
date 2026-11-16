import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ObrasService } from '@/lib/orvianService';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckSquare, BookOpen, CalendarDays, FileDown, PlusCircle } from 'lucide-react';

export default function CapaPage() {
  const { empresaId, user, funcionario } = useAuth();
  const [counts, setCounts] = useState({ obras: 0, atividades: 0, etapas: 0 });

  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      const obras = await ObrasService.list(empresaId);
      const obraIds = obras.map((o) => o.id);
      const [a, e] = await Promise.all([
        obraIds.length ? supabase.from('orv_atividades' as any).select('id', { count: 'exact', head: true }).in('obra_id', obraIds) : Promise.resolve({ count: 0 }),
        supabase.from('orv_etapas' as any).select('id', { count: 'exact', head: true }),
      ]);
      setCounts({ obras: obras.length, atividades: (a as any).count || 0, etapas: (e as any).count || 0 });
    })();
  }, [empresaId]);

  const atalhos = [
    { to: '/lancamento', label: 'Lançar Atividade', icon: PlusCircle, color: 'bg-emerald-500' },
    { to: '/controle', label: 'Controle de Execução', icon: CheckSquare, color: 'bg-blue-500' },
    { to: '/diario', label: 'Diário de Obras', icon: BookOpen, color: 'bg-amber-500' },
    { to: '/planejamento', label: 'Planejamento', icon: CalendarDays, color: 'bg-indigo-500' },
    { to: '/relatorios', label: 'Relatórios', icon: FileDown, color: 'bg-rose-500' },
    { to: '/obras', label: 'Obras e Propostas', icon: Building2, color: 'bg-slate-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ORVIAN</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email || funcionario?.nome || 'Bem-vindo'} · Gestão de Obras
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{counts.obras}</div><div className="text-xs text-muted-foreground">Obras</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{counts.atividades}</div><div className="text-xs text-muted-foreground">Atividades</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{counts.etapas}</div><div className="text-xs text-muted-foreground">Etapas</div></CardContent></Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {atalhos.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.to} to={a.to} className="flex items-center gap-3 p-4 rounded-lg border bg-white hover:shadow transition">
              <div className={`w-10 h-10 rounded-lg ${a.color} text-white flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}