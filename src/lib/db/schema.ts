import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").notNull().default("user"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntent: text("stripe_payment_intent"),
    serviceId: text("service_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [index("orders_user_id_idx").on(table.userId)],
);

/** Sistema Dual: Licencia de Descargas + Licencia Operativa MT4 + Cobertura de 1 Ano Updates */
export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shortId: serial("short_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("active"), // active | suspended | revoked | refunded
    encryptedToken: text("encrypted_token"),
    tokenSha256: text("token_sha256"),
    maxDownloadsPerDay: integer("max_downloads_per_day").notNull().default(5),
    maxMt4Accounts: integer("max_mt4_accounts").notNull().default(3),
    purchasedAt: timestamp("purchased_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatesUntil: timestamp("updates_until", { withTimezone: true }).notNull(),
    updatesUntilYmd: integer("updates_until_ymd").notNull(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    lastSlotSwapAt: timestamp("last_slot_swap_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("licenses_status_idx").on(table.status),
    index("licenses_token_sha_idx").on(table.tokenSha256),
  ],
);

export const mt4Accounts = pgTable(
  "mt4_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(), // 1 | 2 | 3
    accountLogin: text("account_login").notNull(),
    brokerLabel: text("broker_label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("mt4_accounts_license_slot_idx").on(
      table.licenseId,
      table.slot,
    ),
    uniqueIndex("mt4_accounts_login_unique_idx").on(table.accountLogin),
    index("mt4_accounts_user_idx").on(table.userId),
  ],
);

export const indicatorReleases = pgTable(
  "indicator_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    version: text("version").notNull().unique(),
    buildDateYmd: integer("build_date_ymd").notNull(),
    filename: text("filename").notNull(),
    filePath: text("file_path").notNull(),
    sha256: text("sha256").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    changelog: text("changelog"),
    isPublished: integer("is_published").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("indicator_releases_ymd_idx").on(table.buildDateYmd)],
);

export const downloadTokens = pgTable(
  "download_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jti: text("jti").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    releaseId: uuid("release_id").references(() => indicatorReleases.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("download_tokens_jti_idx").on(table.jti),
    index("download_tokens_user_id_idx").on(table.userId),
  ],
);

export const downloadAudit = pgTable(
  "download_audit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    releaseVersion: text("release_version"),
    outcome: text("outcome").notNull(),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("download_audit_created_idx").on(table.createdAt)],
);

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull().default(1),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    route: text("route").notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ipHash: text("ip_hash"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("security_events_created_idx").on(table.createdAt)],
);


