import {
  APP_URL,
  changelogToBullets,
  resolveReleaseChangelog,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_WHATSAPP_HREF,
} from "@/lib/access";

const WHATSAPP_SUPPORT = SUPPORT_WHATSAPP_HREF;
const CUENTA_URL = `${APP_URL.replace(/\/$/, "")}/cuenta`;

export type MailResult = { sent: boolean; error?: string; id?: string };

function resendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const from =
    (process.env.RESEND_FROM || "").trim() ||
    "Legion AI <legion@iareal.net>";
  return { apiKey, from };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseLayout(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
}): string {
  const cta = opts.ctaLabel || "Abrir mi panel /cuenta";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0B0F17;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B0F17;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#111827;border:1px solid #1F2937;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:22px 24px;border-bottom:1px solid #1F2937;">
              <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#24D3A9;font-weight:700;">Legion AI</div>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#F9FAFB;">${escapeHtml(opts.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px;font-size:15px;line-height:1.65;color:#D1D5DB;">
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <a href="${CUENTA_URL}" style="display:inline-block;background:#24D3A9;color:#042F2E;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
                ${escapeHtml(cta)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;font-size:13px;color:#9CA3AF;">
              Soporte:
              <a href="${SUPPORT_EMAIL_HREF}" style="color:#24D3A9;text-decoration:none;">${SUPPORT_EMAIL}</a>
              · WhatsApp
              <a href="${WHATSAPP_SUPPORT}" style="color:#24D3A9;text-decoration:none;">+52 56 4567 4407</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function threeSteps(toEmail: string): string {
  const email = escapeHtml(toEmail);
  return `
<ol style="margin:0;padding-left:1.2rem;">
  <li style="margin-bottom:10px;">Entra a <a href="${CUENTA_URL}" style="color:#24D3A9;">${CUENTA_URL}</a> e inicia sesion con Google usando exactamente este correo (<b>${email}</b>).</li>
  <li style="margin-bottom:10px;">Descarga tu paquete <b>.ZIP</b> todo en uno (incluye el indicador <code>.ex4</code> y el manual visual para Windows y Mac).</li>
  <li style="margin-bottom:10px;">Escribe tu numero de cuenta MT4, pulsa <b>Guardar Cuentas y Generar Licencia</b>, haz clic en <b>Copiar Codigo_Licencia</b> y pegalo una sola vez en <b>Parametros de entrada (Inputs) → Codigo_Licencia</b> en tu MT4 (eso activa todos tus graficos automaticamente).</li>
</ol>`;
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<MailResult> {
  const { apiKey, from } = resendConfig();
  if (!apiKey) {
    return { sent: false, error: "RESEND_API_KEY ausente" };
  }
  const to = input.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { sent: false, error: "Correo destino invalido" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        html: input.html,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!res.ok) {
      return {
        sent: false,
        error: json.message || json.name || `Resend HTTP ${res.status}`,
      };
    }
    return { sent: true, id: json.id };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "fallo de red Resend",
    };
  }
}

function changelogBlockHtml(version: string, changelog?: string | null): string {
  const bullets = changelogToBullets(
    resolveReleaseChangelog(version, changelog),
  );
  if (bullets.length === 0) return "";
  const items = bullets
    .map(
      (b) =>
        `<li style="margin:0 0 8px;color:#D1D5DB;">${escapeHtml(b)}</li>`,
    )
    .join("");
  return `
<div style="margin:18px 0;padding:16px 18px;border-radius:12px;border:1px solid rgba(36,211,169,.35);background:rgba(36,211,169,.08);">
  <div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#24D3A9;font-weight:700;margin-bottom:10px;">Novedades incluidas en esta version</div>
  <ul style="margin:0;padding-left:1.15rem;">${items}</ul>
</div>`;
}

export async function sendMigrationUpdateEmail(input: {
  to: string;
  name?: string | null;
  version: string;
  changelog?: string | null;
}): Promise<MailResult> {
  const version = input.version.replace(/^v/i, "") || "3.15";
  const name = (input.name || "").trim() || "trader";
  const subject = `Nueva actualizacion Legion SuperPanel ${version} + Licencias Automaticas`;
  const html = baseLayout({
    preheader: `Ya esta lista la v${version} con licencias automaticas para hasta 3 cuentas MT4.`,
    title: `Nueva actualizacion v${version}`,
    ctaLabel: "Ir a Mi Cuenta y Descargar",
    bodyHtml: `
<p style="margin-top:0;">Hola ${escapeHtml(name)},</p>
<p>Ya esta disponible la nueva version de <b>Legion SuperPanel v${escapeHtml(version)}</b> (compatible con Windows y Mac). Ahora las licencias son <b>100% automaticas</b> desde tu panel personal: hasta <b>3 cuentas MT4</b> con graficos ilimitados.</p>
${changelogBlockHtml(version, input.changelog)}
<p style="margin-bottom:8px;"><b>Activalo en 3 pasos:</b></p>
${threeSteps(input.to)}
<p style="margin-bottom:0;">Si necesitas ayuda, escribenos por WhatsApp y te guiamos en vivo.</p>`,
  });
  return sendResendEmail({ to: input.to, subject, html });
}

export async function sendPurchaseWelcomeEmail(input: {
  to: string;
  name?: string | null;
  updatesUntilText: string;
}): Promise<MailResult> {
  const name = (input.name || "").trim() || "trader";
  const until = escapeHtml(input.updatesUntilText);
  const subject =
    "Bienvenido a Legion SuperPanel — Tu acceso e instalacion en 3 pasos";
  const html = baseLayout({
    preheader:
      "Tu licencia oficial ya esta activa. Entra a /cuenta y activa MT4 en 3 pasos.",
    title: "Bienvenido a Legion SuperPanel",
    bodyHtml: `
<p style="margin-top:0;">Hola ${escapeHtml(name)},</p>
<p>Tu licencia oficial ya esta activa: hasta <b>3 cuentas MT4</b>, graficos ilimitados y <b>1 ano de actualizaciones</b> incluidas hasta <b>${until}</b>.</p>
<p style="margin-bottom:8px;"><b>Instalacion en 3 pasos:</b></p>
${threeSteps(input.to)}
<p style="margin-bottom:0;">Guarda este correo. Tu panel personal siempre estara en ${CUENTA_URL}.</p>`,
  });
  return sendResendEmail({ to: input.to, subject, html });
}
