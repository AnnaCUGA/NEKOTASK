"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { Hoja, campo } from "@/components/ui/Hoja";
import {
  ETIQUETA_FRECUENCIA, diasEntre, estadoPresupuesto, gastadoEnCategoria, leerMonto, mesDe, montoMensual, nombreMes, pesos,
} from "@/lib/dinero";
import { hoyISO } from "@/lib/fechas";
import type { CategoriaDinero, Frecuencia, NombreIcono, Suscripcion, TipoTransaccion } from "@/lib/tipos";
import { COLORES_DINERO } from "@/store/datosIniciales";
import { useNekoStore } from "@/store/useNekoStore";
import { useUIDinero } from "./HojaMovimiento";
import { CobrosPorConfirmar, ESTADO, Inicial, SelectorMes } from "./ResumenDinero";

const diaLargo = (iso: string) => {
  const t = new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

// ─── Movimientos ────────────────────────────────────────────────────────
export function Movimientos() {
  const transacciones = useNekoStore((s) => s.transacciones);
  const categorias = useNekoStore((s) => s.categoriasDinero);
  const abrir = useUIDinero((s) => s.abrir);
  const filtroCat = useUIDinero((s) => s.filtroCategoria);
  const setFiltroCat = useUIDinero((s) => s.setFiltroCategoria);
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [tipo, setTipo] = useState<TipoTransaccion | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const porId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return transacciones
      .filter((t) => mesDe(t.fecha) === mes)
      .filter((t) => !tipo || t.tipo === tipo)
      .filter((t) => !filtroCat || t.categoriaId === filtroCat)
      .filter((t) => !q || `${t.nota ?? ""} ${porId.get(t.categoriaId)?.nombre ?? ""} ${t.monto}`.toLowerCase().includes(q))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
  }, [transacciones, mes, tipo, filtroCat, busqueda, porId]);

  const dias = useMemo(() => {
    const g = new Map<string, typeof visibles>();
    visibles.forEach((t) => g.set(t.fecha, [...(g.get(t.fecha) ?? []), t]));
    return [...g];
  }, [visibles]);
  const totalGastos = visibles.filter((t) => t.tipo === "gasto").reduce((s, t) => s + t.monto, 0);
  const catFiltro = filtroCat ? porId.get(filtroCat) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SelectorMes mes={mes} alCambiar={setMes} />
        <button type="button" onClick={() => abrir("gasto")} className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violeta to-rosa px-4 py-2 font-titulo text-sm font-semibold text-noche">
          <IconoNeko nombre="mas" tamano={16} grosor={2.6} /> Anotar
        </button>
      </div>
      <div className="relative">
        <IconoNeko nombre="buscar" tamano={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar: uber, tacos, 250…" aria-label="Buscar movimientos" className={`${campo} rounded-2xl bg-noche-800/90 py-2.5 pl-10`} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {([null, "gasto", "ingreso"] as const).map((t) => (
          <button key={t ?? "todos"} type="button" onClick={() => setTipo(t)} aria-pressed={tipo === t}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${tipo === t ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 bg-noche-800/80 text-white/55"}`}>
            {t === null ? "Todo" : t === "gasto" ? "Gastos" : "Ingresos"}
          </button>
        ))}
        {catFiltro && (
          <button type="button" onClick={() => setFiltroCat(null)} className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-white" style={{ borderColor: catFiltro.color }}>
            <span style={{ color: catFiltro.color }}><IconoNeko nombre={catFiltro.icono} tamano={13} /></span> {catFiltro.nombre} <IconoNeko nombre="cerrar" tamano={12} />
          </button>
        )}
        {totalGastos > 0 && <span className="ml-auto text-xs text-white/50">Gastos: <strong className="text-white/85">{pesos(totalGastos)}</strong></span>}
      </div>

      {dias.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-noche-600 bg-noche-800/60 p-6 text-center">
          <div className="flex justify-center"><Gatita clave="mango" pose="echada" ancho={110} /></div>
          <p className="mt-2 font-titulo font-semibold">Nada por aquí</p>
          <p className="mt-1 text-sm text-white/55">No hay movimientos en {nombreMes(mes).toLowerCase()}{tipo || catFiltro || busqueda ? " con ese filtro" : ""}.</p>
        </div>
      ) : (
        dias.map(([dia, lista]) => {
          const totalDia = lista.reduce((s, t) => s + (t.tipo === "gasto" ? -t.monto : t.monto), 0);
          return (
            <section key={dia} className="panel-neko rounded-[20px] border border-noche-600 bg-noche-800/90 p-2">
              <header className="flex items-center px-2 pb-1 pt-1">
                <p className="flex-1 text-xs font-bold text-white/55">{diaLargo(dia)}</p>
                <p className="text-xs font-semibold tabular-nums text-white/50">{totalDia < 0 ? "−" : "+"}{pesos(Math.abs(totalDia))}</p>
              </header>
              <ul>
                {lista.map((t) => {
                  const c = porId.get(t.categoriaId);
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => abrir(t.tipo, t)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-noche-700/50">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${c?.color ?? "#8b86a3"}26`, color: c?.color ?? "#8b86a3" }}>
                          <IconoNeko nombre={c?.icono ?? "etiqueta"} tamano={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white/90">{t.nota || c?.nombre || "Sin categoría"}</span>
                          <span className="flex items-center gap-1 truncate text-[11px] text-white/45">
                            {t.nota ? c?.nombre : t.tipo === "gasto" ? "Gasto" : "Ingreso"}
                            {t.suscripcionId && <> · <IconoNeko nombre="sincronizar" tamano={11} /> suscripción</>}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-white/90">
                          {t.tipo === "ingreso" && <span className="text-cian"><IconoNeko nombre="ingreso" tamano={14} /></span>}
                          {t.tipo === "gasto" ? "−" : "+"}{pesos(t.monto)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

// ─── Presupuesto ────────────────────────────────────────────────────────
export function Presupuesto() {
  const transacciones = useNekoStore((s) => s.transacciones);
  const categorias = useNekoStore((s) => s.categoriasDinero);
  const [editar, setEditar] = useState<CategoriaDinero | TipoTransaccion | null>(null);
  const mes = hoyISO().slice(0, 7);
  const gastos = categorias.filter((c) => c.tipo === "gasto").sort((a, b) => a.orden - b.orden);
  const ingresos = categorias.filter((c) => c.tipo === "ingreso").sort((a, b) => a.orden - b.orden);
  const conLimite = gastos.filter((c) => c.presupuesto);
  const totalLimite = conLimite.reduce((s, c) => s + (c.presupuesto ?? 0), 0);
  const totalGastado = conLimite.reduce((s, c) => s + gastadoEnCategoria(transacciones, c.id, mes), 0);
  const diasMes = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();
  const avanceMes = Number(hoyISO().slice(8, 10)) / diasMes;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="panel-neko flex items-end gap-3 rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/55">Presupuesto de {nombreMes(mes).split(" ")[0].toLowerCase()}</p>
          {totalLimite ? (
            <>
              <p className="mt-0.5 font-titulo text-3xl font-semibold">{pesos(totalGastado, true)} <span className="text-lg text-white/40">de {pesos(totalLimite, true)}</span></p>
              <Barra valor={totalGastado} limite={totalLimite} marcaMes={avanceMes} />
              <p className="mt-1.5 text-xs text-white/50">La rayita marca qué tanto del mes ya pasó ({Math.round(avanceMes * 100)}%).</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-white/65">Ponle un límite mensual a las categorías que quieras cuidar y Mango te avisa cuando te acerques.</p>
          )}
        </div>
        <div className="-mb-5 shrink-0"><Gatita clave="mango" pose="sentada" expresion="concentrada" ancho={84} /></div>
      </section>

      <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-2 sm:p-3">
        <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Gastos · toca para poner límite</p>
        <ul>
          {gastos.map((c) => {
            const gastado = gastadoEnCategoria(transacciones, c.id, mes);
            const estado = c.presupuesto ? estadoPresupuesto(gastado, c.presupuesto) : null;
            return (
              <li key={c.id}>
                <button type="button" onClick={() => setEditar(c)} className="w-full rounded-xl px-2 py-2.5 text-left hover:bg-noche-700/50">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${c.color}26`, color: c.color }}><IconoNeko nombre={c.icono} tamano={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white/90">{c.nombre}</span>
                      <span className="block text-[11px] text-white/45">
                        {c.presupuesto ? `${pesos(gastado, true)} de ${pesos(c.presupuesto, true)}` : gastado ? `${pesos(gastado, true)} este mes · sin límite` : "Sin límite"}
                      </span>
                    </span>
                    {estado && (
                      <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: ESTADO[estado].color }}>
                        <IconoNeko nombre={estado === "bien" ? "check" : estado === "cerca" ? "reloj" : "chispa"} tamano={13} grosor={2.4} />
                        {estado === "pasado" ? `+${pesos(gastado - c.presupuesto!, true)}` : ESTADO[estado].texto}
                      </span>
                    )}
                  </span>
                  {c.presupuesto ? <span className="ml-[46px] block"><Barra valor={gastado} limite={c.presupuesto} /></span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => setEditar("gasto")} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-noche-600 py-2 text-sm font-semibold text-white/55 hover:text-white">
          <IconoNeko nombre="mas" tamano={16} /> Nueva categoría de gasto
        </button>
      </section>

      <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-2 sm:p-3">
        <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Ingresos</p>
        <div className="flex flex-wrap gap-1.5 p-1">
          {ingresos.map((c) => (
            <button key={c.id} type="button" onClick={() => setEditar(c)} className="flex items-center gap-1.5 rounded-xl border border-noche-600 px-2.5 py-1.5 text-sm font-semibold text-white/75 hover:text-white">
              <span style={{ color: c.color }}><IconoNeko nombre={c.icono} tamano={16} /></span> {c.nombre}
            </button>
          ))}
          <button type="button" onClick={() => setEditar("ingreso")} className="flex items-center gap-1 rounded-xl border border-dashed border-noche-600 px-2.5 py-1.5 text-sm font-semibold text-white/50 hover:text-white">
            <IconoNeko nombre="mas" tamano={15} /> Nueva
          </button>
        </div>
      </section>

      <AnimatePresence>
        {editar && <EditorCategoria categoria={typeof editar === "string" ? null : editar} tipo={typeof editar === "string" ? editar : editar.tipo} alCerrar={() => setEditar(null)} />}
      </AnimatePresence>
    </div>
  );
}

/** Barra de avance con color de estado (siempre acompañado de texto en la fila) */
function Barra({ valor, limite, marcaMes }: { valor: number; limite: number; marcaMes?: number }) {
  const estado = estadoPresupuesto(valor, limite);
  return (
    <span className="relative mt-1.5 block h-2 rounded-full bg-noche-700">
      <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ background: ESTADO[estado].color }}
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, (valor / limite) * 100)}%` }} transition={{ duration: 0.5 }} />
      {marcaMes !== undefined && <span className="absolute -top-1 h-4 w-0.5 rounded bg-white/70" style={{ left: `${Math.min(100, marcaMes * 100)}%` }} />}
    </span>
  );
}

const ICONOS_CATEGORIA: NombreIcono[] = ["plato", "carrito", "auto", "casa", "huella", "pastilla", "cafe", "sincronizar", "tienda", "pelicula", "libro", "regalo", "pesa", "corazon", "dinero", "chispa", "etiqueta", "estrella"];

function EditorCategoria({ categoria, tipo, alCerrar }: { categoria: CategoriaDinero | null; tipo: TipoTransaccion; alCerrar: () => void }) {
  const agregar = useNekoStore((s) => s.agregarCategoria);
  const actualizar = useNekoStore((s) => s.actualizarCategoria);
  const eliminar = useNekoStore((s) => s.eliminarCategoria);
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [icono, setIcono] = useState<NombreIcono>(categoria?.icono ?? "etiqueta");
  const [color, setColor] = useState(categoria?.color ?? COLORES_DINERO[0]);
  const [limite, setLimite] = useState(categoria?.presupuesto ? String(categoria.presupuesto) : "");
  const [confirmar, setConfirmar] = useState(false);
  const fija = categoria?.id === "cat-otros" || categoria?.id === "cat-otros-ingreso";

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const datos = { nombre: nombre.trim(), icono, color, tipo, presupuesto: tipo === "gasto" && leerMonto(limite) ? leerMonto(limite) : undefined };
    if (categoria) actualizar(categoria.id, datos);
    else agregar(datos);
    alCerrar();
  };

  return (
    <Hoja alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}26`, color }}><IconoNeko nombre={icono} tamano={22} /></span>
          <p className="flex-1 font-titulo text-lg font-semibold">{categoria ? categoria.nombre : `Nueva categoría de ${tipo}`}</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={alCerrar} />
        </div>
        {tipo === "gasto" && (
          <label className="block rounded-2xl border border-noche-600 bg-noche-900/70 px-4 py-2.5 focus-within:border-violeta/60">
            <span className="text-xs font-semibold text-white/50">Límite al mes (déjalo vacío si no quieres límite)</span>
            <span className="flex items-baseline gap-1">
              <span className="font-titulo text-2xl text-white/40">$</span>
              <input value={limite} onChange={(e) => setLimite(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="Sin límite" aria-label="Límite mensual"
                className="w-full bg-transparent font-titulo text-2xl font-semibold text-white outline-none placeholder:text-white/25" autoFocus={!!categoria} />
            </span>
          </label>
        )}
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre: ropa, gym, regalos…" className={campo} disabled={fija} />
        {!fija && (
          <>
            <div className="grid grid-cols-6 gap-1.5">
              {ICONOS_CATEGORIA.map((i) => (
                <button key={i} type="button" onClick={() => setIcono(i)} aria-label={i} aria-pressed={icono === i}
                  className={`grid h-10 place-items-center rounded-xl border ${icono === i ? "bg-noche-700" : "border-noche-600 text-white/55"}`} style={icono === i ? { borderColor: color, color } : undefined}>
                  <IconoNeko nombre={i} tamano={18} />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {COLORES_DINERO.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
                  className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-noche-800" : ""}`} style={{ background: c }} />
              ))}
            </div>
          </>
        )}
        <div className="flex gap-2 pt-1">
          {categoria && !fija && (
            <button type="button" onClick={() => { if (!confirmar) return setConfirmar(true); eliminar(categoria.id); alCerrar(); }}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
              {confirmar ? "Sí (pasa a Otros)" : "Borrar"}
            </button>
          )}
          <button type="submit" disabled={!nombre.trim()} className="flex-1 rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche disabled:opacity-40">Guardar</button>
        </div>
      </form>
    </Hoja>
  );
}

// ─── Suscripciones ──────────────────────────────────────────────────────
export function Suscripciones() {
  const suscripciones = useNekoStore((s) => s.suscripciones);
  const actualizar = useNekoStore((s) => s.actualizarSuscripcion);
  const [editar, setEditar] = useState<Suscripcion | "nueva" | null>(null);
  const hoy = hoyISO();
  const activas = suscripciones.filter((x) => x.activa);
  const alMes = activas.reduce((s, x) => s + montoMensual(x), 0);
  const ordenadas = [...suscripciones].sort((a, b) => Number(b.activa) - Number(a.activa) || a.proximoCobro.localeCompare(b.proximoCobro));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="panel-neko flex items-end gap-3 rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/55">Tus suscripciones te cuestan</p>
          <p className="mt-0.5 font-titulo text-3xl font-semibold">{pesos(alMes)} <span className="text-base text-white/45">al mes</span></p>
          <p className="text-sm text-white/55">{pesos(alMes * 12, true)} al año · {activas.length} activa{activas.length === 1 ? "" : "s"}</p>
        </div>
        <div className="-mb-5 shrink-0"><Gatita clave="mango" pose="echada" ancho={100} /></div>
      </section>

      <CobrosPorConfirmar />

      <button type="button" onClick={() => setEditar("nueva")} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violeta to-rosa py-2.5 font-titulo font-semibold text-noche">
        <IconoNeko nombre="mas" tamano={17} grosor={2.6} /> Agregar suscripción
      </button>

      {ordenadas.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-noche-600 p-6 text-center text-sm text-white/55">Agrega Netflix, Spotify, el gym… y te aviso antes de cada cobro.</p>
      ) : (
        <ul className="space-y-2">
          {ordenadas.map((x) => {
            const faltan = diasEntre(hoy, x.proximoCobro);
            return (
              <li key={x.id} className={`panel-neko flex items-center gap-3 rounded-[20px] border border-noche-600 bg-noche-800/90 p-3 ${x.activa ? "" : "opacity-55"}`}>
                <button type="button" onClick={() => setEditar(x)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Inicial nombre={x.nombre} color={x.color} tamano={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white/90">{x.nombre}</span>
                    <span className="block truncate text-xs text-white/50">
                      {pesos(x.monto)} {ETIQUETA_FRECUENCIA[x.frecuencia]}
                      {x.activa && ` · ${faltan <= 0 ? "toca confirmar" : faltan === 1 ? "se cobra mañana" : `se cobra en ${faltan} días`}`}
                    </span>
                  </span>
                </button>
                <button type="button" role="switch" aria-checked={x.activa} aria-label={x.activa ? `Pausar ${x.nombre}` : `Reactivar ${x.nombre}`}
                  onClick={() => actualizar(x.id, { activa: !x.activa })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${x.activa ? "bg-violeta" : "bg-noche-600"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${x.activa ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-center text-[11px] text-white/40">Cuando llega la fecha te pregunto si ya se cobró: al confirmar se anota sola como gasto.</p>

      <AnimatePresence>
        {editar && <EditorSuscripcion sub={editar === "nueva" ? null : editar} alCerrar={() => setEditar(null)} />}
      </AnimatePresence>
    </div>
  );
}

const SUGERENCIAS = ["Netflix", "Spotify", "Disney+", "Max", "Prime Video", "YouTube Premium", "iCloud", "Google One", "Claude", "Gym", "Internet", "Celular"];
const FRECUENCIAS: { id: Frecuencia; nombre: string }[] = [{ id: "mensual", nombre: "Mensual" }, { id: "anual", nombre: "Anual" }, { id: "semanal", nombre: "Semanal" }];

function EditorSuscripcion({ sub, alCerrar }: { sub: Suscripcion | null; alCerrar: () => void }) {
  const categorias = useNekoStore((s) => s.categoriasDinero);
  const nSubs = useNekoStore((s) => s.suscripciones.length);
  const agregar = useNekoStore((s) => s.agregarSuscripcion);
  const actualizar = useNekoStore((s) => s.actualizarSuscripcion);
  const eliminar = useNekoStore((s) => s.eliminarSuscripcion);
  const [nombre, setNombre] = useState(sub?.nombre ?? "");
  const [monto, setMonto] = useState(sub ? String(sub.monto) : "");
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(sub?.frecuencia ?? "mensual");
  const [cobro, setCobro] = useState(sub?.proximoCobro ?? hoyISO());
  const [categoriaId, setCategoriaId] = useState(sub?.categoriaId ?? "cat-suscripciones");
  const [avisar, setAvisar] = useState(sub?.avisarDiasAntes ?? 1);
  const [confirmar, setConfirmar] = useState(false);
  const valor = leerMonto(monto);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !valor || !cobro) return;
    const datos = { nombre: nombre.trim(), monto: valor, frecuencia, proximoCobro: cobro, categoriaId, avisarDiasAntes: avisar };
    if (sub) actualizar(sub.id, datos);
    else agregar({ ...datos, activa: true, color: COLORES_DINERO[nSubs % COLORES_DINERO.length] });
    alCerrar();
  };

  return (
    <Hoja alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="flex items-center gap-2">
          <Inicial nombre={nombre || "?"} color={sub?.color ?? COLORES_DINERO[nSubs % COLORES_DINERO.length]} tamano={40} />
          <p className="flex-1 font-titulo text-lg font-semibold">{sub ? "Editar suscripción" : "Nueva suscripción"}</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={alCerrar} />
        </div>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="¿Cuál?" className={campo} autoFocus={!sub} />
        {!sub && (
          <div className="flex flex-wrap gap-1.5">
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" onClick={() => setNombre(s)} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${nombre === s ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 text-white/55"}`}>{s}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block rounded-xl border border-noche-600 bg-noche-900 px-3 py-1.5 focus-within:border-violeta/60">
            <span className="text-[11px] font-semibold text-white/50">Monto (MXN)</span>
            <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="219" aria-label="Monto"
              className="w-full bg-transparent font-titulo text-xl font-semibold text-white outline-none placeholder:text-white/25" />
          </label>
          <label className="block rounded-xl border border-noche-600 bg-noche-900 px-3 py-1.5">
            <span className="text-[11px] font-semibold text-white/50">Próximo cobro</span>
            <input type="date" value={cobro} onChange={(e) => setCobro(e.target.value)} aria-label="Próximo cobro" className="w-full bg-transparent py-1 text-sm text-white outline-none [color-scheme:dark]" />
          </label>
        </div>
        <div className="flex rounded-xl bg-noche-900 p-1">
          {FRECUENCIAS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFrecuencia(f.id)} aria-pressed={frecuencia === f.id}
              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${frecuencia === f.id ? "bg-noche-700 text-white" : "text-white/50"}`}>{f.nombre}</button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-white/65">Categoría
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="rounded-lg border border-noche-600 bg-noche-800 px-2 py-1.5 text-white [color-scheme:dark]">
            {categorias.filter((c) => c.tipo === "gasto").map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/55">Avisarme antes del cobro</p>
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 3, 7].map((d) => (
              <button key={d} type="button" onClick={() => setAvisar(d)} aria-pressed={avisar === d}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${avisar === d ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 text-white/55"}`}>
                {d === 0 ? "Solo ese día" : d === 1 ? "1 día antes" : `${d} días antes`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          {sub && (
            <button type="button" onClick={() => { if (!confirmar) return setConfirmar(true); eliminar(sub.id); alCerrar(); }}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
              {confirmar ? "Sí, borrar" : "Borrar"}
            </button>
          )}
          <button type="submit" disabled={!nombre.trim() || !valor} className="flex-1 rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche disabled:opacity-40">
            {sub ? "Guardar" : "Agregar"}
          </button>
        </div>
      </form>
    </Hoja>
  );
}
