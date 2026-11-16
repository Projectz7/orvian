import { useEffect, useState } from 'react';
import { ObrasService, PropostasService, ServicosService, EtapasService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta, Servico, Etapa } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const STATUSES = ['nao_iniciado','planejado','em_execucao','parcialmente_executado','concluido','bloqueado','suspenso','cancelado'];

export default function ControlePage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [controle, setControle] = useState<Record<string, any>>({});

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId, empresaId).then(setPropostas); else setPropostas([]); }, [obraId, empresaId]);
  useEffect(() => { if (propostaId) ServicosService.listByProposta(propostaId, empresaId).then(setServicos); else setServicos([]); }, [propostaId, empresaId]);
  useEffect(() => {
    if (servicoId) {
      EtapasService.listByServico(servicoId, empresaId).then(async (ets) => {
        setEtapas(ets);
        const { data } = await supabase.from('orv_controle_execucao').select('*').in('etapa_id', ets.map(e => e.id));
        const map: Record<string, any> = {};
        (data || []).forEach((c: any) => { map[c.etapa_id] = c; });
        setControle(map);
      });
    } else { setEtapas([]); setControle({}); }
  }, [servicoId, empresaId]);

  const setStatus = async (etapaId: string, status: string) => {
    const existing = controle[etapaId];
    if (existing) {
      await supabase.from('orv_controle_execucao' as any).update({ status, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('orv_controle_execucao' as any).insert({ etapa_id: etapaId, status });
    }
    // reload
    const { data } = await supabase.from('orv_controle_execucao' as any).select('*').in('etapa_id', etapas.map(e => e.id));
    const map: Record<string, any> = {};
    (data || []).forEach((c: any) => { map[c.etapa_id] = c; });
    setControle(map);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Controle de Execução</h1>
      <div className="grid md:grid-cols-3 gap-2">
        <select className="border rounded p-2" value={obraId} onChange={(e) => { setObraId(e.target.value); setPropostaId(''); setServicoId(''); }}>
          <option value="">Obra</option>
          {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select className="border rounded p-2" value={propostaId} onChange={(e) => { setPropostaId(e.target.value); setServicoId(''); }}>
          <option value="">Proposta</option>
          {propostas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select className="border rounded p-2" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
          <option value="">Serviço</option>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      <Card>
        <CardHeader><CardTitle>Etapas ({etapas.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {etapas.map((e) => (
            <div key={e.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="font-medium text-sm">{e.ordem}. {e.nome}</div>
                <div className="text-xs text-muted-foreground">{controle[e.id]?.status || 'nao_iniciado'}</div>
              </div>
              <select className="border rounded p-1 text-sm" value={controle[e.id]?.status || 'nao_iniciado'} onChange={(ev) => setStatus(e.id, ev.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
          {etapas.length === 0 && <p className="text-muted-foreground text-sm">Selecione um serviço.</p>}
        </CardContent>
      </Card>
    </div>
  );
}