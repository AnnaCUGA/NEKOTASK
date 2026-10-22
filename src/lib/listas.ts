/** Listas — funciones puras: leer "2x leche $25" y sacar totales. */
import { leerMonto } from "./dinero";
import type { ItemLista } from "./tipos";

/**
 * "leche $25" → leche, $25 · "2x leche $25" o "leche x2 $25" → 2 piezas de $25.
 * Solo se toma como precio lo que lleva "$", para no confundir "1 litro" o "500 g".
 */
export function leerItem(texto: string): { texto: string; piezas?: number; precio?: number } {
  let t = texto.trim();
  let precio: number | undefined;
  let piezas: number | undefined;
  const p = t.match(/\$\s*(\d+(?:[.,]\d{1,2})?)/);
  if (p) { precio = leerMonto(p[1]) || undefined; t = t.replace(p[0], " "); }
  const delante = t.match(/^\s*(\d{1,3})\s*[x×]\s+/i);
  const detras = t.match(/\s+[x×]\s*(\d{1,3})\s*$/i);
  if (delante) { piezas = Number(delante[1]); t = t.replace(delante[0], ""); }
  else if (detras) { piezas = Number(detras[1]); t = t.replace(detras[0], ""); }
  t = t.replace(/\s{2,}/g, " ").trim();
  return { texto: t || texto.trim(), ...(piezas && piezas > 1 ? { piezas } : {}), ...(precio ? { precio } : {}) };
}

export const subtotal = (i: Pick<ItemLista, "precio" | "piezas">) => (i.precio ?? 0) * (i.piezas ?? 1);

export function totalesLista(items: ItemLista[]) {
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    estimado: r(items.reduce((s, i) => s + subtotal(i), 0)),
    enCarrito: r(items.filter((i) => i.hecho).reduce((s, i) => s + subtotal(i), 0)),
    faltaPorComprar: r(items.filter((i) => !i.hecho).reduce((s, i) => s + subtotal(i), 0)),
    sinPrecio: items.filter((i) => !i.precio).length,
  };
}
