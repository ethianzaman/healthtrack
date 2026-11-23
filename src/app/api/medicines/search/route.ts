import { type NextRequest } from "next/server";
import { getAppContext } from "@/server/auth/context";
import { catalogRepository } from "@/server/repositories/catalog.repository";
import { assertRateLimit } from "@/server/security/rate-limit";
import { AppError } from "@/server/errors";

/** Medicine name suggestions from the DGDA catalogue. Signed-in users only (keeps the list from being scraped through us). */
export async function GET(request: NextRequest) {
  const ctx = await getAppContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    assertRateLimit(`med-search:${ctx.user.id}`, { limit: 120, windowMs: 60_000 });
  } catch (error) {
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: 429 });
    throw error;
  }
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  const matches = await catalogRepository.search(q);
  return Response.json({ matches }, { headers: { "Cache-Control": "private, max-age=300" } });
}
