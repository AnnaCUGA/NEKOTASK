"use client";

import type { EventoCalendario } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

/** En la vista previa (HTML suelto) no existen las rutas /api */
export const ES_VISTA_PREVIA = process.env.NEXT_PUBLIC_VISTA_PREVIA === "1";

export interface EstadoGoogle { configurado: boolean; conectado: boolean }

export async function consultarEstadoGoogle(): Promise<EstadoGoogle> {
  if (ES_VISTA_PREVIA) return { configurado: false, conectado: false };
  try {
    const r = await fetch("/api/google/estado", { cache: "no-store" });
    return (await r.json()) as EstadoGoogle;
  } catch {
    return { configurado: false, conectado: false };
  }
}

export function conectarGoogle() {
  window.location.href = "/api/google/conectar";
}

export async function desconectarGoogle() {
  await fetch("/api/google/desconectar", { method: "POST" }).catch(() => undefined);
  const s = useNekoStore.getState();
  s.setGoogleConectado(false);
}

class ErrorCalendario extends Error {
  constructor(mensaje: string, public reconectar = false) { super(mensaje); }
}

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (datos.reconectar) useNekoStore.getState().setGoogleConectado(false);
    throw new ErrorCalendario(datos.error ?? "No se pudo hablar con Google Calendar.", !!datos.reconectar);
  }
  return datos as T;
}

/** Trae los eventos de Google del rango y los mezcla en el store (Google → app) */
export async function sincronizarRango(desde: Date, hasta: Date) {
  const q = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() });
  const { eventos } = await pedir<{ eventos: Omit<EventoCalendario, "id">[] }>(`/api/calendario?${q}`);
  useNekoStore.getState().reemplazarEventosGoogle(desde.toISOString(), hasta.toISOString(), eventos);
  return eventos.length;
}

/** App → Google */
export async function crearEnGoogle(e: Pick<EventoCalendario, "titulo" | "inicio" | "fin" | "todoElDia" | "descripcion">) {
  const { evento } = await pedir<{ evento: Omit<EventoCalendario, "id"> }>("/api/calendario", { method: "POST", body: JSON.stringify(e) });
  return evento;
}

export async function eliminarEnGoogle(googleId: string) {
  await pedir(`/api/calendario/${encodeURIComponent(googleId)}`, { method: "DELETE" });
}
