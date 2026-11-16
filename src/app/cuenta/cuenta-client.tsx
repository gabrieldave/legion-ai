"use client";

import { useState } from "react";

type SlotItem = {
  slot: 1 | 2 | 3;
  accountLogin: string;
  brokerLabel: string;
};

type ReleaseItem = {
  id: string | null;
  version: string;
  buildDateYmd: number;
  filename: string;
  changelog: string | null;
};

type LicenseView = {
  id: string;
  shortId: number;
  status: string;
  maxMt4Accounts: number;
  maxDownloadsPerDay: number;
  purchasedAt: string;
  updatesUntil: string;
  updatesUntilYmd: number;
  updatesActive: boolean;
  isPermanentCert: boolean;
  nextSwapAllowedAt: string | null;
  slots: SlotItem[];
  licenseToken: string | null;
  coveredReleases: ReleaseItem[];
  latestUncoveredRelease: { version: string; buildDateYmd: number } | null;
};

export function CuentaClient({
  purchased,
  isAdmin,
  priceUsd,
  renewalPriceUsd,
  initialLicense,
}: {
  purchased: boolean;
  isAdmin: boolean;
  priceUsd: number;
  renewalPriceUsd: number;
  initialLicense: LicenseView | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [lic, setLic] = useState<LicenseView | null>(initialLicense);
  const [slots, setSlots] = useState<SlotItem[]>(
    initialLicense?.slots || [
      { slot: 1, accountLogin: "", brokerLabel: "" },
      { slot: 2, accountLogin: "", brokerLabel: "" },
      { slot: 3, accountLogin: "", brokerLabel: "" },
    ],
  );

  async function startCheckout(plan: "lifetime" | "updates_1y") {
    setBusy(true);
    setMsg(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
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

  async function downloadIndicator(releaseId?: string | null, bundle = true) {
    setBusy(true);
    setMsg(null);
    setOkMsg(null);
    try {
      const mint = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: releaseId || null }),
      });
      const json = (await mint.json()) as {
        ok?: boolean;
        data?: { token?: string };
        error?: string;
      };
      if (!mint.ok || !json.ok || !json.data?.token) {
        setMsg(json.error || "No se pudo autorizar la descarga");
        return;
      }
      const suffix = bundle ? "&bundle=1" : "";
      window.location.href = `/api/download?token=${encodeURIComponent(json.data.token)}${suffix}`;
    } catch {
      setMsg("Error de red");
    } finally {
      setBusy(false);
    }
  }

  async function saveAccounts(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { license?: LicenseView };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data?.license) {
        setMsg(json.error || "No se pudieron guardar tus cuentas MT4");
        return;
      }
      setLic(json.data.license);
      setSlots(json.data.license.slots);
      setOkMsg(
        "Cuentas guardadas y licencia firmada lista para instalar en MetaTrader 4.",
      );
    } catch {
      setMsg("Error de red al guardar cuentas");
    } finally {
      setBusy(false);
    }
  }

  async function copyLicenseCode() {
    if (!lic?.licenseToken) return;
    await navigator.clipboard.writeText(lic.licenseToken);
    setOkMsg("Codigo_Licencia copiado al portapapeles.");
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  }

  const latestCovered = lic?.coveredReleases?.[0];

  return (
    <div style={{ display: "grid", gap: "1.25rem", marginTop: "1.25rem" }}>
      {!purchased ? (
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={() => startCheckout("lifetime")}
        >
          {busy ? "Redirigiendo..." : `Pagar $${priceUsd} USD con Stripe`}
        </button>
      ) : lic && lic.status !== "active" ? (
        <p className="bad">
          Estado de licencia: <b>{lic.status.toUpperCase()}</b>. Contacta a
          soporte si necesitas asistencia.
        </p>
      ) : (
        <>
          <section
            style={{
              border: "1px solid var(--rule)",
              borderRadius: 10,
              padding: "1.1rem",
              background: "#f8fafc",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "0.35rem" }}>
              1. Licencia de Descarga y Actualizaciones (1 Ano)
            </h3>
            <p className="muted" style={{ margin: "0 0 0.85rem" }}>
              Licencia #{lic?.shortId} · Actualizaciones cubiertas hasta:{" "}
              <b>
                {lic?.updatesUntil
                  ? new Date(lic.updatesUntil).toLocaleDateString("es-MX")
                  : "—"}
              </b>{" "}
              {lic?.updatesActive ? (
                <span className="ok">(Activo)</span>
              ) : (
                <span className="bad">
                  (Periodo vencido — tus versiones previas siguen activas de por vida)
                </span>
              )}
            </p>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() => downloadIndicator(latestCovered?.id, true)}
              >
                {busy
                  ? "Empaquetando..."
                  : `Descargar Paquete Todo-en-Uno .ZIP (v${latestCovered?.version || "3.15"} + Tu Licencia + Manual)`}
              </button>

              <button
                className="btn secondary"
                type="button"
                disabled={busy}
                onClick={() => downloadIndicator(latestCovered?.id, false)}
              >
                Solo archivo .ex4
              </button>

              {(!lic?.updatesActive || lic?.latestUncoveredRelease) && (
                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => startCheckout("updates_1y")}
                >
                  {lic?.latestUncoveredRelease
                    ? `Desbloquear v${lic.latestUncoveredRelease.version} (+1 ano updates · $${renewalPriceUsd} USD)`
                    : `Renovar 1 ano de actualizaciones ($${renewalPriceUsd} USD)`}
                </button>
              )}
            </div>
          </section>

          <section
            style={{
              border: "1px solid var(--rule)",
              borderRadius: 10,
              padding: "1.1rem",
              background: "#f8fafc",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "0.35rem" }}>
              2. Tus 3 Cuentas Broker de MetaTrader 4
            </h3>
            <p className="muted" style={{ margin: "0 0 0.9rem", fontSize: "0.92rem" }}>
              Registra hasta 3 numeros de cuenta MT4 (reales, fondeo o demo).
              Puedes registrar 1 cuenta hoy y dejar las otras vacias para
              despues. Los espacios vacios se activan al instante; reemplazar
              una cuenta ya ocupada permite 1 cambio cada 30 dias.
            </p>

            <form onSubmit={saveAccounts} style={{ display: "grid", gap: "0.7rem" }}>
              {slots.map((s, idx) => (
                <div
                  key={s.slot}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.6rem",
                  }}
                >
                  <label style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    Cuenta MT4 #{s.slot}
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej. 50819234"
                      value={s.accountLogin}
                      onChange={(e) => {
                        const next = [...slots];
                        next[idx] = {
                          ...s,
                          accountLogin: e.target.value.replace(/[^\d]/g, ""),
                        };
                        setSlots(next);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: "0.55rem 0.65rem",
                        borderRadius: 6,
                        border: "1px solid var(--rule)",
                        font: "inherit",
                      }}
                    />
                  </label>

                  <label style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    Nota / Broker (opcional)
                    <input
                      type="text"
                      maxLength={40}
                      placeholder="Ej. FTMO, IC Markets, Demo"
                      value={s.brokerLabel}
                      onChange={(e) => {
                        const next = [...slots];
                        next[idx] = { ...s, brokerLabel: e.target.value };
                        setSlots(next);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: "0.55rem 0.65rem",
                        borderRadius: 6,
                        border: "1px solid var(--rule)",
                        font: "inherit",
                      }}
                    />
                  </label>
                </div>
              ))}

              <div style={{ marginTop: "0.3rem" }}>
                <button className="btn" type="submit" disabled={busy}>
                  {busy
                    ? "Firmando licencia..."
                    : "Guardar Cuentas y Generar Licencia"}
                </button>
              </div>
            </form>

            {lic?.licenseToken ? (
              <div
                style={{
                  marginTop: "1.1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--rule)",
                  display: "grid",
                  gap: "0.65rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                  <a className="btn" href="/api/license/file">
                    Descargar Legion_SuperPanel.lic
                  </a>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={copyLicenseCode}
                  >
                    Copiar Codigo_Licencia
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={lic.licenseToken}
                  onFocus={(e) => e.currentTarget.select()}
                  style={{
                    width: "100%",
                    padding: "0.55rem",
                    fontFamily: "monospace",
                    fontSize: "0.82rem",
                    borderRadius: 6,
                    border: "1px solid var(--rule)",
                    background: "#fff",
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gap: "0.55rem",
                    background: "#fff",
                    border: "1px solid var(--rule)",
                    borderRadius: 8,
                    padding: "0.8rem",
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <b>En Windows:</b> Abre MT4 → <i>Archivo → Abrir carpeta de datos</i> y arrastra adentro la carpeta <code>MQL4</code> del paquete ZIP (también incluye <code>MANUAL_WINDOWS.html</code>).
                  </div>
                  <div>
                    <b>En Mac (Wine):</b> Abre <b>Finder</b>, usa <code>Cmd ⌘ + Shift ⇧ + G</code> y copia <b>una ruta por archivo</b> (no sueltes nada en la carpeta padre <code>MQL4</code>; el ZIP incluye <code>MANUAL_MAC.html</code>):
                    <div style={{ marginTop: 8, display: "grid", gap: "0.65rem" }}>
                      <div style={{ display: "grid", gap: "0.35rem" }}>
                        <code style={{ fontSize: "0.78rem", wordBreak: "break-all" }}>
                          ~/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4/Indicators
                        </code>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem", justifySelf: "start" }}
                          onClick={async () => {
                            await navigator.clipboard.writeText(
                              "~/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4/Indicators",
                            );
                            setOkMsg(
                              "Pega con Cmd+Shift+G y suelta ahi mismo el archivo .ex4",
                            );
                          }}
                        >
                          Copiar ruta Mac para Indicador (.ex4)
                        </button>
                      </div>
                      <div style={{ display: "grid", gap: "0.35rem" }}>
                        <code style={{ fontSize: "0.78rem", wordBreak: "break-all" }}>
                          ~/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4/Files
                        </code>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem", justifySelf: "start" }}
                          onClick={async () => {
                            await navigator.clipboard.writeText(
                              "~/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4/Files",
                            );
                            setOkMsg(
                              "Pega con Cmd+Shift+G y suelta ahi mismo tu Legion_SuperPanel.lic",
                            );
                          }}
                        >
                          Copiar ruta Mac para Licencia (.lic)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}

      {okMsg ? <p className="ok">{okMsg}</p> : null}
      {msg ? <p className="bad">{msg}</p> : null}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {isAdmin ? (
          <a className="btn secondary" href="/admin">
            Dashboard admin
          </a>
        ) : null}
        <button
          className="btn secondary"
          type="button"
          disabled={busy}
          onClick={logout}
        >
          Cerrar sesion
        </button>
        <a
          className="btn secondary"
          href="https://wa.me/525645674407"
          target="_blank"
          rel="noopener noreferrer"
        >
          Soporte WhatsApp
        </a>
      </div>
    </div>
  );
}


