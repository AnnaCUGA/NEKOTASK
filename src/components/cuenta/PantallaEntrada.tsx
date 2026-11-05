"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/dashboard/Encabezado";
import { Gatita } from "@/components/gatitas/Gatita";
import { ORDEN_GATITAS, PERFILES } from "@/components/gatitas/perfiles";
import { useCuenta } from "@/lib/cuenta/useCuenta";

/** Bienvenida: entrar con Google o con enlace al correo para tener tus datos en todos lados */
export function PantallaEntrada() {
  const { entrarConGoogle, enviarEnlace, usarSinCuenta } = useCuenta();
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado">("");
  const [error, setError] = useState("");

  return (
    <div className="fondo-neko flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Logo tamano={48} />
          <div>
            <h1 className="font-titulo text-2xl font-semibold">NekoTask Studio</h1>
            <p className="text-sm text-white/50">Tus tareas, tu dinero y tus hábitos, con tus gatitas.</p>
          </div>
        </div>

        <div className="mb-6 flex items-end justify-between rounded-[22px] border border-noche-600 bg-noche-800/80 px-2 pt-4">
          {ORDEN_GATITAS.map((c, i) => (
            <motion.div key={c} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.12 }}>
              <Gatita clave={c} pose={PERFILES[c].poseFavorita === "dormida" ? "echada" : "sentada"} expresion="feliz" ancho={88} />
            </motion.div>
          ))}
        </div>

        <div className="space-y-3 rounded-[22px] border border-noche-600 bg-noche-800/90 p-5">
          <p className="font-titulo text-lg font-semibold">Entra para tener todo en tu celular y tu compu</p>
          <button type="button" onClick={() => void entrarConGoogle()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-noche transition active:scale-[.98]">
            Entrar con Google
          </button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/35">
            <span className="h-px flex-1 bg-noche-600" /> o con tu correo <span className="h-px flex-1 bg-noche-600" />
          </div>

          {estado === "enviado" ? (
            <p className="rounded-xl bg-cian/10 p-3 text-sm text-cian-suave">
              Listo. Te mandé un enlace a <strong>{correo}</strong>. Ábrelo en este dispositivo para entrar.
            </p>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!/^\S+@\S+\.\S+$/.test(correo)) { setError("Escribe un correo válido"); return; }
                setEstado("enviando");
                const err = await enviarEnlace(correo.trim());
                if (err) { setError(err); setEstado(""); } else setEstado("enviado");
              }}
            >
              <input id="correo-entrada" type="email" value={correo} onChange={(e) => { setCorreo(e.target.value); setError(""); }} placeholder="tu@correo.com"
                className="min-w-0 flex-1 rounded-xl border border-noche-600 bg-noche-900 px-3 py-2.5 text-white outline-none focus:border-violeta/60" autoComplete="email" />
              <button type="submit" disabled={estado === "enviando"} className="rounded-xl bg-violeta px-4 font-semibold text-noche disabled:opacity-60">
                {estado === "enviando" ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>
          )}
          {error && <p className="text-xs text-rosa">{error}</p>}
        </div>

        <button type="button" onClick={usarSinCuenta} className="mt-4 w-full text-center text-sm text-white/45 underline-offset-4 hover:text-white/70 hover:underline">
          Usar sin cuenta en este dispositivo
        </button>
      </div>
    </div>
  );
}
