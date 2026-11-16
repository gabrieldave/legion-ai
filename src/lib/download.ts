import { createReadStream } from "fs";
import { access, constants, stat } from "fs/promises";
import path from "path";
import { and, desc, eq, gt, isNull, lte } from "drizzle-orm";
import {
  INITIAL_RELEASE_VERSION,
  PRODUCT_FILENAME,
  RELEASES_STORAGE_DIR,
} from "@/lib/access";
import {
  newToken,
  signDownloadToken,
  verifyDownloadToken,
} from "@/lib/auth/token";
import { getDb, schema } from "@/lib/db";
import { ensureLicenseForUser } from "@/lib/licenses";
import { hashClientHint } from "@/lib/security";

const TOKEN_WINDOW_MS = 10 * 60 * 1000;
const MAX_TOKENS_PER_10M = 5;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

function defaultProductPath(): string {
  const configured = process.env.PRODUCT_FILE_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), "private", "product", PRODUCT_FILENAME);
}

function assertSafeAllowedPath(candidatePath: string): string {
  const resolved = path.resolve(candidatePath);
  const allowedRoots = [
    path.resolve(process.cwd(), "private", "product"),
    path.resolve(RELEASES_STORAGE_DIR),
  ];
  if (process.env.PRODUCT_FILE_PATH?.trim()) {
    allowedRoots.push(path.dirname(path.resolve(process.env.PRODUCT_FILE_PATH.trim())));
  }
  const ok = allowedRoots.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep),
  );
  if (!ok) {
    throw new Error("Ruta fuera de directorios autorizados");
  }
  return resolved;
}

export async function resolveEntitledReleaseFile(input: {
  userId: string;
  isAdmin: boolean;
  purchasedAt: Date | null;
  requestedReleaseId?: string | null;
}): Promise<
  | {
      ok: true;
      releaseId: string | null;
      version: string;
      filename: string;
      path: string;
      size: number;
    }
  | { ok: false; status: number; reason: string; message: string }
> {
  const db = getDb();
  const lic = await ensureLicenseForUser({
    userId: input.userId,
    purchasedAt: input.purchasedAt,
    isAdmin: input.isAdmin,
  });

  if (!lic || lic.status !== "active") {
    return {
      ok: false,
      status: 403,
      reason: "license_inactive",
      message: "Tu licencia de descarga se encuentra suspendida o revocada.",
    };
  }

  // Cuota diaria anti-abuso por licencia
  const dayAgo = new Date(Date.now() - DAY_WINDOW_MS);
  const dailyDownloads = await db
    .select({ id: schema.downloadAudit.id })
    .from(schema.downloadAudit)
    .where(
      and(
        eq(schema.downloadAudit.userId, input.userId),
        eq(schema.downloadAudit.outcome, "ok"),
        gt(schema.downloadAudit.createdAt, dayAgo),
      ),
    );

  if (!input.isAdmin && dailyDownloads.length >= lic.maxDownloadsPerDay) {
    return {
      ok: false,
      status: 429,
      reason: "daily_quota_exceeded",
      message: `Alcanzaste el limite de ${lic.maxDownloadsPerDay} descargas en 24 horas.`,
    };
  }

  // Buscar version especifica o la ultima cubierta dentro de su ano de actualizaciones
  let chosenRelease = null as typeof schema.indicatorReleases.$inferSelect | null;
  if (input.requestedReleaseId) {
    const found = await db.query.indicatorReleases.findFirst({
      where: and(
        eq(schema.indicatorReleases.id, input.requestedReleaseId),
        eq(schema.indicatorReleases.isPublished, 1),
      ),
    });
    if (!found) {
      return {
        ok: false,
        status: 404,
        reason: "release_not_found",
        message: "Version solicitada no disponible.",
      };
    }
    if (!input.isAdmin && found.buildDateYmd > lic.updatesUntilYmd) {
      return {
        ok: false,
        status: 403,
        reason: "updates_expired_for_release",
        message:
          "Esta version fue publicada despues de tu ano de actualizaciones incluido. Descarga tu version cubierta o renueva 1 ano.",
      };
    }
    chosenRelease = found;
  } else {
    const covered = await db
      .select()
      .from(schema.indicatorReleases)
      .where(
        input.isAdmin
          ? eq(schema.indicatorReleases.isPublished, 1)
          : and(
              eq(schema.indicatorReleases.isPublished, 1),
              lte(schema.indicatorReleases.buildDateYmd, lic.updatesUntilYmd),
            ),
      )
      .orderBy(
        desc(schema.indicatorReleases.buildDateYmd),
        desc(schema.indicatorReleases.createdAt),
      )
      .limit(1);

    chosenRelease = covered[0] || null;
  }

  const rawPath = chosenRelease ? chosenRelease.filePath : defaultProductPath();
  const safeFilename = chosenRelease
    ? path.basename(chosenRelease.filename)
    : PRODUCT_FILENAME;
  const versionLabel = chosenRelease
    ? chosenRelease.version
    : INITIAL_RELEASE_VERSION;

  const resolvedPath = assertSafeAllowedPath(rawPath);
  await access(resolvedPath, constants.R_OK);
  const info = await stat(resolvedPath);
  if (!info.isFile() || info.size < 1000) {
    throw new Error("Archivo binario .ex4 ausente en almacenamiento privado");
  }

  return {
    ok: true,
    releaseId: chosenRelease?.id || null,
    version: versionLabel,
    filename: safeFilename,
    path: resolvedPath,
    size: info.size,
  };
}

export async function mintDownloadToken(input: {
  userId: string;
  isAdmin: boolean;
  purchasedAt: Date | null;
  releaseId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<
  | { ok: true; token: string; expiresInSec: number; filename: string; version: string }
  | { ok: false; status: number; error: string }
> {
  const db = getDb();
  const since = new Date(Date.now() - TOKEN_WINDOW_MS);
  const recent = await db
    .select({ id: schema.downloadTokens.id })
    .from(schema.downloadTokens)
    .where(
      and(
        eq(schema.downloadTokens.userId, input.userId),
        gt(schema.downloadTokens.createdAt, since),
      ),
    );
  if (recent.length >= MAX_TOKENS_PER_10M) {
    return {
      ok: false,
      status: 429,
      error: "Demasiados enlaces solicitados. Espera unos minutos.",
    };
  }

  const check = await resolveEntitledReleaseFile({
    userId: input.userId,
    isAdmin: input.isAdmin,
    purchasedAt: input.purchasedAt,
    requestedReleaseId: input.releaseId,
  });
  if (!check.ok) {
    return { ok: false, status: check.status, error: check.message };
  }

  const jti = newToken();
  const expiresAt = new Date(Date.now() + 60_000);
  await db.insert(schema.downloadTokens).values({
    jti,
    userId: input.userId,
    releaseId: check.releaseId,
    expiresAt,
    ipHash: hashClientHint(input.ip),
    userAgentHash: hashClientHint(input.userAgent),
  });

  return {
    ok: true,
    token: signDownloadToken(input.userId, jti),
    expiresInSec: 60,
    filename: check.filename,
    version: check.version,
  };
}

export async function consumeDownloadToken(input: {
  token: string;
  userId: string;
  isAdmin: boolean;
  purchasedAt: Date | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<
  | { ok: true; path: string; size: number; filename: string; version: string }
  | { ok: false; reason: string }
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
    const file = await resolveEntitledReleaseFile({
      userId: input.userId,
      isAdmin: input.isAdmin,
      purchasedAt: input.purchasedAt,
      requestedReleaseId: row.releaseId,
    });
    if (!file.ok) {
      await db.insert(schema.downloadAudit).values({
        userId: input.userId,
        outcome: file.reason,
        ipHash: hashClientHint(input.ip),
        userAgentHash: hashClientHint(input.userAgent),
      });
      return { ok: false, reason: file.reason };
    }

    await db.insert(schema.downloadAudit).values({
      userId: input.userId,
      releaseVersion: file.version,
      outcome: "ok",
      ipHash: hashClientHint(input.ip),
      userAgentHash: hashClientHint(input.userAgent),
    });
    return {
      ok: true,
      path: file.path,
      size: file.size,
      filename: file.filename,
      version: file.version,
    };
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


