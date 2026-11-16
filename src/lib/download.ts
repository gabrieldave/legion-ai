import { createHash } from "crypto";
import { createReadStream } from "fs";
import { access, constants, stat } from "fs/promises";
import path from "path";
import { and, eq, gt, isNull } from "drizzle-orm";
import { PRODUCT_FILENAME } from "@/lib/access";
import { getDb, schema } from "@/lib/db";
import {
  newToken,
  signDownloadToken,
  verifyDownloadToken,
} from "@/lib/auth/token";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_TOKENS_PER_WINDOW = 5;

function productPath(): string {
  const configured = process.env.PRODUCT_FILE_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), "private", "product", PRODUCT_FILENAME);
}

export function hashClientHint(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function assertProductReadable(): Promise<{
  path: string;
  size: number;
}> {
  const filePath = productPath();
  const resolved = path.resolve(filePath);
  if (!process.env.PRODUCT_FILE_PATH) {
    const root = path.resolve(process.cwd(), "private", "product");
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      throw new Error("Ruta de producto inválida");
    }
  }
  await access(resolved, constants.R_OK);
  const info = await stat(resolved);
  if (!info.isFile() || info.size < 1000) {
    throw new Error("Producto ausente");
  }
  return { path: resolved, size: info.size };
}

export async function mintDownloadToken(input: {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresInSec: number }> {
  const db = getDb();
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await db
    .select({ id: schema.downloadTokens.id })
    .from(schema.downloadTokens)
    .where(
      and(
        eq(schema.downloadTokens.userId, input.userId),
        gt(schema.downloadTokens.createdAt, since),
      ),
    );
  if (recent.length >= MAX_TOKENS_PER_WINDOW) {
    throw new Error("RATE_LIMIT");
  }

  const jti = newToken();
  const expiresAt = new Date(Date.now() + 60_000);
  await db.insert(schema.downloadTokens).values({
    jti,
    userId: input.userId,
    expiresAt,
    ipHash: hashClientHint(input.ip),
    userAgentHash: hashClientHint(input.userAgent),
  });

  return {
    token: signDownloadToken(input.userId, jti),
    expiresInSec: 60,
  };
}

export async function consumeDownloadToken(input: {
  token: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<
  { ok: true; path: string; size: number } | { ok: false; reason: string }
> {
  const payload = verifyDownloadToken(input.token);
  if (!payload || payload.uid !== input.userId) {
    return { ok: false, reason: "token_invalid" };
  }

  const db = getDb();
  const row = await db.query.downloadTokens.findFirst({
    where: and(
      eq(schema.downloadTokens.jti, payload.jti),
      eq(schema.downloadTokens.userId, input.userId),
      isNull(schema.downloadTokens.usedAt),
      gt(schema.downloadTokens.expiresAt, new Date()),
    ),
  });
  if (!row) return { ok: false, reason: "token_used_or_expired" };

  const [updated] = await db
    .update(schema.downloadTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.downloadTokens.id, row.id),
        isNull(schema.downloadTokens.usedAt),
      ),
    )
    .returning();
  if (!updated) return { ok: false, reason: "token_race" };

  try {
    const file = await assertProductReadable();
    await db.insert(schema.downloadAudit).values({
      userId: input.userId,
      outcome: "ok",
      ipHash: hashClientHint(input.ip),
      userAgentHash: hashClientHint(input.userAgent),
    });
    return { ok: true, path: file.path, size: file.size };
  } catch {
    await db.insert(schema.downloadAudit).values({
      userId: input.userId,
      outcome: "file_missing",
      ipHash: hashClientHint(input.ip),
      userAgentHash: hashClientHint(input.userAgent),
    });
    return { ok: false, reason: "file_missing" };
  }
}

export function openProductStream(filePath: string) {
  return createReadStream(filePath);
}
