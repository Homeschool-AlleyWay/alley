#!/usr/bin/env python3
"""Builds src/game/data/hall.layout.json: hallway placements, collision, nav grid, door zones (same conventions as layout.py)."""
import json, os
from lib import ROOT, TILE_W, TILE_H

GW, GH = 24, 6
SUBJECTS = ["math", "ela", "science", "history"]
DOORS = {"A": 6, "B": 16}                       # left tile of each 2-tile door segment on the y=0 wall
LOCKER_COLS = [c for c in range(GW) if not (6 <= c < 8 or 16 <= c < 18 or 10 <= c < 14)]
iso = lambda x, y: ((x - y) * TILE_W / 2, (x + y) * TILE_H / 2)


def main():
    man = {e["key"]: e for e in json.load(open(os.path.join(ROOT, "tools/env_manifest.json")))}
    P, blocked = [], []

    def add(key, sx, sy, depth, **kw):
        a = man[key]
        P.append(dict(key=key, x=round(sx, 1), y=round(sy, 1), depth=depth, ox=a["anchor"][0] / a["w"], oy=a["anchor"][1] / a["h"], **kw))

    def obj(key, gx, gy, w, d, elev, off, **kw):
        sx, sy = iso(gx + w, gy + d)
        add(key, sx, sy - elev, int((gx + w + gy + d) * 100 + off), **kw)

    def mount(key, x, z, depth=-450, **kw):            # flat piece sheared onto the y=0 wall (same maths as auditorium posters)
        sx, sy = iso(x, 0)
        a = man[key]
        P.append(dict(key=key, x=round(sx, 1), y=round(sy - z - a["h"] + a["w"] / 2, 1), depth=depth, ox=0, oy=0, **kw))

    for x in range(GW):
        for y in range(GH):
            rug = y in (2, 3)
            key = "floor_hall_tile_01" if not rug else ("floor_hall_rug_a" if y == 2 else "floor_hall_rug_b")
            add(key, *iso(x, y), -1000)
    for y0 in range(0, GH, 2):
        add("hall_wall_left", *iso(0, y0), -500)
    for x0 in range(0, GW, 2):
        if x0 in DOORS.values():
            room = "A" if x0 == DOORS["A"] else "B"
            for s in SUBJECTS:
                add(f"hall_door__{s}", *iso(x0, 0), -500, room=room, subject=s, kind="door", visible=False)
        else:
            add("hall_wall_right", *iso(x0, 0), -500)
    for room, x0 in DOORS.items():
        for s in SUBJECTS:
            mount(f"hall_sign__{s}", x0, 150, -440, room=room, subject=s, kind="sign", visible=False)

    for c in LOCKER_COLS:
        obj(f"hall_locker_{c % 4}", c, 0, 1, 0.6, 0, 20)
        blocked.append(dict(gx=c, gy=0, w=1, d=0.6, kind="locker"))
    obj("hall_bench", 10.0, 0.05, 2, 0.64, 0, 20); blocked.append(dict(gx=10.0, gy=0.05, w=2, d=0.64, kind="bench"))
    obj("hall_fountain", 12.15, 0.05, 0.7, 0.62, 0, 20); blocked.append(dict(gx=12.15, gy=0.05, w=0.7, d=0.62, kind="fountain"))
    obj("hall_bin", 13.1, 0.1, 0.45, 0.45, 0, 20); blocked.append(dict(gx=13.1, gy=0.1, w=0.45, d=0.45, kind="bin"))
    for px, py in [(1.5, 5.5), (22.5, 5.5)]:
        obj("plant_medium_01", px, py, 0, 0, 0, 25)
        blocked.append(dict(gx=px - 0.3, gy=py - 0.3, w=0.6, d=0.6, kind="plant"))

    for x in (0.4, 2.6, 4.8, 8.2, 18.6, 20.8, 22.6):
        mount("hall_window", x, 104)
    mount("hall_bulletin", 10.0, 68); mount("hall_trophy", 12.0, 72); mount("hall_clock", 14.6, 138)
    for x in range(0, GW, 4):
        mount("hall_bunting", x, 176, -440)
    for i, (lx, ly) in enumerate([(3.0, 2.6), (9.0, 2.6), (15.0, 2.6), (21.0, 2.6)]):
        obj(f"hall_lantern_{i}", lx, ly, 0, 0, 70, 30)

    doors = []
    for room, x0 in DOORS.items():
        doors.append(dict(room=room, x0=x0, x1=x0 + 2, trigger=0.75, approach=dict(gx=x0 + 1.0, gy=1.1), tiles=[dict(x=x0, y=0), dict(x=x0 + 1, y=0)]))
    nav = []
    for y in range(GH):
        row = ""
        for x in range(GW):
            cx, cy = x + 0.5, y + 0.5
            hit = any(b["gx"] - 0.05 <= cx <= b["gx"] + b["w"] + 0.05 and b["gy"] - 0.05 <= cy <= b["gy"] + b["d"] + 0.05 for b in blocked)
            row += "#" if hit else "."
        nav.append(row)
    out = dict(grid=dict(w=GW, h=GH), nav=nav, blocked=blocked, doors=doors, subjects=SUBJECTS,
               entrance=dict(gx=GW - 0.6, gy=3.5), playerSpawn=dict(gx=11.5, gy=3.6),
               periodSubjects=dict(early=dict(A="math", B="ela"), late=dict(A="science", B="history")),
               placements=sorted(P, key=lambda p: p["depth"]))
    json.dump(out, open(os.path.join(ROOT, "src/game/data/hall.layout.json"), "w"))
    print(f"hall layout: {len(P)} placements, nav {GW}x{GH}, {len(blocked)} blockers")


if __name__ == "__main__":
    main()
