import { getReact, getMaterialUI, CodeMirrorPanel } from "../../core/platform.ts";
import { ButtonIconify } from "../../ui/shared.jsx";
import { formatFmod, jconfigView } from "./helpers.ts";

const { useMemo } = getReact();
const { Dialog, DialogTitle, DialogContent, Typography, Box } = getMaterialUI();

export function JconfigDetailDialog({ open, onClose, tipo, jc, body }) {
  const view = useMemo(() => jconfigView(jc, body), [jc, body]);
  const json = useMemo(() => JSON.stringify(view, null, 2), [view]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.5 }}>
        <iconify-icon icon="mdi:code-json" width="1.25em" height="1.25em" />
        <Box component="span" sx={{ fontWeight: 600 }}>JCONFIG · {tipo}</Box>
        <Box sx={{ flex: 1 }} />
        <ButtonIconify icon="mdi:close" title="Cerrar" onClick={onClose} />
      </DialogTitle>
      <DialogContent dividers className="custom-scrollbar">
        <div className="meta-grid">
          <div className="meta-row"><span className="meta-k">Author</span><span className="meta-v">{view.author || "—"}</span></div>
          <div className="meta-row"><span className="meta-k">Fmod</span><span className="meta-v">{formatFmod(view.fmod)}</span></div>
          <div className="meta-row"><span className="meta-k">Chars</span><span className="meta-v">{view.chars ?? "—"}</span></div>
          <div className="meta-row"><span className="meta-k">Tokens</span><span className="meta-v">{view.tokens ?? "—"}</span></div>
          <div className="meta-row"><span className="meta-k">Modelo</span><span className="meta-v"><code>{view.model}</code></span></div>
          <div className="meta-row"><span className="meta-k">temperature</span><span className="meta-v">{view.temperature}</span></div>
          <div className="meta-row"><span className="meta-k">top_p</span><span className="meta-v">{view.top_p}</span></div>
          <div className="meta-row"><span className="meta-k">Provider</span><span className="meta-v"><code>{view.provider}</code></span></div>
        </div>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, mb: 0.5 }}>
          JSON persistido en BD
        </Typography>
        <CodeMirrorPanel
          key={open ? `jconfig-${tipo}` : "jconfig-closed"}
          value={json}
          readOnly
          json
          minHeight="10rem"
          maxHeight="16rem"
          copyTitle="Copiar JCONFIG"
        />
      </DialogContent>
    </Dialog>
  );
}
