"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
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
import { SeccionCalendario } from "@/components/calendario/SeccionCalendario";

type Seccion = "hoy" | "tareas" | "habitos" | "calendario" | "asistente" | "gatitas";
const SECCIONES: { id: Seccion; nombre: string; icono: NombreIcono }[] = [
  { id: "hoy", nombre: "Hoy", icono: "casa" },
  { id: "tareas", nombre: "Tareas", icono: "tarea" },
  { id: "habitos", nombre: "Hábitos", icono: "racha" },
  { id: "calendario", nombre: "Calendario", icono: "calendario" },
  { id: "asistente", nombre: "Blanquita", icono: "chispa" },
  { id: "gatitas", nombre: "Gatitas", icono: "huella" },
];
type Vista = "inicio" | "calendario" | "asistente";
const VISTAS: { id: Vista; nombre: string; icono: NombreIcono }[] = [
  { id: "inicio", nombre: "Inicio", icono: "casa" },
  { id: "calendario", nombre: "Calendario", icono: "calendario" },
  { id: "asistente", nombre: "Blanquita IA", icono: "chispa" },
];

function seccionInicial(): Seccion {
  const pedida = new URLSearchParams(window.location.search).get("seccion") ?? window.location.hash.slice(1);
  return SECCIONES.some((s) => s.id === pedida) ? (pedida as Seccion) : "hoy";
}

/**
 * Dashboard responsivo:
 *  - Escritorio (lg+): pestañas Inicio (multipanel) · Calendario · Blanquita IA.
 *  - Móvil/tablet: secciones con barra inferior + botón flotante de captura rápida.
 */
export function Dashboard() {
  const [seccion, setSeccion] = useState<Seccion>("hoy");
  const [listo, setListo] = useState(false);
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [capturaAbierta, setCapturaAbierta] = useState(false);
  const cuenta = useCuenta();
  const { avisos, cerrar } = useRecordatoriosEnApp();
  const vista: Vista = seccion === "calendario" || seccion === "asistente" ? seccion : "inicio";
  // móvil: solo la sección elegida · escritorio: todo el multipanel cuando la vista es Inicio
  const ver = (s: Seccion) => `${seccion === s ? "block" : "hidden"} ${vista === "inicio" ? "lg:block" : "lg:hidden"}`;

  /** Abre una sección o ejecuta un acceso directo: /?seccion=…, /?accion=agua&ml=250, /?accion=tarea */
  const navegar = useCallback((url: string) => {
    const u = new URL(url, window.location.origin);
    const sec = u.searchParams.get("seccion") ?? u.hash.slice(1);
    if (SECCIONES.some((x) => x.id === sec)) setSeccion(sec as Seccion);
    const accion = u.searchParams.get("accion");
    if (accion === "agua") {
      const ml = Math.min(1000, Math.max(50, parseInt(u.searchParams.get("ml") ?? "250", 10) || 250));
      useNekoStore.getState().registrarBebida("agua", ml);
      setSeccion("hoy");
    }
    if (accion === "tarea") setCapturaAbierta(true);
  }, []);

  // Evita parpadeos de hidratación: el estado viene de localStorage
  useEffect(() => {
    setSeccion(seccionInicial());
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

  const irA = (s: Seccion) => {
    setSeccion(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fondo-neko min-h-screen text-white">
      <ConfetiHuellitas />
      <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
        <Encabezado alAbrirAjustes={() => setAjustesAbiertos(true)} />

        <nav className="mt-4 hidden gap-1 rounded-2xl border border-noche-600 bg-noche-800/80 p-1 lg:inline-flex" aria-label="Vistas">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" onClick={() => irA(v.id === "inicio" ? "hoy" : v.id)} aria-current={vista === v.id ? "page" : undefined}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${vista === v.id ? "text-white" : "text-white/50 hover:text-white/80"}`}>
              {vista === v.id && <motion.span layoutId="vista-activa" className="absolute inset-0 rounded-xl bg-violeta/20" />}
              <IconoNeko nombre={v.icono} tamano={18} className="relative" />
              <span className="relative">{v.nombre}</span>
            </button>
          ))}
        </nav>

        {vista === "inicio" && (
          <div className="mt-4">
            <EscenaGatitas alto={190} />
          </div>
        )}

        {vista === "calendario" && <div className="mt-4"><SeccionCalendario /></div>}
        {vista === "asistente" && <div className="mt-4"><SeccionAsistente /></div>}

        <div className={`mt-4 grid gap-4 lg:grid-cols-12 ${vista === "inicio" ? "" : "hidden"}`}>
          {/* columna izquierda: tareas */}
          <div className={`space-y-4 lg:col-span-5 xl:col-span-4 ${ver("tareas")}`}>
            <PanelTareas />
          </div>

          {/* columna central: hoy */}
          <div className={`space-y-4 lg:col-span-7 xl:col-span-4 ${ver("hoy")}`}>
            <PanelHidratacion />
            <PanelTiempoLibre />
            <PanelPomodoro />
          </div>

          {/* columna derecha: hábitos */}
          <div className={`space-y-4 lg:col-span-12 xl:col-span-4 ${ver("habitos")}`}>
            <PanelHabitos />
          </div>

          {/* fila inferior: gatitas + tienda */}
          <div className={`space-y-4 lg:col-span-12 ${ver("gatitas")}`}>
            <PanelGatitas />
            <PanelTienda />
          </div>
        </div>
      </div>

      {vista !== "asistente" && <CapturaRapida abierto={capturaAbierta} alCambiar={setCapturaAbierta} />}
      <AvisosGatitas avisos={avisos} alCerrar={cerrar} alAbrir={navegar} />
      <AnimatePresence>{ajustesAbiertos && <HojaAjustes alCerrar={() => setAjustesAbiertos(false)} />}</AnimatePresence>
      <NavegacionMovil seccion={seccion} alCambiar={irA} />
    </div>
  );
}

function NavegacionMovil({ seccion, alCambiar }: { seccion: Seccion; alCambiar: (s: Seccion) => void }) {
  return (
    <nav className="fixed inset-x-2 bottom-2 z-40 rounded-[22px] border border-noche-600 bg-noche-800/95 p-1 shadow-neon backdrop-blur lg:hidden" aria-label="Secciones">
      <ul className="grid grid-cols-6">
        {SECCIONES.map((s) => {
          const activa = s.id === seccion;
          return (
            <li key={s.id}>
              <button type="button" onClick={() => alCambiar(s.id)}
                aria-current={activa ? "page" : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold transition ${activa ? "text-white" : "text-white/45"}`}>
                {activa && <motion.span layoutId="nav-activa" className="absolute inset-0 rounded-2xl bg-violeta/20" />}
                <IconoNeko nombre={s.icono} tamano={21} className="relative" />
                <span className="relative max-w-full truncate px-0.5">{s.nombre}</span>
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
                {bebidas.slice(0, 3).map((b) => (
                  <button key={b.id} type="button"
                    onClick={(e) => { registrar(b.id, b.tamanosMl[0]); confetiDesde(e.currentTarget, b.color); }}
                    className="flex items-center gap-1.5 rounded-xl border border-noche-600 bg-noche-700 px-3 py-2 text-sm font-semibold"
                    style={{ color: b.color }}>
                    <IconoNeko nombre={b.icono} tamano={17} /> +{b.tamanosMl[0]} {b.nombre.toLowerCase()}
                  </button>
                ))}
              </div>
              <FormTarea alGuardar={() => setAbierto(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
