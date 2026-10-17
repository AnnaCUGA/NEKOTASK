"use client";

import { useEffect, useState } from "react";
import { almacenamientoSeguro } from "@/lib/almacenamiento";
import { usePWA } from "@/lib/pwa/pwa";
import { useNekoStore } from "@/store/useNekoStore";
import { calcularRecordatorios, type Recordatorio } from "./reglas";

const zona = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Mexico_City";

/**
 * Revisa cada minuto si toca un recordatorio y lo muestra dentro de la app.
 * Si la app está en segundo plano, con permiso y sin push del servidor, manda notificación local.
 */
export function useRecordatoriosEnApp() {
  const [avisos, setAvisos] = useState<Recordatorio[]>([]);

  useEffect(() => {
    const revisar = () => {
      const s = useNekoStore.getState();
      const lista = calcularRecordatorios(
        {
          recordatorios: s.ajustes.recordatorios,
          metaAguaMl: s.ajustes.metaAguaMl,
          tareas: s.tareas,
          registroBebidas: s.registroBebidas,
          habitos: s.habitos,
          registroHabitos: s.registroHabitos,
          citas: s.citas,
          registroCuidados: s.registroCuidados,
        },
        new Date(),
        zona(),
      );
      const llave = "neko-avisos-vistos";
      let vistos: string[] = [];
      try { vistos = JSON.parse((almacenamientoSeguro.getItem(llave) as string) ?? "[]"); } catch { vistos = []; }
      const nuevos = lista.filter((a) => !vistos.includes(a.clave));
      if (!nuevos.length) return;
      almacenamientoSeguro.setItem(llave, JSON.stringify([...vistos, ...nuevos.map((a) => a.clave)].slice(-200)));

      const pwa = usePWA.getState();
      const oculta = document.visibilityState === "hidden";
      if (oculta && !pwa.pushActivo && pwa.permiso === "granted" && pwa.registro) {
        nuevos.forEach((a) =>
          void pwa.registro!.showNotification(a.titulo, { body: a.cuerpo, icon: `/iconos/gatitas/${a.gatita}.png`, badge: "/iconos/insignia-96.png", tag: a.clave, data: { url: a.url } }),
        );
      }
      setAvisos((v) => [...v, ...nuevos].slice(-3));
    };
    const t0 = window.setTimeout(revisar, 4000);
    const t = window.setInterval(revisar, 60_000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);

  const cerrar = (clave: string) => setAvisos((v) => v.filter((a) => a.clave !== clave));
  return { avisos, cerrar };
}
