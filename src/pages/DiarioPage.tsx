import { useEffect, useState } from 'react';
import { AtividadesService, DiariosService } from '@/lib/orvianService';
import type { Atividade } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function DiarioPage() {
  const { empresaId } = useAuth();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  useEffect(() => {
    AtividadesService.list(200, empresaId).then(setAtividades);
    DiariosService.list(empresaId).then(setDiarios);
  }, [empresaId]);

  const grouped: Record<string, Atividade[]> = {};
  atividades.forEach((a) => { (grouped[a.data] = grouped[a.data] || []).push(a); });
  diarios.forEach((d) => {
    grouped[d.data] = grouped[d.data] || [];
    grouped[d.data].push({
      id: d.id, data: d.data, descricao: d.descricao, responsavel: d.responsaveis,
      observacoes: d.observacoes_finais, situacao: d.situacao,
    } as Atividade);
  });

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
      {atividades.length === 0 && diarios.length === 0 && <p className="text-muted-foreground">Nenhum registro.</p>}
    </div>
  );
}