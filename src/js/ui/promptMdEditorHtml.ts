import { mdToHtml } from "../core/platform.ts";
import { PROMPT_VAR_PATTERN, repairPromptVarBraces, varToneStyleAttr } from "../core/promptVariables.ts";

function escAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** Bloques que se serializan a markdown estándar; el resto conserva HTML fuente. */
const MD_BLOCK_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "pre", "blockquote", "hr"]);
const MD_INLINE_TAGS = new Set(["strong", "b", "em", "i", "code", "a", "br", "img"]);

function preserveHtml(el: Element): string {
  return el.outerHTML;
}

export function varChipHtml(name: string, _opts: { editable?: boolean } = {}): string {
  return (
    `<span class="prompt-var-chip" contenteditable="false" data-var="${escAttr(name)}" style="${varToneStyleAttr(name)}" title="${escAttr(name)}">`
    + `<span class="prompt-var-chip__label">{{${escAttr(name)}}}</span></span>`
  );
}

/** marked (breaks:false) ignora \n simples; hard break Markdown = dos espacios + salto. */
function mdPreserveSingleLineBreaks(src: string): string {
  if (!src.includes("\n")) return src;
  return src.replace(/(?<!\n)\n(?!\n)/g, "  \n");
}

/** Sustituye {{vars}} por tokens, renderiza markdown+HTML una vez y reemplaza por chips inline. */
function renderBodyWithVarChips(body: string, opts: { editable?: boolean } = {}): string {
  const src = repairPromptVarBraces(String(body ?? ""));
  if (!src) return "";

  const placeholders: { token: string; name: string }[] = [];
  let idx = 0;
  const mdSrc = src.replace(PROMPT_VAR_PATTERN, (_m, name: string) => {
    const token = `\uE000PV${idx++}\uE001`;
    placeholders.push({ token, name });
    return token;
  });

  let html = mdToHtml(mdPreserveSingleLineBreaks(mdSrc));
  for (const { token, name } of placeholders) {
    html = html.split(token).join(varChipHtml(name, opts));
  }
  return html;
}

/** Vista previa: markdown + HTML + badges de variables inline. */
export function bodyPreviewHtml(body: string): string {
  const src = String(body ?? "");
  if (!src) return "";
  if (!src.includes("\n")) return renderBodyWithVarChips(src, { editable: false });
  return bodyPreviewHtmlFromLines(src.split("\n"));
}

/** Una fila de vista previa por ítem del array content[] (o por línea de texto). */
export function bodyPreviewHtmlFromLines(lines: unknown): string {
  if (!Array.isArray(lines) || !lines.length) return "";
  return lines.map((line) => {
    const inner = renderBodyWithVarChips(String(line ?? ""), { editable: false });
    return inner
      ? `<div class="prompt-content-line">${inner}</div>`
      : `<div class="prompt-content-line prompt-content-line--empty"><br aria-hidden="true" /></div>`;
  }).join("");
}

/** HTML editable para contenteditable (markdown/HTML renderizado + chips). */
export function bodyToEditorHtml(body: string): string {
  const html = renderBodyWithVarChips(body, { editable: true });
  return html || "<p><br></p>";
}

function varChipSource(el: HTMLElement): string {
  return el.dataset.var ? `{{${el.dataset.var}}}` : "";
}

function tableCellSource(td: Element): string {
  if ((td as HTMLElement).classList?.contains("prompt-var-chip")) {
    return varChipSource(td as HTMLElement);
  }
  return [...td.childNodes].map((n) => (n.nodeType === Node.ELEMENT_NODE ? inlineMd(n) : inlineMd(n))).join("").trim();
}

function tableHtmlToGfm(table: Element): string {
  const rowEls = [...table.querySelectorAll("tr")];
  if (!rowEls.length) return preserveHtml(table);
  const lines: string[] = [];
  const firstCells = [...rowEls[0].querySelectorAll("th,td")].map(tableCellSource);
  lines.push(`| ${firstCells.join(" | ")} |`);
  lines.push(`| ${firstCells.map(() => "---").join(" | ")} |`);
  for (let i = 1; i < rowEls.length; i += 1) {
    const cells = [...rowEls[i].querySelectorAll("th,td")].map(tableCellSource);
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}

function inlineMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.classList?.contains("prompt-var-chip")) return varChipSource(el);

  const tag = el.tagName.toLowerCase();
  const inner = () => [...el.childNodes].map(inlineMd).join("");

  if (!MD_INLINE_TAGS.has(tag)) return preserveHtml(el);

  switch (tag) {
    case "strong":
    case "b":
      return `**${inner()}**`;
    case "em":
    case "i":
      return `*${inner()}*`;
    case "code":
      return `\`${inner()}\``;
    case "a": {
      const href = el.getAttribute("href") || "";
      const text = inner();
      return href ? `[${text || href}](${href})` : text;
    }
    case "img": {
      const alt = el.getAttribute("alt") || "imagen";
      const src = el.getAttribute("src") || "";
      return src ? `![${alt}](${src})` : "";
    }
    case "br":
      return "\n";
    default:
      return preserveHtml(el);
  }
}

function blockMd(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const inner = () => [...el.childNodes].map((n) => (n.nodeType === Node.ELEMENT_NODE ? inlineMd(n) : inlineMd(n))).join("");

  if (el.classList?.contains("prompt-var-chip")) {
    return varChipSource(el as HTMLElement);
  }

  if (!MD_BLOCK_TAGS.has(tag)) {
  if (tag === "div" && el.classList.contains("md-table-wrap")) {
      const table = el.querySelector(":scope > table");
      if (table) return `${tableHtmlToGfm(table)}\n\n`;
    }
    if (tag === "table") return `${tableHtmlToGfm(el)}\n\n`;
    return `${preserveHtml(el)}\n\n`;
  }

  switch (tag) {
    case "h1":
      return `# ${inner().trim()}\n\n`;
    case "h2":
      return `## ${inner().trim()}\n\n`;
    case "h3":
      return `### ${inner().trim()}\n\n`;
    case "h4":
      return `#### ${inner().trim()}\n\n`;
    case "h5":
      return `##### ${inner().trim()}\n\n`;
    case "h6":
      return `###### ${inner().trim()}\n\n`;
    case "p":
      return `${inner()}\n\n`;
    case "li": {
      const parent = el.parentElement?.tagName.toLowerCase();
      const bullet = parent === "ol" ? "1." : "-";
      return `${bullet} ${inner().trimStart()}\n`;
    }
    case "ul":
    case "ol":
      return [...el.children].map((c) => blockMd(c)).join("") + "\n";
    case "pre": {
      const code = el.querySelector("code");
      const text = code?.textContent ?? el.textContent ?? "";
      return `\`\`\`\n${text}\n\`\`\`\n\n`;
    }
    case "blockquote":
      return inner()
        .split("\n")
        .filter(Boolean)
        .map((l) => `> ${l}`)
        .join("\n") + "\n\n";
    case "hr":
      return "---\n\n";
    case "div": {
      const children = [...el.children];
      if (
        el.attributes.length > 0
        || el.classList.length > 0
        || children.some((c) => !MD_BLOCK_TAGS.has(c.tagName.toLowerCase()))
      ) {
        return `${preserveHtml(el)}\n\n`;
      }
      return children.map((c) => blockMd(c)).join("");
    }
    default:
      return `${preserveHtml(el)}\n\n`;
  }
}

/** Serializa contenteditable → markdown/HTML fuente con {{variables}}. */
export function editorHtmlToBody(root: HTMLElement): string {
  let out = "";
  for (const node of root.childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) out += blockMd(node as Element);
    else if (node.nodeType === Node.TEXT_NODE) out += node.textContent || "";
  }
  return out.replace(/\n{3,}/g, "\n\n").trimEnd();
}

const RAW_VAR_IN_TEXT = /\{\{\s*[A-Za-z_]\w*\s*\}\}/;

/** true si hay {{var}} en texto plano aún sin convertir a chip. */
export function surfaceHasRawVarTokens(root: HTMLElement | null): boolean {
  if (!root) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest(".prompt-var-chip")) continue;
    if (RAW_VAR_IN_TEXT.test(node.textContent ?? "")) return true;
  }
  return false;
}
