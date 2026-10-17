import type { NextRequest } from "next/server";
import { accesoDesdeCookie, aEventoGoogle, aEventoNeko, llamarCalendario, respuestaError } from "@/lib/google/servidor";

export const dynamic = "force-dynamic";
const ZONA = process.env.ZONA_HORARIA ?? "America/Mexico_City";

type Contexto = { params: Promise<{ id: string }> };

/** PATCH /api/calendario/:googleId — mueve o renombra un evento */
export async function PATCH(req: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const c = (await req.json().catch(() => null)) as { titulo: string; inicio: string; fin: string; todoElDia?: boolean; descripcion?: string } | null;
  if (!c?.titulo || !c.inicio || !c.fin) return Response.json({ error: "Datos incompletos." }, { status: 400 });
  try {
    const acceso = await accesoDesdeCookie(req);
    if (!acceso) return Response.json({ error: "Google Calendar no está conectado.", reconectar: true }, { status: 401 });
    const r = await llamarCalendario<Parameters<typeof aEventoNeko>[0]>(acceso, `/calendars/primary/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(aEventoGoogle(c, ZONA)),
    });
    return Response.json({ evento: aEventoNeko(r) });
  } catch (e) {
    return respuestaError(e);
  }
}

/** DELETE /api/calendario/:googleId */
export async function DELETE(req: NextRequest, { params }: Contexto) {
  const { id } = await params;
  try {
    const acceso = await accesoDesdeCookie(req);
    if (!acceso) return Response.json({ error: "Google Calendar no está conectado.", reconectar: true }, { status: 401 });
    await llamarCalendario(acceso, `/calendars/primary/events/${encodeURIComponent(id)}`, { method: "DELETE" });
    return Response.json({ ok: true });
  } catch (e) {
    return respuestaError(e);
  }
}
