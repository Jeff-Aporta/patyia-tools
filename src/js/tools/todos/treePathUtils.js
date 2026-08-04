/** Utilidades de índice jerárquico (cliente). */

export function pathDepth(path) {
  return String(path || "").split(".").filter(Boolean).length;
}
