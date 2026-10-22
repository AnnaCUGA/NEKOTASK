"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Gatita } from "@/components/gatitas/Gatita";
import { IconoNeko } from "@/components/iconos/IconoNeko";
import { BotonIcono } from "@/components/ui/Panel";
import { Hoja, campo } from "@/components/ui/Hoja";
import { useUIDinero } from "@/components/dinero/HojaMovimiento";
import { leerMonto, pesos } from "@/lib/dinero";
import { confetiDesde } from "@/lib/eventos";
import { leerItem, subtotal, totalesLista } from "@/lib/listas";
import type { ItemLista, Lista, NombreIcono } from "@/lib/tipos";
import { useNekoStore } from "@/store/useNekoStore";

const ICONOS_LISTA: NombreIcono[] = ["carrito", "huella", "pelicula", "libro", "lista", "regalo", "casa", "plato", "estrella", "corazon", "pastilla", "chispa"];
const COLORES = ["#9cc96b", "#e8a85b", "#f472b6", "#67e8f9", "#a78bfa", "#fbbf24", "#f87171", "#e5e7eb"];

export function SeccionListas() {
  const listas = useNekoStore((s) => s.listas);
  const [elegida, setElegida] = useState<string | null>(null);
  const [editar, setEditar] = useState<Lista | "nueva" | null>(null);
  const actual = listas.find((l) => l.id === elegida) ?? listas[0];

  useEffect(() => {
    if (elegida && !listas.some((l) => l.id === elegida)) setElegida(null);
  }, [listas, elegida]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* selector de listas: chips en el celular, columna en escritorio */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="flex w-max gap-2 lg:w-auto lg:flex-col">
          {listas.map((l) => {
            const pendientes = l.items.filter((i) => !i.hecho).length;
            const activa = l.id === actual?.id;
            return (
              <button key={l.id} type="button" onClick={() => setElegida(l.id)} aria-current={activa ? "true" : undefined}
                className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition lg:py-2.5 ${activa ? "bg-noche-700" : "border-noche-600 bg-noche-800/80 hover:bg-noche-700/60"}`}
                style={activa ? { borderColor: `${l.color}80` } : undefined}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: `${l.color}1f`, color: l.color }}>
                  <IconoNeko nombre={l.icono} tamano={18} />
                </span>
                <span className="min-w-0 lg:flex-1">
                  <span className="block truncate text-sm font-semibold text-white/90">{l.nombre}</span>
                  <span className="hidden text-[11px] text-white/45 lg:block">{l.items.length ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : "Vacía"}</span>
                </span>
                {pendientes > 0 && <span className="rounded-full px-1.5 text-[11px] font-bold lg:hidden" style={{ color: l.color, background: `${l.color}1f` }}>{pendientes}</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => setEditar("nueva")}
            className="flex items-center gap-2 rounded-2xl border border-dashed border-noche-600 px-3 py-2 text-sm font-semibold text-white/55 hover:border-violeta/50 hover:text-white lg:py-2.5">
            <IconoNeko nombre="mas" tamano={18} /> Nueva lista
          </button>
        </div>
      </div>

      {actual ? <DetalleLista lista={actual} alEditar={() => setEditar(actual)} /> : (
        <div className="rounded-[22px] border border-dashed border-noche-600 p-6 text-center text-sm text-white/55">Crea tu primera lista.</div>
      )}

      <AnimatePresence>
        {editar && (
          <EditorLista lista={editar === "nueva" ? null : editar}
            alCerrar={(id) => { setEditar(null); if (id) setElegida(id); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function DetalleLista({ lista, alEditar }: { lista: Lista; alEditar: () => void }) {
  const agregar = useNekoStore((s) => s.agregarItemLista);
  const actualizar = useNekoStore((s) => s.actualizarItemLista);
  const quitar = useNekoStore((s) => s.eliminarItemLista);
  const limpiar = useNekoStore((s) => s.limpiarLista);
  const [texto, setTexto] = useState("");
  const [verHechos, setVerHechos] = useState(true);
  const [editandoPrecio, setEditandoPrecio] = useState<string | null>(null);
  const abrirDinero = useUIDinero((s) => s.abrir);
  const precios = !!lista.conPrecios;
  const totales = totalesLista(lista.items);

  const pendientes = lista.items.filter((i) => !i.hecho);
  const hechos = lista.items.filter((i) => i.hecho);
  const completa = lista.items.length > 0 && pendientes.length === 0;
  const progreso = lista.items.length ? hechos.length / lista.items.length : 0;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    // permite pegar varias cosas a la vez, una por renglón o separadas por coma
    const partes = texto.split(/\n|,(?![^(]*\))/).map((t) => t.trim()).filter(Boolean);
    partes.forEach((p) => {
      if (!precios) return agregar(lista.id, p);
      const x = leerItem(p);
      agregar(lista.id, x.texto, { piezas: x.piezas, precio: x.precio });
    });
    setTexto("");
  };

  const fila = (item: ItemLista) => {
    const { id, texto: t, hecho } = item;
    const sub = subtotal(item);
    const editando = editandoPrecio === id;
    return (
      <motion.li key={id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
        className={`group rounded-xl px-2 py-2 hover:bg-noche-700/50 ${editando ? "bg-noche-700/50" : ""}`}>
        <div className="flex items-center gap-3">
          <button type="button" role="checkbox" aria-checked={hecho} aria-label={t}
            onClick={(e) => { if (!hecho) confetiDesde(e.currentTarget, lista.color); actualizar(lista.id, id, { hecho: !hecho }); }}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition"
            style={{ borderColor: hecho ? lista.color : `${lista.color}80`, background: hecho ? lista.color : "transparent" }}>
            {hecho && <IconoNeko nombre="check" tamano={14} grosor={3} className="text-noche" />}
          </button>
          <span className="min-w-0 flex-1">
            <span className={`block text-[15px] ${hecho ? "text-white/35 line-through" : "text-white/90"}`}>
              {(item.piezas ?? 1) > 1 && <span className="mr-1 font-semibold text-white/55">{item.piezas}×</span>}{t}
            </span>
            {precios && item.precio && (item.piezas ?? 1) > 1 && <span className="block text-[11px] text-white/40">{pesos(item.precio)} c/u</span>}
          </span>
          {precios && (
            <button type="button" onClick={() => setEditandoPrecio(editando ? null : id)} aria-expanded={editando}
              aria-label={item.precio ? `Precio de ${t}: ${pesos(sub)}. Cambiar` : `Ponerle precio a ${t}`}
              className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-bold tabular-nums transition ${item.precio ? (hecho ? "border-transparent text-white/40" : "border-noche-600 text-white/85") : "border-dashed border-noche-600 text-white/35 hover:text-white/70"}`}>
              {item.precio ? pesos(sub) : "$ —"}
            </button>
          )}
          <button type="button" onClick={() => quitar(lista.id, id)} aria-label={`Quitar ${t}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/30 hover:text-rosa lg:opacity-0 lg:group-hover:opacity-100">
            <IconoNeko nombre="cerrar" tamano={14} />
          </button>
        </div>
        {editando && (
          <EditorPrecio item={item} color={lista.color}
            alGuardar={(c) => { actualizar(lista.id, id, c); setEditandoPrecio(null); }} />
        )}
      </motion.li>
    );
  };

  return (
    <section className="panel-neko rounded-[22px] border border-noche-600 bg-noche-800/90 p-4 sm:p-5">
      <header className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${lista.color}1f`, color: lista.color }}>
          <IconoNeko nombre={lista.icono} tamano={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-titulo text-lg font-semibold">{lista.nombre}</h2>
          <p className="text-xs text-white/45">{lista.items.length ? `${hechos.length} de ${lista.items.length} listos` : "Agrega lo primero"}</p>
        </div>
        <BotonIcono icono="lapiz" etiqueta="Editar lista" onClick={alEditar} />
      </header>

      {lista.items.length > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-noche-700">
          <motion.div className="h-full rounded-full" style={{ background: lista.color }} animate={{ width: `${progreso * 100}%` }} />
        </div>
      )}

      <form onSubmit={enviar} className="mt-4 flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={precios ? "Agregar… ej. 2x leche $28, pan $45" : "Agregar… (puedes separar con comas)"} aria-label="Agregar a la lista" className={campo} />
        <button type="submit" disabled={!texto.trim()} aria-label="Agregar"
          className="grid h-10 w-11 shrink-0 place-items-center rounded-xl text-noche disabled:opacity-40" style={{ background: lista.color }}>
          <IconoNeko nombre="mas" tamano={20} grosor={2.8} />
        </button>
      </form>

      <AnimatePresence>
        {completa && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-noche-600 bg-noche-900/60 p-2 pr-3">
            <Gatita clave="bizca" pose="sentada" expresion="feliz" ancho={62} />
            <p className="flex-1 text-sm text-white/75"><strong className="text-white">¡Lista completa!</strong> ¿La dejas lista para la próxima vez?</p>
          </motion.div>
        )}
      </AnimatePresence>

      {precios && lista.items.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-noche-600 bg-noche-900/60 px-3 py-2">
            <p className="text-[11px] font-semibold text-white/50">Total estimado</p>
            <p className="font-titulo text-lg font-semibold tabular-nums">{pesos(totales.estimado)}</p>
            <p className="text-[10.5px] text-white/40">{totales.sinPrecio ? `${totales.sinPrecio} sin precio` : "todo con precio"}</p>
          </div>
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: `${lista.color}55`, background: `${lista.color}12` }}>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-white/60"><IconoNeko nombre="carrito" tamano={12} /> En el carrito</p>
            <p className="font-titulo text-lg font-semibold tabular-nums">{pesos(totales.enCarrito)}</p>
            <p className="text-[10.5px] text-white/40">faltan {pesos(totales.faltaPorComprar, true)}</p>
          </div>
        </div>
      )}

      <ul className="mt-3">
        <AnimatePresence initial={false}>
          {pendientes.map(fila)}
        </AnimatePresence>
      </ul>

      {hechos.length > 0 && (
        <div className="mt-2 border-t border-noche-600 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setVerHechos((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-white/50">
              <IconoNeko nombre="derecha" tamano={14} className={`transition ${verHechos ? "rotate-90" : ""}`} /> Listos ({hechos.length})
            </button>
            <div className="ml-auto flex flex-wrap justify-end gap-1.5">
              {precios && totales.enCarrito > 0 && (
                <button type="button"
                  onClick={() => abrirDinero("gasto", undefined, { monto: totales.enCarrito, categoriaId: lista.id === "lista-gatitas" ? "cat-gatitas" : "cat-super", nota: lista.nombre })}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-noche" style={{ background: lista.color }}>
                  <IconoNeko nombre="gasto" tamano={13} /> Anotar {pesos(totales.enCarrito, true)} en Dinero
                </button>
              )}
              <button type="button" onClick={() => limpiar(lista.id, "desmarcar")}
                className="flex items-center gap-1 rounded-lg border border-noche-600 px-2.5 py-1 text-xs font-semibold text-white/65 hover:text-white">
                <IconoNeko nombre="reiniciar" tamano={13} /> Reusar
              </button>
              <button type="button" onClick={() => limpiar(lista.id, "quitarHechos")}
                className="flex items-center gap-1 rounded-lg border border-noche-600 px-2.5 py-1 text-xs font-semibold text-white/65 hover:text-rosa">
                <IconoNeko nombre="basura" tamano={13} /> Quitar listos
              </button>
            </div>
          </div>
          {verHechos && (
            <ul className="mt-1">
              <AnimatePresence initial={false}>
                {hechos.map(fila)}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/** Cuántas y cuánto cuesta cada una; se guarda al tocar "Listo" */
function EditorPrecio({ item, color, alGuardar }: { item: ItemLista; color: string; alGuardar: (c: Pick<ItemLista, "piezas" | "precio">) => void }) {
  const [piezas, setPiezas] = useState(item.piezas ?? 1);
  const [precio, setPrecio] = useState(item.precio ? String(item.precio) : "");
  const valor = leerMonto(precio);
  const guardar = (e: React.FormEvent) => { e.preventDefault(); alGuardar({ piezas: piezas > 1 ? piezas : undefined, precio: valor || undefined }); };
  return (
    <form onSubmit={guardar} className="ml-9 mt-2 flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-noche-600 bg-noche-900" role="group" aria-label="Cuántas">
        <button type="button" onClick={() => setPiezas((n) => Math.max(1, n - 1))} aria-label="Una menos" className="grid h-8 w-8 place-items-center text-white/60 hover:text-white"><IconoNeko nombre="menos" tamano={14} /></button>
        <span className="w-7 text-center text-sm font-bold tabular-nums">{piezas}</span>
        <button type="button" onClick={() => setPiezas((n) => Math.min(99, n + 1))} aria-label="Una más" className="grid h-8 w-8 place-items-center text-white/60 hover:text-white"><IconoNeko nombre="mas" tamano={14} /></button>
      </div>
      <label className="flex items-center rounded-lg border border-noche-600 bg-noche-900 px-2 focus-within:border-violeta/60">
        <span className="text-sm text-white/40">$</span>
        <input value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="0" autoFocus
          aria-label="Precio por pieza" className="h-8 w-20 bg-transparent px-1 text-sm font-semibold text-white outline-none placeholder:text-white/25" />
        <span className="text-[11px] text-white/35">c/u</span>
      </label>
      {valor > 0 && piezas > 1 && <span className="text-xs font-semibold tabular-nums text-white/60">= {pesos(valor * piezas)}</span>}
      <button type="submit" className="ml-auto h-8 rounded-lg px-3 text-xs font-bold text-noche" style={{ background: color }}>Listo</button>
    </form>
  );
}

function EditorLista({ lista, alCerrar }: { lista: Lista | null; alCerrar: (idNueva?: string) => void }) {
  const agregarLista = useNekoStore((s) => s.agregarLista);
  const actualizarLista = useNekoStore((s) => s.actualizarLista);
  const eliminarLista = useNekoStore((s) => s.eliminarLista);
  const [nombre, setNombre] = useState(lista?.nombre ?? "");
  const [icono, setIcono] = useState<NombreIcono>(lista?.icono ?? "lista");
  const [color, setColor] = useState(lista?.color ?? COLORES[4]);
  const [conPrecios, setConPrecios] = useState(lista?.conPrecios ?? false);
  const [confirmar, setConfirmar] = useState(false);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    if (lista) { actualizarLista(lista.id, { nombre: nombre.trim(), icono, color, conPrecios }); alCerrar(); }
    else alCerrar(agregarLista({ nombre: nombre.trim(), icono, color, conPrecios }));
  };

  return (
    <Hoja alCerrar={() => alCerrar()}>
      <form onSubmit={guardar} className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}><IconoNeko nombre={icono} tamano={22} /></span>
          <p className="flex-1 font-titulo text-lg font-semibold">{lista ? "Editar lista" : "Nueva lista"}</p>
          <BotonIcono icono="cerrar" etiqueta="Cerrar" onClick={() => alCerrar()} />
        </div>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre: farmacia, regalos, viaje…" className={campo} autoFocus />
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/55">Ícono</p>
          <div className="grid grid-cols-6 gap-1.5">
            {ICONOS_LISTA.map((i) => (
              <button key={i} type="button" onClick={() => setIcono(i)} aria-label={i} aria-pressed={icono === i}
                className={`grid h-10 place-items-center rounded-xl border transition ${icono === i ? "bg-noche-700" : "border-noche-600 text-white/55"}`}
                style={icono === i ? { borderColor: color, color } : undefined}>
                <IconoNeko nombre={i} tamano={19} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-white/55">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLORES.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
                className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-noche-800" : ""}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <button type="button" role="switch" aria-checked={conPrecios} onClick={() => setConPrecios((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl border border-noche-600 bg-noche-900/50 px-3 py-2.5 text-left">
          <span className="flex-1">
            <span className="block text-sm font-semibold text-white/85">Llevar cuenta de precios</span>
            <span className="block text-[11px] text-white/45">Para compras: precio por cosa, total estimado y lo que llevas en el carrito.</span>
          </span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${conPrecios ? "bg-violeta" : "bg-noche-600"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${conPrecios ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </button>
        <div className="flex gap-2 pt-1">
          {lista && (
            <button type="button" onClick={() => { if (!confirmar) return setConfirmar(true); eliminarLista(lista.id); alCerrar(); }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold ${confirmar ? "border-rosa bg-rosa/15 text-rosa" : "border-noche-600 text-white/60"}`}>
              <IconoNeko nombre="basura" tamano={16} /> {confirmar ? "Sí, borrar" : "Borrar"}
            </button>
          )}
          <button type="submit" disabled={!nombre.trim()} className="flex-1 rounded-xl bg-violeta py-2.5 font-titulo font-semibold text-noche disabled:opacity-40">
            {lista ? "Guardar" : "Crear lista"}
          </button>
        </div>
      </form>
    </Hoja>
  );
}
