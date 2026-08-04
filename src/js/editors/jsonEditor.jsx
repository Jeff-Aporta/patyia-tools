import { CodeMirrorPanel } from "../core/platform.ts";

/** Editor JSON editable (CodeMirror compartido + copiar + pantalla completa). */
export function JsonCodeEditor({ value = "", onChange, placeholder = "", toolbarExtra = null, readOnly = false }) {
  return (
    <CodeMirrorPanel
      value={value}
      onChange={onChange}
      json
      readOnly={readOnly}
      fill
      enableFullPage
      fullPageTitle="Log JSON"
      placeholder={placeholder}
      lineWrapping={false}
      toolbarExtra={toolbarExtra}
    />
  );
}
