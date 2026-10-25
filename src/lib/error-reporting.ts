// Logger error internal portal. Hanya mencatat ke konsol browser.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[Satu Data Buton Selatan]", error, { route: window.location.pathname, ...context });
}
