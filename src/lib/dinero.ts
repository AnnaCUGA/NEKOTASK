/**
 * Dinero — funciones puras (resúmenes, suscripciones). Todo en MXN.
 * Las fechas son días "AAAA-MM-DD"; un mes es "AAAA-MM".
 */
import type { CategoriaDinero, Frecuencia, Suscripcion, Transaccion } from "./tipos";

const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const fmtCorto = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** $1,234.50 — o $1,235 si `corto` */
export const pesos = (n: number, corto = false) => (corto ? fmtCorto : fmt).format(n);

/** "1,234.5" / "1234,50" → 1234.5 */
export function leerMonto(texto: string): number {
  const limpio = texto.replace(/[^\d.,]/g, "");
  const conPunto = /,\d{1,2}$/.test(limpio) && !limpio.includes(".") ? limpio.replace(",", ".") : limpio.replace(/,/g, "");
  const n = Math.round(parseFloat(conPunto) * 100) / 100;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export const mesDe = (dia: string) => dia.slice(0, 7);
export function sumarMeses(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export const diasDelMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};
export const nombreMes = (mes: string) => {
  const t = new Date(`${mes}-15T12:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export interface ResumenMes {
  gastos: number;
  ingresos: number;
  balance: number;
  porCategoria: { categoria: CategoriaDinero; total: number; presupuesto?: number }[];
  porDia: number[];                 // gasto de cada día del mes (índice 0 = día 1)
}

export function resumenMes(transacciones: Transaccion[], categorias: CategoriaDinero[], mes: string): ResumenMes {
  const delMes = transacciones.filter((t) => mesDe(t.fecha) === mes);
  const porDia = Array.from({ length: diasDelMes(mes) }, () => 0);
  const totales = new Map<string, number>();
  let gastos = 0;
  let ingresos = 0;
  for (const t of delMes) {
    if (t.tipo === "gasto") {
      gastos += t.monto;
      porDia[Number(t.fecha.slice(8, 10)) - 1] += t.monto;
      totales.set(t.categoriaId, (totales.get(t.categoriaId) ?? 0) + t.monto);
    } else ingresos += t.monto;
  }
  const otros = categorias.find((c) => c.id === "cat-otros");
  const porCategoria = [...totales]
    .map(([id, total]) => {
      const categoria = categorias.find((c) => c.id === id) ?? otros ?? { id, nombre: "Sin categoría", icono: "etiqueta", color: "#8b86a3", tipo: "gasto", orden: 99 } as CategoriaDinero;
      return { categoria, total, presupuesto: categoria.presupuesto };
    })
    .sort((a, b) => b.total - a.total);
  const r = (n: number) => Math.round(n * 100) / 100;
  return { gastos: r(gastos), ingresos: r(ingresos), balance: r(ingresos - gastos), porCategoria, porDia };
}

/** Cuánto llevas del presupuesto de una categoría este mes */
export function gastadoEnCategoria(transacciones: Transaccion[], categoriaId: string, mes: string) {
  return transacciones.filter((t) => t.tipo === "gasto" && t.categoriaId === categoriaId && mesDe(t.fecha) === mes).reduce((s, t) => s + t.monto, 0);
}

export type EstadoPresupuesto = "bien" | "cerca" | "pasado";
export const estadoPresupuesto = (gastado: number, limite: number): EstadoPresupuesto =>
  gastado > limite ? "pasado" : gastado >= limite * 0.8 ? "cerca" : "bien";

// ─── Suscripciones ──────────────────────────────────────────────────────
const partes = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const aISO = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const diasEntre = (desde: string, hasta: string) => {
  const [a1, m1, d1] = partes(desde);
  const [a2, m2, d2] = partes(hasta);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
};

/** Siguiente cobro después de `fecha`, respetando el día original (31 → 30 → 28…) */
export function siguienteCobro(fecha: string, frecuencia: Frecuencia, diaCobro: number) {
  const [a, m, d] = partes(fecha);
  if (frecuencia === "semanal") {
    const x = new Date(Date.UTC(a, m - 1, d + 7));
    return aISO(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
  }
  const salto = frecuencia === "mensual" ? 1 : 12;
  const base = new Date(Date.UTC(a, m - 1 + salto, 1));
  const anio = base.getUTCFullYear();
  const mes = base.getUTCMonth() + 1;
  return aISO(anio, mes, Math.min(diaCobro, diasDelMes(`${anio}-${String(mes).padStart(2, "0")}`)));
}

/** Cuánto pesa al mes (para el total de suscripciones) */
export const montoMensual = (s: Pick<Suscripcion, "monto" | "frecuencia">) =>
  s.frecuencia === "mensual" ? s.monto : s.frecuencia === "anual" ? s.monto / 12 : (s.monto * 52) / 12;

/** Suscripciones cuyo cobro ya llegó y falta confirmar */
export const cobrosPendientes = (subs: Suscripcion[], hoy: string) =>
  subs.filter((s) => s.activa && diasEntre(s.proximoCobro, hoy) >= 0).sort((a, b) => a.proximoCobro.localeCompare(b.proximoCobro));

export const ETIQUETA_FRECUENCIA: Record<Frecuencia, string> = { semanal: "por semana", mensual: "al mes", anual: "al año" };
