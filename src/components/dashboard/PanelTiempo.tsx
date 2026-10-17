"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { Panel } from "@/components/ui/Panel";
import { esHoy, formatoDuracion, formatoHora, minutosAhora, minutosDeHora } from "@/lib/fechas";
import { useNekoStore } from "@/store/useNekoStore";

function useAhora(cadaMs: number) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(t);
  }, [cadaMs]);
  return ahora;
}

// ─── Calculadora de tiempo libre ────────────────────────────────────────
export interface ResumenTiempo {
  ventanaMin: number;
  eventosMin: number;
  tareasMin: number;
  libreMin: number;
  eventos: { titulo: string; min: number; inicio: string }[];
}

export function calcularTiempoLibre(
  ahoraMs: number,
  inicioDia: string,
  finDia: string,
  eventos: { titulo: string; inicio: string; fin: string }[],
  tareas: { completada: boolean; fechaLimite?: string; estimadoMin?: number; realMin: number }[],
): ResumenTiempo {
  const ahora = new Date(ahoraMs);
  const minAhora = minutosAhora(ahora);
  const desde = Math.max(minAhora, minutosDeHora(inicioDia));
  const hasta = minutosDeHora(finDia);
  const ventanaMin = Math.max(0, hasta - desde);

  const aMinDelDia = (iso: string) => {
    const d = new Date(iso);
    return esHoy(iso) ? d.getHours() * 60 + d.getMinutes() : d < ahora ? 0 : 24 * 60;
  };
  const listaEventos = eventos
    .map((e) => {
      const ini = Math.max(aMinDelDia(e.inicio), desde);
      const fin = Math.min(aMinDelDia(e.fin), hasta);
      return { titulo: e.titulo, min: Math.max(0, fin - ini), inicio: e.inicio };
    })
    .filter((e) => e.min > 0);
  const eventosMin = listaEventos.reduce((s, e) => s + e.min, 0);

  const tareasMin = tareas
    .filter((t) => !t.completada && t.fechaLimite && (esHoy(t.fechaLimite) || new Date(t.fechaLimite) < ahora))
    .reduce((s, t) => s + Math.max(0, (t.estimadoMin ?? 0) - t.realMin), 0);

  return { ventanaMin, eventosMin, tareasMin, libreMin: Math.max(0, ventanaMin - eventosMin - tareasMin), eventos: listaEventos };
}

export function PanelTiempoLibre() {
  const ahora = useAhora(30_000);
  const ajustes = useNekoStore((s) => s.ajustes);
  const eventos = useNekoStore((s) => s.eventosCalendario);
  const tareas = useNekoStore((s) => s.tareas);
  const r = useMemo(
    () => calcularTiempoLibre(ahora, ajustes.horaInicioDia, ajustes.horaFinDia, eventos.filter((e) => !e.todoElDia), tareas),
    [ahora, ajustes.horaInicioDia, ajustes.horaFinDia, eventos, tareas],
  );
  const total = Math.max(1, r.ventanaMin);
  const mucho = r.libreMin >= 120;

  return (
    <Panel titulo="Tiempo libre de hoy" icono="reloj" acento="cian">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-titulo text-4xl font-semibold leading-none text-cian">{formatoDuracion(r.libreMin)}</p>
          <p className="mt-1.5 text-sm text-white/55">libres hasta las {ajustes.horaFinDia}</p>
        </div>
        <Gatita clave="ronro" pose={mucho ? "dormida" : "echada"} expresion={mucho ? "dormida" : "normal"} ancho={92} />
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-noche-600" role="img"
        aria-label={`Eventos ${formatoDuracion(r.eventosMin)}, tareas ${formatoDuracion(r.tareasMin)}, libre ${formatoDuracion(r.libreMin)}`}>
        <motion.div className="h-full bg-violeta" initial={false} animate={{ width: `${(r.eventosMin / total) * 100}%` }} />
        <motion.div className="h-full bg-rosa" initial={false} animate={{ width: `${(r.tareasMin / total) * 100}%` }} />
        <motion.div className="h-full bg-cian" initial={false} animate={{ width: `${(r.libreMin / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violeta" />Calendario {formatoDuracion(r.eventosMin)}</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rosa" />Tareas {formatoDuracion(r.tareasMin)}</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-cian" />Libre {formatoDuracion(r.libreMin)}</span>
      </div>

      {r.eventos.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-noche-600 pt-3 text-xs text-white/55">
          {r.eventos.map((e) => (
            <li key={e.titulo + e.inicio} className="flex items-center gap-2">
              <IconoNeko nombre="calendario" tamano={13} className="text-violeta" />
              {formatoHora(e.inicio)} · {e.titulo}
              <span className="ml-auto">{formatoDuracion(e.min)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-white/45">
        {mucho ? "Ronro sugiere guardar un ratito para descansar." : r.libreMin < 30 ? "Día lleno. Prioriza lo urgente y toma agua." : "Buen equilibrio para hoy."}
      </p>
    </Panel>
  );
}

// ─── Pomodoro con Mango ─────────────────────────────────────────────────
export function PanelPomodoro() {
  const p = useNekoStore((s) => s.pomodoro);
  const tareas = useNekoStore((s) => s.tareas);
  const accesorio = useNekoStore((s) => s.gatitas.find((g) => g.clave === "mango")?.accesorio);
  const minutos = useNekoStore((s) => s.ajustes.pomodoroMin);
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const [guia, setGuia] = useState(false);
  const { iniciarPomodoro, pausarPomodoro, reanudarPomodoro, detenerPomodoro, terminarFasePomodoro } = useNekoStore.getState();
  const corriendo = !!p.finEn;
  const ahora = useAhora(corriendo ? 1000 : 60_000);
  const [tareaSel, setTareaSel] = useState<string>("");
  const terminando = useRef(false);

  const restante = p.fase === "inactivo" ? minutos * 60 : p.finEn ? Math.max(0, Math.ceil((p.finEn - ahora) / 1000)) : p.restanteSeg ?? p.duracionSeg;
  const progreso = p.fase === "inactivo" ? 0 : 1 - restante / p.duracionSeg;

  useEffect(() => {
    if (corriendo && restante <= 0 && !terminando.current) {
      terminando.current = true;
      terminarFasePomodoro();
      setTimeout(() => { terminando.current = false; }, 1500);
    }
  }, [corriendo, restante, terminarFasePomodoro]);

  const tareaActiva = tareas.find((t) => t.id === p.tareaId);
  const pendientes = tareas.filter((t) => !t.completada);
  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");
  const R = 54;
  const C = 2 * Math.PI * R;
  const colorFase = p.fase === "descanso" ? "#67e8f9" : "#9cc96b";

  return (
    <Panel
      titulo="Pomodoro con Mango"
      icono="reloj"
      acento="croqueta"
      accion={
        <button type="button" onClick={() => setGuia((v) => !v)} aria-expanded={guia}
          className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${guia ? "border-croqueta/60 bg-croqueta/15 text-croqueta" : "border-noche-600 text-white/60 hover:text-white"}`}>
          ¿Cómo funciona?
        </button>
      }
    >
      <AnimatePresence initial={false}>
        {guia && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <GuiaPomodoro />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-3">
        <div className="relative grid h-[132px] w-[132px] shrink-0 place-items-center">
          <svg viewBox="0 0 132 132" className="absolute inset-0 -rotate-90">
            <circle cx="66" cy="66" r={R} fill="none" stroke="#2a2736" strokeWidth="10" />
            <motion.circle cx="66" cy="66" r={R} fill="none" stroke={colorFase} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} initial={false} animate={{ strokeDashoffset: C * (1 - progreso) }} transition={{ duration: 0.6 }} />
          </svg>
          <div className="text-center">
            <p className="font-titulo text-3xl font-semibold tabular-nums text-white">{mm}:{ss}</p>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: colorFase }}>
              {p.fase === "trabajo" ? "enfoque" : p.fase === "descanso" ? "descanso" : "listo"}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <Gatita clave="mango" pose={p.fase === "descanso" ? "panzaArriba" : "sentada"}
            expresion={p.fase === "trabajo" ? "concentrada" : p.fase === "descanso" ? "feliz" : "normal"} accesorio={accesorio} ancho={104} />
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        {p.fase === "inactivo" && (
          <div className="flex items-center gap-1.5" role="group" aria-label="Duración del enfoque">
            <span className="text-[11px] text-white/45">Duración</span>
            {[15, 25, 45].map((m) => (
              <button key={m} type="button" onClick={() => ajustar({ pomodoroMin: m, descansoMin: m >= 45 ? 10 : 5 })}
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${minutos === m ? "border-[#9cc96b] bg-[#9cc96b]/20 text-white" : "border-noche-600 text-white/55"}`}>
                {m} min
              </button>
            ))}
          </div>
        )}
        {p.fase === "inactivo" ? (
          <select value={tareaSel} onChange={(e) => setTareaSel(e.target.value)} aria-label="Tarea para el Pomodoro"
            className="w-full rounded-xl border border-noche-600 bg-noche-900 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-croqueta/60">
            <option value="">Sin tarea (enfoque libre)</option>
            {pendientes.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select>
        ) : (
          <p className="truncate rounded-xl bg-noche-900/70 px-3 py-2 text-sm text-white/75">
            <span className="text-white/40">Enfocada en:</span> {tareaActiva?.titulo ?? "enfoque libre"}
            {tareaActiva && tareaActiva.realMin > 0 && <span className="text-white/40"> · {formatoDuracion(tareaActiva.realMin)} reales</span>}
          </p>
        )}
        <div className="flex gap-2">
          {p.fase === "inactivo" ? (
            <button type="button" onClick={() => iniciarPomodoro(tareaSel || undefined)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#9cc96b] py-2 font-titulo font-semibold text-noche active:scale-[.98]">
              <IconoNeko nombre="play" tamano={18} /> Empezar {minutos} min
            </button>
          ) : (
            <>
              <button type="button" onClick={corriendo ? pausarPomodoro : reanudarPomodoro}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-noche-500 bg-noche-700 py-2 font-semibold text-white active:scale-[.98]">
                <IconoNeko nombre={corriendo ? "pausa" : "play"} tamano={18} /> {corriendo ? "Pausar" : "Seguir"}
              </button>
              <button type="button" onClick={detenerPomodoro} aria-label="Detener"
                className="grid w-11 place-items-center rounded-xl border border-noche-500 bg-noche-700 text-white/70 hover:text-rosa">
                <IconoNeko nombre="reiniciar" tamano={18} />
              </button>
            </>
          )}
        </div>
        <p className="text-[11px] text-white/40">{p.fase === "trabajo" ? "Concéntrate solo en esta tarea. Si algo te distrae, anótalo y sigue." : p.fase === "descanso" ? "Levántate, estírate o toma agua. Al terminar, Mango te avisa." : "Elige una tarea y presiona Empezar. El tiempo se suma a la tarea."}</p>
      </div>
    </Panel>
  );
}

function GuiaPomodoro() {
  const pasos: { titulo: string; texto: string }[] = [
    { titulo: "Elige una sola tarea", texto: "La que más te pesa. También puedes tocar el botón de play junto a cualquier tarea." },
    { titulo: "Enfócate un bloque corto", texto: "25 minutos sin cambiar de pestaña ni revisar el celular. Si te cuesta, empieza con 15." },
    { titulo: "Descansa 5 minutos", texto: "Empieza solo cuando acaba el bloque. Estírate, toma agua o acaricia a una gatita." },
    { titulo: "Repite y compara", texto: "Cada bloque se suma al tiempo real de la tarea, así ves si tu estimado era correcto. Ganas 4 croquetas por bloque." },
  ];
  return (
    <ol className="mb-4 space-y-2 rounded-2xl border border-noche-600 bg-noche-900/70 p-3">
      {pasos.map((p, i) => (
        <li key={p.titulo} className="flex gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#9cc96b]/20 font-titulo text-xs font-bold text-[#9cc96b]">{i + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90">{p.titulo}</p>
            <p className="text-xs leading-relaxed text-white/55">{p.texto}</p>
          </div>
        </li>
      ))}
      <li className="pt-1 text-[11px] text-white/40">Puedes pausar si te interrumpen. Si lo detienes, el tiempo que ya trabajaste también se guarda.</li>
    </ol>
  );
}
