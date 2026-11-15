import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Model = 'male' | 'female';
type Motion = 'idle' | 'walk' | 'wave' | 'sit' | 'cheer';

const el = (id: string) => document.getElementById(id)!;
const view = el('viewport');
const status = el('status');
const motionInfo = el('motionInfo');
const modelInfo = el('modelInfo');
const MODEL_URL: Record<Model, string> = {
  male: 'quaternius-trial/Superhero_Male_FullBody.gltf',
  female: 'quaternius-trial/Superhero_Female_FullBody.gltf',
};
const ANIMATION_URL = 'quaternius-trial/UAL1_Standard.glb';
const loader = new GLTFLoader();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1c3030');
scene.fog = new THREE.FogExp2('#1c3030', 0.022);
const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
camera.position.set(0, 1.58, 3.7);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'default' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.domElement.setAttribute('aria-label', 'Real Quaternius CC0 humanoid model preview. Drag to rotate; pinch to zoom.');
view.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = .075;
controls.target.set(0, 1.16, 0);
controls.minDistance = 1.8;
controls.maxDistance = 6.5;
controls.maxPolarAngle = Math.PI * .54;
controls.update();
scene.add(new THREE.HemisphereLight(0xe7f5ff, 0x6b5945, 2));
const key = new THREE.DirectionalLight(0xffe8c4, 4.1);
key.position.set(-3, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left = -4;
key.shadow.camera.right = 4;
key.shadow.camera.top = 4;
key.shadow.camera.bottom = -4;
scene.add(key);
const fill = new THREE.DirectionalLight(0x92b8e8, 2.2);
fill.position.set(4, 3, -3);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffd47b, 1.4);
rim.position.set(-2, 4, -4);
scene.add(rim);
const floor = new THREE.Mesh(
  new THREE.CylinderGeometry(1.25,1.44,.22,90),
  new THREE.MeshStandardMaterial({ color: 0x8b8c80, roughness:.78, metalness:.06 }),
);
floor.position.y = -.17;
floor.receiveShadow = true;
scene.add(floor);
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.26,.024,10,100),
  new THREE.MeshStandardMaterial({ color:0xd9bc83,metalness:.6,roughness:.3 }));
ring.rotation.x = Math.PI / 2;
ring.position.y = -.04;
scene.add(ring);

let currentModel: THREE.Group | null = null;
let currentMixer: THREE.AnimationMixer | null = null;
let clips: THREE.AnimationClip[] = [];
let activeAction: THREE.AnimationAction | null = null;
let selected: Model = 'female';
let currentMotion: Motion = 'idle';
let pending = 0;
let animationSource: Promise<THREE.AnimationClip[]> | null = null;
const cache = new Map<Model, { scene: THREE.Group, animations: THREE.AnimationClip[] }>();
const clock = new THREE.Clock();

function report(message:string, isError=false):void {
  status.textContent = message;
  status.classList.toggle('error', isError);
}
function updateChoiceButtons():void {
  document.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.model === selected)));
  document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.motion === currentMotion)));
}
function modelLabel():string {return selected === 'female' ? 'Quaternius Female Rig' : 'Quaternius Male Rig';}
async function getMotionClips():Promise<THREE.AnimationClip[]> {
  if(!animationSource) animationSource = new Promise((resolve,reject)=>{
    loader.load(ANIMATION_URL, gltf=>resolve(gltf.animations), undefined, reject);
  }).catch(error=>{animationSource=null;throw error;});
  return animationSource;
}
function selectClip(which:Motion):THREE.AnimationClip | null {
  if(!clips.length) return null;
  const patterns:Record<Motion,RegExp[]> = {
    idle: [/^idle$/i, /^idle[\s_-]/i, /idle/i],
    walk: [/^walk$/i,/^walking$/i,/^walk[\s_-]/i,/walk/i],
    wave: [/^wave$/i,/waving/i,/wave/i,/greet/i],
    sit: [/^sit$/i,/^sitting/i,/sit/i],
    cheer: [/^cheer$/i,/cheering/i,/celebrat/i,/clap/i,/dance/i]
  };
  for (const rx of patterns[which]) {
    const found = clips.find(clip => rx.test(clip.name) && !/gun|sword|attack|combat|rifle|death/i.test(clip.name));
    if (found) return found;
  }
  return null;
}
function useMotion(which:Motion):void {
  currentMotion = which;
  updateChoiceButtons();
  if (activeAction) activeAction.fadeOut(.2);
  const clip = selectClip(which);
  if(!clip || !currentMixer){
    motionInfo.textContent = 'No matching '+which+' animation on this source rig.';
    report('Real model loaded, but the '+which+' clip was not found.',true);
    return;
  }
  activeAction = currentMixer.clipAction(clip);
  activeAction.reset().fadeIn(.2).play();
  if(which==='sit') activeAction.setLoop(THREE.LoopRepeat,Infinity);
  motionInfo.textContent = 'Animation: '+clip.name+' · '+clips.length+' rig-matched clips available';
  report('Real Quaternius character and CC0 animation playing.');
}
function animationsForCharacter(sourceClips:THREE.AnimationClip[], model:THREE.Group):THREE.AnimationClip[] {
  const names = new Set<string>();
  model.traverse(node=>{if(node.name)names.add(node.name);});
  // Reuse existing Quaternius humanoid bone names. No generic joint rotations or
  // fabricated "walking" pose is used if source skeletons fail to match.
  return sourceClips.map(clip=>{
    const matched = clip.tracks.filter(track=>{
      const n = track.name.slice(0,track.name.indexOf('.'));
      return names.has(n);
    });
    if(matched.length < 12) return null;
    return new THREE.AnimationClip(clip.name,clip.duration,matched);
  }).filter((clip):clip is THREE.AnimationClip=>!!clip);
}
async function chooseModel(choice:Model):Promise<void> {
  selected = choice;
  const token = ++pending;
  updateChoiceButtons();
  report('Loading '+modelLabel()+' from CC0 source…');
  try{
    const entry = cache.get(choice) || await new Promise<{scene:THREE.Group,animations:THREE.AnimationClip[]}>((resolve,reject)=>{
      loader.load(MODEL_URL[choice], g=>resolve({scene:g.scene,animations:g.animations}), undefined,reject);
    });
    if(token!==pending)return;
    cache.set(choice,entry);
    if(currentModel){scene.remove(currentModel);}
    currentMixer?.stopAllAction();
    currentMixer=null;activeAction=null;
    const obj = entry.scene.clone(true);
    // SkeletonUtils clone is required for an already-skinned glTF clone. This scene uses
    // one model at a time, so the original entry is moved directly instead of cloning.
    if(obj){/* The original is selected below, not the skinned clone. */}
    const model = entry.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    if(size.y < 0.1 || !Number.isFinite(size.y)) throw new Error('Model geometry was empty.');
    const scale = 2.30/size.y;
    const wrapper = new THREE.Group();
    wrapper.scale.setScalar(scale);
    const anchor = new THREE.Group();
    anchor.add(model);
    wrapper.add(anchor);
    // Align model's feet to studio platform, preserving rig hierarchy and actual sculpt.
    const scaled = new THREE.Box3().setFromObject(wrapper);
    const center = scaled.getCenter(new THREE.Vector3());
    wrapper.position.set(-center.x,-scaled.min.y,-center.z);
    wrapper.traverse(child=>{
      if((child as THREE.Mesh).isMesh){
        const mesh = child as THREE.Mesh;
        mesh.castShadow=true;
        mesh.receiveShadow=true;
        mesh.frustumCulled=false;
      }
    });
    scene.add(wrapper);
    currentModel=wrapper;
    modelInfo.textContent = modelLabel()+' · '+Math.round(size.y*100)/100+' source units · real skinned mesh';
    try {
      const source = await getMotionClips();
      if(token!==pending)return;
      clips=animationsForCharacter(source,model);
      currentMixer = new THREE.AnimationMixer(model);
      useMotion(currentMotion);
      if(!clips.length) report('Model loaded, but animation bone names did not match; no motion substituted.',true);
    }catch(error){
      clips=[];currentMixer=null;
      motionInfo.textContent='Animations unavailable';
      report('Rigged model visible. Animation library could not load: '+String(error),true);
    }
  }catch(error){
    if(token!==pending)return;
    modelInfo.textContent='Character could not load';
    motionInfo.textContent='Source is unavailable';
    report('Asset loading failed: '+String(error),true);
  }
}

const params=new URLSearchParams(location.search);
const initialModel=params.get('model');
selected=initialModel==='male'?'male':'female';
const initialAction=params.get('action');
if(['idle','walk','wave','sit','cheer'].includes(initialAction||'')) currentMotion=initialAction as Motion;
document.querySelectorAll<HTMLButtonElement>('[data-model]').forEach(button=>{
  button.addEventListener('click',()=>chooseModel(button.dataset.model as Model));
});
document.querySelectorAll<HTMLButtonElement>('[data-motion]').forEach(button=>{
  button.addEventListener('click',()=>useMotion(button.dataset.motion as Motion));
});
el('snapshot').addEventListener('click',()=>{
  try{
    renderer.render(scene,camera);
    renderer.domElement.toBlob(blob=>{
      if(!blob){report('This device blocked WebGL screenshot capture.',true);return;}
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='homoleen-quaternius-'+selected+'.png';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    },'image/png');
  }catch(error){report('Screenshot failed: '+String(error),true);}
});
el('resetCamera').addEventListener('click',()=>{
  camera.position.set(0,1.58,3.7);controls.target.set(0,1.16,0);controls.update();
});
function resize():void {
  const w=Math.max(10,view.clientWidth),h=Math.max(10,view.clientHeight);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
new ResizeObserver(resize).observe(view);
resize();
function loop():void{
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),0.05);
  currentMixer?.update(dt);
  controls.update();
  renderer.render(scene,camera);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)clock.getDelta();});
loop();
chooseModel(selected);
