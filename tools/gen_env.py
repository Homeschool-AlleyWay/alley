#!/usr/bin/env python3
"""Generates auditorium environment art -> public/assets/unify/** + tools/env_manifest.json"""
import json, math, os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from lib import *

MANIFEST = []
SCREEN_KINDS = ["idle", "math_coordinate", "math_fraction", "ela_annotation", "science_cell", "history_timeline", "tech_binary", "art_wheel"]
SLIDES = {"science_cell": ("science", 1), "history_timeline": ("history", 1), "tech_binary": ("technology", 1), "art_wheel": ("art", 0)}
ROW_COLORS = ["powder", "soft_yellow", "mint", "sage", "lavender"]  # tier accent colors (Bible palette)
TIER_H = 16          # px rise per tier; each tier is 2 tiles deep (walkway + seat row)
TRIM = PAL["warm_gold"]
ACCENT = PAL["soft_yellow"]
N_TIERS = 5
WALL_H = 230


def reg(key, rel, im, anchor, cat):
    save(im, rel)
    MANIFEST.append(dict(key=key, file=rel, w=im.width, h=im.height, anchor=list(anchor), category=cat))


def new_obj(a, b, H, pad=6):
    """Canvas for an iso object with footprint a x b tiles, max height H. Returns cv, org, anchor."""
    w = int((a + b) * 48 + pad * 2)
    h = int((a + b) * 24 + H + pad * 2)
    org = (b * 48 + pad, H + pad)
    anchor = (org[0] + (a - b) * 48, org[1] + (a + b) * 24)
    return Cv(w, h), org, anchor


# ---------------------------------------------------------------- floors
def floor_tile(key, base, seed, hall=False):
    rnd = random.Random(seed)
    cv = Cv(96, 48)
    pts = [(48, 0), (96, 24), (48, 48), (0, 24)]
    pp = lambda t: (48 - 48 * t, 24 * t)
    qq = lambda t: (96 - 48 * t, 24 + 24 * t)
    if not hall:
        n = 6  # planks run along x; per-plank tone depends only on plank index so rows stay continuous across tiles
        tones = [rnd.uniform(-0.10, 0.12) for _ in range(n)]
        for k in range(n):
            t0, t1 = k / n, (k + 1) / n
            tone = tones[k]
            col = lighten(base, tone) if tone > 0 else darken(base, -tone)
            cv.fill([pp(t0), qq(t0), qq(t1), pp(t1)], col)
        for k in range(1, n):
            t = k / n
            cv.line(pp(t), qq(t), darken(base, 0.28), 0.9, 150)
            cv.line((pp(t)[0] + 1, pp(t)[1] + 0.5), (qq(t)[0] + 1, qq(t)[1] + 0.5), lighten(base, 0.4), 0.7, 100)
        for k in range(n):  # butt-joint ticks (offset per plank)
            t0, t1 = k / n, (k + 1) / n
            u = rnd.uniform(0.2, 0.8)
            tm = (t0 + t1) / 2
            a_ = (pp(tm)[0] + 48 * u, pp(tm)[1] + 24 * u)
            b_ = (a_[0] - 48 * (t1 - t0) * 0.5, a_[1] + 24 * (t1 - t0) * 0.5)
            c_ = (a_[0] + 48 * (t1 - t0) * 0.5, a_[1] - 24 * (t1 - t0) * 0.5)
            cv.line(b_, c_, darken(base, 0.30), 0.8, 120)
        for _ in range(26):  # grain flecks
            x, y = rnd.uniform(18, 78), rnd.uniform(8, 40)
            cv.line((x, y), (x + rnd.uniform(3, 9), y + rnd.uniform(1, 3.5)), lighten(base, 0.35) if rnd.random() < .5 else darken(base, .18), 0.6, 90)
    else:
        cv.fill(pts, PAL["light_gray"])
        cv.fill([(48, 2.5), (93, 24), (48, 45.5), (3, 24)], lighten(base, 0.2))
        cv.fill([(48, 6), (86, 24), (48, 42), (10, 24)], mix(base, PAL["powder"], 0.10))
        for _ in range(60):  # terrazzo flecks
            x, y = rnd.uniform(14, 82), rnd.uniform(6, 42)
            if abs(x - 48) / 48 + abs(y - 24) / 24 < 0.9:
                c = rnd.choice([PAL["med_gray"], PAL["powder"], PAL["sage"], PAL["peach"], PAL["light_gray"]])
                cv.ellipse([x, y, x + rnd.uniform(1, 2.2), y + rnd.uniform(.7, 1.4)], c, None, 0)
        cv.stroke([(48, 2.5), (93, 24), (48, 45.5), (3, 24)], darken(PAL["light_gray"], 0.12), 0.8)
    return cv.finish(1)


# ---------------------------------------------------------------- risers, stage, stairs
def riser(row, walk=False):
    h = TIER_H * (row + 1)
    col = PAL[ROW_COLORS[row]]
    top = mix(col, PAL["warm_white"], 0.25)
    cv, org, anchor = new_obj(1, 1, h, pad=2)
    box(cv, org, 0, 0, 1, 1, 0, h, top, darken(col, 0.18), darken(col, 0.34), bevel=True)
    # carpet weave hint on top face
    for k in range(1, 8):
        t = k / 8
        p = iso_pt(*org, 0, t, h)
        q = iso_pt(*org, 1, t, h)
        cv.line(p, q, darken(top, 0.08), 0.7, 90)
    # gold accent trim on the +y side face (visible at aisles / row ends)
    a = iso_pt(*org, 0, 1, h - 3)
    b = iso_pt(*org, 1, 1, h - 3)
    cv.line((a[0], a[1] + 3), (b[0], b[1] + 3), TRIM, 1.6, 230)
    if walk:  # aisle runner stripes along x (direction of travel)
        for yy in (0.18, 0.5, 0.82):
            p = iso_pt(*org, 0.06, yy, h); q = iso_pt(*org, 0.94, yy, h)
            cv.line(p, q, lighten(top, 0.35) if yy == 0.5 else darken(top, 0.14), 1.4, 170)
    return cv.finish(2), anchor


def stage_block():
    h = 36
    cv, org, anchor = new_obj(1, 1, h, pad=2)
    box(cv, org, 0, 0, 1, 1, 0, h, PAL["oak_light"], PAL["oak_mid"], PAL["oak_shadow"], planks=6)
    a = iso_pt(*org, 0, 1, h - 5)
    b = iso_pt(*org, 1, 1, h - 5)
    cv.line((a[0], a[1] + 5), (b[0], b[1] + 5), TRIM, 1.6, 230)
    a = iso_pt(*org, 1, 0, h - 5)
    b = iso_pt(*org, 1, 1, h - 5)
    cv.line((a[0], a[1] + 5), (b[0], b[1] + 5), PAL["warm_gold"], 1.6, 200)
    return cv.finish(2), anchor


def stage_stair():
    """3 steps rising toward -x (toward the stage). 1x1 footprint."""
    cv, org, anchor = new_obj(1, 1, 36, pad=2)
    for i, (x0, hh) in enumerate([(0.667, 12), (0.333, 24), (0.0, 36)]):
        box(cv, org, x0, 0, 0.334, 1, 0, hh, PAL["oak_high"], PAL["oak_mid"], PAL["oak_shadow"])
    return cv.finish(2), anchor


# ---------------------------------------------------------------- walls
def wall(side, door=False):
    H = WALL_H
    W, Hh = 96, H + 48
    cv = Cv(W, Hh)
    g = (lambda x: H + 48 - 0.5 * x) if side == "left" else (lambda x: H + 0.5 * x)
    base = darken(PAL["wall_ivory"], 0.05) if side == "left" else PAL["wall_ivory"]
    oak = darken(PAL["oak_mid"], 0.10) if side == "left" else PAL["oak_mid"]

    def strip(x0, x1, v0, v1, col, ol=None, ow=1.0):
        pts = [(x0, g(x0) - v1), (x1, g(x1) - v1), (x1, g(x1) - v0), (x0, g(x0) - v0)]
        cv.fill(pts, col)
        if ol:
            cv.stroke(pts, ol, ow)

    strip(0, W, 0, H, base)
    for i in range(0, W, 12):  # acoustic ribs
        strip(i, i + 5, 62, 200, mix(base, PAL["powder"], 0.16))
        strip(i + 5, i + 6.5, 62, 200, darken(base, 0.12))
        strip(i + 1, i + 2.2, 62, 200, lighten(base, 0.5))
    strip(0, W, 56, 62, mix(PAL["oak_high"], TRIM, 0.35), OUTLINE, 0.8)          # chair rail
    strip(0, W, 7, 56, oak)                                      # wainscot
    for x0 in (4, 52):                                           # inset panels
        strip(x0, x0 + 40, 14, 49, darken(oak, 0.10), darken(oak, 0.35), 0.8)
        strip(x0 + 1.5, x0 + 38.5, 15.5, 47.5, oak)
    strip(0, W, 0, 7, PAL["oak_shadow"], OUTLINE, 0.8)          # baseboard
    strip(0, W, 200, 207, mix(ACCENT, PAL["warm_white"], 0.4))  # cove light strip
    strip(0, W, 204, 206, PAL["warm_white"])
    strip(0, W, 207, H, PAL["warm_white"], OUTLINE, 0.8)        # crown
    if door:
        # blue classroom door with small window, centered on the segment
        x0, x1 = 16, 16 + 64
        strip(x0 - 5, x1 + 5, 0, 145, PAL["oak_shadow"], OUTLINE, 1.2)          # frame
        strip(x0, x1, 0, 140, PAL["school_blue"], OUTLINE, 1.2)
        strip(x0 + 18, x0 + 46, 88, 124, PAL["sky"], OUTLINE, 1.0)                # window
        strip(x0 + 20, x0 + 30, 90, 122, lighten(PAL["sky"], 0.55))
        strip(x0 + 6, x0 + 58, 14, 76, darken(PAL["school_blue"], 0.10), darken(PAL["school_blue"], 0.4), 0.8)
        hx = x1 - 8
        cv.ellipse([hx - 2, g(hx) - 62, hx + 2, g(hx) - 58], PAL["warm_gold"], OUTLINE, 0.8)
    # outline top + bottom edges of the face
    cv.stroke([(0, g(0) - H), (W, g(W) - H)], OUTLINE, 1.6, closed=False)
    cv.stroke([(0, g(0)), (W, g(W))], OUTLINE, 1.6, closed=False)
    anchor = (W, H) if side == "left" else (0, H)
    return cv.finish(1), anchor


# ---------------------------------------------------------------- column
def column(scale=1):
    W, Hh = 84, 336
    cx = 34
    K = scale
    cv = Cv(W, Hh, K)
    cream = PAL["warm_white"]
    gold = PAL["warm_gold"]

    def strips(y0, y1, half_top, half_bot, base):
        # vertical cylinder shading, light from upper-left
        for xi in range(int(-half_top * S) - 2, int(half_top * S) + 3):
            pass
        n = int(max(half_top, half_bot) * 2 * S)
        for i in range(n):
            u = i / (n - 1)
            t = u * 2 - 1
            shade = max(0.0, (t + 0.35)) ** 1.4 * 0.42 if t > -0.35 else (-0.35 - t) * 0.15
            col = darken(base, shade) if t > -0.35 else darken(base, shade)
            if -0.75 < t < -0.35:
                col = lighten(base, 0.0)
            xt = cx - half_top + (i / n) * 2 * half_top
            xb = cx - half_bot + (i / n) * 2 * half_bot
            xt2 = cx - half_top + ((i + 1) / n) * 2 * half_top
            xb2 = cx - half_bot + ((i + 1) / n) * 2 * half_bot
            cv.fill([(xt, y0), (xt2, y0), (xb2, y1), (xb, y1)], col)

    # plinth + torus base
    strips(312, 326, 27, 28, mix(cream, PAL["wall_ivory"], 0.5))
    strips(302, 313, 23, 27, cream)
    # shaft
    strips(58, 302, 19, 21, cream)
    for k in range(-4, 5):  # flutes
        th = k * 0.33
        x = cx + 20 * math.sin(th)
        if abs(k) <= 3:
            cv.line((x, 62), (x, 298), darken(cream, 0.26), 0.9, 170)
            cv.line((x + 1.2, 62), (x + 1.2, 298), lighten(cream, 0.0), 0.6, 120)
    # capital: flared echinus + gold band + abacus
    strips(40, 58, 30, 19, cream)
    strips(34, 41, 32, 30, mix(cream, TRIM, 0.55))
    strips(24, 35, 34, 34, cream)
    for k in range(-3, 4):  # carved detail hints
        x = cx + k * 8
        cv.line((x, 28), (x, 33), darken(cream, 0.3), 1.0, 160)
    cv.rrect([cx - 38, 16, cx + 38, 25], 3, lighten(cream, 0.2), None, 0)
    # rim highlights
    cv.line((cx - 33, 26), (cx - 33, 34), lighten(cream, 0.6), 1, 200)
    im = silhouette_outline(cv.finish(2), 2 * K)
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([(cx - 14) * K, 316 * K, (cx + 46) * K, 338 * K], fill=(*PAL["shadow"], 56))
    sh = sh.filter(ImageFilter.GaussianBlur(3 * K))
    return Image.alpha_composite(sh, im), (cx * K, 322 * K)


# ---------------------------------------------------------------- furniture
def seat(row, part):
    """part='base' (pedestal, cushion, armrests) or 'back' (backrest). Split so a seated character can be layered between."""
    col = PAL[ROW_COLORS[row]]
    fab = mix(col, PAL["deep_blue"], 0.25) if row == 0 else darken(col, 0.22)
    frame = PAL["oak_mid"]
    cv, org, anchor = new_obj(1, 1, 52, pad=3)
    if part == "base":
        cv.shadow([iso_pt(*org, .12, .15), iso_pt(*org, .85, .15), iso_pt(*org, .95, .95), iso_pt(*org, .2, .95)], 0.16)
        box(cv, org, .22, .32, .3, .36, 0, 9, darken(frame, .2), darken(frame, .3), darken(frame, .45), 1.0)
        box(cv, org, .12, .16, .5, .68, 9, 6, fab, darken(fab, .15), darken(fab, .3), 1.2)
        for yy in (.10, .82):
            box(cv, org, .12, yy, .5, .08, 15, 4, frame, darken(frame, .15), darken(frame, .3), 1.0)
    else:
        box(cv, org, .62, .14, .16, .72, 12, 30, fab, darken(fab, .18), darken(fab, .34), 1.3)
        a = iso_pt(*org, .62, .14, 42)
        b = iso_pt(*org, .62, .86, 42)
        cv.line(a, b, lighten(fab, .55), 1.2, 210)
    return cv.finish(2), anchor


def podium():
    cv, org, anchor = new_obj(1, 1, 64, pad=3)
    cv.shadow([iso_pt(*org, .1, .1), iso_pt(*org, .95, .1), iso_pt(*org, 1.05, .95), iso_pt(*org, .2, .95)], 0.2)
    box(cv, org, .15, .2, .6, .6, 0, 40, PAL["oak_mid"], darken(PAL["oak_mid"], .1), PAL["oak_shadow"])
    box(cv, org, .10, .12, .7, .76, 40, 8, PAL["oak_high"], PAL["oak_light"], PAL["oak_mid"], 1.4)
    # gold crest panel on the +y face
    p = iso_pt(*org, .35, .8, 26)
    q = iso_pt(*org, .65, .8, 26)
    cv.line((p[0], p[1]), (q[0], q[1]), PAL["warm_gold"], 6, 230)
    # laptop + mug
    box(cv, org, .3, .3, .28, .2, 48, 2, PAL["light_gray"], PAL["med_gray"], PAL["med_gray"], 0.8)
    box(cv, org, .26, .3, .04, .2, 48, 16, PAL["charcoal"], PAL["dark_detail"], PAL["dark_detail"], 0.8)
    box(cv, org, .62, .55, .08, .08, 48, 7, PAL["coral"], darken(PAL["coral"], .15), darken(PAL["coral"], .3), 0.8)
    return cv.finish(2), anchor


def demo_table():
    cv, org, anchor = new_obj(1.4, 0.9, 44, pad=3)
    cv.shadow([iso_pt(*org, .1, .1), iso_pt(*org, 1.5, .1), iso_pt(*org, 1.6, 1.0), iso_pt(*org, .2, 1.0)], 0.2)
    for (x, y) in [(.1, .1), (1.2, .1), (.1, .7), (1.2, .7)]:
        box(cv, org, x, y, .1, .1, 0, 30, PAL["oak_mid"], darken(PAL["oak_mid"], .1), PAL["oak_shadow"], 1.0)
    box(cv, org, 0, 0, 1.4, .9, 30, 6, PAL["oak_high"], PAL["oak_light"], PAL["oak_mid"], 1.3, planks=5)
    # props: fraction-circle stack + blocks (lesson-swappable in game)
    box(cv, org, .3, .25, .3, .3, 36, 4, PAL["coral"], darken(PAL["coral"], .1), darken(PAL["coral"], .25), 0.8)
    box(cv, org, .32, .27, .26, .26, 40, 4, PAL["soft_yellow"], darken(PAL["soft_yellow"], .1), darken(PAL["soft_yellow"], .25), 0.8)
    box(cv, org, .8, .3, .16, .16, 36, 10, PAL["school_blue"], darken(PAL["school_blue"], .12), darken(PAL["school_blue"], .28), 0.8)
    box(cv, org, .98, .45, .16, .16, 36, 10, PAL["leaf"], darken(PAL["leaf"], .12), darken(PAL["leaf"], .28), 0.8)
    return cv.finish(2), anchor


def plant():
    cv = Cv(84, 120)
    cx, by = 42, 112
    cv.poly([(cx - 16, by - 34), (cx + 16, by - 34), (cx + 12, by), (cx - 12, by)], PAL["coral"], OUTLINE, 1.6)
    cv.line((cx - 15, by - 33), (cx + 15, by - 33), lighten(PAL["coral"], .5), 2, 220)
    rnd = random.Random(7)
    leaves = [(-34, 46), (-20, 62), (-8, 74), (6, 70), (20, 60), (32, 44), (-26, 30), (26, 28), (0, 54)]
    for i, (dx, up) in enumerate(leaves):
        tip = (cx + dx, by - 34 - up)
        mid = (cx + dx * 0.45 + rnd.uniform(-3, 3), by - 34 - up * 0.5)
        col = PAL["leaf"] if i % 2 else PAL["dark_leaf"]
        if i % 3 == 0:
            col = PAL["sage"]
        w = 9
        pts = [(cx, by - 36), (mid[0] - w * .5, mid[1]), tip, (mid[0] + w * .5, mid[1])]
        cv.poly(pts, col, OUTLINE, 1.3)
        cv.line((cx, by - 36), tip, lighten(col, .4), .8, 170)
    im = cv.finish(2)
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([cx - 22, by - 10, cx + 34, by + 6], fill=(*PAL["shadow"], 50))
    sh = sh.filter(ImageFilter.GaussianBlur(3))
    return Image.alpha_composite(sh, im), (cx, by)


# ---------------------------------------------------------------- wall-mounted boards / screen (pre-skewed to the left wall)
def skew_left(cv):
    """Shear a flat 4x canvas so it lies on a left-type wall (slope up-right)."""
    im = cv.im
    w, h = im.size
    out_h = h + w // 2
    out = im.transform((w, out_h), Image.AFFINE, (1, 0, 0, 0.5, 1, -0.5 * w), resample=Image.BICUBIC)
    sh = cv.sh.transform((w, out_h), Image.AFFINE, (1, 0, 0, 0.5, 1, -0.5 * w), resample=Image.BICUBIC)
    sh = sh.filter(ImageFilter.GaussianBlur(cv.S * 2))
    res = Image.alpha_composite(sh, out)
    return res.resize((w // cv.S, out_h // cv.S), Image.LANCZOS)


def font(sz, sc=S):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, int(sz * sc))
    return ImageFont.load_default()


def text(cv, xy, s, sz, col):
    cv.d.text((xy[0] * cv.S, xy[1] * cv.S), s, font=font(sz, cv.S), fill=rgba(col))


def whiteboard(k=None):
    W, H = 188, 108
    cv = Cv(W, H, k or 1)
    cv.rrect([2, 2, W - 2, H - 2], 5, PAL["light_gray"], OUTLINE, 2)
    cv.rrect([8, 8, W - 8, H - 12], 3, PAL["warm_white"], darken(PAL["light_gray"], .25), 1)
    cv.line((14, 20), (W - 40, 20), PAL["school_blue"], 1.6, 200)
    for i, ww in enumerate((120, 98, 140, 70)):
        cv.line((14, 34 + i * 14), (14 + ww, 34 + i * 14), PAL["med_gray"], 1.2, 150)
    cv.rrect([W - 74, 62, W - 14, 86], 3, mix(PAL["soft_yellow"], PAL["warm_white"], .4), PAL["warm_gold"], 1)
    # marker tray with markers
    cv.rrect([20, H - 12, W - 20, H - 6], 2, PAL["med_gray"], OUTLINE, 1)
    for i, c in enumerate(("school_blue", "coral", "leaf")):
        cv.rrect([34 + i * 16, H - 15, 46 + i * 16, H - 11], 1.5, PAL[c], OUTLINE, .8)
    return (cv.finish(2) if k else skew_left(cv)), (0, 0)


def screen_bezel(k=None):
    W, H = 264, 152
    cv = Cv(W, H, k or 1)
    # bezel with transparent window (content sprite renders beneath)
    cv.rrect([0, 0, W, H], 6, PAL["light_gray"], OUTLINE, 2.4)
    cv.rrect([8, 8, W - 8, H - 8], 2, (0, 0, 0), None, 0)
    # punch out window
    x0, y0, x1, y1 = 8, 8, W - 8, H - 8
    cv.d.rectangle([x0 * cv.S, y0 * cv.S, x1 * cv.S, y1 * cv.S], fill=(0, 0, 0, 0))
    cv.stroke([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], OUTLINE, 1.4)
    # motor housing on top
    return (cv.finish(2) if k else skew_left(cv)), (0, 0)


def screen_content(kind, k=None):
    W, H = 248, 136
    cv = Cv(W, H, k or 1)
    cv.d.rectangle([0, 0, W * cv.S, H * cv.S], fill=rgba(PAL["hall_white"]))
    if kind == "idle":
        text(cv, (54, 44), "UNIFY", 34, PAL["deep_blue"])
        cv.line((60, 92), (188, 92), PAL["warm_gold"], 3)
        text(cv, (70, 100), "Lesson starting soon", 11, PAL["med_gray"])
    elif kind == "math_coordinate":
        cx, cy = 124, 72
        for i in range(-5, 6):
            cv.line((cx + i * 20, 12), (cx + i * 20, 128), PAL["light_gray"], 1)
        for j in range(-3, 4):
            cv.line((14, cy + j * 20), (234, cy + j * 20), PAL["light_gray"], 1)
        cv.line((14, cy), (234, cy), PAL["charcoal"], 1.8)
        cv.line((cx, 10), (cx, 130), PAL["charcoal"], 1.8)
        pts = [(cx + x * 20, cy - (x * x * 0.55 - 2.2) * 10) for x in [i / 8 for i in range(-40, 41)]]
        pts = [p for p in pts if 16 < p[1] < 126 and 16 < p[0] < 232]
        for a, b in zip(pts, pts[1:]):
            cv.line(a, b, PAL["school_blue"], 3)
        cv.ellipse([cx - 4, cy - 4 + 22, cx + 4, cy + 4 + 22], PAL["coral"], OUTLINE, 1)
        cv.rrect([8, 108, 88, 128], 4, PAL["warm_white"], PAL["med_gray"], 0.8)
        text(cv, (14, 111), "y = x² − 4", 10, PAL["deep_blue"])
    elif kind == "math_fraction":
        for r, (n, d) in enumerate([(1, 1), (1, 2), (1, 3), (1, 4)]):
            y = 16 + r * 28
            for k in range(d):
                x0 = 20 + k * (200 // d)
                cv.rrect([x0, y, x0 + 200 // d - 2, y + 22], 3,
                         PAL["soft_yellow"] if k < n else PAL["light_gray"], PAL["charcoal"], 1.2)
            text(cv, (224, y + 3), f"{n}/{d}", 10, PAL["deep_blue"])
    elif kind in SLIDES:
        from gen_decor import POSTERS, THEME
        subj, idx = SLIDES[kind]
        th = THEME[subj]
        cv.rrect([0, 0, W, 22], 0, th[0], None, 0)
        cv.ox, cv.oy = 14, 30
        POSTERS[subj][idx](cv, 72, 96, th)
        cv.ox = cv.oy = 0
        for i in range(4):
            cv.ellipse([104, 44 + i * 22, 112, 52 + i * 22], th[1 if i % 2 else 0], OUTLINE, 1.0)
            cv.rrect([120, 44 + i * 22, 224 - (i % 3) * 30, 52 + i * 22], 3, PAL["light_gray"], None, 0)
    elif kind == "sci_cell":
        cv.ellipse([40, 16, 208, 122], PAL["mint"], PAL["leaf"], 2.4)
        cv.ellipse([104, 46, 152, 90], PAL["lavender"], PAL["deep_lavender"], 2)
        cv.ellipse([116, 58, 132, 74], PAL["deep_lavender"], None, 0)
        for (x, y) in ((70, 40), (180, 50), (74, 92), (176, 96), (128, 28), (130, 108)):
            cv.ellipse([x - 9, y - 6, x + 9, y + 6], PAL["soft_yellow"], PAL["warm_gold"], 1.4)
        text(cv, (10, 6), "Plant cell", 11, PAL["dark_leaf"])
    elif kind == "hist_map":
        for pts in ([(24, 36), (70, 28), (80, 66), (56, 100), (34, 76)], [(100, 30), (150, 24), (176, 58), (140, 84), (112, 112), (98, 66)], [(160, 92), (206, 88), (204, 120), (170, 122)]):
            cv.poly(pts, PAL["sage"], PAL["dark_leaf"], 1.6)
        for (x, y) in ((70, 50), (140, 50), (190, 106)):
            cv.ellipse([x - 4, y - 4, x + 4, y + 4], PAL["coral"], OUTLINE, 1.2)
        text(cv, (10, 6), "Where did it happen?", 11, PAL["terracotta"])
    elif kind == "ela_annotation":
        text(cv, (14, 10), "Close reading", 14, PAL["dark_leaf"])
        for i, ww in enumerate((210, 190, 220, 160, 200, 140)):
            y = 36 + i * 16
            if i in (1, 4):
                cv.rrect([14, y - 2, 14 + ww * .7, y + 9], 2, mix(PAL["soft_yellow"], PAL["warm_white"], .3), None, 0)
            cv.line((14, y + 4), (14 + ww, y + 4), PAL["med_gray"], 2)
        cv.rrect([160, 96, 236, 124], 6, PAL["coral"], OUTLINE, 1.2)
        text(cv, (170, 103), "Evidence", 10, PAL["warm_white"])
    return (cv.finish(2) if k else skew_left(cv)), (0, 0)


def light_rig():
    W, H = 190, 110
    cv = Cv(W, H)
    p0, p1 = (176, 22), (30, 96)
    cv.capsule(p0, p1, 5, PAL["charcoal"], PAL["dark_detail"], 1.2)
    for t in (0.15, 0.5, 0.85):
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t
        cv.line((x, y), (x, y - 14), PAL["charcoal"], 1.4)
        cv.rrect([x - 7, y + 1, x + 7, y + 15], 4, PAL["dark_detail"], OUTLINE, 1.2)
        cv.ellipse([x - 5, y + 11, x + 5, y + 17], mix(PAL["soft_yellow"], PAL["warm_white"], .5), OUTLINE, 1)
    return cv.finish(1), (176, 22)


def light_pool():
    W, H = 384, 192
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    steps = 36
    for i in range(steps):
        t = i / steps
        rx, ry = W / 2 * (1 - t), H / 2 * (1 - t)
        a = int(60 * (t ** 1.3))
        d.ellipse([W / 2 - rx, H / 2 - ry, W / 2 + rx, H / 2 + ry], fill=(*PAL["soft_yellow"], a))
    return im.filter(ImageFilter.GaussianBlur(10)), (192, 96)


def main():
    reg("floor_oak_01", "architecture/floors/floor_oak_01.png", floor_tile("a", PAL["oak_light"], 1), (48, 0), "floor")
    reg("floor_oak_02", "architecture/floors/floor_oak_02.png", floor_tile("b", mix(PAL["oak_light"], PAL["oak_high"], .2), 2), (48, 0), "floor")
    reg("floor_hall_tile_01", "architecture/floors/floor_hall_tile_01.png", floor_tile("h", PAL["hall_white"], 3, hall=True), (48, 0), "floor")
    im, an = stage_stair(); reg("stage_stair", "auditorium/stage/stage_stair.png", im, an, "stage")
    im, an = podium(); reg("podium_oak", "auditorium/stage/podium_oak.png", im, an, "stage")
    im, an = plant(); reg("plant_medium_01", "plants/plant_medium_01.png", im, an, "prop")
    im, an = whiteboard(); reg("board_white_large_left", "auditorium/stage/board_white_large_left.png", im, an, "wallmount")
    im, an = screen_bezel(); reg("screen_bezel_left", "auditorium/stage/screen_bezel_left.png", im, an, "wallmount")
    for k in ("idle", "math_coordinate", "math_fraction", "ela_annotation", "sci_cell", "hist_map"):
        im, an = screen_content(k); reg(f"screen_content_{k}_left", f"auditorium/screens/screen_content_{k}_left.png", im, an, "screen")
    im, an = light_rig(); reg("light_rig_left", "auditorium/lighting/light_rig_left.png", im, an, "lighting")
    im, an = light_pool(); reg("light_pool_warm", "auditorium/lighting/light_pool_warm.png", im, an, "lighting")
    import gen_subjects
    gen_subjects.run()
    import gen_hall
    gen_hall.run()
    try:
        import gen_seatview
        gen_seatview.run(reg)
    except ImportError:
        pass
    with open(os.path.join(ROOT, "tools", "env_manifest.json"), "w") as f:
        json.dump(MANIFEST, f, indent=1)
    print(f"env: {len(MANIFEST)} assets")


if __name__ == "__main__":
    import gen_env  # so gen_subjects (which imports gen_env) shares one MANIFEST
    gen_env.main()
