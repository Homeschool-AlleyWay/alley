#!/usr/bin/env python3
"""Asset QA gate - encodes the Bible's fail conditions. Exit 1 on any failure."""
import json, os, sys, warnings
warnings.filterwarnings("ignore")
from PIL import Image
from lib import ROOT, ASSET_DIR, PAL

env = json.load(open(os.path.join(ROOT, "tools/env_manifest.json")))
ch = json.load(open(os.path.join(ROOT, "tools/char_manifest.json")))
fails, warns = [], []


def colors(im, q=16):
    px = im.getdata()
    return len({(r // q, g // q, b // q) for r, g, b, a in px if a > 200})


def has_black(im):
    return sum(1 for r, g, b, a in im.getdata() if a > 200 and r < 12 and g < 12 and b < 12)


for e in env:
    p = os.path.join(ASSET_DIR, e["file"])
    if not os.path.exists(p):
        fails.append(f"missing {e['file']}"); continue
    im = Image.open(p).convert("RGBA")
    if im.size != (e["w"], e["h"]):
        fails.append(f"{e['key']}: size {im.size} != manifest")
    if im.getchannel("A").getextrema()[0] == 255 and e["category"] not in ("floor",):
        warns.append(f"{e['key']}: no transparency")
    if has_black(im):
        fails.append(f"{e['key']}: pure black pixels (Bible: never pure black)")
    if e["category"] != "seatview" and e["key"] not in ("light_pool_warm", "screen_bezel_left") and colors(im) < 10:
        fails.append(f"{e['key']}: only {colors(im)} colors - reads as a flat rectangle")

FH, FW = 128, 96
for s in ch["sheets"]:
    p = os.path.join(ASSET_DIR, s["file"])
    if not os.path.exists(p):
        fails.append(f"missing {s['file']}"); continue
    im = Image.open(p).convert("RGBA")
    fw, fh, nd = s["frameWidth"], s["frameHeight"], len(s["dirs"])
    FW_, FH_ = fw, fh
    if im.size != (fw * s["frames"], fh * nd):
        fails.append(f"{s['key']}: sheet size {im.size}"); continue
    a = im.getchannel("A")
    for r in range(nd):
        for c in range(s["frames"]):
            fr = a.crop((c * fw, r * fh, c * fw + fw, r * fh + fh))
            bb = fr.point(lambda v: 255 if v > 40 else 0).getbbox()
            if bb is None:
                fails.append(f"{s['key']} r{r}c{c}: empty frame")
            elif bb[0] <= 0 or bb[2] >= fw or bb[1] <= 0 or bb[3] >= fh:
                fails.append(f"{s['key']} r{r}c{c}: clipped at frame edge {bb}")
            elif not s["seatview"] and s["action"] in ("idle", "walk") and not (106 <= bb[3] <= 121):
                warns.append(f"{s['key']} r{r}c{c}: feet baseline y={bb[3]} (want ~108-112)")
    if s["action"] == "idle" and colors(im) < 12:
        fails.append(f"{s['key']}: too few colors")

# static clones check: idle frames of different characters must differ
seen = {}
for s in ch["sheets"]:
    if s["action"] != "idle" or s["seatview"]:
        continue
    im = Image.open(os.path.join(ASSET_DIR, s["file"])).convert("RGBA").crop((0, 0, FW, FH))
    h = hash(im.tobytes())
    if h in seen:
        fails.append(f"static clone: {s['character']} == {seen[h]}")
    seen[h] = s["character"]

print(f"checked {len(env)} env assets, {len(ch['sheets'])} character sheets")
for w in warns[:15]:
    print("WARN", w)
if len(warns) > 15:
    print(f"WARN ... {len(warns) - 15} more")
for f in fails:
    print("FAIL", f)
print("RESULT:", "FAIL" if fails else "PASS", f"({len(fails)} failures, {len(warns)} warnings)")
sys.exit(1 if fails else 0)
