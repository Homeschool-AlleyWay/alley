#!/usr/bin/env python3
"""Builds the separate Pixar-edition academy: python3 tools/build_pixar_app.py OUT_DIR [--zip] [other build_netlify.py flags]
Runs tools/build_netlify.py into OUT_DIR (all pages, bundles, Supabase config, /api functions), then makes it the Pixar app:
look.js shipped with LOOK = "pixar", pixar-ui.css at the root, look.js as the first script of every html page,
' - Pixar edition' title on index.html, no-store html + noindex headers. The normal build is not touched."""
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
args = [a for a in sys.argv[1:] if a != "--zip"]
if not args or args[0].startswith("-"):
    sys.exit(__doc__)
out = os.path.abspath(args[0])
subprocess.run([sys.executable, os.path.join(ROOT, "tools/build_netlify.py"), out] + args[1:], check=True)


def read(p):
    with open(p, errors="ignore") as f:
        return f.read()


def write(p, t):
    with open(p, "w") as f:
        f.write(t)


look = read(os.path.join(ROOT, "look.js"))
assert 'var LOOK = "papercut"' in look, "look.js no longer has the LOOK default line"
look = look.replace('var LOOK = "papercut"', 'var LOOK = "pixar"')
# stylesheet next to look.js, whatever the page depth
look = look.replace('l.href = "pixar-ui.css"', 'l.href = document.currentScript.src.replace(/look\\.js.*$/, "pixar-ui.css")')
assert "currentScript" in look
look = look.replace("(function () {", "(function () {\n  var CS = document.currentScript;", 1).replace("document.currentScript.src", "CS.src")
write(os.path.join(out, "look.js"), look)
write(os.path.join(out, "pixar-ui.css"), read(os.path.join(ROOT, "pixar-ui.css")))

pages = []
for dp, _, fs in os.walk(out):
    for fn in fs:
        if fn.endswith(".html"):
            pages.append(os.path.relpath(os.path.join(dp, fn), out))
for rel in pages:
    p = os.path.join(out, rel)
    html = read(p)
    tag = '<script src="%slook.js"></script>' % ("../" * rel.count("/"))
    if re.search(r"<head[^>]*>", html, re.IGNORECASE):
        html = re.sub(r"(<head[^>]*>)", lambda m, t=tag: m.group(1) + t, html, count=1, flags=re.IGNORECASE)
    else:
        html = tag + html
    if rel == "index.html":
        html = re.sub(r"(<title>)(.*?)(</title>)", lambda m: m.group(1) + m.group(2) + " - Pixar edition" + m.group(3), html, count=1, flags=re.DOTALL)
    write(p, html)

# Netlify's upload-and-build step fails to bundle /api functions without a package.json (found by bisecting a deploy)
with open(os.path.join(out, "package.json"), "w") as _pj:
    _pj.write('{"name":"unify-academy-pixar","private":true,"type":"module"}\n')
toml = os.path.join(out, "netlify.toml")
if os.path.exists(toml):
    write(toml, read(toml).replace("[build]", "[build]\n  command = \"echo prebuilt\"", 1) + """
[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "no-store"

[[headers]]
  for = "/"
  [headers.values]
    Cache-Control = "no-store"

[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex"
""")
else:  # --static-only: still tell crawlers and caches
    write(os.path.join(out, "_headers"), "/*\n  X-Robots-Tag: noindex\n/*.html\n  Cache-Control: no-store\n/\n  Cache-Control: no-store\n")

# self-check: every local file any shipped page loads must exist; look.js must be the first script
missing = []
for rel in pages:
    html = read(os.path.join(out, rel))
    first = re.search(r"<script[^>]*>", html)
    if not first or "look.js" not in first.group(0):
        missing.append(f"{rel}: look.js is not the first script")
    base = os.path.dirname(rel)
    for u in re.findall(r'(?:src|href)=["\']([^"\'#?]+)', html):
        if re.match(r"^(https?:|//|data:|mailto:|javascript:|tel:)", u) or u in ("/", "") or "${" in u:
            continue
        t = u.lstrip("/") if u.startswith("/") else os.path.normpath(os.path.join(base, u))
        if not os.path.exists(os.path.join(out, t)):
            missing.append(f"{rel} -> {u}")
if not os.path.exists(os.path.join(out, "supabase-config.js")):
    missing.append("supabase-config.js")
if missing:
    sys.exit("PIXAR BUILD CHECK FAILED:\n  " + "\n  ".join(missing[:40]))
if "--zip" in sys.argv:
    z = out.rstrip("/") + ".zip"
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for d, _, fs in os.walk(out):
            for f in fs:
                zf.write(os.path.join(d, f), os.path.relpath(os.path.join(d, f), out))
    print(z)
print("Pixar app:", out, len(pages), "pages")
