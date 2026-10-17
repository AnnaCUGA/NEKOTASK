import { supabaseAdmin, usuarioDesdePeticion } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

interface Cuerpo { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; dispositivo?: string; endpoint?: string }

/** POST /api/push/suscribir — guarda este dispositivo para recibir recordatorios */
export async function POST(req: Request) {
  const usuario = await usuarioDesdePeticion(req);
  const db = supabaseAdmin();
  if (!usuario || !db) return Response.json({ error: "Inicia sesión para activar las notificaciones." }, { status: 401 });
  const c = (await req.json().catch(() => null)) as Cuerpo | null;
  const s = c?.subscription;
  if (!s?.endpoint?.startsWith("https://") || !s.keys?.p256dh || !s.keys.auth) {
    return Response.json({ error: "Suscripción inválida." }, { status: 400 });
  }
  const { error } = await db.from("suscripciones_push").upsert(
    { usuario_id: usuario, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, dispositivo: c?.dispositivo?.slice(0, 60) },
    { onConflict: "endpoint" },
  );
  if (error) return Response.json({ error: "No se pudo guardar la suscripción." }, { status: 500 });
  return Response.json({ ok: true });
}

/** DELETE /api/push/suscribir { endpoint } — deja de mandar avisos a este dispositivo */
export async function DELETE(req: Request) {
  const usuario = await usuarioDesdePeticion(req);
  const db = supabaseAdmin();
  if (!usuario || !db) return Response.json({ error: "Sesión requerida." }, { status: 401 });
  const c = (await req.json().catch(() => null)) as Cuerpo | null;
  if (c?.endpoint) await db.from("suscripciones_push").delete().eq("usuario_id", usuario).eq("endpoint", c.endpoint);
  return Response.json({ ok: true });
}
