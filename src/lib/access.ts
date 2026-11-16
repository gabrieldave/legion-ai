export const APP_ID = "legion-ai";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://legionai.iareal.net";
export const PRODUCT_PRICE_USD = 350;
export const UPDATES_RENEWAL_PRICE_USD = Math.max(
  10,
  Number(process.env.UPDATES_RENEWAL_PRICE_USD || "99") || 99,
);
export const PRODUCT_SERVICE_ID = "legion-superpanel-mt4";
export const UPDATES_RENEWAL_SERVICE_ID = "legion-superpanel-updates-1y";
export const PRODUCT_FILENAME = "Legion_SuperPanel_v3_15_MT4.ex4";
export const LICENSE_FILENAME = "Legion_SuperPanel.lic";
export const PRODUCT_TITLE = "Legion SuperPanel v3.15 para MetaTrader 4";
export const UPDATES_RENEWAL_TITLE =
  "Renovacion 1 Ano de Actualizaciones — Legion SuperPanel MT4";

export const INITIAL_RELEASE_VERSION = "3.15";
export const INITIAL_RELEASE_YMD = 20261116;

/** Novedades reales de v3.15 cuando no hay changelog personalizado en BD */
export const DEFAULT_V315_CHANGELOG = [
  "CPU ultra ligero (compuerta de 100 ms): senales tick a tick intactas y refresco MTF optimizado sin tirones en MT4.",
  "Estabilidad total: proteccion en simbolos sin historial (Bars < 1), zoom sin redibujos infinitos y limpieza 100% al quitar.",
  "Diseno Segoe UI y mejor contraste: lectura mas nitida y pie de atajos compacto en 1 sola linea con boton [?].",
  "Bilingue EN/ES completo: traduccion pulida en el panel principal y en los 4 modulos extra (BID/ASK, Chart Resetter, Ganancias y Visor TP).",
  "Licencias automaticas (hasta 3 cuentas MT4, graficos ilimitados) y paquete .ZIP compatible con Windows y Mac.",
].join("\n");

export function normalizeReleaseVersion(version: string): string {
  return version.trim().replace(/^v/i, "");
}

export function resolveReleaseChangelog(
  version: string,
  changelog?: string | null,
): string {
  const trimmed = (changelog || "").trim();
  if (trimmed) return trimmed;
  if (normalizeReleaseVersion(version) === INITIAL_RELEASE_VERSION) {
    return DEFAULT_V315_CHANGELOG;
  }
  return "";
}

/** Parsea un changelog (ya resuelto) a vinetas de UI / correo */
export function changelogToBullets(changelog?: string | null): string[] {
  return String(changelog || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[•\-\*]\s*/, ""))
    .filter(Boolean);
}

export function formatBuildDateYmd(ymd: number): string {
  const s = String(ymd);
  if (!/^\d{8}$/.test(s)) return String(ymd);
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
export const DEFAULT_MAX_MT4_ACCOUNTS = 3;
export const DEFAULT_MAX_DOWNLOADS_PER_DAY = 5;
export const SLOT_SWAP_COOLDOWN_DAYS = 30;
export const CHARGEBACK_LEASE_DAYS = 35;

export const RELEASES_STORAGE_DIR =
  process.env.RELEASES_STORAGE_DIR?.trim() || "/app/storage/releases";

/** Soporte publico (Cloudflare Email Routing -> Gmail + WhatsApp) */
export const SUPPORT_EMAIL = "legion@iareal.net";
export const SUPPORT_EMAIL_HREF = `mailto:${SUPPORT_EMAIL}`;
export const SUPPORT_WHATSAPP_E164 = "525645674407";
export const SUPPORT_WHATSAPP_HREF = `https://wa.me/${SUPPORT_WHATSAPP_E164}`;

export function adminEmails(): Set<string> {
  const raw =
    process.env.ADMIN_ALLOWED_EMAILS || "david.del.rio.colin@gmail.com";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().has(email.trim().toLowerCase());
}


