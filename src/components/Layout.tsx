import { Link, Outlet, useLocation } from "react-router-dom";
import { Home, BarChart3, Presentation, CalendarDays, Image, PlusCircle, BookOpen, CheckSquare, Building2, Settings, FileDown, Cog } from "lucide-react";

const menu = [
  { to: "/", label: "Capa / Início", icon: Home },
  { to: "/dashboard", label: "Dashboard Geral", icon: BarChart3 },
  { to: "/apresentacao", label: "Apresentação", icon: Presentation },
  { to: "/planejamento", label: "Planejamento", icon: CalendarDays },
  { to: "/historico", label: "Histórico", icon: Image },
  { to: "/lancamento", label: "Lançar Atividade", icon: PlusCircle },
  { to: "/diario", label: "Diário de Obras", icon: BookOpen },
  { to: "/controle", label: "Controle de Execução", icon: CheckSquare },
  { to: "/obras", label: "Obras e Propostas", icon: Building2 },
  { to: "/cadastros", label: "Cadastros", icon: Settings },
  { to: "/relatorios", label: "Relatórios e Exportações", icon: FileDown },
  { to: "/configuracoes", label: "Configurações", icon: Cog },
];

export default function Layout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white p-4 hidden md:block">
        <h1 className="text-xl font-bold mb-6">ORVIAN</h1>
        <nav className="space-y-1">
          {menu.map((m) => {
            const Icon = m.icon;
            const active = loc.pathname === m.to;
            return (
              <Link key={m.to} to={m.to} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${active ? "bg-slate-700" : "hover:bg-slate-800"}`}>
                <Icon className="w-4 h-4" /> {m.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}