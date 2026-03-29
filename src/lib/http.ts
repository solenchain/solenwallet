// Use Tauri's HTTP plugin when running in Tauri (bypasses CORS),
// fall back to regular fetch in the browser.

let tauriFetch: typeof fetch | null = null;

async function getTauriFetch(): Promise<typeof fetch> {
  if (tauriFetch) return tauriFetch;

  if (window.__TAURI_INTERNALS__) {
    try {
      const mod = await import("@tauri-apps/plugin-http");
      tauriFetch = mod.fetch;
      return tauriFetch;
    } catch {
      // plugin not available, fall through
    }
  }

  tauriFetch = window.fetch.bind(window);
  return tauriFetch;
}

export async function httpFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const doFetch = await getTauriFetch();
  return doFetch(input, init);
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}
