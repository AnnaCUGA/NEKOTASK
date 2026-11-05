"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { Hoja, campo } from "@/components/ui/Hoja";
import { esHoy, formatoFechaCorta, formatoHora, uid } from "@/lib/fechas";
import { columnaDe, normalizarColumnas } from "@/lib/kanban";
import type { ColumnaKanban, Prioridad, Tarea } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";
import { COLOR_PRIORIDAD, FormTarea, ItemTarea, PanelTareas, PESO } from "./PanelTareas";

const LLAVE_VISTA = "neko-tareas-vista";
const COLORES_COLUMNA = ["#38bdf8", "#fbbf24", "#a78bfa", "#34d399", "#f472b6", "#fb923c", "#e5e7eb"];
const MAX_TERMINADAS = 15;

/** Pestaña Tareas: lista o tablero Kanban */
export function SeccionTareas() {
  const [vista, setVista] = useState<"kanban" | "lista">("kanban");
  useEffect(() => {
    try { const v = localStorage.getItem(LLAVE_VISTA); if (v === "lista" || v === "kanban") setVista(v); } catch { /* sin almacenamiento */ }
  }, []);
  const cambiar = (v: "kanban" | "lista") => { setVista(v); try { localStorage.setItem(LLAVE_VISTA, v); } catch { /* nada */ } };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex rounded-xl border border-noche-600 bg-noche-800/90 p-1" role="tablist" aria-label="Vista de tareas">
          {(["kanban", "lista"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => cambiar(v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${vista === v ? "bg-cian/15 text-cian" : "text-white/55 hover:text-white"}`}>
              <IconoNeko nombre={v === "kanban" ? "grafica" : "lista"} tamano={16} className={v === "kanban" ? "rotate-180" : ""} />
              {v === "kanban" ? "Kanban" : "Lista"}
            </button>
          ))}
        </div>
      </div>
      {vista === "kanban" ? <Tablero /> : <div className="mx-auto max-w-3xl"><PanelTareas /></div>}
    </div>
  );
}

function Tablero() {
  const tareas = useNekoStore((s) => s.tareas);
  const guardadas = useNekoStore((s) => s.ajustes.columnasKanban);
  const mover = useNekoStore((s) => s.moverTarea);
  const columnas = useMemo(() => normalizarColumnas(guardadas), [guardadas]);
  const [busqueda, setBusqueda] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad | "">("");
  const [etiqueta, setEtiqueta] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editarColumnas, setEditarColumnas] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [sobre, setSobre] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  const etiquetas = useMemo(() => [...new Set(tareas.flatMap((t) => t.etiquetas))].sort(), [tareas]);
  const porColumna = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = tareas
      .filter((t) => !q || `${t.titulo} ${t.etiquetas.join(" ")}`.toLowerCase().includes(q))
      .filter((t) => !prioridad || t.prioridad === prioridad)
      .filter((t) => !etiqueta || t.etiquetas.includes(etiqueta));
    const m = new Map<string, Tarea[]>(columnas.map((c) => [c.id, []]));
    filtradas.forEach((t) => m.get(columnaDe(t, columnas))?.push(t));
    for (const [id, lista] of m) {
      const final = columnas.find((c) => c.id === id)?.final;
      lista.sort(final
        ? (a, b) => (b.completadaEn ?? "").localeCompare(a.completadaEn ?? "")
        : (a, b) => PESO[a.prioridad] - PESO[b.prioridad] || (a.fechaLimite ?? "9").localeCompare(b.fechaLimite ?? "9"));
    }
    return m;
  }, [tareas, columnas, busqueda, prioridad, etiqueta]);
  const tareaAbierta = tareas.find((t) => t.id === abierta);

  return (
    <div className="space-y-3">
      {/* filtros en una fila */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-[180px] sm:flex-1">
          <IconoNeko nombre="buscar" tamano={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar tarea…" aria-label="Buscar tarea"
            className={`${campo} rounded-xl bg-noche-800/90 py-2.5 pl-10`} />
        </div>
        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad | "")} aria-label="Prioridad"
          className="min-w-0 flex-1 rounded-xl border border-noche-600 bg-noche-800 px-2.5 py-2.5 text-sm text-white [color-scheme:dark] sm:flex-none">
          <option value="">Prioridad</option>
          {(Object.keys(COLOR_PRIORIDAD) as Prioridad[]).map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        {etiquetas.length > 0 && (
          <select value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} aria-label="Etiqueta"
            className="min-w-0 flex-1 rounded-xl border border-noche-600 bg-noche-800 px-2.5 py-2.5 text-sm text-white [color-scheme:dark] sm:flex-none">
            <option value="">Etiqueta</option>
            {etiquetas.map((e) => <option key={e} value={e}>#{e}</option>)}
          </select>
        )}
        <button type="button" onClick={() => setEditarColumnas(true)} aria-label="Editar columnas"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-cian/40 px-3 py-2.5 text-sm font-semibold text-cian hover:bg-cian/10">
          <IconoNeko nombre="ajustes" tamano={16} /> <span className="hidden sm:inline">Columnas</span> <span className="rounded-md bg-cian/15 px-1.5 text-xs">{columnas.length}</span>
        </button>
        <button type="button" onClick={() => setNueva(true)} aria-label="Nueva tarea"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violeta to-rosa px-3.5 py-2.5 font-titulo text-sm font-semibold text-noche">
          <IconoNeko nombre="mas" tamano={16} grosor={2.6} /> <span className="hidden sm:inline">Tarea</span>
        </button>
      </div>

      {/* tablero: en el celular se desliza de lado, columna por columna */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scroll-snap-type:x_mandatory] lg:mx-0 lg:px-0">
        <div className="flex gap-3" style={{ minWidth: "min-content" }}>
          {columnas.map((c) => {
            const lista = porColumna.get(c.id) ?? [];
            const recortar = c.final && !verTodas && lista.length > MAX_TERMINADAS;
            const visibles = recortar ? lista.slice(0, MAX_TERMINADAS) : lista;
            return (
              <section key={c.id} aria-label={c.nombre}
                onDragOver={(e) => { e.preventDefault(); setSobre(c.id); }}
                onDragLeave={() => setSobre((s) => (s === c.id ? null : s))}
                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) mover(id, c.id); setSobre(null); }}
                className={`flex max-h-[calc(100vh-250px)] min-h-[220px] w-[82vw] max-w-[320px] shrink-0 flex-col rounded-[20px] border bg-noche-800/80 [scroll-snap-align:start] sm:w-[300px] lg:w-auto lg:min-w-[250px] lg:max-w-none lg:flex-1 ${sobre === c.id ? "border-cian/60 bg-cian/[0.05]" : "border-noche-600"}`}>
                <header className="flex items-center gap-2 border-b border-noche-600 px-3.5 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <h3 className="flex-1 truncate text-sm font-bold text-white/90">{c.nombre}</h3>
                  {c.final && <IconoNeko nombre="check" tamano={14} className="text-white/35" titulo="Cuenta como terminada" />}
                  <span className="rounded-full bg-noche-700 px-2 py-0.5 text-xs font-bold tabular-nums text-white/60">{lista.length}</span>
                </header>
                <ul className="flex-1 space-y-2 overflow-y-auto p-2.5">
                  {visibles.map((t) => <Tarjeta key={t.id} tarea={t} final={!!c.final} alAbrir={() => setAbierta(t.id)} />)}
                  {lista.length === 0 && <li className="py-6 text-center text-xs text-white/35">Sin tareas</li>}
                  {recortar && (
                    <li><button type="button" onClick={() => setVerTodas(true)} className="w-full rounded-xl py-2 text-xs font-semibold text-white/50 hover:text-white">Ver las {lista.length - MAX_TERMINADAS} anteriores</button></li>
                  )}
                </ul>
                {!c.final && <AgregarRapido columnaId={c.id} />}
              </section>
            );
          })}
        </div>
      </div>
      <p className="hidden text-center text-[11px] text-white/35 lg:block">Arrastra las tarjetas entre columnas. Pasarla a &ldquo;{columnas.find((c) => c.final)?.nombre}&rdquo; la marca como terminada.</p>
      <p className="text-center text-[11px] text-white/35 lg:hidden">Desliza para ver las columnas. Toca una tarea para moverla.</p>

      <AnimatePresence>
        {tareaAbierta && (
          <Hoja alCerrar={() => setAbierta(null)} ancho="max-w-xl">
            <div className="mb-3 flex items-center gap-2">
              <p className="flex-1 font-titulo text-lg font-semibold">Tarea</p>
              <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={() => setAbierta(null)} />
            </div>
            <p className="mb-1.5 text-xs font-semibold text-white/55">Mover a</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {columnas.map((c) => {
                const actual = columnaDe(tareaAbierta, columnas) === c.id;
                return (
                  <button key={c.id} type="button" disabled={actual} onClick={() => mover(tareaAbierta.id, c.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${actual ? "bg-noche-700 text-white" : "border-noche-600 text-white/60 hover:text-white"}`}
                    style={actual ? { borderColor: c.color } : undefined}>
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} /> {c.nombre}
                  </button>
                );
              })}
            </div>
            <ul><ItemTarea tarea={tareaAbierta} /></ul>
          </Hoja>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {nueva && (
          <Hoja alCerrar={() => setNueva(false)}>
            <div className="mb-2 flex items-center gap-2">
              <p className="flex-1 font-titulo text-lg font-semibold">Nueva tarea</p>
              <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={() => setNueva(false)} />
            </div>
            <FormTarea alGuardar={() => setNueva(false)} />
          </Hoja>
        )}
      </AnimatePresence>
      <AnimatePresence>{editarColumnas && <EditorColumnas columnas={columnas} alCerrar={() => setEditarColumnas(false)} />}</AnimatePresence>
    </div>
  );
}

function Tarjeta({ tarea: t, final, alAbrir }: { tarea: Tarea; final: boolean; alAbrir: () => void }) {
  const vencida = !t.completada && t.fechaLimite && new Date(t.fechaLimite) < new Date();
  const hechos = t.checklist.filter((c) => c.hecho).length;
  const color = COLOR_PRIORIDAD[t.prioridad];
  return (
    <li draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; }}>
      <button type="button" onClick={alAbrir}
        className="group w-full cursor-pointer rounded-2xl border border-noche-600 bg-noche-700/70 p-3 text-left transition hover:border-violeta/40 active:cursor-grabbing">
        <span className="flex items-start gap-2">
          <span className={`min-w-0 flex-1 text-[14px] font-semibold leading-snug ${final ? "text-white/55" : "text-white/90"}`}>{t.titulo}</span>
          <span style={{ color }} title={`Prioridad ${t.prioridad}`}><IconoNeko nombre="fijar" tamano={15} /></span>
        </span>
        {(t.etiquetas.length > 0 || t.fechaLimite || t.checklist.length > 0) && (
          <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {t.etiquetas.slice(0, 3).map((e) => <span key={e} className="rounded-md border border-cian/30 bg-cian/10 px-1.5 py-0.5 font-semibold text-cian">{e}</span>)}
            {t.fechaLimite && (
              <span className={`flex items-center gap-1 font-semibold ${vencida ? "text-rosa" : "text-white/50"}`}>
                <IconoNeko nombre="calendario" tamano={12} />
                {esHoy(t.fechaLimite) ? formatoHora(t.fechaLimite) : formatoFechaCorta(t.fechaLimite)}
              </span>
            )}
            {t.checklist.length > 0 && <span className="flex items-center gap-1 text-white/50"><IconoNeko nombre="lista" tamano={12} />{hechos}/{t.checklist.length}</span>}
          </span>
        )}
      </button>
    </li>
  );
}

function AgregarRapido({ columnaId }: { columnaId: string }) {
  const agregar = useNekoStore((s) => s.agregarTareaEnColumna);
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="flex items-center gap-1.5 border-t border-noche-600 px-3.5 py-2.5 text-left text-xs font-semibold text-white/45 hover:text-white">
        <IconoNeko nombre="mas" tamano={14} /> Agregar aquí
      </button>
    );
  }
  return (
    <form className="flex gap-1.5 border-t border-noche-600 p-2.5"
      onSubmit={(e) => { e.preventDefault(); if (texto.trim()) { agregar(texto.trim(), columnaId); setTexto(""); } }}>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Título y Enter" autoFocus aria-label="Nueva tarea en esta columna"
        onBlur={() => !texto && setAbierto(false)} className={`${campo} py-1.5`} />
      <BotonIcono icono="cerrar" etiqueta="Cancelar" onClick={() => { setTexto(""); setAbierto(false); }} className="h-9 w-9 shrink-0" />
    </form>
  );
}

function EditorColumnas({ columnas, alCerrar }: { columnas: ColumnaKanban[]; alCerrar: () => void }) {
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const tareas = useNekoStore((s) => s.tareas);
  const [lista, setLista] = useState(columnas);
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const cambiar = (id: string, c: Partial<ColumnaKanban>) => setLista((l) => l.map((x) => (x.id === id ? { ...x, ...c } : x)));
  const mover = (i: number, d: -1 | 1) => setLista((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const enColumna = (id: string) => tareas.filter((t) => !t.completada && t.columna === id).length;
  const guardar = () => {
    const limpias = normalizarColumnas(lista.map((c) => ({ ...c, nombre: c.nombre.trim() || "Sin nombre" })));
    ajustar({ columnasKanban: limpias });
    alCerrar();
  };

  return (
    <Hoja alCerrar={alCerrar}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="flex-1 font-titulo text-lg font-semibold">Columnas del tablero</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={alCerrar} />
        </div>
        <ul className="space-y-2">
          {lista.map((c, i) => (
            <li key={c.id} className="rounded-xl border border-noche-600 bg-noche-900/60 p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="flex flex-col">
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${c.nombre}`} className="grid h-5 w-6 place-items-center text-white/45 disabled:opacity-20"><IconoNeko nombre="izquierda" tamano={13} className="rotate-90" /></button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label={`Bajar ${c.nombre}`} className="grid h-5 w-6 place-items-center text-white/45 disabled:opacity-20"><IconoNeko nombre="izquierda" tamano={13} className="-rotate-90" /></button>
                </span>
                <input value={c.nombre} onChange={(e) => cambiar(c.id, { nombre: e.target.value })} aria-label="Nombre de la columna" className={`${campo} py-1.5`} />
                {lista.length > 2 && (porBorrar === c.id ? (
                  <button type="button" onClick={() => { setLista((l) => l.filter((x) => x.id !== c.id)); setPorBorrar(null); }} className="h-9 shrink-0 rounded-xl border border-rosa bg-rosa/15 px-2 text-xs font-bold text-rosa">¿Quitar?</button>
                ) : (
                  <BotonIcono icono="basura" etiqueta={`Quitar ${c.nombre}`} tamano={15} onClick={() => setPorBorrar(c.id)} className="h-9 w-9 shrink-0" />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-8">
                {COLORES_COLUMNA.map((col) => (
                  <button key={col} type="button" onClick={() => cambiar(c.id, { color: col })} aria-label={`Color ${col}`} aria-pressed={c.color === col}
                    className={`h-6 w-6 rounded-full ${c.color === col ? "ring-2 ring-white ring-offset-2 ring-offset-noche-900" : ""}`} style={{ background: col }} />
                ))}
                <label className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
                  <input type="radio" name="col-final" checked={!!c.final} onChange={() => setLista((l) => l.map((x) => ({ ...x, final: x.id === c.id })))} className="accent-violeta" />
                  Terminada
                </label>
              </div>
              {porBorrar === c.id && enColumna(c.id) > 0 && <p className="mt-1.5 pl-8 text-[11px] text-white/50">Sus {enColumna(c.id)} tareas pasan a la primera columna.</p>}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setLista((l) => [...l.filter((x) => !x.final), { id: uid(), nombre: "Nueva columna", color: COLORES_COLUMNA[l.length % COLORES_COLUMNA.length] }, ...l.filter((x) => x.final)])}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-noche-600 py-2 text-sm font-semibold text-white/60 hover:text-white">
          <IconoNeko nombre="mas" tamano={16} /> Agregar columna
        </button>
        <p className="text-[11px] text-white/45">La columna marcada como &ldquo;Terminada&rdquo; completa las tareas que pongas ahí (con sus croquetas).</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setLista(normalizarColumnas(undefined))} className="rounded-xl border border-noche-600 px-3 py-2.5 text-sm font-semibold text-white/60">Restablecer</button>
          <button type="button" onClick={guardar} className="flex-1 rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche">Guardar</button>
        </div>
      </div>
    </Hoja>
  );
}
