import pw from "/Users/ishupatel/.nvm/versions/node/v25.8.1/lib/node_modules/playwright/index.js";
const { chromium } = pw;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:3140/", { waitUntil: "networkidle" });
await p.waitForTimeout(2800);
const info = await p.evaluate(() => {
  const el = [...document.querySelectorAll("span")].find(s => s.textContent.trim() === "matched by AI.");
  if (!el) return "not found";
  const r = el.getBoundingClientRect();
  let n = el.parentElement, chain = [];
  while (n && n !== document.body && chain.length < 5) {
    const cs = getComputedStyle(n);
    const pr = n.getBoundingClientRect();
    chain.push({
      tag: n.tagName, cls: (n.className||"").toString().slice(0,55),
      overflowY: cs.overflowY, h: +pr.height.toFixed(1), bottom: +pr.bottom.toFixed(1),
    });
    n = n.parentElement;
  }
  return { text: r ? {h:+r.height.toFixed(1), bottom:+r.bottom.toFixed(1)} : null, chain };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
