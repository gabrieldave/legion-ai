import { and, eq } from "drizzle-orm";
import { PRODUCT_SERVICE_ID } from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import {
  isVerifiedProductCheckout,
  retrieveCheckoutSession,
} from "@/lib/payments";
import { fulfillOrder } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);

  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
  } | null;
  const sessionId = body?.sessionId?.trim() ?? "";
  if (!sessionId) return fail("sessionId requerido", 400);

  const db = getDb();
  const order = await db.query.orders.findFirst({
    where: and(
      eq(schema.orders.stripeSessionId, sessionId),
      eq(schema.orders.userId, session.id),
    ),
  });
  if (!order) return fail("Orden no encontrada", 404);
  if (order.serviceId !== PRODUCT_SERVICE_ID) {
    return fail("Orden inválida", 409);
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
      amountCents: order.amountCents,
    })
  ) {
    return ok({
      purchased: false,
      pending: true,
      message: "Pago en verificación. Si ya pagaste, recarga en unos segundos.",
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
