/** Copia `sys_values` (instrucciones operativas, modelos, prompts operativos, config conversacion)
 *  desde el ISS-AyudasCPIA actual (staging) hacia la URL de producción.
 *
 *  Flujo: 4 GET en staging + 4 PUT en producción, con el mismo JWT del usuario (que debe tener
 *  el cap de escritura en ambos entornos). Errores 403/500 se devuelven como `failed`. */

import { capFetch } from "./apiClient.ts";
import { toastError, toastInfo, toastSuccess } from "../core/platform.ts";
import { PATYIA_ISS_PROD_URL } from "../core/patyia.ts";

/** @typedef {{ name: string, ok: boolean, error?: string }} CopyStep */
/** @typedef {{ ok: boolean, steps: CopyStep[], abortedAt?: string }} CopyResult */

/** @typedef {{ key: string, path: string, isInstrucciones?: boolean }} Endpoint */

/** @type {Endpoint[]} */
const ENDPOINTS = [
  { key: "config/conversacion", path: "/api/system/config/conversacion" },
  { key: "openai", path: "/api/system/openai" },
  { key: "instrucciones", path: "/api/system/instrucciones", isInstrucciones: true },
  { key: "prompts_operativos", path: "/api/system/prompts-operativos" },
];

function prodBase() {
  return PATYIA_ISS_PROD_URL.replace(/\/$/, "");
}

/** GET contra un endpoint (origen = current target = staging). */
async function getFromCurrent(path) {
  try {
    const res = await capFetch(path, { method: "GET" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, data, error: `GET ${path} → ${res.status} ${res.statusText}` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** PUT contra producción (URL absoluta, sin pasar por el capFetch del target actual). */
async function putToProd(path, body) {
  const url = `${prodBase()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const sess = window.ISA?.Session;
    /** @type {Record<string, string>} */
    const headers = { "Content-Type": "application/json" };
    if (sess?.authHeader) {
      const ah = sess.authHeader();
      if (ah && typeof ah === "object") Object.assign(headers, ah);
    }
    if (sess?.appHeader) {
      const ap = sess.appHeader();
      if (ap && typeof ap === "object") Object.assign(headers, ap);
    }
    const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `PUT ${path} → ${res.status} ${res.statusText}${text ? ` (${text.slice(0, 200)})` : ""}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Si el body de instrucciones viene como `{ rows: [...] }` (forma lista del GET),
 *  lo convierte a la forma upsert `{ iinstruccion, instruccion, ... }` que acepta el PUT. */
function instruccionesGetToPutList(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      iinstruccion: Number(r?.iinstruccion ?? r?.IINSTRUCCION),
      instruccion: String(r?.instruccion ?? r?.INSTRUCCION ?? ""),
      jconfig: r?.jconfig ?? r?.JCONFIG,
      ninstruccion: r?.ninstruccion ?? r?.NINSTRUCCION,
      descripcion: r?.descripcion ?? r?.DESCRIPCION,
      author: r?.author ?? r?.AUTHOR,
    }))
    .filter((x) => Number.isInteger(x.iinstruccion) && x.iinstruccion > 0);
}

export async function copySysValuesToProduction() {
  /** @type {CopyStep[]} */
  const steps = [];
  for (const ep of ENDPOINTS) {
    toastInfo(`Copiando ${ep.key}…`, 2000);
    const g = await getFromCurrent(ep.path);
    if (!g.ok) {
      steps.push({ name: ep.key, ok: false, error: g.error || "GET falló" });
      toastError(`Falló GET ${ep.key}: ${g.error}`);
      return { ok: false, steps, abortedAt: ep.key };
    }
    let body = g.data;
    if (ep.isInstrucciones) {
      // GET devuelve { rows: [...], canEdit: ... } → para PUT hay que upsert cada fila individual.
      const rows = instruccionesGetToPutList((g.data as any)?.rows);
      let allOk = true;
      for (const row of rows) {
        const r = await putToProd(ep.path, row);
        if (!r.ok) {
          allOk = false;
          steps.push({ name: `${ep.key}#${row.iinstruccion}`, ok: false, error: r.error });
        }
      }
      steps.push({ name: ep.key, ok: allOk });
      if (!allOk) {
        toastError(`Falló PUT ${ep.key}`);
        return { ok: false, steps, abortedAt: ep.key };
      }
    } else {
      // Otros endpoints: PUT body completo (puede venir envuelto en { value: ... } o root).
      const payload = (g.data as any)?.value !== undefined ? (g.data as any).value : g.data;
      const r = await putToProd(ep.path, payload);
      steps.push({ name: ep.key, ok: r.ok, error: r.error });
      if (!r.ok) {
        toastError(`Falló PUT ${ep.key}: ${r.error}`);
        return { ok: false, steps, abortedAt: ep.key };
      }
    }
  }
  toastSuccess("sys_values copiados a producción", 4000);
  return { ok: true, steps };
}
