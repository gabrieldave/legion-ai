import { fail, handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { adminDashboardData, getUserById } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const session = await getSessionUser();
  if (!session) return fail("No autenticado", 401);
  const user = await getUserById(session.id);
  if (!user || user.role !== "admin") return fail("Prohibido", 403);
  const data = await adminDashboardData();
  return ok(data);
});
