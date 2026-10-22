"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { Hoja, campo } from "@/components/ui/Hoja";
import { estadoPresupuesto, gastadoEnCategoria, leerMonto, mesDe, pesos } from "@/lib/dinero";
import { confetiDesde } from "@/lib/eventos";
import { hoyISO, sumarDias } from "@/lib/fechas";
import type { TipoTransaccion, Transaccion } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

// ─── Estado de la interfaz de Dinero (no se guarda) ──────────────────────
interface UIDinero {
  hoja: { tipo: TipoTransaccion; editar?: Transaccion } | null;
  aviso: { texto: string; tono: "bien" | "cerca" | "pasado" } | null;
  filtroCategoria: string | null;
  abrir: (tipo: TipoTransaccion, editar?: Transaccion) => void;
  cerrar: () => void;
  avisar: (texto: string, tono: "bien" | "cerca" | "pasado") => void;
  setFiltroCategoria: (id: string | null) => void;
}
export const useUIDinero = create<UIDinero>((set) => ({
  hoja: null,
  aviso: null,
  filtroCategoria: null,
  abrir: (tipo, editar) => set({ hoja: { tipo, editar } }),
  cerrar: () => set({ hoja: null }),
  avisar: (texto, tono) => set({ aviso: { texto, tono } }),
  setFiltroCategoria: (id) => set({ filtroCategoria: id }),
}));

/** Se monta una vez en el Dashboard: la hoja de anotar y el aviso de presupuesto */
export function AnfitrionDinero() {
  const hoja = useUIDinero((s) => s.hoja);
  const aviso = useUIDinero((s) => s.aviso);
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => useUIDinero.setState({ aviso: null }), 4200);
    return () => clearTimeout(t);
  }, [aviso]);
  return (
    <>
      <AnimatePresence>{hoja && <HojaMovimiento key="hoja" tipoInicial={hoja.tipo} editar={hoja.editar} />}</AnimatePresence>
      <AnimatePresence>
        {aviso && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-3 bottom-[152px] z-50 mx-auto flex max-w-sm items-center gap-2 rounded-2xl border border-noche-600 bg-noche-800/95 p-2 pr-3 shadow-neon backdrop-blur lg:bottom-8"
          >
            <Gatita clave="mango" pose="sentada" expresion={aviso.tono === "bien" ? "feliz" : aviso.tono === "cerca" ? "concentrada" : "sorprendida"} ancho={52} />
            <p className="flex-1 text-sm text-white/85">{aviso.texto}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HojaMovimiento({ tipoInicial, editar }: { tipoInicial: TipoTransaccion; editar?: Transaccion }) {
  const cerrar = useUIDinero((s) => s.cerrar);
  const avisar = useUIDinero((s) => s.avisar);
  const categorias = useNekoStore((s) => s.categoriasDinero);
  const agregar = useNekoStore((s) => s.agregarTransaccion);
  const actualizar = useNekoStore((s) => s.actualizarTransaccion);
  const eliminar = useNekoStore((s) => s.eliminarTransaccion);
  const [tipo, setTipo] = useState<TipoTransaccion>(editar?.tipo ?? tipoInicial);
  const [monto, setMonto] = useState(editar ? String(editar.monto) : "");
  const [categoriaId, setCategoriaId] = useState(editar?.categoriaId ?? "");
  const [nota, setNota] = useState(editar?.nota ?? "");
  const [fecha, setFecha] = useState(editar?.fecha ?? hoyISO());
  const [confirmar, setConfirmar] = useState(false);
  const caja = useRef<HTMLInputElement>(null);

  const opciones = useMemo(() => categorias.filter((c) => c.tipo === tipo).sort((a, b) => a.orden - b.orden), [categorias, tipo]);
  const elegida = opciones.find((c) => c.id === categoriaId) ?? opciones[0];
  const valor = leerMonto(monto);
  const color = tipo === "gasto" ? "#f472b6" : "#67e8f9";

  useEffect(() => { const t = window.setTimeout(() => caja.current?.focus(), 250); return () => clearTimeout(t); }, []);

  const guardar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valor || !elegida) return;
    const datos = { tipo, monto: valor, categoriaId: elegida.id, nota: nota.trim() || undefined, fecha };
    if (editar) actualizar(editar.id, datos);
    else {
      agregar(datos);
      confetiDesde(e.currentTarget.querySelector("button[type=submit]"), color);
    }
    cerrar();
    // cómo va el presupuesto de esa categoría
    if (tipo === "gasto" && elegida.presupuesto) {
      const s = useNekoStore.getState();
      const gastado = gastadoEnCategoria(s.transacciones, elegida.id, mesDe(fecha));
      const estado = estadoPresupuesto(gastado, elegida.presupuesto);
      const pct = Math.round((gastado / elegida.presupuesto) * 100);
      if (estado === "pasado") avisar(`Te pasaste ${pesos(gastado - elegida.presupuesto, true)} en ${elegida.nombre} este mes.`, "pasado");
      else if (estado === "cerca") avisar(`Llevas ${pct}% de ${elegida.nombre}. Te quedan ${pesos(elegida.presupuesto - gastado, true)}.`, "cerca");
    } else if (!editar && tipo === "ingreso") {
      avisar(`¡${pesos(valor)} más! Mango ya lo anotó.`, "bien");
    }
  };

  return (
    <Hoja alCerrar={cerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-xl bg-noche-900 p-1" role="tablist" aria-label="Tipo de movimiento">
            {(["gasto", "ingreso"] as TipoTransaccion[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tipo === t} onClick={() => { setTipo(t); setCategoriaId(""); }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold transition ${tipo === t ? "bg-noche-700 text-white" : "text-white/50"}`}>
                <span style={{ color: tipo === t ? (t === "gasto" ? "#f472b6" : "#67e8f9") : undefined }}><IconoNeko nombre={t} tamano={16} /></span>
                {t === "gasto" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={cerrar} />
        </div>

        <label className="block rounded-2xl border border-noche-600 bg-noche-900/70 px-4 py-3 focus-within:border-violeta/60">
          <span className="text-xs font-semibold text-white/50">{tipo === "gasto" ? "¿Cuánto gastaste?" : "¿Cuánto te entró?"}</span>
          <span className="mt-0.5 flex items-baseline gap-1">
            <span className="font-titulo text-3xl font-semibold text-white/40">$</span>
            <input ref={caja} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="0"
              aria-label="Monto en pesos" className="w-full bg-transparent font-titulo text-4xl font-semibold text-white outline-none placeholder:text-white/20" />
            <span className="text-sm font-semibold text-white/40">MXN</span>
          </span>
        </label>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/55">Categoría</p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {opciones.map((c) => {
              const activa = c.id === elegida?.id;
              return (
                <button key={c.id} type="button" onClick={() => setCategoriaId(c.id)} aria-pressed={activa}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold leading-tight transition ${activa ? "bg-noche-700 text-white" : "border-noche-600 text-white/55"}`}
                  style={activa ? { borderColor: c.color } : undefined}>
                  <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${c.color}26`, color: c.color }}><IconoNeko nombre={c.icono} tamano={18} /></span>
                  <span className="line-clamp-2 text-center">{c.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder={tipo === "gasto" ? "Nota: tacos con Sofi, Uber al trabajo…" : "Nota: quincena, venta…"} className={campo} />

        <div className="flex flex-wrap items-center gap-1.5">
          {[{ d: hoyISO(), n: "Hoy" }, { d: sumarDias(hoyISO(), -1), n: "Ayer" }].map((x) => (
            <button key={x.n} type="button" onClick={() => setFecha(x.d)} aria-pressed={fecha === x.d}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${fecha === x.d ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 text-white/55"}`}>{x.n}</button>
          ))}
          <input type="date" value={fecha} max={hoyISO()} onChange={(e) => e.target.value && setFecha(e.target.value)} aria-label="Fecha"
            className="ml-auto rounded-lg border border-noche-600 bg-noche-900 px-2 py-1 text-xs text-white [color-scheme:dark]" />
        </div>

        <div className="flex gap-2 pt-1">
          {editar && (
            <button type="button" onClick={() => { if (!confirmar) return setConfirmar(true); eliminar(editar.id); cerrar(); }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
              <IconoNeko nombre="basura" tamano={16} /> {confirmar ? "Sí, borrar" : "Borrar"}
            </button>
          )}
          <button type="submit" disabled={!valor} className="flex-1 rounded-xl py-2.5 font-titulo font-semibold text-noche transition disabled:opacity-40" style={{ background: color }}>
            {editar ? "Guardar" : valor ? `Anotar ${pesos(valor)}` : "Anotar"}
          </button>
        </div>
      </form>
    </Hoja>
  );
}
