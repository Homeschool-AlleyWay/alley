"""First-person 'seat view' art: frontal stage as seen from the student's seat. 1280x720 design px, exported at 2x."""
import math
import gen_env as G
import gen_subjects as GS
from lib import *
from PIL import Image

W, H = 1280, 720


def paste(cv, other, x, y, scale=1.0):
    f = scale * cv.S / other.S
    nw, nh = int(other.im.width * f), int(other.im.height * f)
    cv.im.alpha_composite(other.im.resize((nw, nh), Image.LANCZOS), (int(x * cv.S), int(y * cv.S)))
    cv.sh.alpha_composite(other.sh.resize((nw, nh), Image.LANCZOS), (int(x * cv.S), int(y * cv.S)))


def cyl(cv, cx, y0, y1, hw_top, hw_bot, base):
    n = int(max(hw_top, hw_bot) * 2 * S)
    for i in range(n):
        t = (i / (n - 1)) * 2 - 1
        sh = (max(0.0, t + 0.35) ** 1.4) * 0.42 if t > -0.35 else (-0.35 - t) * 0.15
        col = darken(base, sh)
        xt0, xt1 = cx - hw_top + i / n * 2 * hw_top, cx - hw_top + (i + 1) / n * 2 * hw_top
        xb0, xb1 = cx - hw_bot + i / n * 2 * hw_bot, cx - hw_bot + (i + 1) / n * 2 * hw_bot
        cv.fill([(xt0, y0), (xt1, y0), (xb1, y1), (xb0, y1)], col)


def column(cv, cx, top, base_y, hw, trim, cream):
    cv.shadow_ellipse([cx - hw - 10, base_y - 6, cx + hw + 40, base_y + 16], .22)
    cyl(cv, cx, base_y - 16, base_y, hw * 1.25, hw * 1.3, mix(cream, PAL["wall_ivory"], .5))
    cyl(cv, cx, base_y - 30, base_y - 16, hw * 1.05, hw * 1.25, cream)
    cyl(cv, cx, top + 62, base_y - 30, hw * .92, hw, cream)
    for k in range(-3, 4):
        x = cx + hw * .95 * math.sin(k * .36)
        cv.line((x, top + 66), (x, base_y - 34), darken(cream, .26), 1.3, 170)
    cyl(cv, cx, top + 30, top + 62, hw * 1.45, hw * .92, cream)
    cyl(cv, cx, top + 22, top + 32, hw * 1.5, hw * 1.45, mix(cream, trim, .55))
    cyl(cv, cx, top + 6, top + 24, hw * 1.7, hw * 1.7, cream)
    cv.rrect([cx - hw * 1.85, top - 6, cx + hw * 1.85, top + 8], 4, lighten(cream, .2), OUTLINE, 2)
    for xx in (cx - hw * 1.85, cx + hw * 1.85):
        cv.line((xx, top - 6), (xx, base_y), OUTLINE, 0, 0)


def backdrop(subj, cfg):
    G.ROW_COLORS, G.TRIM, G.ACCENT = cfg["rows"], cfg["trim"], cfg["accent"]
    cv = Cv(W, H, k=2, ss=2)
    cream, trim = PAL["warm_white"], cfg["trim"]
    cv.fill([(0, 0), (W, 0), (W, 440), (0, 440)], PAL["wall_ivory"])
    for x in range(0, W, 14):  # acoustic ribs
        cv.fill([(x, 34), (x + 6, 34), (x + 6, 322), (x, 322)], mix(PAL["wall_ivory"], PAL["powder"], .16))
        cv.fill([(x + 6, 34), (x + 8, 34), (x + 8, 322), (x + 6, 322)], darken(PAL["wall_ivory"], .12))
        cv.fill([(x + 1, 34), (x + 2.6, 34), (x + 2.6, 322), (x + 1, 322)], lighten(PAL["wall_ivory"], .5))
    cv.fill([(0, 0), (W, 0), (W, 22), (0, 22)], cream)                      # crown
    cv.fill([(0, 22), (W, 22), (W, 34), (0, 34)], mix(cfg["accent"], cream, .4))  # cove light
    cv.fill([(0, 26), (W, 26), (W, 30), (0, 30)], cream)
    cv.fill([(0, 322), (W, 322), (W, 334), (0, 334)], mix(PAL["oak_high"], trim, .35))
    cv.fill([(0, 334), (W, 334), (W, 440), (0, 440)], PAL["oak_mid"])
    for x in range(20, W - 40, 150):
        cv.poly([(x, 346), (x + 130, 346), (x + 130, 424), (x, 424)], darken(PAL["oak_mid"], .1), darken(PAL["oak_mid"], .4), 1.2)
        cv.poly([(x + 5, 351), (x + 125, 351), (x + 125, 419), (x + 5, 419)], PAL["oak_mid"], None, 0)
    cv.stroke([(0, 334), (W, 334)], OUTLINE, 1.6, closed=False)
    posters = GS.POSTERS[subj]
    for (px, py, k) in ((527, 92, 0), (1062, 92, 1)):
        paste(cv, posters[k](), px, py, 1.25)
    # board (left) and screen (right)
    cv.rrect([120, 140, 450, 338], 8, PAL["light_gray"], OUTLINE, 3)
    cv.rrect([134, 154, 436, 318], 4, PAL["warm_white"], darken(PAL["light_gray"], .25), 1.5)
    cv.rrect([150, 326, 420, 334], 3, PAL["med_gray"], OUTLINE, 1.2)
    for i, c in enumerate(("school_blue", "coral", "leaf")):
        cv.rrect([190 + i * 46, 322, 222 + i * 46, 328], 2, PAL[c], OUTLINE, 1)
    cv.rrect([654, 76, 1006, 290], 8, PAL["light_gray"], OUTLINE, 3)
    cv.rrect([664, 86, 996, 280], 3, PAL["hall_white"], OUTLINE, 1.6)
    txt, col = GS.BANNERS[subj]
    paste(cv, GS.banner(txt, PAL[col], PAL["warm_white"]), 654, 36, 1.5)
    # columns + pilasters
    for cx in (66, 1214):
        column(cv, cx, 30, 470, 30, trim, cream)
    for cx in (500, 1040):
        cv.rrect([cx - 14, 34, cx + 14, 436], 3, mix(cream, PAL["wall_ivory"], .4), OUTLINE, 2)
        for k in range(-2, 3):
            cv.line((cx + k * 5, 40), (cx + k * 5, 430), darken(cream, .2), 1, 150)
    # stage floor (perspective planks converge toward the back)
    back, front = 440, 584
    cv.fill([(-30, back), (W + 30, back), (W + 30, front), (-30, front)], PAL["oak_light"])
    for i in range(0, 25):
        x0 = -30 + i * (W + 60) / 24
        x1 = -30 + i * (W + 60) / 24
        cv.line((x0, back), (x1, front), darken(PAL["oak_light"], .22), 1.2, 130)
        if i % 2 == 0:
            cv.fill([(x0, back), (x0 + (W + 60) / 24, back), (x1 + (W + 60) / 24, front), (x1, front)], mix(PAL["oak_light"], PAL["oak_high"], .22))
    for k in range(1, 6):
        yy = back + (front - back) * (k / 6) ** 1.35
        cv.line((30 - 60 * (yy - back) / (front - back), yy), (W - 30 + 60 * (yy - back) / (front - back), yy), darken(PAL["oak_light"], .16), 1, 90)
    cv.fill([(-30, front), (W + 30, front), (W + 30, front + 36), (-30, front + 36)], PAL["oak_mid"])
    cv.fill([(-30, front + 36), (W + 30, front + 36), (W + 30, front + 44), (-30, front + 44)], darken(PAL["oak_mid"], .3))
    cv.fill([(-30, front), (W + 30, front), (W + 30, front + 7), (-30, front + 7)], trim)
    cv.stroke([(-30, front), (W + 30, front)], OUTLINE, 1.8, closed=False)
    cv.fill([(-30, front + 44), (W + 30, front + 44), (W + 30, H), (-30, H)], darken(PAL["oak_light"], .18))
    for x in range(-30, W + 60, 60):
        cv.line((x, front + 44), (x - 30 + (x - 640) * .25, H), darken(PAL["oak_light"], .34), 1.2, 110)
    for i, (x0, x1, y0, y1) in enumerate(((560, 720, 584, 604), (548, 732, 604, 626), (536, 744, 626, 650))):  # stairs
        cv.poly([(x0, y0), (x1, y0), (x1 + 4, y1), (x0 - 4, y1)], mix(PAL["oak_high"], PAL["oak_mid"], i * .25), OUTLINE, 1.4)
    # podium (front view)
    cv.shadow_ellipse([586, 540, 728, 572], .22)
    cv.poly([(604, 456), (700, 456), (706, 552), (598, 552)], PAL["oak_mid"], OUTLINE, 2.4)
    cv.poly([(610, 462), (694, 462), (698, 546), (606, 546)], darken(PAL["oak_mid"], .08), OUTLINE, 1)
    cv.poly([(594, 446), (710, 446), (706, 458), (598, 458)], PAL["oak_high"], OUTLINE, 2)
    cv.rrect([628, 490, 676, 512], 4, trim, OUTLINE, 1.4)
    cv.rrect([626, 420, 676, 446], 2, PAL["charcoal"], OUTLINE, 1.6)        # laptop
    cv.rrect([630, 424, 672, 442], 1, PAL["powder"], None, 0)
    # demo table (front view) with props
    cv.shadow_ellipse([884, 542, 1120, 572], .2)
    cv.poly([(880, 502), (1110, 502), (1122, 520), (868, 520)], PAL["oak_high"], OUTLINE, 2)
    for x in (884, 1092):
        cv.poly([(x, 520), (x + 14, 520), (x + 14, 566), (x, 566)], PAL["oak_mid"], OUTLINE, 1.6)
    for k, c in enumerate(("coral", "soft_yellow", "mint")):
        cv.rrect([910 + k * 6, 486 - k * 8, 962 + k * 6, 502 - k * 8], 3, PAL[c], OUTLINE, 1.2)
    cv.rrect([1010, 462, 1044, 502], 3, PAL["school_blue"], OUTLINE, 1.4)
    cv.ellipse([1056, 470, 1090, 502], PAL["leaf"], OUTLINE, 1.4)
    im = cv.finish(2)
    # warm stage light cones (soft, additive-ish)
    cones = Image.new("RGBA", im.size, (0, 0, 0, 0))
    from PIL import ImageDraw
    d = ImageDraw.Draw(cones)
    for cx in (300, 640, 980):
        d.polygon([((cx - 10) * 2, 30 * 2), ((cx + 10) * 2, 30 * 2), ((cx + 170) * 2, 560 * 2), ((cx - 170) * 2, 560 * 2)], fill=(*PAL["soft_yellow"], 20))
    cones = cones.filter(ImageFilter.GaussianBlur(14))
    return Image.alpha_composite(im, cones)


def foreground(subj, cfg):
    """Seat backs of the row in front (bottom edge) + vignette. Center gap = aisle."""
    G.ROW_COLORS = cfg["rows"]
    cv = Cv(W, H, k=2, ss=2)
    col = darken(mix(PAL[cfg["rows"][1]], PAL["deep_blue"], .25), .18)
    for x0 in (-40, 230, 500, 690, 960, 1230):
        x1 = x0 + 240 if x0 in (-40, 230, 690, 960) else x0 + 90
        if x0 in (500, 1230):
            continue
        cv.rrect([x0, 668, x1, 760], 26, col, OUTLINE, 3)
        cv.rrect([x0 + 12, 676, x1 - 12, 690], 8, lighten(col, .35), None, 0)
        cv.rrect([x0 + 8, 700, x1 - 8, 716], 6, darken(col, .18), None, 0)
    im = cv.finish(2)
    v = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw = None
    from PIL import ImageDraw
    d = ImageDraw.Draw(v)
    for i in range(30):
        t = i / 30
        d.rectangle([i * 6, i * 4, im.width - i * 6, im.height - i * 4], outline=(*PAL["dark_detail"], int(3 + 9 * (1 - t))), width=8)
    v = v.filter(ImageFilter.GaussianBlur(40))
    return Image.alpha_composite(v, im)


def run(reg):
    for subj, cfg in GS.SUBJECTS.items():
        reg(f"sv_backdrop__{subj}", f"seatview/backdrop_{subj}.png", backdrop(subj, cfg), (0, 0), "seatview")
        reg(f"sv_foreground__{subj}", f"seatview/foreground_{subj}.png", foreground(subj, cfg), (0, 0), "seatview")
    for k in ("idle", "math_coordinate", "math_fraction", "ela_annotation", "sci_cell", "hist_map"):
        im, _ = G.screen_content(k, k=2)
        reg(f"sv_content_{k}", f"seatview/content_{k}.png", im, (0, 0), "seatview")
