import type { NextRequest } from "next/server";
import { COOKIE_TOKEN, googleConfigurado } from "@/lib/google/servidor";

export const dynamic = "force-dynamic";

/** GET /api/google/estado → { configurado, conectado } */
export async function GET(req: NextRequest) {
  return Response.json({ configurado: googleConfigurado(), conectado: !!req.cookies.get(COOKIE_TOKEN)?.value });
}
