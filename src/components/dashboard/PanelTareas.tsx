"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono, Chip, Panel } from "@/components/ui/Panel";
import { confetiDesde } from "@/lib/eventos";
import { esHoy, formatoDuracion, formatoFechaCorta, formatoHora } from "@/lib/fechas";
import type { Prioridad, Tarea } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";
import { desglosarTarea } from "@/lib/ia/cliente";

export const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  baja: "#67e8f9",
  media: "#a78bfa",
  alta: "#f472b6",
  urgente: "#fb7185",
};
const PESO: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };

type Filtro = "hoy" | "todas" | "hechas";

export function PanelTareas() {
  const tareas = useNekoStore((s) => s.tareas);
  const [formAbierto, setFormAbierto] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("hoy");

  const visibles = useMemo(() => {
    const lista = tareas.filter((t) => {
      if (filtro === "hechas") return t.completada;
      if (filtro === "hoy") return !t.completada ? !t.fechaLimite || esHoy(t.fechaLimite) || new Date(t.fechaLimite) < new Date() : esHoy(t.completadaEn);
      return !t.completada;
    });
    return lista.sort((a, b) =>
      Number(a.completada) - Number(b.completada) ||
      PESO[a.prioridad] - PESO[b.prioridad] ||
      (a.fechaLimite ?? "9").localeCompare(b.fechaLimite ?? "9"),
    );
  }, [tareas, filtro]);

  const pendientesHoy = tareas.filter((t) => !t.completada).length;

  return (
    <Panel
      titulo="Tareas"
      icono="tarea"
      acento="violeta"
      accion={<BotonIcono icono={formAbierto ? "cerrar" : "mas"} etiqueta={formAbierto ? "Cerrar" : "Nueva tarea"} onClick={() => setFormAbierto((v) => !v)} activo={formAbierto} />}
    >
      <AnimatePresence initial={false}>
        {formAbierto && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <FormTarea alGuardar={() => setFormAbierto(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-3 flex items-center gap-1 rounded-xl bg-noche-900/70 p-1 text-xs font-semibold">
        {(["hoy", "todas", "hechas"] as Filtro[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`flex-1 rounded-lg px-2 py-1.5 capitalize transition ${filtro === f ? "bg-violeta/25 text-white" : "text-white/50 hover:text-white/80"}`}
          >
            {f === "hoy" ? "Hoy" : f === "todas" ? `Pendientes (${pendientesHoy})` : "Hechas"}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {visibles.map((t) => (
            <ItemTarea key={t.id} tarea={t} />
          ))}
        </AnimatePresence>
      </ul>
      {visibles.length === 0 && (
        <div className="flex flex-col items-center gap-1 py-6 text-center text-sm text-white/45">
          <IconoNeko nombre="huella" tamano={30} className="text-violeta/60" />
          {filtro === "hechas" ? "Aún no completas tareas hoy." : "Nada pendiente. Bizca está tomando una siesta."}
        </div>
      )}
    </Panel>
  );
}

function ItemTarea({ tarea }: { tarea: Tarea }) {
  const alternar = useNekoStore((s) => s.alternarTarea);
  const eliminar = useNekoStore((s) => s.eliminarTarea);
  const alternarItem = useNekoStore((s) => s.alternarChecklist);
  const agregarItem = useNekoStore((s) => s.agregarChecklist);
  const iniciar = useNekoStore((s) => s.iniciarPomodoro);
  const pomodoro = useNekoStore((s) => s.pomodoro);
  const [abierta, setAbierta] = useState(false);
  const [nuevoItem, setNuevoItem] = useState("");
  const [desglosando, setDesglosando] = useState(false);
  const [errorIa, setErrorIa] = useState("");
  const proveedor = useNekoStore((s) => s.ajustes.proveedorIa);

  const desglosar = async () => {
    setDesglosando(true);
    setErrorIa("");
    try {
      const pasos = await desglosarTarea(tarea.titulo, proveedor);
      pasos.forEach((p) => agregarItem(tarea.id, p.minutos ? `${p.texto} (${p.minutos} min)` : p.texto));
    } catch (e) {
      setErrorIa(e instanceof Error ? e.message : "Blanquita no pudo desglosar la tarea.");
    } finally {
      setDesglosando(false);
    }
  };
  const hechos = tarea.checklist.filter((c) => c.hecho).length;
  const color = COLOR_PRIORIDAD[tarea.prioridad];
  const vencida = !tarea.completada && tarea.fechaLimite && new Date(tarea.fechaLimite) < new Date();
  const enFoco = pomodoro.fase !== "inactivo" && pomodoro.tareaId === tarea.id;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className={`rounded-2xl border bg-noche-700/70 p-3 transition ${enFoco ? "border-[#9cc96b]/60" : "border-noche-600"}`}
      style={{ boxShadow: `inset 3px 0 0 ${color}` }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={tarea.completada ? "Marcar como pendiente" : "Completar tarea"}
          onClick={(e) => {
            if (!tarea.completada) confetiDesde(e.currentTarget);
            alternar(tarea.id);
          }}
          className={`group mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${
            tarea.completada ? "border-transparent bg-violeta text-noche" : "border-white/30 text-transparent hover:border-violeta hover:text-violeta/60"
          }`}
        >
          <IconoNeko nombre={tarea.completada ? "check" : "huella"} tamano={15} grosor={2.6} />
        </button>

        <button type="button" onClick={() => setAbierta((v) => !v)} className="min-w-0 flex-1 text-left">
          <p className={`font-semibold leading-snug ${tarea.completada ? "text-white/40 line-through" : "text-white/90"}`}>{tarea.titulo}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
            <Chip color={color}>{tarea.prioridad}</Chip>
            {tarea.etiquetas.map((e) => (
              <Chip key={e} color="#c4b5fd">#{e}</Chip>
            ))}
            {tarea.fechaLimite && (
              <span className={`flex items-center gap-1 ${vencida ? "text-rosa" : ""}`}>
                <IconoNeko nombre="reloj" tamano={12} />
                {esHoy(tarea.fechaLimite) ? formatoHora(tarea.fechaLimite) : formatoFechaCorta(tarea.fechaLimite)}
              </span>
            )}
            {(tarea.estimadoMin || tarea.realMin > 0) && (
              <span className="flex items-center gap-1">
                <IconoNeko nombre="chispa" tamano={12} />
                {tarea.estimadoMin ? `est. ${formatoDuracion(tarea.estimadoMin)}` : ""}
                {tarea.realMin > 0 ? ` · real ${formatoDuracion(tarea.realMin)}` : ""}
              </span>
            )}
            {tarea.checklist.length > 0 && (
              <span className="flex items-center gap-1"><IconoNeko nombre="lista" tamano={12} />{hechos}/{tarea.checklist.length}</span>
            )}
          </div>
        </button>

        {!tarea.completada && (
          <BotonIcono icono="play" etiqueta="Enfocarme con Pomodoro" onClick={() => iniciar(tarea.id)} activo={enFoco} />
        )}
      </div>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-1.5 border-t border-noche-600 pt-3 pl-10">
              {tarea.checklist.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
                  <input type="checkbox" checked={c.hecho} onChange={() => alternarItem(tarea.id, c.id)} className="h-4 w-4 accent-violeta" />
                  <span className={c.hecho ? "text-white/35 line-through" : ""}>{c.texto}</span>
                </label>
              ))}
              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => { e.preventDefault(); if (nuevoItem.trim()) { agregarItem(tarea.id, nuevoItem.trim()); setNuevoItem(""); } }}
              >
                <input value={nuevoItem} onChange={(e) => setNuevoItem(e.target.value)} placeholder="Agregar paso…"
                  className="min-w-0 flex-1 rounded-lg border border-noche-600 bg-noche-900 px-2.5 py-1 text-sm text-white outline-none focus:border-violeta/60" />
              </form>
              {errorIa && <p className="text-xs text-rosa">{errorIa}</p>}
              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={desglosar} disabled={desglosando}
                  className="flex items-center gap-1.5 rounded-lg border border-violeta/40 bg-violeta/10 px-2.5 py-1 text-xs font-semibold text-violeta transition hover:bg-violeta/20 disabled:opacity-60">
                  <IconoNeko nombre="chispa" tamano={14} /> {desglosando ? "Blanquita está pensando…" : "Desglosar con Blanquita"}
                </button>
                <button type="button" onClick={() => eliminar(tarea.id)} className="ml-auto flex items-center gap-1 text-xs text-white/40 hover:text-rosa">
                  <IconoNeko nombre="basura" tamano={14} /> Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function FormTarea({ alGuardar }: { alGuardar?: () => void }) {
  const agregar = useNekoStore((s) => s.agregarTarea);
  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("media");
  const [estimado, setEstimado] = useState("");
  const [fecha, setFecha] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [pasos, setPasos] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="mb-4 space-y-2.5 rounded-2xl border border-noche-600 bg-noche-900/70 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!titulo.trim()) { setError("Escribe un título para la tarea"); return; }
        agregar({
          titulo,
          prioridad,
          estimadoMin: estimado ? parseInt(estimado, 10) : undefined,
          fechaLimite: fecha ? new Date(fecha).toISOString() : undefined,
          etiquetas: etiquetas.split(",").map((x) => x.trim().replace(/^#/, "")).filter(Boolean),
          checklist: pasos.split("\n").map((x) => x.trim()),
        });
        setTitulo(""); setEstimado(""); setFecha(""); setEtiquetas(""); setPasos(""); setPrioridad("media");
        alGuardar?.();
      }}
    >
      <input
        autoFocus
        value={titulo}
        onChange={(e) => { setTitulo(e.target.value); setError(""); }}
        placeholder="¿Qué necesitas hacer?"
        className="w-full rounded-xl border border-noche-600 bg-noche-800 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-violeta/60"
      />
      {error && <p className="text-xs text-rosa">{error}</p>}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(COLOR_PRIORIDAD) as Prioridad[]).map((p) => (
          <button key={p} type="button" onClick={() => setPrioridad(p)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize transition ${prioridad === p ? "text-noche" : "border-noche-600 text-white/60"}`}
            style={prioridad === p ? { background: COLOR_PRIORIDAD[p], borderColor: COLOR_PRIORIDAD[p] } : undefined}>
            {p}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-white/50">
          Estimado (min)
          <input inputMode="numeric" value={estimado} onChange={(e) => setEstimado(e.target.value.replace(/\D/g, ""))} placeholder="30"
            className="mt-0.5 w-full rounded-lg border border-noche-600 bg-noche-800 px-2.5 py-1.5 text-sm text-white outline-none focus:border-violeta/60" />
        </label>
        <label className="text-[11px] text-white/50">
          Cuándo
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-noche-600 bg-noche-800 px-2 py-1.5 text-sm text-white outline-none [color-scheme:dark] focus:border-violeta/60" />
        </label>
      </div>
      <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} placeholder="Etiquetas: trabajo, casa"
        className="w-full rounded-lg border border-noche-600 bg-noche-800 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-violeta/60" />
      <textarea value={pasos} onChange={(e) => setPasos(e.target.value)} rows={2} placeholder={"Checklist (un paso por línea)"}
        className="w-full resize-none rounded-lg border border-noche-600 bg-noche-800 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-violeta/60" />
      <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-violeta to-rosa py-2 font-titulo font-semibold text-noche transition active:scale-[.98]">
        Guardar tarea
      </button>
    </form>
  );
}
