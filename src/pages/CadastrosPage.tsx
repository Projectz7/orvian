import { useEffect, useState } from 'react';
import { ObrasService, PropostasService, ServicosService, ElementosService, EtapasService } from '@/lib/orvianService';
import type { Obra, Proposta, Servico, Elemento, Etapa } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CadastrosPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [elementos, setElementos] = useState<Elemento[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);

  const [servNome, setServNome] = useState('');
  const [elemNome, setElemNome] = useState('');
  const [etapaNome, setEtapaNome] = useState('');

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId, empresaId).then(setPropostas); else setPropostas([]); }, [obraId, empresaId]);
  useEffect(() => { if (propostaId) ServicosService.listByProposta(propostaId, empresaId).then(setServicos); else setServicos([]); }, [propostaId, empresaId]);
  useEffect(() => { if (servicoId) { ElementosService.listByServico(servicoId, empresaId).then(setElementos); EtapasService.listByServico(servicoId, empresaId).then(setEtapas); } else { setElementos([]); setEtapas([]); } }, [servicoId, empresaId]);

  const addServico = async () => {
    if (!propostaId || !servNome.trim()) return;
    await ServicosService.create({ proposta_id: propostaId, nome: servNome }, empresaId);
    setServNome('');
    setServicos(await ServicosService.listByProposta(propostaId, empresaId));
  };
  const addElemento = async () => {
    if (!servicoId || !elemNome.trim()) return;
    await ElementosService.create({ servico_id: servicoId, nome: elemNome }, empresaId);
    setElemNome('');
    setElementos(await ElementosService.listByServico(servicoId, empresaId));
  };
  const addEtapa = async () => {
    if (!servicoId || !etapaNome.trim()) return;
    await EtapasService.create({ servico_id: servicoId, nome: etapaNome, ordem: etapas.length + 1 }, empresaId);
    setEtapaNome('');
    setEtapas(await EtapasService.listByServico(servicoId, empresaId));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cadastros</h1>
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

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Serviços</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Novo serviço" value={servNome} onChange={(e) => setServNome(e.target.value)} />
              <Button onClick={addServico}><Plus className="w-4 h-4" /></Button>
            </div>
            {servicos.map((s) => <div key={s.id} className="p-2 border rounded text-sm">{s.nome}</div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Elementos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Novo elemento" value={elemNome} onChange={(e) => setElemNome(e.target.value)} />
              <Button onClick={addElemento} disabled={!servicoId}><Plus className="w-4 h-4" /></Button>
            </div>
            {elementos.map((e) => <div key={e.id} className="p-2 border rounded text-sm">{e.nome}</div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Etapas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Nova etapa" value={etapaNome} onChange={(e) => setEtapaNome(e.target.value)} />
              <Button onClick={addEtapa} disabled={!servicoId}><Plus className="w-4 h-4" /></Button>
            </div>
            {etapas.map((e) => <div key={e.id} className="p-2 border rounded text-sm">{e.ordem}. {e.nome}</div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}