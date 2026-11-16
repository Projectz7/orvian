import { useEffect, useState } from 'react';
import { ObrasService, PropostasService, ServicosService, ElementosService, EtapasService, AtividadesService } from '@/lib/orvianService';
import type { Obra, Proposta, Servico, Elemento, Etapa } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function LancamentoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [elementoId, setElementoId] = useState('');
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [etapaId, setEtapaId] = useState('');

  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    ObrasService.list(empresaId).then(setObras).catch((e) => setErr('Erro ao carregar obras: ' + (e?.message || e)));
  }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId, empresaId).then(setPropostas); else setPropostas([]); }, [obraId, empresaId]);
  useEffect(() => { if (propostaId) ServicosService.listByProposta(propostaId, empresaId).then(setServicos); else setServicos([]); }, [propostaId, empresaId]);
  useEffect(() => { if (servicoId) { ElementosService.listByServico(servicoId, empresaId).then(setElementos); EtapasService.listByServico(servicoId, empresaId).then(setEtapas); } else { setElementos([]); setEtapas([]); } }, [servicoId, empresaId]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await AtividadesService.create({
        obra_id: obraId || null,
        proposta_id: propostaId || null,
        servico_id: servicoId || null,
        elemento_id: elementoId || null,
        etapa_id: etapaId || null,
        data,
        descricao,
        quantidade: quantidade ? Number(quantidade) : null,
        responsavel: responsavel || null,
        status_etapa: 'atividade_registrada',
      });
      setMsg('Atividade registrada.');
      setDescricao(''); setQuantidade('');
    } catch (e: any) { setMsg('Erro: ' + (e.message || e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Lançar Atividade</h1>
      <Card>
        <CardHeader><CardTitle>Novo lançamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <select className="border rounded p-2" value={obraId} onChange={(e) => { setObraId(e.target.value); setPropostaId(''); setServicoId(''); }}>
              <option value="">Obra</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={propostaId} onChange={(e) => { setPropostaId(e.target.value); setServicoId(''); }}>
              <option value="">Proposta</option>
              {propostas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={servicoId} onChange={(e) => { setServicoId(e.target.value); setElementoId(''); setEtapaId(''); }}>
              <option value="">Serviço</option>
              {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={elementoId} onChange={(e) => setElementoId(e.target.value)}>
              <option value="">Elemento (opcional)</option>
              {elementos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <select className="border rounded p-2" value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
              <option value="">Etapa (opcional)</option>
              {etapas.map((e) => <option key={e.id} value={e.id}>{e.ordem}. {e.nome}</option>)}
            </select>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <Textarea placeholder="Descrição do que foi executado" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Quantidade" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            <Input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}