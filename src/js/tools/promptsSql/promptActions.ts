import * as PromptsSql from "../../api/promptsSql.ts";
import * as LabApi from "../../api/labApi.ts";
import * as LabSession from "../../api/sessionApi.ts";
import { humanizeIssAuthMessage } from "../../api/systemConfigApi.ts";
import { hasInstruccionTipoSlot, preparePromptBodyForSave } from "../../core/promptVariables.ts";
import {
  toastWarning, toastSuccess, toastError, toastInfo, requestConfirm,
} from "../../core/platform.ts";
import {
  hasPendingChanges,
  readFilesAsText,
  jconfigEqual,
  ensurePublishCap,
} from "./helpers.ts";

export async function discardAllPrompts({
  instruccionKeys,
  prompts,
  applyCloudRows,
  clearUrlBodies,
  setActionBusy,
  setLoadErr,
}) {
  const toReset = instruccionKeys.filter((t) => hasPendingChanges(prompts[t]));
  if (!toReset.length) {
    toastInfo("No hay cambios locales que descartar");
    return;
  }
  setActionBusy(true);
  setLoadErr("");
  try {
    const { rows } = await LabApi.fetchInstruccionesPaty();
    applyCloudRows(rows, { onlyTipos: toReset, ignoreUrl: true });
    clearUrlBodies(toReset);
    toastInfo(`${toReset.length} instrucción(es) restaurada(s) desde la base`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setLoadErr(msg);
    toastError(msg);
  } finally {
    setActionBusy(false);
  }
}

export async function saveAllPrompts({
  pendingTipos,
  prompts,
  onNeedLogin,
  applyCloudRows,
  clearUrlBodies,
  setActionBusy,
  setLoadErr,
}) {
  if (!pendingTipos.length) {
    toastWarning("No hay cambios pendientes para guardar");
    return;
  }
  if (!ensurePublishCap(onNeedLogin)) return;
  const author = LabSession.auditAuthor();
  const entries = pendingTipos.map((t) => ({
    archivo: prompts[t].archivo,
    iinstruccion: t,
    tipo: t,
    body: prompts[t].body || "",
    source: prompts[t].source,
    jconfig: PromptsSql.enrichJconfigForSave(prompts[t].jconfig, {
      body: prompts[t].body,
      author,
    }),
  }));
  const { sqlMssql, error } = PromptsSql.analyzeFromEntries(entries);
  if (error || !sqlMssql?.trim()) {
    toastError(error || "No se pudo generar SQL");
    return;
  }
  setActionBusy(true);
  setLoadErr("");
  try {
    await LabApi.publishInstruccionesPaty(sqlMssql);
    const savedTipos = [...pendingTipos];
    clearUrlBodies(savedTipos);
    const { rows } = await LabApi.fetchInstruccionesPaty();
    applyCloudRows(rows, { onlyTipos: savedTipos, ignoreUrl: true });
    toastSuccess(`${savedTipos.length} instrucción(es) guardada(s) en Paty`);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = humanizeIssAuthMessage(raw);
    setLoadErr(msg);
    if (e?.code === "FORBIDDEN" || e?.code === "NO_SESSION") {
      LabSession.handleApiError(e, LabSession.INSTRUCCIONES_WRITE_CAP);
    } else if (/permiso|autoriz|403|503|verify-access|SEG|JWT/i.test(msg)) {
      toastWarning(LabSession.humanPermissionError(e, LabSession.INSTRUCCIONES_WRITE_CAP) || msg);
    } else {
      toastError(msg);
    }
  } finally {
    setActionBusy(false);
  }
}

export async function saveOnePrompt({
  tipo,
  body,
  prompts,
  editBlockReason,
  onNeedLogin,
  applyCloudRows,
  clearUrlBodies,
  setActionBusy,
  setLoadErr,
}) {
  const key = String(tipo ?? "").trim().toUpperCase();
  const text = preparePromptBodyForSave(body);
  if (!key) throw new Error("Instrucción no válida");
  if (!text) throw new Error("El contenido no puede estar vacío");
  if (key === "GENERAL" && !hasInstruccionTipoSlot(text)) {
    throw new Error("El prompt GENERAL debe incluir {{instruccion_tipo}} con ambas llaves de cierre.");
  }
  if (!ensurePublishCap(onNeedLogin)) {
    throw new Error(editBlockReason || "Sin permiso para guardar en Paty");
  }
  const author = LabSession.auditAuthor();
  const slot = prompts[key];
  const jconfig = PromptsSql.enrichJconfigForSave(slot?.jconfig, { body: text, author });
  setActionBusy(true);
  setLoadErr("");
  try {
    await LabApi.upsertInstruccionPaty({
      iinstruccion: key,
      instruccion: text,
      jconfig,
      author,
    });
    clearUrlBodies([key]);
    const { rows } = await LabApi.fetchInstruccionesPaty();
    applyCloudRows(rows, { onlyTipos: [key], ignoreUrl: true });
    toastSuccess(`${key.replace(/_/g, " ")} guardada en Paty`);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = humanizeIssAuthMessage(raw);
    setLoadErr(msg);
    if (e?.code === "FORBIDDEN" || e?.code === "NO_SESSION") {
      LabSession.handleApiError(e, LabSession.INSTRUCCIONES_WRITE_CAP);
    } else if (/permiso|autoriz|403|503|verify-access|SEG|JWT/i.test(msg)) {
      toastWarning(LabSession.humanPermissionError(e, LabSession.INSTRUCCIONES_WRITE_CAP) || msg);
    } else {
      toastError(msg);
    }
    throw e;
  } finally {
    setActionBusy(false);
  }
}

export async function applyPromptFiles(fileList, setImportDlg) {
  const files = await readFilesAsText(fileList);
  if (!files.length) return;
  const rows = PromptsSql.prepareFileImportRows(files).filter((r) => /^PROMPT_/i.test(r.fileName));
  if (!rows.length) {
    toastWarning("Ningún PROMPT_*.md / PROMPT_*.txt reconocido en los archivos");
    return;
  }
  setImportDlg({ open: true, rows });
}

export function confirmPromptFileImport(importRows, instruccionKeys, setPrompts, setActiveTab, setImportDlg) {
  const updates = PromptsSql.applyFileImportSelections(importRows);
  const keys = Object.keys(updates);
  if (!keys.length) {
    toastWarning("Selecciona al menos una instrucción destino");
    return;
  }
  setPrompts((prev) => {
    const next = { ...prev };
    for (const [key, data] of Object.entries(updates)) {
      if (!next[key]) next[key] = PromptsSql.createPromptSlot(key);
      next[key] = {
        ...next[key],
        ...data,
        jconfig: PromptsSql.syncJconfigMetrics(next[key].jconfig, data.body),
      };
    }
    return next;
  });
  const first = keys[0];
  const idx = instruccionKeys.indexOf(first);
  if (idx >= 0) setActiveTab(idx);
  setImportDlg({ open: false, rows: [] });
  toastSuccess(`${keys.length} instrucción(es) importada(s)`);
}

export async function confirmResetPromptConfig(tipo, prompts, resetConfigToDefaults) {
  const jc = prompts[tipo]?.jconfig || PromptsSql.parseJconfig(null);
  const d = PromptsSql.DEFAULT_JCONFIG;
  const ok = await requestConfirm({
    title: "Restablecer configuración",
    message: [
      `¿Restablecer modelo, temperatura y top_p de ${tipo.replace(/_/g, " ")}?`,
      "",
      `Modelo: ${jc.model ?? d.model} → ${d.model}`,
      `Temp: ${jc.temperature ?? d.temperature} → ${d.temperature}`,
      `Top_p: ${jc.top_p ?? d.top_p} → ${d.top_p}`,
    ].join("\n"),
    confirmLabel: "Restablecer",
    cancelLabel: "Cancelar",
  });
  if (ok) resetConfigToDefaults(tipo);
}

export function resetPromptConfigToDefaults(tipo, setPrompts) {
  const defaults = { ...PromptsSql.DEFAULT_JCONFIG };
  setPrompts((prev) => {
    const current = prev[tipo];
    if (!current) return prev;
    const nextJconfig = PromptsSql.syncJconfigMetrics(
      { ...defaults, author: current.jconfig?.author, fmod: current.jconfig?.fmod },
      current.body,
    );
    if (jconfigEqual(current.jconfig, nextJconfig)) return prev;
    const baseline = current.jconfigBaseline;
    return {
      ...prev,
      [tipo]: {
        ...current,
        jconfig: nextJconfig,
        configDirty: baseline ? !jconfigEqual(nextJconfig, baseline) : false,
      },
    };
  });
}
