/**
 * Fase 2: renames 100%, css, dist, docs, vendor, tests.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const MIN = 100;
const MAX = 200;
const MSG_FILE = path.join(ROOT, ".git", "COMMIT_EDITMSG_AGENT.txt");

function sh(cmd) {
  return execSync(cmd, {
    encoding: "utf8",
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  }).trim();
}

function shAllow(cmd) {
  try {
    return sh(cmd);
  } catch (e) {
    return String(e.stdout || "") + String(e.stderr || "");
  }
}

function stagedInfo() {
  const num = shAllow("git diff --cached --numstat");
  let total = 0;
  for (const line of num.split(/\r?\n/).filter(Boolean)) {
    const m = line.match(/^(\d+|-)\s+(\d+|-)\s+/);
    if (!m) continue;
    const ins = m[1] === "-" ? 0 : parseInt(m[1], 10);
    const del = m[2] === "-" ? 0 : parseInt(m[2], 10);
    total += ins + del;
  }
  const names = shAllow("git diff --cached --name-only")
    .split(/\r?\n/)
    .filter(Boolean);
  const hasRename = /rename |create mode|delete mode/.test(
    shAllow("git diff --cached --summary"),
  );
  return { total, names, hasChange: names.length > 0 || hasRename };
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p.split(path.sep).join("/"));
  }
  return acc;
}

function bodyFor(tema) {
  return (
    "Se reorganizó el front del asistente para unificar orígenes y artefactos de publicación, " +
    "incluyendo " +
    tema +
    ". Quien desarrolla encuentra rutas predecibles y menos riesgo de publicar una versión desalineada. " +
    "La experiencia de uso se mantiene: el asistente sigue disponible con la misma lógica de negocio, " +
    "mientras el flujo de entrega gana claridad, trazabilidad y menor fricción al revisar o desplegar " +
    "cambios en entornos de prueba y producción."
  );
}

function commit(title, body) {
  fs.writeFileSync(MSG_FILE, title + "\n\n" + body + "\n", "utf8");
  sh(`git -c i18n.commitEncoding=utf-8 commit -F "${MSG_FILE.replace(/\\/g, "/")}"`);
}

function unstage() {
  shAllow("git reset HEAD");
}

function titleFeat() {
  return "feat: El front del asistente publica desde una estructura unificada y más clara";
}

function titleFix() {
  return "fix: Se alinea la publicación del front del asistente con la estructura vigente";
}

let commits = 0;

function doCommit(tema, title = titleFeat()) {
  const info = stagedInfo();
  if (!info.hasChange) {
    unstage();
    return false;
  }
  // Si hay solo renames (0 líneas) o está en rango / archivo grande solo → ok
  commit(title, bodyFor(tema));
  commits++;
  console.log(
    `COMMIT#${commits} lines=${info.total} files=${info.names.length} :: ${tema}`,
  );
  return true;
}

// --- 1) Remaining src/js + matching js deletes (pure renames) ---
const remainingSrc = walk("src").filter((f) => {
  // only if untracked or modified - check status
  return true;
});

// Get porcelain untracked under src
const porcelain = shAllow("git status --porcelain")
  .split(/\r?\n/)
  .filter(Boolean);
const untrackedSrc = porcelain
  .filter((l) => l.startsWith("?? src/"))
  .map((l) => l.slice(3).replace(/\/$/, ""));

// Expand directories
const srcItems = [];
for (const u of untrackedSrc) {
  if (u.endsWith("/")) {
    for (const f of walk(u.replace(/\/$/, ""))) srcItems.push(f);
  } else if (fs.existsSync(u) && fs.statSync(u).isDirectory()) {
    for (const f of walk(u)) srcItems.push(f);
  } else {
    srcItems.push(u);
  }
}

console.log("remaining src files:", srcItems.length);

function oldPathFor(neu) {
  // src/js/foo -> js/foo ; src/css/foo -> css/foo
  if (neu.startsWith("src/js/")) return neu.slice(4); // js/...
  if (neu.startsWith("src/css/")) return neu.slice(4); // css/...
  if (neu.startsWith("src/json/")) return null;
  return null;
}

let batch = [];
let batchLines = 0;

function flushBatch(tema) {
  if (!batch.length) return;
  unstage();
  for (const f of batch) {
    shAllow(`git add -- "${f}"`);
    const old = oldPathFor(f);
    if (old) shAllow(`git add -u -- "${old}"`);
  }
  doCommit(tema);
  batch = [];
  batchLines = 0;
}

for (const f of srcItems) {
  unstage();
  shAllow(`git add -- "${f}"`);
  const old = oldPathFor(f);
  if (old) shAllow(`git add -u -- "${old}"`);
  const info = stagedInfo();
  unstage();
  const lines = Math.max(info.total, info.hasChange ? 1 : 0);

  if (info.total > MAX) {
    flushBatch("módulos pendientes del front");
    unstage();
    shAllow(`git add -- "${f}"`);
    if (old) shAllow(`git add -u -- "${old}"`);
    doCommit(f);
    continue;
  }

  if (batch.length && batchLines + lines > MAX) {
    flushBatch("módulos pendientes del front");
  }
  batch.push(f);
  batchLines += lines;
}
flushBatch("módulos y estilos pendientes del front");

// --- 2) Remaining js/ deletes without src ---
const jsDeletes = porcelain
  .filter((l) => /^ D js\/|^D  js\//.test(l))
  .map((l) => l.slice(3));
console.log("orphan js deletes:", jsDeletes.length);
batch = [];
batchLines = 0;
for (const f of jsDeletes) {
  unstage();
  shAllow(`git add -u -- "${f}"`);
  const info = stagedInfo();
  unstage();
  if (info.total > MAX) {
    flushBatch("limpieza de rutas antiguas");
    unstage();
    shAllow(`git add -u -- "${f}"`);
    doCommit(f, titleFix());
    continue;
  }
  if (batch.length && batchLines + info.total > MAX) {
    // custom flush for deletes
    unstage();
    for (const x of batch) shAllow(`git add -u -- "${x}"`);
    doCommit("limpieza de rutas antiguas del front", titleFix());
    batch = [];
    batchLines = 0;
  }
  batch.push(f);
  batchLines += Math.max(info.total, 1);
}
if (batch.length) {
  unstage();
  for (const x of batch) shAllow(`git add -u -- "${x}"`);
  doCommit("limpieza de rutas antiguas del front", titleFix());
}

// --- 3) css deletes leftover (if src/css already added) ---
const cssDeletes = porcelain
  .filter((l) => /^ D css\/|^D  css\//.test(l))
  .map((l) => l.slice(3));
if (cssDeletes.length) {
  unstage();
  for (const f of cssDeletes) shAllow(`git add -u -- "${f}"`);
  doCommit("estilos migrados a la estructura unificada", titleFeat());
}

// --- 4) dist/ add + _dist/ delete (file by file / batches) ---
const distFiles = walk("dist");
console.log("dist files:", distFiles.length);

batch = [];
batchLines = 0;
for (const f of distFiles) {
  const old = f.startsWith("dist/") ? "_dist/" + f.slice(5) : null;
  unstage();
  shAllow(`git add -- "${f}"`);
  if (old) shAllow(`git add -u -- "${old}"`);
  const info = stagedInfo();
  unstage();
  const lines = Math.max(info.total, 1);

  if (info.total > MAX) {
    if (batch.length) {
      unstage();
      for (const x of batch) {
        shAllow(`git add -- "${x.f}"`);
        if (x.old) shAllow(`git add -u -- "${x.old}"`);
      }
      doCommit("artefactos de publicación del front");
      batch = [];
      batchLines = 0;
    }
    unstage();
    shAllow(`git add -- "${f}"`);
    if (old) shAllow(`git add -u -- "${old}"`);
    doCommit(f);
    continue;
  }
  if (batch.length && batchLines + lines > MAX) {
    unstage();
    for (const x of batch) {
      shAllow(`git add -- "${x.f}"`);
      if (x.old) shAllow(`git add -u -- "${x.old}"`);
    }
    doCommit("artefactos de publicación del front");
    batch = [];
    batchLines = 0;
  }
  batch.push({ f, old });
  batchLines += lines;
}
if (batch.length) {
  unstage();
  for (const x of batch) {
    shAllow(`git add -- "${x.f}"`);
    if (x.old) shAllow(`git add -u -- "${x.old}"`);
  }
  doCommit("artefactos de publicación del front");
}

// orphan _dist deletes
const distLeft = shAllow("git status --porcelain")
  .split(/\r?\n/)
  .filter((l) => /_dist\//.test(l) && /^.?D/.test(l))
  .map((l) => l.slice(3));
console.log("orphan _dist deletes:", distLeft.length);
batch = [];
batchLines = 0;
for (const f of distLeft) {
  unstage();
  shAllow(`git add -u -- "${f}"`);
  const info = stagedInfo();
  unstage();
  if (info.total > MAX) {
    if (batch.length) {
      unstage();
      for (const x of batch) shAllow(`git add -u -- "${x}"`);
      doCommit("retiro de artefactos antiguos de publicación", titleFix());
      batch = [];
      batchLines = 0;
    }
    unstage();
    shAllow(`git add -u -- "${f}"`);
    doCommit(f, titleFix());
    continue;
  }
  if (batch.length && batchLines + info.total > MAX) {
    unstage();
    for (const x of batch) shAllow(`git add -u -- "${x}"`);
    doCommit("retiro de artefactos antiguos de publicación", titleFix());
    batch = [];
    batchLines = 0;
  }
  batch.push(f);
  batchLines += Math.max(info.total, 1);
}
if (batch.length) {
  unstage();
  for (const x of batch) shAllow(`git add -u -- "${x}"`);
  doCommit("retiro de artefactos antiguos de publicación", titleFix());
}

// --- 5) vendor front-shared dist + deletes _dist ---
unstage();
shAllow("git add -f -- vendor/front-shared/dist");
shAllow("git add -u -- vendor/front-shared/_dist");
shAllow("git add -- vendor/front-shared/boot-helper.mjs");
shAllow(
  "git add -- vendor/front-shared/isa/js/core/config/cdn-assets.js vendor/front-shared/isa/js/index.js vendor/front-shared/isa/js/ui/kits/kit-assets.js vendor/front-shared/isa/js/ui/kits/neon-glass/lazy-entry.js",
);
doCommit("dependencias compartidas del front alineadas al bundle publicado");

// --- 6) vendor/cdn ---
unstage();
shAllow("git add -- vendor/cdn");
{
  const info = stagedInfo();
  if (info.total > MAX) {
    // split by file
    unstage();
    const cdnFiles = walk("vendor/cdn");
    let b = [];
    let bl = 0;
    for (const f of cdnFiles) {
      unstage();
      shAllow(`git add -- "${f}"`);
      const inf = stagedInfo();
      unstage();
      if (inf.total > MAX) {
        if (b.length) {
          unstage();
          for (const x of b) shAllow(`git add -- "${x}"`);
          doCommit("librerías del front actualizadas en el vendor local");
          b = [];
          bl = 0;
        }
        unstage();
        shAllow(`git add -- "${f}"`);
        doCommit(f);
        continue;
      }
      if (b.length && bl + inf.total > MAX) {
        unstage();
        for (const x of b) shAllow(`git add -- "${x}"`);
        doCommit("librerías del front actualizadas en el vendor local");
        b = [];
        bl = 0;
      }
      b.push(f);
      bl += Math.max(inf.total, 1);
    }
    if (b.length) {
      unstage();
      for (const x of b) shAllow(`git add -- "${x}"`);
      doCommit("librerías del front actualizadas en el vendor local");
    }
  } else if (info.hasChange) {
    doCommit("librerías del front actualizadas en el vendor local");
  }
}

// --- 7) scripts (exclude agent helper) ---
unstage();
shAllow("git add -- scripts/paty_build.mjs scripts/vendor_bundle_build.mjs");
shAllow("git add -u -- paty_build.mjs vendor_bundle_build.mjs");
doCommit("scripts de compilación y empaquetado del front");

// --- 8) tests ---
unstage();
shAllow("git add -- tests");
doCommit("pruebas automatizadas del front del asistente");

// --- 9) docs/config: llm alone if >200 ---
unstage();
shAllow("git add -- llm.md");
{
  const info = stagedInfo();
  if (info.hasChange) doCommit("documentación técnica del front del asistente");
}

unstage();
shAllow(
  "git add -- .github/workflows/deploy-front.yml .gitignore DEPLOY.md README.md index.html tsconfig.json",
);
shAllow("git add -u -- index.json");
doCommit("configuración y guías de despliegue del front del asistente");

// leftover anything
const left = shAllow("git status --porcelain")
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((l) => !l.includes("_agent_commit_batches"));
console.log("leftover:", left.length);
if (left.length) {
  console.log(left.slice(0, 40).join("\n"));
  // adopt leftovers
  unstage();
  for (const l of left) {
    const p = l.slice(3);
    if (l.startsWith("??") || l[1] === "M" || l[0] === "M") shAllow(`git add -f -- "${p}"`);
    else if (l.includes("D")) shAllow(`git add -u -- "${p}"`);
  }
  doCommit("ajustes finales de la migración del front del asistente");
}

console.log("TOTAL new commits this phase:", commits);
console.log(
  "status lines:",
  shAllow("git status --porcelain").split(/\r?\n/).filter(Boolean).length,
);
