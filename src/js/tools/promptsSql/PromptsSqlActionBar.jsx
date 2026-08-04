import { getMaterialUI } from "../../core/platform.ts";
import { ButtonIconify } from "../../ui/shared.jsx";

const { Stack, Chip, CircularProgress } = getMaterialUI();

export function PromptsSqlActionBar({ filledCount, instruccionKeysLength, loadBusy, actionBusy, hasLocalChanges, pendingTiposLength, canPublish, saveTitle, importTitle, fileInputRef, onFileInput, onImportClick, onDiscardAll, onSaveAll }) {
  return (
    <div className="panel-head prompts-tool-head">
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: "auto" }}>
        {loadBusy && <CircularProgress size={14} />}

        <Chip
          className="panel-head-count-chip isa-neon-glass-chip"
          size="small"
          label={`${filledCount}/${instruccionKeysLength}`}
          color={filledCount ? "primary" : "default"}
          variant="outlined"
        />

        <ButtonIconify
          icon="mdi:folder-open-outline"
          title={importTitle}
          onClick={onImportClick}
          disabled={actionBusy || loadBusy || !canPublish}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,text/markdown,text/plain"
          multiple
          hidden
          onChange={onFileInput}
        />

        <ButtonIconify
          icon="mdi:delete-outline"
          title="Descartar borradores y restaurar desde la base"
          onClick={onDiscardAll}
          disabled={actionBusy || loadBusy || !hasLocalChanges}
        />
        <ButtonIconify
          variant="primary"
          icon="mdi:content-save"
          title={actionBusy ? "Guardando…" : saveTitle}
          onClick={onSaveAll}
          disabled={actionBusy || loadBusy || !pendingTiposLength || !canPublish}
          busy={actionBusy}
        />
      </Stack>
    </div>
  );
}
