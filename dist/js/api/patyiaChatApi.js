var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// src/js/api/issListFilter.ts
function buildConversacionesListFilter(input = {}) {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const offset = Math.max(0, Math.floor(Number(input.offset) || 0));
  const sort = String(input.sort || CONVERSACIONES_LIST_SORT_DEFAULT).trim() || CONVERSACIONES_LIST_SORT_DEFAULT;
  const search = String(input.search ?? "").trim().slice(0, 200);
  const itercero = String(input.itercero ?? "").trim();
  const icontacto = String(input.icontacto ?? "").trim();
  return {
    limit,
    offset,
    sort,
    ...search ? { search } : {},
    ...itercero && icontacto ? { itercero, icontacto } : {}
  };
}
function conversacionesListBody(input = {}) {
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  return buildConversacionesListFilter({
    search: input.search,
    limit,
    offset: (page - 1) * limit,
    sort: input.sort,
    itercero: input.itercero,
    icontacto: input.icontacto
  });
}
var CONVERSACIONES_LIST_SORT_DEFAULT;
var init_issListFilter = __esm({
  "src/js/api/issListFilter.ts"() {
    CONVERSACIONES_LIST_SORT_DEFAULT = "-iconversacion";
  }
});

// src/js/core/patyia.ts
function patyiaIssBase() {
  const t = getIssTarget();
  if (t === "local") return PATYIA_ISS_LOCAL.replace(/\/$/, "");
  if (t === "production") return PATYIA_ISS_PROD_URL.replace(/\/$/, "");
  return PATYIA_ISS_URL.replace(/\/$/, "");
}
function resolveIssApiBase() {
  const base = patyiaIssBase();
  return base.endsWith("/api") ? base : `${base}/api`;
}
function getIssTarget() {
  try {
    const raw = localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY);
    if (raw === "production" || raw === "staging" || raw === "local") return raw;
  } catch {
  }
  return isDevHost() ? "local" : "staging";
}
function isDevHost() {
  try {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
  } catch {
    return false;
  }
}
function avatarBgFromName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return AVATAR_BG_PALETTE[h % AVATAR_BG_PALETTE.length];
}
function buildUserAvatarUrl(name, size = 72) {
  const label = String(name ?? "").trim() || "Usuario";
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";
  const bg = avatarBgFromName(label.toLowerCase());
  const half = size / 2;
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${half}" cy="${half}" r="${half}" fill="#${bg}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
async function readPatyiaSseStream(response, onEvent) {
  if (!response.ok) {
    let msg = response.statusText;
    try {
      const j = await response.json();
      msg = String(j?.error || j?.message || msg);
    } catch {
    }
    throw new Error(msg || `HTTP ${response.status}`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream no disponible");
  const dec = new TextDecoder();
  let buf = "";
  let lastPayload = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() || "";
    for (const block of blocks) {
      const lines = block.split("\n");
      let event = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const data = JSON.parse(dataLine);
        lastPayload = data;
        onEvent({ event, data });
      } catch {
      }
    }
  }
  return lastPayload;
}
var PATYIA_ISS_URL, PATYIA_ISS_PROD_URL, PATYIA_ISS_LOCAL, PATYIA_ISS_LOCAL_API, PATYIA_ISS_PROD_API, PATYIA_ISS_STAGING_API, PATYIA_ISS_TARGET_LS_KEY, AVATAR_BG_PALETTE;
var init_patyia = __esm({
  "src/js/core/patyia.ts"() {
    window.ISAFront.migrateLegacyGatewayKeys?.({ "jeff:gateway-local": "", "patyia-apptools:gateway-local": "", "patyia-apptools:lab-local": "" });
    PATYIA_ISS_URL = "https://ayudascp-ia-staging.azurewebsites.net";
    PATYIA_ISS_PROD_URL = "https://ayudascp-ia.azurewebsites.net";
    PATYIA_ISS_LOCAL = "http://127.0.0.1:8802";
    PATYIA_ISS_LOCAL_API = `${PATYIA_ISS_LOCAL}/api`;
    PATYIA_ISS_PROD_API = `${PATYIA_ISS_PROD_URL}/api`;
    PATYIA_ISS_STAGING_API = `${PATYIA_ISS_URL}/api`;
    PATYIA_ISS_TARGET_LS_KEY = "patyia-apptools:iss-target";
    AVATAR_BG_PALETTE = [
      "1e90ff",
      "0ea5e9",
      "14b8a6",
      "22c55e",
      "84cc16",
      "eab308",
      "f97316",
      "ef4444",
      "ec4899",
      "a855f7",
      "6366f1",
      "64748b"
    ];
    try {
      window.ISAFront.buildUserAvatarUrl = buildUserAvatarUrl;
    } catch {
    }
  }
});

// src/js/core/platform.ts
var init_platform = __esm({
  "src/js/core/platform.ts"() {
    init_patyia();
  }
});

// src/js/api/patyiaTokens.ts
function patyAuthHeaders(jwt, extra = {}) {
  return {
    Authorization: `Bearer ${jwt.token}`,
    Accept: "application/json",
    ...extra
  };
}
var init_patyiaTokens = __esm({
  "src/js/api/patyiaTokens.ts"() {
    init_platform();
  }
});

// src/js/api/patyiaChatApi.ts
function authHeaders(jwt, extra = {}) {
  return patyAuthHeaders(jwt, extra);
}
function unwrapBody(data) {
  const d = data;
  if (d?.respuesta && typeof d.respuesta === "object") return d.respuesta;
  if (d?.body && typeof d.body === "object") return d.body;
  return d;
}
async function jsonFetch(path, jwt, init) {
  const base = resolveIssApiBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...authHeaders(jwt),
      ...init?.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {},
      ...init?.headers || {}
    }
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = res.statusText;
    if (ct.includes("json")) {
      try {
        const j = await res.json();
        const enc = j.encabezado;
        if (enc?.mensaje) msg = String(enc.mensaje);
        else {
          const inner = j.respuesta || j.body || j;
          msg = String(inner?.error || inner?.mensaje || j.error || j.message || msg);
        }
      } catch {
      }
    }
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (ct.includes("json")) {
    const raw = await res.json();
    return unwrapBody(raw);
  }
  return {};
}
async function listConversaciones(jwt, input = {}) {
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(input.limit) || 10)));
  const body = await jsonFetch("/conversaciones", jwt, {
    method: "QUERY",
    body: JSON.stringify(conversacionesListBody(input))
  });
  const conversaciones = Array.isArray(body.conversaciones) ? body.conversaciones : [];
  const total = Number(body.total ?? 0) || 0;
  const resLimit = Number(body.limit ?? limit) || limit;
  const resPage = Number(body.page ?? page) || page;
  const pages = Number(body.pages ?? 0) || (total > 0 ? Math.ceil(total / resLimit) : 0);
  return { conversaciones, total, page: resPage, limit: resLimit, pages };
}
async function getConversacion(jwt, id) {
  return jsonFetch(`/conversacion/${id}`, jwt);
}
async function getConversacionLogs(jwt, id) {
  return jsonFetch(`/conversacion/logs/${id}`, jwt);
}
async function getConversacionMcpSession(jwt, id, sessionId) {
  const q = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return jsonFetch(`/conversacion/${id}/mcp-session${q}`, jwt);
}
function convLogFromDetalle(detail, id) {
  const raw = detail?.convLog;
  if (!raw || !Array.isArray(raw.mensajes) || !raw.mensajes.length) return null;
  const convId = Number(raw.iconversacion ?? detail?.iconversacion ?? id ?? 0);
  return { ...raw, iconversacion: convId > 0 ? convId : raw.iconversacion };
}
async function getConversacionLogsWithRetry(jwt, id, { minMensajes = 0, attempts = 8, delayMs = 300 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const detail = await getConversacionLogs(jwt, id);
      last = detail;
      const n = convLogFromDetalle(detail, id)?.mensajes?.length ?? 0;
      if (!minMensajes || n >= minMensajes) return detail;
    } catch (e) {
      if (i === attempts - 1 && !last) throw e;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
    }
  }
  if (!last) throw new Error(`Log conv-${id} no encontrado`);
  return last;
}
async function deleteConversacion(jwt, id) {
  await jsonFetch(`/conversacion/${id}`, jwt, { method: "DELETE" });
}
async function postMensajeCalificado(jwt, input) {
  return jsonFetch("/mensaje", jwt, {
    method: "POST",
    body: JSON.stringify(input)
  });
}
function isHttpUrl(s) {
  return /^https?:\/\//i.test(String(s || "").trim());
}
function isLegacyDataUrl(s) {
  const v = String(s || "").trim();
  return v.startsWith("data:audio/") || v.startsWith("data:image/");
}
function resolveChatSendText(overrideText, draft = "") {
  if (typeof overrideText === "string") return overrideText.trim();
  if (typeof draft === "string") return draft.trim();
  return "";
}
function coerceConversacionPrompt(prompt) {
  return typeof prompt === "string" ? prompt.trim() : "";
}
function adjuntoUrl(item) {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    const o = item;
    return String(o.url ?? o.dataUrl ?? "").trim();
  }
  return "";
}
function normalizeAdjuntoWire(item) {
  if (typeof item === "string") {
    const s = item.trim();
    return isHttpUrl(s) || isLegacyDataUrl(s) ? s : null;
  }
  if (!item || typeof item !== "object") return null;
  const o = item;
  const url = adjuntoUrl(o);
  if (!url || !(isHttpUrl(url) || isLegacyDataUrl(url))) return null;
  const ifile = String(o.ifile ?? o.IFILE ?? "").trim();
  if (!ifile) return url;
  const variants = o.variants && typeof o.variants === "object" ? o.variants : void 0;
  return {
    url,
    ifile,
    ...typeof o.kind === "string" ? { kind: o.kind } : {},
    ...variants ? { variants } : {}
  };
}
function buildConversacionPostBody(input) {
  const text = coerceConversacionPrompt(input.prompt);
  const imagenes = (input.imagenes || []).map(normalizeAdjuntoWire).filter((x) => x != null);
  const audios = (input.audios || []).map(normalizeAdjuntoWire).filter((x) => x != null);
  const hasMedia = imagenes.length > 0 || audios.length > 0;
  const body = {
    prompt: text || (imagenes.length ? "(imagen adjunta)" : audios.length ? "(nota de voz)" : "")
  };
  if (input.iconversacion) body.iconversacion = input.iconversacion;
  if (imagenes.length) body.imagenes = imagenes;
  if (audios.length) body.audios = audios;
  if (input.mode && String(input.mode).trim().toLowerCase() !== "patyia") {
    body.mode = String(input.mode).trim().toLowerCase();
  }
  const provider = String(input.provider || "").trim().toLowerCase();
  if (provider && provider !== "openai") {
    body.provider = provider;
  }
  if (!String(body.prompt || "").trim() && hasMedia) {
    body.prompt = imagenes.length ? "(imagen adjunta)" : "(nota de voz)";
  }
  return body;
}
function formatConversacionPostBodyPreview(body, { maxUrl = 80 } = {}) {
  const clone = JSON.parse(JSON.stringify(body));
  const summarize = (u, label, i) => {
    const s = String(u ?? "");
    if (s.length <= maxUrl + 24) return s;
    if (s.startsWith("data:") || s.startsWith("http")) {
      const mime = s.startsWith("data:") ? s.slice(5, s.indexOf(";")) || "?" : "url";
      return `${s.slice(0, maxUrl)}\u2026 [${mime}, ${s.length.toLocaleString("es-CO")} chars, ${label} ${i + 1}]`;
    }
    return `${s.slice(0, maxUrl)}\u2026`;
  };
  const summarizeItem = (item, label, i) => {
    if (item && typeof item === "object") {
      const o = item;
      return { ...o, url: summarize(o.url, label, i) };
    }
    return summarize(item, label, i);
  };
  if (Array.isArray(clone.imagenes)) clone.imagenes = clone.imagenes.map((img, i) => summarizeItem(img, "img", i));
  if (Array.isArray(clone.audios)) clone.audios = clone.audios.map((a, i) => summarizeItem(a, "audio", i));
  return JSON.stringify(clone, null, 2);
}
async function sendConversacionStream(jwt, input, onDelta) {
  const body = buildConversacionPostBody(input);
  const base = resolveIssApiBase();
  const res = await fetch(`${base}/conversacion`, {
    method: "POST",
    headers: authHeaders(jwt, {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    }),
    body: JSON.stringify(body)
  });
  let streamingText = "";
  const finalPayload = await readPatyiaSseStream(res, (ev) => {
    if (ev.event === "begin") {
      onDelta("", ev.data);
      return;
    }
    if ((ev.event === "message" || ev.event === "end") && typeof ev.data.respuesta === "string") {
      streamingText = ev.data.respuesta;
      onDelta(streamingText, ev.data);
    }
    if (ev.event === "error") {
      throw new Error(String(ev.data.respuesta || ev.data.error || "Error en stream"));
    }
  });
  return {
    ...finalPayload,
    respuesta: streamingText || String(finalPayload.respuesta || "")
  };
}
var init_patyiaChatApi = __esm({
  "src/js/api/patyiaChatApi.ts"() {
    init_issListFilter();
    init_patyiaTokens();
    init_patyia();
  }
});
init_patyiaChatApi();
export {
  buildConversacionPostBody,
  coerceConversacionPrompt,
  convLogFromDetalle,
  deleteConversacion,
  formatConversacionPostBodyPreview,
  getConversacion,
  getConversacionLogs,
  getConversacionLogsWithRetry,
  getConversacionMcpSession,
  listConversaciones,
  postMensajeCalificado,
  resolveChatSendText,
  sendConversacionStream
};
