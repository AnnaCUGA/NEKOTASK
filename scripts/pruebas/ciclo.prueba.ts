/** Prueba del ciclo: agrupar días, promedios, predicción y aviso discreto. */
import { agruparPeriodos, estadoCiclo, mover } from "@/lib/ciclo";
import { calcularRecordatorios, type DatosRecordatorio } from "@/lib/recordatorios/reglas";

let fallas = 0;
const esperar = (nombre: string, ok: boolean, detalle?: unknown) => {
  console.log(`${ok ? "✔" : "✘"} ${nombre}`);
  if (!ok) { fallas++; console.log("   ", JSON.stringify(detalle)); }
};
const rango = (ini: string, n: number) => Array.from({ length: n }, (_, i) => mover(ini, i));

const p = agruparPeriodos(["2026-08-01", "2026-08-02", "2026-08-04", "2026-08-30", "2026-08-31"]);
esperar("hueco de un día no corta", p.length === 2 && p[0].dias === 4, p);

const dias = [...rango("2026-07-05", 5), ...rango("2026-08-03", 4), ...rango("2026-09-01", 5), ...rango("2026-09-30", 5)];
const e = estadoCiclo(dias, "2026-10-21");
esperar("ciclo promedio 29", e.cicloPromedio === 29, e);
esperar("periodo promedio 5 (sin contar el actual)", e.periodoPromedio === 5, e);
esperar("día 22 del ciclo", e.diaDelCiclo === 22);
esperar("próximo 29 oct", e.proximoInicio === "2026-10-29" && e.diasParaProximo === 8);
esperar("ventana fértil 10–16 oct", e.ventanaFertil?.inicio === "2026-10-10" && e.ventanaFertil?.fin === "2026-10-16", e.ventanaFertil);
esperar("no está en periodo", !e.enPeriodo);
esperar("en periodo al día 2", estadoCiclo(dias, "2026-10-01").enPeriodo);
esperar("sin datos → valores iniciales", estadoCiclo([], "2026-10-21").cicloPromedio === 28);
esperar("ignora ciclos absurdos (90 días)", estadoCiclo([...rango("2026-01-01", 4), ...rango("2026-04-01", 4), ...rango("2026-04-29", 4)], "2026-05-10").cicloPromedio === 28);

const base: DatosRecordatorio = {
  recordatorios: {
    agua: { activo: false, cadaMin: 90, desde: "09:00", hasta: "21:00" }, rutinas: { activo: false, manana: "08:00", noche: "22:00" },
    tareas: { activo: false, minutosAntes: 15 }, gatitas: { activo: false, hora: "09:00" }, fechas: { activo: false, hora: "09:00" }, dinero: { activo: false, hora: "10:00" },
  },
  metaAguaMl: 2000, tareas: [], registroBebidas: [], habitos: [], registroHabitos: [], citas: [], registroCuidados: [],
  diasPeriodo: dias,
};
const en = (dia: string, hora = "09:10") => calcularRecordatorios(base, new Date(`${dia}T${hora}:00-06:00`), "America/Mexico_City");
const a = en("2026-10-27");
esperar("avisa 2 días antes", a.length === 1, a);
esperar("aviso discreto (sin palabras del ciclo)", !/periodo|ciclo|regla|menstru/i.test(a[0].titulo + a[0].cuerpo), a[0]);
esperar("otro día no avisa", en("2026-10-26").length === 0);
esperar("apagado no avisa", calcularRecordatorios({ ...base, ciclo: { avisar: false, diasAntes: 2, hora: "09:00", cicloInicial: 28, periodoInicial: 5 } }, new Date("2026-10-27T09:10:00-06:00"), "America/Mexico_City").length === 0);

if (fallas) { console.log(`\n${fallas} prueba(s) fallaron`); process.exit(1); }
console.log("\nTodo bien");
