"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { bus } from "@/lib/eventos";
import { mayusculaInicial, saludo } from "@/lib/fechas";
import { tilin } from "@/lib/sonidos";
import { useSync } from "@/lib/sync/motor";
import { useNekoStore } from "@/store/useNekoStore";

/** Logo: Blanquita saludando sobre el degradado de la app (el mismo del ícono instalado) */
export function Logo({ tamano = 40 }: { tamano?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-end justify-center overflow-hidden bg-gradient-to-b from-[#8b5cf6] to-[#f472b6] shadow-neon"
      style={{ width: tamano, height: tamano, borderRadius: tamano * 0.28 }}
    >
      <Gatita clave="blanquita" expresion="feliz" ancho={tamano * 1.05} halo={false} className="-mb-[2%]" />
    </span>
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
