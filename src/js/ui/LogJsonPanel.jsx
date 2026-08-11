import { getReact, getMaterialUI, UI } from "../core/platform.ts";

const { useMemo } = getReact();
const { Box, Typography, Stack, Chip, Tooltip, IconButton } = getMaterialUI();
const { Icon } = UI;

const URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkifyJson(raw) {
  const src = String(raw ?? "");
  const parts = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  let m = URL_RE.exec(src);
  while (m) {
    if (m.index > last) parts.push(escapeHtml(src.slice(last, m.index)));
    const href = m[0].replace(/[),.;]+$/, "");
    const trail = m[0].slice(href.length);
    parts.push(
      `<a class="log-json-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(href)}</a>${escapeHtml(trail)}`,
    );
    last = m.index + m[0].length;
    m = URL_RE.exec(src);
  }
  if (last < src.length) parts.push(escapeHtml(src.slice(last)));
  return parts.join("");
}

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

export function LogJsonPanel({ value, files = null, onCopy }) {
  const json = useMemo(() => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }, [value]);
  const html = useMemo(() => linkifyJson(json), [json]);

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
      <pre className="log-json-panel__pre custom-scrollbar" dangerouslySetInnerHTML={{ __html: html }} />
    </Box>
  );
}
