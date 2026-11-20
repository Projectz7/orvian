import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ObrasService, AlertasService, EmpresaService } from '@/lib/orvianService';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, CheckSquare, BookOpen, CalendarDays, FileDown, PlusCircle, AlertTriangle, Bell, Wallet, PiggyBank, ChevronRight } from 'lucide-react';

export default function CapaPage() {
  const { empresaId, user, funcionario } = useAuth();
  const [counts, setCounts] = useState({ obras: 0, atividades: 0, etapas: 0, planejadas: 0, concluidas: 0, atrasadas: 0 });
  const [alertas, setAlertas] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      EmpresaService.get(empresaId).then(setEmpresa);
      const obras = await ObrasService.list(empresaId);
      const obraIds = obras.map((o) => o.id);
      const [a, e, p, c] = await Promise.all([
        obraIds.length ? supabase.from('diario_obra' as any).select('id', { count: 'exact', head: true }).in('obra_id', obraIds).eq('tipo_registro', 'atividade') : Promise.resolve({ count: 0 }),
        supabase.from('orv_etapas' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('plano_tarefas' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId),
        supabase.from('plano_tarefas' as any).select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'concluida'),
      ]);
      const als = await AlertasService.list(empresaId);
      setAlertas(als);
      setCounts({
        obras: obras.length, atividades: (a as any).count || 0, etapas: (e as any).count || 0,
        planejadas: (p as any).count || 0, concluidas: (c as any).count || 0, atrasadas: als.length,
      });
    })();
  }, [empresaId]);

  const atalhos = [
    { to: '/lancamento', label: 'Lançar Atividade', icon: PlusCircle, color: 'bg-emerald-500' },
    { to: '/controle', label: 'Controle de Execução', icon: CheckSquare, color: 'bg-blue-500' },
    { to: '/diario', label: 'Diário de Obras', icon: BookOpen, color: 'bg-amber-500' },
    { to: '/planejamento', label: 'Planejamento', icon: CalendarDays, color: 'bg-indigo-500' },
    { to: '/custos', label: 'Custos', icon: Wallet, color: 'bg-rose-500' },
    { to: '/provisionamento', label: 'Provisionamento', icon: PiggyBank, color: 'bg-teal-500' },
    { to: '/relatorios', label: 'Relatórios', icon: FileDown, color: 'bg-slate-600' },
    { to: '/obras', label: 'Obras e Propostas', icon: Building2, color: 'bg-cyan-600' },
  ];

  const cards = [
    { label: 'Obras', valor: counts.obras, icon: Building2, to: '/obras', cor: 'text-blue-600' },
    { label: 'Atividades', valor: counts.atividades, icon: CheckSquare, to: '/diario', cor: 'text-emerald-600' },
    { label: 'Etapas', valor: counts.etapas, icon: CalendarDays, to: '/controle', cor: 'text-indigo-600' },
    { label: 'Tarefas atrasadas', valor: counts.atrasadas, icon: counts.atrasadas ? AlertTriangle : Bell, to: '/planejamento', cor: counts.atrasadas ? 'text-red-600' : 'text-slate-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {empresa?.logo_url && <img src={empresa.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-contain bg-white border p-1" />}
        <div>
          <h1 className="text-2xl font-bold">{empresa?.nome || 'Sistema de Gestão'}</h1>
          <p className="text-sm text-muted-foreground">
            {user?.email || funcionario?.nome || 'Bem-vindo'} · {empresa?.subtitle || 'Gestão de Obras'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to}>
              <Card className="hover:shadow-md transition cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-3xl font-bold ${c.cor}`}>{c.valor}</div>
                      <div className="text-xs text-muted-foreground">{c.label}</div>
                    </div>
                    <Icon className={`w-7 h-7 ${c.cor} opacity-70`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {alertas.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Bell className="w-4 h-4 text-red-500" /> Alertas ({alertas.length})
            </div>
            {alertas.slice(0, 8).map((a) => (
              <Link key={a.id} to={a.to} className="flex items-center gap-2 p-2 rounded border bg-red-50 hover:bg-red-100 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{a.titulo}</div>
                  <div className="text-xs text-muted-foreground">{a.descricao}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {atalhos.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.to} to={a.to} className="flex items-center gap-3 p-4 rounded-lg border bg-white hover:shadow transition">
              <div className={`w-10 h-10 rounded-lg ${a.color} text-white flex items-center justify-center shrink-0`}>
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