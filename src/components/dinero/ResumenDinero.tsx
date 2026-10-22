"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import {
  cobrosPendientes, diasEntre, estadoPresupuesto, nombreMes, pesos, resumenMes, sumarMeses, type ResumenMes,
} from "@/lib/dinero";
import { formatoFechaCorta, hoyISO } from "@/lib/fechas";
import { useNekoStore } from "@/store/useNekoStore";
import { useUIDinero } from "./HojaMovimiento";

export function SelectorMes({ mes, alCambiar }: { mes: string; alCambiar: (m: string) => void }) {
  const actual = hoyISO().slice(0, 7);
  return (
    <div className="flex items-center gap-1.5">
      <BotonIcono icono="izquierda" etiqueta="Mes anterior" onClick={() => alCambiar(sumarMeses(mes, -1))} />
      <p className="min-w-[150px] text-center font-titulo text-base font-semibold">{nombreMes(mes)}</p>
      <BotonIcono icono="derecha" etiqueta="Mes siguiente" onClick={() => mes < actual && alCambiar(sumarMeses(mes, 1))} className={mes >= actual ? "pointer-events-none opacity-30" : ""} />
      {mes !== actual && <button type="button" onClick={() => alCambiar(actual)} className="ml-1 text-xs font-semibold text-white/50 hover:text-white">Hoy</button>}
    </div>
  );
}

export function ResumenDinero({ alVer }: { alVer: (p: "movimientos" | "presupuesto" | "suscripciones") => void }) {
  const transacciones = useNekoStore((s) => s.transacciones);
  const categorias = useNekoStore((s) => s.categoriasDinero);
  const suscripciones = useNekoStore((s) => s.suscripciones);
  const abrir = useUIDinero((s) => s.abrir);
  const setFiltro = useUIDinero((s) => s.setFiltroCategoria);
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const hoy = hoyISO();
  const esMesActual = mes === hoy.slice(0, 7);

  const r = useMemo(() => resumenMes(transacciones, categorias, mes), [transacciones, categorias, mes]);
  const anterior = useMemo(() => resumenMes(transacciones, categorias, sumarMeses(mes, -1)), [transacciones, categorias, mes]);

  // comparación justa: lo gastado hasta el mismo día del mes pasado
  const diaCorte = esMesActual ? Number(hoy.slice(8, 10)) : r.porDia.length;
  const antesAlCorte = anterior.porDia.slice(0, diaCorte).reduce((a, b) => a + b, 0);
  const cambio = antesAlCorte > 0 ? (r.gastos - antesAlCorte) / antesAlCorte : null;

  const presupuestados = categorias.filter((c) => c.tipo === "gasto" && c.presupuesto);
  const pasadas = presupuestados.filter((c) => estadoPresupuesto(r.porCategoria.find((x) => x.categoria.id === c.id)?.total ?? 0, c.presupuesto!) === "pasado");
  const animo = pasadas.length ? "sorprendida" : r.gastos === 0 ? "normal" : "feliz";
  const mensaje = r.gastos === 0 && r.ingresos === 0
    ? "Anota tu primer gasto y te ayudo a ver en qué se te va."
    : pasadas.length
      ? `Ojo: ya te pasaste en ${pasadas.map((c) => c.nombre.toLowerCase()).join(" y ")}.`
      : cambio !== null && cambio < -0.05
        ? "¡Vas gastando menos que el mes pasado!"
        : "Mango lleva la cuenta por ti.";

  const pendientes = cobrosPendientes(suscripciones, hoy);
  const proximos = suscripciones
    .filter((x) => x.activa && diasEntre(hoy, x.proximoCobro) > 0 && diasEntre(hoy, x.proximoCobro) <= 10)
    .sort((a, b) => a.proximoCobro.localeCompare(b.proximoCobro));

  return (
    <div className="space-y-4">
      <SelectorMes mes={mes} alCambiar={setMes} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* número principal */}
          <section className="panel-neko relative overflow-hidden rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/55">Gastado en {nombreMes(mes).split(" ")[0].toLowerCase()}</p>
                <p className="mt-0.5 font-titulo text-4xl font-semibold tracking-tight">{pesos(r.gastos)}</p>
                {cambio !== null && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-white/60">
                    <IconoNeko nombre={cambio > 0 ? "ingreso" : "gasto"} tamano={14} />
                    {Math.abs(Math.round(cambio * 100))}% {cambio > 0 ? "más" : "menos"} que el mes pasado{esMesActual ? " a estas alturas" : ""}
                  </p>
                )}
              </div>
              <div className="-mb-5 shrink-0"><Gatita clave="mango" pose="sentada" expresion={animo} ancho={92} /></div>
            </div>
            <p className="mt-3 text-sm text-white/60">{mensaje}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Dato etiqueta="Ingresos" valor={pesos(r.ingresos, true)} icono="ingreso" />
              <Dato etiqueta="Te queda" valor={pesos(r.balance, true)} icono="dinero" />
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => abrir("gasto")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-rosa py-3 font-titulo font-semibold text-noche shadow-neon-rosa active:scale-[0.98]">
              <IconoNeko nombre="gasto" tamano={20} /> Gasto
            </button>
            <button type="button" onClick={() => abrir("ingreso")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-cian py-3 font-titulo font-semibold text-noche active:scale-[0.98]">
              <IconoNeko nombre="ingreso" tamano={20} /> Ingreso
            </button>
          </div>

          {pendientes.length > 0 && <CobrosPorConfirmar />}

          <PorDia r={r} mes={mes} hoy={hoy} />
        </div>

        <div className="space-y-4">
          <PorCategoria r={r} alElegir={(id) => { setFiltro(id); alVer("movimientos"); }} alPresupuesto={() => alVer("presupuesto")} />

          {proximos.length > 0 && (
            <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-4">
              <header className="mb-2 flex items-center gap-2">
                <IconoNeko nombre="sincronizar" tamano={18} className="text-white/60" />
                <h2 className="flex-1 font-titulo font-semibold">Próximos cobros</h2>
                <button type="button" onClick={() => alVer("suscripciones")} className="text-xs font-semibold text-white/50 hover:text-white">Ver todas</button>
              </header>
              <ul className="space-y-1">
                {proximos.map((x) => (
                  <li key={x.id} className="flex items-center gap-2.5 py-1">
                    <Inicial nombre={x.nombre} color={x.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white/85">{x.nombre}</span>
                      <span className="block text-[11px] text-white/45">{formatoFechaCorta(x.proximoCobro)} · en {diasEntre(hoy, x.proximoCobro)} días</span>
                    </span>
                    <span className="text-sm font-semibold text-white/80">{pesos(x.monto)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, icono }: { etiqueta: string; valor: string; icono: "ingreso" | "dinero" }) {
  return (
    <div className="rounded-xl border border-noche-600 bg-noche-900/60 px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] font-semibold text-white/50"><IconoNeko nombre={icono} tamano={13} /> {etiqueta}</p>
      <p className="font-titulo text-lg font-semibold text-white/90">{valor}</p>
    </div>
  );
}

export function Inicial({ nombre, color, tamano = 34 }: { nombre: string; color: string; tamano?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-xl font-titulo font-bold" style={{ width: tamano, height: tamano, background: `${color}26`, color, fontSize: tamano * 0.45 }}>
      {nombre.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Suscripciones cuyo cobro ya llegó: confirmarlo lo anota como gasto */
export function CobrosPorConfirmar() {
  const suscripciones = useNekoStore((s) => s.suscripciones);
  const registrar = useNekoStore((s) => s.registrarCobro);
  const saltar = useNekoStore((s) => s.saltarCobro);
  const lista = cobrosPendientes(suscripciones, hoyISO());
  if (!lista.length) return null;
  return (
    <section className="rounded-[22px] border border-croqueta/40 bg-croqueta/[0.07] p-4">
      <p className="mb-2 flex items-center gap-2 font-titulo font-semibold"><IconoNeko nombre="reloj" tamano={18} className="text-croqueta" /> ¿Ya se cobraron?</p>
      <ul className="space-y-2">
        {lista.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-2.5">
            <Inicial nombre={x.nombre} color={x.color} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{x.nombre} · {pesos(x.monto)}</span>
              <span className="block text-[11px] text-white/50">Tocaba el {formatoFechaCorta(x.proximoCobro)}</span>
            </span>
            <span className="flex w-full gap-2 sm:w-auto">
              <button type="button" onClick={() => registrar(x.id)} className="flex-1 rounded-lg bg-croqueta px-3 py-1.5 text-xs font-bold text-noche sm:flex-none">Sí, anotarlo</button>
              <button type="button" onClick={() => saltar(x.id)} className="flex-1 rounded-lg border border-noche-600 px-3 py-1.5 text-xs font-semibold text-white/60 sm:flex-none">Esta vez no</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Barras horizontales ordenadas: en qué se va el dinero (cada fila con ícono y nombre, nunca solo color) */
function PorCategoria({ r, alElegir, alPresupuesto }: { r: ResumenMes; alElegir: (id: string) => void; alPresupuesto: () => void }) {
  const max = Math.max(...r.porCategoria.map((c) => Math.max(c.total, c.presupuesto ?? 0)), 1);
  return (
    <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <IconoNeko nombre="grafica" tamano={18} className="text-white/60" />
        <h2 className="flex-1 font-titulo font-semibold">En qué se te va</h2>
        <button type="button" onClick={alPresupuesto} className="text-xs font-semibold text-white/50 hover:text-white">Presupuesto</button>
      </header>
      {r.porCategoria.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/45">Aún no hay gastos este mes.</p>
      ) : (
        <ul className="space-y-1">
          {r.porCategoria.map(({ categoria: c, total, presupuesto }) => {
            const pct = r.gastos ? Math.round((total / r.gastos) * 100) : 0;
            const estado = presupuesto ? estadoPresupuesto(total, presupuesto) : null;
            return (
              <li key={c.id}>
                <button type="button" onClick={() => alElegir(c.id)} className="group w-full rounded-xl px-1.5 py-1.5 text-left hover:bg-noche-700/50"
                  title={`${c.nombre}: ${pesos(total)} (${pct}%)${presupuesto ? ` de ${pesos(presupuesto)}` : ""}`}>
                  <span className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${c.color}26`, color: c.color }}><IconoNeko nombre={c.icono} tamano={16} /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">{c.nombre}</span>
                    {estado === "pasado" && <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase" style={{ color: ESTADO.pasado.color }}><IconoNeko nombre="chispa" tamano={11} />Pasado</span>}
                    <span className="text-sm font-semibold tabular-nums text-white/90">{pesos(total, true)}</span>
                    <span className="w-9 text-right text-[11px] tabular-nums text-white/45">{pct}%</span>
                  </span>
                  <span className="relative ml-9 mt-1 block h-2 rounded-full bg-noche-700/70">
                    <motion.span className="absolute inset-y-0 left-0 rounded-[4px]" style={{ background: c.color }}
                      initial={{ width: 0 }} animate={{ width: `${(total / max) * 100}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                    {presupuesto && <span className="absolute -top-0.5 h-3 w-0.5 rounded bg-white/70" style={{ left: `calc(${(presupuesto / max) * 100}% - 1px)` }} title={`Presupuesto ${pesos(presupuesto)}`} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {r.porCategoria.some((c) => c.presupuesto) && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40"><span className="inline-block h-3 w-0.5 rounded bg-white/70" /> marca tu presupuesto del mes</p>
      )}
    </section>
  );
}

export const ESTADO = {
  bien: { color: "#0ca30c", texto: "Vas bien" },
  cerca: { color: "#fab219", texto: "Cerca del límite" },
  pasado: { color: "#d03b3b", texto: "Te pasaste" },
} as const;

/** Columnas por día: un solo tono; tocar una columna muestra su total arriba */
function PorDia({ r, mes, hoy }: { r: ResumenMes; mes: string; hoy: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const n = r.porDia.length;
  const diaHoy = mes === hoy.slice(0, 7) ? Number(hoy.slice(8, 10)) : n;
  const conDatos = r.porDia.slice(0, diaHoy);
  const promedio = conDatos.length ? conDatos.reduce((a, b) => a + b, 0) / conDatos.length : 0;
  const max = Math.max(...r.porDia, 1);
  const W = 100 / n;
  const ALTO = 120;
  const elegido = sel ?? (r.porDia[diaHoy - 1] ? diaHoy - 1 : null);
  const fechaSel = elegido !== null ? `${mes}-${String(elegido + 1).padStart(2, "0")}` : null;

  return (
    <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5">
      <header className="mb-1 flex items-baseline gap-2">
        <h2 className="flex-1 font-titulo font-semibold">Gasto por día</h2>
        <span className="text-xs text-white/45">promedio {pesos(promedio, true)}</span>
      </header>
      <p className="mb-2 h-5 text-sm text-white/75" aria-live="polite">
        {fechaSel ? <><span className="text-white/50">{formatoFechaCorta(fechaSel)}:</span> <strong className="font-semibold text-white">{pesos(r.porDia[elegido!])}</strong></> : <span className="text-white/40">Toca un día para ver su total</span>}
      </p>
      {r.gastos === 0 ? (
        <div className="grid h-[120px] place-items-center text-sm text-white/40">Sin gastos para graficar.</div>
      ) : (
        <div className="relative" style={{ height: ALTO }}>
          <svg viewBox={`0 0 100 ${ALTO}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img"
            aria-label={`Gasto por día en ${nombreMes(mes)}. Máximo ${pesos(max)}, promedio ${pesos(promedio)}.`}>
            <line x1="0" x2="100" y1={ALTO - 0.5} y2={ALTO - 0.5} stroke="rgba(255,255,255,.12)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {promedio > 0 && (
              <line x1="0" x2="100" y1={ALTO - (promedio / max) * (ALTO - 6)} y2={ALTO - (promedio / max) * (ALTO - 6)}
                stroke="rgba(255,255,255,.35)" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            )}
            {r.porDia.map((v, i) => {
              const h = v ? Math.max(3, (v / max) * (ALTO - 6)) : 0;
              const activo = i === elegido;
              return (
                <g key={i}>
                  {/* zona de toque más grande que la barra */}
                  <rect x={i * W} y={0} width={W} height={ALTO} fill="transparent" onPointerEnter={() => setSel(i)} onClick={() => setSel(i)} style={{ cursor: "pointer" }} />
                  {v > 0 && (
                    <rect x={i * W + W * 0.18} y={ALTO - h} width={W * 0.64} height={h} rx={0.8}
                      fill="#9085e9" opacity={elegido === null || activo ? 1 : 0.55} pointerEvents="none" />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/35">
        <span>1</span><span>{Math.ceil(n / 2)}</span><span>{n}</span>
      </div>
    </section>
  );
}

