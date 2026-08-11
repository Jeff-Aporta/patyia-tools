const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = "http://127.0.0.1:5505/apps/isa-patyia/frontend/index.html";
const OUT = path.join(__dirname, "_login-verify");
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: true });
  console.log("SHOT", p);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const logs = [];
  page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

  const loginResponses = [];
  page.on("response", async (res) => {
    if (!/portal-login/i.test(res.url())) return;
    let body = "";
    try { body = await res.text(); } catch { /* ignore */ }
    loginResponses.push({ url: res.url(), status: res.status(), body: body.slice(0, 500) });
    console.log("NET portal-login", res.status(), res.url(), body.slice(0, 220));
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem("patyia-apptools:iss-target", "local");
    localStorage.setItem("jeff:gateway-local", "0");
    try { localStorage.removeItem("system-login:session:isa-patyia"); } catch {}
  });
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await shot(page, "01-loaded.png");

  // Abrir login
  const loginBtn = page.getByRole("button", { name: /iniciar sesi[oó]n/i }).first();
  await loginBtn.waitFor({ timeout: 20000 });
  await loginBtn.click();
  await page.waitForTimeout(1000);
  await shot(page, "02-login-open.png");

  // Campos usuario/password — varios selectores posibles
  const user = page.locator('input[type="text"], input[type="email"], input[name*="user" i], input[name*="email" i], input[placeholder*="usuario" i], input[placeholder*="correo" i]').first();
  const pass = page.locator('input[type="password"]').first();
  await user.waitFor({ timeout: 15000 });
  await user.fill("vrestrepo");
  await pass.fill("Fb7@dxh4");
  await shot(page, "03-filled.png");

  // Submit
  const submit = page.getByRole("button", { name: /iniciar sesi[oó]n|entrar|login|continuar/i }).last();
  await submit.click();
  await page.waitForTimeout(4000);
  await shot(page, "04-after-submit.png");

  // Si MULTI_EMPRESA: elegir InSoft
  const insoft = page.getByText(/InSoft SAS/i).first();
  if (await insoft.count()) {
    console.log("MULTI_EMPRESA UI visible — selecting InSoft SAS");
    await insoft.click();
    await page.waitForTimeout(500);
    const cont = page.getByRole("button", { name: /continuar|aceptar|seleccionar|iniciar/i }).last();
    if (await cont.count()) await cont.click();
    await page.waitForTimeout(4000);
    await shot(page, "05-after-empresa.png");
  }

  const bodyText = await page.locator("body").innerText();
  const hasBadEnv = /CLIENTESIS_REST_BASE/i.test(bodyText);
  const hasSession = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("system-login:session:isa-patyia");
      if (raw && JSON.parse(raw)?.token) return true;
      return !!(window.ISA?.Session?.current?.token || window.ISA?.AuthApi?.readSession?.()?.token);
    } catch { return false; }
  });

  console.log("RESULT hasBadEnv=", hasBadEnv, "hasSession=", hasSession);
  console.log("loginResponses=", JSON.stringify(loginResponses, null, 2));
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify({ hasBadEnv, hasSession, loginResponses, logs: logs.slice(-40) }, null, 2));

  if (hasBadEnv) {
    console.error("FAIL: CLIENTESIS_REST_BASE still visible");
    process.exitCode = 2;
  } else if (!hasSession && !loginResponses.some((r) => r.status === 200 && /"ok"\s*:\s*true/.test(r.body))) {
    // puede haber quedado en selector multiempresa sin token aún
    const multiOk = loginResponses.some((r) => r.status === 409 || /MULTI_EMPRESA/.test(r.body));
    if (multiOk && await insoft.count()) {
      console.log("PARTIAL: MULTI_EMPRESA reached (fix real vs CLIENTESIS_REST_BASE)");
    } else {
      console.error("FAIL: no session and no successful login");
      process.exitCode = 1;
    }
  } else {
    console.log("PASS: login solution works in UI");
  }

  await browser.close();
})().catch((e) => {
  console.error("HARNESS ERROR", e);
  process.exit(1);
});
