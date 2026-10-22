/**
 * Reglas de recordatorios — funciones puras que usan tanto la app (avisos en pantalla)
 * como el servidor (notificaciones push cada 10 minutos).
 */
import { AJUSTES_CICLO, estadoCiclo } from "@/lib/ciclo";
import { diasEntre, pesos } from "@/lib/dinero";
import { TIPOS_FECHA, diasParaFecha, tituloFecha } from "@/lib/fechasImportantes";
import type { AjustesCiclo, CitaGatita, FechaImportante, Suscripcion, ClaveGatita, ConfigRecordatorios, Habito, RegistroBebida, RegistroCuidado, RegistroHabito, Rutina, Tarea } from "@/lib/tipos";

export interface DatosRecordatorio {
  recordatorios: ConfigRecordatorios;
  metaAguaMl: number;
  tareas: Pick<Tarea, "id" | "titulo" | "completada" | "fechaLimite">[];
  registroBebidas: Pick<RegistroBebida, "ml" | "porcentaje" | "en">[];
  habitos: Pick<Habito, "id" | "nombre" | "rutina" | "diasSemana">[];
  registroHabitos: RegistroHabito[];
  citas: Pick<CitaGatita, "id" | "gatita" | "tipo" | "fecha" | "hecha">[];
  registroCuidados: RegistroCuidado[];
  fechasImportantes?: FechaImportante[];
  diasPeriodo?: string[];
  ciclo?: AjustesCiclo;
  suscripciones?: Pick<Suscripcion, "id" | "nombre" | "monto" | "proximoCobro" | "avisarDiasAntes" | "activa">[];
}

export interface Recordatorio {
  clave: string;          // única por día: evita repetir
  titulo: string;
  cuerpo: string;
  gatita: ClaveGatita;
  url: string;            // a dónde lleva al tocarlo
  acciones?: { accion: string; titulo: string }[];
}

const NOMBRE: Record<ClaveGatita, string> = { blanquita: "Blanquita", bizca: "Bizca", mango: "Mango", ronro: "Ronro" };
const CITA = { vacuna: "vacuna", desparasitacion: "desparasitación", veterinario: "cita con el veterinario", medicamento: "medicamento" } as const;
const CUIDADO = { comida: "comida", agua_fresca: "agua fresca", arenero: "arenero" } as const;

/** Fecha y minutos del día en una zona horaria */
export function relojEn(fecha: Date, zona: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(fecha)
      .map((x) => [x.type, x.value]),
  );
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { dia: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute), diaSemana: dias.indexOf(p.weekday) };
}

const aMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const VENTANA = 60; // un aviso de hora fija se puede mandar hasta 1 h después

export function calcularRecordatorios(d: DatosRecordatorio, ahora: Date, zona: string): Recordatorio[] {
  const r = d.recordatorios;
  const { dia, minutos, diaSemana } = relojEn(ahora, zona);
  const lista: Recordatorio[] = [];

  // ── Agua: solo si vas atrasada respecto a tu meta ─────────────────────
  if (r.agua.activo) {
    const ini = aMin(r.agua.desde);
    const fin = aMin(r.agua.hasta);
    if (minutos >= ini && minutos <= fin && fin > ini) {
      const deHoy = d.registroBebidas.filter((b) => relojEn(new Date(b.en), zona).dia === dia);
      const tomado = deHoy.reduce((s, b) => s + (b.ml * b.porcentaje) / 100, 0);
      const esperado = (d.metaAguaMl * (minutos - ini)) / (fin - ini);
      const ultima = deHoy.reduce((m, b) => Math.max(m, +new Date(b.en)), 0);
      const minDesdeUltima = ultima ? (+ahora - ultima) / 60_000 : Infinity;
      if (tomado < d.metaAguaMl && tomado < esperado - 200 && minDesdeUltima >= r.agua.cadaMin) {
        const turno = Math.floor((minutos - ini) / r.agua.cadaMin);
        lista.push({
          clave: `agua-${dia}-${turno}`,
          titulo: "Blanquita tiene sed",
          cuerpo: `Llevas ${Math.round(tomado)} de ${d.metaAguaMl} ml. ¿Un vaso de agua o de jugo?`,
          gatita: "blanquita",
          url: "/?accion=agua",
          acciones: [{ accion: "agua-250", titulo: "+250 ml de agua" }],
        });
      }
    }
  }

  // ── Rutinas de mañana y noche ─────────────────────────────────────────
  if (r.rutinas.activo) {
    const rutinas: [Rutina, string, string][] = [["manana", r.rutinas.manana, "de mañana"], ["noche", r.rutinas.noche, "de noche"]];
    for (const [rutina, hora, nombre] of rutinas) {
      const h = aMin(hora);
      if (minutos < h || minutos > h + VENTANA) continue;
      const faltan = d.habitos
        .filter((x) => x.rutina === rutina && (!x.diasSemana.length || x.diasSemana.includes(diaSemana)))
        .filter((x) => !d.registroHabitos.some((g) => g.habitoId === x.id && g.fecha === dia));
      if (!faltan.length) continue;
      lista.push({
        clave: `rutina-${rutina}-${dia}`,
        titulo: `Tu rutina ${nombre}`,
        cuerpo: `Ronro te recuerda: ${faltan.map((x) => x.nombre.toLowerCase()).slice(0, 4).join(", ")}.`,
        gatita: "ronro",
        url: "/?seccion=habitos",
      });
    }
  }

  // ── Tareas con hora ───────────────────────────────────────────────────
  if (r.tareas.activo) {
    for (const t of d.tareas) {
      if (t.completada || !t.fechaLimite) continue;
      const faltanMin = (+new Date(t.fechaLimite) - +ahora) / 60_000;
      if (faltanMin > r.tareas.minutosAntes || faltanMin < -10) continue;
      lista.push({
        clave: `tarea-${t.id}-${t.fechaLimite}`,
        titulo: faltanMin > 1 ? `En ${Math.round(faltanMin)} min: ${t.titulo}` : `Es hora: ${t.titulo}`,
        cuerpo: "Bizca ya está lista para celebrar cuando la completes.",
        gatita: "bizca",
        url: "/?seccion=tareas",
      });
    }
  }

  // ── Gatitas: citas del día y cuidados pendientes en la noche ──────────
  if (r.gatitas.activo) {
    const h = aMin(r.gatitas.hora);
    if (minutos >= h && minutos <= h + VENTANA) {
      for (const c of d.citas) {
        if (c.hecha || c.fecha !== dia) continue;
        lista.push({
          clave: `cita-${c.id}`,
          titulo: `Hoy: ${CITA[c.tipo]} de ${NOMBRE[c.gatita]}`,
          cuerpo: `${NOMBRE[c.gatita]} cuenta contigo. Márcala como hecha cuando termines.`,
          gatita: c.gatita,
          url: "/?seccion=gatitas",
        });
      }
    }
    const noche = 20 * 60;
    if (minutos >= noche && minutos <= noche + VENTANA * 2) {
      const pendientes = (Object.keys(CUIDADO) as (keyof typeof CUIDADO)[]).filter(
        (tipo) => !d.registroCuidados.some((x) => x.tipo === tipo && x.fecha === dia),
      );
      if (pendientes.length) {
        lista.push({
          clave: `cuidados-${dia}`,
          titulo: "¿Ya atendiste a tus gatitas?",
          cuerpo: `Falta registrar: ${pendientes.map((p) => CUIDADO[p]).join(", ")}.`,
          gatita: "mango",
          url: "/?seccion=gatitas",
        });
      }
    }
  }

  // ── Fechas importantes: el mismo día y N días antes ──────────────────
  const rf = r.fechas ?? { activo: true, hora: "09:00" };
  if (rf.activo && d.fechasImportantes?.length) {
    const h = aMin(rf.hora);
    if (minutos >= h && minutos <= h + VENTANA) {
      for (const f of d.fechasImportantes) {
        const faltan = diasParaFecha(f, dia);
        if (faltan !== 0 && faltan !== f.avisarDiasAntes) continue;
        const titulo = tituloFecha(f, dia);
        const cumple = f.tipo === "cumpleanos";
        lista.push({
          clave: `fecha-${f.id}-${dia}`,
          titulo: faltan === 0 ? `Hoy: ${titulo}` : `${faltan === 1 ? "Mañana" : `En ${faltan} días`}: ${titulo}`,
          cuerpo: cumple
            ? (faltan === 0 ? "Bizca ya preparó el pastel. ¡No olvides felicitar!" : "Bizca dice que aún hay tiempo para el regalo.")
            : `${TIPOS_FECHA[f.tipo].nombre}. Blanquita lo tiene anotado por ti.`,
          gatita: cumple ? "bizca" : "blanquita",
          url: "/?seccion=fechas",
        });
      }
    }
  }

  // ── Cobros de suscripciones ──────────────────────────────────────────
  const rd = r.dinero ?? { activo: true, hora: "10:00" };
  if (rd.activo && d.suscripciones?.length) {
    const h = aMin(rd.hora);
    if (minutos >= h && minutos <= h + VENTANA) {
      for (const x of d.suscripciones) {
        if (!x.activa) continue;
        const faltan = diasEntre(dia, x.proximoCobro);
        if (faltan !== 0 && faltan !== x.avisarDiasAntes) continue;
        lista.push({
          clave: `cobro-${x.id}-${x.proximoCobro}-${faltan}`,
          titulo: faltan === 0 ? `Hoy se cobra ${x.nombre}` : `${faltan === 1 ? "Mañana" : `En ${faltan} días`} se cobra ${x.nombre}`,
          cuerpo: `Mango apartó ${pesos(x.monto)}. ${faltan === 0 ? "Confírmalo en Dinero cuando salga." : "¿Todavía la usas?"}`,
          gatita: "mango",
          url: "/?seccion=suscripciones",
        });
      }
    }
  }

  // ── Ciclo: aviso discreto (no dice de qué se trata en la pantalla bloqueada) ──
  const ac = d.ciclo ?? AJUSTES_CICLO;
  if (ac.avisar && d.diasPeriodo?.length) {
    const h = aMin(ac.hora);
    const e = estadoCiclo(d.diasPeriodo, dia, ac);
    if (minutos >= h && minutos <= h + VENTANA && !e.enPeriodo && e.diasParaProximo === ac.diasAntes) {
      lista.push({
        clave: `bienestar-${e.proximoInicio}`,
        titulo: "Recordatorio de Blanquita",
        cuerpo: "Tienes algo pendiente en Bienestar.",
        gatita: "blanquita",
        url: "/?seccion=ciclo",
      });
    }
  }

  return lista;
}
