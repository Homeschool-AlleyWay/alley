#!/usr/bin/env python3
"""Bring CC0 Quaternius Universal Base rigged models into ONLY the isolated trial build.

Official source: https://quaternius.com/packs/universalbasecharacters.html
Animation source: https://quaternius.com/packs/universalanimationlibrary.html

Immutable mirror commit contains the original Standard glTF/.bin/images and UAL1 Standard
GLB. Downloads run in the Netlify preview build, not in the live campus or user's phone.
No Adobe/Mixamo files are redistributed.
"""
import hashlib
import json
import os
import pathlib
import sys
import time
import urllib.parse
import urllib.request

REPO = "NafisRayan/Animate-Rigged-Humanoid-No-Blender"
COMMIT = "5821923af517ac5fdc82505faa92a0d575fc1b1a"
CHAR_ROOT = ("Universal Base Characters[Standard]/Universal Base Characters[Standard]/"
             "Base Characters/Godot - UE/")
ANIM = ("Universal Animation Library[Standard]/Universal Animation Library[Standard]/"
        "Unreal-Godot/UAL1_Standard.glb")
MODELS = ("Superhero_Male_FullBody", "Superhero_Female_FullBody")
SUBSTITUTES = {
    "T_Eye_Normal_png.png": "T_Eye_Normal.png",
    "T_Hair_1_Normal_png.png": "T_Hair_1_Normal.png",
}
MAX_DOWNLOAD = 14_000_000

def fetch(rel):
    encoded = "/".join(urllib.parse.quote(p, safe="") for p in rel.split("/"))
    url = f"https://raw.githubusercontent.com/{REPO}/{COMMIT}/{encoded}"
    request = urllib.request.Request(url, headers={
        "User-Agent": "Homoleen-Quaternius-CC0-Preview/1.0",
        "Accept": "application/octet-stream",
    })
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read(MAX_DOWNLOAD + 1)
            if not data or len(data) > MAX_DOWNLOAD:
                raise ValueError(f"Asset empty or over preview limit: {rel}")
            return data
        except (OSError, ValueError) as error:
            last = error
            if attempt < 2: time.sleep(1.0 + attempt)
    raise RuntimeError(f"Could not fetch pinned CC0 trial model {rel}: {last}")

def write(directory, name, data):
    if "/" in name or "\\" in name or ".." in name:
        raise ValueError(f"Invalid filename: {name}")
    (directory / name).write_bytes(data)

def optimize_png(content):
    try:
        from PIL import Image
        from io import BytesIO
        original = Image.open(BytesIO(content))
        original.load()
        if max(original.size) <= 1024:
            return content
        original.thumbnail((1024,1024), Image.Resampling.LANCZOS)
        result = BytesIO()
        original.save(result, format="PNG", optimize=True)
        return result.getvalue()
    except ImportError:
        return content

def main(outdir):
    out = pathlib.Path(outdir) / "quaternius-trial"
    out.mkdir(parents=True, exist_ok=True)
    used_images = set()
    for model in MODELS:
        gltf = json.loads(fetch(CHAR_ROOT + model + ".gltf"))
        buffers = gltf.get("buffers", [])
        if len(buffers) != 1 or buffers[0].get("uri") != model + ".bin":
            raise ValueError(f"Unexpected asset buffers: {model}")
        images = gltf.get("images", [])
        for image in images:
            name = image.get("uri", "")
            if not name or "/" in name or "\\" in name or not name.lower().endswith(".png"):
                raise ValueError(f"Unexpected image URI in {model}: {name}")
            actual = SUBSTITUTES.get(name, name)
            image["uri"] = actual
            used_images.add(actual)
        write(out, model + ".gltf", json.dumps(gltf, separators=(",",":")).encode("utf-8"))
        data = fetch(CHAR_ROOT + model + ".bin")
        if len(data) != buffers[0]["byteLength"]:
            raise ValueError(f"Model data size mismatch: {model}")
        write(out, model + ".bin", data)
    for name in sorted(used_images):
        data = fetch(CHAR_ROOT + name)
        write(out, name, optimize_png(data))
    motion = fetch(ANIM)
    if motion[:4] != b"glTF":
        raise ValueError("Animation library is not a GLB")
    write(out, "UAL1_Standard.glb", motion)
    metadata = {
        "kind":"Quaternius CC0 isolated trial",
        "source":"https://quaternius.com/packs/universalbasecharacters.html",
        "animations":"https://quaternius.com/packs/universalanimationlibrary.html",
        "mirror_repository": REPO,
        "mirror_commit": COMMIT,
        "model_files":[model+".gltf" for model in MODELS],
        "animation_file":"UAL1_Standard.glb",
        "note":"No Mixamo files; no original world models have been changed."
    }
    write(out, "source-manifest.json",json.dumps(metadata,indent=2).encode())
    print(f"Quaternius CC0 trial: {len(list(out.iterdir()))} files, "
          f"{sum(p.stat().st_size for p in out.iterdir())//1024} KiB")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 tools/import_quaternius_trial.py DIST_DIRECTORY")
    main(sys.argv[1])
