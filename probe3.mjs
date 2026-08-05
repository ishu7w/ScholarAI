import pw from "/Users/ishupatel/.nvm/versions/node/v25.8.1/lib/node_modules/playwright/index.js";
const { chromium } = pw;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:3140/login", { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const btn = document.querySelector("button[type=submit]");
  const form = document.querySelector("form");
  const card = document.querySelector(".glass-strong");
  const g = (e) => { if(!e) return null; const cs=getComputedStyle(e); const b=e.getBoundingClientRect();
    return { h:+b.height.toFixed(1), opacity:cs.opacity, filter:cs.filter, transform:cs.transform, visibility:cs.visibility }; };
  return { button: btn ? { text: btn.textContent.trim(), ...g(btn) } : "MISSING", form: g(form), card: g(card) };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
