"""Subject-specific art. Bible accents: Math blue/gold; ELA sage/coral; Science aqua/green; History gold/terracotta.
Every variant asset is emitted as <key>__<subject>. The scene maps base keys to the active subject's variant."""
import math, random
from PIL import Image
import gen_env as G
from lib import *

SUBJECTS = {
    "math": dict(rows=["powder", "soft_yellow", "powder", "soft_yellow", "powder"], trim=PAL["warm_gold"], accent=PAL["powder"]),
    "ela": dict(rows=["sage", "coral", "sage", "coral", "sage"], trim=PAL["coral"], accent=PAL["mint"]),
    "science": dict(rows=["sky", "mint", "sky", "mint", "sky"], trim=PAL["leaf"], accent=PAL["sky"]),
    "history": dict(rows=["soft_yellow", "terracotta", "soft_yellow", "terracotta", "soft_yellow"], trim=PAL["terracotta"], accent=PAL["soft_yellow"]),
}


def skew_right(cv):
    im = cv.im
    w, h = im.size
    out_h = h + w // 2
    tf = lambda i: i.transform((w, out_h), Image.AFFINE, (1, 0, 0, -0.5, 1, 0), resample=Image.BICUBIC)
    sh = tf(cv.sh).filter(ImageFilter.GaussianBlur(S * 2))
    return Image.alpha_composite(sh, tf(im)).resize((w // S, out_h // S), Image.LANCZOS)


def tc(cv, cx, y, s, sz, col):
    f = G.font(sz)
    wd = cv.d.textlength(s, font=f) / S
    G.text(cv, (cx - wd / 2, y), s, sz, col)


def frame_poster(cv, w, h, col):
    cv.rrect([1, 1, w - 1, h - 1], 3, PAL["warm_white"], OUTLINE, 1.8)
    cv.rrect([5, 5, w - 5, 20], 2, col, None, 0)


# ------------------------------------------------------------------ posters (flat, then skewed to the right wall)
def p_math_pi():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["school_blue"])
    tc(cv, W / 2, 6, "PI DAY", 9, PAL["warm_white"])
    tc(cv, W / 2, 26, "\u03c0", 40, PAL["deep_blue"])
    for i, d in enumerate(("3.14159", "26535 89793", "23846 26433")):
        tc(cv, W / 2, 68 + i * 7, d, 6, PAL["med_gray"])
    return cv


def p_math_shapes():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["warm_gold"])
    tc(cv, W / 2, 7, "SHAPES", 9, PAL["dark_detail"])
    cv.poly([(14, 60), (34, 60), (24, 36)], PAL["coral"], OUTLINE, 1.2)
    cv.rrect([42, 38, 64, 60], 2, PAL["powder"], OUTLINE, 1.2)
    cv.ellipse([16, 64, 36, 84], PAL["mint"], OUTLINE, 1.2)
    cv.poly([(50, 84), (64, 84), (66, 70), (52, 66)], PAL["lavender"], OUTLINE, 1.2)
    tc(cv, W / 2, 24, "A = \u03c0r\u00b2", 8, PAL["deep_blue"])
    return cv


def p_math_number_line():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["powder"])
    tc(cv, W / 2, 7, "INTEGERS", 8, PAL["dark_detail"])
    y = 56
    cv.line((8, y), (70, y), PAL["charcoal"], 1.6)
    for i in range(-3, 4):
        x = 39 + i * 9
        cv.line((x, y - 4), (x, y + 4), PAL["charcoal"], 1.2)
        tc(cv, x, y + 6, str(i), 6, PAL["deep_blue"] if i else PAL["coral"])
    cv.ellipse([39 + 9 * 2 - 3, y - 12, 39 + 9 * 2 + 3, y - 6], PAL["coral"], OUTLINE, 1)
    return cv


def p_ela_wordwall():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["sage"])
    tc(cv, W / 2, 7, "WORD WALL", 8, PAL["warm_white"])
    words = ["theme", "irony", "tone", "claim", "voice", "motif"]
    cols = [PAL["peach"], PAL["mint"], PAL["soft_yellow"], PAL["dusty_pink"], PAL["sky"], PAL["lavender"]]
    for i, wd in enumerate(words):
        x, y = 8 + (i % 2) * 33, 26 + (i // 2) * 21
        cv.rrect([x, y, x + 30, y + 17], 2, cols[i], OUTLINE, 1.0)
        tc(cv, x + 15, y + 4, wd, 7, PAL["dark_detail"])
    return cv


def p_ela_arc():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["coral"])
    tc(cv, W / 2, 7, "STORY ARC", 8, PAL["warm_white"])
    pts = [(10 + i * 58 / 20, 78 - 46 * math.sin(math.pi * i / 20) ** 1.3) for i in range(21)]
    for a, b in zip(pts, pts[1:]):
        cv.line(a, b, PAL["deep_blue"], 2)
    for lbl, i in (("start", 0), ("climax", 10), ("end", 20)):
        x, y = pts[i]
        cv.ellipse([x - 3, y - 3, x + 3, y + 3], PAL["soft_yellow"], OUTLINE, 1)
        tc(cv, min(max(x, 16), 62), y + 5 if i != 10 else y - 12, lbl, 6, PAL["dark_detail"])
    return cv


def p_ela_quote():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["dusty_pink"])
    tc(cv, W / 2, 7, "READING", 8, PAL["dark_detail"])
    for i, ln in enumerate(("Read it.", "Question it.", "Say it.", "Write it.")):
        tc(cv, W / 2, 28 + i * 14, ln, 9, PAL["deep_blue"] if i % 2 == 0 else PAL["coral"])
    return cv


def p_sci_periodic():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["leaf"])
    tc(cv, W / 2, 7, "ELEMENTS", 8, PAL["warm_white"])
    cols = [PAL["coral"], PAL["soft_yellow"], PAL["mint"], PAL["sky"], PAL["lavender"], PAL["peach"]]
    rnd = random.Random(4)
    for r in range(5):
        for c in range(8):
            if r < 2 and 1 <= c <= 5:
                continue
            x, y = 7 + c * 8.6, 26 + r * 11
            cv.rrect([x, y, x + 7.4, y + 9.6], 1, cols[(r + c + rnd.randint(0, 2)) % 6], OUTLINE, .6)
    return cv


def p_sci_solar():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["deep_blue"])
    tc(cv, W / 2, 7, "SOLAR SYSTEM", 7, PAL["warm_white"])
    cv.rrect([5, 22, W - 5, H - 5], 2, PAL["dark_detail"], None, 0)
    cv.ellipse([-4, 46, 18, 68], PAL["warm_gold"], OUTLINE, 1)
    for x, r, c in ((24, 2.5, PAL["med_gray"]), (32, 3.2, PAL["peach"]), (42, 3.6, PAL["sky"]), (52, 3, PAL["coral"]), (63, 6, PAL["soft_yellow"])):
        cv.ellipse([x - r, 57 - r, x + r, 57 + r], c, OUTLINE, .7)
    return cv


def p_sci_water():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["powder"])
    tc(cv, W / 2, 7, "WATER CYCLE", 7, PAL["dark_detail"])
    cv.poly([(4, 84), (30, 56), (48, 72), (74, 60), (74, 84)], PAL["sage"], OUTLINE, 1)
    cv.rrect([4, 78, 74, 88], 1, PAL["powder"], None, 0)
    cv.ellipse([30, 28, 62, 42], PAL["light_gray"], OUTLINE, 1)
    for x in (36, 44, 52):
        cv.line((x, 42), (x - 2, 52), PAL["school_blue"], 1.4)
    cv.ellipse([6, 24, 16, 34], PAL["warm_gold"], OUTLINE, 1)
    return cv


def p_hist_timeline():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["terracotta"])
    tc(cv, W / 2, 7, "TIMELINE", 8, PAL["warm_white"])
    cv.line((12, 34), (12, 84), PAL["charcoal"], 1.6)
    for i, (yr, ev) in enumerate((("1215", "Charter"), ("1607", "Colony"), ("1776", "Declaration"), ("1787", "Constitution"))):
        y = 36 + i * 12
        cv.ellipse([9, y - 3, 15, y + 3], PAL["warm_gold"], OUTLINE, 1)
        G.text(cv, (19, y - 5), yr, 6, PAL["deep_blue"]); G.text(cv, (38, y - 5), ev, 6, PAL["charcoal"])
    return cv


def p_hist_map():
    W, H = 78, 92; cv = Cv(W, H); frame_poster(cv, W, H, PAL["warm_gold"])
    tc(cv, W / 2, 7, "THE WORLD", 8, PAL["dark_detail"])
    cv.rrect([5, 22, W - 5, H - 5], 2, PAL["sky"], None, 0)
    for pts in ([(12, 36), (26, 32), (30, 46), (22, 60), (14, 50)], [(34, 34), (52, 30), (62, 42), (50, 54), (40, 66), (36, 50)], [(56, 60), (70, 58), (68, 72), (58, 72)]):
        cv.poly(pts, PAL["sage"], OUTLINE, .9)
    cv.ellipse([60, 26, 72, 38], PAL["light_gray"], OUTLINE, .8)
    return cv


def banner(text, col, txtcol):
    W, H = 232, 30; cv = Cv(W, H)
    cv.poly([(2, 2), (W - 2, 2), (W - 2, H - 8), (W / 2, H - 2), (2, H - 8)], col, OUTLINE, 1.8)
    tc(cv, W / 2, 5, text, 13, txtcol)
    return cv


POSTERS = {
    "math": [p_math_pi, p_math_shapes, p_math_number_line],
    "ela": [p_ela_wordwall, p_ela_arc, p_ela_quote],
    "science": [p_sci_periodic, p_sci_solar, p_sci_water],
    "history": [p_hist_timeline, p_hist_map, p_hist_timeline],
}
BANNERS = {"math": ("MATHEMATICS", "school_blue"), "ela": ("READ \u00b7 WRITE \u00b7 WONDER", "sage"),
           "science": ("SCIENCE", "leaf"), "history": ("HISTORY", "terracotta")}


# ------------------------------------------------------------------ shelf + demo table with subject props
def shelf(subj):
    cv, org, anchor = G.new_obj(0.5, 1.5, 96, pad=4)
    cv.shadow([iso_pt(*org, 0, 0), iso_pt(*org, .6, .1), iso_pt(*org, .7, 1.6), iso_pt(*org, 0.1, 1.6)], .18)
    box(cv, org, 0, 0, .5, 1.5, 0, 46, PAL["oak_mid"], darken(PAL["oak_mid"], .12), PAL["oak_shadow"], 1.4)
    cols = [PAL["school_blue"], PAL["coral"], PAL["soft_yellow"], PAL["leaf"], PAL["lavender"], PAL["peach"]]
    for i in range(6):  # book spines on the +x face (facing the room)
        y0 = .1 + i * .22
        box(cv, org, .32, y0, .16, .18, 8, 30 - (i % 3) * 4, cols[(i + len(subj)) % 6], darken(cols[i % 6], .15), darken(cols[i % 6], .3), .8)
    top = 46
    if subj == "math":
        box(cv, org, .1, .2, .28, .28, top, 14, PAL["coral"], darken(PAL["coral"], .12), darken(PAL["coral"], .28), 1)
        cv.poly([iso_pt(*org, .2, 1.0, top), iso_pt(*org, .35, 1.1, top), iso_pt(*org, .3, 1.25, top), iso_pt(*org, .15, 1.15, top)], PAL["powder"], OUTLINE, 1)
        cv.ellipse([iso_pt(*org, .2, 1.3, top + 8)[0] - 6, iso_pt(*org, .2, 1.3, top + 8)[1] - 6, iso_pt(*org, .2, 1.3, top + 8)[0] + 6, iso_pt(*org, .2, 1.3, top + 8)[1] + 6], PAL["mint"], OUTLINE, 1.2)
    elif subj == "ela":
        for k, c in enumerate((PAL["deep_blue"], PAL["coral"], PAL["warm_gold"])):
            box(cv, org, .1, .2 + k * .1, .3, .3, top + k * 5, 5, c, darken(c, .15), darken(c, .3), .9)
        p = iso_pt(*org, .25, 1.0, top + 4)
        cv.capsule(p, (p[0] + 4, p[1] - 22), 2.4, PAL["warm_white"], OUTLINE, 1)
    elif subj == "science":
        for k, c in enumerate((PAL["mint"], PAL["coral"], PAL["sky"])):
            p = iso_pt(*org, .22, .25 + k * .4, top)
            cv.poly([(p[0] - 5, p[1] - 3), (p[0] + 5, p[1] - 3), (p[0] + 8, p[1] + 5), (p[0] - 8, p[1] + 5)], PAL["warm_white"], OUTLINE, 1)
            cv.poly([(p[0] - 5, p[1] + 1), (p[0] + 5, p[1] + 1), (p[0] + 8, p[1] + 5), (p[0] - 8, p[1] + 5)], c, None, 0)
            cv.rrect([p[0] - 2.5, p[1] - 12, p[0] + 2.5, p[1] - 3], 1, PAL["warm_white"], OUTLINE, 1)
    else:
        p = iso_pt(*org, .22, .7, top)
        cv.rrect([p[0] - 3, p[1] - 4, p[0] + 3, p[1]], 1, PAL["oak_shadow"], OUTLINE, 1)
        cv.ellipse([p[0] - 11, p[1] - 26, p[0] + 11, p[1] - 4], PAL["powder"], OUTLINE, 1.4)
        cv.poly([(p[0] - 6, p[1] - 20), (p[0] - 1, p[1] - 22), (p[0], p[1] - 14), (p[0] - 5, p[1] - 11)], PAL["sage"], None, 0)
        cv.poly([(p[0] + 2, p[1] - 12), (p[0] + 8, p[1] - 15), (p[0] + 7, p[1] - 7)], PAL["sage"], None, 0)
    return cv.finish(2), anchor


def demo_table(subj):
    cv, org, anchor = G.new_obj(1.4, 0.9, 64, pad=4)
    cv.shadow([iso_pt(*org, .1, .1), iso_pt(*org, 1.5, .1), iso_pt(*org, 1.6, 1.0), iso_pt(*org, .2, 1.0)], 0.2)
    for (x, y) in [(.1, .1), (1.2, .1), (.1, .7), (1.2, .7)]:
        box(cv, org, x, y, .1, .1, 0, 30, PAL["oak_mid"], darken(PAL["oak_mid"], .1), PAL["oak_shadow"], 1.0)
    box(cv, org, 0, 0, 1.4, .9, 30, 6, PAL["oak_high"], PAL["oak_light"], PAL["oak_mid"], 1.3, planks=5)
    T = 36
    if subj == "math":
        for k, c in enumerate((PAL["coral"], PAL["soft_yellow"], PAL["mint"])):
            box(cv, org, .18 + k * .05, .2, .34, .34, T + k * 4, 4, c, darken(c, .1), darken(c, .25), .8)
        box(cv, org, .85, .25, .18, .18, T, 12, PAL["school_blue"], darken(PAL["school_blue"], .12), darken(PAL["school_blue"], .28), .8)
        p = iso_pt(*org, 1.15, .5, T + 6)
        cv.poly([(p[0] - 7, p[1] + 3), (p[0] + 7, p[1] + 3), (p[0], p[1] - 12)], PAL["leaf"], OUTLINE, 1)
    elif subj == "ela":
        for k, c in enumerate((PAL["deep_blue"], PAL["coral"], PAL["sage"], PAL["warm_gold"])):
            box(cv, org, .2, .15 + k * .0, .4, .3, T + k * 5, 5, c, darken(c, .15), darken(c, .3), .8)
        box(cv, org, .85, .25, .35, .25, T, 2, PAL["warm_white"], PAL["light_gray"], PAL["light_gray"], .8)
        p = iso_pt(*org, 1.1, .4, T + 2)
        cv.capsule(p, (p[0] + 10, p[1] - 14), 2.2, PAL["warm_gold"], OUTLINE, 1)
    elif subj == "science":
        for k, c in enumerate((PAL["mint"], PAL["coral"], PAL["sky"])):
            p = iso_pt(*org, .3 + k * .3, .4, T)
            cv.poly([(p[0] - 4, p[1] - 3), (p[0] + 4, p[1] - 3), (p[0] + 9, p[1] + 5), (p[0] - 9, p[1] + 5)], PAL["warm_white"], OUTLINE, 1)
            cv.poly([(p[0] - 5, p[1] + 1), (p[0] + 5, p[1] + 1), (p[0] + 9, p[1] + 5), (p[0] - 9, p[1] + 5)], c, None, 0)
            cv.rrect([p[0] - 2, p[1] - 13, p[0] + 2, p[1] - 3], 1, PAL["warm_white"], OUTLINE, 1)
        p = iso_pt(*org, 1.15, .45, T)  # microscope
        cv.capsule((p[0], p[1] - 2), (p[0], p[1] - 22), 4, PAL["charcoal"], OUTLINE, 1)
        cv.capsule((p[0] - 5, p[1] - 6), (p[0] + 5, p[1] - 6), 3, PAL["med_gray"], OUTLINE, 1)
    else:
        p = iso_pt(*org, .5, .45, T)
        cv.rrect([p[0] - 3, p[1] - 4, p[0] + 3, p[1]], 1, PAL["oak_shadow"], OUTLINE, 1)
        cv.ellipse([p[0] - 13, p[1] - 30, p[0] + 13, p[1] - 4], PAL["powder"], OUTLINE, 1.4)
        cv.poly([(p[0] - 7, p[1] - 24), (p[0], p[1] - 26), (p[0] + 1, p[1] - 16), (p[0] - 6, p[1] - 12)], PAL["sage"], None, 0)
        box(cv, org, .95, .25, .3, .35, T, 2, PAL["warm_white"], PAL["light_gray"], PAL["light_gray"], .8)  # scroll
    return cv.finish(2), anchor


# ------------------------------------------------------------------ driver
def run():
    for subj, cfg in SUBJECTS.items():
        G.ROW_COLORS, G.TRIM, G.ACCENT = cfg["rows"], cfg["trim"], cfg["accent"]
        for r in range(G.N_TIERS):
            im, an = G.riser(r); G.reg(f"riser_seat_row{r + 1}__{subj}", f"auditorium/seating/{subj}/riser_seat_row{r + 1}.png", im, an, "riser")
            im, an = G.riser(r, walk=True); G.reg(f"riser_walk_row{r + 1}__{subj}", f"auditorium/seating/{subj}/riser_walk_row{r + 1}.png", im, an, "riser")
            for part in ("base", "back"):
                im, an = G.seat(r, part); G.reg(f"seat_{part}_row{r + 1}__{subj}", f"auditorium/seating/{subj}/seat_{part}_row{r + 1}.png", im, an, "seat")
        im, an = G.stage_block(); G.reg(f"stage_block__{subj}", f"auditorium/stage/{subj}/stage_block.png", im, an, "stage")
        for side in ("left", "right"):
            im, an = G.wall(side); G.reg(f"wall_aud_{side}__{subj}", f"architecture/walls/{subj}/wall_aud_{side}.png", im, an, "wall")
        im, an = G.wall("right", door=True); G.reg(f"wall_aud_right_door__{subj}", f"architecture/doors/{subj}/wall_aud_right_door.png", im, an, "wall")
        im, an = G.column(); G.reg(f"column_fluted__{subj}", f"auditorium/columns/{subj}/column_fluted.png", im, an, "column")
        im, an = shelf(subj); G.reg(f"shelf__{subj}", f"auditorium/decor/{subj}/shelf.png", im, an, "decor")
        im, an = demo_table(subj); G.reg(f"demo_table__{subj}", f"auditorium/stage/{subj}/demo_table.png", im, an, "stage")
        for i, fn in enumerate(POSTERS[subj]):
            G.reg(f"poster_{subj}_{i + 1}__{subj}", f"auditorium/decor/{subj}/poster_{i + 1}.png", skew_right(fn()), (0, 0), "decor")
        txt, col = BANNERS[subj]
        G.reg(f"banner__{subj}", f"auditorium/decor/{subj}/banner.png", G.skew_left(banner(txt, PAL[col], PAL["warm_white"])), (0, 0), "decor")
