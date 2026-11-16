import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ObrasService, PropostasService, EvidenciasService } from '@/lib/orvianService';
import type { Obra, Proposta } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function weekDays(base: Date) {
  const d = new Date(base);
  const day = d.getDay(); // 0 domingo
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    days.push(x);
  }
  return days;
}

export default function HistoricoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [propostaId, setPropostaId] = useState('');
  const [base, setBase] = useState(new Date());
  const [evids, setEvids] = useState<any[]>([]);

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => { if (obraId) PropostasService.listByObra(obraId, empresaId).then(setPropostas); }, [obraId, empresaId]);

  const days = weekDays(base);

  const loadEvids = async () => {
    if (!obraId) return;
    const start = days[0].toISOString().slice(0, 10);
    const end = days[6].toISOString().slice(0, 10);
    const data = await EvidenciasService.list(empresaId, obraId);
    setEvids((data || []).filter((e: any) => e.data >= start && e.data <= end));
  };
  useEffect(() => { loadEvids(); }, [obraId, base]);

  const upload = async (day: Date, file: File) => {
    if (!obraId) return;
    const path = `${obraId}/${day.toISOString().slice(0,10)}/${file.name}`;
    const { error: upErr } = await supabase.storage.from('orvian-evidencias').upload(path, file, { upsert: true });
    if (upErr) { alert('Erro upload: ' + upErr.message); return; }
    const { data: pub } = supabase.storage.from('orvian-evidencias').getPublicUrl(path);
    await EvidenciasService.create({
      obra_id: obraId, proposta_id: propostaId || null, url: pub.publicUrl, principal: true, data: day.toISOString().slice(0,10),
    }, empresaId);
    loadEvids();
  };

  const prev = () => { const d = new Date(base); d.setDate(d.getDate() - 7); setBase(d); };
  const next = () => { const d = new Date(base); d.setDate(d.getDate() + 7); setBase(d); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Histórico Fotográfico Semanal</h1>
      <div className="grid md:grid-cols-2 gap-2">
        <select className="border rounded p-2" value={obraId} onChange={(e) => setObraId(e.target.value)}>
          <option value="">Obra</option>
          {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select className="border rounded p-2" value={propostaId} onChange={(e) => setPropostaId(e.target.value)}>
          <option value="">Proposta</option>
          {propostas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={prev}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-medium">Semana de {days[0].toLocaleDateString('pt-BR')} a {days[6].toLocaleDateString('pt-BR')}</span>
        <Button variant="outline" size="sm" onClick={next}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((day) => {
          const ds = day.toISOString().slice(0, 10);
          const dayEvids = evids.filter((e) => e.data === ds);
          const principal = dayEvids.find((e) => e.principal) || dayEvids[0];
          return (
            <Card key={ds}>
              <CardHeader>
                <CardTitle className="text-sm">{day.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {principal ? (
                  <img src={principal.url} alt="" className="w-full h-40 object-cover rounded" />
                ) : (
                  <div className="w-full h-40 bg-slate-100 rounded flex items-center justify-center text-muted-foreground text-sm">Sem registro</div>
                )}
                <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-primary">
                  <Upload className="w-3 h-3" /> Anexar foto
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(day, f); }} />
                </label>
                {dayEvids.length > 1 && <p className="text-xs text-muted-foreground">+{dayEvids.length - 1} fotos</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}