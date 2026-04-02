/** Open a URL in the system browser. Works in both Tauri and regular browsers. */
export async function openUrl(url: string) {
  if (window.__TAURI_INTERNALS__) {
    try {
      const { openUrl: tauriOpen } = await import("@tauri-apps/plugin-opener");
      await tauriOpen(url);
      return;
    } catch {}
  }
  window.open(url, "_blank", "noopener");
}
