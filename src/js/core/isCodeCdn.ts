/**
 * Carga lazy de `<is-code>` (Jeff-Aporta/is-webcomponents) por CDN — pin SHA.
 * Solo el módulo code (no all.min.js) para no inflar el boot del chat.
 */

const IS_WC_SHA = "1ce1d12227f2988877b81b8f35cba2507dc16bf1";
const IS_CODE_JS = `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@${IS_WC_SHA}/dist/cdn/code/code.min.js`;

let loadPromise: Promise<boolean> | null = null;

export function isCodeElementReady(): boolean {
  return typeof customElements !== "undefined" && Boolean(customElements.get("is-code"));
}

export function ensureIsCodeReady(): Promise<boolean> {
  if (isCodeElementReady()) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (typeof document === "undefined") return false;
    const existing = [...document.scripts].find((s) => (s.src || "").includes("/dist/cdn/code/code.min.js"));
    if (!existing) {
      await new Promise<void>((resolve, reject) => {
        const el = document.createElement("script");
        el.type = "module";
        el.src = IS_CODE_JS;
        el.onload = () => resolve();
        el.onerror = () => reject(new Error(`No se pudo cargar is-code CDN: ${IS_CODE_JS}`));
        document.head.appendChild(el);
      });
    }
    try {
      await customElements.whenDefined("is-code");
    } catch {
      /* ignore */
    }
    return isCodeElementReady();
  })().catch((err) => {
    loadPromise = null;
    console.warn("[is-code]", err);
    return false;
  });

  return loadPromise;
}

/** Recorta data:audio…;base64,… en JSON de logs (histórico o fallback sin R2). */
export function sanitizeLogJsonForDisplay(raw: string): string {
  return String(raw ?? "").replace(
    /data:audio\/[a-z0-9.+-]+(?:;[^,]*)?;base64,[A-Za-z0-9+/=\s]+/gi,
    (m) => `[audio:data-url omitido · ${m.length} chars — persiste en R2 como .mp3]`,
  );
}
