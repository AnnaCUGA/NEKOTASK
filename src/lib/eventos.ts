/**
 * Bus de eventos de la app → las gatitas escuchan y reaccionan.
 * La lógica de negocio (store) emite; la escena de gatitas se suscribe.
 */
import type { ClaveGatita } from "./tipos";

export type EventoNeko =
  | { tipo: "tarea-completada"; titulo: string }
  | { tipo: "bebida"; nombre: string; ml: number; color: string; metaAlcanzada: boolean }
  | { tipo: "habito"; nombre: string; racha: number }
  | { tipo: "rutina-completa"; rutina: string }
  | { tipo: "pomodoro-inicio" }
  | { tipo: "pomodoro-fin"; minutos: number }
  | { tipo: "cuidado"; gatita: ClaveGatita; que: string }
  | { tipo: "compra"; gatita?: ClaveGatita; nombre: string }
  | { tipo: "croquetas"; cantidad: number; x?: number; y?: number }
  | { tipo: "confeti"; x: number; y: number; color?: string };

type Oyente = (e: EventoNeko) => void;
const oyentes = new Set<Oyente>();

export const bus = {
  emitir(e: EventoNeko) {
    oyentes.forEach((o) => {
      try { o(e); } catch (err) { console.error(err); }
    });
  },
  escuchar(o: Oyente) {
    oyentes.add(o);
    return () => { oyentes.delete(o); };
  },
};

/** Lanza confeti de huellitas desde el elemento que se tocó */
export function confetiDesde(el: Element | null, color?: string) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  bus.emitir({ tipo: "confeti", x: r.left + r.width / 2, y: r.top + r.height / 2, color });
}
