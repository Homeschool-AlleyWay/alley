"""Hallway art (same paper-cut isometric style as the auditoriums). Registered through gen_env.reg so it lands in the atlas.
Wall-mounted pieces are drawn flat then sheared onto the right-hand wall (skew_right), exactly like the auditorium posters."""
import math, random
from PIL import Image
import gen_env as G
from gen_subjects import skew_right, tc, SUBJECTS
from lib import *

DOOR_COL = {"math": "school_blue", "ela": "sage", "science": "sky", "history": "terracotta"}
DOOR_LABEL = {"math": "MATH", "ela": "ELA", "science": "SCIENCE", "history": "HISTORY"}
LOCKER_COL = ["powder", "coral", "mint", "soft_yellow"]


def reg(key, im, anchor, cat="hall"):
    G.reg(key, f"hall/{key}.png", im, anchor, cat)


# ------------------------------------------------------------------ walls (right = runs along +x at y=0, left = runs along +y at x=0)
def hall_wall(side, door=None):
    H = G.WALL_H
    W, Hh = 96, H + 48
    cv = Cv(W, Hh)
    g = (lambda x: H + 48 - 0.5 * x) if side == "left" else (lambda x: H + 0.5 * x)
    base = mix(PAL["wall_ivory"], PAL["sky"], 0.34)
    if side == "left":
        base = darken(base, 0.06)
    wain = mix(PAL["sage"], PAL["mint"], 0.45)

    def strip(x0, x1, v0, v1, col, ol=None, ow=1.0):
        pts = [(x0, g(x0) - v1), (x1, g(x1) - v1), (x1, g(x1) - v0), (x0, g(x0) - v0)]
        cv.fill(pts, col)
        if ol:
            cv.stroke(pts, ol, ow)

    strip(0, W, 0, H, base)
    for i in range(0, W, 12):                                     # pale paper stripes
        strip(i, i + 5, 66, 196, lighten(base, 0.4))
        strip(i + 5, i + 5.8, 66, 196, darken(base, 0.10))
    strip(0, W, 60, 67, mix(PAL["oak_high"], PAL["warm_gold"], 0.4), OUTLINE, 0.8)   # chair rail
    strip(0, W, 7, 60, wain)                                       # wainscot
    for x0 in (4, 52):
        strip(x0, x0 + 40, 14, 53, darken(wain, 0.10), darken(wain, 0.35), 0.8)
        strip(x0 + 1.5, x0 + 38.5, 15.5, 51.5, wain)
    strip(0, W, 0, 7, PAL["oak_shadow"], OUTLINE, 0.8)            # baseboard
    strip(0, W, 204, H, PAL["warm_white"], OUTLINE, 0.8)          # crown
    for k, x0 in enumerate(range(0, W, 12)):                      # cut-paper scallop garland under the crown
        col = [PAL["coral"], PAL["warm_gold"], PAL["powder"], PAL["lavender"]][k % 4]
        pts = [(x0 + 6 - 6 * math.cos(t * math.pi / 8), g(x0 + 6 - 6 * math.cos(t * math.pi / 8)) - (204 - 9 * math.sin(t * math.pi / 8))) for t in range(9)]
        cv.poly(pts, col, OUTLINE, 0.8)
    if door:
        col = PAL[DOOR_COL[door]]
        x0, x1 = 12, 84
        strip(x0 - 5, x1 + 5, 0, 152, PAL["oak_shadow"], OUTLINE, 1.2)
        strip(x0, x1, 0, 147, mix(col, PAL["warm_white"], 0.12), OUTLINE, 1.2)
        for a in (x0 + 4, x0 + 40):                                # double doors: window + raised panel each
            strip(a, a + 28, 96, 132, PAL["sky"], OUTLINE, 1.0)
            strip(a + 3, a + 10, 98, 130, lighten(PAL["sky"], 0.55))
            strip(a, a + 28, 16, 84, darken(col, 0.10), darken(col, 0.4), 0.8)
            strip(a + 2, a + 26, 18, 82, mix(col, PAL["warm_white"], 0.18))
        strip(x0 + 34, x0 + 38, 0, 147, darken(col, 0.3), OUTLINE, 0.8)     # meeting stile
        strip(x0, x1, 0, 9, PAL["warm_gold"], OUTLINE, 0.8)                  # kick plate
        for hx in (x0 + 31, x0 + 42):
            cv.ellipse([hx - 1.6, g(hx) - 66, hx + 1.6, g(hx) - 62.4], PAL["warm_gold"], OUTLINE, 0.7)
    cv.stroke([(0, g(0) - H), (W, g(W) - H)], OUTLINE, 1.6, closed=False)
    cv.stroke([(0, g(0)), (W, g(W))], OUTLINE, 1.6, closed=False)
    anchor = (W, H) if side == "left" else (0, H)
    return cv.finish(1), anchor


# ------------------------------------------------------------------ flat wall-mounted pieces (skewed onto the right wall)
def w_window():
    W, H = 66, 90
    cv = Cv(W, H)
    cv.rrect([2, 2, W - 2, H - 8], 4, PAL["warm_white"], OUTLINE, 1.8)
    cv.rrect([8, 8, W - 8, H - 22], 2, PAL["sky"], OUTLINE, 1.2)
    cv.rrect([8, 8, W - 8, 30], 2, lighten(PAL["sky"], 0.4), None, 0)
    cv.ellipse([38, 12, 52, 26], PAL["soft_yellow"], PAL["warm_gold"], 1)                 # paper sun
    cv.poly([(12, 40), (24, 30), (34, 40)], PAL["sage"], OUTLINE, 1)                          # hills
    cv.poly([(28, 40), (44, 26), (58, 40)], PAL["leaf"], OUTLINE, 1)
    cv.line((W / 2, 8), (W / 2, H - 22), PAL["warm_white"], 2.2)
    cv.line((8, 40), (W - 8, 40), PAL["warm_white"], 2.2)
    cv.rrect([0, H - 22, W, H - 14], 2, PAL["oak_high"], OUTLINE, 1.4)                       # sill
    for x, dx in ((4, 1), (W - 4, -1)):                                                       # paper curtains
        cv.poly([(x, 4), (x + dx * 14, 8), (x + dx * 9, 46), (x + dx * 14, 70), (x, 68)], PAL["coral"], OUTLINE, 1.2)
        for k in range(1, 3):
            cv.line((x + dx * k * 4, 8), (x + dx * (k * 3 + 1), 66), darken(PAL["coral"], .18), 1, 170)
    return cv


def w_bulletin():
    W, H = 102, 72
    cv = Cv(W, H)
    cv.rrect([1, 1, W - 1, H - 1], 4, PAL["oak_mid"], OUTLINE, 2)
    cv.rrect([6, 6, W - 6, H - 6], 2, mix(PAL["oak_light"], PAL["peach"], .35), OUTLINE, 1)
    rnd = random.Random(9)
    cols = [PAL["warm_white"], PAL["soft_yellow"], PAL["powder"], PAL["mint"], PAL["dusty_pink"], PAL["lavender"]]
    for i, (x, y) in enumerate([(12, 12), (40, 10), (66, 14), (14, 40), (44, 38), (72, 40)]):
        a = rnd.uniform(-.14, .14)
        w, h = 22, 20
        pts = [(x, y), (x + w, y + a * w), (x + w + a * h * -1, y + h + a * w), (x - a * h, y + h)]
        cv.poly(pts, cols[i % 6], OUTLINE, 1)
        for k in range(3):
            cv.line((x + 3, y + 6 + k * 4), (x + w - 4, y + 6 + k * 4 + a * w * .8), darken(cols[i % 6], .25), .9, 150)
        cv.ellipse([x + w / 2 - 1.8, y - 1.8, x + w / 2 + 1.8, y + 1.8], [PAL["coral"], PAL["school_blue"]][i % 2], OUTLINE, .7)
    return cv


def w_trophy():
    W, H = 96, 90
    cv = Cv(W, H)
    cv.rrect([1, 1, W - 1, H - 1], 5, PAL["oak_mid"], OUTLINE, 2)
    cv.rrect([7, 7, W - 7, H - 7], 3, mix(PAL["sky"], PAL["warm_white"], .55), OUTLINE, 1)
    for y in (34, 62):
        cv.rrect([8, y, W - 8, y + 4], 1, PAL["oak_light"], OUTLINE, .9)
    for (cx, y, sc) in ((22, 34, 1.0), (46, 34, 1.25), (72, 34, .9), (30, 62, 1.1), (62, 62, 1.0)):
        cv.poly([(cx - 7 * sc, y - 20 * sc), (cx + 7 * sc, y - 20 * sc), (cx + 4 * sc, y - 8 * sc), (cx - 4 * sc, y - 8 * sc)], PAL["warm_gold"], OUTLINE, 1)
        cv.rrect([cx - 2 * sc, y - 8 * sc, cx + 2 * sc, y - 2 * sc], 1, PAL["warm_gold"], OUTLINE, .8)
        cv.rrect([cx - 6 * sc, y - 3 * sc, cx + 6 * sc, y], 1, PAL["oak_shadow"], OUTLINE, .8)
    cv.poly([(60, 22), (66, 12), (72, 22)], PAL["school_blue"], OUTLINE, .9)                # ribbon
    cv.line((14, 12), (34, 26), (255, 255, 255), 2, 110)                                       # glass glint
    return cv


def w_clock():
    W = 46
    cv = Cv(W, W)
    cv.ellipse([1, 1, W - 1, W - 1], PAL["coral"], OUTLINE, 2)
    cv.ellipse([5, 5, W - 5, W - 5], PAL["warm_white"], OUTLINE, 1)
    c = W / 2
    for k in range(12):
        a = k * math.pi / 6
        cv.line((c + math.sin(a) * 14, c - math.cos(a) * 14), (c + math.sin(a) * 17, c - math.cos(a) * 17), PAL["dark_detail"], 1.2)
    cv.line((c, c), (c + 7, c - 9), PAL["dark_detail"], 1.8)
    cv.line((c, c), (c - 2, c - 14), PAL["dark_detail"], 1.3)
    cv.ellipse([c - 2, c - 2, c + 2, c + 2], PAL["coral"], OUTLINE, .7)
    return cv


def w_sign(subj):
    W, H = 96, 32
    cv = Cv(W, H)
    col = PAL[DOOR_COL[subj]]
    cv.rrect([2, 5, W - 2, H - 1], 6, col, OUTLINE, 1.8)
    cv.rrect([6, 9, W - 6, H - 5], 4, mix(col, PAL["warm_white"], .32), None, 0)
    tc(cv, W / 2, 10, DOOR_LABEL[subj], 12, PAL["dark_detail"] if subj in ("science", "history") else PAL["warm_white"])
    for x in (16, W - 16):
        cv.line((x, 0), (x, 6), OUTLINE, 1.2)
    return cv


def w_bunting():
    W, H = 192, 48
    cv = Cv(W, H)
    pts = [(x, 4 + 12 * math.sin(math.pi * x / W)) for x in range(0, W + 1, 4)]
    for a, b in zip(pts, pts[1:]):
        cv.line(a, b, PAL["oak_shadow"], 1.2)
    cols = [PAL["coral"], PAL["warm_gold"], PAL["powder"], PAL["mint"], PAL["lavender"], PAL["dusty_pink"]]
    for k in range(8):
        x = 12 + k * 22
        y = 4 + 12 * math.sin(math.pi * x / W)
        cv.poly([(x - 8, y), (x + 8, y + 0.8), (x, y + 22)], cols[k % 6], OUTLINE, 1.1)
        cv.poly([(x - 8, y), (x, y), (x - 3, y + 11)], lighten(cols[k % 6], .35), None, 0)
    return cv


# ------------------------------------------------------------------ props (iso boxes)
def y_face(cv, org, x0, x1, z0, z1, y, col, ol=None, ow=.8):
    pts = [iso_pt(*org, x0, y, z1), iso_pt(*org, x1, y, z1), iso_pt(*org, x1, y, z0), iso_pt(*org, x0, y, z0)]
    cv.poly(pts, col, ol, ow) if ol else cv.fill(pts, col)


def locker(v):
    col = PAL[LOCKER_COL[v % 4]]
    cv, org, anchor = G.new_obj(1, 0.6, 100, pad=3)
    cv.shadow([iso_pt(*org, .0, .1), iso_pt(*org, 1.1, .1), iso_pt(*org, 1.15, .75), iso_pt(*org, .1, .75)], .16)
    box(cv, org, 0, 0, 1, .6, 0, 96, mix(col, PAL["warm_white"], .3), col, darken(col, .22), 1.4)
    y = .6
    y_face(cv, org, .08, .92, 8, 90, y, darken(col, .10), darken(col, .38), .8)        # door panel (paper layer)
    y_face(cv, org, .12, .88, 10, 88, y, mix(col, PAL["warm_white"], .10))
    for k in range(4):                                                                    # louvre slots
        y_face(cv, org, .22, .78, 72 + k * 4, 74 + k * 4, y, darken(col, .35))
    y_face(cv, org, .32, .68, 50, 62, y, PAL["warm_white"], OUTLINE, .8)                # number plate
    y_face(cv, org, .37, .63, 54, 58, y, mix(col, PAL["med_gray"], .4))
    p = iso_pt(*org, .8, y, 34)
    cv.capsule((p[0], p[1] - 4), (p[0], p[1] + 5), 2.6, PAL["warm_gold"], OUTLINE, .8)  # handle
    if v % 2 == 0:                                                                        # sticker
        q = iso_pt(*org, .24, y, 26)
        cv.ellipse([q[0] - 3.5, q[1] - 3.5, q[0] + 3.5, q[1] + 3.5], [PAL["coral"], PAL["soft_yellow"], PAL["lavender"]][v % 3], OUTLINE, .8)
    return cv.finish(2), anchor


def bench():
    cv, org, anchor = G.new_obj(2, .64, 46, pad=4)
    cv.shadow([iso_pt(*org, .05, .05), iso_pt(*org, 2.05, .05), iso_pt(*org, 2.15, .7), iso_pt(*org, .15, .7)], .18)
    for x in (.12, 1.72):
        box(cv, org, x, .08, .16, .48, 0, 24, PAL["med_gray"], darken(PAL["med_gray"], .1), darken(PAL["med_gray"], .25), 1)
    box(cv, org, 0, 0, 2, .64, 24, 6, PAL["oak_high"], PAL["oak_light"], PAL["oak_mid"], 1.3, planks=4)
    for k in (.22, 1.1):
        box(cv, org, k, .08, .62, .48, 30, 4, PAL["coral"], darken(PAL["coral"], .12), darken(PAL["coral"], .28), 1)   # paper cushions
    box(cv, org, 0, 0, .1, .64, 30, 22, PAL["oak_mid"], darken(PAL["oak_mid"], .1), PAL["oak_shadow"], 1.2)
    return cv.finish(2), anchor


def fountain():
    cv, org, anchor = G.new_obj(.7, .62, 62, pad=4)
    cv.shadow([iso_pt(*org, 0, .05), iso_pt(*org, .78, .05), iso_pt(*org, .85, .7), iso_pt(*org, .08, .7)], .18)
    box(cv, org, .1, .1, .5, .42, 0, 30, PAL["light_gray"], darken(PAL["light_gray"], .1), darken(PAL["light_gray"], .26), 1.3)
    box(cv, org, .04, .04, .62, .54, 30, 8, PAL["powder"], darken(PAL["powder"], .12), darken(PAL["powder"], .28), 1.3)
    p = iso_pt(*org, .34, .28, 52)
    cv.capsule((p[0], p[1] + 6), (p[0], p[1] - 4), 3, PAL["med_gray"], OUTLINE, .9)
    cv.capsule((p[0], p[1] - 4), (p[0] + 6, p[1] - 4), 2.6, PAL["med_gray"], OUTLINE, .9)
    cv.ellipse([p[0] + 2, p[1] + 2, p[0] + 10, p[1] + 7], lighten(PAL["sky"], .3), None, 0)
    return cv.finish(2), anchor


def bin_():
    cv, org, anchor = G.new_obj(.45, .45, 40, pad=3)
    cv.shadow([iso_pt(*org, 0, 0), iso_pt(*org, .55, .05), iso_pt(*org, .6, .55), iso_pt(*org, .05, .55)], .16)
    box(cv, org, 0, 0, .45, .45, 0, 30, PAL["school_blue"], darken(PAL["school_blue"], .12), darken(PAL["school_blue"], .28), 1.3)
    box(cv, org, -.03, -.03, .51, .51, 30, 5, PAL["sage"], darken(PAL["sage"], .12), darken(PAL["sage"], .28), 1.2)
    p = iso_pt(*org, .22, .45, 14)
    cv.ellipse([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], PAL["warm_white"], None, 0)
    cv.poly([(p[0] - 3, p[1] + 2), (p[0], p[1] - 4), (p[0] + 3, p[1] + 2)], PAL["leaf"], None, 0)
    return cv.finish(2), anchor


def lantern(v):
    W, H = 46, 128
    cv = Cv(W, H)
    col = [PAL["soft_yellow"], PAL["coral"], PAL["powder"], PAL["mint"]][v % 4]
    cx = W / 2
    cv.line((cx, 0), (cx, 56), PAL["oak_shadow"], 1.2)
    cv.rrect([cx - 6, 54, cx + 6, 60], 2, PAL["warm_gold"], OUTLINE, 1)
    cv.ellipse([cx - 19, 58, cx + 19, 108], mix(col, PAL["warm_white"], .25), OUTLINE, 1.8)       # paper globe
    for k in (-.62, -.3, 0, .3, .62):                                                                # folded ribs
        a = [(cx + k * 19 + (i / 8 - .5) * -k * 12 * abs(math.sin(i / 8 * math.pi)), 58 + i * 50 / 8) for i in range(9)]
        cv.d.line([((x + cv.ox) * cv.S, (y + cv.oy) * cv.S) for x, y in a], fill=rgba(darken(col, .16), 190), width=max(1, int(1.0 * cv.S)))
    cv.ellipse([cx - 12, 62, cx + 2, 76], lighten(col, .55), None, 0)
    cv.rrect([cx - 7, 104, cx + 7, 110], 2, PAL["warm_gold"], OUTLINE, 1)
    for k in (-4, 0, 4):
        cv.line((cx + k, 110), (cx + k * 1.4, 122), PAL["warm_gold"], 1.6)
    return cv.finish(2), (cx, 122)


def rug(edge):
    """Runner rug floor tile. edge 'a' = border along the -y edge, 'b' = along the +y edge. Interior stays plain so tiles join seamlessly."""
    cv = Cv(96, 48)
    pts = [(48, 0), (96, 24), (48, 48), (0, 24)]
    cv.fill(pts, mix(PAL["powder"], PAL["warm_white"], .18))
    pp = lambda t: (48 - 48 * t, 24 * t)          # left edge t: top->left
    qq = lambda t: (96 - 48 * t, 24 + 24 * t)
    for k in range(0, 6, 2):
        a, b = pp(k / 6), qq(k / 6)
        cv.line(a, b, mix(PAL["powder"], PAL["deep_blue"], .18), .9, 130)
    top = [(48, 0), (96, 24)] if edge == "a" else [(0, 24), (48, 48)]
    d = (0, 4) if edge == "a" else (0, -4)
    for off, col, w in ((3.4, PAL["warm_gold"], 2.2), (7.4, PAL["coral"], 1.2)):
        s = 1 if edge == "a" else -1
        cv.line((top[0][0] + 0, top[0][1] + s * off * .96 + (0 if edge == "a" else 0)), (top[1][0], top[1][1] + s * off * .96), col, w, 235)
    return cv.finish(1), (48, 0)


def run():
    for side in ("left", "right"):
        im, an = hall_wall(side); reg(f"hall_wall_{side}", im, an, "wall")
    for s in SUBJECTS:
        im, an = hall_wall("right", door=s); reg(f"hall_door__{s}", im, an, "wall")
        reg(f"hall_sign__{s}", skew_right(w_sign(s)), (0, 0), "decor")
    for key, fn in (("hall_window", w_window), ("hall_bulletin", w_bulletin), ("hall_trophy", w_trophy), ("hall_clock", w_clock), ("hall_bunting", w_bunting)):
        reg(key, skew_right(fn()), (0, 0), "decor")
    for v in range(4):
        im, an = locker(v); reg(f"hall_locker_{v}", im, an, "prop")
    for key, fn in (("hall_bench", bench), ("hall_fountain", fountain), ("hall_bin", bin_)):
        im, an = fn(); reg(key, im, an, "prop")
    for v in range(4):
        im, an = lantern(v); reg(f"hall_lantern_{v}", im, an, "prop")
    for e in ("a", "b"):
        im, an = rug(e); reg(f"floor_hall_rug_{e}", im, an, "floor")
