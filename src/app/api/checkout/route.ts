import { eq } from "drizzle-orm";
import {
  PRODUCT_PRICE_USD,
  PRODUCT_SERVICE_ID,
  UPDATES_RENEWAL_PRICE_USD,
  UPDATES_RENEWAL_SERVICE_ID,
} from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { createProductCheckout } from "@/lib/payments";
import {
  enforceIpRateLimit,
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
      route: "/api/checkout",
      req,
    });
    return fail("Origen no autorizado", 403);
  }

  const rl = await enforceIpRateLimit({
    req,
    bucket: "checkout",
    maxHits: 15,
    windowSec: 900,
    route: "/api/checkout",
  });
  if (!rl.ok) {
    return fail("Demasiados intentos. Intenta en unos minutos.", 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const session = await getSessionUser();
  if (!session) return fail("Inicia sesion para comprar", 401);

  const user = await getUserById(session.id);
  if (!user) return fail("Inicia sesion para comprar", 401);

  const parsed = await readBoundedJson<{ plan?: string }>(req, 8_192);
  if (!parsed.ok) return fail(parsed.error, parsed.status);

  const plan =
    parsed.data.plan === "updates_1y" ? "updates_1y" : "lifetime";

  if (plan === "lifetime" && userHasPurchase(user)) {
    return ok({ alreadyUnlocked: true });
  }
  if (plan === "updates_1y" && !userHasPurchase(user)) {
    return fail("Primero debes adquirir la licencia base del indicador", 400);
  }

  const amountUsd =
    plan === "updates_1y" ? UPDATES_RENEWAL_PRICE_USD : PRODUCT_PRICE_USD;
  const serviceId =
    plan === "updates_1y" ? UPDATES_RENEWAL_SERVICE_ID : PRODUCT_SERVICE_ID;

  const db = getDb();
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId: user.id,
      amountCents: Math.round(amountUsd * 100),
      currency: "usd",
      status: "pending",
      serviceId,
    })
    .returning();

  try {
    const checkout = await createProductCheckout({
      customerEmail: user.email,
      userId: user.id,
      orderId: order.id,
      plan,
    });
    await db
      .update(schema.orders)
      .set({ stripeSessionId: checkout.sessionId })
      .where(eq(schema.orders.id, order.id));
    return ok({ url: checkout.url, sessionId: checkout.sessionId });
  } catch (error) {
    await db
      .update(schema.orders)
      .set({ status: "failed" })
      .where(eq(schema.orders.id, order.id));
    console.error(
      "[checkout]",
      error instanceof Error ? error.message : "err",
    );
    return fail("No se pudo iniciar el pago. Intenta mas tarde.", 502);
  }
});


