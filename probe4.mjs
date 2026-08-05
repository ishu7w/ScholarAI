import pw from "/Users/ishupatel/.nvm/versions/node/v25.8.1/lib/node_modules/playwright/index.js";
const { chromium } = pw;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:3140/", { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const h1 = document.querySelector("h1");
  const out = { h1: { client: h1.clientHeight, scroll: h1.scrollHeight, rect: +h1.getBoundingClientRect().height.toFixed(1) }, wrappers: [] };
  for (const w of h1.children) {
    const cs = getComputedStyle(w);
    const wr = w.getBoundingClientRect();
    const inner = w.firstElementChild;
    const ir = inner ? inner.getBoundingClientRect() : null;
    out.wrappers.push({
      text: w.textContent.trim().slice(0, 26),
      wrapBottom: +wr.bottom.toFixed(1),
      innerBottom: ir ? +ir.bottom.toFixed(1) : null,
      clippedPx: ir ? +(ir.bottom - wr.bottom).toFixed(1) : null,
      overflow: cs.overflowY, mb: cs.marginBottom, pb: cs.paddingBottom,
    });
  }
  out.lastWrapperVsH1 = +(h1.lastElementChild.getBoundingClientRect().bottom - h1.getBoundingClientRect().bottom).toFixed(1);
  return out;
});
console.log(JSON.stringify(r, null, 2));
await b.close();
