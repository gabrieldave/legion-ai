import { and, eq } from "drizzle-orm";
import {
  PRODUCT_SERVICE_ID,
  UPDATES_RENEWAL_SERVICE_ID,
} from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import {
  isVerifiedProductCheckout,
  retrieveCheckoutSession,
} from "@/lib/payments";
import {
  enforceIpRateLimit,
  isSameOriginRequest,
  readBoundedJson,
} from "@/lib/security";
import { fulfillOrder } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  if (!isSameOriginRequest(req)) return fail("Origen no autorizado", 403);

  const rl = await enforceIpRateLimit({
    req,
    bucket: "payments_confirm",
    maxHits: 20,
    windowSec: 900,
    route: "/api/payments/confirm",
  });
  if (!rl.ok) {
    return fail("Demasiadas consultas de verificacion.", 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);

  const parsed = await readBoundedJson<{ sessionId?: string }>(req, 8_192);
  if (!parsed.ok) return fail(parsed.error, parsed.status);

  const sessionId = parsed.data.sessionId?.trim() ?? "";
  if (!sessionId) return fail("sessionId requerido", 400);

  const db = getDb();
  const order = await db.query.orders.findFirst({
    where: and(
      eq(schema.orders.stripeSessionId, sessionId),
      eq(schema.orders.userId, session.id),
    ),
  });
  if (!order) return fail("Orden no encontrada", 404);
  if (
    order.serviceId !== PRODUCT_SERVICE_ID &&
    order.serviceId !== UPDATES_RENEWAL_SERVICE_ID
  ) {
    return fail("Orden invalida", 409);
  }
  if (order.status === "paid") {
    return ok({ purchased: true });
  }

  const stripeSession = await retrieveCheckoutSession(sessionId);
  if (
    !stripeSession ||
    !isVerifiedProductCheckout(stripeSession, {
      sessionId,
      orderId: order.id,
      userId: order.userId,
      serviceId: order.serviceId,
      amountCents: order.amountCents,
    })
  ) {
    return ok({
      purchased: false,
      pending: true,
      message: "Pago en verificacion. Si ya pagaste, recarga en unos segundos.",
    });
  }

  const result = await fulfillOrder({
    orderId: order.id,
    userId: order.userId,
    paymentIntent:
      typeof stripeSession.payment_intent === "string"
        ? stripeSession.payment_intent
        : null,
  });

  return ok({ purchased: result.unlocked, ...result });
});


