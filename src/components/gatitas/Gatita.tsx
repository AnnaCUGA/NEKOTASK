"use client";

import { motion } from "framer-motion";
import { useId, useMemo } from "react";
import type { ClaveAccesorio, ClaveGatita } from "@/lib/tipos";
import { PERFILES, TINTA, type PerfilVisual } from "./perfiles";
import { Accesorio } from "./Accesorios";

export type Pose = "sentada" | "echada" | "dormida" | "panzaArriba";
export type Expresion = "normal" | "feliz" | "dormida" | "sorprendida" | "concentrada";
export type MovCabeza = "normal" | "inclinada" | "bebiendo" | "asentir";

export interface GatitaProps {
  clave: ClaveGatita;
  pose?: Pose;
  expresion?: Expresion;
  cabeza?: MovCabeza;
  accesorio?: ClaveAccesorio;
  ronroneando?: boolean;
  ancho?: number;
  espejo?: boolean;
  className?: string;
  titulo?: string;
  /** Contorno claro para que la tinta oscura resalte sobre fondos oscuros */
  halo?: boolean;
}

const TRAZO = 2.6;
const BLANCO = "#fbf7f1";

// ─── Geometría de cada pose (suelo en y = 0, centro en x = 0) ──────────
interface Elipse { cx: number; cy: number; rx: number; ry: number }
interface DefPose {
  cuerpo: string;
  cola: { d: string; origen?: string; delante?: boolean };
  patas?: Elipse[];
  patasArriba?: string[];
  lineas?: string;
  cabeza: { x: number; y: number; r: number; s?: number };
  pecho?: Elipse;
  panza?: Elipse;
  rayas: string;
  parche: string;
}

const POSES: Record<Pose, DefPose> = {
  sentada: {
    cuerpo: "M-20,0 C-25,-15 -21,-35 -10,-43 C-4,-47 4,-47 10,-43 C21,-35 25,-15 20,0 Z",
    cola: { d: "M14,-7 C36,-6 42,-22 31,-37", origen: "0% 100%" },
    patas: [{ cx: -9, cy: -1, rx: 6.8, ry: 3.9 }, { cx: 9, cy: -1, rx: 6.8, ry: 3.9 }],
    lineas: "M-3.5,-19 L-3.5,-4 M3.5,-19 L3.5,-4",
    cabeza: { x: 0, y: -62, r: 0 },
    pecho: { cx: 0, cy: -30, rx: 8.5, ry: 12 },
    panza: { cx: 0, cy: -20, rx: 9, ry: 14 },
    rayas: "M-23,-12 h8 M-24,-21 h8 M-21,-30 h7 M23,-12 h-8 M24,-21 h-8 M21,-30 h-7",
    parche: "M6,-45 C22,-34 27,-14 21,0 L11,0 C14,-16 12,-31 3,-41 Z",
  },
  echada: {
    cuerpo: "M-38,0 C-40,-15 -30,-28 -6,-29 C20,-30 37,-21 38,-9 C39,-3 35,0 30,0 Z",
    cola: { d: "M32,-7 C46,-6 53,-12 55,-23", origen: "0% 100%" },
    patas: [{ cx: -32, cy: -1.5, rx: 7.5, ry: 3.8 }, { cx: -17, cy: -1.5, rx: 7.5, ry: 3.8 }],
    lineas: "M12,-6 Q19,1 28,-3",
    cabeza: { x: -24, y: -37, r: -6 },
    pecho: { cx: -26, cy: -13, rx: 9, ry: 9 },
    panza: { cx: -2, cy: -5, rx: 18, ry: 5 },
    rayas: "M-2,-30 v9 M8,-30 v9 M18,-28 v9 M28,-23 v8",
    parche: "M8,-31 C28,-29 39,-18 38,-6 L24,-4 C22,-15 17,-23 4,-27 Z",
  },
  dormida: {
    cuerpo: "M-36,0 C-40,-21 -23,-38 0,-38 C25,-38 40,-21 36,0 Z",
    cola: { d: "M33,-5 C22,5 -18,5 -33,-4", delante: true },
    patas: [{ cx: -25, cy: -2, rx: 7, ry: 3.6 }],
    cabeza: { x: -15, y: -25, r: -14, s: 0.92 },
    rayas: "M-4,-39 v10 M8,-38 v10 M20,-33 v9 M31,-23 l-8,4",
    parche: "M4,-39 C24,-38 39,-22 36,0 L20,0 C22,-15 16,-27 2,-31 Z",
  },
  panzaArriba: {
    cuerpo: "M-34,-11 C-35,-25 -15,-31 4,-31 C24,-31 37,-23 37,-12 C37,-2 24,0 4,0 C-16,0 -34,2 -34,-11 Z",
    cola: { d: "M34,-9 C46,-8 50,1 58,-4", origen: "0% 50%" },
    patasArriba: ["M-12,-25 L-15,-38", "M1,-28 L2,-41", "M15,-27 L19,-39", "M27,-22 L35,-31"],
    cabeza: { x: -36, y: -25, r: -22 },
    panza: { cx: 5, cy: -13, rx: 22, ry: 8 },
    pecho: { cx: -15, cy: -14, rx: 9, ry: 7 },
    rayas: "M-2,-31 v6 M10,-31 v6 M22,-29 v6",
    parche: "M10,-31 C28,-30 37,-22 37,-12 L24,-10 C22,-18 18,-25 6,-28 Z",
  },
};

// ─── Cabeza (centrada en 0,0) ──────────────────────────────────────────
const CABEZA = "M-28,4 C-29,-14 -17,-22 0,-22 C17,-22 29,-14 28,4 C27,18 14,24 0,24 C-14,24 -27,18 -28,4 Z";
const OREJA_IZQ = "M-25,-7 L-21,-34 L-5,-20 Z";
const OREJA_DER = "M25,-7 L21,-34 L5,-20 Z";
const INT_IZQ = "M-20.5,-13 L-18.8,-28 L-9.5,-19.5 Z";
const INT_DER = "M20.5,-13 L18.8,-28 L9.5,-19.5 Z";

function Cola({ d, perfil, origen }: { d: string; perfil: PerfilVisual; origen?: string }) {
  return (
    <motion.g
      style={{ transformBox: "fill-box", transformOrigin: origen ?? "0% 100%" }}
      animate={origen ? { rotate: [-5, 9, -5] } : undefined}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d={d} fill="none" stroke={TINTA} strokeWidth={10.5} strokeLinecap="round" />
      <path d={d} fill="none" stroke={perfil.pelaje} strokeWidth={5.8} strokeLinecap="round" />
      {perfil.colaAnillada && perfil.rayas && (
        <path d={d} fill="none" stroke={perfil.rayas} strokeWidth={5.8} strokeDasharray="4 5" strokeLinecap="butt" />
      )}
      {perfil.rayas && !perfil.colaAnillada && (
        <path d={d} fill="none" stroke={perfil.rayas} strokeWidth={5.8} strokeDasharray="2.5 9" strokeLinecap="butt" opacity={0.7} />
      )}
    </motion.g>
  );
}

function Ojos({ perfil, expresion }: { perfil: PerfilVisual; expresion: Expresion }) {
  if (expresion === "feliz") {
    return (
      <path d="M-15.5,3 Q-11,-3.5 -6.5,3 M6.5,3 Q11,-3.5 15.5,3" fill="none" stroke={TINTA} strokeWidth={2.4} strokeLinecap="round" />
    );
  }
  if (expresion === "dormida") {
    return (
      <path d="M-15.5,1 Q-11,5.5 -6.5,1 M6.5,1 Q11,5.5 15.5,1" fill="none" stroke={TINTA} strokeWidth={2.4} strokeLinecap="round" />
    );
  }
  const grande = expresion === "sorprendida";
  const irisRx = grande ? 6 : 5.2;
  const irisRy = grande ? 7 : 6.2;
  const pupRx = grande ? 4.2 : 3.5;
  const pupRy = grande ? 5.4 : 4.8;
  const desvio = perfil.ojosBizcos ? 1.7 : 0;
  return (
    <motion.g
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      animate={{ scaleY: [1, 1, 0.12, 1] }}
      transition={{ duration: 4.8, times: [0, 0.9, 0.95, 1], repeat: Infinity, delay: Math.random() * 3 }}
    >
      {[-11, 11].map((x) => {
        const px = x + (x < 0 ? desvio : -desvio);
        return (
          <g key={x}>
            <ellipse cx={x} cy={1} rx={irisRx} ry={irisRy} fill={perfil.ojos} stroke={TINTA} strokeWidth={1.6} />
            <ellipse cx={px} cy={1.4} rx={pupRx} ry={pupRy} fill={TINTA} />
            <circle cx={px + 1.5} cy={-1.6} r={1.5} fill="#fff" />
          </g>
        );
      })}
      {expresion === "concentrada" && (
        <path d="M-17,-5.5 h12 v4.5 h-12 Z M5,-5.5 h12 v4.5 h-12 Z" fill={perfil.pelaje} stroke="none" />
      )}
      {expresion === "concentrada" && (
        <path d="M-16.5,-1 h11 M5.5,-1 h11" stroke={TINTA} strokeWidth={2} strokeLinecap="round" />
      )}
    </motion.g>
  );
}

function Boca({ expresion }: { expresion: Expresion }) {
  if (expresion === "feliz") {
    return <path d="M-4,10.8 Q0,18 4,10.8 Z" fill="#d95a78" stroke={TINTA} strokeWidth={1.4} strokeLinejoin="round" />;
  }
  if (expresion === "sorprendida") {
    return <ellipse cx={0} cy={14} rx={2.3} ry={2.9} fill="#d95a78" stroke={TINTA} strokeWidth={1.4} />;
  }
  return (
    <path d="M0,10.3 Q-2.6,14.4 -5.3,12 M0,10.3 Q2.6,14.4 5.3,12" fill="none" stroke={TINTA} strokeWidth={1.5} strokeLinecap="round" />
  );
}

function Cabeza({
  perfil, expresion, accesorio, idClip,
}: { perfil: PerfilVisual; expresion: Expresion; accesorio?: ClaveAccesorio; idClip: string }) {
  return (
    <g>
      {/* orejas */}
      <path d={OREJA_IZQ} fill={perfil.orejaParche === "izq" && perfil.parche ? perfil.parche : perfil.pelaje} stroke={TINTA} strokeWidth={TRAZO} strokeLinejoin="round" />
      <path d={OREJA_DER} fill={perfil.pelaje} stroke={TINTA} strokeWidth={TRAZO} strokeLinejoin="round" />
      <path d={INT_IZQ} fill={perfil.interiorOreja} />
      <path d={INT_DER} fill={perfil.interiorOreja} />

      {/* cara */}
      <path d={CABEZA} fill={perfil.pelaje} />
      <g clipPath={`url(#${idClip})`}>
        {perfil.parche && <path d="M-31,-25 L2,-25 C0,-13 -12,-5 -31,-1 Z" fill={perfil.parche} />}
        {perfil.rayas && (
          <path
            d="M-7,-22 l1.2,8 M0,-23 v10 M7,-22 l-1.2,8 M-30,-1 h6 M-30,5 h5 M30,-1 h-6 M30,5 h-5"
            stroke={perfil.rayas} strokeWidth={2.6} strokeLinecap="round"
          />
        )}
        {perfil.hocicoBlanco && <ellipse cx={0} cy={12.5} rx={12} ry={8.5} fill={BLANCO} />}
        {perfil.pechoBlanco && <ellipse cx={0} cy={19} rx={9} ry={6} fill={BLANCO} />}
        {perfil.panza && <ellipse cx={0} cy={13} rx={10} ry={7} fill={perfil.panza} />}
        {perfil.manchaMejilla && <ellipse cx={14} cy={12} rx={7.5} ry={4.8} fill={perfil.manchaMejilla} opacity={0.7} />}
      </g>
      <path d={CABEZA} fill="none" stroke={TINTA} strokeWidth={TRAZO} strokeLinejoin="round" />

      <Ojos perfil={perfil} expresion={expresion} />
      <ellipse cx={-19} cy={9} rx={4.2} ry={2.4} fill="#ff8fb1" opacity={0.45} />
      <ellipse cx={19} cy={9} rx={4.2} ry={2.4} fill="#ff8fb1" opacity={0.45} />
      <path d="M-2.8,7 L2.8,7 L0,10 Z" fill={perfil.nariz} stroke={TINTA} strokeWidth={1} strokeLinejoin="round" />
      <Boca expresion={expresion} />

      {accesorio && <Accesorio clave={accesorio} />}
    </g>
  );
}

const ANIM_CABEZA: Record<MovCabeza, { rotate?: number[]; y?: number[] }> = {
  normal: { rotate: [0, 0], y: [0, 0] },
  inclinada: { rotate: [0, 12, 12, 0], y: [0, 0] },
  bebiendo: { rotate: [0, 14, 10, 14, 0], y: [0, 9, 7, 9, 0] },
  asentir: { rotate: [0, 0], y: [0, 3, 0, 3, 0] },
};

export function Gatita({
  clave,
  pose = "sentada",
  expresion = "normal",
  cabeza = "normal",
  accesorio,
  ronroneando = false,
  ancho = 120,
  espejo = false,
  className,
  titulo,
  halo = true,
}: GatitaProps) {
  const perfil = PERFILES[clave];
  const p = POSES[pose];
  const base = useId().replace(/:/g, "");
  const idCuerpo = `${base}-cuerpo`;
  const idCabeza = `${base}-cabeza`;
  const expr: Expresion = pose === "dormida" && expresion === "normal" ? "dormida" : expresion;
  const colorPata = perfil.patasBlancas ? BLANCO : perfil.pelaje;
  const animCabeza = ANIM_CABEZA[cabeza];
  const transicionCabeza = useMemo(
    () => ({ duration: cabeza === "bebiendo" ? 1.6 : 1.1, repeat: cabeza === "normal" ? 0 : Infinity, ease: "easeInOut" as const }),
    [cabeza],
  );

  return (
    <svg
      viewBox="-70 -114 140 118"
      width={ancho}
      height={(ancho * 118) / 140}
      className={className}
      role="img"
      aria-label={titulo ?? perfil.nombre}
      style={{
        overflow: "visible",
        transform: espejo ? "scaleX(-1)" : undefined,
        filter: halo ? "drop-shadow(0 0 1.3px rgba(250,245,255,.6)) drop-shadow(0 0 7px rgba(167,139,250,.28))" : undefined,
      }}
    >
      <defs>
        <clipPath id={idCuerpo}><path d={p.cuerpo} /></clipPath>
        <clipPath id={idCabeza}><path d={CABEZA} /></clipPath>
      </defs>

      {/* sombra en el suelo */}
      <ellipse cx={pose === "sentada" ? 4 : 2} cy={2.5} rx={pose === "sentada" ? 30 : 42} ry={3.2} fill="#000" opacity={0.22} />

      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        animate={
          ronroneando
            ? { x: [0, -0.6, 0.6, -0.6, 0], scaleY: [1, 1.02, 1] }
            : { scaleY: [1, pose === "dormida" ? 1.045 : 1.022, 1] }
        }
        transition={ronroneando ? { duration: 0.25, repeat: Infinity } : { duration: pose === "dormida" ? 3.8 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {!p.cola.delante && <Cola d={p.cola.d} perfil={perfil} origen={p.cola.origen} />}

        {p.patasArriba?.map((d, i) => {
          const fin = d.split("L")[1].split(",").map(Number);
          return (
            <motion.g
              key={i}
              animate={{ rotate: [0, i % 2 ? 8 : -8, 0] }}
              transition={{ duration: 0.9 + i * 0.15, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
            >
              <path d={d} stroke={TINTA} strokeWidth={13} strokeLinecap="round" />
              <path d={d} stroke={perfil.pelaje} strokeWidth={8} strokeLinecap="round" />
              <circle cx={fin[0]} cy={fin[1]} r={5.6} fill={colorPata} stroke={TINTA} strokeWidth={TRAZO * 0.8} />
            </motion.g>
          );
        })}

        {/* cuerpo */}
        <path d={p.cuerpo} fill={perfil.pelaje} />
        <g clipPath={`url(#${idCuerpo})`}>
          {perfil.parche && <path d={p.parche} fill={perfil.parche} />}
          {perfil.rayas && <path d={p.rayas} stroke={perfil.rayas} strokeWidth={3} strokeLinecap="round" fill="none" />}
          {perfil.panza && p.panza && <ellipse {...p.panza} fill={perfil.panza} />}
          {perfil.pechoBlanco && p.pecho && <ellipse {...p.pecho} fill={BLANCO} />}
        </g>
        <path d={p.cuerpo} fill="none" stroke={TINTA} strokeWidth={TRAZO} strokeLinejoin="round" />
        {p.lineas && <path d={p.lineas} fill="none" stroke={TINTA} strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />}
        {p.patas?.map((e, i) => (
          <ellipse key={i} {...e} fill={colorPata} stroke={TINTA} strokeWidth={TRAZO * 0.85} />
        ))}

        {p.cola.delante && <Cola d={p.cola.d} perfil={perfil} />}

        {/* cabeza */}
        <g transform={`translate(${p.cabeza.x} ${p.cabeza.y}) rotate(${p.cabeza.r}) scale(${p.cabeza.s ?? 1})`}>
          <motion.g animate={animCabeza} transition={transicionCabeza} style={{ transformOrigin: "0px 20px" }}>
            <Cabeza perfil={perfil} expresion={expr} accesorio={accesorio} idClip={idCabeza} />
          </motion.g>
        </g>
      </motion.g>
    </svg>
  );
}
