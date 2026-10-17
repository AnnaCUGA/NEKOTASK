import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_TOKEN, descifrar } from "@/lib/google/servidor";

/** POST /api/google/desconectar — revoca el permiso y borra la cookie */
export async function POST(req: NextRequest) {
  const valor = req.cookies.get(COOKIE_TOKEN)?.value;
  const refresh = valor ? descifrar(valor) : null;
  if (refresh) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh)}`, { method: "POST" }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_TOKEN);
  return res;
}
