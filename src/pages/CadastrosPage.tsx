import { useEffect, useState } from 'react';
import { ObrasService, ServicosObraService } from '@/lib/orvianService';
import type { Obra, Servico } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Building2, ListChecks, ExternalLink } from 'lucide-react';

/** Serviços da obra — somente leitura.
 *  O cadastro de obras/serviços é feito no PreciCalc e no DiGest (orçamento aprovado).
 *  Aqui o ORVIAN apenas mostra os contratos/serviços da obra selecionada.
 */
export default function CadastrosPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => {
    if (obraId) ServicosObraService.listByObraId(empresaId, obraId).then(setServicos);
    else setServicos([]);
  }, [obraId, empresaId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Serviços da Obra</h1>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        O cadastro de obras e serviços é feito no <strong>PreciCalc</strong> e no <strong>DiGest</strong>, quando o orçamento é aprovado.
        Aqui você apenas <strong>consulta</strong> os serviços/contratos de cada obra — não é preciso cadastrar novamente.
      </div>
      <select className="border rounded p-2 w-full md:w-96" value={obraId} onChange={(e) => setObraId(e.target.value)}>
        <option value="">Selecione a obra</option>
        {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {obraId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4" /> Serviços / Contratos ({servicos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {servicos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esta obra ainda não tem serviços aprovados no PreciCalc/DiGest.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="py-2">Serviço / Contrato</th><th>Descrição</th></tr></thead>
                <tbody>{servicos.map((s) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 font-medium flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />{s.nome}</td>
                    <td className="text-muted-foreground">{s.descricao || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            <a href="https://di-gest.vercel.app" target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-2 text-sm text-primary mt-4 hover:underline">
              Abrir DiGest para cadastrar serviços <ExternalLink className="w-3 h-3" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}