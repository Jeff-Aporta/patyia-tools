import * as PromptsSql from "../../api/promptsSql.ts";
import * as LabApi from "../../api/labApi.ts";
import { preparePromptBodyForSave } from "../../core/promptVariables.ts";
import { urlDraftTipoSet } from "./helpers.ts";

export function buildInitialPromptState(bootPrompts, urlBodies) {
  const base = PromptsSql.emptyPromptState();
  for (const [tipo, body] of Object.entries(urlBodies)) {
    if (!urlDraftTipoSet(bootPrompts).has(String(tipo).toUpperCase())) continue;
    const key = String(tipo).toUpperCase();
    if (!base[key] && !String(body).trim()) continue;
    if (!base[key]) base[key] = PromptsSql.createPromptSlot(key);
    if (!String(body).trim()) continue;
    base[key] = { ...base[key], body: String(body), dirty: true, source: "url" };
  }
  return base;
}

export function mergeCloudRows(prev, rows, { onlyTipo = null, onlyTipos = null, ignoreUrl = false } = {}, { urlBodies, urlDraftTipos }) {
  const scope = onlyTipos?.length
    ? new Set(onlyTipos.map((t) => String(t).toUpperCase()))
    : onlyTipo
      ? new Set([String(onlyTipo).toUpperCase()])
      : null;
  const unknownKeys = [];
  const next = { ...prev };
  const touched = new Set();

  for (const row of rows) {
    const tipo = String(LabApi.rowVal(row, "IINSTRUCCION") ?? "").trim().toUpperCase();
    if (!tipo) continue;
    if (!next[tipo]) {
      unknownKeys.push(tipo);
      next[tipo] = PromptsSql.createPromptSlot(tipo);
    }
    const rawBody = String(LabApi.rowVal(row, "INSTRUCCION") ?? LabApi.rowVal(row, "instruccion") ?? "").trim();
    const body = preparePromptBodyForSave(rawBody);
    const bodyRepaired = Boolean(rawBody && body !== rawBody);
    const rawJconfig = LabApi.rowVal(row, "JCONFIG") ?? LabApi.rowVal(row, "jconfig");
    const jconfig = PromptsSql.syncJconfigMetrics(
      rawJconfig && typeof rawJconfig === "object" && !Array.isArray(rawJconfig)
        ? rawJconfig
        : PromptsSql.parseJconfig(rawJconfig),
      body,
    );
    if (scope && !scope.has(tipo)) continue;
    touched.add(tipo);
    const urlBody = ignoreUrl ? "" : urlBodies[tipo]?.trim();
    const urlIsDraft = !ignoreUrl && urlDraftTipos.has(tipo) && Boolean(urlBody);
    const basePatch = { jconfig, jconfigBaseline: { ...jconfig }, configDirty: false };
    if (urlIsDraft) {
      if (body && urlBody === body) {
        next[tipo] = { ...next[tipo], ...basePatch, body, dirty: bodyRepaired, source: "bd" };
      } else {
        next[tipo] = { ...next[tipo], ...basePatch, body: urlBody, dirty: true, source: "url" };
      }
    } else {
      next[tipo] = {
        ...next[tipo],
        ...basePatch,
        ...(body ? { body, dirty: bodyRepaired, source: "bd" } : {}),
      };
    }
  }

  if (ignoreUrl && scope) {
    for (const tipo of scope) {
      if (!next[tipo] || touched.has(tipo)) continue;
      next[tipo] = { ...next[tipo], body: "", dirty: false, source: "bd" };
    }
  }

  return { next, unknownKeys };
}
