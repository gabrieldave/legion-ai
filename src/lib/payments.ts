import {
  APP_ID,
  APP_URL,
  PRODUCT_PRICE_USD,
  PRODUCT_SERVICE_ID,
  PRODUCT_TITLE,
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
}): Promise<CheckoutResult> {
  const payload = {
    appId: APP_ID,
    event: "payment.create_checkout_session",
    data: {
      amount: PRODUCT_PRICE_USD,
      currency: "usd",
      serviceTitle: PRODUCT_TITLE,
      serviceDescription:
        "Licencia de por vida: descarga segura del indicador .ex4 para MetaTrader 4.",
      serviceId: PRODUCT_SERVICE_ID,
      customerEmail: input.customerEmail,
      metadata: {
        appId: APP_ID,
        serviceId: PRODUCT_SERVICE_ID,
        purchaseId: input.orderId,
        userId: input.userId,
        tradingAppId: input.userId,
        baseAmountCents: String(Math.round(PRODUCT_PRICE_USD * 100)),
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
    throw new Error("Payment gateway respuesta vacía");
  }

  let result: {
    success?: boolean;
    data?: { url?: string; sessionId?: string };
    error?: string;
  };
  try {
    result = JSON.parse(text) as typeof result;
  } catch {
    throw new Error(`Payment gateway JSON inválido: ${text.slice(0, 120)}`);
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
    throw new Error("sessionId inválido");
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
    amountCents: number;
  },
): boolean {
  if (session.id !== expected.sessionId) return false;
  if (session.payment_status !== "paid") return false;
  if (session.status && session.status !== "complete") return false;
  if (
    typeof session.amount_total === "number" &&
    session.amount_total !== expected.amountCents
  ) {
    return false;
  }
  const meta = session.metadata || {};
  if (meta.purchaseId && meta.purchaseId !== expected.orderId) return false;
  if (meta.userId && meta.userId !== expected.userId) return false;
  if (meta.serviceId && meta.serviceId !== PRODUCT_SERVICE_ID) return false;
  if (meta.appId && meta.appId !== APP_ID) return false;
  return true;
}
