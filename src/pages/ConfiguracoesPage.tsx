import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Settings, Building2, Users, Shield, Database, Wrench, Palette, Key, Save, Loader2, Eye, EyeOff,
  Trash2, Download, RefreshCw, Info
} from 'lucide-react';

interface Configuracao {
  id: string;
  empresa_id: string;
  chave: string;
  valor: any;
  descricao: string;
  created_at: string;
  updated_at: string;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logo_url: string;
  cor_primaria: string;
  cor_secundaria: string;
  dono_id: string;
  created_at: string;
}

export default function ConfiguracoesPage() {
  const { empresaId, funcionario, user, isDonoOuGerente } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [configs, setConfigs] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'empresa' | 'app' | 'integracoes' | 'avancado'>('empresa');

  // Form states
  const [formEmpresa, setFormEmpresa] = useState<Partial<Empresa>>({});
  const [formConfigs, setFormConfigs] = useState<Record<string, any>>({});
  const [showPassword, setShowPassword] = useState(false);

  const isAdmin = isDonoOuGerente;

  useEffect(() => {
    (async () => {
      if (!empresaId) { setLoading(false); return; }
      setLoading(true);
      try {
        // Buscar empresa
        const { data: empData, error: empErr } = await supabase
          .from('empresa')
          .select('*')
          .eq('id', empresaId)
          .single();
        if (empErr) throw empErr;
        setEmpresa(empData);
        setFormEmpresa({
          nome: empData.nome,
          cnpj: empData.cnpj,
          endereco: empData.endereco,
          telefone: empData.telefone,
          email: empData.email,
          cor_primaria: empData.cor_primaria || '#3b82f6',
          cor_secundaria: empData.cor_secundaria || '#64748b',
        });

        // Buscar configurações
        const { data: cfgData, error: cfgErr } = await supabase
          .from('orv_configuracoes')
          .select('*')
          .eq('empresa_id', empresaId);
        if (cfgErr) throw cfgErr;
        setConfigs(cfgData || []);
        
        // Popular formConfigs
        const cfgMap: Record<string, any> = {};
        (cfgData || []).forEach((c) => {
          cfgMap[c.chave] = c.valor;
        });
        setFormConfigs(cfgMap);
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaId]);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('empresa.')) {
      const key = field.replace('empresa.', '');
      setFormEmpresa((prev) => ({ ...prev, [key]: value }));
    } else {
      setFormConfigs((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveEmpresa = async () => {
    if (!empresaId || !isAdmin) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('empresa')
        .update({
          ...formEmpresa,
          updated_at: new Date().toISOString(),
        })
        .eq('id', empresaId);
      if (error) throw error;
      toast.success('Empresa atualizada com sucesso');
      // Recarregar
      const { data } = await supabase.from('empresa').select('*').eq('id', empresaId).single();
      if (data) setEmpresa(data);
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfigs = async () => {
    if (!empresaId || !isAdmin) return;
    setSaving(true);
    try {
      const upserts = Object.entries(formConfigs).map(([chave, valor]) => ({
        empresa_id: empresaId,
        chave,
        valor,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('orv_configuracoes')
        .upsert(upserts, { onConflict: 'empresa_id,chave' });
      if (error) throw error;
      toast.success('Configurações salvas com sucesso');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportConfigs = async () => {
    const blob = new Blob([JSON.stringify({ empresa, configs: formConfigs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orvian-config-${empresaId?.slice(0,8)}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Configurações exportadas');
  };

  const handleImportConfigs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.configs) {
        setFormConfigs((prev) => ({ ...prev, ...data.configs }));
        toast.success('Configurações importadas — clique em Salvar para persistir');
      }
    } catch {
      toast.error('Arquivo inválido');
    }
    e.target.value = '';
  };

  const handleResetConfigs = async () => {
    if (!confirm('Restaurar configurações padrão? Isso não apaga dados de obras.')) return;
    try {
      const defaults = {
        'tema': 'light',
        'notificacoes_email': true,
        'notificacoes_push': false,
        'idioma': 'pt-BR',
        'moeda': 'BRL',
        'formato_data': 'DD/MM/YYYY',
        'primeiro_dia_semana': 1,
        'backup_automatico': false,
        'log_auditoria': true,
      };
      setFormConfigs(defaults);
      toast.success('Padrões restaurados — clique em Salvar');
    } catch {
      toast.error('Erro ao restaurar');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const configsApp = [
    { chave: 'tema', label: 'Tema', tipo: 'select', options: ['light', 'dark', 'system'], desc: 'Aparência da interface' },
    { chave: 'idioma', label: 'Idioma', tipo: 'select', options: ['pt-BR', 'en-US', 'es-ES'], desc: 'Idioma padrão do sistema' },
    { chave: 'moeda', label: 'Moeda', tipo: 'select', options: ['BRL', 'USD', 'EUR'], desc: 'Moeda para valores monetários' },
    { chave: 'formato_data', label: 'Formato de Data', tipo: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], desc: 'Formato de exibição de datas' },
    { chave: 'primeiro_dia_semana', label: 'Primeiro Dia da Semana', tipo: 'select', options: [0, 1, 6], optionLabels: {0: 'Domingo', 1: 'Segunda-feira', 6: 'Sábado'}, desc: 'Início da semana no calendário' },
    { chave: 'notificacoes_email', label: 'Notificações por Email', tipo: 'boolean', desc: 'Receber alertas por email' },
    { chave: 'notificacoes_push', label: 'Notificações Push', tipo: 'boolean', desc: 'Receber notificações no navegador' },
    { chave: 'backup_automatico', label: 'Backup Automático', tipo: 'boolean', desc: 'Gerar backup diário dos dados' },
    { chave: 'log_auditoria', label: 'Log de Auditoria', tipo: 'boolean', desc: 'Registrar todas as alterações' },
  ];

  const configsIntegracoes = [
    { chave: 'google_calendar_enabled', label: 'Google Calendar', tipo: 'boolean', desc: 'Sincronizar tarefas com Google Calendar' },
    { chave: 'google_calendar_client_id', label: 'Client ID', tipo: 'password', desc: 'OAuth Client ID do Google Cloud' },
    { chave: 'google_calendar_client_secret', label: 'Client Secret', tipo: 'password', desc: 'OAuth Client Secret' },
    { chave: 'webhook_url', label: 'Webhook URL', tipo: 'text', desc: 'URL para receber eventos do ORVIAN' },
    { chave: 'webhook_secret', label: 'Webhook Secret', tipo: 'password', desc: 'Segredo para validar webhooks' },
  ];

  const configsAvancado = [
    { chave: 'debug_mode', label: 'Modo Debug', tipo: 'boolean', desc: 'Exibir logs detalhados no console' },
    { chave: 'max_file_size_mb', label: 'Tamanho Máx. Upload (MB)', tipo: 'number', desc: 'Limite para upload de evidências' },
    { chave: 'session_timeout_min', label: 'Timeout Sessão (min)', tipo: 'number', desc: 'Tempo de inatividade antes de expirar' },
    { chave: 'api_rate_limit', label: 'Rate Limit API (req/min)', tipo: 'number', desc: 'Limite de requisições por minuto' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-primary bg-clip-text text-transparent flex items-center gap-2">
          <Settings className="w-7 h-7" /> Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie configurações da empresa, preferências do app e integrações
          {empresaId && <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">{empresaId.slice(0,8)}...</span>}
        </p>
        {!isAdmin && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Modo somente leitura — apenas gestores e donos podem alterar configurações</span>
          </div>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresa"><Building2 className="w-4 h-4 mr-1" /> Empresa</TabsTrigger>
          <TabsTrigger value="app"><Wrench className="w-4 h-4 mr-1" /> Aplicativo</TabsTrigger>
          <TabsTrigger value="integracoes"><Database className="w-4 h-4 mr-1" /> Integrações</TabsTrigger>
          <TabsTrigger value="avancado"><Key className="w-4 h-4 mr-1" /> Avançado</TabsTrigger>
        </TabsList>

        {/* ABA EMPRESA */}
        <TabsContent value="empresa" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Dados da Empresa</CardTitle>
              <CardDescription>Informações cadastrais usadas em relatórios e documentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="nome">Nome da Empresa *</Label>
                  <Input id="nome" value={formEmpresa.nome || ''} onChange={(e) => handleInputChange('empresa.nome', e.target.value)} disabled={!isAdmin} placeholder="Ex: Construtora Alpha Ltda" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" value={formEmpresa.cnpj || ''} onChange={(e) => handleInputChange('empresa.cnpj', e.target.value)} disabled={!isAdmin} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="endereco">Endereço Completo</Label>
                  <Input id="endereco" value={formEmpresa.endereco || ''} onChange={(e) => handleInputChange('empresa.endereco', e.target.value)} disabled={!isAdmin} placeholder="Rua, número, bairro, cidade, UF, CEP" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={formEmpresa.telefone || ''} onChange={(e) => handleInputChange('empresa.telefone', e.target.value)} disabled={!isAdmin} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formEmpresa.email || ''} onChange={(e) => handleInputChange('empresa.email', e.target.value)} disabled={!isAdmin} placeholder="contato@empresa.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1">
                  <Label htmlFor="cor_primaria">Cor Primária</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="cor_primaria" value={formEmpresa.cor_primaria || '#3b82f6'} onChange={(e) => handleInputChange('empresa.cor_primaria', e.target.value)} disabled={!isAdmin} className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={formEmpresa.cor_primaria || '#3b82f6'} onChange={(e) => handleInputChange('empresa.cor_primaria', e.target.value)} disabled={!isAdmin} placeholder="#3b82f6" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cor_secundaria">Cor Secundária</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="cor_secundaria" value={formEmpresa.cor_secundaria || '#64748b'} onChange={(e) => handleInputChange('empresa.cor_secundaria', e.target.value)} disabled={!isAdmin} className="w-10 h-10 rounded border cursor-pointer" />
                    <Input value={formEmpresa.cor_secundaria || '#64748b'} onChange={(e) => handleInputChange('empresa.cor_secundaria', e.target.value)} disabled={!isAdmin} placeholder="#64748b" />
                  </div>
                </div>
              </div>
              {isAdmin && (
                <Button onClick={handleSaveEmpresa} disabled={saving} className="w-fit">
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Empresa'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info da empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">ID da Empresa</span><code className="font-mono">{empresaId?.slice(0,8)}...</code></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dono</span><span>{empresa?.dono_id?.slice(0,8)}...</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Criada em</span><span>{empresa?.created_at ? new Date(empresa.created_at).toLocaleDateString('pt-BR') : '-'}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Seu papel</span><span className="font-medium">{funcionario ? (funcionario.is_gerente ? 'Gerente' : 'Funcionário') : 'Dono'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Usuário</span><span>{user?.email || funcionario?.nome || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Autenticação</span><span className="font-medium">{funcionario ? 'Token (Funcionário)' : 'Supabase Auth (Dono/Gerente)'}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA APLICATIVO */}
        <TabsContent value="app" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Preferências do App</CardTitle>
              <CardDescription>Configurações de interface e comportamento do ORVIAN</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configsApp.map((cfg) => (
                <div key={cfg.chave} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <label className="font-medium">{cfg.label}</label>
                    <p className="text-sm text-muted-foreground">{cfg.desc}</p>
                  </div>
                  {cfg.tipo === 'select' && (
                    <select
                      value={formConfigs[cfg.chave] || cfg.options[0]}
                      onChange={(e) => handleInputChange(cfg.chave, e.target.value)}
                      disabled={!isAdmin}
                      className="px-3 py-1.5 border rounded-md bg-white text-sm min-w-[180px]"
                    >
                      {cfg.options.map((opt) => (
                        <option key={opt} value={opt}>{cfg.optionLabels?.[opt] || opt}</option>
                      ))}
                    </select>
                  )}
                  {cfg.tipo === 'boolean' && (
                    <Switch
                      checked={formConfigs[cfg.chave] === true || formConfigs[cfg.chave] === 'true'}
                      onCheckedChange={(c) => handleInputChange(cfg.chave, c)}
                      disabled={!isAdmin}
                    />
                  )}
                  {cfg.tipo === 'number' && (
                    <Input
                      type="number"
                      value={formConfigs[cfg.chave] || ''}
                      onChange={(e) => handleInputChange(cfg.chave, parseInt(e.target.value) || 0)}
                      disabled={!isAdmin}
                      className="w-24"
                    />
                  )}
                  {cfg.tipo === 'text' && (
                    <Input
                      value={formConfigs[cfg.chave] || ''}
                      onChange={(e) => handleInputChange(cfg.chave, e.target.value)}
                      disabled={!isAdmin}
                      className="w-64"
                    />
                  )}
                  {cfg.tipo === 'password' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formConfigs[cfg.chave] || ''}
                        onChange={(e) => handleInputChange(cfg.chave, e.target.value)}
                        disabled={!isAdmin}
                        className="w-64"
                      />
                      <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-4 border-t">
                {isAdmin && (
                  <Button onClick={handleSaveConfigs} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Preferências'}
                  </Button>
                )}
                <Button variant="outline" onClick={handleExportConfigs}>
                  <Download className="w-4 h-4 mr-2" /> Exportar JSON
                </Button>
                <Button variant="outline" onClick={handleResetConfigs}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Restaurar Padrões
                </Button>
              </div>
              <div className="pt-2">
                <Input type="file" accept=".json" onChange={handleImportConfigs} className="w-fit" />
                <p className="text-xs text-muted-foreground mt-1">Importar configurações de arquivo JSON exportado anteriormente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA INTEGRAÇÕES */}
        <TabsContent value="integracoes" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> Integrações Externas</CardTitle>
              <CardDescription>Configure conexões com serviços de terceiros</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configsIntegracoes.map((cfg) => (
                <div key={cfg.chave} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <label className="font-medium">{cfg.label}</label>
                    <p className="text-sm text-muted-foreground">{cfg.desc}</p>
                  </div>
                  {cfg.tipo === 'boolean' && (
                    <Switch
                      checked={formConfigs[cfg.chave] === true || formConfigs[cfg.chave] === 'true'}
                      onCheckedChange={(c) => handleInputChange(cfg.chave, c)}
                      disabled={!isAdmin}
                    />
                  )}
                  {cfg.tipo === 'text' && (
                    <Input
                      value={formConfigs[cfg.chave] || ''}
                      onChange={(e) => handleInputChange(cfg.chave, e.target.value)}
                      disabled={!isAdmin}
                      className="w-80"
                      placeholder={cfg.chave.includes('url') ? 'https://...' : ''}
                    />
                  )}
                  {cfg.tipo === 'password' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formConfigs[cfg.chave] || ''}
                        onChange={(e) => handleInputChange(cfg.chave, e.target.value)}
                        disabled={!isAdmin}
                        className="w-80"
                      />
                      <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {isAdmin && (
                <Button onClick={handleSaveConfigs} disabled={saving} className="mt-4">
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Integrações'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg"><Wrench className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <h4 className="font-medium text-amber-800">Integração com Apps do Ecossistema P7Store</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    O ORVIAN faz parte do ecossistema P7Store. As integrações com <strong>ServiFlux</strong>, <strong>DiGest</strong>, 
                    <strong>PreciCalc</strong> e <strong>SerralheiroCalc</strong> são gerenciadas automaticamente pelo hub central.
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    Para ativar/desativar apps para esta empresa, acesse o <strong>P7Store</strong> → Empresa → Apps.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA AVANÇADO */}
        <TabsContent value="avancado" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Configurações Avançadas</CardTitle>
              <CardDescription>Parâmetros técnicos — altere com cuidado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configsAvancado.map((cfg) => (
                <div key={cfg.chave} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <label className="font-medium">{cfg.label}</label>
                    <p className="text-sm text-muted-foreground">{cfg.desc}</p>
                  </div>
                  {cfg.tipo === 'boolean' && (
                    <Switch
                      checked={formConfigs[cfg.chave] === true || formConfigs[cfg.chave] === 'true'}
                      onCheckedChange={(c) => handleInputChange(cfg.chave, c)}
                      disabled={!isAdmin}
                    />
                  )}
                  {cfg.tipo === 'number' && (
                    <Input
                      type="number"
                      value={formConfigs[cfg.chave] || ''}
                      onChange={(e) => handleInputChange(cfg.chave, parseInt(e.target.value) || 0)}
                      disabled={!isAdmin}
                      className="w-24"
                    />
                  )}
                </div>
              ))}
              {isAdmin && (
                <Button onClick={handleSaveConfigs} disabled={saving} className="mt-4">
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar Avançadas'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-rose-800"><Trash2 className="w-5 h-5" /> Zona de Perigo</CardTitle>
              <CardDescription className="text-rose-700">Ações irreversíveis — use com extrema cautela</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-rose-200 rounded-lg">
                <h4 className="font-medium text-rose-800">Limpar Dados de Teste</h4>
                <p className="text-sm text-rose-700 mt-1">Remove todos os dados de obras, propostas, serviços, atividades, diários e evidências desta empresa. <strong>Não afeta usuários nem configurações.</strong></p>
                <Button variant="destructive" className="mt-3" onClick={() => alert('Função não implementada — requer Edge Function segura')}>
                  <Trash2 className="w-4 h-4 mr-2" /> Limpar Tudo (Não implementado)
                </Button>
              </div>
              <div className="p-4 border border-rose-200 rounded-lg">
                <h4 className="font-medium text-rose-800">Excluir Empresa</h4>
                <p className="text-sm text-rose-700 mt-1">Remove a empresa e TODOS os dados permanentemente. Requer confirmação no P7Store.</p>
                <Button variant="destructive" className="mt-3" onClick={() => window.open('https://p7store.vercel.app', '_blank')}>
                  Ir para P7Store
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

