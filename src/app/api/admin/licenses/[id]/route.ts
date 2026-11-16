import { eq } from "drizzle-orm";
import { isAdminEmail } from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { dateToYmdUtc } from "@/lib/license-crypto";
import { remintLicenseToken } from "@/lib/licenses";
import {
  decryptSecretAES256GCM,
  isSameOriginRequest,
  logSecurityEvent,
  readBoundedJson,
} from "@/lib/security";
import { getUserById } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminAction =
  | "copy_token"
  | "suspend"
  | "reactivate"
  | "revoke"
  | "reset_cooldown"
  | "clear_slots"
  | "extend_1y";

export const POST = handle(async (req: Request) => {
  if (!isSameOriginRequest(req)) return fail("Origen no autorizado", 403);

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const admin = await getUserById(session.id);
  if (!admin || admin.role !== "admin" || !isAdminEmail(admin.email)) {
    await logSecurityEvent({
      eventType: "unauthorized_admin",
      route: "/api/admin/licenses/[id]",
      req,
      userId: session.id,
    });
    return fail("Prohibido", 403);
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const licenseId = segments[segments.length - 1] || "";
  if (!/^[0-9a-fA-F-]{36}$/.test(licenseId)) {
    return fail("ID de licencia invalido", 400);
  }

  const parsed = await readBoundedJson<{ action?: AdminAction }>(req, 4_096);
  if (!parsed.ok) return fail(parsed.error, parsed.status);
  const action = parsed.data.action;

  const db = getDb();
  const lic = await db.query.licenses.findFirst({
    where: eq(schema.licenses.id, licenseId),
  });
  if (!lic) return fail("Licencia no encontrada", 404);

  const now = new Date();

  if (action === "copy_token") {
    const token = decryptSecretAES256GCM(lic.encryptedToken);
    if (!token) {
      return fail("Este cliente aun no tiene cuentas MT4 firmadas", 404);
    }
    return ok({ token });
  }

  if (action === "suspend") {
    await db
      .update(schema.licenses)
      .set({ status: "suspended", updatedAt: now })
      .where(eq(schema.licenses.id, lic.id));
    return ok({ status: "suspended" });
  }

  if (action === "reactivate") {
    await db
      .update(schema.licenses)
      .set({ status: "active", updatedAt: now })
      .where(eq(schema.licenses.id, lic.id));
    await db
      .update(schema.users)
      .set({ purchasedAt: lic.purchasedAt, updatedAt: now })
      .where(eq(schema.users.id, lic.userId));
    await remintLicenseToken(lic.id).catch(() => null);
    return ok({ status: "active" });
  }

  if (action === "revoke") {
    await db
      .update(schema.licenses)
      .set({
        status: "revoked",
        encryptedToken: null,
        tokenSha256: null,
        updatedAt: now,
      })
      .where(eq(schema.licenses.id, lic.id));
    await db
      .update(schema.users)
      .set({ purchasedAt: null, updatedAt: now })
      .where(eq(schema.users.id, lic.userId));
    return ok({ status: "revoked" });
  }

  if (action === "reset_cooldown") {
    await db
      .update(schema.licenses)
      .set({ lastSlotSwapAt: null, updatedAt: now })
      .where(eq(schema.licenses.id, lic.id));
    return ok({ reset: true });
  }

  if (action === "clear_slots") {
    await db
      .delete(schema.mt4Accounts)
      .where(eq(schema.mt4Accounts.licenseId, lic.id));
    await db
      .update(schema.licenses)
      .set({
        encryptedToken: null,
        tokenSha256: null,
        lastSlotSwapAt: null,
        updatedAt: now,
      })
      .where(eq(schema.licenses.id, lic.id));
    return ok({ cleared: true });
  }

  if (action === "extend_1y") {
    const base =
      lic.updatesUntil.getTime() > now.getTime() ? lic.updatesUntil : now;
    const nextDate = new Date(base.getTime() + 365 * 86_400_000);
    await db
      .update(schema.licenses)
      .set({
        updatesUntil: nextDate,
        updatesUntilYmd: dateToYmdUtc(nextDate),
        updatedAt: now,
      })
      .where(eq(schema.licenses.id, lic.id));
    await remintLicenseToken(lic.id).catch(() => null);
    return ok({ updatesUntil: nextDate.toISOString() });
  }

  return fail("Accion administrativa desconocida", 400);
});


