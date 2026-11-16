import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { PagoSuccessClient } from "./success-client";
import "../../globals.css";

export const dynamic = "force-dynamic";

export default async function PagoSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/cuenta");
  const params = await searchParams;
  const sessionId = params.session_id?.trim() || "";

  return (
    <main className="shell">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Pago recibido</h1>
        <p className="muted">
          Estamos verificando el pago con Stripe. En segundos podrás descargar.
        </p>
        <PagoSuccessClient sessionId={sessionId} />
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/cuenta">Ir a tu cuenta</Link>
        </p>
      </div>
    </main>
  );
}
