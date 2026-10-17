import type { StateStorage } from "zustand/middleware";

/**
 * localStorage seguro: si el navegador lo bloquea (modo privado, iframes),
 * cae a memoria para que la app siga funcionando.
 * En la Fase 2 este almacenamiento local se sincroniza con Supabase.
 */
const memoria = new Map<string, string>();

export const almacenamientoSeguro: StateStorage = {
  getItem: (k) => {
    try { return window.localStorage.getItem(k); } catch { return memoria.get(k) ?? null; }
  },
  setItem: (k, v) => {
    try { window.localStorage.setItem(k, v); } catch { memoria.set(k, v); }
  },
  removeItem: (k) => {
    try { window.localStorage.removeItem(k); } catch { memoria.delete(k); }
  },
};
