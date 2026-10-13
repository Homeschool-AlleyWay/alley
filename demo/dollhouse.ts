/** Dollhouse trial: shared lightweight Three.js renderer for genuinely 3D school characters. */
import * as THREE from "three";

type Character = {group:THREE.Group; phase:number; role:string};
const canvas=document.querySelector<HTMLCanvasElement>("#characters3d");
if(canvas){
const targetCanvas = canvas;
const renderer=new THREE.WebGLRenderer({canvas:targetCanvas,alpha:true,antialias:true,powerPreference:"low-power"});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,2.4,-2.4,.1,100);
camera.position.set(0,2,14);camera.lookAt(0,1.15,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x786ab6,2.1));
const light=new THREE.DirectionalLight(0xfff3df,2.7);light.position.set(-3,8,7);scene.add(light);
const mat=(c:number)=>new THREE.MeshStandardMaterial({color:c,roughness:.67});
const skin=[0xf4c6a3,0x9b5d3c,0xe7a97c,0x65432f,0xc8865b,0xffd6b2];
const shirts=[0x6a73ed,0xf06285,0x23a6a0,0xe7ad45,0x885ad1,0x4d9ee4];
const geoSphere=new THREE.SphereGeometry(1,16,12);
const geoBox=new THREE.BoxGeometry(1,1,1);
function part(g:THREE.Group,shape:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){const o=new THREE.Mesh(shape,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);return o;}
function character(index:number,x:number,role:string):Character{
 const g=new THREE.Group(),tone=mat(skin[index%skin.length]),cloth=mat(shirts[index%shirts.length]),hair=mat([0x322535,0x1e2735,0x593822,0x25222d][index%4]),shoe=mat(0x2b3152),white=mat(0xffffff),iris=mat(0x24283b);
 part(g,geoBox,cloth,0,1.26,0,.39,.56,.24);
 part(g,geoSphere,tone,0,1.93,0,.32,.37,.29);
 part(g,geoSphere,hair,0,2.22,-.02,.34,.16,.31);
 for(const side of [-1,1]){
  part(g,geoSphere,tone,side*.12,1.96,.275,.04,.05,.025);
  part(g,geoSphere,iris,side*.12,1.96,.297,.021,.027,.013);
  part(g,geoBox,cloth,side*.48,1.3,0,.13,.43,.16).rotation.z=side*.17;
  part(g,geoSphere,tone,side*.5,1.02,.02,.105,.11,.11);
  part(g,geoBox,mat(index%2?0x384f83:0x47537a),side*.19,.68,0,.145,.51,.18);
  part(g,geoBox,shoe,side*.19,.37,.1,.16,.1,.31);
 }
 if(role==="teacher"){part(g,geoBox,white,.03,1.32,.15,.25,.34,.035);}
 g.position.x=x;scene.add(g);return {group:g,phase:index*.9,role};
}
const chars=[character(0,-3.6,"teacher"),character(1,-2.1,"student"),character(2,-.55,"student"),character(3,1,"teacher"),character(4,2.5,"student"),character(5,3.9,"student")];
let active=true;
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
function size(){const r=targetCanvas.getBoundingClientRect();const w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));renderer.setSize(w,h,false);const aspect=w/h;camera.left=-2.65*aspect;camera.right=2.65*aspect;camera.top=2.65;camera.bottom=-2.65;camera.updateProjectionMatrix();}
const ro=new ResizeObserver(size);ro.observe(targetCanvas);size();
let t=0;function frame(){if(!active)return;if(!reduced){t+=.016;for(const c of chars){c.group.rotation.y=Math.sin(t*.65+c.phase)*.12;c.group.position.y=Math.sin(t*1.4+c.phase)*.035;}}renderer.render(scene,camera);requestAnimationFrame(frame);}frame();
document.addEventListener("visibilitychange",()=>{if(!document.hidden){size();renderer.render(scene,camera);}});
window.addEventListener("pagehide",()=>{active=false;ro.disconnect();renderer.dispose();},{once:true});
}
