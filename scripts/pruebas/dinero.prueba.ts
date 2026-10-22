/** Prueba de Dinero: montos, resumen del mes, presupuesto y suscripciones. */
import { cobrosPendientes, estadoPresupuesto, leerMonto, montoMensual, resumenMes, siguienteCobro, sumarMeses } from "@/lib/dinero";
import { calcularRecordatorios, type DatosRecordatorio } from "@/lib/recordatorios/reglas";
import type { Suscripcion, Transaccion } from "@/lib/tipos";
import { CATEGORIAS_INICIALES } from "@/store/datosIniciales";

let fallas = 0;
const esperar = (nombre: string, ok: boolean, detalle?: unknown) => {
  console.log(`${ok ? "✔" : "✘"} ${nombre}`);
  if (!ok) { fallas++; console.log("   ", JSON.stringify(detalle)); }
};

esperar("leer 1,234.50", leerMonto("1,234.50") === 1234.5);
esperar("leer 99,9 (coma decimal)", leerMonto("99,9") === 99.9);
esperar("leer $250", leerMonto("$250") === 250);
esperar("leer basura → 0", leerMonto("abc") === 0);
esperar("meses: dic + 1 = ene", sumarMeses("2026-12", 1) === "2027-01");

const t = (x: Partial<Transaccion>): Transaccion => ({ id: Math.random().toString(), tipo: "gasto", monto: 100, categoriaId: "cat-comida", fecha: "2026-10-05", creadoEn: "", ...x });
const lista = [
  t({ monto: 150 }), t({ monto: 80.5, categoriaId: "cat-super", fecha: "2026-10-21" }), t({ monto: 300, categoriaId: "cat-borrada" }),
  t({ tipo: "ingreso", monto: 9000, categoriaId: "cat-sueldo", fecha: "2026-10-15" }), t({ monto: 999, fecha: "2026-09-30" }),
];
const r = resumenMes(lista, CATEGORIAS_INICIALES, "2026-10");
esperar("gastos del mes", r.gastos === 530.5, r);
esperar("ingresos del mes", r.ingresos === 9000);
esperar("balance", r.balance === 8469.5);
esperar("categoría borrada cae en Otros", r.porCategoria[0].categoria.id === "cat-otros" && r.porCategoria[0].total === 300, r.porCategoria);
esperar("por día: día 21", r.porDia[20] === 80.5 && r.porDia.length === 31);
esperar("presupuesto: 85% = cerca", estadoPresupuesto(850, 1000) === "cerca");
esperar("presupuesto: pasado", estadoPresupuesto(1001, 1000) === "pasado");

esperar("cobro 31 ene → 28 feb", siguienteCobro("2027-01-31", "mensual", 31) === "2027-02-28");
esperar("28 feb → 31 mar (recuerda el día)", siguienteCobro("2027-02-28", "mensual", 31) === "2027-03-31");
esperar("anual", siguienteCobro("2026-11-03", "anual", 3) === "2027-11-03");
esperar("semanal", siguienteCobro("2026-12-29", "semanal", 29) === "2027-01-05");
esperar("anual → mensual", Math.round(montoMensual({ monto: 1200, frecuencia: "anual" })) === 100);

const sub = (x: Partial<Suscripcion>): Suscripcion => ({ id: "s1", nombre: "Netflix", monto: 219, frecuencia: "mensual", proximoCobro: "2026-10-22", diaCobro: 22, categoriaId: "cat-suscripciones", avisarDiasAntes: 1, activa: true, color: "#000", creadoEn: "", ...x });
esperar("pendientes: hoy y vencidos sí, futuros no",
  cobrosPendientes([sub({ id: "a", proximoCobro: "2026-10-21" }), sub({ id: "b", proximoCobro: "2026-10-01" }), sub({ id: "c" }), sub({ id: "d", proximoCobro: "2026-10-01", activa: false })], "2026-10-21").map((x) => x.id).join() === "b,a");

const base: DatosRecordatorio = {
  recordatorios: {
    agua: { activo: false, cadaMin: 90, desde: "09:00", hasta: "21:00" }, rutinas: { activo: false, manana: "08:00", noche: "22:00" },
    tareas: { activo: false, minutosAntes: 15 }, gatitas: { activo: false, hora: "09:00" }, fechas: { activo: false, hora: "09:00" }, dinero: { activo: true, hora: "10:00" },
  },
  metaAguaMl: 2000, tareas: [], registroBebidas: [], habitos: [], registroHabitos: [], citas: [], registroCuidados: [],
  suscripciones: [sub({}), sub({ id: "s2", nombre: "Spotify", proximoCobro: "2026-10-21" }), sub({ id: "s3", nombre: "Gym", proximoCobro: "2026-10-25" })],
};
const avisos = calcularRecordatorios(base, new Date("2026-10-21T10:05:00-06:00"), "America/Mexico_City");
esperar("aviso un día antes (Netflix)", avisos.some((a) => a.titulo === "Mañana se cobra Netflix"), avisos);
esperar("aviso el mismo día (Spotify)", avisos.some((a) => a.titulo === "Hoy se cobra Spotify"));
esperar("Gym todavía no", !avisos.some((a) => a.titulo.includes("Gym")));

if (fallas) { console.log(`\n${fallas} prueba(s) fallaron`); process.exit(1); }
console.log("\nTodo bien");
