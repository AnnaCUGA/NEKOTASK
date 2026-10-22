"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Markdown } from "@/components/asistente/Markdown";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono, Chip } from "@/components/ui/Panel";
import { Hoja, campo } from "@/components/ui/Hoja";
import { formatoFechaCorta } from "@/lib/fechas";
import type { Nota } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

const ORIGEN: Record<Nota["origen"], string> = {
  app: "Escrita aquí",
  ia: "De Blanquita",
  compartido: "Compartida",
  samsung_notes: "Samsung Notes",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

const textoPlano = (md: string) => md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*`_~]|\[(.*?)\]\(.*?\)/g, "$1").replace(/\n{2,}/g, "\n").trim();

export function SeccionNotas() {
  const notas = useNekoStore((s) => s.notas);
  const [busqueda, setBusqueda] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Nota | "nueva" | null>(null);

  const etiquetas = useMemo(() => [...new Set(notas.flatMap((n) => n.etiquetas))].sort(), [notas]);
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return notas
      .filter((n) => !etiqueta || n.etiquetas.includes(etiqueta))
      .filter((n) => !q || `${n.titulo}\n${n.contenido}\n${n.etiquetas.join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.fijada) - Number(a.fijada) || (b.actualizadoEn ?? b.creadoEn).localeCompare(a.actualizadoEn ?? a.creadoEn));
  }, [notas, busqueda, etiqueta]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <IconoNeko nombre="buscar" tamano={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en tus notas…" aria-label="Buscar notas"
            className={`${campo} rounded-2xl bg-noche-800/90 py-2.5 pl-10`} />
        </div>
        <button type="button" onClick={() => setAbierta("nueva")}
          className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violeta to-rosa px-4 py-2.5 font-titulo text-sm font-semibold text-noche">
          <IconoNeko nombre="mas" tamano={17} grosor={2.6} /> Nueva nota
        </button>
      </div>

      {etiquetas.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
          <div className="flex w-max gap-1.5">
            {[null, ...etiquetas].map((t) => (
              <button key={t ?? "todas"} type="button" onClick={() => setEtiqueta(t)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${etiqueta === t ? "border-croqueta/60 bg-croqueta/15 text-croqueta" : "border-noche-600 bg-noche-800/80 text-white/55"}`}>
                {t ? `#${t}` : "Todas"}
              </button>
            ))}
          </div>
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-noche-600 bg-noche-800/60 p-6 text-center">
          <div className="flex justify-center"><Gatita clave="ronro" pose={notas.length ? "sentada" : "dormida"} expresion={notas.length ? "sorprendida" : "dormida"} ancho={110} /></div>
          <p className="mt-2 font-titulo font-semibold">{notas.length ? "No encontré nada así" : "Aún no tienes notas"}</p>
          <p className="mt-1 text-sm text-white/55">
            {notas.length ? "Prueba con otra palabra o quita el filtro." : "Escribe una aquí, guarda respuestas de Blanquita o comparte desde Samsung Notes."}
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-3 sm:columns-2 xl:columns-3">
          {visibles.map((n) => (
            <button key={n.id} type="button" onClick={() => setAbierta(n)}
              className="panel-neko mb-3 block w-full break-inside-avoid rounded-[20px] border border-noche-600 bg-noche-800/90 p-3.5 text-left transition hover:border-violeta/40">
              <span className="flex items-start gap-2">
                <span className="min-w-0 flex-1 font-titulo font-semibold leading-snug text-white">{n.titulo}</span>
                {n.fijada && <IconoNeko nombre="fijar" tamano={15} className="mt-0.5 shrink-0 text-croqueta" />}
              </span>
              <span className="mt-1 line-clamp-6 block whitespace-pre-line text-[13px] leading-relaxed text-white/60">{textoPlano(n.contenido)}</span>
              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                {n.etiquetas.slice(0, 3).map((t) => <Chip key={t} color="#e8a85b">#{t}</Chip>)}
                <span className="ml-auto text-[10.5px] text-white/35">{ORIGEN[n.origen]} · {formatoFechaCorta(n.actualizadoEn ?? n.creadoEn)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {abierta && <EditorNota nota={abierta === "nueva" ? null : abierta} alCerrar={() => setAbierta(null)} />}
      </AnimatePresence>
    </div>
  );
}

function EditorNota({ nota, alCerrar }: { nota: Nota | null; alCerrar: () => void }) {
  const agregar = useNekoStore((s) => s.agregarNota);
  const actualizar = useNekoStore((s) => s.actualizarNota);
  const eliminar = useNekoStore((s) => s.eliminarNota);
  const fijar = useNekoStore((s) => s.alternarFijada);
  const agregarTarea = useNekoStore((s) => s.agregarTarea);
  const fijada = useNekoStore((s) => s.notas.find((n) => n.id === nota?.id)?.fijada ?? false);
  const [editando, setEditando] = useState(!nota);
  const [titulo, setTitulo] = useState(nota?.titulo ?? "");
  const [contenido, setContenido] = useState(nota?.contenido ?? "");
  const [etiquetas, setEtiquetas] = useState(nota?.etiquetas.join(", ") ?? "");
  const [confirmar, setConfirmar] = useState(false);
  const [aviso, setAviso] = useState("");

  const listaEtiquetas = () => etiquetas.split(",").map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter(Boolean);
  const guardar = () => {
    if (!titulo.trim() && !contenido.trim()) return alCerrar();
    const t = titulo.trim() || contenido.split("\n").find((l) => l.trim())?.replace(/^[#>*\-\s]+/, "").slice(0, 80) || "Nota sin título";
    const sinCambios = nota && t === nota.titulo && contenido === nota.contenido && listaEtiquetas().join() === nota.etiquetas.join();
    if (sinCambios) return alCerrar();
    if (nota) actualizar(nota.id, { titulo: t, contenido, etiquetas: listaEtiquetas() });
    else agregar({ titulo: t, contenido, etiquetas: listaEtiquetas(), origen: "app" });
    alCerrar();
  };
  const aTarea = () => {
    const pasos = contenido.split("\n").map((l) => l.replace(/^\s*([-*•]|\d+[.)]|\[ ?\])\s*/, "").trim()).filter((l) => l && l !== titulo).slice(0, 15);
    agregarTarea({ titulo: titulo || "Tarea desde nota", prioridad: "media", etiquetas: ["nota"], checklist: pasos });
    setAviso("Tarea creada en Organizar → Tareas");
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(contenido); setAviso("Copiada"); } catch { setAviso("No pude copiar"); }
  };

  return (
    <Hoja alCerrar={editando ? guardar : alCerrar} ancho="max-w-2xl">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-croqueta/10 text-croqueta"><IconoNeko nombre="nota" tamano={20} /></span>
        <p className="flex-1 font-titulo text-lg font-semibold">{nota ? (editando ? "Editar nota" : "Nota") : "Nueva nota"}</p>
        {nota && <BotonIcono icono="fijar" etiqueta={fijada ? "Desfijar" : "Fijar arriba"} activo={fijada} onClick={() => fijar(nota.id)} />}
        {nota && !editando && <BotonIcono icono="lapiz" etiqueta="Editar" onClick={() => setEditando(true)} />}
        <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={editando ? guardar : alCerrar} />
      </div>

      {editando ? (
        <div className="space-y-2.5">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className={`${campo} font-titulo text-base font-semibold`} autoFocus={!nota} />
          <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Escribe aquí… (puedes usar listas con - y **negritas**)"
            rows={10} className={`${campo} min-h-[200px] resize-y leading-relaxed`} />
          <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} placeholder="Etiquetas separadas por coma: trabajo, ideas" className={campo} />
          <button type="button" onClick={guardar} className="w-full rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche">Guardar</button>
        </div>
      ) : (
        nota && (
          <div className="space-y-3">
            <p className="font-titulo text-xl font-semibold leading-snug">{nota.titulo}</p>
            <div className="max-h-[50vh] overflow-y-auto rounded-xl bg-noche-900/70 p-3 text-sm"><Markdown texto={nota.contenido} /></div>
            {nota.etiquetas.length > 0 && <div className="flex flex-wrap gap-1.5">{nota.etiquetas.map((t) => <Chip key={t} color="#e8a85b">#{t}</Chip>)}</div>}
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <button type="button" onClick={aTarea} className="flex items-center gap-1.5 rounded-xl border border-noche-600 px-3 py-2 text-white/75 hover:border-rosa/50"><IconoNeko nombre="tarea" tamano={16} /> Convertir en tarea</button>
              <button type="button" onClick={copiar} className="flex items-center gap-1.5 rounded-xl border border-noche-600 px-3 py-2 text-white/75 hover:border-violeta/50"><IconoNeko nombre="copiar" tamano={16} /> Copiar</button>
              <button type="button" onClick={() => { if (!confirmar) return setConfirmar(true); eliminar(nota.id); alCerrar(); }}
                className={`ml-auto flex items-center gap-1.5 rounded-xl border px-3 py-2 ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
                <IconoNeko nombre="basura" tamano={16} /> {confirmar ? "Sí, eliminar" : "Eliminar"}
              </button>
            </div>
            <AnimatePresence>
              {aviso && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-semibold text-cian">{aviso}</motion.p>}
            </AnimatePresence>
          </div>
        )
      )}
    </Hoja>
  );
}
