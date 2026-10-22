"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { HojaAjustes } from "@/components/ajustes/HojaAjustes";
import { AvisosGatitas } from "@/components/cuenta/AvisosGatitas";
import { PantallaEntrada } from "@/components/cuenta/PantallaEntrada";
import { useCuenta } from "@/lib/cuenta/useCuenta";
import { iniciarPWA } from "@/lib/pwa/pwa";
import { useRecordatoriosEnApp } from "@/lib/recordatorios/enApp";
import { ConfetiHuellitas } from "@/components/efectos/ConfetiHuellitas";
import { EscenaGatitas } from "@/components/gatitas/EscenaGatitas";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { confetiDesde } from "@/lib/eventos";
import type { NombreIcono } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";
import { Encabezado } from "./Encabezado";
import { PanelGatitas, PanelTienda } from "./PanelGatitas";
import { PanelHabitos } from "./PanelHabitos";
import { PanelHidratacion } from "./PanelHidratacion";
import { FormTarea, PanelTareas } from "./PanelTareas";
import { PanelPomodoro, PanelTiempoLibre } from "./PanelTiempo";
import { SeccionAsistente } from "@/components/asistente/SeccionAsistente";
import { BurbujaBlanquita } from "@/components/asistente/BurbujaBlanquita";
import { SeccionCalendario } from "@/components/calendario/SeccionCalendario";
import { Gatita } from "@/components/gatitas/Gatita";
import { SeccionNotas } from "@/components/organizar/SeccionNotas";
import { SeccionListas } from "@/components/organizar/SeccionListas";
import { ProximasFechas, SeccionFechas } from "@/components/organizar/SeccionFechas";
import { SeccionCiclo } from "@/components/bienestar/SeccionCiclo";
import { AnfitrionDinero, useUIDinero } from "@/components/dinero/HojaMovimiento";
import { ResumenDinero } from "@/components/dinero/ResumenDinero";
import { Movimientos, Presupuesto, Suscripciones } from "@/components/dinero/GestionDinero";

export type Pantalla =
  | "hoy" | "tareas" | "calendario" | "notas" | "listas" | "fechas"
  | "habitos" | "agua" | "ciclo" | "dinero" | "movimientos" | "presupuesto" | "suscripciones" | "gatitas" | "asistente";
type Grupo = "hoy" | "organizar" | "bienestar" | "dinero" | "gatitas";

const PANTALLAS: Record<Pantalla, { nombre: string; icono: NombreIcono; grupo: Grupo | null }> = {
  hoy: { nombre: "Hoy", icono: "casa", grupo: "hoy" },
  tareas: { nombre: "Tareas", icono: "tarea", grupo: "organizar" },
  calendario: { nombre: "Calendario", icono: "calendario", grupo: "organizar" },
  notas: { nombre: "Notas", icono: "nota", grupo: "organizar" },
  listas: { nombre: "Listas", icono: "lista", grupo: "organizar" },
  fechas: { nombre: "Fechas", icono: "regalo", grupo: "organizar" },
  habitos: { nombre: "Hábitos", icono: "racha", grupo: "bienestar" },
  agua: { nombre: "Agua", icono: "agua", grupo: "bienestar" },
  ciclo: { nombre: "Ciclo", icono: "flor", grupo: "bienestar" },
  dinero: { nombre: "Resumen", icono: "grafica", grupo: "dinero" },
  movimientos: { nombre: "Movimientos", icono: "lista", grupo: "dinero" },
  presupuesto: { nombre: "Presupuesto", icono: "dinero", grupo: "dinero" },
  suscripciones: { nombre: "Suscripciones", icono: "sincronizar", grupo: "dinero" },
  gatitas: { nombre: "Gatitas", icono: "huella", grupo: "gatitas" },
  asistente: { nombre: "Blanquita IA", icono: "chispa", grupo: null },
};

const GRUPOS: { id: Grupo; nombre: string; icono: NombreIcono; pantallas: Pantalla[] }[] = [
  { id: "hoy", nombre: "Hoy", icono: "casa", pantallas: ["hoy"] },
  { id: "organizar", nombre: "Organizar", icono: "carpeta", pantallas: ["tareas", "calendario", "notas", "listas", "fechas"] },
  { id: "bienestar", nombre: "Bienestar", icono: "bienestar", pantallas: ["habitos", "agua", "ciclo"] },
  { id: "dinero", nombre: "Dinero", icono: "dinero", pantallas: ["dinero", "movimientos", "presupuesto", "suscripciones"] },
  { id: "gatitas", nombre: "Gatitas", icono: "huella", pantallas: ["gatitas"] },
];

const esPantalla = (x: string | null): x is Pantalla => !!x && x in PANTALLAS;

function pantallaInicial(): Pantalla {
  const pedida = new URLSearchParams(window.location.search).get("seccion") ?? window.location.hash.slice(1);
  return esPantalla(pedida) ? pedida : "hoy";
}

/**
 * Dashboard responsivo, organizado por áreas:
 *  - Móvil: barra inferior Hoy · Organizar · Bienestar · Dinero · Gatitas, con subpestañas
 *    arriba, y la burbuja de Blanquita flotando en la esquina.
 *  - Escritorio (lg+): barra lateral con todo visible.
 */
export function Dashboard() {
  const [pantalla, setPantalla] = useState<Pantalla>("hoy");
  const [ultimaDe, setUltimaDe] = useState<Partial<Record<Grupo, Pantalla>>>({});
  const [listo, setListo] = useState(false);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [capturaAbierta, setCapturaAbierta] = useState(false);
  const cuenta = useCuenta();
  const { avisos, cerrar } = useRecordatoriosEnApp();

  const irA = useCallback((p: Pantalla) => {
    setPantalla(p);
    const g = PANTALLAS[p].grupo;
    if (g) setUltimaDe((u) => ({ ...u, [g]: p }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /** Abre una sección o ejecuta un acceso directo: /?seccion=…, /?accion=agua&ml=250, /?accion=tarea */
  const navegar = useCallback((url: string) => {
    const u = new URL(url, window.location.origin);
    const sec = u.searchParams.get("seccion") ?? u.hash.slice(1);
    if (esPantalla(sec)) irA(sec);
    const accion = u.searchParams.get("accion");
    if (accion === "agua") {
      const ml = Math.min(1000, Math.max(50, parseInt(u.searchParams.get("ml") ?? "250", 10) || 250));
      useNekoStore.getState().registrarBebida("agua", ml);
      irA("hoy");
    }
    if (accion === "tarea") setCapturaAbierta(true);
    if (accion === "gasto") useUIDinero.getState().abrir("gasto");
  }, [irA]);

  // Evita parpadeos de hidratación: el estado viene de localStorage
  useEffect(() => {
    setPantalla(pantallaInicial());
    setListo(true);
    cuenta.iniciar();
    void iniciarPWA(navegar);
    const q = new URLSearchParams(window.location.search);
    const pedida = window.location.href;
    if (q.get("accion")) {
      // espera a que las gatitas estén en escena para que reaccionen
      window.setTimeout(() => navegar(pedida), 900);
    }
    if (q.has("accion") || q.has("origen")) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navegar]);

  if (!listo || (cuenta.configurado && !cuenta.listo)) return <div className="min-h-screen bg-noche" />;
  if (cuenta.configurado && !cuenta.sesion && !cuenta.soloLocal) return <PantallaEntrada />;

  const grupo = PANTALLAS[pantalla].grupo;
  const infoGrupo = GRUPOS.find((g) => g.id === grupo);

  return (
    <div className="fondo-neko min-h-screen text-white">
      <ConfetiHuellitas />
      <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
        <Encabezado alAbrirAjustes={() => setAjustesAbiertos(true)} />

        <div className="mt-4 lg:grid lg:grid-cols-[212px_minmax(0,1fr)] lg:gap-5">
          <BarraLateral pantalla={pantalla} alCambiar={irA} />

          <main className="min-w-0">
            {infoGrupo && infoGrupo.pantallas.length > 1 && (
              <SubPestanas pantallas={infoGrupo.pantallas} actual={pantalla} alCambiar={irA} />
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pantalla}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Contenido pantalla={pantalla} irA={irA} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {pantalla !== "asistente" && <CapturaRapida abierto={capturaAbierta} alCambiar={setCapturaAbierta} />}
      {pantalla !== "asistente" && <BurbujaBlanquita alAbrir={() => irA("asistente")} />}
      <AnfitrionDinero />
      <AvisosGatitas avisos={avisos} alCerrar={cerrar} alAbrir={navegar} />
      <AnimatePresence>{ajustesAbiertos && <HojaAjustes alCerrar={() => setAjustesAbiertos(false)} />}</AnimatePresence>
      <NavegacionMovil grupo={grupo} alCambiar={(g) => irA(ultimaDe[g] ?? GRUPOS.find((x) => x.id === g)!.pantallas[0])} />
    </div>
  );
}

function Contenido({ pantalla, irA }: { pantalla: Pantalla; irA: (p: Pantalla) => void }) {
  switch (pantalla) {
    case "hoy":
      return (
        <div className="space-y-4">
          <EscenaGatitas alto={190} />
          <div className="grid gap-4 lg:grid-cols-12">
            {/* en escritorio, Hoy es el resumen completo; en el celular, lo esencial */}
            <div className="hidden min-w-0 space-y-4 lg:col-span-5 lg:block 2xl:col-span-4"><PanelTareas /></div>
            <div className="min-w-0 space-y-4 lg:col-span-7 2xl:col-span-4">
              <ProximasFechas alVerTodas={() => irA("fechas")} />
              <PanelHidratacion />
              <PanelTiempoLibre />
              <PanelPomodoro />
            </div>
            <div className="hidden min-w-0 space-y-4 lg:col-span-12 lg:block 2xl:col-span-4"><PanelHabitos /></div>
          </div>
        </div>
      );
    case "tareas": return <div className="mx-auto max-w-3xl"><PanelTareas /></div>;
    case "calendario": return <SeccionCalendario />;
    case "notas": return <SeccionNotas />;
    case "listas": return <SeccionListas />;
    case "fechas": return <SeccionFechas />;
    case "habitos": return <div className="mx-auto max-w-3xl"><PanelHabitos /></div>;
    case "agua": return <div className="mx-auto max-w-3xl"><PanelHidratacion /></div>;
    case "ciclo": return <SeccionCiclo />;
    case "dinero": return <ResumenDinero alVer={irA} />;
    case "movimientos": return <Movimientos />;
    case "presupuesto": return <Presupuesto />;
    case "suscripciones": return <Suscripciones />;
    case "gatitas":
      return (
        <div className="space-y-4">
          <EscenaGatitas alto={190} />
          <PanelGatitas />
          <PanelTienda />
        </div>
      );
    case "asistente": return <SeccionAsistente />;
  }
}

/** Escritorio: todo visible de un vistazo, agrupado por áreas */
function BarraLateral({ pantalla, alCambiar }: { pantalla: Pantalla; alCambiar: (p: Pantalla) => void }) {
  const Boton = ({ p, sangria }: { p: Pantalla; sangria?: boolean }) => {
    const activa = p === pantalla;
    return (
      <button type="button" onClick={() => alCambiar(p)} aria-current={activa ? "page" : undefined}
        className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${sangria ? "pl-4" : ""} ${activa ? "text-white" : "text-white/55 hover:bg-noche-700/60 hover:text-white/85"}`}>
        {activa && <motion.span layoutId="lateral-activa" className="absolute inset-0 rounded-xl bg-violeta/20 ring-1 ring-violeta/30" />}
        <IconoNeko nombre={PANTALLAS[p].icono} tamano={18} className="relative" />
        <span className="relative flex-1">{PANTALLAS[p].nombre}</span>
      </button>
    );
  };
  return (
    <nav aria-label="Secciones" className="hidden lg:block">
      <div className="sticky top-4 space-y-3 rounded-[22px] border border-noche-600 bg-noche-800/80 p-2 backdrop-blur">
        {GRUPOS.map((g) =>
          g.pantallas.length === 1 ? (
            <Boton key={g.id} p={g.pantallas[0]} />
          ) : (
            <div key={g.id}>
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{g.nombre}</p>
              {g.pantallas.map((p) => <Boton key={p} p={p} sangria />)}
            </div>
          ),
        )}
        <div className="border-t border-noche-600 pt-2"><Boton p="asistente" /></div>
      </div>
    </nav>
  );
}

/** Móvil: pestañas del área (Organizar, Bienestar) */
function SubPestanas({ pantallas, actual, alCambiar }: { pantallas: Pantalla[]; actual: Pantalla; alCambiar: (p: Pantalla) => void }) {
  const tira = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tira.current?.querySelector<HTMLElement>("[aria-current=page]");
    const caja = tira.current;
    if (el && caja) caja.scrollTo({ left: el.offsetLeft - caja.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [actual]);
  return (
    <div ref={tira} className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden [scrollbar-width:none]">
      <div className="flex w-max gap-1.5">
        {pantallas.map((p) => {
          const activa = p === actual;
          return (
            <button key={p} type="button" onClick={() => alCambiar(p)} aria-current={activa ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${activa ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 bg-noche-800/80 text-white/55"}`}>
              <IconoNeko nombre={PANTALLAS[p].icono} tamano={16} />
              {PANTALLAS[p].nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavegacionMovil({ grupo, alCambiar }: { grupo: Grupo | null; alCambiar: (g: Grupo) => void }) {
  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 rounded-[22px] border border-noche-600 bg-noche-800/95 p-1 shadow-neon backdrop-blur lg:hidden" aria-label="Áreas">
      <ul className="grid grid-cols-5">
        {GRUPOS.map((g) => {
          const activa = g.id === grupo;
          return (
            <li key={g.id}>
              <button type="button" onClick={() => alCambiar(g.id)}
                aria-current={activa ? "page" : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] font-semibold transition ${activa ? "text-white" : "text-white/45"}`}>
                {activa && <motion.span layoutId="nav-activa" className="absolute inset-0 rounded-2xl bg-violeta/20" />}
                <IconoNeko nombre={g.icono} tamano={22} className="relative" />
                <span className="relative max-w-full truncate px-0.5">{g.nombre}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Botón flotante: tarea rápida o un vaso de agua en un toque (lo mismo hará el widget). */
function CapturaRapida({ abierto, alCambiar: setAbierto }: { abierto: boolean; alCambiar: (v: boolean | ((x: boolean) => boolean)) => void }) {
  const registrar = useNekoStore((s) => s.registrarBebida);
  const bebidas = useNekoStore((s) => s.bebidas);

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar captura rápida" : "Captura rápida"}
        className="fixed bottom-[88px] right-4 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violeta to-rosa text-noche shadow-neon-rosa lg:bottom-8 lg:right-8"
      >
        <motion.span animate={{ rotate: abierto ? 45 : 0 }}><IconoNeko nombre="mas" tamano={28} grosor={2.8} /></motion.span>
      </motion.button>
      <AnimatePresence>
        {abierto && (
          <>
            <motion.div className="fixed inset-0 z-30 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierto(false)} />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              className="fixed inset-x-3 bottom-[160px] z-40 mx-auto max-w-md rounded-[22px] border border-noche-600 bg-noche-800 p-4 shadow-neon lg:bottom-28 lg:right-8 lg:left-auto lg:w-[400px]"
            >
              <p className="mb-2 font-titulo text-lg font-semibold">Captura rápida</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {bebidas.filter((b) => !b.oculta).slice(0, 3).map((b) => (
                  <button key={b.id} type="button"
                    onClick={(e) => { registrar(b.id, b.tamanosMl[0]); confetiDesde(e.currentTarget, b.color); }}
                    className="flex items-center gap-1.5 rounded-xl border border-noche-600 bg-noche-700 px-3 py-2 text-sm font-semibold"
                    style={{ color: b.color }}>
                    <IconoNeko nombre={b.icono} tamano={17} /> +{b.tamanosMl[0]} {b.nombre.toLowerCase()}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setAbierto(false); useUIDinero.getState().abrir("gasto"); }}
                className="mb-3 flex w-full items-center gap-2 rounded-xl border border-noche-600 bg-noche-700 px-3 py-2 text-sm font-semibold text-rosa">
                <IconoNeko nombre="gasto" tamano={17} /> Anotar un gasto
              </button>
              <FormTarea alGuardar={() => setAbierto(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
