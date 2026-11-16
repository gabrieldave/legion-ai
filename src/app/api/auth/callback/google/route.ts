import { NextRequest, NextResponse } from "next/server";
import { APP_URL, isAdminEmail } from "@/lib/access";
import {
  exchangeGoogleCode,
  fetchGoogleUser,
  googleOAuthConfigured,
  hashOAuthState,
} from "@/lib/auth/google";
import { setSessionCookie } from "@/lib/auth/session";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { findOrCreateUserByEmail } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "legion_oauth_state";

export async function GET(request: NextRequest) {
  if (!googleOAuthConfigured() || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.redirect(`${APP_URL}/login?error=Configuration`);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${APP_URL}/login?error=OAuthCallback`);
  }

  const rawCookie = request.cookies.get(STATE_COOKIE)?.value;
  let callbackUrl = "/cuenta";
  try {
    const parsed = rawCookie
      ? (JSON.parse(rawCookie) as { h?: string; c?: string })
      : null;
    if (!parsed?.h || parsed.h !== hashOAuthState(state)) {
      return NextResponse.redirect(`${APP_URL}/login?error=OAuthCallback`);
    }
    callbackUrl = safeInternalPath(parsed.c, "/cuenta");
  } catch {
    return NextResponse.redirect(`${APP_URL}/login?error=OAuthCallback`);
  }

  try {
    const { accessToken } = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUser(accessToken);
    if (profile.verified_email !== true) {
      return NextResponse.redirect(`${APP_URL}/login?error=AccessDenied`);
    }

    const user = await findOrCreateUserByEmail(profile.email, {
      name: profile.name,
    });

    await setSessionCookie({
      id: user.id,
      email: user.email,
      role:
        user.role === "admin" || isAdminEmail(user.email) ? "admin" : "user",
    });

    const response = NextResponse.redirect(
      new URL(callbackUrl, APP_URL).toString(),
    );
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error(
      "[auth/google/callback]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.redirect(`${APP_URL}/login?error=OAuthSignin`);
  }
}
