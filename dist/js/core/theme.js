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
var getReact, getMaterialUI;
var init_platform = __esm({
  "src/js/core/platform.ts"() {
    init_patyia();
    getReact = () => window.ISAFront.getReact();
    getMaterialUI = () => window.ISAFront.getMaterialUI();
  }
});

// src/js/core/theme.ts
init_platform();
var THEME_LS_KEY = "isa-patyia:theme";
function readStoredThemeMode() {
  try {
    const v = localStorage.getItem(THEME_LS_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
  }
  return "dark";
}
function applyThemeModeToDocument(mode = readStoredThemeMode()) {
  document.documentElement.setAttribute("data-mui-color-scheme", mode);
  document.documentElement.style.colorScheme = mode;
  return mode;
}
var LS_KEY = THEME_LS_KEY;
var NEON = { blue: "#1e90ff", cyan: "#00e5ff", purple: "#6366f1", magenta: "#a855f7", darkBg: "#060d18", darkPaper: "rgba(15, 28, 48, 0.82)", lightBg: "#eef4ff", lightPaper: "rgba(255, 255, 255, 0.88)" };
var compactFormDefaults = {
  MuiTextField: { defaultProps: { size: "small", margin: "dense" } },
  MuiFormControl: { defaultProps: { size: "small", margin: "dense" } },
  MuiAutocomplete: { defaultProps: { size: "small" } },
  MuiSelect: { defaultProps: { size: "small" } },
  MuiInputBase: { defaultProps: { size: "small" } }
};
var componentOverrides = {
  ...compactFormDefaults,
  MuiCssBaseline: {
    styleOverrides: {
      body: ({ theme }) => theme.palette.mode === "dark" ? {
        background: "linear-gradient(180deg, #060d18 0%, #0a1628 45%, #0f172a 100%)",
        backgroundAttachment: "fixed"
      } : {
        background: "linear-gradient(180deg, #eef4ff 0%, #f5f9ff 50%, #f8fafc 100%)",
        backgroundAttachment: "fixed"
      }
    }
  },
  MuiButton: {
    styleOverrides: {
      root: { textTransform: "none", borderRadius: 10 },
      containedPrimary: ({ theme }) => theme.palette.mode === "light" ? {
        boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
        "&:hover": { boxShadow: "0 2px 6px rgba(15,23,42,0.12)" }
      } : {
        boxShadow: "0 0 20px rgba(30,144,255,0.35)",
        "&:hover": { boxShadow: "0 0 28px rgba(30,144,255,0.55)" }
      }
    }
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: "none",
        transition: "color 0.2s, text-shadow 0.2s",
        "&.Mui-selected": { textShadow: "0 0 14px rgba(30,144,255,0.55)" }
      }
    }
  },
  MuiTabs: {
    styleOverrides: {
      indicator: {
        height: 3,
        borderRadius: 2,
        background: "linear-gradient(90deg, #1e90ff, #6366f1)",
        boxShadow: "0 0 14px rgba(30,144,255,0.75)"
      }
    }
  },
  MuiToggleButton: { styleOverrides: { root: { textTransform: "none" } } },
  MuiChip: {
    styleOverrides: {
      root: {
        "&.MuiChip-sizeSmall": { height: "auto", minHeight: 28, py: "3px" }
      },
      label: { paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2 },
      icon: { marginLeft: 8 },
      outlined: {
        borderColor: "rgba(30,144,255,0.35)",
        backdropFilter: "blur(6px)"
      }
    }
  },
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }) => theme.palette.mode === "dark" ? {
        background: "linear-gradient(90deg, rgba(6,13,24,0.97) 0%, rgba(15,35,70,0.94) 48%, rgba(35,18,65,0.97) 100%)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(30,144,255,0.28)",
        boxShadow: "0 4px 32px rgba(30,144,255,0.12), inset 0 -1px 0 rgba(0,229,255,0.06)",
        color: theme.palette.text.primary
      } : {
        background: "linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(240,247,255,0.96) 50%, rgba(248,250,255,0.98) 100%)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(30,144,255,0.18)",
        boxShadow: "0 4px 24px rgba(30,144,255,0.08)",
        color: theme.palette.text.primary
      }
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: "none",
        ...theme.palette.mode === "dark" ? {
          backdropFilter: "blur(10px)"
        } : {}
      }),
      outlined: ({ theme }) => theme.palette.mode === "dark" ? {
        background: "linear-gradient(145deg, rgba(15,34,54,0.78), rgba(11,18,32,0.9))",
        borderColor: "rgba(30,144,255,0.22)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)"
      } : {
        background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(240,247,255,0.88))",
        borderColor: "rgba(30,144,255,0.16)",
        boxShadow: "0 8px 28px rgba(15,23,42,0.06)"
      }
    }
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: "box-shadow 0.2s, background-color 0.2s",
        "&:hover": { boxShadow: "0 0 12px rgba(30,144,255,0.25)" }
      }
    }
  },
  MuiTooltip: {
    defaultProps: {
      disableInteractive: true
    },
    styleOverrides: {
      popper: {
        pointerEvents: "none"
      },
      tooltip: {
        pointerEvents: "none"
      }
    }
  }
};
function initialMode() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
  }
  return "dark";
}
function makeNeonTheme(mode) {
  const { createTheme } = getMaterialUI();
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: NEON.blue, light: "#63b3ff", dark: "#1565c0" },
      secondary: { main: NEON.purple, light: "#818cf8", dark: "#4f46e5" },
      info: { main: NEON.cyan },
      background: dark ? { default: NEON.darkBg, paper: "#0f2236" } : { default: NEON.lightBg, paper: "#ffffff" },
      text: dark ? { primary: "#e8f4ff", secondary: "#9ec5eb" } : { primary: "#0a2540", secondary: "#4a6278" },
      divider: dark ? "rgba(30,144,255,0.18)" : "rgba(10,37,64,0.1)"
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"IBM Plex Sans", "Space Grotesk", system-ui, sans-serif',
      h4: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700, letterSpacing: -0.5 },
      h5: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 700 },
      h6: { fontFamily: '"Space Grotesk", "IBM Plex Sans", sans-serif', fontWeight: 600 }
    },
    components: componentOverrides
  });
}
function useThemeMode() {
  const { useState, useCallback, useMemo, useEffect } = getReact();
  const [mode, setMode] = useState(initialMode);
  useEffect(() => {
    applyThemeModeToDocument(mode);
  }, [mode]);
  const toggle = useCallback(() => {
    setMode((m) => {
      const n = m === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(LS_KEY, n);
      } catch {
      }
      applyThemeModeToDocument(n);
      return n;
    });
  }, []);
  const theme = useMemo(() => makeNeonTheme(mode), [mode]);
  return { mode, toggle, theme };
}
export {
  LS_KEY,
  NEON,
  THEME_LS_KEY,
  applyThemeModeToDocument,
  makeNeonTheme,
  readStoredThemeMode,
  useThemeMode
};
