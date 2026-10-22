"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { bus, confetiDesde } from "@/lib/eventos";
import { glu, miau, mrrp, ronroneo } from "@/lib/sonidos";
import type { ClaveGatita, NombreIcono } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";
import { Gatita, type Expresion, type MovCabeza, type Pose } from "./Gatita";
import { FondoSala } from "./FondoSala";
import { Alfombra, CATALOGO_DECORACION, Guirnalda, PiezaDecoracion } from "./Decoracion";
import { decoracionPropia } from "@/store/useNekoStore";
import { ORDEN_GATITAS, PERFILES } from "./perfiles";
import { IconoNeko } from "@/components/iconos/IconoNeko";

// ─── Estado de cada gatita en la escena ─────────────────────────────────
interface Burbuja { texto?: string; icono?: NombreIcono; color?: string }
interface EstadoGatita {
  x: number;                // % del ancho
  pose: Pose;
  expresion: Expresion;
  cabeza: MovCabeza;
  espejo: boolean;
  caminando: boolean;
  ronroneando: boolean;
  burbuja?: Burbuja;
  salto: number;            // contador: cada incremento = un brinquito
  ocupadaHasta: number;     // epoch ms; mientras tanto no hace cosas al azar
  platito?: string;         // color de la bebida en su platito
  durMs: number;            // duración del último paseo
}

const X_INICIAL: Record<ClaveGatita, number> = { blanquita: 13, bizca: 38, mango: 63, ronro: 87 };
const POSES_AL_AZAR: Pose[] = ["sentada", "sentada", "echada", "echada", "dormida", "panzaArriba"];

function estadoInicial(): Record<ClaveGatita, EstadoGatita> {
  return Object.fromEntries(
    ORDEN_GATITAS.map((c) => [
      c,
      {
        x: X_INICIAL[c],
        pose: PERFILES[c].poseFavorita,
        expresion: "normal",
        cabeza: "normal",
        espejo: c === "ronro",
        caminando: false,
        ronroneando: false,
        salto: 0,
        ocupadaHasta: 0,
        durMs: 400,
      },
    ]),
  ) as Record<ClaveGatita, EstadoGatita>;
}

const azar = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// ─── Escena ─────────────────────────────────────────────────────────────
export function EscenaGatitas({ alto = 210 }: { alto?: number }) {
  const [estado, setEstado] = useState(estadoInicial);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const contenedor = useRef<HTMLDivElement>(null);
  const refsGatitas = useRef<Partial<Record<ClaveGatita, HTMLDivElement | null>>>({});
  const [ancho, setAncho] = useState(800);
  const temporizadores = useRef<number[]>([]);

  const decoracion = useNekoStore((s) => s.decoracion);
  const accesoriosViejos = useNekoStore((s) => s.accesoriosComprados);
  const enSala = decoracionPropia({ decoracion, accesoriosComprados: accesoriosViejos });
  const sonidos = useNekoStore((s) => s.ajustes.sonidos);
  const sonidosRef = useRef(sonidos);
  sonidosRef.current = sonidos;
  const fasePomodoro = useNekoStore((s) => s.pomodoro.fase);

  const despues = useCallback((ms: number, fn: () => void) => {
    const t = window.setTimeout(fn, ms);
    temporizadores.current.push(t);
  }, []);

  const cambiar = useCallback((c: ClaveGatita, cambios: Partial<EstadoGatita> | ((g: EstadoGatita) => Partial<EstadoGatita>)) => {
    setEstado((s) => {
      const g = s[c];
      const parche = typeof cambios === "function" ? cambios(g) : cambios;
      return { ...s, [c]: { ...g, ...parche } };
    });
  }, []);

  /** Reacción completa: brinco + cara + burbuja, y vuelve a la normalidad */
  const reaccionar = useCallback(
    (c: ClaveGatita, opts: { expresion?: Expresion; pose?: Pose; burbuja?: Burbuja; ronronear?: boolean; cabeza?: MovCabeza; ms?: number; brinco?: boolean; confeti?: boolean }) => {
      const ms = opts.ms ?? 2600;
      cambiar(c, (g) => ({
        expresion: opts.expresion ?? "feliz",
        pose: opts.pose ?? (g.pose === "dormida" ? "sentada" : g.pose),
        burbuja: opts.burbuja,
        ronroneando: !!opts.ronronear,
        cabeza: opts.cabeza ?? "normal",
        salto: opts.brinco === false ? g.salto : g.salto + 1,
        ocupadaHasta: Date.now() + ms,
      }));
      if (opts.confeti) despues(150, () => confetiDesde(refsGatitas.current[c] ?? null));
      despues(ms, () => cambiar(c, { expresion: "normal", burbuja: undefined, ronroneando: false, cabeza: "normal" }));
    },
    [cambiar, despues],
  );

  /** Camina hacia una x (en %) y luego ejecuta `alLlegar` */
  const caminar = useCallback(
    (c: ClaveGatita, destino: number, alLlegar?: () => void) => {
      const g = estadoRef.current[c];
      const dist = Math.abs(destino - g.x);
      const ms = Math.max(500, dist * 55);
      cambiar(c, { x: destino, durMs: ms, espejo: destino < g.x, caminando: true, pose: "sentada", expresion: "normal", ocupadaHasta: Date.now() + ms + 400 });
      despues(ms, () => {
        cambiar(c, { caminando: false });
        alLlegar?.();
      });
    },
    [cambiar, despues],
  );

  // tamaño responsivo
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => temporizadores.current.forEach((t) => clearTimeout(t)), []);

  // ── Vida propia: cada pocos segundos alguna gatita hace algo ──────────
  useEffect(() => {
    const tick = () => {
      const ahora = Date.now();
      const libres = ORDEN_GATITAS.filter((c) => estadoRef.current[c].ocupadaHasta < ahora);
      if (libres.length) {
        const c = azar(libres);
        const g = estadoRef.current[c];
        const r = Math.random();
        if (r < 0.3) {
          // cambiar de postura
          const pose = azar(POSES_AL_AZAR.filter((p) => p !== g.pose));
          cambiar(c, {
            pose,
            expresion: pose === "panzaArriba" ? "feliz" : "normal",
            burbuja: pose === "dormida" ? { texto: "zzz", icono: "luna" } : undefined,
            ocupadaHasta: ahora + 3000,
          });
          if (pose === "dormida") despues(2600, () => cambiar(c, { burbuja: undefined }));
        } else if (r < 0.55) {
          // pasear
          caminar(c, 8 + Math.random() * 84);
        } else if (r < 0.8 && libres.length > 1) {
          // visitar a otra gatita: se acicalan o juegan
          const otra = azar(ORDEN_GATITAS.filter((o) => o !== c));
          const go = estadoRef.current[otra];
          const destino = Math.min(92, Math.max(8, go.x + (go.x > g.x ? -12 : 12)));
          caminar(c, destino, () => {
            const juego = Math.random() < 0.5;
            cambiar(c, { espejo: go.x < destino });
            reaccionar(c, { expresion: "feliz", burbuja: { icono: "corazon", color: "#f472b6" }, ms: 2800, brinco: juego });
            reaccionar(otra, {
              expresion: "feliz",
              pose: juego ? "panzaArriba" : go.pose === "dormida" ? "echada" : go.pose,
              burbuja: juego ? { texto: "¡a jugar!" } : { texto: "prrr" },
              ronronear: !juego,
              ms: 2800,
              brinco: false,
            });
          });
        } else {
          // bostezo / estiramiento
          cambiar(c, { expresion: "sorprendida", cabeza: "inclinada", ocupadaHasta: ahora + 1600 });
          despues(1300, () => cambiar(c, { expresion: "normal", cabeza: "normal" }));
        }
      }
      temporizadores.current.push(window.setTimeout(tick, 3500 + Math.random() * 3500));
    };
    const t = window.setTimeout(tick, 2500);
    temporizadores.current.push(t);
  }, [caminar, cambiar, despues, reaccionar]);

  // ── Reacciones a lo que pasa en la app ────────────────────────────────
  useEffect(() => {
    return bus.escuchar((e) => {
      const sonar = sonidosRef.current;
      switch (e.tipo) {
        case "tarea-completada":
          if (sonar) mrrp(1.1);
          reaccionar("bizca", { pose: "panzaArriba", burbuja: { texto: "¡lista!", icono: "check", color: "#a78bfa" }, confeti: true });
          break;
        case "bebida": {
          const xPlato = 6;
          caminar("blanquita", xPlato + 7, () => {
            cambiar("blanquita", { espejo: true, platito: e.color });
            if (sonar) glu();
            reaccionar("blanquita", {
              expresion: e.metaAlcanzada ? "feliz" : "dormida",
              cabeza: "bebiendo",
              burbuja: { texto: e.metaAlcanzada ? "¡meta!" : "glu glu", icono: "agua", color: e.color },
              ms: 3000,
              brinco: false,
              confeti: e.metaAlcanzada,
            });
            despues(3200, () => cambiar("blanquita", { platito: undefined }));
          });
          break;
        }
        case "habito":
          if (sonar) ronroneo(1.2);
          reaccionar("ronro", {
            pose: "echada",
            ronronear: true,
            burbuja: e.racha > 1 ? { texto: `${e.racha} días`, icono: "racha", color: "#f9a8d4" } : { texto: "prrr" },
          });
          break;
        case "rutina-completa":
          if (sonar) miau();
          ORDEN_GATITAS.forEach((c, i) =>
            despues(i * 160, () => reaccionar(c, { burbuja: i === 0 ? { texto: "¡rutina!", icono: "estrella", color: "#e8a85b" } : undefined, confeti: i === 0 })),
          );
          break;
        case "pomodoro-inicio":
          reaccionar("mango", { pose: "sentada", expresion: "concentrada", burbuja: { texto: "a enfocarnos", icono: "reloj", color: "#9cc96b" }, ms: 2400, brinco: false });
          break;
        case "pomodoro-fin":
          if (sonar) miau();
          reaccionar("mango", { burbuja: { texto: "¡descanso!", icono: "estrella", color: "#9cc96b" }, confeti: true });
          break;
        case "cuidado":
          if (sonar) mrrp(0.9);
          reaccionar(e.gatita, { burbuja: { icono: "corazon", texto: "gracias", color: "#f472b6" }, ronronear: true });
          break;
        case "compra": {
          const c = e.gatita ?? azar(ORDEN_GATITAS);
          if (sonar) mrrp(1.25);
          reaccionar(c, { expresion: "sorprendida", burbuja: { texto: "¡qué lindo!", icono: "chispa", color: "#c4b5fd" } });
          break;
        }
      }
    });
  }, [caminar, cambiar, despues, reaccionar]);

  // Mientras corre un Pomodoro de trabajo, Mango se queda concentrada
  useEffect(() => {
    if (fasePomodoro === "trabajo") cambiar("mango", { expresion: "concentrada", pose: "sentada", ocupadaHasta: Date.now() + 10 ** 9 });
    else cambiar("mango", { expresion: "normal", ocupadaHasta: 0 });
  }, [fasePomodoro, cambiar]);

  const tocar = (c: ClaveGatita) => {
    const g = estadoRef.current[c];
    const sonar = sonidosRef.current;
    if (g.pose === "dormida") {
      if (sonar) mrrp(0.8);
      reaccionar(c, { pose: "sentada", expresion: "sorprendida", burbuja: { texto: "¿mm?" }, ms: 1800 });
      return;
    }
    const r = Math.random();
    if (sonar) (r < 0.4 ? miau : r < 0.7 ? () => ronroneo(1.4) : mrrp)();
    reaccionar(c, {
      burbuja: r < 0.4 ? { texto: "¡miau!" } : r < 0.7 ? { texto: "prrr", icono: "corazon", color: "#f472b6" } : { icono: "corazon", color: "#f472b6" },
      ronronear: r >= 0.4 && r < 0.7,
      ms: 2000,
    });
  };

  const tamGatita = Math.round(Math.min(132, Math.max(76, ancho / 5.6)));
  const escalaDeco = tamGatita / 110;

  return (
    <div
      ref={contenedor}
      className="relative isolate w-full select-none overflow-hidden rounded-[22px] border border-noche-600"
      style={{ height: alto }}
    >
      <FondoSala />
      {enSala.includes("luces") && <Guirnalda />}
      {enSala.includes("alfombra") && <Alfombra />}
      {CATALOGO_DECORACION.filter((d) => enSala.includes(d.clave) && d.lugar.ancho > 0).map((d) => (
        <div key={d.clave} className="pointer-events-none absolute"
          style={d.lugar.donde === "arriba"
            ? { left: `${d.lugar.x}%`, top: 6, transform: "translateX(-50%)", zIndex: 0 }
            : { left: `${d.lugar.x}%`, bottom: 8, transform: "translateX(-50%)", zIndex: d.lugar.detras ? 0 : 100 }}>
          <PiezaDecoracion clave={d.clave} ancho={Math.round(d.lugar.ancho * (d.lugar.donde === "arriba" ? 1 : escalaDeco))} />
        </div>
      ))}
      {/* platito de agua */}
      <div className="absolute" style={{ left: "6%", bottom: 12, transform: "translateX(-50%)" }}>
        <Platito color={estado.blanquita.platito} />
      </div>

      {ORDEN_GATITAS.map((c) => {
        const g = estado[c];
        return (
          <motion.div
            key={c}
            ref={(el) => { refsGatitas.current[c] = el; }}
            className="absolute bottom-[10px] cursor-pointer"
            style={{ x: "-50%", zIndex: Math.round(g.x) }}
            initial={false}
            animate={{ left: `${g.x}%` }}
            transition={{ duration: g.durMs / 1000, ease: "easeInOut" }}
            onClick={() => tocar(c)}
          >
            <GatitaEnEscena estado={g} clave={c} tam={tamGatita} />
          </motion.div>
        );
      })}
    </div>
  );
}

function GatitaEnEscena({ estado, clave, tam }: { estado: EstadoGatita; clave: ClaveGatita; tam: number }) {
  const controles = useAnimationControls();
  const [encima, setEncima] = useState(false);

  useEffect(() => {
    if (estado.salto > 0) void controles.start({ y: [0, -28, 0, -9, 0], transition: { duration: 0.65, ease: "easeOut" } });
  }, [estado.salto, controles]);

  return (
    <motion.div
      animate={controles}
      onHoverStart={() => setEncima(true)}
      onHoverEnd={() => setEncima(false)}
      className="relative"
    >
      <div>
        <Gatita
          clave={clave}
          pose={estado.pose}
          expresion={encima && estado.expresion === "normal" && estado.pose !== "dormida" ? "feliz" : estado.expresion}
          cabeza={encima && estado.cabeza === "normal" ? "inclinada" : estado.cabeza}
          espejo={estado.espejo}
          ronroneando={estado.ronroneando}
          caminando={estado.caminando}
          ancho={tam}
        />
      </div>
      <AnimatePresence>
        {estado.burbuja && (
          <motion.div
            key={(estado.burbuja.texto ?? "") + (estado.burbuja.icono ?? "")}
            initial={{ opacity: 0, y: 8, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[60%] whitespace-nowrap"
          >
            <div
              className="flex items-center gap-1 rounded-2xl border-2 border-tinta bg-[#fbf7f1] px-2.5 py-1 font-titulo text-[13px] font-semibold text-tinta shadow-[0_3px_0_#2b2233]"
            >
              {estado.burbuja.icono && (
                <span style={{ color: estado.burbuja.color ?? "#f472b6" }}>
                  <IconoNeko nombre={estado.burbuja.icono} tamano={15} grosor={2.4} />
                </span>
              )}
              {estado.burbuja.texto}
            </div>
            <div className="mx-auto -mt-[2px] h-2 w-3 border-x-2 border-b-2 border-tinta bg-[#fbf7f1] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Platito({ color }: { color?: string }) {
  return (
    <svg width="46" height="22" viewBox="0 0 46 22" aria-hidden>
      <ellipse cx="23" cy="8" rx="19" ry="5" fill={color ?? "#67c7f0"} opacity={color ? 0.95 : 0.55} stroke="#2b2233" strokeWidth="2" />
      <path d="M4 8 L8 18 Q23 23 38 18 L42 8 Q23 14 4 8 Z" fill="#c4b5fd" stroke="#2b2233" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M14 13.5h4M21 14.5h4M28 13.5h4" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
