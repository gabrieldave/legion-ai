import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { adminDashboardData, getUserById } from "@/lib/users";
import "../globals.css";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-MX");
}

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/admin");
  const user = await getUserById(session.id);
  if (!user || user.role !== "admin") redirect("/cuenta");

  const data = await adminDashboardData();

  return (
    <main className="shell">
      <p>
        <Link href="/cuenta">← Cuenta</Link>
      </p>
      <h1>Dashboard Legion</h1>
      <p className="muted">Registrados, compras y descargas (solo admin).</p>

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
          <span className="muted">Órdenes pagadas</span>
          <b>{data.stats.paidOrders}</b>
        </div>
        <div className="stat">
          <span className="muted">Ingresos</span>
          <b>{money(data.stats.revenueCents)}</b>
        </div>
      </div>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Usuarios</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol</th>
              <th>Compra</th>
              <th>Alta</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.purchasedAt ? fmt(u.purchasedAt) : "—"}</td>
                <td>{fmt(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Órdenes</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Estado</th>
              <th>Monto</th>
              <th>Creada</th>
              <th>Pagada</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id}>
                <td>{o.email || o.userId}</td>
                <td>{o.status}</td>
                <td>{money(o.amountCents)}</td>
                <td>{fmt(o.createdAt)}</td>
                <td>{fmt(o.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Descargas</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Resultado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.downloads.map((d) => (
              <tr key={d.id}>
                <td>{d.email || "—"}</td>
                <td>{d.outcome}</td>
                <td>{fmt(d.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
