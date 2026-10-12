/** Styles for the whole dorm page (paper-cut kraft look to match the school shell). */
export const PAGE_CSS = `
:root{--sheet:#EADFCB;--kraft:#F3E7CF;--edge:#C9B28A;--ink:#4A3B3F;--soft:#8A7A70;--acc:#E07A66;--blue:#4F91C7;--sage:#4E8A64;--kraft-edge:#C9B28A;--acc2:#b95a48;
 --ui:"Fredoka","Trebuchet MS",system-ui,-apple-system,"Segoe UI",sans-serif;--dock:84px;--sheetw:min(440px,calc(100vw - var(--dock) - 28px))}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;overflow:hidden;overscroll-behavior:none;background:#d9e6f0;color:var(--ink);font:14px/1.35 var(--ui);user-select:none;-webkit-user-select:none}
body{position:fixed;inset:0}
#c{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
button,input,select,textarea{font:inherit;color:inherit}
input[type=text],input[type=search],input[type=date],select,textarea{user-select:text;-webkit-user-select:text}
:focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.dp-btn{background:#FFF9F0;border:1px solid rgba(255,255,255,.85);border-radius:12px;padding:6px 12px;min-height:44px;cursor:pointer;box-shadow:0 2px 0 var(--edge)}
.dp-btn:hover{background:#fff}.dp-btn:active{transform:translateY(2px);box-shadow:none}
.dp-btn.on,.dp-btn.go{background:var(--acc);color:#fff;border-color:var(--acc);box-shadow:0 2px 0 var(--acc2)}
.dp-btn.sage{background:var(--sage);color:#fff;box-shadow:0 2px 0 #35674a}
.dp-btn:disabled{opacity:.5;cursor:default}
.dp-sm{min-height:36px;padding:3px 10px;font-size:13px}
.dp-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}
.dp-lab{font-size:12px;color:var(--soft);margin:10px 0 2px;text-transform:uppercase;letter-spacing:.4px;font-weight:600}
.dp-note{font-size:13px;color:var(--soft);margin:6px 0}.dp-err{font-size:13px;color:#a8322a;margin:6px 0}
.dp-in{border:1px solid var(--edge);border-radius:10px;padding:8px 10px;min-height:44px;background:#fff;width:100%;font-size:15px}
.dp-card{background:#FFF9F0;border:1px solid rgba(255,255,255,.85);border-radius:14px;box-shadow:0 2px 0 var(--edge);padding:10px}
.dp-sw{width:40px;height:40px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px #6d5a5f;cursor:pointer;padding:0}
.dp-sw.on{box-shadow:0 0 0 3.5px var(--acc)}
@media(pointer:coarse){.dp-sw{width:44px;height:44px}}

/* top-left title + quick buttons */
#top{position:absolute;z-index:20;left:calc(10px + env(safe-area-inset-left));top:calc(10px + env(safe-area-inset-top));display:flex;gap:8px;align-items:center;max-width:calc(100vw - var(--dock) - 30px);flex-wrap:wrap}
.tag{background:var(--kraft);border:1px solid rgba(255,255,255,.75);border-radius:12px;padding:6px 12px;box-shadow:0 2px 0 var(--edge),0 6px 10px rgba(80,50,40,.25);min-height:44px;display:inline-flex;align-items:center;gap:6px;font-size:14px}
button.tag{cursor:pointer}button.tag:active{transform:translateY(2px);box-shadow:none}
#hint{position:absolute;z-index:19;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));max-width:calc(100vw - var(--dock) - 30px);font-size:13px;text-align:center;pointer-events:none;opacity:.95}
#hint .tag{min-height:32px;padding:3px 12px}
#toast{position:absolute;z-index:60;left:50%;top:calc(66px + env(safe-area-inset-top));transform:translateX(-50%);max-width:min(480px,92vw);display:none;text-align:center;pointer-events:none}
#toast.show{display:block}

/* dock */
#dock{position:absolute;z-index:30;right:calc(8px + env(safe-area-inset-right));top:calc(8px + env(safe-area-inset-top));bottom:calc(8px + env(safe-area-inset-bottom));width:calc(var(--dock) - 8px);display:flex;flex-direction:column;gap:6px;overflow-y:auto;overflow-x:hidden;padding:2px;overscroll-behavior:contain;scrollbar-width:none}
#dock::-webkit-scrollbar{display:none}
.dk{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;min-height:56px;min-width:44px;width:100%;padding:3px 2px;border-radius:14px;background:var(--kraft);border:1px solid rgba(255,255,255,.8);box-shadow:0 2px 0 var(--edge),0 5px 9px rgba(80,50,40,.25);cursor:pointer;font-size:11px;line-height:1.1;color:var(--ink)}
.dk b{font-size:22px;font-weight:400;line-height:1.15}.dk:active{transform:translateY(2px);box-shadow:none}
.dk[aria-pressed=true]{background:var(--acc);color:#fff;border-color:var(--acc);box-shadow:0 2px 0 var(--acc2),0 5px 9px rgba(80,50,40,.25)}
.dk.back{background:#c4463c;color:#fff;border-color:#c4463c;box-shadow:0 2px 0 #8f2f28,0 5px 9px rgba(80,50,40,.25)}
.dk i{position:absolute;top:-2px;right:2px;min-width:18px;height:18px;border-radius:9px;background:#c4463c;color:#fff;font-size:11px;font-style:normal;line-height:18px;text-align:center;padding:0 4px}
.dk{position:relative}

/* sheet */
#sheet{position:absolute;z-index:31;right:calc(var(--dock) + env(safe-area-inset-right));top:calc(8px + env(safe-area-inset-top));bottom:calc(8px + env(safe-area-inset-bottom));width:var(--sheetw);display:none;flex-direction:column;background:var(--kraft);border:1px solid rgba(255,255,255,.8);border-radius:18px;box-shadow:0 3px 0 var(--edge),0 14px 30px rgba(80,50,40,.35);outline:none;overflow:hidden}
#sheet.show{display:flex}
#sheet header{flex:none;display:flex;align-items:center;gap:8px;padding:8px 8px 8px 14px;border-bottom:1px solid rgba(74,59,63,.12)}
#sheet h2{margin:0;font-size:18px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#sheet .x{width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.85);background:#FFF9F0;box-shadow:0 2px 0 var(--edge);font-size:20px;cursor:pointer;padding:0}
#sbody{flex:1;min-height:0;overflow:auto;padding:10px 12px 14px;overscroll-behavior:contain;position:relative}
#sbody.fill{padding:8px 10px 6px;overflow:hidden;display:flex;flex-direction:column}
@media(max-width:700px){
 :root{--dock:0px}
 #dock{top:auto;left:0;right:0;bottom:0;width:auto;flex-direction:row;gap:5px;padding:5px 6px calc(5px + env(safe-area-inset-bottom));background:rgba(234,223,203,.94);border-top:1px solid var(--edge);overflow-x:auto;overflow-y:hidden;border-radius:0}
 .dk{width:62px;min-width:62px;min-height:54px}
 #sheet{left:6px;right:6px;width:auto;top:auto;bottom:calc(68px + env(safe-area-inset-bottom));height:min(54vh,520px);border-radius:16px}
 #top{max-width:calc(100vw - 20px)}
 #hint{display:none}
}

/* panels */
.edit-tb{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px;margin:6px 0}
.cat-it{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:64px;padding:6px;text-align:center;border-radius:12px;background:#FFF9F0;border:1px solid rgba(255,255,255,.85);box-shadow:0 2px 0 var(--edge);cursor:pointer;font-size:13px;line-height:1.15}
.cat-it b{font-size:24px;font-weight:400}.cat-it small{color:var(--soft);font-size:11px}
.sel-card{border-left:6px solid var(--acc)}
.app-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px;margin:8px 0}
.app{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 6px;border-radius:16px;color:#fff;text-decoration:none;border:0;cursor:pointer;min-height:92px;justify-content:center;font-size:13px;box-shadow:0 3px 0 rgba(0,0,0,.25)}
.app b{font-size:30px;font-weight:400;line-height:1}.app i{position:absolute;top:4px;right:6px;background:#c4463c;border-radius:10px;min-width:20px;height:20px;line-height:20px;font-size:12px;font-style:normal;text-align:center;padding:0 5px}
.desk-screen{background:linear-gradient(160deg,#2b3a55,#4F91C7 70%,#8fc9e8);border-radius:14px;padding:10px 12px 12px;color:#fff;box-shadow:inset 0 0 0 4px #313a3f}
.desk-screen h3{margin:0 0 2px;font-size:15px;font-weight:500}
.thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.th{position:relative;display:flex;flex-direction:column;gap:4px;padding:6px;background:#fffdf8;border-radius:6px;box-shadow:0 2px 6px rgba(80,50,40,.3)}
.th img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:3px;background:#ddd}
.th .pin{position:absolute;top:2px;left:2px}
.hw-item{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 10px;background:#fffdf8;border-radius:10px;border-left:7px solid var(--edge);margin:6px 0;box-shadow:0 1px 0 rgba(0,0,0,.08)}
.hw-chk{flex:none;width:44px;height:44px;border-radius:12px;border:2px solid var(--edge);background:#fff;font-size:22px;color:var(--sage);cursor:pointer;padding:0}
.hw-chk.on{background:#e3f2e8;border-color:var(--sage)}
.hw-tx{flex:1;min-width:0;white-space:normal}.hw-tx.done{text-decoration:line-through;opacity:.6}.hw-tx small{display:block;color:var(--soft)}
.binder{position:relative;background:linear-gradient(#5b7bb8,#3f5b95);border-radius:14px 10px 10px 14px;padding:12px 12px 12px 34px;color:#fff;box-shadow:0 3px 0 #2a3f6b}
.binder:before{content:"";position:absolute;left:10px;top:10px;bottom:10px;width:12px;background:radial-gradient(circle at 6px 6px,#e9eef6 0 5px,#8a95aa 6px 7px,transparent 8px) 0 0/12px 46px repeat-y}
.binder h3{margin:0 0 4px;font-size:16px}
.paper{background:#fffdf8;color:var(--ink);border-radius:8px;padding:6px 10px 10px;margin-top:6px;background-image:repeating-linear-gradient(transparent 0 27px,rgba(79,145,199,.18) 27px 28px)}
.folder{position:relative;height:150px;margin:6px auto 0;max-width:420px;perspective:900px}
.folder .back{position:absolute;inset:18px 0 0;background:#e9c97d;border-radius:6px 14px 10px 10px;box-shadow:0 3px 0 #b8964a}
.folder .back:before{content:"";position:absolute;left:0;top:-14px;width:42%;height:16px;background:#e9c97d;border-radius:8px 14px 0 0}
.folder .sheetp{position:absolute;left:12px;right:12px;bottom:6px;top:34px;background:#fffdf8;border-radius:6px;transition:transform .9s cubic-bezier(.2,.8,.2,1);box-shadow:0 1px 3px rgba(0,0,0,.2);padding:8px 12px;font-size:13px;overflow:hidden;color:var(--ink)}
.folder .front{position:absolute;left:0;right:0;bottom:0;top:34px;background:#f2d68f;border-radius:6px 6px 12px 12px;transform-origin:bottom center;transition:transform .9s cubic-bezier(.2,.8,.2,1);box-shadow:0 -1px 0 rgba(255,255,255,.5) inset;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:#7a5a1e}
.folder.open .front{transform:rotateX(-100deg)}.folder.open .sheetp{transform:translateY(-10px)}
.report{background:#fffdf8;border-radius:12px;border:1px solid rgba(74,59,63,.15);padding:10px 12px;margin-top:8px;animation:rise .8s .3s both}
@keyframes rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.rep-tab{width:100%;border-collapse:collapse}.rep-tab th,.rep-tab td{padding:8px 6px;text-align:left;border-bottom:1px solid rgba(74,59,63,.12);font-size:14px}.rep-tab th{font-size:11px;text-transform:uppercase;color:var(--soft)}
.gr{display:inline-block;min-width:36px;text-align:center;font-weight:700;font-size:20px;border-radius:8px;padding:1px 6px;background:#fff;box-shadow:0 0 0 2px var(--edge) inset}
.bar{height:8px;border-radius:5px;background:rgba(74,59,63,.15);overflow:hidden;min-width:60px}.bar i{display:block;height:100%;background:var(--sage)}

/* visit */
#visit{position:absolute;z-index:32;left:calc(10px + env(safe-area-inset-left));bottom:calc(10px + env(safe-area-inset-bottom));width:min(560px,calc(100vw - var(--dock) - 30px));display:none;flex-direction:column;gap:6px;padding:8px 10px;background:var(--kraft);border:1px solid rgba(255,255,255,.8);border-radius:16px;box-shadow:0 3px 0 var(--edge),0 12px 26px rgba(80,50,40,.35)}
#visit.show{display:flex}
#visit .banner{font-size:12px;color:#35674a;background:#e3f2e8;border-radius:8px;padding:3px 8px;display:flex;gap:6px;align-items:center}
#vlog{max-height:132px;overflow:auto;display:flex;flex-direction:column;gap:3px;overscroll-behavior:contain;font-size:14px}
.msgl{max-width:86%;padding:4px 10px;border-radius:12px;background:#fff;word-break:break-word}.msgl.me{align-self:flex-end;background:#cfe6f7}.msgl small{display:block;color:var(--soft);font-size:11px}
.emo{min-width:44px;min-height:44px;font-size:22px;padding:0}
@media(max-width:700px){#visit{left:6px;right:6px;width:auto;bottom:calc(66px + env(safe-area-inset-bottom));padding:6px 8px}#vlog{max-height:84px}.emo{min-width:40px;min-height:40px}}
.frow{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px;background:#FFF9F0;border:1px solid rgba(255,255,255,.85);margin:6px 0;box-shadow:0 2px 0 var(--edge);min-height:56px}
.frow.no{opacity:.75}.frow .nm{flex:1;min-width:0}.frow .nm small{display:block;color:var(--soft);white-space:normal}
.dot{width:36px;height:36px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;flex:none}
@media (prefers-reduced-motion:reduce){.folder .front,.folder .sheetp{transition:none}.report{animation:none}}
`;
