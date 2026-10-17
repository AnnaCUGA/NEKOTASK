"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ICONOS_HABITO, IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono, Panel } from "@/components/ui/Panel";
import { confetiDesde } from "@/lib/eventos";
import { hoyISO, sumarDias } from "@/lib/fechas";
import type { Habito, NombreIcono, Rutina } from "@/lib/tipos";
import { ETIQUETAS_RUTINA, hechoHoy, rachaHabito, tocaHoy, useNekoStore } from "@/store/useNekoStore";

const ICONO_RUTINA: Record<Rutina, NombreIcono> = { manana: "sol", dia: "nube", noche: "luna", ninguna: "estrella" };
const COLORES = ["#67e8f9", "#f9a8d4", "#a78bfa", "#9cc96b", "#e8a85b", "#fb7185"];
const DIAS = ["D", "L", "M", "M", "J", "V", "S"];

export function PanelHabitos() {
  const habitos = useNekoStore((s) => s.habitos);
  const registros = useNekoStore((s) => s.registroHabitos);
  const [form, setForm] = useState(false);
  const [editar, setEditar] = useState(false);

  const grupos = (["manana", "dia", "noche", "ninguna"] as Rutina[])
    .map((r) => ({ rutina: r, lista: habitos.filter((h) => h.rutina === r) }))
    .filter((g) => g.lista.length);

  return (
    <Panel
      titulo="Hábitos y rutinas"
      icono="racha"
      acento="rosa"
      accion={
        <div className="flex gap-1.5">
          <BotonIcono icono="ajustes" etiqueta="Editar hábitos" onClick={() => setEditar((v) => !v)} activo={editar} />
          <BotonIcono icono={form ? "cerrar" : "mas"} etiqueta={form ? "Cerrar" : "Nuevo hábito"} onClick={() => setForm((v) => !v)} activo={form} />
        </div>
      }
    >
      <AnimatePresence initial={false}>
        {form && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <FormHabito alGuardar={() => setForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {grupos.map(({ rutina, lista }) => {
          const deHoy = lista.filter((h) => tocaHoy(h));
          const hechos = deHoy.filter((h) => hechoHoy(h.id, registros)).length;
          return (
            <div key={rutina}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/45">
                <IconoNeko nombre={ICONO_RUTINA[rutina]} tamano={15} />
                {ETIQUETAS_RUTINA[rutina]}
                <span className="ml-auto normal-case tracking-normal text-white/60">{hechos}/{deHoy.length}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-noche-600">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-rosa to-violeta" initial={false}
                  animate={{ width: `${deHoy.length ? (hechos / deHoy.length) * 100 : 0}%` }} />
              </div>
              <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {lista.map((h) => <ItemHabito key={h.id} habito={h} editar={editar} />)}
              </ul>
            </div>
          );
        })}
        {!grupos.length && <p className="py-4 text-center text-sm text-white/45">Agrega tu primer hábito con el botón +</p>}
      </div>
    </Panel>
  );
}

function ItemHabito({ habito, editar }: { habito: Habito; editar: boolean }) {
  const registros = useNekoStore((s) => s.registroHabitos);
  const alternar = useNekoStore((s) => s.alternarHabitoHoy);
  const eliminar = useNekoStore((s) => s.eliminarHabito);
  const hecho = hechoHoy(habito.id, registros);
  const racha = rachaHabito(habito, registros);
  const toca = tocaHoy(habito);
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(hoyISO(), i - 6));
  const fechasHechas = new Set(registros.filter((r) => r.habitoId === habito.id).map((r) => r.fecha));

  return (
    <li className={`flex items-center gap-3 rounded-2xl border border-noche-600 bg-noche-700/60 p-2.5 ${toca ? "" : "opacity-45"}`}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        disabled={!toca}
        onClick={(e) => { if (!hecho) confetiDesde(e.currentTarget, habito.color); alternar(habito.id); }}
        aria-label={hecho ? `Desmarcar ${habito.nombre}` : `Marcar ${habito.nombre}`}
        className="group grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 transition"
        style={hecho ? { background: habito.color, borderColor: habito.color, color: "#121212" } : { borderColor: `${habito.color}66`, color: habito.color }}
      >
        <IconoNeko nombre={hecho ? "check" : habito.icono} tamano={22} grosor={hecho ? 2.8 : 1.9} className="group-hover:animate-meneo" />
      </motion.button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold leading-tight [overflow-wrap:anywhere] ${hecho ? "text-white/50" : "text-white/90"}`}>{habito.nombre}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex gap-[3px]" aria-label="Últimos 7 días">
            {semana.map((d) => (
              <span key={d} className="h-1.5 w-1.5 rounded-full" style={{ background: fechasHechas.has(d) ? habito.color : "#3a3649" }} />
            ))}
          </div>
          {racha > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-rosa-suave">
              <IconoNeko nombre="racha" tamano={12} /> {racha}
            </span>
          )}
          {habito.diasSemana.length > 0 && (
            <span className="text-[10px] text-white/35">{habito.diasSemana.map((d) => DIAS[d]).join(" ")}</span>
          )}
        </div>
      </div>
      {editar && (
        <button type="button" onClick={() => eliminar(habito.id)} aria-label={`Eliminar ${habito.nombre}`} className="text-white/40 hover:text-rosa">
          <IconoNeko nombre="basura" tamano={17} />
        </button>
      )}
    </li>
  );
}

function FormHabito({ alGuardar }: { alGuardar: () => void }) {
  const agregar = useNekoStore((s) => s.agregarHabito);
  const [nombre, setNombre] = useState("");
  const [icono, setIcono] = useState<NombreIcono>("estrella");
  const [color, setColor] = useState(COLORES[2]);
  const [rutina, setRutina] = useState<Rutina>("manana");
  const [dias, setDias] = useState<number[]>([]);
  const [error, setError] = useState("");

  return (
    <form
      className="mb-4 space-y-3 rounded-2xl border border-noche-600 bg-noche-900/70 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim()) { setError("Ponle nombre a tu hábito"); return; }
        agregar({ nombre: nombre.trim(), icono, color, rutina, diasSemana: dias });
        alGuardar();
      }}
    >
      <input autoFocus value={nombre} onChange={(e) => { setNombre(e.target.value); setError(""); }} placeholder="p. ej. Ponerme crema, leer, estirarme"
        className="w-full rounded-xl border border-noche-600 bg-noche-800 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-rosa/60" />
      {error && <p className="text-xs text-rosa">{error}</p>}

      <div>
        <p className="mb-1.5 text-[11px] text-white/50">Ícono</p>
        <div className="grid grid-cols-9 gap-1.5">
          {ICONOS_HABITO.map((n) => (
            <button key={n} type="button" onClick={() => setIcono(n)} aria-label={n}
              className={`grid aspect-square place-items-center rounded-xl border transition ${icono === n ? "border-transparent" : "border-noche-600 text-white/60 hover:text-white"}`}
              style={icono === n ? { background: color, color: "#121212" } : undefined}>
              <IconoNeko nombre={n} tamano={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-[11px] text-white/50">Color</p>
        {COLORES.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`}
            className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["manana", "dia", "noche", "ninguna"] as Rutina[]).map((r) => (
          <button key={r} type="button" onClick={() => setRutina(r)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${rutina === r ? "border-rosa bg-rosa/20 text-white" : "border-noche-600 text-white/55"}`}>
            <IconoNeko nombre={ICONO_RUTINA[r]} tamano={13} /> {ETIQUETAS_RUTINA[r]}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] text-white/50">Días (sin seleccionar = todos los días)</p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button key={d} type="button" onClick={() => setDias((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}
              className={`h-8 w-8 rounded-full text-xs font-bold ${dias.includes(d) ? "bg-violeta text-noche" : "bg-noche-700 text-white/55"}`}>
              {DIAS[d]}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-rosa to-violeta py-2 font-titulo font-semibold text-noche">Crear hábito</button>
    </form>
  );
}
