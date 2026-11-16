import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { isSameOriginRequest, logSecurityEvent } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    await logSecurityEvent({
      eventType: "csrf_blocked",
      route: "/api/auth/logout",
      req,
    });
    return NextResponse.json(
      { ok: false, error: "Origen no autorizado" },
      { status: 403 },
    );
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}


