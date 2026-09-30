#!/usr/bin/env python3
"""Builds src/game/data/auditorium.layout.json: placements, depth, seats, approach points, collision, stations, subject decor."""
import json, os
from lib import ROOT, TILE_W, TILE_H
GW, GH = 16, 14
STAGE_X, STAGE_Y, STAGE_E = (0, 3), (1, 13), 36
TIER_X0, N_TIERS, TIER_H = 6, 5, 16
AISLE = (6, 7)
SUBJECTS = ["math", "ela", "science", "history"]
SCREEN_KINDS = ["idle", "math_coordinate", "math_fraction", "ela_annotation", "sci_cell", "hist_map"]
iso = lambda x, y: ((x - y) * TILE_W / 2, (x + y) * TILE_H / 2)


def main():
    man = {e["key"]: e for e in json.load(open(os.path.join(ROOT, "tools/env_manifest.json")))}
    base = lambda k: k if k in man else k + "__math"
    P, D = [], {s: [] for s in SUBJECTS}

    def add(lst, key, sx, sy, depth, **kw):
        a = man[base(key)]
        lst.append(dict(key=key, x=round(sx, 1), y=round(sy, 1), depth=depth, ox=a["anchor"][0] / a["w"], oy=a["anchor"][1] / a["h"], **kw))

    for x in range(GW):
        for y in range(GH):
            add(P, "floor_oak_01" if (x + y) % 2 == 0 else "floor_oak_02", *iso(x, y), -1000)
    for y0 in range(0, GH, 2):
        add(P, "wall_aud_left", *iso(0, y0), -500)
    for x0 in range(0, GW, 2):
        add(P, "wall_aud_right_door" if x0 == 4 else "wall_aud_right", *iso(x0, 0), -500)
    for x in range(*STAGE_X):
        for y in range(*STAGE_Y):
            sx, sy = iso(x + 1, y + 1); add(P, "stage_block", sx, sy, (x + y + 2) * 100 - 50)
    for y in AISLE:
        sx, sy = iso(STAGE_X[1] + 1, y + 1); add(P, "stage_stair", sx, sy, (STAGE_X[1] + y + 2) * 100 - 50)
    seats = []
    for t in range(N_TIERS):
        e = TIER_H * (t + 1)
        for gx, kind in ((TIER_X0 + 2 * t, "walk"), (TIER_X0 + 2 * t + 1, "seat")):
            for y in range(1, 13):
                sx, sy = iso(gx + 1, y + 1); S = gx + y + 2
                add(P, f"riser_{kind}_row{t + 1}", sx, sy, S * 100)
                if kind == "seat" and y not in AISLE:
                    add(P, f"seat_base_row{t + 1}", sx, sy - e, S * 100 + 10)
                    add(P, f"seat_back_row{t + 1}", sx, sy - e, S * 100 + 30)
                    seats.append(dict(id=f"seat_{t + 1}_{y}", tier=t + 1, gx=gx, gy=y, elev=e, facing="up_left", sitX=gx + 0.40,
                                      sitY=y + 0.5, depth=S * 100 + 20, approach=dict(gx=gx - 0.5, gy=y + 0.5)))

    def mount(lst, key, y_l, v, depth, **kw):
        gx, gy = iso(0, y_l); a = man[base(key)]
        lst.append(dict(key=key, x=round(gx, 1), y=round(gy - STAGE_E - v - a["h"], 1), depth=depth, ox=0, oy=0, **kw))

    mount(P, "screen_bezel_left", 9.75, 10, -400)
    for k in SCREEN_KINDS:
        mount(P, f"screen_content_{k}_left", 9.75 - 8 / 48, 18, -420, screenContent=k, visible=(k == "idle"))
    mount(P, "board_white_large_left", 13.85, 26, -400)

    def obj(lst, key, gx, gy, w, d, elev, off):
        sx, sy = iso(gx + w, gy + d); add(lst, key, sx, sy - elev, int((gx + w + gy + d) * 100 + off))

    obj(P, "podium_oak", 1.9, 4.6, 1, 1, STAGE_E, 20)
    obj(P, "demo_table", 1.2, 3.0, 1.4, 0.9, STAGE_E, 20)
    obj(P, "plant_medium_01", 3.35, 0.95, 0, 0, 0, 25)
    obj(P, "plant_medium_01", 0.9, 12.3, 0, 0, STAGE_E, 25)
    cols = [(0.55, 1.0, STAGE_E), (0.55, 4.05, STAGE_E), (0.55, 9.85, STAGE_E), (0.55, 13.4, STAGE_E), (3.3, 0.55, 0), (6.8, 0.55, 0), (11.0, 0.55, 0), (15.2, 0.55, 0)]
    for cx, cy, e in cols:
        sx, sy = iso(cx, cy); add(P, "column_fluted", sx, sy - e, int((cx + cy) * 100 + 25))
    for (rx, ry) in [(1.6, 4.0), (1.6, 8.5)]:
        sx, sy = iso(rx, ry)
        add(P, "light_rig_left", sx, sy - STAGE_E - 150, 5000); add(P, "light_pool_warm", sx, sy - STAGE_E, 1500)
    for s in SUBJECTS:
        L = D[s]; gx, gy = iso(0, 9.41); a = man[f"banner__{s}"]
        L.append(dict(key="banner", x=round(gx, 1), y=round(gy - STAGE_E - 176 - a["h"], 1), depth=-410, ox=0, oy=0))
        obj(L, "shelf", 0.15, 1.5, 0.5, 1.5, STAGE_E, 15)
        for i, px in enumerate([1.0, 2.5, 7.4, 9.9, 12.4, 14.6]):
            n = i % 3 + 1; sx, sy = iso(px, 0); pa = man[f"poster_{s}_{n}__{s}"]
            L.append(dict(key=f"poster_{s}_{n}", x=round(sx, 1), y=round(sy - 105 - pa["h"] + pa["w"] / 2, 1), depth=-450, ox=0, oy=0))
    blocked = [dict(gx=s["gx"], gy=s["gy"], w=1, d=1, kind="seat") for s in seats]
    blocked += [dict(gx=1.9, gy=4.6, w=1, d=1, kind="podium"), dict(gx=1.2, gy=3.0, w=1.4, d=0.9, kind="table"),
                dict(gx=0.15, gy=1.5, w=0.5, d=1.5, kind="shelf"), dict(gx=3.2, gy=0.85, w=0.3, d=0.3, kind="plant"), dict(gx=0.75, gy=12.15, w=0.3, d=0.3, kind="plant")]
    blocked += [dict(gx=cx - 0.3, gy=cy - 0.3, w=0.6, d=0.6, kind="column") for cx, cy, e in cols]
    x1, x2 = TIER_X0, TIER_X0 + 2 * N_TIERS
    blocked += [dict(gx=x1 - 0.08, gy=1, w=0.08, d=AISLE[0] - 1, kind="tierFront"), dict(gx=x1 - 0.08, gy=AISLE[1] + 1, w=0.08, d=13 - AISLE[1] - 1, kind="tierFront"),
                dict(gx=x1, gy=0.86, w=x2 - x1, d=0.14, kind="tierSide"), dict(gx=x1, gy=13.0, w=x2 - x1, d=0.14, kind="tierSide")]
    out = dict(grid=dict(w=GW, h=GH), stage=dict(x=list(STAGE_X), y=list(STAGE_Y), elev=STAGE_E), tiers=dict(x0=TIER_X0, n=N_TIERS, riser=TIER_H),
               aisle=list(AISLE), seats=seats, blocked=blocked, door=dict(gx=5.0, gy=0.7), subjects=SUBJECTS, screenKinds=SCREEN_KINDS,
               stations=dict(teacherHome=dict(gx=2.4, gy=8.6), screen=dict(gx=0.95, gy=8.0), board=dict(gx=0.95, gy=11.5)),
               teacher=dict(gx=2.4, gy=8.6, elev=STAGE_E, facing="down_right"), playerSpawn=dict(gx=5.0, gy=0.7, elev=0),
               placements=sorted(P, key=lambda p: p["depth"]), decor={s: sorted(D[s], key=lambda p: p["depth"]) for s in SUBJECTS})
    json.dump(out, open(os.path.join(ROOT, "src/game/data/auditorium.layout.json"), "w"))
    print(f"layout: {len(P)} placements, {len(seats)} seats")


if __name__ == "__main__":
    main()
