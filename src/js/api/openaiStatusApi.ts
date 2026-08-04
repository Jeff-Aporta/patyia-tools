/** OpenAI Statuspage (mismo host que status.openai.com). Poll app-wide. */
export type OpenAiIncident = {
  name: string;
  status: string;
  impact: string;
  shortlink?: string;
};

export type OpenAiStatusSnapshot = {
  ok: boolean;
  indicator: "none" | "minor" | "major" | "critical" | "unknown";
  description: string;
  incidents: OpenAiIncident[];
  fetchedAt: number;
  error?: string;
  sourceUrl: string;
};

export type OpenAiStatusTone = "ok" | "warn" | "err" | "loading";

export type OpenAiStatusView = {
  status: OpenAiStatusSnapshot | null;
  progress: number;
  pollMs: number;
};

/** Intervalo de poll app-wide (barra/anillo de progreso). */
export const OPENAI_STATUS_POLL_MS = 60_000;

const SUMMARY_URL = "https://status.openai.com/api/v2/summary.json";
const STATUS_PAGE = "https://status.openai.com/";

function asIndicator(raw: unknown): OpenAiStatusSnapshot["indicator"] {
  const s = String(raw ?? "").toLowerCase();
  if (s === "none" || s === "minor" || s === "major" || s === "critical") return s;
  return "unknown";
}

/** Fetch Statuspage summary (CORS abierto). Preferir esto al HTML de / . */
export async function fetchOpenAiStatus(signal?: AbortSignal): Promise<OpenAiStatusSnapshot> {
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
        sourceUrl: STATUS_PAGE,
      };
    }
    const j = await res.json() as {
      status?: { indicator?: string; description?: string };
      incidents?: Array<{ name?: string; status?: string; impact?: string; shortlink?: string }>;
    };
    const incidents = (Array.isArray(j.incidents) ? j.incidents : [])
      .filter((i) => i && String(i.status || "").toLowerCase() !== "resolved")
      .map((i) => ({
        name: String(i.name || "Incidente"),
        status: String(i.status || ""),
        impact: String(i.impact || ""),
        shortlink: i.shortlink ? String(i.shortlink) : undefined,
      }));
    const indicator = asIndicator(j.status?.indicator);
    return {
      ok: true,
      indicator,
      description: String(j.status?.description || (indicator === "none" ? "All Systems Operational" : "Degraded")),
      incidents,
      fetchedAt,
      sourceUrl: STATUS_PAGE,
    };
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    return {
      ok: false,
      indicator: "unknown",
      description: "Sin datos",
      incidents: [],
      fetchedAt,
      error: e instanceof Error ? e.message : String(e),
      sourceUrl: STATUS_PAGE,
    };
  }
}

export function openAiStatusIsDegraded(snap: OpenAiStatusSnapshot | null | undefined): boolean {
  if (!snap) return false;
  // Statuspage: indicator "none" = operacional (lista de incidents puede ir rezagada).
  if (snap.indicator === "none") return false;
  if (snap.indicator === "minor" || snap.indicator === "major" || snap.indicator === "critical") return true;
  return (snap.incidents?.length ?? 0) > 0;
}

/** Descripción tipica de Statuspage cuando todo está bien. */
export function openAiStatusLooksOperational(snap: OpenAiStatusSnapshot | null | undefined): boolean {
  if (!snap || snap.error) return false;
  if (snap.indicator === "none") return true;
  const d = String(snap.description || "").trim().toLowerCase();
  return /all systems operational|operacional|operational/.test(d) && snap.indicator !== "minor" && snap.indicator !== "major" && snap.indicator !== "critical";
}

export function openAiStatusTone(snap: OpenAiStatusSnapshot | null | undefined): OpenAiStatusTone {
  if (!snap) return "loading";
  if (snap.error) return "warn";
  if (openAiStatusLooksOperational(snap)) return "ok";
  if (snap.indicator === "critical" || snap.indicator === "major") return "err";
  if (openAiStatusIsDegraded(snap)) return "warn";
  return "ok";
}

/* ── Store app-wide (un solo poll; App + brand + home) ── */

type Listener = () => void;

let _status: OpenAiStatusSnapshot | null = null;
let _progress = 0;
let _cycleStart = Date.now();
let _started = false;
let _abort: AbortController | null = null;
let _nextPullId = 0;
let _tickId = 0;
const _listeners = new Set<Listener>();

/** Snapshot estable: useSyncExternalStore exige Object.is estable entre lecturas. */
let _view: OpenAiStatusView = {
  status: null,
  progress: 0,
  pollMs: OPENAI_STATUS_POLL_MS,
};

function bumpView() {
  _view = { status: _status, progress: _progress, pollMs: OPENAI_STATUS_POLL_MS };
}

function emit() {
  bumpView();
  _listeners.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
}

export function getOpenAiStatusView(): OpenAiStatusView {
  return _view;
}

export function subscribeOpenAiStatus(fn: Listener): () => void {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
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
    // Evitar emit inútil si el float no cambió a efectos visuales (~0.1%).
    if (Math.abs(next - _progress) >= 0.001 || (next >= 1 && _progress < 1)) {
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
    if ((e as { name?: string })?.name === "AbortError") return;
    _status = {
      ok: false,
      indicator: "unknown",
      description: "Sin datos",
      incidents: [],
      fetchedAt: Date.now(),
      error: e instanceof Error ? e.message : String(e),
      sourceUrl: STATUS_PAGE,
    };
    emit();
  } finally {
    if (!_started) return;
    _nextPullId = window.setTimeout(() => { void pullOnce(); }, OPENAI_STATUS_POLL_MS);
  }
}

/** Arranca el poll una sola vez (idempotente). Vivir mientras la app esté montada. */
export function startOpenAiStatusPolling(): void {
  if (_started) return;
  _started = true;
  _cycleStart = Date.now();
  _progress = 0;
  scheduleTick();
  void pullOnce();
}

export function stopOpenAiStatusPolling(): void {
  if (!_started) return;
  _started = false;
  clearTimers();
  _abort?.abort();
  _abort = null;
}
