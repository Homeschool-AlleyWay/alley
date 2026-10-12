/** Minimal Style used ONLY for local tests of the room/furniture until the real render styles are used. */
import * as THREE from "three";
import type { MatKind, MatOpts, Mood, Style, StyleRig } from "./types";

const ROUGH: Partial<Record<MatKind, number>> = { skin: 0.7, hair: 0.6, cloth: 0.9, knit: 1, denim: 0.9, leather: 0.55, wood: 0.7, metal: 0.35, glass: 0.1, plastic: 0.45, paper: 0.95, fabric: 0.95, wall: 1, floor: 0.85, rug: 1, screen: 0.3 };

export const stubStyle: Style = {
  id: "papercut", label: "Stub",
  mat(kind: MatKind, color: string | number, o: MatOpts = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? ROUGH[kind] ?? 0.7, metalness: o.metal ?? (kind === "metal" ? 0.7 : 0) });
    if (o.map) m.map = o.map;
    if (o.normalMap) m.normalMap = o.normalMap;
    if (kind === "emissive" || kind === "screen" || o.emissive !== undefined) {
      m.emissive = new THREE.Color(o.emissive ?? color); m.emissiveIntensity = o.emissiveIntensity ?? 1;
      if (o.map) m.emissiveMap = o.map;
    }
    if (kind === "glass") { m.transparent = true; m.opacity = o.opacity ?? 0.3; }
    if (o.transparent) m.transparent = true;
    if (o.opacity !== undefined) m.opacity = o.opacity;
    if (o.side !== undefined) m.side = o.side;
    return m;
  },
  setup(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): StyleRig {
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    scene.background = new THREE.Color("#dfe9f3");
    const hemi = new THREE.HemisphereLight("#ffffff", "#c9b8a6", 1.1); scene.add(hemi);
    const sun = new THREE.DirectionalLight("#fff3dd", 2.2); sun.position.set(3, 6, 4);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -4; sc.right = 4; sc.top = 4; sc.bottom = -4; sc.near = 1; sc.far = 16; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const day = new THREE.Color("#dfe9f3"), night = new THREE.Color("#141a33");
    return {
      render() { renderer.render(scene, camera); },
      resize(w, h, pr) { if (pr) renderer.setPixelRatio(pr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
      setMood(m: Mood) {
        const d = m.hour >= 6.5 && m.hour <= 18.5 ? 1 : m.hour >= 20 || m.hour <= 5 ? 0 : 0.5;
        (scene.background as THREE.Color).copy(night).lerp(day, d);
        hemi.intensity = 0.45 + 0.65 * d; sun.intensity = 0.5 + 1.7 * d;
      },
      setQuality() { /* no-op */ },
      dispose() { scene.remove(hemi, sun); sun.shadow.map?.dispose(); },
    };
  },
};
