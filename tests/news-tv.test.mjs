// Hallway TV hand-off (src/news/tv.ts): live canvas, audience gate, dispose.  npm run build && node tests/news-tv.test.mjs
import http from "node:http"; import path from "node:path"; import { readFile } from "node:fs/promises"; import { chromium } from "playwright";
const ROOT = path.resolve(new URL("..", import.meta.url).pathname), PORT = process.env.TV_PORT || "8871";
const srv = http.createServer(async (q, r) => { try { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, "http://x").pathname)); if (!f.startsWith(ROOT)) throw 0; const b = await readFile(f); r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : "text/javascript" }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((ok) => srv.listen(+PORT, "127.0.0.1", ok));
let bad = 0; const t = (n, c, v = "") => { console.log((c ? "PASS  " : "FAIL  ") + n + (v ? "  " + v : "")); if (!c) bad++; };
const b = await chromium.launch({ executablePath: process.env.SMOKE_CHROMIUM || undefined, args: ["--no-sandbox"] });
const p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:${PORT}/tests/news-tv-harness.html`); await p.waitForFunction(() => window.__tv);
const r = await p.evaluate(() => {
  const tv = window.__tv, ctx = tv.canvas.getContext("2d"), sig = () => { const d = ctx.getImageData(0, 0, tv.canvas.width, tv.canvas.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h; };
  const out = { size: [tv.canvas.width, tv.canvas.height], hint: tv.texture.colorSpace, repainted: tv.update(1), s1: sig() }; tv.update(2.5); out.s2 = sig(); out.noRepaint = tv.update(0.001);
  const seen = (hs) => { tv.setAudienceHS(hs); const titles = new Set(), auds = new Set(); for (let i = 0; i < 24; i++) { const n = tv.now(); titles.add(n.title); auds.add(n.audience); tv.next(); } return { titles: titles.size, auds: [...auds].sort().join() }; };
  out.kid = seen(false); out.hs = seen(true); out.now = tv.now(); tv.dispose(); out.after = tv.update(1);
  return out;
});
t("canvas is the requested size", r.size[0] === 768 && r.size[1] === 432);
t("texture hint is sRGB", r.hint === "srgb");
t("update() repaints and returns true; canvas is not blank", r.repainted === true && r.s1 !== 0);
t("the canvas changes as the film plays", r.s1 !== r.s2);
t("repaint is throttled (no repaint on a 1 ms tick)", r.noRepaint === false);
t("a general viewer sees 16 all-ages reports and no high-school one", r.kid.titles === 16 && r.kid.auds === "all", JSON.stringify(r.kid));
t("a high-school viewer sees all 20, including 'hs'", r.hs.titles === 20 && r.hs.auds === "all,hs", JSON.stringify(r.hs));
t("dispose() stops updates", r.after === false);
t("no script errors", errs.length === 0, errs.join("; "));
await b.close(); srv.close(); process.exit(bad ? 1 : 0);
