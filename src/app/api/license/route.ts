import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import {
  getCustomerLicenseView,
  saveCustomerMt4Slots,
  type SlotInput,
} from "@/lib/licenses";
import {
  enforceIpRateLimit,
  isSameOriginRequest,
  logSecurityEvent,
  readBoundedJson,
} from "@/lib/security";
import { getUserById, userHasPurchase } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const rl = await enforceIpRateLimit({
    req,
    bucket: "license_get",
    maxHits: 30,
    windowSec: 900,
    route: "/api/license",
  });
  if (!rl.ok) {
    return fail("Demasiadas solicitudes.", 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);

  const view = await getCustomerLicenseView(user);
  return ok({ license: view });
});

export const POST = handle(async (req: Request) => {
  if (!isSameOriginRequest(req)) {
    await logSecurityEvent({
      eventType: "csrf_blocked",
      route: "/api/license",
      req,
    });
    return fail("Origen no autorizado", 403);
  }

  const rl = await enforceIpRateLimit({
    req,
    bucket: "license_save",
    maxHits: 10,
    windowSec: 900,
    route: "/api/license",
  });
  if (!rl.ok) {
    return fail("Demasiados intentos. Espera unos minutos.", 429, {
      "Retry-After": String(rl.retryAfterSec),
    });
  }

  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);
  if (!userHasPurchase(user)) return fail("Pago requerido", 402);

  // Asegurar fila de licencia antes de guardar cuentas
  await getCustomerLicenseView(user);

  const parsed = await readBoundedJson<{ slots?: SlotInput[] }>(req, 16_384);
  if (!parsed.ok) return fail(parsed.error, parsed.status);

  const result = await saveCustomerMt4Slots({
    userId: user.id,
    slots: parsed.data.slots || [],
  });
  if (!result.ok) {
    return fail(result.error, result.status);
  }

  const updatedView = await getCustomerLicenseView(user);
  return ok({ license: updatedView });
});


