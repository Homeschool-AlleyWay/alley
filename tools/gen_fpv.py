#!/usr/bin/env python3
"""First-person 'seat view' art. Design space 2000x720. Same palette/outlines/light as the iso view.
Teacher is re-rendered at 3x from the same character generator so zooming in never turns to mush."""
import json, math, os, random
from PIL import Image, ImageDraw, ImageFilter
from lib import *
import gen_env as E
import gen_chars as C
from gen_decor import THEME, SUBJECTS

MAN = []
W, H = 2000, 720
WALL_L, WALL_R = 250, 1750
FLOOR_Y, STAGE_FRONT_Y, STAGE_FACE_BOTTOM = 470, 556, 600


def reg(key, rel, im, cat, **kw):
    save(im, rel)
    MAN.append(dict(key=key, file=rel, w=im.width, h=im.height, category=cat, **kw))


def room():
    cv = Cv(W, H, 1, ss=2)
    ivory = PAL["wall_ivory"]
    cv.fill([(0, 0), (W, 0), (W, H), (0, H)], PAL["hall_white"])
    # ---- side walls (perspective, converge toward the stage wall)
    def side(x_out, x_in, mirror):
        lerp = lambda t, a, b: a + (b - a) * t
        top_o, top_i, bot_o, bot_i = -70, -20, 585, FLOOR_Y
        pts = [(x_out, top_o), (x_in, top_i), (x_in, bot_i), (x_out, bot_o)]
        cv.fill(pts, darken(ivory, .10))
        n = 10
        for i in range(n + 1):  # ribs
            t = i / n
            x = lerp(t, x_out, x_in)
            yt = lerp(t, top_o, top_i) + 90 * (1 - t * .0)
            yb = lerp(t, bot_o, bot_i) - 96
            cv.line((x, yt + 70), (x, yb), darken(ivory, .24), 1.6)
            cv.line((x + (2 if not mirror else -2), yt + 70), (x + (2 if not mirror else -2), yb), lighten(ivory, .4), 1.0)
        # wainscot band + rail + crown + cove
        def band(v0, v1, col, ol=None):
            q = []
            for t in (0, 1):
                x = lerp(t, x_out, x_in)
                yb = lerp(t, bot_o, bot_i)
                yt = lerp(t, top_o, top_i)
                q.append((x, yb - v0 * (1 + .18 * (1 - t))))
            for t in (1, 0):
                x = lerp(t, x_out, x_in)
                yb = lerp(t, bot_o, bot_i)
                q.append((x, yb - v1 * (1 + .18 * (1 - t))))
            cv.fill(q, col)
            if ol:
                cv.stroke(q, ol, 1.2)
        band(0, 86, darken(PAL["oak_mid"], .12), OUTLINE)
        band(86, 98, PAL["oak_high"], OUTLINE)
        band(486, 500, mix(PAL["soft_yellow"], PAL["warm_white"], .4))
        band(500, 640, PAL["warm_white"], OUTLINE)
        cv.stroke(pts, OUTLINE, 2.2)
    side(0, WALL_L, False)
    side(W, WALL_R, True)
    # door on right side wall
    dx0, dx1 = 1815, 1905
    cv.poly([(dx0, 130), (dx1, 92), (dx1, 512), (dx0, 462)], PAL["oak_shadow"], OUTLINE, 2)
    cv.poly([(dx0 + 8, 142), (dx1 - 8, 106), (dx1 - 8, 500), (dx0 + 8, 452)], PAL["school_blue"], OUTLINE, 1.6)
    cv.poly([(dx0 + 22, 170), (dx1 - 22, 148), (dx1 - 22, 236), (dx0 + 22, 254)], PAL["sky"], OUTLINE, 1.4)
    # ---- back (stage) wall
    cv.fill([(WALL_L, -30), (WALL_R, -30), (WALL_R, FLOOR_Y), (WALL_L, FLOOR_Y)], ivory)
    for x in range(WALL_L, WALL_R, 24):  # acoustic ribs
        cv.fill([(x, 60), (x + 10, 60), (x + 10, 385), (x, 385)], mix(ivory, PAL["powder"], .16))
        cv.fill([(x + 10, 60), (x + 13, 60), (x + 13, 385), (x + 10, 385)], darken(ivory, .12))
        cv.fill([(x + 2, 60), (x + 4.5, 60), (x + 4.5, 385), (x + 2, 385)], lighten(ivory, .5))
    cv.fill([(WALL_L, 385), (WALL_R, 385), (WALL_R, 398), (WALL_L, 398)], PAL["oak_high"])          # chair rail
    cv.fill([(WALL_L, 398), (WALL_R, 398), (WALL_R, FLOOR_Y), (WALL_L, FLOOR_Y)], PAL["oak_mid"])   # wainscot
    for x in range(WALL_L + 14, WALL_R - 100, 190):
        cv.poly([(x, 410), (x + 160, 410), (x + 160, 452), (x, 452)], PAL["oak_mid"], darken(PAL["oak_mid"], .35), 1.2)
    cv.fill([(WALL_L, 452 + 8), (WALL_R, 460), (WALL_R, FLOOR_Y), (WALL_L, FLOOR_Y)], PAL["oak_shadow"])
    cv.fill([(WALL_L, 44), (WALL_R, 44), (WALL_R, 56), (WALL_L, 56)], mix(PAL["soft_yellow"], PAL["warm_white"], .4))  # cove
    cv.fill([(WALL_L, -30), (WALL_R, -30), (WALL_R, 44), (WALL_L, 44)], PAL["warm_white"])
    cv.stroke([(WALL_L, 44), (WALL_R, 44)], OUTLINE, 2)
    cv.stroke([(WALL_L, FLOOR_Y), (WALL_R, FLOOR_Y)], OUTLINE, 2.4)
    cv.stroke([(WALL_L, -30), (WALL_L, FLOOR_Y)], OUTLINE, 2.4)
    cv.stroke([(WALL_R, -30), (WALL_R, FLOOR_Y)], OUTLINE, 2.4)
    # ---- stage floor (perspective planks) + front face + audience floor
    cv.fill([(WALL_L, FLOOR_Y), (WALL_R, FLOOR_Y), (W + 10, STAGE_FRONT_Y), (-10, STAGE_FRONT_Y)], PAL["oak_light"])
    vpx, vpy = 1000, 300
    for i in range(-16, 17):
        xt = vpx + i * 100
        xb = vpx + (xt - vpx) * (STAGE_FRONT_Y - vpy) / (FLOOR_Y - vpy)
        if WALL_L - 60 < xt < WALL_R + 60:
            cv.line((xt, FLOOR_Y), (xb, STAGE_FRONT_Y), darken(PAL["oak_light"], .22), 1.4, )
            cv.line((xt + 2, FLOOR_Y), (xb + 3, STAGE_FRONT_Y), lighten(PAL["oak_light"], .4), 1.0)
    cv.fill([(-10, STAGE_FRONT_Y), (W + 10, STAGE_FRONT_Y), (W + 10, STAGE_FACE_BOTTOM), (-10, STAGE_FACE_BOTTOM)], PAL["oak_mid"])
    cv.fill([(-10, STAGE_FRONT_Y + 8), (W + 10, STAGE_FRONT_Y + 8), (W + 10, STAGE_FRONT_Y + 13), (-10, STAGE_FRONT_Y + 13)], PAL["warm_gold"])
    cv.stroke([(-10, STAGE_FRONT_Y), (W + 10, STAGE_FRONT_Y)], OUTLINE, 2.4)
    cv.stroke([(-10, STAGE_FACE_BOTTOM), (W + 10, STAGE_FACE_BOTTOM)], OUTLINE, 2.4)
    cv.fill([(-10, STAGE_FACE_BOTTOM), (W + 10, STAGE_FACE_BOTTOM), (W + 10, H + 10), (-10, H + 10)], darken(PAL["oak_light"], .06))
    for i in range(-20, 21):
        cv.line((vpx + i * 80, STAGE_FACE_BOTTOM), (vpx + i * 240, H), darken(PAL["oak_light"], .25), 1.2)
    im = cv.finish(2)
    # baked soft light pools on the stage + vignette
    pool = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(pool)
    for cx in (620, 1000, 1380):
        for i in range(20):
            t = i / 20
            rx, ry = 300 * (1 - t), 46 * (1 - t)
            d.ellipse([cx - rx, 512 - ry, cx + rx, 512 + ry], fill=(*PAL["soft_yellow"], int(22 * t ** 1.3)))
    pool = pool.filter(ImageFilter.GaussianBlur(14))
    return Image.alpha_composite(im, pool)


def podium_front():
    cv = Cv(120, 120, 2)
    cv.shadow_ellipse([6, 108, 118, 118], .22)
    cv.rrect([14, 34, 104, 106], 4, PAL["oak_mid"], OUTLINE, 2)
    cv.rrect([22, 46, 96, 98], 3, darken(PAL["oak_mid"], .1), darken(PAL["oak_mid"], .4), 1.2)
    cv.rrect([44, 58, 74, 68], 3, PAL["warm_gold"], OUTLINE, 1.2)
    cv.poly([(8, 34), (112, 34), (104, 14), (16, 14)], PAL["oak_high"], OUTLINE, 2)
    cv.rrect([44, 2, 74, 14], 1.5, PAL["charcoal"], OUTLINE, 1.4)
    cv.rrect([80, 6, 92, 16], 2, PAL["coral"], OUTLINE, 1.2)
    return cv.finish(2)


def seatback(color):
    cv = Cv(260, 120, 2)
    fab = darken(PAL[color], .22)
    cv.rrect([2, 8, 258, 132], 26, fab, OUTLINE, 2)
    cv.rrect([12, 14, 248, 40], 12, lighten(fab, .28), None, 0)
    cv.line((130, 44), (130, 120), darken(fab, .3), 1.4, 180)
    cv.rrect([2, 96, 258, 120], 0, darken(fab, .12), None, 0)
    return cv.finish(2)


def foreground_desk():
    cv = Cv(1600, 230, 1, ss=2)
    fab = darken(PAL["mint"], .22)
    for x0, x1 in ((-30, 250), (1350, 1630)):
        cv.rrect([x0, 120, x1, 260], 40, fab, OUTLINE, 3)
        cv.rrect([x0 + 14, 130, x1 - 14, 172], 18, lighten(fab, .25), None, 0)
    cv.poly([(190, 232), (1410, 232), (1330, 96), (270, 96)], PAL["oak_high"], OUTLINE, 3)
    for i in range(1, 8):
        t = i / 8
        cv.line((270 - 80 * t, 96 + 136 * t), (1330 + 80 * t, 96 + 136 * t), darken(PAL["oak_high"], .16), 1.4)
    cv.poly([(680, 210), (930, 210), (910, 118), (700, 118)], PAL["warm_white"], OUTLINE, 2)  # notebook
    for i in range(6):
        cv.line((712 + i * 0, 134 + i * 14), (898, 134 + i * 14), lighten(PAL["school_blue"], .3), 1.4)
    cv.line((760, 128), (760, 208), PAL["coral"], 1.6, 180)
    cv.capsule((960, 205), (1080, 150), 9, PAL["warm_gold"], OUTLINE, 2)  # pencil
    cv.poly([(1080, 150), (1100, 141), (1088, 158)], PAL["peach"], OUTLINE, 1.2)
    im = cv.finish(2)
    return im


def teacher_sheets(spec, actions=("idle", "talk", "point", "boardwrite", "walk"), dirs=("down", "left", "right", "up")):
    out = []
    for act in actions:
        n = C.ACTIONS[act][0]
        sheet = Image.new("RGBA", (288 * n, 384 * len(dirs)), (0, 0, 0, 0))
        for r, d in enumerate(dirs):
            for i in range(n):
                cv = Cv(96, 128, 3, ss=3)
                C.draw_frame(cv, spec, d, act, i, n)
                sheet.paste(cv.finish(3), (i * 288, r * 384))
        key = f"fp_{spec['id']}_{act}"
        reg(key, f"fpv/{key}.png", sheet, "fp_char", frames=n, fps=C.ACTIONS[act][1], loop=C.ACTIONS[act][2], dirs=list(dirs), character=spec["id"], action=act)


def heads(spec):
    sheet = Image.new("RGBA", (288 * 3, 240), (0, 0, 0, 0))
    for i, (act, fi, n) in enumerate((("sit", 0, 4), ("raisehand", 4, 5), ("write", 1, 6))):
        cv = Cv(96, 128, 3, ss=3)
        C.draw_frame(cv, spec, "up", act, fi, n)
        fr = cv.finish(3)
        sheet.paste(fr.crop((0, 40, 288, 280)), (i * 288, 0))
    key = f"fp_head_{spec['id']}"
    reg(key, f"fpv/{key}.png", sheet, "fp_head", frames=3, character=spec["id"])


def main():
    reg("fp_room", "fpv/fp_room.png", room(), "fp_room")
    reg("fp_podium", "fpv/fp_podium.png", podium_front(), "fp_prop")
    for i, c in enumerate(("powder", "soft_yellow", "mint")):
        reg(f"fp_seatback_{i}", f"fpv/fp_seatback_{i}.png", seatback(c), "fp_prop")
    reg("fp_desk", "fpv/fp_desk.png", foreground_desk(), "fp_prop")
    im, _ = E.column(scale=2); reg("fp_column", "fpv/fp_column.png", im, "fp_prop")
    im, _ = E.screen_bezel(k=2); reg("fp_screen_bezel", "fpv/fp_screen_bezel.png", im, "fp_prop")
    im, _ = E.whiteboard(k=2); reg("fp_board", "fpv/fp_board.png", im, "fp_prop")
    for kd in E.SCREEN_KINDS:
        im, _ = E.screen_content(kd, k=2); reg(f"fp_screen_content_{kd}", f"fpv/fp_screen_content_{kd}.png", im, "fp_screen")
    for spec in C.ROSTER:
        if spec["id"] in ("teacher_f", "teacher_m"):
            teacher_sheets(spec)
        if spec["id"].startswith("student_hs"):
            heads(spec)
    lay = dict(design=dict(w=W, h=H), wall=[WALL_L, WALL_R], floorY=FLOOR_Y, stageFrontY=STAGE_FRONT_Y,
               screen=dict(x=1000, y=235, scale=1.0), board=dict(x=515, y=285, scale=0.85),
               columns=[330, 700, 1300, 1670], columnScale=0.66, columnBaseY=480,
               banner=dict(x=1400, y=68, scale=0.9), posterA=dict(x=1565, y=138, scale=0.95),
               podium=dict(x=1085, feetY=548), teacherHome=dict(x=747, feetY=528),
               teacherMap=dict(centerGy=7.0, pxPerGy=110, wallFeetY=470, frontFeetY=556, stageDepth=3.0, scale=1.28),
               rows=[dict(y=622, headScale=0.36, backScale=0.32, seatback=0, spacing=78), dict(y=670, headScale=0.5, backScale=0.44, seatback=1, spacing=108), dict(y=724, headScale=0.66, backScale=0.58, seatback=2, spacing=142)], deskHeightFrac=0.17,
               theme=THEME and {s: [list(c) for c in v] for s, v in THEME.items()})
    json.dump(lay, open(os.path.join(ROOT, "src/game/data/fpv.layout.json"), "w"), indent=0)
    json.dump(MAN, open(os.path.join(ROOT, "tools", "fpv_manifest.json"), "w"), indent=1)
    print("fpv:", len(MAN), "assets")


if __name__ == "__main__":
    main()
