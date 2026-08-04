/** Pantalla de carga viewport — misma tarjeta que index.html / front-boot-block.mjs */

export const BOOT_WATERMARK_URL =
  "https://pub-1c290cc606c8478899f5764899278571.r2.dev/brand/logo-insoft.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appBootIcon(): string {
  const meta = document.querySelector('meta[name="app-icon"]');
  return meta?.getAttribute("content")?.trim() || "mdi:robot-happy-outline";
}

export function appBootName(): string {
  const meta = document.querySelector('meta[name="application-name"]');
  return meta?.getAttribute("content")?.trim() || "ISA PatyIA";
}

export function appBootLabel(suffix = "…"): string {
  return `Cargando ${appBootName()}${suffix}`;
}

export type BootShimmerHtmlOpts = {
  icon?: string;
  title?: string;
  viewport?: boolean;
  watermark?: boolean;
};

/** Markup estático (doc-viewer, reemplazo de #root). */
export function bootShimmerHtml(
  label: string,
  opts: BootShimmerHtmlOpts = {},
): string {
  const icon = escapeHtml(opts.icon || appBootIcon());
  const text = escapeHtml(label);
  const title = escapeHtml(opts.title || appBootName());
  const viewport = opts.viewport !== false;
  const className = viewport ? "isa-app-boot isa-app-boot--viewport" : "isa-app-boot";
  const watermark = opts.watermark !== false
    ? `<img class="isa-app-boot-watermark" src="${BOOT_WATERMARK_URL}" alt="" aria-hidden="true" decoding="async" />`
    : "";

  return (
    `<div class="${className}">` +
    `<div class="isa-app-boot__mesh" aria-hidden="true"></div>` +
    `<div class="isa-app-boot__card" role="status" aria-live="polite" aria-busy="true">` +
    `<div class="isa-app-boot__icon-wrap">` +
    `<iconify-icon icon="${icon}" width="1.85em" height="1.85em"></iconify-icon>` +
    `</div>` +
    `<p class="isa-app-boot__title">${title}</p>` +
    `<p class="isa-app-boot__label">${text}</p>` +
    `<div class="isa-app-boot__bar" aria-hidden="true"><span class="isa-app-boot__bar-fill"></span></div>` +
    `</div>` +
    watermark +
    `</div>`
  );
}

export type BootShimmerProps = {
  label?: string;
  title?: string;
  icon?: string;
  viewport?: boolean;
  watermark?: boolean;
};

export function createBootShimmer(React: typeof window.React) {
  return function BootShimmer(props: BootShimmerProps) {
    const label = props.label || appBootLabel();
    const title = props.title || appBootName();
    const icon = props.icon || appBootIcon();
    const viewport = props.viewport !== false;
    const showWatermark = props.watermark !== false;
    const className = viewport ? "isa-app-boot isa-app-boot--viewport" : "isa-app-boot";

    return React.createElement(
      "div",
      { className },
      React.createElement("div", { className: "isa-app-boot__mesh", "aria-hidden": "true" }),
      React.createElement(
        "div",
        {
          className: "isa-app-boot__card",
          role: "status",
          "aria-live": "polite",
          "aria-busy": "true",
        },
        React.createElement(
          "div",
          { className: "isa-app-boot__icon-wrap" },
          React.createElement("iconify-icon", {
            icon,
            width: "1.85em",
            height: "1.85em",
          }),
        ),
        React.createElement("p", { className: "isa-app-boot__title" }, title),
        React.createElement("p", { className: "isa-app-boot__label" }, label),
        React.createElement(
          "div",
          { className: "isa-app-boot__bar", "aria-hidden": "true" },
          React.createElement("span", { className: "isa-app-boot__bar-fill" }),
        ),
      ),
      showWatermark
        ? React.createElement("img", {
          className: "isa-app-boot-watermark",
          src: BOOT_WATERMARK_URL,
          alt: "",
          "aria-hidden": "true",
          decoding: "async",
        })
        : null,
    );
  };
}

/** Reemplaza UI.Loading del namespace ISA con la tarjeta viewport. */
export function registerBootShimmer(ns: string): void {
  const React = window.React;
  const bag = (window as Record<string, { UI?: Record<string, unknown> }>)[ns];
  if (!React || !bag?.UI) return;
  bag.UI.Loading = createBootShimmer(React);
}
