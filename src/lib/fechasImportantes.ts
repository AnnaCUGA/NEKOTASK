/**
 * Fechas importantes — funciones puras (las usan la app, el calendario y los recordatorios del servidor).
 * Todas las fechas son días "AAAA-MM-DD", sin hora ni zona.
 */
import type { FechaImportante, NombreIcono, TipoFecha } from "./tipos";

export const TIPOS_FECHA: Record<TipoFecha, { nombre: string; icono: NombreIcono; color: string }> = {
  cumpleanos: { nombre: "Cumpleaños", icono: "regalo", color: "#f472b6" },
  aniversario: { nombre: "Aniversario", icono: "anillo", color: "#a78bfa" },
  vencimiento: { nombre: "Vencimiento", icono: "documento", color: "#fbbf24" },
  otro: { nombre: "Otra fecha", icono: "estrella", color: "#67e8f9" },
};

const partes = (iso: string) => iso.slice(0, 10).split("-").map(Number) as [number, number, number];
const aISO = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const diasEntre = (desde: string, hasta: string) => {
  const [a1, m1, d1] = partes(desde);
  const [a2, m2, d2] = partes(hasta);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
};

/** El 29 de febrero se celebra el 28 en años no bisiestos */
function enAnio(iso: string, anio: number) {
  const [, m, d] = partes(iso);
  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  return aISO(anio, m, m === 2 && d === 29 && !bisiesto ? 28 : d);
}

/** Próxima vez que ocurre (hoy cuenta). Si no se repite y ya pasó, regresa la fecha original. */
export function proximaOcurrencia(f: Pick<FechaImportante, "fecha" | "cadaAnio">, hoy: string) {
  if (!f.cadaAnio) return f.fecha;
  const anio = partes(hoy)[0];
  const esteAnio = enAnio(f.fecha, anio);
  return diasEntre(hoy, esteAnio) >= 0 ? esteAnio : enAnio(f.fecha, anio + 1);
}

export function diasParaFecha(f: Pick<FechaImportante, "fecha" | "cadaAnio">, hoy: string) {
  return diasEntre(hoy, proximaOcurrencia(f, hoy));
}

/** Años que se cumplen en la próxima ocurrencia (solo si se conoce el año original) */
export function aniosQueCumple(f: Pick<FechaImportante, "fecha" | "cadaAnio" | "conAnio">, hoy: string) {
  if (!f.cadaAnio || !f.conAnio) return undefined;
  const n = partes(proximaOcurrencia(f, hoy))[0] - partes(f.fecha)[0];
  return n > 0 ? n : undefined;
}

/** Ocurrencias dentro de [desde, hasta] — para pintarlas en el calendario */
export function ocurrenciasEntre(f: Pick<FechaImportante, "fecha" | "cadaAnio">, desde: string, hasta: string) {
  if (!f.cadaAnio) return diasEntre(desde, f.fecha) >= 0 && diasEntre(f.fecha, hasta) >= 0 ? [f.fecha] : [];
  const out: string[] = [];
  for (let a = partes(desde)[0]; a <= partes(hasta)[0]; a++) {
    const dia = enAnio(f.fecha, a);
    if (diasEntre(f.fecha, dia) >= 0 && diasEntre(desde, dia) >= 0 && diasEntre(dia, hasta) >= 0) out.push(dia);
  }
  return out;
}

export function textoCuenta(dias: number) {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias < 0) return dias === -1 ? "Fue ayer" : `Hace ${-dias} días`;
  if (dias < 7) return `En ${dias} días`;
  if (dias < 60) return `En ${Math.round(dias / 7) === 1 ? "1 semana" : `${Math.round(dias / 7)} semanas`}`;
  return `En ${Math.round(dias / 30.4)} meses`;
}

/** "Cumpleaños de Sofi (30)" — título corto para avisos y calendario */
export function tituloFecha(f: FechaImportante, hoy: string) {
  const n = aniosQueCumple(f, hoy);
  return n ? `${f.titulo} (${n})` : f.titulo;
}
