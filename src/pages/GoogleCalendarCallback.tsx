import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function GoogleCalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // planoId
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      // Armazenar erro para o opener
      window.opener?.postMessage({ type: "GOOGLE_CALENDAR_AUTH_ERROR", error }, "*");
      window.close();
      return;
    }

    if (code && state) {
      // Armazenar código no localStorage para o opener pegar
      localStorage.setItem(`google_calendar_auth_${state}`, code);
      // Notificar opener
      window.opener?.postMessage({ type: "GOOGLE_CALENDAR_AUTH_SUCCESS", planoId: state, code }, "*");
      window.close();
    } else {
      window.opener?.postMessage({ type: "GOOGLE_CALENDAR_AUTH_ERROR", error: "Parâmetros inválidos" }, "*");
      window.close();
    }
  }, [code, state, error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-8">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
        <p className="text-slate-600">Processando autorização do Google Calendar...</p>
        <p className="text-xs text-slate-400 mt-2">Esta janela fechará automaticamente.</p>
      </div>
    </div>
  );
}