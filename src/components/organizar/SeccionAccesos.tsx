"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inicial } from "@/components/dinero/ResumenDinero";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { Hoja, campo } from "@/components/ui/Hoja";
import {
  abrirConContrasena, cambiarContrasena, cifrarAcceso, cifrarCarpeta, crearBoveda, descifrarAcceso, descifrarCarpeta, fuerza, generarContrasena, generarFrase, llaveAES, llaveCorrecta,
  type Acceso, type Bytes, type Carpeta, type NivelFuerza,
} from "@/lib/boveda/cripto";
import { abrirConHuella, huellaRegistrada, olvidarHuella, puedeUsarHuella, registrarHuella } from "@/lib/boveda/huella";
import { uid } from "@/lib/fechas";
import { useNekoStore } from "@/store/useNekoStore";

const AUTOBLOQUEO_MS = 2 * 60_000;
const BORRAR_PORTAPAPELES_MS = 30_000;

const NIVEL: Record<NivelFuerza, { texto: string; color: string; ancho: number }> = {
  debil: { texto: "Débil", color: "#d03b3b", ancho: 25 },
  regular: { texto: "Regular", color: "#fab219", ancho: 50 },
  fuerte: { texto: "Fuerte", color: "#0ca30c", ancho: 78 },
  muyFuerte: { texto: "Muy fuerte", color: "#0ca30c", ancho: 100 },
};

/** Copia y, a los 30 s, intenta dejar el portapapeles vacío */
async function copiarSeguro(texto: string) {
  await navigator.clipboard.writeText(texto);
  window.setTimeout(() => { navigator.clipboard.writeText("").catch(() => { /* la app ya no está al frente */ }); }, BORRAR_PORTAPAPELES_MS);
}

export function SeccionAccesos() {
  const meta = useNekoStore((s) => s.bovedaMeta[0]);
  const cifrados = useNekoStore((s) => s.accesosCifrados);
  const carpetasCifradas = useNekoStore((s) => s.carpetasCifradas);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const crudo = useRef<Bytes | null>(null);
  const [llave, setLlave] = useState<CryptoKey | null>(null);
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [huella, setHuella] = useState(false);
  const [huellaDisponible, setHuellaDisponible] = useState(false);
  // mientras sale el lector de huella el sistema puede "ocultar" la app un instante: no cerrar por eso
  const pidiendoHuella = useRef(false);
  const conPausa = useCallback(async <T,>(fn: () => Promise<T>) => {
    pidiendoHuella.current = true;
    try { return await fn(); } finally { window.setTimeout(() => { pidiendoHuella.current = false; }, 800); }
  }, []);

  useEffect(() => { setHuella(huellaRegistrada()); void puedeUsarHuella().then(setHuellaDisponible); }, []);

  const cerrar = useCallback(() => {
    crudo.current?.fill(0);
    crudo.current = null;
    setLlave(null);
    setAccesos([]);
    setCarpetas([]);
  }, []);

  const abrir = useCallback(async (c: Bytes) => {
    crudo.current = c;
    setLlave(await llaveAES(c));
  }, []);

  // descifra en memoria (y otra vez si llegan cambios de otro dispositivo)
  useEffect(() => {
    if (!llave) return;
    let vivo = true;
    void Promise.all(cifrados.map((c) => descifrarAcceso(llave, c))).then((xs) => {
      if (vivo) setAccesos(xs.filter((x): x is Acceso => !!x).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
    });
    return () => { vivo = false; };
  }, [llave, cifrados]);
  useEffect(() => {
    if (!llave) return;
    let vivo = true;
    void Promise.all(carpetasCifradas.map((c) => descifrarCarpeta(llave, c))).then((xs) => {
      if (vivo) setCarpetas(xs.filter((x): x is Carpeta => !!x).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
    });
    return () => { vivo = false; };
  }, [llave, carpetasCifradas]);

  // se cierra sola: 2 minutos sin tocar nada, o al salir de la app
  useEffect(() => {
    if (!llave) return;
    let t = window.setTimeout(cerrar, AUTOBLOQUEO_MS);
    const actividad = () => { clearTimeout(t); t = window.setTimeout(cerrar, AUTOBLOQUEO_MS); };
    const oculta = () => { if (document.visibilityState === "hidden" && !pidiendoHuella.current) cerrar(); };
    window.addEventListener("pointerdown", actividad);
    window.addEventListener("keydown", actividad);
    document.addEventListener("visibilitychange", oculta);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", actividad);
      window.removeEventListener("keydown", actividad);
      document.removeEventListener("visibilitychange", oculta);
    };
  }, [llave, cerrar]);

  useEffect(() => cerrar, [cerrar]); // al cambiar de sección también se cierra

  /** Para ver o copiar una contraseña: si este dispositivo tiene huella, la pide otra vez */
  const confirmar = useCallback(async () => {
    if (!huella || !meta) return true;
    return conPausa(async () => {
      const c = await abrirConHuella();
      const ok = !!c && (await llaveCorrecta(meta, c));
      c?.fill(0);
      return ok;
    });
  }, [huella, meta, conPausa]);

  if (!meta) return <CrearBoveda alCrear={abrir} huellaDisponible={huellaDisponible} alHuella={setHuella} />;
  if (!llave) return <Bloqueada meta={meta} huella={huella} alAbrir={abrir} alOlvidarHuella={() => { olvidarHuella(); setHuella(false); }} />;
  return (
    <BovedaAbierta
      llave={llave}
      accesos={accesos}
      carpetas={carpetas}
      huella={huella}
      huellaDisponible={huellaDisponible}
      confirmar={confirmar}
      alCerrar={cerrar}
      alActivarHuella={async () => {
        if (!crudo.current) return "Abre la bóveda otra vez.";
        const c = crudo.current;
        const error = await conPausa(() => registrarHuella(c));
        if (!error) setHuella(true);
        return error;
      }}
      alQuitarHuella={() => { olvidarHuella(); setHuella(false); }}
      crudo={crudo}
    />
  );
}

// ─── Crear ──────────────────────────────────────────────────────────────
function CampoSecreto({ id, valor, alCambiar, etiqueta, autoFocus, nuevo = false }: {
  id: string; valor: string; alCambiar: (v: string) => void; etiqueta: string; autoFocus?: boolean; nuevo?: boolean;
}) {
  const [ver, setVer] = useState(false);
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-xs font-semibold text-white/55">{etiqueta}</span>
      <span className="flex gap-1.5">
        <input id={id} type={ver ? "text" : "password"} value={valor} onChange={(e) => alCambiar(e.target.value)} autoFocus={autoFocus}
          autoComplete={nuevo ? "new-password" : "current-password"} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          className={`${campo} font-mono tracking-wide`} />
        <BotonIcono icono={ver ? "ojoCerrado" : "ojo"} etiqueta={ver ? "Ocultar" : "Mostrar"} onClick={() => setVer((v) => !v)} className="h-10 w-10 shrink-0" />
      </span>
    </label>
  );
}

function Medidor({ contrasena }: { contrasena: string }) {
  if (!contrasena) return null;
  const f = fuerza(contrasena);
  const n = NIVEL[f.nivel];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-noche-700">
        <motion.div className="h-full rounded-full" style={{ background: n.color }} animate={{ width: `${n.ancho}%` }} />
      </div>
      <p className="flex justify-between text-[11px] font-semibold">
        <span style={{ color: n.color }}>{n.texto}</span>
        <span className="text-white/40">≈ {f.bits} bits</span>
      </p>
    </div>
  );
}

function CrearBoveda({ alCrear, huellaDisponible, alHuella }: { alCrear: (c: Bytes) => Promise<void>; huellaDisponible: boolean; alHuella: (v: boolean) => void }) {
  const guardarMeta = useNekoStore((s) => s.guardarMetaBoveda);
  const [uno, setUno] = useState("");
  const [dos, setDos] = useState("");
  const [entiendo, setEntiendo] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const f = fuerza(uno);
  const valida = uno.length >= 10 && f.nivel !== "debil" && uno === dos && entiendo;

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valida) return;
    setTrabajando(true);
    setError("");
    try {
      const { meta, crudo } = await crearBoveda(uno);
      guardarMeta(meta);
      if (huellaDisponible) {
        const err = await registrarHuella(crudo);
        if (!err) alHuella(true);
      }
      await alCrear(crudo);
    } catch {
      setError("No se pudo crear la bóveda en este navegador.");
      setTrabajando(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="panel-neko overflow-hidden rounded-[22px] border border-noche-600 bg-noche-800/90 p-5">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-cian"><IconoNeko nombre="escudo" tamano={15} /> Bóveda de accesos</p>
            <h2 className="mt-1 font-titulo text-xl font-semibold leading-tight">Tus contraseñas, cifradas y bajo tu huella</h2>
          </div>
          <div className="-mb-5 shrink-0"><Gatita clave="ronro" pose="sentada" expresion="concentrada" ancho={92} /></div>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-white/65">
          <li className="flex gap-2"><IconoNeko nombre="candado" tamano={16} className="mt-0.5 shrink-0 text-violeta" />Se cifran en tu dispositivo antes de guardarse. A la nube solo llega texto revuelto.</li>
          <li className="flex gap-2"><IconoNeko nombre="huellaDigital" tamano={16} className="mt-0.5 shrink-0 text-violeta" />En tu celular la abres con tu huella; la contraseña maestra es tu respaldo.</li>
          <li className="flex gap-2"><IconoNeko nombre="reloj" tamano={16} className="mt-0.5 shrink-0 text-violeta" />Se cierra sola a los 2 minutos o cuando sales de la app.</li>
        </ul>
      </section>

      <form onSubmit={crear} className="panel-neko space-y-3 rounded-[22px] border border-noche-600 bg-noche-800/90 p-5">
        <p className="font-titulo text-lg font-semibold">Crea tu contraseña maestra</p>
        <p className="text-sm text-white/55">Que sea larga y solo tuya. Una frase funciona muy bien, por ejemplo cuatro o cinco palabras que no tengan que ver entre sí.</p>
        <CampoSecreto id="maestra-1" etiqueta="Contraseña maestra" valor={uno} alCambiar={setUno} autoFocus nuevo />
        <Medidor contrasena={uno} />
        {uno && uno.length < 10 && <p className="text-xs text-white/50">Usa al menos 10 caracteres.</p>}
        <CampoSecreto id="maestra-2" etiqueta="Escríbela otra vez" valor={dos} alCambiar={setDos} nuevo />
        {dos && uno !== dos && <p className="text-xs font-semibold text-rosa">No coinciden.</p>}
        <label className="flex items-start gap-2.5 rounded-xl border border-croqueta/40 bg-croqueta/[0.07] p-3 text-sm text-white/80">
          <input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violeta" />
          <span><strong className="text-white">Si la olvido, no se puede recuperar.</strong> Nadie puede abrir la bóveda sin ella, ni siquiera con acceso a mi cuenta. La voy a anotar en un lugar seguro.</span>
        </label>
        {error && <p className="text-sm font-semibold text-rosa">{error}</p>}
        <button type="submit" disabled={!valida || trabajando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violeta to-rosa py-3 font-titulo font-semibold text-noche disabled:opacity-40">
          <IconoNeko nombre="candado" tamano={18} /> {trabajando ? "Cifrando…" : "Crear mi bóveda"}
        </button>
        <p className="text-center text-[11px] text-white/40">Te recomiendo no guardar aquí las claves del trabajo.</p>
      </form>
    </div>
  );
}

// ─── Bloqueada ──────────────────────────────────────────────────────────
function Bloqueada({ meta, huella, alAbrir, alOlvidarHuella }: {
  meta: NonNullable<ReturnType<typeof useNekoStore.getState>["bovedaMeta"][number]>;
  huella: boolean; alAbrir: (c: Bytes) => Promise<void>; alOlvidarHuella: () => void;
}) {
  const [contrasena, setContrasena] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [fallos, setFallos] = useState(0);
  const [esperaHasta, setEsperaHasta] = useState(0);
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    if (esperaHasta <= Date.now()) return;
    const t = window.setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(t);
  }, [esperaHasta]);
  const esperar = Math.max(0, Math.ceil((esperaHasta - ahora) / 1000));

  const conHuella = async () => {
    setError("");
    const c = await abrirConHuella();
    if (c && (await llaveCorrecta(meta, c))) return alAbrir(c);
    c?.fill(0);
    setError("No se pudo con la huella. Usa tu contraseña maestra.");
  };

  const conContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrasena || esperar) return;
    setTrabajando(true);
    setError("");
    const c = await abrirConContrasena(meta, contrasena);
    setTrabajando(false);
    if (c) { setContrasena(""); return alAbrir(c); }
    const n = fallos + 1;
    setFallos(n);
    setError("Esa no es tu contraseña maestra.");
    if (n >= 5) { setEsperaHasta(Date.now() + 30_000); setAhora(Date.now()); setFallos(0); }
  };

  return (
    <div className="mx-auto max-w-md">
      <section className="panel-neko space-y-4 rounded-[22px] border border-noche-600 bg-noche-800/90 p-5 text-center">
        <div className="flex justify-center"><Gatita clave="ronro" pose="sentada" expresion="concentrada" ancho={110} /></div>
        <div>
          <p className="flex items-center justify-center gap-1.5 font-titulo text-xl font-semibold"><IconoNeko nombre="candado" tamano={20} className="text-violeta" /> Bóveda cerrada</p>
          <p className="mt-1 text-sm text-white/55">Ronro la cuida mientras no estás.</p>
        </div>
        {huella && (
          <button type="button" onClick={() => void conHuella()} autoFocus
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violeta to-rosa py-3.5 font-titulo text-base font-semibold text-noche">
            <IconoNeko nombre="huellaDigital" tamano={22} /> Abrir con huella
          </button>
        )}
        <form onSubmit={conContrasena} className="space-y-2 text-left">
          <CampoSecreto id="abrir-maestra" etiqueta={huella ? "O con tu contraseña maestra" : "Contraseña maestra"} valor={contrasena} alCambiar={setContrasena} autoFocus={!huella} />
          <button type="submit" disabled={!contrasena || trabajando || esperar > 0}
            className={`w-full rounded-xl py-2.5 font-titulo font-semibold disabled:opacity-40 ${huella ? "border border-noche-600 text-white/80" : "bg-violeta text-noche"}`}>
            {esperar ? `Espera ${esperar} s` : trabajando ? "Abriendo…" : "Abrir"}
          </button>
        </form>
        {error && <p className="text-sm font-semibold text-rosa" role="alert">{error}</p>}
        {huella && <button type="button" onClick={alOlvidarHuella} className="text-[11px] text-white/35 hover:text-white/60">Quitar la huella de este dispositivo</button>}
      </section>
    </div>
  );
}

// ─── Abierta ────────────────────────────────────────────────────────────
function BovedaAbierta({ llave, accesos, carpetas, huella, huellaDisponible, confirmar, alCerrar, alActivarHuella, alQuitarHuella, crudo }: {
  llave: CryptoKey; accesos: Acceso[]; carpetas: Carpeta[]; huella: boolean; huellaDisponible: boolean;
  confirmar: () => Promise<boolean>; alCerrar: () => void;
  alActivarHuella: () => Promise<string | null>; alQuitarHuella: () => void;
  crudo: React.MutableRefObject<Bytes | null>;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [editar, setEditar] = useState<Acceso | "nuevo" | null>(null);
  const [generador, setGenerador] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [aviso, setAviso] = useState("");
  const [visibles, setVisibles] = useState<Set<string>>(new Set());
  const [carpeta, setCarpeta] = useState<string | null>(null); // null = todas, "" = sin carpeta
  const [editarCarpeta, setEditarCarpeta] = useState<Carpeta | "nueva" | null>(null);
  const existe = (id?: string) => !!id && carpetas.some((c) => c.id === id);
  useEffect(() => { if (carpeta && !carpetas.some((c) => c.id === carpeta)) setCarpeta(null); }, [carpetas, carpeta]);

  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(""), 2600); return () => clearTimeout(t); }, [aviso]);

  const repetidas = useMemo(() => {
    const cuenta = new Map<string, number>();
    accesos.forEach((a) => a.contrasena && cuenta.set(a.contrasena, (cuenta.get(a.contrasena) ?? 0) + 1));
    return new Set([...cuenta].filter(([, n]) => n > 1).map(([c]) => c));
  }, [accesos]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return accesos
      .filter((a) => carpeta === null || (carpeta === "" ? !existe(a.carpetaId) : a.carpetaId === carpeta))
      .filter((a) => !q || `${a.nombre} ${a.usuario} ${a.url} ${a.descripcion}`.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesos, busqueda, carpeta, carpetas]);
  const cuantos = (id: string) => accesos.filter((a) => a.carpetaId === id).length;
  const sinCarpeta = accesos.filter((a) => !existe(a.carpetaId)).length;
  const debiles = accesos.filter((a) => a.contrasena && fuerza(a.contrasena).nivel === "debil").length;

  const copiar = async (texto: string, que: string, pideHuella: boolean) => {
    if (pideHuella && !(await confirmar())) return setAviso("Necesito tu huella para eso.");
    try { await copiarSeguro(texto); setAviso(`${que} copiado · se borra en 30 s`); } catch { setAviso("No pude copiar en este navegador."); }
  };
  const alternarVer = async (id: string) => {
    if (visibles.has(id)) return setVisibles((v) => { const n = new Set(v); n.delete(id); return n; });
    if (!(await confirmar())) return setAviso("Necesito tu huella para mostrarla.");
    setVisibles((v) => new Set(v).add(id));
    window.setTimeout(() => setVisibles((v) => { const n = new Set(v); n.delete(id); return n; }), 20_000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-titulo text-lg font-semibold"><IconoNeko nombre="abierto" tamano={19} className="shrink-0 text-cian" /> Abierta</p>
        <button type="button" onClick={() => setGenerador(true)} aria-label="Generador" className="flex items-center gap-1.5 rounded-xl border border-noche-600 px-3 py-2 text-sm font-semibold text-white/75 hover:border-violeta/50">
          <IconoNeko nombre="dado" tamano={16} /> <span className="hidden sm:inline">Generador</span>
        </button>
        <BotonIcono icono="ajustes" etiqueta="Ajustes de la bóveda" onClick={() => setAjustes(true)} />
        <button type="button" onClick={alCerrar} className="flex items-center gap-1.5 rounded-xl bg-noche-700 px-3 py-2 text-sm font-semibold text-white hover:bg-noche-600">
          <IconoNeko nombre="candado" tamano={16} /> Cerrar
        </button>
      </div>

      {huellaDisponible && !huella && (
        <button type="button" onClick={async () => setAviso((await alActivarHuella()) ?? "Listo: ya puedes abrirla con tu huella.")}
          className="flex w-full items-center gap-3 rounded-2xl border border-cian/40 bg-cian/[0.07] p-3 text-left">
          <IconoNeko nombre="huellaDigital" tamano={24} className="shrink-0 text-cian" />
          <span className="flex-1 text-sm text-white/80"><strong className="text-white">Activa tu huella en este dispositivo</strong> para abrirla sin escribir la contraseña maestra.</span>
        </button>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <IconoNeko nombre="buscar" tamano={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar: banco, Netflix, correo…" aria-label="Buscar accesos"
            autoComplete="off" className={`${campo} rounded-2xl bg-noche-800/90 py-2.5 pl-10`} />
        </div>
        <button type="button" onClick={() => setEditar("nuevo")} className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-violeta to-rosa px-4 font-titulo text-sm font-semibold text-noche">
          <IconoNeko nombre="mas" tamano={17} grosor={2.6} /> Nuevo
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <div className="flex w-max gap-1.5">
          {([[null, "Todas", accesos.length, "#a78bfa"], ...carpetas.map((c) => [c.id, c.nombre, cuantos(c.id), c.color] as const), ...(carpetas.length && sinCarpeta ? [["", "Sin carpeta", sinCarpeta, "#8b86a3"] as const] : [])] as const).map(([id, nombre, n, color]) => {
            const activa = carpeta === id;
            const deCarpeta = typeof id === "string" && id !== "";
            return (
              <button key={id ?? "todas"} type="button" onClick={() => (activa && deCarpeta ? setEditarCarpeta(carpetas.find((c) => c.id === id)!) : setCarpeta(id))}
                aria-pressed={activa} title={activa && deCarpeta ? "Toca otra vez para editarla" : undefined}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activa ? "bg-noche-700 text-white" : "border-noche-600 bg-noche-800/80 text-white/60"}`}
                style={activa ? { borderColor: color } : undefined}>
                {deCarpeta ? <span style={{ color }}><IconoNeko nombre="carpeta" tamano={14} /></span> : null}
                {nombre} <span className="tabular-nums text-white/40">{n}</span>
                {activa && deCarpeta && <IconoNeko nombre="lapiz" tamano={12} className="text-white/50" />}
              </button>
            );
          })}
          <button type="button" onClick={() => setEditarCarpeta("nueva")}
            className="flex items-center gap-1 rounded-full border border-dashed border-noche-600 px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white">
            <IconoNeko nombre="mas" tamano={13} /> Carpeta
          </button>
        </div>
      </div>

      {(debiles > 0 || repetidas.size > 0) && (
        <p className="flex items-center gap-2 rounded-xl border border-noche-600 bg-noche-800/80 px-3 py-2 text-xs text-white/65">
          <IconoNeko nombre="escudo" tamano={15} className="shrink-0 text-croqueta" />
          {[debiles && `${debiles} débil${debiles > 1 ? "es" : ""}`, repetidas.size && `${repetidas.size} repetida${repetidas.size > 1 ? "s" : ""} en varias cuentas`].filter(Boolean).join(" · ")}. Te conviene cambiarlas por unas del generador.
        </p>
      )}

      {filtrados.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-noche-600 bg-noche-800/60 p-6 text-center">
          <div className="flex justify-center"><Gatita clave="ronro" pose="echada" ancho={110} /></div>
          <p className="mt-2 font-titulo font-semibold">{accesos.length ? "No encontré ese acceso" : "Tu bóveda está vacía"}</p>
          <p className="mt-1 text-sm text-white/55">{accesos.length ? "Prueba con otra palabra." : "Agrega tu primer acceso con el botón Nuevo."}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtrados.map((a) => {
            const ver = visibles.has(a.id);
            const debil = a.contrasena && fuerza(a.contrasena).nivel === "debil";
            const repetida = repetidas.has(a.contrasena);
            return (
              <li key={a.id} className="panel-neko rounded-[20px] border border-noche-600 bg-noche-800/90 p-3">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setEditar(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Editar ${a.nombre}`}>
                    <Inicial nombre={a.nombre} color="#a78bfa" tamano={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-white/90">{a.nombre}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-white/50">
                        {carpeta === null && existe(a.carpetaId) && (() => { const c = carpetas.find((x) => x.id === a.carpetaId)!; return <span className="flex shrink-0 items-center gap-0.5" style={{ color: c.color }}><IconoNeko nombre="carpeta" tamano={11} />{c.nombre} ·</span>; })()}
                        <span className="truncate">{a.usuario || a.descripcion || "Sin usuario"}</span>
                      </span>
                    </span>
                  </button>
                  {a.usuario && <BotonIcono icono="copiar" etiqueta={`Copiar usuario de ${a.nombre}`} tamano={16} onClick={() => void copiar(a.usuario, "Usuario", false)} />}
                </div>
                {a.contrasena && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-noche-900/70 py-1 pl-3 pr-1">
                    <span className="min-w-0 flex-1 truncate font-mono text-sm tracking-wide text-white/80">{ver ? a.contrasena : "••••••••••••"}</span>
                    {(debil || repetida) && <span className="shrink-0 rounded-full bg-croqueta/15 px-2 py-0.5 text-[10px] font-bold text-croqueta">{debil ? "Débil" : "Repetida"}</span>}
                    <BotonIcono icono={ver ? "ojoCerrado" : "ojo"} etiqueta={ver ? "Ocultar contraseña" : "Ver contraseña"} tamano={16} onClick={() => void alternarVer(a.id)} className="h-8 w-8" />
                    <BotonIcono icono="copiar" etiqueta={`Copiar contraseña de ${a.nombre}`} tamano={16} onClick={() => void copiar(a.contrasena, "Contraseña", true)} className="h-8 w-8" />
                  </div>
                )}
                {a.descripcion && a.usuario && <p className="mt-1.5 line-clamp-2 px-1 text-xs text-white/45">{a.descripcion}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[11px] text-white/35"><IconoNeko nombre="reloj" tamano={12} /> Se cierra sola a los 2 minutos sin uso o al salir de la app.</p>

      <AnimatePresence>
        {editar && <EditorAcceso llave={llave} acceso={editar === "nuevo" ? null : editar} carpetas={carpetas} carpetaInicial={carpeta || undefined} confirmar={confirmar} alCerrar={() => setEditar(null)} alAviso={setAviso} />}
      </AnimatePresence>
      <AnimatePresence>
        {editarCarpeta && (
          <EditorCarpeta llave={llave} carpeta={editarCarpeta === "nueva" ? null : editarCarpeta} cuantos={editarCarpeta === "nueva" ? 0 : cuantos(editarCarpeta.id)}
            accesos={accesos} alCerrar={(id) => { setEditarCarpeta(null); if (id !== undefined) setCarpeta(id); }} alAviso={setAviso} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {generador && (
          <Hoja alCerrar={() => setGenerador(false)}>
            <div className="mb-2 flex items-center gap-2">
              <p className="flex flex-1 items-center gap-1.5 font-titulo text-lg font-semibold"><IconoNeko nombre="dado" tamano={19} className="text-violeta" /> Generador</p>
              <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={() => setGenerador(false)} />
            </div>
            <Generador alUsar={(c) => void copiar(c, "Contraseña", false)} textoUsar="Copiar" />
          </Hoja>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {ajustes && (
          <AjustesBoveda crudo={crudo} huella={huella} huellaDisponible={huellaDisponible} total={accesos.length}
            alActivarHuella={alActivarHuella} alQuitarHuella={alQuitarHuella} alCerrar={() => setAjustes(false)} alAviso={setAviso} alBorrada={alCerrar} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {aviso && (
          <motion.p role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed inset-x-3 bottom-[152px] z-[60] mx-auto max-w-sm rounded-2xl border border-noche-600 bg-noche-800/95 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-neon lg:bottom-8">
            {aviso}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Generador ──────────────────────────────────────────────────────────
function Generador({ alUsar, textoUsar }: { alUsar: (c: string) => void; textoUsar: string }) {
  const [modo, setModo] = useState<"contrasena" | "frase">("contrasena");
  const [largo, setLargo] = useState(20);
  const [mayusculas, setMayusculas] = useState(true);
  const [numeros, setNumeros] = useState(true);
  const [simbolos, setSimbolos] = useState(true);
  const [palabras, setPalabras] = useState(6);
  const [valor, setValor] = useState("");
  const nueva = useCallback(() => {
    setValor(modo === "frase" ? generarFrase(palabras) : generarContrasena({ largo, mayusculas, numeros, simbolos }));
  }, [modo, largo, mayusculas, numeros, simbolos, palabras]);
  useEffect(nueva, [nueva]);

  const Chip = ({ activo, alCambiar, children }: { activo: boolean; alCambiar: (v: boolean) => void; children: React.ReactNode }) => (
    <button type="button" aria-pressed={activo} onClick={() => alCambiar(!activo)}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${activo ? "border-violeta/60 bg-violeta/20 text-white" : "border-noche-600 text-white/50"}`}>{children}</button>
  );

  return (
    <div className="space-y-3">
      <div className="flex rounded-xl bg-noche-900 p-1" role="tablist" aria-label="Tipo">
        {([["contrasena", "Contraseña"], ["frase", "Frase fácil de recordar"]] as const).map(([m, n]) => (
          <button key={m} type="button" role="tab" aria-selected={modo === m} onClick={() => setModo(m)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${modo === m ? "bg-noche-700 text-white" : "text-white/50"}`}>{n}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-noche-600 bg-noche-900 p-2 pl-3">
        <p className="min-w-0 flex-1 break-all font-mono text-[15px] text-white" aria-live="polite">{valor}</p>
        <BotonIcono icono="reiniciar" etiqueta="Otra" onClick={nueva} className="shrink-0" />
      </div>
      <Medidor contrasena={valor} />
      {modo === "contrasena" ? (
        <>
          <label className="flex items-center gap-3 text-sm text-white/70">
            Largo
            <input type="range" min={8} max={40} value={largo} onChange={(e) => setLargo(+e.target.value)} className="min-w-0 flex-1 accent-violeta" aria-label="Largo" />
            <span className="w-7 text-right font-bold tabular-nums text-white">{largo}</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            <Chip activo={mayusculas} alCambiar={setMayusculas}>ABC</Chip>
            <Chip activo={numeros} alCambiar={setNumeros}>123</Chip>
            <Chip activo={simbolos} alCambiar={setSimbolos}>#$%</Chip>
          </div>
          <p className="text-[11px] text-white/40">Sin letras que se confunden (0/O, 1/l/I).</p>
        </>
      ) : (
        <>
          <label className="flex items-center gap-3 text-sm text-white/70">
            Palabras
            <input type="range" min={3} max={9} value={palabras} onChange={(e) => setPalabras(+e.target.value)} className="min-w-0 flex-1 accent-violeta" aria-label="Palabras" />
            <span className="w-7 text-right font-bold tabular-nums text-white">{palabras}</span>
          </label>
          <p className="text-[11px] text-white/40">Más fácil de escribir en el celular. Para cuentas importantes usa 6 palabras o más.</p>
        </>
      )}
      <button type="button" onClick={() => alUsar(valor)} className="w-full rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche">{textoUsar}</button>
    </div>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────
function EditorAcceso({ llave, acceso, carpetas, carpetaInicial, confirmar, alCerrar, alAviso }: {
  llave: CryptoKey; acceso: Acceso | null; carpetas: Carpeta[]; carpetaInicial?: string;
  confirmar: () => Promise<boolean>; alCerrar: () => void; alAviso: (t: string) => void;
}) {
  const guardar = useNekoStore((s) => s.guardarAccesoCifrado);
  const eliminar = useNekoStore((s) => s.eliminarAccesoCifrado);
  const [nombre, setNombre] = useState(acceso?.nombre ?? "");
  const [usuario, setUsuario] = useState(acceso?.usuario ?? "");
  const [contrasena, setContrasena] = useState(acceso?.contrasena ?? "");
  const [url, setUrl] = useState(acceso?.url ?? "");
  const [descripcion, setDescripcion] = useState(acceso?.descripcion ?? "");
  const [carpetaId, setCarpetaId] = useState(acceso ? (carpetas.some((c) => c.id === acceso.carpetaId) ? acceso.carpetaId ?? "" : "") : carpetaInicial ?? "");
  const [ver, setVer] = useState(!acceso);
  const [generando, setGenerando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const pegar = async (alPegar: (t: string) => void) => {
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (t) { alPegar(t); alAviso("Pegado"); } else alAviso("El portapapeles está vacío.");
    } catch {
      alAviso("Mantén presionado el campo y elige Pegar.");
    }
  };
  const verContrasena = async () => {
    if (ver) return setVer(false);
    if (acceso && !(await confirmar())) return alAviso("Necesito tu huella para mostrarla.");
    setVer(true);
  };
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setTrabajando(true);
    const ahora = new Date().toISOString();
    const a: Acceso = {
      id: acceso?.id ?? uid(),
      nombre: nombre.trim(), usuario: usuario.trim(), contrasena, url: url.trim(), descripcion: descripcion.trim(),
      ...(carpetaId ? { carpetaId } : {}),
      creadoEn: acceso?.creadoEn ?? ahora, actualizadoEn: ahora,
    };
    guardar(await cifrarAcceso(llave, a));
    alAviso(acceso ? "Guardado y cifrado" : "Acceso cifrado y guardado");
    alCerrar();
  };

  const BotonPegar = ({ alPegar }: { alPegar: (t: string) => void }) => (
    <BotonIcono icono="pegar" etiqueta="Pegar" onClick={() => void pegar(alPegar)} className="h-10 w-10 shrink-0" />
  );

  return (
    <Hoja alCerrar={alCerrar}>
      <form onSubmit={enviar} className="space-y-3" autoComplete="off">
        <div className="flex items-center gap-2">
          <Inicial nombre={nombre || "?"} color="#a78bfa" tamano={40} />
          <p className="flex-1 font-titulo text-lg font-semibold">{acceso ? "Editar acceso" : "Nuevo acceso"}</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={alCerrar} />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-white/55">¿De qué es?</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Netflix, banco, correo personal…" className={campo} autoFocus={!acceso} />
        </label>
        {carpetas.length > 0 && (
          <div>
            <span className="mb-1 block text-xs font-semibold text-white/55">Carpeta</span>
            <div className="flex flex-wrap gap-1.5">
              {[{ id: "", nombre: "Ninguna", color: "#8b86a3" }, ...carpetas].map((c) => (
                <button key={c.id || "ninguna"} type="button" onClick={() => setCarpetaId(c.id)} aria-pressed={carpetaId === c.id}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${carpetaId === c.id ? "bg-noche-700 text-white" : "border-noche-600 text-white/55"}`}
                  style={carpetaId === c.id ? { borderColor: c.color } : undefined}>
                  {c.id && <span style={{ color: c.color }}><IconoNeko nombre="carpeta" tamano={13} /></span>} {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-white/55">Usuario o correo</span>
          <span className="flex gap-1.5">
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={campo} />
            <BotonPegar alPegar={setUsuario} />
          </span>
        </label>
        <div>
          <span className="mb-1 block text-xs font-semibold text-white/55">Contraseña</span>
          <span className="flex gap-1.5">
            <input type={ver ? "text" : "password"} value={contrasena} onChange={(e) => setContrasena(e.target.value)} aria-label="Contraseña"
              autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${campo} font-mono tracking-wide`} />
            <BotonIcono icono={ver ? "ojoCerrado" : "ojo"} etiqueta={ver ? "Ocultar" : "Mostrar"} onClick={() => void verContrasena()} className="h-10 w-10 shrink-0" />
            <BotonPegar alPegar={setContrasena} />
            <BotonIcono icono="dado" etiqueta="Generar una" activo={generando} onClick={() => setGenerando((v) => !v)} className="h-10 w-10 shrink-0" />
          </span>
          <div className="mt-2"><Medidor contrasena={contrasena} /></div>
        </div>
        <AnimatePresence initial={false}>
          {generando && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-xl border border-violeta/30 bg-noche-900/60 p-3">
                <Generador textoUsar="Usar esta" alUsar={(c) => { setContrasena(c); setVer(true); setGenerando(false); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-white/55">Enlace (opcional)</span>
          <span className="flex gap-1.5">
            <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://…" autoCapitalize="none" spellCheck={false} className={campo} />
            {/^https?:\/\//.test(url) && (
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir enlace"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-noche-600 text-white/60 hover:text-white"><IconoNeko nombre="enlace" tamano={17} /></a>
            )}
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-white/55">Descripción: de dónde es, para qué la usas</span>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} placeholder="Cuenta familiar, la de la tarjeta azul, preguntas de seguridad…" className={`${campo} resize-none`} />
        </label>
        <div className="flex gap-2 pt-1">
          {acceso && (
            <button type="button" onClick={() => { if (!confirmarBorrar) return setConfirmarBorrar(true); eliminar(acceso.id); alAviso("Acceso borrado"); alCerrar(); }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold ${confirmarBorrar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
              <IconoNeko nombre="basura" tamano={16} /> {confirmarBorrar ? "Sí, borrar" : "Borrar"}
            </button>
          )}
          <button type="submit" disabled={!nombre.trim() || trabajando} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche disabled:opacity-40">
            <IconoNeko nombre="candado" tamano={16} /> Guardar cifrado
          </button>
        </div>
      </form>
    </Hoja>
  );
}

// ─── Ajustes ────────────────────────────────────────────────────────────
function AjustesBoveda({ crudo, huella, huellaDisponible, total, alActivarHuella, alQuitarHuella, alCerrar, alAviso, alBorrada }: {
  crudo: React.MutableRefObject<Bytes | null>; huella: boolean; huellaDisponible: boolean; total: number;
  alActivarHuella: () => Promise<string | null>; alQuitarHuella: () => void; alCerrar: () => void; alAviso: (t: string) => void; alBorrada: () => void;
}) {
  const meta = useNekoStore((s) => s.bovedaMeta[0]);
  const guardarMeta = useNekoStore((s) => s.guardarMetaBoveda);
  const borrarBoveda = useNekoStore((s) => s.borrarBoveda);
  const [nueva, setNueva] = useState("");
  const [otra, setOtra] = useState("");
  const [palabra, setPalabra] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const valida = nueva.length >= 10 && fuerza(nueva).nivel !== "debil" && nueva === otra;

  const cambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valida || !crudo.current || !meta) return;
    setTrabajando(true);
    guardarMeta(await cambiarContrasena(meta, crudo.current, nueva));
    setTrabajando(false);
    alAviso("Contraseña maestra cambiada");
    alCerrar();
  };

  return (
    <Hoja alCerrar={alCerrar}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <p className="flex flex-1 items-center gap-1.5 font-titulo text-lg font-semibold"><IconoNeko nombre="escudo" tamano={19} className="text-violeta" /> Ajustes de la bóveda</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={alCerrar} />
        </div>

        <section className="space-y-2 rounded-xl border border-noche-600 bg-noche-900/50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><IconoNeko nombre="huellaDigital" tamano={17} /> Huella en este dispositivo</p>
          {huella ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs text-white/55">Activa. Se pide para abrir, ver y copiar contraseñas.</p>
              <button type="button" onClick={() => { alQuitarHuella(); alAviso("Huella quitada de este dispositivo"); }} className="rounded-lg border border-noche-600 px-3 py-1.5 text-xs font-semibold text-white/70">Quitar</button>
            </div>
          ) : huellaDisponible ? (
            <button type="button" onClick={async () => alAviso((await alActivarHuella()) ?? "Huella activada")} className="rounded-lg bg-cian px-3 py-1.5 text-xs font-bold text-noche">Activar huella</button>
          ) : (
            <p className="text-xs text-white/50">Este navegador no permite la huella aquí. Se abre con la contraseña maestra.</p>
          )}
        </section>

        <form onSubmit={cambiar} className="space-y-2 rounded-xl border border-noche-600 bg-noche-900/50 p-3">
          <p className="text-sm font-semibold">Cambiar contraseña maestra</p>
          <CampoSecreto id="nueva-maestra" etiqueta="Nueva" valor={nueva} alCambiar={setNueva} nuevo />
          <Medidor contrasena={nueva} />
          <CampoSecreto id="nueva-maestra-2" etiqueta="Otra vez" valor={otra} alCambiar={setOtra} nuevo />
          {otra && nueva !== otra && <p className="text-xs font-semibold text-rosa">No coinciden.</p>}
          <button type="submit" disabled={!valida || trabajando} className="w-full rounded-xl bg-violeta py-2 text-sm font-bold text-noche disabled:opacity-40">{trabajando ? "Cifrando…" : "Cambiar"}</button>
          <p className="text-[11px] text-white/40">Tus accesos no se tocan. La huella de tus dispositivos sigue funcionando.</p>
        </form>

        <section className="space-y-2 rounded-xl border border-rosa/30 bg-rosa/[0.05] p-3">
          <p className="text-sm font-semibold text-rosa">Borrar la bóveda</p>
          <p className="text-xs text-white/55">Se borran tus {total} accesos de todos tus dispositivos. No se puede deshacer. Escribe BORRAR para confirmar.</p>
          <div className="flex gap-2">
            <input value={palabra} onChange={(e) => setPalabra(e.target.value)} aria-label="Escribe BORRAR" className={campo} autoCapitalize="characters" />
            <button type="button" disabled={palabra !== "BORRAR"} onClick={() => { borrarBoveda(); alQuitarHuella(); alBorrada(); }}
              className="shrink-0 rounded-xl bg-rosa px-3 text-sm font-bold text-noche disabled:opacity-30">Borrar</button>
          </div>
        </section>
      </div>
    </Hoja>
  );
}

// ─── Carpetas ───────────────────────────────────────────────────────────
const COLORES_CARPETA = ["#a78bfa", "#f472b6", "#67e8f9", "#fbbf24", "#9cc96b", "#fb923c", "#e5e7eb"];

function EditorCarpeta({ llave, carpeta, cuantos, accesos, alCerrar, alAviso }: {
  llave: CryptoKey; carpeta: Carpeta | null; cuantos: number; accesos: Acceso[];
  alCerrar: (idElegida?: string | null) => void; alAviso: (t: string) => void;
}) {
  const guardar = useNekoStore((s) => s.guardarCarpetaCifrada);
  const eliminar = useNekoStore((s) => s.eliminarCarpetaCifrada);
  const guardarAcceso = useNekoStore((s) => s.guardarAccesoCifrado);
  const [nombre, setNombre] = useState(carpeta?.nombre ?? "");
  const [color, setColor] = useState(carpeta?.color ?? COLORES_CARPETA[0]);
  const [confirmar, setConfirmar] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    const c: Carpeta = { id: carpeta?.id ?? uid(), nombre: nombre.trim(), color, actualizadoEn: new Date().toISOString() };
    guardar(await cifrarCarpeta(llave, c));
    alAviso(carpeta ? "Carpeta guardada" : "Carpeta creada");
    alCerrar(c.id);
  };
  const borrar = async () => {
    if (!carpeta) return;
    if (!confirmar) return setConfirmar(true);
    // sus accesos no se borran: se quedan sin carpeta
    const ahora = new Date().toISOString();
    for (const a of accesos.filter((x) => x.carpetaId === carpeta.id)) {
      const { carpetaId: _, ...resto } = a;
      guardarAcceso(await cifrarAcceso(llave, { ...resto, actualizadoEn: ahora }));
    }
    eliminar(carpeta.id);
    alAviso("Carpeta borrada");
    alCerrar(null);
  };

  return (
    <Hoja alCerrar={() => alCerrar()}>
      <form onSubmit={enviar} className="space-y-3" autoComplete="off">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}26`, color }}><IconoNeko nombre="carpeta" tamano={22} /></span>
          <p className="flex-1 font-titulo text-lg font-semibold">{carpeta ? "Editar carpeta" : "Nueva carpeta"}</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={() => alCerrar()} />
        </div>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Bancos, streaming, escuela, gatitas…" aria-label="Nombre de la carpeta" className={campo} autoFocus />
        <div className="flex flex-wrap gap-2">
          {COLORES_CARPETA.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
              className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-noche-800" : ""}`} style={{ background: c }} />
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          {carpeta && (
            <button type="button" onClick={() => void borrar()}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
              {confirmar ? (cuantos ? `Sí (sus ${cuantos} quedan sin carpeta)` : "Sí, borrar") : "Borrar"}
            </button>
          )}
          <button type="submit" disabled={!nombre.trim()} className="flex-1 rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche disabled:opacity-40">
            {carpeta ? "Guardar" : "Crear carpeta"}
          </button>
        </div>
        <p className="text-center text-[11px] text-white/40">El nombre de la carpeta también va cifrado.</p>
      </form>
    </Hoja>
  );
}
