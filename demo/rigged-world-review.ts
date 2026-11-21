// Review-only bridge for licensed/CC0 skinned glTF characters in the EXISTING Pathways WebGL scene.
// Old character state, school scenes, progress data, game controls and production remain unchanged.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
type Candidate={group:any,body:any,look:any,role:string,name:string,kind:string};
type RigStatus={ready:boolean,enabled:boolean,count:number,source:string,error?:string};
const global=window as any;
const loader=new GLTFLoader();
const paths={
  f:'quaternius-trial/Superhero_Female_FullBody.gltf',
  m:'quaternius-trial/Superhero_Male_FullBody.gltf'
};
const sources=new Map<string,T.Group>();
const mixers:{mixer:T.AnimationMixer,clip:T.AnimationClip,avatar:Candidate}[]=[];
const wrapped:{avatar:Candidate,wrapper:T.Group}[]=[];
let enabled=false,loaded=false,loading:Promise<void>|null=null,notice:HTMLElement|null=null;
let previous=performance.now();
function show(message:string,bad=false){
  if(!notice){
    notice=document.createElement('div');
    notice.id='homoleen-rigged-status';
    notice.setAttribute('role','status');
    notice.style.cssText='position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);right:12px;z-index:30;max-width:min(340px,calc(100vw - 24px));padding:12px 15px;color:#f9eddb;background:#163038f0;border:1px solid #aa9778;border-radius:14px;font:12px system-ui;box-shadow:0 7px 28px #0006';
    document.body.appendChild(notice);
  }
  notice.style.borderColor=bad?'#f5b4a8':'#aa9778';
  notice.textContent=message;
}
function checkMatch(source:T.AnimationClip[],root:T.Group){
  const names=new Set<string>();
  root.traverse(o=>{if(o.name)names.add(o.name)});
  return source.map(clip=>{
    const tracks=clip.tracks.filter(t=>names.has(t.name.split('.')[0]));
    return tracks.length>=12?new T.AnimationClip(clip.name,clip.duration,tracks):null;
  }).filter(Boolean) as T.AnimationClip[];
}
async function getSources(){
  const [female,male,anims]=await Promise.all([
    loader.loadAsync(paths.f),
    loader.loadAsync(paths.m),
    loader.loadAsync('quaternius-trial/UAL1_Standard.glb')
  ]);
  sources.set('f',female.scene);
  sources.set('m',male.scene);
  return anims.animations;
}
function createRig(g:T.Group,p:Candidate,clips:T.AnimationClip[]){
  // Keep the runtime's existing game-object transform and raycast collider.
  // Hide only the polygonal body. Textures, face and skeleton come from a real CC0 model.
  const actor=cloneSkinned(g);
  const bounds=new T.Box3().setFromObject(actor);
  const size=bounds.getSize(new T.Vector3());
  if(!Number.isFinite(size.y)||size.y<=.1)throw Error('Imported character has empty or invalid geometry');
  const height=1.94/size.y;
  const wrapper=new T.Group();wrapper.name='CC0 rigged mesh review: '+p.name;
  wrapper.add(actor);actor.updateMatrixWorld(true);
  wrapper.scale.setScalar(height);
  const b=new T.Box3().setFromObject(wrapper);
  const center=b.getCenter(new T.Vector3());
  wrapper.position.set(-center.x,-b.min.y,-center.z);
  actor.traverse(o=>{
    const m=o as T.Mesh;
    if(m.isMesh){m.castShadow=true;m.receiveShadow=true;
      // Keep real glTF skin shading/material detail, without sphere-based features.
      m.frustumCulled=false;
    }
  });
  p.group.add(wrapper);p.body.visible=false;
  wrapped.push({avatar:p,wrapper});
  const matched=checkMatch(clips,actor);
  const chosen=matched.find(x=>/^idle$/i.test(x.name))||matched.find(x=>/idle/i.test(x.name))||matched.find(x=>/walk/i.test(x.name));
  if(chosen){
    const mixer=new T.AnimationMixer(actor);
    const action=mixer.clipAction(chosen);action.reset().play();
    mixers.push({mixer,clip:chosen,avatar:p});
  }
}
function findCandidates():Candidate[]{
  const api=global.HomoleenRigCandidates;
  return typeof api==='function'?api():[];
}
async function loadPreview():Promise<void>{
  if(loaded)return;
  const api=global.HomoleenUnifiedWorld;
  if(!api||typeof api.scene!=='function')throw Error('World scene has not initialized');
  const people=findCandidates();
  if(!people.length)throw Error('Original NPCs were not registered by the world runtime');
  show('Loading original CC0 rigged glTF models and animations…');
  const clips=await getSources();
  // Mobile GPU limit. Upgrade a representative cast, preserving all unreplaced NPCs.
  const isPhone=/Android|iPhone|Mobile/i.test(navigator.userAgent);
  const cap=isPhone?8:18;
  const priority=[...people.filter(p=>p.kind==='outdoor'),...people.filter(p=>p.role==='Teacher'),...people.filter(p=>p.kind==='campus'&&p.role!=='Teacher')];
  const seen=new Set<any>();
  for(const p of priority){
    if(wrapped.length>=cap)break;
    if(seen.has(p.group))continue;
    seen.add(p.group);
    const key=p.look?.build==='m'?'m':'f',base=sources.get(key);
    if(!base)continue;
    try{createRig(base,p,clips);}catch(e){console.warn('Could not preview real rig on '+p.name,e)}
  }
  if(!wrapped.length)throw Error('No actual rigged glTF models could attach to the existing scene');
  loaded=true;show(wrapped.length+' real skinned glTF characters attached in the existing campus. Styling and all ages still need approval.');
}
function status():RigStatus{
  return {ready:loaded,enabled,count:wrapped.length,source:'Original Quaternius CC0 rigged character assets; isolated preview only'};
}
async function toggle(){
 if(loading){await loading;return}
 if(!loaded){
  loading=loadPreview();
  try{await loading}catch(e){show('Rigged model loading failed: '+String(e),true);throw e}
  finally{loading=null;}
  enabled=true;show(wrapped.length+' upgraded rigged models visible. Click again to compare with original art.');return;
 }
 enabled=!enabled;
 for(const x of wrapped){x.avatar.body.visible=!enabled;x.wrapper.visible=enabled;}
 show(enabled?'Rigged models visible: original characters preserved underneath.':'Original procedural NPCs shown for comparison.');
}
let running=true;
function animate(){
 if(!running)return;
 requestAnimationFrame(animate);
 const now=performance.now(),dt=Math.min(.05,(now-previous)/1000);previous=now;
 if(enabled)for(const a of mixers)a.mixer.update(dt);
}
animate();
global.HomoleenRiggedTrial={toggle,status,stop:()=>{running=false},getModels:()=>wrapped.map(x=>x.avatar.name)};
function readyButtons(){
 const host=document.getElementById('hl-extension-review');
 if(!host||document.getElementById('hl-rigged-npcs'))return;
 const b=document.createElement('button');
 b.id='hl-rigged-npcs';b.textContent='🧑‍🏫 Preview real 3D rigged NPCs in world';
 b.style.cssText='display:block;width:100%;margin-top:7px;padding:10px;border:1px solid #a0b99e;border-radius:10px;background:#406259;color:white;font:800 12px system-ui';
 b.onclick=()=>toggle().catch(e=>console.error('Homoleen rig review',e));
 host.appendChild(b);
 // The user must opt in, unless explicitly linking to a rigged test.
 if(new URLSearchParams(location.search).get('rigged')==='1'){
  setTimeout(()=>toggle().catch(e=>console.warn('Rigged test unavailable',e)),3000);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',readyButtons,{once:true});else readyButtons();
