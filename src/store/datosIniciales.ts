import type { Ajustes, CategoriaDinero, ConfigRecordatorios, EventoCalendario, Gatita, Habito, Lista, Tarea, TipoBebida } from "@/lib/tipos";

export const RECORDATORIOS_INICIALES: ConfigRecordatorios = {
  agua: { activo: true, cadaMin: 90, desde: "09:00", hasta: "21:00" },
  rutinas: { activo: true, manana: "08:00", noche: "22:00" },
  tareas: { activo: true, minutosAntes: 15 },
  gatitas: { activo: true, hora: "09:00" },
  fechas: { activo: true, hora: "09:00" },
  dinero: { activo: true, hora: "10:00" },
};

export const AJUSTES_INICIALES: Ajustes = {
  nombre: "Anna",
  metaAguaMl: 2000,
  horaInicioDia: "07:00",
  horaFinDia: "23:00",
  sonidos: true,
  pomodoroMin: 25,
  descansoMin: 5,
  proveedorIa: "claude",
  recordatorios: RECORDATORIOS_INICIALES,
};

export const BEBIDAS_INICIALES: TipoBebida[] = [
  { id: "agua", nombre: "Agua", icono: "agua", color: "#67c7f0", porcentaje: 100, tamanosMl: [250, 350, 500] },
  { id: "jugo", nombre: "Jugo", icono: "jugo", color: "#f5a142", porcentaje: 100, tamanosMl: [250, 355, 500] },
  { id: "te", nombre: "Té", icono: "te", color: "#c9a06b", porcentaje: 100, tamanosMl: [200, 300, 450] },
  { id: "sabor", nombre: "Agua de sabor", icono: "sabor", color: "#f07aa8", porcentaje: 100, tamanosMl: [250, 500, 1000] },
  { id: "refresco", nombre: "Refresco", icono: "refresco", color: "#e2575c", porcentaje: 100, tamanosMl: [355, 600, 1000] },
];

const ahora = new Date().toISOString();

export const HABITOS_INICIALES: Habito[] = [
  { id: "h-dientes-m", nombre: "Lavarse los dientes", icono: "cepillo", color: "#67e8f9", rutina: "manana", diasSemana: [], creadoEn: ahora },
  { id: "h-cara-m", nombre: "Lavarse la cara", icono: "cara", color: "#f9a8d4", rutina: "manana", diasSemana: [], creadoEn: ahora },
  { id: "h-dientes-n", nombre: "Lavarse los dientes", icono: "cepillo", color: "#67e8f9", rutina: "noche", diasSemana: [], creadoEn: ahora },
  { id: "h-cara-n", nombre: "Lavarse la cara", icono: "cara", color: "#f9a8d4", rutina: "noche", diasSemana: [], creadoEn: ahora },
];

export const GATITAS_INICIALES: Gatita[] = [
  { clave: "blanquita", nombre: "Blanquita", rol: "agua" },
  { clave: "bizca", nombre: "Bizca", rol: "tareas" },
  { clave: "mango", nombre: "Mango", rol: "pomodoro" },
  { clave: "ronro", nombre: "Ronro", rol: "descanso" },
];

function hoyA(h: number, m = 0) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const TAREAS_EJEMPLO: Tarea[] = [
  {
    id: "t-ejemplo-1",
    titulo: "Explorar NekoTask Studio",
    prioridad: "media",
    etiquetas: ["ejemplo"],
    fechaLimite: hoyA(20),
    estimadoMin: 15,
    realMin: 0,
    checklist: [
      { id: "c1", texto: "Completar esta tarea para ver a Bizca", hecho: false },
      { id: "c2", texto: "Registrar un jugo", hecho: false },
      { id: "c3", texto: "Tocar a una gatita", hecho: false },
    ],
    completada: false,
    creadoEn: ahora,
  },
  {
    id: "t-ejemplo-2",
    titulo: "Comprar arena para el arenero",
    prioridad: "alta",
    etiquetas: ["gatitas", "casa"],
    fechaLimite: hoyA(19),
    estimadoMin: 40,
    realMin: 0,
    checklist: [],
    completada: false,
    creadoEn: ahora,
  },
  {
    id: "t-ejemplo-3",
    titulo: "Leer 20 páginas",
    prioridad: "baja",
    etiquetas: ["personal"],
    estimadoMin: 30,
    realMin: 0,
    checklist: [],
    completada: false,
    creadoEn: ahora,
  },
];

function diaA(dias: number, h: number, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Eventos de ejemplo de esta semana; se reemplazan al conectar Google Calendar */
export function eventosEjemplo(): EventoCalendario[] {
  return [
    { id: "ej-1", titulo: "Trabajo", inicio: hoyA(9), fin: hoyA(17), origen: "ejemplo" },
    { id: "ej-2", titulo: "Comida", inicio: hoyA(14, 30), fin: hoyA(15, 15), origen: "ejemplo" },
    { id: "ej-3", titulo: "Junta de equipo", inicio: diaA(1, 10), fin: diaA(1, 11), origen: "ejemplo" },
    { id: "ej-4", titulo: "Yoga", inicio: diaA(2, 19), fin: diaA(2, 20), origen: "ejemplo" },
    { id: "ej-5", titulo: "Entrega de reporte", inicio: diaA(3, 12), fin: diaA(3, 13), origen: "ejemplo" },
  ];
}

/** Listas de arranque — ids fijos para que no se dupliquen al sincronizar varios dispositivos */
export const LISTAS_INICIALES: Lista[] = [
  { id: "lista-super", nombre: "Súper", icono: "carrito", color: "#9cc96b", items: [], conPrecios: true, creadoEn: ahora },
  { id: "lista-gatitas", nombre: "Para las gatitas", icono: "huella", color: "#e8a85b", conPrecios: true, items: [
    { id: "lg-1", texto: "Croquetas", hecho: false },
    { id: "lg-2", texto: "Arena", hecho: false },
  ], creadoEn: ahora },
  { id: "lista-pelis", nombre: "Pelis y series", icono: "pelicula", color: "#f472b6", items: [], creadoEn: ahora },
  { id: "lista-libros", nombre: "Libros", icono: "libro", color: "#67e8f9", items: [], creadoEn: ahora },
];

/**
 * Categorías de dinero — ids fijos (no se duplican entre dispositivos).
 * Colores: paleta categórica validada para el fondo oscuro (orden fijo), "Otros" en gris neutro.
 */
export const COLORES_DINERO = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
export const CATEGORIAS_INICIALES: CategoriaDinero[] = [
  { id: "cat-comida", nombre: "Comida", icono: "plato", color: COLORES_DINERO[0], tipo: "gasto", orden: 1 },
  { id: "cat-super", nombre: "Súper", icono: "carrito", color: COLORES_DINERO[1], tipo: "gasto", orden: 2 },
  { id: "cat-transporte", nombre: "Transporte", icono: "auto", color: COLORES_DINERO[2], tipo: "gasto", orden: 3 },
  { id: "cat-casa", nombre: "Casa y servicios", icono: "casa", color: COLORES_DINERO[3], tipo: "gasto", orden: 4 },
  { id: "cat-gatitas", nombre: "Gatitas", icono: "huella", color: COLORES_DINERO[4], tipo: "gasto", orden: 5 },
  { id: "cat-salud", nombre: "Salud", icono: "pastilla", color: COLORES_DINERO[5], tipo: "gasto", orden: 6 },
  { id: "cat-antojos", nombre: "Antojos y salidas", icono: "cafe", color: COLORES_DINERO[6], tipo: "gasto", orden: 7 },
  { id: "cat-suscripciones", nombre: "Suscripciones", icono: "sincronizar", color: COLORES_DINERO[7], tipo: "gasto", orden: 8 },
  { id: "cat-otros", nombre: "Otros", icono: "etiqueta", color: "#8b86a3", tipo: "gasto", orden: 99 },
  { id: "cat-sueldo", nombre: "Sueldo", icono: "dinero", color: COLORES_DINERO[0], tipo: "ingreso", orden: 1 },
  { id: "cat-extra", nombre: "Extras", icono: "chispa", color: COLORES_DINERO[2], tipo: "ingreso", orden: 2 },
  { id: "cat-regalo", nombre: "Regalos", icono: "regalo", color: COLORES_DINERO[6], tipo: "ingreso", orden: 3 },
  { id: "cat-otros-ingreso", nombre: "Otros ingresos", icono: "etiqueta", color: "#8b86a3", tipo: "ingreso", orden: 99 },
];
