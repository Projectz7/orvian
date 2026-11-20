import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Home, BarChart3, Presentation, CalendarDays, Image, PlusCircle, BookOpen, CheckSquare, Building2, Settings, FileDown, Cog, Menu, X, Wallet, PiggyBank } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EmpresaService } from "@/lib/orvianService";

const menu = [
  { to: "/", label: "Início", icon: Home, short: "Início" },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, short: "Dash" },
  { to: "/apresentacao", label: "Apresentação", icon: Presentation, short: "Apres." },
  { to: "/planejamento", label: "Planejamento", icon: CalendarDays, short: "Plano" },
  { to: "/historico", label: "Histórico", icon: Image, short: "Hist." },
  { to: "/lancamento", label: "Lançar Atividade", icon: PlusCircle, short: "Lançar" },
  { to: "/diario", label: "Diário de Obras", icon: BookOpen, short: "Diário" },
  { to: "/controle", label: "Controle Execução", icon: CheckSquare, short: "Controle" },
  { to: "/obras", label: "Obras e Propostas", icon: Building2, short: "Obras" },
  { to: "/cadastros", label: "Serviços da Obra", icon: Settings, short: "Serviços" },
  { to: "/relatorios", label: "Relatórios", icon: FileDown, short: "Relat." },
  { to: "/configuracoes", label: "Configurações", icon: Cog, short: "Config." },
  { to: "/custos", label: "Custos do Projeto", icon: Wallet, short: "Custos" },
  { to: "/provisionamento", label: "Provisionamento", icon: PiggyBank, short: "Prov." },
];

function Brand() {
  const { empresaId } = useAuth();
  const [empresa, setEmpresa] = useState<any>(null);
  useEffect(() => { EmpresaService.get(empresaId).then(setEmpresa); }, [empresaId]);
  return (
    <div className="flex items-center gap-2 min-w-0">
      {empresa?.logo_url ? (
        <img src={empresa.logo_url} alt="Logo" className="h-9 w-9 rounded-lg object-contain bg-white shrink-0" />
      ) : (
        <div className="h-9 w-9 rounded-lg bg-primary shrink-0" />
      )}
      <div className="min-w-0">
        <div className="font-bold leading-tight truncate">{empresa?.nome || 'ORVIAN'}</div>
        <div className="text-[10px] opacity-60 truncate">{empresa?.subtitle || 'Gestão de Obras'}</div>
      </div>
    </div>
  );
}

export default function Layout() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const NavItem = ({ m, onClick }: { m: typeof menu[number]; onClick?: () => void }) => {
    const Icon = m.icon;
    const active = loc.pathname === m.to;
    return (
      <Link to={m.to} onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${active ? "bg-slate-700" : "hover:bg-slate-800"}`}>
        <Icon className="w-4 h-4 shrink-0" /> <span>{m.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 md:flex-row">
      <header className="md:hidden sticky top-0 z-30 bg-slate-900 text-white flex items-center justify-between px-3 py-2">
        <Brand />
        <button onClick={() => setOpen(!open)} aria-label="Menu" className="p-2">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <aside className="hidden md:block w-56 shrink-0 bg-slate-900 text-white p-4">
        <div className="mb-6"><Brand /></div>
        <nav className="space-y-1">
          {menu.map((m) => <NavItem key={m.to} m={m} />)}
        </nav>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <nav className="absolute left-0 top-0 h-full w-64 bg-slate-900 text-white p-4 pt-14 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {menu.map((m) => <NavItem key={m.to} m={m} onClick={() => setOpen(false)} />)}
          </nav>
        </div>
      )}

      <main className="flex-1 p-3 md:p-6 pb-16 md:pb-6">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900 text-white flex justify-around py-1.5">
        {menu.filter(m => ["/", "/lancamento", "/controle", "/historico", "/dashboard"].includes(m.to)).map((m) => {
          const Icon = m.icon;
          const active = loc.pathname === m.to;
          return (
            <Link key={m.to} to={m.to} className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${active ? "text-emerald-400" : "text-slate-300"}`}>
              <Icon className="w-5 h-5" />
              <span>{m.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}