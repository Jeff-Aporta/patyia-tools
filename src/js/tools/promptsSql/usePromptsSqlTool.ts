import { getReact, Session } from "../../core/platform.ts";
import { getSnapshot, mergePartial } from "../../core/urlState.ts";
import * as PromptsSql from "../../api/promptsSql.ts";
import * as LabApi from "../../api/labApi.ts";
import * as LabSession from "../../api/sessionApi.ts";
import { toastWarning } from "../../core/platform.ts";
import {
  isDraftPrompt,
  isConfigDirty,
  hasPendingChanges,
  draftBodiesFromPrompts,
  urlDraftTipoSet,
  ensurePublishCap,
} from "./helpers.ts";
import { buildInitialPromptState, mergeCloudRows } from "./cloudRows.ts";
import {
  discardAllPrompts,
  saveAllPrompts,
  saveOnePrompt,
  applyPromptFiles,
  confirmPromptFileImport,
  confirmResetPromptConfig,
  resetPromptConfigToDefaults,
} from "./promptActions.ts";

const { useState, useEffect, useCallback, useMemo, useRef } = getReact();

const EMPTY_BODIES = Object.freeze({});

export function usePromptsSqlTool({ bootPrompts = {}, onNeedLogin }) {
  const [authTick, setAuthTick] = useState(0);
  const [instruccionesCanEdit, setInstruccionesCanEdit] = useState(false);
  useEffect(() => {
    const onAuth = () => setAuthTick((n) => n + 1);
    window.addEventListener("isa-patyia:auth", onAuth);
    window.addEventListener(Session.EVENT, onAuth);
    window.addEventListener("patyia-apptools:caps-changed", onAuth);
    if (Session.isLoggedIn()) {
      void LabSession.bootMeCaps(true);
      Session.refreshProfile().finally(onAuth);
    }
    return () => {
      window.removeEventListener("isa-patyia:auth", onAuth);
      window.removeEventListener(Session.EVENT, onAuth);
      window.removeEventListener("patyia-apptools:caps-changed", onAuth);
    };
  }, []);

  const canPublish = useMemo(() => {
    // Ver como rol: solo preset local — no mezclar con canEdit del GET instrucciones (sigue siendo el del Dev Lead).
    if (LabSession.isViewingAsRole()) {
      return LabSession.canEditInstrucciones() || LabSession.canEditPromptsOperativos();
    }
    // FORCE / ME v2+v5 / hint GET instrucciones — nunca Session.can legacy (tooltip denyForbidden falso).
    if (LabSession.forcePermsOpen()) return true;
    return instruccionesCanEdit || LabSession.canEditInstrucciones() || LabSession.canEditPromptsOperativos();
  }, [authTick, instruccionesCanEdit]);
  const loggedIn = useMemo(() => LabSession.isLoggedIn(), [authTick]);
  const canEdit = canPublish;
  const editBlockReason = useMemo(() => {
    if (canEdit) return "";
    if (!loggedIn) return "Inicia sesión para editar instrucciones";
    return "Sin permiso para editar instrucciones";
  }, [authTick, canEdit, loggedIn]);
  const saveTitle = useMemo(() => {
    if (canPublish) return "Guardar instrucciones y configuración en Paty (MSSQL)";
    return "Sin permiso para guardar en Paty";
  }, [authTick, canPublish]);
  const importTitle = useMemo(() => {
    if (canPublish) return "Importar archivos PROMPT_*.md / .txt";
    if (!loggedIn) return "Inicia sesión para importar instrucciones";
    return "Sin permiso para importar instrucciones";
  }, [authTick, canPublish, loggedIn]);

  const [extraInstructionKeys, setExtraInstructionKeys] = useState([]);
  const instruccionKeys = useMemo(
    () => PromptsSql.allInstructionKeys(extraInstructionKeys),
    [extraInstructionKeys],
  );

  const [importDlg, setImportDlg] = useState({ open: false, rows: [] });
  const urlBodies = bootPrompts.bodies ?? EMPTY_BODIES;
  const urlDraftTipos = useMemo(() => urlDraftTipoSet(bootPrompts), [bootPrompts]);

  const [prompts, setPrompts] = useState(() => buildInitialPromptState(bootPrompts, urlBodies));

  const [activeTab, setActiveTab] = useState(
    Number.isInteger(bootPrompts.activeTab) ? bootPrompts.activeTab : 0,
  );
  const [jconfigDlg, setJconfigDlg] = useState({ open: false, tipo: null });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [mapped, setMapped] = useState([]);
  const [loadBusy, setLoadBusy] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [envRev, setEnvRev] = useState(0);
  const urlSyncRef = useRef(null);

  const applyCloudRows = useCallback((rows, options = {}) => {
    const unknownKeys = [];
    setPrompts((prev) => {
      const merged = mergeCloudRows(prev, rows, options, { urlBodies, urlDraftTipos });
      unknownKeys.push(...merged.unknownKeys);
      return merged.next;
    });
    if (unknownKeys.length) {
      setExtraInstructionKeys((prev) => {
        const merged = new Set([...prev, ...unknownKeys]);
        return [...merged].sort((a, b) => a.localeCompare(b));
      });
    }
  }, [urlBodies, urlDraftTipos]);

  const clearUrlBodies = useCallback((instruccionKeysToClear) => {
    const snap = getSnapshot();
    const bodies = { ...(snap.prompts?.bodies || {}) };
    const draftTipos = (snap.prompts?.draftTipos || [])
      .map((t) => String(t).toUpperCase())
      .filter((t) => !instruccionKeysToClear.map((x) => String(x).toUpperCase()).includes(t));
    for (const t of instruccionKeysToClear) delete bodies[t];
    mergePartial({ prompts: { activeTab, bodies, draftTipos } });
  }, [activeTab]);

  useEffect(() => {
    const onTarget = () => setEnvRev((n) => n + 1);
    window.addEventListener("jeff:gateway-target", onTarget);
    window.addEventListener("patyia-apptools:lab-target", onTarget);
    return () => {
      window.removeEventListener("jeff:gateway-target", onTarget);
      window.removeEventListener("patyia-apptools:lab-target", onTarget);
    };
  }, []);

  const activeTipo = instruccionKeys[activeTab] || instruccionKeys[0];
  const activePrompt = prompts[activeTipo];

  const recompute = useCallback((state) => {
    const entries = Object.values(state).filter((p) => p.body?.trim() || isConfigDirty(p));
    const { mapped: m } = PromptsSql.analyzeFromEntries(entries);
    setMapped(m);
  }, []);

  useEffect(() => {
    recompute(prompts);
  }, [prompts, recompute]);

  const applyCloudRowsRef = useRef(applyCloudRows);
  applyCloudRowsRef.current = applyCloudRows;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadBusy(true);
      setLoadErr("");
      try {
        const { rows, canEdit } = await LabApi.fetchInstruccionesPaty();
        if (cancelled) return;
        setInstruccionesCanEdit(!!canEdit);
        applyCloudRowsRef.current(rows);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setLoadErr(msg);
          toastWarning(`Carga de instrucciones: ${msg}`);
        }
      } finally {
        if (!cancelled) setLoadBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [envRev]);

  const pendingTipos = useMemo(
    () => instruccionKeys.filter((t) => {
      const p = prompts[t];
      if (!p?.body?.trim()) return false;
      return isDraftPrompt(p) || isConfigDirty(p);
    }),
    [prompts, instruccionKeys],
  );

  const hasLocalChanges = useMemo(
    () => instruccionKeys.some((t) => hasPendingChanges(prompts[t])),
    [prompts, instruccionKeys],
  );

  const modelSelectOptions = useMemo(
    () => PromptsSql.mergeModelOptions(
      ...instruccionKeys.map((t) => prompts[t]?.jconfig?.model),
      ...instruccionKeys.map((t) => prompts[t]?.jconfigBaseline?.model),
    ),
    [prompts, instruccionKeys],
  );

  const filledCount = useMemo(
    () => instruccionKeys.filter((k) => prompts[k]?.body?.trim()).length,
    [prompts, instruccionKeys],
  );

  useEffect(() => {
    mergePartial({ prompts: { activeTab } });
  }, [activeTab]);

  useEffect(() => {
    if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    urlSyncRef.current = setTimeout(() => {
      const bodies = draftBodiesFromPrompts(prompts);
      mergePartial({
        prompts: { activeTab, bodies, draftTipos: Object.keys(bodies) },
      });
    }, 500);
    return () => {
      if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    };
  }, [prompts, activeTab]);

  const discardAll = useCallback(
    () => discardAllPrompts({
      instruccionKeys,
      prompts,
      applyCloudRows,
      clearUrlBodies,
      setActionBusy,
      setLoadErr,
    }),
    [applyCloudRows, clearUrlBodies, prompts, instruccionKeys],
  );

  const saveAll = useCallback(
    () => saveAllPrompts({
      pendingTipos,
      prompts,
      onNeedLogin,
      applyCloudRows,
      clearUrlBodies,
      setActionBusy,
      setLoadErr,
    }),
    [applyCloudRows, clearUrlBodies, pendingTipos, onNeedLogin, prompts],
  );

  const saveOneInstruction = useCallback(
    (tipo, body) => saveOnePrompt({
      tipo,
      body,
      prompts,
      editBlockReason,
      onNeedLogin,
      applyCloudRows,
      clearUrlBodies,
      setActionBusy,
      setLoadErr,
    }),
    [applyCloudRows, clearUrlBodies, editBlockReason, onNeedLogin, prompts],
  );

  const onImportRowChange = useCallback((idx, selected) => {
    setImportDlg((d) => {
      const rows = d.rows.map((row, i) => (i === idx ? { ...row, selected } : row));
      return { ...d, rows };
    });
  }, []);

  const confirmFileImport = useCallback(
    () => confirmPromptFileImport(importDlg.rows, instruccionKeys, setPrompts, setActiveTab, setImportDlg),
    [importDlg.rows, instruccionKeys],
  );

  const applyFiles = useCallback(
    (fileList) => {
      if (!ensurePublishCap(onNeedLogin)) return Promise.resolve();
      return applyPromptFiles(fileList, setImportDlg);
    },
    [onNeedLogin],
  );

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    await applyFiles(dt.files);
  }, [applyFiles]);

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    const zone = e.currentTarget;
    const next = e.relatedTarget;
    if (!next || !zone.contains(next)) setDragOver(false);
  }, []);

  const onDragOverZone = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onFileInput = useCallback(async (e) => {
    if (e.target.files?.length) await applyFiles(e.target.files);
    e.target.value = "";
  }, [applyFiles]);

  const updateBody = useCallback((tipo, body) => {
    setPrompts((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        body,
        dirty: true,
        source: "editor",
        jconfig: PromptsSql.syncJconfigMetrics(prev[tipo].jconfig, body),
      },
    }));
  }, []);

  const updateConfig = useCallback((tipo, patch) => {
    setPrompts((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        jconfig: { ...prev[tipo].jconfig, ...patch },
        configDirty: true,
      },
    }));
  }, []);

  const resetConfigToDefaults = useCallback(
    (tipo) => resetPromptConfigToDefaults(tipo, setPrompts),
    [],
  );

  const confirmResetConfig = useCallback(
    (tipo) => confirmResetPromptConfig(tipo, prompts, resetConfigToDefaults),
    [prompts, resetConfigToDefaults],
  );

  return {
    canPublish,
    loggedIn,
    canEdit,
    editBlockReason,
    saveTitle,
    importTitle,
    instruccionKeys,
    importDlg,
    setImportDlg,
    onImportRowChange,
    confirmFileImport,
    prompts,
    activeTab,
    setActiveTab,
    jconfigDlg,
    setJconfigDlg,
    dragOver,
    fileInputRef,
    onDragEnter,
    onDragLeave,
    onDragOverZone,
    onDrop,
    onFileInput,
    mapped,
    loadBusy,
    loadErr,
    actionBusy,
    activeTipo,
    activePrompt,
    pendingTipos,
    hasLocalChanges,
    modelSelectOptions,
    filledCount,
    discardAll,
    saveAll,
    saveOneInstruction,
    updateBody,
    updateConfig,
    confirmResetConfig,
  };
}
