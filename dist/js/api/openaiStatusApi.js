// src/js/api/openaiStatusApi.ts
var OPENAI_STATUS_POLL_MS = 6e4;
var SUMMARY_URL = "https://status.openai.com/api/v2/summary.json";
var STATUS_PAGE = "https://status.openai.com/";
function asIndicator(raw) {
  const s = String(raw ?? "").toLowerCase();
  if (s === "none" || s === "minor" || s === "major" || s === "critical") return s;
  return "unknown";
}
async function fetchOpenAiStatus(signal) {
  const fetchedAt = Date.now();
  try {
    const res = await fetch(SUMMARY_URL, { cache: "no-store", signal });
    if (!res.ok) {
      return {
        ok: false,
        indicator: "unknown",
        description: `HTTP ${res.status}`,
        incidents: [],
        fetchedAt,
        error: `No se pudo leer status.openai.com (${res.status})`,
        sourceUrl: STATUS_PAGE
      };
    }
    const j = await res.json();
    const incidents = (Array.isArray(j.incidents) ? j.incidents : []).filter((i) => i && String(i.status || "").toLowerCase() !== "resolved").map((i) => ({
      name: String(i.name || "Incidente"),
      status: String(i.status || ""),
      impact: String(i.impact || ""),
      shortlink: i.shortlink ? String(i.shortlink) : void 0
    }));
    const indicator = asIndicator(j.status?.indicator);
    return {
      ok: true,
      indicator,
      description: String(j.status?.description || (indicator === "none" ? "All Systems Operational" : "Degraded")),
      incidents,
      fetchedAt,
      sourceUrl: STATUS_PAGE
    };
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    return {
      ok: false,
      indicator: "unknown",
      description: "Sin datos",
      incidents: [],
      fetchedAt,
      error: e instanceof Error ? e.message : String(e),
      sourceUrl: STATUS_PAGE
    };
  }
}
function openAiStatusIsDegraded(snap) {
  if (!snap) return false;
  if (snap.indicator === "none") return false;
  if (snap.indicator === "minor" || snap.indicator === "major" || snap.indicator === "critical") return true;
  return (snap.incidents?.length ?? 0) > 0;
}
function openAiStatusLooksOperational(snap) {
  if (!snap || snap.error) return false;
  if (snap.indicator === "none") return true;
  const d = String(snap.description || "").trim().toLowerCase();
  return /all systems operational|operacional|operational/.test(d) && snap.indicator !== "minor" && snap.indicator !== "major" && snap.indicator !== "critical";
}
function openAiStatusTone(snap) {
  if (!snap) return "loading";
  if (snap.error) return "warn";
  if (openAiStatusLooksOperational(snap)) return "ok";
  if (snap.indicator === "critical" || snap.indicator === "major") return "err";
  if (openAiStatusIsDegraded(snap)) return "warn";
  return "ok";
}
var _status = null;
var _progress = 0;
var _cycleStart = Date.now();
var _started = false;
var _abort = null;
var _nextPullId = 0;
var _tickId = 0;
var _listeners = /* @__PURE__ */ new Set();
var _view = {
  status: null,
  progress: 0,
  pollMs: OPENAI_STATUS_POLL_MS
};
function bumpView() {
  _view = { status: _status, progress: _progress, pollMs: OPENAI_STATUS_POLL_MS };
}
function emit() {
  bumpView();
  _listeners.forEach((fn) => {
    try {
      fn();
    } catch {
    }
  });
}
function getOpenAiStatusView() {
  return _view;
}
function subscribeOpenAiStatus(fn) {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}
function clearTimers() {
  window.clearTimeout(_nextPullId);
  window.clearTimeout(_tickId);
  _nextPullId = 0;
  _tickId = 0;
}
function scheduleTick() {
  window.clearTimeout(_tickId);
  if (!_started) return;
  _tickId = window.setTimeout(() => {
    if (!_started) return;
    const elapsed = Date.now() - _cycleStart;
    const next = Math.min(1, Math.max(0, elapsed / OPENAI_STATUS_POLL_MS));
    if (Math.abs(next - _progress) >= 1e-3 || next >= 1 && _progress < 1) {
      _progress = next;
      emit();
    }
    scheduleTick();
  }, 120);
}
async function pullOnce() {
  if (!_started) return;
  window.clearTimeout(_nextPullId);
  _cycleStart = Date.now();
  _progress = 0;
  emit();
  const ac = new AbortController();
  _abort = ac;
  try {
    _status = await fetchOpenAiStatus(ac.signal);
    emit();
  } catch (e) {
    if (e?.name === "AbortError") return;
    _status = {
      ok: false,
      indicator: "unknown",
      description: "Sin datos",
      incidents: [],
      fetchedAt: Date.now(),
      error: e instanceof Error ? e.message : String(e),
      sourceUrl: STATUS_PAGE
    };
    emit();
  } finally {
    if (!_started) return;
    _nextPullId = window.setTimeout(() => {
      void pullOnce();
    }, OPENAI_STATUS_POLL_MS);
  }
}
function startOpenAiStatusPolling() {
  if (_started) return;
  _started = true;
  _cycleStart = Date.now();
  _progress = 0;
  scheduleTick();
  void pullOnce();
}
function stopOpenAiStatusPolling() {
  if (!_started) return;
  _started = false;
  clearTimers();
  _abort?.abort();
  _abort = null;
}
export {
  OPENAI_STATUS_POLL_MS,
  fetchOpenAiStatus,
  getOpenAiStatusView,
  openAiStatusIsDegraded,
  openAiStatusLooksOperational,
  openAiStatusTone,
  startOpenAiStatusPolling,
  stopOpenAiStatusPolling,
  subscribeOpenAiStatus
};
