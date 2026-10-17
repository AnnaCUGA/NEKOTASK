import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ESTADO, googleConfigurado, urlConsentimiento } from "@/lib/google/servidor";

/** GET /api/google/conectar → manda a la pantalla de permisos de Google */
export async function GET(req: NextRequest) {
  if (!googleConfigurado()) {
    return NextResponse.redirect(new URL("/?seccion=calendario&google=sin-configurar", req.url));
  }
  const estado = randomBytes(16).toString("hex"); // protege contra CSRF
  const res = NextResponse.redirect(urlConsentimiento(req, estado));
  res.cookies.set(COOKIE_ESTADO, estado, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
