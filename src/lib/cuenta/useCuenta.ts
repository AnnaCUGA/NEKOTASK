"use client";

import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { almacenamientoSeguro } from "@/lib/almacenamiento";
import { MotorSync } from "@/lib/sync/motor";
import { obtenerSupabase, supabaseConfigurado } from "@/lib/supabase/cliente";
import { useNekoStore } from "@/store/useNekoStore";

const LLAVE_SOLO_LOCAL = "neko-solo-local";

interface EstadoCuenta {
  listo: boolean;
  sesion: Session | null;
  soloLocal: boolean;      // eligió usar la app sin cuenta en este dispositivo
  configurado: boolean;
  iniciar: () => void;
  entrarConGoogle: () => Promise<void>;
  enviarEnlace: (correo: string) => Promise<string | null>;
  usarSinCuenta: () => void;
  cerrarSesion: () => Promise<void>;
}

let motor: MotorSync | null = null;
let iniciado = false;

async function arrancarMotor(sesion: Session | null) {
  const db = obtenerSupabase();
  if (motor && (!sesion || !db)) { motor.detener(); motor = null; }
  if (sesion && db && !motor) {
    motor = new MotorSync(db, sesion.user.id);
    await motor.iniciar();
  }
}

export const useCuenta = create<EstadoCuenta>((set, get) => ({
  listo: false,
  sesion: null,
  soloLocal: false,
  configurado: false,

  iniciar: () => {
    if (iniciado) return;
    iniciado = true;
    const db = obtenerSupabase();
    const soloLocal = almacenamientoSeguro.getItem(LLAVE_SOLO_LOCAL) === "1";
    if (!db) {
      set({ listo: true, configurado: false, soloLocal: true });
      return;
    }
    set({ configurado: supabaseConfigurado(), soloLocal });
    void db.auth.getSession().then(({ data }) => {
      set({ sesion: data.session, listo: true });
      void arrancarMotor(data.session);
    });
    db.auth.onAuthStateChange((_evento, sesion) => {
      const antes = get().sesion?.user.id;
      set({ sesion, listo: true });
      if (sesion?.user.id !== antes) void arrancarMotor(sesion);
      // limpia ?code= de la URL después de entrar
      if (sesion && window.location.search.includes("code=")) window.history.replaceState(null, "", window.location.pathname);
    });
  },

  entrarConGoogle: async () => {
    const db = obtenerSupabase();
    if (!db) return;
    await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  },

  enviarEnlace: async (correo) => {
    const db = obtenerSupabase();
    if (!db) return "La cuenta no está configurada.";
    const { error } = await db.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: window.location.origin } });
    return error ? "No se pudo enviar el enlace. Revisa el correo e intenta de nuevo." : null;
  },

  usarSinCuenta: () => {
    almacenamientoSeguro.setItem(LLAVE_SOLO_LOCAL, "1");
    set({ soloLocal: true });
  },

  cerrarSesion: async () => {
    const db = obtenerSupabase();
    motor?.olvidar();
    motor?.detener();
    motor = null;
    await db?.auth.signOut();
    almacenamientoSeguro.removeItem(LLAVE_SOLO_LOCAL);
    // tus datos quedan en la nube; este dispositivo vuelve a empezar limpio
    useNekoStore.persist.clearStorage();
    window.location.replace(window.location.pathname);
  },
}));

/** Token de acceso actual (para rutas /api que necesitan saber quién eres) */
export async function tokenDeAcceso() {
  const db = obtenerSupabase();
  const { data } = (await db?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ?? null;
}
