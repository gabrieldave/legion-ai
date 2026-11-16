import { Readable } from "stream";
import { PRODUCT_FILENAME } from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import {
  consumeDownloadToken,
  mintDownloadToken,
  openProductStream,
} from "@/lib/download";
import { getDb, schema } from "@/lib/db";
import { getUserById, userHasPurchase } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return req.headers.get("cf-connecting-ip");
}

/** Emite un token de un solo uso (60s). El archivo NUNCA se sirve sin token. */
export const POST = handle(async (req: Request) => {
  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);
  if (!userHasPurchase(user)) return fail("Pago requerido", 402);

  try {
    const minted = await mintDownloadToken({
      userId: user.id,
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent"),
    });
    return ok(minted);
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return fail("Demasiados intentos. Espera unos minutos.", 429);
    }
    throw error;
  }
});

/** Descarga con token de un solo uso + sesión válida. */
export const GET = handle(async (req: Request) => {
  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);
  if (!userHasPurchase(user)) return fail("Pago requerido", 402);

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() || "";
  if (!token) return fail("Token requerido", 400);

  const result = await consumeDownloadToken({
    token,
    userId: user.id,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) {
    const db = getDb();
    await db.insert(schema.downloadAudit).values({
      userId: user.id,
      outcome: result.reason,
    });
    return fail("Descarga no autorizada", 403);
  }

  const nodeStream = openProductStream(result.path);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(result.size),
      "Content-Disposition": `attachment; filename="${PRODUCT_FILENAME}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
