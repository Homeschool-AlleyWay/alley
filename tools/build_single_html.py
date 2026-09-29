#!/usr/bin/env python3
"""Bundles the demo into ONE self-contained HTML (assets inlined as data URIs; Phaser from cdnjs)."""
import base64, json, os, re, sys
from lib import ROOT, ASSET_DIR
bundle = open(os.path.join(ROOT, "demo/dist/bundle.js")).read()
html = open(os.path.join(ROOT, "demo/index.html")).read()
b64 = lambda p: "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()
atlas_json = open(os.path.join(ASSET_DIR, "atlas/auditorium_env.json")).read()
n = 0
def sub_png(m):
    global n
    n += 1
    return '"' + b64(os.path.join(ROOT, "public", m.group(1).lstrip("/"))) + '"'
bundle = bundle.replace('"/assets/unify/atlas/auditorium_env.json"', atlas_json)
bundle = re.sub(r'"(/assets/unify/[^"]+\.png)"', sub_png, bundle)
html = html.replace('<script src="dist/bundle.js"></script>', "<script>" + bundle.replace("</script>", "<\\/script>") + "</script>")
out = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/outputs/unify_auditorium_live.html"
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w").write(html)
print(out, f"{os.path.getsize(out)/1e6:.1f} MB, {n} inlined PNG refs")
