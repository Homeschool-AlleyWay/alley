/** Full-screen avatar creator: live preview (turn / walk) + tabs for body, face, hair, outfit, extras. Saves to the shared profile. */
import { drawChar, proportionScale } from "./rig";
import { PORTRAIT_SCALE } from "./characters";
import { ROSTER } from "./roster";
import { JEWEL_COLORS, OLDER, signature, starterCloset, outfitOf, wearOutfit, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, HIGHLIGHT_COLORS, OPTIONS, PRONOUNS, SHOE_COLORS, SKIN_TONES, CLOSET_SLOTS, padCloset, defaultAvatar, defaultProp, normalizeAvatar, randomAvatar, rng, toLook, type AvatarSpec, type Opt } from "./avatar";
import { Preview3D } from "./preview3d";
import { Social } from "./social";
import { Wardrobe, WARDROBE_CSS } from "./wardrobe";

const CSS = `
.uav{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:var(--sheet,#EADFCB);color:var(--ink,#4A3B3F);font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);overflow:hidden}
.uav.show{display:flex}
.uav-wrap{flex:1;min-height:0;width:100%;max-width:1200px;margin:0 auto;padding:0 12px 12px;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.uav-wrap>*{min-width:0}
@media(max-width:760px){.uav-wrap{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,42%) minmax(0,1fr)}.uav-top b{font-size:16px}.uav-tabs{flex-wrap:nowrap;overflow-x:auto}.uav-tabs .uav-chip{flex:none}.uav-chip{min-height:40px}.uav-sw{width:34px;height:34px}.uav input[type=range]{width:100%;max-width:300px}}
@media(max-height:480px) and (orientation:landscape){.uav-wrap{grid-template-columns:1fr 1fr;grid-template-rows:none}}
.uav-card{background:var(--kraft,#F3E7CF);border:1px solid rgba(255,255,255,.75);border-radius:16px;box-shadow:0 3px 0 var(--kraft-edge,#C9B28A),0 12px 24px rgba(80,50,40,.3);padding:12px}
.uav-prev{height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;align-items:center;overflow:hidden}
.uav-stage{flex:1;min-height:0;width:100%;display:flex;justify-content:center;gap:8px}
.uav-pv{position:relative;flex:1 1 0;min-width:0;height:100%;display:flex;justify-content:center}
.uav-pv canvas{height:100%;width:100%;object-fit:contain;background:linear-gradient(#EAF1E8,#DCE8DD 70%,#C9DCCB);border-radius:14px;border:2px solid var(--kraft-edge,#C9B28A);box-sizing:border-box}
.uav-pv i{position:absolute;left:8px;top:6px;font:600 11px/1 var(--ui,system-ui);font-style:normal;color:#fff;background:rgba(74,59,63,.55);border-radius:8px;padding:3px 7px;pointer-events:none}
.uav-pv i.live::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#7be08f;margin-right:5px}
.uav-prev .uav-row{margin:0;justify-content:center}
.uav-main{height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column}
.uav-bd{flex:1;min-height:0;overflow:auto;padding-right:4px}
.uav h2{font-size:18px;font-weight:600;margin:0 0 6px}
.uav-row{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}
.uav-lab{font-size:12px;color:var(--soft,#8A7A70);margin:8px 0 2px;text-transform:uppercase;letter-spacing:.4px;font-weight:600}
.uav button,.uav input[type=text]{font:inherit}
.uav-chip{font-size:13px;padding:5px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.8);background:#FFF9F0;color:inherit;cursor:pointer;box-shadow:0 2px 0 var(--kraft-edge,#C9B28A);min-height:32px}
.uav-chip.on{background:var(--acc,#E07A66);color:#fff;box-shadow:0 2px 0 #b95a48}
.uav-chip:active{transform:translateY(2px);box-shadow:none}
.uav-sw{width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px #6d5a5f,0 2px 0 rgba(0,0,0,.15);cursor:pointer;padding:0}
.uav-sw.on{box-shadow:0 0 0 3px var(--acc,#E07A66),0 2px 0 rgba(0,0,0,.15)}
.uav-sw.none{background:repeating-linear-gradient(45deg,#fff,#fff 4px,#d9d0c0 4px,#d9d0c0 8px)}
.uav-custom{width:34px;height:30px;border:0;padding:0;background:none;cursor:pointer}
.uav-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.uav-tabs .uav-chip{font-size:14px}
.uav-top{display:flex;align-items:center;gap:8px;padding:8px 12px;max-width:1200px;width:100%;box-sizing:border-box;margin:0 auto}
.uav-top b{font-size:18px}
.uav-save{background:var(--sage,#4E8A64);color:#fff;border-color:rgba(255,255,255,.7);box-shadow:0 2px 0 #35674a}
.uav input[type=range]{width:200px}
.uav input[type=text]{border:1px solid var(--kraft-edge,#C9B28A);border-radius:10px;padding:7px 10px;font-size:15px;background:#fff;width:100%;max-width:260px}
.uav-switch{display:inline-flex;align-items:center;gap:6px;font-size:14px;margin-right:12px}
.uav.uav-emb{position:relative;inset:auto;z-index:auto;display:flex;flex-direction:column;height:100%;min-height:0;background:transparent;overflow:visible}
.uav-emb .uav-tabs{flex:none;margin-bottom:6px}.uav-emb .uav-bd{flex:1;min-height:0;overflow:auto;padding:0 4px 8px 0;overscroll-behavior:contain}
.uav-emb .uav-chip{min-height:44px;padding:6px 12px}.uav-emb .uav-sw{width:38px;height:38px}.uav-emb .uav-custom{width:44px;height:38px}
.uav-emb .uav-row{gap:8px}.uav-emb input[type=range]{width:100%;max-width:280px}.uav-emb input[type=text]{min-height:44px}
.uav-emb .uav-pvrow{flex:none;display:flex;gap:10px;align-items:center;margin:0 0 6px;padding:4px 6px;background:rgba(255,255,255,.45);border-radius:12px}
.uav-emb .uav-pvrow canvas{width:76px;height:96px;flex:none;background:linear-gradient(#EAF1E8,#C9DCCB);border-radius:10px;border:2px solid var(--kraft-edge,#C9B28A);box-sizing:border-box}
.uav-emb .uav-pvrow span{font-size:12px;color:var(--soft,#8A7A70);line-height:1.3}.uav-emb .uav-pvrow b{display:block;font-size:13px;color:var(--ink,#4A3B3F)}
@media(max-width:700px){.uav-emb .uav-tabs{overflow-x:auto;flex-wrap:nowrap}.uav-emb .uav-tabs .uav-chip{flex:none}}
.uav-val{font-size:12px;color:var(--soft,#8A7A70);margin-left:6px;text-transform:none;letter-spacing:0}
.uav-slots{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:6px}.uav-slots .uav-chip{flex:none}
.uav-sec{margin:10px 0 2px;font-weight:600;font-size:15px}
.uav-emb .uav-emsg{flex:none;min-height:0;font-size:13px;color:#a8322a;margin-bottom:4px}.uav-emb .uav-emsg:empty{display:none}
.uav-emb .uw-main{min-height:44px}.uav-emb .uw-heart{width:34px;height:34px;line-height:34px}.uav-emb .uw-acts .uav-chip{min-height:36px}
`;
let cssDone = false;
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
type Key = keyof AvatarSpec;
const DIRS = ["down", "right", "up", "left"] as const;
const TABS = ["Body", "Face", "Hair", "Facial hair", "Wardrobe", "Outfit", "Accessories", "Closet", "Backpack", "You"];
/** the outfit designer: one entry per garment slot. cut = the garment style, c1/c2 = primary/secondary colours, pat/pc = pattern + its colour, trim = hem/collar trim colour */
interface Slot { id: string; label: string; cut?: Key; cuts?: (a: AvatarSpec) => Opt[]; c1?: Key; c1l?: string; pal1?: string[]; c2?: Key; c2l?: string; pat?: Key; pc?: Key; trim?: Key; none?: string; hint?: string }
const ID_ONE = ["dress", "overalls"];
const SLOTS: Slot[] = [
  { id: "top", label: "Top", cut: "top", cuts: () => OPTIONS.top.filter((x) => !ID_ONE.includes(x.id)), c1: "shirt", c1l: "Main colour", c2: "shirt2", c2l: "Secondary / under-shirt", pat: "pattern", pc: "patColor", trim: "trim" },
  { id: "bottom", label: "Bottom", cut: "bottom", cuts: () => OPTIONS.bottom, c1: "pants", c1l: "Main colour", pat: "pantsPattern", pc: "pantsPatColor", trim: "pantsTrim" },
  { id: "onepiece", label: "Dress / one-piece", cut: "top", cuts: () => OPTIONS.onepiece, c1: "shirt", c1l: "Main colour", c2: "shirt2", c2l: "Secondary", pat: "pattern", pc: "patColor", trim: "trim", hint: "Pick a one-piece to wear it instead of a top and bottom." },
  { id: "outer", label: "Outerwear", cut: "outer", cuts: () => OPTIONS.outer, c1: "outerColor", c1l: "Main colour", c2: "outerColor2", c2l: "Secondary", pat: "outerPattern", pc: "outerPatColor", trim: "outerTrim" },
  { id: "shoes", label: "Shoes", cut: "shoeStyle", cuts: () => OPTIONS.shoeStyle, c1: "shoes", c1l: "Main colour", pal1: SHOE_COLORS.concat(CLOTH_COLORS), c2: "shoes2", c2l: "Sole / accent", none: "Default" },
  { id: "socks", label: "Socks / tights", cut: "socks", cuts: () => OPTIONS.socks, c1: "sockColor", c1l: "Colour" },
  { id: "hat", label: "Hat", cut: "hat", cuts: () => OPTIONS.hat, c1: "hatColor", c1l: "Main colour", c2: "hat2", c2l: "Band / brim accent", none: "Automatic" },
  { id: "glasses", label: "Glasses", cut: "glasses", cuts: () => OPTIONS.glasses, c1: "glassColor", c1l: "Frame colour" },
  { id: "bag", label: "Bag / backpack", cut: "packStyle", cuts: () => OPTIONS.packStyle, c1: "pack", c1l: "Main colour", c2: "pack2", c2l: "Straps / pocket accent", none: "Automatic" },
];

export class AvatarCreator {
  root: HTMLElement; spec: AvatarSpec; private cv?: HTMLCanvasElement; private cv3?: HTMLCanvasElement; private pv?: HTMLCanvasElement; private body: HTMLElement; private tab = "Body"; private dir = 0; private walk = false; private t0 = performance.now(); private raf = 0; private nameInput?: HTMLInputElement; private wardrobe = new Wardrobe(this); private swapSel = -1; private slot = "top"; private p3d: Preview3D | null = null; private wbtn?: HTMLElement;
  onSave: (spec: AvatarSpec, name: string) => void = () => {}; onCancel: () => void = () => {};
  /** fired on every edit, immediately (next animation frame at the latest), with the working spec: the dorm updates its 3D character from it */
  onChange: (spec: AvatarSpec) => void = () => {};
  /** fired when the visible tab changes (the dorm moves its camera to match) */
  onTab: (tab: string) => void = () => {}; private shownTab = "";
  readonly embedded: boolean; private visible: string[] | null = null; private cur = ""; private saveT = 0; private dirtySave = false;
  constructor(host: HTMLElement = document.body, opts: { embedded?: boolean } = {}) {
    if (!cssDone) { cssDone = true; const s = document.createElement("style"); s.textContent = CSS + WARDROBE_CSS; document.head.appendChild(s); }
    this.embedded = !!opts.embedded; this.spec = normalizeAvatar(Social.profile.avatar);
    if (this.embedded) {
      this.root = E("div", "uav uav-emb show", host);
      const pr = E("div", "uav-pvrow", this.root); this.pv = E("canvas", "", pr) as HTMLCanvasElement; this.pv.width = 152; this.pv.height = 192; this.pv.setAttribute("aria-label", "Live preview of your avatar"); const pt = E("span", "", pr); E("b", "", pt, "Live preview"); pt.appendChild(document.createTextNode("Every change shows here and on your 3D character right away. Tap to turn around.")); this.pv.onclick = () => { this.dir = (this.dir + 1) % 4; };
      const tabs = E("div", "uav-tabs", this.root); tabs.setAttribute("role", "tablist");
      for (const t of TABS) { const b = E("button", "uav-chip", tabs, t); b.type = "button"; b.dataset.tab = t; b.setAttribute("role", "tab"); b.onclick = () => { this.tab = t; this.render(); }; }
      this.msg = E("div", "uav-emsg", this.root); this.msg.setAttribute("aria-live", "polite"); this.body = E("div", "uav-bd", this.root);
      this.root.addEventListener("keydown", (e) => { if (e.key !== "Escape") e.stopPropagation(); }); this.root.addEventListener("pointerdown", (e) => e.stopPropagation());   // Esc still reaches the panel so it can close
      this.load(); this.render(); addEventListener("pagehide", () => this.flush()); return;
    }
    this.root = E("div", "uav", host);
    const top = E("div", "uav-top", this.root); E("b", "", top, "Create your avatar"); const sp = E("span", "", top); sp.style.flex = "1";
    const cancel = E("button", "uav-chip", top, "Cancel"); cancel.type = "button"; cancel.onclick = () => { this.hide(); this.onCancel(); };
    this.msg = E("span", "", top); this.msg.style.cssText = "color:#a8322a;font-size:13px"; const save = E("button", "uav-chip uav-save", top, "Save and play"); save.type = "button"; save.onclick = () => this.save();
    const wrap = E("div", "uav-wrap", this.root), prev = E("div", "uav-card uav-prev", wrap);
    const stage = E("div", "uav-stage", prev), p2 = E("div", "uav-pv", stage), p3 = E("div", "uav-pv", stage);
    this.cv = E("canvas", "", p2) as HTMLCanvasElement; this.cv.width = 450; this.cv.height = 600; E("i", "live", p2, "2D live");
    this.cv3 = E("canvas", "", p3) as HTMLCanvasElement; E("i", "live", p3, "3D live"); this.cv3.setAttribute("aria-label", "3D preview, drag to turn");
    const r1 = E("div", "uav-row", prev); r1.style.justifyContent = "center";
    DIRS.forEach((d, i) => { const b = E("button", "uav-chip", r1, ["Front", "Right", "Back", "Left"][i]); b.type = "button"; b.onclick = () => { this.dir = i; this.walk = false; this.wbtn?.classList.remove("on"); this.p3d?.walk(false); this.p3d?.face(i); }; });
    const wb = this.wbtn = E("button", "uav-chip", r1, "Walk"); wb.type = "button"; wb.onclick = () => { this.walk = !this.walk; wb.classList.toggle("on", this.walk); this.p3d?.walk(this.walk); };
    const r2 = E("div", "uav-row", prev); r2.style.justifyContent = "center";
    const rnd = E("button", "uav-chip", r2, "Surprise me"); rnd.type = "button"; rnd.onclick = () => { const nm = this.spec.name, ag = this.spec.age, pr = this.spec.prop; this.spec = { ...randomAvatar(rng(Date.now() & 0xffffff), ag), prop: pr, name: nm, closet: padCloset(this.spec.closet), favs: this.spec.favs ?? [] }; this.render(); };
    const rst = E("button", "uav-chip", r2, "Reset"); rst.type = "button"; rst.onclick = () => { const nm = this.spec.name; this.spec = { ...defaultAvatar(), name: nm, prop: defaultProp(this.spec.age), age: this.spec.age, closet: padCloset(this.spec.closet), favs: this.spec.favs ?? [] }; this.render(); };
    const main = E("div", "uav-card uav-main", wrap); const tabs = E("div", "uav-tabs", main);
    for (const t of TABS) { const b = E("button", "uav-chip", tabs, t); b.type = "button"; b.dataset.tab = t; b.onclick = () => { this.tab = t; this.render(); }; }
    this.body = E("div", "uav-bd", main); this.root.addEventListener("keydown", (e) => e.stopPropagation()); this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
  }
  private load() { this.spec = normalizeAvatar({ ...Social.profile.avatar, name: Social.profile.name || Social.profile.avatar.name }); this.spec.closet = padCloset(this.spec.closet && this.spec.closet.some(Boolean) ? this.spec.closet : starterCloset(this.spec)); this.spec.favs = [...(this.spec.favs ?? [])]; this.cur = JSON.stringify(this.spec); }
  show(tab?: string) { this.load(); if (tab) this.tab = tab; this.root.classList.add("show"); this.render(); this.start(); }
  hide() { this.flush(); this.root.classList.remove("show"); this.stop(); }
  /* ---------- embedded mode (the dorm page): tab strip + body only, autosaves, tells the page about every edit ---------- */
  /** re-read the saved profile (e.g. after another tab changed it) */
  reload() { this.load(); this.render(false); this.start(); this.p3d?.setSpec(this.spec); }
  /** jump to a tab (embedded or not) */
  showTab(name: string) { if (!TABS.includes(name)) return; this.tab = name; this.render(); }
  /** restrict the visible tabs, e.g. the Mirror panel only offers Body, Face, Hair... */
  setTabs(names: string[] | null) {
    this.visible = names && names.length ? names.filter((n) => TABS.includes(n)) : null;
    this.root.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => { b.style.display = !this.visible || this.visible.includes(b.dataset.tab!) ? "" : "none"; b.style.order = String(this.visible ? this.visible.indexOf(b.dataset.tab!) : TABS.indexOf(b.dataset.tab!)); });
    if (this.visible && !this.visible.includes(this.tab)) this.tab = this.visible[0];
    this.render();
  }
  dispose() { this.flush(); this.stop(); this.root.remove(); }
  /* ---------- live preview: every frame, compare the working spec with the last one we saw; a change updates the 2D portrait, the 3D character and the page at once, and schedules a debounced save ---------- */
  private start() {
    if (!this.embedded && !this.p3d && this.cv3) { this.p3d = new Preview3D(this.cv3, this.spec); if (!this.p3d.ok) { this.p3d = null; this.cv3.parentElement!.style.display = "none"; } else this.p3d.face(this.dir); }
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);
  }
  private stop() { cancelAnimationFrame(this.raf); this.raf = 0; if (this.p3d) { this.p3d.dispose(); this.p3d = null; } }
  private persist() {
    clearTimeout(this.saveT); this.saveT = 0; if (!this.dirtySave) return; this.dirtySave = false; const spec = this.spec;
    const twin = ROSTER.find((n) => signature(n.spec) === signature(spec));
    if (twin) { if (this.msg) this.msg.textContent = `${twin.first} already looks exactly like this. Change one thing to make it yours (it is not saved yet).`; return; }
    if (this.msg) this.msg.textContent = ""; const name = (spec.name ?? "").trim().slice(0, 14) || "Student"; Social.setProfile({ name, avatar: { ...spec, name }, hasAvatar: true });
  }
  private flush() { if (this.embedded && this.dirtySave) this.persist(); }
  private msg?: HTMLElement;
  private save() { const name = (this.nameInput?.value ?? this.spec.name).trim().slice(0, 14) || "Student";
    const twin = ROSTER.find((n) => signature(n.spec) === signature(this.spec));
    if (twin) { if (this.msg) { this.msg.textContent = `${twin.first} already looks exactly like this. Change one thing to make it yours.`; } return; } this.spec.name = name; Social.setProfile({ name, avatar: { ...this.spec }, hasAvatar: true }); this.hide(); this.onSave(this.spec, name); }
  private loop = () => {
    this.raf = 0; if (!this.root.isConnected || !this.root.classList.contains("show")) return;
    this.sync(); this.draw2D(); this.p3d?.render();
    this.raf = requestAnimationFrame(this.loop);
  };
  /** push the working spec to the previews and the page if it changed (called from every input handler and every frame) */
  private sync() {
    const j = JSON.stringify(this.spec); if (j === this.cur) return; this.cur = j;
    this.p3d?.setSpec(this.spec); this.onChange(this.spec); this.draw2D();
    if (this.embedded) { this.dirtySave = true; clearTimeout(this.saveT); this.saveT = window.setTimeout(() => this.persist(), 450); }
  }
  private draw2D() {
    const cv = this.cv ?? this.pv; if (!cv || (this.embedded && !cv.offsetParent)) return;
    if (this.cv) { const dp = Math.min(devicePixelRatio || 1, 2), W = Math.round(cv.clientWidth * dp), H = Math.round(cv.clientHeight * dp); if (W > 20 && H > 20 && (cv.width !== W || cv.height !== H)) { cv.width = W; cv.height = H; } }
    const c = cv.getContext("2d")!, k = Math.min(cv.height / 600, cv.width / 400), t = (performance.now() - this.t0) / 1000;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    const look = toLook(this.spec, 11), s = (12.6 * (PORTRAIT_SCALE[this.spec.age] ?? 1) * 0.92 * k) / Math.max(1, proportionScale(look)) ** 0.9; c.save(); c.translate(cv.width / 2, cv.height - 60 * Math.min(cv.height / 600, k)); c.scale(s, s);
    c.fillStyle = "rgba(60,40,50,.18)"; c.beginPath(); c.ellipse(0, 1, 13, 4, 0, 0, 7); c.fill();
    c.shadowColor = "rgba(52,34,46,.3)"; c.shadowBlur = 3; c.shadowOffsetY = 1.5; drawChar(c, 0, 0, { ...look, dir: DIRS[this.dir], moving: this.walk, walk: this.walk ? t * 8 : 0, tag: false }, t); c.restore();
  }

  /* ---------- controls ---------- */
  private set<K extends Key>(k: K, v: AvatarSpec[K]) { (this.spec as any)[k] = v; this.sync(); this.render(false); }
  private chips(label: string, key: Key, opts: Opt[], then?: (id: string) => void, scroll = false) {
    E("div", "uav-lab", this.body, label); const row = E("div", "uav-row", this.body); if (scroll) row.style.cssText = "max-height:140px;overflow-y:auto;overscroll-behavior:contain";
    for (const o of opts) { const b = E("button", "uav-chip" + (this.spec[key] === o.id ? " on" : ""), row, o.label); b.type = "button"; b.onclick = () => { then?.(o.id); this.set(key, o.id as any); }; }
  }
  private swatches(label: string, key: Key, pal: string[], none?: string) {
    E("div", "uav-lab", this.body, label); const row = E("div", "uav-row", this.body);
    if (none) { const b = E("button", "uav-sw none" + (this.spec[key] == null ? " on" : ""), row); b.type = "button"; b.title = none; b.setAttribute("aria-label", none); b.onclick = () => this.set(key, null as any); }
    for (const c of pal) { const b = E("button", "uav-sw" + (this.spec[key] === c ? " on" : ""), row); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", c); b.onclick = () => this.set(key, c as any); }
    const inp = E("input", "uav-custom", row) as HTMLInputElement; inp.type = "color"; inp.value = typeof this.spec[key] === "string" && /^#[0-9a-f]{6}$/i.test(this.spec[key] as string) ? (this.spec[key] as string) : pal[0]; inp.title = "Custom colour"; inp.setAttribute("aria-label", "Custom colour");
    inp.oninput = () => { (this.spec as any)[key] = inp.value; this.sync(); };   // live while dragging; the picker stays open (no re-render until it closes)
    inp.onchange = () => this.render(false);
  }
  private toggle(label: string, key: Key) { const l = E("label", "uav-switch", this.body); const i = E("input", "", l) as HTMLInputElement; i.type = "checkbox"; i.checked = !!this.spec[key]; i.onchange = () => this.set(key, i.checked as any); l.appendChild(document.createTextNode(label)); }
  private slider(label: string, key: Key, min: number, max: number, step: number) {
    const l = E("div", "uav-lab", this.body, label), v = E("span", "uav-val", l), cur = () => Number(this.spec[key] ?? 1); v.textContent = cur().toFixed(2);
    const i = E("input", "", this.body) as HTMLInputElement; i.type = "range"; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(cur()); i.setAttribute("aria-label", label); i.oninput = () => { (this.spec as any)[key] = Number(i.value); v.textContent = Number(i.value).toFixed(2); this.sync(); };
  }
  private head(t: string) { E("div", "uav-sec", this.body, t); }
  /** the closet: twelve outfit slots; wear one or save what you have on into it */
  private closet(b: HTMLElement) {
    this.spec.closet = padCloset(this.spec.closet && this.spec.closet.some(Boolean) ? this.spec.closet : starterCloset(this.spec)); const slots = this.spec.closet;
    E("p", "", b, "Twelve outfits you can swap between. Wear one, Save what you have on into a slot, Rename, Clear, or Swap two slots. Outfits you design on the Designer tab can be saved here too.");
    const grid = E("div", "", b); grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px";
    slots.forEach((f, i) => {
      const card = E("div", "uav-card", grid); card.style.cssText += ";display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px";
      const cv = E("canvas", "", card) as HTMLCanvasElement; cv.width = 120; cv.height = 150; cv.style.cssText = "width:100%;max-width:120px;background:linear-gradient(#EAF1E8,#C9DCCB);border-radius:10px";
      const c = cv.getContext("2d")!; const look = toLook(f ? wearOutfit(this.spec, f) : this.spec, 11), sc = 2.95 * (PORTRAIT_SCALE[this.spec.age] ?? 1) / Math.max(1, proportionScale(look)) ** 0.9; c.translate(60, 142); c.scale(sc, sc); drawChar(c, 0, 0, { ...look, dir: "down", moving: false, walk: 0, tag: false }, 0);
      const nm = E("input", "", card) as HTMLInputElement; nm.type = "text"; nm.value = f?.name ?? `Outfit ${i + 1}`; nm.maxLength = 16; nm.style.cssText = "width:100%;text-align:center"; nm.onchange = () => { slots[i] = { ...(slots[i] ?? outfitOf(this.spec, "")), name: nm.value.trim() || `Outfit ${i + 1}` }; };
      const r = E("div", "uav-row", card); r.style.justifyContent = "center";
      const w = E("button", "uav-chip", r, "Wear"); w.type = "button"; w.onclick = () => { if (slots[i]) { const cl = this.spec.closet; this.spec = wearOutfit(this.spec, slots[i]!); this.spec.closet = cl; this.render(false); } };
      const sv = E("button", "uav-chip", r, "Save"); sv.type = "button"; sv.onclick = () => { slots[i] = outfitOf(this.spec, nm.value.trim() || `Outfit ${i + 1}`); this.render(false); };
      const r2 = E("div", "uav-row", card); r2.style.justifyContent = "center"; if (!f) card.style.opacity = ".8";
      const rn = E("button", "uav-chip", r2, "Rename"); rn.type = "button"; rn.onclick = () => { nm.focus(); nm.select(); };
      const cl = E("button", "uav-chip", r2, "Clear"); cl.type = "button"; cl.disabled = !f; cl.onclick = () => { slots[i] = null; this.render(false); };
      const sw = E("button", "uav-chip" + (this.swapSel === i ? " on" : ""), r2, "Swap"); sw.type = "button"; sw.setAttribute("aria-pressed", String(this.swapSel === i));
      sw.onclick = () => { if (this.swapSel < 0) this.swapSel = i; else { if (this.swapSel !== i) [slots[this.swapSel], slots[i]] = [slots[i], slots[this.swapSel]]; this.swapSel = -1; } this.render(false); };
    });
  }
  /** the outfit designer: pick a garment slot, then a cut, colours, a pattern with its own colour, and trim */
  private designer(b: HTMLElement) {
    const a = this.spec, old = OLDER(a.age), slots = SLOTS;
    if (!slots.some((x) => x.id === this.slot)) this.slot = "top";
    const bar = E("div", "uav-slots", b); bar.setAttribute("role", "tablist");
    for (const sl of slots) { const x = E("button", "uav-chip" + (sl.id === this.slot ? " on" : ""), bar, sl.label); x.type = "button"; x.setAttribute("role", "tab"); x.onclick = () => { this.slot = sl.id; this.render(false); }; }
    const sl = slots.find((x) => x.id === this.slot)!; if (sl.hint) E("p", "", b, sl.hint);
    const cutOpts = sl.cuts!(a).filter((o) => !(sl.id === "top" && false) && !(o.id === "necklace" && !old));
    if (sl.id === "onepiece" && !ID_ONE.includes(a.top)) E("p", "", b, "Not wearing a one-piece right now.");
    this.chips("Cut (scroll for more)", sl.cut!, cutOpts, undefined, true);
    const gone = (sl.id === "outer" && a.outer === "none") || (sl.id === "glasses" && a.glasses === "none") || (sl.id === "hat" && a.hat === "none") || (sl.id === "bag" && a.packStyle === "none") || (sl.id === "socks" && a.socks === "none");
    if (gone) { E("p", "", b, "Pick a cut above to start designing this piece."); }
    else {
      if (sl.c1) this.swatches(sl.c1l ?? "Colour", sl.c1, sl.pal1 ?? CLOTH_COLORS);
      if (sl.c2) this.swatches(sl.c2l ?? "Secondary", sl.c2, sl.pal1 ?? CLOTH_COLORS, sl.none);
      if (sl.pat) { this.chips("Pattern", sl.pat, OPTIONS.pattern, undefined, true); if ((a as any)[sl.pat] && (a as any)[sl.pat] !== "solid") this.swatches("Pattern colour", sl.pc!, CLOTH_COLORS); }
      if (sl.trim) this.swatches("Trim (hems, cuffs, waistband)", sl.trim, CLOTH_COLORS, "No trim");
    }
    this.head("Save this outfit");
    const row = E("div", "uav-row", b), nm = E("input", "", row) as HTMLInputElement; nm.type = "text"; nm.maxLength = 16; nm.placeholder = "Name your outfit"; nm.value = this.outfitName; nm.oninput = () => { this.outfitName = nm.value; }; nm.setAttribute("aria-label", "Outfit name");
    const sv = E("button", "uav-chip uav-save", row, "Save to closet"); sv.type = "button";
    const note = E("div", "uav-msg", b); note.style.cssText = "font-size:12px;color:var(--soft,#8A7A70)";
    sv.onclick = () => { const name = (this.outfitName.trim() || "My design").slice(0, 16), cl = (this.spec.closet = padCloset(this.spec.closet && this.spec.closet.some(Boolean) ? this.spec.closet : starterCloset(this.spec)));
      let i = cl.findIndex((f) => f && f.name === name); if (i < 0) i = cl.findIndex((f) => !f); if (i < 0) { note.textContent = "Your closet is full. Clear a slot on the Closet tab first, or reuse an outfit name to replace it."; return; }
      cl[i] = outfitOf(this.spec, name); note.textContent = `Saved "${name}" in closet slot ${i + 1}. Wear it any time from the Closet tab.`; };
  }
  private outfitName = "";
  /** hats, glasses, jewelry, neckwear, extras */
  private accessories(b: HTMLElement) {
    const a = this.spec, o = OPTIONS, old = OLDER(a.age);
    this.head("Hat"); this.chips("Style", "hat", o.hat); if (a.hat !== "none") { this.swatches("Hat colour", "hatColor", CLOTH_COLORS); this.swatches("Band / brim accent", "hat2", CLOTH_COLORS, "Automatic"); }
    this.head("Glasses"); this.chips("Style", "glasses", o.glasses); if (a.glasses !== "none") this.swatches("Frame colour", "glassColor", ["#5b4048", "#313a3f", "#d9564a", "#4f91c7", "#b8a8da", "#eab94e", "#ffffff", "#3fb8af"]);
    this.head("Jewelry");
    if (!old) E("p", "", b, "Earrings, wrist items and necklaces unlock in middle school and high school (pick a grade band on the Body tab).");
    else { this.chips("Earring style", "earStyle", o.earStyle); this.swatches("Earrings", "earrings", JEWEL_COLORS, "None"); this.swatches("Nose stud", "nosePin", JEWEL_COLORS, "None"); this.chips("Wrist", "wrist", o.wrist); if (a.wrist !== "none") this.swatches("Wrist colour", "wristColor", JEWEL_COLORS); }
    this.head("Neck and chest"); this.chips("Neckwear", "neckwear", o.neckwear.filter((x) => x.id !== "necklace" || old)); if (a.neckwear !== "none") this.swatches("Neckwear colour", "neckColor", [...JEWEL_COLORS, ...CLOTH_COLORS]); this.swatches("Scarf", "scarf", CLOTH_COLORS, "None"); this.swatches("Badge", "badge", CLOTH_COLORS, "None"); this.chips("Chest emblem", "emblem", o.emblem);
    this.head("Special extras"); this.chips("Extra (20 to choose from)", "extra", o.extra); if (a.extra !== "none") this.swatches("Extra colour", "extraColor", JEWEL_COLORS.concat(CLOTH_COLORS));
    this.swatches("Hair clip", "clip", CLOTH_COLORS, "None");
  }
  render(scrollTop = true) {
    if (this.tab !== this.shownTab) { this.shownTab = this.tab; this.onTab(this.tab); }
    this.root.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === this.tab));
    const y = this.body.scrollTop; this.body.innerHTML = ""; const o = OPTIONS, b = this.body;
    if (this.tab === "Body") {
      const adultOk = this.spec.age === "adult" || ((): boolean => { try { return sessionStorage.getItem("unify.family.ci") === "parent" || localStorage.getItem("unify.opendoor.adult") === "1"; } catch { return false; } })();
      this.chips("Proportion style", "prop", o.proportion);
      this.chips("Grade band (sets your height)", "age", [...o.age, ...(adultOk ? [{ id: "adult", label: "Adult (parent)" }] : [])], (id) => { if (this.spec.prop === defaultProp(this.spec.age)) this.spec.prop = defaultProp(id); });
      this.chips("Build", "build", o.build);
      this.head("Shape"); this.slider("Height", "height", 0.9, 1.1, 0.01); this.slider("Head size", "headSize", 0.8, 1.25, 0.01); this.slider("Shoulder width", "shoulder", 0.8, 1.25, 0.01); this.slider("Waist", "waist", 0.8, 1.3, 0.01); this.slider("Hips", "hips", 0.85, 1.3, 0.01); this.slider("Arm and leg length", "limbs", 0.88, 1.15, 0.01);
      this.swatches("Skin tone", "skin", SKIN_TONES); this.chips("Pronouns", "pronouns", PRONOUNS.map((p) => ({ id: p, label: p })));
    } else if (this.tab === "Face") {
      this.chips("Face shape", "faceShape", o.faceShape); this.chips("Eyes", "eyeShape", o.eyeShape); this.swatches("Eye colour", "eyeColor", EYE_COLORS); this.swatches("Other eye colour (leave off to match)", "eyeColor2", EYE_COLORS, "Match");
      this.chips("Eyebrows", "brow", o.brow); this.swatches("Eyebrow colour", "browColor", HAIR_COLORS, "Match hair"); this.chips("Nose", "noseShape", o.noseShape); this.chips("Mouth", "mouthStyle", o.mouthStyle); this.chips("Ears", "earShape", o.earShape);
      this.head("Freckles, marks and makeup"); this.toggle("Freckles", "freckles"); this.toggle("Beauty mark", "mole"); this.toggle("Little nose", "nose"); this.toggle("Rosy cheeks", "blush"); this.chips("Face marks", "mark", o.mark);
      this.swatches("Lip colour", "lip", ["#8a4650", "#c4463c", "#e8789a", "#b5563e", "#563428", "#e07a66", "#b04aa0", "#d9564a"]);
      if (OLDER(this.spec.age)) { this.swatches("Eyeshadow", "eyeShadow", CLOTH_COLORS, "None"); this.toggle("Winged eyeliner", "liner"); }
    } else if (this.tab === "Hair") { this.chips("Style", "hairStyle", o.hairStyle); this.chips("Texture", "htex", o.htex); this.chips("Parting", "part", o.part); this.chips("Fringe / bangs", "fringe", o.fringe); this.swatches("Colour", "hair", HAIR_COLORS); this.swatches("Highlight colour", "hair2", HIGHLIGHT_COLORS, "No highlights"); if (this.spec.hair2) this.chips("Highlight style", "hl", o.hl); this.swatches("Hair clip", "clip", CLOTH_COLORS, "None"); }
    else if (this.tab === "Facial hair") {
      if (this.spec.age !== "hs" && this.spec.age !== "adult") { E("h2", "", b, "Facial hair"); E("p", "", b, "Facial hair is for high school. Pick High school on the Body tab to unlock it."); }
      else { this.chips("Style", "beard", o.beard); if (this.spec.beard !== "none") this.swatches("Colour", "beardColor", HAIR_COLORS, "Match hair"); }
    } else if (this.tab === "Closet") this.closet(b);
    else if (this.tab === "Wardrobe") this.wardrobe.render(b);
    else if (this.tab === "Outfit") this.designer(b);
    else if (this.tab === "Accessories") this.accessories(b);
    else if (this.tab === "Backpack") {
      E("h2", "", b, "Backpack"); this.chips("Bag style", "packStyle", o.packStyle);
      if (this.spec.packStyle === "none") E("p", "", b, "No bag right now. Pick a style to carry your books.");
      else { this.swatches("Bag colour", "pack", CLOTH_COLORS); this.swatches("Straps / pocket accent", "pack2", CLOTH_COLORS, "Automatic"); this.swatches("Pin or badge on the bag", "badge", CLOTH_COLORS, "No badge"); }
    } else {
      E("h2", "", b, "About you"); E("div", "uav-lab", b, "Your name (classmates will remember it)"); const i = E("input", "", b) as HTMLInputElement; i.type = "text"; i.maxLength = 14; i.value = this.spec.name === "Student" ? "" : this.spec.name; i.placeholder = "Type your name"; this.nameInput = i; i.oninput = () => { this.spec.name = i.value; this.sync(); };
      E("div", "uav-lab", b, "Tip"); E("div", "", b, "Classmates notice what you wear. Try a hat or glasses and see who compliments it. Everything you tell them is remembered, so introduce yourself!");
    }
    this.body.scrollTop = scrollTop ? 0 : y;
  }
}
