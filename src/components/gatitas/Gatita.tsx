"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { ClaveAccesorio, ClaveGatita } from "@/lib/tipos";
import blanquita from "./atlas/blanquita.json";
import bizca from "./atlas/bizca.json";
import mango from "./atlas/mango.json";
import ronro from "./atlas/ronro.json";
import { PERFILES } from "./perfiles";

export type Pose = "sentada" | "echada" | "dormida" | "panzaArriba";
export type Expresion = "normal" | "feliz" | "dormida" | "sorprendida" | "concentrada";
export type MovCabeza = "normal" | "inclinada" | "bebiendo" | "asentir";

export interface GatitaProps {
  clave: ClaveGatita;
  pose?: Pose;
  expresion?: Expresion;
  cabeza?: MovCabeza;
  /** @deprecated los sprites pintados no llevan accesorios (ahora se decora la sala) */
  accesorio?: ClaveAccesorio;
  ronroneando?: boolean;
  caminando?: boolean;
  ancho?: number;
  espejo?: boolean;
  className?: string;
  titulo?: string;
  /** Contorno claro para que resalte sobre fondos oscuros */
  halo?: boolean;
}

interface Atlas { ancho: number; alto: number; cuadros: number[][] }
const ATLAS: Record<ClaveGatita, Atlas> = { blanquita, bizca, mango, ronro };

/** En la app se sirven de /sprites; en la vista previa de un solo archivo vienen incrustados */
declare global { interface Window { __NEKO_SPRITES?: Partial<Record<ClaveGatita, string>> } }
const urlAtlas = (c: ClaveGatita) => (typeof window !== "undefined" && window.__NEKO_SPRITES?.[c]) || `/sprites/${c}.webp`;

/**
 * Cuadros de las hojas de sprites (mismo acomodo para las cuatro):
 * 0-4 acostada · 5-11 caminando → · 18-20 sentada/saludo · 21-25 salto · 26-50 sentada en varias poses · 51-64 cabecitas
 */
const C = {
  dormida: [3, 4],
  echada: [1],
  echadaFeliz: [2],
  panza: [48],
  sentada: [36],
  feliz: [20],
  sorprendida: [35],
  concentrada: [26],
  ojosCerrados: [43],
  inclinada: [38],
  bebiendo: [44],
  asentir: [36, 29],
  caminar: [5, 6, 7, 8, 9, 10, 11],
};

function secuencia(pose: Pose, expresion: Expresion, cabeza: MovCabeza, caminando: boolean): { cuadros: number[]; ms: number } {
  if (caminando) return { cuadros: C.caminar, ms: 95 };
  if (pose === "dormida") return { cuadros: C.dormida, ms: 1900 };
  if (pose === "echada") return { cuadros: expresion === "dormida" ? [3] : expresion === "feliz" ? C.echadaFeliz : C.echada, ms: 0 };
  if (pose === "panzaArriba") return { cuadros: C.panza, ms: 0 };
  if (cabeza === "bebiendo") return { cuadros: C.bebiendo, ms: 0 };
  if (cabeza === "asentir") return { cuadros: C.asentir, ms: 550 };
  if (cabeza === "inclinada") return { cuadros: C.inclinada, ms: 0 };
  switch (expresion) {
    case "feliz": return { cuadros: C.feliz, ms: 0 };
    case "sorprendida": return { cuadros: C.sorprendida, ms: 0 };
    case "concentrada": return { cuadros: C.concentrada, ms: 0 };
    case "dormida": return { cuadros: C.ojosCerrados, ms: 0 };
    default: return { cuadros: C.sentada, ms: 0 };
  }
}

const ALTO_REF = 140; // alto (px de la hoja) de una gatita sentada

export function Gatita({
  clave,
  pose = "sentada",
  expresion = "normal",
  cabeza = "normal",
  ronroneando = false,
  caminando = false,
  ancho = 120,
  espejo = false,
  className,
  titulo,
  halo = true,
}: GatitaProps) {
  const atlas = ATLAS[clave];
  const { cuadros, ms } = useMemo(() => secuencia(pose, expresion, cabeza, caminando), [pose, expresion, cabeza, caminando]);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    setPaso(0);
    if (cuadros.length < 2 || !ms) return;
    const t = window.setInterval(() => setPaso((p) => (p + 1) % cuadros.length), ms);
    return () => clearInterval(t);
  }, [cuadros, ms]);

  const alto = (ancho * 118) / 140;
  const escala = (alto * 0.94) / ALTO_REF;
  const [x, y, w, h] = atlas.cuadros[cuadros[paso % cuadros.length]];
  const quieta = !caminando && !ronroneando;

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ width: ancho, height: alto }}
      role="img"
      aria-label={titulo ?? PERFILES[clave].nombre}
    >
      {/* sombra en el suelo */}
      <span
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] bg-black/25"
        style={{ width: Math.min(w * escala * 0.8, ancho * 0.9), height: Math.max(4, alto * 0.05) }}
      />
      <motion.div
        className="absolute bottom-[2%] left-1/2"
        style={{ x: "-50%", originY: 1 }}
        animate={
          ronroneando ? { x: ["-50%", "-51%", "-49%", "-50%"], scaleY: [1, 1.015, 1] }
            : quieta ? { scaleY: [1, pose === "dormida" ? 1.04 : 1.018, 1] }
              : { scaleY: 1 }
        }
        transition={ronroneando ? { duration: 0.25, repeat: Infinity } : { duration: pose === "dormida" ? 3.8 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          style={{
            width: w * escala,
            height: h * escala,
            backgroundImage: `url(${urlAtlas(clave)})`,
            backgroundSize: `${atlas.ancho * escala}px ${atlas.alto * escala}px`,
            backgroundPosition: `${-x * escala}px ${-y * escala}px`,
            backgroundRepeat: "no-repeat",
            transform: espejo ? "scaleX(-1)" : undefined,
            filter: halo ? "drop-shadow(0 0 1px rgba(250,245,255,.45)) drop-shadow(0 0 6px rgba(167,139,250,.22))" : undefined,
          }}
        />
      </motion.div>
    </div>
  );
}

/** Cabecita (para avatares): cuadros 51-64 */
export function CaritaGatita({ clave, tamano = 40, cuadro = 51 }: { clave: ClaveGatita; tamano?: number; cuadro?: number }) {
  const atlas = ATLAS[clave];
  const [x, y, w, h] = atlas.cuadros[cuadro];
  const escala = tamano / Math.max(w, h);
  return (
    <span className="inline-block" role="img" aria-label={PERFILES[clave].nombre}
      style={{
        width: w * escala, height: h * escala,
        backgroundImage: `url(${urlAtlas(clave)})`,
        backgroundSize: `${atlas.ancho * escala}px ${atlas.alto * escala}px`,
        backgroundPosition: `${-x * escala}px ${-y * escala}px`,
      }} />
  );
}
