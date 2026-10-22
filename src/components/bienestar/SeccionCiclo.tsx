"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { AJUSTES_CICLO, entre, estadoCiclo, mover, tipoDeDia, type EstadoCiclo } from "@/lib/ciclo";
import { confetiDesde } from "@/lib/eventos";
import { hoyISO, mayusculaInicial } from "@/lib/fechas";
import type { AjustesCiclo } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

const ROSA = "#f472b6";
const LILA = "#a78bfa";
const corta = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

export function SeccionCiclo() {
  const dias = useNekoStore((s) => s.diasPeriodo);
  const alternar = useNekoStore((s) => s.alternarDiaPeriodo);
  const aj = useNekoStore((s) => s.ajustes.ciclo) ?? AJUSTES_CICLO;
  const hoy = hoyISO();
  const e = useMemo(() => estadoCiclo(dias, hoy, aj), [dias, hoy, aj]);
  const marcadoHoy = dias.includes(hoy);

  let titulo: string;
  let detalle: string;
  if (!e.periodos.length) {
    titulo = "Empecemos";
    detalle = "Marca en el calendario los días de tu último periodo y Blanquita calcula el próximo.";
  } else if (e.enPeriodo) {
    titulo = `Día ${entre(e.periodos[e.periodos.length - 1].inicio, hoy) + 1} de tu periodo`;
    detalle = "Mango te trajo una mantita. Tómatelo con calma hoy.";
  } else if ((e.diasParaProximo ?? 0) > 0) {
    titulo = e.diasParaProximo === 1 ? "Podría llegar mañana" : `Faltan ${e.diasParaProximo} días`;
    detalle = `Tu próximo periodo llegaría cerca del ${corta(e.proximoInicio!)}.`;
  } else if (e.diasParaProximo === 0) {
    titulo = "Podría llegar hoy";
    detalle = "Si te baja, márcalo con el botón de abajo.";
  } else {
    titulo = `${-e.diasParaProximo!} día${e.diasParaProximo === -1 ? "" : "s"} después de lo estimado`;
    detalle = "Los ciclos varían. Cuando llegue, márcalo y la estimación se ajusta.";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="panel-neko relative overflow-hidden rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Anillo e={e} />
          <div className="min-w-0 flex-1">
            <p className="font-titulo text-xl font-semibold leading-tight">{titulo}</p>
            <p className="mt-1 text-sm text-white/60">{detalle}</p>
          </div>
        </div>
        {e.enPeriodo && <div className="pointer-events-none absolute -bottom-3 right-2 opacity-90"><Gatita clave="mango" pose="echada" expresion="dormida" ancho={86} /></div>}
        <button type="button"
          onClick={(ev) => { if (!marcadoHoy) confetiDesde(ev.currentTarget, ROSA); alternar(hoy); }}
          aria-pressed={marcadoHoy}
          className={`relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-titulo font-semibold transition active:scale-[0.98] ${marcadoHoy ? "border border-rosa/50 bg-rosa/15 text-rosa" : "bg-rosa text-noche shadow-neon-rosa"}`}>
          <IconoNeko nombre={marcadoHoy ? "check" : "flor"} tamano={20} grosor={marcadoHoy ? 2.6 : 1.9} />
          {marcadoHoy ? "Hoy está marcado · toca para quitarlo" : e.enPeriodo ? "Sigo en mi periodo hoy" : "Hoy me bajó"}
        </button>
      </section>

      <Calendario dias={dias} e={e} alTocar={alternar} />

      {e.periodos.length > 0 && (
        <section className="grid grid-cols-3 gap-2">
          <Dato titulo="Ciclo" valor={`${e.cicloPromedio} días`} nota={e.conHistorial ? "tu promedio" : "estimado"} />
          <Dato titulo="Periodo" valor={`${e.periodoPromedio} días`} nota={e.periodos.length > 1 ? "tu promedio" : "estimado"} />
          <Dato titulo="Último" valor={corta(e.periodos[e.periodos.length - 1].inicio)} nota={`hace ${entre(e.periodos[e.periodos.length - 1].inicio, hoy)} días`} />
        </section>
      )}

      {e.periodos.length > 1 && (
        <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-4">
          <p className="mb-2 font-titulo font-semibold">Historial</p>
          <ul className="divide-y divide-noche-600/70">
            {[...e.periodos].reverse().slice(0, 8).map((p, i, arr) => {
              const siguiente = i > 0 ? arr[i - 1] : null;
              return (
                <li key={p.inicio} className="flex items-center gap-3 py-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ROSA }} />
                  <span className="flex-1 text-white/85">{corta(p.inicio)}{p.dias > 1 ? ` – ${corta(p.fin)}` : ""}</span>
                  <span className="text-white/50">{p.dias} día{p.dias === 1 ? "" : "s"}</span>
                  <span className="w-24 text-right text-xs text-white/40">{siguiente ? `ciclo de ${entre(p.inicio, siguiente.inicio)}` : "actual"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <AjustesDelCiclo aj={aj} sinHistorial={!e.conHistorial} />

      <p className="px-2 text-center text-[11px] leading-relaxed text-white/40">
        Las fechas son una estimación con tu propio historial. No sirven como método anticonceptivo ni como diagnóstico.
        Esta información solo la ves tú: no se comparte con Blanquita ni aparece en tu calendario.
      </p>
    </div>
  );
}

/** Anillo del ciclo: periodo (rosa), ventana fértil estimada (lila) y el día de hoy */
function Anillo({ e }: { e: EstadoCiclo }) {
  const n = e.cicloPromedio;
  const r = 44;
  const C = 2 * Math.PI * r;
  const seg = C / n;
  const ultimo = e.periodos[e.periodos.length - 1];
  const fertilIni = e.ventanaFertil && ultimo ? entre(ultimo.inicio, e.ventanaFertil.inicio) : -1;
  const fertilFin = e.ventanaFertil && ultimo ? entre(ultimo.inicio, e.ventanaFertil.fin) : -1;
  const dia = Math.min(e.diaDelCiclo ?? 0, n);
  const diasRosa = !ultimo ? 0 : e.enPeriodo ? Math.max(ultimo.dias, e.periodoPromedio) : ultimo.dias;
  const ang = ((dia - 0.5) / n) * 2 * Math.PI - Math.PI / 2;
  return (
    <div className="relative h-[116px] w-[116px] shrink-0">
      <svg viewBox="0 0 116 116" className="h-full w-full" role="img"
        aria-label={e.diaDelCiclo ? `Día ${e.diaDelCiclo} de un ciclo de ${n} días` : "Sin datos del ciclo todavía"}>
        <g transform="rotate(-90 58 58)">
          {Array.from({ length: n }, (_, i) => {
            const color = i < diasRosa ? ROSA : i >= fertilIni && i <= fertilFin ? LILA : "rgba(255,255,255,.12)";
            return (
              <circle key={i} cx="58" cy="58" r={r} fill="none" stroke={color} strokeWidth="9"
                strokeDasharray={`${Math.max(seg - 2, 1)} ${C}`} strokeDashoffset={-i * seg} />
            );
          })}
        </g>
        {e.diaDelCiclo && e.diaDelCiclo <= n && (
          <motion.circle cx={58 + r * Math.cos(ang)} cy={58 + r * Math.sin(ang)} r="7.5" fill="#fff" stroke="#121212" strokeWidth="3"
            initial={{ scale: 0 }} animate={{ scale: 1 }} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{e.diaDelCiclo ? "Día" : "Ciclo"}</p>
          <p className="font-titulo text-3xl font-semibold leading-none">{e.diaDelCiclo ?? "–"}</p>
        </div>
      </div>
    </div>
  );
}

function Calendario({ dias, e, alTocar }: { dias: string[]; e: EstadoCiclo; alTocar: (d: string) => void }) {
  const hoy = hoyISO();
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const registrados = useMemo(() => new Set(dias), [dias]);
  const [a, m] = mes.split("-").map(Number);
  const primero = `${mes}-01`;
  const total = new Date(a, m, 0).getDate();
  const offset = (new Date(a, m - 1, 1).getDay() + 6) % 7; // lunes primero
  const nombre = mayusculaInicial(new Date(a, m - 1, 15).toLocaleDateString("es-MX", { month: "long", year: "numeric" }));
  const cambiar = (n: number) => { const d = new Date(a, m - 1 + n, 1); setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };

  return (
    <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-4">
      <header className="mb-3 flex items-center gap-2">
        <BotonIcono icono="izquierda" etiqueta="Mes anterior" onClick={() => cambiar(-1)} />
        <p className="flex-1 text-center font-titulo font-semibold">{nombre}</p>
        <BotonIcono icono="derecha" etiqueta="Mes siguiente" onClick={() => cambiar(1)} />
      </header>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="pb-1 text-[10px] font-bold text-white/35">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: total }, (_, i) => {
          const dia = mover(primero, i);
          const tipo = tipoDeDia(dia, registrados, e);
          const futuro = dia > hoy;
          const esHoy = dia === hoy;
          return (
            <button key={dia} type="button" disabled={futuro} onClick={() => alTocar(dia)}
              aria-label={`${i + 1}${tipo === "periodo" ? ", periodo" : tipo === "predicho" ? ", periodo estimado" : tipo === "fertil" ? ", ventana fértil estimada" : ""}`}
              aria-pressed={tipo === "periodo"}
              className={`relative grid aspect-square place-items-center rounded-full text-sm font-semibold transition ${futuro ? "cursor-default" : "active:scale-90"} ${
                tipo === "periodo" ? "text-noche" : tipo ? "text-white" : futuro ? "text-white/30" : "text-white/75 hover:bg-noche-700"
              }`}
              style={
                tipo === "periodo" ? { background: ROSA }
                  : tipo === "predicho" ? { boxShadow: `inset 0 0 0 2px ${ROSA}`, borderRadius: 9999, backgroundImage: `repeating-linear-gradient(45deg, ${ROSA}22 0 3px, transparent 3px 7px)` }
                    : tipo === "fertil" ? { background: `${LILA}2e` }
                      : undefined
              }>
              {i + 1}
              {esHoy && <span className="absolute bottom-1 h-1 w-1 rounded-full" style={{ background: tipo === "periodo" ? "#121212" : "#67e8f9" }} />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/55">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full" style={{ background: ROSA }} />Periodo</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${ROSA}` }} />Periodo estimado</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full" style={{ background: `${LILA}55` }} />Ventana fértil estimada</span>
      </div>
      <p className="mt-2 text-[11px] text-white/40">Toca un día para marcarlo o quitarlo.</p>
    </section>
  );
}

function Dato({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-2xl border border-noche-600 bg-noche-800/90 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-white/50">{titulo}</p>
      <p className="font-titulo text-lg font-semibold">{valor}</p>
      <p className="text-[10px] text-white/40">{nota}</p>
    </div>
  );
}

function AjustesDelCiclo({ aj, sinHistorial }: { aj: AjustesCiclo; sinHistorial: boolean }) {
  const ajustar = useNekoStore((s) => s.actualizarAjustes);
  const [abierto, setAbierto] = useState(false);
  const cambiar = (c: Partial<AjustesCiclo>) => ajustar({ ciclo: { ...aj, ...c } });
  return (
    <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <IconoNeko nombre="ajustes" tamano={18} className="text-white/55" />
        <span className="flex-1 font-titulo font-semibold">Avisos y ajustes</span>
        <IconoNeko nombre="derecha" tamano={16} className={`text-white/40 transition ${abierto ? "rotate-90" : ""}`} />
      </button>
      {abierto && (
        <div className="space-y-3 border-t border-noche-600 px-4 py-3 text-sm">
          <button type="button" role="switch" aria-checked={aj.avisar} onClick={() => cambiar({ avisar: !aj.avisar })} className="flex w-full items-center gap-3 text-left">
            <span className="flex-1 text-white/80">Avisarme antes</span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${aj.avisar ? "bg-violeta" : "bg-noche-600"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${aj.avisar ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>
          {aj.avisar && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 5].map((d) => (
                  <button key={d} type="button" onClick={() => cambiar({ diasAntes: d })} aria-pressed={aj.diasAntes === d}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${aj.diasAntes === d ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 text-white/55"}`}>
                    {d} día{d > 1 ? "s" : ""} antes
                  </button>
                ))}
                <input type="time" value={aj.hora} onChange={(ev) => ev.target.value && cambiar({ hora: ev.target.value })} aria-label="Hora del aviso"
                  className="ml-auto rounded-lg border border-noche-600 bg-noche-900 px-2 py-1 text-xs text-white [color-scheme:dark]" />
              </div>
              <p className="text-[11px] text-white/45">El aviso es discreto: dice &ldquo;Recordatorio de Blanquita · Tienes algo pendiente en Bienestar&rdquo;, nada más.</p>
            </>
          )}
          {sinHistorial && (
            <label className="flex items-center justify-between gap-3 text-white/70">Duración típica de tu ciclo
              <select value={aj.cicloInicial} onChange={(ev) => cambiar({ cicloInicial: +ev.target.value })}
                className="rounded-lg border border-noche-600 bg-noche-900 px-2 py-1 text-white [color-scheme:dark]">
                {Array.from({ length: 21 }, (_, i) => 21 + i).map((n) => <option key={n} value={n}>{n} días</option>)}
              </select>
            </label>
          )}
          {sinHistorial && <p className="text-[11px] text-white/45">Con dos periodos marcados uso tu promedio real.</p>}
        </div>
      )}
    </section>
  );
}
