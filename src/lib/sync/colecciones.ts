/**
 * Qué se sincroniza y cómo se mezcla — funciones puras (se prueban sin red).
 * Cada elemento del store se guarda como una fila (coleccion, id, datos).
 */

export interface Fila {
  coleccion: string;
  id: string;
  datos: unknown;
  borrado: boolean;
  actualizado_en?: string;
}

/** Huella de lo último que ya está en la nube: coleccion → id → JSON */
export type Instantanea = Record<string, Record<string, string>>;

type Estado = Record<string, unknown>;

interface DefColeccion {
  clave: string;                          // propiedad del store
  tipo: "lista" | "unico" | "textos";
  id?: (x: never) => string;
  nuevosAlInicio?: boolean;               // la lista guarda lo más nuevo primero
  incluir?: (x: never) => boolean;
  limpiar?: (x: never) => unknown;        // quita campos que no deben salir del dispositivo
}

const porId = (x: { id: string }) => x.id;

export const COLECCIONES: DefColeccion[] = [
  { clave: "tareas", tipo: "lista", id: porId, nuevosAlInicio: true },
  { clave: "entradasTiempo", tipo: "lista", id: porId },
  { clave: "bebidas", tipo: "lista", id: porId },
  { clave: "registroBebidas", tipo: "lista", id: porId, nuevosAlInicio: true },
  { clave: "habitos", tipo: "lista", id: porId },
  { clave: "registroHabitos", tipo: "lista", id: (r: { habitoId: string; fecha: string }) => `${r.habitoId}|${r.fecha}` },
  { clave: "gatitas", tipo: "lista", id: (g: { clave: string }) => g.clave },
  { clave: "accesoriosComprados", tipo: "textos" },
  { clave: "decoracion", tipo: "textos" },
  { clave: "citas", tipo: "lista", id: porId },
  { clave: "registroCuidados", tipo: "lista", id: (r: { gatita: string; tipo: string; fecha: string }) => `${r.gatita}|${r.tipo}|${r.fecha}` },
  { clave: "movimientos", tipo: "lista", id: porId, nuevosAlInicio: true },
  {
    clave: "eventosCalendario",
    tipo: "lista",
    id: porId,
    // los ejemplos son de cada dispositivo
    incluir: (e: { origen: string }) => e.origen !== "ejemplo",
  },
  { clave: "notas", tipo: "lista", id: porId, nuevosAlInicio: true },
  { clave: "listas", tipo: "lista", id: porId },
  { clave: "fechasImportantes", tipo: "lista", id: porId },
  { clave: "transacciones", tipo: "lista", id: porId, nuevosAlInicio: true },
  { clave: "categoriasDinero", tipo: "lista", id: porId },
  { clave: "suscripciones", tipo: "lista", id: porId },
  { clave: "diasPeriodo", tipo: "textos" },
  // bóveda: solo viaja lo cifrado (sal, llave envuelta y accesos cifrados)
  { clave: "bovedaMeta", tipo: "lista", id: porId },
  { clave: "accesosCifrados", tipo: "lista", id: porId },
  { clave: "conversaciones", tipo: "lista", id: porId, nuevosAlInicio: true },
  {
    clave: "ajustes",
    tipo: "unico",
    // la clave de acceso de la IA se queda solo en este dispositivo
    limpiar: (a: { claveIa?: string }) => {
      const { claveIa: _local, ...resto } = a;
      return resto;
    },
  },
];

function elementos(def: DefColeccion, estado: Estado): [string, unknown][] {
  const valor = estado[def.clave];
  if (def.tipo === "unico") return valor ? [["ajustes", def.limpiar ? def.limpiar(valor as never) : valor]] : [];
  if (def.tipo === "textos") return ((valor as string[]) ?? []).map((t) => [t, { valor: t }]);
  return ((valor as unknown[]) ?? [])
    .filter((x) => (def.incluir ? def.incluir(x as never) : true))
    .map((x) => [def.id!(x as never), def.limpiar ? def.limpiar(x as never) : x]);
}

/** Lo que cambió en este dispositivo desde la última sincronización */
export function calcularCambios(estado: Estado, inst: Instantanea): Fila[] {
  const filas: Fila[] = [];
  for (const def of COLECCIONES) {
    const antes = inst[def.clave] ?? {};
    const ahora = new Map(elementos(def, estado));
    for (const [id, datos] of ahora) {
      if (antes[id] !== JSON.stringify(datos)) filas.push({ coleccion: def.clave, id, datos, borrado: false });
    }
    if (def.tipo === "unico") continue;
    for (const id of Object.keys(antes)) {
      if (!ahora.has(id)) filas.push({ coleccion: def.clave, id, datos: {}, borrado: true });
    }
  }
  return filas;
}

/** Marca filas como ya sincronizadas en la instantánea */
export function registrarEnInstantanea(inst: Instantanea, filas: Fila[]): Instantanea {
  const nueva: Instantanea = { ...inst };
  for (const f of filas) {
    const col = { ...(nueva[f.coleccion] ?? {}) };
    if (f.borrado) delete col[f.id];
    else col[f.id] = JSON.stringify(f.datos);
    nueva[f.coleccion] = col;
  }
  return nueva;
}

/** Mezcla filas que llegan de la nube con el estado local */
export function aplicarFilas(estado: Estado, filas: Fila[]): Estado {
  const parcial: Estado = {};
  const porColeccion = new Map<string, Fila[]>();
  filas.forEach((f) => porColeccion.set(f.coleccion, [...(porColeccion.get(f.coleccion) ?? []), f]));

  for (const def of COLECCIONES) {
    const lista = porColeccion.get(def.clave);
    if (!lista?.length) continue;

    if (def.tipo === "unico") {
      const ultima = lista.filter((f) => !f.borrado).at(-1);
      if (ultima) {
        const local = (estado[def.clave] ?? {}) as Record<string, unknown>;
        parcial[def.clave] = { ...local, ...(ultima.datos as object), claveIa: local.claveIa };
      }
      continue;
    }

    if (def.tipo === "textos") {
      const conjunto = new Set((estado[def.clave] as string[]) ?? []);
      lista.forEach((f) => (f.borrado ? conjunto.delete(f.id) : conjunto.add(f.id)));
      parcial[def.clave] = [...conjunto];
      continue;
    }

    const actuales = ((estado[def.clave] as unknown[]) ?? []).slice();
    const indice = new Map(actuales.map((x, i) => [def.id!(x as never), i]));
    const borrar = new Set<string>();
    const nuevos: unknown[] = [];
    for (const f of lista) {
      if (f.borrado) { borrar.add(f.id); continue; }
      borrar.delete(f.id);
      const i = indice.get(f.id);
      if (i !== undefined) actuales[i] = f.datos;
      else { indice.set(f.id, -1); nuevos.push(f.datos); }
    }
    const sinBorrados = actuales.filter((x) => !borrar.has(def.id!(x as never)));
    const nuevosVivos = nuevos.filter((x) => !borrar.has(def.id!(x as never)));
    parcial[def.clave] = def.nuevosAlInicio ? [...nuevosVivos.reverse(), ...sinBorrados] : [...sinBorrados, ...nuevosVivos];
  }

  // el saldo de croquetas siempre es la suma de sus movimientos
  if (parcial.movimientos) {
    const total = (parcial.movimientos as { cantidad: number }[]).reduce((s, m) => s + m.cantidad, 0);
    parcial.croquetas = Math.max(0, total);
  }
  return parcial;
}

/**
 * Descarta los ecos: filas que ya conocemos (iguales a la instantánea).
 * Así un cambio local que aún no se sube no lo pisa una copia vieja de la nube.
 */
export function filtrarNovedades(filas: Fila[], inst: Instantanea, primeraVez = false): Fila[] {
  // la primera vez en un dispositivo, todo lo de la nube cuenta (incluso lo que ahí se borró)
  if (primeraVez) return filas;
  return filas.filter((f) => {
    const conocida = inst[f.coleccion]?.[f.id];
    if (f.borrado) return conocida !== undefined;
    return conocida !== JSON.stringify(f.datos);
  });
}
