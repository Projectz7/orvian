import { useEffect, useState } from 'react';
import { AtividadesService } from '@/lib/orvianService';
import type { Atividade } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function DiarioPage() {
  const { empresaId } = useAuth();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  useEffect(() => { AtividadesService.list(200, empresaId).then(setAtividades); }, [empresaId]);

  const grouped: Record<string, Atividade[]> = {};
  atividades.forEach((a) => { (grouped[a.data] = grouped[a.data] || []).push(a); });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Diário de Obras</h1>
      {Object.keys(grouped).sort().reverse().map((d) => (
        <Card key={d}>
          <CardHeader><CardTitle>{new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {grouped[d].map((a) => (
              <div key={a.id} className="p-2 border rounded text-sm">
                <div className="font-medium">{a.descricao}</div>
                <div className="text-xs text-muted-foreground">{a.responsavel} · {a.quantidade ?? ''} {a.unidade ?? ''}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {atividades.length === 0 && <p className="text-muted-foreground">Nenhum registro.</p>}
    </div>
  );
}