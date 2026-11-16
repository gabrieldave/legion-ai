function isSafeInternalPath(
  value: string | null | undefined,
): value is string {
  return Boolean(
    value &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\") &&
      !/[\u0000-\u001f\u007f]/.test(value),
  );
}

export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (isSafeInternalPath(value)) return value;
  return isSafeInternalPath(fallback) ? fallback : "/";
}
