import { enviarAUsuaria, pushConfigurado } from "@/lib/recordatorios/push-servidor";
import { supabaseAdmin, usuarioDesdePeticion } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/** POST /api/push/prueba — manda una notificación de prueba a tus dispositivos */
export async function POST(req: Request) {
  const usuario = await usuarioDesdePeticion(req);
  const db = supabaseAdmin();
  if (!usuario || !db) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
  if (!pushConfigurado()) return Response.json({ error: "Faltan las llaves VAPID en Vercel (ver README)." }, { status: 503 });
  const enviados = await enviarAUsuaria(db, usuario, {
    clave: `prueba-${Date.now()}`,
    titulo: "¡Miau! Las notificaciones funcionan",
    cuerpo: "Así te avisaremos de tus rutinas, tareas, fechas y gatitas.",
    gatita: "bizca",
    url: "/",
  });
  return Response.json({ enviados });
}
