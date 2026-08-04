// Rebuild del bundle vendor front-shared (dist/isa/js/index.min.js) tras editar isa/js.
import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";

const FRONTEND = "C:\\ContaPyme\\Personal\\apps\\isa-patyia\\frontend";
const SRC = path.join(FRONTEND, "vendor", "front-shared", "isa", "js", "index.js");
const OUT = path.join(FRONTEND, "vendor", "front-shared", "dist", "isa", "js", "index.min.js");
const TMP = path.join(process.env.TEMP || "C:\\Temp", "isa-front-index.min.js");

await build({
  entryPoints: [SRC],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  platform: "browser",
  legalComments: "none",
  outfile: TMP,
  logLevel: "warning",
  // JSX clásico contra los globals (window.React / MaterialUI) — igual que el bundle original.
  jsx: "transform",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  // Ignorar el tsconfig.json del frontend (jsx react-jsx) — el vendor usa globals.
  tsconfigRaw: "{}",
});

const content = await fs.readFile(TMP, "utf8");
await fs.writeFile(OUT, content, "utf8");
await fs.unlink(TMP).catch(() => {});
console.log(`OK index.min.js (${content.length.toLocaleString()} bytes)`);
