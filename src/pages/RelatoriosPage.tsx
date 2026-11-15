import { useState } from 'react';
import { ObrasService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';

export default function RelatoriosPage() {
  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ORVIAN';
      wb.created = new Date();

      const addSheet = (name: string) => wb.addWorksheet(name);

      // Fetch data
      const [obras, propostas, servicos, elementos, etapas, atividades, diarios, planej, evidencias, controle] = await Promise.all([
        supabase.from('orv_obras' as any).select('*'),
        supabase.from('orv_propostas' as any).select('*'),
        supabase.from('orv_servicos' as any).select('*'),
        supabase.from('orv_elementos' as any).select('*'),
        supabase.from('orv_etapas' as any).select('*'),
        supabase.from('orv_atividades' as any).select('*'),
        supabase.from('orv_diarios' as any).select('*'),
        supabase.from('orv_planejamentos' as any).select('*'),
        supabase.from('orv_evidencias' as any).select('*'),
        supabase.from('orv_controle_execucao' as any).select('*'),
      ]);

      const fill = (ws: ExcelJS.Worksheet, rows: any[]) => {
        if (!rows || rows.length === 0) { ws.addRow(['Sem dados']); return; }
        ws.addRow(Object.keys(rows[0]));
        rows.forEach((r) => ws.addRow(Object.values(r)));
      };

      // Presentation sheets first
      const capa = addSheet('CAPA');
      capa.addRow(['ORVIAN - Gestão de Obras']);
      capa.addRow(['Relatório gerado em', new Date().toLocaleString('pt-BR')]);
      const dash = addSheet('DASHBOARD');
      dash.addRow(['Obras', obras.data?.length || 0]);
      dash.addRow(['Propostas', propostas.data?.length || 0]);
      dash.addRow(['Serviços', servicos.data?.length || 0]);
      dash.addRow(['Atividades', atividades.data?.length || 0]);
      addSheet('APRESENTACAO');
      addSheet('PLANEJAMENTO');
      addSheet('HISTORICO');
      addSheet('LANCAMENTO_RAPIDO');

      // Bases
      const s1 = addSheet('DIARIO_DIAS'); fill(s1, diarios.data || []);
      const s2 = addSheet('ATIVIDADES'); fill(s2, atividades.data || []);
      const s3 = addSheet('CONTROLE_EXECUCAO'); fill(s3, controle.data || []);
      const s4 = addSheet('BASE_PLANEJAMENTO'); fill(s4, planej.data || []);
      const s5 = addSheet('OBRAS'); fill(s5, obras.data || []);
      const s6 = addSheet('PROPOSTAS'); fill(s6, propostas.data || []);
      const s7 = addSheet('SERVICOS'); fill(s7, servicos.data || []);
      const s8 = addSheet('ELEMENTOS'); fill(s8, elementos.data || []);
      const s9 = addSheet('ETAPAS_MODELO'); fill(s9, etapas.data || []);
      const s10 = addSheet('EVIDENCIAS'); fill(s10, evidencias.data || []);
      addSheet('CALENDARIO');
      addSheet('CONFIGURACOES');
      const guia = addSheet('GUIA_DADOS');
      guia.addRow(['Aba', 'Descrição']);
      guia.addRow(['OBRAS', 'Cadastro de obras']);
      guia.addRow(['PROPOSTAS', 'Propostas/frentes']);

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orvian_relatorio_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Erro: ' + (e.message || e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatórios e Exportações</h1>
      <Card>
        <CardHeader><CardTitle>Exportar Relatório Completo Excel</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={exportExcel} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" /> {exporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}