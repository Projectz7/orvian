import { useMemo, useState } from 'react';
import type { Tarefa, Funcionario, Equipe } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Today, Calendar, Clock, Users, Building2 } from 'lucide-react';

interface AgendaViewProps {
  tarefas: Tarefa[];
  funcs: Funcionario[];
  equipes: Equipe[];
  planofechado: boolean;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getFuncNome(funcs: Funcionario[], id?: string | null) {
  if (!id) return null;
  return funcs.find((f) => f.id === id)?.nome || id.slice(0, 8);
}

function getEquipeNome(equipes: Equipe[], id?: string | null) {
  if (!id) return null;
  return equipes.find((e) => e.id === id)?.nome || id.slice(0, 8);
}

function formatDateBR(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export default function AgendaView({ tarefas, funcs, equipes, planofechado }: AgendaViewProps) {
  const [modo, setModo] = useState<'semana' | 'mes'>('semana');
  const [dataRef, setDataRef] = useState(new Date());

  const tarefasComData = useMemo(() => {
    return tarefas.filter((t) => t.data_inicio || t.data_fim).map((t) => ({
      ...t,
      inicio: t.data_inicio ? formatDateBR(t.data_inicio) : null,
      fim: t.data_fim ? formatDateBR(t.data_fim) : null,
      inicioReal: t.data_inicio_real ? formatDateBR(t.data_inicio_real) : null,
      fimReal: t.data_fim_real ? formatDateBR(t.data_fim_real) : null,
      responsavelNome: getFuncNome(funcs, t.responsavel_id),
      equipeNome: getEquipeNome(equipes, t.equipe_id),
    }));
  }, [tarefas, funcs, equipes]);

  const tarefasPorDia = useMemo(() => {
    const map = new Map<string, typeof tarefasComData>();
    for (const t of tarefasComData) {
      const addDia = (d: Date) => {
        const key = d.toISOString().split('T')[0];
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      };
      if (t.inicio && t.fim) {
        let d = new Date(t.inicio);
        while (d <= t.fim) { addDia(d); d = addDays(d, 1); }
      } else if (t.inicio) {
        addDia(t.inicio);
      } else if (t.fim) {
        addDia(t.fim);
      }
    }
    return map;
  }, [tarefasComData]);

  const navegar = (delta: number) => {
    setDataRef((prev) => {
      const d = new Date(prev);
      if (modo === 'semana') d.setDate(d.getDate() + delta * 7);
      else d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  const irParaHoje = () => setDataRef(new Date());

  // Semana
  const semanaInicio = useMemo(() => startOfWeek(dataRef), [dataRef]);
  const semanaFim = useMemo(() => endOfWeek(dataRef), [dataRef]);
  const diasSemana = useMemo(() => {
    const arr: Date[] = [];
    let d = new Date(semanaInicio);
    for (let i = 0; i < 7; i++) { arr.push(new Date(d)); d = addDays(d, 1); }
    return arr;
  }, [semanaInicio]);

  // Mês
  const mesInicio = useMemo(() => startOfMonth(dataRef), [dataRef]);
  const mesFim = useMemo(() => endOfMonth(dataRef), [dataRef]);
  const semanasDoMes = useMemo(() => {
    const arr: Date[][] = [];
    let d = startOfWeek(mesInicio);
    while (d <= mesFim) {
      const semana: Date[] = [];
      for (let i = 0; i < 7; i++) { semana.push(new Date(d)); d = addDays(d, 1); }
      arr.push(semana);
    }
    return arr;
  }, [mesInicio, mesFim]);

  const isHoje = (d: Date) => d.toDateString() === new Date().toDateString();

  const renderTarefaDia = (t: typeof tarefasComData[0], isHojeFlag: boolean) => {
    const corStatus = t.status === 'concluida' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      t.status === 'fazendo' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      t.status === 'bloqueada' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      t.status === 'cancelada' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                      'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <div key={t.id} className={`px-2 py-1 rounded text-[10px] border ${corStatus} truncate cursor-pointer hover:shadow-sm transition-all ${isHojeFlag ? 'ring-2 ring-primary' : ''}`}>
        <div className="font-medium truncate">{t.titulo}</div>
        <div className="flex items-center gap-1 mt-0.5 text-[9px] opacity-80">
          {t.responsavelNome && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{t.responsavelNome}</span>}
          {t.equipeNome && <span className="flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{t.equipeNome}</span>}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[9px] opacity-60">
          <Clock className="w-2.5 h-2.5" />
          {t.inicio ? t.inicio.toLocaleDateString('pt-BR') : '?'} → {t.fim ? t.fim.toLocaleDateString('pt-BR') : '?'}
        </div>
        <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${t.progresso}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-280px)] min-h-[400px] flex flex-col overflow-hidden">
      {/* Header Agenda */}
      <div className="flex items-center justify-between p-3 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navegar(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="text-center min-w-[180px]">
            <div className="font-semibold text-sm">
              {modo === 'semana'
                ? `${semanaInicio.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${semanaFim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : `${MESES[dataRef.getMonth()]} ${dataRef.getFullYear()}`}
            </div>
            <div className="text-[10px] text-muted-foreground">{modo === 'semana' ? 'Semana' : 'Mês'}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navegar(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={irParaHoje}><Today className="w-3.5 h-3.5 mr-1" /> Hoje</Button>
          <select value={modo} onChange={(e) => setModo(e.target.value as 'semana' | 'mes')} className="text-xs border rounded px-2 py-1">
            <option value="semana">Semana</option>
            <option value="mes">Mês</option>
          </select>
        </div>
      </div>

      {/* Grid Agenda */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {modo === 'semana' ? (
          <div className="grid grid-cols-7 gap-1 min-w-[700px]">
            {/* Cabeçalho dias */}
            {diasSemana.map((d, idx) => (
              <div key={idx} className={cn('p-2 text-center text-[11px] font-medium border-b-2', isHoje(d) ? 'bg-primary/10 text-primary border-primary' : 'text-slate-500 border-slate-200')}>
                <div>{DIAS_SEMANA[d.getDay()]}</div>
                <div className={cn('mt-0.5 text-lg', isHoje(d) ? 'text-primary font-bold' : '')}>{d.getDate()}</div>
              </div>
            ))}
            {/* Células */}
            {diasSemana.map((d) => {
              const key = d.toISOString().split('T')[0];
              const tarefasDia = tarefasPorDia.get(key) || [];
              const isHojeFlag = isHoje(d);
              return (
                <div key={key} className={cn('min-h-[120px] max-h-[300px] overflow-y-auto p-1 space-y-1 border rounded', isHojeFlag ? 'bg-primary/5 border-primary/50' : 'bg-white border-slate-100')}>
                  {tarefasDia.length === 0 ? (
                    <div className="text-center text-[10px] text-slate-300 h-full flex items-center justify-center" style={{ minHeight: 80 }}>
                      —
                    </div>
                  ) : (
                    tarefasDia.map((t) => renderTarefaDia(t, isHojeFlag))
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1 min-w-[700px]">
            {semanasDoMes.map((semana, si) => (
              <div key={si} className="grid grid-cols-7 gap-1">
                {semana.map((d, di) => {
                  const key = d.toISOString().split('T')[0];
                  const tarefasDia = tarefasPorDia.get(key) || [];
                  const isMesAtual = d.getMonth() === dataRef.getMonth();
                  const isHojeFlag = isHoje(d);
                  return (
                    <div key={key} className={cn('min-h-[80px] max-h-[150px] overflow-y-auto p-1 space-y-1 border rounded', 
                      !isMesAtual ? 'bg-slate-50 text-slate-300 border-slate-100' :
                      isHojeFlag ? 'bg-primary/5 border-primary/50' : 'bg-white border-slate-100'
                    )}>
                      <div className={cn('text-[10px] font-medium', isHojeFlag ? 'text-primary' : !isMesAtual ? 'text-slate-400' : 'text-slate-600')}>
                        {d.getDate()}
                      </div>
                      {tarefasDia.length === 0 ? null : (
                        tarefasDia.slice(0, 3).map((t) => renderTarefaDia(t, isHojeFlag))
                      )}
                      {tarefasDia.length > 3 && (
                        <div className="text-[10px] text-slate-400 text-center mt-1">+{tarefasDia.length - 3} mais</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="p-3 border-t bg-slate-50 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
        <span className="font-medium">Legenda:</span>
        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">A fazer</span>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded">Fazendo</span>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded">Concluída</span>
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded">Bloqueada</span>
        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded">Cancelada</span>
        <span className="ml-auto flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {tarefasComData.length} tarefas com data
        </span>
      </div>
    </div>
  );
}