/** Speech-bubble / emote sprites that float above an avatar's head. */
import * as THREE from "three";

function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/), lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines.slice(0, 4);
}
export function makeBubble(text: string, kind: "me" | "them" | "away"): THREE.Sprite {
  const W = 420, c = document.createElement("canvas"), g = c.getContext("2d")!;
  c.width = W; c.height = 220; g.font = "600 30px system-ui, 'Segoe UI', Roboto, Arial, sans-serif";
  const lines = wrap(g, text.length > 90 ? text.slice(0, 88) + "…" : text, W - 70), lh = 38, h = lines.length * lh + 34, top = 200 - h - 22;
  g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 10; g.shadowOffsetY = 4;
  g.fillStyle = kind === "me" ? "#cfe6f7" : kind === "away" ? "#eee6d8" : "#ffffff";
  g.beginPath(); g.roundRect(14, top, W - 28, h, 26); g.fill();
  g.beginPath(); g.moveTo(W / 2 - 16, top + h - 2); g.lineTo(W / 2, top + h + 20); g.lineTo(W / 2 + 16, top + h - 2); g.fill();
  g.shadowColor = "transparent"; g.fillStyle = "#3a2e33"; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, W / 2, top + 17 + lh / 2 + i * lh));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  sp.renderOrder = 40; sp.center.set(0.5, 0.0); sp.userData.aspect = 220 / W; sp.raycast = () => { /* not pickable */ };
  return sp;
}
export function makeEmote(emoji: string): THREE.Sprite {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  g.font = "88px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  sp.renderOrder = 41; sp.center.set(0.5, 0.0); sp.userData.aspect = 1; sp.raycast = () => { /* not pickable */ }; return sp;
}
export function disposeSprite(s: THREE.Sprite) { s.removeFromParent(); (s.material.map as THREE.Texture | null)?.dispose(); s.material.dispose(); }
