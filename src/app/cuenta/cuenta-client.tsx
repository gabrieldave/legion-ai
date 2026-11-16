"use client";

import { useState } from "react";

export function CuentaClient({
  purchased,
  isAdmin,
}: {
  purchased: boolean;
  isAdmin: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { url?: string; alreadyUnlocked?: boolean };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setMsg(json.error || "No se pudo iniciar el pago");
        return;
      }
      if (json.data?.alreadyUnlocked) {
        window.location.reload();
        return;
      }
      if (json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
      setMsg("Respuesta de pago incompleta");
    } catch {
      setMsg("Error de red");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setMsg(null);
    try {
      const mint = await fetch("/api/download", { method: "POST" });
      const json = (await mint.json()) as {
        ok?: boolean;
        data?: { token?: string };
        error?: string;
      };
      if (!mint.ok || !json.ok || !json.data?.token) {
        setMsg(json.error || "No se pudo autorizar la descarga");
        return;
      }
      window.location.href = `/api/download?token=${encodeURIComponent(json.data.token)}`;
    } catch {
      setMsg("Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.85rem", marginTop: "1.25rem" }}>
      {!purchased ? (
        <button className="btn" type="button" disabled={busy} onClick={buy}>
          {busy ? "Redirigiendo…" : `Pagar $${350} USD con Stripe`}
        </button>
      ) : (
        <button className="btn" type="button" disabled={busy} onClick={download}>
          {busy ? "Preparando…" : "Descargar Legion_SuperPanel_v3_15_MT4.ex4"}
        </button>
      )}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {isAdmin ? (
          <a className="btn secondary" href="/admin">
            Dashboard admin
          </a>
        ) : null}
        <a className="btn secondary" href="/api/auth/logout">
          Cerrar sesión
        </a>
        <a
          className="btn secondary"
          href="https://wa.me/525645674407"
          target="_blank"
          rel="noopener noreferrer"
        >
          Soporte WhatsApp
        </a>
      </div>
      {msg ? <p className="bad">{msg}</p> : null}
      <p className="muted" style={{ fontSize: "0.9rem" }}>
        La descarga usa un enlace de un solo uso (60 s), exige sesión + compra
        verificada y deja auditoría. El archivo no está en una URL pública.
      </p>
    </div>
  );
}
