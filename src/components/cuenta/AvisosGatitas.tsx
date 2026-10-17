"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { confetiDesde } from "@/lib/eventos";
import type { Recordatorio } from "@/lib/recordatorios/reglas";
import { useNekoStore } from "@/store/useNekoStore";

/** Los recordatorios dentro de la app, cada uno con su gatita */
export function AvisosGatitas({ avisos, alCerrar, alAbrir }: { avisos: Recordatorio[]; alCerrar: (clave: string) => void; alAbrir: (url: string) => void }) {
  const registrar = useNekoStore((s) => s.registrarBebida);

  useEffect(() => {
    if (!avisos.length) return;
    const t = window.setTimeout(() => alCerrar(avisos[0].clave), 25_000);
    return () => clearTimeout(t);
  }, [avisos, alCerrar]);

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[96px] z-50 flex flex-col items-center gap-2 lg:bottom-6 lg:left-6 lg:right-auto lg:items-start" aria-live="polite">
      <AnimatePresence>
        {avisos.map((a) => (
          <motion.div
            key={a.clave}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-2xl border border-violeta/40 bg-noche-800/95 p-2 pr-3 shadow-neon backdrop-blur"
            role="status"
          >
            <div className="-my-2 shrink-0"><Gatita clave={a.gatita} pose="sentada" expresion="feliz" ancho={62} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-white">{a.titulo}</p>
              <p className="mt-0.5 text-xs leading-snug text-white/60">{a.cuerpo}</p>
              <div className="mt-1.5 flex gap-2">
                {a.acciones?.some((x) => x.accion === "agua-250") ? (
                  <button type="button" onClick={(e) => { registrar("agua", 250); confetiDesde(e.currentTarget, "#67c7f0"); alCerrar(a.clave); }}
                    className="rounded-lg bg-cian px-2.5 py-1 text-xs font-bold text-noche">+250 ml</button>
                ) : (
                  <button type="button" onClick={() => { alAbrir(a.url); alCerrar(a.clave); }}
                    className="rounded-lg bg-violeta px-2.5 py-1 text-xs font-bold text-noche">Ver</button>
                )}
                <button type="button" onClick={() => alCerrar(a.clave)} className="rounded-lg px-2 py-1 text-xs font-semibold text-white/50 hover:text-white">Luego</button>
              </div>
            </div>
            <button type="button" onClick={() => alCerrar(a.clave)} aria-label="Cerrar aviso" className="self-start p-1 text-white/40 hover:text-white">
              <IconoNeko nombre="cerrar" tamano={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
