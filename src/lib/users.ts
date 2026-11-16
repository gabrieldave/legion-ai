import { and, desc, eq, sql } from "drizzle-orm";
import {
  isAdminEmail,
  PRODUCT_SERVICE_ID,
  UPDATES_RENEWAL_SERVICE_ID,
} from "@/lib/access";
import { getDb, schema } from "@/lib/db";
import {
  ensureLicenseForUser,
  extendUpdatesOneYearForUser,
} from "@/lib/licenses";

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
  if (
    order.serviceId !== PRODUCT_SERVICE_ID &&
    order.serviceId !== UPDATES_RENEWAL_SERVICE_ID
  ) {
    return { unlocked: false, reason: "service_mismatch" as const };
  }
  if (order.status === "paid") {
    return { unlocked: true, reason: "already_paid" as const };
  }

  const paidAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.orders)
      .set({
        status: "paid",
        paidAt,
        stripePaymentIntent: input.paymentIntent || order.stripePaymentIntent,
      })
      .where(eq(schema.orders.id, order.id));

    await tx
      .update(schema.users)
      .set({
        purchasedAt: paidAt,
        updatedAt: paidAt,
      })
      .where(eq(schema.users.id, input.userId));
  });

  if (order.serviceId === UPDATES_RENEWAL_SERVICE_ID) {
    await extendUpdatesOneYearForUser(input.userId, order.id);
  } else {
    const existingLic = await db.query.licenses.findFirst({
      where: eq(schema.licenses.userId, input.userId),
    });
    if (!existingLic) {
      await ensureLicenseForUser({
        userId: input.userId,
        orderId: order.id,
        purchasedAt: paidAt,
      });
    } else if (existingLic.status !== "active") {
      await extendUpdatesOneYearForUser(input.userId, order.id);
    }
  }

  return { unlocked: true, reason: "fulfilled" as const };
}

export async function adminDashboardData() {
  const db = getDb();
  const [
    users,
    orders,
    downloads,
    licensesList,
    mt4List,
    releasesList,
    secEvents,
    userCount,
    buyerCount,
    paidOrders,
  ] = await Promise.all([
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
        serviceId: schema.orders.serviceId,
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
        releaseVersion: schema.downloadAudit.releaseVersion,
        outcome: schema.downloadAudit.outcome,
        createdAt: schema.downloadAudit.createdAt,
        email: schema.users.email,
      })
      .from(schema.downloadAudit)
      .leftJoin(schema.users, eq(schema.downloadAudit.userId, schema.users.id))
      .orderBy(desc(schema.downloadAudit.createdAt))
      .limit(100),
    db
      .select({
        id: schema.licenses.id,
        shortId: schema.licenses.shortId,
        userId: schema.licenses.userId,
        status: schema.licenses.status,
        hasToken: sql<boolean>`${schema.licenses.encryptedToken} is not null`,
        updatesUntil: schema.licenses.updatesUntil,
        updatesUntilYmd: schema.licenses.updatesUntilYmd,
        lastSlotSwapAt: schema.licenses.lastSlotSwapAt,
        createdAt: schema.licenses.createdAt,
        email: schema.users.email,
      })
      .from(schema.licenses)
      .leftJoin(schema.users, eq(schema.licenses.userId, schema.users.id))
      .orderBy(desc(schema.licenses.createdAt))
      .limit(200),
    db
      .select({
        licenseId: schema.mt4Accounts.licenseId,
        slot: schema.mt4Accounts.slot,
        accountLogin: schema.mt4Accounts.accountLogin,
        brokerLabel: schema.mt4Accounts.brokerLabel,
      })
      .from(schema.mt4Accounts),
    db
      .select()
      .from(schema.indicatorReleases)
      .orderBy(desc(schema.indicatorReleases.buildDateYmd))
      .limit(50),
    db
      .select({
        id: schema.securityEvents.id,
        eventType: schema.securityEvents.eventType,
        route: schema.securityEvents.route,
        ipHash: schema.securityEvents.ipHash,
        detail: schema.securityEvents.detail,
        createdAt: schema.securityEvents.createdAt,
      })
      .from(schema.securityEvents)
      .orderBy(desc(schema.securityEvents.createdAt))
      .limit(80),
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

  const accountsByLic = new Map<
    string,
    Array<{ slot: number; accountLogin: string; brokerLabel: string | null }>
  >();
  for (const acc of mt4List) {
    const arr = accountsByLic.get(acc.licenseId) || [];
    arr.push({
      slot: acc.slot,
      accountLogin: acc.accountLogin,
      brokerLabel: acc.brokerLabel,
    });
    accountsByLic.set(acc.licenseId, arr);
  }

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
    licenses: licensesList.map((l) => ({
      ...l,
      accounts: (accountsByLic.get(l.id) || []).sort((a, b) => a.slot - b.slot),
    })),
    releases: releasesList,
    securityEvents: secEvents,
  };
}


