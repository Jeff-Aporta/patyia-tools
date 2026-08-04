import { getReact, getMaterialUI, getReactDOM } from "../core/platform.ts";
import {
  getOpenAiStatusView,
  openAiStatusIsDegraded,
  openAiStatusLooksOperational,
  openAiStatusTone,
  startOpenAiStatusPolling,
  subscribeOpenAiStatus,
} from "../api/openaiStatusApi.ts";

const TONE_COLOR = {
  ok: "var(--pw-green, #34d399)",
  warn: "var(--pw-amber, #fbbf24)",
  err: "var(--pw-red, #f87171)",
  loading: "var(--pw-cyan, #22d3ee)",
};

/** Suscripción al store app-wide + arranque del poll. */
export function useOpenAiStatus() {
  const { useSyncExternalStore, useEffect } = getReact();
  useEffect(() => {
    startOpenAiStatusPolling();
  }, []);
  return useSyncExternalStore(subscribeOpenAiStatus, getOpenAiStatusView, getOpenAiStatusView);
}

export function openAiStatusHeadline(status) {
  if (!status) return "Consultando OpenAI Status…";
  if (status.error) return "No se pudo leer OpenAI Status";
  const degraded = openAiStatusIsDegraded(status);
  const operational = openAiStatusLooksOperational(status);
  if (operational || !degraded) return status.description || "OpenAI operacional";
  return status.description || "OpenAI Status";
}

/**
 * Anillo de progreso = indicador de OpenAI Status.
 * `link`: clic → status.openai.com; hover → Tooltip (sin title nativo).
 * `compact`: punto de estado + arco fino (header).
 */
export function OpenAiStatusRing({
  size = 14,
  className = "",
  children = null,
  title: titleProp,
  link = false,
  compact = false,
}) {
  const { Tooltip } = getMaterialUI();
  const { status, progress, pollMs } = useOpenAiStatus();
  const tone = openAiStatusTone(status);
  const accent = TONE_COLOR[tone] || TONE_COLOR.loading;
  const secsLeft = Math.max(0, Math.ceil((1 - progress) * (pollMs / 1000)));
  const vb = 36;
  const r = compact ? 14 : 15.5;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const headline = openAiStatusHeadline(status);
  const href = status?.sourceUrl || "https://status.openai.com/";
  const tooltip = titleProp || headline;
  const aria = link
    ? `${headline}. Abrir status.openai.com`
    : `${headline}${status && !status.error ? ` · próxima actualización en ${secsLeft}s` : ""}`;
  const showDot = compact || !children;

  const ring = (
    <span
      className={`paty-openai-status-ring paty-openai-status-ring--${tone}${link ? " paty-openai-status-ring--link" : ""}${compact ? " paty-openai-status-ring--compact" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--oa-ring-accent": accent, width: size, height: size, minWidth: size, minHeight: size }}
      role={link ? undefined : "img"}
      aria-label={link ? undefined : aria}
      aria-hidden={link ? true : undefined}
    >
      <svg
        className="paty-openai-status-ring__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${vb} ${vb}`}
        aria-hidden="true"
        focusable="false"
      >
        <circle className="paty-openai-status-ring__track" cx="18" cy="18" r={r} />
        <circle
          className="paty-openai-status-ring__prog"
          cx="18"
          cy="18"
          r={r}
          style={{
            strokeDasharray: `${c} ${c}`,
            strokeDashoffset: offset,
          }}
        />
        {showDot ? (
          <circle className="paty-openai-status-ring__dot" cx="18" cy="18" r={compact ? 5.5 : 4.5} />
        ) : null}
      </svg>
      {children ? <span className="paty-openai-status-ring__inner">{children}</span> : null}
    </span>
  );

  if (!link) return ring;

  const silenceBrandTitle = (el, on) => {
    const brand = el?.closest?.(".isa-app-brand");
    if (!brand) return;
    if (on) {
      if (brand.dataset.patyTitleBackup == null) {
        brand.dataset.patyTitleBackup = brand.getAttribute("title") || "";
      }
      brand.removeAttribute("title");
      return;
    }
    const backup = brand.dataset.patyTitleBackup;
    if (backup) brand.setAttribute("title", backup);
    else brand.removeAttribute("title");
    delete brand.dataset.patyTitleBackup;
  };

  return (
    <Tooltip title={tooltip} enterDelay={200} disableInteractive placement="bottom-start">
      <a
        className="paty-openai-status-ring__anchor"
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={aria}
        title=""
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.setAttribute("title", "");
          silenceBrandTitle(e.currentTarget, true);
        }}
        onMouseLeave={(e) => {
          silenceBrandTitle(e.currentTarget, false);
        }}
        onFocus={(e) => {
          silenceBrandTitle(e.currentTarget, true);
        }}
        onBlur={(e) => {
          silenceBrandTitle(e.currentTarget, false);
        }}
      >
        {ring}
      </a>
    </Tooltip>
  );
}

/**
 * Monta el indicador junto a la marca del shell (fuera del Typography h6)
 * para no romper alineación ni altura del AppBar.
 */
export function BrandOpenAiStatus({ size = 12 }) {
  const { useState, useEffect, useLayoutEffect } = getReact();
  const { createPortal } = getReactDOM();
  const [host, setHost] = useState(null);

  useLayoutEffect(() => {
    const brand = document.querySelector(".isa-app-brand");
    if (!brand) return undefined;
    let mount = brand.querySelector(":scope > .paty-brand-status-mount");
    if (!mount) {
      mount = document.createElement("span");
      mount.className = "paty-brand-status-mount";
      brand.appendChild(mount);
    }
    setHost(mount);
    return undefined;
  }, []);

  useEffect(() => {
    startOpenAiStatusPolling();
  }, []);

  if (!host || !createPortal) return null;
  return createPortal(
    <OpenAiStatusRing size={size} className="paty-brand-title__status" link compact />,
    host,
  );
}
