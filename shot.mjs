import pw from "/Users/ishupatel/.nvm/versions/node/v25.8.1/lib/node_modules/playwright/index.js";
const { chromium } = pw;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
for (const [name, path, sel] of [
  ["hero", "/", "h1"],
  ["login", "/login", ".glass-strong"],
  ["register", "/register", "main"],
]) {
  await p.goto("http://localhost:3140" + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(2600);
  const el = await p.$(sel);
  await (el || p).screenshot({ path: `/tmp/ui-${name}.png` });
  console.log("shot", name);
}
await b.close();
