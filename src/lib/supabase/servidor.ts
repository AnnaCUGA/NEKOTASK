import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente con service role: solo para rutas /api (salta RLS, úsalo con cuidado) */
let admin: SupabaseClient | null = null;

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) return null;
  admin ??= createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Valida el token "Authorization: Bearer …" de la app y devuelve el id de usuaria */
export async function usuarioDesdePeticion(req: Request) {
  const db = supabaseAdmin();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!db || !token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}
