"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { useCuenta } from "@/lib/cuenta/useCuenta";
import { formatoHora } from "@/lib/fechas";
import { activarNotificaciones, desactivarNotificaciones, instalarApp, probarNotificacion, soportaPush, usePWA } from "@/lib/pwa/pwa";
import { useSync } from "@/lib/sync/motor";
import type { ConfigRecordatorios, NombreIcono } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

const ES_VISTA_PREVIA = process.env.NEXT_PUBLIC_VISTA_PREVIA === "1";

export function HojaAjustes({ alCerrar }: { alCerrar: () => void }) {
  useEffect(() => {
    const t = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", t);
    return () => window.removeEventListener("keydown", t);
  }, [alCerrar]);

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={alCerrar} />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 260 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-noche-600 bg-noche-800 p-4 pb-10 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <h2 className="flex-1 font-titulo text-xl font-semibold text-white">Ajustes</h2>
          <BotonIcono icono="cerrar" etiqueta="Cerrar ajustes" onClick={alCerrar} />
        </div>
        <div className="space-y-4">
          <SeccionCuenta />
          <SeccionNotificaciones />
          <SeccionRecordatorios />
          <SeccionInstalar />
          <SeccionDia />
        </div>
      </motion.aside>
    </>
  );
}

function Bloque({ titulo, icono, children }: { titulo: string; icono: NombreIcono; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-noche-600 bg-noche-900/60 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-titulo font-semibold text-white">
        <IconoNeko nombre={icono} tamano={18} className="text-violeta" /> {titulo}
      </h3>
      <div className="space-y-3 text-sm text-white/75">{children}</div>
    </section>
  );
}

function SeccionCuenta() {
  const { configurado, sesion, cerrarSesion, entrarConGoogle } = useCuenta();
  const sync = useSync();
  const [confirmar, setConfirmar] = useState(false);
  const textoSync: Record<string, string> = {
    apagado: "Sin sincronizar",
    sincronizando: "Sincronizando…",
    al_dia: sync.ultima ? `Al día · ${formatoHora(sync.ultima)}` : "Al día",
    sin_conexion: "Sin internet: se guarda aquí y se sube al volver",
    error: `Error al sincronizar${sync.mensaje ? `: ${sync.mensaje}` : ""}`,
  };
  return (
    <Bloque titulo="Cuenta" icono="huella">
      {!configurado ? (
        <p>
          {ES_VISTA_PREVIA ? "En la vista previa todo se guarda en este navegador." : "Modo local: tus datos se guardan solo en este navegador."}{" "}
          Para usar tu cuenta en celular y compu, configura Supabase en Vercel (README, paso 3.2).
        </p>
      ) : sesion ? (
        <>
          <p className="break-all"><span className="text-white/45">Entraste como</span> <strong className="text-white">{sesion.user.email}</strong></p>
          <p className={`flex items-center gap-2 ${sync.estado === "error" ? "text-rosa" : sync.estado === "sin_conexion" ? "text-croqueta" : "text-cian-suave"}`}>
            <IconoNeko nombre="sincronizar" tamano={15} /> {textoSync[sync.estado]}
          </p>
          <button type="button" onClick={() => (confirmar ? void cerrarSesion() : setConfirmar(true))}
            className={`w-full rounded-xl border py-2 font-semibold ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/70"}`}>
            {confirmar ? "Sí, cerrar sesión en este dispositivo" : "Cerrar sesión"}
          </button>
          {confirmar && <p className="text-xs text-white/45">Tus datos se quedan guardados en tu cuenta. Este dispositivo vuelve a empezar limpio.</p>}
        </>
      ) : (
        <>
          <p>Usas la app sin cuenta en este dispositivo. Entra para respaldar todo y verlo en tus otros dispositivos. Lo que ya tienes aquí se sube a tu cuenta.</p>
          <button type="button" onClick={() => void entrarConGoogle()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 font-semibold text-noche">
            Entrar con Google
          </button>
        </>
      )}
    </Bloque>
  );
}

function SeccionNotificaciones() {
  const { permiso, pushActivo } = usePWA();
  const sesion = useCuenta((s) => s.sesion);
  const [msg, setMsg] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const correr = async (fn: () => Promise<string | null | void>) => {
    setTrabajando(true);
    setMsg("");
    try { setMsg((await fn()) ?? ""); } finally { setTrabajando(false); }
  };

  if (!soportaPush()) {
    return (
      <Bloque titulo="Notificaciones" icono="bocina">
        <p>{ES_VISTA_PREVIA ? "En la vista previa los recordatorios aparecen dentro de la app. Las notificaciones del celular funcionan al instalar la app desplegada." : "Este navegador no permite notificaciones. En Android usa Chrome o Samsung Internet."}</p>
      </Bloque>
    );
  }
  return (
    <Bloque titulo="Notificaciones" icono="bocina">
      <p>
        {pushActivo
          ? "Activas: te llegan avisos aunque la app esté cerrada."
          : permiso === "granted"
            ? sesion ? "Tienes permiso, falta registrar este dispositivo." : "Avisos solo mientras la app está abierta. Inicia sesión para recibirlos con la app cerrada."
            : permiso === "denied" ? "Las bloqueaste. Actívalas en los ajustes del navegador para esta página." : "Las gatitas pueden avisarte del agua, tus rutinas, tareas y citas."}
      </p>
      <div className="flex gap-2">
        {pushActivo ? (
          <>
            <button type="button" disabled={trabajando} onClick={() => void correr(probarNotificacion)} className="flex-1 rounded-xl bg-violeta py-2 font-semibold text-noche disabled:opacity-60">Probar</button>
            <button type="button" disabled={trabajando} onClick={() => void correr(async () => { await desactivarNotificaciones(); return "Notificaciones desactivadas en este dispositivo."; })} className="flex-1 rounded-xl border border-noche-600 py-2 font-semibold text-white/70">Desactivar</button>
          </>
        ) : (
          <button type="button" disabled={trabajando || permiso === "denied"} onClick={() => void correr(activarNotificaciones)}
            className="w-full rounded-xl bg-gradient-to-r from-violeta to-rosa py-2.5 font-semibold text-noche disabled:opacity-50">
            {trabajando ? "Activando…" : "Activar notificaciones"}
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-cian-suave">{msg}</p>}
    </Bloque>
  );
}

function Interruptor({ id, activo, alCambiar, etiqueta }: { id: string; activo: boolean; alCambiar: (v: boolean) => void; etiqueta: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3">
      <span className="font-semibold text-white/90">{etiqueta}</span>
      <input id={id} type="checkbox" role="switch" checked={activo} onChange={(e) => alCambiar(e.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-noche-600 transition peer-checked:bg-violeta peer-focus-visible:ring-2 peer-focus-visible:ring-cian">
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${activo ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </label>
  );
}

function Hora({ id, valor, alCambiar, etiqueta }: { id: string; valor: string; alCambiar: (v: string) => void; etiqueta: string }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 pl-1 text-white/60">
      {etiqueta}
      <input id={id} type="time" value={valor} onChange={(e) => e.target.value && alCambiar(e.target.value)}
        className="rounded-lg border border-noche-600 bg-noche-800 px-2 py-1 text-white outline-none [color-scheme:dark]" />
    </label>
  );
}

function SeccionRecordatorios() {
  const r = useNekoStore((s) => s.ajustes.recordatorios);
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const cambiar = <K extends keyof ConfigRecordatorios>(k: K, v: Partial<ConfigRecordatorios[K]>) =>
    ajustar({ recordatorios: { ...r, [k]: { ...r[k], ...v } } });
  return (
    <Bloque titulo="Recordatorios" icono="reloj">
      <div className="space-y-2 border-b border-noche-600 pb-3">
        <Interruptor id="rec-agua" etiqueta="Agua (Blanquita)" activo={r.agua.activo} alCambiar={(v) => cambiar("agua", { activo: v })} />
        {r.agua.activo && (
          <>
            <p className="pl-1 text-xs text-white/45">Solo te avisa si vas atrasada con tu meta.</p>
            <label htmlFor="rec-agua-cada" className="flex items-center justify-between gap-3 pl-1 text-white/60">Cada
              <select id="rec-agua-cada" value={r.agua.cadaMin} onChange={(e) => cambiar("agua", { cadaMin: +e.target.value })}
                className="rounded-lg border border-noche-600 bg-noche-800 px-2 py-1 text-white [color-scheme:dark]">
                {[45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} h` : `${m} min`}</option>)}
              </select>
            </label>
            <Hora id="rec-agua-desde" etiqueta="Desde" valor={r.agua.desde} alCambiar={(v) => cambiar("agua", { desde: v })} />
            <Hora id="rec-agua-hasta" etiqueta="Hasta" valor={r.agua.hasta} alCambiar={(v) => cambiar("agua", { hasta: v })} />
          </>
        )}
      </div>
      <div className="space-y-2 border-b border-noche-600 pb-3">
        <Interruptor id="rec-rutinas" etiqueta="Rutinas (Ronro)" activo={r.rutinas.activo} alCambiar={(v) => cambiar("rutinas", { activo: v })} />
        {r.rutinas.activo && (
          <>
            <Hora id="rec-manana" etiqueta="Rutina de mañana" valor={r.rutinas.manana} alCambiar={(v) => cambiar("rutinas", { manana: v })} />
            <Hora id="rec-noche" etiqueta="Rutina de noche" valor={r.rutinas.noche} alCambiar={(v) => cambiar("rutinas", { noche: v })} />
          </>
        )}
      </div>
      <div className="space-y-2 border-b border-noche-600 pb-3">
        <Interruptor id="rec-tareas" etiqueta="Tareas con hora (Bizca)" activo={r.tareas.activo} alCambiar={(v) => cambiar("tareas", { activo: v })} />
        {r.tareas.activo && (
          <label htmlFor="rec-tareas-antes" className="flex items-center justify-between gap-3 pl-1 text-white/60">Avisar antes
            <select id="rec-tareas-antes" value={r.tareas.minutosAntes} onChange={(e) => cambiar("tareas", { minutosAntes: +e.target.value })}
              className="rounded-lg border border-noche-600 bg-noche-800 px-2 py-1 text-white [color-scheme:dark]">
              {[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="space-y-2">
        <Interruptor id="rec-gatitas" etiqueta="Gatitas (citas y cuidados)" activo={r.gatitas.activo} alCambiar={(v) => cambiar("gatitas", { activo: v })} />
        {r.gatitas.activo && (
          <>
            <Hora id="rec-gatitas-hora" etiqueta="Citas del día a las" valor={r.gatitas.hora} alCambiar={(v) => cambiar("gatitas", { hora: v })} />
            <p className="pl-1 text-xs text-white/45">A las 8 p. m. te recuerda si falta registrar comida, agua fresca o arenero.</p>
          </>
        )}
      </div>
    </Bloque>
  );
}

function SeccionInstalar() {
  const { instalable, instalada } = usePWA();
  return (
    <Bloque titulo="App en tu celular" icono="casa">
      {instalada ? (
        <p>Ya la tienes instalada. Mantén presionado su ícono para los accesos directos: agua, nueva tarea, Blanquita y calendario.</p>
      ) : instalable ? (
        <button type="button" onClick={() => void instalarApp()} className="w-full rounded-xl bg-gradient-to-r from-violeta to-rosa py-2.5 font-semibold text-noche">
          Instalar NekoTask
        </button>
      ) : (
        <ol className="list-decimal space-y-1 pl-5">
          <li>Abre la app desplegada en Chrome o Samsung Internet.</li>
          <li>Toca el menú (⋮ en Chrome, ≡ en Samsung Internet).</li>
          <li>Elige <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>.</li>
        </ol>
      )}
      <p className="text-xs text-white/45">Ya instalada, NekoTask aparece en el menú <strong>Compartir</strong>: desde Samsung Notes, compartes una nota y se guarda aquí.</p>
    </Bloque>
  );
}

function SeccionDia() {
  const a = useNekoStore((s) => s.ajustes);
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  return (
    <Bloque titulo="Tu día" icono="sol">
      <label htmlFor="aj-nombre" className="flex items-center justify-between gap-3 text-white/60">Tu nombre
        <input id="aj-nombre" value={a.nombre} onChange={(e) => ajustar({ nombre: e.target.value.slice(0, 30) })}
          className="w-40 rounded-lg border border-noche-600 bg-noche-800 px-2 py-1 text-white outline-none" />
      </label>
      <Hora id="aj-inicio" etiqueta="Empieza tu día" valor={a.horaInicioDia} alCambiar={(v) => ajustar({ horaInicioDia: v })} />
      <Hora id="aj-fin" etiqueta="Termina tu día" valor={a.horaFinDia} alCambiar={(v) => ajustar({ horaFinDia: v })} />
      <p className="text-xs text-white/45">Se usa para calcular tu tiempo libre.</p>
      <Interruptor id="aj-sonidos" etiqueta="Sonidos de las gatitas" activo={a.sonidos} alCambiar={(v) => ajustar({ sonidos: v })} />
    </Bloque>
  );
}
