import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ConfiguracoesPage() {
  const { empresaId } = useAuth();
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!empresaId) return;
    supabase.from('empresa' as any).select('nome, cnpj, dono_email').eq('id', empresaId).maybeSingle().then(({ data }) => {
      if (data) setNome(data.nome || '');
    });
  }, [empresaId]);

  const save = async () => {
    if (!empresaId) return;
    setSaving(true);
    const { error } = await supabase.from('empresa' as any).update({ nome }).eq('id', empresaId);
    setSaving(false);
    setMsg(error ? 'Erro: ' + error.message : 'Salvo.');
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card>
        <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Nome da empresa" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          {msg && <p className="text-sm">{msg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}