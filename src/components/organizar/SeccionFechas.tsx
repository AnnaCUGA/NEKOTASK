"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { Hoja, campo } from "@/components/ui/Hoja";
import { hoyISO } from "@/lib/fechas";
import { TIPOS_FECHA, diasParaFecha, proximaOcurrencia, textoCuenta, tituloFecha } from "@/lib/fechasImportantes";
import type { FechaImportante, TipoFecha } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

const fechaLarga = (iso: string, conAnio = false) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", ...(conAnio ? { year: "numeric" } : {}) });
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long" });

function useOrdenadas() {
  const fechas = useNekoStore((s) => s.fechasImportantes);
  return useMemo(() => {
    const hoy = hoyISO();
    return fechas
      .map((f) => ({ f, dias: diasParaFecha(f, hoy), proxima: proximaOcurrencia(f, hoy), titulo: tituloFecha(f, hoy) }))
      .sort((a, b) => (a.dias < 0 ? 1 : 0) - (b.dias < 0 ? 1 : 0) || Math.abs(a.dias) - Math.abs(b.dias));
  }, [fechas]);
}

export function SeccionFechas() {
  const ordenadas = useOrdenadas();
  const [editar, setEditar] = useState<FechaImportante | "nueva" | null>(null);
  const pronto = ordenadas.filter((x) => x.dias >= 0 && x.dias <= 30);
  const despues = ordenadas.filter((x) => x.dias > 30);
  const pasadas = ordenadas.filter((x) => x.dias < 0);

  const Tarjeta = (x: (typeof ordenadas)[number]) => {
    const t = TIPOS_FECHA[x.f.tipo];
    const hoy = x.dias === 0;
    return (
      <motion.button key={x.f.id} type="button" onClick={() => setEditar(x.f)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className={`panel-neko relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border bg-noche-800/90 p-3 text-left transition hover:border-violeta/40 ${hoy ? "" : "border-noche-600"}`}
        style={hoy ? { borderColor: `${t.color}aa`, boxShadow: `0 0 24px -8px ${t.color}` } : undefined}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: `${t.color}1f`, color: t.color }}>
          <IconoNeko nombre={t.icono} tamano={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-titulo font-semibold text-white">{x.titulo}</span>
          <span className="block truncate text-xs text-white/50">{t.nombre} · {x.dias >= 0 ? `${diaSemana(x.proxima)} ${fechaLarga(x.proxima)}` : fechaLarga(x.proxima, true)}</span>
        </span>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: x.dias < 0 ? "#8b86a3" : t.color, background: x.dias < 0 ? "#8b86a31f" : `${t.color}1f` }}>
          {textoCuenta(x.dias)}
        </span>
        {hoy && x.f.tipo === "cumpleanos" && <span className="absolute -bottom-3 right-20 hidden sm:block"><Gatita clave="bizca" pose="sentada" expresion="feliz" ancho={52} /></span>}
      </motion.button>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <h2 className="font-titulo text-xl font-semibold">Fechas importantes</h2>
          <p className="text-sm text-white/50">Cumpleaños, aniversarios y vencimientos. Te aviso antes y aparecen en tu calendario.</p>
        </div>
        <button type="button" onClick={() => setEditar("nueva")}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violeta to-rosa px-4 py-2.5 font-titulo text-sm font-semibold text-noche">
          <IconoNeko nombre="mas" tamano={17} grosor={2.6} /> Agregar
        </button>
      </div>

      {ordenadas.length === 0 && (
        <div className="rounded-[22px] border border-dashed border-noche-600 bg-noche-800/60 p-6 text-center">
          <div className="flex justify-center"><Gatita clave="bizca" pose="sentada" ancho={110} /></div>
          <p className="mt-2 font-titulo font-semibold">Ninguna fecha todavía</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/55">Agrega el cumpleaños de alguien, tu aniversario o cuándo vence tu licencia o pasaporte.</p>
        </div>
      )}

      {pronto.length > 0 && <Grupo titulo="Este mes">{pronto.map(Tarjeta)}</Grupo>}
      {despues.length > 0 && <Grupo titulo="Más adelante">{despues.map(Tarjeta)}</Grupo>}
      {pasadas.length > 0 && <Grupo titulo="Ya pasaron">{pasadas.map(Tarjeta)}</Grupo>}

      <AnimatePresence>
        {editar && <EditorFecha fecha={editar === "nueva" ? null : editar} alCerrar={() => setEditar(null)} />}
      </AnimatePresence>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{titulo}</p>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Tarjetita para la pantalla Hoy: solo aparece si hay algo en las próximas 2 semanas */
export function ProximasFechas({ alVerTodas }: { alVerTodas: () => void }) {
  const ordenadas = useOrdenadas().filter((x) => x.dias >= 0 && x.dias <= 14).slice(0, 3);
  if (!ordenadas.length) return null;
  return (
    <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-4">
      <header className="mb-2 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-rosa/10 text-rosa"><IconoNeko nombre="regalo" tamano={20} /></span>
        <h2 className="flex-1 font-titulo text-[1.05rem] font-semibold text-white/90">Fechas que vienen</h2>
        <button type="button" onClick={alVerTodas} className="text-xs font-semibold text-white/50 hover:text-white">Ver todas</button>
      </header>
      <ul className="space-y-1">
        {ordenadas.map((x) => {
          const t = TIPOS_FECHA[x.f.tipo];
          return (
            <li key={x.f.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
              <span className="shrink-0" style={{ color: t.color }}><IconoNeko nombre={t.icono} tamano={18} titulo={t.nombre} /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">{x.titulo}</span>
              <span className="shrink-0 text-xs font-bold" style={{ color: t.color }}>{textoCuenta(x.dias)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const AVISOS = [
  { dias: 0, nombre: "Ese día" },
  { dias: 1, nombre: "1 día antes" },
  { dias: 3, nombre: "3 días antes" },
  { dias: 7, nombre: "1 semana antes" },
  { dias: 14, nombre: "2 semanas antes" },
];

function EditorFecha({ fecha, alCerrar }: { fecha: FechaImportante | null; alCerrar: () => void }) {
  const agregar = useNekoStore((s) => s.agregarFecha);
  const actualizar = useNekoStore((s) => s.actualizarFecha);
  const eliminar = useNekoStore((s) => s.eliminarFecha);
  const [titulo, setTitulo] = useState(fecha?.titulo ?? "");
  const [tipo, setTipo] = useState<TipoFecha>(fecha?.tipo ?? "cumpleanos");
  const [dia, setDia] = useState(fecha?.fecha ?? hoyISO());
  const [cadaAnio, setCadaAnio] = useState(fecha?.cadaAnio ?? true);
  const [conAnio, setConAnio] = useState(fecha?.conAnio ?? true);
  const [avisar, setAvisar] = useState(fecha?.avisarDiasAntes ?? 3);
  const [nota, setNota] = useState(fecha?.nota ?? "");
  const [confirmar, setConfirmar] = useState(false);

  const cambiarTipo = (t: TipoFecha) => {
    setTipo(t);
    if (!fecha) {
      setCadaAnio(t !== "vencimiento");
      setAvisar(t === "vencimiento" ? 14 : 3);
    }
  };
  const ejemplo = { cumpleanos: "Cumpleaños de mamá", aniversario: "Aniversario", vencimiento: "Vence mi pasaporte", otro: "Día de…" }[tipo];
  const anual = tipo === "cumpleanos" || tipo === "aniversario";

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !dia) return;
    const datos = { titulo: titulo.trim(), tipo, fecha: dia, cadaAnio, conAnio: cadaAnio && anual && conAnio, avisarDiasAntes: avisar, ...(nota.trim() ? { nota: nota.trim() } : { nota: undefined }) };
    if (fecha) actualizar(fecha.id, datos);
    else agregar(datos);
    alCerrar();
  };

  return (
    <Hoja alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${TIPOS_FECHA[tipo].color}1f`, color: TIPOS_FECHA[tipo].color }}>
            <IconoNeko nombre={TIPOS_FECHA[tipo].icono} tamano={22} />
          </span>
          <p className="flex-1 font-titulo text-lg font-semibold">{fecha ? "Editar fecha" : "Nueva fecha"}</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={alCerrar} />
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {(Object.keys(TIPOS_FECHA) as TipoFecha[]).map((t) => (
            <button key={t} type="button" onClick={() => cambiarTipo(t)} aria-pressed={tipo === t}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition ${tipo === t ? "bg-noche-700 text-white" : "border-noche-600 text-white/55"}`}
              style={tipo === t ? { borderColor: TIPOS_FECHA[t].color } : undefined}>
              <span style={{ color: TIPOS_FECHA[t].color }}><IconoNeko nombre={TIPOS_FECHA[t].icono} tamano={16} /></span> {TIPOS_FECHA[t].nombre}
            </button>
          ))}
        </div>

        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={ejemplo} className={campo} autoFocus={!fecha} />

        <div>
          <label htmlFor="fecha-dia" className="mb-1 block text-xs font-semibold text-white/55">
            {anual ? "Fecha (si no sabes el año, pon cualquiera y desactiva “Sé el año”)" : "Fecha"}
          </label>
          <input id="fecha-dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={campo} />
        </div>

        <div className="space-y-2 rounded-xl border border-noche-600 bg-noche-900/50 p-3">
          <Interruptor etiqueta="Se repite cada año" valor={cadaAnio} alCambiar={setCadaAnio} />
          {anual && cadaAnio && <Interruptor etiqueta={tipo === "cumpleanos" ? "Sé el año (para saber cuántos cumple)" : "Sé el año (para contar cuántos van)"} valor={conAnio} alCambiar={setConAnio} />}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/55">Avisarme</p>
          <div className="flex flex-wrap gap-1.5">
            {AVISOS.map((a) => (
              <button key={a.dias} type="button" onClick={() => setAvisar(a.dias)} aria-pressed={avisar === a.dias}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${avisar === a.dias ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 text-white/55"}`}>
                {a.nombre}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-white/40">Siempre te aviso también el mismo día.</p>
        </div>

        <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota opcional: ideas de regalo, dónde renovar…" rows={2} className={`${campo} resize-none`} />

        <div className="flex gap-2 pt-1">
          {fecha && (
            <button type="button" onClick={() => { if (!confirmar) return setConfirmar(true); eliminar(fecha.id); alCerrar(); }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
              <IconoNeko nombre="basura" tamano={16} /> {confirmar ? "Sí, borrar" : "Borrar"}
            </button>
          )}
          <button type="submit" disabled={!titulo.trim() || !dia} className="flex-1 rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche disabled:opacity-40">
            {fecha ? "Guardar" : "Agregar fecha"}
          </button>
        </div>
      </form>
    </Hoja>
  );
}

function Interruptor({ etiqueta, valor, alCambiar }: { etiqueta: string; valor: boolean; alCambiar: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={valor} onClick={() => alCambiar(!valor)} className="flex w-full items-center gap-3 text-left">
      <span className="flex-1 text-sm text-white/80">{etiqueta}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${valor ? "bg-violeta" : "bg-noche-600"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${valor ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
