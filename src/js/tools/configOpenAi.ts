import * as PromptsSql from "../api/promptsSql.ts";

export const DEFAULT_MAX_NUM_RESULTS = 8;
export const MIN_MAX_NUM_RESULTS = 3;
export const MAX_MAX_NUM_RESULTS = 50;
export const DEFAULT_MODELO_OPERATIVO = "gpt-4.1-nano";
export const DEFAULT_MODELO_CONVERSACION = "gpt-5-nano";

export type OpenAiSystemConfig = {
  max_num_results: number;
  modeloOperativo: string;
  modeloConversacion: string;
  canEdit?: boolean;
};

export function modelSelectOptions(...extra: unknown[]): string[] {
  return PromptsSql.mergeModelOptions(...extra);
}

export function modelAllowsSampling(model: string): boolean {
  const m = String(model ?? "").trim().toLowerCase();
  if (!m) return true;
  const blocked = new Set([
    "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-pro", "gpt-5-codex", "gpt-5-chat-latest",
    "gpt-5.5", "gpt-5.5-pro", "gpt-5.4-pro", "gpt-5.3-codex", "gpt-5.2-pro", "gpt-5.2-codex",
    "gpt-5.1-codex", "gpt-5.1-codex-max", "gpt-5.1-codex-mini",
    "o1", "o1-preview", "o1-mini", "o1-pro", "o3", "o3-mini", "o4-mini",
  ]);
  if (blocked.has(m)) return false;
  const base = m.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  if (blocked.has(base)) return false;
  for (const b of blocked) {
    if (m === b || m.startsWith(`${b}-`)) return false;
  }
  return true;
}

/** Modelos OpenAI cuyo chat completions admite reasoning_effort (gpt-5, o*). */
export function modelAllowsReasoningEffort(model: string): boolean {
  const m = String(model ?? "").trim().toLowerCase();
  if (!m) return false;
  if (!modelAllowsSampling(m)) return true;
  return /^gpt-5|^o[134]/.test(m);
}

function parseModel(v: unknown, fallback: string): string {
  return String(v ?? "").trim() || fallback;
}

function parseMaxNum(v: unknown): number | null {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < MIN_MAX_NUM_RESULTS || n > MAX_MAX_NUM_RESULTS) return null;
  return n;
}

export function validateOpenAiConfig(config: unknown, opts: { modelOptions?: string[] } = {}): { ok: boolean; errors: string[]; normalized: OpenAiSystemConfig } {
  const errors: string[] = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, errors: ["La configuración debe ser un objeto"], normalized: buildDefaults() };
  }
  const src = config as Record<string, unknown>;
  const modelOptions = opts.modelOptions ?? modelSelectOptions(src.modeloOperativo, src.modeloConversacion);
  const maxNum = parseMaxNum(src.max_num_results);
  if (maxNum == null) errors.push(`Fragmentos: use un valor entre ${MIN_MAX_NUM_RESULTS} y ${MAX_MAX_NUM_RESULTS}`);
  const modeloOperativo = parseModel(src.modeloOperativo, DEFAULT_MODELO_OPERATIVO);
  const modeloConversacion = parseModel(src.modeloConversacion, DEFAULT_MODELO_CONVERSACION);
  if (!modelOptions.includes(modeloOperativo)) errors.push(`Modelo operativo "${modeloOperativo}" no está en el catálogo`);
  if (!modelOptions.includes(modeloConversacion)) errors.push(`Modelo conversación "${modeloConversacion}" no está en el catálogo`);
  return {
    ok: errors.length === 0,
    errors,
    normalized: { max_num_results: maxNum ?? DEFAULT_MAX_NUM_RESULTS, modeloOperativo, modeloConversacion },
  };
}

export function buildDefaults(): OpenAiSystemConfig {
  return {
    max_num_results: DEFAULT_MAX_NUM_RESULTS,
    modeloOperativo: DEFAULT_MODELO_OPERATIVO,
    modeloConversacion: DEFAULT_MODELO_CONVERSACION,
  };
}

export function configsEqual(a: OpenAiSystemConfig, b: OpenAiSystemConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function prettyJson(obj: unknown): string {
  try { return JSON.stringify(obj ?? {}, null, 2); } catch { return "{}"; }
}

/** Solo campos persistibles (sin canEdit ni legacy). */
export function toOpenAiJsonPayload(cfg: OpenAiSystemConfig): Pick<OpenAiSystemConfig, "max_num_results" | "modeloOperativo" | "modeloConversacion"> {
  return { max_num_results: cfg.max_num_results, modeloOperativo: cfg.modeloOperativo, modeloConversacion: cfg.modeloConversacion };
}

export function parseAndValidateJsonText(text: string, opts: { modelOptions?: string[] } = {}): { ok: boolean; errors: string[]; normalized: OpenAiSystemConfig; parsed?: OpenAiSystemConfig } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(text ?? ""));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [`JSON inválido: ${msg}`], normalized: buildDefaults() };
  }
  const result = validateOpenAiConfig(parsed, opts);
  return { ...result, parsed: result.normalized };
}
