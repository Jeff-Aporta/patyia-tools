import { getMaterialUI, getReact, UI, getGlass } from "../core/platform.ts";
import { ButtonIconify } from "../ui/shared.jsx";
import { JsonCodeEditor } from "../editors/jsonEditor.jsx";
import { GlassDialog, GlassDialogHeader, glassDialogContentSx, glassDialogActionsSx } from "../ui/GlassDialog.jsx";
import { fetchOpenAiSystemConfig, putOpenAiSystemConfig, requireAppSession } from "../api/systemConfigApi.ts";
import { Session, toastError, toastSuccess } from "../core/platform.ts";
import * as SessionApi from "../api/sessionApi.ts";
import { PermisosPanel } from "./PermisosPanel.jsx";
import { ConfigPromptsOperativosPanel } from "./ConfigPromptsOperativosPanel.jsx";
import {
  buildDefaults, modelSelectOptions, parseAndValidateJsonText, prettyJson, toOpenAiJsonPayload, validateOpenAiConfig,
} from "./configOpenAi.ts";
import { useConfigFieldPersist } from "./configFieldPersist.ts";

const { useState, useEffect, useCallback, useMemo, useRef } = getReact();
const { Paper, Typography, TextField, Stack, Alert, Box, FormControl, InputLabel, Select, MenuItem, Tooltip, DialogContent, DialogActions, Button, Divider } = getMaterialUI();
const { Icon } = UI;

/** Sección de formulario (tab Sistema) — GlassSection con acciones en cabecera. */
function ConfigFormSection({ icon, title, description, chips, actions, footer, children, className, accent }) {
  const { useGlassColors, glassCardSx, glassHeaderSx, glassInnerSx, NEON_COLORS } = getGlass();
  const c = useGlassColors();
  const sectionAccent = accent
    ?? (className?.includes("openai") ? NEON_COLORS.purple : className?.includes("prompts") ? NEON_COLORS.cyan : NEON_COLORS.blue);
  return (
    <Paper
      variant="outlined"
      elevation={0}
      className={["isa-glass-section", "config-form-section", className].filter(Boolean).join(" ")}
      sx={glassCardSx(c, { tone: "default", accent: sectionAccent, hover: true, mb: 0, width: "100%" })}
    >
      {title ? (
        <Box
          className="isa-glass-section__head config-form-section__head"
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            ...glassHeaderSx(c, sectionAccent),
            ...glassInnerSx(c, "blue"),
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.25} sx={{ width: "100%" }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: "1 1 auto" }}>
              {icon ? (
                <Box
                  className="isa-glass-section__icon"
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${sectionAccent}, ${sectionAccent}99)`,
                    color: "#fff",
                    boxShadow: c.dark ? `0 4px 12px ${sectionAccent}44` : "none",
                  }}
                >
                  {icon}
                </Box>
              ) : null}
              <Typography variant="subtitle1" component="h3" className="config-form-section__title" sx={{ fontWeight: 700, letterSpacing: -0.2, color: c.text }}>
                {title}
              </Typography>
            </Stack>
            {actions ? (
              <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} className="config-form-section__actions" sx={{ ml: "auto" }}>{actions}</Stack>
            ) : null}
          </Stack>
        </Box>
      ) : null}
      <Box className="isa-glass-section__body config-form-section__content" sx={{ pt: 1.75, pb: 2.25, px: { xs: 2, sm: 2.5 }, color: c.text }}>
        {description ? (
          <Typography variant="body2" color="text.secondary" className="config-form-section__desc">{description}</Typography>
        ) : null}
        {chips?.length ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="config-form-section__chips" sx={{ mb: 1.15 }}>{chips}</Stack>
        ) : null}
        <Box className="config-form-section__body">{children}</Box>
        {footer}
      </Box>
    </Paper>
  );
}

function OpenAiJsonModal({ open, initial, readOnly, modelOptions, onClose, onApply }) {
  const [json, setJson] = useState(initial);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (open) { setJson(initial); setErrors([]); }
  }, [open, initial]);

  function validateNow(text) {
    const r = parseAndValidateJsonText(text, { modelOptions });
    setErrors(r.errors);
    return r;
  }

  function apply() {
    const r = validateNow(json);
    if (!r.ok) return;
    onApply?.(r.normalized);
    onClose();
  }

  const canApply = parseAndValidateJsonText(json, { modelOptions }).ok;

  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth paperMaxWidth={720}
      header={<GlassDialogHeader icon="mdi:code-json" title="OpenAI — JSON" accent="#6366f1" onClose={onClose} />}>
      <DialogContent dividers sx={glassDialogContentSx({ p: 0, minHeight: 320 })}>
        {errors.length ? (
          <Alert severity="warning" sx={{ m: 1.5, mb: 0 }}>
            <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2 }}>
              {errors.map((e) => <li key={e}><Typography variant="body2">{e}</Typography></li>)}
            </Stack>
          </Alert>
        ) : null}
        <Box className="permisos-json-modal-editor config-openai-json-modal" sx={{ minHeight: 280, p: 1 }}>
          <JsonCodeEditor value={json} onChange={readOnly ? undefined : (v) => { setJson(v); validateNow(v); }} readOnly={readOnly} placeholder="{}" fullPageTitle="openai" />
        </Box>
      </DialogContent>
      <DialogActions sx={glassDialogActionsSx()}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600 }}>{readOnly ? "Cerrar" : "Cancelar"}</Button>
        {!readOnly && onApply ? (
          <Button variant="contained" onClick={apply} disabled={!canApply} sx={{ textTransform: "none", fontWeight: 600 }}>Aplicar JSON</Button>
        ) : null}
      </DialogActions>
    </GlassDialog>
  );
}

export function ConfigTool({ onNeedLogin, pane = "sistema" }) {
  return (
    <div className="tool-grid tool-grid-config isa-tool-surface">
      <Paper className="tool-panel scroll-panel config-tool-panel" elevation={0}>
        {pane === "permisos" ? (
          <div className="panel-body config-panel-body config-panel-body--permisos custom-scrollbar">
            <PermisosPanel onNeedLogin={onNeedLogin} />
          </div>
        ) : (
          <SistemaConfigBody onNeedLogin={onNeedLogin} />
        )}
      </Paper>
    </div>
  );
}

function SistemaConfigBody({ onNeedLogin }) {
  const [openAiModels, setOpenAiModels] = useState(() => ({ modeloOperativo: buildDefaults().modeloOperativo, modeloConversacion: buildDefaults().modeloConversacion }));

  return (
    <div className="panel-body config-panel-body custom-scrollbar">
      <Box className="config-panel-inner config-panel-inner--form config-sections-stack">
        <OpenAiSection onNeedLogin={onNeedLogin} onModelsChange={setOpenAiModels} />
        <Divider className="config-form-divider" role="separator" aria-hidden="true" />
        <ConfigPromptsOperativosPanel onNeedLogin={onNeedLogin} ConfigFormSection={ConfigFormSection}
          operativeModel={openAiModels.modeloOperativo} conversationModel={openAiModels.modeloConversacion} />
      </Box>
    </div>
  );
}

function OpenAiSection({ onNeedLogin, onModelsChange }) {
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [config, setConfig] = useState(buildDefaults);
  const [saved, setSaved] = useState(buildDefaults);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const { saveGenRef, beginSave, endSave, fieldDisabled } = useConfigFieldPersist();

  const modelOptions = useMemo(() => modelSelectOptions(config.modeloOperativo, config.modeloConversacion), [config]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchOpenAiSystemConfig();
      const next = { ...buildDefaults(), ...cfg };
      setConfig(next);
      setSaved(next);
      setCanEdit(SessionApi.isViewingAsRole()
        ? SessionApi.canEditOpenAiConfig()
        : !!cfg.canEdit || SessionApi.canEditOpenAiConfig());
      onModelsChange?.({ modeloOperativo: next.modeloOperativo, modeloConversacion: next.modeloConversacion });
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [onModelsChange]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onAuth = () => { load(); };
    window.addEventListener(Session.EVENT, onAuth);
    window.addEventListener("patyia-apptools:caps-changed", onAuth);
    return () => {
      window.removeEventListener(Session.EVENT, onAuth);
      window.removeEventListener("patyia-apptools:caps-changed", onAuth);
    };
  }, [load]);

  async function persist(snapshot, gen, fields) {
    if (!requireAppSession(onNeedLogin)) { endSave(gen); return; }
    if (!canEdit) { endSave(gen); return; }
    const cfg = snapshot ?? config;
    const opts = modelSelectOptions(cfg.modeloOperativo, cfg.modeloConversacion);
    const v = validateOpenAiConfig(cfg, { modelOptions: opts });
    if (!v.ok) { toastError(v.errors.join(" · ")); endSave(gen); return; }
    try {
      await putOpenAiSystemConfig(v.normalized);
      if (gen !== saveGenRef.current) return;
      const next = { ...v.normalized, canEdit };
      savedRef.current = next;
      setSaved(next);
      setConfig(next);
      onModelsChange?.({ modeloOperativo: next.modeloOperativo, modeloConversacion: next.modeloConversacion });
      toastSuccess("Guardado");
    } catch (e) {
      if (gen !== saveGenRef.current) return;
      const prev = savedRef.current;
      setConfig(prev);
      onModelsChange?.({ modeloOperativo: prev.modeloOperativo, modeloConversacion: prev.modeloConversacion });
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      endSave(gen);
    }
  }

  function patch(p) {
    const fields = Object.keys(p);
    const next = { ...config, ...p };
    setConfig(next);
    onModelsChange?.({ modeloOperativo: next.modeloOperativo, modeloConversacion: next.modeloConversacion });
    void persist(next, beginSave(fields), fields);
  }

  return (
    <ConfigFormSection
      className="config-form-section--openai"
      icon={<Icon icon="mdi:brain" size={20} />}
      title="OpenAI"
      actions={(
        <>
          <ButtonIconify icon="mdi:code-json" title="JSON" onClick={() => setJsonOpen(true)} />
          <ButtonIconify icon="mdi:refresh" title="Recargar" onClick={load} busy={loading} />
        </>
      )}
    >
      <Box className="config-openai-fields-row" sx={{ display: "grid", gridTemplateColumns: "minmax(170px, 1.2fr) minmax(190px, 1.3fr) minmax(120px, 0.85fr)", gap: "0.65rem 0.85rem", alignItems: "start", width: "100%", maxWidth: 720, mt: 0.25 }}>
          <FormControl size="small" className="config-openai-fields-row__cell" disabled={fieldDisabled(canEdit, "modeloOperativo")}>
            <InputLabel id="config-openai-operativo-label" shrink>Operativo</InputLabel>
            <Select labelId="config-openai-operativo-label" label="Operativo" value={config.modeloOperativo} onChange={(e) => patch({ modeloOperativo: e.target.value })}>
              {modelOptions.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
            </Select>
            <Typography component="span" variant="caption" className="config-openai-fields-row__prop">modeloOperativo</Typography>
          </FormControl>
          <FormControl size="small" className="config-openai-fields-row__cell" disabled={fieldDisabled(canEdit, "modeloConversacion")}>
            <InputLabel id="config-openai-conversacion-label" shrink>Conversación</InputLabel>
            <Select labelId="config-openai-conversacion-label" label="Conversación" value={config.modeloConversacion} onChange={(e) => patch({ modeloConversacion: e.target.value })}>
              {modelOptions.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
            </Select>
            <Typography component="span" variant="caption" className="config-openai-fields-row__prop">modeloConversacion</Typography>
          </FormControl>
          <Box className="config-openai-fields-row__cell config-openai-fields-row__fragments">
            <Tooltip title="Máximo de fragmentos de documentación por consulta file_search (3–50)" placement="top">
              <TextField label="Máx. resultados" type="number" size="small" fullWidth
                value={config.max_num_results} disabled={fieldDisabled(canEdit, "max_num_results")}
                onChange={(e) => patch({ max_num_results: Math.round(Number(e.target.value)) || buildDefaults().max_num_results })}
                helperText="max_num_results"
                FormHelperTextProps={{ className: "config-openai-fields-row__prop" }}
                InputLabelProps={{ shrink: true }}
                slotProps={{ htmlInput: { min: 3, max: 50, step: 1 }, inputLabel: { shrink: true } }} />
            </Tooltip>
          </Box>
        </Box>
      <OpenAiJsonModal open={jsonOpen} initial={prettyJson(toOpenAiJsonPayload(config))} readOnly={!canEdit} modelOptions={modelOptions}
        onClose={() => setJsonOpen(false)} onApply={(parsed) => { patch(parsed); setJsonOpen(false); }} />
    </ConfigFormSection>
  );
}
