#!/usr/bin/env python3
"""Redraws every auditorium character sheet with the same chibi rig the hallway uses, then applies the paper finish.
Keeps tools/char_manifest.json (sheet keys, frame counts, sizes, directions) unchanged, so the game needs no changes.
Needs: node + esbuild (npm i) and playwright (npm i -g playwright)."""
import os, subprocess, shutil, sys
from PIL import Image
from lib import ROOT, save
cache = os.path.join(ROOT, "tools", ".cache", "chibi")
shutil.rmtree(cache, ignore_errors=True); os.makedirs(cache)
bundle = os.path.join(ROOT, "tools", ".cache", "bake.js")
subprocess.check_call(["npx", "esbuild", "tools/bake_entry.ts", "--bundle", "--format=iife", f"--outfile={bundle}", "--log-level=error"], cwd=ROOT)
subprocess.check_call(["node", "tools/bake_chibi.mjs", bundle, os.path.join(ROOT, "tools/char_manifest.json"), cache], cwd=ROOT)
n = 0
for d, _, fs in os.walk(cache):
    for f in fs:
        rel = os.path.relpath(os.path.join(d, f), cache)
        save(Image.open(os.path.join(d, f)).convert("RGBA"), rel); n += 1
print(f"chibi: {n} sheets finished")
