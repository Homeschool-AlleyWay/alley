/** Full-screen avatar creator: live preview (turn / walk) + tabs for body, face, hair, outfit, extras. Saves to the shared profile. */
import { drawChar } from "./rig";
import { PORTRAIT_SCALE } from "./characters";
import { JEWEL_COLORS, OLDER, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, HIGHLIGHT_COLORS, OPTIONS, PRONOUNS, SHOE_COLORS, SKIN_TONES, defaultAvatar, randomAvatar, rng, toLook, type AvatarSpec } from "./avatar";
import { Social } from "./social";

const CSS = `
.uav{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:var(--sheet,#EADFCB);color:var(--ink,#4A3B3F);font-family:var(--ui,"Fredoka","Trebuchet MS",system-ui,sans-serif);overflow:hidden}
.uav.show{display:flex}
.uav-wrap{flex:1;min-height:0;width:100%;max-width:1200px;margin:0 auto;padding:0 12px 12px;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:760px){.uav-wrap{grid-template-columns:1fr;grid-template-rows:minmax(0,42%) minmax(0,1fr)}.uav-top b{font-size:16px}}
@media(max-height:480px) and (orientation:landscape){.uav-wrap{grid-template-columns:1fr 1fr;grid-template-rows:none}}
.uav-card{background:var(--kraft,#F3E7CF);border:1px solid rgba(255,255,255,.75);border-radius:16px;box-shadow:0 3px 0 var(--kraft-edge,#C9B28A),0 12px 24px rgba(80,50,40,.3);padding:12px}
.uav-prev{height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;align-items:center;overflow:hidden}
.uav-stage{flex:1;min-height:0;width:100%;display:flex;justify-content:center}
.uav-prev canvas{height:100%;width:auto;max-width:100%;aspect-ratio:3/4;background:linear-gradient(#EAF1E8,#DCE8DD 70%,#C9DCCB);border-radius:14px;border:2px solid var(--kraft-edge,#C9B28A)}
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
`;
let cssDone = false;
const E = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", parent?: HTMLElement, text = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
type Key = keyof AvatarSpec;
const DIRS = ["down", "right", "up", "left"] as const;

export class AvatarCreator {
  root: HTMLElement; spec: AvatarSpec; private cv: HTMLCanvasElement; private body: HTMLElement; private tab = "Body"; private dir = 0; private walk = false; private t0 = performance.now(); private raf = 0; private nameInput?: HTMLInputElement;
  onSave: (spec: AvatarSpec, name: string) => void = () => {}; onCancel: () => void = () => {};
  constructor(host: HTMLElement = document.body) {
    if (!cssDone) { cssDone = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }
    this.spec = { ...Social.profile.avatar }; this.root = E("div", "uav", host);
    const top = E("div", "uav-top", this.root); E("b", "", top, "Create your avatar"); const sp = E("span", "", top); sp.style.flex = "1";
    const cancel = E("button", "uav-chip", top, "Cancel"); cancel.type = "button"; cancel.onclick = () => { this.hide(); this.onCancel(); };
    const save = E("button", "uav-chip uav-save", top, "Save and play"); save.type = "button"; save.onclick = () => this.save();
    const wrap = E("div", "uav-wrap", this.root), prev = E("div", "uav-card uav-prev", wrap);
    const stage = E("div", "uav-stage", prev); this.cv = E("canvas", "", stage) as HTMLCanvasElement; this.cv.width = 450; this.cv.height = 600;
    const r1 = E("div", "uav-row", prev); r1.style.justifyContent = "center";
    DIRS.forEach((d, i) => { const b = E("button", "uav-chip", r1, ["Front", "Right", "Back", "Left"][i]); b.type = "button"; b.onclick = () => { this.dir = i; this.walk = false; }; });
    const wb = E("button", "uav-chip", r1, "Walk"); wb.type = "button"; wb.onclick = () => { this.walk = !this.walk; wb.classList.toggle("on", this.walk); };
    const r2 = E("div", "uav-row", prev); r2.style.justifyContent = "center";
    const rnd = E("button", "uav-chip", r2, "Surprise me"); rnd.type = "button"; rnd.onclick = () => { const nm = this.spec.name, ag = this.spec.age; this.spec = { ...randomAvatar(rng(Date.now() & 0xffffff), ag), name: nm }; this.render(); };
    const rst = E("button", "uav-chip", r2, "Reset"); rst.type = "button"; rst.onclick = () => { const nm = this.spec.name; this.spec = { ...defaultAvatar(), name: nm }; this.render(); };
    const main = E("div", "uav-card uav-main", wrap); const tabs = E("div", "uav-tabs", main);
    for (const t of ["Body", "Face", "Hair", "Outfit", "Extras", "Jewelry", "You"]) { const b = E("button", "uav-chip", tabs, t); b.type = "button"; b.dataset.tab = t; b.onclick = () => { this.tab = t; this.render(); }; }
    this.body = E("div", "uav-bd", main); this.root.addEventListener("keydown", (e) => e.stopPropagation()); this.root.addEventListener("pointerdown", (e) => e.stopPropagation());
  }
  show() { this.spec = { ...Social.profile.avatar, name: Social.profile.name || Social.profile.avatar.name }; this.root.classList.add("show"); this.render(); this.loop(); }
  hide() { this.root.classList.remove("show"); cancelAnimationFrame(this.raf); }
  private save() { const name = (this.nameInput?.value ?? this.spec.name).trim().slice(0, 14) || "Student"; this.spec.name = name; Social.setProfile({ name, avatar: { ...this.spec }, hasAvatar: true }); this.hide(); this.onSave(this.spec, name); }
  private loop = () => {
    if (!this.root.classList.contains("show")) return; const t = (performance.now() - this.t0) / 1000, c = this.cv.getContext("2d")!; c.clearRect(0, 0, this.cv.width, this.cv.height);
    const look = toLook(this.spec, 11), s = 12.6 * (PORTRAIT_SCALE[this.spec.age] ?? 1) * 0.92; c.save(); c.translate(this.cv.width / 2, this.cv.height - 60); c.scale(s, s);
    c.fillStyle = "rgba(60,40,50,.18)"; c.beginPath(); c.ellipse(0, 1, 13, 4, 0, 0, 7); c.fill();
    c.shadowColor = "rgba(52,34,46,.3)"; c.shadowBlur = 3; c.shadowOffsetY = 1.5; drawChar(c, 0, 0, { ...look, dir: DIRS[this.dir], moving: this.walk, walk: this.walk ? t * 8 : 0, tag: false }, t); c.restore();
    this.raf = requestAnimationFrame(this.loop);
  };

  /* ---------- controls ---------- */
  private set<K extends Key>(k: K, v: AvatarSpec[K]) { (this.spec as any)[k] = v; this.render(false); }
  private chips(label: string, key: Key, opts: { id: string; label: string }[]) {
    E("div", "uav-lab", this.body, label); const row = E("div", "uav-row", this.body);
    for (const o of opts) { const b = E("button", "uav-chip" + (this.spec[key] === o.id ? " on" : ""), row, o.label); b.type = "button"; b.onclick = () => { this.set(key, o.id as any); }; }
  }
  private swatches(label: string, key: Key, pal: string[], none?: string) {
    E("div", "uav-lab", this.body, label); const row = E("div", "uav-row", this.body);
    if (none) { const b = E("button", "uav-sw none" + (this.spec[key] == null ? " on" : ""), row); b.type = "button"; b.title = none; b.setAttribute("aria-label", none); b.onclick = () => this.set(key, null as any); }
    for (const c of pal) { const b = E("button", "uav-sw" + (this.spec[key] === c ? " on" : ""), row); b.type = "button"; b.style.background = c; b.setAttribute("aria-label", c); b.onclick = () => this.set(key, c as any); }
    const inp = E("input", "uav-custom", row) as HTMLInputElement; inp.type = "color"; inp.value = typeof this.spec[key] === "string" && /^#[0-9a-f]{6}$/i.test(this.spec[key] as string) ? (this.spec[key] as string) : pal[0]; inp.title = "Custom colour"; inp.oninput = () => { (this.spec as any)[key] = inp.value; this.renderSoon(); };
  }
  private toggle(label: string, key: Key) { const l = E("label", "uav-switch", this.body); const i = E("input", "", l) as HTMLInputElement; i.type = "checkbox"; i.checked = !!this.spec[key]; i.onchange = () => this.set(key, i.checked as any); l.appendChild(document.createTextNode(label)); }
  private slider(label: string, key: Key, min: number, max: number, step: number) { E("div", "uav-lab", this.body, label); const i = E("input", "", this.body) as HTMLInputElement; i.type = "range"; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(this.spec[key]); i.oninput = () => { (this.spec as any)[key] = Number(i.value); }; }
  private pending = 0; private renderSoon() { clearTimeout(this.pending); this.pending = window.setTimeout(() => this.render(false), 250); }
  render(scrollTop = true) {
    this.root.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === this.tab));
    const y = this.body.scrollTop; this.body.innerHTML = ""; const o = OPTIONS, b = this.body;
    if (this.tab === "Body") { this.chips("Grade band (sets your height)", "age", o.age); this.chips("Build", "build", o.build); this.slider("Head size", "headSize", 0.9, 1.12, 0.01); this.swatches("Skin tone", "skin", SKIN_TONES); this.chips("Pronouns", "pronouns", PRONOUNS.map((p) => ({ id: p, label: p }))); }
    else if (this.tab === "Face") {
      this.chips("Eyes", "eyeShape", o.eyeShape); this.swatches("Eye colour", "eyeColor", EYE_COLORS); this.chips("Eyebrows", "brow", o.brow); this.swatches("Eyebrow colour", "browColor", HAIR_COLORS, "Match hair");
      this.chips("Mouth", "mouthStyle", o.mouthStyle); this.swatches("Lip colour", "lip", ["#8a4650", "#c4463c", "#e8789a", "#b5563e", "#563428", "#e07a66"]); E("div", "uav-lab", b, "Details");
      const r = E("div", "uav-row", b); void r; this.toggle("Freckles", "freckles"); this.toggle("Beauty mark", "mole"); this.toggle("Little nose", "nose"); this.toggle("Rosy cheeks", "blush");
      this.chips("Glasses", "glasses", o.glasses); this.swatches("Glasses colour", "glassColor", ["#5b4048", "#313a3f", "#d9564a", "#4f91c7", "#b8a8da", "#eab94e", "#ffffff", "#3fb8af"]); this.chips("Face marks", "mark", o.mark);
    } else if (this.tab === "Hair") { this.chips("Style", "hairStyle", o.hairStyle); this.chips("Texture", "htex", o.htex); this.swatches("Colour", "hair", HAIR_COLORS); this.swatches("Highlight colour", "hair2", HIGHLIGHT_COLORS, "No highlights"); if (this.spec.hair2) this.chips("Highlight style", "hl", o.hl); this.swatches("Hair clip", "clip", CLOTH_COLORS, "None"); }
    else if (this.tab === "Outfit") {
      this.chips("Top", "top", o.top); this.swatches("Top colour", "shirt", CLOTH_COLORS); this.chips("Pattern", "pattern", o.pattern); this.swatches("Pattern / under-shirt colour", "shirt2", CLOTH_COLORS);
      this.chips("Chest emblem", "emblem", o.emblem); this.chips("Neckwear", "neckwear", o.neckwear.filter((x) => x.id !== "necklace" || OLDER(this.spec.age))); if (this.spec.neckwear !== "none") this.swatches("Neckwear colour", "neckColor", CLOTH_COLORS); this.chips("Bottoms", "bottom", o.bottom); this.swatches("Bottoms colour", "pants", CLOTH_COLORS); this.chips("Shoes", "shoeStyle", o.shoeStyle); this.swatches("Shoe colour", "shoes", SHOE_COLORS);
    } else if (this.tab === "Extras") {
      this.chips("Hat", "hat", o.hat); this.swatches("Hat colour", "hatColor", CLOTH_COLORS); this.chips("Bag", "packStyle", o.packStyle); this.swatches("Bag colour", "pack", CLOTH_COLORS);
      this.swatches("Earrings", "earrings", ["#eab94e", "#fff6ea", "#f28f7e", "#8fc9e8"], "None"); this.swatches("Scarf", "scarf", CLOTH_COLORS, "None"); this.swatches("Badge", "badge", CLOTH_COLORS, "None");
    } else if (this.tab === "Jewelry") {
      if (!OLDER(this.spec.age)) { E("h2", "", b, "Jewelry"); E("p", "", b, "Jewelry unlocks for middle school and high school. Pick Grades 6-8 or High school on the Body tab."); }
      else {
        this.chips("Earring style", "earStyle", o.earStyle); this.swatches("Earrings", "earrings", JEWEL_COLORS, "None"); this.swatches("Nose stud", "nosePin", JEWEL_COLORS, "None");
        this.chips("Wrist", "wrist", o.wrist); if (this.spec.wrist !== "none") this.swatches("Wrist colour", "wristColor", JEWEL_COLORS);
        this.chips("Necklace or neckwear", "neckwear", o.neckwear); if (this.spec.neckwear !== "none") this.swatches("Neckwear colour", "neckColor", [...JEWEL_COLORS, ...CLOTH_COLORS]);
      }
    } else {
      E("h2", "", b, "About you"); E("div", "uav-lab", b, "Your name (classmates will remember it)"); const i = E("input", "", b) as HTMLInputElement; i.type = "text"; i.maxLength = 14; i.value = this.spec.name === "Student" ? "" : this.spec.name; i.placeholder = "Type your name"; this.nameInput = i; i.oninput = () => { this.spec.name = i.value; };
      E("div", "uav-lab", b, "Tip"); E("div", "", b, "Classmates notice what you wear. Try a hat or glasses and see who compliments it. Everything you tell them is remembered, so introduce yourself!");
    }
    this.body.scrollTop = scrollTop ? 0 : y;
  }
}
