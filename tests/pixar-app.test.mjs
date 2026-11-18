// Builds the Pixar app (tools/build_pixar_app.py) and checks its output. Run after `npm run build`:  node tests/pixar-app.test.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join("/tmp/claude-0/-home-user-alley/7bbe5bc9-a7dd-5fe8-b104-5a45d54ba7ef/scratchpad", "dist-pa-test");
execFileSync("python3", [path.join(ROOT, "tools/build_pixar_app.py"), OUT, "--static-only"], { stdio: "inherit" });
let bad = 0; const t = (n, c) => { console.log((c ? "PASS  " : "FAIL  ") + n); if (!c) bad++; };
const rd = (f) => fs.readFileSync(path.join(OUT, f), "utf8");
t('look.js ships LOOK "pixar"', rd("look.js").includes('var LOOK = "pixar"'));
t("pixar-ui.css at root", fs.existsSync(path.join(OUT, "pixar-ui.css")));
t("source look.js still papercut", fs.readFileSync(path.join(ROOT, "look.js"), "utf8").includes('var LOOK = "papercut"'));
t("index title suffix", /<title>[^<]*- Pixar edition<\/title>/.test(rd("index.html")));
t("nested page uses ../look.js", rd("prototypes/newsroom-enhanced.html").includes('<script src="../look.js">'));
t("supabase config shipped", fs.existsSync(path.join(OUT, "supabase-config.js")));
const htmls = ["index.html", "mail.html", "dorm.html", "phone.html", "news.html"];
t("look.js first script on pages", htmls.every((h) => /<script[^>]*src="look\.js"/.test(rd(h).match(/<script[^>]*>/)[0])));
process.exit(bad ? 1 : 0);
