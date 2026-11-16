export const APP_ID = "legion-ai";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://legionai.iareal.net";
export const PRODUCT_PRICE_USD = 350;
export const PRODUCT_SERVICE_ID = "legion-superpanel-mt4";
export const PRODUCT_FILENAME = "Legion_SuperPanel_v3_15_MT4.ex4";
export const PRODUCT_TITLE = "Legion SuperPanel v3.15 para MetaTrader 4";

export function adminEmails(): Set<string> {
  const raw =
    process.env.ADMIN_ALLOWED_EMAILS ||
    "david.del.rio.colin@gmail.com";
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
