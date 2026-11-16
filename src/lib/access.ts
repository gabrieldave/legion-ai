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

export const DEFAULT_MAX_MT4_ACCOUNTS = 3;
export const DEFAULT_MAX_DOWNLOADS_PER_DAY = 5;
export const SLOT_SWAP_COOLDOWN_DAYS = 30;
export const CHARGEBACK_LEASE_DAYS = 35;

export const RELEASES_STORAGE_DIR =
  process.env.RELEASES_STORAGE_DIR?.trim() || "/app/storage/releases";

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


