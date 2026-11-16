import { and, asc, desc, eq, lte, ne } from "drizzle-orm";
import {
  CHARGEBACK_LEASE_DAYS,
  DEFAULT_MAX_DOWNLOADS_PER_DAY,
  DEFAULT_MAX_MT4_ACCOUNTS,
  INITIAL_RELEASE_VERSION,
  INITIAL_RELEASE_YMD,
  PRODUCT_FILENAME,
  SLOT_SWAP_COOLDOWN_DAYS,
} from "@/lib/access";
import { getDb, schema } from "@/lib/db";
import {
  computeValidUntilEpoch,
  dateToYmdUtc,
  signLegionLicenseToken,
} from "@/lib/license-crypto";
import {
  decryptSecretAES256GCM,
  encryptSecretAES256GCM,
} from "@/lib/security";

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

export type SlotInput = {
  slot: 1 | 2 | 3;
  accountLogin: string;
  brokerLabel?: string | null;
};

export async function remintLicenseToken(licenseId: string): Promise<string | null> {
  const db = getDb();
  const lic = await db.query.licenses.findFirst({
    where: eq(schema.licenses.id, licenseId),
  });
  if (!lic || lic.status !== "active") return null;

  const rows = await db
    .select()
    .from(schema.mt4Accounts)
    .where(eq(schema.mt4Accounts.licenseId, lic.id))
    .orderBy(asc(schema.mt4Accounts.slot));

  const bySlot = new Map<number, string>();
  for (const r of rows) {
    bySlot.set(r.slot, r.accountLogin);
  }
  const accounts: [string, string, string] = [
    bySlot.get(1) || "",
    bySlot.get(2) || "",
    bySlot.get(3) || "",
  ];

  // Si no hay al menos 1 cuenta registrada aun, dejamos encryptedToken en null hasta que registre su primera cuenta
  if (!accounts[0] && !accounts[1] && !accounts[2]) {
    await db
      .update(schema.licenses)
      .set({
        encryptedToken: null,
        tokenSha256: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.licenses.id, lic.id));
    return null;
  }

  const now = new Date();
  const validUntilEpoch = computeValidUntilEpoch(lic.leaseUntil, now);
  const { token, sha256 } = signLegionLicenseToken({
    shortId: lic.shortId,
    validUntilEpoch,
    updatesUntilYmd: lic.updatesUntilYmd,
    accounts,
  });

  await db
    .update(schema.licenses)
    .set({
      encryptedToken: encryptSecretAES256GCM(token),
      tokenSha256: sha256,
      leaseUntil: validUntilEpoch === 0 ? null : lic.leaseUntil,
      updatedAt: now,
    })
    .where(eq(schema.licenses.id, lic.id));

  return token;
}

/** Asegura o migra automaticamente la licencia de un comprador verificado o admin */
export async function ensureLicenseForUser(input: {
  userId: string;
  orderId?: string | null;
  purchasedAt?: Date | null;
  isAdmin?: boolean;
}) {
  const db = getDb();
  const existing = await db.query.licenses.findFirst({
    where: eq(schema.licenses.userId, input.userId),
  });
  if (existing) {
    return existing;
  }

  const buyDate = input.purchasedAt || new Date();
  const updatesUntil = input.isAdmin
    ? addDays(buyDate, 3650)
    : addDays(buyDate, 365);
  const leaseUntil = input.isAdmin
    ? null
    : addDays(buyDate, CHARGEBACK_LEASE_DAYS);

  const [created] = await db
    .insert(schema.licenses)
    .values({
      userId: input.userId,
      orderId: input.orderId || null,
      status: "active",
      maxDownloadsPerDay: DEFAULT_MAX_DOWNLOADS_PER_DAY,
      maxMt4Accounts: DEFAULT_MAX_MT4_ACCOUNTS,
      purchasedAt: buyDate,
      updatesUntil,
      updatesUntilYmd: dateToYmdUtc(updatesUntil),
      leaseUntil,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;
  return db.query.licenses.findFirst({
    where: eq(schema.licenses.userId, input.userId),
  });
}

export async function extendUpdatesOneYearForUser(
  userId: string,
  orderId?: string | null,
) {
  const db = getDb();
  const lic = await ensureLicenseForUser({ userId, orderId });
  if (!lic) throw new Error("No se pudo localizar la licencia");

  const now = new Date();
  const base =
    lic.updatesUntil.getTime() > now.getTime() ? lic.updatesUntil : now;
  const nextUpdatesUntil = addDays(base, 365);
  const nextYmd = dateToYmdUtc(nextUpdatesUntil);

  await db
    .update(schema.licenses)
    .set({
      status: "active",
      orderId: orderId || lic.orderId,
      updatesUntil: nextUpdatesUntil,
      updatesUntilYmd: nextYmd,
      updatedAt: now,
    })
    .where(eq(schema.licenses.id, lic.id));

  try {
    await remintLicenseToken(lic.id);
  } catch {
    // Si aun no hay cuentas MT4 o llave no configurada en dev, no bloquea el pago
  }
}

export async function revokeLicenseByDisputeOrRefund(input: {
  userId: string;
  reason: "refunded" | "revoked";
}) {
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.licenses)
      .set({
        status: input.reason,
        encryptedToken: null,
        tokenSha256: null,
        updatedAt: now,
      })
      .where(eq(schema.licenses.userId, input.userId));

    await tx
      .update(schema.users)
      .set({
        purchasedAt: null,
        updatedAt: now,
      })
      .where(eq(schema.users.id, input.userId));
  });
}

export async function getEntitledReleases(updatesUntilYmd: number) {
  const db = getDb();
  const allPublished = await db
    .select()
    .from(schema.indicatorReleases)
    .where(eq(schema.indicatorReleases.isPublished, 1))
    .orderBy(
      desc(schema.indicatorReleases.buildDateYmd),
      desc(schema.indicatorReleases.createdAt),
    );

  if (allPublished.length === 0) {
    return {
      covered: [
        {
          id: null as string | null,
          version: INITIAL_RELEASE_VERSION,
          buildDateYmd: INITIAL_RELEASE_YMD,
          filename: PRODUCT_FILENAME,
          changelog: "Version base Legion SuperPanel v3.15 para MetaTrader 4",
        },
      ],
      latestUncovered: null as {
        version: string;
        buildDateYmd: number;
      } | null,
    };
  }

  const covered = allPublished
    .filter((r) => r.buildDateYmd <= updatesUntilYmd)
    .map((r) => ({
      id: r.id as string | null,
      version: r.version,
      buildDateYmd: r.buildDateYmd,
      filename: r.filename,
      changelog: r.changelog,
    }));

  // Garantiza siempre al menos la version inicial que compro aunque subas builds futuros
  if (covered.length === 0) {
    const oldest = allPublished[allPublished.length - 1];
    covered.push({
      id: oldest.id,
      version: oldest.version,
      buildDateYmd: oldest.buildDateYmd,
      filename: oldest.filename,
      changelog: oldest.changelog,
    });
  }

  const newest = allPublished[0];
  const latestUncovered =
    newest && newest.buildDateYmd > updatesUntilYmd
      ? { version: newest.version, buildDateYmd: newest.buildDateYmd }
      : null;

  return { covered, latestUncovered };
}

export async function getCustomerLicenseView(user: {
  id: string;
  purchasedAt: Date | null;
  role: string;
}) {
  const hasAccess = Boolean(user.purchasedAt) || user.role === "admin";
  const db = getDb();
  let lic = await db.query.licenses.findFirst({
    where: eq(schema.licenses.userId, user.id),
  });

  if (!lic && hasAccess) {
    lic =
      (await ensureLicenseForUser({
        userId: user.id,
        purchasedAt: user.purchasedAt,
        isAdmin: user.role === "admin",
      })) ?? undefined;
  }

  if (!lic) {
    return null;
  }

  // Si ya vencio el lease anti-contracargo de 35 dias y sigue activa, promover automaticamente a certificado perpetuo
  if (
    lic.status === "active" &&
    lic.leaseUntil &&
    Date.now() >= lic.leaseUntil.getTime() &&
    lic.encryptedToken
  ) {
    try {
      await remintLicenseToken(lic.id);
      lic =
        (await db.query.licenses.findFirst({
          where: eq(schema.licenses.id, lic.id),
        })) ?? lic;
    } catch {
      // ignore
    }
  }

  const slotRows = await db
    .select()
    .from(schema.mt4Accounts)
    .where(eq(schema.mt4Accounts.licenseId, lic.id))
    .orderBy(asc(schema.mt4Accounts.slot));

  const slots = [1, 2, 3].map((s) => {
    const found = slotRows.find((r) => r.slot === s);
    return {
      slot: s as 1 | 2 | 3,
      accountLogin: found?.accountLogin || "",
      brokerLabel: found?.brokerLabel || "",
    };
  });

  const releases = await getEntitledReleases(lic.updatesUntilYmd);
  const decryptedToken =
    lic.status === "active"
      ? decryptSecretAES256GCM(lic.encryptedToken)
      : null;

  let nextSwapAllowedAt: string | null = null;
  if (lic.lastSlotSwapAt) {
    const nextDate = addDays(lic.lastSlotSwapAt, SLOT_SWAP_COOLDOWN_DAYS);
    if (nextDate.getTime() > Date.now()) {
      nextSwapAllowedAt = nextDate.toISOString();
    }
  }

  return {
    id: lic.id,
    shortId: lic.shortId,
    status: lic.status,
    maxMt4Accounts: lic.maxMt4Accounts,
    maxDownloadsPerDay: lic.maxDownloadsPerDay,
    purchasedAt: lic.purchasedAt.toISOString(),
    updatesUntil: lic.updatesUntil.toISOString(),
    updatesUntilYmd: lic.updatesUntilYmd,
    updatesActive: lic.updatesUntil.getTime() >= Date.now(),
    isPermanentCert: !lic.leaseUntil,
    nextSwapAllowedAt,
    slots,
    licenseToken: decryptedToken,
    coveredReleases: releases.covered,
    latestUncoveredRelease: releases.latestUncovered,
  };
}

export async function saveCustomerMt4Slots(input: {
  userId: string;
  slots: SlotInput[];
}): Promise<
  | { ok: true; token: string | null }
  | { ok: false; status: number; error: string }
> {
  const db = getDb();
  const lic = await db.query.licenses.findFirst({
    where: eq(schema.licenses.userId, input.userId),
  });
  if (!lic || lic.status !== "active") {
    return { ok: false, status: 403, error: "Tu licencia no esta activa" };
  }

  if (!Array.isArray(input.slots) || input.slots.length !== 3) {
    return { ok: false, status: 400, error: "Se requieren los 3 espacios de cuenta" };
  }

  const normalized: SlotInput[] = [];
  const seenLogins = new Set<string>();
  for (const s of [1, 2, 3] as const) {
    const item = input.slots.find((x) => x.slot === s);
    const login = (item?.accountLogin || "").trim();
    const label = (item?.brokerLabel || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 40);

    if (login !== "") {
      if (!/^[1-9]\d{0,18}$/.test(login)) {
        return {
          ok: false,
          status: 400,
          error: `La Cuenta #${s} debe contener solo numeros validos de MetaTrader 4`,
        };
      }
      const n = BigInt(login);
      if (n <= 0n || n > 18446744073709551615n) {
        return {
          ok: false,
          status: 400,
          error: `La Cuenta #${s} excede el rango permitido`,
        };
      }
      if (seenLogins.has(login)) {
        return {
          ok: false,
          status: 400,
          error: `No repitas el mismo numero de cuenta (${login}) en dos espacios`,
        };
      }
      seenLogins.add(login);
    }
    normalized.push({ slot: s, accountLogin: login, brokerLabel: label || null });
  }

  if (seenLogins.size === 0) {
    return {
      ok: false,
      status: 400,
      error: "Ingresa al menos 1 numero de cuenta de MetaTrader 4",
    };
  }

  // Verificar que ninguna de las cuentas pertenezca ya a otro usuario distinto
  for (const login of seenLogins) {
    const conflict = await db.query.mt4Accounts.findFirst({
      where: and(
        eq(schema.mt4Accounts.accountLogin, login),
        ne(schema.mt4Accounts.userId, input.userId),
      ),
    });
    if (conflict) {
      return {
        ok: false,
        status: 409,
        error: `La cuenta MT4 #${login} ya esta vinculada a otra licencia`,
      };
    }
  }

  const currentRows = await db
    .select()
    .from(schema.mt4Accounts)
    .where(eq(schema.mt4Accounts.licenseId, lic.id));

  const prevBySlot = new Map<number, string>();
  for (const r of currentRows) {
    prevBySlot.set(r.slot, r.accountLogin);
  }

  let replacesOccupiedSlot = false;
  for (const item of normalized) {
    const prev = prevBySlot.get(item.slot) || "";
    if (prev !== "" && prev !== item.accountLogin) {
      replacesOccupiedSlot = true;
    }
  }

  const now = new Date();
  if (replacesOccupiedSlot && lic.lastSlotSwapAt) {
    const nextAllowed = addDays(lic.lastSlotSwapAt, SLOT_SWAP_COOLDOWN_DAYS);
    if (now.getTime() < nextAllowed.getTime()) {
      return {
        ok: false,
        status: 429,
        error: `Ya realizaste un cambio de cuenta recientemente. Podras reemplazar una cuenta ocupada nuevamente el ${nextAllowed.toLocaleDateString("es-MX")} (los espacios vacios si pueden llenarse en cualquier momento).`,
      };
    }
  }

  await db.transaction(async (tx) => {
    for (const item of normalized) {
      if (!item.accountLogin) {
        await tx
          .delete(schema.mt4Accounts)
          .where(
            and(
              eq(schema.mt4Accounts.licenseId, lic.id),
              eq(schema.mt4Accounts.slot, item.slot),
            ),
          );
      } else {
        const existingSlot = currentRows.find((r) => r.slot === item.slot);
        if (existingSlot) {
          await tx
            .update(schema.mt4Accounts)
            .set({
              accountLogin: item.accountLogin,
              brokerLabel: item.brokerLabel || null,
              updatedAt: now,
            })
            .where(eq(schema.mt4Accounts.id, existingSlot.id));
        } else {
          await tx.insert(schema.mt4Accounts).values({
            licenseId: lic.id,
            userId: input.userId,
            slot: item.slot,
            accountLogin: item.accountLogin,
            brokerLabel: item.brokerLabel || null,
          });
        }
      }
    }

    if (replacesOccupiedSlot) {
      await tx
        .update(schema.licenses)
        .set({ lastSlotSwapAt: now, updatedAt: now })
        .where(eq(schema.licenses.id, lic.id));
    }
  });

  const token = await remintLicenseToken(lic.id);
  return { ok: true, token };
}


