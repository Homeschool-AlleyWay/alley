#!/usr/bin/env python3
"""Builds a Netlify-ready site: python3 tools/build_netlify.py OUT_DIR [--zip]
OUT_DIR gets the static game at its root (index.html = academy shell), netlify.toml, and netlify/functions/broadcast.mjs + chat.mjs
(the news feed and the optional NPC chat model from server/server.mjs as Netlify Functions at /api/broadcast and /api/chat). Only PNGs the shipped pages reference are copied.
Flags: --with-legacy (also ship the old Phaser auditorium/hallway pages and their images), --relative (host under a sub-path such as /academy/), --static-only, --zip"""
import os
import re
import shutil
import sys
import zipfile

def read(path, **kw):
    with open(path, **kw) as fh:
        return fh.read()
def write(path, text):
    with open(path, "w") as fh:
        fh.write(text)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
out = os.path.abspath(sys.argv[1])
shutil.rmtree(out, ignore_errors=True)
os.makedirs(os.path.join(out, "demo/dist"))
os.makedirs(os.path.join(out, "netlify/functions"))
# Everything the live pages need. Pages and support files are listed once here; the check below fails the build
# if any page points at a local file that was not copied (this list used to go stale and silently break pages).
PAGES = ["index.html", "hallway3d.html", "auditorium3d.html", "classroom3d.html", "news.html", "phone.html",
         "opendoor.html", "fieldtrip.html", "curriculum.html", "parent.html"]
SUPPORT = ["phone.webmanifest", "curriculum.webmanifest", "game.webmanifest", "phone-sw.js", "curriculum-sw.js", "phone-net.js",
           "phone-config.js", "supabase-client.js", "supabase-config.js", "calmui.js", "phone-icon.svg",
           "icon-180.png", "icon-192.png", "icon-512.png"]
# Old pages (not linked from index.html): only shipped with --with-legacy. They are what carry the ~30 MB of sprite images.
LEGACY = ["auditorium.html", "hallway.html"]
if "--with-legacy" in sys.argv:
    PAGES += LEGACY
# ship only the bundles the shipped pages actually load
BUNDLES = sorted({m for p in PAGES for m in re.findall(r'demo/dist/([\w.-]+\.js)', read(os.path.join(ROOT, p), errors="ignore"))})
refs = set()
def copy_to_out(rel):
    dst = os.path.join(out, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(ROOT, rel), dst)
for name in BUNDLES:
    copy_to_out("demo/dist/" + name)
    refs |= set(re.findall(r'"/(assets/unify/[^"]+)"', read(os.path.join(ROOT, "demo/dist", name))))
for rel in PAGES + SUPPORT:
    copy_to_out(rel)
    if rel.endswith((".html", ".js")):
        refs |= set(re.findall(r'["\'(]/?(assets/unify/[^"\')\s?#]+\.png)', read(os.path.join(ROOT, rel), errors="ignore")))
for d in ("vendor", "curriculum"):
    for dp, _, fs in os.walk(os.path.join(ROOT, d)):
        for fn in fs:
            copy_to_out(os.path.relpath(os.path.join(dp, fn), ROOT))
for r in sorted(refs):
    if os.path.exists(os.path.join(ROOT, "public", r)):
        dst = os.path.join(out, r)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(os.path.join(ROOT, "public", r), dst)
    else:
        print("warning: asset referenced but missing:", r)
if "--relative" in sys.argv:   # for hosting under a sub-path (e.g. /academy/): asset URLs relative to the page instead of the site root
    for name in BUNDLES:
        f = os.path.join(out, "demo/dist", name)
        write(f, read(f).replace('"/assets/unify/', '"assets/unify/'))
# self-check: every local script/link/img/iframe a page loads must exist in the output
missing = []
for page in PAGES:
    html = read(os.path.join(out, page), errors="ignore")
    for u in re.findall(r'(?:src|href)=["\']([^"\'#?]+)', html):
        if re.match(r'^(https?:|//|data:|mailto:|javascript:|tel:)', u) or u in ("/", "") or "${" in u:
            continue
        if not os.path.exists(os.path.join(out, u.lstrip("/"))):
            missing.append(f"{page} -> {u}")
if missing:
    print("BUILD CHECK FAILED: pages reference files that were not copied:\n  " + "\n  ".join(missing))
    sys.exit(1)
if "--static-only" in sys.argv:
    print(out, sum(len(fs) for _, _, fs in os.walk(out)), "files (static only)")
    sys.exit(0)
# news feed as a Netlify Function (v2 syntax, custom path)
srv = read(os.path.join(ROOT, "server/server.mjs"))
body = srv[srv.index("const UA ="):srv.index("/* ---------- HTTP ---------- */")]
head = "// Generated from server/server.mjs by tools/build_netlify.py\n" + body
fn = head + '''
export default async (req, context) => {
  const u = new URL(req.url), q = u.searchParams, g = context && context.geo;     // Netlify supplies an approximate location when the page sends none
  try {
    const hasPlace = q.get('city') || (q.get('lat') && q.get('lon'));
    const d = await build({ city: q.get('city'), lat: q.get('lat') || (!hasPlace && g && g.latitude) || null, lon: q.get('lon') || (!hasPlace && g && g.longitude) || null, tz: q.get('tz') || (g && g.timezone) || null, grade: q.get('grade') || '6', edition: q.get('edition'), limit: q.get('limit') });
    return Response.json(d, { headers: { 'cache-control': 'public, max-age=300' } });
  } catch (e) { return Response.json({ error: String(e.message) }, { status: 502 }); }
};
export const config = { path: '/api/broadcast' };
'''
write(os.path.join(out, "netlify/functions/broadcast.mjs"), fn)
cfn = head + '''
export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  try {
    const text = await req.text(); if (text.length > 16000) return new Response('too big', { status: 413 });
    const r = await chat(JSON.parse(text)); if (!r) return new Response('no model', { status: 501 });
    return Response.json(r);
  } catch (e) { return new Response('chat failed', { status: 502 }); }
};
export const config = { path: '/api/chat' };
'''
write(os.path.join(out, "netlify/functions/chat.mjs"), cfn)
write(os.path.join(out, "netlify.toml"), '''[build]
  publish = "."
  functions = "netlify/functions"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "/demo/dist/*"
  [headers.values]
    Cache-Control = "public, max-age=3600"
''')
write(os.path.join(out, "README-NETLIFY.txt"), '''UNIFY Academy: Netlify deploy
=============================
Fastest (no account setup, no news feed):
  1. Unzip this folder.
  2. Drag the folder onto https://app.netlify.com/drop
  The game works fully; the newsroom shows its built-in sample stories.

With the live news feed (weather + local/national/world stories):
  The feed is a Netlify Function (netlify/functions/broadcast.mjs at /api/broadcast). Functions are built by Netlify,
  so deploy this folder from Git or the CLI instead of drag-and-drop:
    npm i -g netlify-cli
    netlify deploy --prod --dir=.
  Optional environment variables (Site settings > Environment variables):
    SCHOOL_CITY          default city, e.g. Atlanta
    ANTHROPIC_API_KEY    better anchor copy (optional; without it the feed uses its own plain wording)
    ANTHROPIC_MODEL      model id for the anchor copy (optional)
  Add ?city=Chicago&grade=8 to the site URL to change the news city and grade level.

Controls: WASD / arrow keys (or the on-screen pad on a phone) to walk; walk into a door to enter that lesson; Esc leaves.
''')
if "--zip" in sys.argv:
    z = out.rstrip("/") + ".zip"
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for d, _, fs in os.walk(out):
            for f in fs:
                p = os.path.join(d, f)
                zf.write(p, os.path.relpath(p, out))
    print(z, round(os.path.getsize(z) / 1e6, 1), "MB")
n = sum(len(fs) for _, _, fs in os.walk(out))
print(out, n, "files")
