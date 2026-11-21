// Render *actual* review pages in Chromium (no simulated illustrations).
// Screenshots are uploaded by CI as a downloadable artifact for desktop/phone review.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const root=path.resolve('dist');
const output=path.resolve('visual-review');
await fs.mkdir(output,{recursive:true});
const PORT=8788,ORIGIN='http://127.0.0.1:'+PORT;
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,ORIGIN),p=decodeURIComponent(u.pathname);
 const filename=path.resolve(root,'.'+p);
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 try{const body=await fs.readFile(filename);res.writeHead(200,{'content-type':MIME[path.extname(filename)]||'application/octet-stream'});res.end(body);}
 catch{res.writeHead(404);res.end('Missing '+p);}
});
await new Promise(resolve=>server.listen(PORT,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const problems=[];
async function shot(page,name){
 try{
  await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled',timeout:45000});
  console.log('SHOT',name);
  const frame=await page.evaluate(()=>{
    const canvas=document.querySelector('#scene canvas,#view canvas');
    if(!canvas||canvas.width<1)return null;
    const out=document.createElement('canvas');out.width=360;out.height=210;
    const ctx=out.getContext('2d');
    try{ctx.drawImage(canvas,0,0,360,210);return out.toDataURL('image/jpeg',.33).split(',')[1];}
    catch(e){return null}
  });
  if(frame)console.log('HOMOLEEN_REAL_WEBGL_FRAME '+name+' '+frame);
 }
 catch(e){problems.push('Capture '+name+': '+String(e));}
}
async function checkWorld(viewport,mobile=false){
 const ctx=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:mobile,isMobile:mobile});
 const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',msg=>{if(msg.type()==='error'&&!/ERR_|favicon|404|WebSocket/.test(msg.text()))errors.push(msg.text().slice(0,200));});
 await page.goto(ORIGIN+'/homoleen-living-world.html?unified=school',{waitUntil:'domcontentloaded',timeout:60000});
 try{
  await page.waitForFunction(()=>window.HomoleenUnifiedWorld&&document.querySelector('#homoleen-shell')?.hidden&&(window.__hlFrameRendered||0)>4,{timeout:110000});
  await page.waitForTimeout(1400);
  const count=await page.evaluate(()=>window.HomoleenUnifiedWorld?.places?.().length);
  if(count<16)problems.push('Only '+count+' extensions connected');
  await shot(page,mobile?'mobile-school':'desktop-school');
  await page.evaluate(()=>window.HomoleenUnifiedWorld.go('river'));
  await page.waitForTimeout(2000);
  await shot(page,mobile?'mobile-river':'desktop-river');
  await page.evaluate(()=>window.HomoleenUnifiedWorld.go('overview'));
  await page.waitForTimeout(2000);
  if(!mobile)await shot(page,'desktop-whole-world');
  const c=await page.evaluate(()=>{
   const canvas=document.querySelector('#scene canvas');
   return {frame:window.__hlFrameRendered||0,canvasWidth:canvas?.width||0,canvasHeight:canvas?.height||0,extensions:window.HomoleenUnifiedWorld.places().length,webgl:!!(canvas&&(canvas.getContext('webgl2')||canvas.getContext('webgl')))};
  });
  console.log('3D_RENDER_CHECK',JSON.stringify({mobile,...c}));
  if(!c.webgl||c.frame<5||c.canvasWidth<1)problems.push('3D rendering did not continue: '+JSON.stringify(c));
 }catch(e){problems.push('World '+(mobile?'mobile':'desktop')+' test: '+String(e));await shot(page,mobile?'mobile-world-failure':'desktop-world-failure');}
 if(errors.length)problems.push('World errors: '+errors.slice(0,5).join(' | '));
 await ctx.close();
}
async function checkAR(){
 const ctx=await browser.newContext({viewport:{width:1160,height:780},deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(ORIGIN+'/homoleen-spatial-ar.html',{waitUntil:'domcontentloaded',timeout:60000});
 try{
  await page.waitForFunction(()=>window.HomoleenSpatialQA?.getState?.().schoolBuildings===10,{timeout:60000});
  await page.waitForTimeout(1400);
  await shot(page,'spatial-ar-3d-preview');
  const state=await page.evaluate(()=>window.HomoleenSpatialQA.getState());
  console.log('AR_3D_FALLBACK',JSON.stringify(state));
  await page.click('[data-area="river"]');
  await page.waitForTimeout(700);await shot(page,'spatial-ar-waterfront');
 }catch(e){problems.push('Spatial AR fallback: '+String(e));await shot(page,'spatial-failure')}
 if(errors.length)problems.push('Spatial JS errors: '+errors.slice(0,5).join(' | '));
 await ctx.close();
}
try{
 await checkWorld({width:1280,height:820});
 await checkWorld({width:412,height:844},true);
 await checkAR();
}finally{await browser.close();server.close();}
const result={date:new Date().toISOString(),files:await fs.readdir(output),problems};
await fs.writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));
console.log('VISUAL_QA',JSON.stringify(result));
process.exit(problems.length?1:0);
