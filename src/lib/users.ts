import { and, desc, eq, sql } from "drizzle-orm";
import { isAdminEmail, PRODUCT_SERVICE_ID } from "@/lib/access";
import { getDb, schema } from "@/lib/db";

export async function findOrCreateUserByEmail(
  email: string,
  opts?: { name?: string },
) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, normalized),
  });
  if (existing) {
    const role = isAdminEmail(normalized) ? "admin" : existing.role;
    if (role !== existing.role || (opts?.name && opts.name !== existing.name)) {
      const [updated] = await db
        .update(schema.users)
        .set({
          role,
          name: opts?.name || existing.name,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db
    .insert(schema.users)
    .values({
      email: normalized,
      name: opts?.name || null,
      role: isAdminEmail(normalized) ? "admin" : "user",
    })
    .returning();
  return created;
}

export async function getUserById(id: string) {
  const db = getDb();
  return db.query.users.findFirst({ where: eq(schema.users.id, id) });
}

export function userHasPurchase(user: {
  purchasedAt: Date | null;
  role: string;
}): boolean {
  return Boolean(user.purchasedAt) || user.role === "admin";
}

export async function fulfillOrder(input: {
  orderId: string;
  userId: string;
  paymentIntent?: string | null;
}) {
  const db = getDb();
  const order = await db.query.orders.findFirst({
    where: and(
      eq(schema.orders.id, input.orderId),
      eq(schema.orders.userId, input.userId),
    ),
  });
  if (!order) return { unlocked: false, reason: "order_missing" as const };
  if (order.serviceId !== PRODUCT_SERVICE_ID) {
    return { unlocked: false, reason: "service_mismatch" as const };
  }
  if (order.status === "paid") {
    return { unlocked: true, reason: "already_paid" as const };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.orders)
      .set({
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntent: input.paymentIntent || order.stripePaymentIntent,
      })
      .where(eq(schema.orders.id, order.id));

    await tx
      .update(schema.users)
      .set({ purchasedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, input.userId));
  });

  return { unlocked: true, reason: "fulfilled" as const };
}

export async function adminDashboardData() {
  const db = getDb();
  const [users, orders, downloads, userCount, buyerCount, paidOrders] =
    await Promise.all([
      db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.users.role,
          purchasedAt: schema.users.purchasedAt,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .orderBy(desc(schema.users.createdAt))
        .limit(200),
      db
        .select({
          id: schema.orders.id,
          userId: schema.orders.userId,
          amountCents: schema.orders.amountCents,
          currency: schema.orders.currency,
          status: schema.orders.status,
          stripeSessionId: schema.orders.stripeSessionId,
          createdAt: schema.orders.createdAt,
          paidAt: schema.orders.paidAt,
          email: schema.users.email,
        })
        .from(schema.orders)
        .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
        .orderBy(desc(schema.orders.createdAt))
        .limit(200),
      db
        .select({
          id: schema.downloadAudit.id,
          outcome: schema.downloadAudit.outcome,
          createdAt: schema.downloadAudit.createdAt,
          email: schema.users.email,
        })
        .from(schema.downloadAudit)
        .leftJoin(schema.users, eq(schema.downloadAudit.userId, schema.users.id))
        .orderBy(desc(schema.downloadAudit.createdAt))
        .limit(100),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.users),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(sql`${schema.users.purchasedAt} is not null`),
      db
        .select({
          n: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(${schema.orders.amountCents}),0)::int`,
        })
        .from(schema.orders)
        .where(eq(schema.orders.status, "paid")),
    ]);

  return {
    stats: {
      users: Number(userCount[0]?.n || 0),
      buyers: Number(buyerCount[0]?.n || 0),
      paidOrders: Number(paidOrders[0]?.n || 0),
      revenueCents: Number(paidOrders[0]?.revenue || 0),
    },
    users,
    orders,
    downloads,
  };
}
