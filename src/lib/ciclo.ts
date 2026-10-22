/**
 * Ciclo — funciones puras. Solo se registran los días de periodo ("AAAA-MM-DD").
 * Las predicciones son estimaciones a partir de tu propio historial.
 */
import type { AjustesCiclo } from "./tipos";

export const AJUSTES_CICLO: AjustesCiclo = { avisar: true, diasAntes: 2, hora: "09:00", cicloInicial: 28, periodoInicial: 5 };

const partes = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const ms = (iso: string) => { const [a, m, d] = partes(iso); return Date.UTC(a, m - 1, d); };
export const entre = (desde: string, hasta: string) => Math.round((ms(hasta) - ms(desde)) / 86_400_000);
export const mover = (iso: string, n: number) => {
  const d = new Date(ms(iso) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

export interface Periodo { inicio: string; fin: string; dias: number }

/** Agrupa días sueltos en periodos (un hueco de 1 día no corta el periodo) */
export function agruparPeriodos(dias: string[]): Periodo[] {
  const orden = [...new Set(dias)].sort();
  const out: Periodo[] = [];
  for (const d of orden) {
    const ult = out[out.length - 1];
    if (ult && entre(ult.fin, d) <= 2) { ult.fin = d; ult.dias = entre(ult.inicio, d) + 1; }
    else out.push({ inicio: d, fin: d, dias: 1 });
  }
  return out;
}

const promedio = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export interface EstadoCiclo {
  periodos: Periodo[];
  cicloPromedio: number;
  periodoPromedio: number;
  conHistorial: boolean;          // al menos 2 periodos para promediar
  diaDelCiclo?: number;           // 1 = primer día del último periodo
  enPeriodo: boolean;
  proximoInicio?: string;
  diasParaProximo?: number;       // negativo = retraso
  ventanaFertil?: { inicio: string; fin: string };
  periodoPredicho?: { inicio: string; fin: string };
}

export function estadoCiclo(dias: string[], hoy: string, aj: AjustesCiclo = AJUSTES_CICLO): EstadoCiclo {
  const periodos = agruparPeriodos(dias.filter((d) => d <= hoy));
  const recientes = periodos.slice(-7);
  const ciclos = recientes.slice(1).map((p, i) => entre(recientes[i].inicio, p.inicio)).filter((n) => n >= 18 && n <= 50);
  const cicloPromedio = ciclos.length ? Math.round(promedio(ciclos)) : aj.cicloInicial;
  const duraciones = recientes.slice(0, -1).map((p) => p.dias).filter((n) => n <= 10);
  const periodoPromedio = duraciones.length ? Math.round(promedio(duraciones)) : aj.periodoInicial;
  const ultimo = periodos[periodos.length - 1];
  if (!ultimo) return { periodos, cicloPromedio, periodoPromedio, conHistorial: false, enPeriodo: false };

  const diaDelCiclo = entre(ultimo.inicio, hoy) + 1;
  const enPeriodo = entre(ultimo.fin, hoy) <= 1 && diaDelCiclo <= 10;
  const proximoInicio = mover(ultimo.inicio, cicloPromedio);
  const ovulacion = mover(proximoInicio, -14);
  return {
    periodos,
    cicloPromedio,
    periodoPromedio,
    conHistorial: ciclos.length > 0,
    diaDelCiclo,
    enPeriodo,
    proximoInicio,
    diasParaProximo: entre(hoy, proximoInicio),
    ventanaFertil: { inicio: mover(ovulacion, -5), fin: mover(ovulacion, 1) },
    periodoPredicho: { inicio: proximoInicio, fin: mover(proximoInicio, periodoPromedio - 1) },
  };
}

/** Cómo se pinta un día en el calendario del ciclo */
export function tipoDeDia(dia: string, registrados: Set<string>, e: EstadoCiclo): "periodo" | "predicho" | "fertil" | null {
  if (registrados.has(dia)) return "periodo";
  const p = e.periodoPredicho;
  if (p && dia >= p.inicio && dia <= p.fin) return "predicho";
  const f = e.ventanaFertil;
  if (f && dia >= f.inicio && dia <= f.fin) return "fertil";
  return null;
}
