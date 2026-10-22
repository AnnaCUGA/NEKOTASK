"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { PERFILES } from "@/components/gatitas/perfiles";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { confetiDesde } from "@/lib/eventos";
import { formatoDuracion, formatoHora, hoyISO, mayusculaInicial } from "@/lib/fechas";
import { ocurrenciasEntre, tituloFecha } from "@/lib/fechasImportantes";
import {
  conectarGoogle, consultarEstadoGoogle, crearEnGoogle, desconectarGoogle, eliminarEnGoogle, ES_VISTA_PREVIA,
  sincronizarRango, type EstadoGoogle,
} from "@/lib/google/cliente";
import type { NombreIcono } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

// ─── Utilidades de fechas ───────────────────────────────────────────────
const DIA_MS = 86_400_000;
const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sumar = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const inicioSemana = (d: Date) => sumar(inicioDia(d), -((d.getDay() + 6) % 7)); // lunes
const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const iso = (d: Date) => hoyISO(d);
const NOMBRE_DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const HORA_INI = 6;
const HORA_FIN = 24;
const PX_HORA = 46;

// ─── Elementos que se dibujan en el calendario ─────────────────────────
type TipoItem = "local" | "google" | "ejemplo" | "tarea" | "cita" | "fecha" | "pomodoro";
interface Item {
  id: string;
  ref: string;
  tipo: TipoItem;
  titulo: string;
  inicio: Date;
  fin: Date;
  todoElDia: boolean;
  hecha?: boolean;
  googleId?: string;
}

const ESTILO: Record<TipoItem, { color: string; nombre: string; icono: NombreIcono }> = {
  local: { color: "#a78bfa", nombre: "Evento", icono: "calendario" },
  google: { color: "#67e8f9", nombre: "Google Calendar", icono: "google" },
  ejemplo: { color: "#8b86a3", nombre: "Ejemplo", icono: "calendario" },
  tarea: { color: "#f472b6", nombre: "Tarea", icono: "tarea" },
  cita: { color: "#e8a85b", nombre: "Cita de gatita", icono: "huella" },
  fecha: { color: "#fbbf24", nombre: "Fecha importante", icono: "regalo" },
  pomodoro: { color: "#9cc96b", nombre: "Pomodoro hecho", icono: "reloj" },
};

const NOMBRE_CITA = { vacuna: "Vacuna", desparasitacion: "Desparasitación", veterinario: "Veterinario", medicamento: "Medicamento" } as const;

function useItems(): Item[] {
  const eventos = useNekoStore((s) => s.eventosCalendario);
  const tareas = useNekoStore((s) => s.tareas);
  const citas = useNekoStore((s) => s.citas);
  const entradas = useNekoStore((s) => s.entradasTiempo);
  const fechas = useNekoStore((s) => s.fechasImportantes);
  return useMemo(() => {
    const lista: Item[] = [];
    eventos.forEach((e) =>
      lista.push({ id: `e-${e.id}`, ref: e.id, tipo: e.origen, titulo: e.titulo, inicio: new Date(e.inicio), fin: new Date(e.fin), todoElDia: !!e.todoElDia, googleId: e.googleId }),
    );
    tareas.filter((t) => t.fechaLimite).forEach((t) => {
      const ini = new Date(t.fechaLimite!);
      lista.push({ id: `t-${t.id}`, ref: t.id, tipo: "tarea", titulo: t.titulo, inicio: ini, fin: new Date(+ini + Math.max(20, t.estimadoMin ?? 30) * 60_000), todoElDia: false, hecha: t.completada });
    });
    citas.forEach((c) => {
      const ini = new Date(`${c.fecha}T00:00:00`);
      lista.push({ id: `c-${c.id}`, ref: c.id, tipo: "cita", titulo: `${NOMBRE_CITA[c.tipo]} · ${PERFILES[c.gatita].nombre}`, inicio: ini, fin: sumar(ini, 1), todoElDia: true, hecha: c.hecha });
    });
    // fechas importantes: de un año atrás a un año adelante
    const hoy = hoyISO();
    const desde = `${Number(hoy.slice(0, 4)) - 1}${hoy.slice(4)}`;
    const hasta = `${Number(hoy.slice(0, 4)) + 1}${hoy.slice(4)}`;
    fechas.forEach((f) =>
      ocurrenciasEntre(f, desde, hasta).forEach((dia) => {
        const ini = new Date(`${dia}T00:00:00`);
        lista.push({ id: `f-${f.id}-${dia}`, ref: f.id, tipo: "fecha", titulo: tituloFecha(f, dia), inicio: ini, fin: sumar(ini, 1), todoElDia: true });
      }),
    );
    entradas.forEach((e) =>
      lista.push({ id: `p-${e.id}`, ref: e.id, tipo: "pomodoro", titulo: tareas.find((t) => t.id === e.tareaId)?.titulo ?? "Enfoque", inicio: new Date(e.inicio), fin: new Date(e.fin), todoElDia: false }),
    );
    return lista;
  }, [eventos, tareas, citas, entradas, fechas]);
}

/** Reparte en carriles los elementos que se enciman en un mismo día */
function acomodar(items: Item[]) {
  const orden = [...items].sort((a, b) => +a.inicio - +b.inicio || +b.fin - +a.fin);
  const res: { item: Item; carril: number; carriles: number }[] = [];
  let grupo: typeof res = [];
  let finGrupo = 0;
  const cerrar = () => {
    const n = Math.max(1, ...grupo.map((g) => g.carril + 1));
    grupo.forEach((g) => (g.carriles = n));
    res.push(...grupo);
    grupo = [];
  };
  for (const item of orden) {
    if (grupo.length && +item.inicio >= finGrupo) cerrar();
    const ocupados = new Set(grupo.filter((g) => +g.item.fin > +item.inicio).map((g) => g.carril));
    let carril = 0;
    while (ocupados.has(carril)) carril++;
    grupo.push({ item, carril, carriles: 1 });
    finGrupo = Math.max(finGrupo, +item.fin);
  }
  if (grupo.length) cerrar();
  return res;
}

// ─── Sección ────────────────────────────────────────────────────────────
export function SeccionCalendario() {
  const [fecha, setFecha] = useState(() => inicioDia(new Date()));
  const [vista, setVista] = useState<"semana" | "dia">("semana");
  const [nuevo, setNuevo] = useState<{ fecha: Date; minutos: number } | null>(null);
  const [detalle, setDetalle] = useState<Item | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);
  const [estado, setEstado] = useState<EstadoGoogle>({ configurado: false, conectado: false });
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null);
  const items = useItems();
  const conectado = useNekoStore((s) => s.googleConectado);
  const setConectado = useNekoStore((s) => s.setGoogleConectado);
  const hayEjemplos = useNekoStore((s) => s.eventosCalendario.some((e) => e.origen === "ejemplo"));
  const quitarEjemplos = useNekoStore((s) => s.quitarEjemplos);

  // en móvil, vista de día por defecto
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setVista("dia");
  }, []);

  const mostrarAviso = useCallback((texto: string, tipo: "ok" | "error" = "ok") => {
    setAviso({ texto, tipo });
    window.setTimeout(() => setAviso(null), 4200);
  }, []);

  // estado de la conexión + regreso del permiso de Google (?google=ok)
  useEffect(() => {
    void consultarEstadoGoogle().then((e) => { setEstado(e); setConectado(e.conectado); });
    const p = new URLSearchParams(window.location.search);
    const r = p.get("google");
    if (r) {
      const textos: Record<string, [string, "ok" | "error"]> = {
        ok: ["Google Calendar conectado. Sincronizando tus eventos…", "ok"],
        cancelado: ["Cancelaste el permiso de Google. Puedes intentarlo cuando quieras.", "error"],
        "sin-permiso": ["Google no entregó permiso permanente. Quita el acceso de NekoTask en tu cuenta de Google y vuelve a conectar.", "error"],
        "sin-configurar": ["Faltan las variables de Google en Vercel (ver README).", "error"],
        error: ["No se pudo conectar con Google. Intenta de nuevo.", "error"],
      };
      const [t, tipo] = textos[r] ?? textos.error;
      mostrarAviso(t, tipo);
      window.history.replaceState(null, "", window.location.pathname + "#calendario");
    }
  }, [mostrarAviso, setConectado]);

  const dias = useMemo(() => {
    if (vista === "dia") return [fecha];
    const ini = inicioSemana(fecha);
    return Array.from({ length: 7 }, (_, i) => sumar(ini, i));
  }, [fecha, vista]);

  const sincronizar = useCallback(async (silencioso = false) => {
    if (!conectado || ES_VISTA_PREVIA) return;
    setSincronizando(true);
    try {
      const ini = sumar(inicioSemana(fecha), -7);
      const n = await sincronizarRango(ini, sumar(ini, 28));
      setUltimaSync(new Date());
      if (!silencioso) mostrarAviso(`${n} eventos sincronizados con Google`);
    } catch (e) {
      mostrarAviso((e as Error).message, "error");
    } finally {
      setSincronizando(false);
    }
  }, [conectado, fecha, mostrarAviso]);

  // sincroniza al abrir, al cambiar de semana y al volver a la pestaña
  useEffect(() => { void sincronizar(true); }, [sincronizar]);
  useEffect(() => {
    const alVolver = () => document.visibilityState === "visible" && void sincronizar(true);
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [sincronizar]);

  const mover = (n: number) => setFecha((f) => sumar(f, vista === "dia" ? n : n * 7));
  const titulo = dias.length === 1
    ? fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
    : `${dias[0].toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${dias[6].toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-4">
      <TarjetaGoogle
        estado={estado}
        conectado={conectado}
        sincronizando={sincronizando}
        ultimaSync={ultimaSync}
        hayEjemplos={hayEjemplos}
        alSincronizar={() => void sincronizar()}
        alQuitarEjemplos={quitarEjemplos}
        alDesconectar={async () => { await desconectarGoogle(); setEstado((e) => ({ ...e, conectado: false })); mostrarAviso("Google Calendar desconectado"); }}
      />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* columna lateral (escritorio) */}
        <aside className="hidden space-y-4 lg:block">
          <MiniMes fecha={fecha} items={items} alElegir={(d) => setFecha(d)} />
          <Proximos items={items} alAbrir={setDetalle} />
          <Leyenda />
        </aside>

        <section className="panel-neko min-w-0 rounded-[22px] border border-noche-600 bg-noche-800/90 p-3 sm:p-4">
          <header className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <BotonIcono icono="izquierda" etiqueta="Anterior" onClick={() => mover(-1)} />
              <button type="button" onClick={() => setFecha(inicioDia(new Date()))}
                className="h-9 rounded-xl border border-noche-600 bg-noche-700 px-3 text-sm font-semibold text-white/80 hover:text-white">Hoy</button>
              <BotonIcono icono="derecha" etiqueta="Siguiente" onClick={() => mover(1)} />
            </div>
            <h2 className="order-first w-full min-w-0 truncate font-titulo text-lg font-semibold text-white sm:order-none sm:w-auto sm:flex-1">{mayusculaInicial(titulo)}</h2>
            <div className="flex rounded-xl border border-noche-600 bg-noche-900/70 p-1 text-xs font-semibold">
              {(["dia", "semana"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setVista(v)}
                  className={`rounded-lg px-3 py-1.5 ${vista === v ? "bg-violeta/25 text-white" : "text-white/50"}`}>
                  {v === "dia" ? "Día" : "Semana"}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setNuevo({ fecha, minutos: Math.max(HORA_INI * 60, Math.min(22 * 60, Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30)) })}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violeta to-rosa px-3 text-sm font-bold text-noche">
              <IconoNeko nombre="mas" tamano={16} grosor={2.6} /> Nuevo
            </button>
          </header>

          {vista === "dia" && <TiraSemana fecha={fecha} items={items} alElegir={setFecha} />}

          <Rejilla dias={dias} items={items} alHueco={(f, m) => setNuevo({ fecha: f, minutos: m })} alAbrir={setDetalle} />
        </section>
      </div>

      <AnimatePresence>
        {nuevo && (
          <Hoja key="nuevo" alCerrar={() => setNuevo(null)}>
            <FormNuevo inicial={nuevo} conectado={conectado && !ES_VISTA_PREVIA}
              alTerminar={(texto, tipo) => { setNuevo(null); if (texto) mostrarAviso(texto, tipo); }} />
          </Hoja>
        )}
        {detalle && (
          <Hoja key="detalle" alCerrar={() => setDetalle(null)}>
            <Detalle item={detalle} alTerminar={(texto, tipo) => { setDetalle(null); if (texto) mostrarAviso(texto, tipo); }} />
          </Hoja>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aviso && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            role="status"
            className={`fixed inset-x-4 bottom-[100px] z-50 mx-auto max-w-md rounded-2xl border px-4 py-3 text-sm font-semibold shadow-neon lg:bottom-8 ${aviso.tipo === "ok" ? "border-cian/40 bg-noche-800 text-cian-suave" : "border-rosa/50 bg-noche-800 text-rosa-suave"}`}>
            {aviso.texto}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Conexión con Google ────────────────────────────────────────────────
function TarjetaGoogle({
  estado, conectado, sincronizando, ultimaSync, hayEjemplos, alSincronizar, alQuitarEjemplos, alDesconectar,
}: {
  estado: EstadoGoogle; conectado: boolean; sincronizando: boolean; ultimaSync: Date | null; hayEjemplos: boolean;
  alSincronizar: () => void; alQuitarEjemplos: () => void; alDesconectar: () => void;
}) {
  let titulo: string;
  let texto: string;
  if (conectado) {
    titulo = "Google Calendar conectado";
    texto = ultimaSync ? `Última sincronización ${formatoHora(ultimaSync.toISOString())}. Lo que crees aquí también aparece en Google.` : "Tus eventos de Google y los de NekoTask se mantienen juntos.";
  } else if (ES_VISTA_PREVIA) {
    titulo = "Conecta tu Google Calendar";
    texto = "En esta vista previa ves eventos de ejemplo. Al desplegar la app en Vercel podrás conectar tu cuenta con un botón (README, paso 3.3).";
  } else if (estado.configurado) {
    titulo = "Conecta tu Google Calendar";
    texto = "Tus eventos aparecerán aquí y en la calculadora de tiempo libre. Lo que crees en NekoTask también se guardará en Google.";
  } else {
    titulo = "Google Calendar aún no está configurado";
    texto = "Agrega GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_COOKIE_SECRET en Vercel y vuelve a desplegar.";
  }
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${conectado ? "bg-cian/15 text-cian" : "bg-violeta/10 text-violeta"}`}>
          <IconoNeko nombre="google" tamano={24} />
        </span>
        <div className="min-w-0">
          <p className="font-titulo font-semibold text-white">{titulo}</p>
          <p className="text-xs leading-relaxed text-white/55">{texto}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {hayEjemplos && (
          <button type="button" onClick={alQuitarEjemplos} className="rounded-xl border border-noche-600 px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">
            Quitar ejemplos
          </button>
        )}
        {conectado ? (
          <>
            <button type="button" onClick={alSincronizar} disabled={sincronizando}
              className="flex items-center gap-1.5 rounded-xl border border-cian/40 bg-cian/10 px-3 py-2 text-xs font-bold text-cian disabled:opacity-60">
              <motion.span animate={sincronizando ? { rotate: 360 } : { rotate: 0 }} transition={sincronizando ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}>
                <IconoNeko nombre="sincronizar" tamano={15} />
              </motion.span>
              {sincronizando ? "Sincronizando…" : "Sincronizar"}
            </button>
            <button type="button" onClick={alDesconectar} className="rounded-xl border border-noche-600 px-3 py-2 text-xs font-semibold text-white/55 hover:text-rosa">Desconectar</button>
          </>
        ) : (
          <button type="button" onClick={conectarGoogle} disabled={ES_VISTA_PREVIA || !estado.configurado}
            className="flex items-center gap-1.5 rounded-xl bg-cian px-3.5 py-2 text-xs font-bold text-noche disabled:cursor-not-allowed disabled:opacity-40">
            <IconoNeko nombre="google" tamano={15} /> Conectar Google Calendar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Rejilla de horas ───────────────────────────────────────────────────
function Rejilla({ dias, items, alHueco, alAbrir }: {
  dias: Date[]; items: Item[]; alHueco: (fecha: Date, minutos: number) => void; alAbrir: (i: Item) => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  // abre mostrando lo primero que pasa ese día (o dos horas antes de ahora)
  const clave = dias.map((d) => +d).join();
  useEffect(() => {
    const primeros = items
      .filter((i) => !i.todoElDia && dias.some((d) => mismoDia(d, i.inicio)))
      .map((i) => i.inicio.getHours());
    const h = Math.max(HORA_INI, Math.min(new Date().getHours() - 2, ...primeros));
    scroll.current?.scrollTo({ top: (h - HORA_INI) * PX_HORA });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const alto = (HORA_FIN - HORA_INI) * PX_HORA;
  const porDia = dias.map((d) => {
    const ini = +d;
    const fin = ini + DIA_MS;
    const delDia = items.filter((i) => +i.inicio < fin && +i.fin > ini);
    return { dia: d, todoElDia: delDia.filter((i) => i.todoElDia), conHora: acomodar(delDia.filter((i) => !i.todoElDia)) };
  });
  const hayTodoElDia = porDia.some((p) => p.todoElDia.length);
  const columnas = `44px repeat(${dias.length}, minmax(${dias.length > 1 ? 92 : 0}px, 1fr))`;

  return (
    <div className="overflow-x-auto rounded-2xl border border-noche-600 bg-noche-900/60">
      <div style={{ minWidth: dias.length > 1 ? 44 + 92 * 7 : undefined }}>
        {/* encabezado de días */}
        {dias.length > 1 && (
          <div className="grid border-b border-noche-600" style={{ gridTemplateColumns: columnas }}>
            <div />
            {dias.map((d) => {
              const hoy = mismoDia(d, new Date());
              return (
                <div key={+d} className="py-2 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{NOMBRE_DIA[d.getDay()]}</p>
                  <p className={`mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full font-titulo text-sm font-semibold ${hoy ? "bg-rosa text-noche" : "text-white/80"}`}>{d.getDate()}</p>
                </div>
              );
            })}
          </div>
        )}
        {/* todo el día */}
        {hayTodoElDia && (
          <div className="grid border-b border-noche-600" style={{ gridTemplateColumns: columnas }}>
            <div className="px-1 py-1.5 text-right text-[9px] font-semibold uppercase leading-tight text-white/35">todo el día</div>
            {porDia.map(({ dia, todoElDia }) => (
              <div key={+dia} className="space-y-1 border-l border-noche-600/70 p-1">
                {todoElDia.map((i) => <Bloque key={i.id} item={i} compacto alAbrir={alAbrir} />)}
              </div>
            ))}
          </div>
        )}
        {/* horas */}
        <div ref={scroll} className="relative max-h-[560px] overflow-y-auto">
          <div className="grid" style={{ gridTemplateColumns: columnas, height: alto }}>
            <div className="relative">
              {Array.from({ length: HORA_FIN - HORA_INI }, (_, h) => (
                <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-white/35" style={{ top: h * PX_HORA }}>
                  {h === 0 ? "" : `${String(HORA_INI + h).padStart(2, "0")}:00`}
                </span>
              ))}
            </div>
            {porDia.map(({ dia, conHora }) => {
              const esHoy = mismoDia(dia, ahora);
              const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
              return (
                <div
                  key={+dia}
                  className="relative cursor-copy border-l border-noche-600/70"
                  style={{ backgroundImage: `repeating-linear-gradient(to bottom, rgba(167,139,250,.09) 0 1px, transparent 1px ${PX_HORA}px)` }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return;
                    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                    const min = HORA_INI * 60 + Math.floor(((y / PX_HORA) * 60) / 30) * 30;
                    alHueco(dia, Math.min(min, 23 * 60 + 30));
                  }}
                  role="presentation"
                >
                  {conHora.map(({ item, carril, carriles }) => {
                    const ini = Math.max(+item.inicio, +dia);
                    const fin = Math.min(+item.fin, +dia + DIA_MS);
                    const minIni = (ini - +dia) / 60_000;
                    const minFin = (fin - +dia) / 60_000;
                    const top = Math.max(0, ((minIni - HORA_INI * 60) / 60) * PX_HORA);
                    const h = Math.max(20, ((minFin - Math.max(minIni, HORA_INI * 60)) / 60) * PX_HORA - 2);
                    if (minFin <= HORA_INI * 60) return null;
                    return (
                      <div key={item.id} className="absolute px-0.5" style={{ top, height: h, left: `${(carril / carriles) * 100}%`, width: `${100 / carriles}%` }}>
                        <Bloque item={item} alAbrir={alAbrir} alto={h} />
                      </div>
                    );
                  })}
                  {esHoy && minAhora >= HORA_INI * 60 && (
                    <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((minAhora - HORA_INI * 60) / 60) * PX_HORA }}>
                      <span className="-ml-1 text-rosa"><IconoNeko nombre="huella" tamano={12} grosor={2.4} /></span>
                      <span className="h-[2px] flex-1 bg-rosa shadow-[0_0_8px_#f472b6]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bloque({ item, alAbrir, compacto, alto = 40 }: { item: Item; alAbrir: (i: Item) => void; compacto?: boolean; alto?: number }) {
  const e = ESTILO[item.tipo];
  const discontinuo = item.tipo === "ejemplo" || item.tipo === "pomodoro";
  return (
    <button
      type="button"
      onClick={(ev) => { ev.stopPropagation(); alAbrir(item); }}
      className={`group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-lg px-1.5 py-1 text-left transition hover:brightness-125 ${item.hecha ? "opacity-50" : ""}`}
      style={{
        background: `${e.color}${item.tipo === "pomodoro" ? "1a" : "26"}`,
        boxShadow: `inset 3px 0 0 ${e.color}`,
        border: discontinuo ? `1px dashed ${e.color}66` : undefined,
        color: e.color,
      }}
      title={`${e.nombre}: ${item.titulo}`}
    >
      <span className={`flex min-w-0 items-center gap-1 text-[11px] font-bold leading-tight text-white/90 ${item.hecha ? "line-through" : ""}`}>
        <span className="shrink-0" style={{ color: e.color }}><IconoNeko nombre={item.hecha ? "check" : e.icono} tamano={11} grosor={2.4} /></span>
        <span className="truncate">{item.titulo}</span>
      </span>
      {!compacto && alto > 34 && (
        <span className="mt-0.5 truncate text-[10px] text-white/50">{formatoHora(item.inicio.toISOString())} – {formatoHora(item.fin.toISOString())}</span>
      )}
    </button>
  );
}

// ─── Barra lateral ──────────────────────────────────────────────────────
function MiniMes({ fecha, items, alElegir }: { fecha: Date; items: Item[]; alElegir: (d: Date) => void }) {
  const [mes, setMes] = useState(() => new Date(fecha.getFullYear(), fecha.getMonth(), 1));
  useEffect(() => setMes(new Date(fecha.getFullYear(), fecha.getMonth(), 1)), [fecha]);
  const inicio = inicioSemana(mes);
  const celdas = Array.from({ length: 42 }, (_, i) => sumar(inicio, i));
  const conItems = new Set(items.map((i) => iso(i.inicio)));
  return (
    <div className="rounded-[22px] border border-noche-600 bg-noche-800/90 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} className="p-1 text-white/50 hover:text-white"><IconoNeko nombre="izquierda" tamano={16} /></button>
        <p className="font-titulo text-sm font-semibold text-white">{mayusculaInicial(mes.toLocaleDateString("es-MX", { month: "long", year: "numeric" }))}</p>
        <button type="button" aria-label="Mes siguiente" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} className="p-1 text-white/50 hover:text-white"><IconoNeko nombre="derecha" tamano={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="text-[10px] font-bold text-white/35">{d}</span>)}
        {celdas.map((d) => {
          const fuera = d.getMonth() !== mes.getMonth();
          const sel = mismoDia(d, fecha);
          const hoy = mismoDia(d, new Date());
          return (
            <button key={+d} type="button" onClick={() => alElegir(d)}
              className={`relative mx-auto grid h-7 w-7 place-items-center rounded-full text-xs tabular-nums transition ${sel ? "bg-violeta font-bold text-noche" : hoy ? "text-rosa font-bold" : fuera ? "text-white/25" : "text-white/75 hover:bg-noche-600"}`}>
              {d.getDate()}
              {conItems.has(iso(d)) && !sel && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-cian" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Proximos({ items, alAbrir }: { items: Item[]; alAbrir: (i: Item) => void }) {
  const ahora = Date.now();
  const lista = items.filter((i) => +i.fin > ahora && !i.hecha && i.tipo !== "pomodoro").sort((a, b) => +a.inicio - +b.inicio).slice(0, 6);
  return (
    <div className="rounded-[22px] border border-noche-600 bg-noche-800/90 p-3">
      <div className="mb-2 flex items-end gap-2">
        <p className="flex-1 font-titulo text-sm font-semibold text-white">Lo que viene</p>
        <Gatita clave="mango" pose="echada" ancho={64} />
      </div>
      {lista.length === 0 && <p className="text-xs text-white/45">Nada pendiente en tu calendario.</p>}
      <ul className="space-y-1.5">
        {lista.map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => alAbrir(i)} className="flex w-full items-center gap-2 rounded-xl px-1.5 py-1 text-left hover:bg-noche-700">
              <span className="h-7 w-1 shrink-0 rounded-full" style={{ background: ESTILO[i.tipo].color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white/85">{i.titulo}</span>
                <span className="block text-[10px] text-white/45">
                  {mayusculaInicial(i.inicio.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" }))}{i.todoElDia ? "" : ` · ${formatoHora(i.inicio.toISOString())}`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Leyenda() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 text-[11px] text-white/55">
      {(Object.keys(ESTILO) as TipoItem[]).map((t) => (
        <span key={t} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: ESTILO[t].color }} />{ESTILO[t].nombre}</span>
      ))}
    </div>
  );
}

function TiraSemana({ fecha, items, alElegir }: { fecha: Date; items: Item[]; alElegir: (d: Date) => void }) {
  const ini = inicioSemana(fecha);
  const conItems = new Set(items.map((i) => iso(i.inicio)));
  return (
    <div className="mb-3 grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }, (_, i) => sumar(ini, i)).map((d) => {
        const sel = mismoDia(d, fecha);
        return (
          <button key={+d} type="button" onClick={() => alElegir(d)}
            className={`relative flex flex-col items-center rounded-xl py-1.5 transition ${sel ? "bg-violeta text-noche" : "bg-noche-700/60 text-white/70"}`}>
            <span className="text-[10px] font-bold uppercase">{NOMBRE_DIA[d.getDay()]}</span>
            <span className={`font-titulo text-base font-semibold ${!sel && mismoDia(d, new Date()) ? "text-rosa" : ""}`}>{d.getDate()}</span>
            {conItems.has(iso(d)) && <span className={`h-1 w-1 rounded-full ${sel ? "bg-noche" : "bg-cian"}`} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Hojas (crear / ver) ────────────────────────────────────────────────
function Hoja({ children, alCerrar }: { children: React.ReactNode; alCerrar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [alCerrar]);
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={alCerrar} />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[85vh] max-w-lg overflow-y-auto rounded-[22px] border border-noche-600 bg-noche-800 p-4 shadow-neon sm:bottom-auto sm:top-[12vh]"
      >
        {children}
      </motion.div>
    </>
  );
}

const aHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const combinar = (fecha: string, hhmm: string) => new Date(`${fecha}T${hhmm}:00`);

function FormNuevo({ inicial, conectado, alTerminar }: {
  inicial: { fecha: Date; minutos: number }; conectado: boolean; alTerminar: (texto?: string, tipo?: "ok" | "error") => void;
}) {
  const agregarEvento = useNekoStore((s) => s.agregarEvento);
  const agregarTarea = useNekoStore((s) => s.agregarTarea);
  const [tipo, setTipo] = useState<"evento" | "tarea">("evento");
  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState(iso(inicial.fecha));
  const [hIni, setHIni] = useState(aHHMM(inicial.minutos));
  const [hFin, setHFin] = useState(aHHMM(Math.min(inicial.minutos + 60, 23 * 60 + 59)));
  const [todoElDia, setTodoElDia] = useState(false);
  const [duracion, setDuracion] = useState("30");
  const [descripcion, setDescripcion] = useState("");
  const [enGoogle, setEnGoogle] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!titulo.trim()) { setError("Escribe un título"); return; }
    if (tipo === "tarea") {
      agregarTarea({ titulo, prioridad: "media", etiquetas: [], fechaLimite: combinar(dia, hIni).toISOString(), estimadoMin: parseInt(duracion, 10) || 30 });
      alTerminar("Tarea agendada");
      return;
    }
    const inicio = todoElDia ? new Date(`${dia}T00:00:00`) : combinar(dia, hIni);
    const fin = todoElDia ? sumar(inicio, 1) : combinar(dia, hFin);
    if (+fin <= +inicio) { setError("La hora de fin debe ser después del inicio"); return; }
    const base = { titulo: titulo.trim(), inicio: inicio.toISOString(), fin: fin.toISOString(), todoElDia, descripcion: descripcion.trim() || undefined };
    if (conectado && enGoogle) {
      setGuardando(true);
      try {
        const creado = await crearEnGoogle(base);
        agregarEvento({ ...creado, origen: "google" });
        alTerminar("Evento guardado en NekoTask y en Google Calendar");
      } catch (e) {
        agregarEvento({ ...base, origen: "local" });
        alTerminar(`Se guardó solo en NekoTask: ${(e as Error).message}`, "error");
      }
      return;
    }
    agregarEvento({ ...base, origen: "local" });
    alTerminar("Evento guardado");
  };

  const campo = "w-full rounded-xl border border-noche-600 bg-noche-900 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-violeta/60";
  return (
    <form onSubmit={guardar} className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-titulo text-lg font-semibold text-white">Agendar</p>
        <div className="flex rounded-xl border border-noche-600 bg-noche-900/70 p-1 text-xs font-semibold">
          {(["evento", "tarea"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)} className={`rounded-lg px-3 py-1.5 capitalize ${tipo === t ? "bg-violeta/25 text-white" : "text-white/50"}`}>{t}</button>
          ))}
        </div>
      </div>
      <input id="cal-titulo" autoFocus value={titulo} onChange={(e) => { setTitulo(e.target.value); setError(""); }}
        placeholder={tipo === "evento" ? "Junta, cita, clase…" : "¿Qué tarea quieres agendar?"} className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 text-[11px] text-white/50 sm:col-span-1">Día
          <input id="cal-dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={`${campo} mt-0.5`} required />
        </label>
        {tipo === "evento" && (
          <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-sm text-white/75 sm:col-span-1">
            <input id="cal-todo" type="checkbox" checked={todoElDia} onChange={(e) => setTodoElDia(e.target.checked)} className="h-4 w-4 accent-violeta" /> Todo el día
          </label>
        )}
        {!todoElDia && (
          <label className="text-[11px] text-white/50">{tipo === "evento" ? "Empieza" : "Hora"}
            <input id="cal-ini" type="time" value={hIni} onChange={(e) => setHIni(e.target.value)} className={`${campo} mt-0.5`} />
          </label>
        )}
        {tipo === "evento" && !todoElDia && (
          <label className="text-[11px] text-white/50">Termina
            <input id="cal-fin" type="time" value={hFin} onChange={(e) => setHFin(e.target.value)} className={`${campo} mt-0.5`} />
          </label>
        )}
        {tipo === "tarea" && (
          <label className="text-[11px] text-white/50">Duración (min)
            <input id="cal-dur" inputMode="numeric" value={duracion} onChange={(e) => setDuracion(e.target.value.replace(/\D/g, ""))} className={`${campo} mt-0.5`} />
          </label>
        )}
      </div>
      {tipo === "evento" && (
        <textarea id="cal-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} placeholder="Notas (opcional)" className={`${campo} resize-none`} />
      )}
      {tipo === "evento" && conectado && (
        <label className="flex items-center gap-2 text-sm text-cian-suave">
          <input id="cal-google" type="checkbox" checked={enGoogle} onChange={(e) => setEnGoogle(e.target.checked)} className="h-4 w-4 accent-cian" /> Guardar también en Google Calendar
        </label>
      )}
      {error && <p className="text-xs text-rosa">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => alTerminar()} className="flex-1 rounded-xl border border-noche-600 py-2 text-sm font-semibold text-white/70">Cancelar</button>
        <button type="submit" disabled={guardando} className="flex-1 rounded-xl bg-gradient-to-r from-violeta to-rosa py-2 font-titulo font-semibold text-noche disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function Detalle({ item, alTerminar }: { item: Item; alTerminar: (texto?: string, tipo?: "ok" | "error") => void }) {
  const eliminarEvento = useNekoStore((s) => s.eliminarEvento);
  const alternarTarea = useNekoStore((s) => s.alternarTarea);
  const completarCita = useNekoStore((s) => s.completarCita);
  const evento = useNekoStore((s) => s.eventosCalendario.find((e) => e.id === item.ref));
  const tarea = useNekoStore((s) => s.tareas.find((t) => t.id === item.ref));
  const [confirmar, setConfirmar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const e = ESTILO[item.tipo];
  const duracionMin = (+item.fin - +item.inicio) / 60_000;

  const borrar = async () => {
    if (!confirmar) { setConfirmar(true); return; }
    if (item.tipo === "google" && item.googleId) {
      setTrabajando(true);
      try {
        await eliminarEnGoogle(item.googleId);
      } catch (err) {
        setTrabajando(false);
        alTerminar((err as Error).message, "error");
        return;
      }
    }
    eliminarEvento(item.ref);
    alTerminar(item.tipo === "google" ? "Evento eliminado de Google Calendar" : "Evento eliminado");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${e.color}22`, color: e.color }}>
          <IconoNeko nombre={e.icono} tamano={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: e.color }}>{e.nombre}</p>
          <p className="font-titulo text-lg font-semibold leading-snug text-white">{item.titulo}</p>
          <p className="mt-0.5 text-sm text-white/60">
            {mayusculaInicial(item.inicio.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }))}
            {!item.todoElDia && ` · ${formatoHora(item.inicio.toISOString())} – ${formatoHora(item.fin.toISOString())} (${formatoDuracion(duracionMin)})`}
          </p>
        </div>
        <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={() => alTerminar()} />
      </div>
      {evento?.descripcion && <p className="whitespace-pre-wrap rounded-xl bg-noche-900/70 p-3 text-sm text-white/70">{evento.descripcion}</p>}
      {item.tipo === "ejemplo" && <p className="text-xs text-white/45">Es un evento de ejemplo. Desaparece al conectar Google Calendar o con "Quitar ejemplos".</p>}
      {item.tipo === "fecha" && <p className="text-xs text-white/45">La editas en Organizar → Fechas.</p>}
      {item.tipo === "pomodoro" && <p className="text-xs text-white/45">Bloque de enfoque que hiciste con Mango.</p>}

      <div className="flex flex-wrap gap-2">
        {item.tipo === "tarea" && tarea && (
          <button type="button" onClick={(ev) => { if (!tarea.completada) confetiDesde(ev.currentTarget); alternarTarea(tarea.id); alTerminar(tarea.completada ? "Tarea reabierta" : "¡Tarea completada!"); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rosa py-2 text-sm font-bold text-noche">
            <IconoNeko nombre="check" tamano={16} grosor={2.6} /> {tarea.completada ? "Reabrir" : "Completar"}
          </button>
        )}
        {item.tipo === "cita" && (
          <button type="button" onClick={() => { completarCita(item.ref); alTerminar(item.hecha ? "Cita pendiente otra vez" : "Cita marcada como hecha"); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-croqueta py-2 text-sm font-bold text-noche">
            <IconoNeko nombre="check" tamano={16} grosor={2.6} /> {item.hecha ? "Marcar pendiente" : "Marcar como hecha"}
          </button>
        )}
        {(item.tipo === "local" || item.tipo === "google" || item.tipo === "ejemplo") && (
          <button type="button" onClick={borrar} disabled={trabajando}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-bold ${confirmar ? "border-rosa bg-rosa/20 text-rosa" : "border-noche-600 text-white/70"}`}>
            <IconoNeko nombre="basura" tamano={16} />
            {trabajando ? "Eliminando…" : confirmar ? (item.tipo === "google" ? "Sí, borrar también de Google" : "Sí, eliminar") : "Eliminar"}
          </button>
        )}
      </div>
    </div>
  );
}
