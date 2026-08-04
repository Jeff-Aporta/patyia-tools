import type { ChatImageEntry } from "./types.ts";

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i;
const BACKEND_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

function mimeFromFileName(name: string): string | undefined {
  const lower = name.trim().toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/i.test(lower)) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (/\.heic$/i.test(lower)) return "image/heic";
  if (/\.heif$/i.test(lower)) return "image/heif";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return undefined;
}

export function isChatImageFile(file: File | null | undefined): boolean {
  if (!file) return false;
  if (file.type?.startsWith("image/")) return true;
  return IMAGE_EXT_RE.test(file.name || "");
}

function isHeicLikeFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();
  return mime === "image/heic" || mime === "image/heif" || /\.heic$/i.test(name) || /\.heif$/i.test(name);
}

function isBackendSupportedMime(mime: string | undefined): boolean {
  if (!mime) return false;
  return BACKEND_IMAGE_MIMES.has(mime.toLowerCase());
}

export function readImagesFromClipboard(items: DataTransferItemList | null | undefined): File[] {
  const out: File[] = [];
  for (const item of items || []) {
    if (item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}

export function fileToDataUrl(file: File): Promise<string> {
  // Conservado como utilidad (p.ej. preview local con ObjectURL ya es nativo);
  // ya NO se usa en el pipeline crítico — solo helpers de debug/componentes legacy.
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("No se pudo leer la imagen"));
    r.readAsDataURL(file);
  });
}

export function blobToPreviewUrl(blob: Blob): string {
  try { return URL.createObjectURL(blob); } catch { return ""; }
}

/** Construye entradas binarias (sin base64). Cada entry incluye el File, mime y
 *  opcionalmente width/height para preview en hilo antes de subir. */
export async function filesToImageEntries(files: Iterable<File> | null | undefined): Promise<ChatImageEntry[]> {
  const added: ChatImageEntry[] = [];
  for (const file of files || []) {
    if (!isChatImageFile(file)) continue;
    if (isHeicLikeFile(file)) continue;
    const mime = (file.type || mimeFromFileName(file.name || "") || "image/png").toLowerCase();
    if (!isBackendSupportedMime(mime)) continue;
    const dims = await fileImageDimensions(file).catch(() => undefined);
    added.push({
      name: file.name || "imagen",
      blob: file,
      mime,
      ...(dims?.width ? { width: dims.width } : {}),
      ...(dims?.height ? { height: dims.height } : {}),
    });
  }
  return added;
}

function fileImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Error ? e : new Error("decode"));
    };
    img.src = url;
  });
}

export function hasHeicLikeFiles(files: Iterable<File> | null | undefined): boolean {
  for (const file of files || []) {
    if (isHeicLikeFile(file)) return true;
  }
  return false;
}
