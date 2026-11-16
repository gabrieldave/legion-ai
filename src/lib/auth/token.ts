import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type SessionPayload = {
  id: string;
  email: string;
  role: "user" | "admin";
  exp: number;
};

export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const DOWNLOAD_TOKEN_TTL_MS = 60 * 1000;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET ausente o débil: fail-closed");
  }
  return secret;
}

function hmac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signSession(
  payload: Omit<SessionPayload, "exp"> & { exp?: number },
): string {
  const secret = getSecret();
  const full: SessionPayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

export function verifySession(token?: string | null): SessionPayload | null {
  if (!token) return null;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;

  const expected = hmac(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as SessionPayload;
    if (!data || typeof data.exp !== "number" || Date.now() > data.exp) {
      return null;
    }
    if (
      !data.id ||
      !data.email ||
      (data.role !== "user" && data.role !== "admin")
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function timingSafeMatch(
  got: string | null | undefined,
  want: string | undefined,
): boolean {
  if (!want) return false;
  const a = Buffer.from(got ?? "");
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export type DownloadTokenPayload = {
  uid: string;
  jti: string;
  exp: number;
};

export function signDownloadToken(userId: string, jti: string): string {
  const secret = getSecret();
  const full: DownloadTokenPayload = {
    uid: userId,
    jti,
    exp: Date.now() + DOWNLOAD_TOKEN_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

export function verifyDownloadToken(
  token?: string | null,
): DownloadTokenPayload | null {
  if (!token) return null;
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as DownloadTokenPayload;
    if (
      !data?.uid ||
      !data?.jti ||
      typeof data.exp !== "number" ||
      Date.now() > data.exp
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
