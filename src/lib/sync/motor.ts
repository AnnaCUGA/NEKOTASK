"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";
import { almacenamientoSeguro } from "@/lib/almacenamiento";
import { useNekoStore } from "@/store/useNekoStore";
import { aplicarFilas, calcularCambios, filtrarNovedades, registrarEnInstantanea, type Fila, type Instantanea } from "./colecciones";

export type EstadoSync = "apagado" | "sincronizando" | "al_dia" | "sin_conexion" | "error";

export const useSync = create<{ estado: EstadoSync; ultima?: string; mensaje?: string }>(() => ({ estado: "apagado" }));

const TABLA = "sync_registros";
const LOTE = 200;

interface Guardado { inst: Instantanea; desde: string | null }

/**
 * Motor de sincronización: baja lo nuevo de la nube, sube lo que cambió aquí
 * y escucha cambios en vivo de tus otros dispositivos.
 */
export class MotorSync {
  private inst: Instantanea = {};
  private desde: string | null = null;
  private primeraVez = true;
  private canal: RealtimeChannel | null = null;
  private quitarSuscripcion: (() => void) | null = null;
  private temporizador: number | null = null;
  private intervalo: number | null = null;
  private ocupado = false;
  private pendiente = false;
  private aplicando = false;
  private readonly dispositivo: string;
  private readonly llave: string;

  constructor(private db: SupabaseClient, private usuarioId: string) {
    this.llave = `neko-sync:${usuarioId}`;
    this.dispositivo = /Android|iPhone|Mobile/i.test(navigator.userAgent) ? "celular" : "computadora";
  }

  async iniciar() {
    const guardado = almacenamientoSeguro.getItem(this.llave);
    if (guardado) {
      try {
        const g = JSON.parse(guardado as string) as Guardado;
        this.inst = g.inst ?? {};
        this.desde = g.desde;
        this.primeraVez = false;
      } catch { /* empieza de cero */ }
    }

    await this.sincronizar();

    // cambios locales → subir (agrupados)
    this.quitarSuscripcion = useNekoStore.subscribe(() => {
      if (this.aplicando) return;
      this.programar(1200);
    });

    // cambios de otros dispositivos → en vivo
    this.canal = this.db
      .channel(`sync-${this.usuarioId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLA, filter: `usuario_id=eq.${this.usuarioId}` }, (p) => {
        const fila = p.new as Fila | undefined;
        if (fila?.coleccion) this.recibir([fila]);
      })
      .subscribe();

    window.addEventListener("online", this.alVolver);
    document.addEventListener("visibilitychange", this.alVolver);
    this.intervalo = window.setInterval(() => void this.sincronizar(), 60_000);
  }

  detener() {
    this.quitarSuscripcion?.();
    if (this.canal) void this.db.removeChannel(this.canal);
    window.removeEventListener("online", this.alVolver);
    document.removeEventListener("visibilitychange", this.alVolver);
    if (this.temporizador) clearTimeout(this.temporizador);
    if (this.intervalo) clearInterval(this.intervalo);
    useSync.setState({ estado: "apagado" });
  }

  /** Olvida lo sincronizado en este dispositivo (al cerrar sesión) */
  olvidar() {
    almacenamientoSeguro.removeItem(this.llave);
  }

  private alVolver = () => {
    if (document.visibilityState === "visible" && navigator.onLine) void this.sincronizar();
  };

  private programar(ms: number) {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = window.setTimeout(() => void this.sincronizar(), ms);
  }

  async sincronizar() {
    if (this.ocupado) { this.pendiente = true; return; }
    this.ocupado = true;
    useSync.setState({ estado: "sincronizando" });
    try {
      await this.bajar();
      await this.subir();
      useSync.setState({ estado: "al_dia", ultima: new Date().toISOString(), mensaje: undefined });
    } catch (e) {
      const sinRed = !navigator.onLine || (e as Error).message?.includes("fetch");
      useSync.setState({ estado: sinRed ? "sin_conexion" : "error", mensaje: (e as Error).message });
      this.programar(sinRed ? 15_000 : 30_000);
    } finally {
      this.ocupado = false;
      if (this.pendiente) { this.pendiente = false; this.programar(300); }
    }
  }

  private async bajar() {
    const nuevas: Fila[] = [];
    for (let pagina = 0; ; pagina++) {
      let q = this.db.from(TABLA).select("coleccion,id,datos,borrado,actualizado_en").order("actualizado_en").range(pagina * 1000, pagina * 1000 + 999);
      if (this.desde) q = q.gte("actualizado_en", this.desde);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      nuevas.push(...(data as Fila[]));
      if (!data || data.length < 1000) break;
    }
    if (nuevas.length) this.desde = nuevas.at(-1)!.actualizado_en!;
    this.recibir(nuevas, this.primeraVez);
    this.primeraVez = false;
    this.guardar();
  }

  private recibir(filas: Fila[], primeraVez = false) {
    const novedades = filtrarNovedades(filas, this.inst, primeraVez);
    if (novedades.length) {
      this.aplicando = true;
      useNekoStore.setState(aplicarFilas(useNekoStore.getState() as unknown as Record<string, unknown>, novedades) as never);
      this.aplicando = false;
    }
    this.inst = registrarEnInstantanea(this.inst, filas);
    const ultima = filas.at(-1)?.actualizado_en;
    if (ultima && (!this.desde || ultima > this.desde)) this.desde = ultima;
  }

  private async subir() {
    const cambios = calcularCambios(useNekoStore.getState() as unknown as Record<string, unknown>, this.inst);
    for (let i = 0; i < cambios.length; i += LOTE) {
      const lote = cambios.slice(i, i + LOTE);
      const { error } = await this.db.from(TABLA).upsert(
        lote.map((f) => ({ usuario_id: this.usuarioId, coleccion: f.coleccion, id: f.id, datos: f.datos, borrado: f.borrado, dispositivo: this.dispositivo })),
        { onConflict: "usuario_id,coleccion,id" },
      );
      if (error) throw new Error(error.message);
      this.inst = registrarEnInstantanea(this.inst, lote);
      this.guardar();
    }
  }

  private guardar() {
    almacenamientoSeguro.setItem(this.llave, JSON.stringify({ inst: this.inst, desde: this.desde } satisfies Guardado));
  }
}
