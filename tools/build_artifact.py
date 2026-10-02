#!/usr/bin/env python3
"""Prepares a static, relative-path copy of the academy for hosting on a plain file host (e.g. a claude.ai Artifact).
Usage: python3 tools/build_artifact.py OUT_DIR   ->  OUT_DIR/academy.html (main page fragment) + OUT_DIR/pub/** (supporting files) + OUT_DIR/files.json
Only the PNGs the bundles actually reference are copied. Absolute /assets/... paths become relative."""
import json, os, re, shutil, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
out = os.path.abspath(sys.argv[1])
pub = os.path.join(out, "pub")
shutil.rmtree(pub, ignore_errors=True)
os.makedirs(os.path.join(pub, "demo/dist"))
refs = set()
for name in ("bundle.js", "hall3d.js", "newschars.js"):
    js = open(os.path.join(ROOT, "demo/dist", name)).read()
    refs |= set(re.findall(r'"/(assets/unify/[^"]+)"', js))
    open(os.path.join(pub, "demo/dist", name), "w").write(js.replace('"/assets/unify/', '"assets/unify/'))
for r in sorted(refs):
    dst = os.path.join(pub, r)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(ROOT, "public", r), dst)
for page in ("hallway3d.html", "auditorium.html", "news.html"):
    shutil.copyfile(os.path.join(ROOT, page), os.path.join(pub, page))
# main page: the host wraps it in its own <html><head><body>, so keep only the inner content
html = open(os.path.join(ROOT, "index.html")).read()
head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
head = re.sub(r'<meta[^>]*charset[^>]*>|<meta[^>]*viewport[^>]*>', "", head)
open(os.path.join(out, "academy.html"), "w").write(head.strip() + "\n" + body.strip() + "\n")
files = sorted(os.path.relpath(os.path.join(d, f), pub) for d, _, fs in os.walk(pub) for f in fs)
json.dump({f: f for f in files}, open(os.path.join(out, "files.json"), "w"))
print(len(files), "files,", round(sum(os.path.getsize(os.path.join(pub, f)) for f in files) / 1e6, 1), "MB")
