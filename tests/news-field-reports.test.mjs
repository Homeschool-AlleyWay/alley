// Field reports: the cap of 20, the audience gate, the unsafe-word filter and the scene-script generator. No browser.  node tests/news-field-reports.test.mjs
import { buildSync } from "esbuild";
let bad = 0; const t = (n, c, v = "") => { console.log((c ? "PASS  " : "FAIL  ") + n + (v ? "  " + v : "")); if (!c) bad++; };
const src = `export * from "./src/news/fieldreports.ts"; export * from "./src/news/scenegen.ts"; export { SEED_REPORTS } from "./src/news/seedReports.ts";`;
const code = buildSync({ stdin: { contents: src, resolveDir: new URL("..", import.meta.url).pathname, loader: "ts" }, bundle: true, format: "esm", platform: "node", write: false }).outputFiles[0].text;
const M = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
const { FIELD_REPORT_MAX, seedStore, addReport, archiveReport, restoreReport, normalizeStore, checkText, checkReport, canSee, visibleTo, bandOf, generateScript, SEED_REPORTS, rateStory, TR } = M;

/* ---- the cap ---- */
t("FIELD_REPORT_MAX is 20", FIELD_REPORT_MAX === 20);
const s0 = seedStore();
t("seed has exactly 20 active reports", s0.active.length === 20 && SEED_REPORTS.length === 20, String(s0.active.length));
t("seed ids are unique", new Set(s0.active.map((r) => r.id)).size === 20);
const draft = { title: "A new report", beats: [{ text: "Kids plant a tree." }, { text: "The tree grows tall." }] };
const full = addReport(s0, draft);
t("the 21st report is blocked with a friendly message", !full.ok && /20 field reports/.test(full.error) && full.store.active.length === 20, full.error);
const a1 = archiveReport(s0, s0.active[0].id), added = addReport(a1, draft);
t("archiving frees a slot, nothing is deleted", a1.active.length === 19 && a1.archived.length === 1 && added.ok && added.store.active.length === 20);
t("a full newsroom cannot restore an archived report", !restoreReport(added.store, a1.archived[0].id).ok);
const r2 = restoreReport(a1, a1.archived[0].id); t("restore works when there is room", r2.ok && r2.store.active.length === 20 && r2.store.archived.length === 0);
const over = normalizeStore({ v: 1, active: [...s0.active, ...Array.from({ length: 5 }, (_, i) => ({ ...s0.active[0], id: "x" + i, created: 5000 + i }))], archived: [] });
t("an oversize stored list is trimmed to 20 active; the extras are archived, not deleted", over.active.length === 20 && over.archived.length === 5, `${over.active.length}/${over.archived.length}`);
t("every stored report defaults to audience 'all'", normalizeStore({ active: [{ id: "q", title: "T", beats: [{ text: "a b" }] }] }).active[0].audience === "all");
t("visibleTo never exceeds 20", visibleTo(over.active, "adult").length <= 20);

/* ---- the audience gate ---- */
const hs = s0.active.filter((r) => r.audience === "hs"), all = s0.active.filter((r) => r.audience === "all");
t("seed mixes 16 all-ages and 4 high-school reports", all.length === 16 && hs.length === 4, `${all.length}/${hs.length}`);
for (const b of ["k2", "g35", "g68", "general"]) t(`band ${b} sees no high-school report`, visibleTo(s0.active, b).length === 16 && visibleTo(s0.active, b).every((r) => r.audience === "all"));
for (const b of ["hs", "adult"]) t(`band ${b} sees all 20`, visibleTo(s0.active, b).length === 20);
t("canSee gate", canSee("all", "k2") && !canSee("hs", "g68") && canSee("hs", "hs") && canSee("hs", "adult") && !canSee("hs", "general"));
const prof = (age) => (k) => (k === "unify.social.v1" ? JSON.stringify({ profile: { avatar: { age } } }) : null);
t("bandOf reads the avatar age", bandOf(prof("hs")) === "hs" && bandOf(prof("g35")) === "g35" && bandOf(prof("adult")) === "adult" && bandOf(() => null) === "general");
t("bandOf survives a broken profile", bandOf(() => "{nope") === "general");
t("live stories: heated topics are high-school only, blocked words drop the story", rateStory("Vote count", "x", "politics") === "hs" && rateStory("Parade", "fun day", "community") === "all" && rateStory("Shooting downtown", "", "emergency") === "blocked");

/* ---- the filter ---- */
t("all seed reports pass the filter", s0.active.every((r) => checkReport(r).ok), s0.active.filter((r) => !checkReport(r).ok).map((r) => r.title).join());
t("blocklist catches violence, scary, romance, substances", ["The gun was loud", "He was KILLED", "a scary zombie", "boyfriend and girlfriend", "beer and wine", "vape at school", "this is stupid"].every((x) => !checkText(x).ok));
t("blocklist catches leetspeak and spaced letters", !checkText("m u r d e r").ok && !checkText("alc0h0l").ok && !checkText("k1ll").ok);
t("blocklist does not flag normal words (skills, shell, hello, weeds, Scunthorpe-style)", ["Building skills", "Seashell collecting", "hello there", "pull the weeds", "A classic assignment", "therapy dogs"].every((x) => checkText(x).ok));
t("compose step rejects an unsafe post with a friendly message", (() => { const r = addReport(a1, { title: "Zombie night", beats: [{ text: "a" }, { text: "b" }] }); return !r.ok && /reword/.test(r.error) && r.store === a1; })());
t("compose step needs 2-4 beats and a title", !addReport(a1, { title: "x", beats: [{ text: "one" }] }).ok && !addReport(a1, { title: " ", beats: [{ text: "a" }, { text: "b" }] }).ok && !addReport(a1, { title: "x", beats: Array(5).fill({ text: "a b" }) }).ok);

/* ---- the scene-script generator ---- */
const a = generateScript(s0.active[0]), b = generateScript(s0.active[0]);
t("generator is deterministic (same report, same script)", JSON.stringify(a) === JSON.stringify(b));
t("a different report gives a different script", JSON.stringify(generateScript(s0.active[1])) !== JSON.stringify(a));
t("3-5 scenes for every seed report", s0.active.every((r) => r.script.scenes.length >= 3 && r.script.scenes.length <= 5));
t("scenes have layers, caption and a transition", a.scenes.every((s) => s.L.length > 5 && s.cap && ["slide", "page", "fade"].includes(s.tr) && s.dur >= 3));
t("2 beats make 3 scenes, 4 beats make 5", generateScript({ id: "a", title: "T", beats: [{ text: "x y" }, { text: "z w" }] }).scenes.length === 3 && generateScript({ id: "a", title: "T", beats: Array(4).fill({ text: "kids walk in the park" }) }).scenes.length === 5);
t("keywords drive the scene: setting, subject, action", (() => { const g = generateScript({ id: "k", title: "Day", beats: [{ text: "x", setting: "ocean", subject: "whale", action: "float" }, { text: "y", setting: "space", subject: "rocket", action: "fly" }] }); const act = (s) => s.L.find((l) => l.k === "actor"); return g.scenes[1].setting === "ocean" && act(g.scenes[1]).v === "whale" && act(g.scenes[1]).a === "float" && g.scenes[2].setting === "space" && act(g.scenes[2]).v === "rocket"; })());
t("keywords are inferred from text when not given", (() => { const g = generateScript({ id: "k2", title: "Beach day", beats: [{ text: "A dog runs on the beach" }, { text: "The kids jump for joy" }] }); return g.scenes[1].setting === "beach" && g.scenes[1].L.some((l) => l.v === "dog") && g.scenes[2].L.some((l) => l.a === "jump"); })());
t("script is plain JSON (round-trips)", JSON.stringify(JSON.parse(JSON.stringify(a))) === JSON.stringify(a));
t("script duration accounts for transition overlap", Math.abs(a.dur - (a.scenes.reduce((n, s) => n + s.dur, 0) - TR * (a.scenes.length - 1))) < 0.11);
t("hs audience is carried into the script", s0.active.filter((r) => r.audience === "hs").every((r) => r.script.audience === "hs") && s0.active.filter((r) => r.audience === "all").every((r) => r.script.audience === "all"));
process.exit(bad ? 1 : 0);
