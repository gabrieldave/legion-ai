import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { isAdminEmail, RELEASES_STORAGE_DIR } from "@/lib/access";
import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import {
  isSameOriginRequest,
  logSecurityEvent,
  sha256Hex,
} from "@/lib/security";
import { getUserById } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EX4_BYTES = 25 * 1024 * 1024;

export const POST = handle(async (req: Request) => {
  if (!isSameOriginRequest(req)) return fail("Origen no autorizado", 403);

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const admin = await getUserById(session.id);
  if (!admin || admin.role !== "admin" || !isAdminEmail(admin.email)) {
    await logSecurityEvent({
      eventType: "unauthorized_admin",
      route: "/api/admin/releases",
      req,
      userId: session.id,
    });
    return fail("Prohibido", 403);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Formulario invalido", 400);

  const version = String(form.get("version") || "").trim();
  const buildDateYmd = Number(String(form.get("buildDateYmd") || "").trim());
  const changelog = String(form.get("changelog") || "").trim().slice(0, 1000);
  const file = form.get("file");

  if (!/^\d+\.\d+(?:\.\d+)?$/.test(version)) {
    return fail("Version invalida (ejemplo: 3.16)", 400);
  }
  if (
    !Number.isInteger(buildDateYmd) ||
    buildDateYmd < 20260101 ||
    buildDateYmd > 20991231
  ) {
    return fail("Fecha de compilacion YYYYMMDD invalida (ejemplo: 20261116)", 400);
  }
  if (!(file instanceof File)) {
    return fail("Archivo .ex4 requerido", 400);
  }
  if (!file.name.toLowerCase().endsWith(".ex4")) {
    return fail("Solo se permiten binarios compilados .ex4", 400);
  }
  if (file.size < 1000 || file.size > MAX_EX4_BYTES) {
    return fail("Tamano de archivo .ex4 invalido", 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = sha256Hex(bytes);
  const safeVersion = version.replace(/\./g, "_");
  const filename = `Legion_SuperPanel_v${safeVersion}_MT4.ex4`;

  await mkdir(RELEASES_STORAGE_DIR, { recursive: true });
  const targetPath = path.join(RELEASES_STORAGE_DIR, filename);
  await writeFile(targetPath, bytes);

  const db = getDb();
  const [created] = await db
    .insert(schema.indicatorReleases)
    .values({
      version,
      buildDateYmd,
      filename,
      filePath: targetPath,
      sha256: hash,
      sizeBytes: bytes.length,
      changelog: changelog || null,
      isPublished: 1,
    })
    .returning();

  return ok({ release: created });
});


