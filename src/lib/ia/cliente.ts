"use client";

import { ETIQUETA_FRECUENCIA, pesos, resumenMes } from "@/lib/dinero";
import { calcularTiempoLibre } from "@/components/dashboard/PanelTiempo";
import { esHoy, formatoDuracion, formatoHora, hoyISO } from "@/lib/fechas";
import { ES_VISTA_PREVIA } from "@/lib/google/cliente";
import type { MensajeIA, ModoIA, ProveedorIA } from "@/lib/tipos";
import { hechoHoy, mlEfectivosHoy, tocaHoy, useNekoStore } from "@/store/useNekoStore";
import { extraerDesglose, sistemaPara, type PasoDesglose } from "./prompts";

export class ErrorIA extends Error {
  constructor(mensaje: string, public codigo: "cancelado" | "sin_ia" | "permiso" | "limite" | "red" | "clave" | "otro", public parcial = "") {
    super(mensaje);
  }
}

interface Opciones {
  proveedor: ProveedorIA;
  modo: ModoIA;
  mensajes: Pick<MensajeIA, "rol" | "texto">[];
  incluirContexto?: boolean;
  onTexto?: (textoCompleto: string) => void;
  signal?: AbortSignal;
}

/** Resumen de tu día que Blanquita usa para "Planear mi día" */
export function contextoDeLaApp() {
  const s = useNekoStore.getState();
  const ahora = new Date();
  const pendientes = s.tareas
    .filter((t) => !t.completada)
    .slice(0, 15)
    .map((t) => `- [${t.prioridad}] ${t.titulo}${t.fechaLimite ? ` · para ${new Date(t.fechaLimite).toLocaleString("es-MX", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : ""}${t.estimadoMin ? ` · est. ${t.estimadoMin} min` : ""}`);
  const eventos = s.eventosCalendario
    .filter((e) => esHoy(e.inicio) && !e.todoElDia)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((e) => `- ${formatoHora(e.inicio)}–${formatoHora(e.fin)} ${e.titulo}`);
  const libre = calcularTiempoLibre(Date.now(), s.ajustes.horaInicioDia, s.ajustes.horaFinDia, s.eventosCalendario.filter((e) => !e.todoElDia), s.tareas);
  const habitos = s.habitos.filter((h) => tocaHoy(h) && !hechoHoy(h.id, s.registroHabitos)).map((h) => h.nombre);
  const mes = hoyISO().slice(0, 7);
  const dinero = resumenMes(s.transacciones, s.categoriasDinero, mes);
  const topGastos = dinero.porCategoria.slice(0, 5).map((c) => `${c.categoria.nombre} ${pesos(c.total, true)}${c.presupuesto ? ` de ${pesos(c.presupuesto, true)}` : ""}`);
  const subs = s.suscripciones.filter((x) => x.activa);
  return [
    `Ahora: ${ahora.toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}. Su día termina a las ${s.ajustes.horaFinDia}.`,
    `Tiempo libre estimado: ${formatoDuracion(libre.libreMin)}.`,
    `Calendario de hoy:\n${eventos.join("\n") || "- (sin eventos)"}`,
    `Tareas pendientes:\n${pendientes.join("\n") || "- (ninguna)"}`,
    `Hábitos sin marcar hoy: ${habitos.join(", ") || "ninguno"}.`,
    `Dinero este mes (MXN): gastos ${pesos(dinero.gastos, true)}, ingresos ${pesos(dinero.ingresos, true)}. Por categoría: ${topGastos.join(", ") || "sin gastos aún"}. Suscripciones activas: ${subs.map((x) => `${x.nombre} ${pesos(x.monto, true)} ${ETIQUETA_FRECUENCIA[x.frecuencia]}`).join(", ") || "ninguna"}.`,
  ].join("\n");
}

/** Pregunta a Blanquita. En la vista previa usa a Claude desde tu cuenta; en Vercel usa /api/ia. */
export async function preguntarABlanquita(o: Opciones): Promise<string> {
  const contexto = o.incluirContexto ? contextoDeLaApp() : undefined;
  return ES_VISTA_PREVIA ? viaVistaPrevia(o, contexto) : viaServidor(o, contexto);
}

async function viaServidor(o: Opciones, contexto?: string) {
  let r: Response;
  try {
    r = await fetch("/api/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-neko-clave": useNekoStore.getState().ajustes.claveIa ?? "" },
      body: JSON.stringify({ proveedor: o.proveedor, modo: o.modo, mensajes: o.mensajes, contexto }),
      signal: o.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new ErrorIA("Detenido", "cancelado");
    throw new ErrorIA("No hay conexión con el servidor.", "red");
  }
  if (!r.ok || !r.body) {
    const datos = await r.json().catch(() => ({}));
    throw new ErrorIA(datos.error ?? "Blanquita no pudo responder.", r.status === 401 ? "clave" : r.status === 429 ? "limite" : "otro");
  }
  const lector = r.body.getReader();
  const deco = new TextDecoder();
  let texto = "";
  try {
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      texto += deco.decode(value, { stream: true });
      if (texto.includes("[[error]]")) throw new ErrorIA(texto.split("[[error]]")[1].trim(), "red", texto.split("[[error]]")[0].trim());
      o.onTexto?.(texto);
    }
  } catch (e) {
    if (e instanceof ErrorIA) throw e;
    if ((e as Error).name === "AbortError") throw new ErrorIA("Detenido", "cancelado", texto);
    throw new ErrorIA("Se cortó la respuesta.", "red", texto);
  }
  return texto;
}

type Muestreo = ((input: { role: "user" | "assistant"; content: string }[], opts: object) => Promise<{ text: string }>) | null;

async function viaVistaPrevia(o: Opciones, contexto?: string) {
  const claude = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude;
  const sample = (claude ? ((await claude.use("sample")) as Muestreo) : null);
  if (!sample) throw new ErrorIA("La IA de la vista previa no está disponible aquí. Al desplegar en Vercel, Blanquita usa tus llaves de Claude y Gemini.", "sin_ia");
  const turnos = [
    { role: "user" as const, content: `${sistemaPara(o.modo, contexto)}\n\n(Instrucciones de la app. Responde a los mensajes de Anna que siguen.)` },
    ...o.mensajes.map((m) => ({ role: m.rol === "blanquita" ? ("assistant" as const) : ("user" as const), content: m.texto })),
  ];
  try {
    const { text } = await sample(turnos, { cache: false, signal: o.signal, onText: ({ text }: { text: string }) => o.onTexto?.(text) });
    return text;
  } catch (e) {
    const err = e as { code?: string; text?: string };
    const parcial = err.text ?? "";
    switch (err.code) {
      case "cancelled": throw new ErrorIA("Detenido", "cancelado", parcial);
      case "not_granted":
      case "sampling_disabled":
      case "not_declared":
      case "capability_disabled":
        throw new ErrorIA("No diste permiso para que la vista previa use Claude. Recarga la página si cambias de opinión.", "permiso");
      case "rate_limited": throw new ErrorIA("Demasiadas preguntas seguidas. Espera un momento.", "limite", parcial);
      case "prompt_too_large": throw new ErrorIA("El texto es demasiado largo. Envía una parte a la vez.", "otro");
      default: throw new ErrorIA("Blanquita no pudo responder. Intenta de nuevo.", "red", parcial);
    }
  }
}

/** Desglosa una tarea en pasos (lo usa el botón de cada tarea) */
export async function desglosarTarea(titulo: string, proveedor: ProveedorIA): Promise<PasoDesglose[]> {
  const texto = await preguntarABlanquita({ proveedor, modo: "desglosar", mensajes: [{ rol: "usuaria", texto: titulo }] });
  const r = extraerDesglose(texto);
  if (!r) throw new ErrorIA("Blanquita respondió en un formato inesperado. Intenta de nuevo.", "otro");
  return r.pasos;
}
