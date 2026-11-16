import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
} from "crypto";
import { sql } from "drizzle-orm";
import { APP_URL } from "@/lib/access";
import { getDb, schema } from "@/lib/db";

function requireSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET ausente o debil: fail-closed");
  }
  return secret;
}

/** Prioriza siempre cf-connecting-ip (Cloudflare Edge) para impedir spoofing de X-Forwarded-For */
export function getTrustedClientIp(req: Request): string | null {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return null;
}

export function hashClientHint(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256")
    .update(`legion-hint-v1:${value}`)
    .digest("hex")
    .slice(0, 32);
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function deriveAesKey(): Buffer {
  const secret = requireSessionSecret();
  return Buffer.from(
    hkdfSync(
      "sha256",
      secret,
      "legion-ai-aes-salt-v1",
      "legion-license-gcm-key",
      32,
    ),
  );
}

export function encryptSecretAES256GCM(plaintext: string): string {
  const key = deriveAesKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecretAES256GCM(packed: string | null | undefined): string | null {
  if (!packed) return null;
  const parts = packed.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const key = deriveAesKey();
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const enc = Buffer.from(parts[3], "hex");
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function isSameOriginRequest(req: Request): boolean {
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(APP_URL).origin;
  } catch {
    return false;
  }

  const origin = req.headers.get("origin")?.trim();
  if (origin) {
    return origin === expectedOrigin;
  }

  const secFetchSite = req.headers.get("sec-fetch-site")?.trim();
  const referer = req.headers.get("referer")?.trim();
  if (referer) {
    try {
      return (
        new URL(referer).origin === expectedOrigin &&
        (!secFetchSite || secFetchSite === "same-origin")
      );
    } catch {
      return false;
    }
  }
  return false;
}

export async function logSecurityEvent(input: {
  eventType: string;
  route: string;
  req?: Request;
  userId?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    const db = getDb();
    const ipHash = input.req ? hashClientHint(getTrustedClientIp(input.req)) : null;
    await db.insert(schema.securityEvents).values({
      eventType: input.eventType.slice(0, 64),
      route: input.route.slice(0, 120),
      userId: input.userId || null,
      ipHash,
      detail: input.detail ? input.detail.slice(0, 240) : null,
    });
  } catch (err) {
    console.error(
      "[security_event_fail]",
      err instanceof Error ? err.message : "err",
    );
  }
}

/** Rate limit respaldado en PostgreSQL (persiste entre contenedores y reinicios) */
export async function enforceIpRateLimit(input: {
  req: Request;
  bucket: string;
  maxHits: number;
  windowSec: number;
  route: string;
  userId?: string | null;
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const db = getDb();
  const ipHash = hashClientHint(getTrustedClientIp(input.req)) || "unknown";
  const key = `${input.bucket}:${ipHash}`;
  const now = new Date();
  const nextReset = new Date(now.getTime() + input.windowSec * 1000);

  const rows = await db.execute<{ hits: number; reset_at: string | Date }>(sql`
    INSERT INTO rate_limits (key, hits, reset_at)
    VALUES (${key}, 1, ${nextReset.toISOString()}::timestamptz)
    ON CONFLICT (key) DO UPDATE
      SET hits = CASE
        WHEN rate_limits.reset_at <= NOW() THEN 1
        ELSE rate_limits.hits + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= NOW() THEN ${nextReset.toISOString()}::timestamptz
        ELSE rate_limits.reset_at
      END
    RETURNING hits, reset_at
  `);

  const row = rows[0];
  const hits = Number(row?.hits || 1);
  const resetAtMs = row?.reset_at ? new Date(row.reset_at).getTime() : nextReset.getTime();
  if (hits > input.maxHits) {
    const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
    await logSecurityEvent({
      eventType: "rate_limit_429",
      route: input.route,
      req: input.req,
      userId: input.userId,
      detail: `bucket=${input.bucket} hits=${hits}`,
    });
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

export async function readBoundedJson<T>(
  req: Request,
  maxBytes = 32_768,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const lenHeader = Number(req.headers.get("content-length") || "0");
  if (lenHeader > maxBytes) {
    return { ok: false, status: 413, error: "Payload demasiado grande" };
  }
  const raw = await req.text().catch(() => "");
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return { ok: false, status: 413, error: "Payload demasiado grande" };
  }
  if (!raw.trim()) {
    return { ok: true, data: {} as T };
  }
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, status: 400, error: "JSON invalido" };
  }
}


