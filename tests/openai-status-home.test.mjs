/**
 * QA: OpenAI status snapshot parser (espejo openaiStatusApi).
 * Run: node tests/openai-status-home.test.mjs
 */
import assert from "node:assert/strict";

function asIndicator(raw) {
  const s = String(raw ?? "").toLowerCase();
  if (s === "none" || s === "minor" || s === "major" || s === "critical") return s;
  return "unknown";
}

function openAiStatusIsDegraded(snap) {
  if (!snap) return false;
  if (snap.indicator === "minor" || snap.indicator === "major" || snap.indicator === "critical") return true;
  return (snap.incidents?.length ?? 0) > 0;
}

assert.equal(asIndicator("minor"), "minor");
assert.equal(openAiStatusIsDegraded({ indicator: "none", incidents: [] }), false);
assert.equal(openAiStatusIsDegraded({ indicator: "minor", incidents: [{ name: "Elevated error rates" }] }), true);

const res = await fetch("https://status.openai.com/api/v2/summary.json", { cache: "no-store" });
assert.equal(res.ok, true);
const j = await res.json();
assert.ok(j.status?.indicator);
console.log("OK openai-status-home · indicator=", j.status.indicator, "incidents=", (j.incidents || []).length);
