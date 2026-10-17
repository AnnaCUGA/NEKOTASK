"use client";

import { useEffect, useRef, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { useCuenta } from "@/lib/cuenta/useCuenta";
import { useNekoStore } from "@/store/useNekoStore";

/**
 * Destino de "Compartir" en Android: Samsung Notes, Chrome, WhatsApp…
 * Guarda lo compartido como nota y ofrece convertirlo en tarea.
 */
export default function Compartir() {
  const [nota, setNota] = useState<{ titulo: string; contenido: string } | null>(null);
  const [tarea, setTarea] = useState(false);
  const hecho = useRef(false);

  useEffect(() => {
    useCuenta.getState().iniciar(); // si hay sesión, la nota se sincroniza
    if (hecho.current) return;
    hecho.current = true;
    const q = new URLSearchParams(window.location.search);
    const texto = (q.get("texto") ?? "").trim();
    const enlace = (q.get("enlace") ?? "").trim();
    const contenido = [texto, enlace && !texto.includes(enlace) ? enlace : ""].filter(Boolean).join("\n\n");
    const titulo = ((q.get("titulo") ?? "").trim() || contenido.split("\n").find((l) => l.trim()) || "Nota compartida").slice(0, 80);
    if (!contenido && !q.get("titulo")) return;
    // evita guardarla dos veces si recargas la página
    const huella = `neko-compartido:${titulo}:${contenido.length}`;
    if (sessionStorage.getItem(huella)) { setNota({ titulo, contenido }); return; }
    sessionStorage.setItem(huella, "1");
    useNekoStore.getState().agregarNota({ titulo, contenido: contenido || titulo, etiquetas: ["compartido"], origen: "compartido" });
    setNota({ titulo, contenido });
  }, []);

  const comoTarea = () => {
    if (!nota) return;
    const pasos = nota.contenido.split("\n").map((l) => l.replace(/^\s*([-*•]|\d+[.)]|\[ ?\])\s*/, "").trim()).filter((l) => l && l !== nota.titulo).slice(0, 15);
    useNekoStore.getState().agregarTarea({ titulo: nota.titulo, prioridad: "media", etiquetas: ["compartido"], checklist: pasos });
    setTarea(true);
  };

  return (
    <main className="fondo-neko flex min-h-screen items-center justify-center px-4 text-white">
      <div className="w-full max-w-sm rounded-[22px] border border-noche-600 bg-noche-800/95 p-5 text-center">
        <div className="flex justify-center"><Gatita clave="blanquita" pose="sentada" expresion={nota ? "feliz" : "sorprendida"} ancho={120} /></div>
        {nota ? (
          <>
            <p className="mt-2 font-titulo text-xl font-semibold">Guardé tu nota</p>
            <p className="mt-1 line-clamp-3 text-sm text-white/60">{nota.titulo}</p>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={comoTarea} disabled={tarea}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violeta py-2.5 font-semibold text-noche disabled:bg-noche-600 disabled:text-white/60">
                <IconoNeko nombre={tarea ? "check" : "tarea"} tamano={18} /> {tarea ? "También es una tarea" : "Convertir también en tarea"}
              </button>
              <a href="/?seccion=asistente" className="block w-full rounded-xl border border-noche-600 py-2.5 font-semibold text-white/80">Abrir NekoTask</a>
            </div>
            <p className="mt-3 text-[11px] text-white/40">Tus notas están en la sección Blanquita, en "Notas guardadas".</p>
          </>
        ) : (
          <>
            <p className="mt-2 font-titulo text-xl font-semibold">No llegó nada para guardar</p>
            <a href="/" className="mt-4 block w-full rounded-xl bg-violeta py-2.5 font-semibold text-noche">Ir a NekoTask</a>
          </>
        )}
      </div>
    </main>
  );
}
