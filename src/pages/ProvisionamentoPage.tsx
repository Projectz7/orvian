import { useEffect, useState } from 'react';
import { ObrasService, CustosService } from '@/lib/orvianService';
import { supabase } from '@/integrations/supabase/client';
import type { Obra } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, CalendarRange, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type Item = { id: string; natureza: string; descricao: string; valor: number; meses: number };
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function mesesDoProjeto(obra: Obra | null): string[] {
  if (!obra?.data_inicio) return [];
  const inicio = new Date(obra.data_inicio);
  const fim = obra.previsao_conclusao ? new Date(obra.previsao_conclusao) : new Date(inicio.getFullYear(), inicio.getMonth() + 6, 1);
  const meses: string[] = [];
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (d <= fim && meses.length < 120) {
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    d.setMonth(d.getMonth() + 1);
  }
  return meses;
}

export default function ProvisionamentoPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [itens, setItens] = useState<Item[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [novo, setNovo] = useState({ natureza: '', descricao: '', valor: '', meses: '' });

  const obra = obras.find((o) => o.id === obraId) || null;
  const meses = mesesDoProjeto(obra);

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  const load = async () => {
    if (!obraId) return;
    const l = await CustosService.reais(empresaId, obraId);
    setLancamentos(l.filter((x) => x.provisionado > 0));
  };
  useEffect(() => { load(); }, [obraId, empresaId]);

  const add = () => {
    const valor = Number(novo.valor) || 0;
    const qtd = Number(novo.meses) || meses.length || 1;
    if (!novo.natureza.trim() || valor <= 0) return;
    setItens([...itens, { id: Date.now().toString(), natureza: novo.natureza.trim(), descricao: novo.descricao || novo.natureza, valor, meses: qtd }]);
    setNovo({ natureza: '', descricao: '', valor: '', meses: '' });
  };

  const gerar = async () => {
    if (!empresaId || !obraId || itens.length === 0) return;
    for (const item of itens) {
      const valorMensal = item.valor / item.meses;
      for (let i = 0; i < item.meses; i++) {
        const data = meses[i] || new Date(new Date().getFullYear(), new Date().getMonth() + i, 1).toISOString().slice(0, 10);
        await CustosService.lanarProvisionamento(empresaId, obraId, item.natureza, `${item.descricao} (${i + 1}/${item.meses})`, valorMensal, data);
      }
    }
    await load();
    alert(`${itens.length} item(ns) provisionado(s) no fluxo de caixa em até ${Math.max(...itens.map((i) => i.meses))} mês(es).`);
  };

  const removerLancamento = async (id: string) => {
    await supabase.from('lancamentos_caixa' as any).delete().eq('id', id);
    load();
  };

  const totalProvisionado = lancamentos.reduce((s, l) => s + Number(l.provisionado || 0), 0);
  const porMes: Record<string, number> = {};
  lancamentos.forEach((l) => { const m = String(l.data).slice(0, 7); porMes[m] = (porMes[m] || 0) + Number(l.provisionado || 0); });
  const grafico = Object.keys(porMes).sort().map((m) => ({ mes: m.slice(5) + '/' + m.slice(0, 4), provisionado: Math.round(porMes[m]) }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Provisionamento</h1>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        Selecione a obra — o período do projeto (início até previsão de conclusão) define os meses. Informe descrição, valor total e duração; o valor é dividido automaticamente e lançado no fluxo de caixa como provisionamento.
      </div>
      <select className="border rounded p-2 w-full md:w-96" value={obraId} onChange={(e) => setObraId(e.target.value)}>
        <option value="">Selecione a obra</option>
        {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>

      {obra && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <CalendarRange className="w-4 h-4" /> Período: {obra.data_inicio?.slice(0,10) || '—'} até {obra.previsao_conclusao?.slice(0,10) || '—'} · {meses.length} mês(es)
        </p>
      )}

      {obraId && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Novo item de provisionamento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Natureza (ex: MÃO DE OBRA)" value={novo.natureza} onChange={(e) => setNovo({ ...novo, natureza: e.target.value })} className="max-w-xs" />
                <Input placeholder="Descrição" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} className="max-w-xs" />
                <Input type="number" placeholder="Valor total" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} className="w-36" />
                <Input type="number" placeholder={`Meses (padrão ${meses.length || 1})`} value={novo.meses} onChange={(e) => setNovo({ ...novo, meses: e.target.value })} className="w-36" />
                <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
              </div>
              {itens.length > 0 && (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left"><th className="py-2">Natureza</th><th>Descrição</th><th>Valor total</th><th>Meses</th><th>Mensal</th><th></th></tr></thead>
                    <tbody>{itens.map((i) => (
                      <tr key={i.id} className="border-b">
                        <td>{i.natureza}</td><td>{i.descricao}</td><td>{brl(i.valor)}</td><td>{i.meses}</td>
                        <td>{brl(i.valor / i.meses)}</td>
                        <td><button onClick={() => setItens(itens.filter((x) => x.id !== i.id))} className="text-destructive"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                  <Button onClick={gerar} className="w-full"><Wallet className="w-4 h-4 mr-2" /> Gerar provisionamento no fluxo de caixa</Button>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-4"><div className="text-xl font-bold">{brl(totalProvisionado)}</div><div className="text-xs text-muted-foreground">Total provisionado no caixa</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xl font-bold">{lancamentos.length}</div><div className="text-xs text-muted-foreground">Lançamentos gerados</div></CardContent></Card>
          </div>

          {grafico.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Provisionamento por mês</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={grafico}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis />
                      <Tooltip formatter={(v: any) => brl(Number(v))} /><Legend />
                      <Bar dataKey="provisionado" name="Provisionado" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {lancamentos.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Lançamentos de provisionamento</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2">Data</th><th>Natureza</th><th>Descrição</th><th>Provisionado</th><th></th></tr></thead>
                  <tbody>{lancamentos.slice(0, 100).map((l) => (
                    <tr key={l.id} className="border-b"><td className="py-1">{String(l.data).slice(0,10)}</td><td>{l.natureza}</td><td>{l.descricao}</td>
                      <td>{brl(l.provisionado)}</td><td><button onClick={() => removerLancamento(l.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button></td></tr>
                  ))}</tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
