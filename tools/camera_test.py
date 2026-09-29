import json
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"])
    pg=b.new_page(viewport={"width":1280,"height":760}); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_function("window.__unify && window.__unify.player",timeout=60000); pg.wait_for_timeout(2500)
    ev=lambda js: pg.evaluate(js)
    pg.screenshot(path="preview/cam_iso.png")
    ev("()=>window.__unify.startLesson('math')")
    for i in range(25):
        pg.wait_for_timeout(1000)
        st=ev("()=>window.__unify.camState()")
        if st["view"]=="seat": break
    print("after lesson start:", st, "avatar seated:", ev("()=>window.__unify.seated"))
    pg.wait_for_timeout(1500); pg.screenshot(path="preview/cam_seat.png")
    for t in ("teacher","board","screen","room"):
        pg.click(f"#f-{t}"); pg.wait_for_timeout(3500); pg.screenshot(path=f"preview/cam_seat_{t}.png")
    # free look: avatar must not move
    a0=ev("()=>[window.__unify.player.gx,window.__unify.player.gy,window.__unify.player.elev]")
    pg.click("#v-free"); pg.keyboard.down("d"); pg.wait_for_timeout(700); pg.keyboard.up("d")
    pg.mouse.move(600,400); pg.mouse.down(); pg.mouse.move(700,450,steps=5); pg.mouse.up()
    a1=ev("()=>[window.__unify.player.gx,window.__unify.player.gy,window.__unify.player.elev]")
    print("free look, avatar before/after:", a0, a1, "same:", a0==a1, ev("()=>window.__unify.camState()"))
    pg.click("#v-free"); pg.click("#v-toggle"); pg.wait_for_timeout(900)
    print("toggled to:", ev("()=>window.__unify.camState()")["view"], "seated still:", ev("()=>window.__unify.seated"))
    pg.wait_for_timeout(500); pg.screenshot(path="preview/cam_iso_seated.png")
    for t in ("teacher","board","screen"):
        pg.click(f"#f-{t}"); pg.wait_for_timeout(3500); pg.screenshot(path=f"preview/cam_iso_{t}.png")
    b.close()
print("errors:", errs or "none")
