import { getReact, getMaterialUI, UI } from "../core/platform.ts";
import { ensureIsCodeReady, sanitizeLogJsonForDisplay } from "../core/isCodeCdn.ts";

const { useMemo, useEffect, useRef, useState } = getReact();
const { Box, Typography, Stack, Chip, Tooltip, IconButton } = getMaterialUI();
const { Icon } = UI;

function asFileRefs(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (!item || typeof item !== "object") return null;
    const o = item;
    const ifile = String(o.ifile ?? "").trim();
    const url = String(o.url ?? o.variants?.original ?? "").trim();
    if (!ifile && !url) return null;
    return {
      ifile,
      kind: String(o.kind || "file"),
      url,
      variants: o.variants && typeof o.variants === "object" ? o.variants : {},
    };
  }).filter(Boolean);
}

export function MetaFilesStrip({ files, title = "Adjuntos FILES_STORAGE" }) {
  const items = asFileRefs(files);
  if (!items.length) return null;
  return (
    <Box className="meta-files-strip">
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
        <iconify-icon icon="mdi:cloud-outline" width="16" height="16" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      <Stack spacing={0.75}>
        {items.map((f, i) => (
          <Box key={`${f.ifile || f.url}-${i}`} className="meta-files-strip__row">
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              {f.ifile ? (
                <Chip size="small" className="meta-files-strip__ifile" label={`ifile ${f.ifile}`} />
              ) : null}
              <Chip size="small" variant="outlined" label={f.kind} />
              {["original", "med", "thumb"].filter((k) => f.variants?.[k] || (k === "original" && f.url)).map((k) => {
                const href = f.variants?.[k] || (k === "original" ? f.url : "");
                if (!href) return null;
                return (
                  <a key={k} className="meta-files-strip__link" href={href} target="_blank" rel="noopener noreferrer">
                    {k}
                  </a>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function IsCodeJsonView({ value }) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(() => typeof customElements !== "undefined" && Boolean(customElements.get("is-code")));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureIsCodeReady().then((ok) => {
      if (cancelled) return;
      setReady(ok);
      if (!ok) setFailed(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !hostRef.current) return;
    const host = hostRef.current;
    let el = host.querySelector("is-code");
    if (!el) {
      el = document.createElement("is-code");
      el.setAttribute("lang", "json");
      el.setAttribute("readonly", "");
      el.setAttribute("wrap", "");
      el.setAttribute("line-numbers", "false");
      el.setAttribute("min-height", "14rem");
      el.className = "log-json-panel__is-code";
      host.replaceChildren(el);
    }

    const refreshCm = () => {
      try {
        requestAnimationFrame(() => {
          try { el.cm?.refresh?.(); } catch { /* ignore */ }
        });
      } catch { /* ignore */ }
    };

    const onReady = () => {
      setFailed(false);
      refreshCm();
    };
    const onError = () => setFailed(true);

    el.addEventListener("is-ready", onReady);
    el.addEventListener("is-error", onError);

    const text = String(value ?? "");
    if (el.value !== text) el.value = text;
    else if (el.ready) refreshCm();

    // Modal/tabs: CM mide mal si el host estaba oculto al montar.
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => refreshCm())
      : null;
    ro?.observe(host);
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio > 0)) refreshCm();
      }, { threshold: [0, 0.01, 0.1] })
      : null;
    io?.observe(host);

    const t = window.setTimeout(refreshCm, 120);

    return () => {
      window.clearTimeout(t);
      ro?.disconnect();
      io?.disconnect();
      el.removeEventListener("is-ready", onReady);
      el.removeEventListener("is-error", onError);
    };
  }, [ready, value]);

  if (failed) {
    return (
      <pre className="log-json-panel__pre custom-scrollbar">{String(value ?? "")}</pre>
    );
  }

  return (
    <div
      ref={hostRef}
      className="log-json-panel__code-host custom-scrollbar"
      aria-label="Fragmento JSON del conv-log"
    />
  );
}

export function LogJsonPanel({ value, files = null, onCopy }) {
  const json = useMemo(() => {
    if (value == null) return "";
    let raw = "";
    if (typeof value === "string") raw = value;
    else {
      try { raw = JSON.stringify(value, null, 2); } catch { raw = String(value); }
    }
    return sanitizeLogJsonForDisplay(raw);
  }, [value]);

  return (
    <Box className="log-json-panel">
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.85 }}>
        <iconify-icon icon="mdi:code-json" width="18" height="18" />
        <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
          Fragmento conv-log
        </Typography>
        <Tooltip title="Copiar JSON" arrow>
          <IconButton
            size="small"
            aria-label="Copiar JSON del log"
            onClick={() => {
              try { onCopy?.(json); navigator.clipboard?.writeText?.(json); } catch { /* ignore */ }
            }}
          >
            <Icon icon="mdi:content-copy" size={16} />
          </IconButton>
        </Tooltip>
      </Stack>
      <MetaFilesStrip files={files} />
      <IsCodeJsonView value={json} />
    </Box>
  );
}
