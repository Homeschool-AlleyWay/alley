import sys
from playwright.sync_api import sync_playwright
errs=[]
def log(*a): print(*a, flush=True)
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1280,"height":760}); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_function("window.__unify && window.__unify.player",timeout=60000); pg.wait_for_timeout(2000)
    ev=pg.evaluate
    ev("()=>{const s=window.__unify; s.player.speed=9; s.npcs.forEach(n=>n.speed=9)}")
    ev("()=>window.__unify.startLesson('science')")
    for i in range(30):
        pg.wait_for_timeout(1000)
        if ev("()=>window.__unify.camState().view")=="seat": break
    log("lesson->", ev("()=>window.__unify.camState()")); pg.wait_for_timeout(1500)
    pg.screenshot(path="preview/c2_seat_science.png")
    pg.click("#f-teacher"); pg.wait_for_timeout(3000); pg.screenshot(path="preview/c2_seat_teacher.png")
    a0=ev("()=>[window.__unify.player.gx,window.__unify.player.gy,window.__unify.player.elev]")
    pg.click("#v-free"); pg.keyboard.down("d"); pg.wait_for_timeout(600); pg.keyboard.up("d")
    pg.mouse.move(600,400); pg.mouse.down(); pg.mouse.move(760,470,steps=4); pg.mouse.up()
    a1=ev("()=>[window.__unify.player.gx,window.__unify.player.gy,window.__unify.player.elev]")
    log("free look: avatar unchanged =", a0==a1, ev("()=>window.__unify.camState().freeLook"))
    pg.click("#v-free"); pg.click("#v-toggle"); pg.wait_for_timeout(1500)
    log("toggled ->", ev("()=>window.__unify.camState()"))
    for t in ("teacher","board","screen","room"):
        pg.click(f"#f-{t}"); pg.wait_for_timeout(3200); pg.screenshot(path=f"preview/c2_iso_{t}.png"); log("iso focus", t, round(ev("()=>window.__unify.cameras.main.zoom"),2))
    b.close()
log("errors:", errs or "none")
