import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const live = readFileSync(new URL("../academy-live.js", import.meta.url), "utf8");
const family = readFileSync(new URL("../demo/family.ts", import.meta.url), "utf8");
const curriculum = readFileSync(new URL("../demo/curriculum.ts", import.meta.url), "utf8");

test("academy message listener rejects foreign origins", () => {
  assert.match(live, /window\.addEventListener\("message", function \(e\) \{\s*if \(e\.origin !== window\.location\.origin\) return;/);
});
test("academy messages never use wildcard postMessage targets", () => {
  assert.doesNotMatch(live, /postMessage\([\s\S]*?,\s*["']\*["']\)/);
});
test("family sync includes the curriculum app completion key", () => {
  assert.match(curriculum, /const KEY = "unify\.curapp\.v1"/);
  assert.match(family, /const SYNC = \[[^\]]*"unify\.curapp\.v1"/);
});
