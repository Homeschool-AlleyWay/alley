// Proportion check (no browser): people vs props, using the real constants.  node tests/scale-proportions.test.mjs
import { AGE_H, PROP_H, INTERIOR_SCALE as IS, CHAR_K } from "../src/shared/scale.ts";
let bad = 0; const t = (n, c, v = "") => { console.log((c ? "PASS  " : "FAIL  ") + n + (v ? "  " + v : "")); if (!c) bad++; };
const r = (x) => +x.toFixed(2), adult = AGE_H.adult * CHAR_K * IS, W = (h) => h * IS;   // world units
t("adult >= 1.7 world", adult >= 1.7, `${r(adult)}`);
t("ages ordered k2<g35<g68<hs<adult", AGE_H.k2 < AGE_H.g35 && AGE_H.g35 < AGE_H.g68 && AGE_H.g68 < AGE_H.hs && AGE_H.hs < AGE_H.adult);
t("kid k2 <= 0.65 adult", AGE_H.k2 <= 0.65 * AGE_H.adult);
t("lectern <= 0.65 adult", PROP_H.lectern <= 0.65 * AGE_H.adult * CHAR_K, `${r(PROP_H.lectern / (AGE_H.adult * CHAR_K))}`);
t("adult >= 1.6x lectern", AGE_H.adult * CHAR_K >= 1.6 * PROP_H.lectern);
t("lectern top ~1.05-1.15 (real-equivalent)", PROP_H.lectern >= 1.05 && PROP_H.lectern <= 1.15);
t("stage riser 0.5-0.9 world", W(PROP_H.audStage) >= 0.5 && W(PROP_H.audStage) <= 0.92, `${r(W(PROP_H.audStage))}`);
for (const k of ["classDoor", "hallDoor"]) t(`${k} 1.15-1.4x adult`, PROP_H[k] / (AGE_H.adult * CHAR_K) >= 1.15 && PROP_H[k] / (AGE_H.adult * CHAR_K) <= 1.4, `${r(PROP_H[k] / (AGE_H.adult * CHAR_K))}`);
t("people ~85% of door", AGE_H.adult * CHAR_K / PROP_H.classDoor >= 0.75 && AGE_H.adult * CHAR_K / PROP_H.classDoor <= 0.9);
t("desk top 0.72-0.76 (adult/hs)", PROP_H.deskTop >= 0.72 && PROP_H.deskTop <= 0.76);
t("desk top below hs elbow height (<0.5 hs)", PROP_H.deskTop <= 0.5 * AGE_H.hs);
t("seat 0.42-0.46", PROP_H.seat >= 0.42 && PROP_H.seat <= 0.46);
t("lockers 1.8-2.0 and shorter than door", PROP_H.locker >= 1.8 && PROP_H.locker <= 2.0 && PROP_H.locker < PROP_H.hallDoor);
t("teacher desk below lectern-class limit", PROP_H.classTeacherDesk <= 0.65 * AGE_H.adult * CHAR_K);
process.exit(bad ? 1 : 0);
