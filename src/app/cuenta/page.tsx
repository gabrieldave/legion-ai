import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PRODUCT_PRICE_USD,
  PRODUCT_TITLE,
  UPDATES_RENEWAL_PRICE_USD,
} from "@/lib/access";
import { getSessionUser } from "@/lib/auth/session";
import { getCustomerLicenseView } from "@/lib/licenses";
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
  const initialLicense = purchased ? await getCustomerLicenseView(user) : null;

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
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.55rem" }}>{PRODUCT_TITLE}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.32rem 0.7rem", borderRadius: 8, background: "#0f172a", color: "#f8fafc", fontSize: "0.82rem", fontWeight: 600 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="#38bdf8" d="M2 3.5 10.8 2.3v9H2v-7.8zm9.8-1.35L22 0.8v10.5H11.8V2.15zM2 12.3h8.8v9L2 20.1v-7.8zm9.8 0H22v10.5l-10.2-1.35V12.3z"/></svg>
            Windows PC &amp; VPS
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.32rem 0.7rem", borderRadius: 8, background: "#0f172a", color: "#f8fafc", fontSize: "0.82rem", fontWeight: 600 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f8fafc" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.79-.96 2.84 1.04.08 2.08-.52 2.72-1.3z"/></svg>
            Apple Mac (macOS)
          </span>
        </div>
        {!purchased ? (
          <p className="muted">
            Pago unico de <b>${PRODUCT_PRICE_USD} USD</b>. Incluye descarga
            segura, licencia hasta para <b>3 cuentas de MetaTrader 4</b> y{" "}
            <b>1 ano de actualizaciones</b>.
          </p>
        ) : null}
        <CuentaClient
          purchased={purchased}
          isAdmin={user.role === "admin"}
          priceUsd={PRODUCT_PRICE_USD}
          renewalPriceUsd={UPDATES_RENEWAL_PRICE_USD}
          initialLicense={initialLicense}
        />
      </div>
    </main>
  );
}


