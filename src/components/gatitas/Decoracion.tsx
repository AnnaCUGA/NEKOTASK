/**
 * "Cosas para la sala": decoración que se compra con croquetas y aparece en la escena de las gatitas.
 * Dibujos en el mismo estilo que el fondo (tinta #2b2233, rellenos pastel y neón).
 */
import type { ClaveAccesorio, ClaveDecoracion } from "@/lib/tipos";

const T = "#2b2233";
const t = { stroke: T, strokeWidth: 2.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export interface PiezaCatalogo {
  clave: ClaveDecoracion;
  nombre: string;
  precio: number;
  /** dónde va en la escena: % horizontal, y si está en el suelo o arriba */
  lugar: { x: number; donde: "suelo" | "arriba"; ancho: number; detras?: boolean };
}

export const CATALOGO_DECORACION: PiezaCatalogo[] = [
  { clave: "estambre", nombre: "Bola de estambre", precio: 20, lugar: { x: 33, donde: "suelo", ancho: 30 } },
  { clave: "cojin", nombre: "Cojín de corazón", precio: 30, lugar: { x: 24, donde: "suelo", ancho: 58, detras: true } },
  { clave: "planta", nombre: "Plantita", precio: 45, lugar: { x: 97, donde: "suelo", ancho: 48, detras: true } },
  { clave: "luces", nombre: "Guirnalda de luces", precio: 55, lugar: { x: 50, donde: "arriba", ancho: 0 } },
  { clave: "camita", nombre: "Camita redonda", precio: 60, lugar: { x: 71, donde: "suelo", ancho: 78, detras: true } },
  { clave: "lampara", nombre: "Lámpara de lava", precio: 70, lugar: { x: 51, donde: "suelo", ancho: 30, detras: true } },
  { clave: "rascador", nombre: "Torre rascador", precio: 90, lugar: { x: 86, donde: "suelo", ancho: 62, detras: true } },
  { clave: "pecera", nombre: "Pecera", precio: 120, lugar: { x: 42, donde: "suelo", ancho: 50, detras: true } },
  { clave: "luna", nombre: "Luna llena", precio: 150, lugar: { x: 86, donde: "arriba", ancho: 64 } },
  { clave: "alfombra", nombre: "Alfombra de estrellas", precio: 100, lugar: { x: 50, donde: "suelo", ancho: 0, detras: true } },
];

/** Lo que se compró con la tienda anterior pasa a su equivalente en la sala */
export const DE_ACCESORIO: Record<ClaveAccesorio, ClaveDecoracion> = {
  mono: "cojin", collar: "planta", gorrito: "camita", lentes: "rascador", corona: "luna",
};

/** Dibujo de cada pieza; viewBox propio, base en el borde inferior */
export function PiezaDecoracion({ clave, ancho = 60 }: { clave: ClaveDecoracion; ancho?: number }) {
  const v = VISTAS[clave];
  return (
    <svg viewBox={v.caja} width={ancho} height={(ancho * v.alto) / v.ancho} aria-hidden style={{ overflow: "visible" }}>
      {v.dibujo}
    </svg>
  );
}

const VISTAS: Record<ClaveDecoracion, { caja: string; ancho: number; alto: number; dibujo: React.ReactNode }> = {
  estambre: {
    caja: "0 0 40 34", ancho: 40, alto: 34,
    dibujo: (<>
      <path d="M30 26 q6 4 9 2" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="18" r="15" fill="#f472b6" {...t} />
      <path d="M7 10 q10 6 20 -3 M5 18 q13 6 26 -6 M8 27 q12 -2 22 -14 M14 32 q2 -14 14 -26" fill="none" stroke="#f9a8d4" strokeWidth="1.8" strokeLinecap="round" />
    </>),
  },
  cojin: {
    caja: "0 0 70 40", ancho: 70, alto: 40,
    dibujo: (<>
      <ellipse cx="35" cy="37" rx="30" ry="3" fill="#000" opacity=".25" />
      <path d="M35 36 C10 28 3 18 8 10 c5 -8 18 -6 27 4 c9 -10 22 -12 27 -4 c5 8 -2 18 -27 26Z" fill="#f9a8d4" {...t} />
      <path d="M16 13 q4 -3 9 0" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </>),
  },
  planta: {
    caja: "0 0 50 66", ancho: 50, alto: 66,
    dibujo: (<>
      <path d="M25 40 C14 34 6 22 9 10 C18 16 24 26 25 40Z" fill="#9cc96b" {...t} />
      <path d="M25 40 C34 30 44 26 46 14 C34 16 26 26 25 40Z" fill="#7fb352" {...t} />
      <path d="M25 40 C22 28 24 14 30 4 C34 16 30 30 25 40Z" fill="#a8d67a" {...t} />
      <path d="M12 40 h26 l-3 22 a3 3 0 0 1 -3 3 h-14 a3 3 0 0 1 -3 -3Z" fill="#e8a85b" {...t} />
      <path d="M11 40 h28 v6 h-28Z" fill="#d48f45" {...t} />
    </>),
  },
  luces: { caja: "0 0 10 10", ancho: 10, alto: 10, dibujo: null }, // se dibuja a todo lo ancho en la escena
  camita: {
    caja: "0 0 90 40", ancho: 90, alto: 40,
    dibujo: (<>
      <ellipse cx="45" cy="37" rx="42" ry="3.5" fill="#000" opacity=".25" />
      <path d="M4 22 Q4 38 45 38 Q86 38 86 22 Q86 12 45 12 Q4 12 4 22Z" fill="#a78bfa" {...t} />
      <ellipse cx="45" cy="21" rx="31" ry="7" fill="#c4b5fd" {...t} />
      <path d="M14 30 q31 8 62 0" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
    </>),
  },
  lampara: {
    caja: "0 0 30 70", ancho: 30, alto: 70,
    dibujo: (<>
      <ellipse cx="15" cy="34" rx="16" ry="20" fill="#f472b6" opacity=".18" />
      <path d="M9 8 h12 l5 40 h-22Z" fill="#67e8f9" fillOpacity=".55" {...t} />
      <circle cx="15" cy="22" r="4" fill="#f472b6"><animate attributeName="cy" values="40;16;40" dur="7s" repeatCount="indefinite" /></circle>
      <circle cx="13" cy="36" r="3" fill="#f9a8d4"><animate attributeName="cy" values="20;42;20" dur="9s" repeatCount="indefinite" /></circle>
      <path d="M8 2 h14 l-1 6 h-12Z M4 48 h22 l3 18 h-28Z" fill="#3b3150" {...t} />
    </>),
  },
  rascador: {
    caja: "0 0 70 100", ancho: 70, alto: 100,
    dibujo: (<>
      <ellipse cx="35" cy="97" rx="32" ry="3" fill="#000" opacity=".25" />
      <rect x="27" y="22" width="16" height="70" fill="#e8c79a" {...t} />
      <path d="M27 32 h16 M27 42 h16 M27 52 h16 M27 62 h16 M27 72 h16 M27 82 h16" stroke="#c9a06b" strokeWidth="2" />
      <rect x="4" y="88" width="62" height="10" rx="3" fill="#a78bfa" {...t} />
      <rect x="12" y="12" width="46" height="12" rx="4" fill="#c4b5fd" {...t} />
      <path d="M50 24 v12" stroke={T} strokeWidth="1.6" /><circle cx="50" cy="40" r="4" fill="#f472b6" {...t} />
    </>),
  },
  pecera: {
    caja: "0 0 56 56", ancho: 56, alto: 56,
    dibujo: (<>
      <ellipse cx="28" cy="53" rx="20" ry="2.5" fill="#000" opacity=".25" />
      <path d="M12 10 h32 q10 12 6 30 q-4 12 -22 12 q-18 0 -22 -12 q-4 -18 6 -30Z" fill="#67e8f9" fillOpacity=".35" {...t} />
      <path d="M8 26 q20 -6 40 0 v14 q-4 12 -20 12 q-16 0 -20 -12Z" fill="#67c7f0" fillOpacity=".55" />
      <g><animateTransform attributeName="transform" type="translate" values="0 0;8 2;0 0" dur="4s" repeatCount="indefinite" />
        <path d="M18 36 q6 -6 12 0 q-6 6 -12 0Z M30 36 l5 -4 v8Z" fill="#f5a142" stroke={T} strokeWidth="1.4" strokeLinejoin="round" />
      </g>
      <circle cx="36" cy="24" r="1.6" fill="#fff" opacity=".8" /><circle cx="39" cy="18" r="1.1" fill="#fff" opacity=".7" />
    </>),
  },
  luna: {
    caja: "0 0 70 60", ancho: 70, alto: 60,
    dibujo: (<>
      <circle cx="35" cy="28" r="26" fill="#fff6dd" opacity=".12" />
      <circle cx="35" cy="28" r="19" fill="#f6efe0" />
      <circle cx="28" cy="22" r="3.5" fill="#e3d8c2" /><circle cx="41" cy="33" r="4.5" fill="#e3d8c2" /><circle cx="39" cy="18" r="2" fill="#e3d8c2" />
      <path d="M2 48 q4 -8 12 -5 q4 -7 12 -2 q8 -2 9 6 Z" fill="#2c2540" />
      <path d="M40 54 q3 -6 10 -4 q4 -6 11 -1 q6 0 7 5 Z" fill="#2c2540" />
    </>),
  },
  alfombra: { caja: "0 0 10 10", ancho: 10, alto: 10, dibujo: null }, // se dibuja sobre el piso en la escena
};

/** Miniatura para la tienda (las piezas "de escena" tienen su propio ícono) */
export function MiniaturaDecoracion({ clave }: { clave: ClaveDecoracion }) {
  if (clave === "luces") {
    return (
      <svg viewBox="0 0 80 30" width={74} height={28} aria-hidden>
        <path d="M2 6 Q40 26 78 6" fill="none" stroke={T} strokeWidth="1.8" />
        {[10, 22, 34, 46, 58, 70].map((x, i) => (
          <circle key={x} cx={x} cy={6 + 20 * (1 - ((x - 40) / 38) ** 2) * 0.5 + 2} r="3.6" fill={["#f472b6", "#67e8f9", "#fbbf24", "#a78bfa"][i % 4]} stroke={T} strokeWidth="1.4" />
        ))}
      </svg>
    );
  }
  if (clave === "alfombra") {
    return (
      <svg viewBox="0 0 80 30" width={74} height={28} aria-hidden>
        <ellipse cx="40" cy="16" rx="36" ry="11" fill="#3b2f5c" {...t} />
        <ellipse cx="40" cy="16" rx="28" ry="7" fill="none" stroke="#a78bfa" strokeWidth="1.6" strokeDasharray="3 3" />
        {[[26, 14], [40, 19], [54, 13]].map(([x, y]) => <path key={x} d={`M${x} ${y - 3} l1 2 2 .3 -1.5 1.5 .4 2 -1.9 -1 -1.9 1 .4 -2 -1.5 -1.5 2 -.3Z`} fill="#fbbf24" />)}
      </svg>
    );
  }
  const v = VISTAS[clave];
  return <PiezaDecoracion clave={clave} ancho={Math.round(Math.min(70, (62 * v.ancho) / v.alto))} />;
}

/** Guirnalda que cruza la parte de arriba de la escena */
export function Guirnalda() {
  const focos = Array.from({ length: 24 }, (_, i) => i);
  return (
    <svg className="pointer-events-none absolute inset-x-0 top-0 h-12 w-full" viewBox="0 0 1000 48" preserveAspectRatio="none" aria-hidden>
      <path d="M0 6 Q125 34 250 8 T500 8 T750 8 T1000 8" fill="none" stroke="#3b3150" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {focos.map((i) => {
        const x = 20 + i * 41;
        const fase = ((x % 250) / 250) * Math.PI;
        const y = 8 + Math.sin(fase) * 15;
        return (
          <circle key={i} cx={x} cy={y + 6} r="5" fill={["#f472b6", "#67e8f9", "#fbbf24", "#a78bfa"][i % 4]}>
            <animate attributeName="opacity" values="1;.35;1" dur={`${1.6 + (i % 5) * 0.4}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </svg>
  );
}

/** Alfombra ovalada sobre el piso */
export function Alfombra() {
  return (
    <svg className="pointer-events-none absolute bottom-[2px] left-1/2 h-[26px] w-[62%] -translate-x-1/2" viewBox="0 0 400 26" preserveAspectRatio="none" aria-hidden>
      <ellipse cx="200" cy="13" rx="196" ry="11" fill="#3b2f5c" stroke={T} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <ellipse cx="200" cy="13" rx="170" ry="7" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" opacity=".8" />
    </svg>
  );
}
