#!/usr/bin/env python3
"""Builds the standalone "look preview" site: python3 tools/build_pixar_site.py OUT_DIR   (run `npm run build` first).
Ships only the preview pages, the bundles they load and phone-net.js (local backend, because there is no supabase-config.js).
Fails if any page references a local file that was not copied."""

import os
import re
import shutil
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if len(sys.argv) < 2:
    sys.exit(__doc__)
out = os.path.abspath(sys.argv[1])


def read(p):
    with open(os.path.join(ROOT, p) if not os.path.isabs(p) else p, errors="ignore") as f:
        return f.read()


def write(rel, text):
    dst = os.path.join(out, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "w") as f:
        f.write(text)


def copy(rel, as_rel=None):
    dst = os.path.join(out, as_rel or rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(ROOT, rel), dst)


# (source file in repo, name in the output)
PAGES = [
    ("pixar/index.html", "index.html"),
    ("pixar/compare.html", "compare.html"),
    ("pixar/characters.html", "characters.html"),
    ("dorm.html", "dorm.html"),
]
SUPPORT = ["phone-icon.svg", "phone-net.js"]
BANNER_TEXT = "Look preview only. Nothing here is saved to any account."
# preview pages: a strip at the top of the page; the full-screen dorm gets a small pill that never blocks taps
BANNER = f'<div id="lookbanner" role="note" style="background:#ffd27a;color:#2b2f3a;font:700 12px/1.3 system-ui,sans-serif;text-align:center;padding:4px 8px">{BANNER_TEXT}</div>'
BANNER_DORM = (
    '<div id="lookbanner" role="note" style="position:fixed;left:50%;top:calc(2px + env(safe-area-inset-top));transform:translateX(-50%);z-index:99999;pointer-events:none;'
    f'background:rgba(255,210,122,.92);color:#2b2f3a;font:700 10px/1.3 system-ui,sans-serif;padding:2px 10px;border-radius:99px;white-space:nowrap;max-width:96vw;overflow:hidden;text-overflow:ellipsis">{BANNER_TEXT}</div>'
)
ROBOTS = '<meta name="robots" content="noindex,nofollow">'
# dorm.html: start in the Pixar look unless somebody already chose (?style= still wins because the page reads it first)
DORM_DEFAULT = "<script>try{if(localStorage.getItem('unify.dorm.style')===null)localStorage.setItem('unify.dorm.style','pixar')}catch(e){}</script>"

shutil.rmtree(out, ignore_errors=True)
os.makedirs(os.path.join(out, "demo/dist"))

for src, name in PAGES:
    html = read(src)
    if src == "dorm.html":
        # no supabase: the page then talks to phone-net.js's local backend and nothing leaves the browser
        html = re.sub(r'<script src="supabase-(?:config|client)\.js"></script>', "", html)
        html = html.replace('<script src="phone-net.js">', DORM_DEFAULT + '<script src="phone-net.js">', 1)
    if 'name="robots"' not in html:
        html = html.replace("<head>", "<head>\n" + ROBOTS, 1)
    html = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + "\n" + (BANNER_DORM if src == "dorm.html" else BANNER), html, count=1)
    write(name, html)

bundles = sorted({m for _, n in PAGES for m in re.findall(r"demo/dist/([\w.-]+\.js)", read(os.path.join(out, n)))})
for b in bundles:
    copy("demo/dist/" + b)
for s in SUPPORT:
    copy(s)
write("robots.txt", "User-agent: *\nDisallow: /\n")
write(
    "netlify.toml",
    """[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow"
    Referrer-Policy = "no-referrer"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-store"

[[headers]]
  for = "/demo/dist/*"
  [headers.values]
    Cache-Control = "public, max-age=3600"
""",
)

# self-check: every local file a page loads must exist; nothing from the real academy may be in the output
missing = []
for _, name in PAGES:
    html = read(os.path.join(out, name))
    for u in re.findall(r'(?:src|href)=["\']([^"\'#?]+)', html):
        if re.match(r"^(https?:|//|data:|mailto:|javascript:|tel:)", u) or u in ("/", "") or "${" in u:
            continue
        if not os.path.exists(os.path.join(out, u.lstrip("/"))):
            missing.append(f"{name} -> {u}")
    if ROBOTS not in html or "Look preview only" not in html:
        missing.append(f"{name} -> robots meta or banner missing")
for forbidden in ("supabase-config.js", "supabase-client.js", "mail.html", "news.html", "vendor"):
    if os.path.exists(os.path.join(out, forbidden)):
        missing.append("forbidden file shipped: " + forbidden)
for b in bundles:
    if re.search(r"supabase\.co|\.supabase\.", read(os.path.join(out, "demo/dist", b))):
        missing.append(f"{b} mentions a supabase host")
if missing:
    print("BUILD CHECK FAILED:\n  " + "\n  ".join(missing))
    sys.exit(1)
print(out, sum(len(fs) for _, _, fs in os.walk(out)), "files")
