import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { NextRequest } from "next/server";
import { sistemaPara } from "@/lib/ia/prompts";
import type { ModoIA, ProveedorIA } from "@/lib/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELO_CLAUDE = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
const MODELO_GEMINI = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const MODOS: ModoIA[] = ["libre", "desglosar", "redactar", "resumir", "ideas", "planear"];
const MAX_CARACTERES = 120_000;

interface Peticion {
  proveedor: ProveedorIA;
  modo: ModoIA;
  mensajes: { rol: "usuaria" | "blanquita"; texto: string }[];
  contexto?: string;
}

const error = (mensaje: string, estado: number) => Response.json({ error: mensaje }, { status: estado });

/**
 * POST /api/ia — Blanquita responde con Claude o Gemini.
 * Devuelve el texto en streaming (text/plain) para mostrarlo mientras se escribe.
 * Las llaves viven solo aquí, en el servidor.
 */
export async function POST(req: NextRequest) {
  // Candado opcional: si defines NEKO_CLAVE_ACCESO, solo tu app (con esa clave) puede gastar tus llaves
  const clave = process.env.NEKO_CLAVE_ACCESO;
  if (clave && req.headers.get("x-neko-clave") !== clave) return error("Clave de acceso incorrecta. Revísala en los ajustes de Blanquita.", 401);

  const p = (await req.json().catch(() => null)) as Peticion | null;
  if (!p || !MODOS.includes(p.modo) || !Array.isArray(p.mensajes) || !p.mensajes.length) return error("Petición incompleta.", 400);
  const mensajes = p.mensajes
    .filter((m) => typeof m?.texto === "string" && m.texto.trim())
    .slice(-20)
    .map((m) => ({ rol: m.rol === "blanquita" ? "blanquita" : "usuaria", texto: m.texto.slice(0, 40_000) }) as const);
  while (mensajes.length && mensajes[0].rol !== "usuaria") mensajes.shift();
  if (!mensajes.length || mensajes.at(-1)!.rol !== "usuaria") return error("El último mensaje debe ser tuyo.", 400);
  if (mensajes.reduce((s, m) => s + m.texto.length, 0) > MAX_CARACTERES) return error("El texto es demasiado largo. Envía una parte a la vez.", 413);

  const sistema = sistemaPara(p.modo, p.contexto?.slice(0, 8_000));
  const codificador = new TextEncoder();

  let fuente: AsyncGenerator<string>;
  if (p.proveedor === "gemini") {
    if (!process.env.GEMINI_API_KEY) return error("Falta GEMINI_API_KEY en Vercel.", 503);
    fuente = streamGemini(sistema, mensajes);
  } else {
    if (!process.env.ANTHROPIC_API_KEY) return error("Falta ANTHROPIC_API_KEY en Vercel.", 503);
    fuente = streamClaude(sistema, mensajes, req.signal);
  }

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(control) {
      try {
        for await (const trozo of fuente) control.enqueue(codificador.encode(trozo));
        control.close();
      } catch (e) {
        console.error("IA:", e);
        control.enqueue(codificador.encode("\n\n[[error]] Blanquita perdió la conexión con la IA. Intenta de nuevo."));
        control.close();
      }
    },
  });
  return new Response(cuerpo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

async function* streamClaude(sistema: string, mensajes: { rol: string; texto: string }[], signal: AbortSignal) {
  const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = cliente.messages.stream(
    {
      model: MODELO_CLAUDE,
      max_tokens: 4096,
      system: sistema,
      messages: mensajes.map((m) => ({ role: m.rol === "blanquita" ? ("assistant" as const) : ("user" as const), content: m.texto })),
    },
    { signal },
  );
  for await (const evento of stream) {
    if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") yield evento.delta.text;
  }
}

async function* streamGemini(sistema: string, mensajes: { rol: string; texto: string }[]) {
  const ia = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const respuesta = await ia.models.generateContentStream({
    model: MODELO_GEMINI,
    contents: mensajes.map((m) => ({ role: m.rol === "blanquita" ? "model" : "user", parts: [{ text: m.texto }] })),
    config: { systemInstruction: sistema, maxOutputTokens: 4096 },
  });
  for await (const trozo of respuesta) {
    if (trozo.text) yield trozo.text;
  }
}
