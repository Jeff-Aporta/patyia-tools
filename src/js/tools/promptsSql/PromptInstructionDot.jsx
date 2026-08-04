import { hasPendingChanges } from "./helpers.ts";

/** Punto de estado — misma lógica en tabs verticales y tabla de mapeo. */
export function PromptInstructionDot({ tipo, prompts, row, showWhenEmpty = "dot" }) {
  const p = prompts[tipo];
  const has = Boolean(p?.body?.trim());
  const dirty = hasPendingChanges(p) || row?.status === "tipo_desconocido";

  if (!has) {
    if (showWhenEmpty === "none") return null;
    return (
      <span
        className="tab-dot tab-dot--empty"
        title="Sin contenido"
        aria-hidden
      />
    );
  }

  let title = "Sincronizado";
  if (row?.status === "tipo_desconocido") title = "Tipo no catalogado";
  else if (hasPendingChanges(p)) title = "Cambios pendientes de guardar";

  return (
    <span
      className={`tab-dot${dirty ? " tab-dot--dirty" : ""}`}
      title={title}
      aria-hidden
    />
  );
}

/** @deprecated usar PromptInstructionDot */
export function MapeoRowDot(props) {
  return <PromptInstructionDot {...props} showWhenEmpty="dot" />;
}
