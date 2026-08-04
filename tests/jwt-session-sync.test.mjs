/**
 * QA: samePatyUser + token sin exp (lógica espejo de patyia-jwt.ts).
 * Run: node tests/jwt-session-sync.test.mjs
 */
import assert from "node:assert/strict";

function samePatyUser(a, b) {
  const na = String(a ?? "").trim().toUpperCase();
  const nb = String(b ?? "").trim().toUpperCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const strip = (s) => s.replace(/@CONTAPYME\.COM$/i, "").replace(/@.*$/, "");
  return strip(na) === strip(nb);
}

function isPatyJwtExpired(token, skewSec = 60) {
  try {
    const part = String(token || "").trim().split(".")[1];
    if (!part) return false;
    const raw = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (typeof raw.exp !== "number") return false;
    return Date.now() / 1000 >= raw.exp - skewSec;
  } catch {
    return false;
  }
}

assert.equal(samePatyUser("JAGUDELOE", "jagudeloe@contapyme.com"), true);
assert.equal(samePatyUser("jagudeloe@contapyme.com", "JAGUDELOE@CONTAPYME.COM"), true);
assert.equal(samePatyUser("ALGO", "OTRO"), false);

const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
const payload = Buffer.from(JSON.stringify({ itercero: "1", icontacto: "2", iat: 1 })).toString("base64url");
assert.equal(isPatyJwtExpired(`${header}.${payload}.x`), false);

console.log("OK jwt-session-sync · samePatyUser + token sin exp");
