import { getMaterialUI } from "../../core/platform.ts";
import { ICON_BY_TIPO } from "./constants.ts";
import { PromptInstructionDot } from "./PromptInstructionDot.jsx";

const { Tabs, Tab } = getMaterialUI();

export function PromptsSqlTree({ instruccionKeys, prompts, activeTab, onActiveTabChange, dragOver, onDragEnter, onDragLeave, onDragOverZone, onDrop, children }) {
  return (
    <div
      className={`prompt-tabs-layout${dragOver ? " prompt-tabs-layout--drop-active" : ""}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOverZone}
      onDrop={onDrop}
    >
      {dragOver && (
        <div className="prompt-drop-overlay" aria-hidden>
          <iconify-icon icon="mdi:file-upload-outline" width="1.6em" height="1.6em" />
          <span>Suelta <code>PROMPT_*.md</code> o <code>PROMPT_*.txt</code> aquí</span>
        </div>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, v) => onActiveTabChange(v)}
        orientation="vertical"
        variant="scrollable"
        scrollButtons="auto"
        className="prompt-tabs prompt-tabs--vertical"
        sx={{
          flex: "0 0 12.5rem",
          width: "12.5rem",
          minWidth: "11rem",
          maxWidth: "14rem",
          flexShrink: 0,
          alignSelf: "stretch",
        }}
        slotProps={{
          list: {
            sx: {
              flexDirection: "column",
              alignItems: "stretch",
            },
          },
          scrollButtons: {
            sx: { width: "100%", minHeight: 0, height: 20, maxHeight: 20, p: 0, px: 0, flex: "0 0 auto" },
          },
        }}
      >
        {instruccionKeys.map((tipo) => (
            <Tab
              key={tipo}
              label={(
                <span className="tab-label">
                  <iconify-icon icon={ICON_BY_TIPO[tipo] || "mdi:file-document-outline"} width="0.9em" height="0.9em" />
                  <span>{tipo.replace(/_/g, " ")}</span>
                  <PromptInstructionDot tipo={tipo} prompts={prompts} showWhenEmpty="none" />
                </span>
              )}
            />
          ))}
      </Tabs>

      {children}
    </div>
  );
}
