// No tree may stand on or hug a walkway.  node tests/trees.test.mjs
import { buildSync } from "esbuild";
const load = async (f) => import("data:text/javascript;base64," + Buffer.from(buildSync({ entryPoints: [f], bundle: true, format: "esm", write: false }).outputFiles[0].text).toString("base64"));
const { PATHS, PROPS, outsideTrees, PLANTS, PLANT_R, DOORS, NEWS, OPEN, BLOCKS, W, H } = await load("src/hall3d/campus.ts");
const { clearance, TREE_CLEAR } = await load("src/shared/walkways.ts");
let bad = 0; const t = (n, c, v = "") => { console.log((c ? "PASS  " : "FAIL  ") + n + (v ? "  " + v : "")); if (!c) bad++; };
const inner = PROPS.filter((p) => p.kind === "tree"); const out = outsideTrees();
t("hall has plaza trees", inner.length >= 6, String(inner.length)); t("lawn has many trees", out.length >= 100, String(out.length));
const worst = (list, rf) => list.reduce((m, p) => Math.min(m, clearance(PATHS, p.x, p.y, rf(p))), Infinity);
t(`plaza trees keep >= ${TREE_CLEAR} from every walkway edge`, worst(inner, () => 0.6) >= TREE_CLEAR - 1e-6, worst(inner, () => 0.6).toFixed(2));
t(`lawn trees keep >= ${TREE_CLEAR} from every walkway edge`, worst(out, (p) => 0.8 * p.s) >= TREE_CLEAR - 1e-6, worst(out, (p) => 0.8 * p.s).toFixed(2));
t("no lawn tree in front of the entrance path (x 24-32, y > H)", out.every((p) => !(p.x > 24 && p.x < 32 && p.y > H && p.y < H + 30)));
t("tall plants stay out of every door's doorway", PLANTS.filter((p) => p.kind !== "hang").every((p) => [...DOORS.map((d) => ({ x: d.cx, y: d.cy })), { x: NEWS.cx, y: 0 }, { x: 0, y: OPEN.cy }].every((d) => Math.hypot(p.x - d.x, p.y - d.y) > 2.2)));
t("tall plants are not inside a block", PLANTS.filter((p) => p.kind !== "hang").every((p) => BLOCKS.every((b) => !(p.x > b.rect.x - PLANT_R && p.x < b.rect.x + b.rect.w + PLANT_R && p.y > b.rect.y - PLANT_R && p.y < b.rect.y + b.rect.h + PLANT_R))));
t("tall plants are off the plaza cross, entrance lane and door lanes", PLANTS.filter((p) => p.kind !== "hang").every((p) => clearance(PATHS.slice(4, 4 + 2 + DOORS.length + 2), p.x, p.y, PLANT_R) >= 0.3));
process.exit(bad ? 1 : 0);
