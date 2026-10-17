import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador (anon key + RLS).
 * Devuelve null si no configuraste las variables: la app funciona en modo local.
 */
let cliente: SupabaseClient | null | undefined;

export const supabaseConfigurado = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && process.env.NEXT_PUBLIC_VISTA_PREVIA !== "1";

export function obtenerSupabase(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  cliente = supabaseConfigurado()
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
  return cliente;
}
