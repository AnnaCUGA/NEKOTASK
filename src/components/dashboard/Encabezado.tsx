"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { bus } from "@/lib/eventos";
import { mayusculaInicial, saludo } from "@/lib/fechas";
import { tilin } from "@/lib/sonidos";
import { useSync } from "@/lib/sync/motor";
import { useNekoStore } from "@/store/useNekoStore";

export function Logo({ tamano = 40 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 48 48" aria-hidden>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="#1e1c27" stroke="#a78bfa" strokeWidth="2" />
      <path d="M11 22 L13 9 L21 16 Z M37 22 L35 9 L27 16 Z" fill="#f9a8d4" stroke="#2b2233" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 27 C9 18 15 14 24 14 C33 14 39 18 39 27 C39 35 32 39 24 39 C16 39 9 35 9 27 Z" fill="#f7f3ef" stroke="#2b2233" strokeWidth="2.2" />
      <path d="M16 26 q2.5 -3 5 0 M27 26 q2.5 -3 5 0" fill="none" stroke="#2b2233" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22.5 29.5 h3 l-1.5 1.8 z" fill="#f29bb0" stroke="#2b2233" strokeWidth="1" strokeLinejoin="round" />
      <path d="M24 31.3 q-1.6 2.2 -3.2 1 M24 31.3 q1.6 2.2 3.2 1" fill="none" stroke="#2b2233" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 30 h3 M32 30 h3" stroke="#ff8fb1" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export function Encabezado({ alAbrirAjustes }: { alAbrirAjustes?: () => void }) {
  const estadoSync = useSync((s) => s.estado);
  const nombre = useNekoStore((s) => s.ajustes.nombre);
  const croquetas = useNekoStore((s) => s.croquetas);
  const sonidos = useNekoStore((s) => s.ajustes.sonidos);
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const [ganadas, setGanadas] = useState<{ id: number; n: number }[]>([]);
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    setFecha(mayusculaInicial(new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })));
    let id = 0;
    return bus.escuchar((e) => {
      if (e.tipo !== "croquetas") return;
      const nuevo = { id: ++id, n: e.cantidad };
      if (useNekoStore.getState().ajustes.sonidos) tilin();
      setGanadas((g) => [...g, nuevo]);
      setTimeout(() => setGanadas((g) => g.filter((x) => x.id !== nuevo.id)), 1200);
    });
  }, []);

  return (
    <header className="flex items-center gap-3">
      <Logo />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-titulo text-xl font-semibold text-white sm:text-2xl">
          <span className="hidden sm:inline">{saludo()}, </span><span className="sm:hidden">Hola, </span><span className="bg-gradient-to-r from-violeta-suave to-rosa bg-clip-text text-transparent">{nombre}</span>
        </h1>
        <p className="truncate text-xs text-white/45 sm:text-sm">{fecha}</p>
      </div>


      <button type="button" onClick={() => ajustar({ sonidos: !sonidos })} aria-label={sonidos ? "Silenciar sonidos" : "Activar sonidos"}
        className="hidden h-10 w-10 place-items-center rounded-xl border border-noche-600 bg-noche-800 text-white/70 hover:text-white sm:grid">
        <IconoNeko nombre={sonidos ? "bocina" : "silencio"} tamano={19} />
      </button>

      {alAbrirAjustes && (
        <button type="button" onClick={alAbrirAjustes} aria-label="Ajustes, cuenta y recordatorios"
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-noche-600 bg-noche-800 text-white/70 hover:text-white">
          <IconoNeko nombre="ajustes" tamano={19} />
          {estadoSync !== "apagado" && (
            <span
              title={estadoSync === "al_dia" ? "Sincronizado" : estadoSync === "sincronizando" ? "Sincronizando" : "Sin sincronizar"}
              className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${estadoSync === "al_dia" ? "bg-[#9cc96b]" : estadoSync === "sincronizando" ? "animate-pulse bg-cian" : estadoSync === "sin_conexion" ? "bg-croqueta" : "bg-rosa"}`}
            />
          )}
        </button>
      )}

      <div className="relative" id="contador-croquetas">
        <motion.div
          key={croquetas}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-1.5 rounded-xl border border-croqueta/40 bg-croqueta/10 px-3 py-2 font-titulo font-semibold text-croqueta"
          title="Croquetas"
        >
          <IconoNeko nombre="croqueta" tamano={20} />
          <span className="tabular-nums">{croquetas}</span>
        </motion.div>
        <AnimatePresence>
          {ganadas.map((g) => (
            <motion.span key={g.id} initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -26 }} exit={{ opacity: 0, y: -40 }}
              className="pointer-events-none absolute right-2 top-0 font-titulo text-sm font-bold text-croqueta">
              +{g.n}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </header>
  );
}
