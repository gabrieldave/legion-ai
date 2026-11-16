import { eq } from "drizzle-orm";
import { PRODUCT_PRICE_USD, PRODUCT_SERVICE_ID } from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { createProductCheckout } from "@/lib/payments";
import { getUserById, userHasPurchase } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handle(async () => {
  const session = await getSessionUser();
  if (!session) return fail("Inicia sesión para comprar", 401);

  const user = await getUserById(session.id);
  if (!user) return fail("Inicia sesión para comprar", 401);
  if (userHasPurchase(user)) {
    return ok({ alreadyUnlocked: true });
  }

  const db = getDb();
  const [order] = await db
    .insert(schema.orders)
    .values({
      userId: user.id,
      amountCents: Math.round(PRODUCT_PRICE_USD * 100),
      currency: "usd",
      status: "pending",
      serviceId: PRODUCT_SERVICE_ID,
    })
    .returning();

  try {
    const checkout = await createProductCheckout({
      customerEmail: user.email,
      userId: user.id,
      orderId: order.id,
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
      error instanceof Error ? error.message : error,
    );
    return fail("No se pudo iniciar el pago. Intenta más tarde.", 502);
  }
});
