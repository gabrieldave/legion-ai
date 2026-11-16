"use client";

import { useState } from "react";

type AdminLicenseRow = {
  id: string;
  shortId: number;
  email: string | null;
  status: string;
  hasToken: boolean;
  updatesUntil: string;
  updatesUntilYmd: number;
  lastSlotSwapAt: string | null;
  accounts: Array<{
    slot: number;
    accountLogin: string;
    brokerLabel: string | null;
  }>;
};

type ReleaseRow = {
  id: string;
  version: string;
  buildDateYmd: number;
  filename: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
};

type OrderRow = {
  id: string;
  email: string | null;
  status: string;
  serviceId: string;
  amountCents: number;
  createdAt: string;
  paidAt: string | null;
};

type DownloadRow = {
  id: string;
  email: string | null;
  releaseVersion: string | null;
  outcome: string;
  createdAt: string;
};

type SecurityRow = {
  id: string;
  eventType: string;
  route: string;
  ipHash: string | null;
  detail: string | null;
  createdAt: string;
};

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX");
}

export function AdminClient({
  licenses,
  releases,
  orders,
  downloads,
  securityEvents,
}: {
  licenses: AdminLicenseRow[];
  releases: ReleaseRow[];
  orders: OrderRow[];
  downloads: DownloadRow[];
  securityEvents: SecurityRow[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantName, setGrantName] = useState("");
  const [grantEmailType, setGrantEmailType] = useState<
    "migration" | "welcome" | "none"
  >("migration");

  async function runLicenseAction(id: string, action: string) {
    setBusyId(id);
    setFeedback(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/licenses/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { token?: string; emailSent?: boolean };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setErr(json.error || "Accion rechazada");
        return;
      }
      if (action === "copy_token" && json.data?.token) {
        await navigator.clipboard.writeText(json.data.token);
        setFeedback("Clave LGN1 descifrada y copiada al portapapeles.");
        return;
      }
      if (
        action === "send_migration_email" ||
        action === "send_welcome_email"
      ) {
        setFeedback("Correo enviado por Resend correctamente.");
        return;
      }
      window.location.reload();
    } catch {
      setErr("Error de red");
    } finally {
      setBusyId(null);
    }
  }

  async function grantClient(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("grant");
    setFeedback(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: grantEmail,
          name: grantName || undefined,
          emailType: grantEmailType,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { emailSent?: boolean; emailError?: string; shortId?: number };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setErr(json.error || "No se pudo activar el cliente");
        return;
      }
      if (grantEmailType === "none") {
        setFeedback(
          `Cliente activado (#${json.data?.shortId ?? "—"}) sin correo.`,
        );
      } else if (json.data?.emailSent) {
        setFeedback(
          `Cliente activado (#${json.data?.shortId ?? "—"}) y correo enviado por Resend.`,
        );
      } else {
        setFeedback(
          `Cliente activado (#${json.data?.shortId ?? "—"}), pero el correo no salio: ${json.data?.emailError || "error desconocido"}`,
        );
      }
      setGrantEmail("");
      setGrantName("");
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setErr("Error de red al dar de alta");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadRelease(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusyId("upload");
    setFeedback(null);
    setErr(null);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/releases", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setErr(json.error || "Error al subir el .ex4");
        return;
      }
      window.location.reload();
    } catch {
      setErr("Error de red al subir version");
    } finally {
      setBusyId(null);
    }
  }

  function accountsText(l: AdminLicenseRow) {
    if (l.accounts.length === 0) return "Sin registrar";
    return l.accounts
      .map(
        (a) =>
          `[${a.slot}] ${a.accountLogin}${a.brokerLabel ? ` (${a.brokerLabel})` : ""}`,
      )
      .join(" · ");
  }

  function LicenseActions({ l }: { l: AdminLicenseRow }) {
    const busy = busyId === l.id;
    return (
      <div className="admin-actions">
        {l.hasToken ? (
          <button
            type="button"
            className="btn secondary compact"
            disabled={busy}
            onClick={() => runLicenseAction(l.id, "copy_token")}
          >
            Copiar
          </button>
        ) : null}
        {l.status === "active" ? (
          <button
            type="button"
            className="btn secondary compact"
            disabled={busy}
            onClick={() => runLicenseAction(l.id, "suspend")}
          >
            Suspender
          </button>
        ) : (
          <button
            type="button"
            className="btn secondary compact"
            disabled={busy}
            onClick={() => runLicenseAction(l.id, "reactivate")}
          >
            Reactivar
          </button>
        )}
        <button
          type="button"
          className="btn secondary compact"
          disabled={busy}
          onClick={() => runLicenseAction(l.id, "reset_cooldown")}
        >
          Liberar 30d
        </button>
        <button
          type="button"
          className="btn secondary compact"
          disabled={busy}
          onClick={() => runLicenseAction(l.id, "clear_slots")}
        >
          Vaciar Cuentas
        </button>
        <button
          type="button"
          className="btn secondary compact"
          disabled={busy}
          onClick={() => runLicenseAction(l.id, "extend_1y")}
        >
          +1 Ano
        </button>
        <button
          type="button"
          className="btn secondary compact"
          disabled={busy || !l.email}
          onClick={() => runLicenseAction(l.id, "send_migration_email")}
        >
          Enviar Correo Update
        </button>
        <button
          type="button"
          className="btn secondary compact"
          disabled={busy}
          onClick={() => runLicenseAction(l.id, "revoke")}
        >
          Revocar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {feedback ? <p className="ok">{feedback}</p> : null}
      {err ? <p className="bad">{err}</p> : null}

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>
          Publicar Nueva Version .ex4 (Sistema de Actualizaciones 1 Ano)
        </h2>
        <form onSubmit={uploadRelease} className="admin-form-grid">
          <label>
            Version (ej. 3.16)
            <input name="version" required placeholder="3.16" />
          </label>
          <label>
            LLG_BUILD_DATE_YMD
            <input name="buildDateYmd" required placeholder="20261116" />
          </label>
          <label>
            Notas (opcional)
            <input name="changelog" placeholder="Mejoras y ajustes..." />
          </label>
          <label>
            Archivo compilado (.ex4)
            <input type="file" name="file" accept=".ex4" required />
          </label>
          <label
            style={{
              display: "flex",
              gap: "0.45rem",
              alignItems: "center",
              gridColumn: "1 / -1",
            }}
          >
            <input
              type="checkbox"
              name="notifyActiveBuyers"
              value="1"
              defaultChecked
            />
            Avisar por correo a todos los clientes activos con plan vigente
          </label>
          <button className="btn" type="submit" disabled={busyId === "upload"}>
            {busyId === "upload" ? "Subiendo..." : "Publicar .ex4"}
          </button>
        </form>

        {releases.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Fecha Build</th>
                  <th>Archivo</th>
                  <th>SHA-256</th>
                  <th>Alta</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <td>v{r.version}</td>
                    <td>{r.buildDateYmd}</td>
                    <td>{r.filename}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {r.sha256.slice(0, 16)}…
                    </td>
                    <td>{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>
          Dar de Alta Cliente / Enviar Acceso por Correo (1 Clic)
        </h2>
        <form onSubmit={grantClient} className="admin-grant-form">
          <label>
            Correo Google del cliente
            <input
              type="email"
              required
              placeholder="cliente@gmail.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
            />
          </label>
          <label>
            Nombre del cliente (opcional)
            <input
              type="text"
              placeholder="Nombre"
              value={grantName}
              onChange={(e) => setGrantName(e.target.value)}
            />
          </label>
          <label>
            Correo a enviar
            <select
              value={grantEmailType}
              onChange={(e) =>
                setGrantEmailType(
                  e.target.value as "migration" | "welcome" | "none",
                )
              }
            >
              <option value="migration">
                Enviar correo: Nueva Actualizacion + Licencias Automaticas
                (Recomendado para clientes actuales)
              </option>
              <option value="welcome">
                Enviar correo: Bienvenida por Compra Nueva
              </option>
              <option value="none">
                No enviar correo (solo activar acceso en /cuenta)
              </option>
            </select>
          </label>
          <button
            className="btn"
            type="submit"
            disabled={busyId === "grant"}
            style={{ justifySelf: "start" }}
          >
            {busyId === "grant"
              ? "Activando..."
              : "Activar Cliente y Enviar Correo"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>
          Licencias y 3 Cuentas MT4 (1 Clic)
        </h2>

        <div className="table-wrap prefer-cards desktop-only">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>3 Cuentas MT4</th>
                <th>Updates Hasta</th>
                <th>Acciones 1 Clic</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.id}>
                  <td>#{l.shortId}</td>
                  <td>{l.email || "—"}</td>
                  <td>{l.status}</td>
                  <td>{accountsText(l)}</td>
                  <td>
                    {new Date(l.updatesUntil).toLocaleDateString("es-MX")}
                  </td>
                  <td>
                    <LicenseActions l={l} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-cards">
          {licenses.length === 0 ? (
            <p className="muted">Sin licencias todavia.</p>
          ) : (
            licenses.map((l) => (
              <article key={l.id} className="mobile-card">
                <div className="row">
                  <span className="label">Cliente</span>
                  <span className="value">
                    #{l.shortId} · {l.email || "—"}
                  </span>
                </div>
                <div className="row">
                  <span className="label">Estado / Updates</span>
                  <span className="value">
                    {l.status} · hasta{" "}
                    {new Date(l.updatesUntil).toLocaleDateString("es-MX")}
                  </span>
                </div>
                <div className="row">
                  <span className="label">Cuentas MT4</span>
                  <span className="value">{accountsText(l)}</span>
                </div>
                <LicenseActions l={l} />
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>Ordenes</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Servicio</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Pagada</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.email || "—"}</td>
                  <td>{o.serviceId}</td>
                  <td>{o.status}</td>
                  <td>${(o.amountCents / 100).toFixed(0)}</td>
                  <td>{fmt(o.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>
          Auditoria de Descargas .ex4
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Version</th>
                <th>Resultado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {downloads.map((d) => (
                <tr key={d.id}>
                  <td>{d.email || "—"}</td>
                  <td>{d.releaseVersion || "3.15"}</td>
                  <td>{d.outcome}</td>
                  <td>{fmt(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.15rem" }}>
          Bitacora Anti-Hackers (security_events)
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Ruta</th>
                <th>IP Hash</th>
                <th>Detalle</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {securityEvents.map((s) => (
                <tr key={s.id}>
                  <td>{s.eventType}</td>
                  <td>{s.route}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {s.ipHash ? `${s.ipHash.slice(0, 12)}…` : "—"}
                  </td>
                  <td>{s.detail || "—"}</td>
                  <td>{fmt(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


