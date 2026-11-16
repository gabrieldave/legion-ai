import Link from "next/link";
import "../globals.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 480, margin: "4rem auto" }}>
        <h1 style={{ marginTop: 0 }}>Accede a Legion</h1>
        <p className="muted">
          Solo Google OAuth. Tras el login puedes comprar ($350 USD) y
          descargar el indicador con enlace de un solo uso.
        </p>
        {error ? (
          <p className="bad">
            No se pudo iniciar sesión ({error}). Intenta de nuevo.
          </p>
        ) : null}
        <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a className="btn" href="/api/auth/google?callbackUrl=/cuenta">
            Continuar con Google
          </a>
          <Link className="btn secondary" href="/">
            Volver
          </Link>
        </p>
        <p className="muted" style={{ marginBottom: 0, fontSize: "0.9rem" }}>
          Soporte:{" "}
          <a href="mailto:legion@iareal.net">legion@iareal.net</a>
          {" · "}
          <a
            href="https://wa.me/525645674407?text=Hola%2C%20necesito%20soporte%20de%20Legion%20AI"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </p>
      </div>
    </main>
  );
}
