import { useEffect, useState } from 'react';
import { ObrasService, PropostasService } from '@/lib/orvianService';
import { useAuth } from '@/context/AuthContext';
import type { Obra, Proposta } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

const titulo = (o: Obra) => o.nome || 'Obra sem título';

export default function ObrasPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [selected, setSelected] = useState<Obra | null>(null);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propNome, setPropNome] = useState('');

  const load = async () => { try { setObras(await ObrasService.list(empresaId)); } catch (e) { console.error(e); } };
  useEffect(() => { load(); }, [empresaId]);

  const addObra = async () => {
    if (!nome.trim()) return;
    await ObrasService.create({ nome, cliente }, empresaId);
    setNome(''); setCliente('');
    load();
  };

  const delObra = async (_id: string) => { /* obras compartilhadas não são excluídas pelo ORVIAN */ };

  const openObra = async (o: Obra) => {
    setSelected(o);
    setPropostas(await PropostasService.listByObra(o.id, empresaId));
  };

  const addProposta = async () => {
    if (!selected || !propNome.trim()) return;
    await PropostasService.create({ obra_id: selected.id, nome: propNome }, empresaId);
    setPropNome('');
    setPropostas(await PropostasService.listByObra(selected.id, empresaId));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Obras e Propostas</h1>
      <Card>
        <CardHeader><CardTitle>Nova Obra</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input placeholder="Nome da obra" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <Button onClick={addObra}><Plus className="w-4 h-4 mr-1" /> Criar</Button>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Obras ({obras.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {obras.map((o) => (
              <div key={o.id} className={`flex items-center justify-between p-2 rounded border ${selected?.id === o.id ? 'bg-slate-100' : ''}`}>
                <button className="text-left flex-1" onClick={() => openObra(o)}>
                  <div className="font-medium">{titulo(o)}</div>
                  <div className="text-xs text-muted-foreground">{o.cliente}</div>
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Propostas {selected ? `— ${titulo(selected)}` : ''}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {selected && (
              <>
                <div className="flex gap-2">
                  <Input placeholder="Nome da proposta" value={propNome} onChange={(e) => setPropNome(e.target.value)} />
                  <Button onClick={addProposta}><Plus className="w-4 h-4" /></Button>
                </div>
                {propostas.map((p) => (
                  <div key={p.id} className="p-2 rounded border">
                    <div className="font-medium">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">{p.situacao}</div>
                  </div>
                ))}
              </>
            )}
            {!selected && <p className="text-muted-foreground text-sm">Selecione uma obra.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}