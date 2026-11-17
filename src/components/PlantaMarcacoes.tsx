import { useState } from 'react';
import { Palette, Plus, Trash2, Move, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type Marcacao = {
  id: string;
  nome: string;
  cor: string;
  x: number;   // % na imagem
  y: number;   // % na imagem
  forma: 'retangulo' | 'circulo' | 'triangulo';
};

export const CORES_MARCA = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899'];
const FORMAS: Marcacao['forma'][] = ['retangulo', 'circulo', 'triangulo'];

function shapeStyle(m: Marcacao): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute', left: `${m.x}%`, top: `${m.y}%`,
    background: m.cor, opacity: 0.4, transform: 'translate(-50%, -50%)',
  };
  if (m.forma === 'circulo') return { ...base, width: 90, height: 90, borderRadius: '50%' };
  if (m.forma === 'triangulo') return { ...base, width: 0, height: 0, background: 'transparent',
    borderLeft: '50px solid transparent', borderRight: '50px solid transparent', borderBottom: `90px solid ${m.cor}` };
  return { ...base, width: 130, height: 80, borderRadius: 6 };
}

interface Props {
  imagem: string;
  marcacoes: Marcacao[];
  onChange: (m: Marcacao[]) => void;
  expanded?: boolean;
}

export default function PlantaMarcacoes({ imagem, marcacoes, onChange, expanded = false }: Props) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(CORES_MARCA[0]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [modoPosicionar, setModoPosicionar] = useState(false);
  const [full, setFull] = useState(false);

  const add = () => {
    if (!nome.trim()) return;
    const m: Marcacao = {
      id: Date.now().toString(), nome: nome.trim(), cor, x: 50, y: 50, forma: 'retangulo',
    };
    onChange([...marcacoes, m]);
    setNome(''); setSelecionada(m.id); setModoPosicionar(true);
  };

  const ciclarCor = (id: string) => {
    onChange(marcacoes.map((m) => {
      if (m.id !== id) return m;
      const i = CORES_MARCA.indexOf(m.cor);
      return { ...m, cor: CORES_MARCA[(i + 1) % CORES_MARCA.length] };
    }));
  };

  const clicarImagem = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modoPosicionar || !selecionada) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    onChange(marcacoes.map((m) => m.id === selecionada ? { ...m, x, y } : m));
    setModoPosicionar(false);
  };

  const trocarForma = (id: string) => {
    onChange(marcacoes.map((m) => {
      if (m.id !== id) return m;
      const i = FORMAS.indexOf(m.forma);
      return { ...m, forma: FORMAS[(i + 1) % FORMAS.length] };
    }));
  };

  const area = (
    <div className={`relative w-full ${expanded || full ? 'h-full' : 'h-96'} bg-slate-100 rounded overflow-hidden`} onClick={clicarImagem}>
      {imagem ? (
        <img src={imagem} alt="Planta" className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Nenhuma imagem enviada</div>
      )}
      {marcacoes.map((m) => (
        <div key={m.id} style={shapeStyle(m)} onClick={(e) => { e.stopPropagation(); setSelecionada(m.id); }} />
      ))}
      {modoPosicionar && (
        <div className="absolute top-2 left-2 bg-slate-900 text-white text-xs px-2 py-1 rounded">Clique na imagem para posicionar</div>
      )}
    </div>
  );

  return (
    <div className={`space-y-3 ${full ? 'fixed inset-0 z-[60] bg-slate-900 p-4 overflow-auto' : ''}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className={`font-bold ${full ? 'text-white' : ''}`}>Planta — marcações</h2>
        <Button size="sm" variant="outline" onClick={() => setFull(!full)}>
          {full ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {full ? (
        <div className="grid grid-cols-[3fr_1fr] gap-4 h-[calc(100vh-80px)]">
          <div className="bg-white rounded overflow-hidden">{area}</div>
          <div className="space-y-2 overflow-auto">
            {marcacoes.map((m) => (
              <button key={m.id} onClick={() => ciclarCor(m.id)}
                className="w-full flex items-center gap-2 p-2 rounded border bg-white text-left">
                <span className="w-5 h-5 rounded" style={{ background: m.cor, opacity: 0.4 }} />
                <span className="text-sm">{m.nome}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {area}
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Nome da marcação" value={nome} onChange={(e) => setNome(e.target.value)} className="max-w-xs" />
            <div className="flex items-center gap-1">
              {CORES_MARCA.map((c) => (
                <button key={c} onClick={() => setCor(c)} title="Cor"
                  className={`w-6 h-6 rounded-full border-2 ${cor === c ? 'ring-2 ring-primary' : ''}`} style={{ background: c }} />
              ))}
            </div>
            <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {marcacoes.map((m) => (
              <div key={m.id} className={`flex items-center gap-2 p-2 rounded border ${selecionada === m.id ? 'border-primary' : ''}`}>
                <button onClick={() => ciclarCor(m.id)} className="flex items-center gap-2" title="Clicar para mudar a cor">
                  <span className="w-6 h-6 rounded" style={{ background: m.cor, opacity: 0.4 }} />
                  <span className="text-sm">{m.nome}</span>
                </button>
                <button onClick={() => trocarForma(m.id)} title="Mudar forma"><Move className="w-3 h-3" /></button>
                <button onClick={() => setSelecionada(m.id)} title="Posicionar"><Palette className="w-3 h-3" /></button>
                <button onClick={() => onChange(marcacoes.filter((x) => x.id !== m.id))} title="Remover"><Trash2 className="w-3 h-3 text-destructive" /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
