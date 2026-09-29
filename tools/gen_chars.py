#!/usr/bin/env python3
"""Procedural human sprite sheets. Frame 96x128, feet baseline y=108, 8 directions per Bible sec.7.
Rows = down, down_left, left, up_left, up, up_right, right, down_right. Columns = animation frames."""
import json, math, os, sys
from multiprocessing import Pool
from PIL import Image
from lib import *

FW, FH, BASE = 96, 128, 108
DIRS = ["down", "down_left", "left", "up_left", "up", "up_right", "right", "down_right"]
R2 = 0.7071
VEC = dict(down=(0, 1), down_left=(-R2, R2), left=(-1, 0), up_left=(-R2, -R2), up=(0, -1),
           up_right=(R2, -R2), right=(1, 0), down_right=(R2, R2))
AGE = dict(k2=(57, 4.0), g35=(63, 4.5), g68=(69, 5.0), hs=(76, 5.75), adult=(86, 6.25))
# action -> (frames, fps, loop)
ACTIONS = dict(idle=(4, 3, True), walk=(8, 9, True), sit=(4, 3, True), raisehand=(5, 6, False),
               write=(6, 6, True), read=(6, 4, True), type=(6, 8, True), talk=(6, 6, True),
               think=(4, 3, True), point=(6, 6, True), boardwrite=(8, 8, True))
SEATED = {"sit", "raisehand", "write", "read", "type", "think_seated"}

P = PAL
TEACHERS = [  # aligned with the app's teacher definitions (subject, look, personality)
    dict(id="teacher_keisha", age="adult", skin=3, hair=0, style="curly", top="peach", bottom="deep_blue", shoes="charcoal"),
    dict(id="teacher_james", age="adult", skin=2, hair=1, style="short", top="powder", bottom="oak_light", shoes="oak_shadow", glasses=True),
    dict(id="teacher_jamal", age="adult", skin=4, hair=8, style="long", top="sky", bottom="oak_light", shoes="warm_white"),
    dict(id="teacher_marcus", age="adult", skin=5, hair=0, style="short", top="terracotta", bottom="charcoal", shoes="dark_detail"),
]
_TOPS = ["coral", "soft_yellow", "lavender", "mint", "warm_gold", "powder", "peach", "sage", "dusty_pink", "sky", "leaf", "school_blue", "deep_lavender", "terracotta"]
_STYLES = ["short", "long", "ponytail", "bun", "curly", "afro", "short", "long", "curly", "ponytail", "short", "afro", "bun", "long"]
_SKIN = [0, 5, 1, 6, 2, 7, 3, 4, 1, 5, 0, 3, 6, 2]
_HAIR = [5, 0, 8, 1, 2, 0, 6, 9, 3, 4, 7, 1, 0, 8]
STUDENTS = [dict(id=f"student_hs_{i + 1:02d}", age="hs", skin=_SKIN[i], hair=_HAIR[i], style=_STYLES[i], top=_TOPS[i],
                 bottom=["deep_blue", "charcoal", "dark_detail", "oak_mid"][i % 4], shoes=["warm_white", "med_gray"][i % 2],
                 glasses=(i % 5 == 3)) for i in range(10)]
PLAYER = dict(id="player_student", age="hs", skin=3, hair=1, style="short", top="school_blue", bottom="charcoal", shoes="warm_white")
ROSTER = [PLAYER] + TEACHERS + STUDENTS
STUDENT_ACTIONS = ["walk", "sit", "write", "raisehand"]
TEACHER_ACTIONS = ["idle", "walk", "talk", "point", "boardwrite"]
# first-person (seat view) hi-res sheets: (action, dirs)
SV_TEACHER = [("idle", ["down"]), ("talk", ["down"]), ("point", ["left", "right"]), ("boardwrite", ["up"])]
SV_STUDENT = [("sit", ["up"]), ("raisehand", ["up"])]


def hand_targets(action, i, n):
    """Return {'R':(fw,up,out), 'L':(fw,up,out)} arm targets (fractions of arm length)."""
    t = 2 * math.pi * i / n
    hang = lambda: (0.0, -0.92, 0.10)
    lap = (0.50, -0.38, 0.14)
    if action == "idle":
        s = 0.03 * math.sin(t)
        return dict(R=(s, -0.92, 0.10), L=(-s, -0.92, 0.10))
    if action == "walk":
        s = math.sin(t)
        return dict(R=(-0.55 * s, -0.9, 0.08), L=(0.55 * s, -0.9, 0.08))
    if action == "sit":
        return dict(R=lap, L=lap)
    if action == "raisehand":
        p = min(1.0, i / max(1, n - 2))
        return dict(R=(0.1, -0.6 + 1.55 * p, 0.28), L=lap)
    if action == "write":
        return dict(R=(0.62 + 0.10 * math.sin(2 * t), -0.30, 0.10), L=(0.55, -0.34, 0.3))
    if action == "read":
        return dict(R=(0.55, -0.05 + 0.02 * math.sin(t), 0.22), L=(0.55, -0.05, -0.22))
    if action == "type":
        return dict(R=(0.60, -0.28 + 0.06 * math.sin(2 * t), 0.15), L=(0.60, -0.28 + 0.06 * math.sin(2 * t + 3), -0.15))
    if action == "talk":
        return dict(R=(0.45 + 0.2 * math.sin(t), -0.25 + 0.12 * math.sin(t + 1), 0.30), L=hang())
    if action == "think":
        return dict(R=(0.30, 0.42, 0.08), L=(0.45, -0.45, 0.12))
    if action == "point":
        p = min(1.0, i / 2.0)
        return dict(R=(0.30 + 0.62 * p, -0.35 + 0.35 * p + 0.05 * math.sin(t), 0.12), L=hang())
    if action == "boardwrite":
        return dict(R=(0.72 + 0.12 * math.cos(t), 0.48 + 0.14 * math.sin(t), 0.08), L=hang())
    return dict(R=hang(), L=hang())


def draw_frame(cv, spec, dname, action, i, n):
    Hh, heads = AGE[spec["age"]]
    head_h = Hh / heads
    leg = Hh * 0.41
    torso = Hh * 0.31
    arm = torso * 0.92
    f = VEC[dname]
    r = (-f[1], f[0])
    cx = FW / 2
    skin = SKIN[spec["skin"]]
    hair = HAIR[spec["hair"]]
    top = P[spec["top"]]
    bottom = P[spec["bottom"]]
    shoes = P[spec["shoes"]]
    seated = action in SEATED
    t = 2 * math.pi * i / n
    bounce = 0
    if action == "walk":
        bounce = -abs(math.sin(t)) * 1.6
    elif action in ("idle", "talk", "point", "boardwrite"):
        bounce = math.sin(t) * 0.5
    hip_y = (BASE - 17) if seated else (BASE - leg)
    hip_y += bounce
    sy = hip_y - torso
    bh = head_h * 0.64 * (0.58 + 0.42 * abs(f[1]))
    hh = bh * 0.52
    # contact shadow (Bible: ellipse 45-55% of char width, ~18% opacity)
    cv.shadow_ellipse([cx - head_h * 0.62 + 3, BASE - 3, cx + head_h * 0.62 + 3, BASE + head_h * 0.15], 0.20)

    def shoulder(side):
        return (cx + r[0] * bh * side, sy + 2 + r[1] * bh * 0.5 * side)

    def hipp(side):
        return (cx + r[0] * hh * side, hip_y + r[1] * hh * 0.5 * side)

    # ---- hair back (long / afro behind head)
    hc = (cx + f[0] * 1.5, sy - 2 - head_h * 0.48)
    rx, ry = head_h * 0.48, head_h * 0.52
    style = spec["style"]

    def hair_back():
        if style == "long" and f[1] > -0.3:
            cv.rrect([hc[0] - rx * 1.08, hc[1] - ry * 0.3, hc[0] + rx * 1.08, hc[1] + ry * 1.7], 5, hair, OUTLINE, 1.5)
        if style == "afro":
            cv.ellipse([hc[0] - rx * 1.45, hc[1] - ry * 1.4, hc[0] + rx * 1.45, hc[1] + ry * 0.95], hair, OUTLINE, 1.5)

    hair_back()

    # ---- legs
    legs = []
    for side in (1, -1):
        hp = hipp(side)
        if seated:
            knee = (hp[0] + f[0] * leg * 0.46, hp[1] + f[1] * leg * 0.22 + 1)
            foot = (knee[0], BASE - 1 + f[1] * 2)
            legs.append((r[1] * side, [hp, knee, foot]))
        else:
            s = math.sin(t) * (1 if side == 1 else -1) if action == "walk" else 0
            A = leg * 0.30
            foot = (hp[0] + f[0] * A * s, BASE - max(0, s) * 2.2 + f[1] * A * s * 0.45)
            legs.append((r[1] * side, [hp, foot]))
    legs.sort(key=lambda x: x[0])
    lw = head_h * 0.30 + 1.6
    for _, pts in legs:
        for a, b in zip(pts, pts[1:]):
            cv.capsule(a, b, lw, bottom, OUTLINE, 1.5)
        fx = pts[-1]
        cv.ellipse([fx[0] - lw * 0.75 + f[0] * 1.8, fx[1] - lw * 0.35, fx[0] + lw * 0.75 + f[0] * 1.8, fx[1] + lw * 0.65],
                   shoes, OUTLINE, 1.4)

    # ---- arms (far first)
    tg = hand_targets(action, i, n)
    arms = []
    for name, side in (("R", 1), ("L", -1)):
        fw, up, out = tg[name]
        S_ = shoulder(side)
        hand = (S_[0] + f[0] * fw * arm + r[0] * side * out * arm,
                S_[1] - up * arm + f[1] * fw * arm * 0.5 + r[1] * side * out * arm * 0.5)
        arms.append((r[1] * side, S_, hand))
    arms.sort(key=lambda x: x[0])

    def draw_arm(a):
        _, S_, hnd = a
        el = ((S_[0] + hnd[0]) / 2, (S_[1] + hnd[1]) / 2 + 1)
        aw = head_h * 0.25 + 1.3
        cv.capsule(S_, el, aw, top, OUTLINE, 1.5)
        cv.capsule(el, hnd, aw * 0.86, skin, OUTLINE, 1.4)

    if f[1] >= -0.2:
        draw_arm(arms[0])
    else:
        draw_arm(arms[1])

    # ---- torso (top) + skirt option
    if spec.get("skirt"):
        cv.poly([(cx - bh * 1.1, hip_y - 4), (cx + bh * 1.1, hip_y - 4), (cx + bh * 1.6, hip_y + leg * 0.42), (cx - bh * 1.6, hip_y + leg * 0.42)],
                bottom, OUTLINE, 1.5)
    cv.rrect([cx - bh, sy, cx + bh, hip_y + 2], 4.5, top, OUTLINE, 1.6)
    cv.rrect([cx - bh + 1.4, sy + 2, cx - bh + 3.6, hip_y - 3], 1, lighten(top, 0.32), None, 0)
    cv.rrect([cx + bh - 3.8, sy + 3, cx + bh - 1.4, hip_y - 2], 1, darken(top, 0.16), None, 0)
    cv.line((cx - bh + 2, hip_y - 1), (cx + bh - 2, hip_y - 1), darken(top, 0.22), 1, 140)  # hem
    if f[1] > 0.3:  # collar hint
        cv.line((cx - 3, sy + 1.5), (cx, sy + 4), darken(top, 0.3), 1, 200)
        cv.line((cx + 3, sy + 1.5), (cx, sy + 4), darken(top, 0.3), 1, 200)

    # ---- front arm
    if f[1] >= -0.2:
        draw_arm(arms[1])
    else:
        draw_arm(arms[0])
    if action == "read":
        a, b = arms[0][2], arms[1][2]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        cv.rrect([mx - 8, my - 6, mx + 8, my + 5], 1.5, P["deep_blue"], OUTLINE, 1.2)
        cv.line((mx, my - 5), (mx, my + 4), lighten(P["deep_blue"], 0.5), 0.8, 200)

    # ---- neck + head
    cv.rrect([cx - 2.2, sy - 4, cx + 2.2, sy + 2], 1.5, darken(skin, 0.08), OUTLINE, 1.2)
    cv.ellipse([hc[0] - rx, hc[1] - ry, hc[0] + rx, hc[1] + ry], skin, OUTLINE, 1.8)
    cv.ellipse([hc[0] - rx * 0.65, hc[1] - ry * 0.75, hc[0] - rx * 0.05, hc[1] - ry * 0.15], lighten(skin, 0.28), None, 0)
    # face
    if f[1] > 0.15:
        sp = rx * 0.40 * (0.6 + 0.4 * f[1])
        for sgn in (-1, 1):
            ex = hc[0] + sgn * sp + f[0] * rx * 0.30
            cv.ellipse([ex - 1.1, hc[1] + ry * 0.02, ex + 1.1, hc[1] + ry * 0.02 + 2.8], P["dark_detail"], None, 0)
        if f[1] > 0.5:
            open_m = action == "talk" and i % 2 == 0
            if open_m:
                cv.ellipse([hc[0] - 1.6, hc[1] + ry * 0.45, hc[0] + 1.6, hc[1] + ry * 0.45 + 2.4], darken(skin, 0.5), None, 0)
            else:
                cv.line((hc[0] - 1.8, hc[1] + ry * 0.5), (hc[0] + 1.8, hc[1] + ry * 0.5), darken(skin, 0.42), 1, 220)
        if spec.get("glasses"):
            for sgn in (-1, 1):
                ex = hc[0] + sgn * sp + f[0] * rx * 0.30
                bx = [(ex - 3.2 + cv.ox) * S, (hc[1] - 1.0 + cv.oy) * S, (ex + 3.2 + cv.ox) * S, (hc[1] + 4.8 + cv.oy) * S]
                cv.d.ellipse(bx, fill=(*P["sky"], 70), outline=rgba(OUTLINE), width=int(1.0 * S))
            cv.line((hc[0] - sp + 3, hc[1] + 1.5), (hc[0] + sp - 3, hc[1] + 1.5), OUTLINE, 1.0)
    elif f[1] > -0.25:
        ex = hc[0] + f[0] * rx * 0.62
        cv.ellipse([ex - 1.1, hc[1] + ry * 0.02, ex + 1.1, hc[1] + ry * 0.02 + 2.8], P["dark_detail"], None, 0)
        cv.ellipse([hc[0] + f[0] * rx * 0.98 - 1, hc[1] + ry * 0.18, hc[0] + f[0] * rx * 0.98 + 1, hc[1] + ry * 0.4], darken(skin, 0.06), OUTLINE, 1.0)
        if spec.get("glasses"):
            cv.line((ex - 3, hc[1] + 1.5), (hc[0] - f[0] * rx * 0.6, hc[1] + 0.5), OUTLINE, 1.0)
    # ear
    if abs(f[0]) > 0.5:
        cv.ellipse([hc[0] - f[0] * rx * 0.1 - 1.6, hc[1] + ry * 0.05, hc[0] - f[0] * rx * 0.1 + 1.6, hc[1] + ry * 0.05 + 4.4], darken(skin, 0.05), OUTLINE, 1.0)

    # ---- hair front
    away = f[1] < -0.2
    side = -0.25 <= f[1] <= 0.25 and abs(f[0]) > 0.6
    back_shift = -f[0] * rx * 0.28 if side else 0
    bottom_cut = 0.42 if away else (0.18 if side else -0.28)
    if style in ("short", "long", "ponytail", "bun", "curly", "afro"):
        cv.ellipse([hc[0] - rx * 1.06 + back_shift, hc[1] - ry * 1.08, hc[0] + rx * 1.06 + back_shift, hc[1] + ry * bottom_cut], hair, OUTLINE, 1.6)
        cv.ellipse([hc[0] - rx * 0.7 + back_shift, hc[1] - ry * 0.95, hc[0] - rx * 0.05 + back_shift, hc[1] - ry * 0.45], lighten(hair, 0.28), None, 0)
        if style == "long" and away:
            cv.rrect([hc[0] - rx * 1.06, hc[1] - ry * 0.3, hc[0] + rx * 1.06, hc[1] + ry * 1.6], 5, hair, OUTLINE, 1.6)
    if style == "bun":
        cv.ellipse([hc[0] - rx * 0.4 - f[0] * rx * 0.3, hc[1] - ry * 1.55, hc[0] + rx * 0.4 - f[0] * rx * 0.3, hc[1] - ry * 0.85], hair, OUTLINE, 1.5)
    if style == "ponytail":
        tx = hc[0] - f[0] * rx * 1.05 + (0 if away else r[0] * 0)
        if away:
            tx = hc[0]
        ty = hc[1] - ry * 0.1
        cv.capsule((tx, ty), (tx - f[0] * 2 - 1, ty + ry * 1.5), 4.2, hair, OUTLINE, 1.4)
    if style == "curly":
        for k in range(-3, 4):
            cv.ellipse([hc[0] + k * rx * 0.32 - 3.2, hc[1] - ry * 1.22 - abs(k) * 0.4, hc[0] + k * rx * 0.32 + 3.2, hc[1] - ry * 0.75], hair, OUTLINE, 1.2)


def render_sheet(spec, action, k=1, dirs=None):
    n, fps, loop = ACTIONS[action]
    dirs = dirs or DIRS
    sheet = Image.new("RGBA", (FW * k * n, FH * k * len(dirs)), (0, 0, 0, 0))
    for row, dname in enumerate(dirs):
        for i in range(n):
            cv = Cv(FW, FH, k=k, ss=(2 if k > 1 else None))
            draw_frame(cv, spec, dname, action, i, n)
            sheet.paste(cv.finish(3), (i * FW * k, row * FH * k))
    return sheet


def job(args):
    spec, action, k, dirs, prefix = args
    folder = "teachers" if spec["id"].startswith("teacher") else "students"
    sub = "seatview/" if prefix else ""
    rel = f"characters/{sub}{folder}/{prefix}{spec['id']}_{action}.png"
    save(render_sheet(spec, action, k, dirs), rel)
    return dict(key=f"{prefix}{spec['id']}_{action}", file=rel, frames=ACTIONS[action][0], fps=ACTIONS[action][1],
                loop=ACTIONS[action][2], frameWidth=FW * k, frameHeight=FH * k, character=spec["id"], action=action,
                dirs=dirs or DIRS, seatview=bool(prefix))


def main():
    only = sys.argv[1:] or None
    jobs = []
    for spec in ROSTER:
        if only and spec["id"] not in only:
            continue
        teacher = spec["id"].startswith("teacher")
        for a in (TEACHER_ACTIONS if teacher else (["idle", "walk", "sit"] if spec["id"] == "player_student" else STUDENT_ACTIONS)):
            jobs.append((spec, a, 1, None, ""))
        if teacher:
            jobs += [(spec, a, 3, d, "sv_") for a, d in SV_TEACHER]
        elif spec["id"].startswith("student"):
            jobs += [(spec, a, 2, d, "sv_") for a, d in SV_STUDENT]
    with Pool() as p:
        out = p.map(job, jobs)
    mp = os.path.join(ROOT, "tools", "char_manifest.json")
    old = json.load(open(mp))["sheets"] if os.path.exists(mp) else []
    merged = {e["key"]: e for e in old}
    merged.update({e["key"]: e for e in out})
    with open(mp, "w") as f:
        json.dump(dict(sheets=list(merged.values()), roster=ROSTER, directions=DIRS), f, indent=1)
    print(f"chars: {len(out)} sheets")


if __name__ == "__main__":
    main()
