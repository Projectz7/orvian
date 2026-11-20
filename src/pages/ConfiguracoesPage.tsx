import { useEffect, useState } from 'react';
import { EmpresaService, ConfigService } from '@/lib/orvianService';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Building2, SlidersHorizontal, ExternalLink } from 'lucide-react';

export default function ConfiguracoesPage() {
  const { empresaId } = useAuth();
  const [empresa, setEmpresa] = useState<any>(null);
  const [config, setConfig] = useState<any>({ tema: 'claro', exibir_avancos: true, observacoes: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { EmpresaService.get(empresaId).then(setEmpresa); }, [empresaId]);
  useEffect(() => { if (empresaId) ConfigService.get(empresaId, 'orvian_config').then((c) => { if (c) setConfig(c); }); }, [empresaId]);

  const salvar = async () => {
    if (!empresaId) return;
    await ConfigService.set(empresaId, 'orvian_config', config);
    setMsg('Configurações específicas do ORVIAN salvas.');
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Dados da Empresa</CardTitle>
          <p className="text-xs text-muted-foreground">Gerenciados na P7Store — altere lá para refletir em todos os apps.</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid md:grid-cols-2 gap-3">
            <div><div className="text-xs text-muted-foreground">Nome</div><div className="font-medium">{empresa?.nome || '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">CNPJ</div><div className="font-medium">{empresa?.cnpj || '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">E-mail do dono</div><div className="font-medium">{empresa?.dono_email || '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">Telefone</div><div className="font-medium">{empresa?.telefone || '—'}</div></div>
            <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Endereço</div><div className="font-medium">{empresa?.endereco || '—'}</div></div>
          </div>
          <a href="https://p7store.vercel.app/settings" target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2">
            Abrir configurações na P7Store <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Configurações específicas do ORVIAN</CardTitle>
          <p className="text-xs text-muted-foreground">Preferências deste app — não afetam os outros apps do ecossistema.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.exibir_avancos} onChange={(e) => setConfig({ ...config, exibir_avancos: e.target.checked })} />
            Exibir avanços no painel inicial
          </label>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Modo de exibição</div>
            <select className="border rounded p-2 w-full md:w-64" value={config.tema} onChange={(e) => setConfig({ ...config, tema: e.target.value })}>
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
            </select>
          </div>
          <Textarea placeholder="Observações internas" value={config.observacoes} onChange={(e) => setConfig({ ...config, observacoes: e.target.value })} />
          <Button onClick={salvar}>Salvar configurações do ORVIAN</Button>
          {msg && <p className="text-sm text-emerald-700">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}