"""UNIFY asset pipeline - shared drawing lib. Locked palette + iso helpers.
All art is drawn at 4x and downsampled (LANCZOS) for clean anti-aliased edges.
Light: upper-left. Shadows: lower-right. Outline: #455057 (never pure black)."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

S = 4
TILE_W, TILE_H = 96, 48
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSET_DIR = os.path.join(ROOT, "public", "assets", "unify")


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


PAL = {k: rgb(v) for k, v in dict(
    warm_white="#FFF9F0", wall_ivory="#F7EEDF", hall_white="#F5F7F4",
    oak_light="#DDAA68", oak_high="#F1C887", oak_mid="#C98B4D", oak_shadow="#9A653D",
    sky="#A9DDF2", powder="#8FC9E8", school_blue="#4F91C7", deep_blue="#326C9E",
    mint="#A9DCC0", sage="#88B89A", leaf="#5E9C72", dark_leaf="#3F7655",
    soft_yellow="#F8D977", warm_gold="#EAB94E", coral="#F28F7E", peach="#F6B294",
    dusty_pink="#EAA5B2", lavender="#B8A8DA", deep_lavender="#8173AE",
    light_gray="#DDE2E3", med_gray="#9DA7AA", charcoal="#455057", dark_detail="#313A3F",
    shadow="#596267", terracotta="#C98569", brick_shadow="#A96855").items()}
OUTLINE = PAL["charcoal"]
SKIN = [rgb(h) for h in "#F6D6BD #EBC09E #DFAE87 #C98D67 #B97855 #986047 #744735 #563428".split()]
HAIR = [rgb(h) for h in "#28292B #363638 #49362F #694A38 #89634A #A77C58 #D8B66C #E8CE88 #96503C #B75B42".split()]


def mix(a, b, t):
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))


def lighten(c, t):
    return mix(c, PAL["warm_white"], t)


def darken(c, t):
    return mix(c, PAL["dark_detail"], t)


def rgba(c, a=255):
    return (*c, a)


class Cv:
    """Supersampled canvas. Coordinates are in final (1x) pixels; offset (ox,oy) supports sprite sheets."""

    def __init__(self, w, h, k=1, ss=None):
        self.w, self.h, self.k = w, h, k
        self.S = (ss or S) * k
        self.im = Image.new("RGBA", (w * self.S, h * self.S), (0, 0, 0, 0))
        self.sh = Image.new("RGBA", (w * self.S, h * self.S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
        self.sd = ImageDraw.Draw(self.sh)
        self.ox = self.oy = 0

    def _p(self, pts):
        return [((x + self.ox) * self.S, (y + self.oy) * self.S) for x, y in pts]

    def fill(self, pts, col):
        self.d.polygon(self._p(pts), fill=rgba(col))

    def stroke(self, pts, col, w=1.5, closed=True):
        p = self._p(pts)
        if closed:
            p = p + [p[0]]
        self.d.line(p, fill=rgba(col), width=max(1, int(w * self.S)), joint="curve")

    def poly(self, pts, fill, outline=OUTLINE, ow=1.5):
        self.fill(pts, fill)
        if outline:
            self.stroke(pts, outline, ow)

    def rrect(self, box, r, fill, outline=OUTLINE, ow=1.5):
        x0, y0, x1, y1 = box
        b = [(x0 + self.ox) * self.S, (y0 + self.oy) * self.S, (x1 + self.ox) * self.S, (y1 + self.oy) * self.S]
        self.d.rounded_rectangle(b, r * self.S, fill=rgba(fill), outline=rgba(outline) if outline else None,
                                 width=int(ow * self.S))

    def ellipse(self, box, fill, outline=OUTLINE, ow=1.5):
        x0, y0, x1, y1 = box
        b = [(x0 + self.ox) * self.S, (y0 + self.oy) * self.S, (x1 + self.ox) * self.S, (y1 + self.oy) * self.S]
        self.d.ellipse(b, fill=rgba(fill), outline=rgba(outline) if outline else None, width=int(ow * self.S))

    def line(self, p0, p1, col, w=1.0, alpha=255):
        self.d.line(self._p([p0, p1]), fill=rgba(col, alpha), width=max(1, int(w * self.S)))

    def capsule(self, p0, p1, w, fill, outline=OUTLINE, ow=1.5):
        a, b = self._p([p0, p1])
        if outline:
            self.d.line([a, b], fill=rgba(outline), width=int((w + ow * 2) * self.S))
            r = (w / 2 + ow) * self.S
            for q in (a, b):
                self.d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=rgba(outline))
        self.d.line([a, b], fill=rgba(fill), width=int(w * self.S))
        r = w / 2 * self.S
        for q in (a, b):
            self.d.ellipse([q[0] - r, q[1] - r, q[0] + r, q[1] + r], fill=rgba(fill))

    def shadow(self, pts, alpha=0.2):
        self.sd.polygon(self._p(pts), fill=(*PAL["shadow"], int(255 * alpha)))

    def shadow_ellipse(self, box, alpha=0.18):
        x0, y0, x1, y1 = box
        self.sd.ellipse([(x0 + self.ox) * self.S, (y0 + self.oy) * self.S, (x1 + self.ox) * self.S, (y1 + self.oy) * self.S],
                        fill=(*PAL["shadow"], int(255 * alpha)))

    def finish(self, blur=4):
        sh = self.sh.filter(ImageFilter.GaussianBlur(blur * self.S / 2))
        out = Image.alpha_composite(sh, self.im)
        return out.resize((self.w * self.k, self.h * self.k), Image.LANCZOS)


def silhouette_outline(im, px=2, col=OUTLINE):
    """Add an outer silhouette outline of px pixels (1x) under the art."""
    a = im.split()[3].point(lambda v: 255 if v > 24 else 0)
    k = px * 2 + 1
    grown = a.filter(ImageFilter.MaxFilter(k))
    base = Image.new("RGBA", im.size, (*col, 0))
    base.putalpha(grown)
    return Image.alpha_composite(base, im)


def iso_pt(ox, oy, x, y, e=0):
    """Screen point for local tile coords (x,y) (floats) at elevation e, origin = top vertex of tile (0,0)."""
    return (ox + (x - y) * TILE_W / 2, oy + (x + y) * TILE_H / 2 - e)


def box(cv, org, x, y, a, b, e, h, top, left, right, ow=1.5, planks=0, bevel=True):
    """Iso box. local footprint [x,x+a]x[y,y+b] tiles, elevation e px, height h px.
    left face = +y side (lit mid), right face = +x side (shadow side). Returns top-face points."""
    P0 = iso_pt(*org, x, y, e + h)
    P1 = iso_pt(*org, x + a, y, e + h)
    P2 = iso_pt(*org, x + a, y + b, e + h)
    P3 = iso_pt(*org, x, y + b, e + h)
    dn = lambda p: (p[0], p[1] + h)
    if h > 0:
        cv.poly([P3, P2, dn(P2), dn(P3)], left, OUTLINE, ow)
        cv.poly([P2, P1, dn(P1), dn(P2)], right, OUTLINE, ow)
    cv.fill([P0, P1, P2, P3], top)
    if planks:
        for k in range(1, planks):
            t = k / planks
            p = (P0[0] + (P3[0] - P0[0]) * t, P0[1] + (P3[1] - P0[1]) * t)
            q = (P1[0] + (P2[0] - P1[0]) * t, P1[1] + (P2[1] - P1[1]) * t)
            cv.line(p, q, darken(top, 0.16), 0.8, 150)
    if bevel:
        cv.line((P3[0] + 1, P3[1]), (P2[0], P2[1] - 0.5), lighten(top, 0.5), 1.0, 200)
        cv.line((P2[0], P2[1] - 0.5), (P1[0] - 1, P1[1]), lighten(top, 0.3), 1.0, 160)
    cv.stroke([P0, P1, P2, P3], OUTLINE, ow)
    return P0, P1, P2, P3


def save(im, rel):
    path = os.path.join(ASSET_DIR, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)
    return path
