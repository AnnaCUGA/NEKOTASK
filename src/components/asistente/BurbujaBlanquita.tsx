"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Gatita, type Expresion, type MovCabeza } from "@/components/gatitas/Gatita";
import { almacenamientoSeguro } from "@/lib/almacenamiento";
import { useNekoStore } from "@/store/useNekoStore";
import { esHoy } from "@/lib/fechas";

const TAM = 84;            // caja de Blanquita
const MARGEN = 10;
const LLAVE = "neko-burbuja";
const NAV = 88;            // barra inferior
const FAB = 88 + 56 + 8;   // botón de captura (abajo a la derecha)

type Lado = "izq" | "der";
interface Posicion { lado: Lado; y: number } // y = distancia desde abajo

function leer(): Posicion {
  try {
    const p = JSON.parse((almacenamientoSeguro.getItem(LLAVE) as string) ?? "null");
    if (p && (p.lado === "izq" || p.lado === "der") && typeof p.y === "number") return p;
  } catch { /* nada guardado */ }
  return { lado: "izq", y: NAV };
}

/** Lo que Blanquita dice de vez en cuando, según tu día */
function frase(): string {
  const s = useNekoStore.getState();
  const pendientesHoy = s.tareas.filter((t) => !t.completada && t.fechaLimite && esHoy(t.fechaLimite)).length;
  const opciones = [
    "¿Te ayudo con algo?",
    "Puedo redactarte un correo",
    "¿Hacemos un plan para hoy?",
    pendientesHoy ? `Tienes ${pendientesHoy} tarea${pendientesHoy > 1 ? "s" : ""} hoy, ¿las desglosamos?` : "¿Organizamos tu semana?",
    "¿Te ayudo a redactar algo?",
  ];
  return opciones[Math.floor(Math.random() * opciones.length)];
}

/**
 * Blanquita flotante (celular): se puede arrastrar a cualquier borde y se queda ahí.
 * Respira, ladea la cabeza, se sorprende si la cargas y de vez en cuando dice algo.
 */
export function BurbujaBlanquita({ alAbrir }: { alAbrir: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [pos, setPos] = useState<Posicion | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cabeza, setCabeza] = useState<MovCabeza>("normal");
  const [expresion, setExpresion] = useState<Expresion>("normal");
  const [globo, setGlobo] = useState<string | null>(null);
  const [pista, setPista] = useState(false);
  const recienArrastrada = useRef(false);

  /** Coordenadas en pantalla a partir del lado y la altura guardados */
  const colocar = useCallback((p: Posicion, suave: boolean) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const minAbajo = p.lado === "der" ? FAB : NAV;
    const abajo = Math.min(Math.max(p.y, minAbajo), h - TAM - 90);
    const destinoX = p.lado === "izq" ? MARGEN : w - TAM - MARGEN;
    const destinoY = h - abajo - TAM;
    if (suave) {
      animate(x, destinoX, { type: "spring", stiffness: 420, damping: 30 });
      animate(y, destinoY, { type: "spring", stiffness: 420, damping: 30 });
    } else {
      x.set(destinoX);
      y.set(destinoY);
    }
    return { ...p, y: abajo };
  }, [x, y]);

  useEffect(() => {
    const p = colocar(leer(), false);
    setPos(p);
    try { if (!almacenamientoSeguro.getItem(`${LLAVE}-pista`)) setPista(true); } catch { /* sin almacenamiento */ }
    const alCambiarTamano = () => setPos((actual) => (actual ? colocar(actual, false) : actual));
    window.addEventListener("resize", alCambiarTamano);
    return () => window.removeEventListener("resize", alCambiarTamano);
  }, [colocar]);

  // gestos de reposo: ladea la cabeza, parpadea feliz
  useEffect(() => {
    if (arrastrando) return;
    const t = window.setInterval(() => {
      const r = Math.random();
      if (r < 0.4) { setCabeza("inclinada"); window.setTimeout(() => setCabeza("normal"), 2200); }
      else if (r < 0.65) { setExpresion("feliz"); window.setTimeout(() => setExpresion("normal"), 1400); }
    }, 5200);
    return () => clearInterval(t);
  }, [arrastrando]);

  // de vez en cuando dice algo (y la primera vez, cómo moverla)
  useEffect(() => {
    const decir = (texto: string) => { setGlobo(texto); window.setTimeout(() => setGlobo(null), 5000); };
    const t0 = window.setTimeout(() => decir(pista ? "¡Arrástrame a donde no te estorbe!" : frase()), 2500);
    const t = window.setInterval(() => document.visibilityState === "visible" && decir(frase()), 4 * 60_000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [pista]);

  const soltar = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const lado: Lado = x.get() + TAM / 2 < w / 2 ? "izq" : "der";
    const nueva = colocar({ lado, y: h - y.get() - TAM }, true);
    setPos(nueva);
    try {
      almacenamientoSeguro.setItem(LLAVE, JSON.stringify(nueva));
      almacenamientoSeguro.setItem(`${LLAVE}-pista`, "1");
    } catch { /* se queda solo en esta sesión */ }
    setPista(false);
    setArrastrando(false);
    setExpresion("feliz");
    window.setTimeout(() => setExpresion("normal"), 900);
    window.setTimeout(() => { recienArrastrada.current = false; }, 80);
  };

  if (!pos) return null;
  const izq = pos.lado === "izq";

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => { recienArrastrada.current = true; setArrastrando(true); setGlobo(null); setExpresion("sorprendida"); }}
      onDragEnd={soltar}
      style={{ x, y, width: TAM, height: TAM, touchAction: "none" }}
      className="fixed left-0 top-0 z-40 lg:hidden"
    >
      <AnimatePresence>
        {globo && !arrastrando && (
          <motion.button
            type="button"
            onClick={alAbrir}
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            style={{ transformOrigin: izq ? "bottom left" : "bottom right" }}
            className={`absolute bottom-[calc(100%-4px)] w-max max-w-[210px] rounded-2xl border border-cian/40 bg-noche-800/95 px-3 py-2 text-left text-[13px] font-semibold leading-snug text-white shadow-neon backdrop-blur ${izq ? "left-2 rounded-bl-md" : "right-2 rounded-br-md"}`}
          >
            {globo}
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label="Hablar con Blanquita (puedes arrastrarla)"
        onClick={() => { if (!recienArrastrada.current) alAbrir(); }}
        whileTap={{ scale: 0.92 }}
        animate={arrastrando ? { rotate: izq ? -10 : 10, scale: 1.08 } : { rotate: 0, scale: 1 }}
        className="relative grid h-full w-full place-items-end justify-center"
      >
        {/* cojín con brillo que gira */}
        <span className="absolute bottom-0 left-1/2 h-[32px] w-[74px] -translate-x-1/2 overflow-hidden rounded-[50%] p-[2px]">
          <motion.span
            className="absolute inset-[-40%] bg-[conic-gradient(from_0deg,#67e8f9,#a78bfa,#f472b6,#67e8f9)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <span className="relative block h-full w-full rounded-[50%] bg-noche-800" />
        </span>
        <span className="absolute bottom-1 left-1/2 h-4 w-14 -translate-x-1/2 rounded-[50%] bg-cian/25 blur-md" />

        {/* Blanquita respirando */}
        <motion.span
          className="relative mb-[7px] block"
          animate={arrastrando ? { y: 0 } : { scaleY: [1, 1.035, 1], y: [0, -1, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "bottom center" }}
        >
          <Gatita clave="blanquita" pose="sentada" expresion={expresion} cabeza={cabeza}
            ronroneando={arrastrando} espejo={!izq} ancho={80} />
        </motion.span>

        {/* chispita de IA */}
        <motion.span
          className="absolute right-0.5 top-2 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-cian to-violeta text-noche shadow-neon"
          animate={{ scale: [1, 1.18, 1], rotate: [0, 12, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2Z" /></svg>
        </motion.span>
      </motion.button>
    </motion.div>
  );
}
