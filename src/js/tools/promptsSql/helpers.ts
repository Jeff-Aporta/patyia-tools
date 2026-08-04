import { getReact, Tokens } from "../../core/platform.ts";
import * as PromptsSql from "../../api/promptsSql.ts";
import { toastWarning } from "../../core/platform.ts";
import * as LabSession from "../../api/sessionApi.ts";

const { createElement, Fragment } = getReact();

export function isDraftPrompt(p) {
  if (!p) return false;
  return p.dirty || p.source === "url" || p.source === "editor" || p.source === "archivo";
}

export function jconfigEqual(a, b) {
  if (!a || !b) return false;
  return a.model === b.model
    && Number(a.temperature) === Number(b.temperature)
    && Number(a.top_p) === Number(b.top_p);
}

export function isConfigDirty(p) {
  if (!p?.configDirty) return false;
  if (!p.jconfigBaseline) return true;
  return !jconfigEqual(p.jconfig, p.jconfigBaseline);
}

export function hasPendingChanges(p) {
  return isDraftPrompt(p) || isConfigDirty(p);
}

export function readFilesAsText(fileList) {
  return Promise.all(
    [...fileList].map(async (f) => ({
      name: f.name,
      content: await f.text(),
    })),
  );
}

export function draftBodiesFromPrompts(prompts) {
  const bodies = {};
  for (const [tipo, p] of Object.entries(prompts)) {
    if (isDraftPrompt(p) && p?.body?.trim()) bodies[tipo] = p.body;
  }
  return bodies;
}

export function formatCharsTokens(body) {
  const text = String(body ?? "");
  if (!text.trim()) return "—";
  const chars = text.length;
  const tokens = Tokens.estimatePrompt(text);
  return createElement(
    Fragment,
    null,
    chars,
    createElement("span", { className: "prompt-mapeo-metric-sep" }, " | "),
    tokens,
  );
}

export function formatFmod(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return String(iso);
  }
}

export function jconfigView(jc, body) {
  const live = PromptsSql.syncJconfigMetrics(jc || PromptsSql.parseJconfig(null), body);
  return {
    provider: live.provider,
    model: live.model,
    temperature: live.temperature,
    top_p: live.top_p,
    chars: live.chars,
    tokens: live.tokens,
    author: live.author || null,
    fmod: live.fmod || null,
  };
}

export function urlDraftTipoSet(bootPrompts) {
  const bodies = bootPrompts?.bodies || {};
  const listed = Array.isArray(bootPrompts?.draftTipos)
    ? bootPrompts.draftTipos.map((t) => String(t).toUpperCase()).filter(Boolean)
    : Object.keys(bodies).map((t) => String(t).toUpperCase());
  return new Set(listed);
}

export function ensurePublishCap(onNeedLogin) {
  if (LabSession.forcePermsOpen() && !LabSession.isViewingAsRole() && LabSession.isLoggedIn()) return true;
  const cap = LabSession.instruccionesPublishCap();
  if (cap) return true;
  const reason = "Sin permiso para publicar instrucciones";
  toastWarning(reason);
  if (!LabSession.isLoggedIn()) onNeedLogin?.();
  return false;
}

const UNIT_STEP = 0.01;

function clampUnitInterval(raw, fallback) {
  if (raw === "" || raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function bumpUnitInterval(current, delta, fallback) {
  const base = clampUnitInterval(current, fallback);
  const next = Math.round((base + delta) * 100) / 100;
  return clampUnitInterval(next, fallback);
}

export function unitIntervalFieldProps(value, fallback, onValue) {
  const handleKeyDown = (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onValue(bumpUnitInterval(value, UNIT_STEP, fallback));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onValue(bumpUnitInterval(value, -UNIT_STEP, fallback));
    }
  };
  const handleWheel = (e) => {
    e.preventDefault();
    onValue(bumpUnitInterval(value, e.deltaY < 0 ? UNIT_STEP : -UNIT_STEP, fallback));
  };
  const handleChange = (e) => {
    const prev = clampUnitInterval(value, fallback);
    const next = clampUnitInterval(e.target.value, fallback);
    const diff = Math.round((next - prev) * 100) / 100;
    const inputType = e.nativeEvent?.inputType;
    if (!inputType && Math.abs(Math.abs(diff) - 1) < 0.001) {
      onValue(bumpUnitInterval(value, diff > 0 ? UNIT_STEP : -UNIT_STEP, fallback));
      return;
    }
    onValue(next);
  };
  return {
    size: "small",
    variant: "outlined",
    type: "number",
    value: value ?? fallback,
    inputProps: {
      step: "0.01",
      min: "0",
      max: "1",
      style: { fontSize: "0.72rem", width: "4.5rem" },
      onKeyDown: handleKeyDown,
      onWheel: handleWheel,
    },
    sx: {
      "& .MuiInputBase-root": { minHeight: 28 },
      "& .MuiInputBase-input": { py: "3px", px: "6px", fontSize: "0.72rem" },
    },
    onChange: handleChange,
  };
}
