"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { almacenamientoSeguro } from "@/lib/almacenamiento";
import { bus } from "@/lib/eventos";
import { esHoy, hoyISO, sumarDias, uid } from "@/lib/fechas";
import type {
  Ajustes, CitaGatita, ClaveAccesorio, ClaveGatita, Conversacion, EntradaTiempo, EventoCalendario, Gatita, Habito,
  MensajeIA, ModoIA, MovimientoCroquetas, Nota, Prioridad, RegistroBebida, RegistroCuidado, RegistroHabito, Rutina, Tarea, TipoBebida, TipoCuidado,
} from "@/lib/tipos";
import { CATALOGO_ACCESORIOS } from "@/components/gatitas/Accesorios";
import {
  AJUSTES_INICIALES, BEBIDAS_INICIALES, RECORDATORIOS_INICIALES, GATITAS_INICIALES, HABITOS_INICIALES, TAREAS_EJEMPLO, eventosEjemplo,
} from "./datosIniciales";

// ─── Recompensas en croquetas ───────────────────────────────────────────
export const RECOMPENSAS = {
  tarea: { baja: 3, media: 5, alta: 8, urgente: 10 } as Record<Prioridad, number>,
  habito: 3,
  rutinaCompleta: 5,
  bebida: 1,
  bebidasMaxDia: 10,
  pomodoro: 4,
  cuidado: 2,
};

export type FasePomodoro = "inactivo" | "trabajo" | "descanso";
export interface EstadoPomodoro {
  fase: FasePomodoro;
  tareaId?: string;
  finEn?: number;          // epoch ms cuando termina la fase (si corre)
  restanteSeg?: number;    // si está en pausa
  duracionSeg: number;
  inicioFase?: string;
}

interface NuevaTarea {
  titulo: string;
  prioridad: Prioridad;
  etiquetas: string[];
  fechaLimite?: string;
  estimadoMin?: number;
  checklist?: string[];
}

interface EstadoNeko {
  ajustes: Ajustes;
  tareas: Tarea[];
  entradasTiempo: EntradaTiempo[];
  bebidas: TipoBebida[];
  registroBebidas: RegistroBebida[];
  habitos: Habito[];
  registroHabitos: RegistroHabito[];
  gatitas: Gatita[];
  accesoriosComprados: ClaveAccesorio[];
  citas: CitaGatita[];
  registroCuidados: RegistroCuidado[];
  croquetas: number;
  movimientos: MovimientoCroquetas[];
  eventosCalendario: EventoCalendario[];
  googleConectado: boolean;
  notas: Nota[];
  conversaciones: Conversacion[];
  pomodoro: EstadoPomodoro;

  // calendario
  agregarEvento: (e: Omit<EventoCalendario, "id">) => string;
  actualizarEvento: (id: string, cambios: Partial<EventoCalendario>) => void;
  eliminarEvento: (id: string) => void;
  reemplazarEventosGoogle: (desde: string, hasta: string, eventos: Omit<EventoCalendario, "id">[]) => void;
  quitarEjemplos: () => void;
  setGoogleConectado: (v: boolean) => void;
  // notas
  agregarNota: (n: Omit<Nota, "id" | "creadoEn" | "fijada">) => void;
  eliminarNota: (id: string) => void;
  alternarFijada: (id: string) => void;
  // asistente
  crearConversacion: (modo: ModoIA) => string;
  agregarMensaje: (convId: string, m: Omit<MensajeIA, "id" | "en">) => string;
  actualizarMensaje: (convId: string, msgId: string, cambios: Partial<MensajeIA>) => void;
  eliminarConversacion: (id: string) => void;

  // tareas
  agregarTarea: (t: NuevaTarea) => void;
  alternarTarea: (id: string) => void;
  eliminarTarea: (id: string) => void;
  alternarChecklist: (tareaId: string, itemId: string) => void;
  agregarChecklist: (tareaId: string, texto: string) => void;
  // hidratación
  registrarBebida: (tipoId: string, ml: number) => void;
  deshacerUltimaBebida: () => void;
  actualizarBebida: (id: string, cambios: Partial<TipoBebida>) => void;
  agregarTipoBebida: (b: Omit<TipoBebida, "id">) => void;
  // hábitos
  agregarHabito: (h: Omit<Habito, "id" | "creadoEn">) => void;
  eliminarHabito: (id: string) => void;
  alternarHabitoHoy: (id: string) => void;
  // gatitas
  registrarCuidado: (gatita: ClaveGatita, tipo: TipoCuidado) => void;
  agregarCita: (c: Omit<CitaGatita, "id" | "hecha">) => void;
  completarCita: (id: string) => void;
  eliminarCita: (id: string) => void;
  comprarAccesorio: (clave: ClaveAccesorio) => boolean;
  equiparAccesorio: (gatita: ClaveGatita, clave?: ClaveAccesorio) => void;
  // pomodoro
  iniciarPomodoro: (tareaId?: string) => void;
  pausarPomodoro: () => void;
  reanudarPomodoro: () => void;
  detenerPomodoro: () => void;
  terminarFasePomodoro: () => void;
  // ajustes
  actualizarAjustes: (cambios: Partial<Ajustes>) => void;
  sumarCroquetas: (cantidad: number, motivo: string) => void;
}

// ─── Selectores puros (también los usa el widget en la Fase 3) ──────────
export function mlEfectivosHoy(registros: RegistroBebida[]) {
  return registros.filter((r) => esHoy(r.en)).reduce((s, r) => s + (r.ml * r.porcentaje) / 100, 0);
}

export function tocaHoy(h: Habito, fecha = hoyISO()) {
  if (!h.diasSemana.length) return true;
  const [a, m, d] = fecha.split("-").map(Number);
  return h.diasSemana.includes(new Date(a, m - 1, d).getDay());
}

export function rachaHabito(h: Habito, registros: RegistroHabito[]) {
  const hechos = new Set(registros.filter((r) => r.habitoId === h.id).map((r) => r.fecha));
  let dia = hoyISO();
  if (!hechos.has(dia)) dia = sumarDias(dia, -1);
  let racha = 0;
  for (let i = 0; i < 3650; i++) {
    if (tocaHoy(h, dia)) {
      if (!hechos.has(dia)) break;
      racha++;
    }
    dia = sumarDias(dia, -1);
  }
  return racha;
}

export const hechoHoy = (habitoId: string, registros: RegistroHabito[]) =>
  registros.some((r) => r.habitoId === habitoId && r.fecha === hoyISO());

export const useNekoStore = create<EstadoNeko>()(
  persist(
    (set, get) => {
      const ganar = (cantidad: number, motivo: string) => {
        if (!cantidad) return;
        set((s) => ({
          croquetas: Math.max(0, s.croquetas + cantidad),
          // se guardan todos: el saldo se recalcula sumándolos al sincronizar entre dispositivos
          movimientos: [{ id: uid(), cantidad, motivo, en: new Date().toISOString() }, ...s.movimientos],
        }));
        if (cantidad > 0) bus.emitir({ tipo: "croquetas", cantidad });
      };

      return {
        ajustes: AJUSTES_INICIALES,
        tareas: TAREAS_EJEMPLO,
        entradasTiempo: [],
        bebidas: BEBIDAS_INICIALES,
        registroBebidas: [],
        habitos: HABITOS_INICIALES,
        registroHabitos: [],
        gatitas: GATITAS_INICIALES,
        accesoriosComprados: [],
        citas: [],
        registroCuidados: [],
        croquetas: 20,
        movimientos: [{ id: "bienvenida", cantidad: 20, motivo: "Regalo de bienvenida", en: new Date().toISOString() }],
        eventosCalendario: eventosEjemplo(),
        googleConectado: false,
        notas: [],
        conversaciones: [],

        // ── Calendario ────────────────────────────────────────────────
        agregarEvento: (e) => {
          const id = uid();
          set((s) => ({ eventosCalendario: [...s.eventosCalendario, { ...e, id }] }));
          return id;
        },
        actualizarEvento: (id, cambios) =>
          set((s) => ({ eventosCalendario: s.eventosCalendario.map((e) => (e.id === id ? { ...e, ...cambios } : e)) })),
        eliminarEvento: (id) => set((s) => ({ eventosCalendario: s.eventosCalendario.filter((e) => e.id !== id) })),
        reemplazarEventosGoogle: (desde, hasta, eventos) =>
          set((s) => {
            const enRango = (e: EventoCalendario) => e.fin >= desde && e.inicio <= hasta;
            // conserva los locales y los de Google fuera del rango consultado; quita los ejemplos
            const resto = s.eventosCalendario.filter((e) => !(e.origen === "google" && enRango(e)) && e.origen !== "ejemplo");
            return { eventosCalendario: [...resto, ...eventos.map((e) => ({ ...e, id: `g-${e.googleId ?? uid()}` }))] };
          }),
        quitarEjemplos: () => set((s) => ({ eventosCalendario: s.eventosCalendario.filter((e) => e.origen !== "ejemplo") })),
        setGoogleConectado: (v) => set({ googleConectado: v }),

        // ── Notas ─────────────────────────────────────────────────────
        agregarNota: (n) =>
          set((s) => ({ notas: [{ ...n, id: uid(), fijada: false, creadoEn: new Date().toISOString() }, ...s.notas] })),
        eliminarNota: (id) => set((s) => ({ notas: s.notas.filter((n) => n.id !== id) })),
        alternarFijada: (id) => set((s) => ({ notas: s.notas.map((n) => (n.id === id ? { ...n, fijada: !n.fijada } : n)) })),

        // ── Asistente ─────────────────────────────────────────────────
        crearConversacion: (modo) => {
          const id = uid();
          const ahora = new Date().toISOString();
          set((s) => ({
            conversaciones: [{ id, titulo: "Nueva conversación", modo, mensajes: [], creadaEn: ahora, actualizadaEn: ahora }, ...s.conversaciones].slice(0, 60),
          }));
          return id;
        },
        agregarMensaje: (convId, m) => {
          const id = uid();
          const en = new Date().toISOString();
          set((s) => ({
            conversaciones: s.conversaciones.map((c) => {
              if (c.id !== convId) return c;
              const titulo = c.mensajes.length === 0 && m.rol === "usuaria" ? m.texto.replace(/\s+/g, " ").slice(0, 48) : c.titulo;
              return { ...c, titulo, mensajes: [...c.mensajes, { ...m, id, en }], actualizadaEn: en };
            }),
          }));
          return id;
        },
        actualizarMensaje: (convId, msgId, cambios) =>
          set((s) => ({
            conversaciones: s.conversaciones.map((c) =>
              c.id === convId ? { ...c, mensajes: c.mensajes.map((m) => (m.id === msgId ? { ...m, ...cambios } : m)) } : c,
            ),
          })),
        eliminarConversacion: (id) => set((s) => ({ conversaciones: s.conversaciones.filter((c) => c.id !== id) })),

        pomodoro: { fase: "inactivo", duracionSeg: AJUSTES_INICIALES.pomodoroMin * 60 },

        // ── Tareas ────────────────────────────────────────────────────
        agregarTarea: (t) =>
          set((s) => ({
            tareas: [
              {
                id: uid(),
                titulo: t.titulo.trim(),
                prioridad: t.prioridad,
                etiquetas: t.etiquetas,
                fechaLimite: t.fechaLimite,
                estimadoMin: t.estimadoMin,
                realMin: 0,
                checklist: (t.checklist ?? []).filter(Boolean).map((texto) => ({ id: uid(), texto, hecho: false })),
                completada: false,
                creadoEn: new Date().toISOString(),
              },
              ...s.tareas,
            ],
          })),

        alternarTarea: (id) => {
          const tarea = get().tareas.find((t) => t.id === id);
          if (!tarea) return;
          const completar = !tarea.completada;
          set((s) => ({
            tareas: s.tareas.map((t) =>
              t.id === id ? { ...t, completada: completar, completadaEn: completar ? new Date().toISOString() : undefined } : t,
            ),
          }));
          const premio = RECOMPENSAS.tarea[tarea.prioridad];
          if (completar) {
            ganar(premio, `Tarea: ${tarea.titulo}`);
            bus.emitir({ tipo: "tarea-completada", titulo: tarea.titulo });
          } else {
            ganar(-premio, `Tarea reabierta: ${tarea.titulo}`);
          }
        },

        eliminarTarea: (id) => set((s) => ({ tareas: s.tareas.filter((t) => t.id !== id) })),

        alternarChecklist: (tareaId, itemId) =>
          set((s) => ({
            tareas: s.tareas.map((t) =>
              t.id === tareaId
                ? { ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, hecho: !c.hecho } : c)) }
                : t,
            ),
          })),

        agregarChecklist: (tareaId, texto) =>
          set((s) => ({
            tareas: s.tareas.map((t) =>
              t.id === tareaId ? { ...t, checklist: [...t.checklist, { id: uid(), texto, hecho: false }] } : t,
            ),
          })),

        // ── Hidratación ───────────────────────────────────────────────
        registrarBebida: (tipoId, ml) => {
          const s = get();
          const tipo = s.bebidas.find((b) => b.id === tipoId);
          if (!tipo || ml <= 0) return;
          const antes = mlEfectivosHoy(s.registroBebidas);
          const registro: RegistroBebida = { id: uid(), tipoId, ml, porcentaje: tipo.porcentaje, en: new Date().toISOString() };
          set({ registroBebidas: [registro, ...s.registroBebidas].slice(0, 2000) });
          const despues = antes + (ml * tipo.porcentaje) / 100;
          const hoyGanadas = s.registroBebidas.filter((r) => esHoy(r.en)).length;
          if (hoyGanadas < RECOMPENSAS.bebidasMaxDia) ganar(RECOMPENSAS.bebida, `Bebida: ${tipo.nombre}`);
          const metaAlcanzada = antes < s.ajustes.metaAguaMl && despues >= s.ajustes.metaAguaMl;
          if (metaAlcanzada) ganar(10, "Meta de hidratación");
          bus.emitir({ tipo: "bebida", nombre: tipo.nombre, ml, color: tipo.color, metaAlcanzada });
        },

        deshacerUltimaBebida: () =>
          set((s) => {
            const idx = s.registroBebidas.findIndex((r) => esHoy(r.en));
            if (idx < 0) return {};
            const copia = [...s.registroBebidas];
            copia.splice(idx, 1);
            return { registroBebidas: copia };
          }),

        actualizarBebida: (id, cambios) =>
          set((s) => ({ bebidas: s.bebidas.map((b) => (b.id === id ? { ...b, ...cambios } : b)) })),

        agregarTipoBebida: (b) => set((s) => ({ bebidas: [...s.bebidas, { ...b, id: uid() }] })),

        // ── Hábitos ───────────────────────────────────────────────────
        agregarHabito: (h) =>
          set((s) => ({ habitos: [...s.habitos, { ...h, id: uid(), creadoEn: new Date().toISOString() }] })),

        eliminarHabito: (id) =>
          set((s) => ({
            habitos: s.habitos.filter((h) => h.id !== id),
            registroHabitos: s.registroHabitos.filter((r) => r.habitoId !== id),
          })),

        alternarHabitoHoy: (id) => {
          const s = get();
          const habito = s.habitos.find((h) => h.id === id);
          if (!habito) return;
          const hoy = hoyISO();
          const yaEstaba = hechoHoy(id, s.registroHabitos);
          const registros = yaEstaba
            ? s.registroHabitos.filter((r) => !(r.habitoId === id && r.fecha === hoy))
            : [...s.registroHabitos, { habitoId: id, fecha: hoy }];
          set({ registroHabitos: registros });
          if (yaEstaba) {
            ganar(-RECOMPENSAS.habito, `Hábito desmarcado: ${habito.nombre}`);
            return;
          }
          ganar(RECOMPENSAS.habito, `Hábito: ${habito.nombre}`);
          bus.emitir({ tipo: "habito", nombre: habito.nombre, racha: rachaHabito(habito, registros) });
          if (habito.rutina !== "ninguna") {
            const deRutina = s.habitos.filter((h) => h.rutina === habito.rutina && tocaHoy(h));
            if (deRutina.every((h) => hechoHoy(h.id, registros))) {
              ganar(RECOMPENSAS.rutinaCompleta, `Rutina completa: ${habito.rutina}`);
              bus.emitir({ tipo: "rutina-completa", rutina: habito.rutina });
            }
          }
        },

        // ── Gatitas ───────────────────────────────────────────────────
        registrarCuidado: (gatita, tipo) => {
          const s = get();
          const hoy = hoyISO();
          const ya = s.registroCuidados.some((r) => r.gatita === gatita && r.tipo === tipo && r.fecha === hoy);
          if (ya) {
            set({ registroCuidados: s.registroCuidados.filter((r) => !(r.gatita === gatita && r.tipo === tipo && r.fecha === hoy)) });
            ganar(-RECOMPENSAS.cuidado, "Cuidado desmarcado");
            return;
          }
          set({ registroCuidados: [...s.registroCuidados, { gatita, tipo, fecha: hoy }].slice(-3000) });
          ganar(RECOMPENSAS.cuidado, `Cuidado de ${gatita}`);
          bus.emitir({ tipo: "cuidado", gatita, que: tipo });
        },

        agregarCita: (c) => set((s) => ({ citas: [...s.citas, { ...c, id: uid(), hecha: false }] })),
        completarCita: (id) => {
          const cita = get().citas.find((c) => c.id === id);
          set((s) => ({ citas: s.citas.map((c) => (c.id === id ? { ...c, hecha: !c.hecha } : c)) }));
          if (cita && !cita.hecha) {
            ganar(5, `Cita de ${cita.gatita}`);
            bus.emitir({ tipo: "cuidado", gatita: cita.gatita, que: cita.tipo });
          }
        },
        eliminarCita: (id) => set((s) => ({ citas: s.citas.filter((c) => c.id !== id) })),

        comprarAccesorio: (clave) => {
          const s = get();
          const item = CATALOGO_ACCESORIOS.find((a) => a.clave === clave);
          if (!item || s.accesoriosComprados.includes(clave) || s.croquetas < item.precio) return false;
          set({ accesoriosComprados: [...s.accesoriosComprados, clave] });
          ganar(-item.precio, `Compra: ${item.nombre}`);
          bus.emitir({ tipo: "compra", nombre: item.nombre });
          return true;
        },

        equiparAccesorio: (gatita, clave) =>
          set((s) => ({
            gatitas: s.gatitas.map((g) => {
              if (g.clave === gatita) return { ...g, accesorio: clave };
              // un accesorio solo lo puede traer una gatita a la vez
              return clave && g.accesorio === clave ? { ...g, accesorio: undefined } : g;
            }),
          })),

        // ── Pomodoro ──────────────────────────────────────────────────
        iniciarPomodoro: (tareaId) => {
          const seg = get().ajustes.pomodoroMin * 60;
          set({
            pomodoro: { fase: "trabajo", tareaId, duracionSeg: seg, finEn: Date.now() + seg * 1000, inicioFase: new Date().toISOString() },
          });
          bus.emitir({ tipo: "pomodoro-inicio" });
        },
        pausarPomodoro: () =>
          set((s) => {
            const p = s.pomodoro;
            if (!p.finEn) return {};
            return { pomodoro: { ...p, finEn: undefined, restanteSeg: Math.max(0, Math.round((p.finEn - Date.now()) / 1000)) } };
          }),
        reanudarPomodoro: () =>
          set((s) => {
            const p = s.pomodoro;
            if (p.finEn || p.restanteSeg == null) return {};
            return { pomodoro: { ...p, finEn: Date.now() + p.restanteSeg * 1000, restanteSeg: undefined } };
          }),
        detenerPomodoro: () => {
          const s = get();
          const p = s.pomodoro;
          // guarda el tiempo trabajado aunque no se haya terminado
          if (p.fase === "trabajo" && p.inicioFase) {
            const restante = p.finEn ? (p.finEn - Date.now()) / 1000 : p.restanteSeg ?? p.duracionSeg;
            const trabajadoMin = Math.round((p.duracionSeg - restante) / 60);
            if (trabajadoMin >= 1) registrarTiempo(set, p.tareaId, p.inicioFase, trabajadoMin);
          }
          set({ pomodoro: { fase: "inactivo", duracionSeg: s.ajustes.pomodoroMin * 60 } });
        },
        terminarFasePomodoro: () => {
          const s = get();
          const p = s.pomodoro;
          if (p.fase === "trabajo") {
            const min = Math.round(p.duracionSeg / 60);
            registrarTiempo(set, p.tareaId, p.inicioFase ?? new Date().toISOString(), min);
            ganar(RECOMPENSAS.pomodoro, "Pomodoro completo");
            bus.emitir({ tipo: "pomodoro-fin", minutos: min });
            const seg = s.ajustes.descansoMin * 60;
            set({ pomodoro: { fase: "descanso", tareaId: p.tareaId, duracionSeg: seg, finEn: Date.now() + seg * 1000, inicioFase: new Date().toISOString() } });
          } else {
            set({ pomodoro: { fase: "inactivo", tareaId: p.tareaId, duracionSeg: s.ajustes.pomodoroMin * 60 } });
          }
        },

        // ── Ajustes ───────────────────────────────────────────────────
        actualizarAjustes: (cambios) => set((s) => ({ ajustes: { ...s.ajustes, ...cambios } })),
        sumarCroquetas: (cantidad, motivo) => ganar(cantidad, motivo),
      };
    },
    {
      name: "nekotask-v1",
      version: 4,
      migrate: (guardado, version) => {
        const s = guardado as Partial<EstadoNeko>;
        if (version < 2 && s.bebidas) {
          s.bebidas = s.bebidas.map((b) =>
            b.id === "cafe"
              ? { ...b, id: "refresco", nombre: "Refresco", icono: "refresco", color: "#e2575c", porcentaje: 100, tamanosMl: [355, 600, 1000] }
              : b,
          );
          s.registroBebidas = s.registroBebidas?.map((r) => (r.tipoId === "cafe" ? { ...r, tipoId: "refresco" } : r));
        }
        if (version < 3) {
          // antes los eventos no se guardaban: arranca con los ejemplos de esta semana
          s.eventosCalendario = eventosEjemplo();
          s.notas ??= [];
          s.conversaciones ??= [];
        }
        if (version < 4 && s.ajustes) {
          s.ajustes = { ...s.ajustes, recordatorios: s.ajustes.recordatorios ?? RECORDATORIOS_INICIALES };
        }
        return s as EstadoNeko;
      },
      storage: createJSONStorage(() => almacenamientoSeguro),
    },
  ),
);

function registrarTiempo(
  set: (fn: (s: EstadoNeko) => Partial<EstadoNeko>) => void,
  tareaId: string | undefined,
  inicio: string,
  minutos: number,
) {
  set((s) => ({
    entradasTiempo: [...s.entradasTiempo, { id: uid(), tareaId, inicio, fin: new Date().toISOString(), tipo: "pomodoro" as const }],
    tareas: tareaId ? s.tareas.map((t) => (t.id === tareaId ? { ...t, realMin: t.realMin + minutos } : t)) : s.tareas,
  }));
}

export const ETIQUETAS_RUTINA: Record<Rutina, string> = {
  manana: "Rutina de mañana",
  dia: "Durante el día",
  noche: "Rutina de noche",
  ninguna: "Otros hábitos",
};
