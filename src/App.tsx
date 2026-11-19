import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AccessPage from "@/pages/AccessPage";
import AccessPageFallback from "@/pages/AccessPageFallback";
import Layout from "@/components/Layout";
import CapaPage from "@/pages/CapaPage";
import DashboardPage from "@/pages/DashboardPage";
import ApresentacaoPage from "@/pages/ApresentacaoPage";
import PlanejamentoPage from "@/pages/PlanejamentoPage";
import HistoricoPage from "@/pages/HistoricoPage";
import LancamentoPage from "@/pages/LancamentoPage";
import DiarioPage from "@/pages/DiarioPage";
import ControlePage from "@/pages/ControlePage";
import ObrasPage from "@/pages/ObrasPage";
import CadastrosPage from "@/pages/CadastrosPage";
import RelatoriosPage from "@/pages/RelatoriosPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import CustosPage from "@/pages/CustosPage";
import ProvisionamentoPage from "@/pages/ProvisionamentoPage";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, funcionario, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user && !funcionario) return <AccessPageFallback />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/access/:token" element={<AccessPage />} />
          <Route path="/" element={<AuthGate><Layout /></AuthGate>}>
            <Route index element={<CapaPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="apresentacao" element={<ApresentacaoPage />} />
            <Route path="planejamento" element={<PlanejamentoPage />} />
            <Route path="historico" element={<HistoricoPage />} />
            <Route path="lancamento" element={<LancamentoPage />} />
            <Route path="diario" element={<DiarioPage />} />
            <Route path="controle" element={<ControlePage />} />
            <Route path="obras" element={<ObrasPage />} />
            <Route path="cadastros" element={<CadastrosPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="custos" element={<CustosPage />} />
            <Route path="provisionamento" element={<ProvisionamentoPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}