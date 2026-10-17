import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Google Calendar — solo servidor.
 * El refresh token se guarda cifrado (AES-256-GCM) en una cookie HttpOnly:
 * no hace falta base de datos ni exponer nada al navegador.
 */

export const COOKIE_TOKEN = "neko_gcal";
export const COOKIE_ESTADO = "neko_gcal_estado";
const ALCANCE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3";

export function googleConfigurado() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_COOKIE_SECRET);
}

function llave() {
  return createHash("sha256").update(process.env.GOOGLE_COOKIE_SECRET ?? "").digest();
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", llave(), iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), datos]).toString("base64url");
}

export function descifrar(valor: string) {
  try {
    const b = Buffer.from(valor, "base64url");
    const d = createDecipheriv("aes-256-gcm", llave(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function urlRedireccion(req: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${req.nextUrl.origin}/api/google/callback`;
}

export function urlConsentimiento(req: NextRequest, estado: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  u.searchParams.set("redirect_uri", urlRedireccion(req));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", ALCANCE);
  u.searchParams.set("access_type", "offline");   // para recibir refresh token
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", estado);
  return u.toString();
}

async function token(cuerpo: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...cuerpo,
    }),
  });
  if (!r.ok) throw new ErrorGoogle(r.status, await r.text());
  return (await r.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}

export const canjearCodigo = (req: NextRequest, code: string) =>
  token({ code, grant_type: "authorization_code", redirect_uri: urlRedireccion(req) });

export const renovarAcceso = (refreshToken: string) =>
  token({ refresh_token: refreshToken, grant_type: "refresh_token" });

export class ErrorGoogle extends Error {
  constructor(public estado: number, public detalle: string) {
    super(`Google respondió ${estado}`);
  }
}

/** Obtiene un access token a partir de la cookie, o null si no hay conexión */
export async function accesoDesdeCookie(req: NextRequest) {
  const valor = req.cookies.get(COOKIE_TOKEN)?.value;
  const refresh = valor ? descifrar(valor) : null;
  if (!refresh) return null;
  const { access_token } = await renovarAcceso(refresh);
  return access_token;
}

// ─── Eventos ────────────────────────────────────────────────────────────

interface EventoGoogle {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  transparency?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface EventoNeko {
  googleId: string;
  titulo: string;
  descripcion?: string;
  inicio: string;
  fin: string;
  todoElDia: boolean;
  origen: "google";
}

const aFechaISO = (fecha: string) => new Date(`${fecha}T00:00:00`).toISOString();

export function aEventoNeko(e: EventoGoogle): EventoNeko {
  const todoElDia = !!e.start.date;
  return {
    googleId: e.id,
    titulo: e.summary?.trim() || "(sin título)",
    descripcion: e.description,
    inicio: todoElDia ? aFechaISO(e.start.date!) : new Date(e.start.dateTime!).toISOString(),
    fin: todoElDia ? aFechaISO(e.end.date!) : new Date(e.end.dateTime!).toISOString(),
    todoElDia,
    origen: "google",
  };
}

export function aEventoGoogle(e: { titulo: string; descripcion?: string; inicio: string; fin: string; todoElDia?: boolean }, zona: string) {
  if (e.todoElDia) {
    return { summary: e.titulo, description: e.descripcion, start: { date: e.inicio.slice(0, 10) }, end: { date: e.fin.slice(0, 10) } };
  }
  return {
    summary: e.titulo,
    description: e.descripcion,
    start: { dateTime: e.inicio, timeZone: zona },
    end: { dateTime: e.fin, timeZone: zona },
  };
}

export async function llamarCalendario<T>(acceso: string, ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${acceso}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (r.status === 204) return undefined as T;
  if (!r.ok) throw new ErrorGoogle(r.status, await r.text());
  return (await r.json()) as T;
}

export async function listarEventos(acceso: string, desde: string, hasta: string) {
  const todos: EventoNeko[] = [];
  let pagina: string | undefined;
  do {
    const q = new URLSearchParams({ timeMin: desde, timeMax: hasta, singleEvents: "true", orderBy: "startTime", maxResults: "250" });
    if (pagina) q.set("pageToken", pagina);
    const r = await llamarCalendario<{ items: EventoGoogle[]; nextPageToken?: string }>(acceso, `/calendars/primary/events?${q}`);
    todos.push(...r.items.filter((e) => e.status !== "cancelled" && e.transparency !== "transparent").map(aEventoNeko));
    pagina = r.nextPageToken;
  } while (pagina && todos.length < 1000);
  return todos;
}

export function respuestaError(e: unknown) {
  if (e instanceof ErrorGoogle) {
    const desconectar = e.estado === 400 || e.estado === 401;
    return Response.json(
      { error: desconectar ? "La conexión con Google expiró. Vuelve a conectar tu calendario." : "Google Calendar no respondió. Intenta de nuevo.", reconectar: desconectar },
      { status: desconectar ? 401 : 502 },
    );
  }
  console.error(e);
  return Response.json({ error: "Error inesperado con Google Calendar." }, { status: 500 });
}
