/** Variables {{nombre}} en plantillas de instrucciones PatyIA. */

export const PROMPT_VAR_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/** `{{nombre}` sin la segunda `}` de cierre (typo histórico en BD). */
export const MALFORMED_PROMPT_VAR_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}(?!\})/g;

const INSTRUCCION_TIPO_SLOT_RES = [/\{\{\s*instruccion_tipo\s*\}\}/i, /\{\{\s*instrucion_tipo\s*\}\}/i] as const;

export type PromptTextSegment = { type: "text"; value: string } | { type: "var"; name: string };

export function isValidVarName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name || "").trim());
}

export function splitBodyWithVars(text: string): PromptTextSegment[] {
  const src = String(text ?? "");
  if (!src) return [];
  const out: PromptTextSegment[] = [];
  const re = new RegExp(PROMPT_VAR_PATTERN.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ type: "text", value: src.slice(last, m.index) });
    out.push({ type: "var", name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ type: "text", value: src.slice(last) });
  return out;
}

/** Lista única de variables presentes en el texto (orden de primera aparición). */
export function extractPromptVariables(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const seg of splitBodyWithVars(text)) {
    if (seg.type !== "var" || seen.has(seg.name)) continue;
    seen.add(seg.name);
    out.push(seg.name);
  }
  return out;
}

/** Tono (hue 0–359) determinista a partir del nombre de la variable. */
export function varNameToHue(name: string): number {
  let h = 2166136261;
  const s = String(name ?? "").trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
    h ^= Math.imul(i + 1, 0x9e3779b1);
  }
  return (Math.imul(h >>> 0, 137) >>> 0) % 360;
}

/** CSS custom property --var-tone-h para badges/chips de una variable. */
export function varToneStyleAttr(name: string): string {
  return `--var-tone-h:${varNameToHue(name)}`;
}

/** Estilos inline (MUI sx) con el mismo tono que los badges del editor. */
export function varToneSx(name: string): Record<string, string | number> {
  const hue = varNameToHue(name);
  return { "--var-tone-h": hue, backgroundColor: `hsl(${hue} 52% 42% / 0.22)`, borderColor: `hsl(${hue} 48% 58%)`, color: `hsl(${hue} 62% 72%)` };
}

function varReplaceRe(name: string): RegExp {
  return new RegExp(`\\{\\{\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "gi");
}

export function renamePromptVariable(text: string, oldName: string, newName: string): string {
  const next = String(newName || "").trim();
  if (!isValidVarName(next)) return text;
  return String(text ?? "").replace(varReplaceRe(oldName), `{{${next}}}`);
}

/** Elimina todas las ocurrencias de {{name}} en el documento. */
export function deletePromptVariable(text: string, name: string): string {
  return String(text ?? "").replace(varReplaceRe(name), "");
}

export function insertPromptVariable(text: string, offset: number, name: string): string {
  const token = `{{${name}}}`;
  const pos = Math.max(0, Math.min(offset, text.length));
  return text.slice(0, pos) + token + text.slice(pos);
}

/** Corrige `{{var}` → `{{var}}` antes de guardar o renderizar en el editor. */
export function repairPromptVarBraces(text: string): string {
  return String(text ?? "").replace(MALFORMED_PROMPT_VAR_PATTERN, (_m, name: string) => `{{${name}}}`);
}

export function findMalformedPromptVars(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = new RegExp(MALFORMED_PROMPT_VAR_PATTERN.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(text ?? "")))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(m[1]);
  }
  return out;
}

export function hasInstruccionTipoSlot(text: string): boolean {
  return INSTRUCCION_TIPO_SLOT_RES.some((re) => re.test(String(text ?? "")));
}

export function preparePromptBodyForSave(text: string): string {
  return repairPromptVarBraces(String(text ?? "").trim());
}
