/** Wardrobe tab: category rail + lazy thumbnail cards (each card is the avatar wearing one item), ready-made sets, favourites, random outfit and undo. */
import { drawChar, proportionScale } from "./rig";
import { PORTRAIT_SCALE } from "./characters";
import { CLOSET_SLOTS, CLOTH_COLORS, JEWEL_COLORS, OLDER, OPTIONS, SHOE_COLORS, outfitOf, padCloset, randomOutfit, rng, toLook, wearOutfit, type AvatarSpec, type Outfit } from "./avatar";

type Zoom = "full" | "head" | "torso" | "legs";
interface Item { id: string; label: string; val: string | null }
interface Group { title: string; key: keyof AvatarSpec; ck?: keyof AvatarSpec; pal: string[]; items: Item[]; zoom: Zoom; nullable?: boolean }
interface WSet { id: string; name: string; o: Outfit }

export const WARDROBE_CSS = `
.uw-head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
.uw-msg{font-size:12px;color:var(--soft,#8A7A70)}
.uw-lay{display:grid;grid-template-columns:104px 1fr;gap:10px;align-items:start}
.uw-rail{display:flex;flex-direction:column;gap:5px;position:sticky;top:0}
.uw-rail .uav-chip{text-align:left}
@media(max-width:760px){.uw-lay{grid-template-columns:1fr}.uw-rail{flex-direction:row;overflow-x:auto;position:static}}
.uw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin-bottom:8px}
.uw-card{position:relative;display:flex;flex-direction:column;gap:3px}
.uw-main{display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;padding:4px 4px 5px;border-radius:12px;border:2px solid transparent;background:#FFF9F0;color:inherit;cursor:pointer;box-shadow:0 2px 0 var(--kraft-edge,#C9B28A);font-size:12px;line-height:1.15}
.uw-main canvas{width:100%;max-width:96px;aspect-ratio:4/5;background:linear-gradient(#EAF1E8,#C9DCCB);border-radius:9px}
.uw-main:hover{background:#fff}
.uw-main:focus-visible{outline:3px solid var(--acc,#E07A66);outline-offset:2px}
.uw-main[aria-pressed=true]{border-color:var(--acc,#E07A66);background:#FFEFE6}
.uw-heart{position:absolute;top:2px;right:2px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(255,255,255,.85);cursor:pointer;font-size:15px;line-height:26px;padding:0;color:#9a8a80}
.uw-heart[aria-pressed=true]{color:#d9456a}
.uw-heart:focus-visible{outline:3px solid var(--acc,#E07A66)}
.uw-sets{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}
.uw-sets .uw-main canvas{max-width:120px}
.uw-acts{display:flex;gap:4px;justify-content:center;flex-wrap:wrap}
.uw-acts .uav-chip{font-size:11px;padding:3px 7px;min-height:26px}
`;

const fromOpts = (key: string, k: keyof typeof OPTIONS, f?: (id: string) => boolean): Item[] => OPTIONS[k].filter((x) => !f || f(x.id)).map((x) => ({ id: `${key}:${x.id}`, label: x.label, val: x.id }));
const nul = (key: string, label: string): Item[] => [{ id: `${key}:none`, label: "None", val: null }, { id: `${key}:on`, label, val: "on" }];
const GLASS_COLORS = ["#5b4048", "#313a3f", "#d9564a", "#4f91c7", "#b8a8da", "#eab94e", "#ffffff", "#3fb8af"];
const CATS = ["Tops", "Bottoms", "Shoes", "Hats", "Glasses", "Bags", "Neckwear", "Extras", "Sets", "Favourites"];

function groupsOf(cat: string, a: AvatarSpec): Group[] {
  const old = OLDER(a.age);
  switch (cat) {
    case "Tops": return [{ title: "Top", key: "top", ck: "shirt", pal: CLOTH_COLORS, items: fromOpts("top", "top"), zoom: "torso" }];
    case "Bottoms": return [{ title: "Bottoms", key: "bottom", ck: "pants", pal: CLOTH_COLORS, items: fromOpts("bottom", "bottom"), zoom: "full" }];
    case "Shoes": return [{ title: "Shoes", key: "shoeStyle", ck: "shoes", pal: SHOE_COLORS, items: fromOpts("shoeStyle", "shoeStyle"), zoom: "legs" }, { title: "Socks", key: "socks", ck: "sockColor", pal: CLOTH_COLORS, items: fromOpts("socks", "socks"), zoom: "legs" }];
    case "Hats": return [{ title: "Hat", key: "hat", ck: "hatColor", pal: CLOTH_COLORS, items: fromOpts("hat", "hat"), zoom: "head" }];
    case "Glasses": return [{ title: "Glasses", key: "glasses", ck: "glassColor", pal: GLASS_COLORS, items: fromOpts("glasses", "glasses"), zoom: "head" }];
    case "Bags": return [{ title: "Bag", key: "packStyle", ck: "pack", pal: CLOTH_COLORS, items: fromOpts("packStyle", "packStyle"), zoom: "full" }];
    case "Neckwear": return [{ title: "Neckwear", key: "neckwear", ck: "neckColor", pal: [...JEWEL_COLORS, ...CLOTH_COLORS], items: fromOpts("neckwear", "neckwear", (id) => id !== "necklace" || old), zoom: "head" }];
    case "Extras": {
      const g: Group[] = [
        { title: "Special extra", key: "extra", ck: "extraColor", pal: [...JEWEL_COLORS, ...CLOTH_COLORS], items: fromOpts("extra", "extra"), zoom: "full" },
        { title: "Scarf", key: "scarf", pal: CLOTH_COLORS, items: nul("scarf", "Scarf"), zoom: "head", nullable: true },
        { title: "Badge", key: "badge", pal: CLOTH_COLORS, items: nul("badge", "Badge"), zoom: "full", nullable: true },
        { title: "Chest emblem", key: "emblem", pal: [], items: fromOpts("emblem", "emblem"), zoom: "full" },
      ];
      if (old) g.push({ title: "Earrings", key: "earrings", pal: JEWEL_COLORS, items: nul("earrings", "Earrings"), zoom: "head", nullable: true }, { title: "Wrist", key: "wrist", ck: "wristColor", pal: JEWEL_COLORS, items: fromOpts("wrist", "wrist"), zoom: "full" });
      return g;
    }
  }
  return [];
}

const BLANK = { pattern: "solid", shirt2: "#fff6ea", socks: "none", hat: "none", neckwear: "none", emblem: "none", extra: "none", scarf: null, badge: null, wrist: "none" };
const S = (id: string, name: string, p: Omit<Outfit, "name">): WSet => ({ id: `set:${id}`, name, o: { ...BLANK, ...p, name } });
export const SETS: WSet[] = [
  S("school", "School day", { top: "polo", shirt: "#4f91c7", bottom: "pants", pants: "#2b3a55", shoeStyle: "sneaker", shoes: "#fbf6ee", socks: "ankle", sockColor: "#fff6ea", packStyle: "pack", pack: "#d9564a" }),
  S("sporty", "Sporty", { top: "jersey", shirt: "#4f91c7", bottom: "joggers", pants: "#2b3a55", shoeStyle: "hightop", shoes: "#fbf6ee", socks: "tall", sockColor: "#fff6ea", hat: "visor", hatColor: "#d9564a", wrist: "band", wristColor: "#d9564a" }),
  S("cozy", "Cozy", { top: "cableknit", shirt: "#f6b294", bottom: "leggings", pants: "#4a3b3f", shoeStyle: "slipper", shoes: "#b8a8da", hat: "beanie", hatColor: "#8173ae", scarf: "#eab94e" }),
  S("fancy", "Fancy", { top: "blazer", shirt: "#2b3a55", bottom: "pleated", pants: "#4a3b3f", shoeStyle: "loafer", shoes: "#313a3f", socks: "ankle", sockColor: "#fff6ea", neckwear: "bowtie", neckColor: "#d9564a", wrist: "watch", wristColor: "#d9d4cc" }),
  S("rainy", "Rainy day", { top: "raincoat", shirt: "#eab94e", bottom: "jeans", pants: "#4f5d75", shoeStyle: "rainboot", shoes: "#eab94e", hat: "bucket", hatColor: "#eab94e" }),
  S("science", "Science lab", { top: "labcoat", shirt: "#fff6ea", shirt2: "#8fc9e8", bottom: "pants", pants: "#4a3b3f", shoeStyle: "sneaker", shoes: "#313a3f", neckwear: "lanyard", neckColor: "#4f91c7", badge: "#eab94e", glasses: "square", glassColor: "#313a3f" }),
  S("artist", "Artist", { top: "apron", shirt: "#f8d977", shirt2: "#fff6ea", bottom: "capri", pants: "#4f5d75", shoeStyle: "sandal", shoes: "#9a653d", hat: "beret", hatColor: "#d9564a", neckwear: "bandana", neckColor: "#4f91c7" }),
  S("explorer", "Explorer", { top: "vest", shirt: "#88b89a", bottom: "cargo", pants: "#9a653d", shoeStyle: "boot", shoes: "#9a653d", socks: "tall", sockColor: "#fff6ea", hat: "sunhat", hatColor: "#f8d977", neckwear: "bandana", neckColor: "#d9564a", packStyle: "messenger", pack: "#9a653d" }),
  S("stage", "Stage star", { top: "blazer", shirt: "#8173ae", shirt2: "#f8d977", pattern: "stars", bottom: "leggings", pants: "#2b3a55", shoeStyle: "hightop", shoes: "#eab94e", extra: "sparkles", extraColor: "#eab94e", emblem: "star", glasses: "sun", glassColor: "#313a3f" }),
  S("garden", "Garden helper", { top: "overalls", shirt: "#5e9c72", shirt2: "#fff6ea", bottom: "shorts", pants: "#9a653d", shoeStyle: "rainboot", shoes: "#88b89a", hat: "sunhat", hatColor: "#f8d977", packStyle: "none" }),
  S("winter", "Winter", { top: "puffer", shirt: "#326c9e", bottom: "pants", pants: "#2b3a55", shoeStyle: "boot", shoes: "#9a653d", socks: "tall", sockColor: "#fff6ea", hat: "beanie", hatColor: "#d9564a", scarf: "#fff6ea" }),
  S("summer", "Summer", { top: "tank", shirt: "#eab94e", bottom: "shorts", pants: "#4f91c7", shoeStyle: "sandal", shoes: "#9a653d", hat: "sunhat", hatColor: "#f8d977", glasses: "sun", glassColor: "#313a3f", packStyle: "mini", pack: "#f28f7e" }),
  S("party", "Party dress", { top: "dress", shirt: "#eaa5b2", bottom: "pants", pants: "#4f5d75", shoeStyle: "loafer", shoes: "#fbf6ee", hat: "bow", hatColor: "#d9564a", emblem: "heart" }),
  S("hero", "Superhero", { top: "tee", shirt: "#4f91c7", bottom: "bike", pants: "#d9564a", shoeStyle: "hightop", shoes: "#d9564a", extra: "cape", extraColor: "#d9564a", emblem: "bolt", wrist: "band", wristColor: "#eab94e" }),
  S("camp", "Campfire", { top: "flannel", shirt: "#d9564a", bottom: "jeans", pants: "#326c9e", shoeStyle: "boot", shoes: "#9a653d", socks: "tall", sockColor: "#fff6ea", hat: "beanie", hatColor: "#2b3a55", packStyle: "pack", pack: "#5e9c72" }),
];

const THUMB_BASE: Record<string, any> = { outer: "none", pantsPattern: "solid", trim: null, pantsTrim: null, outerTrim: null, shoes2: null, hat2: null, pack2: null, top: "tee", shirt: "#8fc9e8", shirt2: "#fff6ea", pattern: "solid", bottom: "pants", pants: "#4f5d75", shoeStyle: "sneaker", shoes: "#fbf6ee", socks: "none", packStyle: "none", hat: "none", neckwear: "none", emblem: "none", extra: "none", scarf: null, badge: null, wrist: "none", earrings: null, glasses: "none" };
const cache = new Map<string, HTMLCanvasElement>();
const bodyKey = (a: AvatarSpec) => [a.skin, a.hairStyle, a.hair, a.hair2, a.htex, a.age, a.build, a.faceShape, a.headSize, a.height, a.prop, a.shoulder, a.waist, a.hips, a.limbs].join(",");
function paintThumb(cv: HTMLCanvasElement, key: string, spec: AvatarSpec, zoom: Zoom) {
  let src = cache.get(key);
  if (!src) {
    if (cache.size > 600) cache.clear();
    src = document.createElement("canvas"); src.width = cv.width; src.height = cv.height; const c = src.getContext("2d")!; const k = (PORTRAIT_SCALE[spec.age] ?? 1) * (cv.width / 96);
    const [ty, s] = zoom === "head" ? [58 + 40 * 4.6 * k, 4.6 * k] : zoom === "torso" ? [62 + 24 * 3.6 * k, 3.6 * k] : zoom === "legs" ? [cv.height * 0.93, 7.5 * k] : [cv.height * 0.95, (2.36 * k) / Math.max(1, proportionScale(toLook(spec, 11))) ** 0.9];
    c.translate(cv.width / 2, ty); c.scale(s, s); drawChar(c, 0, 0, { ...toLook(spec, 11), dir: "down", moving: false, walk: 0, tag: false }, 0); cache.set(key, src);
  }
  cv.getContext("2d")!.drawImage(src, 0, 0);
}

export class Wardrobe {
  cat = "Tops"; private undo: Outfit[] = []; private host!: HTMLElement; private io?: IntersectionObserver; private lazy = new WeakMap<Element, () => void>();
  private msg = ""; private lastPush = 0; private boxes: { g: Group; box: HTMLElement }[] = []; private timer = 0; private msgEl?: HTMLElement;
  constructor(private ui: { spec: AvatarSpec }) {}
  private get spec() { return this.ui.spec; }
  private push() { this.undo.push(outfitOf(this.spec, "")); if (this.undo.length > 10) this.undo.shift(); }
  private pushSoon() { const n = Date.now(); if (n - this.lastPush > 800) this.push(); this.lastPush = n; }
  private patch(p: Partial<AvatarSpec>) { this.push(); this.lastPush = 0; this.ui.spec = { ...this.spec, ...p }; }
  private favs() { return this.spec.favs ?? []; }
  private say(m: string) { this.msg = m; if (this.msgEl) this.msgEl.textContent = m; }

  render(host: HTMLElement) { this.host = host; this.ui.spec.closet = padCloset(this.ui.spec.closet); this.build(); }
  private refresh() {
    const y = this.host.scrollTop, fid = (document.activeElement as HTMLElement | null)?.dataset?.wid; this.build(); this.host.scrollTop = y;
    if (fid) this.host.querySelector<HTMLElement>(`[data-wid="${CSS.escape(fid)}"]`)?.focus({ preventScroll: true });
  }
  private build() {
    this.io?.disconnect(); this.boxes = []; const h = this.host; h.innerHTML = "";
    this.io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { this.io!.unobserve(e.target); this.lazy.get(e.target)?.(); } }, { root: h, rootMargin: "120px" }) : undefined;
    const head = E("div", "uw-head", h);
    const rb = E("button", "uav-chip", head, "Random outfit"); rb.type = "button"; rb.onclick = () => { this.push(); this.ui.spec = wearOutfit(this.spec, randomOutfit(this.spec, rng(Date.now() & 0xffffff))); this.say("Random outfit!"); this.refresh(); };
    const ub = E("button", "uav-chip", head, `Undo (${this.undo.length})`); ub.type = "button"; ub.disabled = !this.undo.length; ub.onclick = () => { const o = this.undo.pop(); if (o) { this.ui.spec = wearOutfit(this.spec, o); this.say("Undone."); this.refresh(); } };
    this.msgEl = E("span", "uw-msg", head, this.msg); this.msgEl.setAttribute("aria-live", "polite");
    const lay = E("div", "uw-lay", h), rail = E("div", "uw-rail", lay), main = E("div", "", lay);
    for (const c of CATS) { const b = E("button", "uav-chip" + (c === this.cat ? " on" : ""), rail, c === "Favourites" ? `♥ ${c}` : c); b.type = "button"; b.setAttribute("aria-pressed", String(c === this.cat)); b.onclick = () => { this.cat = c; this.msg = ""; this.refresh(); this.host.scrollTop = 0; }; }
    if (this.cat === "Sets") { this.setGrid(main, SETS); return; }
    if (this.cat === "Favourites") { this.favourites(main); return; }
    const gs = groupsOf(this.cat, this.spec);
    for (const g of gs) {
      if (gs.length > 1) E("div", "uav-lab", main, g.title);
      if (g.pal.length) this.colourRow(main, g);
      const box = E("div", "uw-grid", main); this.boxes.push({ g, box }); this.fill(g, box);
    }
    if (this.cat === "Tops") {
      E("div", "uav-lab", main, "Pattern"); const row = E("div", "uav-row", main);
      for (const p of OPTIONS.pattern) { const b = E("button", "uav-chip" + (this.spec.pattern === p.id ? " on" : ""), row, p.label); b.type = "button"; b.setAttribute("aria-pressed", String(this.spec.pattern === p.id)); b.onclick = () => { this.patch({ pattern: p.id }); this.refresh(); }; }
      this.swatchRow(main, "Pattern / under-shirt colour", CLOTH_COLORS, () => this.spec.shirt2, (c) => { this.pushSoon(); this.spec.shirt2 = c; this.later(); });
    }
    if (this.cat === "Extras" && !OLDER(this.spec.age)) E("p", "uw-msg", main, "Earrings and wrist items unlock for middle school and high school.");
  }
  private later() { clearTimeout(this.timer); this.timer = window.setTimeout(() => { for (const { g, box } of this.boxes) { box.innerHTML = ""; this.fill(g, box); } }, 120); }
  private colourOf(g: Group) { const v = this.spec[g.ck ?? g.key]; return typeof v === "string" && v.startsWith("#") ? v : g.pal[0]; }
  private isWorn(g: Group, it: Item) { const v = this.spec[g.key]; return g.nullable ? (it.val === null) === (v == null) : v === it.val; }
  private patchFor(g: Group, it: Item, col: string): Partial<AvatarSpec> {
    if (g.nullable) return { [g.key]: it.val === null ? null : col } as any;
    return { [g.key]: it.val, ...(g.ck ? { [g.ck]: col } : {}) } as any;
  }
  private colourRow(parent: HTMLElement, g: Group) {
    const none = g.items.find((i) => i.val === null || i.val === "none"); if (none && this.isWorn(g, none)) return;
    this.swatchRow(parent, "", g.pal, () => this.colourOf(g), (c) => { this.pushSoon(); (this.spec as any)[g.ck ?? g.key] = c; this.later(); });
  }
  private swatchRow(parent: HTMLElement, title: string, pal: string[], get: () => string, set: (c: string) => void) {
    if (title) E("div", "uav-lab", parent, title); const row = E("div", "uav-row", parent), sws: [HTMLElement, string][] = [];
    const mark = () => sws.forEach(([b, c]) => { b.classList.toggle("on", c === get()); b.setAttribute("aria-pressed", String(c === get())); });
    for (const c of pal) { const b = E("button", "uav-sw", row); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", `Colour ${c}`); b.onclick = () => { set(c); mark(); }; sws.push([b, c]); }
    const inp = E("input", "uav-custom", row) as HTMLInputElement; inp.type = "color"; inp.value = /^#[0-9a-f]{6}$/i.test(get()) ? get() : pal[0]; inp.title = "Custom colour"; inp.oninput = () => { set(inp.value); mark(); };
    mark();
  }
  private fill(g: Group, box: HTMLElement) {
    for (const it of g.items) this.itemCard(box, g, it);
  }
  private itemCard(box: HTMLElement, g: Group, it: Item) {
    const isNone = it.val === null || it.val === "none", label = isNone ? `No ${g.title.toLowerCase()}` : it.label, worn = this.isWorn(g, it);
    const card = E("div", "uw-card", box), b = E("button", "uw-main", card); b.type = "button"; b.dataset.wid = it.id; b.setAttribute("aria-label", `Wear ${label}`); b.setAttribute("aria-pressed", String(worn));
    const cv = E("canvas", "", b) as HTMLCanvasElement; cv.width = 96; cv.height = 120; E("span", "", b, label);
    const paint = () => {
      const s = this.spec, col = this.colourOf(g), base: Record<string, any> = { ...THUMB_BASE }; if (g.key === "top") { delete base.shirt; delete base.shirt2; delete base.pattern; }
      const ts = { ...s, ...base, ...this.patchFor(g, it, col) } as AvatarSpec;
      paintThumb(cv, [g.zoom, it.id, col, bodyKey(s), g.key === "top" ? s.pattern + s.shirt2 : ""].join("|"), ts, g.zoom);
    };
    this.lazy.set(cv, paint); this.io ? this.io.observe(cv) : setTimeout(paint, 0);
    b.onclick = () => { const none = g.items.find((i) => i.val === null || i.val === "none"); const target = worn && none && it !== none ? none : it; this.patch(this.patchFor(g, target, this.colourOf(g))); this.refresh(); };
    b.onkeydown = (e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const all = Array.from(this.host.querySelectorAll<HTMLElement>(".uw-main")), i = all.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1); all[i]?.focus(); e.preventDefault(); };
    if (!isNone) this.heart(card, it.id, label);
  }
  private heart(card: HTMLElement, id: string, label: string) {
    const on = this.favs().includes(id), h = E("button", "uw-heart", card, "♥"); h.type = "button"; h.setAttribute("aria-label", `Favourite ${label}`); h.setAttribute("aria-pressed", String(on)); h.title = on ? "Remove from favourites" : "Add to favourites";
    h.onclick = () => { const f = this.favs(); this.spec.favs = f.includes(id) ? f.filter((x) => x !== id) : [...f, id]; this.refresh(); };
  }
  private favourites(main: HTMLElement) {
    const f = this.favs(), box = E("div", "uw-grid", main); let n = 0;
    for (const c of CATS.slice(0, 8)) for (const g of groupsOf(c, this.spec)) for (const it of g.items) if (f.includes(it.id)) { this.itemCard(box, g, it); n++; }
    const sets = SETS.filter((s) => f.includes(s.id)); if (sets.length) this.setGrid(main, sets);
    if (!n && !sets.length) E("p", "", main, "No favourites yet. Tap the heart on any card to keep it here.");
  }
  private wearSet(s: WSet) {
    const o: Outfit = { ...s.o }; if (!OLDER(this.spec.age)) { o.wrist = "none"; o.earrings = null; } this.push(); this.ui.spec = wearOutfit(this.spec, o); this.say(`Wearing ${s.name}.`); this.refresh();
  }
  private setGrid(main: HTMLElement, sets: WSet[]) {
    const box = E("div", "uw-grid uw-sets", main);
    for (const s of sets) {
      const card = E("div", "uw-card", box), b = E("button", "uw-main", card); b.type = "button"; b.dataset.wid = s.id; b.setAttribute("aria-label", `Wear ${s.name}`);
      const cv = E("canvas", "", b) as HTMLCanvasElement; cv.width = 120; cv.height = 150; E("span", "", b, s.name);
      const worn = outfitOf(this.spec, ""); b.setAttribute("aria-pressed", String((["top", "shirt", "bottom", "pants", "shoeStyle", "hat"] as const).every((k) => (s.o as any)[k] === (worn as any)[k])));
      const paint = () => { const a = this.spec, ts = wearOutfit(a, s.o); paintThumb(cv, ["set", s.id, bodyKey(a), a.glasses, a.glassColor].join("|"), ts, "full"); };
      this.lazy.set(cv, paint); this.io ? this.io.observe(cv) : setTimeout(paint, 0);
      b.onclick = () => this.wearSet(s);
      const acts = E("div", "uw-acts", card), w = E("button", "uav-chip", acts, "Wear"); w.type = "button"; w.onclick = () => this.wearSet(s);
      const sv = E("button", "uav-chip", acts, "Save to closet"); sv.type = "button"; sv.onclick = () => {
        const cl = padCloset(this.spec.closet); let i = cl.findIndex((x) => !x); const full = i < 0; if (full) i = CLOSET_SLOTS - 1; cl[i] = { ...s.o }; this.spec.closet = cl; this.say(full ? `Closet full: replaced slot ${i + 1} with ${s.name}.` : `Saved ${s.name} to closet slot ${i + 1}.`);
      };
      this.heart(card, s.id, s.name);
    }
  }
}
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
