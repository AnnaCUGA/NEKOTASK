"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { CATALOGO_ACCESORIOS } from "@/components/gatitas/Accesorios";
import { Gatita } from "@/components/gatitas/Gatita";
import { ORDEN_GATITAS, PERFILES } from "@/components/gatitas/perfiles";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono, Chip, Panel } from "@/components/ui/Panel";
import { confetiDesde } from "@/lib/eventos";
import { diasHasta, formatoFechaCorta, hoyISO } from "@/lib/fechas";
import type { CitaGatita, ClaveAccesorio, ClaveGatita, NombreIcono, TipoCuidado } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

const CUIDADOS_DIARIOS: { tipo: TipoCuidado; nombre: string; icono: NombreIcono }[] = [
  { tipo: "comida", nombre: "Comida", icono: "plato" },
  { tipo: "agua_fresca", nombre: "Agua fresca", icono: "agua" },
  { tipo: "arenero", nombre: "Arenero", icono: "arenero" },
];
const TIPOS_CITA: { tipo: CitaGatita["tipo"]; nombre: string; icono: NombreIcono }[] = [
  { tipo: "vacuna", nombre: "Vacuna", icono: "vacuna" },
  { tipo: "desparasitacion", nombre: "Desparasitación", icono: "pastilla" },
  { tipo: "veterinario", nombre: "Veterinario", icono: "veterinario" },
  { tipo: "medicamento", nombre: "Medicamento", icono: "pastilla" },
];

export function PanelGatitas() {
  const [formCita, setFormCita] = useState(false);
  return (
    <Panel
      titulo="Mis gatitas"
      icono="huella"
      acento="rosa"
      accion={<BotonIcono icono={formCita ? "cerrar" : "calendario"} etiqueta={formCita ? "Cerrar" : "Agendar cita"} onClick={() => setFormCita((v) => !v)} activo={formCita} />}
    >
      <AnimatePresence initial={false}>
        {formCita && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <FormCita alGuardar={() => setFormCita(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ORDEN_GATITAS.map((c) => <TarjetaGatita key={c} clave={c} />)}
      </div>
    </Panel>
  );
}

function TarjetaGatita({ clave }: { clave: ClaveGatita }) {
  const perfil = PERFILES[clave];
  const gatita = useNekoStore((s) => s.gatitas.find((g) => g.clave === clave));
  const registro = useNekoStore((s) => s.registroCuidados);
  const todasCitas = useNekoStore((s) => s.citas);
  const citas = todasCitas.filter((x) => x.gatita === clave && !x.hecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const registrar = useNekoStore((s) => s.registrarCuidado);
  const completar = useNekoStore((s) => s.completarCita);
  const hoy = hoyISO();
  const hechoHoy = (t: TipoCuidado) => registro.some((r) => r.gatita === clave && r.tipo === t && r.fecha === hoy);
  const todos = CUIDADOS_DIARIOS.every((c) => hechoHoy(c.tipo));

  return (
    <div className="flex flex-col rounded-2xl border border-noche-600 bg-noche-700/50 p-3">
      <div className="flex items-end gap-2">
        <Gatita clave={clave} pose={perfil.poseFavorita === "dormida" ? "echada" : "sentada"} expresion={todos ? "feliz" : "normal"} accesorio={gatita?.accesorio} ancho={86} />
        <div className="min-w-0 pb-2">
          <p className="font-titulo text-lg font-semibold text-white">{perfil.nombre}</p>
          <p className="text-[11px] text-white/50">{perfil.descripcionRol}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {CUIDADOS_DIARIOS.map((c) => {
          const hecho = hechoHoy(c.tipo);
          return (
            <button
              key={c.tipo}
              type="button"
              onClick={(e) => { if (!hecho) confetiDesde(e.currentTarget, "#f9a8d4"); registrar(clave, c.tipo); }}
              className={`group flex flex-col items-center gap-0.5 rounded-xl border py-1.5 text-[10px] font-semibold transition active:scale-95 ${
                hecho ? "border-rosa/50 bg-rosa/15 text-rosa-suave" : "border-noche-600 text-white/50 hover:text-white"
              }`}
            >
              <IconoNeko nombre={hecho ? "check" : c.icono} tamano={18} className="group-hover:animate-meneo" />
              {c.nombre}
            </button>
          );
        })}
      </div>
      {citas.length > 0 && (
        <ul className="mt-2 space-y-1">
          {citas.slice(0, 3).map((ct) => {
            const t = TIPOS_CITA.find((x) => x.tipo === ct.tipo)!;
            const d = diasHasta(ct.fecha);
            return (
              <li key={ct.id} className="flex items-center gap-1.5 text-[11px] text-white/65">
                <button type="button" onClick={() => completar(ct.id)} aria-label="Marcar cita como hecha"
                  className="grid h-5 w-5 place-items-center rounded-full border border-white/30 text-transparent hover:border-rosa hover:text-rosa">
                  <IconoNeko nombre="check" tamano={11} grosor={3} />
                </button>
                <IconoNeko nombre={t.icono} tamano={13} className="text-violeta-suave" />
                <span className="truncate">{t.nombre}{ct.nota ? ` · ${ct.nota}` : ""}</span>
                <span className={`ml-auto shrink-0 ${d <= 2 ? "text-rosa" : ""}`}>
                  {d === 0 ? "hoy" : d === 1 ? "mañana" : d < 0 ? "atrasada" : formatoFechaCorta(ct.fecha)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FormCita({ alGuardar }: { alGuardar: () => void }) {
  const agregar = useNekoStore((s) => s.agregarCita);
  const [gatita, setGatita] = useState<ClaveGatita>("blanquita");
  const [tipo, setTipo] = useState<CitaGatita["tipo"]>("vacuna");
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState("");
  return (
    <form
      className="mb-4 space-y-2.5 rounded-2xl border border-noche-600 bg-noche-900/70 p-3"
      onSubmit={(e) => { e.preventDefault(); agregar({ gatita, tipo, fecha, nota: nota.trim() || undefined }); alGuardar(); }}
    >
      <div className="flex flex-wrap gap-1.5">
        {ORDEN_GATITAS.map((c) => (
          <button key={c} type="button" onClick={() => setGatita(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${gatita === c ? "border-rosa bg-rosa/20 text-white" : "border-noche-600 text-white/55"}`}>
            {PERFILES[c].nombre}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TIPOS_CITA.map((t) => (
          <button key={t.tipo} type="button" onClick={() => setTipo(t.tipo)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tipo === t.tipo ? "border-violeta bg-violeta/20 text-white" : "border-noche-600 text-white/55"}`}>
            <IconoNeko nombre={t.icono} tamano={13} /> {t.nombre}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required
          className="rounded-lg border border-noche-600 bg-noche-800 px-2 py-1.5 text-sm text-white outline-none [color-scheme:dark]" />
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional)"
          className="min-w-0 flex-1 rounded-lg border border-noche-600 bg-noche-800 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30" />
      </div>
      <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-rosa to-violeta py-2 font-titulo font-semibold text-noche">Agendar</button>
    </form>
  );
}

// ─── Tienda de croquetas ────────────────────────────────────────────────
export function PanelTienda() {
  const croquetas = useNekoStore((s) => s.croquetas);
  const comprados = useNekoStore((s) => s.accesoriosComprados);
  const gatitas = useNekoStore((s) => s.gatitas);
  const movimientos = useNekoStore((s) => s.movimientos);
  const comprar = useNekoStore((s) => s.comprarAccesorio);
  const equipar = useNekoStore((s) => s.equiparAccesorio);
  const [para, setPara] = useState<ClaveGatita>("blanquita");
  const [aviso, setAviso] = useState("");

  const accesorioDe = (c: ClaveGatita) => gatitas.find((g) => g.clave === c)?.accesorio;

  return (
    <Panel titulo="Tienda de croquetas" icono="tienda" acento="croqueta"
      accion={<span className="flex items-center gap-1.5 rounded-full bg-croqueta/15 px-3 py-1 font-titulo font-semibold text-croqueta"><IconoNeko nombre="croqueta" tamano={18} />{croquetas}</span>}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {ORDEN_GATITAS.map((c) => (
          <button key={c} type="button" onClick={() => setPara(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${para === c ? "border-croqueta bg-croqueta/20 text-white" : "border-noche-600 text-white/55"}`}>
            {PERFILES[c].nombre}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {CATALOGO_ACCESORIOS.map((a) => {
          const tiene = comprados.includes(a.clave);
          const puesto = accesorioDe(para) === a.clave;
          const alcanza = croquetas >= a.precio;
          return (
            <div key={a.clave} className={`flex flex-col items-center rounded-2xl border p-2 ${puesto ? "border-croqueta/70 bg-croqueta/10" : "border-noche-600 bg-noche-700/50"}`}>
              <Gatita clave={para} pose="sentada" accesorio={a.clave} expresion={puesto ? "feliz" : "normal"} ancho={74} />
              <p className="mt-1 text-center text-xs font-semibold text-white/85">{a.nombre}</p>
              {tiene ? (
                <button type="button" onClick={() => equipar(para, puesto ? undefined : (a.clave as ClaveAccesorio))}
                  className={`mt-1.5 w-full rounded-lg py-1 text-xs font-bold ${puesto ? "bg-noche-600 text-white/70" : "bg-croqueta text-noche"}`}>
                  {puesto ? "Quitar" : "Ponérselo"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!alcanza}
                  onClick={(e) => {
                    if (comprar(a.clave)) { confetiDesde(e.currentTarget, "#e8a85b"); equipar(para, a.clave); setAviso(""); }
                  }}
                  onMouseEnter={() => !alcanza && setAviso(`Te faltan ${a.precio - croquetas} croquetas`)}
                  onMouseLeave={() => setAviso("")}
                  className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-croqueta/50 py-1 text-xs font-bold text-croqueta disabled:opacity-40"
                >
                  <IconoNeko nombre="croqueta" tamano={14} /> {a.precio}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 h-4 text-[11px] text-rosa-suave">{aviso}</p>
      <details className="mt-1 text-xs text-white/50">
        <summary className="cursor-pointer select-none text-white/60">Cómo gano croquetas</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip color="#a78bfa">Tarea 3–10</Chip><Chip color="#f9a8d4">Hábito 3</Chip><Chip color="#e8a85b">Rutina completa +5</Chip>
          <Chip color="#67e8f9">Bebida 1 (máx. 10/día)</Chip><Chip color="#67e8f9">Meta de agua +10</Chip><Chip color="#9cc96b">Pomodoro 4</Chip><Chip color="#f472b6">Cuidar gatitas 2</Chip>
        </div>
        <ul className="mt-2 space-y-0.5">
          {movimientos.slice(0, 6).map((m) => (
            <li key={m.id} className="flex justify-between"><span className="truncate">{m.motivo}</span><span className={m.cantidad > 0 ? "text-croqueta" : "text-white/40"}>{m.cantidad > 0 ? "+" : ""}{m.cantidad}</span></li>
          ))}
        </ul>
      </details>
    </Panel>
  );
}
