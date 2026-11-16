import { redirect } from "next/navigation";
import Link from "next/link";
import { PRODUCT_PRICE_USD, PRODUCT_TITLE } from "@/lib/access";
import { getSessionUser } from "@/lib/auth/session";
import { getUserById, userHasPurchase } from "@/lib/users";
import { CuentaClient } from "./cuenta-client";
import "../globals.css";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/cuenta");
  const user = await getUserById(session.id);
  if (!user) redirect("/login");

  const purchased = userHasPurchase(user);

  return (
    <main className="shell">
      <p>
        <Link href="/">← Legion SuperPanel</Link>
      </p>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Tu cuenta</h1>
        <p className="muted">
          {user.email}
          {user.role === "admin" ? " · admin" : ""}
        </p>
        <h2 style={{ fontSize: "1.2rem" }}>{PRODUCT_TITLE}</h2>
        {purchased ? (
          <p className="ok">Compra activa. Puedes descargar el .ex4.</p>
        ) : (
          <p className="muted">
            Pago único de <b>${PRODUCT_PRICE_USD} USD</b>. Stripe cobra en tu
            moneda local cuando aplica.
          </p>
        )}
        <CuentaClient purchased={purchased} isAdmin={user.role === "admin"} />
      </div>
    </main>
  );
}
