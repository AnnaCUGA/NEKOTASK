"use client";

import { create } from "zustand";
import { tokenDeAcceso } from "@/lib/cuenta/useCuenta";

const ES_VISTA_PREVIA = process.env.NEXT_PUBLIC_VISTA_PREVIA === "1";
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

interface EventoInstalar extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

interface EstadoPWA {
  registro: ServiceWorkerRegistration | null;
  instalable: EventoInstalar | null;
  instalada: boolean;
  pushActivo: boolean;
  permiso: NotificationPermission | "no-disponible";
}

export const usePWA = create<EstadoPWA>(() => ({
  registro: null,
  instalable: null,
  instalada: false,
  pushActivo: false,
  permiso: "no-disponible",
}));

export const soportaPush = () => !ES_VISTA_PREVIA && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Registra el service worker y escucha el aviso de "instalar app" del navegador */
export async function iniciarPWA(alNavegar: (url: string) => void) {
  if (ES_VISTA_PREVIA || typeof window === "undefined") return;
  usePWA.setState({
    instalada: window.matchMedia("(display-mode: standalone)").matches,
    permiso: "Notification" in window ? Notification.permission : "no-disponible",
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    usePWA.setState({ instalable: e as EventoInstalar });
  });
  window.addEventListener("appinstalled", () => usePWA.setState({ instalable: null, instalada: true }));
  if (!("serviceWorker" in navigator)) return;
  try {
    const registro = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    usePWA.setState({ registro });
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.tipo === "neko-navegar") alNavegar(e.data.url);
    });
    const sub = await registro.pushManager?.getSubscription();
    usePWA.setState({ pushActivo: !!sub });
  } catch (e) {
    console.warn("No se pudo registrar el service worker", e);
  }
}

export async function instalarApp() {
  const ev = usePWA.getState().instalable;
  if (!ev) return false;
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  usePWA.setState({ instalable: null });
  return outcome === "accepted";
}

function llaveAplicacion(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

/** Pide permiso y registra este dispositivo para recibir recordatorios push */
export async function activarNotificaciones(): Promise<string | null> {
  if (!soportaPush()) return "Este navegador no permite notificaciones.";
  const permiso = await Notification.requestPermission();
  usePWA.setState({ permiso });
  if (permiso !== "granted") return "Sin permiso no te puedo avisar. Puedes activarlo en los ajustes del navegador.";
  if (!VAPID) return null; // solo avisos dentro de la app
  const token = await tokenDeAcceso();
  if (!token) return "Inicia sesión para recibir avisos aunque la app esté cerrada.";
  const registro = usePWA.getState().registro ?? (await navigator.serviceWorker.ready);
  const sub = (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveAplicacion(VAPID) }));
  const r = await fetch("/api/push/suscribir", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON(), dispositivo: /Android/i.test(navigator.userAgent) ? "Android" : navigator.platform }),
  });
  if (!r.ok) return (await r.json().catch(() => ({}))).error ?? "No se pudo activar.";
  usePWA.setState({ pushActivo: true });
  return null;
}

export async function desactivarNotificaciones() {
  const registro = usePWA.getState().registro;
  const sub = await registro?.pushManager.getSubscription();
  if (sub) {
    const token = await tokenDeAcceso();
    if (token) {
      await fetch("/api/push/suscribir", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => undefined);
    }
    await sub.unsubscribe();
  }
  usePWA.setState({ pushActivo: false });
}

export async function probarNotificacion(): Promise<string> {
  const token = await tokenDeAcceso();
  if (!token) return "Inicia sesión primero.";
  const r = await fetch("/api/push/prueba", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return d.error ?? "No se pudo enviar.";
  return d.enviados ? "Enviada. Debe llegar en unos segundos." : "No hay dispositivos registrados.";
}
