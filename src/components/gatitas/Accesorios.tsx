import type { ClaveAccesorio } from "@/lib/tipos";
import { TINTA } from "./perfiles";

export const CATALOGO_ACCESORIOS: { clave: ClaveAccesorio; nombre: string; precio: number }[] = [
  { clave: "mono", nombre: "Moño rosa", precio: 30 },
  { clave: "collar", nombre: "Collar con cascabel", precio: 45 },
  { clave: "gorrito", nombre: "Gorrito de fiesta", precio: 60 },
  { clave: "lentes", nombre: "Lentes neón", precio: 90 },
  { clave: "corona", nombre: "Corona de estrellas", precio: 150 },
];

/** Se dibuja dentro del sistema de coordenadas de la cabeza (centro 0,0). */
export function Accesorio({ clave }: { clave: ClaveAccesorio }) {
  const t = { stroke: TINTA, strokeWidth: 2, strokeLinejoin: "round" as const };
  switch (clave) {
    case "mono":
      return (
        <g transform="translate(15 -19) rotate(18)">
          <path d="M0,0 L-10,-7 L-10,7 Z" fill="#f472b6" {...t} />
          <path d="M0,0 L10,-7 L10,7 Z" fill="#f472b6" {...t} />
          <circle r={3.4} fill="#f9a8d4" {...t} />
        </g>
      );
    case "collar":
      return (
        <g>
          <path d="M-17,19.5 Q0,29 17,19.5" fill="none" stroke={TINTA} strokeWidth={7} strokeLinecap="round" />
          <path d="M-17,19.5 Q0,29 17,19.5" fill="none" stroke="#e94b6a" strokeWidth={3.6} strokeLinecap="round" />
          <circle cx={0} cy={28} r={4} fill="#f5c84b" {...t} />
          <path d="M-2,29.5 h4" stroke={TINTA} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case "gorrito":
      return (
        <g transform="rotate(14)">
          <path d="M-9,-20 L0,-48 L10,-20 Z" fill="#a78bfa" {...t} />
          <path d="M-5.6,-30 L6.4,-30 M-2.6,-39 L3.4,-39" stroke="#f9a8d4" strokeWidth={2.4} strokeLinecap="round" />
          <circle cx={0} cy={-49} r={3.6} fill="#f9a8d4" {...t} />
        </g>
      );
    case "lentes":
      return (
        <g>
          <path d="M-20,-4 H20 V5 Q20,8 17,8 H3 L0,5 L-3,8 H-17 Q-20,8 -20,5 Z" fill="#67e8f9" fillOpacity={0.55} {...t} />
          <path d="M-16,-1 H-6" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
          <path d="M-20,-1 L-27,-3 M20,-1 L27,-3" stroke={TINTA} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case "corona":
      return (
        <g transform="translate(0 -1)">
          <path d="M-12,-20 L-13,-31 L-6,-25 L0,-34 L6,-25 L13,-31 L12,-20 Z" fill="#f5c84b" {...t} />
          <circle cx={0} cy={-25} r={1.8} fill="#f472b6" />
        </g>
      );
  }
}
