/** The dorm wardrobe studio: choices on the left, a live 3D stage on the right (open wardrobe, true mirrors, slow spin). Tap the avatar to pick a section, then colour / pattern / width / length / brush.
 *  Edits go to a working AvatarSpec that the 3D character shows on every input; Save writes the shared profile (same storage as the hallway creator). */
import * as THREE from "three";
import { CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, JEWEL_COLORS, OLDER, OPTIONS, REGION_LIMITS, SHOE_COLORS, SKIN_TONES, defaultAvatar, defaultProp, normalizeAvatar, padCloset, randomAvatar, rng, signature, starterCloset, type AvatarSpec, type RegionSpec } from "../hall3d/avatar";
import { ROSTER } from "../hall3d/roster";
import { Social } from "../hall3d/social";
import { StudioStage } from "./studio-stage";
import type { Style } from "./types";

type Key = keyof AvatarSpec;
interface Reg { label: string; col: Key; pal: string[]; none?: boolean; pat?: [Key, Key]; wl?: [string, string]; paint?: boolean }
const METALS: [string, string][] = [["Gold", "#eab94e"], ["Silver", "#cfd4da"], ["Rose gold", "#e8a59a"], ["Pearl", "#f4eee6"], ["Ruby", "#c4463c"], ["Emerald", "#2e9e6b"], ["Sapphire", "#3a5fc4"], ["Rainbow", "rainbow"]];
const METAL_HEX = METALS.map((m) => m[1]);
const JEWEL = [...new Set(METAL_HEX.concat(JEWEL_COLORS.map((c) => c.toLowerCase())))];
const REG: Record<string, Reg> = {
  hair: { label: "Hair", col: "hair", pal: HAIR_COLORS, wl: ["Volume", "Length"], paint: true },
  top: { label: "Top", col: "shirt", pal: CLOTH_COLORS, pat: ["pattern", "patColor"], wl: ["Width", "Length"], paint: true },
  outer: { label: "Jacket", col: "outerColor", pal: CLOTH_COLORS, pat: ["outerPattern", "outerPatColor"], wl: ["Width", "Length"], paint: true },
  bottom: { label: "Bottom", col: "pants", pal: CLOTH_COLORS, pat: ["pantsPattern", "pantsPatColor"], wl: ["Width", "Length"], paint: true },
  shoes: { label: "Shoes", col: "shoes", pal: SHOE_COLORS.concat(CLOTH_COLORS), wl: ["Width", "Length"], paint: true },
  backpack: { label: "Bag", col: "pack", pal: CLOTH_COLORS, wl: ["Width", "Height"], paint: true },
  skin: { label: "Skin", col: "skin", pal: SKIN_TONES },
  hat: { label: "Hat", col: "hatColor", pal: CLOTH_COLORS, wl: ["Width", "Height"], paint: true },
  "jewelry.neck": { label: "Necklace", col: "neckColor", pal: JEWEL, wl: ["Size", ""] },
  "jewelry.ears": { label: "Earrings", col: "earrings", pal: JEWEL, none: true },
  "jewelry.wrists": { label: "Wrist", col: "wristColor", pal: JEWEL, wl: ["Size", ""] },
  "jewelry.fingers": { label: "Rings", col: "rings", pal: JEWEL, none: true, wl: ["Size", ""] },
};
const PATTERNS = ([["solid", "None"], ["stripes", "Stripes"], ["dots", "Dots"], ["plaid", "Plaid"], ["floral", "Flowers"], ["stars", "Stars"], ["gradient", "Gradient"]] as [string, string][]).map(([id, label]) => ({ id, label }));
const PAL_BRUSH = ["#d9564a", "#f28f7e", "#eab94e", "#f8d977", "#5e9c72", "#3fb8af", "#4f91c7", "#8173ae", "#e8789a", "#9a653d", "#fff6ea", "#2b2b33"];
/** coordinated outfits: each sets whole garments (colours included); per-region overrides are cleared so the colours show */
const WEATHER: Record<string, { label: string; icon: string; p: Partial<AvatarSpec> }> = {
  sunny: { label: "Sunny", icon: "☀️", p: { top: "tank", shirt: "#f8d977", pattern: "solid", outer: "none", bottom: "shorts", pants: "#4f91c7", pantsPattern: "solid", shoeStyle: "sandal", shoes: "#9a653d", socks: "none", hat: "sunhat", hatColor: "#f2dfb0", scarf: null, glasses: "sun", glassColor: "#313a3f" } },
  rainy: { label: "Rainy", icon: "🌧️", p: { top: "hoodie", shirt: "#4f91c7", pattern: "solid", outer: "raincoat", outerColor: "#eab94e", outerPattern: "solid", bottom: "jeans", pants: "#4f5d75", pantsPattern: "solid", shoeStyle: "rainboot", shoes: "#eab94e", socks: "none", hat: "bucket", hatColor: "#eab94e", scarf: null } },
  windy: { label: "Windy", icon: "🌬️", p: { top: "longsleeve", shirt: "#88b89a", pattern: "solid", outer: "track", outerColor: "#4f91c7", outerPattern: "solid", bottom: "joggers", pants: "#2b3a55", pantsPattern: "solid", shoeStyle: "sneaker", shoes: "#fbf6ee", socks: "ankle", hat: "cap", hatColor: "#d9564a", scarf: "#eab94e" } },
  cold: { label: "Winter", icon: "🧣", p: { top: "cableknit", shirt: "#f6b294", pattern: "solid", outer: "puffer", outerColor: "#d9564a", outerPattern: "solid", bottom: "joggers", pants: "#2b3a55", pantsPattern: "solid", shoeStyle: "boot", shoes: "#9a653d", socks: "tall", hat: "beanie", hatColor: "#2b3a55", scarf: "#eab94e" } },
  snow: { label: "Snow", icon: "❄️", p: { top: "chunky", shirt: "#fff6ea", pattern: "solid", outer: "puffer", outerColor: "#4f91c7", outerPattern: "solid", bottom: "leggings", pants: "#4a3b3f", pantsPattern: "solid", shoeStyle: "boot", shoes: "#313a3f", socks: "tall", sockColor: "#fff6ea", hat: "beanie", hatColor: "#d9564a", scarf: "#d9564a" } },
  hot: { label: "Hot", icon: "🔥", p: { top: "tank", shirt: "#f28f7e", pattern: "solid", outer: "none", bottom: "shorts", pants: "#fff6ea", pantsPattern: "solid", shoeStyle: "sandal", shoes: "#eab94e", socks: "none", hat: "visor", hatColor: "#4f91c7", scarf: null } },
};
const SHOES_FIRST = ["sneaker", "boot", "sandal", "dress", "rainboot"];
const CSS = `
.ws{position:fixed;inset:0;z-index:90;display:none;flex-direction:column;color:var(--ink,#4A3B3F);font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);background:transparent}
.ws.show{display:flex}
.ws-top{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#F3E7CF;border-bottom:2px solid #C9B28A;flex-wrap:wrap}
.ws-top b{font-size:18px;margin-right:auto}
.ws-grid{flex:1;min-height:0;display:grid;grid-template-columns:min(430px,44vw) minmax(0,1fr)}
.ws-left{min-height:0;display:flex;flex-direction:column;background:#F6ECD8;border-right:2px solid #C9B28A;padding:8px 10px 10px;box-sizing:border-box}
.ws-stage{position:relative;min-width:0;min-height:0;touch-action:none;cursor:grab}
.ws-stage.paint{cursor:crosshair}
.ws-hint{position:absolute;left:10px;bottom:10px;font-size:12px;background:rgba(74,59,63,.6);color:#fff;border-radius:10px;padding:4px 9px;pointer-events:none}
.ws-bd{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding-right:4px}
.ws button,.ws input[type=text]{font:inherit}
.ws-chip{font-size:14px;padding:6px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.8);background:#FFF9F0;color:inherit;cursor:pointer;box-shadow:0 2px 0 #C9B28A;min-height:44px;min-width:44px}
.ws-chip.on{background:var(--acc,#E07A66);color:#fff;box-shadow:0 2px 0 #b95a48}
.ws-chip:active{transform:translateY(2px);box-shadow:none}
.ws-save{background:#4E8A64;color:#fff;box-shadow:0 2px 0 #35674a}
.ws-row{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}
.ws-lab{font-size:12px;color:#8A7A70;margin:8px 0 2px;text-transform:uppercase;letter-spacing:.4px;font-weight:600}
.ws-val{margin-left:6px;text-transform:none;letter-spacing:0}
.ws-sw{width:40px;height:40px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px #6d5a5f;cursor:pointer;padding:0}
.ws-sw.on{box-shadow:0 0 0 3px var(--acc,#E07A66)}
.ws-sw.none{background:repeating-linear-gradient(45deg,#fff,#fff 4px,#d9d0c0 4px,#d9d0c0 8px)}
.ws-sw.rb{background:conic-gradient(#f44,#fb3,#4d4,#3cf,#74f,#f4a,#f44)}
.ws-tabs,.ws-secs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;flex:none}
.ws-tabs .ws-chip,.ws-secs .ws-chip{flex:none}
.ws-secs .ws-chip{min-height:38px;font-size:13px;padding:4px 10px}
.ws input[type=range]{width:100%;max-width:340px;height:32px}
.ws input[type=color]{width:46px;height:40px;border:0;padding:0;background:none;cursor:pointer}
.ws-sec{font-weight:600;font-size:16px;margin:10px 0 2px}
.ws-msg{font-size:13px;color:#a8322a;min-height:0}
.ws-flat{width:256px;height:256px;border:2px solid #C9B28A;border-radius:10px;touch-action:none;background:repeating-conic-gradient(#fff 0 25%,#e8e0d0 0 50%) 0 0/16px 16px;cursor:crosshair}
@media(max-width:760px){.ws-grid{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,46%) minmax(0,1fr)}.ws-left{border-right:0;border-top:2px solid #C9B28A;order:2}.ws-stage{order:1}.ws-top b{font-size:15px}.ws-top .ws-chip{min-height:40px;padding:4px 9px}}
`;
let cssDone = false;
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
const opts = (k: keyof typeof OPTIONS) => OPTIONS[k] as { id: string; label: string }[];

interface Hooks { renderer: THREE.WebGLRenderer; style: () => Style; mobile: boolean; onOpen(): void; onClose(): void; onSave(spec: AvatarSpec): void }

export class Studio {
  readonly root: HTMLElement; spec: AvatarSpec = normalizeAvatar(Social.profile.avatar); stage: StudioStage | null = null;
  region = "top"; tab = "Sections"; private orig = ""; private raf = 0; private last = 0; private dirty = false; private pend = false; private msg: HTMLElement; private body: HTMLElement; private stageEl: HTMLElement; private secs: HTMLElement; private tabs: HTMLElement; private hint: HTMLElement;
  private brush = { size: 18, color: "#d9564a", alpha: 1, erase: false, on: true, flat: false }; private stamp2 = "#fff6ea";
  private hist = new Map<string, { undo: ImageData[]; redo: ImageData[] }>(); private flat: HTMLCanvasElement | null = null; private stroke: { id: string; x: number; y: number } | null = null;
  constructor(private h: Hooks) {
    if (!cssDone) { cssDone = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
    const r = this.root = E("div", "ws", document.body); r.setAttribute("role", "dialog"); r.setAttribute("aria-label", "Wardrobe studio");
    const top = E("div", "ws-top", r); E("b", "", top, "👗 Wardrobe studio"); this.msg = E("span", "ws-msg", top); this.msg.setAttribute("aria-live", "polite");
    const btn = (t: string, f: () => void, cls = "") => { const b = E("button", "ws-chip " + cls, top, t); b.type = "button"; b.onclick = f; return b; };
    btn("🎲 Randomize", () => this.randomize()).id = "ws-rand"; btn("↺ Reset", () => this.reset()).id = "ws-reset"; btn("Cancel", () => this.cancel()).id = "ws-cancel"; btn("Save", () => this.save(), "ws-save").id = "ws-save";
    const grid = E("div", "ws-grid", r), left = E("div", "ws-left", grid); left.id = "ws-left"; this.stageEl = E("div", "ws-stage", grid); this.stageEl.id = "ws-stage"; this.stageEl.setAttribute("role", "img"); this.stageEl.setAttribute("aria-label", "Live 3D preview of your avatar in front of an open wardrobe with mirrors. Drag to spin, scroll to zoom, tap a part to pick it.");
    this.hint = E("div", "ws-hint", this.stageEl, "Drag to spin · tap a part to edit it");
    this.secs = E("div", "ws-secs", left); this.secs.setAttribute("aria-label", "Sections");
    for (const id of Object.keys(REG)) { const b = E("button", "ws-chip", this.secs, REG[id].label); b.type = "button"; b.dataset.region = id; b.onclick = () => this.select(id, true); }
    this.tabs = E("div", "ws-tabs", left); this.tabs.setAttribute("role", "tablist");
    for (const t of ["Sections", "Paint", "Jewelry", "Shoes", "Weather", "Bag", "Body"]) { const b = E("button", "ws-chip", this.tabs, t); b.type = "button"; b.dataset.tab = t; b.setAttribute("role", "tab"); b.onclick = () => { this.tab = t; this.render(); }; }
    this.body = E("div", "ws-bd", left); this.bindStage();
    r.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") this.cancel(); }); r.addEventListener("pointerdown", (e) => e.stopPropagation());
  }
  get isOpen() { return this.root.classList.contains("show"); }
  open(region?: string, tab?: string) {
    if (this.isOpen) return; this.spec = this.load(); this.orig = JSON.stringify(this.spec); this.dirty = false; this.hist.clear(); if (region) this.region = region; if (tab) this.tab = tab; this.msg.textContent = "";
    this.h.onOpen(); this.root.classList.add("show");
    try { this.stage = new StudioStage(this.h.renderer, this.h.style(), this.spec, this.h.mobile); } catch (e) { this.msg.textContent = "3D preview is not available on this device."; console.warn(e); }
    this.stage?.char.highlight(this.region); this.render(); this.last = performance.now(); this.raf = requestAnimationFrame(this.loop);
    (this.root.querySelector("#ws-save") as HTMLElement)?.focus({ preventScroll: true });
  }
  private load(): AvatarSpec { const s = normalizeAvatar({ ...Social.profile.avatar, name: Social.profile.name || Social.profile.avatar.name }); s.closet = padCloset(s.closet && s.closet.some(Boolean) ? s.closet : starterCloset(s)); s.favs = [...(s.favs ?? [])]; return s; }
  /** close without saving the working changes */
  cancel() { this.close(); }
  close() {
    if (!this.isOpen) return; cancelAnimationFrame(this.raf); this.raf = 0; this.stage?.dispose(); this.stage = null; this.flat = null; this.root.classList.remove("show");
    const r = this.h.renderer; r.setScissorTest(false); r.setViewport(0, 0, r.domElement.clientWidth, r.domElement.clientHeight); this.h.onClose();
  }
  save() {
    const name = (this.spec.name ?? "").trim().slice(0, 14) || "Student", twin = ROSTER.find((n) => signature(n.spec) === signature(this.spec));
    if (twin) { this.msg.textContent = `${twin.first} already looks exactly like this. Change one thing to make it yours.`; return; }
    this.spec.name = name; Social.setProfile({ name, avatar: { ...this.spec, name }, hasAvatar: true }); this.h.onSave({ ...this.spec }); this.close();
  }
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop); const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; const st = this.stage; if (!st) return;
    if (this.pend) { this.pend = false; st.setSpec(this.spec); st.char.highlight(this.region); }
    st.update(dt); const b = this.stageEl.getBoundingClientRect(); if (b.width > 8 && b.height > 8) st.render({ x: b.left, y: b.top, w: b.width, h: b.height });
    if (this.flat && this.brush.flat) this.drawFlat();
  };
  /** every input lands here: the 3D character updates on the next frame */
  changed() { this.dirty = true; this.pend = true; }
  /* ---------------------------------------------------------------- spec edits */
  private reg(id: string): RegionSpec { const r = (this.spec.regions ??= {}); return (r[id] ??= {}); }
  private setColor(id: string, c: string | null) {
    const R = REG[id], s: any = this.spec, rg = this.reg(id);
    if (c === "rainbow") { rg.c = "rainbow"; s[R.col] = s[R.col] && s[R.col] !== "rainbow" ? s[R.col] : "#e8789a"; }
    else { delete rg.c; s[R.col] = c; }
    if (id === "jewelry.neck" && c && s.neckwear === "none") s.neckwear = "necklace";
    if (id === "jewelry.wrists" && c && s.wrist === "none") s.wrist = "bracelet";
    if (id === "outer" && c && s.outer === "none") s.outer = "cardigan";
    if (id === "hat" && c && s.hat === "none") s.hat = "cap";
    this.changed();
  }
  private colorOf(id: string): string | null { const rg = this.spec.regions?.[id]; return rg?.c ?? ((this.spec as any)[REG[id].col] as string | null); }
  private patch(p: Partial<AvatarSpec>) { Object.assign(this.spec, p); this.changed(); }
  private select(id: string, openEditor = false) {
    this.region = id; this.stage?.char.highlight(id); if (openEditor && !["Sections", "Paint", "Jewelry", "Shoes", "Bag"].includes(this.tab)) this.tab = "Sections";
    if (openEditor && this.tab === "Jewelry") this.tab = "Sections"; this.render();
  }
  private randomize() { const s = this.spec; this.spec = { ...randomAvatar(rng(Date.now() & 0xffffff), s.age), prop: s.prop, name: s.name, closet: padCloset(s.closet), favs: s.favs ?? [], regions: {} }; this.hist.clear(); this.changed(); this.render(); }
  private reset() { const s = this.spec; this.spec = { ...defaultAvatar(), name: s.name, prop: defaultProp(s.age), age: s.age, closet: padCloset(s.closet), favs: s.favs ?? [], regions: {} }; this.hist.clear(); this.changed(); this.render(); }
  private weather(k: string) {
    const w = WEATHER[k]; this.patch({ ...w.p }); for (const id of ["top", "outer", "bottom", "shoes", "hat"]) delete this.spec.regions?.[id];
    this.render();
  }
  /* ---------------------------------------------------------------- panel widgets */
  private chips(label: string, cur: string | null | undefined, list: { id: string; label: string }[], pick: (id: string) => void, scroll = false) {
    E("div", "ws-lab", this.body, label); const row = E("div", "ws-row", this.body); if (scroll) row.style.cssText = "max-height:150px;overflow-y:auto;overscroll-behavior:contain";
    for (const o of list) { const b = E("button", "ws-chip" + (cur === o.id ? " on" : ""), row, o.label); b.type = "button"; b.setAttribute("aria-pressed", String(cur === o.id)); b.onclick = () => { pick(o.id); this.render(false); }; }
  }
  private key(label: string, k: Key, list = opts(k as any), scroll = true) { this.chips(label, this.spec[k] as string, list, (id) => this.patch({ [k]: id } as any), scroll); }
  private swatches(label: string, cur: string | null | undefined, pal: string[], pick: (c: string | null) => void, o: { none?: string; rainbow?: boolean } = {}) {
    E("div", "ws-lab", this.body, label); const row = E("div", "ws-row", this.body);
    if (o.none) { const b = E("button", "ws-sw none" + (cur == null ? " on" : ""), row); b.type = "button"; b.title = o.none; b.setAttribute("aria-label", o.none); b.onclick = () => { pick(null); this.render(false); }; }
    for (const c of pal) { const rb = c === "rainbow", name = METALS.find((m) => m[1] === c)?.[0] ?? c, b = E("button", "ws-sw" + (rb ? " rb" : "") + (cur === c ? " on" : ""), row); b.type = "button"; if (!rb) b.style.background = c; b.title = name; b.setAttribute("aria-label", name); b.onclick = () => { pick(c); this.render(false); }; }
    const inp = E("input", "", row) as HTMLInputElement; inp.type = "color"; inp.value = /^#[0-9a-f]{6}$/i.test(cur ?? "") ? cur! : "#d9564a"; inp.setAttribute("aria-label", "Custom colour"); inp.oninput = () => pick(inp.value); inp.onchange = () => this.render(false);
  }
  private slider(label: string, min: number, max: number, get: () => number, set: (v: number) => void, step = 0.01) {
    const l = E("div", "ws-lab", this.body, label), v = E("span", "ws-val", l, get().toFixed(2)), i = E("input", "", this.body) as HTMLInputElement;
    i.type = "range"; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(get()); i.setAttribute("aria-label", label); i.oninput = () => { set(Number(i.value)); v.textContent = Number(i.value).toFixed(2); this.changed(); };
  }
  private head(t: string) { E("div", "ws-sec", this.body, t); }
  private note(t: string) { const p = E("p", "", this.body, t); p.style.cssText = "font-size:13px;color:#6b5a50;margin:4px 0"; }
  /** colour, pattern, width and length for one section */
  private regionBlock(id: string) {
    const R = REG[id], s: any = this.spec; this.head(R.label);
    if (id === "outer" && s.outer === "none") { this.key("Pick a jacket to start", "outer"); return; }
    if (id === "hat" && s.hat === "none") { this.key("Pick a hat to start", "hat"); return; }
    if (id === "jewelry.neck" && s.neckwear === "none") { this.key("Pick a necklace or neckwear", "neckwear"); return; }
    if (id === "jewelry.wrists" && s.wrist === "none") { this.key("Pick a wrist piece", "wrist"); return; }
    this.swatches("Colour", this.colorOf(id), R.pal, (c) => this.setColor(id, c), { none: R.none ? "None" : undefined });
    if (R.pat) {
      this.chips("Pattern", s[R.pat[0]] ?? "solid", PATTERNS, (p) => this.patch({ [R.pat![0]]: p } as any));
      if ((s[R.pat[0]] ?? "solid") !== "solid") this.swatches("Pattern colour", s[R.pat[1]], CLOTH_COLORS, (c) => this.patch({ [R.pat![1]]: c } as any));
    } else if (R.paint) {
      this.chips("Pattern", this.spec.regions?.[id]?.pat ?? "solid", PATTERNS, (p) => this.stampPattern(id, p));
      if ((this.spec.regions?.[id]?.pat ?? "solid") !== "solid") this.swatches("Pattern colour", this.stamp2, CLOTH_COLORS, (c) => { this.stamp2 = c!; this.stampPattern(id, this.spec.regions![id].pat!); });
    }
    if (R.wl) {
      const lim = REGION_LIMITS, g = (k: "w" | "l") => this.spec.regions?.[id]?.[k] ?? 1;
      this.slider(`${R.wl[0]} (narrow to wide)`, lim.min, lim.max, () => g("w"), (v) => { this.reg(id).w = v; });
      if (R.wl[1]) this.slider(`${R.wl[1]} (short to long)`, lim.min, lim.max, () => g("l"), (v) => { this.reg(id).l = v; });
    }
    if (R.paint) { const b = E("button", "ws-chip", this.body, "🖌️ Paint on it"); b.type = "button"; b.onclick = () => { this.tab = "Paint"; this.brush.on = true; this.render(); }; }
  }
  render(scrollTop = true) {
    const y = this.body.scrollTop; this.body.innerHTML = "";
    this.secs.querySelectorAll<HTMLElement>("[data-region]").forEach((b) => { const on = b.dataset.region === this.region; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    this.tabs.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => { const on = b.dataset.tab === this.tab; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    this.stageEl.classList.toggle("paint", this.tab === "Paint" && this.brush.on);
    const t = this.tab, s = this.spec;
    if (t === "Sections") { this.note("Tap the avatar or a section above. It glows while you edit it."); this.regionBlock(this.region); }
    else if (t === "Paint") this.paintPanel();
    else if (t === "Jewelry") this.jewelry();
    else if (t === "Shoes") {
      const list = opts("shoeStyle"), first = SHOES_FIRST.map((id) => list.find((o) => o.id === id)!).filter(Boolean);
      this.chips("Shoe style", s.shoeStyle, first.concat(list.filter((o) => !SHOES_FIRST.includes(o.id))), (id) => this.patch({ shoeStyle: id }));
      this.swatches("Sole / accent colour", s.shoes2, SHOE_COLORS.concat(CLOTH_COLORS), (c) => this.patch({ shoes2: c }), { none: "Default" }); this.regionBlock("shoes");
      this.key("Socks", "socks");
    } else if (t === "Weather") {
      this.head("Dress for the weather"); const row = E("div", "ws-row", this.body);
      for (const [k, w] of Object.entries(WEATHER)) { const b = E("button", "ws-chip", row, `${w.icon} ${w.label}`); b.type = "button"; b.dataset.weather = k; b.onclick = () => this.weather(k); }
      this.head("Swap a piece");
      this.key("Jacket", "outer"); this.key("Top", "top"); this.key("Bottom", "bottom"); this.key("Hat", "hat"); this.key("Shoes", "shoeStyle");
      this.swatches("Scarf", s.scarf, CLOTH_COLORS, (c) => this.patch({ scarf: c }), { none: "No scarf" });
    } else if (t === "Bag") {
      this.key("Bag design", "packStyle", opts("packStyle"), false);
      if (s.packStyle !== "none") {
        this.regionBlock("backpack"); this.swatches("Straps / pocket", s.pack2, CLOTH_COLORS, (c) => this.patch({ pack2: c }), { none: "Automatic" });
        this.swatches("Patch on the bag", s.badge, CLOTH_COLORS, (c) => this.patch({ badge: c }), { none: "No patch" }); this.swatches("Charm", s.packCharm, METAL_HEX.concat(CLOTH_COLORS), (c) => this.patch({ packCharm: c }), { none: "No charm" });
      }
    } else this.bodyPanel();
    this.body.scrollTop = scrollTop ? 0 : y;
  }
  private jewelry() {
    const s = this.spec, old = OLDER(s.age);
    if (!old) this.note("Tip: some jewelry looks best from middle school up, but you can try anything.");
    this.head("Necklace"); this.key("Style", "neckwear", opts("neckwear")); if (s.neckwear !== "none") this.regionBlockLite("jewelry.neck");
    this.head("Earrings"); this.key("Style", "earStyle", opts("earStyle"), false); this.swatches("Colour", s.earrings, JEWEL, (c) => this.setColor("jewelry.ears", c), { none: "None" });
    this.head("Bracelet and watch"); this.key("Style", "wrist", opts("wrist"), false); if (s.wrist !== "none") this.regionBlockLite("jewelry.wrists");
    this.head("Rings"); this.swatches("Colour", s.rings, JEWEL, (c) => this.setColor("jewelry.fingers", c), { none: "None" }); if (s.rings) this.slider("Ring size", REGION_LIMITS.min, REGION_LIMITS.max, () => this.spec.regions?.["jewelry.fingers"]?.w ?? 1, (v) => { this.reg("jewelry.fingers").w = v; });
    this.head("Glasses"); this.key("Style", "glasses", opts("glasses")); if (s.glasses !== "none") this.swatches("Frame colour", s.glassColor, ["#5b4048", "#313a3f", "#d9564a", "#4f91c7", "#b8a8da", "#eab94e", "#ffffff", "#3fb8af"], (c) => this.patch({ glassColor: c! }));
    this.head("Hat, headband and hair clips"); this.key("Style", "hat", opts("hat")); if (s.hat !== "none") this.regionBlockLite("hat", true);
    this.swatches("Hair clip", s.clip, CLOTH_COLORS, (c) => this.patch({ clip: c }), { none: "None" });
    this.head("Scarf and badge"); this.swatches("Scarf", s.scarf, CLOTH_COLORS, (c) => this.patch({ scarf: c }), { none: "None" }); this.swatches("Badge", s.badge, CLOTH_COLORS, (c) => this.patch({ badge: c }), { none: "None" });
    this.head("Bag charm"); this.swatches("Charm colour", s.packCharm, METAL_HEX.concat(CLOTH_COLORS), (c) => this.patch({ packCharm: c }), { none: "No charm" });
  }
  /** colour + size only, for the jewelry list */
  private regionBlockLite(id: string, both = false) {
    const R = REG[id]; this.swatches("Colour", this.colorOf(id), R.pal, (c) => this.setColor(id, c));
    this.slider(both ? "Hat width" : "Size", REGION_LIMITS.min, REGION_LIMITS.max, () => this.spec.regions?.[id]?.w ?? 1, (v) => { this.reg(id).w = v; });
    if (both) this.slider("Hat height", REGION_LIMITS.min, REGION_LIMITS.max, () => this.spec.regions?.[id]?.l ?? 1, (v) => { this.reg(id).l = v; });
  }
  private bodyPanel() {
    const s = this.spec; this.head("Body and hair"); this.note("Faces, eyes and facial hair live in the Mirror.");
    this.key("Hair style", "hairStyle"); this.key("Hair texture", "htex", opts("htex"), false); this.swatches("Hair colour", s.hair, HAIR_COLORS, (c) => this.setColor("hair", c)); this.swatches("Skin tone", s.skin, SKIN_TONES, (c) => this.setColor("skin", c));
    this.swatches("Eye colour", s.eyeColor, EYE_COLORS, (c) => this.patch({ eyeColor: c! })); this.key("Build", "build", opts("build"), false);
    const sl = (l: string, k: "height" | "headSize" | "shoulder" | "waist" | "hips" | "limbs", a: number, b: number) => this.slider(l, a, b, () => Number(this.spec[k] ?? 1), (v) => { (this.spec as any)[k] = v; });
    sl("Height", "height", 0.9, 1.1); sl("Head size", "headSize", 0.8, 1.25); sl("Shoulders", "shoulder", 0.8, 1.25); sl("Waist", "waist", 0.8, 1.3); sl("Hips", "hips", 0.85, 1.3); sl("Arm and leg length", "limbs", 0.88, 1.15);
  }
  /* ---------------------------------------------------------------- paint */
  private paintable() { return !!REG[this.region]?.paint; }
  private paintPanel() {
    const id = this.region, b = this.brush; this.head("Paint brush");
    if (!this.paintable()) { this.note("Pick hair, a top, jacket, bottom, shoes, bag or hat to paint it (tap it on the avatar)."); const row = E("div", "ws-row", this.body); for (const k of ["hair", "top", "outer", "bottom", "shoes", "backpack", "hat"]) { const c = E("button", "ws-chip", row, REG[k].label); c.type = "button"; c.onclick = () => this.select(k); } return; }
    this.note(`Painting: ${REG[id].label}. Drag on the avatar to draw right on it.`);
    const row = E("div", "ws-row", this.body), tool = (t: string, f: () => void, on = false, idn = "") => { const c = E("button", "ws-chip" + (on ? " on" : ""), row, t); c.type = "button"; c.onclick = f; if (idn) c.id = idn; return c; };
    tool("🖌️ Brush", () => { b.on = true; b.erase = false; this.render(false); }, b.on && !b.erase, "ws-brush"); tool("🧽 Eraser", () => { b.on = true; b.erase = true; this.render(false); }, b.on && b.erase, "ws-erase"); tool("🔄 Spin", () => { b.on = false; this.render(false); }, !b.on);
    const row2 = E("div", "ws-row", this.body), act = (t: string, f: () => void, idn: string) => { const c = E("button", "ws-chip", row2, t); c.type = "button"; c.id = idn; c.onclick = f; };
    act("↶ Undo", () => this.undo(id), "ws-undo"); act("↷ Redo", () => this.redo(id), "ws-redo"); act("🪣 Fill", () => this.fill(id), "ws-fill"); act("🗑️ Clear", () => this.clearPaint(id), "ws-clear");
    this.swatches("Brush colour", b.color, PAL_BRUSH, (c) => { b.color = c!; }); this.slider("Brush size", 4, 60, () => b.size, (v) => { b.size = v; this.dirty = true; }, 1); this.slider("Opacity", 0.1, 1, () => b.alpha, (v) => { b.alpha = v; });
    const fl = E("button", "ws-chip" + (b.flat ? " on" : ""), this.body, "🗺️ Flat canvas view"); fl.type = "button"; fl.onclick = () => { b.flat = !b.flat; this.render(false); };
    if (b.flat) this.flatView(id); else this.flat = null;
  }
  private canvasOf(id: string): HTMLCanvasElement | null { const st = this.stage; if (!st) return null; if (this.pend) { this.pend = false; st.setSpec(this.spec); st.char.highlight(this.region); } const t = st.char.paintTexture(id); return t.image as HTMLCanvasElement; }
  private snap(id: string) { const cv = this.canvasOf(id); if (!cv) return; const h = this.hist.get(id) ?? this.hist.set(id, { undo: [], redo: [] }).get(id)!; h.undo.push(cv.getContext("2d")!.getImageData(0, 0, cv.width, cv.height)); if (h.undo.length > 15) h.undo.shift(); h.redo = []; }
  private commit(id: string) {
    const st = this.stage, cv = this.canvasOf(id); if (!st || !cv) return; const tex = st.char.paintTexture(id); tex.needsUpdate = true;
    const d = cv.getContext("2d")!.getImageData(0, 0, cv.width, cv.height).data; let any = false; for (let i = 3; i < d.length; i += 64) if (d[i] > 0) { any = true; break; }
    const rg = this.reg(id); if (any) rg.paint = st.char.exportPaint(id) ?? undefined; else { delete rg.paint; delete rg.pat; } this.dirty = true; this.pend = true;
  }
  private swap(id: string, from: "undo" | "redo", to: "undo" | "redo") {
    const h = this.hist.get(id), cv = this.canvasOf(id); const im = h?.[from].pop(); if (!h || !cv || !im) return; const g = cv.getContext("2d")!; h[to].push(g.getImageData(0, 0, cv.width, cv.height)); g.putImageData(im, 0, 0); this.commit(id);
  }
  undo(id = this.region) { this.swap(id, "undo", "redo"); } redo(id = this.region) { this.swap(id, "redo", "undo"); }
  fill(id = this.region) { const cv = this.canvasOf(id); if (!cv) return; this.snap(id); const g = cv.getContext("2d")!; g.globalAlpha = this.brush.alpha; g.fillStyle = this.brush.color; g.fillRect(0, 0, cv.width, cv.height); g.globalAlpha = 1; this.commit(id); }
  clearPaint(id = this.region) { const cv = this.canvasOf(id); if (!cv) return; this.snap(id); cv.getContext("2d")!.clearRect(0, 0, cv.width, cv.height); this.commit(id); }
  /** draw a segment (canvas px) with the current brush */
  private dab(id: string, x0: number, y0: number, x1: number, y1: number) {
    const cv = this.canvasOf(id); if (!cv) return; const g = cv.getContext("2d")!, b = this.brush; g.save(); g.globalAlpha = b.alpha; g.globalCompositeOperation = b.erase ? "destination-out" : "source-over"; g.strokeStyle = g.fillStyle = b.color; g.lineWidth = b.size; g.lineCap = g.lineJoin = "round";
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 + 0.01, y1); g.stroke(); g.restore(); this.stage!.char.paintTexture(id).needsUpdate = true;
  }
  private stampPattern(id: string, pat: string) {
    const cv = this.canvasOf(id); if (!cv) return; this.snap(id); const g = cv.getContext("2d")!, W = cv.width, c1 = this.colorOf(id) && this.colorOf(id) !== "rainbow" ? this.colorOf(id)! : "#ffffff", c2 = this.stamp2; g.clearRect(0, 0, W, W);
    g.fillStyle = c2; g.strokeStyle = c2;
    if (pat === "stripes") for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 28, W);
    else if (pat === "dots") for (let y = 32; y < W; y += 64) for (let x = 32 + ((y / 64) % 2) * 32; x < W + 32; x += 64) { g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); }
    else if (pat === "plaid") { g.globalAlpha = 0.55; for (let x = 0; x < W; x += 85) g.fillRect(x, 0, 26, W); for (let y = 0; y < W; y += 85) g.fillRect(0, y, W, 26); g.globalAlpha = 1; }
    else if (pat === "floral") for (let y = 40; y < W; y += 110) for (let x = 40 + ((y / 110) % 2) * 55; x < W + 40; x += 110) { for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.2566) * 13, y + Math.sin(k * 1.2566) * 13, 10, 0, 7); g.fill(); } g.fillStyle = c1; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillStyle = c2; }
    else if (pat === "stars") for (let y = 40; y < W; y += 100) for (let x = 40 + ((y / 100) % 2) * 50; x < W + 40; x += 100) { g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 8 : 20, a = (k * Math.PI) / 5 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
    else if (pat === "gradient") { const gr = g.createLinearGradient(0, 0, 0, W); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
    this.commit(id); const rg = this.reg(id); if (pat === "solid") { delete rg.paint; delete rg.pat; } else rg.pat = pat; this.render(false);
  }
  private flatView(id: string) {
    const cv = E("canvas", "ws-flat", this.body); cv.width = cv.height = 256; this.flat = cv; cv.setAttribute("aria-label", "Flat paint canvas"); let down = false, last: [number, number] | null = null;
    const pt = (e: PointerEvent): [number, number] => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 512, ((e.clientY - r.top) / r.height) * 512]; };
    cv.onpointerdown = (e) => { if (!this.brush.on) this.brush.on = true; down = true; cv.setPointerCapture(e.pointerId); this.snap(id); last = pt(e); this.dab(id, last[0], last[1], last[0], last[1]); };
    cv.onpointermove = (e) => { if (!down || !last) return; const p = pt(e); this.dab(id, last[0], last[1], p[0], p[1]); last = p; };
    cv.onpointerup = cv.onpointercancel = () => { if (down) { down = false; this.commit(id); } };
  }
  private drawFlat() { const src = this.canvasOf(this.region); if (!src || !this.flat) return; const g = this.flat.getContext("2d")!; g.clearRect(0, 0, 256, 256); g.drawImage(src, 0, 0, 256, 256); }
  /* ---------------------------------------------------------------- stage pointer: spin / pick / paint / zoom */
  private bindStage() {
    const el = this.stageEl, ptrs = new Map<number, { x: number; y: number }>(); let moved = 0, painting = false, pinch = 0;
    const frac = (e: PointerEvent): [number, number] => { const r = el.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    const pick = (e: PointerEvent) => { const st = this.stage; if (!st) return null; const [fx, fy] = frac(e); st.camera.updateMatrixWorld(); return st.char.pick(st.ray(fx, fy)); };
    const paintAt = (e: PointerEvent, first: boolean) => {
      const h = pick(e), id = this.region; if (!h || h.region !== id) { this.stroke = null; return; } const x = h.u * 512, y = (1 - h.v) * 512;
      if (first || !this.stroke || Math.hypot(x - this.stroke.x, y - this.stroke.y) > 200) this.dab(id, x, y, x, y); else this.dab(id, this.stroke.x, this.stroke.y, x, y); this.stroke = { id, x, y };
    };
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.stage?.setDragging(true); moved = 0; painting = false;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); return; }
      if (this.tab === "Paint" && this.brush.on && this.paintable()) { const h = pick(e); if (h && h.region === this.region) { painting = true; this.snap(this.region); this.stroke = null; paintAt(e, true); } }
    });
    el.addEventListener("pointermove", (e) => {
      const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) this.stage?.zoomBy(pinch / d); pinch = d; moved += 99; return; }
      moved += Math.abs(dx) + Math.abs(e.movementY || 0); if (painting) paintAt(e, false); else this.stage?.spinBy(dx * 0.012);
    });
    const up = (e: PointerEvent) => {
      if (!ptrs.delete(e.pointerId)) return; if (painting) { painting = false; this.commit(this.region); this.stroke = null; }
      else if (e.type === "pointerup" && moved < 6 && ptrs.size === 0) { const h = pick(e); if (h) this.select(h.region, true); }
      if (!ptrs.size) { this.stage?.setDragging(false); pinch = 0; }
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", (e) => { e.preventDefault(); this.stage?.zoomBy(Math.exp(Math.max(-200, Math.min(200, e.deltaY)) * 0.0012)); }, { passive: false });
  }
}
