import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/access";
import { getSessionUser } from "@/lib/auth/session";
import { adminDashboardData, getUserById } from "@/lib/users";
import { AdminClient } from "./admin-client";
import "../globals.css";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/admin");
  const user = await getUserById(session.id);
  if (!user || user.role !== "admin" || !isAdminEmail(user.email)) {
    redirect("/cuenta");
  }

  const data = await adminDashboardData();

  return (
    <main className="shell">
      <p>
        <Link href="/cuenta">← Cuenta</Link>
      </p>
      <h1>Centro de Control Legion AI</h1>
      <p className="muted">
        Gestion en 1 clic de licencias AES-256-GCM, cuentas MT4, versiones .ex4
        y eventos de seguridad.
      </p>

      <div className="stats">
        <div className="stat">
          <span className="muted">Registrados</span>
          <b>{data.stats.users}</b>
        </div>
        <div className="stat">
          <span className="muted">Compradores</span>
          <b>{data.stats.buyers}</b>
        </div>
        <div className="stat">
          <span className="muted">Ordenes pagadas</span>
          <b>{data.stats.paidOrders}</b>
        </div>
        <div className="stat">
          <span className="muted">Ingresos</span>
          <b>{money(data.stats.revenueCents)}</b>
        </div>
      </div>

      <AdminClient
        licenses={JSON.parse(JSON.stringify(data.licenses))}
        releases={JSON.parse(JSON.stringify(data.releases))}
        orders={JSON.parse(JSON.stringify(data.orders))}
        downloads={JSON.parse(JSON.stringify(data.downloads))}
        securityEvents={JSON.parse(JSON.stringify(data.securityEvents))}
      />
    </main>
  );
}


