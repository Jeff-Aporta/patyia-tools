import { getReact, Session } from "../../core/platform.ts";
import {
  loadPatyJwt,
  hydratePatyJwtFromServer,
  clearPatyJwtLocal,
  canInteractPatyChat,
  canAdminPortalJwt,
  convBelongsToJwt,
  resolveSessionBrowseScope,
  browseScopeKey,
} from "../../core/patyia-jwt.ts";
import {
  listConversaciones,
  getConversacion,
  getConversacionLogs,
  getConversacionLogsWithRetry,
  getConversacionMcpSession,
  convLogFromDetalle,
  deleteConversacion,
  sendConversacionStream,
  buildConversacionPostBody,
  resolveChatSendText,
  postMensajeCalificado,
} from "../../api/patyiaChatApi.ts";
import { uploadAudios, uploadImagenes, chatRefsFromAdjuntos, type AdjuntoSubido } from "../../api/adjuntosApi.ts";
import { CONVERSACIONES_LIST_SORT_DEFAULT } from "../../api/issListFilter.ts";
import { fetchConvLogById, fetchConvLogByIdWithRetry } from "../../api/apiClient.ts";
import * as LabSession from "../../api/sessionApi.ts";
import { logToMensajesVista, formatStreamError } from "../../core/convLog.ts";
import { toastError, toastSuccess, toastWarning, toastInfo, requestConfirm } from "../../core/platform.ts";
import { persistChatConvId, persistChatMessageSource, persistChatMode, persistChatLlmProvider, getSnapshot, subscribe } from "../../core/urlState.ts";
import { CONV_LIST_PAGE_SIZE, MAX_CHAT_IMAGES, MAX_CHAT_AUDIOS, readChatMessageSource, messageSourceFromUrl, readChatMode, chatModeFromUrl, CHAT_PROVIDER_DEFAULT, CHAT_PROVIDER_OPENAI, readConvListPageSize, persistConvListPageSize, parseConvListPageSize, isLibreChatMode, CHAT_PROVIDER_MINIMAX, type ChatMessageSource, type ChatMode, type ChatLlmProvider, type ConvListPageSize } from "./constants.ts";
import { useThreadScrollAnchor } from "./threadScroll.ts";
import {
  auditScopeIsOwnJwt,
  convBelongsToJwtResolved,
  convOwnerDisplayLabel,
  resolveOwnerDisplayName,
  resolveOwnerNickname,
  activeConvOwnerScope,
  resolveConvListOwnerLabel,
  resolveConvListHeader,
} from "./auditScope.ts";
import {
  enrichLogVista,
  attachCalificacionesToVista,
  attachUserImagenesFromOpenAi,
  attachAssistantTextFromOpenAi,
  attachCalificacionesOnly,
  countLogAssistants,
  countOpenAiAssistants,
  logHasOperativas,
  openAiFallbackVista,
  stripMetaFromVista,
  mergeMensajesVista,
  vistaFromLogAndDetail,
  finalizeStreamInLog,
  appendStreamMsg,
  buildOptimisticUserMsg,
  isEphemeralMsgId,
} from "./mensajesModel.ts";
import type {
  AuditScopeRow,
  BrowseScope,
  ChatImageEntry,
  ChatAudioEntry,
  ChatMensajeVista,
  ConvListMeta,
  ConvLogPayload,
  OpenConvOptions,
  PatchThreadOptions,
  PatyConversacionDetalle,
  PatyConversacionRow,
  PatyJwtRecord,
  ThreadApplyOptions,
  UseChatToolBoot,
  ClipboardPasteEvent,
  FileInputChangeEvent,
} from "./types.ts";
import { readImagesFromClipboard, filesToImageEntries, hasHeicLikeFiles, isChatImageFile } from "./images.ts";
import { createVoiceRecorder, filesToAudioEntries, isVoiceRecordingSupported, isChatAudioFile } from "./audio.ts";

const { useState, useEffect, useCallback, useRef, useMemo } = getReact();

function readBootConvId(bootChat?: UseChatToolBoot): number | null {
  const fromBoot = Number(bootChat?.convId);
  if (fromBoot > 0) return fromBoot;
  const fromUrl = Number((getSnapshot().chat as Record<string, unknown>)?.convId);
  return fromUrl > 0 ? fromUrl : null;
}

function convIdsEqual(a: number | null | undefined, b: number | null | undefined): boolean {
  return Number(a) > 0 && Number(a) === Number(b);
}

function urlChatConvId(): number | null {
  return readBootConvId();
}

function isNotFoundError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /not found|\b404\b/i.test(msg);
}

type LogsModeFetch = {
  d: PatyConversacionDetalle | null;
  log: ConvLogPayload | null;
  openAiDirect: boolean;
};

/** GET /conversacion/logs/{id} — mensajesOpenAI + convLog en una sola respuesta. */
async function fetchLogsModeDetail(
  jwt: PatyJwtRecord,
  id: number,
  { freshLog = false, minMensajes = 0 }: { freshLog?: boolean; minMensajes?: number } = {},
): Promise<LogsModeFetch> {
  const loadDetail = () => (freshLog
    ? getConversacionLogsWithRetry(jwt, id, { minMensajes }).catch(() => null)
    : getConversacionLogs(jwt, id).catch(() => null));

  try {
    const d = await loadDetail();
    if (!d) {
      const fallback = await getConversacion(jwt, id).catch(() => null);
      if (!fallback) return { d: null, log: null, openAiDirect: false };
      const log = convLogFromDetalle(fallback, id) as ConvLogPayload | null;
      const assistantsInLog = countLogAssistants(log);
      const assistantsInApi = countOpenAiAssistants(fallback);
      const logComplete = Boolean(log?.mensajes?.length && assistantsInLog >= assistantsInApi);
      const preferLogMeta = Boolean(log?.mensajes?.length && (logHasOperativas(log) || logComplete));
      const openAiDirect = Boolean(fallback?.mensajesOpenAI?.length) && !preferLogMeta;
      return { d: fallback, log, openAiDirect };
    }
    const log = convLogFromDetalle(d, id) as ConvLogPayload | null;
    const assistantsInLog = countLogAssistants(log);
    const assistantsInApi = countOpenAiAssistants(d);
    const logComplete = Boolean(log?.mensajes?.length && assistantsInLog >= assistantsInApi);
    const preferLogMeta = Boolean(log?.mensajes?.length && (logHasOperativas(log) || logComplete));
    const openAiDirect = Boolean(d?.mensajesOpenAI?.length) && !preferLogMeta;
    return { d, log, openAiDirect };
  } catch (e) {
    if (!isNotFoundError(e)) throw e;
  }
  const d = await getConversacion(jwt, id).catch(() => null);
  return { d, log: null, openAiDirect: false };
}

export function useChatTool({ bootChat }: { bootChat?: UseChatToolBoot }) {
  const [jwt, setJwt] = useState<PatyJwtRecord | null>(() => loadPatyJwt());
  const [jwtOpen, setJwtOpen] = useState(false);
  const [jwtLoading, setJwtLoading] = useState(false);
  const [authTick, setAuthTick] = useState(0);
  const [rows, setRows] = useState<PatyConversacionRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(() => readBootConvId(bootChat));
  const [detail, setDetail] = useState<PatyConversacionDetalle | PatyConversacionRow | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState<ChatImageEntry[]>([]);
  const [audios, setAudios] = useState<ChatAudioEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [logMensajes, setLogMensajes] = useState<ChatMensajeVista[]>([]);
  const [ratingMsgId, setRatingMsgId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [logError, setLogError] = useState("");
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaMsg, setMetaMsg] = useState<ChatMensajeVista | null>(null);
  const [payloadPreviewOpen, setPayloadPreviewOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  /** null = contacto del JWT activo; otro valor = auditoría de ese tercero/contacto */
  const [auditScope, setAuditScope] = useState<BrowseScope | null>(null);
  /** Contacto resuelto del usuario ISA PatyIA (sin JWT). */
  const [sessionBrowseScope, setSessionBrowseScope] = useState<BrowseScope | null>(null);
  const [sessionScopeLoading, setSessionScopeLoading] = useState(false);
  const [convListPage, setConvListPage] = useState(1);
  const [convListPageSize, setConvListPageSize] = useState<ConvListPageSize>(() => readConvListPageSize());
  const [convListSearch, setConvListSearch] = useState("");
  const [convListMeta, setConvListMeta] = useState<ConvListMeta | null>(null);
  const [messageSource, setMessageSource] = useState<ChatMessageSource>(() => readChatMessageSource(bootChat));
  const [chatMode, setChatMode] = useState<ChatMode>(() => readChatMode(bootChat));
  // MiniMax es experimental: estado en memoria, sin persistir. Siempre arranca en OpenAI.
  const [llmProvider, setLlmProvider] = useState<ChatLlmProvider>(CHAT_PROVIDER_DEFAULT);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const voiceRecorderRef = useRef(createVoiceRecorder());
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const lastLogApiCountRef = useRef(0);
  const skipThreadReloadRef = useRef<number | null>(null);
  /** Evita reabrir el hilo cuando solo cambia la lista (búsqueda/paginación). */
  const lastOpenedConvRef = useRef<number | null>(null);
  const openConvRef = useRef<(id: number, opts?: OpenConvOptions) => Promise<void>>(async () => {});
  /** Conv recién creada al enviar — esperar a que aparezca en la lista antes de reconciliar. */
  const pendingListConvRef = useRef<number | null>(null);
  const contapymeResumeLockRef = useRef(false);
  const sendingRef = useRef(false);
  const jwtRef = useRef(jwt);
  jwtRef.current = jwt;
  /** Asignado tras definir onSend — poll MCP lo usa para auto-resume. */
  const onSendRef = useRef<(overrideText?: string) => void | Promise<void>>(async () => {});
  /** Poll 5s: sesión MCP lista → auto-resume (reemplaza espera larga en SSE). */
  const mcpPollRef = useRef<{
    convId: number;
    sessionId?: string;
    pendingPrompt: string;
    startedAt: number;
    timer: ReturnType<typeof setInterval> | null;
    inFlight: boolean;
    resumed: boolean;
  } | null>(null);
  const logMensajesRef = useRef(logMensajes);
  logMensajesRef.current = logMensajes;
  sendingRef.current = sending;

  const MCP_POLL_MS = 5000;
  const MCP_POLL_TIMEOUT_MS = 600_000;

  const stopMcpSessionPoll = useCallback(() => {
    const s = mcpPollRef.current;
    if (s?.timer) clearInterval(s.timer);
    mcpPollRef.current = null;
  }, []);

  const resumeMcpAfterLogin = useCallback((prompt: string) => {
    if (sendingRef.current || contapymeResumeLockRef.current) return;
    contapymeResumeLockRef.current = true;
    toastInfo("Sesión ContaPyme lista — consultando…");
    void Promise.resolve(onSendRef.current(String(prompt || "ya inicié sesión").trim() || "ya inicié sesión")).finally(() => {
      window.setTimeout(() => { contapymeResumeLockRef.current = false; }, 8_000);
    });
  }, []);

  const tickMcpSessionPoll = useCallback(async () => {
    const cur = mcpPollRef.current;
    const tokenJwt = jwtRef.current;
    if (!cur || cur.resumed || cur.inFlight || !tokenJwt?.token) return;
    if (Date.now() - cur.startedAt > MCP_POLL_TIMEOUT_MS) {
      stopMcpSessionPoll();
      toastWarning("Tiempo de espera de sesión ContaPyme agotado. Vuelve a preguntar.");
      return;
    }
    cur.inFlight = true;
    try {
      const st = await getConversacionMcpSession(tokenJwt, cur.convId, cur.sessionId);
      if (st.sessionId) cur.sessionId = st.sessionId;
      if (st.ready) {
        cur.resumed = true;
        const prompt = String(st.pendingPrompt || cur.pendingPrompt || "ya inicié sesión").trim();
        stopMcpSessionPoll();
        resumeMcpAfterLogin(prompt);
        return;
      }
      if (st.kind === "gone") stopMcpSessionPoll();
    } catch {
      /* siguiente tick */
    } finally {
      if (mcpPollRef.current) mcpPollRef.current.inFlight = false;
    }
  }, [resumeMcpAfterLogin, stopMcpSessionPoll]);

  const startMcpSessionPoll = useCallback((opts: {
    convId: number;
    sessionId?: string;
    pendingPrompt: string;
  }) => {
    const id = Number(opts.convId);
    if (!Number.isInteger(id) || id <= 0) return;
    stopMcpSessionPoll();
    mcpPollRef.current = {
      convId: id,
      sessionId: opts.sessionId ? String(opts.sessionId) : undefined,
      pendingPrompt: String(opts.pendingPrompt || "").trim() || "ya inicié sesión",
      startedAt: Date.now(),
      timer: null,
      inFlight: false,
      resumed: false,
    };
    mcpPollRef.current.timer = setInterval(() => { void tickMcpSessionPoll(); }, MCP_POLL_MS);
    void tickMcpSessionPoll();
  }, [stopMcpSessionPoll, tickMcpSessionPoll]);

  useEffect(() => () => { stopMcpSessionPoll(); }, [stopMcpSessionPoll]);
  useEffect(() => {
    const cur = mcpPollRef.current;
    if (cur && selectedId != null && cur.convId !== selectedId) stopMcpSessionPoll();
  }, [selectedId, stopMcpSessionPoll]);

  const loggedIn = Session.isLoggedIn();
  const sessionUser = Session.username();
  const canAdminJwt = canAdminPortalJwt();
  const canAuditChat = useMemo(
    () => LabSession.canAccessOthers(),
    [authTick],
  );
  const canInteract = canInteractPatyChat(sessionUser, jwt);
  /** Sin auditoría: forzar scope propio (ignora auditScope manipulado por script). */
  const listScope = useMemo(() => {
    const own = activeConvOwnerScope(null, jwt?.claims) ?? sessionBrowseScope;
    if (!canAuditChat) return own;
    return auditScope ?? own;
  }, [canAuditChat, auditScope, jwt?.claims, sessionBrowseScope]);
  const selectedConvRow = selectedId
    ? rows.find((r) => convIdsEqual(r.iconversacion, selectedId))
    : null;
  const selectedConvOwned = convBelongsToJwtResolved(
    detail,
    selectedConvRow,
    activeConvOwnerScope(listScope, jwt?.claims),
    jwt?.claims,
  );
  const canSend = canInteract
    && auditScopeIsOwnJwt(auditScope, jwt?.claims)
    && selectedConvOwned;
  const viewingAuditOther = Boolean(
    (auditScope && (
      jwt?.claims
        ? !auditScopeIsOwnJwt(auditScope, jwt.claims)
        : sessionBrowseScope && browseScopeKey(auditScope) !== browseScopeKey(sessionBrowseScope)
    )),
  );
  const viewOnly = loggedIn && !canSend;
  const needsJwt = loggedIn && !jwt?.token && !jwtLoading;
  const displayScope = activeConvOwnerScope(listScope, jwt?.claims);

  useEffect(() => {
    function onSessionAuth() { setAuthTick((n) => n + 1); }
    function onPatyJwt() { setJwt(loadPatyJwt()); }
    window.addEventListener("isa-patyia:paty-jwt", onPatyJwt);
    window.addEventListener(Session.EVENT, onSessionAuth);
    window.addEventListener("isa-patyia:auth", onSessionAuth);
    window.addEventListener("patyia-apptools:caps-changed", onSessionAuth);
    return () => {
      window.removeEventListener("isa-patyia:paty-jwt", onPatyJwt);
      window.removeEventListener(Session.EVENT, onSessionAuth);
      window.removeEventListener("isa-patyia:auth", onSessionAuth);
      window.removeEventListener("patyia-apptools:caps-changed", onSessionAuth);
    };
  }, []);

  /** Ver como Visitante / sin audit: volver siempre a conversaciones propias. */
  useEffect(() => {
    if (canAuditChat) return;
    if (auditScope) {
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      persistChatConvId(null);
    }
    if (auditDialogOpen) setAuditDialogOpen(false);
  }, [canAuditChat, auditScope, auditDialogOpen]);

  const prevSessionUserRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevSessionUserRef.current;
    if (prev && prev !== sessionUser) {
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setConvListMeta(null);
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      setDraft("");
      setImages([]);
      setAudios([]);
      voiceRecorderRef.current.cancel();
      setIsRecording(false);
      persistChatConvId(null);
    }
    prevSessionUserRef.current = sessionUser;
  }, [sessionUser]);

  useEffect(() => {
    if (!loggedIn || !sessionUser) {
      setJwt(null);
      setJwtLoading(false);
      return;
    }
    let cancelled = false;
    const u = sessionUser.trim().toUpperCase();
    const cached = loadPatyJwt();
    if (cached?.token && cached.savedBy?.toUpperCase() === u) {
      setJwt(cached);
      setJwtLoading(false);
    } else {
      setJwt(null);
      setJwtLoading(true);
    }
    hydratePatyJwtFromServer(sessionUser)
      .then((rec) => { if (!cancelled) setJwt(rec); })
      .finally(() => { if (!cancelled) setJwtLoading(false); });
    return () => { cancelled = true; };
  }, [loggedIn, sessionUser]);

  useEffect(() => {
    if (!loggedIn || !sessionUser) {
      setSessionBrowseScope(null);
      setSessionScopeLoading(false);
      return undefined;
    }
    if (jwt?.token) {
      setSessionBrowseScope(null);
      setSessionScopeLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSessionScopeLoading(true);
    resolveSessionBrowseScope(sessionUser)
      .then((scope) => { if (!cancelled) setSessionBrowseScope(scope); })
      .finally(() => { if (!cancelled) setSessionScopeLoading(false); });
    return () => { cancelled = true; };
  }, [loggedIn, sessionUser, jwt?.token]);

  const reloadList = useCallback(async () => {
    if (!loggedIn || jwtLoading || sessionScopeLoading) return;
    setLoadingList(true);
    try {
      const page = convListPage;
      const limit = convListPageSize;
      const search = convListSearch.trim() || undefined;
      const listSort = CONVERSACIONES_LIST_SORT_DEFAULT;

      /** Solo auditoría ajena envía itercero/icontacto; propio JWT → ISS resuelve dueño desde token. */
      const auditOther = Boolean(
        canAuditChat
        && auditScope?.itercero
        && auditScope?.icontacto
        && !auditScopeIsOwnJwt(auditScope, jwt?.claims),
      );
      const listInput = {
        page,
        limit,
        search,
        sort: listSort,
        ...(auditOther
          ? { itercero: auditScope!.itercero, icontacto: auditScope!.icontacto }
          : {}),
      };

      if (jwt?.token) {
        const res = await listConversaciones(jwt, listInput);
        setRows(
          [...res.conversaciones].sort(
            (a, b) => Number(b.iconversacion) - Number(a.iconversacion),
          ),
        );
        setConvListMeta({ total: res.total, page: res.page, pages: res.pages });
      } else {
        setRows([]);
        setConvListMeta(null);
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }, [loggedIn, jwtLoading, sessionScopeLoading, jwt?.token, jwt?.claims, canAuditChat, auditScope?.itercero, auditScope?.icontacto, convListPage, convListPageSize, convListSearch]);

  const handleConvListSearchChange = useCallback((text: string) => {
    setConvListSearch((prev) => {
      if (prev === text) return prev;
      setConvListPage(1);
      return text;
    });
  }, []);

  const handleSelectAuditScope = useCallback((row: AuditScopeRow) => {
    if (!LabSession.canAccessOthers()) {
      setAuditDialogOpen(false);
      toastInfo("Tu rol solo puede ver tus propias conversaciones");
      setAuditScope(null);
      return;
    }
    if (row.esJwt) {
      if (!jwt?.claims?.itercero) {
        setAuditDialogOpen(false);
        toastInfo("Configura JWT para filtrar por tu contacto");
        return;
      }
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setConvListMeta(null);
      setRows([]);
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      persistChatConvId(null);
      setAuditDialogOpen(false);
      toastInfo("Conversaciones de tu JWT");
      return;
    }
    if (row.esSesion) {
      const sessionScope: BrowseScope | null = (row.itercero && row.icontacto)
        ? {
          itercero: String(row.itercero),
          icontacto: String(row.icontacto),
          nombre: row.nombre || sessionUser || null,
        }
        : sessionBrowseScope;
      const sameAsJwt = Boolean(
        sessionScope
        && jwt?.claims?.itercero
        && convBelongsToJwt(sessionScope, jwt.claims),
      );
      setAuditScope(sameAsJwt ? null : sessionScope);
      setConvListPage(1);
      setConvListSearch("");
      setConvListMeta(null);
      setRows([]);
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
      setStreamText("");
      setLogError("");
      persistChatConvId(null);
      setAuditDialogOpen(false);
      toastInfo(`Conversaciones · ${row.nombre || sessionUser || "sesión"}`);
      return;
    }
    const next: BrowseScope = {
      itercero: String(row.itercero ?? ""),
      icontacto: String(row.icontacto ?? ""),
      nombre: row.nombre || null,
    };
    setAuditScope(next);
    setConvListPage(1);
    setConvListSearch("");
    setConvListMeta(null);
    setRows([]);
    setSelectedId(null);
    setDetail(null);
    setLogMensajes([]);
    setStreamText("");
    setLogError("");
    persistChatConvId(null);
    setAuditDialogOpen(false);
    toastInfo(`Filtro · ${row.nombre || row.icontacto}`);
  }, [jwt?.claims?.itercero, jwt?.claims?.icontacto, sessionBrowseScope, sessionUser]);

  const applyThreadFromDetail = useCallback((
    d: PatyConversacionDetalle | null,
    log: ConvLogPayload | null,
    name: string,
    { openAiDirect = false, stripMeta = false }: ThreadApplyOptions = {},
  ) => {
    const rated = d?.mensajesCalificados || [];
    const logAssistants = countLogAssistants(log);
    const openAiAssistants = countOpenAiAssistants(d);
    const logComplete = Boolean(log?.mensajes?.length && logAssistants >= openAiAssistants);
    const buildFromLog = Boolean(log?.mensajes?.length && (logHasOperativas(log) || logComplete));
    const finalizeVista = (vista: ChatMensajeVista[]) => (
      stripMeta ? stripMetaFromVista(vista) : vista
    );

    if (log?.mensajes?.length) {
      lastLogApiCountRef.current = log.mensajes.length;
    }

    if (buildFromLog) {
      let vista = enrichLogVista(logToMensajesVista(log) as ChatMensajeVista[], name);
      if (d?.mensajesOpenAI?.length) {
        vista = attachCalificacionesToVista(vista, d.mensajesOpenAI, rated);
        vista = attachAssistantTextFromOpenAi(vista, d.mensajesOpenAI);
        vista = attachUserImagenesFromOpenAi(vista, d.mensajesOpenAI);
      } else if (rated.length) {
        vista = attachCalificacionesOnly(vista, rated);
      }
      setLogMensajes(finalizeVista(vista));
      setLogError("");
      return;
    }

    if (openAiDirect && d?.mensajesOpenAI?.length) {
      const vista = finalizeVista(attachUserImagenesFromOpenAi(
        attachCalificacionesToVista(
          enrichLogVista(openAiFallbackVista(d.mensajesOpenAI, name), name),
          d.mensajesOpenAI,
          rated,
        ),
        d.mensajesOpenAI,
      ));
      setLogMensajes(vista);
      setLogError("");
      return;
    }

    if (d?.mensajesOpenAI?.length) {
      const vista = finalizeVista(attachUserImagenesFromOpenAi(
        attachCalificacionesToVista(
          enrichLogVista(openAiFallbackVista(d.mensajesOpenAI, name), name),
          d.mensajesOpenAI,
          rated,
        ),
        d.mensajesOpenAI,
      ));
      setLogMensajes(vista);
      setLogError("");
      return;
    }

    if (log?.mensajes?.length) {
      let vista = enrichLogVista(logToMensajesVista(log), name);
      if (d?.mensajesOpenAI?.length) {
        vista = attachCalificacionesToVista(vista, d.mensajesOpenAI, rated);
        vista = attachAssistantTextFromOpenAi(vista, d.mensajesOpenAI);
        vista = attachUserImagenesFromOpenAi(vista, d.mensajesOpenAI);
      } else if (rated.length) {
        vista = attachCalificacionesOnly(vista, rated);
      }
      setLogMensajes(finalizeVista(vista));
      setLogError("");
      return;
    }

    setLogMensajes([]);
    if (log === null) {
      setLogError("");
    }
  }, []);

  const patchThreadAfterSend = useCallback(async (id: number, { minLogMensajes = 0, ownerLabel }: PatchThreadOptions = {}) => {
    if (!loggedIn || !id) return;
    const name = ownerLabel || convOwnerDisplayLabel(activeConvOwnerScope(listScope, jwt?.claims), jwt, sessionUser);
    const useLogBridge = !jwt?.token;
    const prodMode = messageSource === "prod" && Boolean(jwt?.token);
    const logsApiMode = messageSource === "logs" && Boolean(jwt?.token);
    try {
      if (prodMode) {
        const d = await getConversacion(jwt!, id).catch(() => null);
        if (d) {
          setDetail(d);
          applyThreadFromDetail(d, null, name, { openAiDirect: true, stripMeta: true });
        }
        return;
      }
      if (logsApiMode) {
        try {
          const { d, log, openAiDirect } = await fetchLogsModeDetail(jwt!, id, { freshLog: true, minMensajes: minLogMensajes });
          if (d) {
            const row = rows.find((r) => convIdsEqual(r.iconversacion, id));
            setDetail({
              ...row,
              ...d,
              itercero: d.itercero ?? row?.itercero,
              icontacto: d.icontacto ?? row?.icontacto,
            });
            applyThreadFromDetail(d, log, name, { openAiDirect });
          } else if (log?.mensajes?.length) {
            applyThreadFromDetail(null, log, name);
          }
        } catch { /* enriquecimiento en segundo plano */ }
        return;
      }
      const logResult = await fetchConvLogByIdWithRetry(id, { minMensajes: minLogMensajes }).catch(() => null);
      let d = null;
      if (!useLogBridge) {
        d = await getConversacion(jwt, id).catch(() => null);
        if (d) setDetail(d);
      }
      if (logResult?.mensajes?.length) {
        lastLogApiCountRef.current = logResult.mensajes.length;
        const vista = vistaFromLogAndDetail(d, logResult, name);
        if (vista?.length) {
          setLogMensajes((prev) => mergeMensajesVista(prev, vista));
          setLogError("");
        }
      }
    } catch {
      /* enriquecimiento en segundo plano; el hilo local ya muestra la respuesta */
    }
  }, [loggedIn, jwt, viewingAuditOther, listScope, messageSource, applyThreadFromDetail, rows, sessionUser]);

  const openConv = useCallback(async (id: number, { silent = false, keepStream = false, freshLog = false, minLogMensajes = 0, sourceOverride }: OpenConvOptions = {}) => {
    if (!loggedIn || !id) return;
    if (!canAuditChat && jwt?.claims?.itercero) {
      const row = rows.find((r) => convIdsEqual(r.iconversacion, id));
      if (row && !convBelongsToJwt(row, jwt.claims)) {
        toastError("Tu rol solo puede abrir tus propias conversaciones");
        return;
      }
    }
    if (freshLog || sourceOverride !== undefined) lastOpenedConvRef.current = null;
    skipThreadReloadRef.current = id;
    setSelectedId(id);
    persistChatConvId(id);
    if (!silent) setLoadingThread(true);
    if (!keepStream) {
      setStreamText("");
      setLogMensajes([]);
    }
    setLogError("");
    const ownerLabel = convOwnerDisplayLabel(activeConvOwnerScope(listScope, jwt?.claims), jwt, sessionUser);
    const useLogBridge = !jwt?.token;
    const activeSource = sourceOverride ?? messageSource;
    const prodMode = activeSource === "prod" && Boolean(jwt?.token);
    const logsApiMode = activeSource === "logs" && Boolean(jwt?.token);
    const minMensajes = freshLog
      ? Math.max(minLogMensajes, lastLogApiCountRef.current + 2)
      : 0;
    const assertOwnDetail = (d: { itercero?: string; icontacto?: string } | null) => {
      if (!canAuditChat && d && jwt?.claims?.itercero && !convBelongsToJwt(d, jwt.claims)) {
        toastError("Tu rol solo puede abrir tus propias conversaciones");
        setSelectedId(null);
        setDetail(null);
        setLogMensajes([]);
        persistChatConvId(null);
        return false;
      }
      return true;
    };
    try {
      if (prodMode) {
        const d = await getConversacion(jwt!, id);
        if (!assertOwnDetail(d)) return;
        setDetail(d);
        applyThreadFromDetail(d, null, ownerLabel, { openAiDirect: true, stripMeta: true });
        return;
      }
      if (logsApiMode) {
        const { d, log, openAiDirect } = await fetchLogsModeDetail(jwt!, id, { freshLog, minMensajes });
        if (d && !assertOwnDetail(d)) return;
        if (d) {
          const row = rows.find((r) => convIdsEqual(r.iconversacion, id));
          setDetail({
            ...row,
            ...d,
            itercero: d.itercero ?? row?.itercero,
            icontacto: d.icontacto ?? row?.icontacto,
          });
        }
        else {
          const row = rows.find((r) => r.iconversacion === id);
          setDetail(row || { iconversacion: id, titulo: `Conv #${id}` });
        }
        applyThreadFromDetail(d, log, ownerLabel, { openAiDirect });
        return;
      }
      if (useLogBridge) {
        const logResult = freshLog
          ? await fetchConvLogByIdWithRetry(id, { minMensajes }).catch(() => null)
          : await fetchConvLogById(id).catch(() => null);
        const row = rows.find((r) => r.iconversacion === id);
        if (row && !assertOwnDetail(row)) return;
        setDetail(row || { iconversacion: id, titulo: `Conv #${id}` });
        applyThreadFromDetail(null, logResult, ownerLabel);
        return;
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
      setDetail(null);
      setLogMensajes([]);
    } finally {
      if (!silent) setLoadingThread(false);
      lastOpenedConvRef.current = id;
    }
  }, [loggedIn, jwt, sessionUser, canAuditChat, viewingAuditOther, listScope, rows, messageSource, applyThreadFromDetail]);

  openConvRef.current = openConv;

  const onMessageSourceChange = useCallback((next: ChatMessageSource) => {
    if (next === messageSource) return;
    persistChatMessageSource(next);
    setMessageSource(next);
    if (selectedId) {
      void openConv(selectedId, { silent: false, sourceOverride: next });
    }
  }, [messageSource, selectedId, openConv]);

  const onChatModeChange = useCallback(async (next: ChatMode) => {
    const mode = String(next || "patyia").trim().toLowerCase() || "patyia";
    if (mode === chatMode) return;
    if (isLibreChatMode(mode)) {
      const ok = await requestConfirm({
        title: "Modo Libre",
        message: [
          "Al activar Libre, PatyIA deja de aplicar las instrucciones de producto, la clasificación de consultas y la búsqueda en documentación.",
          "",
          "Las respuestas pueden no alinearse con soporte ContaPyme® ni con las políticas de asesoría. El uso queda registrado en el log (mode: libre).",
          "",
          "Usa este modo solo para pruebas en staging. ¿Activar Libre?",
        ].join("\n"),
        confirmLabel: "Activar Libre",
        cancelLabel: "Cancelar",
      });
      if (!ok) return;
    }
    persistChatMode(mode);
    setChatMode(mode);
  }, [chatMode]);

  const onLlmProviderChange = useCallback((next: ChatLlmProvider) => {
    const provider = String(next || CHAT_PROVIDER_OPENAI).trim().toLowerCase() === CHAT_PROVIDER_MINIMAX
      ? CHAT_PROVIDER_MINIMAX
      : CHAT_PROVIDER_OPENAI;
    if (provider === llmProvider) return;
    // Sin persistChatLlmProvider: MiniMax no debe sobrevivir a un cambio de conversación ni a un F5.
    setLlmProvider(provider);
  }, [llmProvider]);

  const onConvListPageSizeChange = useCallback((next: number) => {
    const size = parseConvListPageSize(next);
    if (size === convListPageSize) return;
    persistConvListPageSize(size);
    setConvListPageSize(size);
    setConvListPage(1);
  }, [convListPageSize]);

  useEffect(() => subscribe((snap) => {
    const chat = snap.chat as Record<string, unknown> | undefined;
    const urlId = Number(chat?.convId) || null;
    setSelectedId((prev) => (prev === urlId ? prev : urlId));
    const urlSource = messageSourceFromUrl(chat);
    if (urlSource) setMessageSource((prev) => (prev === urlSource ? prev : urlSource));
    const urlMode = chatModeFromUrl(chat);
    if (urlMode !== null) setChatMode((prev) => (prev === urlMode ? prev : urlMode));
  }), []);

  /** Limpia un ?s=.chat.provider heredado de links viejos (el proveedor ya no vive en la URL). */
  useEffect(() => { persistChatLlmProvider(CHAT_PROVIDER_OPENAI); }, []);

  /**
   * MiniMax vuelve a OpenAI al cambiar de conversación. Ojo: NO cuenta como cambio el paso
   * null → id que hace bindSidebarRow cuando el SSE `begin` bautiza la conversación recién
   * creada — ahí seguimos en la misma conversación y resetear ahí hacía que el botón saltara
   * a OpenAI en pleno stream y que el 2º mensaje se fuera a OpenAI sin que el usuario lo pidiera.
   */
  const prevSelectedIdRef = useRef<number | null>(selectedId);
  useEffect(() => {
    const prev = prevSelectedIdRef.current;
    prevSelectedIdRef.current = selectedId;
    if (prev === selectedId) return;
    if (prev === null) return; // alta de la conversación en curso, no un cambio real
    setLlmProvider((p) => (p === CHAT_PROVIDER_OPENAI ? p : CHAT_PROVIDER_OPENAI));
  }, [selectedId]);

  useEffect(() => {
    if (jwtLoading) return;
    reloadList();
  }, [reloadList, authTick, jwtLoading]);

  /** Si la conv abierta no está en el sidebar aún, mantener selección URL (F5 / carga async). */
  useEffect(() => {
    if (loadingList || jwtLoading || sending) return;
    if (!selectedId) return;

    if (pendingListConvRef.current === selectedId) {
      if (rows.some((r) => convIdsEqual(r.iconversacion, selectedId))) {
        pendingListConvRef.current = null;
      }
      return;
    }

    if (rows.length === 0) return;
    if (rows.some((r) => convIdsEqual(r.iconversacion, selectedId))) return;
    if (convIdsEqual(urlChatConvId(), selectedId)) return;
  }, [rows, loadingList, jwtLoading, sending, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      lastOpenedConvRef.current = null;
      return;
    }
    if (loadingList) return;
    if (jwtLoading && !jwt?.token) return;
    if (skipThreadReloadRef.current === selectedId) {
      skipThreadReloadRef.current = null;
      lastOpenedConvRef.current = selectedId;
      return;
    }
    if (pendingListConvRef.current === selectedId) return;
    const inList = rows.some((r) => convIdsEqual(r.iconversacion, selectedId));
    if (!inList && rows.length > 0 && !convIdsEqual(urlChatConvId(), selectedId)) return;
    if (lastOpenedConvRef.current === selectedId) return;
    void openConvRef.current(selectedId);
  }, [selectedId, jwtLoading, jwt?.token, rows, loadingList]);

  async function onNewChat() {
    if (!canSend) { toastWarning("Modo lectura."); return; }
    stopMcpSessionPoll();
    setSelectedId(null);
    setDetail(null);
    setStreamText("");
    setLogMensajes([]);
    setLogError("");
    setLlmProvider(CHAT_PROVIDER_OPENAI);
    persistChatConvId(null);
    inputRef.current?.focus();
  }

  async function onDelete(id: number) {
    if (!canSend) return;
    const conv = rows.find((r) => r.iconversacion === id);
    if (conv && !convBelongsToJwt(conv, jwt?.claims)) {
      toastError("No puedes eliminar conversaciones de otro contacto");
      return;
    }
    const ok = await requestConfirm({ title: "Eliminar conversación", message: `¿Eliminar conv #${id}?` });
    if (!ok) return;
    try {
      await deleteConversacion(jwt, id);
      toastSuccess("Conversación eliminada");
      if (selectedId === id) { setSelectedId(null); setDetail(null); setLogMensajes([]); }
      reloadList();
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onSend(overrideText?: string) {
    if (!canSend || !jwt) return;
    // onClick={onSend} pasa SyntheticEvent — solo override string explícito (Enter / login).
    const text = resolveChatSendText(overrideText, draft);
    if (!text && !images.length && !audios.length) return;
    if (selectedId && !convBelongsToJwtResolved(
      detail,
      rows.find((r) => convIdsEqual(r.iconversacion, selectedId)),
      displayScope,
      jwt.claims,
    )) {
      toastError("No puedes enviar mensajes en conversaciones de otro contacto");
      return;
    }
    setSending(true);
    setStreamText("");
    stopMcpSessionPoll();
    // Snapshot local de adjuntos (File binario) — limpiamos la UI ya, los blobs quedan en entriesSnapshot.
    const imageEntries: ChatImageEntry[] = [...images];
    const audioEntries: ChatAudioEntry[] = [...audios];
    // Placeholders para optimistic msg (URL firmada todavía no llega).
    const imagenesPlaceholder: string[] = imageEntries.map((_, i) => `__img_pending_${i}__`);
    const audioUrlsPlaceholder: string[] = audioEntries.map((_, i) => `__aud_pending_${i}__`);
    const convIdBefore = selectedId;
    const userName = convOwnerDisplayLabel(displayScope, jwt, sessionUser);
    const logCountBefore = lastLogApiCountRef.current;
    setDraft("");
    setImages([]);
    setAudios([]);
    if (attachInputRef.current) attachInputRef.current.value = "";
    setLogMensajes((prev) => enrichLogVista(
      [...prev, buildOptimisticUserMsg({ text, imagenes: imagenesPlaceholder, audios: audioUrlsPlaceholder, userName })],
      userName,
    ));
    let uploadedImages: AdjuntoSubido[] = [];
    let uploadedAudios: AdjuntoSubido[] = [];
    try {
      if (imageEntries.length) {
        uploadedImages = await uploadImagenes(
          jwt,
          imageEntries.map((i) => i.blob),
          undefined,
        );
      }
      if (audioEntries.length) {
        uploadedAudios = await uploadAudios(
          jwt,
          audioEntries.map((a) => a.blob),
          undefined,
        );
      }
      const imagenesWire = chatRefsFromAdjuntos(uploadedImages, "imagen");
      const audiosWire = chatRefsFromAdjuntos(uploadedAudios, "audio");
      /** Enlace temprano: el ISS ya insertó la fila y manda `iconversacion` en SSE `begin`. */
      const bindSidebarRow = (payload: Record<string, unknown>, opts?: { select?: boolean }) => {
        const id = Number(payload.iconversacion);
        if (!Number.isInteger(id) || id <= 0) return null;
        const tituloEarly = String(payload.titulo || "").trim();
        const rowPatch = {
          iconversacion: id,
          ...(tituloEarly ? { titulo: tituloEarly } : {}),
          ...(payload.qmensajes != null ? { qmensajes: payload.qmensajes } : {}),
          ...(payload.fhcre ? { fhcre: payload.fhcre } : {}),
          ...(payload.fhultact ? { fhultact: payload.fhultact } : {}),
          ...(payload.itercero ? { itercero: payload.itercero } : jwt.claims?.itercero ? { itercero: jwt.claims.itercero } : {}),
          ...(payload.icontacto ? { icontacto: payload.icontacto } : jwt.claims?.icontacto ? { icontacto: jwt.claims.icontacto } : {}),
        };
        setRows((prev) => {
          const exists = prev.some((r) => convIdsEqual(r.iconversacion, id));
          if (exists) return prev.map((r) => (convIdsEqual(r.iconversacion, id) ? { ...r, ...rowPatch } : r));
          return [rowPatch, ...prev];
        });
        if (opts?.select !== false && id !== convIdBefore) {
          pendingListConvRef.current = id;
          skipThreadReloadRef.current = id;
          setSelectedId(id);
          persistChatConvId(id);
        }
        return rowPatch;
      };

      let boundEarly = false;
      const result = await sendConversacionStream(
        jwt,
        { prompt: text, iconversacion: selectedId || undefined, imagenes: imagenesWire, audios: audiosWire, mode: chatMode, provider: llmProvider },
        (partial, payload) => {
          if (partial) setStreamText(partial);
          // SSE `begin` ya trae iconversacion (Insert previo) — enlazar sidebar sin esperar `end`.
          if (!boundEarly && !convIdBefore && payload && Number(payload.iconversacion) > 0) {
            boundEarly = true;
            bindSidebarRow(payload);
          }
        },
      );
      const finalText = String(result.respuesta || "").trim();
      if (finalText) setStreamText(finalText);
      const streamMeta = (result as { meta?: { stream_ok?: boolean; stream_error?: string } }).meta;
      // Un stream que cierra sin texto y sin stream_error dejaba una burbuja vacía y ningún aviso
      // («no pasa nada»). Tratarlo como fallo visible; se ve sobre todo con provider=minimax.
      const emptyStream = !finalText && streamMeta?.stream_ok !== true;
      const streamFailed = streamMeta?.stream_ok === false || emptyStream;
      const streamError = formatStreamError(streamMeta?.stream_error)
        || (emptyStream
          ? `El proveedor ${llmProvider === CHAT_PROVIDER_MINIMAX ? "MiniMax" : "OpenAI"} no devolvió respuesta. Vuelve a intentar${llmProvider === CHAT_PROVIDER_MINIMAX ? " o cambia a OpenAI" : ""}.`
          : undefined);
      const newId = Number(result.iconversacion) || convIdBefore;
      const tituloStream = String(result.titulo || "").trim();
      setLogMensajes((prev) => enrichLogVista(
        finalizeStreamInLog(prev, finalText, streamFailed ? { failed: true, error: streamError } : undefined),
        userName,
      ));
      if (streamFailed) {
        toastWarning(streamError || "La respuesta no se completó correctamente.");
      }
      setSending(false);
      setStreamText("");
      if (newId) {
        const rowPatch = bindSidebarRow({
          iconversacion: newId,
          ...(tituloStream ? { titulo: tituloStream } : {}),
          ...(result.qmensajes != null ? { qmensajes: result.qmensajes } : {}),
          ...(result.fhcre ? { fhcre: result.fhcre } : {}),
          ...(result.fhultact ? { fhultact: result.fhultact } : {}),
          ...(result.itercero ? { itercero: result.itercero } : {}),
          ...(result.icontacto ? { icontacto: result.icontacto } : {}),
        }) || {
          iconversacion: newId,
          ...(tituloStream ? { titulo: tituloStream } : {}),
        };
        setDetail((d) => (
          d && convIdsEqual(d.iconversacion, newId) ? { ...d, ...rowPatch } : d
        ));
        // El ISS persiste el título nuevo DESPUÉS de cerrar el stream (tryUpdate en onComplete),
        // así que la lista recargada puede traer el título viejo y pisar el patch. Re-aplicar
        // el patch del stream (fuente más fresca) cuando la recarga termine.
        void reloadList().then(() => {
          setRows((prev) => {
            const exists = prev.some((r) => convIdsEqual(r.iconversacion, newId));
            if (exists) return prev.map((r) => (convIdsEqual(r.iconversacion, newId) ? { ...r, ...rowPatch } : r));
            return [rowPatch, ...prev];
          });
        });
        void patchThreadAfterSend(newId, {
          minLogMensajes: logCountBefore + 2,
          ownerLabel: userName,
        }).then(() => {
          // El detail refetcheado puede traer el título viejo (BD aún sin tryUpdate) — el del stream manda.
          if (!tituloStream) return;
          setDetail((d) => (d && convIdsEqual(d.iconversacion, newId) && d.titulo !== tituloStream ? { ...d, titulo: tituloStream } : d));
          setRows((prev) => prev.map((r) => (convIdsEqual(r.iconversacion, newId) && r.titulo !== tituloStream ? { ...r, titulo: tituloStream } : r)));
        });

        const meta = (result.meta || {}) as Record<string, unknown>;
        const loginUrl = String(meta.login_url || "").trim();
        const needsMcpPoll = Boolean(
          meta.mcp_await_front_poll
          || meta.contapyme_mcp_login
          || loginUrl
          || /ia\.contapyme\.com\/api\/login\/asw/i.test(String(result.respuesta || "")),
        );
        if (needsMcpPoll) {
          startMcpSessionPoll({
            convId: newId,
            sessionId: String(meta.session_id || "").trim() || undefined,
            pendingPrompt: String(meta.pending_prompt || text || "ya inicié sesión").trim(),
          });
        }
      } else if (result?.mensajesOpenAI?.length) {
        applyThreadFromDetail(result, null, userName);
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
      if (text) setDraft(text);
      if (imageEntries.length) {
        setImages(imageEntries);
      }
      if (audioEntries.length) {
        setAudios(audioEntries);
      }
      setLogMensajes((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i -= 1) {
          if (isEphemeralMsgId(copy[i].idMsg) && copy[i].esUsuario) {
            copy.splice(i, 1);
            break;
          }
        }
        return copy;
      });
      setSending(false);
      setStreamText("");
    }
  }

  async function appendImagesFromFiles(files: FileList | File[] | null | undefined) {
    if (!files?.length) return;
    try {
      const list = Array.from(files);
      if (hasHeicLikeFiles(list)) {
        toastWarning("HEIC/HEIF no se admite; usa PNG, JPEG, WebP o GIF");
      }
      const added = await filesToImageEntries(list);
      if (!added.length) {
        toastWarning("Solo se admiten imágenes (PNG, JPEG, WebP, GIF)");
        return;
      }
      setImages((prev) => {
        const merged = [...prev, ...added];
        if (merged.length > MAX_CHAT_IMAGES) {
          toastWarning(`Máximo ${MAX_CHAT_IMAGES} imágenes por mensaje`);
        }
        return merged.slice(0, MAX_CHAT_IMAGES);
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : String(err));
    }
  }

  async function appendAudiosFromFiles(files: FileList | File[] | null | undefined) {
    if (!files?.length) return;
    try {
      const added = await filesToAudioEntries(files);
      if (!added.length) {
        toastWarning("Solo se admiten audios (WebM, MP3, M4A, WAV, OGG)");
        return;
      }
      setAudios((prev) => {
        const merged = [...prev, ...added];
        if (merged.length > MAX_CHAT_AUDIOS) {
          toastWarning(`Máximo ${MAX_CHAT_AUDIOS} audios por mensaje`);
        }
        return merged.slice(0, MAX_CHAT_AUDIOS);
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onToggleVoiceRecord() {
    if (!canSend || sending) return;
    const recorder = voiceRecorderRef.current;
    if (recorder.isActive()) {
      setIsRecording(false);
      try {
        const entry = await recorder.stop();
        if (!entry) {
          toastWarning("La grabación quedó vacía");
          return;
        }
        setAudios((prev) => {
          const merged = [...prev, entry];
          if (merged.length > MAX_CHAT_AUDIOS) {
            toastWarning(`Máximo ${MAX_CHAT_AUDIOS} audios por mensaje`);
          }
          return merged.slice(0, MAX_CHAT_AUDIOS);
        });
      } catch (err) {
        toastError(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    if (!isVoiceRecordingSupported()) {
      toastWarning("Tu navegador no admite grabación de voz");
      return;
    }
    if (audios.length >= MAX_CHAT_AUDIOS) {
      toastWarning(`Máximo ${MAX_CHAT_AUDIOS} audios por mensaje`);
      return;
    }
    try {
      await recorder.start();
      setIsRecording(true);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "No se pudo acceder al micrófono");
    }
  }

  function onAttachClick() {
    attachInputRef.current?.click();
  }

  async function onAttachChange(e: FileInputChangeEvent) {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    const imageFiles = list.filter(isChatImageFile);
    const audioFiles = list.filter(isChatAudioFile);
    const unsupported = list.filter((f) => !isChatImageFile(f) && !isChatAudioFile(f));
    if (unsupported.length) {
      toastWarning("Solo se admiten imágenes y audios");
    }
    if (imageFiles.length) await appendImagesFromFiles(imageFiles);
    if (audioFiles.length) await appendAudiosFromFiles(audioFiles);
    e.target.value = "";
  }

  async function onPaste(e: ClipboardPasteEvent) {
    if (!canSend) return;
    const files = readImagesFromClipboard(e.clipboardData?.items);
    if (!files.length) return;
    e.preventDefault();
    await appendImagesFromFiles(files);
  }

  const onMeta = useCallback((msg: ChatMensajeVista) => {
    setMetaMsg(msg);
    setMetaOpen(true);
  }, []);

  /** Tras ASW: visibility/modal avisa; el poll confirma sesión ready antes de retomar. */
  onSendRef.current = onSend;
  const onContapymeLoginDone = useCallback(() => {
    if (sendingRef.current || contapymeResumeLockRef.current || !canSend || !jwt) return;
    if (mcpPollRef.current) {
      void tickMcpSessionPoll();
      return;
    }
    const msgs = logMensajesRef.current || [];
    let pending = false;
    let pendingPrompt = "ya inicié sesión";
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.esUsuario || m.esOperativa) continue;
      const t = String(m.contenido || "");
      if (/Sesión ContaPyme® activa|Sesión activa/i.test(t)) break;
      if (
        /ia\.contapyme\.com\/api\/login\/asw/i.test(t)
        || Boolean(m.meta?.login_url || m.meta?.extra?.login_url || m.meta?.contapyme_mcp_login || m.meta?.mcp_await_front_poll)
      ) {
        pending = true;
        const sid = String(m.meta?.session_id || "").trim();
        const pp = String(m.meta?.pending_prompt || "").trim();
        if (pp) pendingPrompt = pp;
        if (selectedId) {
          startMcpSessionPoll({
            convId: selectedId,
            sessionId: sid || undefined,
            pendingPrompt,
          });
          return;
        }
      }
      break;
    }
    if (!pending) return;
    // Sin conv seleccionada: ack directo (caso raro).
    contapymeResumeLockRef.current = true;
    void Promise.resolve(onSendRef.current("ya inicié sesión")).finally(() => {
      window.setTimeout(() => { contapymeResumeLockRef.current = false; }, 8_000);
    });
  }, [canSend, jwt, selectedId, startMcpSessionPoll, tickMcpSessionPoll]);

  const onRateMessage = useCallback(async (msg: ChatMensajeVista, butil: boolean) => {
    if (!canSend || !jwt?.token || !selectedId) return;
    if (msg.calificacion !== undefined) return;
    const imensaje = Number(msg.imensaje);
    if (!imensaje) {
      toastWarning("No se puede calificar este mensaje (sin identificador de mensaje).");
      return;
    }
    const contenido = String(msg.contenido || "").trim();
    if (!contenido) {
      toastWarning("No se puede calificar un mensaje vacío.");
      return;
    }
    setRatingMsgId(msg.idMsg);
    try {
      const saved = await postMensajeCalificado(jwt, {
        iconversacion: selectedId,
        contenido,
        imensaje,
        butil,
      });
      const calificacion = butil ? 1 : 0;
      const imensajeDb = Number(saved?.imensaje) || msg.imensaje;
      setLogMensajes((prev) => prev.map((m) => (
        m.idMsg === msg.idMsg
          ? { ...m, calificacion, imensaje: imensajeDb, idMsg: imensajeDb ? `msg-${imensajeDb}` : m.idMsg }
          : m
      )));
      toastSuccess(butil ? "Marcado como útil" : "Marcado como no útil");
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setRatingMsgId(null);
    }
  }, [canSend, jwt, selectedId]);

  const chatUserDisplayName = useMemo(
    () => resolveOwnerDisplayName(jwt, displayScope),
    [displayScope, jwt],
  );
  const chatUserNick = useMemo(
    () => resolveOwnerNickname(jwt, sessionUser),
    [jwt, sessionUser],
  );
  const displayMensajes = useMemo(
    () => appendStreamMsg(logMensajes, streamText, sending),
    [logMensajes, sending, streamText],
  );
  const showThread = Boolean(
    sending
    || (selectedId && (loadingThread || detail || logMensajes.length > 0)),
  );

  const onThreadScroll = useThreadScrollAnchor(threadScrollRef, displayMensajes, { sending });

  const postBodyPreview = useMemo(
    () => buildConversacionPostBody({
      prompt: draft,
      iconversacion: selectedId || undefined,
      // preview sin URLs (se generan tras subir); muestra placeholders.
      imagenes: images.map((i) => i.uploadedUrl ?? `[local image: ${i.name} · ${i.mime} · ${i.blob.size}B]`),
      audios: audios.map((a) => a.uploadedUrl ?? `[local audio: ${a.name} · ${a.mime} · ${a.blob.size}B]`),
      mode: chatMode,
      provider: llmProvider,
    }),
    [draft, selectedId, images, audios, chatMode, llmProvider],
  );

  const clearAuditFilter = useCallback(() => {
    if (jwt?.claims?.itercero) {
      handleSelectAuditScope({ esJwt: true, itercero: jwt.claims.itercero, icontacto: jwt.claims.icontacto });
    } else {
      setAuditScope(null);
      setConvListPage(1);
      setConvListSearch("");
      setSelectedId(null);
      setDetail(null);
      setLogMensajes([]);
    }
  }, [jwt?.claims?.itercero, jwt?.claims?.icontacto, handleSelectAuditScope]);

  const auditCurrentScope = listScope;

  const convListOwnerLabel = useMemo(
    () => resolveConvListOwnerLabel(listScope, jwt, sessionUser),
    [listScope, jwt, sessionUser],
  );

  const convListHeader = useMemo(
    () => resolveConvListHeader(listScope, jwt, sessionUser),
    [listScope, jwt, sessionUser],
  );

  return {
    loggedIn,
    jwt,
    jwtOpen,
    jwtLoading,
    sessionUser,
    canAdminJwt,
    canAuditChat,
    canInteract,
    canSend,
    viewOnly,
    needsJwt,
    displayScope,
    listScope,
    sessionScopeLoading,
    viewingAuditOther,
    auditScope,
    rows,
    selectedId,
    detail,
    loadingList,
    loadingThread,
    sending,
    draft,
    images,
    audios,
    isRecording,
    logError,
    metaOpen,
    metaMsg,
    payloadPreviewOpen,
    auditDialogOpen,
    convListPage,
    convListPageSize,
    convListMeta,
    convListSearch,
    messageSource,
    chatMode,
    llmProvider,
    chatUserDisplayName,
    chatUserNick,
    convListOwnerLabel,
    convListHeader,
    displayMensajes,
    showThread,
    ratingMsgId,
    threadScrollRef,
    inputRef,
    attachInputRef,
    postBodyPreview,
    auditCurrentScope,
    onThreadScroll,
    setJwt,
    setJwtOpen,
    setAuditDialogOpen,
    setPayloadPreviewOpen,
    setMetaOpen,
    setConvListPage,
    handleConvListSearchChange,
    handleSelectAuditScope,
    clearAuditFilter,
    openConv,
    onNewChat,
    onDelete,
    onSend,
    onContapymeLoginDone,
    onPaste,
    onAttachClick,
    onAttachChange,
    onToggleVoiceRecord,
    onMeta,
    onRateMessage,
    onMessageSourceChange,
    onChatModeChange,
    onLlmProviderChange,
    onConvListPageSizeChange,
    setDraft,
    setImages,
    setAudios,
  };
}
