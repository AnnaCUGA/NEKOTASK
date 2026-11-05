import type { ClaveGatita } from "@/lib/tipos";

/** Rasgos visuales de cada gatita, tomados de sus fotos. */
export interface PerfilVisual {
  clave: ClaveGatita;
  nombre: string;
  rol: string;
  descripcionRol: string;
  pelaje: string;
  sombra: string;            // tono un poco más oscuro del pelaje
  rayas?: string;
  parche?: string;           // mancha naranja (Mango)
  orejaParche?: "izq" | "der";
  ojos: string;
  hocicoBlanco?: boolean;
  pechoBlanco?: boolean;
  patasBlancas?: boolean;
  panza?: string;
  manchaMejilla?: string;    // la manchita gris de Blanquita
  ojosBizcos?: boolean;
  colaAnillada?: boolean;
  nariz: string;
  interiorOreja: string;
  poseFavorita: "sentada" | "echada" | "dormida" | "panzaArriba";
}

export const TINTA = "#2b2233";

export const PERFILES: Record<ClaveGatita, PerfilVisual> = {
  blanquita: {
    clave: "blanquita",
    nombre: "Blanquita",
    rol: "agua",
    descripcionRol: "Tu asistente",
    pelaje: "#f7f3ef",
    sombra: "#e3dcd6",
    ojos: "#7fb8e6",
    manchaMejilla: "#bdb6c2",
    nariz: "#f29bb0",
    interiorOreja: "#f6b3c2",
    poseFavorita: "sentada",
  },
  bizca: {
    clave: "bizca",
    nombre: "Bizca",
    rol: "tareas",
    descripcionRol: "Compañera de tareas",
    pelaje: "#ead7c0",
    sombra: "#d9c0a5",
    rayas: "#bf9c7c",
    ojos: "#8fc1e3",
    hocicoBlanco: true,
    ojosBizcos: true,
    nariz: "#f0a3a0",
    interiorOreja: "#f2b8ad",
    poseFavorita: "panzaArriba",
  },
  mango: {
    clave: "mango",
    nombre: "Mango",
    rol: "pomodoro",
    descripcionRol: "Coach del Pomodoro",
    pelaje: "#7d5f48",
    sombra: "#6a4f3b",
    rayas: "#46332a",
    parche: "#e0913f",
    orejaParche: "izq",
    ojos: "#9cc96b",
    pechoBlanco: true,
    patasBlancas: true,
    nariz: "#d9826c",
    interiorOreja: "#e6a092",
    poseFavorita: "sentada",
  },
  ronro: {
    clave: "ronro",
    nombre: "Ronro",
    rol: "descanso",
    descripcionRol: "Guardiana del descanso",
    pelaje: "#8e877b",
    sombra: "#7a7367",
    rayas: "#575047",
    panza: "#d9cfbf",
    ojos: "#c8b26a",
    colaAnillada: true,
    nariz: "#d9826c",
    interiorOreja: "#e3a296",
    poseFavorita: "dormida",
  },
};

export const ORDEN_GATITAS: ClaveGatita[] = ["blanquita", "bizca", "mango", "ronro"];
