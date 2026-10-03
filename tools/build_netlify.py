#!/usr/bin/env python3
"""Builds a Netlify-ready site: python3 tools/build_netlify.py OUT_DIR [--zip]
OUT_DIR gets the static game at its root (index.html = academy shell), netlify.toml, and netlify/functions/broadcast.mjs + chat.mjs
(the news feed and the optional NPC chat model from server/server.mjs as Netlify Functions at /api/broadcast and /api/chat). Only PNGs the bundles reference are copied."""
import os, re, shutil, sys, zipfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
out = os.path.abspath(sys.argv[1])
shutil.rmtree(out, ignore_errors=True)
os.makedirs(os.path.join(out, "demo/dist")); os.makedirs(os.path.join(out, "netlify/functions"))
refs = set()
for name in ("bundle.js", "hall3d.js", "newschars.js"):
    shutil.copyfile(os.path.join(ROOT, "demo/dist", name), os.path.join(out, "demo/dist", name))
    refs |= set(re.findall(r'"/(assets/unify/[^"]+)"', open(os.path.join(ROOT, "demo/dist", name)).read()))
for r in sorted(refs):
    dst = os.path.join(out, r); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(os.path.join(ROOT, "public", r), dst)
if "--relative" in sys.argv:   # for hosting under a sub-path (e.g. /academy/): asset URLs relative to the page instead of the site root
    for name in ("bundle.js", "hall3d.js", "newschars.js"):
        f = os.path.join(out, "demo/dist", name); txt = open(f).read().replace('"/assets/unify/', '"assets/unify/'); open(f, "w").write(txt)
for page in ("index.html", "hallway3d.html", "auditorium.html", "news.html"):
    shutil.copyfile(os.path.join(ROOT, page), os.path.join(out, page))
if "--static-only" in sys.argv:
    print(out, sum(len(fs) for _, _, fs in os.walk(out)), "files (static only)"); sys.exit(0)
# news feed as a Netlify Function (v2 syntax, custom path)
srv = open(os.path.join(ROOT, "server/server.mjs")).read()
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
open(os.path.join(out, "netlify/functions/broadcast.mjs"), "w").write(fn)
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
open(os.path.join(out, "netlify/functions/chat.mjs"), "w").write(cfn)
open(os.path.join(out, "netlify.toml"), "w").write('''[build]
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
open(os.path.join(out, "README-NETLIFY.txt"), "w").write('''UNIFY Academy: Netlify deploy
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
                p = os.path.join(d, f); zf.write(p, os.path.relpath(p, out))
    print(z, round(os.path.getsize(z) / 1e6, 1), "MB")
n = sum(len(fs) for _, _, fs in os.walk(out)); print(out, n, "files")
