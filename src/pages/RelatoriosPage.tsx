import { useEffect, useState } from 'react';
import { ObrasService } from '@/lib/orvianService';
import { exportarRelatorio, importarRelatorio } from '@/lib/relatorioService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function RelatoriosPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<any[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostaId, setPropostaId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [resumo, setResumo] = useState<any>(null);

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);

  const baixar = async () => {
    if (!empresaId) return;
    setExporting(true); setMsg('');
    try {
      await exportarRelatorio({ empresaId, obraId: obraId || null, propostaId: propostaId || null });
      setMsg('Relatório Excel baixado com sucesso.');
    } catch (e: any) { setMsg('Erro: ' + (e.message || e)); }
    finally { setExporting(false); }
  };

  const subir = async (file: File) => {
    if (!empresaId) return;
    setImporting(true); setMsg('');
    try {
      const r = await importarRelatorio(file, empresaId);
      setResumo(r);
      setMsg(`Importação concluída. ${Object.values(r.inserted).reduce((a: number, b: any) => a + b, 0)} inseridos, ${Object.values(r.updated).reduce((a: number, b: any) => a + b, 0)} atualizados.`);
    } catch (e: any) { setMsg('Erro: ' + (e.message || e)); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatórios e Exportações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> Relatório Completo em Excel</CardTitle>
          <p className="text-sm text-muted-foreground">
            Baixe o relatório com páginas de apresentação (CAPA, DASHBOARD, APRESENTAÇÃO, PLANEJAMENTO, HISTÓRICO) e todas as bases de dados. Edite no Excel e envie de volta para atualizar o app.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-2">
            <select className="border rounded p-2" value={obraId} onChange={(e) => setObraId(e.target.value)}>
              <option value="">Todas as obras</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={propostaId} onChange={(e) => setPropostaId(e.target.value)} disabled={!obraId}>
              <option value="">Todas as propostas</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={baixar} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Baixar Relatório Excel
            </Button>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Enviar Excel Editado
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
            </label>
          </div>

          {msg && <p className="text-sm">{msg}</p>}
          {resumo && (
            <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
              <div>Abas processadas: {resumo.sheets.join(', ')}</div>
              {resumo.errors.length > 0 && <div className="text-red-600">{resumo.errors.slice(0, 5).join(' | ')}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}