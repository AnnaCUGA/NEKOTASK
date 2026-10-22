/** Prueba de fechas importantes: próxima ocurrencia, edad, 29 de febrero y avisos. */
import { aniosQueCumple, diasParaFecha, ocurrenciasEntre, proximaOcurrencia } from "@/lib/fechasImportantes";
import { calcularRecordatorios, type DatosRecordatorio } from "@/lib/recordatorios/reglas";
import type { FechaImportante } from "@/lib/tipos";

let fallas = 0;
const esperar = (nombre: string, ok: boolean, detalle?: unknown) => {
  console.log(`${ok ? "✔" : "✘"} ${nombre}`);
  if (!ok) { fallas++; console.log("   ", JSON.stringify(detalle)); }
};
const f = (x: Partial<FechaImportante>): FechaImportante => ({
  id: "f1", titulo: "Cumple de Sofi", tipo: "cumpleanos", fecha: "1996-10-25", cadaAnio: true, conAnio: true, avisarDiasAntes: 3, creadoEn: "", ...x,
});

const hoy = "2026-10-21";
esperar("próxima ocurrencia este año", proximaOcurrencia(f({}), hoy) === "2026-10-25");
esperar("faltan 4 días", diasParaFecha(f({}), hoy) === 4);
esperar("cumple 30", aniosQueCumple(f({}), hoy) === 30);
esperar("ya pasó → el próximo año", proximaOcurrencia(f({ fecha: "1996-03-02" }), hoy) === "2027-03-02");
esperar("hoy cuenta como 0", diasParaFecha(f({ fecha: "2000-10-21" }), hoy) === 0);
esperar("sin año → sin edad", aniosQueCumple(f({ conAnio: false }), hoy) === undefined);
esperar("29 feb en año no bisiesto → 28", proximaOcurrencia(f({ fecha: "2000-02-29" }), hoy) === "2027-02-28");
esperar("vencimiento pasado → negativo", diasParaFecha(f({ fecha: "2026-10-01", cadaAnio: false }), hoy) === -20);
esperar("ocurrencias en el rango", JSON.stringify(ocurrenciasEntre(f({}), "2025-10-21", "2027-10-21")) === JSON.stringify(["2025-10-25", "2026-10-25"]));
esperar("no antes de la fecha original", ocurrenciasEntre(f({ fecha: "2026-12-01" }), "2025-10-21", "2027-10-21").length === 1);

const base: DatosRecordatorio = {
  recordatorios: {
    agua: { activo: false, cadaMin: 90, desde: "09:00", hasta: "21:00" },
    rutinas: { activo: false, manana: "08:00", noche: "22:00" },
    tareas: { activo: false, minutosAntes: 15 },
    gatitas: { activo: false, hora: "09:00" },
    fechas: { activo: true, hora: "09:00" },
  },
  metaAguaMl: 2000, tareas: [], registroBebidas: [], habitos: [], registroHabitos: [], citas: [], registroCuidados: [],
  fechasImportantes: [f({ fecha: "1996-10-24" }), f({ id: "f2", fecha: "1990-10-21", titulo: "Aniversario", tipo: "aniversario" })],
};
const en = (hhmm: string, d = base) => calcularRecordatorios(d, new Date(`2026-10-21T${hhmm}:00-06:00`), "America/Mexico_City");
const nueve = en("09:10");
esperar("avisa 3 días antes", nueve.some((r) => r.clave === "fecha-f1-2026-10-21" && r.titulo.startsWith("En 3 días")), nueve);
esperar("avisa el mismo día", nueve.some((r) => r.clave === "fecha-f2-2026-10-21" && r.titulo.startsWith("Hoy")), nueve);
esperar("fuera de horario no avisa", en("07:00").length === 0);
esperar("apagado no avisa", en("09:10", { ...base, recordatorios: { ...base.recordatorios, fechas: { activo: false, hora: "09:00" } } }).length === 0);

if (fallas) { console.log(`\n${fallas} prueba(s) fallaron`); process.exit(1); }
console.log("\nTodo bien");
