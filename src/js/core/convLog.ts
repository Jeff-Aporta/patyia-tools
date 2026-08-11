/**
 * Parser de conv-*.json / CONVERSACION_LOG — portado de ISA-DOC readConvLog + convLogContent.
 * Uso offline en GH Pages; sin llamadas a PatyIA.
 */

import { formatMsgFecha } from "./msgDateFormat.ts";

/** Mensaje conv-log aplanado — campos base + propiedades según rol (user/assistant/operativa). */
type FlatConvLogMensaje = { ts?: unknown; tokens?: unknown; cost?: unknown; usage?: unknown; latency_ms?: unknown; send?: unknown; receive?: unknown; others?: unknown; text?: string; prompt_text?: string; imagenes?: string[]; audios?: string[]; audios_transcripcion?: string[]; prompt_id?: string; prompt_variables?: unknown; vectorStoreIds?: unknown; vector_store_ids?: unknown; operativa_key?: string; operativa_engine?: string; model?: string; response_text?: string; response_id?: string; engine?: string; itdconsulta?: string; nombre_usuario?: string; stream_ok?: boolean; stream_error?: string; nombre_usado_en_respuesta?: boolean; modelo_configurado?: string; modelo_autoswitch_vision?: boolean; premisas?: string[]; prompt_chars?: number; response_chars?: number; file_search?: unknown; archivos_citados?: string[]; chunks?: unknown[]; chunks_total?: number; clasificador_vector_usado?: string[]; login_url?: string; http_request?: unknown; http_response?: unknown };

type NormalizeMetaOptions = { isUser?: boolean };

const STREAM_ERROR_LABELS: Record<string, string> = {
  stream_incomplete_or_error: "La respuesta del modelo no se completó. Vuelve a intentar o reduce el tamaño de las imágenes.",
  stream_failed: "El stream de respuesta falló. Vuelve a intentar.",
  stream_empty_no_response: "El modelo no devolvió texto. Revisa la consulta o inténtalo de nuevo.",
};

export function formatStreamError(code: string | null | undefined): string | undefined {
  const raw = String(code ?? "").trim();
  if (!raw) return undefined;
  if (STREAM_ERROR_LABELS[raw]) return STREAM_ERROR_LABELS[raw];
  if (/^[a-z0-9_]+$/i.test(raw) && raw.includes("_")) {
    return "No se pudo completar la respuesta del asistente. Vuelve a intentar.";
  }
  return raw;
}

export function isStreamErrorCode(text: string | null | undefined): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (raw in STREAM_ERROR_LABELS) return true;
  return /^stream_[a-z0-9_]+$/i.test(raw);
}

/** Texto amigable de error de stream (no debe mostrarse como cuerpo del mensaje). */
export function isStreamErrorDisplay(text: string | null | undefined): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (isStreamErrorCode(raw)) return true;
  return Object.values(STREAM_ERROR_LABELS).includes(raw);
}

function resolveAssistantLogContenido(others: Record<string, unknown>, receive: unknown, fallbackText?: unknown): string {
  const fromReceive = dedupeAssistantText(textFromOpenAIReceive(receive));
  if (fromReceive && !isStreamErrorDisplay(fromReceive)) return fromReceive;

  const fromOthers = dedupeAssistantText(String(others?.response_text ?? ""));
  if (fromOthers && !isStreamErrorDisplay(fromOthers)) return fromOthers;

  const fromFallback = dedupeAssistantText(String(fallbackText ?? ""));
  if (fromFallback && !isStreamErrorDisplay(fromFallback)) return fromFallback;

  return "";
}

function pushImage(images: string[], ref: unknown) {
    const n = String(ref ?? "").trim();
    if (n && !isOmittedVisionRef(n)) images.push(n);
  }

  function isOmittedVisionRef(ref) {
    return /^\[(?:image_url omitido del log|base64 omitido)/i.test(String(ref ?? "").trim());
  }

  function isDisplayableImageRef(ref) {
    const n = String(ref ?? "").trim();
    if (!n || isOmittedVisionRef(n)) return false;
    return n.startsWith("data:") || /^https?:\/\//i.test(n);
  }

  function isDisplayableAudioRef(ref) {
    const n = String(ref ?? "").trim();
    if (!n) return false;
    // data URL o cualquier https (R2 signed sin depender solo de extensión en querystring)
    return n.startsWith("data:audio/") || /^https?:\/\//i.test(n);
  }

  function stripOmittedVisionFromText(texto) {
    return String(texto ?? "")
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        if (!t) return true;
        if (isOmittedVisionRef(t)) return false;
        if (/^>\s*📎\s*\[(?:image_url omitido|base64 omitido)/i.test(t)) return false;
        return true;
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function mergeUserImagenes(send, others, fallbackText) {
    const fb = typeof send?.text === "string" ? send.text : fallbackText;
    const { text, images } = extractUserVisionFromSendInput(send?.input ?? send?.text, fb);
    const seen = new Set<string>();
    const imagenes: string[] = [];
    const push = (ref: unknown) => {
      const n = String(ref ?? "").trim();
      if (!isDisplayableImageRef(n) || seen.has(n)) return;
      seen.add(n);
      imagenes.push(n);
    };
    if (Array.isArray(others?.imagenes_adjuntas)) {
      for (const u of others.imagenes_adjuntas) push(u);
    }
    for (const u of images) push(u);
    return { text: stripOmittedVisionFromText(text), imagenes };
  }

  function collectContentPart(part, texts, images) {
    if (!part || typeof part !== "object") return;
    const type = String(part.type ?? "");
    if (type === "input_text") {
      const t = String(part.text ?? "").trim();
      if (t) texts.push(t);
      return;
    }
    if (type === "input_image") {
      if (typeof part.image_url === "string") pushImage(images, part.image_url);
      else if (part.image_url && typeof part.image_url === "object" && typeof part.image_url.url === "string") {
        pushImage(images, part.image_url.url);
      }
      else if (typeof part.url === "string") pushImage(images, part.url);
    }
  }

  function collectUserTurn(turn, texts, images) {
    if (!turn || typeof turn !== "object") return;
    if (Array.isArray(turn.content)) {
      for (const part of turn.content) collectContentPart(part, texts, images);
    }
  }

  function extractUserVisionFromSendInput(input, fallbackText) {
    const fb = String(fallbackText ?? "").trim();
    if (typeof input === "string") {
      return { text: input.trim() || fb, images: [] };
    }
    const texts = [];
    const images = [];
    if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === "string") {
          const t = item.trim();
          if (t) texts.push(t);
        } else {
          collectUserTurn(item, texts, images);
        }
      }
    } else {
      collectUserTurn(input, texts, images);
    }
    return { text: texts.join("\n\n").trim() || fb, images };
  }

  function dedupeAssistantText(text) {
    const t = String(text || "").trim();
    if (!t) return t;
    const len = t.length;
    if (len >= 2 && len % 2 === 0 && t.slice(0, len / 2) === t.slice(len / 2)) return t.slice(0, len / 2);
    return t;
  }

  function textFromOpenAIReceive(rec) {
    if (!rec) return "";
    const direct = dedupeAssistantText(rec.output_text);
    if (direct) return direct;
    const output = rec.output;
    if (Array.isArray(output)) {
      const messages = output.filter((o) => o && typeof o === "object" && o.type === "message");
      if (!messages.length) return "";
      const last = messages[messages.length - 1];
      const content = last.content;
      if (!Array.isArray(content)) return "";
      const text = content
        .filter((c) => c && typeof c === "object" && c.type === "output_text")
        .map((c) => String(c.text ?? ""))
        .join("");
      return dedupeAssistantText(text);
    }
    const choices = rec.choices;
    if (Array.isArray(choices)) {
      return choices.map((c) => String(c.message?.content ?? "")).join("");
    }
    return typeof rec.text === "string" ? rec.text : "";
  }

  function normalizePromptText(text) {
    if (text == null) return "";
    if (Array.isArray(text)) return text.map((part) => String(part ?? "")).join("\n").replace(/\r\n/g, "\n");
    return String(text).replace(/\r\n/g, "\n");
  }

  function extractInstructionsMarkdown(send) {
    if (!send || typeof send !== "object") return "";
    const raw = typeof send.instructions === "string" ? send.instructions : "";
    return normalizePromptText(raw).trim();
  }

  function normalizeOpenAiMessageContent(content) {
    if (content == null) return "";
    if (typeof content === "string") return normalizePromptText(content).trim();
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) return String(part.text ?? "");
          return String(part ?? "");
        })
        .filter(Boolean)
        .join("\n")
        .trim();
    }
    if (typeof content === "object" && content !== null && "text" in content) {
      return String(content.text ?? "").trim();
    }
    return String(content).trim();
  }

  function formatOpenAiMessagesMarkdown(messages) {
    if (!Array.isArray(messages) || !messages.length) return "";
    return messages
      .map((m) => {
        if (!m || typeof m !== "object") return "";
        const role = String(m.role ?? "message").toUpperCase();
        const body = normalizeOpenAiMessageContent(m.content);
        return body ? `**${role}**\n\n${body}` : "";
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
  }

  /** Prompt de operativas: chat.completions (messages), responses (input array) o MCP ContaPyme (input string + session). */
  function extractOperativaPromptMarkdown(send) {
    if (!send || typeof send !== "object") return "";
    const rec = send as Record<string, unknown>;
    const fromMessages = formatOpenAiMessagesMarkdown(rec.messages);
    if (fromMessages) return fromMessages;
    const input = rec.input;
    if (Array.isArray(input) && input.length) {
      return formatOpenAiMessagesMarkdown(input);
    }
    const lines = [];
    if (typeof input === "string" && input.trim()) {
      lines.push(`**Consulta (input)**\n\n${input.trim()}`);
    }
    const sessionId = typeof rec.session_id === "string" ? rec.session_id.trim() : "";
    if (sessionId) lines.push(`**session_id**\n\n\`${sessionId}\``);
    const loginUrl = typeof rec.login_url === "string" ? rec.login_url.trim() : "";
    if (loginUrl) lines.push(`**login_url**\n\n${loginUrl}`);
    const transport = typeof rec.transport === "string" ? rec.transport.trim() : "";
    if (transport) lines.push(`**transport**\n\n\`${transport}\``);
    const model = typeof rec.model === "string" ? rec.model.trim() : "";
    if (model) lines.push(`**model**\n\n\`${model}\``);
    const serverUrl = typeof rec.server_url === "string" ? rec.server_url.trim() : "";
    if (serverUrl) lines.push(`**server_url**\n\n\`${serverUrl}\``);
    if (rec.tools_count != null && String(rec.tools_count).trim() !== "") {
      lines.push(`**tools_count**\n\n${Number(rec.tools_count)}`);
    }
    return lines.join("\n\n---\n\n");
  }

  function isContapymeMcpOperativaKey(key) {
    return /^contapymeMcp(Login|Session|Unavailable)$/i.test(String(key || "").trim());
  }

  /** Markdown extra desde http_response MCP (kind, tools, texto) cuando el Prompt tab no tiene instructions OpenAI. */
  function extractMcpResponseMarkdown(httpResponse) {
    if (!httpResponse || typeof httpResponse !== "object") return "";
    const rec = httpResponse as Record<string, unknown>;
    const lines = [];
    const kind = typeof rec.kind === "string" ? rec.kind.trim() : "";
    if (kind) lines.push(`**kind**\n\n\`${kind}\``);
    if (rec.ok === true) lines.push("**ok**\n\n`true`");
    if (rec.ok === false) lines.push("**ok**\n\n`false`");
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (text) lines.push(`**Respuesta MCP**\n\n${text}`);
    const tools = Array.isArray(rec.tools) ? rec.tools : [];
    if (tools.length) {
      const rows = tools.map((t, i) => {
        if (!t || typeof t !== "object") return `${i + 1}. tool`;
        const name = String((t as { name?: unknown }).name ?? "tool");
        const status = String((t as { status?: unknown }).status ?? "").trim();
        return status ? `${i + 1}. \`${name}\` · ${status}` : `${i + 1}. \`${name}\``;
      });
      lines.push(`**Tools MCP (${tools.length})**\n\n${rows.join("\n")}`);
    }
    return lines.join("\n\n---\n\n");
  }

  function extractUserTextFromConvSend(send) {
    if (!send || typeof send !== "object") return "";
    const input = send.input;
    if (typeof input === "string") return input.trim();
    if (!Array.isArray(input)) return "";
    return input.flatMap((turn) => {
      if (!turn || typeof turn !== "object" || turn.role !== "user") return [];
      const content = turn.content;
      if (typeof content === "string") return [content];
      if (!Array.isArray(content)) return [];
      return content.map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String(part.text ?? "");
        return "";
      }).filter(Boolean);
    }).join("\n").trim();
  }

  function extractAssistantTextFromConvReceive(receive) {
    if (!receive || typeof receive !== "object") return "";
    const direct = String(receive.output_text ?? "").trim();
    if (direct) return direct;
    const output = receive.output;
    if (!Array.isArray(output)) return "";
    const messages = output.filter((o) => o && typeof o === "object" && o.type === "message");
    if (!messages.length) return "";
    const last = messages[messages.length - 1];
    const content = last.content;
    if (!Array.isArray(content)) return "";
    return content
      .filter((c) => c && typeof c === "object" && c.type === "output_text")
      .map((c) => String(c.text ?? ""))
      .join("")
      .trim();
  }

  /** Resuelve texto visible de un ítem mensajesOpenAI (API PatyIA). */
  function resolveOpenAiMensajeText(m) {
    const direct = String(m?.mensaje ?? "").trim();
    if (direct && !isStreamErrorDisplay(direct)) return direct;
    const meta = m?.meta && typeof m.meta === "object" ? m.meta : null;
    if (!meta) return "";
    const isUser = String(m?.autor ?? "").toLowerCase().includes("usuario") || meta.role === "user";
    if (isUser) {
      const fromSend = extractUserTextFromConvSend(meta.send);
      if (fromSend) return fromSend;
      const input = meta.send?.input;
      if (typeof input === "string" && input.trim()) return input.trim();
      return String(meta.text ?? meta.prompt_text ?? "").trim();
    }
    const fromReceive = extractAssistantTextFromConvReceive(meta.receive);
    if (fromReceive) return fromReceive;
    const others = meta.others && typeof meta.others === "object" ? meta.others : null;
    const fromOthers = String(others?.response_text ?? "").trim();
    if (fromOthers && !isStreamErrorCode(fromOthers)) return fromOthers;
    const tail = String(meta.response_text ?? meta.text ?? "").trim();
    return isStreamErrorCode(tail) ? "" : tail;
  }

  function tokensFromUsage(usage) {
    if (!usage || typeof usage !== "object") return undefined;
    const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
    const cached = Number(
      usage.input_tokens_details?.cached_tokens
      ?? usage.prompt_tokens_details?.cached_tokens
      ?? 0,
    ) || 0;
    const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
    const reasoning = Number(
      usage.output_tokens_details?.reasoning_tokens
      ?? usage.completion_tokens_details?.reasoning_tokens
      ?? 0,
    ) || 0;
    const total = Number(usage.total_tokens ?? 0) || input + output;
    if (!total && !input && !output) return undefined;
    return { input, cached, output, reasoning, total };
  }

  function ordenarMensajesConvLog(mensajes) {
    if (!mensajes.length) return [];
    const byTurno = new Map();
    const sinTurno = [];

    for (const m of mensajes) {
      const t = m.turno;
      if (t == null || t <= 0) {
        sinTurno.push(m);
        continue;
      }
      if (!byTurno.has(t)) byTurno.set(t, []);
      byTurno.get(t).push(m);
    }

    const out = [];
    for (const t of [...byTurno.keys()].sort((a, b) => a - b)) {
      const g = byTurno.get(t);
      const users = g.filter((m) => m.role === "user");
      const ops = g.filter((m) => m.role === "operativa").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
      const assistants = g.filter((m) => m.role === "assistant");
      out.push(...users, ...ops, ...assistants);
    }

    if (sinTurno.length) {
      sinTurno.sort((a, b) => String(a.ts ?? "").localeCompare(String(b.ts ?? "")));
      out.push(...sinTurno);
    }
    return out;
  }

  function flattenConvLogMensaje(m): FlatConvLogMensaje {
    const s = m.send;
    const r = m.receive;
    const o = m.others ?? {};
    const flat: FlatConvLogMensaje = { ts: m.ts, tokens: m.tokens, cost: m.cost, usage: r?.usage, latency_ms: m.latency_ms, send: s, receive: r, others: m.others };

    if (m.role === "user") {
      const { text } = extractUserVisionFromSendInput(s?.input, typeof s?.text === "string" ? s.text : "");
      if (text) {
        flat.text = stripOmittedVisionFromText(text);
        flat.prompt_text = flat.text;
      }
      const imagenes = Array.isArray(o.imagenes_adjuntas)
        ? o.imagenes_adjuntas.filter(isDisplayableImageRef)
        : [];
      if (imagenes.length) flat.imagenes = imagenes;
      const audios = Array.isArray(o.audios_adjuntas)
        ? o.audios_adjuntas.filter(isDisplayableAudioRef)
        : [];
      if (audios.length) flat.audios = audios;
      const audiosTranscripcion = Array.isArray(o.audios_transcripcion)
        ? o.audios_transcripcion.map((t) => String(t ?? "").trim()).filter(Boolean)
        : [];
      if (audiosTranscripcion.length) flat.audios_transcripcion = audiosTranscripcion;
      const prompt = s?.prompt;
      if (prompt?.id) flat.prompt_id = prompt.id;
      if (prompt?.variables) flat.prompt_variables = prompt.variables;
    } else if (m.role === "operativa") {
      if (o.operativa_key) {
        flat.operativa_key = o.operativa_key;
        flat.prompt_id = String(o.operativa_key);
      }
      if (o.operativa_engine) flat.operativa_engine = o.operativa_engine;
      const txt = textFromOpenAIReceive(r) || String(o.response_text ?? "").trim();
      if (txt) flat.text = txt;
      if (typeof r?.model === "string") flat.model = r.model;
      const loginUrl = typeof r?.login_url === "string"
        ? r.login_url
        : (typeof s?.login_url === "string" ? s.login_url : undefined);
      if (loginUrl) flat.login_url = loginUrl;
      if (s && typeof s === "object") flat.http_request = s;
      if (r && typeof r === "object") flat.http_response = r;
    } else if (m.role === "assistant") {
      const txt = resolveAssistantLogContenido(o as Record<string, unknown>, r);
      if (txt) {
        flat.text = txt;
        flat.response_text = txt;
      }
      if (typeof r?.model === "string") flat.model = r.model;
      if (typeof r?.id === "string") flat.response_id = r.id;
      if (o.engine) flat.engine = o.engine;
    }

    if (o.itdconsulta) flat.itdconsulta = o.itdconsulta;
    if (o.nombre_usuario) flat.nombre_usuario = o.nombre_usuario;
    if (o.stream_ok === false) flat.stream_ok = false;
    if (o.stream_error) flat.stream_error = o.stream_error;
    if (o.nombre_usado_en_respuesta !== undefined) flat.nombre_usado_en_respuesta = o.nombre_usado_en_respuesta;
    if (o.modelo_configurado) flat.modelo_configurado = o.modelo_configurado;
    if (o.modelo_autoswitch_vision) flat.modelo_autoswitch_vision = true;
    if (o.prompt_id && !flat.prompt_id) flat.prompt_id = o.prompt_id;
    if (o.premisas) flat.premisas = o.premisas;
    if (typeof o.prompt_chars === "number") flat.prompt_chars = o.prompt_chars;
    if (typeof o.response_chars === "number") flat.response_chars = o.response_chars;
    if (Array.isArray(o.file_search) && o.file_search.length) flat.file_search = o.file_search;
    if (Array.isArray(o.archivos_citados) && o.archivos_citados.length) flat.archivos_citados = o.archivos_citados;
    if (Array.isArray(o.chunks) && o.chunks.length) flat.chunks = o.chunks;
    if (typeof o.chunks_total === "number") flat.chunks_total = o.chunks_total;
    if (o.vector_store_ids) flat.vector_store_ids = o.vector_store_ids;
    if (Array.isArray(o.clasificador_vector_usado) && o.clasificador_vector_usado.length) {
      flat.clasificador_vector_usado = o.clasificador_vector_usado.map(String);
    }
    if (Array.isArray(o.instrucciones) && o.instrucciones.length) flat.instrucciones = o.instrucciones;
    return flat;
  }

  function normalizeCost(cost) {
    if (!cost || typeof cost !== "object") return undefined;
    const input_usd = Number(cost.input_usd ?? 0) || 0;
    const cached_usd = Number(cost.cached_usd ?? 0) || 0;
    const output_usd = Number(cost.output_usd ?? 0) || 0;
    const total_usd = Number(cost.total_usd ?? 0) || input_usd + cached_usd + output_usd;
    return { input_usd, cached_usd, output_usd, total_usd };
  }

  const ZERO_TOKENS = { input: 0, cached: 0, output: 0, reasoning: 0, total: 0 };
  const ZERO_COST = { input_usd: 0, cached_usd: 0, output_usd: 0, total_usd: 0 };

  function readRawMessageTokens(msg) {
    const meta = msg?.meta;
    if (!meta) return { ...ZERO_TOKENS };
    const tk = meta.tokens?.total != null ? meta.tokens : tokensFromUsage(meta.usage);
    if (!tk) return { ...ZERO_TOKENS };
    return { input: Number(tk.input ?? 0) || 0, cached: Number(tk.cached ?? 0) || 0, output: Number(tk.output ?? 0) || 0, reasoning: Number(tk.reasoning ?? 0) || 0, total: Number(tk.total ?? 0) || 0 };
  }

  function readMessageCost(msg) {
    return normalizeCost(msg?.meta?.cost) ?? { ...ZERO_COST };
  }

  function accumulateTokens(acc, tk) {
    return { input: acc.input + tk.input, cached: acc.cached + tk.cached, output: acc.output + tk.output, reasoning: acc.reasoning + tk.reasoning, total: acc.total + tk.total };
  }

  function accumulateCost(acc, cost) {
    return { input_usd: acc.input_usd + cost.input_usd, cached_usd: acc.cached_usd + cost.cached_usd, output_usd: acc.output_usd + cost.output_usd, total_usd: acc.total_usd + cost.total_usd };
  }

  function formatUsageTokens(n) {
    if (n == null || !Number.isFinite(n) || n <= 0) return "—";
    return n.toLocaleString("es-CO");
  }

  function formatUsageUsd(n) {
    if (n == null || !Number.isFinite(n) || n <= 0) return "—";
    if (n >= 0.01) return `$${n.toFixed(4)}`;
    if (n >= 0.0001) return `$${n.toFixed(6)}`;
    return `$${n.toFixed(8)}`;
  }

  function formatMoneyWithTokens(usd, tokenCount) {
    const m = formatUsageUsd(usd);
    const t = Number(tokenCount ?? 0) || 0;
    if (m === "—" && t <= 0) return "—";
    if (m === "—") return `(${t.toLocaleString("es-CO")}t)`;
    if (t <= 0) return m;
    return `${m} (${t.toLocaleString("es-CO")}t)`;
  }

  function formatUsageBreakdownParts(tokens, cost) {
    const tk = tokens || {};
    const c = cost || {};
    const labelFull = { in: "Input", cache: "Cache", out: "Output", total: "Total" };
    const parts = [
      { key: "in", label: "in", usd: Number(c.input_usd ?? 0) || 0, tok: Number(tk.input ?? 0) || 0 },
      { key: "cache", label: "cache", usd: Number(c.cached_usd ?? 0) || 0, tok: Number(tk.cached ?? 0) || 0 },
      { key: "out", label: "out", usd: Number(c.output_usd ?? 0) || 0, tok: Number(tk.output ?? 0) || 0 },
    ];
    const totalUsd = Number(c.total_usd ?? 0) || parts.reduce((s, p) => s + p.usd, 0);
    const totalTok = Number(tk.total ?? 0) || 0;
    parts.push({ key: "total", label: "Σ", usd: totalUsd, tok: totalTok });
    return parts.map((p) => ({
      key: p.key,
      label: p.label,
      labelFull: labelFull[p.key] || p.label,
      usd: p.usd,
      tok: p.tok,
      usdText: formatUsageUsd(p.usd),
      tokText: p.tok > 0 ? `${formatUsageTokens(p.tok)} t` : "—",
      display: formatMoneyWithTokens(p.usd, p.tok),
      hasData: p.usd > 0 || p.tok > 0,
    }));
  }

  function formatUsageSummary(tokens, cost) {
    const tk = tokens || {};
    const c = cost || {};
    const totalTok = Number(tk.total ?? 0) || 0;
    const totalUsd = Number(c.total_usd ?? 0)
      || (Number(c.input_usd ?? 0) + Number(c.cached_usd ?? 0) + Number(c.output_usd ?? 0))
      || 0;
    return { tokens: totalTok, usd: totalUsd, tokensText: totalTok > 0 ? `${formatUsageTokens(totalTok)} t` : "—", usdText: formatUsageUsd(totalUsd), hasData: totalTok > 0 || totalUsd > 0 };
  }

  function usageHasData(tokens, cost) {
    return (Number(tokens?.total ?? 0) || 0) > 0 || (Number(cost?.total_usd ?? 0) || 0) > 0;
  }

  function turnoFromVistaMsg(msg) {
    const im = Number(msg?.imensaje);
    if (Number.isFinite(im) && im > 0) return Math.floor(im / 1000);
    const m = String(msg?.idMsg ?? "").match(/^msg-(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return Math.floor(n / 1000);
    }
    return undefined;
  }

  function attachUsageStats(mensajes) {
    const list = mensajes || [];
    const userInputByTurno = new Map();

    for (const m of list) {
      if (!m.esUsuario) continue;
      const turno = turnoFromVistaMsg(m);
      if (turno == null) continue;
      const tk = readRawMessageTokens(m);
      if (usageHasData(tk, null)) userInputByTurno.set(turno, tk);
    }

    let cumulativeTokens = { ...ZERO_TOKENS };
    let cumulativeCost = { ...ZERO_COST };
    let flushedTurno: number | undefined;

    return list.map((m) => {
      if (m.esUsuario) {
        const tokens = readRawMessageTokens(m);
        const cost = readMessageCost(m);
        if (!usageHasData(tokens, cost)) return { ...m, usageStats: undefined };
        return {
          ...m,
          usageStats: {
            tokens,
            cost,
            previousTokens: { ...ZERO_TOKENS },
            previousCost: { ...ZERO_COST },
            cumulativeTokens: { ...tokens },
            cumulativeCost: { ...cost },
          },
        };
      }

      const turno = turnoFromVistaMsg(m);
      if (turno != null && turno !== flushedTurno) {
        const userInput = userInputByTurno.get(turno);
        if (userInput && usageHasData(userInput, null)) {
          cumulativeTokens = accumulateTokens(cumulativeTokens, userInput);
        }
        flushedTurno = turno;
      }

      const previousTokens = { ...cumulativeTokens };
      const previousCost = { ...cumulativeCost };
      const tokens = readRawMessageTokens(m);
      const cost = readMessageCost(m);

      cumulativeTokens = accumulateTokens(cumulativeTokens, tokens);
      cumulativeCost = accumulateCost(cumulativeCost, cost);

      return {
        ...m,
        usageStats: {
          tokens,
          cost,
          previousTokens,
          previousCost,
          cumulativeTokens: { ...cumulativeTokens },
          cumulativeCost: { ...cumulativeCost },
        },
      };
    });
  }

  function threadHasUsageStats(mensajes) {
    return (mensajes || []).some((m) => sideLogPanelWorthShowing(m));
  }

  function sideLogPanelWorthShowing(msg) {
    if (!msg) return false;
    const meta = msg.meta;
    if (meta) {
      if (String(meta.itdconsulta ?? "").trim()) return true;
      if (Array.isArray(meta.premisas) && meta.premisas.length) return true;
      if (String(meta.extra?.operativa_key ?? "").trim()) return true;
      const tk = meta.tokens?.total ? meta.tokens : tokensFromUsage(meta.usage);
      if ((Number(tk?.total ?? 0) || 0) > 0) return true;
      if (Number(meta.latency_ms ?? 0) > 0) return true;
      if (String(meta.model ?? "").trim()) return true;
      if (meta.modelo_autoswitch_vision) return true;
      if (Array.isArray(meta.archivos_citados) && meta.archivos_citados.length) return true;
      if (Array.isArray(meta.file_search) && meta.file_search.length) return true;
    }
    const s = msg.usageStats;
    if (!s) return false;
    return usageHasData(s.tokens, s.cost) || (!msg.esUsuario && usageHasData(s.previousTokens, s.previousCost));
  }

  function formatTokensWithUsd(tok, usd) {
    const t = Number(tok ?? 0) || 0;
    const u = Number(usd ?? 0) || 0;
    const tokStr = t.toLocaleString("es-CO");
    const usdStr = formatUsageUsd(u);
    return `${tokStr} (${usdStr})`;
  }

  function formatLatencySeconds(latencyMs) {
    const ms = Number(latencyMs);
    if (!Number.isFinite(ms) || ms <= 0) return "";
    return `${(ms / 1000).toFixed(2)} s`;
  }

  function normalizeMeta(raw: FlatConvLogMensaje | null | undefined, options: NormalizeMetaOptions = {}) {
    if (!raw || typeof raw !== "object") return null;
    const isUser = options.isUser === true;
    const operativaKey = typeof raw.operativa_key === "string" ? raw.operativa_key.trim() : "";
    const userPromptText = isUser
      ? String(raw.prompt_text ?? raw.text ?? extractUserTextFromConvSend(raw.send) ?? "").trim()
      : "";
    const assistantPromptMarkdown = !isUser
      ? (() => {
        const sendBag = raw.send && typeof raw.send === "object" ? raw.send : raw.http_request;
        const fromSend = (extractInstructionsMarkdown(sendBag) || extractOperativaPromptMarkdown(sendBag)).trim();
        const opKey = operativaKey || String(raw.prompt_id ?? "").trim();
        const fromRes = isContapymeMcpOperativaKey(opKey)
          ? extractMcpResponseMarkdown(raw.http_response || raw.receive).trim()
          : "";
        if (fromSend && fromRes) return `${fromSend}\n\n---\n\n${fromRes}`;
        return fromSend || fromRes;
      })()
      : "";
    const promptMarkdown = isUser ? userPromptText : assistantPromptMarkdown;
    const userImagenes = isUser && Array.isArray(raw.imagenes)
      ? raw.imagenes.filter(isDisplayableImageRef)
      : [];
    const userAudios = isUser && Array.isArray(raw.audios)
      ? raw.audios.filter(isDisplayableAudioRef)
      : [];
    const userAudiosTranscripcion = isUser && Array.isArray(raw.audios_transcripcion)
      ? raw.audios_transcripcion.map((t) => String(t ?? "").trim()).filter(Boolean)
      : [];
    const promptId = !isUser
      ? (typeof raw.prompt_id === "string" && raw.prompt_id.trim()
        ? raw.prompt_id.trim()
        : (operativaKey || undefined))
      : undefined;
    const tokensRaw = raw.tokens as { total?: unknown } | undefined;
    const tokens = tokensRaw?.total ? tokensRaw : tokensFromUsage(raw.usage) ?? tokensRaw;
    const cost = normalizeCost(raw.cost);
    return {
      ts: typeof raw.ts === "string" ? raw.ts : undefined,
      nombre_usuario: typeof raw.nombre_usuario === "string" ? raw.nombre_usuario : undefined,
      nombre_usado_en_respuesta: typeof raw.nombre_usado_en_respuesta === "boolean" ? raw.nombre_usado_en_respuesta : undefined,
      itdconsulta: typeof raw.itdconsulta === "string" ? raw.itdconsulta : undefined,
      model: typeof raw.model === "string" ? raw.model : undefined,
      modelo_configurado: typeof raw.modelo_configurado === "string" ? raw.modelo_configurado : undefined,
      modelo_autoswitch_vision: raw.modelo_autoswitch_vision === true ? true : undefined,
      prompt_id: promptId,
      premisas: Array.isArray(raw.premisas) ? raw.premisas.map(String) : undefined,
      tokens,
      cost,
      usage: raw.usage,
      response_id: typeof raw.response_id === "string" ? raw.response_id : undefined,
      prompt_variables: raw.prompt_variables,
      latency_ms: typeof raw.latency_ms === "number" ? raw.latency_ms : undefined,
      prompt_chars: typeof raw.prompt_chars === "number"
        ? raw.prompt_chars
        : (promptMarkdown ? promptMarkdown.length : undefined),
      response_chars: typeof raw.response_chars === "number" ? raw.response_chars : undefined,
      stream_ok: raw.stream_ok,
      stream_error: formatStreamError(typeof raw.stream_error === "string" ? raw.stream_error : undefined),
      extra: raw.operativa_key
        ? {
            operativa_key: String(raw.operativa_key),
            operativa_engine: raw.operativa_engine != null ? String(raw.operativa_engine) : undefined,
          }
        : undefined,
      prompt_markdown: promptMarkdown || undefined,
      imagenes: userImagenes.length ? userImagenes : undefined,
      audios: userAudios.length ? userAudios : undefined,
      audiosTranscripcion: userAudiosTranscripcion.length ? userAudiosTranscripcion : undefined,
      file_search: Array.isArray(raw.file_search) && raw.file_search.length ? raw.file_search : undefined,
      archivos_citados: Array.isArray(raw.archivos_citados) && raw.archivos_citados.length
        ? raw.archivos_citados.map(String)
        : undefined,
      vector_store_ids: (() => {
        const ids = raw.vector_store_ids ?? raw.vectorStoreIds;
        return Array.isArray(ids) && ids.length ? ids.map(String) : undefined;
      })(),
      chunks: Array.isArray(raw.chunks) && raw.chunks.length ? raw.chunks : undefined,
      chunks_total: typeof raw.chunks_total === "number" ? raw.chunks_total : undefined,
      clasificador_vector_usado: Array.isArray(raw.clasificador_vector_usado) && raw.clasificador_vector_usado.length
        ? raw.clasificador_vector_usado.map(String)
        : undefined,
      login_url: typeof raw.login_url === "string" && raw.login_url.trim() ? raw.login_url.trim() : undefined,
      http_request: raw.http_request && typeof raw.http_request === "object" ? raw.http_request : undefined,
      http_response: raw.http_response && typeof raw.http_response === "object" ? raw.http_response : undefined,
    };
  }

  function formatearFecha(raw) {
    return formatMsgFecha(raw).label;
  }

  function convLogToMsgVista(m, i, userSendForTurn, userVectorStoreIds) {
    const role = String(m.role ?? "assistant");
    const esOperativa = role === "operativa";
    const esUsuario = role === "user";
    const send = m.send;
    const receive = m.receive;
    const others = m.others ?? {};

    let contenido = "";
    let imagenes = [];
    let audios = [];
    let audiosTranscripcion = [];
    if (role === "user") {
      const merged = mergeUserImagenes(send, others, String(send?.text ?? m.text ?? others.prompt_text ?? ""));
      contenido = merged.text;
      imagenes = merged.imagenes;
      audios = Array.isArray(others.audios_adjuntas)
        ? others.audios_adjuntas.filter(isDisplayableAudioRef)
        : [];
      audiosTranscripcion = Array.isArray(others.audios_transcripcion)
        ? others.audios_transcripcion.map((t) => String(t ?? "").trim()).filter(Boolean)
        : [];
    } else {
      contenido = resolveAssistantLogContenido(others as Record<string, unknown>, receive, m.text);
      if (esOperativa && !contenido.trim() && receive && typeof receive === "object") {
        const finish = (receive as { choices?: Array<{ finish_reason?: string }> }).choices?.[0]?.finish_reason;
        if (finish === "length") {
          contenido = "(sin texto visible: max_completion_tokens agotado en razonamiento interno del modelo)";
        }
      }
    }

    const streamErrorRaw = typeof others.stream_error === "string"
      ? others.stream_error
      : (isStreamErrorCode(others.response_text) ? String(others.response_text) : undefined);
    const streamFailed = others.stream_ok === false || Boolean(streamErrorRaw);
    const streamError = formatStreamError(streamErrorRaw);

    const opKey = others.operativa_key ?? send?.key ?? m.operativa_key;
    const flat = m.send != null || m.receive != null ? flattenConvLogMensaje(m) : m;
    if (!esUsuario && !esOperativa && userSendForTurn && !flat.send) {
      flat.send = userSendForTurn;
    }
    let meta = normalizeMeta(flat, { isUser: esUsuario });
    if (!esUsuario && userVectorStoreIds?.length && !meta?.vector_store_ids?.length) {
      meta = { ...meta, vector_store_ids: userVectorStoreIds.map(String) };
    }
    const logImensaje = (() => {
      const turno = Number(m.turno);
      const seq = Number(m.seq);
      if (!Number.isFinite(turno) || turno <= 0 || !Number.isFinite(seq) || seq <= 0) return undefined;
      return turno * 1000 + seq;
    })();

    return {
      idMsg: logImensaje ? `msg-${logImensaje}` : `${role}-${String(m.seq ?? i)}-${String(m.turno ?? 0)}`,
      rol: esOperativa ? `OP · ${String(opKey ?? "operativa")}` : esUsuario ? "user" : "assistant",
      contenido: contenido || (esUsuario && !imagenes.length && !audios.length ? "(mensaje usuario sin texto en log)" : contenido),
      imagenes: imagenes.length ? imagenes : undefined,
      audios: audios.length ? audios : undefined,
      audiosTranscripcion: audiosTranscripcion.length ? audiosTranscripcion : undefined,
      ...(() => {
        const f = formatMsgFecha(m.ts ?? "");
        return { fecha: f.label, fechaIso: f.iso || undefined };
      })(),
      esUsuario,
      esOperativa,
      meta,
      streamFailed,
      streamError,
      ...(logImensaje ? { imensaje: logImensaje } : {}),
    };
  }

  function parseLogInput(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) throw new Error("Pega el contenido de conv-*.json o la respuesta del API /conversacion/logs/{id}.");
    const parsed = JSON.parse(trimmed);
    if (parsed.log && Array.isArray(parsed.log.mensajes)) {
      return {
        iconversacion: parsed.log.iconversacion ?? parsed.iconversacion,
        mensajes: parsed.log.mensajes,
        resumen: parsed.log.resumen,
      };
    }
    if (Array.isArray(parsed.mensajes)) {
      return {
        iconversacion: parsed.iconversacion,
        mensajes: parsed.mensajes,
        resumen: parsed.resumen,
      };
    }
    throw new Error("JSON inválido: se espera conv-*.json o { ok, log: { mensajes } }.");
  }

  function logToMensajesVista(log) {
    const ordenados = ordenarMensajesConvLog(log.mensajes ?? []);
    const sendByTurno = new Map();
    const vectorStoreIdsByTurno = new Map();
    for (const m of ordenados) {
      if (String(m.role) === "user" && m.turno != null) {
        if (m.send) sendByTurno.set(m.turno, m.send);
        const vsIds = m.others?.vector_store_ids;
        if (Array.isArray(vsIds) && vsIds.length) vectorStoreIdsByTurno.set(m.turno, vsIds.map(String));
      }
    }
    let lastUserSend = null;
    return attachUsageStats(ordenados.map((m, i) => {
      if (String(m.role) === "user" && m.send) lastUserSend = m.send;
      const userSend = m.turno != null ? (sendByTurno.get(m.turno) ?? lastUserSend) : lastUserSend;
      const userVsIds = m.turno != null ? vectorStoreIdsByTurno.get(m.turno) : undefined;
      return convLogToMsgVista(m, i, userSend, userVsIds);
    }));
  }

export {
  resolveOpenAiMensajeText,
  parseLogInput,
  logToMensajesVista,
  tokensFromUsage,
  attachUsageStats,
  threadHasUsageStats,
  sideLogPanelWorthShowing,
  formatUsageTokens,
  formatUsageUsd,
  formatTokensWithUsd,
  formatUsageBreakdownParts,
  formatUsageSummary,
  formatLatencySeconds,
  usageHasData,
};

/** Padding del hilo de conversación (chat: mesh tk-doc en `.paty-chat-thread-surface` solo dark; log: shell ::before). */
const CONV_LOG_PAD = { p: { xs: 1.25, sm: 2, md: 3 } };

export function convLogSurfaceSx(extra: Record<string, unknown> = {}) {
  return { flex: 1, minHeight: 0, overflow: "auto", bgcolor: "transparent", ...CONV_LOG_PAD, ...extra };
}
