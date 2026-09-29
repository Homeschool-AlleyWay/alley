#!/usr/bin/env python3
"""Renders preview/auditorium_preview.png from auditorium.layout.json using the real generated PNGs."""
import json, os, random, sys
from PIL import Image
from lib import ROOT, ASSET_DIR
from layout import iso

L = json.load(open(os.path.join(ROOT, "src/game/data/auditorium.layout.json")))
ENV = {e["key"]: e for e in json.load(open(os.path.join(ROOT, "tools/env_manifest.json")))}
CH = json.load(open(os.path.join(ROOT, "tools/char_manifest.json")))
DIRS = CH["directions"]
KIND = sys.argv[1] if len(sys.argv) > 1 else "math_coordinate"
SUBJ = sys.argv[2] if len(sys.argv) > 2 else "math"
OUTNAME = sys.argv[3] if len(sys.argv) > 3 else "auditorium_preview.png"
DEC = {e["key"]: e for e in json.load(open(os.path.join(ROOT, "tools/decor_manifest.json")))}
THEME = {"math": (79,145,199), "ela": (136,184,154), "science": (169,221,242), "history": (234,185,78), "technology": (50,108,158), "art": (242,143,126)}
cache = {}


def img(path):
    if path not in cache:
        cache[path] = Image.open(os.path.join(ASSET_DIR, path)).convert("RGBA")
    return cache[path]


def frame(char, action, dname, col):
    sheet = next(s for s in CH["sheets"] if s["character"] == char and s["action"] == action)
    im = img(sheet["file"])
    r = DIRS.index(dname)
    return im.crop((col * 96, r * 128, col * 96 + 96, r * 128 + 128))


items = []  # (depth, image, x, y)
for p in L["placements"]:
    if p.get("screenContent") and p["screenContent"] != KIND:
        continue
    im = img(ENV[p["key"]]["file"])
    items.append((p["depth"], im, p["x"] - p["ox"] * im.width, p["y"] - p["oy"] * im.height))

rnd = random.Random(11)
students = [s["id"] for s in CH["roster"] if s["id"].startswith("student_hs")]
seats = L["seats"][:]
rnd.shuffle(seats)
empty = {s["id"] for s in seats[:6]}
for s in L["seats"]:
    if s["id"] in empty:
        continue
    who = students[(s["gx"] * 7 + s["gy"] * 3) % len(students)]
    r = rnd.random()
    action, col = ("raisehand", 4) if r < 0.16 else (("write", rnd.randrange(6)) if r < 0.4 else ("sit", rnd.randrange(4)))
    sx, sy = iso(s["sitX"], s["sitY"])
    fr = frame(who, action, s["facing"], col)
    items.append((s["depth"], fr, sx - 48, sy - s["elev"] - 108))

t = L["teacher"]
sx, sy = iso(t["gx"], t["gy"])
items.append((int((t["gx"] + t["gy"]) * 100 + 20), frame("teacher_f", "talk", t["facing"], 2), sx - 48, sy - t["elev"] - 108))
sx, sy = iso(6.55, 6.5)  # player standing in the aisle on tier 2
items.append((int((6.55 + 6.5) * 100 + 20), frame("player_student", "idle", "up_left", 0), sx - 48, sy - 24 - 108))

from PIL import ImageChops
def tint(im, col):
    r, g, b, a = im.split()
    tr = ImageChops.multiply(Image.new("L", im.size, col[0]), r); tg = ImageChops.multiply(Image.new("L", im.size, col[1]), g); tb = ImageChops.multiply(Image.new("L", im.size, col[2]), b)
    return Image.merge("RGBA", (tr, tg, tb, a))
for p_ in L["decor"][SUBJ]:
    im = img(DEC[p_["key"]]["file"]); items.append((p_["depth"], im, p_["x"] - p_["ox"] * im.width, p_["y"] - p_["oy"] * im.height))
for p_ in L["accents"]:
    im = tint(img(DEC[p_["key"]]["file"]), THEME[SUBJ]); items.append((p_["depth"], im, p_["x"] - p_["ox"] * im.width, p_["y"] - p_["oy"] * im.height))
items.sort(key=lambda i: i[0])
minx = min(i[2] for i in items); miny = min(i[3] for i in items)
maxx = max(i[2] + i[1].width for i in items); maxy = max(i[3] + i[1].height for i in items)
W, H = int(maxx - minx) + 40, int(maxy - miny) + 40
canvas = Image.new("RGBA", (W, H), (240, 243, 239, 255))
for _, im, x, y in items:
    canvas.alpha_composite(im, (int(x - minx) + 20, int(y - miny) + 20))
out = os.path.join(ROOT, "preview", OUTNAME)
canvas.save(out)
print(out, canvas.size)
