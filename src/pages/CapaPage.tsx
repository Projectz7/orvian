import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ObrasService } from '@/lib/orvianService';
import {
  Users, Building2, FileText, CalendarDays, Hammer, TrendingUp, ArrowRight, Settings, FolderKanban,
  LayoutDashboard, BarChart3, ClipboardList, Home
} from 'lucide-react';

interface KPI {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  href: string;
}

export default function CapaPage() {
  const navigate = useNavigate();
  const { empresaId, funcionario, user } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [obrasCount, setObrasCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!empresaId) { setLoading(false); return; }
      setLoading(true);
      try {
        const obras = await ObrasService.list(empresaId);
        const obraIds = obras.map((o) => o.id);
        setObrasCount(obras.length);

        const inObra = (q: any) => obraIds.length ? q.in('obra_id', obraIds) : q;

        const [propostasRes, servicosRes, atividadesRes, etapasRes, planejRes, diariosRes, controlesRes] = await Promise.all([
          inObra(supabase.from('orv_propostas' as any).select('id', { count: 'exact', head: true })),
          inObra(supabase.from('orv_servicos' as any).select('id', { count: 'exact', head: true })),
          inObra(supabase.from('orv_atividades' as any).select('id', { count: 'exact', head: true }).is('deleted_at', null)),
          inObra(supabase.from('orv_etapas' as any).select('id', { count: 'exact', head: true })),
          inObra(supabase.from('orv_planejamentos' as any).select('id', { count: 'exact', head: true })),
          inObra(supabase.from('orv_diarios' as any).select('id', { count: 'exact', head: true })),
          obraIds.length > 0
            ? supabase.from('orv_controle_execucao' as any).select('id, percentual', { count: 'exact', head: true })
            : Promise.resolve({ count: 0, data: [] }),
        ]);

        const controles = controlesRes.data as { percentual: number }[] || [];
        const mediaExecucao = controles.length > 0
          ? Math.round(controles.reduce((s, c) => s + (c.percentual || 0), 0) / controles.length)
          : 0;

        const kpiData: KPI[] = [
          { label: 'Obras', value: obras.length, icon: <Building2 className="w-5 h-5" />, color: 'bg-blue-500', href: '/obras' },
          { label: 'Propostas', value: propostasRes.count || 0, icon: <FileText className="w-5 h-5" />, color: 'bg-indigo-500', href: '/planejamento' },
          { label: 'Serviços', value: servicosRes.count || 0, icon: <Hammer className="w-5 h-5" />, color: 'bg-amber-500', href: '/cadastros' },
          { label: 'Atividades', value: atividadesRes.count || 0, icon: <ClipboardList className="w-5 h-5" />, color: 'bg-emerald-500', href: '/lancamento' },
          { label: 'Diários', value: diariosRes.count || 0, icon: <CalendarDays className="w-5 h-5" />, color: 'bg-violet-500', href: '/diario' },
          { label: 'Execução Média', value: mediaExecucao, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-rose-500', href: '/controle' },
        ];

        setKpis(kpiData);
      } catch (e) {
        console.error('Erro ao carregar KPIs:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaId]);

  const atalhos = [
    { label: 'Nova Obra', icon: <Building2 className="w-5 h-5" />, href: '/obras', desc: 'Cadastrar nova obra', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { label: 'Planejamento', icon: <FolderKanban className="w-5 h-5" />, href: '/planejamento', desc: 'Planejamento de campo', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
    { label: 'Lançamento', icon: <ClipboardList className="w-5 h-5" />, href: '/lancamento', desc: 'Registrar atividades', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
    { label: 'Diário de Obra', icon: <CalendarDays className="w-5 h-5" />, href: '/diario', desc: 'Preencher diário diário', color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
    { label: 'Controle Execução', icon: <BarChart3 className="w-5 h-5" />, href: '/controle', desc: 'Acompanhar % execução', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
    { label: 'Relatórios', icon: <FileText className="w-5 h-5" />, href: '/relatorios', desc: 'Exportar Excel completo', color: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
  ];

  const nomeUsuario = funcionario?.nome || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-primary bg-clip-text text-transparent">
              ORVIAN
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo, <span className="font-medium text-foreground">{nomeUsuario}</span> — {funcionario ? 'Funcionário' : 'Gestor'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/configuracoes')}>
              <Settings className="w-4 h-4 mr-1" /> Configurações
            </Button>
          </div>
        </header>

        {/* KPIs Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Visão Geral</h2>
            {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              Carregando...
            </div>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(kpi.href)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${kpi.color} text-white`}>{kpi.icon}</div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold tabular-nums">{kpi.value}{kpi.label === 'Execução Média' ? '%' : ''}</div>
                    <div className="text-sm text-muted-foreground capitalize">{kpi.label.toLowerCase()}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Atalhos Rápidos */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {atalhos.map((a) => (
              <Button
                key={a.label}
                variant="ghost"
                className={`h-24 flex-col items-start justify-center gap-2 text-left rounded-xl border-2 ${a.color} transition-all hover:shadow-md`}
                onClick={() => navigate(a.href)}
              >
                <div className={`p-2 rounded-lg ${a.color.replace('hover:bg-', 'bg-').replace('text-', 'text-')}`}>
                  {a.icon}
                </div>
                <span className="font-medium text-sm">{a.label}</span>
                <span className="text-[10px] text-muted-foreground">{a.desc}</span>
              </Button>
            ))}
          </div>
        </section>

        {/* Módulos Principais */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Módulos do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Planejamento de Campo', desc: 'Atividades, datas, responsáveis e reprogramação', icon: <ClipboardList className="w-6 h-6" />, href: '/planejamento', color: 'bg-indigo-50 border-indigo-200', iconColor: 'text-indigo-600' },
              { title: 'Controle de Execução', desc: 'Percentual por etapa, evidências fotográficas, medição', icon: <BarChart3 className="w-6 h-6" />, href: '/controle', color: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-600' },
              { title: 'Diário de Obra', desc: 'Registro diário de condições, mão de obra, equipamentos', icon: <CalendarDays className="w-6 h-6" />, href: '/diario', color: 'bg-violet-50 border-violet-200', iconColor: 'text-violet-600' },
              { title: 'Histórico & Relatórios', desc: 'Linha do tempo, exportação Excel, auditoria', icon: <FileText className="w-6 h-6" />, href: '/relatorios', color: 'bg-rose-50 border-rose-200', iconColor: 'text-rose-600' },
            ].map((m) => (
              <Card key={m.title} className={`${m.color} hover:shadow-lg transition-all h-full border-2 cursor-pointer`} onClick={() => navigate(m.href)}>
                <CardContent className="p-5 flex flex-col">
                  <div className={`p-3 rounded-xl bg-white ${m.iconColor} mb-3`}>{m.icon}</div>
                  <h3 className="font-semibold text-lg mb-1">{m.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1">{m.desc}</p>
                  <div className="flex items-center justify-end mt-3 text-sm font-medium text-primary">
                    Acessar <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Rodapé informativo */}
        <section className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Sistema</h4>
              <p>ORVIAN v1.3.0 — Planejamento e Controle de Obras</p>
              <p className="mt-1">Ecosistema P7Store · Supabase Multi-tenant</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Sua Empresa</h4>
              <p>ID: {empresaId?.slice(0, 8)}...</p>
              <p className="mt-1">{obrasCount} obra(s) cadastrada(s)</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Navegação</h4>
              <p>Use o menu lateral ou os atalhos acima</p>
              <p className="mt-1">Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] border">K</kbd> para comando rápido (em breve)</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}