import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(
  message: string,
  status = 400,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers },
  );
}

export function handle(
  fn: (req: Request) => Promise<Response> | Response,
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (error) {
      const requestId = randomUUID().slice(0, 12);
      console.error(
        `[api:${requestId}]`,
        error instanceof Error ? error.message : "unknown_error",
      );
      return NextResponse.json(
        { ok: false, error: "Error interno del servidor", requestId },
        { status: 500 },
      );
    }
  };
}


