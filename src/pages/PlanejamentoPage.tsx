import { useEffect, useState } from 'react';
import { ObrasService, PropostasService, ServicosService, PlanejamentosService } from '@/lib/orvianService';
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
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId, empresaId).then(setPropostas); else setPropostas([]); }, [obraId, empresaId]);
  useEffect(() => { if (propostaId) ServicosService.listByProposta(propostaId, empresaId).then(setServicos); else setServicos([]); }, [propostaId, empresaId]);
  useEffect(() => { if (obraId) loadPlans(); }, [obraId, propostaId, servicoId]);

  const loadPlans = async () => {
    const data = await PlanejamentosService.list(empresaId, obraId);
    const filtrados = data.filter((d: any) => (!propostaId || d.proposta_id === propostaId) && (!servicoId || d.servico_id === servicoId));
    setPlans(filtrados.map((d: any) => ({
      id: d.id, descricao: d.titulo || d.descricao, data_planejada_original: d.data_planejada_original,
      data_planejada_atual: d.data_planejada_atual, data_conclusao_real: d.data_fim_real || null,
      responsavel: d.responsavel_id || null, situacao: d.status,
    })));
  };

  const add = async () => {
    if (!obraId || !desc.trim() || !dataOrig) return;
    await PlanejamentosService.create({
      descricao: desc, data_planejada_original: dataOrig, data_planejada_atual: dataAtual || dataOrig,
      responsavel_id: resp || null, situacao: 'planejado', proposta_id: propostaId || null, servico_id: servicoId || null,
    }, empresaId, obraId);
    setDesc(''); setDataOrig(''); setDataAtual(''); setResp('');
    loadPlans();
  };

  const updatePrev = async (p: Plan, nova: string, motivo: string) => {
    await PlanejamentosService.registrarRevisao(p.id, {
      data_anterior: p.data_planejada_atual, data_nova: nova, motivo, responsavel: 'usuario', data_revisao: new Date().toISOString(),
    });
    loadPlans();
  };

  const concluir = async (p: Plan) => {
    await PlanejamentosService.update(p.id, { data_fim_real: new Date().toISOString().slice(0,10), status: 'concluida' });
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