import type { NextRequest } from "next/server";
import { accesoDesdeCookie, aEventoGoogle, aEventoNeko, listarEventos, llamarCalendario, respuestaError } from "@/lib/google/servidor";

export const dynamic = "force-dynamic";

const ZONA = process.env.ZONA_HORARIA ?? "America/Mexico_City";
const sinConexion = () => Response.json({ error: "Google Calendar no está conectado.", reconectar: true }, { status: 401 });

/** GET /api/calendario?desde=ISO&hasta=ISO → eventos de tu calendario principal */
export async function GET(req: NextRequest) {
  const desde = req.nextUrl.searchParams.get("desde");
  const hasta = req.nextUrl.searchParams.get("hasta");
  if (!desde || !hasta || Number.isNaN(Date.parse(desde)) || Number.isNaN(Date.parse(hasta))) {
    return Response.json({ error: "Faltan las fechas desde y hasta (ISO)." }, { status: 400 });
  }
  try {
    const acceso = await accesoDesdeCookie(req);
    if (!acceso) return sinConexion();
    return Response.json({ eventos: await listarEventos(acceso, desde, hasta) });
  } catch (e) {
    return respuestaError(e);
  }
}

/** POST /api/calendario  { titulo, inicio, fin, todoElDia?, descripcion? } → crea el evento en Google */
export async function POST(req: NextRequest) {
  const cuerpo = (await req.json().catch(() => null)) as
    | { titulo?: string; inicio?: string; fin?: string; todoElDia?: boolean; descripcion?: string }
    | null;
  if (!cuerpo?.titulo?.trim() || !cuerpo.inicio || !cuerpo.fin || cuerpo.fin < cuerpo.inicio) {
    return Response.json({ error: "El evento necesita título, inicio y fin válidos." }, { status: 400 });
  }
  try {
    const acceso = await accesoDesdeCookie(req);
    if (!acceso) return sinConexion();
    const creado = await llamarCalendario<Parameters<typeof aEventoNeko>[0]>(acceso, "/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify(aEventoGoogle({ titulo: cuerpo.titulo.trim(), inicio: cuerpo.inicio, fin: cuerpo.fin, todoElDia: cuerpo.todoElDia, descripcion: cuerpo.descripcion }, ZONA)),
    });
    return Response.json({ evento: aEventoNeko(creado) }, { status: 201 });
  } catch (e) {
    return respuestaError(e);
  }
}
