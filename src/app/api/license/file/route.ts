import { LICENSE_FILENAME } from "@/lib/access";
import { fail, handle } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getCustomerLicenseView } from "@/lib/licenses";
import { enforceIpRateLimit } from "@/lib/security";
import { getUserById, userHasPurchase } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const rl = await enforceIpRateLimit({
    req,
    bucket: "license_file",
    maxHits: 10,
    windowSec: 900,
    route: "/api/license/file",
  });
  if (!rl.ok) {
    return fail("Demasiadas descargas del archivo de licencia.", 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);
  if (!userHasPurchase(user)) return fail("Pago requerido", 402);

  const view = await getCustomerLicenseView(user);
  if (!view || view.status !== "active") {
    return fail("Licencia inactiva", 403);
  }
  if (!view.licenseToken) {
    return fail("Primero guarda al menos 1 cuenta MT4 en tu panel", 400);
  }

  const content = `${view.licenseToken}\n`;
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${LICENSE_FILENAME}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
});


