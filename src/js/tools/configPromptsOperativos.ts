import { preparePromptBodyForSave } from "../core/promptVariables.ts";
import { bodyPreviewHtmlFromLines } from "../ui/promptMdEditorHtml.ts";
import { DEFAULT_MODELO_OPERATIVO, modelAllowsSampling, modelAllowsReasoningEffort } from "./configOpenAi.ts";

export const REASONING_EFFORT_OPTIONS = ["low", "medium", "high"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORT_OPTIONS)[number];

export const MESSAGE_ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

/** Legacy — se ignoran al guardar; viven en SYS_VALUES.openai */
export const LEGACY_META_KEYS = ["modeloOperativo", "modeloConversacion", "temperaturaConversacion"] as const;

export type PromptMessage = { role: MessageRole; content: string[] };
export type PromptDef = {
  reasoning_effort?: ReasoningEffort;
  temperatura?: number;
  max_completion_tokens?: number;
  response_format?: { type: string };
  messages: PromptMessage[];
  [key: string]: unknown;
};

export type PromptsOperativosConfig = Record<string, unknown>;

export function prettyJson(obj: unknown): string {
  try { return JSON.stringify(obj ?? {}, null, 2); } catch { return "{}"; }
}

export { modelAllowsSampling };

export function isPromptDef(v: unknown): v is PromptDef {
  return !!v && typeof v === "object" && !Array.isArray(v) && Array.isArray((v as PromptDef).messages);
}

export function listPromptKeys(config: PromptsOperativosConfig): string[] {
  return Object.keys(config ?? {}).filter((k) => !LEGACY_META_KEYS.includes(k as typeof LEGACY_META_KEYS[number]) && isPromptDef(config[k]));
}

export function stripLegacyMetaKeys(config: PromptsOperativosConfig): PromptsOperativosConfig {
  const out: PromptsOperativosConfig = {};
  for (const [k, v] of Object.entries(config ?? {})) {
    if (!LEGACY_META_KEYS.includes(k as typeof LEGACY_META_KEYS[number])) out[k] = v;
  }
  return out;
}

export function contentLinesToText(lines: unknown): string {
  if (!Array.isArray(lines)) return "";
  // Cada ítem del array es una línea del prompt (UlPrompts une con \n).
  return lines.map((l) => String(l ?? "")).join("\n");
}

/** Ítems del array content[] → HTML de vista previa (una fila por ítem). */
export function contentLinesToPreviewHtml(lines: unknown): string {
  if (!Array.isArray(lines) || !lines.length) return "";
  return bodyPreviewHtmlFromLines(lines);
}

export function textToContentLines(text: string): string[] {
  const src = preparePromptBodyForSave(text);
  if (!src) return [];
  return src.split("\n");
}

function isReasoningEffort(v: unknown): v is ReasoningEffort {
  return REASONING_EFFORT_OPTIONS.includes(v as ReasoningEffort);
}

function isMessageRole(v: unknown): v is MessageRole {
  return MESSAGE_ROLES.includes(v as MessageRole);
}

function validateTemperatureField(label: string, v: unknown, model: string, errors: string[], opts: { strict?: boolean } = {}): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) { errors.push(`${label}: debe ser numérico`); return undefined; }
  if (n < 0 || n > 2) { errors.push(`${label}: debe estar entre 0 y 2`); return undefined; }
  if (!modelAllowsSampling(model)) {
    if (opts.strict) errors.push(`${label}: el modelo (${model}) no admite temperatura`);
    return undefined;
  }
  return n;
}

function validateMaxTokens(label: string, v: unknown, errors: string[]): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 1) { errors.push(`${label}: debe ser un entero ≥ 1`); return undefined; }
  if (n > 128000) errors.push(`${label}: máximo 128000`);
  return n;
}

function normalizePromptDef(raw: unknown, key: string, operativeModel: string, errors: string[], strict: boolean): PromptDef {
  if (!isPromptDef(raw)) {
    errors.push(`${key}: debe ser un objeto con messages[]`);
    return { messages: [] };
  }
  const out: PromptDef = { messages: [] };
  const src = raw as PromptDef;

  if (src.reasoning_effort != null && src.reasoning_effort !== "") {
    if (!isReasoningEffort(src.reasoning_effort)) errors.push(`${key}.reasoning_effort: use low, medium o high`);
    else out.reasoning_effort = src.reasoning_effort;
  }

  const maxTok = validateMaxTokens(`${key}.max_completion_tokens`, src.max_completion_tokens, errors);
  if (maxTok != null) {
    out.max_completion_tokens = maxTok;
    const effort = out.reasoning_effort;
    if (effort && modelAllowsReasoningEffort(operativeModel) && maxTok > 64 && maxTok < 128) {
      errors.push(`${key}.max_completion_tokens: con modelo ${operativeModel} y reasoning_effort=${effort} use al menos 128 (el razonamiento consume el budget)`);
    }
  }

  const temp = validateTemperatureField(`${key}.temperatura`, src.temperatura, operativeModel, errors, { strict });
  if (temp != null) out.temperatura = temp;

  if (src.response_format && typeof src.response_format === "object" && !Array.isArray(src.response_format))
    out.response_format = src.response_format as { type: string };

  if (!Array.isArray(src.messages) || !src.messages.length) {
    errors.push(`${key}.messages: al menos un mensaje`);
    return out;
  }

  out.messages = src.messages.map((m, idx) => {
    const role = m?.role;
    if (!isMessageRole(role)) errors.push(`${key}.messages[${idx}].role: system, user o assistant`);
    const content = Array.isArray(m?.content)
      ? m.content.map((line) => String(line ?? ""))
      : (() => { errors.push(`${key}.messages[${idx}].content: debe ser string[]`); return []; })();
    return { role: isMessageRole(role) ? role : "system", content };
  });

  for (const k of Object.keys(src)) {
    if (["reasoning_effort", "temperatura", "max_completion_tokens", "response_format", "messages"].includes(k)) continue;
    out[k] = src[k];
  }
  return out;
}

export type ValidateResult = { ok: boolean; errors: string[]; normalized: PromptsOperativosConfig };

export function validatePromptsOperativosConfig(config: unknown, opts: { operativeModel?: string; strict?: boolean } = {}): ValidateResult {
  const strict = opts.strict === true;
  const errors: string[] = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, errors: ["La configuración debe ser un objeto JSON"], normalized: {} };
  }
  const src = stripLegacyMetaKeys(config as PromptsOperativosConfig);
  const operativeModel = String(opts.operativeModel ?? DEFAULT_MODELO_OPERATIVO).trim() || DEFAULT_MODELO_OPERATIVO;
  const normalized: PromptsOperativosConfig = {};

  for (const [key, val] of Object.entries(src)) {
    if (!isPromptDef(val)) {
      if (val != null && typeof val === "object") errors.push(`${key}: objeto sin messages[] no permitido`);
      else errors.push(`${key}: clave desconocida o tipo inválido`);
      continue;
    }
    normalized[key] = normalizePromptDef(val, key, operativeModel, errors, strict);
  }

  if (!listPromptKeys(normalized).length) errors.push("Debe existir al menos un prompt operativo (p. ej. generarTitulo)");

  return { ok: errors.length === 0, errors, normalized };
}

export function parseAndValidateJsonText(text: string, opts: { operativeModel?: string } = {}): ValidateResult & { parsed?: PromptsOperativosConfig } {
  let parsed: PromptsOperativosConfig;
  try {
    parsed = JSON.parse(String(text ?? ""));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [`JSON inválido: ${msg}`], normalized: {} };
  }
  const result = validatePromptsOperativosConfig(parsed, { ...opts, strict: true });
  return { ...result, parsed: result.normalized };
}

export function configsEqual(a: PromptsOperativosConfig, b: PromptsOperativosConfig): boolean {
  return prettyJson(stripLegacyMetaKeys(a)) === prettyJson(stripLegacyMetaKeys(b));
}

const PROMPT_ACCORDION_LS_KEY = "isa-patyia:config-prompts-expand";

export type PromptAccordionExpandState = Record<string, boolean>;

export function readPromptAccordionExpandState(): PromptAccordionExpandState {
  try {
    const raw = localStorage.getItem(PROMPT_ACCORDION_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writePromptAccordionExpandState(state: PromptAccordionExpandState): void {
  try {
    localStorage.setItem(PROMPT_ACCORDION_LS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

const PROMPT_SKELETON_COUNT_LS_KEY = "isa-patyia:config-prompts-skeleton-count";
const DEFAULT_PROMPT_SKELETON_COUNT = 2;

/** Último número de prompts operativos cargados — para skeleton fiel en recargas. */
export function readPromptSkeletonCount(): number {
  try {
    const n = Number(localStorage.getItem(PROMPT_SKELETON_COUNT_LS_KEY));
    if (Number.isFinite(n) && n >= 1 && n <= 32) return Math.floor(n);
  } catch { /* ignore */ }
  return DEFAULT_PROMPT_SKELETON_COUNT;
}

export function writePromptSkeletonCount(count: number): void {
  try {
    const n = Math.floor(Number(count));
    if (n >= 1 && n <= 32) localStorage.setItem(PROMPT_SKELETON_COUNT_LS_KEY, String(n));
  } catch { /* ignore */ }
}
