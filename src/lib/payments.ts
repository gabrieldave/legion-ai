import { createHmac, timingSafeEqual } from "crypto";
import {
  APP_ID,
  APP_URL,
  PRODUCT_PRICE_USD,
  PRODUCT_SERVICE_ID,
  PRODUCT_TITLE,
  UPDATES_RENEWAL_PRICE_USD,
  UPDATES_RENEWAL_SERVICE_ID,
  UPDATES_RENEWAL_TITLE,
} from "@/lib/access";

const PAYMENT_REQUEST_TIMEOUT_MS = 15_000;
const GATEWAY_DEFAULT = "https://n8n.vibesystems.tech/webhook/payment";

function paymentGatewayUrl(): string {
  const url = (process.env.PAYMENT_GATEWAY_URL || GATEWAY_DEFAULT).trim();
  if (!url.startsWith("https://n8n.vibesystems.tech/")) {
    throw new Error("PAYMENT_GATEWAY_URL no permitido");
  }
  return url;
}

export type CheckoutResult = { url: string; sessionId: string };

export async function createProductCheckout(input: {
  customerEmail: string;
  userId: string;
  orderId: string;
  plan?: "lifetime" | "updates_1y";
}): Promise<CheckoutResult> {
  const isRenewal = input.plan === "updates_1y";
  const amountUsd = isRenewal ? UPDATES_RENEWAL_PRICE_USD : PRODUCT_PRICE_USD;
  const serviceId = isRenewal
    ? UPDATES_RENEWAL_SERVICE_ID
    : PRODUCT_SERVICE_ID;
  const serviceTitle = isRenewal ? UPDATES_RENEWAL_TITLE : PRODUCT_TITLE;
  const serviceDescription = isRenewal
    ? "Extiende por 12 meses adicionales el acceso a nuevas versiones .ex4 de Legion SuperPanel MT4."
    : "Licencia para hasta 3 cuentas MT4 + descarga segura .ex4 + 1 ano de actualizaciones incluido.";

  const payload = {
    appId: APP_ID,
    event: "payment.create_checkout_session",
    data: {
      amount: amountUsd,
      currency: "usd",
      serviceTitle,
      serviceDescription,
      serviceId,
      customerEmail: input.customerEmail,
      metadata: {
        appId: APP_ID,
        serviceId,
        purchaseId: input.orderId,
        userId: input.userId,
        tradingAppId: input.userId,
        baseAmountCents: String(Math.round(amountUsd * 100)),
        baseCurrency: "usd",
      },
      successUrl: `${APP_URL}/pago/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${APP_URL}/pago/cancel`,
    },
  };

  const response = await fetch(paymentGatewayUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(PAYMENT_REQUEST_TIMEOUT_MS),
  });

  const text = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`Payment gateway ${response.status}: ${text.slice(0, 160)}`);
  }
  if (!text.trim()) {
    throw new Error("Payment gateway respuesta vacia");
  }

  let result: {
    success?: boolean;
    data?: { url?: string; sessionId?: string };
    error?: string;
  };
  try {
    result = JSON.parse(text) as typeof result;
  } catch {
    throw new Error(`Payment gateway JSON invalido: ${text.slice(0, 120)}`);
  }

  const url = result.data?.url;
  const sessionId = result.data?.sessionId;
  if (!result.success || !url || !sessionId) {
    throw new Error(result.error || "Checkout incompleto");
  }
  if (!url.startsWith("https://checkout.stripe.com/")) {
    throw new Error("URL de checkout no confiable");
  }
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    throw new Error("sessionId invalido");
  }

  return { url, sessionId };
}

export type StripeSessionLite = {
  id: string;
  payment_status?: string;
  status?: string;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
  customer_email?: string | null;
};

export async function retrieveCheckoutSession(
  sessionId: string,
): Promise<StripeSessionLite | null> {
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return null;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;

  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) return null;
  return (await response.json()) as StripeSessionLite;
}

export function isVerifiedProductCheckout(
  session: StripeSessionLite,
  expected: {
    sessionId: string;
    orderId: string;
    userId: string;
    serviceId: string;
    amountCents: number;
  },
): boolean {
  if (session.id !== expected.sessionId) return false;
  if (session.payment_status !== "paid") return false;
  if (session.status && session.status !== "complete") return false;

  // Con Stripe Adaptive Pricing la moneda final puede ser MXN/EUR; solo comparar amount_total directo si cobro en USD
  if (
    session.currency?.toLowerCase() === "usd" &&
    typeof session.amount_total === "number" &&
    session.amount_total !== expected.amountCents
  ) {
    return false;
  }

  const meta = session.metadata || {};
  if (
    meta.baseAmountCents &&
    Number(meta.baseAmountCents) !== expected.amountCents
  ) {
    return false;
  }
  if (meta.purchaseId && meta.purchaseId !== expected.orderId) return false;
  if (meta.userId && meta.userId !== expected.userId) return false;
  if (meta.serviceId && meta.serviceId !== expected.serviceId) return false;
  if (meta.appId && meta.appId !== APP_ID) return false;
  return true;
}

export function verifyStripeWebhookSignature(
  rawBody: string,
  sigHeader: string | null | undefined,
  webhookSecret: string | undefined,
  toleranceSec = 300,
): boolean {
  const secret = webhookSecret?.trim();
  if (!sigHeader || !secret) return false;

  let timestamp = 0;
  const v1Sigs: string[] = [];
  for (const part of sigHeader.split(",")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === "t") timestamp = Number(v);
    if (k === "v1" && v) v1Sigs.push(v);
  }

  if (!Number.isInteger(timestamp) || timestamp <= 0 || v1Sigs.length === 0) {
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > toleranceSec) {
    return false;
  }

  const expectedHex = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  return v1Sigs.some((sig) => {
    if (!/^[0-9a-fA-F]{64}$/.test(sig)) return false;
    const gotBuf = Buffer.from(sig, "hex");
    return (
      gotBuf.length === expectedBuf.length &&
      timingSafeEqual(gotBuf, expectedBuf)
    );
  });
}


