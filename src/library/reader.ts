/** The bound-book reader: facing pages that turn, an illustration and animated scene clips on the left, the text on the right, story music,
 *  a bookmark that remembers where your eye last landed, chapter questions, and the checkout / four hour loan rules. */
import type { Book, Mood } from "./books";
import { BOOKS } from "./books";
import { clipsFor, drawIllustration, sentences, type Beat } from "./clips";
import { drawVideo, videoLength, type VideoDef } from "../class3d/reenact";
import { StoryMusic, moodOf } from "./music";
import { questionsFor, type Question } from "./quiz";
import { Library, fmtLeft, PREVIEW_PAGES } from "./loans";

const CSS = `.rd{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:#8a6a4e;background:radial-gradient(ellipse at 50% 30%,#a98763,#6e5039);color:#4A3B3F;font-family:"Fredoka","Trebuchet MS",system-ui,sans-serif}.rd.show{display:flex}
.rd-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;color:#fff6ea}.rd-top h2{font-size:18px;font-weight:600;margin-right:auto}.rd-top small{opacity:.85}
.rd-btn{font:inherit;font-size:14px;color:#4A3B3F;background:#F3E7CF;border:1px solid rgba(255,255,255,.7);border-radius:10px;padding:5px 12px;cursor:pointer;box-shadow:0 2px 0 #C9B28A;min-height:34px}.rd-btn.pri{background:#E07A66;color:#fff;box-shadow:0 2px 0 #b95a48}.rd-btn:disabled{opacity:.5}.rd-btn:focus-visible,.rd-opt:focus-visible{outline:3px solid #4F91C7;outline-offset:2px}
.rd-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px 10px}.rd-book{position:relative;display:grid;grid-template-columns:1fr 1fr;width:min(1100px,100%);height:min(640px,100%);perspective:2000px;border-radius:10px;background:#d9c7a3;padding:10px;box-shadow:0 14px 40px rgba(0,0,0,.5)}
.pg{background:#FFF9F0;overflow:auto;padding:16px 20px;position:relative;display:flex;flex-direction:column;gap:10px}.pg.l{border-radius:8px 0 0 8px;background:linear-gradient(90deg,#FFF9F0 80%,#efe3c8)}.pg.r{border-radius:0 8px 8px 0;background:linear-gradient(270deg,#FFF9F0 80%,#efe3c8)}
.pg h3{font-size:20px;font-weight:600;color:#8A4E3E}.pg .ill{width:100%;aspect-ratio:16/9;border-radius:8px;border:2px solid #C9B28A;display:block;cursor:pointer;background:#fff}.scenes{display:flex;gap:6px;flex-wrap:wrap}.scenes canvas{width:88px;height:50px;border-radius:6px;border:2px solid #C9B28A;cursor:pointer}.scenes canvas.on{border-color:#E07A66}
.cap{font-size:13px;color:#8A7A70}.rd-text{font-family:Georgia,"Iowan Old Style",serif;font-size:19px;line-height:1.6;user-select:text}.rd-text span.s{border-radius:4px;transition:background .3s;cursor:text}.rd-text span.s.gaze{background:rgba(234,185,78,.38);box-shadow:0 0 0 3px rgba(234,185,78,.2)}
.rd-ribbon{position:absolute;right:10px;width:16px;height:34px;background:#C4463C;clip-path:polygon(0 0,100% 0,100% 100%,50% 78%,0 100%);display:none}.rd-ribbon.show{display:block}.pgno{margin-top:auto;font-size:12px;color:#8A7A70;text-align:center}
.leaf{position:absolute;top:10px;bottom:10px;width:calc(50% - 10px);transform-style:preserve-3d;transition:transform .8s cubic-bezier(.5,.1,.3,1);z-index:5}.leaf>.pg{position:absolute;inset:0;backface-visibility:hidden}.leaf .back{transform:rotateY(180deg)}
.rd-nav{display:flex;gap:10px;justify-content:center;align-items:center;padding:8px;color:#fff6ea}.rd-modal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(30,22,20,.6)}.rd-modal.show{display:flex}
.rd-card{width:min(720px,94vw);max-height:92vh;overflow:auto;background:#F3E7CF;border-radius:16px;padding:16px 20px;box-shadow:0 3px 0 #C9B28A,0 14px 34px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:10px}.rd-card canvas{width:100%;border-radius:10px;border:2px solid #C9B28A}
.rd-opt{font:inherit;font-size:16px;text-align:left;color:#4A3B3F;background:#fff;border:2px solid #C9B28A;border-radius:10px;padding:8px 12px;cursor:pointer}.rd-opt.ok{background:#d6ecd6;border-color:#5FAE6A}.rd-opt.no{background:#f9c9c0;border-color:#D9564A}.rd-q{font-size:18px;font-weight:500}
.rd-blank{position:absolute;inset:0;z-index:6;background:#d9c7a3;display:none;align-items:center;justify-content:center;text-align:center;flex-direction:column;gap:12px;border-radius:10px;font-size:20px}.rd-blank.show{display:flex}.rd-chip{background:rgba(0,0,0,.25);padding:3px 10px;border-radius:10px;font-size:13px}
@media(max-width:760px){.rd-book{grid-template-columns:1fr;height:100%;overflow:auto}.pg.l{border-radius:8px 8px 0 0}.pg.r{border-radius:0 0 8px 8px}.rd-text{font-size:17px}}`;
let cssOk = false; const ensureCss = () => { if (cssOk) return; cssOk = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
function el<K extends keyof HTMLElementTagNameMap>(t: K, c = "", p?: HTMLElement, x?: string) { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; p?.appendChild(e); return e; }
const btn = (p: HTMLElement, t: string, f: () => void, c = "rd-btn") => { const b = el("button", c, p, t); b.type = "button"; b.onclick = f; return b; };

interface Page { ch: number; beats: Beat[]; first: boolean; sents: string[] }
export class Reader {
  root: HTMLElement; book!: Book; pages: Page[] = []; pi = 0; sent = 0; clips: VideoDef[] = []; chStart: number[] = []; chEnd: number[] = []; music = new StoryMusic(); onClose: () => void = () => {};
  private bookEl!: HTMLElement; private title!: HTMLElement; private chip!: HTMLElement; private modal: HTMLElement; private blank!: HTMLElement; private scene = 0; private ribbon!: HTMLElement; private textEl: HTMLElement | null = null;
  private timer = 0; private flipping = false; private anim = 0; private gazeT = 0; private tickT = 0; private openedAt = 0; private checkoutOffered = false;
  constructor(host: HTMLElement = document.body) {
    ensureCss(); this.root = el("div", "rd", host); this.root.setAttribute("role", "dialog"); this.root.setAttribute("aria-label", "Book reader");
    const top = el("div", "rd-top", this.root); this.title = el("h2", "", top); this.chip = el("span", "rd-chip", top);
    btn(top, "Mark my place", () => this.markHere()); const mus = btn(top, "Music: on", () => { Library.setMusic(!Library.music); this.music.setMuted(!Library.music); mus.textContent = `Music: ${Library.music ? "on" : "off"}`; });
    btn(top, "Close book", () => this.close());
    const stage = el("div", "rd-stage", this.root); this.bookEl = el("div", "rd-book", stage); this.ribbon = el("div", "rd-ribbon"); this.blank = el("div", "rd-blank", this.bookEl);
    const nav = el("div", "rd-nav", this.root); btn(nav, "Previous page", () => this.flip(-1)); this.pageLbl = el("span", "", nav); btn(nav, "Next page", () => this.flip(1), "rd-btn pri");
    this.modal = el("div", "rd-modal", this.root);
    this.root.addEventListener("keydown", (e) => { if (this.modal.classList.contains("show")) return; if (e.key === "ArrowRight" || e.key === "PageDown") this.flip(1); else if (e.key === "ArrowLeft" || e.key === "PageUp") this.flip(-1); else if (e.key === "Escape") this.close(); else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); this.moveGaze(e.key === "ArrowDown" ? 1 : -1); } });
    let sx = 0; this.bookEl.addEventListener("pointerdown", (e) => { sx = e.clientX; }); this.bookEl.addEventListener("pointerup", (e) => { const d = e.clientX - sx; if (Math.abs(d) > 90 && (e.target as HTMLElement).tagName !== "SPAN") this.flip(d < 0 ? 1 : -1); });
  }
  private pageLbl!: HTMLElement;
  get isOpen() { return this.root.classList.contains("show"); }

  /* ------------------------------------------------------------ opening a book */
  open(book: Book) {
    this.book = book; const { beats, clips } = clipsFor(book); this.clips = clips; this.pages = []; this.chStart = []; this.chEnd = [];
    book.chapters.forEach((_, ci) => { const bs = beats.filter((b) => b.chapter === ci); this.chStart[ci] = this.pages.length; for (let i = 0; i < bs.length; i += 4) { const pb = bs.slice(i, i + 4); this.pages.push({ ch: ci, beats: pb, first: i === 0, sents: pb.flatMap((b) => sentences(b.text).filter((s) => s !== "¶")) }); } this.chEnd[ci] = this.pages.length - 1; });
    const L = Library.get(book.id); this.pi = Math.min(L.page, this.pages.length - 1); this.sent = L.sent; this.scene = 0; this.title.textContent = book.title; this.root.classList.add("show"); this.openedAt = Date.now(); this.checkoutOffered = false;
    this.modal.classList.remove("show"); this.render(false); this.root.tabIndex = -1; this.root.focus({ preventScroll: true });
    if (Library.expired(book.id)) this.showBlank(); else this.blank.classList.remove("show");
    if (L.maxPage > 0 || L.sent > 0) setTimeout(() => this.glowResume(), 600);
    this.music.setMuted(!Library.music); void this.music.start(this.pageMood(), [...book.id].reduce((a, c) => a + c.charCodeAt(0), 0)); this.music.setVolume(Library.vol);
    clearInterval(this.timer); this.timer = window.setInterval(() => this.tick(), 1000);
  }
  close() { if (!this.isOpen) return; this.saveBookmark(); this.music.stop(); clearInterval(this.timer); cancelAnimationFrame(this.anim); this.root.classList.remove("show"); this.modal.classList.remove("show"); this.onClose(); }
  private pageMood(): Mood { const p = this.pages[this.pi]; return p ? moodOf(p.sents.join(" "), this.book.chapters[p.ch].mood) : this.book.mood; }

  /* ------------------------------------------------------------ rendering */
  private leftEl(pi: number, live: boolean): HTMLElement {
    const p = this.pages[pi], d = el("div", "pg l"); if (!p) return d; const ch = this.book.chapters[p.ch];
    el("h3", "", d, p.first ? `Chapter ${p.ch + 1}: ${ch.title}` : ch.title); const big = el("canvas", "ill", d) as HTMLCanvasElement; big.width = 480; big.height = 270; big.setAttribute("aria-label", "Illustration. Press to play the scene");
    const sc = live ? Math.min(this.scene, p.beats.length - 1) : 0, clip = (b: Beat) => this.clips[b.idx]; drawIllustration(big, clip(p.beats[sc]));
    const cap = el("div", "cap", d, p.beats[sc].quote ? `"${p.beats[sc].quote}"` : p.beats[sc].text.slice(0, 120)); const row = el("div", "scenes", d);
    p.beats.forEach((b, i) => { const t = el("canvas", i === sc ? "on" : "", row) as HTMLCanvasElement; t.width = 176; t.height = 100; drawIllustration(t, clip(b)); t.title = `Scene ${b.idx + 1} of ${this.clips.length}`; if (live) t.onclick = () => { this.scene = i; this.renderLeftLive(); }; });
    el("div", "cap", d, `Scene ${p.beats[sc].idx + 1} of ${this.clips.length}. Press the picture to play it.`); if (live) { big.onclick = () => this.playClip(clip(p.beats[sc]), big); }
    el("div", "pgno", d, `${pi * 2 + 1}`); return d;
  }
  private rightEl(pi: number, live: boolean): HTMLElement {
    const p = this.pages[pi], d = el("div", "pg r"); if (!p) return d; const t = el("div", "rd-text", d); let n = 0;
    p.beats.forEach((b) => { sentences(b.text).filter((s) => s !== "¶").forEach((s) => { const sp = el("span", "s", t, s + " "); sp.dataset.s = String(n); if (live && n === this.sent) sp.classList.add("gaze"); n++; }); });
    if (live) { this.textEl = t; const mv = (e: Event) => { const s = (e.target as HTMLElement).closest("span.s") as HTMLElement | null; if (s) this.setGaze(+s.dataset.s!); }; t.addEventListener("pointermove", mv); t.addEventListener("pointerdown", mv); d.appendChild(this.ribbon); setTimeout(() => this.placeRibbon(), 30); }
    el("div", "pgno", d, `${pi * 2 + 2}  ·  page ${pi + 1} of ${this.pages.length}`); return d;
  }
  private render(animate: boolean, dir = 1) {
    const B = this.bookEl, old = Array.from(B.querySelectorAll(":scope > .pg")); const L = this.leftEl(this.pi, true), R = this.rightEl(this.pi, true); old.forEach((x) => x.remove()); B.insertBefore(R, this.blank); B.insertBefore(L, R); void animate; void dir;
    this.pageLbl.textContent = `Page ${this.pi + 1} of ${this.pages.length}`; this.music.setMood(this.pageMood()); this.updateChip();
  }
  private renderLeftLive() { const old = this.bookEl.querySelector(":scope > .pg.l"); if (!old) return; const n = this.leftEl(this.pi, true); old.replaceWith(n); }
  private flip(dir: number) {
    if (this.flipping || this.modal.classList.contains("show") || this.blank.classList.contains("show")) return; const to = this.pi + dir; if (to < 0) return;
    if (to >= this.pages.length) { this.finishBook(); return; }
    if (dir > 0) { const gate = this.gateForward(); if (gate) return; }
    this.saveBookmark(); const wide = this.bookEl.clientWidth > 760; if (!wide) { this.pi = to; this.sent = 0; this.scene = 0; this.render(false); this.afterTurn(); return; }
    const B = this.bookEl, leaf = el("div", "leaf", B); this.flipping = true; const next = dir > 0;
    const front = next ? this.rightEl(this.pi, false) : this.leftEl(this.pi, false), back = next ? this.leftEl(to, false) : this.rightEl(to, false); front.classList.add("front"); back.classList.add("back"); leaf.append(front, back);
    leaf.style.left = next ? "50%" : "10px"; leaf.style.transformOrigin = next ? "left center" : "right center";
    // underneath: the spread after the turn, except the side the leaf is still covering
    const oldL = B.querySelector(":scope > .pg.l"), oldR = B.querySelector(":scope > .pg.r"); if (next) { const R = this.rightEl(to, false); oldR?.replaceWith(R); } else { const Lp = this.leftEl(to, false); oldL?.replaceWith(Lp); }
    requestAnimationFrame(() => requestAnimationFrame(() => { leaf.style.transform = `rotateY(${next ? -180 : 180}deg)`; }));
    setTimeout(() => { leaf.remove(); this.flipping = false; this.pi = to; this.sent = 0; this.scene = 0; this.render(false); this.afterTurn(); }, 840);
  }
  private afterTurn() { const L = Library.get(this.book.id); Library.update(this.book.id, (l) => { l.page = this.pi; l.sent = 0; l.maxPage = Math.max(l.maxPage, this.pi); void L; }); if (!Library.open(this.book.id) && this.pi >= 1 && !this.checkoutOffered) { this.checkoutOffered = true; } this.updateChip(); }

  /* ------------------------------------------------------------ checkout, loans and chapter questions */
  private tick() {
    if (!this.isOpen) return; const id = this.book.id; Library.update(id, (l) => { if (l.active) l.readSecs++; }); this.updateChip();
    if (Library.get(id).active && !Library.open(id)) { Library.expire(id); this.saveBookmark(); this.showBlank(); }
  }
  private updateChip() {
    const id = this.book.id, l = Library.get(id); this.chip.innerHTML = ""; if (Library.open(id)) { this.chip.textContent = `Checked out: ${fmtLeft(Library.timeLeft(id))}`; return; }
    if (l.checkouts > 0) { this.chip.textContent = "Loan ended"; return; }
    if (this.pi >= 1) { const b = btn(this.chip, "Check out this book (4 hours)", () => this.doCheckout(), "rd-btn pri"); b.style.minHeight = "28px"; } else this.chip.textContent = "Previewing";
  }
  private doCheckout() { Library.checkout(this.book.id); this.blank.classList.remove("show"); this.updateChip(); }
  private gateForward(): boolean {
    const id = this.book.id, l = Library.get(id);
    if (!Library.open(id) && this.pi >= PREVIEW_PAGES - 1) { this.modalMsg("Keep reading?", "You have read the preview. Check out this book to keep reading. You get four hours of open access.", [["Check out (4 hours)", () => { this.doCheckout(); this.modal.classList.remove("show"); }], ["Not now", () => this.modal.classList.remove("show")]]); return true; }
    const end = this.sectionEnd(l.frontier, l.level); if (this.pi >= end && l.frontier <= end) { this.askSection(l.frontier, end); return true; }
    return false;
  }
  private sectionEnd(frontier: number, level: 1 | 2 | 3): number {
    const c = this.pages[Math.min(frontier, this.pages.length - 1)].ch, len = this.chEnd[c] - this.chStart[c] + 1;
    if (level === 1) return Math.min(this.chEnd[c], frontier + Math.max(2, Math.ceil(len / 2)) - 1); if (level === 3) return this.chEnd[Math.min(c + 1, this.book.chapters.length - 1)]; return this.chEnd[c];
  }
  private partial(from: number, to: number) { const ps = this.pages.slice(from, to + 1), ch = this.book.chapters[ps[0].ch]; return { ...this.book, chapters: [{ title: ch.title, gist: this.book.chapters[ps[ps.length - 1].ch].gist, mood: ch.mood, text: ps.map((p) => p.beats.map((b) => b.text).join(" ")).join("\n\n") }] } as Book; }
  private askSection(from: number, to: number) {
    const L = Library.get(this.book.id), qs = questionsFor(this.partial(from, to), [0], 5, from * 7 + L.checkouts + 3);
    this.runQuiz("Check your reading", qs, (right, total) => {
      const pct = total ? right / total : 1, level = pct < 0.6 ? 1 : pct >= 0.99 ? 3 : 2 as 1 | 2 | 3; Library.update(this.book.id, (l) => { l.frontier = to + 1; l.level = (pct < 0.6 ? Math.max(1, l.level - 1) : pct >= 0.99 ? Math.min(3, l.level + 1) : l.level) as 1 | 2 | 3; l.scores.push(pct); void level; });
      const nl = Library.get(this.book.id).level; return pct < 0.6 ? `You got ${right} of ${total}. The next parts will be shorter so they are easier to digest. Let's reread this part first.` : pct >= 0.99 ? `${right} of ${total}. Excellent. The next sections will be a little longer.` : `${right} of ${total}. Good. On to the next part.`;
    }, (pct) => { if (pct < 0.6) { this.pi = from; this.sent = 0; this.render(false); } else this.flipAfterQuiz(); });
  }
  private flipAfterQuiz() { const to = this.pi + 1; if (to < this.pages.length) { this.pi = to; this.sent = 0; this.scene = 0; this.render(false); this.afterTurn(); } else this.finishBook(); }
  private finishBook() { Library.update(this.book.id, (l) => { l.finished = true; }); this.modalMsg("The End", `You finished ${this.book.title}. Nice reading! You can check out another book, or ask your study group about it.`, [["Close book", () => { this.modal.classList.remove("show"); this.close(); }]]); }
  private showBlank() {
    const b = this.blank; b.classList.add("show"); b.innerHTML = ""; el("div", "", b, "Your loan has ended."); el("div", "cap", b, "The pages are blank until you check the book out again. To check it out you answer a short quiz on what you read last. How well you remember decides where the book opens.");
    btn(b, "Check out again (take the quiz)", () => this.recheckout(), "rd-btn pri");
  }
  private recheckout() {
    const l = Library.get(this.book.id), pb = this.pages[Math.min(l.page, this.pages.length - 1)], readPages = l.maxPage + 1, n = Math.max(5, Math.min(10, Math.round(readPages / 2))); const qs: Question[] = [];
    for (let c = pb.ch; c >= 0 && qs.length < n; c--) for (const q of questionsFor(this.book, [c], 5, c * 11 + l.checkouts + 5)) if (qs.length < n && !qs.some((x) => x.q === q.q)) qs.push(q);
    for (let sd = 1; qs.length < n && sd < 14; sd++) for (let c = pb.ch; c >= 0 && qs.length < n; c--) for (const q of questionsFor(this.book, [c], 5, sd * 17 + c * 3 + 1)) if (qs.length < n && !qs.some((x) => x.q === q.q)) qs.push(q);
    this.runQuiz("Welcome back: what do you remember?", qs, (right, total) => {
      const pct = total ? right / total : 1; let page = l.page, sent = l.sent, msg: string;
      if (pct >= 0.8) msg = `${right} of ${total}. You remember it well, so the book opens exactly where your eye last landed.`;
      else if (pct >= 0.5) { page = this.chStart[pb.ch]; sent = 0; msg = `${right} of ${total}. The book opens at the start of the chapter so you can refresh.`; }
      else { const pc = Math.max(0, pb.ch - 1); page = this.chStart[pc]; sent = 0; msg = `${right} of ${total}. The book opens one chapter earlier so you can reread.`; }
      Library.update(this.book.id, (x) => { x.page = page; x.sent = sent; x.frontier = Math.min(x.frontier, page); x.level = pct < 0.5 ? 1 : x.level; }); Library.checkout(this.book.id); this.pi = page; this.sent = sent; return msg;
    }, () => { this.blank.classList.remove("show"); this.render(false); this.glowResume(); });
  }
  private runQuiz(title: string, qs: Question[], onDone: (right: number, total: number) => string, after: (pct: number) => void) {
    if (!qs.length) { onDone(0, 0); after(1); return; } let i = 0, right = 0; const M = this.modal; M.classList.add("show");
    const show = () => {
      M.innerHTML = ""; const C = el("div", "rd-card", M); el("b", "", C, `${title}: question ${i + 1} of ${qs.length}`); const q = qs[i]; el("div", "rd-q", C, q.q); const fb = el("div", "cap", C); let done = false;
      q.options.forEach((o, k) => { const b = btn(C, o, () => { if (done) return; done = true; const ok = k === q.answer; if (ok) right++; b.classList.add(ok ? "ok" : "no"); (C.querySelectorAll(".rd-opt")[q.answer] as HTMLElement).classList.add("ok"); fb.textContent = (ok ? "Correct. " : "Not quite. ") + q.why; const nx = btn(C, i + 1 < qs.length ? "Next question" : "Finish", () => { i++; if (i < qs.length) show(); else { const m = onDone(right, qs.length), pct = right / qs.length; M.innerHTML = ""; const R = el("div", "rd-card", M); el("b", "", R, "Questions done"); el("div", "rd-q", R, m); btn(R, "Continue", () => { M.classList.remove("show"); after(pct); }, "rd-btn pri"); } }, "rd-btn pri"); nx.focus(); }, "rd-opt"); });
    }; show();
  }
  private modalMsg(title: string, body: string, actions: [string, () => void][]) { const M = this.modal; M.classList.add("show"); M.innerHTML = ""; const C = el("div", "rd-card", M); el("b", "", C, title); el("div", "rd-q", C, body); const row = el("div", "", C); row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap"; actions.forEach(([t, f], i) => btn(row, t, f, i === 0 ? "rd-btn pri" : "rd-btn")); }

  /* ------------------------------------------------------------ bookmark: where the eye last landed */
  private setGaze(n: number) { if (n === this.sent && this.textEl?.querySelector(".gaze")) return; this.sent = n; this.textEl?.querySelectorAll("span.s").forEach((s) => s.classList.toggle("gaze", +(s as HTMLElement).dataset.s! === n)); this.placeRibbon(); clearTimeout(this.gazeT); this.gazeT = window.setTimeout(() => this.saveBookmark(), 500); }
  private moveGaze(d: number) { const n = this.textEl?.querySelectorAll("span.s").length ?? 0; if (n) this.setGaze(Math.max(0, Math.min(n - 1, this.sent + d))); }
  private markHere() { this.saveBookmark(); this.glowResume("Bookmarked"); }
  private saveBookmark() { if (!this.book) return; Library.update(this.book.id, (l) => { l.page = this.pi; l.sent = this.sent; l.maxPage = Math.max(l.maxPage, this.pi); }); }
  private placeRibbon() { const s = this.textEl?.querySelector<HTMLElement>("span.s.gaze"); if (!s) { this.ribbon.classList.remove("show"); return; } this.ribbon.style.top = `${s.offsetTop + (this.textEl?.offsetTop ?? 0) - 6}px`; this.ribbon.classList.add("show"); s.scrollIntoView({ block: "nearest" }); }
  private glowResume(label = "Where you left off") { this.placeRibbon(); const s = this.textEl?.querySelector<HTMLElement>("span.s.gaze"); if (!s) return; s.title = label; s.animate([{ background: "rgba(224,122,102,.7)" }, { background: "rgba(234,185,78,.38)" }], { duration: 1800 }); }

  /* ------------------------------------------------------------ scene clips */
  private playClip(v: VideoDef, canvas: HTMLCanvasElement) {
    cancelAnimationFrame(this.anim); const c = canvas.getContext("2d")!, len = videoLength(v), t0 = performance.now(); const frame = (now: number) => { const t = (now - t0) / 1000; if (t >= len) { drawIllustration(canvas, v); return; } drawVideo(c, canvas.width, canvas.height, v, t, { captions: true }); this.anim = requestAnimationFrame(frame); }; this.anim = requestAnimationFrame(frame);
  }
}
export const bookById = (id: string) => BOOKS.find((b) => b.id === id);
