import { useEffect, useState } from 'react';
import { ObrasService, PropostasService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function ApresentacaoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [resumo, setResumo] = useState<any>(null);

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId).then(setPropostas); else setPropostas([]); }, [obraId]);

  useEffect(() => {
    (async () => {
      if (!obraId) { setResumo(null); return; }
      let q = supabase.from('orv_atividades' as any).select('*').eq('obra_id', obraId);
      if (propostaId) q = q.eq('proposta_id', propostaId);
      const { data: ativs } = await q;
      const { data: diarios } = await supabase.from('orv_diarios' as any).select('*').eq('obra_id', obraId);
      setResumo({ atividades: ativs?.length || 0, diarios: diarios?.length || 0, obra: obras.find((o) => o.id === obraId) });
    })();
  }, [obraId, propostaId, obras]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Apresentação Executiva</h1>
      <div className="grid md:grid-cols-2 gap-2">
        <select className="border rounded p-2" value={obraId} onChange={(e) => { setObraId(e.target.value); setPropostaId(''); }}>
          <option value="">Filtrar por Obra</option>
          {obras.map((o) => <option key={o.id} value={o.id}>{o.nome || 'Obra'}</option>)}
        </select>
        <select className="border rounded p-2" value={propostaId} onChange={(e) => setPropostaId(e.target.value)} disabled={!obraId}>
          <option value="">Filtrar por Contrato/Proposta</option>
          {propostas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>
      {resumo && (
        <Card>
          <CardHeader><CardTitle>{resumo.obra?.nome || 'Obra'}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>Atividades registradas: {resumo.atividades}</div>
            <div>Diários: {resumo.diarios}</div>
            <div className="text-muted-foreground text-xs">Escopo: {propostaId ? 'Contrato específico' : 'Obra completa'}</div>
          </CardContent>
        </Card>
      )}
      {!obraId && <p className="text-muted-foreground text-sm">Selecione uma obra para apresentar.</p>}
    </div>
  );
}