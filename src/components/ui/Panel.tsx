import type { ReactNode } from "react";
import type { NombreIcono } from "@/lib/tipos";
import { IconoNeko } from "@/components/iconos/IconoNeko";

export function Panel({
  titulo,
  icono,
  acento = "violeta",
  accion,
  children,
  className = "",
  id,
}: {
  titulo: string;
  icono: NombreIcono;
  acento?: "violeta" | "rosa" | "cian" | "croqueta";
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const colorIcono = {
    violeta: "text-violeta bg-violeta/10",
    rosa: "text-rosa bg-rosa/10",
    cian: "text-cian bg-cian/10",
    croqueta: "text-croqueta bg-croqueta/10",
  }[acento];
  return (
    <section
      id={id}
      className={`panel-neko relative rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5 ${className}`}
    >
      <header className="mb-3 flex items-center gap-2.5">
        <span className={`group grid h-9 w-9 place-items-center rounded-xl ${colorIcono}`}>
          <IconoNeko nombre={icono} tamano={20} className="transition-transform group-hover:animate-meneo" />
        </span>
        <h2 className="font-titulo text-[1.05rem] font-semibold tracking-wide text-white/90">{titulo}</h2>
        {accion && <div className="ml-auto">{accion}</div>}
      </header>
      {children}
    </section>
  );
}

export function BotonIcono({
  icono, etiqueta, onClick, className = "", tamano = 18, activo,
}: {
  icono: NombreIcono; etiqueta: string; onClick?: () => void; className?: string; tamano?: number; activo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className={`group grid h-9 w-9 place-items-center rounded-xl border border-noche-600 text-white/70 transition hover:border-violeta/60 hover:text-white active:scale-95 ${activo ? "bg-violeta/20 text-white" : "bg-noche-700"} ${className}`}
    >
      <IconoNeko nombre={icono} tamano={tamano} className="group-hover:animate-meneo" />
    </button>
  );
}

export function Chip({ children, color = "#a78bfa" }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}40` }}
    >
      {children}
    </span>
  );
}
