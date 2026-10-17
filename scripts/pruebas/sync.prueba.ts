/**
 * Prueba de la mezcla entre dos dispositivos con un "servidor" en memoria.
 * Uso: npx esbuild scripts/pruebas/sync.prueba.ts --bundle --platform=node --outfile=/tmp/s.cjs && node /tmp/s.cjs
 */
import { aplicarFilas, calcularCambios, filtrarNovedades, registrarEnInstantanea, type Fila, type Instantanea } from "@/lib/sync/colecciones";

const servidor = new Map<string, Fila>();
let reloj = 0;
const subir = (filas: Fila[]) => filas.forEach((f) => servidor.set(`${f.coleccion}/${f.id}`, { ...f, actualizado_en: String(++reloj).padStart(6, "0") }));
const bajar = (desde: string) => [...servidor.values()].filter((f) => f.actualizado_en! > desde).sort((a, b) => a.actualizado_en!.localeCompare(b.actualizado_en!));

class Dispositivo {
  inst: Instantanea = {};
  desde = "";
  primera = true;
  constructor(public estado: Record<string, unknown>) {}
  sincronizar() {
    const todas = bajar(this.desde);
    if (todas.length) this.desde = todas.at(-1)!.actualizado_en!;
    const filas = filtrarNovedades(todas, this.inst, this.primera);
    this.primera = false;
    if (filas.length) {
      this.estado = { ...this.estado, ...aplicarFilas(this.estado, filas) };
      this.inst = registrarEnInstantanea(this.inst, filas);
    }
    const cambios = calcularCambios(this.estado, this.inst);
    subir(cambios);
    this.inst = registrarEnInstantanea(this.inst, cambios);
  }
}

let fallas = 0;
const esperar = (nombre: string, ok: boolean, detalle?: unknown) => {
  console.log(`${ok ? "✔" : "✘"} ${nombre}`);
  if (!ok) { fallas++; console.log("   ", JSON.stringify(detalle)); }
};

const base = () => ({
  tareas: [{ id: "t-ejemplo-1", titulo: "Ejemplo" }],
  movimientos: [{ id: "bienvenida", cantidad: 20 }],
  croquetas: 20,
  accesoriosComprados: [] as string[],
  ajustes: { nombre: "Anna", metaAguaMl: 2000, claveIa: "secreta" },
  eventosCalendario: [{ id: "ej-1", origen: "ejemplo", titulo: "Trabajo" }],
});

const cel = new Dispositivo(base());
const compu = new Dispositivo(base());

// 1. el celular inicia sesión primero y sube todo
cel.sincronizar();
esperar("la clave de IA no sale del dispositivo", !JSON.stringify([...servidor.values()]).includes("secreta"));
esperar("los eventos de ejemplo no se suben", ![...servidor.keys()].some((k) => k.startsWith("eventosCalendario")));

// 2. en el celular: nueva tarea, borra el ejemplo, gana croquetas
cel.estado.tareas = [{ id: "t1", titulo: "Comprar arena" }];
cel.estado.movimientos = [{ id: "m1", cantidad: 8 }, ...(cel.estado.movimientos as object[])];
cel.sincronizar();

// 3. la compu entra por primera vez con sus datos locales + un hábito propio
compu.estado.notas = [{ id: "n1", titulo: "Idea de la compu" }];
compu.sincronizar();
esperar("la compu recibe la tarea del celular", JSON.stringify(compu.estado.tareas).includes("Comprar arena"));
esperar("la compu ya no tiene la tarea de ejemplo borrada", !JSON.stringify(compu.estado.tareas).includes("t-ejemplo-1"), compu.estado.tareas);
esperar("la compu conserva su clave de IA", (compu.estado.ajustes as { claveIa?: string }).claveIa === "secreta");
esperar("el saldo de croquetas se recalcula (28)", compu.estado.croquetas === 28, compu.estado.croquetas);

// 4. ambos gastan/ganan sin conexión y luego sincronizan: no se pierde nada
cel.estado.movimientos = [{ id: "m2", cantidad: 3 }, ...(cel.estado.movimientos as object[])];
compu.estado.movimientos = [{ id: "m3", cantidad: -30 }, ...(compu.estado.movimientos as object[])];
compu.estado.accesoriosComprados = ["mono"];
cel.sincronizar();
compu.sincronizar();
cel.sincronizar();
esperar("el celular recibe la nota de la compu", JSON.stringify(cel.estado.notas).includes("Idea de la compu"));
esperar("el celular recibe el moño comprado", (cel.estado.accesoriosComprados as string[]).includes("mono"));
esperar("croquetas iguales en ambos (1)", cel.estado.croquetas === 1 && compu.estado.croquetas === 1, [cel.estado.croquetas, compu.estado.croquetas]);

// 5. editar la misma tarea: gana la última que llegó al servidor
cel.estado.tareas = [{ id: "t1", titulo: "Comprar arena (2 bolsas)" }];
cel.sincronizar();
compu.sincronizar();
esperar("la edición llega a la compu", JSON.stringify(compu.estado.tareas).includes("2 bolsas"));

// 6. borrar en la compu se refleja en el celular
compu.estado.notas = [];
compu.sincronizar();
cel.sincronizar();
esperar("borrar una nota se refleja en el otro dispositivo", (cel.estado.notas as unknown[]).length === 0, cel.estado.notas);

// 7. nada pendiente después de sincronizar
esperar("sin cambios pendientes al final", calcularCambios(cel.estado, cel.inst).length === 0 && calcularCambios(compu.estado, compu.inst).length === 0);

console.log(fallas ? `\n${fallas} fallas` : "\nTodo bien");
process.exit(fallas ? 1 : 0);
