import { NextResponse, type NextRequest } from "next/server";
import { canjearCodigo, cifrar, COOKIE_ESTADO, COOKIE_TOKEN } from "@/lib/google/servidor";

/** GET /api/google/callback — Google regresa aquí con ?code=…&state=… */
export async function GET(req: NextRequest) {
  const volver = (resultado: string) => NextResponse.redirect(new URL(`/?seccion=calendario&google=${resultado}`, req.url));
  const p = req.nextUrl.searchParams;
  const estado = req.cookies.get(COOKIE_ESTADO)?.value;

  if (p.get("error")) return volver("cancelado");
  if (!estado || estado !== p.get("state") || !p.get("code")) return volver("error");

  try {
    const tokens = await canjearCodigo(req, p.get("code")!);
    if (!tokens.refresh_token) return volver("sin-permiso");
    const res = volver("ok");
    res.cookies.set(COOKIE_TOKEN, cifrar(tokens.refresh_token), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    res.cookies.delete(COOKIE_ESTADO);
    return res;
  } catch (e) {
    console.error("OAuth Google:", e);
    return volver("error");
  }
}
