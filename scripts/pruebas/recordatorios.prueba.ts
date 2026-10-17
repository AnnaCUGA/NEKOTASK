/** Prueba de las reglas de recordatorios con un día ficticio en Ciudad de México. */
import { calcularRecordatorios, type DatosRecordatorio } from "@/lib/recordatorios/reglas";

const Z = "America/Mexico_City";
const a = (hhmm: string) => new Date(`2026-10-16T${hhmm}:00-06:00`);
const base: DatosRecordatorio = {
  recordatorios: {
    agua: { activo: true, cadaMin: 90, desde: "09:00", hasta: "21:00" },
    rutinas: { activo: true, manana: "08:00", noche: "22:00" },
    tareas: { activo: true, minutosAntes: 15 },
    gatitas: { activo: true, hora: "09:00" },
  },
  metaAguaMl: 2000,
  tareas: [{ id: "t1", titulo: "Comprar arena", completada: false, fechaLimite: a("19:00").toISOString() }],
  registroBebidas: [],
  habitos: [
    { id: "h1", nombre: "Lavarse los dientes", rutina: "manana", diasSemana: [] },
    { id: "h2", nombre: "Lavarse la cara", rutina: "noche", diasSemana: [] },
  ],
  registroHabitos: [],
  citas: [{ id: "c1", gatita: "mango", tipo: "vacuna", fecha: "2026-10-16", hecha: false }],
  registroCuidados: [],
};

let fallas = 0;
const claves = (hora: string, d: DatosRecordatorio = base) => calcularRecordatorios(d, a(hora), Z).map((r) => r.clave.split("-").slice(0, 2).join("-"));
const esperar = (nombre: string, ok: boolean, detalle?: unknown) => {
  console.log(`${ok ? "✔" : "✘"} ${nombre}`);
  if (!ok) { fallas++; console.log("   ", JSON.stringify(detalle)); }
};

esperar("08:10 → rutina de mañana pendiente", claves("08:10").includes("rutina-manana"), claves("08:10"));
esperar("08:10 → aún no avisa del agua (antes de las 9)", !claves("08:10").some((c) => c.startsWith("agua")));
esperar("09:20 → cita de vacuna de Mango", claves("09:20").includes("cita-c1"), claves("09:20"));
esperar("12:00 sin tomar nada → aviso de agua", claves("12:00").some((c) => c.startsWith("agua")), claves("12:00"));
const conAgua = { ...base, registroBebidas: [{ ml: 1000, porcentaje: 100, en: a("11:30").toISOString() }] };
esperar("12:00 con 1 L tomado → sin aviso de agua", !claves("12:00", conAgua).some((c) => c.startsWith("agua")), claves("12:00", conAgua));
esperar("18:50 → tarea en 10 min", claves("18:50").includes("tarea-t1"), claves("18:50"));
esperar("18:30 → todavía no avisa de la tarea", !claves("18:30").includes("tarea-t1"));
esperar("20:15 → cuidados de gatitas pendientes", claves("20:15").includes("cuidados-2026"), claves("20:15"));
const rutinaHecha = { ...base, registroHabitos: [{ habitoId: "h2", fecha: "2026-10-16" }] };
esperar("22:05 con rutina hecha → sin aviso de noche", !claves("22:05", rutinaHecha).includes("rutina-noche"));
esperar("22:05 sin rutina → aviso de noche", claves("22:05").includes("rutina-noche"));
const t = calcularRecordatorios(base, a("12:00"), Z).find((r) => r.gatita === "blanquita");
esperar("el aviso de agua trae botón +250 ml", t?.acciones?.[0]?.accion === "agua-250");

console.log(fallas ? `\n${fallas} fallas` : "\nTodo bien");
process.exit(fallas ? 1 : 0);
