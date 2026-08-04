/** Carga lazy de @jeff-aporta/lightbox-zoom (boot/cdn.mjs). */

export function isLightboxZoomReady(): boolean {
  return Boolean(globalThis.ISAComponents?.LightboxZoom?.LightboxZoomDialog);
}

let loadPromise: Promise<NonNullable<typeof globalThis.ISAComponents>["LightboxZoom"]> | null = null;

export function ensureLightboxReady() {
  if (isLightboxZoomReady()) {
    return Promise.resolve(globalThis.ISAComponents!.LightboxZoom!);
  }
  if (!loadPromise) {
    loadPromise = import("../boot/cdn.mjs")
      .then((m) => m.ensureLightboxZoom())
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}
