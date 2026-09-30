import sys, json
from playwright.sync_api import sync_playwright
URL = "http://localhost:8765/index.html"; errs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1280, "height": 760})
    IDLE = "() => { const c = window.__unify.cameras.main; return !c.fadeEffect.isRunning && !c.panEffect.isRunning && !c.zoomEffect.isRunning }"
    pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_function("window.__unify && window.__unify.player", timeout=90000); pg.wait_for_timeout(2500)
    pg.screenshot(path="preview/cam_iso.png")
    # ---- collision + route tests (logical)
    res = pg.evaluate("""() => { const s = window.__unify, C = s.collision, L = s.collision.L || null; let bad = [], n = 0;
      for (const r of C.rects) for (const [ax, ay, dx, dy] of [[-1,.5,1,0],[1.5+r.w,.5,-1,0],[.5,-1,0,1],[.5,1.5+r.d,0,-1]]) {
        let x = r.gx + (ax < 0 ? ax : ax > 1 ? ax : r.w*ax), y = r.gy + (ay < 0 ? ay : ay > 1 ? ay : r.d*ay); x = ax<0? r.gx-0.8 : (ax>1? r.gx+r.w+0.8 : r.gx+r.w/2); y = ay<0? r.gy-0.8 : (ay>1? r.gy+r.d+0.8 : r.gy+r.d/2);
        if (C.blocked(x,y)) continue; n++;
        for (let i=0;i<120;i++){ const m = C.move(x,y,dx*0.05,dy*0.05); x=m.gx; y=m.gy; if (x>r.gx+0.001 && x<r.gx+r.w-0.001 && y>r.gy+0.001 && y<r.gy+r.d-0.001) { bad.push(r.kind+'@'+r.gx+','+r.gy); break; } } }
      return { tested: n, penetrations: bad.slice(0,5), count: bad.length } }""")
    print("collision", res)
    routes = pg.evaluate("""() => { const s = window.__unify; const seats = s.constructor && s.occupied ? [...s.occupied.keys()] : []; let bad = [];
      const L = window.__L; return { seats: seats.length } }""")
    seatcheck = pg.evaluate("""async () => { const s = window.__unify; const bad = []; const SEATS = [...s.occupied.keys()];
      for (const id of SEATS) { const [_, t, y] = id.split('_'); const sd = { approach: { gx: 6 + 2*(+t-1) + 0.5, gy: +y + 0.5 }, sitX: 6 + 2*(+t-1) + 1.4, sitY: +y + 0.5, gy: +y };
        const route = s.collision.routeToSeat({ gx: 5, gy: 0.7 }, sd);
        for (let i = 0; i < route.length - 1; i++) { const a = route[i], c = route[i+1]; for (let k = 0; k <= 20; k++) { const x = a.gx + (c.gx - a.gx)*k/20, yy = a.gy + (c.gy - a.gy)*k/20; if (s.collision.blocked(x, yy, 0.12) && i < route.length-2) { bad.push(id + ' seg' + i); k = 99; i = 99; } } } }
      return { seats: SEATS.length, unreachable: bad.slice(0, 5), count: bad.length } }""")
    print("routes", seatcheck)
    # ---- lesson: auto-walk to seat, then seat view
    pg.evaluate("() => window.__unify.startLesson('math')"); pg.wait_for_timeout(1500); pg.screenshot(path="preview/cam_walk.png")
    pg.wait_for_function("window.__unify.seated === true", timeout=60000); pg.wait_for_timeout(2500)
    print("seated view:", pg.evaluate("() => ({view: window.__unify.view, seated: window.__unify.seated, seat: window.__unify.player.seatId})"))
    pg.screenshot(path="preview/cam_seat.png")
    pos0 = pg.evaluate("() => [window.__unify.player.gx, window.__unify.player.gy]")
    for f in ("teacher", "board", "screen"):
        pg.click(f"[data-focus={f}]"); pg.wait_for_function(IDLE, timeout=60000); pg.wait_for_timeout(250); pg.screenshot(path=f"preview/cam_seat_{f}.png")
    # free look: drag + wasd must not move avatar
    pg.click("[data-focus=room]"); pg.wait_for_function(IDLE, timeout=60000); pg.wait_for_timeout(250)
    pg.mouse.move(600, 380); pg.mouse.down(); pg.mouse.move(520, 340, steps=6); pg.mouse.up()
    pg.keyboard.down("d"); pg.wait_for_timeout(500); pg.keyboard.up("d")
    pos1 = pg.evaluate("() => [window.__unify.player.gx, window.__unify.player.gy]")
    print("avatar moved during camera controls:", pos0 != pos1, pos0, pos1)
    # toggle to overview and iso zooms
    pg.click("[data-view=iso]"); pg.wait_for_function(IDLE, timeout=60000); pg.wait_for_timeout(250); pg.screenshot(path="preview/cam_overview_seated.png")
    for f in ("teacher", "board", "screen"):
        pg.click(f"[data-focus={f}]"); pg.wait_for_function(IDLE, timeout=60000); pg.wait_for_timeout(250); pg.screenshot(path=f"preview/cam_iso_{f}.png")
    pg.click("[data-subject=science]"); pg.wait_for_function("window.__unify.seated===true && window.__unify.subject==='science'", timeout=90000); pg.wait_for_timeout(1500)
    pg.screenshot(path="preview/cam_science_seat.png")
    pg.click("[data-view=iso]"); pg.wait_for_function(IDLE, timeout=60000); pg.wait_for_timeout(250); pg.screenshot(path="preview/cam_science_iso.png")
    m = b.new_page(viewport={"width": 390, "height": 780}, device_scale_factor=2, has_touch=True)
    IDLE = "() => { const c = window.__unify.cameras.main; return !c.fadeEffect.isRunning && !c.panEffect.isRunning && !c.zoomEffect.isRunning }"
    m.on("pageerror", lambda e: errs.append("MOBILE " + str(e))); m.goto(URL); m.wait_for_function("window.__unify && window.__unify.player", timeout=90000); m.wait_for_timeout(2500)
    m.evaluate("() => window.__unify.startLesson('ela')"); m.wait_for_function("window.__unify.seated===true", timeout=90000); m.wait_for_function(IDLE, timeout=60000); m.wait_for_timeout(300); m.screenshot(path="preview/cam_mobile_seat.png")
    m.click("[data-focus=board]"); m.wait_for_function(IDLE, timeout=60000); m.wait_for_timeout(250); m.screenshot(path="preview/cam_mobile_board.png")
    b.close()
print("errors:", errs or "none"); sys.exit(1 if errs else 0)
