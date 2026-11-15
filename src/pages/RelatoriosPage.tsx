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

      const inObra = (q: any) => q.in('obra_id', obraIds);

      // 1. Propostas das obras
      const { data: propostasData, error: propostasErr } = await supabase
        .from('orv_propostas' as any).select('*').in('obra_id', obraIds);
      if (propostasErr) throw propostasErr;
      const propostaIds = propostasData?.map((p: any) => p.id) || [];

      // 2. Serviços das propostas
      let servicosData: any[] = [];
      if (propostaIds.length > 0) {
        const { data, error } = await supabase
          .from('orv_servicos' as any).select('*').in('proposta_id', propostaIds);
        if (error) throw error;
        servicosData = data || [];
      }
      const servicoIds = servicosData.map((s: any) => s.id);

      // 3. Elementos e etapas dos serviços
      let elementosData: any[] = [];
      let etapasData: any[] = [];
      if (servicoIds.length > 0) {
        const [elemRes, etapRes] = await Promise.all([
          supabase.from('orv_elementos' as any).select('*').in('servico_id', servicoIds),
          supabase.from('orv_etapas' as any).select('*').in('servico_id', servicoIds),
        ]);
        if (elemRes.error) throw elemRes.error;
        if (etapRes.error) throw etapRes.error;
        elementosData = elemRes.data || [];
        etapasData = etapRes.data || [];
      }
      const etapaIds = etapasData.map((e: any) => e.id);

      // 4. Demais tabelas com obra_id direto
      const [
        atividadesRes,
        diariosRes,
        planejRes,
        evidenciasRes,
        controleRes,
        modelosRes,
        configRes,
        historicoRes,
        camposRes,
        valoresRes,
      ] = await Promise.all([
        inObra(supabase.from('orv_atividades' as any).select('*')),
        inObra(supabase.from('orv_diarios' as any).select('*')),
        inObra(supabase.from('orv_planejamentos' as any).select('*')),
        inObra(supabase.from('orv_evidencias' as any).select('*')),
        etapaIds.length > 0
          ? supabase.from('orv_controle_execucao' as any).select('*').in('etapa_id', etapaIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('orv_modelos_etapas' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_configuracoes' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_historico_alteracoes' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_campos_personalizados' as any).select('*').eq('empresa_id', empresaId),
        supabase.from('orv_valores_campos' as any).select('*').eq('empresa_id', empresaId),
      ]);

      // Check errors
      for (const r of [atividadesRes, diariosRes, planejRes, evidenciasRes, controleRes, modelosRes, configRes, historicoRes, camposRes, valoresRes]) {
        if (r.error) throw r.error;
      }

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
      dash.addRow(['Obras', obras.length]);
      dash.addRow(['Propostas', propostasData?.length || 0]);
      dash.addRow(['Serviços', servicosData.length]);
      dash.addRow(['Atividades', atividadesRes.data?.length || 0]);
      addSheet('APRESENTACAO');
      addSheet('PLANEJAMENTO');
      addSheet('HISTORICO');
      addSheet('LANCAMENTO_RAPIDO');

      // Bases - dados filtrados por empresa/obras
      const s1 = addSheet('DIARIO_DIAS'); fill(s1, diariosRes.data || []);
      const s2 = addSheet('ATIVIDADES'); fill(s2, atividadesRes.data || []);
      const s3 = addSheet('CONTROLE_EXECUCAO'); fill(s3, controleRes.data || []);
      const s4 = addSheet('BASE_PLANEJAMENTO'); fill(s4, planejRes.data || []);
      const s5 = addSheet('OBRAS'); fill(s5, obras || []);
      const s6 = addSheet('PROPOSTAS'); fill(s6, propostasData || []);
      const s7 = addSheet('SERVICOS'); fill(s7, servicosData || []);
      const s8 = addSheet('ELEMENTOS'); fill(s8, elementosData || []);
      const s9 = addSheet('ETAPAS_MODELO'); fill(s9, etapasData || []);
      const s10 = addSheet('EVIDENCIAS'); fill(s10, evidenciasRes.data || []);
      const s11 = addSheet('MODELOS_ETAPAS'); fill(s11, modelosRes.data || []);
      const s12 = addSheet('CONFIGURACOES'); fill(s12, configRes.data || []);
      const s13 = addSheet('HISTORICO_ALTERACOES'); fill(s13, historicoRes.data || []);
      const s14 = addSheet('CAMPOS_PERSONALIZADOS'); fill(s14, camposRes.data || []);
      const s15 = addSheet('VALORES_CAMPOS'); fill(s15, valoresRes.data || []);
      addSheet('CALENDARIO');
      addSheet('CONFIGURACOES_APP');
      const guia = addSheet('GUIA_DADOS');
      guia.addRow(['Aba', 'Descrição']);
      guia.addRow(['OBRAS', 'Cadastro de obras (compartilhado)']);
      guia.addRow(['PROPOSTAS', 'Propostas/frentes da empresa']);
      guia.addRow(['SERVICOS', 'Serviços das propostas']);
      guia.addRow(['ELEMENTOS', 'Elementos dos serviços']);
      guia.addRow(['ETAPAS_MODELO', 'Etapas dos serviços']);
      guia.addRow(['CONTROLE_EXECUCAO', 'Status de execução por etapa']);
      guia.addRow(['BASE_PLANEJAMENTO', 'Planejamentos simples (orv_planejamentos)']);
      guia.addRow(['DIARIO_DIAS', 'Diário de obras por dia']);
      guia.addRow(['ATIVIDADES', 'Atividades lançadas']);
      guia.addRow(['EVIDENCIAS', 'Fotos/evidências do histórico']);
      guia.addRow(['MODELOS_ETAPAS', 'Modelos reutilizáveis de etapas']);
      guia.addRow(['CONFIGURACOES', 'Configurações da empresa no ORVIAN']);
      guia.addRow(['HISTORICO_ALTERACOES', 'Auditoria de alterações']);
      guia.addRow(['CAMPOS_PERSONALIZADOS', 'Campos customizados por entidade']);
      guia.addRow(['VALORES_CAMPOS', 'Valores dos campos customizados']);

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