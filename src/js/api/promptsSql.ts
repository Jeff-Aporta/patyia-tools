/**
 * Mapeo PROMPT_<TIPO>.md → INSTRUCCION + TDCONSULTAXINSTRUCCION (staging).
 * Portado de scripts/patyia/prompts/build-paty-prompts-sql.mjs
 */
const PATY_PROMPT_TIPOS = [
    "SALUDO_OTRO",
    "FUERA_DE_ALCANCE_TECNICO",
    "SOLICITUD_NO_PERMITIDA",
    "REQUIERE_CONTEXTO",
    "PASO_A_PASO",
    "INTERPRETACION_RESULTADO",
    "CONSULTA_NORMATIVA_NEGOCIO",
    "ASESORIA_PERSONALIZADA",
    "ERROR_TECNICO",
    "ERROR_CONFIGURACION",
    "ERROR_ACCESO",
    "ERROR_DIAN",
    "COMERCIAL",
  ];

  /** System prompts (INSTRUCCION sin TDCONSULTAXINSTRUCCION). */
  const PATY_SYSTEM_INSTRUCTIONS = [
    {
      iinstruccion: "GENERAL",
      ninstruccion: "PROMPT_GENERAL",
      archivo: "PROMPT_GENERAL.txt",
      descripcion: "Prompt general de conversación Paty (PR_GENERAL)",
      defaultModel: "gpt-5-nano",
      kind: "system",
    },
    {
      iinstruccion: "TDCONSULTA",
      ninstruccion: "PROMPT_TDCONSULTA",
      archivo: "PROMPT_TDCONSULTA.txt",
      descripcion: "Clasificador tipo de consulta (PR_TIPO_CONSULTAS)",
      defaultModel: "gpt-4.1-nano",
      kind: "system",
    },
    {
      iinstruccion: "EXTRACTOR_CONSULTAS",
      ninstruccion: "PROMPT_EXTRACTOR_CONSULTAS",
      archivo: "PROMPT_EXTRACTOR_CONSULTAS.txt",
      descripcion: "Extractor de consultas útiles del usuario (PR_EXTRACTOR_CONSULTAS)",
      defaultModel: "gpt-4.1-nano",
      kind: "system",
    },
    {
      iinstruccion: "CLASIFICADOR_MODULO",
      ninstruccion: "PROMPT_CLASIFICADOR_MODULO",
      archivo: "PROMPT_CLASIFICADOR_MODULO.txt",
      descripcion: "Clasificador de módulo ContaPyme (PR_CLASIFICADOR_MODULO)",
      defaultModel: "gpt-4.1-nano",
      kind: "system",
    },
  ];

  const DEFAULT_JCONFIG = {
    provider: "openai",
    model: "gpt-5-nano",
    temperature: 0,
    top_p: 0.85,
  };

  const INSTRUCTION_META_BY_KEY = (() => {
    const map = new Map();
    for (const meta of PATY_SYSTEM_INSTRUCTIONS) {
      map.set(meta.iinstruccion, { ...meta, kind: "system" });
    }
    for (const tipo of PATY_PROMPT_TIPOS) {
      map.set(tipo, {
        iinstruccion: tipo,
        ninstruccion: `PROMPT_${tipo}`,
        archivo: `PROMPT_${tipo}.md`,
        descripcion: `Prompt específico para tipo de consulta ${tipo}`,
        defaultModel: DEFAULT_JCONFIG.model,
        kind: "tdconsulta",
      });
    }
    return map;
  })();

  function getInstructionCatalog() {
    return [...INSTRUCTION_META_BY_KEY.values()];
  }

  function allInstructionKeys(extraKeys = []) {
    const seen = new Set();
    const out = [];
    const push = (k) => {
      const key = String(k ?? "").trim().toUpperCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(key);
    };
    for (const meta of PATY_SYSTEM_INSTRUCTIONS) push(meta.iinstruccion);
    for (const tipo of PATY_PROMPT_TIPOS) push(tipo);
    const extras = [];
    for (const k of extraKeys) {
      const key = String(k ?? "").trim().toUpperCase();
      if (key && !seen.has(key)) extras.push(key);
    }
    extras.sort((a, b) => a.localeCompare(b));
    return [...out, ...extras];
  }

  function getInstructionMeta(iinstruccion) {
    const key = String(iinstruccion ?? "").trim().toUpperCase();
    if (!key) return null;
    const known = INSTRUCTION_META_BY_KEY.get(key);
    if (known) return known;
    return {
      iinstruccion: key,
      ninstruccion: `PROMPT_${key}`,
      archivo: `PROMPT_${key}.md`,
      descripcion: `Instrucción ${key}`,
      defaultModel: DEFAULT_JCONFIG.model,
      kind: PATY_PROMPT_TIPOS.includes(key) ? "tdconsulta" : "unknown",
    };
  }

  function isTdConsultaInstruction(iinstruccion) {
    return getInstructionMeta(iinstruccion)?.kind === "tdconsulta";
  }

  function createPromptSlot(iinstruccion, patch = {}) {
    const meta = getInstructionMeta(iinstruccion);
    const model = patch.jconfig?.model || meta.defaultModel || DEFAULT_JCONFIG.model;
    return {
      archivo: patch.archivo || meta.archivo,
      tipo: meta.iinstruccion,
      iinstruccion: meta.iinstruccion,
      ninstruccion: meta.ninstruccion,
      kind: meta.kind,
      body: patch.body ?? "",
      source: patch.source ?? "plantilla",
      dirty: Boolean(patch.dirty),
      configDirty: Boolean(patch.configDirty),
      jconfig: patch.jconfig || { ...DEFAULT_JCONFIG, model },
      jconfigBaseline: patch.jconfigBaseline ?? null,
    };
  }

  const PROMPT_FILE_RE = /^PROMPT_([A-Z0-9_]+)\.(md|txt)$/i;

  function fileToTipo(name) {
    const m = String(name).trim().match(PROMPT_FILE_RE);
    if (!m) return null;
    const stem = m[1].toUpperCase();
    if (PATY_PROMPT_TIPOS.includes(stem)) return stem;
    if (INSTRUCTION_META_BY_KEY.has(stem)) return stem;
    return null;
  }

  function matchFilenameToIinstruccion(fileName) {
    const name = String(fileName ?? "").trim();
    const m = name.match(PROMPT_FILE_RE);
    if (!m) return [];
    const stem = m[1].toUpperCase();
    const matches = [];
    for (const meta of getInstructionCatalog()) {
      if (stem === meta.iinstruccion) matches.push(meta.iinstruccion);
      else if (stem === meta.ninstruccion) matches.push(meta.iinstruccion);
      else if (name.toUpperCase() === String(meta.archivo).toUpperCase()) matches.push(meta.iinstruccion);
    }
    return [...new Set(matches)];
  }

  function matchContentToIinstrucciones(content) {
    const text = String(content ?? "");
    if (!text.trim()) return [];
    const matches = [];
    for (const meta of getInstructionCatalog()) {
      const key = meta.iinstruccion;
      const ninst = meta.ninstruccion;
      const headerRe = new RegExp(`^#?\\s*iinstruccion\\s*:\\s*${key}\\s*$`, "im");
      const eqRe = new RegExp(`(?:^|\\n)\\s*iinstruccion\\s*=\\s*${key}\\s*(?:\\n|$)`, "i");
      const ninstRe = new RegExp(`^#?\\s*ninstruccion\\s*:\\s*${ninst}\\s*$`, "im");
      if (headerRe.test(text) || eqRe.test(text) || ninstRe.test(text)) matches.push(key);
    }
    return [...new Set(matches)];
  }

  /** Filas para diálogo de confirmación al importar archivos. */
  function prepareFileImportRows(files) {
    return (files || []).map((f) => {
      const nameMatches = matchFilenameToIinstruccion(f.name);
      const contentMatches = matchContentToIinstrucciones(f.content);
      let suggested = "";
      let matchSource = "";
      if (nameMatches.length === 1 && (contentMatches.length === 0 || contentMatches.includes(nameMatches[0]))) {
        suggested = nameMatches[0];
        matchSource = contentMatches.length ? "filename+content" : "filename";
      } else if (nameMatches.length === 0 && contentMatches.length === 1) {
        suggested = contentMatches[0];
        matchSource = "content";
      } else if (nameMatches.length === 1 && contentMatches.length === 1 && nameMatches[0] === contentMatches[0]) {
        suggested = nameMatches[0];
        matchSource = "filename+content";
      }
      return {
        fileName: f.name,
        content: String(f.content ?? ""),
        suggested,
        matchSource,
        nameMatches,
        contentMatches,
        selected: suggested,
      };
    });
  }

  function applyFileImportSelections(rows) {
    const updates = {};
    for (const row of rows || []) {
      const key = String(row.selected ?? "").trim().toUpperCase();
      if (!key) continue;
      updates[key] = {
        archivo: row.fileName,
        tipo: key,
        iinstruccion: key,
        body: String(row.content ?? "").trim(),
        source: "archivo",
        dirty: true,
      };
    }
    return updates;
  }

  function sqlEscapeLiteral(text) {
    return `N'${String(text).replace(/'/g, "''")}'`;
  }

  function parseMdBundle(text) {
    const out = new Map();
    const src = String(text ?? "").trim();
    if (!src) return out;

    const parts = src.split(/^===\s*(PROMPT_[A-Z0-9_]+\.md)\s*===\s*$/gim);
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i += 2) {
        const archivo = parts[i].trim();
        const body = (parts[i + 1] ?? "").trim();
        if (archivo && body) out.set(archivo.toUpperCase().replace(/\.MD$/, ".md"), { archivo, body });
      }
      return out;
    }

    const single = src.match(/^#\s*file:\s*(PROMPT_[A-Z0-9_]+\.md)\s*\n/im);
    if (single) {
      out.set(single[1], { archivo: single[1], body: src.replace(/^#\s*file:.*\n/im, "").trim() });
    }
    return out;
  }

  function mergePromptEntries(fileMap, textareaBundle) {
    const merged = new Map();
    for (const [archivo, body] of fileMap.entries()) {
      merged.set(archivo, { archivo, body: String(body).trim(), source: "archivo" });
    }
    for (const { archivo, body } of parseMdBundle(textareaBundle).values()) {
      merged.set(archivo, { archivo, body, source: "texto" });
    }
    return [...merged.values()];
  }

  /** Campos operativos persistidos en JCONFIG (no afectan runtime del modelo). */
  const JCONFIG_META_KEYS = ["author", "fmod", "chars", "tokens"] as const;

  function estimatePromptTokens(text) {
    const s = String(text ?? "");
    return s.trim() ? Math.ceil(s.length / 4) : 0;
  }

  function bodyMetrics(body) {
    const text = String(body ?? "");
    return { chars: text.length, tokens: estimatePromptTokens(text) };
  }

  function pickJconfigMeta(o) {
    const src = o && typeof o === "object" ? o : {};
    const meta = {};
    if (src.author != null && String(src.author).trim()) meta.author = String(src.author).trim();
    if (src.fmod != null && String(src.fmod).trim()) meta.fmod = String(src.fmod).trim();
    if (src.chars != null && Number.isFinite(Number(src.chars))) meta.chars = Number(src.chars);
    if (src.tokens != null && Number.isFinite(Number(src.tokens))) meta.tokens = Number(src.tokens);
    return meta;
  }

  /** Catálogo habitual; modelos en JCONFIG fuera de lista se añaden dinámicamente al Select. */
  const PATY_MODEL_OPTIONS = [
    "gpt-5-nano",
    "gpt-5-mini",
    "gpt-5-codex",
    "gpt-5-chat-latest",
    "gpt-5",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
  ];

  function normalizeModelOption(model) {
    const m = String(model ?? "").trim();
    if (!m) return DEFAULT_JCONFIG.model;
    if (PATY_MODEL_OPTIONS.includes(m)) return m;
    const byLen = [...PATY_MODEL_OPTIONS].sort((a, b) => b.length - a.length);
    for (const opt of byLen) {
      if (m === opt || m.startsWith(`${opt}-`)) return opt;
    }
    return m;
  }

  /** Opciones del Select: catálogo + ids exactos cargados desde JCONFIG (p. ej. gpt-4o-2024-08-06). */
  function mergeModelOptions(...models) {
    const seen = new Set();
    const out = [];
    const add = (id) => {
      const m = String(id ?? "").trim();
      if (!m || seen.has(m)) return;
      seen.add(m);
      out.push(m);
    };
    for (const id of PATY_MODEL_OPTIONS) add(id);
    for (const id of models) add(id);
    return out.sort((a, b) => a.localeCompare(b));
  }

  function parseJconfig(raw, fallbackModel) {
    const fb = String(fallbackModel || DEFAULT_JCONFIG.model).trim() || DEFAULT_JCONFIG.model;
    if (raw == null || !String(raw).trim()) {
      return { ...DEFAULT_JCONFIG, model: fb };
    }
    try {
      const o = typeof raw === "string" ? JSON.parse(raw) : raw;
      const modelRaw = String(o.model ?? "").trim();
      return {
        provider: String(o.provider || DEFAULT_JCONFIG.provider),
        model: modelRaw || fb,
        temperature: Number(o.temperature ?? DEFAULT_JCONFIG.temperature),
        top_p: Number(o.top_p ?? DEFAULT_JCONFIG.top_p),
        ...pickJconfigMeta(o),
      };
    } catch {
      return { ...DEFAULT_JCONFIG, model: fb };
    }
  }

  function serializeJconfig(jc) {
    const model = String(jc?.model ?? DEFAULT_JCONFIG.model).trim() || DEFAULT_JCONFIG.model;
    const out = {
      provider: jc?.provider || DEFAULT_JCONFIG.provider,
      model,
      temperature: Number(jc?.temperature ?? DEFAULT_JCONFIG.temperature),
      top_p: Number(jc?.top_p ?? DEFAULT_JCONFIG.top_p),
      ...pickJconfigMeta(jc),
    };
    return JSON.stringify(out);
  }

  /** Actualiza chars/tokens en memoria según el cuerpo del prompt. */
  function syncJconfigMetrics(jc, body) {
    const { chars, tokens } = bodyMetrics(body);
    return { ...jc, chars, tokens };
  }

  /** Metadatos de auditoría al persistir en BD (author, fmod, chars, tokens). */
  function enrichJconfigForSave(jc, { body, author } = {}) {
    const { chars, tokens } = bodyMetrics(body);
    const next = {
      ...jc,
      chars,
      tokens,
      fmod: new Date().toISOString(),
    };
    const who = String(author ?? jc?.author ?? "").trim();
    if (who) next.author = who;
    return next;
  }

  function mapEntryToInstruccion(entry) {
    const explicit = String(entry.iinstruccion ?? entry.tipo ?? "").trim().toUpperCase();
    const fromName = matchFilenameToIinstruccion(entry.archivo);
    const iinstruccion = explicit
      || (fromName.length === 1 ? fromName[0] : null)
      || fileToTipo(entry.archivo);
    const meta = iinstruccion ? getInstructionMeta(iinstruccion) : null;
    const jconfig = entry.jconfig || parseJconfig(entry.jconfigRaw, meta?.defaultModel);
    const known = Boolean(meta && meta.kind !== "unknown");
    return {
      archivo: entry.archivo,
      tipo: iinstruccion,
      iinstruccion,
      ninstruccion: meta?.ninstruccion ?? (iinstruccion ? `PROMPT_${iinstruccion}` : null),
      nitdconsulta: isTdConsultaInstruction(iinstruccion) ? iinstruccion : null,
      chars: (entry.body || "").length,
      known,
      kind: meta?.kind ?? "unknown",
      source: entry.source,
      body: entry.body,
      jconfig,
      status: !iinstruccion ? "sin_mapeo" : known ? "ok" : "tipo_desconocido",
    };
  }

  function buildTdConsultaLinkSql(iinstruccion) {
    return `
MERGE TDCONSULTAXINSTRUCCION AS t
USING (
\tSELECT c.itdconsulta, N'${iinstruccion}' AS iinstruccion, 1 AS orden
\tFROM TDCONSULTA c
\tWHERE c.itdconsulta = N'${iinstruccion}'
) AS s
ON t.itdconsulta = s.itdconsulta AND t.iinstruccion = s.iinstruccion
WHEN MATCHED THEN UPDATE SET t.orden = s.orden
WHEN NOT MATCHED THEN INSERT (itdconsulta, iinstruccion, orden)
\tVALUES (s.itdconsulta, s.iinstruccion, s.orden);`;
  }

  function buildMergeSql(rows) {
    const valid = rows.filter((r) => r.iinstruccion && r.body);
    if (!valid.length) return { sql: "", rows: valid, error: "No hay instrucciones válidas para guardar." };

    const head = `-- =====================================================================
-- Carga de instrucciones PatyIA (generado por isa-patyia)
-- Fuente: PROMPT_* (.md / .txt)
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;
`;

    const stmts = valid.map((r) => {
      const key = r.iinstruccion;
      const meta = getInstructionMeta(key);
      const ninst = r.ninstruccion || meta.ninstruccion;
      const desc = meta.descripcion || `Instrucción ${key}`;
      const jc = r.jconfig || parseJconfig(null, meta.defaultModel);
      const jconfigJson = sqlEscapeLiteral(serializeJconfig(jc));
      const tdLink = isTdConsultaInstruction(key) ? buildTdConsultaLinkSql(key) : "";
      return `
-- ----- ${key} (${r.archivo}) -----
MERGE INSTRUCCION AS t
USING (VALUES (
\tN'${key}',
\tN'${ninst}',
\t${sqlEscapeLiteral(r.body)},
\tN'${desc.replace(/'/g, "''")}',
\tN'1.0',
\t1,
\t${jconfigJson}
)) AS s (iinstruccion, ninstruccion, instruccion, descripcion, version, bactivo, jconfig)
ON t.iinstruccion = s.iinstruccion
WHEN MATCHED THEN UPDATE SET
\tt.ninstruccion = s.ninstruccion,
\tt.instruccion  = s.instruccion,
\tt.descripcion  = s.descripcion,
\tt.version      = s.version,
\tt.bactivo      = s.bactivo,
\tt.jconfig      = s.jconfig
WHEN NOT MATCHED THEN INSERT (iinstruccion, ninstruccion, instruccion, descripcion, version, bactivo, jconfig, fhini)
\tVALUES (s.iinstruccion, s.ninstruccion, s.instruccion, s.descripcion, s.version, s.bactivo, s.jconfig, SYSUTCDATETIME());
${tdLink}
`;
    }).join("\n");

    const tail = `
COMMIT;

SELECT i.iinstruccion, i.ninstruccion, i.version, i.jconfig, LEN(i.instruccion) AS len_instruccion
FROM INSTRUCCION i
WHERE i.iinstruccion IN (${valid.map((r) => `N'${r.iinstruccion}'`).join(", ")})
ORDER BY i.iinstruccion;
`;

    return { sql: head + stmts + tail, rows: valid, error: null };
  }

  function analyzeFromEntries(entries) {
    const mapped = (entries || []).map((e) => mapEntryToInstruccion({
      archivo: e.archivo,
      body: e.body,
      source: e.source || "editor",
      iinstruccion: e.iinstruccion || e.tipo,
      jconfig: e.jconfig,
      jconfigRaw: e.jconfigRaw,
    }));
    const mssql = buildMergeSql(mapped);
    return {
      mapped,
      sqlMssql: mssql.sql,
      validRows: mssql.rows,
      error: mssql.error,
    };
  }

  function analyzePrompts(fileMap, textareaBundle) {
    const entries = mergePromptEntries(fileMap, textareaBundle);
    return analyzeFromEntries(entries);
  }

  function emptyPromptState() {
    const out = {};
    for (const key of allInstructionKeys()) {
      out[key] = createPromptSlot(key);
    }
    return out;
  }

  function ingestMdFiles(files) {
    const rows = prepareFileImportRows(files);
    return applyFileImportSelections(rows.filter((r) => r.suggested && r.nameMatches.length <= 1 && r.contentMatches.length <= 1));
  }

export {
  PATY_PROMPT_TIPOS,
  PATY_SYSTEM_INSTRUCTIONS,
  PATY_MODEL_OPTIONS,
  DEFAULT_JCONFIG,
  JCONFIG_META_KEYS,
  fileToTipo,
  getInstructionCatalog,
  allInstructionKeys,
  getInstructionMeta,
  isTdConsultaInstruction,
  createPromptSlot,
  matchFilenameToIinstruccion,
  matchContentToIinstrucciones,
  prepareFileImportRows,
  applyFileImportSelections,
  parseMdBundle,
  mergePromptEntries,
  mapEntryToInstruccion,
  parseJconfig,
  normalizeModelOption,
  mergeModelOptions,
  serializeJconfig,
  bodyMetrics,
  syncJconfigMetrics,
  enrichJconfigForSave,
  buildMergeSql,
  analyzeFromEntries,
  analyzePrompts,
  emptyPromptState,
  ingestMdFiles,
};
