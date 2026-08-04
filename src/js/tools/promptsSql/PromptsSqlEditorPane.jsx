import { getMaterialUI } from "../../core/platform.ts";
import { ButtonIconify } from "../../ui/shared.jsx";
import { PromptBodyEditor } from "../../ui/PromptBodyEditor.jsx";
import * as PromptsSql from "../../api/promptsSql.ts";
import { MapeoRowDot } from "./PromptInstructionDot.jsx";
import {
  formatCharsTokens,
  jconfigEqual,
  unitIntervalFieldProps,
} from "./helpers.ts";

const {
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  TextField, Stack, FormControl, Select, MenuItem,
} = getMaterialUI();

export function PromptsSqlBodyEditor({
  activeTipo, activePrompt, canEdit, editBlockReason, loadBusy, onBodyChange, onPersist, editorOpenSignal,
}) {
  return (
    <div className="tab-editor">
      <PromptBodyEditor
        body={activePrompt?.body || ""}
        canEdit={canEdit}
        editBlockReason={editBlockReason}
        onChange={onBodyChange}
        onPersist={onPersist}
        placeholder={`Contenido de ${activePrompt?.archivo || `PROMPT_${activeTipo}.md`}…`}
        tipo={activeTipo}
        title={activeTipo.replace(/_/g, " ")}
        loading={loadBusy}
        editorOpenSignal={editorOpenSignal}
      />
    </div>
  );
}

export function PromptsSqlMapeoTable({
  activeTipo, instruccionKeys, prompts, mapped, canEdit, loggedIn, loadBusy,
  modelSelectOptions, onSelectTipo, onRowDoubleClick, onUpdateConfig, onOpenJconfig, onConfirmResetConfig,
}) {
  return (
      <div className="prompt-mapeo-block">
        <TableContainer className="prompt-mapeo-scroll custom-scrollbar">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Instrucción</TableCell>
                <TableCell>Chars | Tokens</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>temperature</TableCell>
                <TableCell>top_p</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {instruccionKeys.map((tipo) => {
                const p = prompts[tipo];
                const jc = p?.jconfig || PromptsSql.parseJconfig(null);
                const modelValue = String(jc.model ?? "").trim() || PromptsSql.DEFAULT_JCONFIG.model;
                const row = mapped.find((r) => r.tipo === tipo) || {
                  tipo,
                  archivo: `PROMPT_${tipo}.md`,
                  chars: (p?.body || "").length,
                  status: p?.body?.trim() ? "ok" : "sin_mapeo",
                };
                const stopRowEvent = (e) => e.stopPropagation();
                const atDefaultConfig = jconfigEqual(jc, PromptsSql.DEFAULT_JCONFIG);

                return (
                  <TableRow
                    key={tipo}
                    hover
                    selected={tipo === activeTipo}
                    onClick={() => onSelectTipo(tipo)}
                    onDoubleClick={() => {
                      if (!canEdit || loadBusy) return;
                      onSelectTipo(tipo);
                      onRowDoubleClick?.(tipo);
                    }}
                    sx={{ cursor: "pointer" }}
                    title={canEdit && !loadBusy ? "Doble clic para editar" : undefined}
                  >
                    <TableCell>
                      <span className="prompt-mapeo-tipo">
                        <MapeoRowDot tipo={tipo} prompts={prompts} row={row} />
                        <code>{tipo}</code>
                      </span>
                    </TableCell>

                    <TableCell className="prompt-mapeo-metric">
                      {formatCharsTokens(p?.body)}
                    </TableCell>

                    <TableCell onClick={stopRowEvent} onDoubleClick={stopRowEvent}>
                      <FormControl size="small" sx={{ minWidth: 132 }} onClick={stopRowEvent} disabled={!canEdit}>
                        <Select
                          value={modelValue}
                          onChange={(e) => onUpdateConfig(tipo, { model: e.target.value })}
                          disabled={!canEdit}
                          MenuProps={{ disableScrollLock: true }}
                          sx={{ fontSize: "0.72rem", "& .MuiSelect-select": { py: "3px", px: 0.6, minHeight: "0 !important" } }}
                        >
                          {modelSelectOptions.map((id) => (
                            <MenuItem key={id} value={id} sx={{ fontSize: "0.72rem" }}>{id}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell onClick={stopRowEvent} onDoubleClick={stopRowEvent}>
                      <TextField
                        {...unitIntervalFieldProps(
                          jc.temperature,
                          PromptsSql.DEFAULT_JCONFIG.temperature,
                          (v) => onUpdateConfig(tipo, { temperature: v }),
                        )}
                        disabled={!canEdit}
                      />
                    </TableCell>

                    <TableCell onClick={stopRowEvent} onDoubleClick={stopRowEvent}>
                      <TextField
                        {...unitIntervalFieldProps(
                          jc.top_p,
                          PromptsSql.DEFAULT_JCONFIG.top_p,
                          (v) => onUpdateConfig(tipo, { top_p: v }),
                        )}
                        disabled={!canEdit}
                      />
                    </TableCell>

                    <TableCell align="center" className="prompt-mapeo-actions" onClick={stopRowEvent} onDoubleClick={stopRowEvent}>
                      <Stack direction="row" spacing={0.25} justifyContent="center" useFlexGap>
                        <ButtonIconify
                          icon="mdi:code-json"
                          title="Ver JCONFIG (author, fmod, chars, tokens…)"
                          onClick={() => onOpenJconfig(tipo)}
                        />
                        {loggedIn && (
                          <ButtonIconify
                            icon="mdi:backup-restore"
                            title={`Restablecer modelo (${PromptsSql.DEFAULT_JCONFIG.model}), temp (${PromptsSql.DEFAULT_JCONFIG.temperature}) y top_p (${PromptsSql.DEFAULT_JCONFIG.top_p})`}
                            onClick={() => onConfirmResetConfig(tipo)}
                            disabled={!canEdit || atDefaultConfig}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
  );
}
