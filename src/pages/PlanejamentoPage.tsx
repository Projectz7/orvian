import { useEffect, useState } from 'react';
import { ObrasService, PropostasService, ServicosService, AtividadesService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import type { Obra, Proposta, Servico } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

/**
 * PLANEJAMENTO DE CAMPO (orv_planejamentos)
 * ---------------------------------------
 * Sistema SIMPLES para planejamento de atividades de campo/diário.
 * Tabela: orv_planejamentos (atividades com datas original/atual, responsável, situação)
 * Uso: Engenheiros/ mestres de obra no canteiro para registrar o que foi planejado vs realizado.
 * Diferenciação: Não tem hierarquia, não tem Kanban/Gantt, não tem custos.
 * 
 * PLANEJAMENTO AVANÇADO (ObraPlanoPage - planos/plano_tarefas)
 * -----------------------------------------------------------
 * Sistema RICO para gestão de cronograma, custos e execução.
 * Tabelas: planos + plano_tarefas (hierárquicas, Kanban, Gantt, custos MO, Google Calendar)
 * Uso: Gestores/planejadores para cronograma físico-financeiro completo.
 */

interface Plan { id: string; descricao: string; data_planejada_original: string; data_planejada_atual: string; data_conclusao_real: string | null; responsavel: string | null; situacao: string; }

export default function PlanejamentoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);

  const [desc, setDesc] = useState('');
  const [dataOrig, setDataOrig] = useState('');
  const [dataAtual, setDataAtual] = useState('');
  const [resp, setResp] = useState('');

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId).then(setPropostas); else setPropostas([]); }, [obraId]);
  useEffect(() => { if (propostaId) ServicosService.listByProposta(propostaId).then(setServicos); else setServicos([]); }, [propostaId]);
  useEffect(() => { if (obraId) loadPlans(); }, [obraId, propostaId, servicoId]);

  const loadPlans = async () => {
    let q = supabase.from('orv_planejamentos' as any).select('*').eq('obra_id', obraId);
    if (propostaId) q = q.eq('proposta_id', propostaId);
    if (servicoId) q = q.eq('servico_id', servicoId);
    const { data } = await q.order('data_planejada_original');
    setPlans((data || []) as Plan[]);
  };

  const add = async () => {
    if (!obraId || !desc.trim() || !dataOrig) return;
    await supabase.from('orv_planejamentos' as any).insert({
      obra_id: obraId, proposta_id: propostaId || null, servico_id: servicoId || null,
      descricao: desc, data_planejada_original: dataOrig, data_planejada_atual: dataAtual || dataOrig, responsavel: resp || null, situacao: 'planejado',
    });
    setDesc(''); setDataOrig(''); setDataAtual(''); setResp('');
    loadPlans();
  };

  const updatePrev = async (p: Plan, nova: string, motivo: string) => {
    await supabase.from('orv_revisoes_planejamento' as any).insert({
      planejamento_id: p.id, data_anterior: p.data_planejada_atual, data_nova: nova, motivo, responsavel: 'usuario',
    });
    await supabase.from('orv_planejamentos' as any).update({ data_planejada_atual: nova, justificativa_reprogramacao: motivo }).eq('id', p.id);
    loadPlans();
  };

  const concluir = async (p: Plan) => {
    await supabase.from('orv_planejamentos' as any).update({ data_conclusao_real: new Date().toISOString().slice(0,10), situacao: 'concluido' }).eq('id', p.id);
    loadPlans();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Planejamento</h1>
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
        <CardHeader><CardTitle>Nova atividade planejada</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid md:grid-cols-3 gap-2">
            <Input type="date" placeholder="Data planejada original" value={dataOrig} onChange={(e) => setDataOrig(e.target.value)} />
            <Input type="date" placeholder="Data planejada atual" value={dataAtual} onChange={(e) => setDataAtual(e.target.value)} />
            <Input placeholder="Responsável" value={resp} onChange={(e) => setResp(e.target.value)} />
          </div>
          <Button onClick={add}>Adicionar</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Atividades ({plans.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="p-3 border rounded space-y-1">
              <div className="font-medium text-sm">{p.descricao}</div>
              <div className="text-xs text-muted-foreground">
                Original: {p.data_planejada_original} · Atual: {p.data_planejada_atual} · {p.situacao}
                {p.data_conclusao_real ? ` · Concluído em ${p.data_conclusao_real}` : ''}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Input type="date" className="w-40" defaultValue={p.data_planejada_atual} onBlur={(e) => { if (e.target.value && e.target.value !== p.data_planejada_atual) { const m = prompt('Motivo da reprogramação:'); if (m) updatePrev(p, e.target.value, m); } }} />
                <Button size="sm" variant="outline" onClick={() => concluir(p)} disabled={!!p.data_conclusao_real}>Concluir</Button>
              </div>
            </div>
          ))}
          {plans.length === 0 && <p className="text-muted-foreground text-sm">Selecione uma obra.</p>}
        </CardContent>
      </Card>
    </div>
  );
}