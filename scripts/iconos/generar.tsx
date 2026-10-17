/**
 * Genera los íconos PNG de la app instalable y de las notificaciones
 * a partir de los mismos dibujos SVG de la app.
 * Uso: node scripts/iconos/construir.mjs  (necesita Playwright con Chromium)
 */
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { Gatita } from "@/components/gatitas/Gatita";
import { ORDEN_GATITAS } from "@/components/gatitas/perfiles";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import type { NombreIcono } from "@/lib/tipos";

const salida = process.argv[2];

function Cara({ tam }: { tam: number }) {
  return (
    <svg viewBox="-34 -40 68 68" width={tam} height={tam}>
      <path d="M-25,-7 L-21,-34 L-5,-20 Z M25,-7 L21,-34 L5,-20 Z" fill="#f7f3ef" stroke="#2b2233" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-20.5,-13 L-18.8,-28 L-9.5,-19.5 Z M20.5,-13 L18.8,-28 L9.5,-19.5 Z" fill="#f6b3c2" />
      <path d="M-28,4 C-29,-14 -17,-22 0,-22 C17,-22 29,-14 28,4 C27,18 14,24 0,24 C-14,24 -27,18 -28,4 Z" fill="#f7f3ef" stroke="#2b2233" strokeWidth="2.6" />
      <ellipse cx="14" cy="12" rx="7.5" ry="4.8" fill="#bdb6c2" opacity=".7" />
      <path d="M-15.5,3 Q-11,-3.5 -6.5,3 M6.5,3 Q11,-3.5 15.5,3" fill="none" stroke="#2b2233" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="-19" cy="9" rx="4.2" ry="2.4" fill="#ff8fb1" opacity=".55" /><ellipse cx="19" cy="9" rx="4.2" ry="2.4" fill="#ff8fb1" opacity=".55" />
      <path d="M-2.8,7 L2.8,7 L0,10 Z" fill="#f29bb0" stroke="#2b2233" strokeWidth="1" strokeLinejoin="round" />
      <path d="M0,10.3 Q-2.6,14.4 -5.3,12 M0,10.3 Q2.6,14.4 5.3,12" fill="none" stroke="#2b2233" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const lienzo = (tam: number, contenido: JSX.Element, fondo = "transparent", radio = 0) => (
  <div style={{ width: tam, height: tam, background: fondo, borderRadius: radio, display: "grid", placeItems: "center", overflow: "hidden" }}>{contenido}</div>
);

const piezas: Record<string, JSX.Element> = {
  "icono-512": lienzo(512, <Cara tam={400} />, "linear-gradient(145deg,#2a2338,#121212)", 112),
  "icono-192": lienzo(192, <Cara tam={150} />, "linear-gradient(145deg,#2a2338,#121212)", 42),
  "icono-maskable-512": lienzo(512, <Cara tam={300} />, "linear-gradient(145deg,#3a2f52,#16131f)"),
  "apple-touch-icon": lienzo(180, <Cara tam={140} />, "linear-gradient(145deg,#2a2338,#121212)"),
  "insignia-96": lienzo(96, <span style={{ color: "#fff" }}><IconoNeko nombre="huella" tamano={80} grosor={2.4} /></span>),
};
for (const c of ORDEN_GATITAS) {
  piezas[`gatitas/${c}`] = lienzo(192, <div style={{ marginTop: 18 }}><Gatita clave={c} pose="sentada" expresion="feliz" ancho={190} halo={false} /></div>, "#2a2338", 96);
}
const atajos: [string, NombreIcono, string][] = [["atajo-agua", "agua", "#67e8f9"], ["atajo-tarea", "tarea", "#a78bfa"], ["atajo-blanquita", "chispa", "#f9a8d4"], ["atajo-calendario", "calendario", "#e8a85b"]];
for (const [n, icono, color] of atajos) {
  piezas[n] = lienzo(96, <span style={{ color }}><IconoNeko nombre={icono} tamano={60} grosor={2.2} /></span>, "#1e1c27", 24);
}

const html = Object.entries(piezas).map(([n, el]) => `<div data-n="${n}" style="display:inline-block;margin:4px">${renderToStaticMarkup(el)}</div>`).join("");
writeFileSync(salida, `<html><body style="margin:0;background:transparent">${html}</body></html>`);
