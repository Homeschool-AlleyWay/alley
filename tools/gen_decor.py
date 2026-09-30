#!/usr/bin/env python3
"""Subject decoration art. Posters/banners are drawn flat (logical 72x96 / 96x124) then
(a) skewed onto the left or right wall for the iso view, (b) rendered flat at 2x for the first-person view,
(c) rendered at 3x as textbook figures. Props are iso objects. No text labels on decor: rooms read by imagery."""
import json, math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from lib import *

MAN = []
TERRA = rgb("#C98569")
THEME = {  # Bible sec.5 subject accents: (primary, secondary, tertiary)
    "math": (PAL["school_blue"], PAL["warm_gold"], PAL["sky"]),
    "ela": (PAL["sage"], PAL["coral"], PAL["soft_yellow"]),
    "science": (PAL["sky"], PAL["leaf"], PAL["mint"]),
    "history": (PAL["warm_gold"], TERRA, PAL["oak_high"]),
    "technology": (PAL["deep_blue"], PAL["sky"], PAL["mint"]),
    "art": (PAL["coral"], PAL["lavender"], PAL["warm_gold"]),
}
SUBJECTS = list(THEME)


def reg(key, rel, im, anchor, cat, **kw):
    save(im, rel)
    MAN.append(dict(key=key, file=rel, w=im.width, h=im.height, anchor=list(anchor), category=cat, **kw))


def fnt(cv, sz, bold=True):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")
    return ImageFont.truetype(p, int(sz * cv.S)) if os.path.exists(p) else ImageFont.load_default()


def T(cv, xy, s, sz, col, bold=True, anchor="la"):
    cv.d.text(((xy[0] + cv.ox) * cv.S, (xy[1] + cv.oy) * cv.S), s, font=fnt(cv, sz, bold), fill=rgba(col), anchor=anchor)


def frame(cv, W, H, th, paper=None):
    cv.rrect([1, 1, W - 1, H - 1], 3, paper or PAL["warm_white"], OUTLINE, 1.6)
    cv.rrect([4, 4, W - 4, H - 4], 2, paper or PAL["warm_white"], th[0], 1.6)
    for x in (10, W - 10):
        cv.rrect([x - 3, 0, x + 3, 5], 1, PAL["light_gray"], None, 0)


def ell(cv, cx, cy, rx, ry, fill, ol=OUTLINE, ow=1.0):
    cv.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill, ol, ow)


def wedge(cv, cx, cy, r0, r1, a0, a1, fill, ol=OUTLINE, ow=0.8):
    n = 8
    outer = [(cx + r1 * math.cos(a0 + (a1 - a0) * i / n), cy + r1 * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
    inner = [(cx + r0 * math.cos(a1 - (a1 - a0) * i / n), cy + r0 * math.sin(a1 - (a1 - a0) * i / n)) for i in range(n + 1)]
    cv.poly(outer + inner, fill, ol, ow)


# ------------------------------------------------------------------ posters (logical 72x96)
def p_math_a(cv, W, H, th):
    frame(cv, W, H, th)
    x0, y0, x1, y1 = 9, 12, W - 9, 70
    for i in range(0, 8):
        cv.line((x0 + i * (x1 - x0) / 7, y0), (x0 + i * (x1 - x0) / 7, y1), PAL["light_gray"], 0.8)
    for j in range(0, 6):
        cv.line((x0, y0 + j * (y1 - y0) / 5), (x1, y0 + j * (y1 - y0) / 5), PAL["light_gray"], 0.8)
    cx, cy = (x0 + x1) / 2, y1 - 6
    cv.line((x0, cy), (x1, cy), PAL["charcoal"], 1.3)
    cv.line((cx, y0 - 1), (cx, y1), PAL["charcoal"], 1.3)
    pts = [(cx + t * 7.2, cy - (t * t * 2.6)) for t in [i / 3 for i in range(-9, 10)]]
    pts = [p for p in pts if p[1] > y0]
    for a, b in zip(pts, pts[1:]):
        cv.line(a, b, th[0], 2.0)
    ell(cv, cx, cy, 2.2, 2.2, PAL["coral"], OUTLINE, 0.8)
    T(cv, (W / 2, 82), "y = x²", 9, PAL["deep_blue"], anchor="mm")


def p_math_b(cv, W, H, th):
    frame(cv, W, H, th)
    cv.poly([(14, 40), (34, 40), (24, 14)], PAL["soft_yellow"], OUTLINE, 1.2)
    ell(cv, 51, 27, 11, 11, PAL["powder"], OUTLINE, 1.2)
    cv.line((51, 27), (62, 27), OUTLINE, 1.0)
    cv.rrect([14, 50, 34, 70], 2, PAL["mint"], OUTLINE, 1.2)
    cv.line((14, 50), (34, 70), OUTLINE, 0.9)
    cv.poly([(42, 70), (62, 70), (66, 56), (52, 48), (40, 56)], PAL["peach"], OUTLINE, 1.2)
    cv.d.arc([(20 - 5) * cv.S, (40 - 5) * cv.S, (20 + 5) * cv.S, (40 + 5) * cv.S], 180, 300, fill=rgba(PAL["coral"]), width=int(1.4 * cv.S))
    T(cv, (W / 2, 83), "△ ○ □", 9, PAL["deep_blue"], anchor="mm")


def p_ela_a(cv, W, H, th):
    frame(cv, W, H, th)
    cv.poly([(9, 66), (26, 40), (36, 20), (50, 44), (63, 66)], mix(th[0], PAL["warm_white"], .35), OUTLINE, 1.3)
    path = [(9, 62), (20, 52), (28, 40), (36, 20), (44, 34), (54, 50), (63, 62)]
    for a, b in zip(path, path[1:]):
        cv.line(a, b, PAL["coral"], 1.8)
    for i, p in enumerate(path[1:-1]):
        ell(cv, p[0], p[1], 2.4, 2.4, PAL["soft_yellow"] if i != 2 else PAL["coral"], OUTLINE, 0.9)
    for i in range(4):
        cv.line((12, 76 + i * 4.5), (60 - (i % 2) * 14, 76 + i * 4.5), PAL["med_gray"], 1.2)


def p_ela_b(cv, W, H, th):
    frame(cv, W, H, th)
    T(cv, (14, 6), "“", 34, th[1], anchor="la")
    cols = [PAL["coral"], PAL["sage"], PAL["powder"], PAL["soft_yellow"], PAL["lavender"]]
    rows = [(8, 20, 14, 10), (12, 8, 22, 16), (20, 14, 10, 12), (10, 18, 12, 14), (16, 10, 18, 8)]
    for r, row in enumerate(rows):
        x = 10
        for k, w in enumerate(row):
            cv.rrect([x, 34 + r * 11, x + w, 42 + r * 11], 2, cols[(r + k) % 5], OUTLINE, 0.9)
            x += w + 3


def p_sci_a(cv, W, H, th):
    frame(cv, W, H, th)
    lens = [(0, 1), (0, 1), (0, 1), (0, 1), (0, 1), (0, 1)]
    layout = {0: [0, 17], 1: [0, 1] + list(range(12, 18)), 2: [0, 1] + list(range(12, 18)), 3: list(range(18)), 4: list(range(18)), 5: list(range(18)), 6: list(range(18))}
    groups = [PAL["coral"], PAL["peach"], PAL["soft_yellow"], PAL["mint"], PAL["sky"], PAL["lavender"], PAL["dusty_pink"]]
    cs = 3.4
    for r, cols in layout.items():
        for c in cols:
            col = groups[(c * 7 // 18 + (1 if c > 11 else 0)) % 7] if c not in (17,) else PAL["lavender"]
            if c in (0,): col = PAL["coral"]
            if c == 1: col = PAL["peach"]
            if 2 <= c <= 11: col = PAL["soft_yellow"] if r < 5 else PAL["sky"]
            cv.rrect([8.5 + c * cs, 12 + r * cs, 8.5 + c * cs + cs - 0.5, 12 + r * cs + cs - 0.5], 0.5, col, darken(col, .35), 0.4)
    for c in range(3, 15):
        cv.rrect([12 + (c - 3) * cs, 40 + 4 * 0 + 0, 12 + (c - 3) * cs + cs - .5, 40 + cs - .5], .5, PAL["mint"], darken(PAL["mint"], .35), .4)
    ell(cv, 36, 66, 10, 10, PAL["sky"], OUTLINE, 1.0)
    cv.line((36, 56), (36, 76), OUTLINE, .8)
    ell(cv, 36, 66, 3, 3, PAL["coral"], OUTLINE, .8)
    for i in range(3):
        cv.line((12, 82 + i * 3.5), (60 - i * 8, 82 + i * 3.5), PAL["med_gray"], 1.0)


def p_sci_b(cv, W, H, th):
    frame(cv, W, H, th)
    ell(cv, 36, 44, 27, 30, mix(PAL["peach"], PAL["warm_white"], .4), OUTLINE, 1.6)
    ell(cv, 33, 40, 11, 11, PAL["lavender"], OUTLINE, 1.2)
    ell(cv, 33, 40, 4, 4, PAL["deep_lavender"], OUTLINE, .8)
    for (x, y) in [(52, 32), (22, 62), (54, 58)]:
        ell(cv, x, y, 6, 3.6, PAL["coral"], OUTLINE, .9)
        cv.line((x - 4, y), (x + 4, y), darken(PAL["coral"], .3), .6)
    for (x, y) in [(20, 28), (48, 50), (40, 66)]:
        ell(cv, x, y, 3, 3, PAL["leaf"], OUTLINE, .8)
    cv.line((44, 60), (52, 66), PAL["leaf"], 1.4)
    cv.line((52, 66), (58, 62), PAL["leaf"], 1.4)


def p_hist_a(cv, W, H, th):
    frame(cv, W, H, th, PAL["powder"])
    land = PAL["oak_high"]
    for poly in [
        [(10, 24), (26, 18), (32, 28), (26, 40), (16, 42), (11, 34)],
        [(26, 44), (34, 46), (36, 60), (30, 72), (25, 62)],
        [(38, 22), (48, 16), (62, 20), (64, 32), (54, 40), (44, 36), (40, 30)],
        [(38, 42), (48, 40), (52, 54), (46, 64), (40, 56)],
        [(54, 58), (62, 56), (64, 66), (56, 68)]]:
        cv.poly(poly, land, OUTLINE, 1.0)
    for i in range(1, 4):
        cv.line((6, 18 + i * 14), (W - 6, 18 + i * 14), lighten(PAL["powder"], .4), .6)
    cv.line((36, 8), (36, 80), lighten(PAL["powder"], .4), .6)
    cv.poly([(6, 84), (66, 84), (62, 90), (10, 90)], TERRA, OUTLINE, 1.0)


def p_hist_b(cv, W, H, th):
    frame(cv, W, H, th)
    cv.line((10, 48), (W - 10, 48), PAL["charcoal"], 2.0)
    for i, x in enumerate((16, 30, 44, 58)):
        up = i % 2 == 0
        cv.line((x, 48), (x, 38 if up else 58), OUTLINE, 1.0)
        cv.rrect([x - 8, 22 if up else 58, x + 8, 38 if up else 74], 2, [PAL["oak_high"], PAL["peach"], PAL["mint"], PAL["powder"]][i], OUTLINE, 1.0)
        ell(cv, x, 48, 3, 3, TERRA, OUTLINE, .9)
    cv.line((12, 14), (60, 14), th[1], 2.0)
    for x in (16, 28, 40, 52):
        cv.rrect([x, 8, x + 4, 14], 1, PAL["warm_gold"], OUTLINE, .6)
    for i in range(2):
        cv.line((12, 82 + i * 4.5), (60 - i * 12, 82 + i * 4.5), PAL["med_gray"], 1.2)


def p_tech_a(cv, W, H, th):
    frame(cv, W, H, th, PAL["dark_detail"])
    for (a, b) in [((10, 20), (30, 20)), ((30, 20), (30, 34)), ((62, 22), (44, 22)), ((44, 22), (44, 34)), ((10, 74), (28, 74)), ((28, 74), (28, 58)),
                   ((62, 70), (46, 70)), ((46, 70), (46, 58)), ((10, 47), (24, 47)), ((48, 47), (62, 47))]:
        cv.line(a, b, PAL["mint"], 1.4)
        ell(cv, b[0], b[1], 1.6, 1.6, PAL["sky"], None, 0)
    cv.rrect([24, 34, 48, 58], 2, PAL["charcoal"], PAL["sky"], 1.2)
    for i in range(4):
        for x in (22, 50):
            cv.line((x, 37 + i * 5.5), (x + (2 if x < 30 else -2), 37 + i * 5.5), PAL["light_gray"], 1.0)
    ell(cv, 36, 46, 4, 4, PAL["deep_blue"], PAL["sky"], 1.0)


def p_tech_b(cv, W, H, th):
    frame(cv, W, H, th)
    cv.rrect([8, 10, W - 8, 82], 3, PAL["dark_detail"], OUTLINE, 1.2)
    cv.rrect([8, 10, W - 8, 20], 3, PAL["charcoal"], None, 0)
    for i, c in enumerate(("coral", "soft_yellow", "mint")):
        ell(cv, 15 + i * 6, 15, 1.8, 1.8, PAL[c], None, 0)
    cols = [PAL["sky"], PAL["mint"], PAL["soft_yellow"], PAL["coral"], PAL["lavender"]]
    for i, (ind, ww) in enumerate([(0, 30), (5, 24), (5, 34), (10, 18), (5, 26), (0, 20)]):
        cv.rrect([12 + ind, 25 + i * 6.5, 12 + ind + ww, 29 + i * 6.5], 1, cols[i % 5], None, 0)
    T(cv, (W / 2, 72), "0101 1100", 7, PAL["mint"], anchor="mm")


def p_art_a(cv, W, H, th):
    frame(cv, W, H, th)
    cols = [PAL["coral"], PAL["peach"], PAL["soft_yellow"], PAL["warm_gold"], PAL["mint"], PAL["leaf"], PAL["sky"], PAL["school_blue"], PAL["lavender"], PAL["deep_lavender"], PAL["dusty_pink"], PAL["soft_coral"] if "soft_coral" in PAL else PAL["coral"]]
    for i, c in enumerate(cols):
        wedge(cv, 36, 44, 9, 27, 2 * math.pi * i / 12 - math.pi / 2, 2 * math.pi * (i + 1) / 12 - math.pi / 2, c)
    ell(cv, 36, 44, 8, 8, PAL["warm_white"], OUTLINE, 1.0)
    for i in range(2):
        cv.line((12, 80 + i * 4.5), (60 - i * 12, 80 + i * 4.5), PAL["med_gray"], 1.2)


def p_art_b(cv, W, H, th):
    frame(cv, W, H, th)
    cv.rrect([9, 12, W - 9, 62], 2, PAL["hall_white"], OUTLINE, 1.0)
    strokes = [(PAL["coral"], [(14, 50), (24, 24), (34, 44), (44, 20)]), (PAL["school_blue"], [(16, 30), (30, 52), (42, 34), (56, 54)]),
               (PAL["warm_gold"], [(20, 20), (36, 30), (50, 22), (58, 34)])]
    for col, pts in strokes:
        for a, b in zip(pts, pts[1:]):
            cv.capsule(a, b, 4.2, col, darken(col, .35), 0.6)
    for i, c in enumerate((PAL["coral"], PAL["warm_gold"], PAL["leaf"], PAL["school_blue"], PAL["lavender"])):
        ell(cv, 14 + i * 11, 76, 4, 4, c, OUTLINE, 1.0)


POSTERS = {
    "math": (p_math_a, p_math_b), "ela": (p_ela_a, p_ela_b), "science": (p_sci_a, p_sci_b),
    "history": (p_hist_a, p_hist_b), "technology": (p_tech_a, p_tech_b), "art": (p_art_a, p_art_b)}


# ------------------------------------------------------------------ small left-wall posters (60x80) and banners (96x124)
def small_poster(subj, cv, W, H, th):
    frame(cv, W, H, th)
    if subj == "math":
        cv.line((8, 34), (W - 8, 34), PAL["charcoal"], 1.5)
        for i in range(9):
            cv.line((10 + i * 5, 30), (10 + i * 5, 38), PAL["charcoal"], 1.0)
        ell(cv, 35, 34, 3, 3, PAL["coral"], OUTLINE, .8)
        T(cv, (W / 2, 54), "π", 20, PAL["deep_blue"], anchor="mm")
    elif subj == "ela":
        cv.poly([(8, 30), (30, 26), (30, 56), (8, 60)], PAL["warm_white"], OUTLINE, 1.2)
        cv.poly([(52, 30), (30, 26), (30, 56), (52, 60)], mix(PAL["sage"], PAL["warm_white"], .5), OUTLINE, 1.2)
        for i in range(4):
            cv.line((11, 34 + i * 5), (27, 32 + i * 5), PAL["med_gray"], 1.0)
            cv.line((33, 32 + i * 5), (49, 34 + i * 5), PAL["med_gray"], 1.0)
    elif subj == "science":
        ell(cv, 30, 40, 22, 9, None or PAL["warm_white"], PAL["med_gray"], .8)
        ell(cv, 30, 40, 12, 5, PAL["warm_white"], PAL["med_gray"], .8)
        ell(cv, 30, 40, 5, 5, PAL["soft_yellow"], OUTLINE, 1.0)
        ell(cv, 50, 42, 2.6, 2.6, PAL["sky"], OUTLINE, .8)
        ell(cv, 18, 43, 2, 2, PAL["coral"], OUTLINE, .8)
    elif subj == "history":
        cv.rrect([14, 24, 46, 58], 3, PAL["oak_high"], OUTLINE, 1.2)
        for i in range(4):
            cv.line((19, 31 + i * 7), (41, 31 + i * 7), TERRA, 1.2)
        cv.rrect([10, 20, 50, 26], 3, TERRA, OUTLINE, 1.0)
        cv.rrect([10, 56, 50, 62], 3, TERRA, OUTLINE, 1.0)
    elif subj == "technology":
        cv.rrect([12, 24, 48, 50], 3, PAL["charcoal"], OUTLINE, 1.2)
        cv.rrect([15, 27, 45, 47], 1, PAL["deep_blue"], None, 0)
        for (x, y) in [(24, 33), (36, 33), (20, 39), (40, 39), (26, 43), (34, 43)]:
            cv.rrect([x, y, x + 3, y + 3], .5, PAL["mint"], None, 0)
        cv.rrect([24, 50, 36, 56], 1, PAL["med_gray"], OUTLINE, 1.0)
    else:
        cv.poly([(10, 44), (14, 28), (32, 22), (50, 30), (48, 46), (34, 52), (30, 44), (20, 50)], mix(PAL["oak_high"], PAL["warm_white"], .4), OUTLINE, 1.2)
        for (x, y, c) in [(22, 32, "coral"), (32, 29, "warm_gold"), (42, 34, "leaf"), (40, 44, "school_blue")]:
            ell(cv, x, y, 3.2, 3.2, PAL[c], OUTLINE, .8)


def banner(subj, cv, W, H, th):
    prim, sec = th[0], th[1]
    cv.poly([(6, 10), (W - 6, 10), (W - 6, H - 26), (W / 2, H - 6), (6, H - 26)], prim, OUTLINE, 1.8)
    cv.poly([(12, 16), (W - 12, 16), (W - 12, H - 30), (W / 2, H - 14), (12, H - 30)], None or lighten(prim, .12), sec, 1.6)
    cv.rrect([2, 4, W - 2, 12], 4, PAL["oak_mid"], OUTLINE, 1.4)
    cx, cy = W / 2, 56
    ink = PAL["warm_white"]
    if subj == "math":
        T(cv, (cx, cy), "π", 44, ink, anchor="mm")
        for (x, y, s) in [(22, 32, "+"), (74, 32, "−"), (22, 84, "×"), (74, 84, "÷")]:
            T(cv, (x, y), s, 16, sec, anchor="mm")
    elif subj == "ela":
        cv.poly([(22, 44), (46, 38), (46, 76), (22, 82)], ink, OUTLINE, 1.4)
        cv.poly([(74, 44), (46, 38), (46, 76), (74, 82)], lighten(prim, .6), OUTLINE, 1.4)
        cv.capsule((60, 34), (78, 22), 3, sec, OUTLINE, 1.0)
        for i in range(4):
            cv.line((26, 50 + i * 6.5), (43, 47 + i * 6.5), PAL["med_gray"], 1.0)
    elif subj == "science":
        for ang in (0, 60, 120):
            a = math.radians(ang)
            pts = [(cx + 28 * math.cos(t) * math.cos(a) - 11 * math.sin(t) * math.sin(a), cy + 28 * math.cos(t) * math.sin(a) + 11 * math.sin(t) * math.cos(a)) for t in [i * math.pi / 12 for i in range(25)]]
            cv.stroke(pts, ink, 1.8, closed=False)
        ell(cv, cx, cy, 6.5, 6.5, sec, OUTLINE, 1.4)
    elif subj == "history":
        cv.rrect([cx - 12, 34, cx + 12, 40], 2, ink, OUTLINE, 1.2)
        cv.rrect([cx - 8, 40, cx + 8, 76], 2, ink, OUTLINE, 1.2)
        for x in (-4, 0, 4):
            cv.line((cx + x, 42), (cx + x, 74), darken(ink, .2), .8)
        cv.rrect([cx - 13, 76, cx + 13, 82], 2, ink, OUTLINE, 1.2)
        for s in (-1, 1):
            cv.stroke([(cx + s * 30, 42), (cx + s * 34, 60), (cx + s * 24, 78)], sec, 2.6, closed=False)
    elif subj == "technology":
        cv.rrect([cx - 18, cy - 18, cx + 18, cy + 18], 3, PAL["charcoal"], ink, 1.6)
        for i in range(5):
            for (dx, dy) in ((-1, 0), (1, 0)):
                cv.line((cx + dx * 18, cy - 14 + i * 7), (cx + dx * 26, cy - 14 + i * 7), ink, 1.6)
            cv.line((cx - 14 + i * 7, cy - 18), (cx - 14 + i * 7, cy - 26), ink, 1.6)
            cv.line((cx - 14 + i * 7, cy + 18), (cx - 14 + i * 7, cy + 26), ink, 1.6)
        ell(cv, cx, cy, 8, 8, sec, OUTLINE, 1.2)
    else:
        cv.poly([(cx - 26, cy + 4), (cx - 22, cy - 14), (cx, cy - 22), (cx + 24, cy - 12), (cx + 22, cy + 8), (cx + 4, cy + 18), (cx, cy + 6), (cx - 12, cy + 14)], ink, OUTLINE, 1.4)
        for (dx, dy, c) in [(-12, -6, PAL["coral"]), (0, -12, PAL["warm_gold"]), (14, -4, PAL["leaf"]), (12, 8, PAL["school_blue"])]:
            ell(cv, cx + dx, cy + dy, 4.6, 4.6, c, OUTLINE, 1.0)
        cv.capsule((cx + 20, cy + 22), (cx + 34, cy + 6), 3.6, sec, OUTLINE, 1.0)


# ------------------------------------------------------------------ skew
def skew(cv, side):
    im, sh = cv.im, cv.sh
    w, h = im.size
    out_h = h + w // 2
    co = (1, 0, 0, 0.5, 1, -0.5 * w) if side == "left" else (1, 0, 0, -0.5, 1, 0)
    o = im.transform((w, out_h), Image.AFFINE, co, resample=Image.BICUBIC)
    s = sh.transform((w, out_h), Image.AFFINE, co, resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(cv.S * 1.6))
    return Image.alpha_composite(s, o).resize((w // cv.S, out_h // cv.S), Image.LANCZOS)


def flat_k(fn, W, H, k, *args):
    cv = Cv(W, H, k)
    fn(cv, W, H, *args)
    return cv.finish(2)


def wall_item(fn, W, H, side, *args):
    cv = Cv(W, H)
    cv.shadow([(3, 3), (W + 2, 3), (W + 2, H + 2), (3, H + 2)], 0.25)
    fn(cv, W, H, *args)
    return skew(cv, side)


# ------------------------------------------------------------------ iso props
def cyl(cv, cx, by, r, h, col, top=None):
    cv.ellipse([cx - r, by - r * 0.5 - h, cx + r, by + r * 0.5 - h], top or lighten(col, .3), OUTLINE, 1.0) if False else None
    cv.rrect([cx - r, by - h, cx + r, by], 1.5, col, OUTLINE, 1.2)
    cv.ellipse([cx - r, by - r * .5, cx + r, by + r * .5], col, OUTLINE, 1.2)
    cv.rrect([cx - r + 1.2, by - h, cx + r - 1.2, by], 0, col, None, 0)
    cv.ellipse([cx - r, by - h - r * .5, cx + r, by - h + r * .5], top or lighten(col, .3), OUTLINE, 1.2)


def rface(org, xf, y0, y1, e, h, u0, u1, v0, v1):
    """Rectangle on the +x face (plane x=xf), fractions u across / v up, of a face h px tall starting at elevation e."""
    yy = lambda u: y0 + (y1 - y0) * u
    return [iso_pt(*org, xf, yy(u0), e + h * v1), iso_pt(*org, xf, yy(u1), e + h * v1), iso_pt(*org, xf, yy(u1), e + h * v0), iso_pt(*org, xf, yy(u0), e + h * v0)]


def shadow1(cv, org):
    cv.shadow([iso_pt(*org, .08, .1), iso_pt(*org, .98, .1), iso_pt(*org, 1.1, .98), iso_pt(*org, .2, .98)], 0.2)


def prop_canvas(H=110):
    return new_obj_local(1, 1, H)


def new_obj_local(a, b, H, pad=6):
    w = int((a + b) * 48 + pad * 2)
    h = int((a + b) * 24 + H + pad * 2)
    org = (b * 48 + pad, H + pad)
    return Cv(w, h), org, (org[0] + (a - b) * 48, org[1] + (a + b) * 24)


def bx(cv, org, x, y, a, b, e, h, col, ow=1.2):
    return box(cv, org, x, y, a, b, e, h, col, darken(col, .14), darken(col, .3), ow)


def pr_math_solids():
    cv, org, an = new_obj_local(1, 1, 110)
    shadow1(cv, org)
    bx(cv, org, .1, .1, .8, .8, 0, 34, PAL["oak_mid"])
    bx(cv, org, .18, .18, .28, .28, 34, 18, PAL["soft_yellow"], 1.0)
    a, b, c, d = [iso_pt(*org, .55 + dx, .18 + dy, 34) for dx, dy in ((0, 0), (.3, 0), (.3, .3), (0, .3))]
    apex = iso_pt(*org, .7, .33, 34 + 30)
    cv.poly([d, c, apex], darken(PAL["coral"], .1), OUTLINE, 1.0)
    cv.poly([c, b, apex], darken(PAL["coral"], .25), OUTLINE, 1.0)
    cv.poly([a, b, c, d], lighten(PAL["coral"], .1), OUTLINE, 1.0)
    p = iso_pt(*org, .35, .68, 34)
    cyl(cv, p[0], p[1], 8, 16, PAL["school_blue"], lighten(PAL["school_blue"], .3))
    p = iso_pt(*org, .72, .72, 34)
    ell(cv, p[0], p[1] - 11, 10, 10, PAL["mint"], OUTLINE, 1.2)
    return cv.finish(2), an


def pr_math_cart():
    cv, org, an = new_obj_local(1, 1, 90)
    shadow1(cv, org)
    for (x, y) in [(.14, .14), (.72, .14), (.14, .72), (.72, .72)]:
        bx(cv, org, x, y, .1, .1, 0, 6, PAL["dark_detail"], 0.8)
    bx(cv, org, .1, .1, .8, .8, 6, 30, PAL["school_blue"])
    bx(cv, org, .06, .06, .88, .88, 36, 4, PAL["light_gray"])
    for i, (x, y, c) in enumerate([(.16, .18, "warm_gold"), (.32, .18, "warm_gold"), (.5, .16, "soft_yellow"), (.2, .5, "coral"), (.44, .5, "leaf"), (.66, .48, "sky")]):
        bx(cv, org, x, y, .13, .13, 40, 9 + (i % 3) * 3, PAL[c], .9)
    rf = rface(org, .9, .1, .9, 6, 30, .1, .9, .15, .8)
    cv.poly(rf, lighten(PAL["school_blue"], .15), OUTLINE, 0.8)
    return cv.finish(2), an


def pr_ela_bookcase():
    cv, org, an = new_obj_local(1, 1, 130)
    shadow1(cv, org)
    bx(cv, org, .1, .08, .6, .84, 0, 110, PAL["oak_mid"])
    face = rface(org, .7, .08, .92, 0, 110, .05, .95, .04, .96)
    cv.poly(face, darken(PAL["oak_shadow"], .1), OUTLINE, 1.0)
    cols = [PAL["coral"], PAL["school_blue"], PAL["soft_yellow"], PAL["sage"], PAL["lavender"], PAL["peach"], PAL["leaf"], PAL["dusty_pink"]]
    import random
    rnd = random.Random(3)
    for shelf in range(4):
        v0 = 0.07 + shelf * 0.235
        u = 0.08
        i = 0
        while u < 0.9:
            w = rnd.uniform(.05, .09)
            hgt = rnd.uniform(.15, .21)
            cv.poly(rface(org, .7, .08, .92, 0, 110, u, min(u + w, .93), v0 + .02, v0 + .02 + hgt), cols[(shelf * 3 + i) % 8], OUTLINE, .7)
            u += w + .004
            i += 1
        cv.poly(rface(org, .7, .08, .92, 0, 110, .03, .97, v0 - .015, v0 + .02), PAL["oak_high"], OUTLINE, .7)
    return cv.finish(2), an


def pr_ela_chair():
    cv, org, an = new_obj_local(1, 1, 90)
    shadow1(cv, org)
    bx(cv, org, .2, .2, .55, .6, 0, 12, PAL["oak_shadow"])
    bx(cv, org, .18, .18, .6, .64, 12, 14, PAL["coral"])
    bx(cv, org, .62, .18, .18, .64, 16, 44, PAL["coral"])
    for yy in (.12, .78):
        bx(cv, org, .2, yy, .48, .1, 20, 12, darken(PAL["coral"], .05))
    bx(cv, org, .3, .34, .28, .3, 26, 4, PAL["soft_yellow"], .8)
    return cv.finish(2), an


def pr_sci_bench():
    cv, org, an = new_obj_local(1, 1, 100)
    shadow1(cv, org)
    bx(cv, org, .08, .08, .84, .84, 0, 34, PAL["charcoal"])
    rf = rface(org, .92, .08, .92, 0, 34, .08, .92, .1, .9)
    cv.poly(rf, darken(PAL["charcoal"], .1), OUTLINE, .8)
    bx(cv, org, .04, .04, .92, .92, 34, 5, PAL["light_gray"])
    p = iso_pt(*org, .3, .3, 39)
    for (dx, c, hh) in [(0, PAL["coral"], 16), (13, PAL["leaf"], 12)]:
        cv.rrect([p[0] + dx - 5, p[1] - hh, p[0] + dx + 5, p[1] + 4], 2, mix(PAL["sky"], PAL["warm_white"], .6), OUTLINE, 1.0)
        cv.rrect([p[0] + dx - 4, p[1] - hh * .55, p[0] + dx + 4, p[1] + 3], 1.5, c, None, 0)
    q = iso_pt(*org, .65, .55, 39)
    cv.rrect([q[0] - 5, q[1] - 22, q[0] + 5, q[1]], 2, PAL["med_gray"], OUTLINE, 1.0)
    cv.capsule((q[0] + 2, q[1] - 22), (q[0] + 10, q[1] - 12), 4, PAL["charcoal"], OUTLINE, 1.0)
    cv.rrect([q[0] - 9, q[1] - 2, q[0] + 9, q[1] + 3], 1, PAL["charcoal"], OUTLINE, 1.0)
    return cv.finish(2), an


def pr_sci_terrarium():
    cv, org, an = new_obj_local(1, 1, 100)
    shadow1(cv, org)
    bx(cv, org, .1, .1, .8, .8, 0, 30, PAL["oak_mid"])
    bx(cv, org, .14, .14, .72, .72, 30, 5, PAL["oak_shadow"], .8)
    for i in range(6):
        p = iso_pt(*org, .3 + (i % 3) * .2, .3 + (i // 3) * .3, 35)
        for dx in (-5, 0, 5):
            cv.poly([(p[0], p[1]), (p[0] + dx * 1.3, p[1] - 16 - (i % 2) * 6), (p[0] + dx * .4 + 3, p[1] - 3)], PAL["leaf"] if (i + dx) % 2 else PAL["dark_leaf"], OUTLINE, .8)
    for face, col in (((.14, .86, .14, .86), None),):
        pass
    tl = [iso_pt(*org, .14, .14, 76), iso_pt(*org, .86, .14, 76), iso_pt(*org, .86, .86, 76), iso_pt(*org, .14, .86, 76)]
    cv.poly([tl[3], tl[2], (tl[2][0], tl[2][1] + 41), (tl[3][0], tl[3][1] + 41)], (*PAL["sky"],) , None, 0) if False else None
    ov = Image.new("RGBA", cv.im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    P = lambda pts: [(x * cv.S, y * cv.S) for x, y in pts]
    od.polygon(P([tl[3], tl[2], (tl[2][0], tl[2][1] + 41), (tl[3][0], tl[3][1] + 41)]), fill=(*PAL["sky"], 70))
    od.polygon(P([tl[2], tl[1], (tl[1][0], tl[1][1] + 41), (tl[2][0], tl[2][1] + 41)]), fill=(*PAL["sky"], 50))
    cv.im = Image.alpha_composite(cv.im, ov)
    cv.d = ImageDraw.Draw(cv.im)
    cv.stroke(tl, OUTLINE, 1.2)
    for a in (tl[3], tl[2], tl[1]):
        cv.line(a, (a[0], a[1] + 41), OUTLINE, 1.2)
    cv.stroke([(tl[3][0], tl[3][1] + 41), (tl[2][0], tl[2][1] + 41), (tl[1][0], tl[1][1] + 41)], OUTLINE, 1.2, closed=False)
    return cv.finish(2), an


def pr_hist_globe():
    cv, org, an = new_obj_local(1, 1, 110)
    shadow1(cv, org)
    p = iso_pt(*org, .5, .5, 0)
    cv.ellipse([p[0] - 22, p[1] - 6, p[0] + 22, p[1] + 8], PAL["oak_shadow"], OUTLINE, 1.2)
    cv.rrect([p[0] - 3, p[1] - 38, p[0] + 3, p[1]], 1, PAL["oak_mid"], OUTLINE, 1.0)
    cx, cy = p[0], p[1] - 62
    ell(cv, cx, cy, 25, 25, PAL["powder"], OUTLINE, 1.8)
    for poly in [[(-15, -8), (-4, -16), (-2, -4), (-10, 6), (-18, 0)], [(6, -14), (16, -8), (18, 4), (8, 8), (4, -2)], [(-6, 8), (2, 10), (0, 20), (-8, 16)]]:
        cv.poly([(cx + x, cy + y) for x, y in poly], PAL["oak_high"], OUTLINE, .9)
    ell(cv, cx, cy, 25, 25, None or (0, 0, 0), None, 0) if False else None
    cv.d.arc([(cx - 30) * cv.S, (cy - 28) * cv.S, (cx + 30) * cv.S, (cy + 28) * cv.S], 100, 260, fill=rgba(TERRA), width=int(2.4 * cv.S))
    cv.d.arc([(cx - 30) * cv.S, (cy - 28) * cv.S, (cx + 30) * cv.S, (cy + 28) * cv.S], 280, 80, fill=rgba(TERRA), width=int(2.4 * cv.S))
    cv.ellipse([cx - 14, cy - 5, cx + 14, cy + 5], (0, 0, 0, 0)[:3], PAL["oak_shadow"], 1.0) if False else None
    return cv.finish(2), an


def pr_hist_case():
    cv, org, an = new_obj_local(1, 1, 120)
    shadow1(cv, org)
    bx(cv, org, .1, .1, .8, .8, 0, 34, PAL["oak_mid"])
    tl = [iso_pt(*org, .12, .12, 100), iso_pt(*org, .88, .12, 100), iso_pt(*org, .88, .88, 100), iso_pt(*org, .12, .88, 100)]
    bl = [iso_pt(*org, .12, .12, 34), iso_pt(*org, .88, .12, 34), iso_pt(*org, .88, .88, 34), iso_pt(*org, .12, .88, 34)]
    cv.fill([bl[0], bl[1], bl[2], bl[3]], lighten(PAL["oak_high"], .3))
    p = iso_pt(*org, .38, .45, 34)
    cv.poly([(p[0] - 7, p[1]), (p[0] + 7, p[1]), (p[0] + 9, p[1] - 8), (p[0] + 4, p[1] - 18), (p[0] + 4, p[1] - 24), (p[0] - 4, p[1] - 24), (p[0] - 4, p[1] - 18), (p[0] - 9, p[1] - 8)], TERRA, OUTLINE, 1.2)
    q = iso_pt(*org, .68, .62, 34)
    cv.rrect([q[0] - 12, q[1] - 6, q[0] + 12, q[1] + 2], 3, PAL["oak_high"], OUTLINE, 1.0)
    ov = Image.new("RGBA", cv.im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    P = lambda pts: [(x * cv.S, y * cv.S) for x, y in pts]
    od.polygon(P([bl[3], bl[2], tl[2], tl[3]]), fill=(*PAL["sky"], 64))
    od.polygon(P([bl[2], bl[1], tl[1], tl[2]]), fill=(*PAL["sky"], 44))
    cv.im = Image.alpha_composite(cv.im, ov)
    cv.d = ImageDraw.Draw(cv.im)
    cv.stroke(tl, OUTLINE, 1.3)
    for i in (1, 2, 3):
        cv.line(bl[i], tl[i], OUTLINE, 1.3)
    cv.stroke([bl[3], bl[2], bl[1]], OUTLINE, 1.3, closed=False)
    return cv.finish(2), an


def pr_tech_cart():
    cv, org, an = new_obj_local(1, 1, 110)
    shadow1(cv, org)
    bx(cv, org, .1, .12, .8, .76, 0, 40, PAL["charcoal"])
    bx(cv, org, .06, .08, .88, .84, 40, 4, PAL["light_gray"])
    for yy in (.16, .5):
        bx(cv, org, .4, yy, .07, .34, 44, 34, PAL["dark_detail"], 1.0)
        rf = rface(org, .47, yy, yy + .34, 44, 34, .1, .9, .12, .88)
        cv.poly(rf, mix(PAL["sky"], PAL["deep_blue"], .45), OUTLINE, .8)
        cv.poly(rface(org, .47, yy, yy + .34, 44, 34, .16, .55, .5, .8), PAL["mint"], None, 0)
    bx(cv, org, .18, .3, .2, .26, 44, 3, PAL["med_gray"], .8)
    return cv.finish(2), an


def pr_tech_printer():
    cv, org, an = new_obj_local(1, 1, 110)
    shadow1(cv, org)
    bx(cv, org, .1, .1, .8, .8, 0, 22, PAL["dark_detail"])
    for (x, y) in [(.12, .12), (.8, .12), (.12, .8), (.8, .8)]:
        bx(cv, org, x, y, .08, .08, 22, 60, PAL["med_gray"], .9)
    bx(cv, org, .1, .1, .8, .8, 82, 5, PAL["charcoal"])
    p = iso_pt(*org, .5, .5, 22)
    bx(cv, org, .32, .32, .36, .36, 22, 3, PAL["light_gray"], .8)
    cv.poly([(p[0] - 9, p[1] - 3), (p[0] + 9, p[1] - 3), (p[0] + 6, p[1] - 22), (p[0] - 6, p[1] - 22)], PAL["coral"], OUTLINE, 1.0)
    cv.capsule((p[0] + 2, p[1] - 44), (p[0] + 2, p[1] - 26), 4, PAL["sky"], OUTLINE, 1.0)
    return cv.finish(2), an


def pr_art_easel():
    cv, org, an = new_obj_local(1, 1, 130)
    shadow1(cv, org)
    b1, b2, b3 = iso_pt(*org, .3, .3, 0), iso_pt(*org, .3, .7, 0), iso_pt(*org, .75, .5, 0)
    top = iso_pt(*org, .45, .5, 116)
    for b in (b1, b2, b3):
        cv.capsule(top, b, 4, PAL["oak_mid"], OUTLINE, 1.2)
    rf = [iso_pt(*org, .5, .12 + .76 * u, 44 + 66 * v) for u, v in ((0, 1), (1, 1), (1, 0), (0, 0))]
    cv.poly(rf, PAL["warm_white"], OUTLINE, 1.6)
    inner = [iso_pt(*org, .5, .12 + .76 * u, 44 + 66 * v) for u, v in ((.08, .92), (.92, .92), (.92, .08), (.08, .08))]
    cv.poly(inner, mix(PAL["sky"], PAL["warm_white"], .55), OUTLINE, .8)
    for (u, v, c) in [(.3, .3, PAL["coral"]), (.6, .5, PAL["warm_gold"]), (.45, .7, PAL["school_blue"])]:
        p = iso_pt(*org, .5, .12 + .76 * u, 44 + 66 * v)
        ell(cv, p[0], p[1], 7, 5, c, OUTLINE, .8)
    tray = [iso_pt(*org, .5, .12, 44), iso_pt(*org, .62, .12, 40), iso_pt(*org, .62, .88, 40), iso_pt(*org, .5, .88, 44)]
    cv.poly(tray, PAL["oak_high"], OUTLINE, 1.0)
    return cv.finish(2), an


def pr_art_table():
    cv, org, an = new_obj_local(1, 1, 100)
    shadow1(cv, org)
    for (x, y) in [(.12, .12), (.78, .12), (.12, .78), (.78, .78)]:
        bx(cv, org, x, y, .1, .1, 0, 34, PAL["oak_mid"], 1.0)
    bx(cv, org, .04, .04, .92, .92, 34, 5, PAL["oak_high"])
    for (x, y, c) in [(.2, .2, PAL["coral"]), (.4, .18, PAL["warm_gold"]), (.6, .2, PAL["leaf"]), (.75, .35, PAL["school_blue"])]:
        p = iso_pt(*org, x, y, 39)
        cyl(cv, p[0], p[1] + 4, 5, 10, c, lighten(c, .4))
    p = iso_pt(*org, .4, .6, 39)
    cv.poly([(p[0] - 14, p[1]), (p[0], p[1] - 8), (p[0] + 16, p[1] - 2), (p[0] + 6, p[1] + 6), (p[0] - 6, p[1] + 5)], PAL["oak_high"], OUTLINE, 1.0)
    for dx, c in ((-8, PAL["coral"]), (0, PAL["warm_gold"]), (8, PAL["leaf"])):
        ell(cv, p[0] + dx, p[1] - 1, 2.6, 1.8, c, None, 0)
    return cv.finish(2), an


PROPS = {
    "math": [("solids", pr_math_solids), ("cart", pr_math_cart)],
    "ela": [("bookcase", pr_ela_bookcase), ("chair", pr_ela_chair)],
    "science": [("bench", pr_sci_bench), ("terrarium", pr_sci_terrarium)],
    "history": [("globe", pr_hist_globe), ("case", pr_hist_case)],
    "technology": [("cart", pr_tech_cart), ("printer", pr_tech_printer)],
    "art": [("easel", pr_art_easel), ("table", pr_art_table)],
}


def accent_stripe(side):
    H = 230
    W, Hh = 96, H + 48
    cv = Cv(W, Hh)
    g = (lambda x: H + 48 - 0.5 * x) if side == "left" else (lambda x: H + 0.5 * x)
    def strip(v0, v1, col, ol=None):
        pts = [(0, g(0) - v1), (W, g(W) - v1), (W, g(W) - v0), (0, g(0) - v0)]
        cv.fill(pts, col)
        if ol:
            cv.stroke(pts, ol, .7)
    strip(150, 160, (255, 255, 255), darken((255, 255, 255), .35))
    strip(163, 165, (255, 255, 255))
    strip(60, 63, (255, 255, 255))
    return cv.finish(1), (W if side == "left" else 0, H)


def main():
    for s in SUBJECTS:
        th = THEME[s]
        A, B = POSTERS[s]
        pa = (72, 96)
        for tag, fn in (("a", A), ("b", B)):
            reg(f"poster_{s}_{tag}_right", f"decor/{s}/poster_{s}_{tag}_right.png", wall_item(fn, 72, 96, "right", th), (0, 0), "decor")
            reg(f"fp_poster_{s}_{tag}", f"fpv/poster_{s}_{tag}.png", flat_k(fn, 72, 96, 2, th), (0, 0), "fpv")
        reg(f"poster_{s}_small_left", f"decor/{s}/poster_{s}_small_left.png",
            wall_item(lambda cv, W, H, th_, s=s: small_poster(s, cv, W, H, th_), 60, 80, "left", th), (0, 0), "decor")
        reg(f"banner_{s}_right", f"decor/{s}/banner_{s}_right.png",
            wall_item(lambda cv, W, H, th_, s=s: banner(s, cv, W, H, th_), 96, 124, "right", th), (0, 0), "decor")
        reg(f"fp_banner_{s}", f"fpv/banner_{s}.png", flat_k(lambda cv, W, H, th_, s=s: banner(s, cv, W, H, th_), 96, 124, 2, th), (0, 0), "fpv")
        for name, fn in PROPS[s]:
            im, an = fn()
            reg(f"prop_{s}_{name}", f"decor/{s}/prop_{s}_{name}.png", im, an, "prop")
    for side in ("left", "right"):
        im, an = accent_stripe(side)
        reg(f"accent_stripe_{side}", f"decor/accent_stripe_{side}.png", im, an, "accent")
    # textbook figures (3x)
    figs = {"fig_math_parabola": (p_math_a, "math", 72, 96), "fig_math_shapes": (p_math_b, "math", 72, 96),
            "fig_ela_mountain": (p_ela_a, "ela", 72, 96), "fig_science_cell": (p_sci_b, "science", 72, 96),
            "fig_history_timeline": (p_hist_b, "history", 72, 96), "fig_history_map": (p_hist_a, "history", 72, 96),
            "fig_tech_binary": (p_tech_b, "technology", 72, 96), "fig_art_wheel": (p_art_a, "art", 72, 96),
            "fig_science_table": (p_sci_a, "science", 72, 96), "fig_ela_parts": (p_ela_b, "ela", 72, 96)}
    for k, (fn, s, W, H) in figs.items():
        reg(k, f"textbook/{k}.png", flat_k(fn, W, H, 3, THEME[s]), (0, 0), "figure")
    def frac(cv, W, H, th):
        frame(cv, W, H, th)
        for r, d in enumerate((1, 2, 3, 4, 6)):
            for kk in range(d):
                x0 = 10 + kk * (52 / d)
                cv.rrect([x0, 12 + r * 14, x0 + 52 / d - 1.5, 12 + r * 14 + 11], 2, PAL["soft_yellow"] if kk < 1 or (d == 2 and kk == 0) else PAL["light_gray"], OUTLINE, .9)
            T(cv, (68, 18 + r * 14), f"1/{d}", 5, PAL["deep_blue"], anchor="rm")
        T(cv, (W / 2, 86), "= parts of a whole", 5.6, PAL["med_gray"], False, "mm")
    reg("fig_math_fractions", "textbook/fig_math_fractions.png", flat_k(frac, 72, 96, 3, THEME["math"]), (0, 0), "figure")
    json.dump(MAN, open(os.path.join(ROOT, "tools", "decor_manifest.json"), "w"), indent=1)
    print("decor:", len(MAN), "assets")


if __name__ == "__main__":
    main()
