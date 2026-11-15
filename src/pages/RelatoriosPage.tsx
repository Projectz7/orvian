import { useState } from 'react';
import { ObrasService, PropostasService, ServicosService, EtapasService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useAuth } from '@/context/AuthContext';

export default function RelatoriosPage() {
  const { empresaId } = useAuth();
  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ORVIAN';
      wb.created = new Date();

      const addSheet = (name: string) => wb.addWorksheet(name);

      // Dados da empresa do usuário (obras compartilhadas)
      const obras = await ObrasService.list(empresaId);
      const obraIds = obras.map((o) => o.id);
      if (obraIds.length === 0) {
        alert('Nenhuma obra encontrada para esta empresa.');
        setExporting(false);
        return;
      }

      // Buscar propostas das obras
      const propostas = await PropostasService.listByObra(obraIds[0]); // Precisa buscar para todas
      // Para simplificar, buscaremos tudo e filtraremos em memória
      // TODO: otimizar com queries em lote
      
      const inObra = (q: any) => q.in('obra_id', obraIds);
      
      // Elementos e etapas não têm obra_id direto - buscar via servicos/propostas
      const [propostasData, servicosData, atividadesData, diariosData, planejData, evidenciasData] = await Promise.all([
        supabase.from('orv_propostas' as any).select('*').in('obra_id', obraIds),
        supabase.from('orv_servicos' as any).select('*'),
        inObra(supabase.from('orv_atividades' as any).select('*')),
        inObra(supabase.from('orv_diarios' as any).select('*')),
        inObra(supabase.from('orv_planejamentos' as any).select('*')),
        inObra(supabase.from('orv_evidencias' as any).select('*')),
      ]);
      
      // Filtrar servicos/elementos/etapas/controle por obra_ids via propostas
      const propostaIds = propostasData.data?.map((p: any) => p.id) || [];
      const servicoIds: string[] = [];
      const elementoIds: string[] = [];
      const etapaIds: string[] = [];
      
      if (propostaIds.length > 0) {
        const servicosData = await supabase.from('orv_servicos' as any).select('id, proposta_id').in('proposta_id', propostaIds);
        servicoIds.push(...(servicosData.data?.map((s: any) => s.id) || []));
      }
      
      if (servicoIds.length > 0) {
        const [elementosData, etapasData] = await Promise.all([
          supabase.from('orv_elementos' as any).select('*').in('servico_id', servicoIds),
          supabase.from('orv_etapas' as any).select('id, servico_id').in('servico_id', servicoIds),
        ]);
        elementoIds.push(...(elementosData.data?.map((e: any) => e.id) || []));
        etapaIds.push(...(etapasData.data?.map((e: any) => e.id) || []));
      }
      
      const [controleData, modelosData, configData, historicoData, camposData, valoresData] = await Promise.all([
        etapaIds.length > 0 
          ? supabase.from('orv_controle_execucao' as any).select('*').in('etapa_id', etapaIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('orv_modelos_etapas' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_configuracoes' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_historico_alteracoes' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_campos_personalizados' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_valores_campos' as any).select('*').eq('empresa_id', empresaId),
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
      dash.addRow(['Obras', obras.length || 0]);
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
      const s5 = addSheet('OBRAS'); fill(s5, obras || []);
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