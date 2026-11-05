/** Kanban de tareas — columnas editables. La columna "final" equivale a tarea terminada. */
import type { ColumnaKanban, Tarea } from "./tipos";

export const COLUMNAS_INICIALES: ColumnaKanban[] = [
  { id: "por-hacer", nombre: "Por hacer", color: "#38bdf8" },
  { id: "en-progreso", nombre: "En progreso", color: "#fbbf24" },
  { id: "en-revision", nombre: "En revisión", color: "#a78bfa" },
  { id: "terminada", nombre: "Terminada", color: "#34d399", final: true },
];

/** Siempre hay exactamente una columna final y al menos otra antes */
export function normalizarColumnas(cols: ColumnaKanban[] | undefined): ColumnaKanban[] {
  const lista = cols?.length ? cols : COLUMNAS_INICIALES;
  const iFinal = lista.findIndex((c) => c.final);
  const fin = iFinal >= 0 ? iFinal : lista.length - 1;
  const r = lista.map((c, i) => ({ ...c, final: i === fin }));
  return r.length >= 2 ? r : [...r, { ...COLUMNAS_INICIALES[0] }];
}

export function columnaDe(t: Pick<Tarea, "completada" | "columna">, cols: ColumnaKanban[]) {
  const final = cols.find((c) => c.final)!;
  if (t.completada) return final.id;
  const propia = cols.find((c) => c.id === t.columna && !c.final);
  return (propia ?? cols.find((c) => !c.final)!).id;
}
