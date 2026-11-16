import { eq } from "drizzle-orm";
import { INITIAL_RELEASE_VERSION, isAdminEmail } from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { ensureLicenseForUser } from "@/lib/licenses";
import {
  sendMigrationUpdateEmail,
  sendPurchaseWelcomeEmail,
} from "@/lib/mailer";
import {
  isSameOriginRequest,
  logSecurityEvent,
  readBoundedJson,
} from "@/lib/security";
import { findOrCreateUserByEmail, getUserById } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmailType = "migration" | "welcome" | "none";

function formatUpdatesUntil(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const POST = handle(async (req: Request) => {
  if (!isSameOriginRequest(req)) return fail("Origen no autorizado", 403);

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const admin = await getUserById(session.id);
  if (!admin || admin.role !== "admin" || !isAdminEmail(admin.email)) {
    await logSecurityEvent({
      eventType: "unauthorized_admin",
      route: "/api/admin/grant",
      req,
      userId: session.id,
    });
    return fail("Prohibido", 403);
  }

  const parsed = await readBoundedJson<{
    email?: string;
    name?: string;
    emailType?: EmailType;
  }>(req, 4_096);
  if (!parsed.ok) return fail(parsed.error, parsed.status);

  const email = String(parsed.data.email || "")
    .trim()
    .toLowerCase();
  const name = String(parsed.data.name || "").trim() || undefined;
  const emailType = (parsed.data.emailType || "migration") as EmailType;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("Correo Google invalido", 400);
  }
  if (!["migration", "welcome", "none"].includes(emailType)) {
    return fail("Tipo de correo invalido", 400);
  }

  const user = await findOrCreateUserByEmail(email, { name });
  const now = new Date();
  const purchasedAt = user.purchasedAt ?? now;

  const db = getDb();
  if (!user.purchasedAt) {
    await db
      .update(schema.users)
      .set({ purchasedAt, updatedAt: now })
      .where(eq(schema.users.id, user.id));
  }

  let lic = await ensureLicenseForUser({
    userId: user.id,
    purchasedAt,
  });

  if (lic && lic.status !== "active") {
    const [reactivated] = await db
      .update(schema.licenses)
      .set({ status: "active", updatedAt: now })
      .where(eq(schema.licenses.id, lic.id))
      .returning();
    lic = reactivated || lic;
    await db
      .update(schema.users)
      .set({ purchasedAt: lic.purchasedAt, updatedAt: now })
      .where(eq(schema.users.id, user.id));
  }

  if (!lic) {
    return fail("No se pudo crear la licencia", 500);
  }

  let emailSent = false;
  let emailError: string | undefined;
  if (emailType === "migration") {
    const mail = await sendMigrationUpdateEmail({
      to: email,
      name: name || user.name,
      version: INITIAL_RELEASE_VERSION,
    });
    emailSent = mail.sent;
    emailError = mail.error;
  } else if (emailType === "welcome") {
    const mail = await sendPurchaseWelcomeEmail({
      to: email,
      name: name || user.name,
      updatesUntilText: formatUpdatesUntil(lic.updatesUntil),
    });
    emailSent = mail.sent;
    emailError = mail.error;
  }

  await logSecurityEvent({
    eventType: "admin_manual_grant",
    route: "/api/admin/grant",
    req,
    userId: admin.id,
    detail: JSON.stringify({
      email,
      licenseId: lic.id,
      emailType,
      emailSent,
      emailError: emailError || null,
    }),
  });

  return ok({
    userId: user.id,
    licenseId: lic.id,
    shortId: lic.shortId,
    emailSent,
    emailError,
  });
});
