/* Homoleen temporary MIT OpenStreetMap comparison.
 * Read-only example map. Not merged into main 3D world, no OSM data saved.
 * Uses existing vendored THREE and OrbitControls in the reviewer campus.
 */
(function(){
'use strict';
function setupButton(){
 const nav=document.getElementById('hl-extension-review');
 if(!nav || document.getElementById('hl-mit-map-start'))return;
 const btn=document.createElement('button');
 btn.id='hl-mit-map-start';btn.type='button';btn.textContent='🏙 Temporary MIT 3D map';
 btn.style.cssText='display:block;width:100%;background:#2d5160;color:#fff2dc;border:1px solid #8baab2;padding:10px;border-radius:10px;margin-top:7px;font:700 12px system-ui;cursor:pointer';
 btn.addEventListener('click',open);
 nav.appendChild(btn);
}
function open(){
 if(!window.THREE||!THREE.OrbitControls){alert('Three.js is unavailable in this browser. Please open the campus in Chrome.');return;}
 document.getElementById('temporary-mit-demo')?.remove();
 const T=THREE,host=document.createElement('section');
 host.id='temporary-mit-demo';
 host.style.cssText='position:fixed;inset:0;z-index:100000;background:#101a20;color:white;font-family:Arial,sans-serif;display:flex;flex-direction:column;min-width:0';
 host.innerHTML='<div style="padding:12px 16px;display:flex;gap:12px;justify-content:space-between;align-items:center;background:#172c30"><div><strong>MIT Campus · Temporary 3D Reference</strong><div id="mit-status" aria-live="polite" style="font-size:12px;margin-top:5px;color:#b8dbcf">Loading OpenStreetMap footprints…</div></div><div style="display:flex;gap:6px"><button id="mit-photo" style="padding:10px;border:0;border-radius:9px;background:#8cafb2;color:#102022;font-weight:bold">📷</button><button id="mit-close" style="padding:11px;border:0;border-radius:9px;background:#e5bc68;color:#172020;font-weight:bold">Close</button></div></div><div id="mit-view" style="flex:1;min-height:0"></div><div style="padding:9px;text-align:center;font-size:11px;background:#172c30">MIT building-footprint reference only · Drag to rotate, pinch or scroll to zoom · © OpenStreetMap contributors</div>';
 document.body.appendChild(host);
 const view=host.querySelector('#mit-view'),status=host.querySelector('#mit-status'),scene=new T.Scene();
 scene.background=new T.Color(0xdceaf0);scene.fog=new T.Fog(0xdceaf0,920,2100);
 const camera=new T.PerspectiveCamera(55,1,.1,5000);camera.position.set(30,490,850);
 const renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.outputColorSpace=T.SRGBColorSpace||undefined;
 view.appendChild(renderer.domElement);
 const controls=new T.OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=50;controls.maxDistance=1900;
 controls.maxPolarAngle=Math.PI*.48;controls.target.set(0,0,0);
 scene.add(new T.HemisphereLight(0xffffff,0x697c68,2));
 const sun=new T.DirectionalLight(0xffffff,1.65);sun.position.set(210,450,160);scene.add(sun);
 const ground=new T.Mesh(new T.PlaneGeometry(1950,1650),new T.MeshLambertMaterial({color:0xb8ceb2}));
 ground.rotation.x=-Math.PI/2;scene.add(ground);
 const grid=new T.GridHelper(1900,38,0x8eaa9a,0xa8bba8);grid.position.y=.05;scene.add(grid);
 const center=[42.3595,-71.0921];
 const project=(lat,lon)=>[(lon-center[1])*111320*Math.cos(center[0]*Math.PI/180),(lat-center[0])*111320];
 const walls=[
   new T.MeshLambertMaterial({color:0xaf5a58}),
   new T.MeshLambertMaterial({color:0xb69a7e}),
   new T.MeshLambertMaterial({color:0x8a8e88}),
   new T.MeshLambertMaterial({color:0x8b6e79})
 ];
 const pathMaterial=new T.LineBasicMaterial({color:0x2563eb});
 const geos=[],requests=new AbortController();let active=true,raf=null,buildings=0,paths=0;
 function addBuilding(points,tags={}){
   if(points.length<3)return;
   const shape=new T.Shape();
   points.forEach((p,i)=>{const [x,north]=project(p.lat,p.lon);if(i===0)shape.moveTo(x,north);else shape.lineTo(x,north);});
   shape.closePath();
   const levels=parseFloat(tags['building:levels']),rawHeight=String(tags.height||'');
   let height=parseFloat(rawHeight);
   if(Number.isFinite(height)&&/ft|feet/i.test(rawHeight))height*=.3048;
   if(!Number.isFinite(height))height=Number.isFinite(levels)?levels*3.2:12;
   height=Math.max(3,Math.min(height,150));
   const geo=new T.ExtrudeGeometry(shape,{depth:height,steps:1,bevelEnabled:false});
   // Extrude height is +Z before rotation and becomes +Y afterwards.
   geo.rotateX(-Math.PI/2);
   const material=walls[Math.min(3,Math.floor(height/17))];
   const mesh=new T.Mesh(geo,material);mesh.castShadow=false;mesh.receiveShadow=true;
   scene.add(mesh);geos.push(geo);buildings++;
 }
 function addPath(points){
   if(points.length<2)return;
   const v=points.map(p=>{const [x,north]=project(p.lat,p.lon);return new T.Vector3(x,.58,-north);});
   const geo=new T.BufferGeometry().setFromPoints(v);scene.add(new T.Line(geo,pathMaterial));geos.push(geo);paths++;
 }
 function resize(){
   if(!active||!host.isConnected)return;
   const w=view.clientWidth,h=view.clientHeight;if(w<1||h<1)return;
   camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
 }
 function tick(){if(!active)return;raf=requestAnimationFrame(tick);controls.update();renderer.render(scene,camera);}
 function close(){
   active=false;requests.abort();if(raf!==null)cancelAnimationFrame(raf);
   window.removeEventListener('resize',resize);
   controls.dispose();for(const g of geos)g.dispose();
   ground.geometry.dispose();ground.material.dispose();grid.geometry.dispose();grid.material.dispose();
   walls.forEach(x=>x.dispose());pathMaterial.dispose();renderer.dispose();host.remove();
 }
 host.querySelector('#mit-close').addEventListener('click',close);
 host.querySelector('#mit-photo').addEventListener('click',()=>{
   try{renderer.render(scene,camera);const a=document.createElement('a');a.download='Homoleen_MIT_Temporary_Reference.png';a.href=renderer.domElement.toDataURL('image/png');a.click();}
   catch(e){status.textContent='Screenshot could not be captured on this device.';}
 });
 window.addEventListener('resize',resize);resize();tick();
 // Actual MIT vicinity; OSM data are never copied into Homoleen assets.
 const bbox='42.3565,-71.1000,42.3640,-71.0850';
 const query='[out:json][timeout:35];(way["building"]('+bbox+');way["highway"~"^(footway|pedestrian|path)$"]('+bbox+'););out geom;';
 async function load(){
   const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
   let error=null;
   for(const endpoint of endpoints){
     try{
       const response=await fetch(endpoint+'?data='+encodeURIComponent(query),{signal:requests.signal});
       if(!response.ok)throw Error('OSM status '+response.status);
       const data=await response.json();if(!active)return;
       for(const item of data.elements||[]){
         if(!item.geometry)continue;
         if(item.tags?.building)addBuilding(item.geometry,item.tags);
         else if(item.tags?.highway)addPath(item.geometry);
       }
       status.textContent=buildings+' buildings and '+paths+' paths loaded · OpenStreetMap, reference only.';
       return;
     }catch(e){error=e;if(!active||requests.signal.aborted)return;}
   }
   status.textContent='Live map data unavailable. This temporary overlay can be closed safely.';
   console.warn('Homoleen temporary MIT OSM preview:',error);
 }
 load();
}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',setupButton,{once:true});else setupButton();
window.HomoleenMITTrial={open,close:()=>document.querySelector('#mit-close')?.click(),temporary:true};
})();