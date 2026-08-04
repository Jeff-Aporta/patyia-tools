/** Parseo y formato de fechas de mensajes (es-CO + ISO para <time datetime>). */

export function parseMsgDate(v: string | number | Date | null | undefined): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.abs(v) > 1e12 ? v : v * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const ms = s.length >= 13 || n > 1e12 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type MsgFechaParts = { label: string; iso: string };

export function formatMsgFecha(v: string | number | Date | null | undefined): MsgFechaParts {
  const d = parseMsgDate(v);
  if (!d) {
    const raw = String(v ?? "").trim();
    return { label: raw ? raw.slice(0, 40) : "", iso: "" };
  }
  const datePart = d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const tenth = Math.floor(d.getMilliseconds() / 100);
  const timeParts = new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(d);
  let timePart = "";
  for (const p of timeParts) {
    timePart += p.value;
    if (p.type === "second") timePart += `.${tenth}`;
  }
  return { label: `${datePart}, ${timePart}`, iso: d.toISOString() };
}

export function formatTs(v: string | number | Date | null | undefined): string {
  return formatMsgFecha(v).label;
}
