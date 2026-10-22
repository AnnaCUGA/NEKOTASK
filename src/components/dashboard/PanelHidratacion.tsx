"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono, Panel } from "@/components/ui/Panel";
import { bus, confetiDesde } from "@/lib/eventos";
import { esHoy, formatoHora } from "@/lib/fechas";
import type { NombreIcono, TipoBebida } from "@/lib/tipos";
import { mlEfectivosHoy, useNekoStore } from "@/store/useNekoStore";

const COLORES_NUEVA = ["#67c7f0", "#f5a142", "#f07aa8", "#9cc96b", "#c4b5fd", "#e8a85b"];

export function PanelHidratacion({ compacto = false }: { compacto?: boolean }) {
  const todas = useNekoStore((s) => s.bebidas);
  const bebidas = useMemo(() => todas.filter((b) => !b.oculta), [todas]);
  const registros = useNekoStore((s) => s.registroBebidas);
  const meta = useNekoStore((s) => s.ajustes.metaAguaMl);
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
    return todas.filter((b) => porTipo.has(b.id)).map((b) => ({ bebida: b, ml: porTipo.get(b.id)! }));
  }, [hoy, todas]);

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
          <Gatita clave="blanquita" pose="sentada" expresion={expresion} cabeza={bebiendo ? "bebiendo" : "normal"} ancho={compacto ? 92 : 118} />
          
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
            const b = todas.find((x) => x.id === r.tipoId);
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

const ICONOS_BEBIDA: NombreIcono[] = ["agua", "jugo", "te", "cafe", "sabor", "refresco", "leche", "botella"];

function EditorBebidas() {
  const bebidas = useNekoStore((s) => s.bebidas);
  const actualizar = useNekoStore((s) => s.actualizarBebida);
  const eliminar = useNekoStore((s) => s.eliminarTipoBebida);
  const borrar = useNekoStore((s) => s.borrarTipoBebida);
  const mover = useNekoStore((s) => s.moverBebida);
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const meta = useNekoStore((s) => s.ajustes.metaAguaMl);
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const [editando, setEditando] = useState<string | "nueva" | null>(null);
  const visibles = bebidas.filter((b) => !b.oculta);
  const ocultas = bebidas.filter((b) => b.oculta);

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-noche-600 bg-noche-900/70 p-3">
      <label className="flex items-center justify-between gap-3 text-sm text-white/80">
        Meta diaria
        <span className="flex items-center gap-2">
          <input type="range" min={1000} max={4000} step={250} value={meta} onChange={(e) => ajustar({ metaAguaMl: +e.target.value })} aria-label="Meta diaria" className="w-24 accent-cian sm:w-36" />
          <span className="w-16 text-right font-semibold text-white">{meta} ml</span>
        </span>
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-white/55">Tus bebidas</p>
        <ul className="space-y-1.5">
          {visibles.map((b, i) => (
            <li key={b.id} className="rounded-xl border border-noche-600 bg-noche-800/80">
              <div className="flex items-center gap-1.5 py-1.5 pl-1 pr-2 text-sm">
                <span className="flex flex-col">
                  <button type="button" onClick={() => mover(b.id, -1)} disabled={i === 0} aria-label={`Subir ${b.nombre}`}
                    className="grid h-5 w-6 place-items-center text-white/45 hover:text-white disabled:opacity-20"><IconoNeko nombre="izquierda" tamano={13} className="rotate-90" /></button>
                  <button type="button" onClick={() => mover(b.id, 1)} disabled={i === visibles.length - 1} aria-label={`Bajar ${b.nombre}`}
                    className="grid h-5 w-6 place-items-center text-white/45 hover:text-white disabled:opacity-20"><IconoNeko nombre="izquierda" tamano={13} className="-rotate-90" /></button>
                </span>
                <span style={{ color: b.color }}><IconoNeko nombre={b.icono} tamano={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-white/85">{b.nombre}</span>
                  <span className="block truncate text-[11px] text-white/45">Cuenta {b.porcentaje}% · {b.tamanosMl.join(", ")} ml</span>
                </span>
                <BotonIcono icono="lapiz" etiqueta={`Editar ${b.nombre}`} tamano={15} activo={editando === b.id} onClick={() => setEditando(editando === b.id ? null : b.id)} className="h-8 w-8" />
                {b.id !== "agua" && (
                  <>
                    <BotonIcono icono="ojoCerrado" etiqueta={`Esconder ${b.nombre}`} tamano={15} onClick={() => { setEditando(null); eliminar(b.id); }} className="h-8 w-8" />
                    <BotonBorrar nombre={b.nombre} confirmando={porBorrar === b.id} alPedir={() => setPorBorrar(b.id)} alBorrar={() => { setPorBorrar(null); setEditando(null); borrar(b.id); }} />
                  </>
                )}
              </div>
              <AnimatePresence initial={false}>
                {editando === b.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <FormBebida bebida={b} alGuardar={(c) => { actualizar(b.id, c); setEditando(null); }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[11px] text-white/40">Con las flechas cambias el orden de los botones. El ojito la esconde (la puedes recuperar); el bote la borra. Lo que ya tomaste sigue contando en tus días pasados.</p>
      </div>

      {ocultas.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/55">Escondidas</p>
          <div className="flex flex-wrap gap-1.5">
            {ocultas.map((b) => (
              <span key={b.id} className="flex items-center gap-1 rounded-full border border-dashed border-noche-600 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-white/55">
                <IconoNeko nombre={b.icono} tamano={14} /> {b.nombre}
                <button type="button" onClick={() => actualizar(b.id, { oculta: false })} className="ml-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-cian hover:bg-cian/10">
                  <IconoNeko nombre="ojo" tamano={13} /> mostrar
                </button>
                <button type="button" onClick={() => (porBorrar === b.id ? (setPorBorrar(null), borrar(b.id)) : setPorBorrar(b.id))}
                  aria-label={`Borrar ${b.nombre}`} className={`rounded-full px-1.5 py-0.5 ${porBorrar === b.id ? "bg-rosa/15 text-rosa" : "text-white/40 hover:text-rosa"}`}>
                  {porBorrar === b.id ? "¿borrar?" : <IconoNeko nombre="basura" tamano={13} />}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {editando === "nueva" ? (
        <div className="rounded-xl border border-violeta/40 bg-noche-800/80">
          <p className="px-3 pt-2.5 text-sm font-semibold">Nueva bebida</p>
          <FormBebida alGuardar={(c) => { useNekoStore.getState().agregarTipoBebida(c); setEditando(null); }} alCancelar={() => setEditando(null)} />
        </div>
      ) : (
        <button type="button" onClick={() => setEditando("nueva")}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-noche-600 py-2 text-sm font-semibold text-white/60 hover:border-violeta/50 hover:text-white">
          <IconoNeko nombre="mas" tamano={16} /> Agregar bebida
        </button>
      )}
    </div>
  );
}

function BotonBorrar({ nombre, confirmando, alPedir, alBorrar }: { nombre: string; confirmando: boolean; alPedir: () => void; alBorrar: () => void }) {
  return confirmando ? (
    <button type="button" onClick={alBorrar} className="h-8 rounded-xl border border-rosa bg-rosa/15 px-2 text-xs font-bold text-rosa">¿Borrar?</button>
  ) : (
    <BotonIcono icono="basura" etiqueta={`Borrar ${nombre}`} tamano={15} onClick={alPedir} className="h-8 w-8" />
  );
}

function FormBebida({ bebida, alGuardar, alCancelar }: {
  bebida?: TipoBebida;
  alGuardar: (b: Omit<TipoBebida, "id">) => void;
  alCancelar?: () => void;
}) {
  const [nombre, setNombre] = useState(bebida?.nombre ?? "");
  const [icono, setIcono] = useState<NombreIcono>(bebida?.icono ?? "botella");
  const [color, setColor] = useState(bebida?.color ?? COLORES_NUEVA[3]);
  const [porcentaje, setPorcentaje] = useState(bebida?.porcentaje ?? 100);
  const [tamanos, setTamanos] = useState<string[]>((bebida?.tamanosMl ?? [250, 350, 500]).map(String));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const ml = tamanos.map((t) => parseInt(t, 10)).filter((n) => n > 0 && n <= 3000);
    if (!nombre.trim() || !ml.length) return;
    alGuardar({ nombre: nombre.trim(), icono, color, porcentaje, tamanosMl: [...new Set(ml)].sort((a, b) => a - b), oculta: false });
  };

  return (
    <form onSubmit={guardar} className="space-y-2.5 border-t border-noche-600 px-3 py-3">
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre: licuado, leche, agua mineral…" aria-label="Nombre de la bebida"
        className="w-full rounded-xl border border-noche-600 bg-noche-900 px-3 py-1.5 text-sm text-white outline-none focus:border-violeta/60" />
      <div className="flex flex-wrap gap-1.5">
        {ICONOS_BEBIDA.map((i) => (
          <button key={i} type="button" onClick={() => setIcono(i)} aria-label={i} aria-pressed={icono === i}
            className={`grid h-9 w-9 place-items-center rounded-xl border ${icono === i ? "bg-noche-700" : "border-noche-600 text-white/50"}`}
            style={icono === i ? { borderColor: color, color } : undefined}>
            <IconoNeko nombre={i} tamano={18} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {COLORES_NUEVA.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
            className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-noche-800" : ""}`} style={{ background: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-white/70">
        <span className="shrink-0">Botones (ml)</span>
        {tamanos.map((t, i) => (
          <input key={i} value={t} inputMode="numeric" aria-label={`Tamaño ${i + 1}`}
            onChange={(e) => setTamanos((v) => v.map((x, j) => (j === i ? e.target.value.replace(/\D/g, "") : x)))}
            className="w-16 rounded-lg border border-noche-600 bg-noche-900 px-2 py-1 text-center text-white outline-none focus:border-violeta/60" />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-white/70">
        <span className="shrink-0">Cuenta</span>
        <input type="range" min={0} max={100} step={5} value={porcentaje} onChange={(e) => setPorcentaje(+e.target.value)} className="min-w-0 flex-1 accent-violeta" />
        <span className="w-11 shrink-0 text-right text-white">{porcentaje}%</span>
      </label>
      <div className="flex gap-2">
        {alCancelar && <button type="button" onClick={alCancelar} className="rounded-xl border border-noche-600 px-3 py-1.5 text-sm font-semibold text-white/60">Cancelar</button>}
        <button type="submit" disabled={!nombre.trim()} className="flex-1 rounded-xl bg-violeta py-1.5 text-sm font-bold text-noche disabled:opacity-40">Guardar</button>
      </div>
    </form>
  );
}
