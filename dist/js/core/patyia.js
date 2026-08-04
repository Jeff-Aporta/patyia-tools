// src/js/core/patyia.ts
window.ISAFront.migrateLegacyGatewayKeys?.({ "jeff:gateway-local": "", "patyia-apptools:gateway-local": "", "patyia-apptools:lab-local": "" });
var ORCH_ONLINE = "https://main-orchestrator.jeffaporta.workers.dev";
var PATYIA_ISS_URL = "https://ayudascp-ia-staging.azurewebsites.net";
var PATYIA_ISS_PROD_URL = "https://ayudascp-ia.azurewebsites.net";
var PATYIA_ISS_LOCAL = "http://127.0.0.1:8802";
var ORCH_LOCAL = "http://localhost:8790";
var SCRUM_LOCAL = "http://localhost:8798";
var TREE_MSGS_LOCAL = "http://localhost:8799";
var PATYIA_ISS_LOCAL_API = `${PATYIA_ISS_LOCAL}/api`;
var PATYIA_ISS_PROD_API = `${PATYIA_ISS_PROD_URL}/api`;
var PATYIA_ISS_STAGING_API = `${PATYIA_ISS_URL}/api`;
var PATYIA_ISS_TARGET_LS_KEY = "patyia-apptools:iss-target";
var PATYIA_ISS_LOCAL_LS_KEY = "patyia-apptools:iss-local";
var GATEWAY_LS_KEY = "jeff:gateway-local";
function isPatyiaApiPath(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.startsWith("/patyia") || p.startsWith("/api/patyia");
}
function patyiaIssBase() {
  const t = getIssTarget();
  if (t === "local") return PATYIA_ISS_LOCAL.replace(/\/$/, "");
  if (t === "production") return PATYIA_ISS_PROD_URL.replace(/\/$/, "");
  return PATYIA_ISS_URL.replace(/\/$/, "");
}
function patyiaIssCapFetchBase() {
  return patyiaIssBase();
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
function setIssTarget(target) {
  try {
    localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, target);
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent("patyia-apptools:iss-target-changed", { detail: { target } }));
  } catch {
  }
  try {
    window.dispatchEvent(new Event("patyia-apptools:caps-changed"));
  } catch {
  }
}
function setLocalMode(_on) {
  return true;
}
function isDevHost() {
  try {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
  } catch {
    return false;
  }
}
function ensureIssLocalDefault() {
  try {
    if (localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY) != null) return;
    const def = isDevHost() ? "local" : "staging";
    localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, def);
  } catch {
  }
}
function migrateIssLocalFromGatewayFlag() {
  try {
    const legacy = localStorage.getItem(PATYIA_ISS_LOCAL_LS_KEY);
    const hasNew = localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY) != null;
    if (!hasNew && legacy === "1") {
      localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, "local");
    }
    if (localStorage.getItem(GATEWAY_LS_KEY) === "1") {
      if (localStorage.getItem(PATYIA_ISS_TARGET_LS_KEY) == null) {
        localStorage.setItem(PATYIA_ISS_TARGET_LS_KEY, "local");
      }
      localStorage.setItem(GATEWAY_LS_KEY, "0");
    }
  } catch {
  }
}
function isLocalMode() {
  return getIssTarget() === "local";
}
var AVATAR_BG_PALETTE = [
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
try {
  window.ISAFront.buildUserAvatarUrl = buildUserAvatarUrl;
} catch {
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
export {
  GATEWAY_LS_KEY,
  ORCH_LOCAL,
  ORCH_ONLINE,
  PATYIA_ISS_LOCAL,
  PATYIA_ISS_LOCAL_API,
  PATYIA_ISS_LOCAL_LS_KEY,
  PATYIA_ISS_PROD_API,
  PATYIA_ISS_PROD_URL,
  PATYIA_ISS_STAGING_API,
  PATYIA_ISS_TARGET_LS_KEY,
  PATYIA_ISS_URL,
  SCRUM_LOCAL,
  TREE_MSGS_LOCAL,
  buildUserAvatarUrl,
  ensureIssLocalDefault,
  getIssTarget,
  isDevHost,
  isLocalMode,
  isPatyiaApiPath,
  migrateIssLocalFromGatewayFlag,
  patyiaIssBase,
  patyiaIssCapFetchBase,
  readPatyiaSseStream,
  resolveIssApiBase,
  setIssTarget,
  setLocalMode
};
