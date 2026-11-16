import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { APP_ID } from "@/lib/access";
import { getDb, schema } from "@/lib/db";
import { revokeLicenseByDisputeOrRefund } from "@/lib/licenses";
import { verifyStripeWebhookSignature } from "@/lib/payments";
import { logSecurityEvent } from "@/lib/security";
import { fulfillOrder } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEventPayload = {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id?: string;
      payment_intent?: string | null;
      payment_status?: string;
      metadata?: Record<string, string> | null;
    };
  };
};

export async function POST(req: Request) {
  const rawBody = await req.text().catch(() => "");
  const sig = req.headers.get("stripe-signature");

  if (
    !verifyStripeWebhookSignature(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
      300,
    )
  ) {
    await logSecurityEvent({
      eventType: "webhook_bad_sig",
      route: "/api/webhooks/stripe",
      req,
      detail: "Stripe-Signature invalida o ausente",
    });
    return NextResponse.json(
      { ok: false, error: "Firma invalida" },
      { status: 400 },
    );
  }

  let event: StripeEventPayload;
  try {
    event = JSON.parse(rawBody) as StripeEventPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload invalido" },
      { status: 400 },
    );
  }

  const eventId = event.id?.trim() || "";
  const eventType = event.type?.trim() || "";
  if (!eventId || !eventType) {
    return NextResponse.json(
      { ok: false, error: "Evento incompleto" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [inserted] = await db
    .insert(schema.stripeWebhookEvents)
    .values({ eventId, eventType })
    .onConflictDoNothing()
    .returning();

  // Idempotencia: si ya fue procesado antes, responder 200 inmediatamente
  if (!inserted) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const obj = event.data?.object || {};
  const meta = obj.metadata || {};

  // Ignorar silenciosamente eventos de otras apps del mismo Stripe si existen
  if (meta.appId && meta.appId !== APP_ID) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  ) {
    if (
      eventType === "checkout.session.completed" &&
      obj.payment_status &&
      obj.payment_status !== "paid"
    ) {
      return NextResponse.json({ ok: true, awaitingAsync: true });
    }

    const orderId = meta.purchaseId?.trim();
    const userId = meta.userId?.trim();
    const sessionId = obj.id?.trim();

    let order =
      orderId
        ? await db.query.orders.findFirst({
            where: eq(schema.orders.id, orderId),
          })
        : undefined;

    if (!order && sessionId) {
      order = await db.query.orders.findFirst({
        where: eq(schema.orders.stripeSessionId, sessionId),
      });
    }

    if (order && (!userId || order.userId === userId)) {
      await fulfillOrder({
        orderId: order.id,
        userId: order.userId,
        paymentIntent:
          typeof obj.payment_intent === "string" ? obj.payment_intent : null,
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (
    eventType === "charge.refunded" ||
    eventType === "charge.dispute.created" ||
    eventType === "payment_intent.canceled"
  ) {
    const pi =
      eventType === "payment_intent.canceled"
        ? obj.id?.trim()
        : typeof obj.payment_intent === "string"
          ? obj.payment_intent.trim()
          : "";

    const orderId = meta.purchaseId?.trim() || "";
    let order = undefined;

    if (pi && orderId) {
      order = await db.query.orders.findFirst({
        where: or(
          eq(schema.orders.stripePaymentIntent, pi),
          eq(schema.orders.id, orderId),
        ),
      });
    } else if (pi) {
      order = await db.query.orders.findFirst({
        where: eq(schema.orders.stripePaymentIntent, pi),
      });
    } else if (orderId) {
      order = await db.query.orders.findFirst({
        where: eq(schema.orders.id, orderId),
      });
    }

    if (order) {
      const reason =
        eventType === "charge.refunded" ? "refunded" : "revoked";
      await db
        .update(schema.orders)
        .set({ status: reason })
        .where(eq(schema.orders.id, order.id));

      await revokeLicenseByDisputeOrRefund({
        userId: order.userId,
        reason,
      });

      await logSecurityEvent({
        eventType: "license_revoked_stripe",
        route: "/api/webhooks/stripe",
        userId: order.userId,
        detail: `${eventType} order=${order.id}`,
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}


