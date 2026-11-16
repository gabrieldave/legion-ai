import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleAuthUrl,
  googleOAuthConfigured,
  hashOAuthState,
  newOAuthState,
} from "@/lib/auth/google";
import { safeInternalPath } from "@/lib/safe-internal-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "legion_oauth_state";

export async function GET(request: NextRequest) {
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=Configuration", request.url),
    );
  }
  if (
    !process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET.length < 16
  ) {
    return NextResponse.redirect(
      new URL("/login?error=Configuration", request.url),
    );
  }

  const callbackUrl = safeInternalPath(
    request.nextUrl.searchParams.get("callbackUrl"),
    "/cuenta",
  );
  const state = newOAuthState();
  const url = buildGoogleAuthUrl(state);
  const response = NextResponse.redirect(url);
  response.cookies.set(
    STATE_COOKIE,
    JSON.stringify({ h: hashOAuthState(state), c: callbackUrl }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );
  return response;
}
