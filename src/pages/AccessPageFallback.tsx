import { useEffect } from "react";
import { HardHat } from "lucide-react";

const P7STORE_URL = "https://p7store.vercel.app/apps";

export default function AccessPageFallback() {
  useEffect(() => {
    // A autenticação é feita EXCLUSIVAMENTE pelo P7Store (regra do ecossistema).
    // Sem sessão/token válido, redireciona direto para a loja, que devolve o
    // usuário ao ORVIAN com o token (#access_token ou /access/:token).
    window.location.replace(P7STORE_URL);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto">
          <HardHat className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">ORVIAN</h1>
        <p className="text-sm text-muted-foreground">Redirecionando para o P7Store...</p>
        <a href={P7STORE_URL} className="text-sm text-primary underline">
          Clique aqui se não for redirecionado
        </a>
      </div>
    </div>
  );
}