import { timingSafeEqual } from "node:crypto";
import { calcularRecordatorios, relojEn, type DatosRecordatorio } from "@/lib/recordatorios/reglas";
import { enviarAUsuaria, pushConfigurado } from "@/lib/recordatorios/push-servidor";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { RECORDATORIOS_INICIALES } from "@/store/datosIniciales";
import type { Ajustes } from "@/lib/tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ZONA = process.env.ZONA_HORARIA ?? "America/Mexico_City";

function autorizado(req: Request) {
  const secreto = process.env.CRON_SECRET;
  const dado = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secreto || dado.length !== secreto.length) return false;
  return timingSafeEqual(Buffer.from(dado), Buffer.from(secreto));
}

/**
 * POST /api/recordatorios — lo llama el cron de Supabase cada 10 minutos.
 * Revisa los datos sincronizados de cada usuaria con notificaciones activas
 * y manda los avisos que tocan (una sola vez cada uno).
 */
export async function POST(req: Request) {
  if (!autorizado(req)) return Response.json({ error: "No autorizado." }, { status: 401 });
  const db = supabaseAdmin();
  if (!db || !pushConfigurado()) return Response.json({ error: "Faltan variables de Supabase o VAPID." }, { status: 503 });

  const ahora = new Date();
  const { dia } = relojEn(ahora, ZONA);
  const { data: subs } = await db.from("suscripciones_push").select("usuario_id");
  const usuarias = [...new Set((subs ?? []).map((s) => s.usuario_id as string))];
  const resumen: { usuaria: string; avisos: number }[] = [];

  for (const usuaria of usuarias) {
    try {
      const datos = await cargarDatos(db, usuaria, dia);
      const avisos = calcularRecordatorios(datos, ahora, ZONA);
      if (!avisos.length) continue;
      const { data: yaEnviados } = await db.from("recordatorios_enviados").select("clave").eq("usuario_id", usuaria).in("clave", avisos.map((a) => a.clave));
      const enviadas = new Set((yaEnviados ?? []).map((r) => r.clave as string));
      let n = 0;
      for (const aviso of avisos.filter((a) => !enviadas.has(a.clave)).slice(0, 3)) {
        // primero se aparta la clave: si dos crons coinciden, solo uno manda
        const { error } = await db.from("recordatorios_enviados").insert({ usuario_id: usuaria, clave: aviso.clave });
        if (error) continue;
        await enviarAUsuaria(db, usuaria, aviso);
        n++;
      }
      resumen.push({ usuaria: usuaria.slice(0, 8), avisos: n });
    } catch (e) {
      console.error("recordatorios", usuaria, e);
    }
  }
  return Response.json({ revisadas: usuarias.length, resumen });
}

export const GET = POST;

async function cargarDatos(db: NonNullable<ReturnType<typeof supabaseAdmin>>, usuaria: string, dia: string): Promise<DatosRecordatorio> {
  const desde = new Date(Date.now() - 36 * 3600_000).toISOString();
  type Filtro = { eq?: [string, string]; gte?: [string, string]; like?: [string, string] };
  const leer = async (coleccion: string, f: Filtro = {}) => {
    let q = db.from("sync_registros").select("datos").eq("usuario_id", usuaria).eq("coleccion", coleccion).eq("borrado", false);
    if (f.eq) q = q.eq(...f.eq);
    if (f.gte) q = q.gte(...f.gte);
    if (f.like) q = q.like(...f.like);
    const { data, error } = await q.limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.datos as unknown);
  };
  const [ajustes, tareas, registroBebidas, habitos, registroHabitos, citas, registroCuidados] = await Promise.all([
    leer("ajustes"),
    leer("tareas", { eq: ["datos->>completada", "false"] }),
    leer("registroBebidas", { gte: ["datos->>en", desde] }),
    leer("habitos"),
    leer("registroHabitos", { like: ["id", `%|${dia}`] }),
    leer("citas", { eq: ["datos->>fecha", dia] }),
    leer("registroCuidados", { like: ["id", `%|${dia}`] }),
  ]);
  const a = (ajustes[0] ?? {}) as Partial<Ajustes>;
  return {
    recordatorios: a.recordatorios ?? RECORDATORIOS_INICIALES,
    metaAguaMl: a.metaAguaMl ?? 2000,
    tareas, registroBebidas, habitos, registroHabitos, citas, registroCuidados,
  } as DatosRecordatorio;
}
