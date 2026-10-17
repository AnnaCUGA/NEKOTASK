"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono, Panel } from "@/components/ui/Panel";
import { bus, confetiDesde } from "@/lib/eventos";
import { esHoy, formatoHora } from "@/lib/fechas";
import type { TipoBebida } from "@/lib/tipos";
import { mlEfectivosHoy, useNekoStore } from "@/store/useNekoStore";

const COLORES_NUEVA = ["#67c7f0", "#f5a142", "#f07aa8", "#9cc96b", "#c4b5fd", "#e8a85b"];

export function PanelHidratacion({ compacto = false }: { compacto?: boolean }) {
  const bebidas = useNekoStore((s) => s.bebidas);
  const registros = useNekoStore((s) => s.registroBebidas);
  const meta = useNekoStore((s) => s.ajustes.metaAguaMl);
  const accesorio = useNekoStore((s) => s.gatitas.find((g) => g.clave === "blanquita")?.accesorio);
  const registrar = useNekoStore((s) => s.registrarBebida);
  const deshacer = useNekoStore((s) => s.deshacerUltimaBebida);

  const [seleccion, setSeleccion] = useState(bebidas[0]?.id ?? "agua");
  const [editando, setEditando] = useState(false);
  const [bebiendo, setBebiendo] = useState(false);
  const [mlLibre, setMlLibre] = useState("");

  const hoy = useMemo(() => registros.filter((r) => esHoy(r.en)), [registros]);
  const efectivos = mlEfectivosHoy(registros);
  const pct = Math.min(1, efectivos / meta);
  const capas = useMemo(() => {
    const porTipo = new Map<string, number>();
    hoy.forEach((r) => porTipo.set(r.tipoId, (porTipo.get(r.tipoId) ?? 0) + (r.ml * r.porcentaje) / 100));
    return bebidas.filter((b) => porTipo.has(b.id)).map((b) => ({ bebida: b, ml: porTipo.get(b.id)! }));
  }, [hoy, bebidas]);

  useEffect(
    () =>
      bus.escuchar((e) => {
        if (e.tipo !== "bebida") return;
        setBebiendo(true);
        setTimeout(() => setBebiendo(false), 2400);
      }),
    [],
  );

  const actual = bebidas.find((b) => b.id === seleccion) ?? bebidas[0];
  const expresion = bebiendo ? "dormida" : pct >= 1 ? "feliz" : pct < 0.25 ? "sorprendida" : "normal";

  return (
    <Panel
      titulo="Hidratación"
      icono="agua"
      acento="cian"
      accion={<BotonIcono icono="ajustes" etiqueta="Editar bebidas" onClick={() => setEditando((v) => !v)} activo={editando} />}
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-4">
        {/* Blanquita + vaso */}
        <div className="relative -ml-3 flex shrink-0 items-end">
          <Gatita clave="blanquita" pose="sentada" expresion={expresion} cabeza={bebiendo ? "bebiendo" : "normal"} accesorio={accesorio} ancho={compacto ? 92 : 118} />
          
          <Vaso capas={capas} meta={meta} alto={compacto ? 110 : 136} />
        </div>

        <div className="w-full min-w-0 flex-1">
          <p className="whitespace-nowrap font-titulo text-3xl font-semibold leading-none text-white">
            {Math.round(efectivos).toLocaleString("es-MX")}
            <span className="ml-1 text-base font-medium text-white/40">/ {meta.toLocaleString("es-MX")} ml</span>
          </p>
          <p className="mt-1 text-sm text-cian-suave/80">
            {pct >= 1 ? "¡Meta cumplida! Blanquita está orgullosa" : pct < 0.25 ? "Blanquita tiene sed… ¿un vaso?" : `Vas al ${Math.round(pct * 100)}%`}
          </p>

          {/* selector de bebida */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {bebidas.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSeleccion(b.id)}
                className={`group flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                  seleccion === b.id ? "border-transparent text-noche" : "border-noche-600 bg-noche-700 text-white/70 hover:text-white"
                }`}
                style={seleccion === b.id ? { background: b.color } : undefined}
              >
                <IconoNeko nombre={b.icono} tamano={15} className="group-hover:animate-meneo" />
                {b.nombre}
              </button>
            ))}
          </div>

          {actual && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {actual.tamanosMl.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={(ev) => { registrar(actual.id, ml); confetiDesde(ev.currentTarget, actual.color); }}
                  className="rounded-xl border border-noche-600 bg-noche-700 px-3 py-1.5 text-sm font-bold text-white transition hover:border-cian/60 active:scale-95"
                >
                  +{ml}
                </button>
              ))}
              <form
                className="flex items-center"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  const ml = parseInt(mlLibre, 10);
                  if (ml > 0 && ml <= 3000) { registrar(actual.id, ml); setMlLibre(""); }
                }}
              >
                <input
                  inputMode="numeric"
                  value={mlLibre}
                  onChange={(e) => setMlLibre(e.target.value.replace(/\D/g, ""))}
                  placeholder="ml"
                  aria-label="Mililitros personalizados"
                  className="w-16 rounded-l-xl border border-noche-600 bg-noche-900 px-2 py-1.5 text-sm text-white outline-none focus:border-cian/60"
                />
                <button type="submit" aria-label="Registrar" className="rounded-r-xl border border-l-0 border-noche-600 bg-noche-700 px-2 py-1.5 text-white/80 hover:text-white">
                  <IconoNeko nombre="mas" tamano={16} />
                </button>
              </form>
              {hoy.length > 0 && (
                <button type="button" onClick={deshacer} className="text-xs text-white/40 underline-offset-2 hover:text-white/70 hover:underline">
                  deshacer
                </button>
              )}
            </div>
          )}
          {actual && actual.porcentaje < 100 && (
            <p className="mt-1.5 text-[11px] text-white/40">{actual.nombre} cuenta {actual.porcentaje}% para tu meta</p>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editando && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <EditorBebidas />
          </motion.div>
        )}
      </AnimatePresence>

      {!compacto && hoy.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-noche-600 pt-3">
          {hoy.slice(0, 8).map((r) => {
            const b = bebidas.find((x) => x.id === r.tipoId);
            return (
              <li key={r.id} className="flex items-center gap-1 rounded-lg bg-noche-700 px-2 py-1 text-[11px] text-white/60">
                <span style={{ color: b?.color }}><IconoNeko nombre={b?.icono ?? "agua"} tamano={13} /></span>
                {r.ml} ml · {formatoHora(r.en)}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Vaso({ capas, meta, alto }: { capas: { bebida: TipoBebida; ml: number }[]; meta: number; alto: number }) {
  const ancho = alto * 0.58;
  const interiorAlto = alto - 14;
  let acumulado = 0;
  const total = capas.reduce((s, c) => s + c.ml, 0);
  const desborda = total > meta;
  const idClip = `vaso-${useId().replace(/:/g, "")}`;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-label="Vaso de hidratación" role="img" className="overflow-visible">
      <defs>
        <clipPath id={idClip}>
          <path d={`M5 6 L${ancho - 5} 6 L${ancho - 10} ${alto - 7} Q${ancho / 2} ${alto - 2} 10 ${alto - 7} Z`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${idClip})`}>
        <rect x="0" y="0" width={ancho} height={alto} fill="#1b2a38" />
        {capas.map(({ bebida, ml }) => {
          const h = (Math.min(ml, Math.max(0, meta - acumulado)) / meta) * interiorAlto;
          const y = alto - 4 - ((acumulado / meta) * interiorAlto) - h;
          acumulado += ml;
          if (h <= 0) return null;
          return (
            <motion.rect key={bebida.id} x="0" width={ancho} fill={bebida.color}
              initial={false} animate={{ y, height: h + 1 }} transition={{ type: "spring", stiffness: 90, damping: 16 }} />
          );
        })}
        {total > 0 && (
          <motion.g
            initial={false}
            animate={{ y: alto - 4 - Math.min(1, total / meta) * interiorAlto - 4 }}
            transition={{ type: "spring", stiffness: 90, damping: 16 }}
          >
            <motion.path
              d={`M-40 4 Q-30 0 -20 4 T0 4 T20 4 T40 4 T60 4 T80 4 T100 4 T120 4 V12 H-40 Z`}
              fill={capas[capas.length - 1]?.bebida.color}
              animate={{ x: [0, 20] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            />
          </motion.g>
        )}
        {/* burbujitas */}
        {total > 0 && [0.3, 0.6, 0.45].map((fx, i) => (
          <motion.circle key={i} cx={ancho * fx} cy={alto - 8} r={2.2} fill="#fff" opacity={0.5}
            initial={{ cy: alto - 8, opacity: 0.6 }}
            animate={{ cy: [alto - 8, alto - 8 - Math.min(1, total / meta) * interiorAlto + 6], opacity: [0.6, 0] }}
            transition={{ duration: 2 + i * 0.6, repeat: Infinity, delay: i * 0.7 }} />
        ))}
      </g>
      <path d={`M5 6 L${ancho - 5} 6 L${ancho - 10} ${alto - 7} Q${ancho / 2} ${alto - 2} 10 ${alto - 7} Z`} fill="none" stroke="#2b2233" strokeWidth="5" strokeLinejoin="round" />
      <path d={`M5 6 L${ancho - 5} 6 L${ancho - 10} ${alto - 7} Q${ancho / 2} ${alto - 2} 10 ${alto - 7} Z`} fill="none" stroke="#c4e9f7" strokeWidth="2.2" strokeLinejoin="round" opacity="0.9" />
      <path d={`M12 16 L14 ${alto - 22}`} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      {/* marcas de 25 % */}
      {[0.25, 0.5, 0.75].map((m) => (
        <path key={m} d={`M${ancho - 14} ${alto - 4 - m * interiorAlto} h-6`} stroke="#c4e9f7" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      ))}
      {desborda && (
        <text x={ancho / 2} y={-2} textAnchor="middle" fontSize="11" fontWeight="700" fill="#67e8f9" fontFamily="var(--font-titulo)">+{Math.round(total - meta)}</text>
      )}
    </svg>
  );
}

function EditorBebidas() {
  const bebidas = useNekoStore((s) => s.bebidas);
  const actualizar = useNekoStore((s) => s.actualizarBebida);
  const agregar = useNekoStore((s) => s.agregarTipoBebida);
  const meta = useNekoStore((s) => s.ajustes.metaAguaMl);
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const [nombre, setNombre] = useState("");

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-noche-600 bg-noche-900/70 p-3">
      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
        Meta diaria
        <span className="flex items-center gap-2">
          <input type="range" min={1000} max={4000} step={250} value={meta} onChange={(e) => ajustar({ metaAguaMl: +e.target.value })} className="accent-cian" />
          <span className="w-16 text-right font-semibold text-white">{meta} ml</span>
        </span>
      </label>
      <p className="text-[11px] text-white/45">¿Cuánto cuenta cada bebida para tu meta? Tú decides.</p>
      {bebidas.map((b) => (
        <div key={b.id} className="flex items-center gap-2 text-sm">
          <span style={{ color: b.color }}><IconoNeko nombre={b.icono} tamano={18} /></span>
          <span className="w-24 truncate text-white/80">{b.nombre}</span>
          <input type="range" min={0} max={100} step={5} value={b.porcentaje} aria-label={`Porcentaje de ${b.nombre}`}
            onChange={(e) => actualizar(b.id, { porcentaje: +e.target.value })} className="flex-1 accent-violeta" />
          <span className="w-10 text-right text-white">{b.porcentaje}%</span>
        </div>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nombre.trim()) return;
          agregar({ nombre: nombre.trim(), icono: "sabor", color: COLORES_NUEVA[bebidas.length % COLORES_NUEVA.length], porcentaje: 100, tamanosMl: [250, 350, 500] });
          setNombre("");
        }}
      >
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nueva bebida (p. ej. Licuado)"
          className="min-w-0 flex-1 rounded-xl border border-noche-600 bg-noche-800 px-3 py-1.5 text-sm text-white outline-none focus:border-violeta/60" />
        <button type="submit" className="rounded-xl bg-violeta px-3 text-sm font-bold text-noche">Agregar</button>
      </form>
    </div>
  );
}
