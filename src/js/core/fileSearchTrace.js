/** TK-1441245 — helpers File Search en meta de conv-log / SSE (front). */



export function archivosCitadosFromTrace(trace) {

  const seen = new Set();

  const out = [];

  for (const call of trace ?? []) {

    for (const fr of call?.results ?? []) {

      const name = String(fr?.filename ?? "").trim();

      if (!name || seen.has(name)) continue;

      seen.add(name);

      out.push(name);

    }

  }

  return out;

}



/** Trace completo (conv log): array de calls con results. */

export function fileSearchTraceCalls(meta) {

  const fs = meta?.file_search ?? meta?.others?.file_search;

  return Array.isArray(fs) && fs.length ? fs : [];

}



/** Resumen SSE (buildRunMeta): objeto con archivos_citados, chunks, vector_store_ids. */

export function fileSearchSummary(meta) {

  const fs = meta?.file_search ?? meta?.others?.file_search;

  if (!fs || Array.isArray(fs) || typeof fs !== "object") return null;

  return fs;

}



export function vectorStoresFromMeta(meta) {

  const ids = [];

  const pushId = (id) => {

    const s = String(id ?? "").trim();

    if (!s || ids.includes(s)) return;

    ids.push(s);

  };

  const direct = meta?.vector_store_ids ?? meta?.vectorStoreIds;

  if (Array.isArray(direct)) direct.forEach(pushId);

  const summary = fileSearchSummary(meta);

  if (Array.isArray(summary?.vector_store_ids)) summary.vector_store_ids.forEach(pushId);

  for (const call of fileSearchTraceCalls(meta)) {

    for (const id of call?.vector_store_ids ?? []) pushId(id);

  }

  if (Array.isArray(meta?.clasificador_vector_usado)) meta.clasificador_vector_usado.forEach(pushId);

  for (const c of compactChunksFromMeta(meta)) {

    if (c.vectorStoreId) pushId(c.vectorStoreId);

  }

  return ids.map((id, index) => ({ index, id }));

}



export function vectorStoreIndexLabel(vectorStores, vsId) {

  const id = String(vsId ?? "").trim();

  if (!id || !vectorStores?.length) return null;

  const hit = vectorStores.find((v) => v.id === id);

  return hit != null ? hit.index : null;

}



export function archivosCitadosFromMeta(meta) {

  const seen = new Set();

  const out = [];

  const push = (name) => {

    const n = String(name ?? "").trim();

    if (!n || seen.has(n)) return;

    seen.add(n);

    out.push(n);

  };

  for (const x of meta?.archivos_citados ?? []) push(x);

  const summary = fileSearchSummary(meta);

  if (Array.isArray(summary?.archivos_citados)) {

    for (const x of summary.archivos_citados) push(x);

  }

  for (const name of archivosCitadosFromTrace(fileSearchTraceCalls(meta))) push(name);

  for (const c of compactChunksFromMeta(meta)) {

    if (c.filename) push(c.filename);

  }

  return out;

}



/** @deprecated Prefer fileSearchTraceCalls — conserva compat con imports existentes. */

export function fileSearchFromMeta(meta) {

  return fileSearchTraceCalls(meta);

}



export function metaHasFileSearch(meta) {

  return archivosCitadosFromMeta(meta).length > 0

    || vectorStoresFromMeta(meta).length > 0

    || chunksFromMeta(meta).length > 0

    || Boolean(fileSearchTraceCalls(meta).length);

}



export function formatArchivosCitadosLabel(archivos, max = 3) {

  const list = archivos ?? [];

  if (!list.length) return "";

  if (list.length <= max) return list.join(", ");

  return `${list.slice(0, max).join(", ")} +${list.length - max}`;

}



function readCompactChunkList(meta) {

  const summary = fileSearchSummary(meta);

  const fromMeta = Array.isArray(meta?.chunks) ? meta.chunks : [];

  const fromSummary = Array.isArray(summary?.chunks) ? summary.chunks : [];

  return fromMeta.length ? fromMeta : fromSummary;

}



function compactChunksFromMeta(meta) {

  const list = readCompactChunkList(meta);

  const out = [];

  for (let i = 0; i < list.length; i += 1) {

    const c = list[i] || {};

    const text = String(c.text ?? c.snippet ?? "").trim();

    const filename = String(c.filename ?? "").trim();

    const fileId = String(c.file_id ?? "").trim();

    const vectorStoreId = String(c.vector_store_id ?? "").trim();

    if (!text && !filename && !fileId) continue;

    out.push({

      key: `compact-${fileId || filename || i}`,

      filename,

      fileId,

      score: typeof c.score === "number" ? c.score : null,

      text,

      vectorStoreId: vectorStoreId || undefined,

      queries: [],

      callIndex: 0,

      callId: "",

    });

  }

  return out;

}



/** Lista plana de fragmentos (chunks) desde trace, resumen SSE o meta.chunks. */

export function chunksFromMeta(meta) {

  const trace = fileSearchTraceCalls(meta);

  const out = [];

  if (trace.length) {

    for (let ci = 0; ci < trace.length; ci += 1) {

      const call = trace[ci] || {};

      const results = Array.isArray(call?.results) ? call.results : [];

      const queries = Array.isArray(call?.queries) ? call.queries : [];

      const callId = String(call?.id ?? "").trim();

      for (let ri = 0; ri < results.length; ri += 1) {

        const fr = results[ri] || {};

        const text = String(fr?.text ?? "").trim();

        if (!text) continue;

        const filename = String(fr?.filename ?? "").trim();

        const fileId = String(fr?.file_id ?? "").trim();

        const score = typeof fr?.score === "number" ? fr.score : null;

        const vectorStoreId = String(fr?.vector_store_id ?? "").trim() || undefined;

        out.push({

          key: `${callId || ci}-${fileId || filename || ri}`,

          callIndex: ci,

          callId,

          filename,

          fileId,

          score,

          text,

          queries,

          vectorStoreId,

        });

      }

    }

  }

  if (!out.length) return compactChunksFromMeta(meta);

  return out;

}



/** ¿El meta tiene chunks con texto renderizable? */

export function metaHasChunks(meta) {

  return chunksFromMeta(meta).length > 0;

}



/** Recorta un chunk para preview sin romper palabras (caracteres). */

export function chunkPreview(text, max = 360) {

  const t = String(text ?? "").trim();

  if (t.length <= max) return t;

  return `${t.slice(0, max).trimEnd()}…`;

}



/** Etiqueta compacta para chip de archivo (basename, truncado suave). */

export function compactFileChipLabel(filename, maxLen = 28) {

  const full = String(filename ?? "").trim();

  if (!full) return "";

  const base = full.split(/[/\\]/).pop() || full;

  if (base.length <= maxLen) return base;

  const dot = base.lastIndexOf(".");

  const ext = dot > 0 ? base.slice(dot) : "";

  const stemMax = maxLen - ext.length - 1;

  if (stemMax > 4) return `${base.slice(0, stemMax)}…${ext}`;

  return `${base.slice(0, maxLen - 1)}…`;

}


