var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// src/js/core/patyia.ts
function avatarBgFromName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return AVATAR_BG_PALETTE[h % AVATAR_BG_PALETTE.length];
}
function buildUserAvatarUrl(name, size = 72) {
  const label = String(name ?? "").trim() || "Usuario";
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";
  const bg = avatarBgFromName(label.toLowerCase());
  const half = size / 2;
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${half}" cy="${half}" r="${half}" fill="#${bg}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
var PATYIA_ISS_URL, PATYIA_ISS_PROD_URL, PATYIA_ISS_LOCAL, PATYIA_ISS_LOCAL_API, PATYIA_ISS_PROD_API, PATYIA_ISS_STAGING_API, AVATAR_BG_PALETTE;
var init_patyia = __esm({
  "src/js/core/patyia.ts"() {
    window.ISAFront.migrateLegacyGatewayKeys?.({ "jeff:gateway-local": "", "patyia-apptools:gateway-local": "", "patyia-apptools:lab-local": "" });
    PATYIA_ISS_URL = "https://ayudascp-ia-staging.azurewebsites.net";
    PATYIA_ISS_PROD_URL = "https://ayudascp-ia.azurewebsites.net";
    PATYIA_ISS_LOCAL = "http://127.0.0.1:8802";
    PATYIA_ISS_LOCAL_API = `${PATYIA_ISS_LOCAL}/api`;
    PATYIA_ISS_PROD_API = `${PATYIA_ISS_PROD_URL}/api`;
    PATYIA_ISS_STAGING_API = `${PATYIA_ISS_URL}/api`;
    AVATAR_BG_PALETTE = [
      "1e90ff",
      "0ea5e9",
      "14b8a6",
      "22c55e",
      "84cc16",
      "eab308",
      "f97316",
      "ef4444",
      "ec4899",
      "a855f7",
      "6366f1",
      "64748b"
    ];
    try {
      window.ISAFront.buildUserAvatarUrl = buildUserAvatarUrl;
    } catch {
    }
  }
});

// src/js/core/platform.ts
var bridge, UI, getReact, getMaterialUI;
var init_platform = __esm({
  "src/js/core/platform.ts"() {
    init_patyia();
    bridge = () => window.ISAFront.createPlatformBridge("ISA");
    UI = {
      get Icon() {
        return bridge().UI.Icon;
      },
      get TargetSwitch() {
        return bridge().UI.TargetSwitch;
      },
      get ThemeSwitch() {
        return bridge().UI.ThemeSwitch;
      },
      get useRealtimeStatus() {
        return bridge().UI.useRealtimeStatus;
      },
      get RealtimeStatusDot() {
        return bridge().UI.RealtimeStatusDot;
      },
      get Loading() {
        return bridge().UI.Loading;
      },
      get ErrorBox() {
        return bridge().UI.ErrorBox;
      },
      get LoginGate() {
        return bridge().UI.LoginGate;
      },
      get LoginButton() {
        return bridge().UI.LoginButton;
      }
    };
    getReact = () => window.ISAFront.getReact();
    getMaterialUI = () => window.ISAFront.getMaterialUI();
  }
});

// src/js/tools/roleCanonicalMeta.js
function canonicalRoleMeta(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  return CANONICAL_ROLE_META[key] ?? null;
}
var CANONICAL_ROLE_META;
var init_roleCanonicalMeta = __esm({
  "src/js/tools/roleCanonicalMeta.js"() {
    CANONICAL_ROLE_META = {
      AUDITOR: {
        namedisplay: "Auditor",
        descripcion: "Ve conversaciones de todos; chatea solo en las propias"
      },
      ADMN: {
        namedisplay: "Admn ISA-Paty",
        descripcion: "Administraci\xF3n PatyIA \u2014 sin acceso total de desarrollo"
      },
      DEVISS: {
        namedisplay: "Dev Lead ISS",
        descripcion: "L\xEDder de desarrollo \u2014 acceso total"
      },
      USR: {
        namedisplay: "Usuario",
        descripcion: "Acceso b\xE1sico de sesi\xF3n"
      }
    };
  }
});

// src/js/tools/UserPermissionsSummaryDialog.jsx
init_platform();

// src/js/tools/permisosForm.js
var FLAG_DEFS = [
  { key: "*", label: "Acceso total", hint: "Wildcard \u2014 anula el resto de restricciones de ruta." },
  { key: "impersonate", label: "Suplantar chat", hint: "Actuar como otro usuario en conversaciones." },
  { key: "manage_permissions", label: "Gestionar permisos", hint: "CRUD de dbo.SYS_USR_PERMISSIONS (DEVISS)." }
];
var FLAG_KEYS = new Set(FLAG_DEFS.map((f) => f.key));
function roleNamedisplay(permisos) {
  const d = permisos?.namedisplay;
  return d != null && String(d).trim() ? String(d).trim() : "";
}
function userRoles(permisos) {
  const r = permisos?.roles;
  return Array.isArray(r) ? r.map((x) => String(x).trim().toUpperCase()).filter(Boolean) : [];
}

// src/js/tools/permisosKanbanShared.js
init_roleCanonicalMeta();
function permEntryKey(entry) {
  return String(entry?.iusuario ?? entry?.ientity ?? "").trim();
}
function roleNameFromEntry(entry) {
  return permEntryKey(entry).toUpperCase().replace(/^ROLE:/i, "");
}
function formatRoleTitle(roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  if (key === "USR") return "Usuario";
  if (key === "ADMN") return "Admn";
  if (key === "DEVISS") return "Dev ISS";
  if (key === "AUDITOR") return "Auditor";
  return key;
}
function roleTitleFromEntry(entry) {
  const roleName = roleNameFromEntry(entry);
  const canon = canonicalRoleMeta(roleName);
  if (canon?.namedisplay) return canon.namedisplay;
  const namedisplay = roleNamedisplay(entry?.permisos);
  const formatted = formatRoleTitle(roleName);
  if (!namedisplay) return formatted;
  if (formatted.length > namedisplay.length) return formatted;
  return namedisplay;
}

// src/js/ui/GlassDialog.jsx
init_platform();
import { jsx, jsxs } from "react/jsx-runtime";
function isaLoginSurface() {
  const fs = globalThis.ISAFront || {};
  return {
    loginDialogProps: fs.loginDialogProps,
    loginDialogBackdropSx: fs.loginDialogBackdropSx,
    loginCardSx: fs.loginCardSx,
    glassCardSx: fs.glassCardSx,
    loginHeaderBandSx: fs.loginHeaderBandSx,
    loginIconBoxSx: fs.loginIconBoxSx,
    loginHeaderTitleSx: fs.loginHeaderTitleSx,
    GLASS_CARD_CLASS: fs.GLASS_CARD_CLASS || "isa-glass-card"
  };
}
var PAPER_MAX = { xs: 440, sm: 560, md: 920, lg: 1080 };
function glassBackdropSx() {
  const fn = isaLoginSurface().loginDialogBackdropSx;
  return fn?.() ?? {
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    backgroundColor: "rgba(11,18,32,0.55)"
  };
}
function glassPaperProps(maxWidth, paperClassName = "") {
  const { loginCardSx, glassCardSx, GLASS_CARD_CLASS } = isaLoginSurface();
  const maxPx = PAPER_MAX[maxWidth] ?? PAPER_MAX.md;
  return {
    elevation: 0,
    className: `isa-login-card ${GLASS_CARD_CLASS} isa-glass-dialog__paper ${paperClassName}`.trim(),
    sx: loginCardSx?.({ maxWidth: maxPx, m: { xs: 1, sm: 1.5 } }) ?? glassCardSx?.({ maxWidth: maxPx, m: { xs: 1, sm: 1.5 } }) ?? { maxWidth: maxPx, m: { xs: 1, sm: 1.5 } }
  };
}
function resolveGlassDialogProps({
  open,
  onClose,
  maxWidth = "md",
  fullWidth = true,
  fullScreen = false,
  paperMaxWidth,
  paperSx,
  paperClassName = "",
  slotProps,
  ...rest
} = {}) {
  const { loginDialogProps } = isaLoginSurface();
  const paper = glassPaperProps(maxWidth, paperClassName);
  if (paperMaxWidth) paper.sx = { ...paper.sx, maxWidth: paperMaxWidth };
  if (paperSx) paper.sx = { ...paper.sx, ...paperSx };
  if (fullScreen) {
    paper.sx = {
      ...paper.sx,
      m: 0,
      margin: 0,
      maxWidth: "100%",
      width: "100%",
      height: "100%",
      maxHeight: "100dvh",
      borderRadius: 0,
      border: "none",
      boxShadow: "none"
    };
  }
  const shared = {
    open,
    onClose,
    maxWidth: fullScreen ? false : maxWidth,
    fullWidth,
    fullScreen,
    scroll: "paper",
    className: `isa-login-dialog isa-glass-dialog${fullScreen ? " isa-glass-dialog--fullscreen" : ""}`,
    slotProps: {
      ...slotProps || {},
      backdrop: {
        ...slotProps?.backdrop || {},
        sx: { ...glassBackdropSx(), ...slotProps?.backdrop?.sx || {} }
      }
    },
    PaperProps: paper,
    ...rest
  };
  if (!loginDialogProps) return shared;
  return loginDialogProps(shared);
}
function glassDialogContentSx(extra = {}) {
  return {
    p: 0,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    position: "relative",
    borderTop: 0,
    ...extra
  };
}
function glassDialogActionsSx(extra = {}) {
  return {
    px: { xs: 2, sm: 2.5 },
    py: 1.5,
    borderTop: 1,
    borderColor: (t) => t.palette.mode === "dark" ? "rgba(99,102,241,0.22)" : "divider",
    bgcolor: (t) => t.palette.mode === "dark" ? "rgba(15,23,42,0.32)" : "rgba(248,250,252,0.85)",
    justifyContent: "flex-end",
    ...extra
  };
}
function GlassDialogHeader({ icon = "mdi:information-outline", title, subtitle, accent = "#1e90ff", onClose, closeAutoFocus = false }) {
  const { Box: Box2, Typography: Typography2, IconButton, Stack: Stack2 } = getMaterialUI();
  const { Icon } = UI;
  const { loginHeaderBandSx, loginIconBoxSx, loginHeaderTitleSx } = isaLoginSurface();
  const bandSx = loginHeaderBandSx?.(accent) ?? {
    px: { xs: 2, sm: 2.5 },
    py: 2,
    borderBottom: 1,
    borderColor: "rgba(99,102,241,0.25)",
    background: `linear-gradient(90deg, ${accent}44, rgba(99,102,241,0.12) 45%, transparent 75%)`,
    borderLeft: 4,
    borderLeftColor: accent
  };
  const iconSx = loginIconBoxSx?.(accent) ?? {
    width: 42,
    height: 42,
    borderRadius: 1.75,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
    color: "#fff"
  };
  const titleSx = loginHeaderTitleSx?.() ?? { fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.15 };
  return /* @__PURE__ */ jsxs(Box2, { className: "isa-glass-dialog__header", sx: { position: "relative", flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx(Box2, { sx: bandSx, children: /* @__PURE__ */ jsxs(Stack2, { direction: "row", spacing: 1.25, alignItems: "center", sx: { pr: onClose ? 4 : 0 }, children: [
      /* @__PURE__ */ jsx(Box2, { sx: iconSx, children: /* @__PURE__ */ jsx(Icon, { icon, size: 24 }) }),
      /* @__PURE__ */ jsxs(Box2, { sx: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx(Typography2, { variant: "h5", component: "h2", sx: titleSx, children: title }),
        subtitle ? /* @__PURE__ */ jsx(Typography2, { variant: "caption", color: "text.secondary", display: "block", sx: { mt: 0.35, lineHeight: 1.4 }, children: subtitle }) : null
      ] })
    ] }) }),
    onClose ? /* @__PURE__ */ jsx(
      IconButton,
      {
        size: "small",
        onClick: onClose,
        "aria-label": "Cerrar",
        autoFocus: closeAutoFocus,
        className: "isa-glass-dialog__close",
        sx: { position: "absolute", top: 10, right: 10 },
        children: /* @__PURE__ */ jsx(Icon, { icon: "mdi:close", size: 18 })
      }
    ) : null
  ] });
}
function GlassDialog({ children, header = null, maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps }) {
  const { Dialog } = getMaterialUI();
  const props = resolveGlassDialogProps({ maxWidth, fullWidth, fullScreen, paperMaxWidth, paperSx, paperClassName, slotProps, ...dialogProps });
  return /* @__PURE__ */ jsxs(Dialog, { ...props, children: [
    header,
    children
  ] });
}

// src/js/tools/UserPermissionsSummaryDialog.jsx
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var { Typography, Stack, Box, Chip, Divider, CircularProgress } = getMaterialUI();
var { useMemo } = getReact();
var ROLE_KEYS_OMIT = /* @__PURE__ */ new Set(["descripcion", "namedisplay", "roles", "jerarquia", "accent", "color", "icon"]);
function getRoleEntry(roles, roleName) {
  const key = String(roleName ?? "").trim().toUpperCase();
  return (roles ?? []).find((r) => String(r?.iusuario ?? "").trim().toUpperCase().replace(/^ROLE:/i, "") === key) ?? null;
}
function activeRoles(roles) {
  return (roles ?? []).filter((r) => r?.itipo !== "user" && r?.bactivo !== false);
}
function permissionValue(v) {
  if (v === true) return "allow";
  if (v && typeof v === "object") {
    if (Array.isArray(v.filter)) {
      return { kind: "filter", value: v.filter };
    }
    if (v.filter && typeof v.filter === "object") {
      return { kind: "filter", value: v.filter };
    }
    return { kind: "object", value: v };
  }
  return { kind: "other", value: v };
}
function summarizePerms(perms) {
  const allows = [];
  const filters = [];
  const others = [];
  for (const [k, v] of Object.entries(perms ?? {})) {
    if (ROLE_KEYS_OMIT.has(k)) continue;
    if (k.startsWith("__") || k === "*") {
      if (k === "*" && v === true) allows.unshift("*");
      continue;
    }
    const pv = permissionValue(v);
    if (pv === "allow") allows.push(k);
    else if (pv.kind === "filter") filters.push({ key: k, filter: pv.value });
    else others.push({ key: k, value: pv.value });
  }
  return { allows, filters, others };
}
function RoleCard({ roleName, roles }) {
  const entry = getRoleEntry(roles, roleName);
  const title = roleTitleFromEntry(entry) || roleName;
  return /* @__PURE__ */ jsx2(Box, { className: "isa-glass-card paty-permisos-summary__role", sx: { p: 1.25, borderRadius: 1.5 }, children: /* @__PURE__ */ jsxs2(Stack, { direction: "row", alignItems: "center", spacing: 0.75, children: [
    /* @__PURE__ */ jsx2(
      Chip,
      {
        size: "small",
        color: "primary",
        label: title,
        sx: { fontFamily: "monospace", fontSize: 11, fontWeight: 700 },
        title: roleName
      }
    ),
    title !== roleName ? /* @__PURE__ */ jsx2(Typography, { variant: "caption", color: "text.secondary", sx: { fontFamily: "monospace" }, children: roleName }) : null
  ] }) });
}
function PermList({ title, items, kind }) {
  if (!items.length) return null;
  return /* @__PURE__ */ jsxs2(Box, { sx: { mt: 1 }, children: [
    /* @__PURE__ */ jsxs2(Typography, { variant: "overline", color: "text.secondary", sx: { letterSpacing: 1 }, children: [
      title,
      " (",
      items.length,
      ")"
    ] }),
    /* @__PURE__ */ jsxs2(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }, children: [
      items.slice(0, kind === "filter" ? 50 : 100).map((it, i) => {
        if (kind === "filter") {
          const fSummary = Object.entries(it.filter ?? {}).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
          return /* @__PURE__ */ jsx2(
            Chip,
            {
              size: "small",
              variant: "outlined",
              color: "warning",
              label: `${it.key} \xB7 ${fSummary}`,
              title: `${it.key} \u2014 restringido a: ${fSummary}`,
              sx: { fontFamily: "monospace", fontSize: 11 }
            },
            `${it.key}-${i}`
          );
        }
        if (kind === "allow") {
          return /* @__PURE__ */ jsx2(
            Chip,
            {
              size: "small",
              color: "success",
              variant: "outlined",
              label: it,
              title: it,
              sx: { fontFamily: "monospace", fontSize: 11 }
            },
            it
          );
        }
        return /* @__PURE__ */ jsx2(
          Chip,
          {
            size: "small",
            variant: "outlined",
            label: `${it.key} \u2192 ${JSON.stringify(it.value)}`,
            title: it.key,
            sx: { fontFamily: "monospace", fontSize: 11 }
          },
          `${it.key}-${i}`
        );
      }),
      items.length > (kind === "filter" ? 50 : 100) ? /* @__PURE__ */ jsx2(Chip, { size: "small", label: `+${items.length - (kind === "filter" ? 50 : 100)} m\xE1s`, sx: { fontFamily: "monospace", fontSize: 11 } }) : null
    ] })
  ] });
}
function UserPermissionsSummaryDialog({ open, onClose, username, users, roles }) {
  const data = useMemo(() => {
    if (!open || !username) return null;
    const targetUser = (users ?? []).find((u) => String(u?.iusuario ?? "").trim().toUpperCase() === username.toUpperCase());
    if (!targetUser) return null;
    const active = activeRoles(roles);
    const directRoles = userRoles(targetUser.permisos);
    const { allows, filters, others } = summarizePerms(targetUser.permisos);
    return { targetUser, directRoles, activeRoles: active, allows, filters, others };
  }, [open, username, users, roles]);
  return /* @__PURE__ */ jsxs2(
    GlassDialog,
    {
      open,
      onClose,
      maxWidth: "md",
      fullWidth: true,
      paperClassName: "permisos-user-summary-dialog",
      header: /* @__PURE__ */ jsx2(
        GlassDialogHeader,
        {
          icon: "mdi:shield-account-outline",
          title: `Resumen de permisos \u2014 ${username || ""}`,
          subtitle: "Solo lectura \xB7 composici\xF3n en cliente \xB7 roles planos asignados",
          accent: "#1e90ff",
          onClose
        }
      ),
      children: [
        /* @__PURE__ */ jsx2(Box, { sx: { ...glassDialogContentSx(), minHeight: 360 }, children: !username ? /* @__PURE__ */ jsx2(Typography, { color: "text.secondary", children: "Sin usuario seleccionado." }) : !data ? /* @__PURE__ */ jsxs2(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [
          /* @__PURE__ */ jsx2(CircularProgress, { size: 20 }),
          /* @__PURE__ */ jsx2(Typography, { color: "text.secondary", children: "Usuario no encontrado en los datos cargados." })
        ] }) : /* @__PURE__ */ jsxs2(Fragment, { children: [
          /* @__PURE__ */ jsxs2(Box, { children: [
            /* @__PURE__ */ jsx2(Typography, { variant: "overline", color: "text.secondary", children: "Usuario" }),
            /* @__PURE__ */ jsx2(Typography, { variant: "h6", fontWeight: 700, children: data.targetUser.iusuario }),
            data.targetUser.permisos?.nombre || data.targetUser.permisos?.namedisplay ? /* @__PURE__ */ jsx2(Typography, { variant: "body2", color: "text.secondary", children: data.targetUser.permisos.nombre || data.targetUser.permisos.namedisplay }) : null
          ] }),
          /* @__PURE__ */ jsx2(Divider, { sx: { my: 1.5 } }),
          /* @__PURE__ */ jsxs2(Typography, { variant: "overline", color: "text.secondary", children: [
            "Roles asignados ",
            data.directRoles.length ? `(${data.directRoles.length})` : ""
          ] }),
          data.directRoles.length === 0 ? /* @__PURE__ */ jsx2(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 0.5 }, children: "El usuario no tiene roles asignados. Permisos efectivos = USR por defecto." }) : /* @__PURE__ */ jsx2(Stack, { spacing: 1, sx: { mt: 1 }, children: data.directRoles.map((rn) => /* @__PURE__ */ jsx2(RoleCard, { roleName: rn, roles: data.activeRoles }, rn)) }),
          /* @__PURE__ */ jsx2(Divider, { sx: { my: 1.5 } }),
          /* @__PURE__ */ jsx2(Typography, { variant: "overline", color: "text.secondary", children: "Permisos efectivos del usuario" }),
          /* @__PURE__ */ jsx2(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mt: 0.25 }, children: "Calculados a partir de sus roles directos (sin herencia jer\xE1rquica)." }),
          data.allows.length === 0 && data.filters.length === 0 && data.others.length === 0 ? /* @__PURE__ */ jsx2(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "Sin permisos materializados m\xE1s all\xE1 del USR por defecto." }) : /* @__PURE__ */ jsxs2(Fragment, { children: [
            /* @__PURE__ */ jsx2(PermList, { title: "Permitidos", items: data.allows, kind: "allow" }),
            /* @__PURE__ */ jsx2(PermList, { title: "Con filtro fijo", items: data.filters, kind: "filter" }),
            /* @__PURE__ */ jsx2(PermList, { title: "Otros", items: data.others, kind: "other" })
          ] }),
          /* @__PURE__ */ jsx2(Divider, { sx: { my: 1.5 } }),
          /* @__PURE__ */ jsx2(Typography, { variant: "caption", color: "text.secondary", children: "Los detalles completos por rol se obtienen al abrir cada columna. Este resumen es de solo lectura y se actualiza al recargar el panel." })
        ] }) }),
        /* @__PURE__ */ jsx2(Box, { sx: glassDialogActionsSx(), children: /* @__PURE__ */ jsx2(
          "button",
          {
            type: "button",
            className: "MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary MuiButton-sizeMedium MuiButton-colorPrimary",
            onClick: onClose,
            children: "Cerrar"
          }
        ) })
      ]
    }
  );
}
export {
  UserPermissionsSummaryDialog
};
