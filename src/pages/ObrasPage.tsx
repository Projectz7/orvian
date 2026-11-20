import { useEffect, useState } from 'react';
import { ObrasService, ServicosObraService } from '@/lib/orvianService';
import { useAuth } from '@/context/AuthContext';
import type { Obra, Servico } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2 } from 'lucide-react';

export default function ObrasPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [selected, setSelected] = useState<Obra | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);

  const load = async () => { try { setObras(await ObrasService.list(empresaId)); } catch (e) { console.error(e); } };
  useEffect(() => { load(); }, [empresaId]);

  const addObra = async () => {
    if (!nome.trim()) return;
    await ObrasService.create({ nome, cliente }, empresaId);
    setNome(''); setCliente('');
    load();
  };

  const openObra = async (o: Obra) => {
    setSelected(o);
    setServicos(await ServicosObraService.listByObraId(empresaId, o.id));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Obras e Serviços</h1>
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
              <button key={o.id} onClick={() => openObra(o)}
                className={`w-full text-left p-2 rounded border ${selected?.id === o.id ? 'bg-slate-100' : ''}`}>
                <div className="font-medium">{o.nome || 'Obra sem título'}</div>
                <div className="text-xs text-muted-foreground">{o.cliente}</div>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Serviços {selected ? `— ${selected.nome}` : ''}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {selected && (servicos.length ? servicos.map((s) => (
              <div key={s.id} className="p-2 border rounded flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <div><div className="font-medium text-sm">{s.nome}</div><div className="text-xs text-muted-foreground">{s.descricao}</div></div>
              </div>
            )) : <p className="text-sm text-muted-foreground">Sem serviços aprovados no PreciCalc/DiGest.</p>)}
            {!selected && <p className="text-muted-foreground text-sm">Selecione uma obra.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}