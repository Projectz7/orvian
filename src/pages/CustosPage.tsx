import { useEffect, useState } from 'react';
import { ObrasService, CustosService, PropostasService, ServicosService } from '@/lib/orvianService';
import type { Obra } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const NATUREZAS_SUGERIDAS = [
  'MÃO DE OBRA', 'CUSTO VIAGENS COLABORADORES', 'EPI', 'SERVIÇO LAVANDERIA',
  'TRANSPORTE', 'COMUNICAÇÃO MÓVEL', 'CURSO', 'CONSUMÍVEIS', 'MOB E DESMOB',
  'ÁGUA PARA BEBER', 'TRANSLADO', 'ADVOGADO', 'SEGURO DE OBRA',
];

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CustosPage() {
  const { empresaId } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [servicos, setServicos] = useState<any[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [custos, setCustos] = useState<any[]>([]);
  const [reais, setReais] = useState<any[]>([]);
  const [novo, setNovo] = useState({ natureza: '', valor_mensal: '', quantidade: '1' });

  useEffect(() => { ObrasService.list(empresaId).then(setObras); }, [empresaId]);
  useEffect(() => {
    if (obraId) {
      PropostasService.listByObra(obraId, empresaId).then(async (props) => {
        const todos: any[] = [];
        for (const p of props) todos.push(...await ServicosService.listByProposta(p.id, empresaId));
        setServicos(todos);
      });
    } else setServicos([]);
  }, [obraId, empresaId]);

  const load = async () => {
    if (!obraId) return;
    const [c, r] = await Promise.all([CustosService.list(empresaId, obraId), CustosService.reais(empresaId, obraId)]);
    setCustos(c); setReais(r);
  };
  useEffect(() => { load(); }, [obraId, empresaId]);

  const add = async () => {
    if (!obraId || !novo.natureza.trim()) return;
    const mensal = Number(novo.valor_mensal) || 0;
    const qtd = Number(novo.quantidade) || 1;
    await CustosService.create({ obra_id: obraId, servico_id: servicoId || null, natureza: novo.natureza.trim(), valor_mensal: mensal, quantidade: qtd, valor_total: mensal * qtd }, empresaId);
    setNovo({ natureza: '', valor_mensal: '', quantidade: '1' });
    load();
  };

  const addSugestoes = async () => {
    if (!obraId) return;
    for (const natureza of NATUREZAS_SUGERIDAS) {
      await CustosService.create({ obra_id: obraId, servico_id: servicoId || null, natureza, valor_mensal: 0, quantidade: 1, valor_total: 0 }, empresaId);
    }
    load();
  };

  const edit = async (c: any, patch: any) => {
    const mensal = patch.valor_mensal !== undefined ? Number(patch.valor_mensal) || 0 : Number(c.valor_mensal);
    const qtd = patch.quantidade !== undefined ? Number(patch.quantidade) || 1 : Number(c.quantidade);
    await CustosService.update(c.id, { ...patch, valor_mensal: mensal, quantidade: qtd, valor_total: mensal * qtd });
    setCustos(custos.map((x) => x.id === c.id ? { ...x, ...patch, valor_mensal: mensal, quantidade: qtd, valor_total: mensal * qtd } : x));
  };

  const totalProjetado = custos.reduce((s, c) => s + Number(c.valor_total || 0), 0);
  const totalGasto = reais.reduce((s, r) => s + Number(r.valor || 0), 0);
  const saldo = totalProjetado - totalGasto;

  // Comparação por natureza (projetado vs gasto no DiGest)
  const naturezas = Array.from(new Set([...custos.map((c) => c.natureza), ...reais.map((r) => r.natureza)]));
  const comparativo = naturezas.map((n) => ({
    nome: n.length > 18 ? n.slice(0, 18) + '…' : n,
    projetado: custos.filter((c) => c.natureza === n).reduce((s, c) => s + Number(c.valor_total || 0), 0),
    gasto: reais.filter((r) => r.natureza === n).reduce((s, r) => s + Number(r.valor || 0), 0),
  }));

  const obra = obras.find((o) => o.id === obraId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Custos do Projeto</h1>
      <div className="grid md:grid-cols-2 gap-2">
        <select className="border rounded p-2" value={obraId} onChange={(e) => { setObraId(e.target.value); setServicoId(''); }}>
          <option value="">Selecione a obra</option>
          {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select className="border rounded p-2" value={servicoId} onChange={(e) => setServicoId(e.target.value)} disabled={!servicos.length}>
          <option value="">Obra toda (ou vincular a um serviço)</option>
          {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {!obraId && <p className="text-muted-foreground text-sm">Selecione uma obra para ver e cadastrar os custos.</p>}

      {obraId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><Wallet className="w-4 h-4 text-muted-foreground" /><div className="text-xl font-bold">{brl(totalProjetado)}</div><div className="text-xs text-muted-foreground">Projetado</div></CardContent></Card>
            <Card><CardContent className="p-4"><TrendingDown className="w-4 h-4 text-red-500" /><div className="text-xl font-bold">{brl(totalGasto)}</div><div className="text-xs text-muted-foreground">Investido (DiGest)</div></CardContent></Card>
            <Card><CardContent className="p-4"><Scale className="w-4 h-4 text-muted-foreground" /><div className={`text-xl font-bold ${saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{brl(saldo)}</div><div className="text-xs text-muted-foreground">Saldo</div></CardContent></Card>
            <Card><CardContent className="p-4"><TrendingUp className="w-4 h-4 text-emerald-500" /><div className="text-xl font-bold">{totalProjetado ? ((saldo / totalProjetado) * 100).toFixed(1) : '0'}%</div><div className="text-xs text-muted-foreground">Resultado</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Natureza de custos — {obra?.nome}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Input placeholder="Natureza" value={novo.natureza} onChange={(e) => setNovo({ ...novo, natureza: e.target.value })} className="max-w-xs" />
                <Input type="number" placeholder="Valor mensal" value={novo.valor_mensal} onChange={(e) => setNovo({ ...novo, valor_mensal: e.target.value })} className="w-36" />
                <Input type="number" placeholder="Qtd" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} className="w-20" />
                <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
                <Button variant="outline" size="sm" onClick={addSugestoes}>Carregar naturezas padrão</Button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="py-2">Natureza</th><th>Valor mensal</th><th>Qtd</th><th>Valor total</th><th></th></tr></thead>
                <tbody>
                  {custos.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-1 pr-2"><Input value={c.natureza} onChange={(e) => edit(c, { natureza: e.target.value })} className="h-8" /></td>
                      <td><Input type="number" value={c.valor_mensal} onChange={(e) => edit(c, { valor_mensal: e.target.value })} className="h-8 w-32" /></td>
                      <td><Input type="number" value={c.quantidade} onChange={(e) => edit(c, { quantidade: e.target.value })} className="h-8 w-20" /></td>
                      <td className="font-medium">{brl(Number(c.valor_total))}</td>
                      <td><button onClick={() => CustosService.remove(c.id).then(load)} className="text-destructive"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {custos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum custo projetado. Use as naturezas padrão para começar.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Projetado × Investido por natureza</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparativo} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="nome" width={115} />
                    <Tooltip formatter={(v: any) => brl(Number(v))} /><Legend />
                    <Bar dataKey="projetado" name="Projetado" fill="#0ea5e9" />
                    <Bar dataKey="gasto" name="Investido" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Lançamentos reais (DiGest)</CardTitle></CardHeader>
            <CardContent>
              {reais.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lançamento de saída encontrado no DiGest para esta obra.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2">Data</th><th>Natureza</th><th>Descrição</th><th>Valor</th></tr></thead>
                  <tbody>{reais.slice(0, 100).map((r) => (
                    <tr key={r.id} className="border-b"><td className="py-1">{r.data}</td><td>{r.natureza}</td><td>{r.descricao}</td><td>{brl(r.valor)}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}