// Customizer data hooks: old saves load, regions are clamped, new optional fields default. Run: node tests/avatar-regions.test.mjs
import { buildSync } from "esbuild";
import assert from "node:assert/strict";

const out = buildSync({ entryPoints: ["src/hall3d/avatar.ts"], bundle: true, format: "esm", write: false, platform: "node" }).outputFiles[0].text;
const A = await import("data:text/javascript;base64," + Buffer.from(out).toString("base64"));

const old = A.normalizeAvatar({ name: "Old save", age: "g35", hair: "#112233" });   // a profile saved before any of the new fields existed
assert.deepEqual(old.regions, {});
assert.equal(old.hairTip, null); assert.equal(old.hairHi, null); assert.equal(old.rings, null);
assert.equal(old.prop, "chibi", "specs saved before the proportion setting keep their chibi look");

const r = A.normalizeAvatar({ regions: { top: { c: "#d9564a", w: 9, l: 0.1, paint: "data:image/png;base64,AAAA" }, hair: { c: 5, pat: "stripes" }, bad: 7, shoes: { paint: "javascript:alert(1)" } } }).regions;
assert.equal(r.top.c, "#d9564a"); assert.equal(r.top.w, A.REGION_LIMITS.max); assert.equal(r.top.l, A.REGION_LIMITS.min); assert.ok(r.top.paint.startsWith("data:image/"));
assert.equal(r.hair.c, undefined); assert.equal(r.hair.pat, "stripes"); assert.equal(r.bad, undefined); assert.equal(r.shoes.paint, undefined);

assert.notEqual(A.defaultAvatar().regions, A.defaultAvatar().regions, "regions must not be shared between defaults");
assert.ok(A.OPTIONS.shoeStyle.some((o) => o.id === "dress"), "dress shoes offered");
assert.ok(A.starterCloset(A.defaultAvatar()).some((o) => o.name === "Winter") && A.starterCloset(A.defaultAvatar()).length <= A.CLOSET_SLOTS);
console.log("PASS  avatar regions + defaults");
