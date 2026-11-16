import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getUserById, userHasPurchase } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user) return fail("No autenticado", 401);
  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    purchased: userHasPurchase(user),
    purchasedAt: user.purchasedAt,
  });
});
