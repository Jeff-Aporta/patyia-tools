import { getMaterialUI, getReact, UI, getGlass } from "../core/platform.ts";
import { ButtonIconify } from "../ui/shared.jsx";
import { PromptBodyEditor } from "../ui/PromptBodyEditor.jsx";
import { JsonCodeEditor } from "../editors/jsonEditor.jsx";
import { GlassDialog, GlassDialogHeader, glassDialogContentSx, glassDialogActionsSx } from "../ui/GlassDialog.jsx";
import { fetchPromptsOperativosConfig, putPromptsOperativosConfig, requireAppSession } from "../api/systemConfigApi.ts";
import { Session, toastError, toastSuccess } from "../core/platform.ts";
import * as SessionApi from "../api/sessionApi.ts";
import { unitIntervalFieldProps } from "./promptsSql/helpers.ts";
import { DEFAULT_MODELO_OPERATIVO } from "./configOpenAi.ts";
import {
  REASONING_EFFORT_OPTIONS, contentLinesToText, textToContentLines,
  listPromptKeys, modelAllowsSampling,
  parseAndValidateJsonText, prettyJson, readPromptAccordionExpandState, validatePromptsOperativosConfig, stripLegacyMetaKeys, writePromptAccordionExpandState,
  readPromptSkeletonCount, writePromptSkeletonCount,
} from "./configPromptsOperativos.ts";
import { useConfigFieldPersist } from "./configFieldPersist.ts";

const { useState, useEffect, useCallback, useRef } = getReact();
const {
  Typography, TextField, Stack, Alert, Box, Skeleton, Paper,
  FormControl, InputLabel, Select, MenuItem,
  DialogContent, DialogActions, Button, Tooltip,
} = getMaterialUI();
const { Icon } = UI;

const PROMPT_LABELS = {
  generarTitulo: "Generar título",
  generarResumenTicket: "Resumen ticket",
};
const PROMPT_ICONS = {
  generarTitulo: "mdi:format-title",
  generarResumenTicket: "mdi:ticket-confirmation-outline",
};
const PROMPT_DEF_FIELD_SX = {
  width: 118,
  minWidth: 108,
  flex: "0 0 auto",
  "& .MuiInputBase-root": { minHeight: 34, height: 34 },
  "& .MuiOutlinedInput-input, & .MuiSelect-select": {
    py: "6px !important",
    fontSize: "0.8125rem",
    fontWeight: 600,
  },
  "& .MuiInputLabel-root": { fontSize: "0.72rem" },
  "& .MuiInputLabel-shrink": { transform: "translate(14px, -7px) scale(0.85)" },
  "& .MuiFormHelperText-root": { display: "none" },
};

function promptLabel(key) {
  return PROMPT_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function promptIcon(key) {
  return PROMPT_ICONS[key] || "mdi:robot-outline";
}

/** Accordion estilo GlassSection — header con franja acento + body glass. */
function GlassPromptAccordion({ title, icon, expanded, onToggle, accent, children, skeleton = false }) {
  const { useGlassColors, glassCardSx, glassHeaderSx, glassInnerSx, NEON_COLORS } = getGlass();
  const c = useGlassColors();
  const accentColor = accent || NEON_COLORS.cyan;

  function handleKey(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle?.();
    }
  }

  return (
    <Paper
      variant="outlined"
      elevation={0}
      className={[
        "isa-glass-section",
        "config-prompt-accordion",
        expanded ? "config-prompt-accordion--expanded" : "",
        skeleton ? "config-prompt-accordion--skeleton" : "",
      ].filter(Boolean).join(" ")}
      sx={glassCardSx(c, {
        tone: expanded ? "purple" : "default",
        accent: accentColor,
        hover: !expanded,
        mb: 0,
        radius: "14px",
      })}
    >
      <Box
        className="isa-glass-section__head config-prompt-accordion__summary"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={handleKey}
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1,
          cursor: "pointer",
          userSelect: "none",
          ...glassHeaderSx(c, accentColor),
          ...glassInnerSx(c, "blue"),
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: "100%" }}>
          <Box
            className="isa-glass-section__icon config-prompt-accordion__icon"
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
              color: "#fff",
              boxShadow: c.dark ? `0 4px 12px ${accentColor}44` : "none",
            }}
          >
            <Icon icon={icon || "mdi:robot-outline"} size={16} />
          </Box>
          {skeleton ? (
            <Skeleton variant="text" width="46%" height={22} sx={{ flex: 1 }} />
          ) : (
            <Typography
              variant="subtitle2"
              className="config-prompt-accordion__title"
              sx={{ fontWeight: 700, letterSpacing: -0.15, color: c.text, flex: 1, minWidth: 0 }}
            >
              {title}
            </Typography>
          )}
          <Box
            className="config-prompt-accordion__chevron"
            sx={{
              display: "flex",
              color: c.muted,
              transition: "transform 0.2s ease",
              transform: expanded ? "rotate(180deg)" : "none",
            }}
            aria-hidden
          >
            <Icon icon="mdi:chevron-down" size={20} />
          </Box>
        </Stack>
      </Box>
      {expanded ? (
        <Box
          className="isa-glass-section__body config-prompt-accordion__details"
          sx={{ px: { xs: 1.5, sm: 2 }, pt: 1.5, pb: 2, color: c.text }}
        >
          {children}
        </Box>
      ) : null}
    </Paper>
  );
}

function ConfigPromptsSkeleton({ count, expandState }) {
  const { NEON_COLORS } = getGlass();
  const expandedKey = Object.keys(expandState ?? {}).find((k) => expandState[k]);
  return (
    <Stack spacing={1.25} className="config-prompt-accordions config-prompt-accordions--skeleton" aria-busy="true" aria-label="Cargando prompts operativos">
      {Array.from({ length: count }, (_, i) => {
        const expanded = expandedKey ? i === 0 : false;
        return (
          <GlassPromptAccordion
            key={i}
            title=""
            icon="mdi:robot-outline"
            expanded={expanded}
            skeleton
            accent={i % 2 ? NEON_COLORS.purple : NEON_COLORS.cyan}
            onToggle={() => {}}
          >
            {expanded ? (
              <Stack spacing={2} className="config-prompt-def">
                <Stack direction="row" spacing={2} className="config-prompt-def-fields">
                  <Skeleton variant="rounded" height={40} sx={{ width: 200, flex: "0 0 auto" }} />
                  <Skeleton variant="rounded" height={40} sx={{ width: 200, flex: "0 0 auto" }} />
                  <Skeleton variant="rounded" height={40} sx={{ width: 200, flex: "0 0 auto" }} />
                </Stack>
                <Skeleton variant="rounded" height={140} />
                <Skeleton variant="rounded" height={140} />
              </Stack>
            ) : null}
          </GlassPromptAccordion>
        );
      })}
    </Stack>
  );
}

function OperativosJsonModal({ open, initial, readOnly, operativeModel, onClose, onApply }) {
  const [json, setJson] = useState(initial);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (open) { setJson(initial); setErrors([]); }
  }, [open, initial]);

  function validateNow(text) {
    const r = parseAndValidateJsonText(text, { operativeModel });
    setErrors(r.errors);
    return r;
  }

  function apply() {
    const r = validateNow(json);
    if (!r.ok) return;
    onApply?.(r.normalized);
    onClose();
  }

  const canApply = parseAndValidateJsonText(json, { operativeModel }).ok;

  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth paperMaxWidth={960}
      header={<GlassDialogHeader icon="mdi:code-json" title="JSON" accent="#6366f1" onClose={onClose} />}>
      <DialogContent dividers sx={glassDialogContentSx({ p: 0, minHeight: 380 })}>
        {errors.length ? (
          <Alert severity="warning" sx={{ m: 1.5, mb: 0 }}>
            <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2 }}>
              {errors.map((e) => <li key={e}><Typography variant="body2">{e}</Typography></li>)}
            </Stack>
          </Alert>
        ) : null}
        <Box className="permisos-json-modal-editor config-prompts-json-modal" sx={{ minHeight: 340, p: 1 }}>
          <JsonCodeEditor value={json} onChange={readOnly ? undefined : (v) => { setJson(v); validateNow(v); }} readOnly={readOnly} placeholder="{}" fullPageTitle="prompts_operativos" />
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

function MessageCard({ role, body, bodyLines, canEdit, promptKey, onChange }) {
  const { NEON_COLORS } = getGlass();
  const icon = role === "system" ? "mdi:cog-outline" : role === "user" ? "mdi:account-outline" : "mdi:robot-outline";
  const title = role === "system" ? "Sistema" : role === "user" ? "Usuario" : "Asistente";
  const accent = role === "system" ? NEON_COLORS.purple : NEON_COLORS.cyan;
  const isUser = role === "user";

  const avatar = (
    <Box
      className="config-prompt-msg__avatar"
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
        color: "#fff",
        boxShadow: `0 0 12px ${accent}44`,
      }}
      aria-hidden
    >
      <Icon icon={icon} size={15} />
    </Box>
  );

  return (
    <Box
      className={`config-prompt-msg config-prompt-msg--chat config-prompt-msg--${role}`}
      style={{ ["--stripe-accent"]: accent }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-end"
        justifyContent={isUser ? "flex-end" : "flex-start"}
        className="config-prompt-msg__row"
      >
        {!isUser ? avatar : null}
        <Box className="config-prompt-msg__bubble">
          <Typography component="div" className="config-prompt-msg__role" variant="caption">
            {title}
          </Typography>
          <Box className="config-prompt-msg__editor">
            <PromptBodyEditor
              body={body}
              bodyLines={bodyLines}
              canEdit={canEdit}
              onChange={onChange}
              tipo={`${promptKey}_${role}`}
              title={`${promptLabel(promptKey)} · ${title}`}
              placeholder="Escriba el prompt…"
            />
          </Box>
        </Box>
        {isUser ? avatar : null}
      </Stack>
    </Box>
  );
}

function PromptDefEditor({ promptKey, def, canEdit, operativeModel, onChange }) {
  const msgs = Array.isArray(def?.messages) ? def.messages : [];
  const systemIdx = msgs.findIndex((m) => m.role === "system");
  const userIdx = msgs.findIndex((m) => m.role === "user");
  const systemMsg = systemIdx >= 0 ? msgs[systemIdx] : { role: "system", content: [] };
  const userMsg = userIdx >= 0 ? msgs[userIdx] : { role: "user", content: [] };
  const tempAllowed = modelAllowsSampling(operativeModel);

  function patchDef(patch) {
    onChange({ ...def, ...patch });
  }

  function patchMessage(role, idx, text) {
    const next = msgs.map((m, i) => (i === idx ? { ...m, content: textToContentLines(text) } : m));
    if (idx < 0) next.push({ role, content: textToContentLines(text) });
    onChange({ ...def, messages: next });
  }

  return (
    <Stack spacing={1.5} className="config-prompt-def">
      <Stack direction="row" spacing={1} useFlexGap flexWrap="nowrap" alignItems="center" className="config-prompt-def-fields">
        <FormControl size="small" sx={PROMPT_DEF_FIELD_SX} disabled={!canEdit}>
          <InputLabel id={`prompt-reasoning-${promptKey}-label`} shrink>Razonamiento</InputLabel>
          <Select labelId={`prompt-reasoning-${promptKey}-label`} label="Razonamiento" value={def?.reasoning_effort || "low"} onChange={(e) => patchDef({ reasoning_effort: e.target.value })}>
            {REASONING_EFFORT_OPTIONS.map((o) => <MenuItem key={o} value={o} dense>{o}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField size="small" label="Máx. tokens" type="number" disabled={!canEdit}
          value={def?.max_completion_tokens ?? ""} sx={PROMPT_DEF_FIELD_SX}
          onChange={(e) => patchDef({ max_completion_tokens: e.target.value === "" ? undefined : Number(e.target.value) })}
          slotProps={{ htmlInput: { min: 1, max: 128000, step: 1 } }} />
        <Tooltip title={tempAllowed ? undefined : "No aplica a este modelo"} placement="top">
          <Box component="span" sx={PROMPT_DEF_FIELD_SX}>
            <TextField size="small" fullWidth label="Temperatura" disabled={!canEdit || !tempAllowed}
              {...unitIntervalFieldProps(def?.temperatura, 0.4, (v) => patchDef({ temperatura: v }))} />
          </Box>
        </Tooltip>
      </Stack>
      <Box className="config-prompt-thread">
        <MessageCard role="system" promptKey={promptKey} canEdit={canEdit}
          body={contentLinesToText(systemMsg.content)} bodyLines={systemMsg.content}
          onChange={(text) => patchMessage("system", systemIdx, text)} />
        <MessageCard role="user" promptKey={promptKey} canEdit={canEdit}
          body={contentLinesToText(userMsg.content)} bodyLines={userMsg.content}
          onChange={(text) => patchMessage("user", userIdx, text)} />
      </Box>
    </Stack>
  );
}

export function ConfigPromptsOperativosPanel({ onNeedLogin, ConfigFormSection, operativeModel, conversationModel: _conversationModel }) {
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [config, setConfig] = useState({});
  const [saved, setSaved] = useState({});
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const { saveGenRef, beginSave, endSave, fieldDisabled } = useConfigFieldPersist();
  const [jsonOpen, setJsonOpen] = useState(false);
  const [expandState, setExpandState] = useState(() => readPromptAccordionExpandState());
  const [skeletonCount, setSkeletonCount] = useState(() => readPromptSkeletonCount());

  const opModel = String(operativeModel ?? DEFAULT_MODELO_OPERATIVO).trim() || DEFAULT_MODELO_OPERATIVO;
  const promptKeys = listPromptKeys(config);
  const { NEON_COLORS } = getGlass();

  useEffect(() => { writePromptAccordionExpandState(expandState); }, [expandState]);

  function isExpanded(key) {
    if (Object.prototype.hasOwnProperty.call(expandState, key)) return !!expandState[key];
    return false;
  }

  function handleToggleExpand(key, on) {
    setExpandState((prev) => ({ ...prev, [key]: on }));
  }

  // soft: revalida en segundo plano sin skeleton (auth / refresh). Skeleton solo en la 1ª carga.
  const load = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    try {
      const { config: cfg, canEdit: ce } = await fetchPromptsOperativosConfig();
      const data = stripLegacyMetaKeys(cfg ?? {});
      const keys = listPromptKeys(data);
      writePromptSkeletonCount(keys.length);
      setSkeletonCount(keys.length);
      setConfig(data);
      setSaved(data);
      setCanEdit(SessionApi.isViewingAsRole()
        ? SessionApi.canEditPromptsOperativos()
        : !!ce || SessionApi.canEditPromptsOperativos());
    } catch (e) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    // Modelos OpenAI llegan por props (operativeModel); no refetch ni skeleton al guardar openai.
    const onAuth = () => { void load({ soft: true }); };
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
    const v = validatePromptsOperativosConfig(cfg, { operativeModel: opModel, strict: false });
    if (!v.ok) { toastError(v.errors.join(" · ")); endSave(gen); return; }
    try {
      const res = await putPromptsOperativosConfig(v.normalized);
      if (gen !== saveGenRef.current) return;
      const next = validatePromptsOperativosConfig(stripLegacyMetaKeys(res), { operativeModel: opModel, strict: false }).normalized;
      savedRef.current = next;
      setSaved(next);
      setConfig(next);
      toastSuccess("Guardado");
      const keys = listPromptKeys(next);
      writePromptSkeletonCount(keys.length);
      setSkeletonCount(keys.length);
    } catch (e) {
      if (gen !== saveGenRef.current) return;
      setConfig(savedRef.current);
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      endSave(gen);
    }
  }

  function updatePrompt(key, def) {
    const next = { ...config, [key]: def };
    setConfig(next);
    void persist(next, beginSave([key]), [key]);
  }

  return (
    <ConfigFormSection
      className="config-form-section--prompts"
      icon={<Icon icon="mdi:robot-outline" size={20} />}
      title="Prompts operativos"
      description="Tareas automáticas: título, resumen de ticket y similares."
      actions={(
        <>
          <ButtonIconify icon="mdi:code-json" title="JSON" onClick={() => setJsonOpen(true)} />
          <ButtonIconify icon="mdi:refresh" title="Recargar" onClick={() => void load({ soft: true })} busy={loading} />
        </>
      )}
    >
      {loading ? (
        <ConfigPromptsSkeleton count={skeletonCount} expandState={expandState} />
      ) : (
        <Stack spacing={1.25} className="config-prompt-accordions">
          {promptKeys.map((key, idx) => {
            const accent = idx % 2 ? NEON_COLORS.purple : NEON_COLORS.cyan;
            return (
              <GlassPromptAccordion
                key={key}
                title={promptLabel(key)}
                icon={promptIcon(key)}
                accent={accent}
                expanded={isExpanded(key)}
                onToggle={() => handleToggleExpand(key, !isExpanded(key))}
              >
                <PromptDefEditor
                  promptKey={key}
                  def={config[key]}
                  canEdit={!fieldDisabled(canEdit, key)}
                  operativeModel={opModel}
                  onChange={(def) => updatePrompt(key, def)}
                />
              </GlassPromptAccordion>
            );
          })}
        </Stack>
      )}
      <OperativosJsonModal open={jsonOpen} initial={prettyJson(config)} readOnly={!canEdit} operativeModel={opModel}
        onClose={() => setJsonOpen(false)} onApply={(parsed) => {
          const fields = Object.keys(parsed);
          setConfig(parsed);
          setJsonOpen(false);
          void persist(parsed, beginSave(fields), fields);
        }} />
    </ConfigFormSection>
  );
}
