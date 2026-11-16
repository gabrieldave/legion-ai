import { Readable } from "stream";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { LICENSE_FILENAME } from "@/lib/access";
import {
  consumeDownloadToken,
  mintDownloadToken,
  openProductStream,
} from "@/lib/download";
import { getCustomerLicenseView } from "@/lib/licenses";
import { buildCustomerAllInOneZip } from "@/lib/zip-bundle";
import {
  enforceIpRateLimit,
  getTrustedClientIp,
  hashClientHint,
  isSameOriginRequest,
  logSecurityEvent,
  readBoundedJson,
} from "@/lib/security";
import { getUserById, userHasPurchase } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  if (!isSameOriginRequest(req)) {
    await logSecurityEvent({
      eventType: "csrf_blocked",
      route: "/api/download",
      req,
    });
    return fail("Origen no autorizado", 403);
  }

  const rl = await enforceIpRateLimit({
    req,
    bucket: "download_mint",
    maxHits: 10,
    windowSec: 900,
    route: "/api/download",
  });
  if (!rl.ok) {
    return fail("Demasiados intentos de descarga. Espera unos minutos.", 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);
  if (!userHasPurchase(user)) return fail("Pago requerido", 402);

  const parsed = await readBoundedJson<{ releaseId?: string | null }>(req, 4_096);
  if (!parsed.ok) return fail(parsed.error, parsed.status);

  const minted = await mintDownloadToken({
    userId: user.id,
    isAdmin: user.role === "admin",
    purchasedAt: user.purchasedAt,
    releaseId: parsed.data.releaseId || null,
    ip: getTrustedClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  if (!minted.ok) {
    return fail(minted.error, minted.status);
  }

  return ok({
    token: minted.token,
    expiresInSec: minted.expiresInSec,
    filename: minted.filename,
    version: minted.version,
  });
});

export const GET = handle(async (req: Request) => {
  const rl = await enforceIpRateLimit({
    req,
    bucket: "download_get",
    maxHits: 12,
    windowSec: 900,
    route: "/api/download",
  });
  if (!rl.ok) {
    return fail("Demasiadas descargas desde esta IP.", 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);
  if (!userHasPurchase(user)) return fail("Pago requerido", 402);

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim() || "";
  if (!token) return fail("Token requerido", 400);

  const ip = getTrustedClientIp(req);
  const ua = req.headers.get("user-agent");
  const result = await consumeDownloadToken({
    token,
    userId: user.id,
    isAdmin: user.role === "admin",
    purchasedAt: user.purchasedAt,
    ip,
    userAgent: ua,
  });

  if (!result.ok) {
    const db = getDb();
    await db.insert(schema.downloadAudit).values({
      userId: user.id,
      outcome: result.reason,
      ipHash: hashClientHint(ip),
      userAgentHash: hashClientHint(ua),
    });
    return fail("Enlace de descarga expirado o no autorizado", 403);
  }

  const wantsBundle = url.searchParams.get("bundle") === "1";
  if (wantsBundle) {
    const view = await getCustomerLicenseView(user);
    const zipBuf = await buildCustomerAllInOneZip({
      ex4Path: result.path,
      ex4Filename: result.filename,
      version: result.version,
      shortId: view?.shortId || 0,
      accounts: (view?.slots || []).map((s) => s.accountLogin).filter(Boolean),
      updatesUntilDate: view?.updatesUntil
        ? new Date(view.updatesUntil).toLocaleDateString("es-MX")
        : "",
      licenseToken: view?.licenseToken || null,
    });
    const zipName = `Legion_SuperPanel_v${result.version.replace(/\./g, "_")}_Pack.zip`;
    return new Response(new Uint8Array(zipBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(zipBuf.length),
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const nodeStream = openProductStream(result.path);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(result.size),
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
});


