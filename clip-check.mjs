// Detects vertically clipped text: for each heading, compare the element's
// scrollHeight to its clientHeight inside any overflow-clipping ancestor,
// and check whether the last text baseline sits below the clip boundary.
import pw from "/Users/ishupatel/.nvm/versions/node/v25.8.1/lib/node_modules/playwright/index.js";
const { chromium } = pw;

const BASE = "http://localhost:3140";
const PAGES = [
  ["landing", "/"],
  ["login", "/login"],
  ["register", "/register"],
  ["catalogue", "/catalogue"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let problems = 0;

for (const [name, path] of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  // let reveal animations finish
  await page.waitForTimeout(2500);

  const found = await page.evaluate(() => {
    const out = [];
    const nodes = document.querySelectorAll("h1, h2, h3, .ed-display, .text-outline");
    for (const el of nodes) {
      const text = (el.textContent || "").trim().slice(0, 42);
      if (!text) continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;

      // Walk ancestors for one that clips overflow, and measure how far the
      // element's painted box extends past that ancestor's bottom edge.
      let node = el.parentElement;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        const clips =
          cs.overflowY === "hidden" || cs.overflowY === "clip" ||
          cs.overflow === "hidden" || cs.overflow === "clip";
        if (clips) {
          const pr = node.getBoundingClientRect();
          const overflowPx = r.bottom - pr.bottom;
          if (overflowPx > 1.0) {
            out.push({ text, overflowPx: +overflowPx.toFixed(2), tag: el.tagName });
          }
          break;
        }
        node = node.parentElement;
      }
    }
    return out;
  });

  if (found.length) {
    problems += found.length;
    console.log(`FAIL ${name}:`);
    for (const f of found) console.log(`   +${f.overflowPx}px  <${f.tag}> "${f.text}"`);
  } else {
    console.log(`OK   ${name}: no clipped headings`);
  }
}

await browser.close();
console.log(problems === 0 ? "\nRESULT: no vertical clipping detected" : `\nRESULT: ${problems} clipped element(s)`);
process.exit(problems === 0 ? 0 : 1);
