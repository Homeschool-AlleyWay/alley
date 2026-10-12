/** Edit-room panel: catalogue drawer, selected-item controls, undo/redo, theme editor, reset. All edits go through DormApiPlus (it autosaves via onChange). */
import { defaultDormLayout, type DormApiPlus } from "../room";
import type { FurnitureCat, FurnitureDef, Placed } from "../types";
import { E, btn, debounce } from "./dom";

const CAT_NAME: Record<FurnitureCat, string> = { bed: "Beds", desk: "Desks", seat: "Seats", storage: "Storage", tech: "Tech", decor: "Decor", wall: "On the wall", floor: "Rugs & floor", light: "Lights", plant: "Plants" };
const CAT_ICON: Record<FurnitureCat, string> = { bed: "🛏️", desk: "🖥️", seat: "🪑", storage: "🗄️", tech: "💻", decor: "🎨", wall: "🖼️", floor: "🟫", light: "💡", plant: "🪴" };
const WALL_COLORS = ["#4FB6B2", "#F6B294", "#8FC9E8", "#F8D977", "#B8A8DA", "#A9DCC0", "#EAA5B2", "#F4EBDD", "#E8567C", "#4F91C7", "#3D4A5C", "#FFFFFF"];
const FLOOR_COLORS = ["#C98F58", "#E8C99A", "#8A5A3A", "#B5733C", "#9DA7AA", "#F4EBDD", "#5C7A68", "#3D4A5C"];
const TRIM_COLORS = ["#FFFFFF", "#F4EBDD", "#C98F58", "#2B2F3A", "#E8567C", "#4F91C7"];
const RUG_COLORS = ["#E8567C", "#4F91C7", "#F2B138", "#3FB68B", "#8D6BD4", "#F28C4E"];
const WALL_PAT = [["plain", "Plain"], ["stripes", "Stripes"], ["dots", "Dots"], ["brick", "Brick"]], FLOOR_PAT = [["wood", "Wood"], ["tile", "Tiles"], ["carpet", "Carpet"]];

export interface EditCtx { api(): DormApiPlus; camYaw(): number; toast(m: string): void }

export class EditPanel {
  private selBox!: HTMLElement; private msg!: HTMLElement; private undoB!: HTMLButtonElement; private redoB!: HTMLButtonElement; private open_ = false; private confirmReset = false;
  constructor(private c: EditCtx) {}
  get isOpen() { return this.open_; }
  private get api() { return this.c.api(); }
  private say(m: string) { if (this.msg) this.msg.textContent = m; }
  syncHistory() { if (!this.open_) return; this.undoB.disabled = !this.api.canUndo; this.redoB.disabled = !this.api.canRedo; }
  /** called by the page whenever the selection (or the layout under it) changes */
  sync() { if (!this.open_) return; this.drawSel(); this.syncHistory(); }

  open(body: HTMLElement): () => void {
    this.open_ = true; const api = this.api; api.setEditing(true);
    const tb = E("div", "edit-tb", body);
    this.undoB = btn(tb, "↶ Undo", () => { if (!api.undo()) this.say("Nothing to undo."); this.sync(); }, "dp-btn dp-sm", "Undo");
    this.redoB = btn(tb, "↷ Redo", () => { if (!api.redo()) this.say("Nothing to redo."); this.sync(); }, "dp-btn dp-sm", "Redo");
    const rs = btn(tb, "Reset room", () => {
      if (!this.confirmReset) { this.confirmReset = true; rs.textContent = "Sure? Tap again"; rs.classList.add("go"); setTimeout(() => { this.confirmReset = false; rs.textContent = "Reset room"; rs.classList.remove("go"); }, 3500); return; }
      this.confirmReset = false; rs.textContent = "Reset room"; rs.classList.remove("go"); const ph = api.layout.photos; const l = defaultDormLayout(); if (ph) l.photos = ph; api.setLayout(l); api.setEditing(true); this.say("Your room is back to how it started."); this.sync();
    }, "dp-btn dp-sm", "Reset room to the starting layout");
    this.msg = E("div", "dp-note", body); this.msg.setAttribute("aria-live", "polite"); this.msg.textContent = "Tap a piece to pick it up. Drag it on the floor, or use the arrows.";
    this.selBox = E("div", "", body);
    this.catalogue(E("div", "", body)); this.theme(E("div", "", body));
    this.sync();
    return () => { this.open_ = false; api.setEditing(false); api.saveLocal(); };
  }

  private drawSel() {
    const box = this.selBox; box.innerHTML = ""; const api = this.api, p = api.selected; if (!p) return;
    const def = api.def(p.def); if (!def) return;
    const card = E("div", "dp-card sel-card", box); E("b", "", card, `${CAT_ICON[def.cat]} ${def.name}`); if (def.core) E("small", "dp-note", card, "  (a main piece: you can move it but not remove it)");
    const move = (dir: "up" | "down" | "left" | "right") => {
      const y = this.c.camYaw(), vs: Record<string, [number, number]> = { up: [-Math.sin(y), -Math.cos(y)], down: [Math.sin(y), Math.cos(y)], right: [Math.cos(y), -Math.sin(y)], left: [-Math.cos(y), Math.sin(y)] }, v = vs[dir];
      const ax = Math.abs(v[0]) > Math.abs(v[1]); api.moveSelected(ax ? Math.sign(v[0]) * 0.25 : 0, ax ? 0 : Math.sign(v[1]) * 0.25); this.syncHistory();
    };
    const r1 = E("div", "dp-row", card); E("span", "dp-note", r1, "Move");
    for (const [d, l, a] of [["left", "◀", "Move left"], ["up", "▲", "Move away"], ["down", "▼", "Move closer"], ["right", "▶", "Move right"]] as const) btn(r1, l, () => move(d), "dp-btn dp-sm", a).style.minWidth = "44px";
    if (!def.wall) { const r2 = E("div", "dp-row", card); E("span", "dp-note", r2, "Turn"); btn(r2, "↺", () => { api.rotateSelected(-1); this.syncHistory(); }, "dp-btn dp-sm", "Turn left"); btn(r2, "↻", () => { api.rotateSelected(1); this.syncHistory(); }, "dp-btn dp-sm", "Turn right"); }
    const cur = p.color; E("div", "dp-lab", card, "Colour"); const cr = E("div", "dp-row", card);
    const recolor = (c: string) => { api.recolorSelected(c); this.syncHistory(); this.drawSel(); };
    for (const c of def.colors) { const s = E("button", "dp-sw" + (c.toLowerCase() === cur.toLowerCase() ? " on" : ""), cr); s.type = "button"; s.style.background = c; s.setAttribute("aria-label", `Colour ${c}`); s.onclick = () => recolor(c); }
    const ci = E("input", "", cr) as HTMLInputElement; ci.type = "color"; ci.value = cur; ci.title = "Custom colour"; ci.setAttribute("aria-label", "Custom colour"); ci.style.cssText = "width:44px;height:40px;border:0;background:none;padding:0"; ci.onchange = () => recolor(ci.value);
    if (def.variants && def.variants > 1) {
      const vr = E("div", "dp-row", card); E("span", "dp-note", vr, "Style"); const n = def.variants, v0 = p.variant ?? 0;
      const setV = (v: number) => { const q = api.selected; if (!q) return; q.variant = (v + n) % n; api.recolorSelected(q.color); this.syncHistory(); this.drawSel(); };
      btn(vr, "◀", () => setV(v0 - 1), "dp-btn dp-sm", "Previous style"); E("span", "", vr, `${v0 + 1} of ${n}`); btn(vr, "▶", () => setV(v0 + 1), "dp-btn dp-sm", "Next style");
    }
    const ar = E("div", "dp-row", card);
    btn(ar, "⧉ Duplicate", () => this.add(def, p), "dp-btn dp-sm", "Duplicate");
    const del = btn(ar, "🗑 Delete", () => { api.deleteSelected(); this.say("Removed."); this.sync(); }, "dp-btn dp-sm", "Delete"); del.disabled = !!def.core;
    btn(ar, "Done", () => { api.select(null); }, "dp-btn dp-sm", "Put it down");
  }

  private add(def: FurnitureDef, from?: Placed) {
    const api = this.api;
    if (def.core && api.layout.items.some((i) => i.def === def.id)) { this.say(`You already have a ${def.name}. Pick it up to move it.`); return; }
    const np = api.add(def.id, from?.color);
    if (!np) { this.say(api.layout.items.length >= 120 ? "The room is full. Take something out first." : `No space for a ${def.name} right now. Move something first.`); return; }
    if (from && def.variants && from.variant) { np.variant = from.variant; api.recolorSelected(np.color); }
    this.say(`Added ${def.name}.`); this.sync();
  }

  private catalogue(host: HTMLElement) {
    E("div", "dp-lab", host, "Add furniture"); const defs = this.api.catalog(), cats = [...new Set(defs.map((d) => d.cat))];
    let cat: FurnitureCat | "all" = "all", q = "";
    const chips = E("div", "dp-row", host), search = E("input", "dp-in", host) as HTMLInputElement; search.type = "search"; search.placeholder = "Search furniture"; search.setAttribute("aria-label", "Search furniture");
    const grid = E("div", "cat-grid", host);
    const draw = () => {
      chips.innerHTML = ""; const mk = (id: FurnitureCat | "all", label: string) => { const b = btn(chips, label, () => { cat = id; draw(); }, "dp-btn dp-sm" + (cat === id ? " on" : "")); b.setAttribute("aria-pressed", String(cat === id)); };
      mk("all", "All"); for (const c of cats) mk(c, `${CAT_ICON[c]} ${CAT_NAME[c]}`);
      grid.innerHTML = ""; const list = defs.filter((d) => (cat === "all" || d.cat === cat) && (!q || d.name.toLowerCase().includes(q) || CAT_NAME[d.cat].toLowerCase().includes(q)));
      if (!list.length) E("p", "dp-note", grid, "Nothing matches. Try another word.").style.gridColumn = "1/-1";
      for (const d of list) { const b = E("button", "cat-it", grid); b.type = "button"; b.setAttribute("aria-label", `Add ${d.name}`); E("b", "", b, CAT_ICON[d.cat]); E("span", "", b, d.name); E("small", "", b, d.core ? "main piece" : CAT_NAME[d.cat]); b.onclick = () => this.add(d); }
    };
    search.oninput = () => { q = search.value.trim().toLowerCase(); draw(); search.focus(); }; draw();
  }

  private theme(host: HTMLElement) {
    E("div", "dp-lab", host, "Room colours"); const api = this.api, th = () => api.layout.theme;
    const split = (v: string): [string, string] => { const [c, p] = v.split("|"); return [c, p || ""]; };
    const set = debounce((t: Parameters<DormApiPlus["setTheme"]>[0]) => { api.setTheme(t); this.syncHistory(); }, 140);
    const section = (title: string, key: "wall" | "floor", pats: string[][], pal: string[]) => {
      const box = E("div", "dp-card", host); box.style.marginBottom = "8px"; E("b", "", box, title);
      const draw = () => {
        box.querySelectorAll(".dp-row").forEach((r) => r.remove()); const [c, p] = split(th()[key]);
        const pr = E("div", "dp-row", box); for (const [id, l] of pats) { const b = btn(pr, l, () => { set({ [key]: `${split(th()[key])[0]}|${id}` }); setTimeout(draw, 200); }, "dp-btn dp-sm" + (p === id ? " on" : "")); b.setAttribute("aria-pressed", String(p === id)); }
        const cr = E("div", "dp-row", box); for (const col of pal) { const s = E("button", "dp-sw" + (col.toLowerCase() === c.toLowerCase() ? " on" : ""), cr); s.type = "button"; s.style.background = col; s.setAttribute("aria-label", `${title} colour ${col}`); s.onclick = () => { set({ [key]: `${col}|${split(th()[key])[1] || pats[0][0]}` }); setTimeout(draw, 200); }; }
        const ci = E("input", "", cr) as HTMLInputElement; ci.type = "color"; ci.value = c; ci.setAttribute("aria-label", `${title} custom colour`); ci.style.cssText = "width:44px;height:40px;border:0;background:none;padding:0"; ci.oninput = () => set({ [key]: `${ci.value}|${split(th()[key])[1] || pats[0][0]}` });
      };
      draw();
    };
    section("Wall", "wall", WALL_PAT, WALL_COLORS); section("Floor", "floor", FLOOR_PAT, FLOOR_COLORS);
    const simple = (title: string, key: "trim" | "rug", pal: string[]) => {
      const box = E("div", "dp-card", host); box.style.marginBottom = "8px"; E("b", "", box, title); const cr = E("div", "dp-row", box);
      for (const col of pal) { const s = E("button", "dp-sw" + (th()[key].toLowerCase() === col.toLowerCase() ? " on" : ""), cr); s.type = "button"; s.style.background = col; s.setAttribute("aria-label", `${title} colour ${col}`); s.onclick = () => { api.setTheme({ [key]: col }); this.syncHistory(); cr.querySelectorAll(".dp-sw").forEach((x) => x.classList.toggle("on", x === s)); }; }
    };
    simple("Trim", "trim", TRIM_COLORS); simple("Rug", "rug", RUG_COLORS);
    const wb = E("div", "dp-card", host); E("b", "", wb, "Window view"); const wr = E("div", "dp-row", wb);
    for (const [id, l] of [["auto", "Follows the clock"], ["day", "Always day"], ["night", "Always night"]] as const) { const b = btn(wr, l, () => { api.setTheme({ window: id }); wr.querySelectorAll("button").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); }); this.syncHistory(); }, "dp-btn dp-sm" + (th().window === id ? " on" : "")); b.setAttribute("aria-pressed", String(th().window === id)); }
  }
}
