import { createHash, randomBytes } from "crypto";
import { APP_URL } from "@/lib/access";

export function googleOAuthConfigured(): boolean {
  return Boolean(
    (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID)?.trim() &&
      (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)?.trim(),
  );
}

function googleClientId(): string {
  return (
    process.env.AUTH_GOOGLE_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

function googleClientSecret(): string {
  return (
    process.env.AUTH_GOOGLE_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    ""
  );
}

export function googleRedirectUri(): string {
  return (
    process.env.AUTH_GOOGLE_REDIRECT_URI?.trim() ||
    `${APP_URL}/api/auth/callback/google`
  );
}

export function buildGoogleAuthUrl(state: string): string {
  const clientId = googleClientId();
  if (!clientId) throw new Error("AUTH_GOOGLE_ID ausente");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function newOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

type GoogleTokenResponse = {
  access_token: string;
};

type GoogleUserInfo = {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeGoogleCode(
  code: string,
): Promise<{ accessToken: string }> {
  const clientId = googleClientId();
  const clientSecret = googleClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth no configurado");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google token ${response.status}: ${text.slice(0, 160)}`);
  }

  const json = (await response.json()) as GoogleTokenResponse;
  if (!json.access_token) throw new Error("Google no devolvió access_token");
  return { accessToken: json.access_token };
}

export async function fetchGoogleUser(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google userinfo ${response.status}: ${text.slice(0, 120)}`);
  }
  const user = (await response.json()) as GoogleUserInfo;
  if (!user.email) throw new Error("Google no devolvió email");
  return user;
}
