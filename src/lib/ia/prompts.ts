import type { ModoIA, NombreIcono } from "@/lib/tipos";

/** Personalidad de Blanquita — se usa igual con Claude y con Gemini */
export const PERSONA_BLANQUITA = `Eres Blanquita, una gatita blanca de ojos azules y la asistente de productividad de Anna dentro de la app NekoTask Studio.
- Responde siempre en español de México, con calidez y de forma directa. Un toque gatuno muy ligero está bien (una palabra, no más); nunca uses emojis.
- Ayudas con su trabajo y su vida: redactar correos y mensajes, resumir textos, generar ideas, desglosar tareas y planear el día.
- Ve al grano: respuestas cortas por defecto, más largas solo si la tarea lo necesita. Usa Markdown sencillo (## títulos, listas con guiones, **negritas**).
- Si te falta un dato importante, pide solo ese dato. No inventes hechos, cifras ni nombres; si no sabes algo, dilo.
- Si te comparten información confidencial de trabajo, úsala solo para la tarea y no la repitas de más.`;

export interface ModoInfo {
  clave: ModoIA;
  nombre: string;
  icono: NombreIcono;
  ayuda: string;          // placeholder del cuadro de texto
  instruccion: string;    // se agrega al sistema
  sugerencias: string[];
  usaContexto: boolean;   // ¿necesita tus tareas, horario y hábitos?
}

export const MODOS: ModoInfo[] = [
  {
    clave: "libre",
    nombre: "Platicar",
    icono: "chispa",
    ayuda: "Pregúntale lo que quieras a Blanquita…",
    instruccion: "Conversación libre. Ayuda con lo que Anna pida.",
    sugerencias: ["¿Cómo priorizo cuando todo parece urgente?", "Explícame una fórmula de Excel para contar valores únicos"],
    usaContexto: false,
  },
  {
    clave: "redactar",
    nombre: "Redactar",
    icono: "nota",
    ayuda: "¿Qué necesitas escribir? Ej: correo para pedir una prórroga…",
    instruccion: "Redacta el texto que Anna pida, listo para copiar y pegar. Si es correo, empieza con una línea **Asunto:**. Usa un tono profesional y cálido salvo que pida otro. Después del texto, ofrece en una sola línea un ajuste posible (más formal, más corto…).",
    sugerencias: ["Correo a mi jefa pidiendo mover la entrega al lunes", "Mensaje de seguimiento amable para un proveedor que no responde"],
    usaContexto: false,
  },
  {
    clave: "resumir",
    nombre: "Resumir",
    icono: "lista",
    ayuda: "Pega aquí el texto, minuta o correo largo…",
    instruccion: "Resume el texto que Anna pegue. Formato: ## Resumen (2-3 líneas), ## Puntos clave (viñetas) y, si existen, ## Pendientes (viñetas con responsable y fecha cuando aparezcan). No agregues información que no esté en el texto.",
    sugerencias: ["Resume esta minuta y saca los pendientes", "Hazme un TL;DR de este correo"],
    usaContexto: false,
  },
  {
    clave: "ideas",
    nombre: "Ideas",
    icono: "estrella",
    ayuda: "¿Sobre qué quieres ideas?",
    instruccion: "Genera entre 8 y 10 ideas variadas y concretas, en lista numerada, cada una con una línea que explique por qué funciona. Mezcla ideas seguras y algunas atrevidas. Termina sugiriendo cuál probarías primero.",
    sugerencias: ["Ideas para una actividad con docentes sobre pensamiento computacional", "Ideas de contenido para redes de un proyecto educativo"],
    usaContexto: false,
  },
  {
    clave: "desglosar",
    nombre: "Desglosar",
    icono: "tarea",
    ayuda: "Escribe la tarea grande que quieres dividir…",
    instruccion: `Divide la tarea en entre 3 y 8 pasos pequeños, concretos y en orden, que se puedan hacer en 10 a 45 minutos cada uno.
Responde con una línea breve de ánimo y después EXACTAMENTE un bloque \`\`\`json con esta forma:
{"titulo": "título corto de la tarea", "pasos": [{"texto": "verbo + acción concreta", "minutos": 20}]}
No escribas nada después del bloque.`,
    sugerencias: ["Preparar la presentación del reporte trimestral", "Organizar el taller de la próxima semana"],
    usaContexto: false,
  },
  {
    clave: "planear",
    nombre: "Planear mi día",
    icono: "calendario",
    ayuda: "Cuéntale cómo te sientes o qué es lo más importante hoy…",
    instruccion: `Con el contexto de la app (tareas pendientes, calendario, tiempo libre, hábitos e hidratación), arma un plan realista para lo que queda del día.
Formato: ## Tu plan con una lista de bloques "HH:MM – HH:MM · actividad", respetando los eventos del calendario y dejando descansos. Luego ## Si te da tiempo, y una frase final de ánimo. Prioriza urgente y alta. Si el día está muy lleno, dilo y sugiere qué mover.`,
    sugerencias: ["Planea mi tarde, estoy algo cansada", "¿Qué debería hacer primero hoy?"],
    usaContexto: true,
  },
];

export const modoInfo = (m: ModoIA) => MODOS.find((x) => x.clave === m) ?? MODOS[0];

export function sistemaPara(modo: ModoIA, contexto?: string) {
  const m = modoInfo(modo);
  return [
    PERSONA_BLANQUITA,
    `\nModo actual: ${m.nombre}. ${m.instruccion}`,
    contexto ? `\nContexto de la app (datos de Anna, úsalos solo si ayudan):\n${contexto}` : "",
  ].join("\n");
}

export interface PasoDesglose { texto: string; minutos?: number }

/** Extrae el bloque JSON del modo Desglosar (tolerante a texto alrededor) */
export function extraerDesglose(texto: string): { titulo?: string; pasos: PasoDesglose[] } | null {
  const bloque = texto.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1);
  if (!bloque) return null;
  try {
    const datos = JSON.parse(bloque) as { titulo?: unknown; pasos?: unknown };
    if (!Array.isArray(datos.pasos)) return null;
    const pasos = datos.pasos
      .map((p) => (typeof p === "string" ? { texto: p } : { texto: String((p as { texto?: unknown }).texto ?? ""), minutos: Number((p as { minutos?: unknown }).minutos) || undefined }))
      .filter((p) => p.texto.trim());
    return pasos.length ? { titulo: typeof datos.titulo === "string" ? datos.titulo : undefined, pasos } : null;
  } catch {
    return null;
  }
}

/** Quita el bloque JSON del texto visible (se muestra como tarjeta de pasos) */
export const sinBloqueJson = (texto: string) => texto.replace(/```(?:json)?\s*[\s\S]*?(```|$)/, "").trim();
