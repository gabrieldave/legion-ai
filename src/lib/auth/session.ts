import { cookies } from "next/headers";
import {
  signSession,
  verifySession,
  SESSION_TTL_MS,
  type SessionPayload,
} from "@/lib/auth/token";

export const SESSION_COOKIE = "legion_session";

export async function setSessionCookie(
  user: Omit<SessionPayload, "exp">,
): Promise<void> {
  const token = signSession(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
