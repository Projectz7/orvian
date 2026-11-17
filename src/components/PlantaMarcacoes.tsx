import { useState } from 'react';
import { Palette, Plus, Trash2, Move, Maximize2, X, Square, Circle, Triangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type Marcacao = {
  id: string;
  nome: string;
  cor: string;
  x: number;
  y: number;
  tamanho: number;       // porcentagem da imagem (10-60)
  forma: 'retangulo' | 'circulo' | 'triangulo';
};

export const CORES_MARCA = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899'];
const FORMAS: Marcacao['forma'][] = ['retangulo', 'circulo', 'triangulo'];

function shapeStyle(m: Marcacao): React.CSSProperties {
  const size = m.tamanho || 20;
  const base: React.CSSProperties = {
    position: 'absolute', left: `${m.x}%`, top: `${m.y}%`,
    transform: 'translate(-50%, -50%)', border: '2px solid rgba(255,255,255,.8)',
    cursor: 'pointer',
  };
  if (m.forma === 'circulo') return { ...base, width: `${size}%`, aspectRatio: '1', borderRadius: '50%', background: m.cor, opacity: 0.4 };
  if (m.forma === 'triangulo') return {
    ...base, width: 0, height: 0, background: 'transparent', border: 'none',
    borderLeft: `${size / 2}% solid transparent`, borderRight: `${size / 2}% solid transparent`,
    borderBottom: `${size}% solid ${m.cor}`, opacity: 0.4,
  };
  return { ...base, width: `${size}%`, height: `${size * 0.6}%`, borderRadius: 6, background: m.cor, opacity: 0.4 };
}

interface Props {
  imagem: string;
  marcacoes: Marcacao[];
  onChange: (m: Marcacao[]) => void;
}

export default function PlantaMarcacoes({ imagem, marcacoes, onChange }: Props) {
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(CORES_MARCA[0]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [modoPosicionar, setModoPosicionar] = useState(false);
  const [full, setFull] = useState(false);

  const atualizar = (id: string, patch: Partial<Marcacao>) =>
    onChange(marcacoes.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const add = () => {
    if (!nome.trim()) return;
    const m: Marcacao = { id: Date.now().toString(), nome: nome.trim(), cor, x: 50, y: 50, tamanho: 20, forma: 'retangulo' };
    onChange([...marcacoes, m]);
    setNome(''); setSelecionada(m.id); setModoPosicionar(true);
  };

  const ciclarCor = (id: string) => {
    const m = marcacoes.find((x) => x.id === id);
    if (!m) return;
    atualizar(id, { cor: CORES_MARCA[(CORES_MARCA.indexOf(m.cor) + 1) % CORES_MARCA.length] });
  };

  const clicarImagem = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modoPosicionar || !selecionada) return;
    const r = e.currentTarget.getBoundingClientRect();
    atualizar(selecionada, {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
    setModoPosicionar(false);
  };

  const area = (
    <div className={`relative w-full bg-slate-100 rounded overflow-hidden ${full ? 'h-full' : 'h-96'}`} onClick={clicarImagem}>
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

  const legenda = (m: Marcacao) => (
    <div key={m.id} className={`rounded border p-3 space-y-2 ${selecionada === m.id ? 'border-primary bg-primary/5' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => ciclarCor(m.id)} className="flex items-center gap-2 min-w-0" title="Clique para mudar a cor">
          <span className="w-6 h-6 rounded shrink-0" style={{ background: m.cor, opacity: 0.4 }} />
          <span className="text-sm font-medium truncate">{m.nome}</span>
        </button>
        <button onClick={() => onChange(marcacoes.filter((x) => x.id !== m.id))} title="Excluir" className="text-destructive p-1 shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <button onClick={() => atualizar(m.id, { forma: 'retangulo' })} title="Retângulo"
          className={`p-1.5 rounded border ${m.forma === 'retangulo' ? 'bg-primary text-white' : ''}`}><Square className="w-3 h-3" /></button>
        <button onClick={() => atualizar(m.id, { forma: 'circulo' })} title="Círculo"
          className={`p-1.5 rounded border ${m.forma === 'circulo' ? 'bg-primary text-white' : ''}`}><Circle className="w-3 h-3" /></button>
        <button onClick={() => atualizar(m.id, { forma: 'triangulo' })} title="Triângulo"
          className={`p-1.5 rounded border ${m.forma === 'triangulo' ? 'bg-primary text-white' : ''}`}><Triangle className="w-3 h-3" /></button>
        <button onClick={() => { setSelecionada(m.id); setModoPosicionar(true); }} title="Posicionar na imagem"
          className={`p-1.5 rounded border ${modoPosicionar && selecionada === m.id ? 'bg-primary text-white' : ''}`}><Move className="w-3 h-3" /></button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Tamanho</span>
        <input type="range" min="8" max="60" value={m.tamanho || 20}
          onChange={(e) => atualizar(m.id, { tamanho: Number(e.target.value) })}
          className="flex-1" />
        <span className="text-xs w-8 text-right">{m.tamanho || 20}%</span>
      </div>
      <div className="flex items-center gap-1">
        {CORES_MARCA.map((c) => (
          <button key={c} onClick={() => atualizar(m.id, { cor: c })} title="Cor"
            className={`w-5 h-5 rounded-full border ${m.cor === c ? 'ring-2 ring-primary' : ''}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold">Planta — marcações</h2>
        <Button size="sm" variant="outline" onClick={() => setFull(!full)}>
          {full ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
      </div>

      {full ? (
        <div className="fixed inset-0 z-[60] bg-white p-4 grid grid-cols-[3fr_1fr] gap-4">
          <div className="rounded overflow-hidden">{area}</div>
          <div className="space-y-2 overflow-auto">{marcacoes.map(legenda)}</div>
        </div>
      ) : (
        <>
          {area}
          <div className="flex gap-2 flex-wrap items-center">
            <Input placeholder="Nome da marcação" value={nome} onChange={(e) => setNome(e.target.value)} className="max-w-xs" />
            <div className="flex items-center gap-1">
              {CORES_MARCA.map((c) => (
                <button key={c} onClick={() => setCor(c)} title="Cor"
                  className={`w-6 h-6 rounded-full border-2 ${cor === c ? 'ring-2 ring-primary' : ''}`} style={{ background: c }} />
              ))}
            </div>
            <Button onClick={add}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">{marcacoes.map(legenda)}</div>
        </>
      )}
    </div>
  );
}
