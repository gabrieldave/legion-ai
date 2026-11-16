import Link from "next/link";
import "../../globals.css";

export default function PagoCancelPage() {
  return (
    <main className="shell">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Pago cancelado</h1>
        <p className="muted">No se cobró nada. Puedes intentarlo de nuevo.</p>
        <p>
          <Link className="btn" href="/cuenta">
            Volver a la cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
