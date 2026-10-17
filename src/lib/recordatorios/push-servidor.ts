import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recordatorio } from "./reglas";

export function pushConfigurado() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let listo = false;
function preparar() {
  if (listo) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:nekotask@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  listo = true;
}

interface Suscripcion { id: string; endpoint: string; p256dh: string; auth: string }

/** Manda un aviso a todos los dispositivos de una usuaria; borra los que ya no existen */
export async function enviarAUsuaria(db: SupabaseClient, usuarioId: string, aviso: Recordatorio) {
  preparar();
  const { data } = await db.from("suscripciones_push").select("id,endpoint,p256dh,auth").eq("usuario_id", usuarioId);
  const subs = (data ?? []) as Suscripcion[];
  let enviados = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
          { TTL: 60 * 60, urgency: "normal", topic: aviso.clave.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) },
        );
        enviados++;
      } catch (e) {
        const estado = (e as { statusCode?: number }).statusCode;
        if (estado === 404 || estado === 410) await db.from("suscripciones_push").delete().eq("id", s.id);
        else console.error("push:", estado, (e as Error).message);
      }
    }),
  );
  return enviados;
}
