"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gatita, type Expresion, type MovCabeza } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { confetiDesde } from "@/lib/eventos";
import { formatoFechaCorta, formatoHora } from "@/lib/fechas";
import { ES_VISTA_PREVIA } from "@/lib/google/cliente";
import { ErrorIA, preguntarABlanquita } from "@/lib/ia/cliente";
import { extraerDesglose, MODOS, modoInfo, sinBloqueJson } from "@/lib/ia/prompts";
import { mrrp } from "@/lib/sonidos";
import type { Conversacion, MensajeIA, ModoIA, ProveedorIA } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";
import { Markdown } from "./Markdown";

type EstadoBlanquita = "quieta" | "pensando" | "escribiendo" | "error";
const CARA: Record<EstadoBlanquita, { expresion: Expresion; cabeza: MovCabeza }> = {
  quieta: { expresion: "normal", cabeza: "normal" },
  pensando: { expresion: "concentrada", cabeza: "inclinada" },
  escribiendo: { expresion: "feliz", cabeza: "asentir" },
  error: { expresion: "sorprendida", cabeza: "normal" },
};

export function SeccionAsistente() {
  const conversaciones = useNekoStore((s) => s.conversaciones);
  const proveedor = useNekoStore((s) => s.ajustes.proveedorIa);
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const { crearConversacion, agregarMensaje, actualizarMensaje } = useNekoStore.getState();

  const [activaId, setActivaId] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoIA>("libre");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<EstadoBlanquita>("quieta");
  const [verHistorial, setVerHistorial] = useState(false);
  const [verAjustes, setVerAjustes] = useState(false);
  const control = useRef<AbortController | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLTextAreaElement>(null);

  const activa = conversaciones.find((c) => c.id === activaId) ?? null;
  const ocupada = estado === "pensando" || estado === "escribiendo";
  const info = modoInfo(modo);

  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: "smooth" });
  }, [activa?.mensajes.length, activa?.mensajes.at(-1)?.texto.length]);

  // la caja crece con el texto
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(220, el.scrollHeight)}px`;
  }, [texto]);

  const enviar = async (contenido = texto) => {
    const limpio = contenido.trim();
    if (!limpio || ocupada) return;
    const id = activa?.id ?? crearConversacion(modo);
    if (!activa) setActivaId(id);
    agregarMensaje(id, { rol: "usuaria", texto: limpio, modo });
    const respuestaId = agregarMensaje(id, { rol: "blanquita", texto: "", proveedor, modo });
    setTexto("");
    setEstado("pensando");

    const historial = (useNekoStore.getState().conversaciones.find((c) => c.id === id)?.mensajes ?? [])
      .filter((m) => m.id !== respuestaId && !m.error && m.texto.trim())
      .map((m) => ({ rol: m.rol, texto: m.texto }));

    const ctl = new AbortController();
    control.current = ctl;
    try {
      const final = await preguntarABlanquita({
        proveedor,
        modo,
        mensajes: historial,
        incluirContexto: info.usaContexto,
        signal: ctl.signal,
        onTexto: (t) => { setEstado("escribiendo"); actualizarMensaje(id, respuestaId, { texto: t }); },
      });
      actualizarMensaje(id, respuestaId, { texto: final });
      setEstado("quieta");
      if (useNekoStore.getState().ajustes.sonidos) mrrp(1.2);
    } catch (e) {
      const err = e instanceof ErrorIA ? e : new ErrorIA("Blanquita no pudo responder.", "otro");
      if (err.codigo === "cancelado") {
        actualizarMensaje(id, respuestaId, { texto: err.parcial ? `${err.parcial}\n\n*(detenido)*` : "*(detenido)*" });
        setEstado("quieta");
      } else {
        actualizarMensaje(id, respuestaId, { texto: `${err.parcial ? `${err.parcial}\n\n` : ""}${err.message}`, error: true });
        setEstado("error");
        window.setTimeout(() => setEstado("quieta"), 2500);
      }
    } finally {
      control.current = null;
    }
  };

  const nueva = (m: ModoIA = modo) => {
    control.current?.abort();
    setActivaId(null);
    setModo(m);
    setVerHistorial(false);
    caja.current?.focus();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
      {/* historial y notas */}
      <aside className={`${verHistorial ? "block" : "hidden"} space-y-4 lg:block`}>
        <button type="button" onClick={() => nueva()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violeta to-rosa py-2.5 font-titulo font-semibold text-noche">
          <IconoNeko nombre="mas" tamano={18} grosor={2.6} /> Nueva conversación
        </button>
        <Historial conversaciones={conversaciones} activaId={activaId} alElegir={(c) => { setActivaId(c.id); setModo(c.modo); setVerHistorial(false); }} />
        <NotasGuardadas />
      </aside>

      <section className="panel-neko flex min-w-0 flex-col rounded-[22px] border border-noche-600 bg-noche-800/90">
        {/* cabecera con Blanquita */}
        <header className="flex flex-wrap items-end gap-3 border-b border-noche-600 px-4 pb-3 pt-3">
          <div className="relative -mb-3 shrink-0">
            <Gatita clave="blanquita" pose="sentada" expresion={CARA[estado].expresion} cabeza={CARA[estado].cabeza} ancho={86} />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="font-titulo text-xl font-semibold text-white">Blanquita</p>
            <p className="text-xs text-white/50">
              {estado === "pensando" ? "Pensando…" : estado === "escribiendo" ? "Escribiendo…" : estado === "error" ? "Algo salió mal" : "Tu asistente para el trabajo y el día a día"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 pb-1">
            <SelectorProveedor valor={proveedor} alCambiar={(p) => ajustar({ proveedorIa: p })} />
            <BotonIcono icono="lista" etiqueta="Historial y notas" onClick={() => setVerHistorial((v) => !v)} activo={verHistorial} className="lg:hidden" />
            {!ES_VISTA_PREVIA && <BotonIcono icono="ajustes" etiqueta="Ajustes de Blanquita" onClick={() => setVerAjustes((v) => !v)} activo={verAjustes} />}
          </div>
        </header>
        {ES_VISTA_PREVIA && proveedor === "gemini" && (
          <p className="border-b border-noche-600 bg-cian/5 px-4 py-2 text-[11px] text-cian-suave/80">
            En esta vista previa responde Claude con tu cuenta. Gemini se activa cuando despliegues la app en Vercel con tu GEMINI_API_KEY.
          </p>
        )}
        <AnimatePresence initial={false}>
          {verAjustes && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-noche-600">
              <AjustesBlanquita />
            </motion.div>
          )}
        </AnimatePresence>

        {/* modos */}
        <div className="flex gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
          {MODOS.map((m) => (
            <button key={m.clave} type="button" onClick={() => (activa && activa.mensajes.length ? nueva(m.clave) : setModo(m.clave))}
              className={`group flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${modo === m.clave ? "border-transparent bg-cian text-noche" : "border-noche-600 bg-noche-700 text-white/65 hover:text-white"}`}>
              <IconoNeko nombre={m.icono} tamano={14} className="group-hover:animate-meneo" /> {m.nombre}
            </button>
          ))}
        </div>

        {/* mensajes */}
        <div ref={lista} className="min-h-[300px] flex-1 space-y-4 overflow-y-auto px-4 pb-4 lg:max-h-[calc(100vh-360px)] max-h-[58vh]">
          {!activa || activa.mensajes.length === 0 ? (
            <Bienvenida modo={modo} alElegir={(s) => void enviar(s)} />
          ) : (
            activa.mensajes.map((m) => <Burbuja key={m.id} mensaje={m} cargando={ocupada && m === activa.mensajes.at(-1) && !m.texto} />)
          )}
        </div>

        {/* redactar */}
        <form
          className="border-t border-noche-600 p-3"
          onSubmit={(e) => { e.preventDefault(); void enviar(); }}
        >
          {info.usaContexto && (
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-cian-suave/80">
              <IconoNeko nombre="chispa" tamano={13} /> Blanquita verá tus tareas, tu calendario de hoy, hábitos y tu resumen de dinero.
            </p>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-noche-600 bg-noche-900 p-1.5 focus-within:border-cian/50">
            <textarea
              id="asistente-texto"
              ref={caja}
              rows={1}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void enviar(); } }}
              placeholder={info.ayuda}
              aria-label="Mensaje para Blanquita"
              className="max-h-[220px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-white outline-none placeholder:text-white/30"
            />
            {ocupada ? (
              <button type="button" onClick={() => control.current?.abort()} aria-label="Detener"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rosa/20 text-rosa"><IconoNeko nombre="detener" tamano={18} /></button>
            ) : (
              <button type="submit" disabled={!texto.trim()} aria-label="Enviar"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cian text-noche transition disabled:opacity-30"><IconoNeko nombre="enviar" tamano={18} grosor={2.2} /></button>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-white/30">Enter para enviar · Shift + Enter para salto de línea. Revisa lo importante: Blanquita puede equivocarse.</p>
        </form>
      </section>
    </div>
  );
}

function SelectorProveedor({ valor, alCambiar }: { valor: ProveedorIA; alCambiar: (p: ProveedorIA) => void }) {
  return (
    <div className="flex rounded-xl border border-noche-600 bg-noche-900/70 p-1 text-xs font-semibold" role="group" aria-label="Modelo de IA">
      {(["claude", "gemini"] as const).map((p) => (
        <button key={p} type="button" onClick={() => alCambiar(p)} aria-pressed={valor === p}
          className={`rounded-lg px-2.5 py-1.5 capitalize ${valor === p ? "bg-violeta/25 text-white" : "text-white/45"}`}>{p}</button>
      ))}
    </div>
  );
}

function Bienvenida({ modo, alElegir }: { modo: ModoIA; alElegir: (s: string) => void }) {
  const info = modoInfo(modo);
  const nombre = useNekoStore((s) => s.ajustes.nombre);
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div>
        <p className="font-titulo text-2xl font-semibold text-white">Hola, {nombre}. ¿En qué te ayudo?</p>
        <p className="mt-1 text-sm text-white/50">Modo <span className="text-cian">{info.nombre}</span>. Elige otro arriba o escribe directo.</p>
      </div>
      <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {info.sugerencias.map((s) => (
          <button key={s} type="button" onClick={() => alElegir(s)}
            className="group flex items-start gap-2 rounded-2xl border border-noche-600 bg-noche-700/60 p-3 text-left text-sm text-white/80 transition hover:border-cian/50 hover:text-white">
            <span className="mt-0.5 text-cian"><IconoNeko nombre={info.icono} tamano={16} className="group-hover:animate-meneo" /></span>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Burbuja({ mensaje, cargando }: { mensaje: MensajeIA; cargando: boolean }) {
  if (mensaje.rol === "usuaria") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-violeta/25 px-3.5 py-2.5 text-[14.5px] leading-relaxed text-white [overflow-wrap:anywhere]">
          {mensaje.texto}
        </div>
      </div>
    );
  }
  const desglose = mensaje.modo === "desglosar" && !cargando ? extraerDesglose(mensaje.texto) : null;
  const visible = mensaje.modo === "desglosar" ? sinBloqueJson(mensaje.texto) : mensaje.texto;
  return (
    <div className="flex gap-2.5">
      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-noche-500 bg-noche-700">
        <CaritaBlanquita />
      </span>
      <div className="min-w-0 max-w-[92%] flex-1">
        <div className={`rounded-2xl rounded-tl-md border px-3.5 py-3 ${mensaje.error ? "border-rosa/40 bg-rosa/10" : "border-noche-600 bg-noche-700/60"}`}>
          {cargando ? <Puntitos /> : <Markdown texto={visible || (desglose ? "Listo, aquí están los pasos:" : "")} />}
          {desglose && <TarjetaDesglose titulo={desglose.titulo} pasos={desglose.pasos} />}
        </div>
        {!cargando && !mensaje.error && mensaje.texto && <Acciones mensaje={mensaje} />}
      </div>
    </div>
  );
}

function Puntitos() {
  return (
    <div className="flex items-center gap-1 py-1.5" aria-label="Blanquita está pensando">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-2 w-2 rounded-full bg-cian" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  );
}

function CaritaBlanquita() {
  return (
    <svg viewBox="-30 -36 60 60" width="30" height="30" aria-hidden>
      <path d="M-25,-7 L-21,-34 L-5,-20 Z M25,-7 L21,-34 L5,-20 Z" fill="#f7f3ef" stroke="#2b2233" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-28,4 C-29,-14 -17,-22 0,-22 C17,-22 29,-14 28,4 C27,18 14,24 0,24 C-14,24 -27,18 -28,4 Z" fill="#f7f3ef" stroke="#2b2233" strokeWidth="2.6" />
      <ellipse cx="-11" cy="1" rx="5" ry="6" fill="#7fb8e6" stroke="#2b2233" strokeWidth="1.6" />
      <ellipse cx="11" cy="1" rx="5" ry="6" fill="#7fb8e6" stroke="#2b2233" strokeWidth="1.6" />
      <ellipse cx="-11" cy="1.5" rx="3.2" ry="4.4" fill="#2b2233" /><ellipse cx="11" cy="1.5" rx="3.2" ry="4.4" fill="#2b2233" />
      <path d="M-2.8,7 L2.8,7 L0,10 Z" fill="#f29bb0" />
      <ellipse cx="14" cy="12" rx="7" ry="4.5" fill="#bdb6c2" opacity=".7" />
    </svg>
  );
}

function TarjetaDesglose({ titulo, pasos }: { titulo?: string; pasos: { texto: string; minutos?: number }[] }) {
  const agregarTarea = useNekoStore((s) => s.agregarTarea);
  const [hecha, setHecha] = useState(false);
  const total = pasos.reduce((s, p) => s + (p.minutos ?? 0), 0);
  return (
    <div className="mt-3 rounded-xl border border-violeta/30 bg-noche-900/70 p-3">
      <ol className="space-y-1.5">
        {pasos.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm text-white/85">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violeta/20 text-[11px] font-bold text-violeta">{i + 1}</span>
            <span className="min-w-0 flex-1">{p.texto}</span>
            {p.minutos && <span className="shrink-0 text-[11px] text-white/40">{p.minutos} min</span>}
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={hecha}
        onClick={(e) => {
          agregarTarea({ titulo: titulo ?? pasos[0].texto, prioridad: "media", etiquetas: ["blanquita"], estimadoMin: total || undefined, checklist: pasos.map((p) => p.texto) });
          confetiDesde(e.currentTarget);
          setHecha(true);
        }}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-violeta py-2 text-sm font-bold text-noche disabled:bg-noche-600 disabled:text-white/60"
      >
        <IconoNeko nombre={hecha ? "check" : "tarea"} tamano={16} />
        {hecha ? "Tarea creada en tu lista" : `Crear tarea con ${pasos.length} pasos${total ? ` (${total} min)` : ""}`}
      </button>
    </div>
  );
}

function Acciones({ mensaje }: { mensaje: MensajeIA }) {
  const agregarNota = useNekoStore((s) => s.agregarNota);
  const agregarTarea = useNekoStore((s) => s.agregarTarea);
  const [hecho, setHecho] = useState<string | null>(null);
  const marcar = (que: string) => { setHecho(que); window.setTimeout(() => setHecho(null), 1800); };
  const limpio = sinBloqueJson(mensaje.texto);
  const primeraLinea = limpio.split("\n").find((l) => l.trim())?.replace(/^[#>*\-\s]+|\*\*/g, "").replace(/^Asunto:\s*/i, "").trim().slice(0, 80) ?? "Nota de Blanquita";

  const copiar = async () => {
    try { await navigator.clipboard.writeText(limpio); marcar("copiado"); } catch { marcar("no se pudo copiar"); }
  };
  const comoNota = () => { agregarNota({ titulo: primeraLinea, contenido: limpio, etiquetas: [modoInfo(mensaje.modo ?? "libre").nombre.toLowerCase()], origen: "ia" }); marcar("nota guardada"); };
  const comoTarea = (e: React.MouseEvent<HTMLButtonElement>) => {
    const pasos = limpio.split("\n").filter((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l)).map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim()).slice(0, 12);
    agregarTarea({ titulo: primeraLinea, prioridad: "media", etiquetas: ["blanquita"], checklist: pasos });
    confetiDesde(e.currentTarget);
    marcar("tarea creada");
  };
  const boton = "group flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-white/45 transition hover:bg-noche-700 hover:text-white";
  return (
    <div className="mt-1 flex flex-wrap items-center gap-0.5">
      <button type="button" onClick={copiar} className={boton}><IconoNeko nombre="copiar" tamano={13} /> Copiar</button>
      <button type="button" onClick={comoNota} className={boton}><IconoNeko nombre="nota" tamano={13} /> Guardar como nota</button>
      {mensaje.modo !== "desglosar" && <button type="button" onClick={comoTarea} className={boton}><IconoNeko nombre="tarea" tamano={13} /> Guardar como tarea</button>}
      <span className="ml-1 text-[10px] text-white/30">{mensaje.proveedor ? `${mensaje.proveedor} · ` : ""}{formatoHora(mensaje.en)}</span>
      <AnimatePresence>
        {hecho && <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="ml-1 text-[11px] font-bold text-cian">{hecho}</motion.span>}
      </AnimatePresence>
    </div>
  );
}

function Historial({ conversaciones, activaId, alElegir }: { conversaciones: Conversacion[]; activaId: string | null; alElegir: (c: Conversacion) => void }) {
  const eliminar = useNekoStore((s) => s.eliminarConversacion);
  const ordenadas = useMemo(() => [...conversaciones].sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn)), [conversaciones]);
  return (
    <div className="rounded-[22px] border border-noche-600 bg-noche-800/90 p-3">
      <p className="mb-2 px-1 font-titulo text-sm font-semibold text-white">Conversaciones</p>
      {ordenadas.length === 0 && <p className="px-1 text-xs text-white/45">Aquí aparecerán tus pláticas con Blanquita.</p>}
      <ul className="max-h-[300px] space-y-1 overflow-y-auto">
        {ordenadas.map((c) => (
          <li key={c.id} className={`group flex items-center gap-1 rounded-xl ${c.id === activaId ? "bg-violeta/20" : "hover:bg-noche-700"}`}>
            <button type="button" onClick={() => alElegir(c)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left">
              <span className="text-violeta"><IconoNeko nombre={modoInfo(c.modo).icono} tamano={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white/85">{c.titulo}</span>
                <span className="block text-[10px] text-white/40">{formatoFechaCorta(c.actualizadaEn)} · {c.mensajes.length} mensajes</span>
              </span>
            </button>
            <button type="button" onClick={() => eliminar(c.id)} aria-label={`Borrar ${c.titulo}`} className="p-1.5 text-white/0 transition group-hover:text-white/40 hover:!text-rosa focus:text-white/40">
              <IconoNeko nombre="basura" tamano={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotasGuardadas() {
  const notas = useNekoStore((s) => s.notas);
  const eliminar = useNekoStore((s) => s.eliminarNota);
  const fijar = useNekoStore((s) => s.alternarFijada);
  const [abierta, setAbierta] = useState<string | null>(null);
  const ordenadas = [...notas].sort((a, b) => Number(b.fijada) - Number(a.fijada) || b.creadoEn.localeCompare(a.creadoEn)).slice(0, 6);
  return (
    <div className="rounded-[22px] border border-noche-600 bg-noche-800/90 p-3">
      <p className="mb-2 flex items-center gap-1.5 px-1 font-titulo text-sm font-semibold text-white"><IconoNeko nombre="nota" tamano={15} className="text-croqueta" /> Notas recientes</p>
      {ordenadas.length === 0 && <p className="px-1 text-xs text-white/45">Toca "Guardar como nota" en una respuesta para tenerla aquí.</p>}
      {ordenadas.length > 0 && <p className="mb-1.5 px-1 text-[11px] text-white/40">Todas están en Organizar → Notas.</p>}
      <ul className="max-h-[320px] space-y-1.5 overflow-y-auto">
        {ordenadas.map((n) => (
          <li key={n.id} className="rounded-xl border border-noche-600 bg-noche-700/50">
            <button type="button" onClick={() => setAbierta(abierta === n.id ? null : n.id)} className="w-full px-2.5 py-2 text-left">
              <span className="flex items-center gap-1.5">
                {n.fijada && <IconoNeko nombre="estrella" tamano={12} className="shrink-0 text-croqueta" />}
                <span className="truncate text-xs font-semibold text-white/85">{n.titulo}</span>
              </span>
              {abierta !== n.id && <span className="mt-0.5 line-clamp-2 block text-[11px] text-white/45">{n.contenido.replace(/[#*`]/g, "").slice(0, 140)}</span>}
            </button>
            {abierta === n.id && (
              <div className="border-t border-noche-600 px-2.5 py-2">
                <div className="max-h-[260px] overflow-y-auto"><Markdown texto={n.contenido} /></div>
                <div className="mt-2 flex gap-3 text-[11px] font-semibold">
                  <button type="button" onClick={() => fijar(n.id)} className="text-white/55 hover:text-croqueta">{n.fijada ? "Desfijar" : "Fijar"}</button>
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(n.contenido); } catch { /* sin permiso */ } }} className="text-white/55 hover:text-white">Copiar</button>
                  <button type="button" onClick={() => eliminar(n.id)} className="ml-auto text-white/55 hover:text-rosa">Eliminar</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AjustesBlanquita() {
  const clave = useNekoStore((s) => s.ajustes.claveIa ?? "");
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  return (
    <div className="space-y-2 px-4 py-3">
      <label htmlFor="clave-ia" className="block text-xs font-semibold text-white/75">Clave de acceso de la app</label>
      <input id="clave-ia" type="password" value={clave} onChange={(e) => ajustar({ claveIa: e.target.value })} placeholder="La misma que NEKO_CLAVE_ACCESO en Vercel"
        className="w-full rounded-xl border border-noche-600 bg-noche-900 px-3 py-2 text-sm text-white outline-none focus:border-cian/50" autoComplete="off" />
      <p className="text-[11px] leading-relaxed text-white/45">
        Evita que alguien que encuentre tu URL use tus llaves de Claude o Gemini. Se guarda solo en este dispositivo.
      </p>
    </div>
  );
}
