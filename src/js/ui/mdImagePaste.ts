/** Pegado de imágenes como markdown `![alt](data:image/…;base64,…)`. */

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export async function clipboardImageDataUrl(e: ClipboardEvent): Promise<string | null> {
  const items = e.clipboardData?.items;
  if (!items?.length) return null;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    return readFileAsDataUrl(file);
  }
  return null;
}

export function markdownImage(alt: string, dataUrl: string): string {
  const safeAlt = String(alt || "imagen").replace(/[\[\]]/g, "");
  return `![${safeAlt}](${dataUrl})`;
}

export function insertTextAtTextarea(ta: HTMLTextAreaElement, insert: string): { next: string; pos: number } {
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? start;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  const next = `${before}${insert}${after}`;
  return { next, pos: start + insert.length };
}

export function insertImageNodeAtSelection(dataUrl: string, alt = "imagen"): void {
  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = alt;
  img.className = "prompt-md-img";
  img.setAttribute("contenteditable", "false");

  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(img);
  range.setStartAfter(img);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}
