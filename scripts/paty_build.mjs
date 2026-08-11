// Build script para los bundles de isa-patyia modificados.
// Genera los .js y CSS en dist/ a partir de src/. Jobs en paralelo.

import { build, transform } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(__dirname, "..");
const DIST = path.join(FRONTEND, "dist");
const TMP_DIR = path.join("C:\\Users\\JAGUDELOE\\AppData\\Local\\Temp\\paty_build_out");

const JS_JOBS = [
  ["src/js/api/todosApi.ts", "js/api/todosApi.js"],
  ["src/js/api/sessionApi.ts", "js/api/sessionApi.js"],
  ["src/js/core/patyia.ts", "js/core/patyia.js"],
  ["src/js/core/patyia-jwt.ts", "js/core/patyia-jwt.js"],
  ["src/js/core/platform.ts", "js/core/platform.js"],
  ["src/js/core/theme.ts", "js/core/theme.js"],
  ["src/js/api/apiClient.ts", "js/api/apiClient.js"],
  ["src/js/api/patyiaChatApi.ts", "js/api/patyiaChatApi.js"],
  ["src/js/api/systemConfigApi.ts", "js/api/systemConfigApi.js"],
  ["src/js/app/App.jsx", "js/app/App.js"],
  ["src/js/tools/ChatTool.jsx", "js/tools/ChatTool.js"],
  ["src/js/tools/PermisosKanban.jsx", "js/tools/PermisosKanban.js"],
  ["src/js/tools/permisosKanbanShared.js", "js/tools/permisosKanbanShared.js"],
  ["src/js/tools/permAccessFromMap.js", "js/tools/permAccessFromMap.js"],
  ["src/js/tools/PermisosPanel.jsx", "js/tools/PermisosPanel.js"],
  ["src/js/tools/UserPermissionsSummaryDialog.jsx", "js/tools/UserPermissionsSummaryDialog.js"],
  ["src/js/tools/promptsSql/usePromptsSqlTool.ts", "js/tools/promptsSql/usePromptsSqlTool.js"],
  ["src/js/components/IssTargetSwitch.jsx", "js/components/IssTargetSwitch.js"],
  ["src/js/components/CopySysValuesModal.jsx", "js/components/CopySysValuesModal.js"],
  ["src/js/api/sysValuesCopy.ts", "js/api/sysValuesCopy.js"],
  ["src/js/api/portalJwtApi.ts", "js/api/portalJwtApi.js"],
  ["src/js/api/openaiStatusApi.ts", "js/api/openaiStatusApi.js"],
  ["src/js/core/urlState.ts", "js/core/urlState.js"],
  ["src/js/core/viewAsRole.ts", "js/core/viewAsRole.js"],
  ["src/js/ui/ConvLogWebView.jsx", "js/ui/ConvLogWebView.js"],
];

const CSS_JOBS = [
  "app.css",
  "boot-loading.css",
  "chat-staging.css",
  "neon-glass-bridge.css",
  "theme.css",
  "todos-staging.css",
  "welcome-home.css",
];

async function compileOne(srcRel, distRel) {
  const src = path.join(FRONTEND, srcRel);
  const out = path.join(DIST, distRel);
  await fs.mkdir(path.dirname(out), { recursive: true });

  const tmpFile = path.join(TMP_DIR, `${process.pid}-${path.basename(out)}`);
  await fs.mkdir(TMP_DIR, { recursive: true });

  await build({
    entryPoints: [src],
    bundle: true,
    format: "esm",
    target: "es2020",
    platform: "browser",
    outfile: tmpFile,
    // .jsx también con tsx: algunos .jsx llevan genéricos TS (useState<T>) y
    // el loader "jsx" los deja como comparación en runtime → "0 is not iterable".
    loader: { ".ts": "tsx", ".tsx": "tsx", ".js": "jsx", ".jsx": "tsx" },
    jsx: "automatic",
    jsxImportSource: "react",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: false,
    legalComments: "none",
    logLevel: "warning",
    // Los bundles del proyecto usan importmap para React, Material UI, iconify.
    // Mantenerlos como import URLs externas, igual que los otros bundles.
    external: [
      "react", "react-dom", "react-dom/client", "react/jsx-runtime",
      "@emotion/react", "@emotion/styled",
      "@mui/material",
      "@mui/system",
      "@mui/utils",
      "@mui/base",
      "@mui/private-theming",
      "@mui/styled-engine",
      "iconify-icon",
    ],
  });

  const content = await fs.readFile(tmpFile, "utf8");
  await fs.unlink(tmpFile).catch(() => {});

  await fs.writeFile(out, content, "utf8");
  console.log(`OK  ${srcRel}  →  ${distRel}  (${content.length.toLocaleString()} bytes)`);
}

async function minifyCss(name) {
  const src = path.join(FRONTEND, "src/css", name);
  const out = path.join(DIST, "css", name);
  await fs.mkdir(path.dirname(out), { recursive: true });
  const input = await fs.readFile(src, "utf8");
  const { code } = await transform(input, { loader: "css", minify: true });
  await fs.writeFile(out, code, "utf8");
  console.log(`OK  src/css/${name}  →  css/${name}  (${code.length.toLocaleString()} bytes)`);
}

const jsResults = await Promise.all(
  JS_JOBS.map(async ([src, dist]) => {
    try {
      await compileOne(src, dist);
      return { ok: true, src };
    } catch (e) {
      console.error(`FAIL ${src}: ${e.message}`);
      return { ok: false, src, error: e };
    }
  }),
);

const cssResults = await Promise.all(
  CSS_JOBS.map(async (name) => {
    try {
      await minifyCss(name);
      return { ok: true, src: name };
    } catch (e) {
      console.error(`FAIL css/${name}: ${e.message}`);
      return { ok: false, src: name, error: e };
    }
  }),
);

const failed = [...jsResults, ...cssResults].filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n❌ Build falló: ${failed.length} job(s).`);
  process.exit(1);
}

console.log(`\n✅ Build completo (${JS_JOBS.length} JS + ${CSS_JOBS.length} CSS, paralelo).`);
