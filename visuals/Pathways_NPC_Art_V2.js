// Extracted NPC visual source. Paste inside Pathways world closure after Part/AVM helpers.
/* PATHWAYS NPC ART V2
 * A complete replacement for the old overlapping primitive heads, curled-ball hair,
 * pronounced cartoon eyes and boxy arms. Consistent proportions, a single smooth
 * sculpted face, curved close-fitting eyes, flowing hair silhouettes, and preserved
 * shoulder / elbow / knee / facial rig controls.
 * This code lives inside the main world's closure and uses its Part, LATHE, CAP,
 * TOR, SPH, AVM, V3, and hideMat helpers. It is intentionally deterministic.
 */
const npc2GeoCache=new Map();
function npc2Geo(key,fn){if(!npc2GeoCache.has(key))npc2GeoCache.set(key,fn());return npc2GeoCache.get(key);}
function npc2Head(){
 return npc2Geo('head',()=>{
  const g=new THREE.SphereGeometry(1,48,38),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const a=p.getX(i),b=p.getY(i),c=p.getZ(i);
   const jaw=1-.175*Math.pow(Math.max(0,-b),1.36);
   const temple=1+.035*Math.exp(-Math.pow((b-.18)*3.3,2));
   const x=a*.146*jaw*temple,y=.164+b*.168;
   const front=c>0?1:0;
   const nasalBridge=Math.exp(-Math.pow(x/.021,2)-Math.pow((y-.143)/.058,2))*.013;
   const noseTip=Math.exp(-Math.pow(x/.023,2)-Math.pow((y-.097)/.025,2))*.019;
   const philtrum=Math.exp(-Math.pow(x/.015,2)-Math.pow((y-.067)/.023,2))*.003;
   const cheek=Math.exp(-Math.pow((Math.abs(x)-.078)/.035,2)-Math.pow((y-.120)/.043,2))*.0035;
   const chin=Math.exp(-Math.pow(x/.064,2)-Math.pow((y-.047)/.028,2))*.005;
   const z=c*.142*(1-.055*Math.max(0,-b))+front*(nasalBridge+noseTip+philtrum+cheek+chin);
   p.setXYZ(i,x,y,z);
  }
  p.needsUpdate=true;g.computeVertexNormals();return g;
 });
}
function npc2HairCap(style){
 return npc2Geo('hair-cap-'+style,()=>{
  const broad=style==='afro',curly=style==='curly'||broad;
  const g=new THREE.SphereGeometry(1,44,26,0,Math.PI*2,0,Math.PI*(broad?.73:style==='buzz'?.50:.58));
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
   const sculpt=curly?1+.011*Math.sin(x*16+z*10)*Math.cos(y*17-z*7):1;
   const r=broad?1.19:style==='curly'?1.075:1;
   const side=1+.025*Math.max(0,-y);
   p.setXYZ(i,x*.157*r*side*sculpt,.166+y*.172*(broad?1.25:1.03)*sculpt,z*.151*r*sculpt-.012);
  }
  p.needsUpdate=true;g.computeVertexNormals();return g;
 });
}
function npc2HairCurtain(style){
 return npc2Geo('hair-curtain-'+style,()=>{
  const rows=18,around=36,vertices=[],indices=[];
  const length=style==='long'?.43:style==='hijab'?.47:style==='locs'?.35:.24;
  for(let row=0;row<=rows;row++){
   const t=row/rows,y=.175-t*length;
   const taper=1-.05*t+.035*Math.sin(t*Math.PI);
   for(let j=0;j<=around;j++){
    const a=Math.PI*.40+(j/around)*Math.PI*1.20;
    const x=Math.sin(a)*.157*taper,z=Math.cos(a)*.154*taper-.018;
    const wave=(style==='long'||style==='locs'?.011:.004)*Math.sin(a*8+t*5)*Math.sin(t*Math.PI);
    vertices.push(x+wave,y,z+wave*.7);
   }
  }
  for(let row=0;row<rows;row++)for(let j=0;j<around;j++){
   const i=row*(around+1)+j,k=i+around+1;
   indices.push(i,k,i+1,k,k+1,i+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setIndex(indices);g.computeVertexNormals();return g;
 });
}
function npc2Stroke(points,r=.003){
 const curve=new THREE.CatmullRomCurve3(points.map(v=>new V3(v[0],v[1],v[2])),false,'centripetal');
 return new THREE.TubeGeometry(curve,12,r,6,false);
}
function npc2Torso(f){
 return LATHE(f?'npc2-torso-a':'npc2-torso-b',f?
 [[0,0],[.130,0],[.158,.055],[.165,.19],[.179,.32],[.19,.46],[.169,.54],[.099,.62],[.064,.67],[0,.675]]:
 [[0,0],[.151,0],[.174,.065],[.177,.20],[.20,.36],[.226,.47],[.198,.54],[.111,.625],[.068,.67],[0,.675]],40);
}
function makeAvatar(L,o={}){
 const f=L.build==='f',g=new THREE.Group(),body=new THREE.Group();
 g.add(body);const rig={body,shoulders:[],elbows:[],hips:[],knees:[]};
 const skin=L.skin??0xc89173,top=L.top??0x4a6479,bot=L.bottom??0x3c4659;
 const shoes=L.shoes??0x303035,hair=L.hairColor??0x332721,st=L.hair??'short';
 const color=(v,defaultValue)=>v===undefined?defaultValue:v;
 const lightSkin=mixC(skin,0xffe4c8,.055);
 const shadowSkin=mixC(skin,0x493526,.20);
 const lip=mixC(skin,0x9d4c49,.27);
 const wearStyle=L.style||'tee',shortSleeves=['tee','scrubs','polo'].includes(wearStyle);
 // Continuous shirt and trousers, not separated ball joints or sharp box shoulders.
 const pelvis=new Part();
 pelvis.add(LATHE(f?'pelf':'pelm',f?PELF:PELM,32),bot,[0,0,0],[0,0,0],[f?1.00:1.04,1,.88]);
 if(L.skirt)pelvis.add(LATHE('npc2-skirt',SKIRT,40),bot,[0,.01,0],[0,0,0],[1,1,.84]);
 const pel=pelvis.build();pel.position.y=.91;body.add(pel);
 const torso=new THREE.Group();torso.position.y=.985;body.add(torso);rig.torso=torso;
 const topArt=new Part();
 topArt.add(npc2Torso(f),top,[0,0,0],[0,0,0],[1,1,.75]);
 const shX=f?.182:.211;
 for(const side of [-1,1])topArt.add(SPH(),top,[side*shX,.49,0],[0,0,0],[f?.064:.075,.064,.069]);
 topArt.add(CYL(.061,.068,.13,22),lightSkin,[0,.654,0]);
 // Soft fabric seams, sensible collars, and garments drawn in rather than glued-on blocks.
 const edge=mulC(top,.76);
 if(['shirt','polo','blazer','cardigan','flannel'].includes(wearStyle)){
  for(const side of [-1,1])topArt.add(SPH(),edge,[side*.047,.604,.082],[0,0,side*.11],[.051,.015,.025]);
 }else{
  topArt.add(TOR(.066,.007),edge,[0,.623,.021],[Math.PI/2,0,0],[1,.65,1]);
 }
 if(wearStyle==='blazer'||wearStyle==='cardigan'){
  const inner=color(L.inner,0xf0e7d7);
  topArt.add(SPH(),inner,[0,.402,.118],[0,0,0],[.086,.18,.014]);
  for(const sd of [-1,1])topArt.add(SPH(),top,[sd*.104,.415,.124],[0,0,sd*.09],[.042,.197,.013]);
 }
 if(wearStyle==='vest'&&L.vest){
  topArt.add(npc2Torso(f),L.vest,[0,.024,0],[0,0,0],[1.04,.91,.80],.83);
 }
 if(wearStyle==='hoodie'){
  topArt.add(TOR(.105,.027),edge,[0,.606,-.060],[1.10,0,0],[1.08,.93,1]);
  topArt.add(SPH(),edge,[0,.154,.120],[0,0,0],[.134,.065,.012]);
 }
 if(wearStyle==='chef')topArt.add(SPH(),0xfaf8f1,[0,.53,.122],[0,0,0],[.09,.12,.009]);
 if(o.teacher){
  topArt.add(SPH(),color(o.accent,0xc9aa68),[0,.365,.139],[0,0,0],[.051,.037,.006]);
  topArt.add(TOR(.104,.003),mulC(top,.72),[0,.52,.084],[1.4,0,0]);
 }
 if(L.bag!==undefined){
  topArt.add(SPH(),L.bag,[0,.288,-.180],[0,0,0],[.187,.210,.081]);
  for(const side of [-1,1])topArt.add(SPH(),mulC(L.bag,.8),[side*.112,.448,.118],[0,0,0],[.020,.20,.01]);
 }
 torso.add(topArt.build());
 // Articulated, overlapping limbs with subtle contour transitions.
 for(const side of [-1,1]){
  const sp=new THREE.Group();sp.position.set(side*shX,.49,0);sp.rotation.z=side*.105;torso.add(sp);
  const arm=new Part();
  arm.add(CAP(f?.056:.062,.205),top,[0,-.135,0],[0,0,0],[1,1,1]);
  if(shortSleeves)arm.add(CAP(f?.044:.047,.082),skin,[0,-.250,.006]);
  sp.add(arm.build());
  const el=new THREE.Group();el.position.y=-.298;sp.add(el);el.rotation.x=-.11;
  const fore=new Part();
  fore.add(CAP(.043,.185),shortSleeves?skin:top,[0,-.114,0]);
  if(!shortSleeves)fore.add(TOR(.045,.008),edge,[0,-.219,0],[Math.PI/2,0,0]);
  fore.add(SPH(),skin,[0,-.279,.004],[0,0,0],[.046,.067,.033]);
  fore.add(SPH(),skin,[-side*.022,-.303,.027],[0,0,-side*.2],[.022,.034,.021]);
  el.add(fore.build());
  if(o.prop&&side===-1){const pr=new Part();pr.add(SPH(),0x293b45,[0,-.302,.108],[0,0,0],[.115,.16,.010]);el.add(pr.build());}
  rig.shoulders.push(sp);rig.elbows.push(el);
  const hip=new THREE.Group();hip.position.set(side*(f?.088:.102),.903,0);body.add(hip);
  const thigh=new Part();thigh.add(CAP(f?.083:.086,.293),L.skirt?color(L.tights,0x302f32):bot,[0,-.206,0]);
  hip.add(thigh.build());
  const knee=new THREE.Group();knee.position.y=-.414;hip.add(knee);
  const shin=new Part();shin.add(CAP(f?.066:.071,.310),L.skirt?color(L.tights,0x302f32):bot,[0,-.195,0]);
  shin.add(SPH(),shoes,[0,-.408,.048],[0,0,0],[.076,.057,.142]);
  shin.add(SPH(),color(L.sole,0xaba9a4),[0,-.441,.054],[0,0,0],[.079,.019,.144]);
  knee.add(shin.build());rig.hips.push(hip);rig.knees.push(knee);
 }
 // Head, nose and cheekbone comprise ONE smooth surface with consistent vertex normals.
 const hpv=new THREE.Group();hpv.position.y=.698;torso.add(hpv);rig.head=hpv;
 const headArt=new Part();headArt.add(npc2Head(),skin);
 for(const side of [-1,1]){
  headArt.add(SPH(),skin,[side*.145,.15,-.013],[0,0,0],[.021,.043,.020]);
  headArt.add(npc2Stroke([[side*.025,.183,.146],[side*.052,.189,.143],[side*.077,.182,.132]],.0032),
    mulC(hair,.82));
  headArt.add(npc2Stroke([[side*.034,.160,.151],[side*.056,.162,.146],[side*.081,.154,.130]],.0022),
    shadowSkin);
  if(L.earrings)headArt.add(SPH(),0xc5a269,[side*.153,.113,-.006],[0,0,0],[.008,.012,.007]);
 }
 headArt.add(npc2Stroke([[-.028,.080,.131],[0,.079,.146],[.028,.080,.131]],.0037),lip);
 headArt.add(npc2Stroke([[-.025,.071,.131],[0,.066,.141],[.025,.071,.131]],.0026),mulC(lip,.78));
 if(L.glasses){
  const frame=0x323230;
  for(const side of [-1,1]){
   headArt.add(TOR(.027,.0025),frame,[side*.055,.163,.152],[0,0,0],[1,.72,1]);
   headArt.add(SPH(),frame,[side*.092,.166,.091],[0,0,0],[.003,.003,.061]);
  }
  headArt.add(SPH(),frame,[0,.164,.158],[0,0,0],[.018,.003,.003]);
 }
 hpv.add(headArt.build());
 // Natural low-profile eyes: the iris is set INTO the face instead of bulging spheres.
 const eyesArt=new Part();const eyeColor=color(L.eyes,0x554234);
 for(const side of [-1,1]){
  const x=side*.054;
  eyesArt.add(SPH(),0xf3f0e8,[x,.165,.147],[0,0,0],[.023,.0125,.0048]);
  eyesArt.add(SPH(),eyeColor,[x,.165,.1517],[0,0,0],[.010,.011,.003]);
  eyesArt.add(SPH(),0x1d1815,[x,.1645,.1538],[0,0,0],[.005,.006,.002]);
  eyesArt.add(SPH(),0xffffff,[x-side*.003,.169,.155],[0,0,0],[.003,.0028,.001]);
 }
 const eyes=eyesArt.build(AVM_EYE,false);hpv.add(eyes);rig.eyes=eyes;
 // Hair is a coherent scalp shell. Long styles get a single continuous
 // back curtain rather than dozens of round plugs or intersecting capsules.
 const hairArt=new Part(),hairInk=hair;
 if(st!=='bald'){
  hairArt.add(npc2HairCap(st),st==='hijab'?color(L.headscarf,hairInk):hairInk);
  if(['bob','long','locs','hijab'].includes(st))
   hairArt.add(npc2HairCurtain(st),st==='hijab'?color(L.headscarf,hairInk):hairInk);
  if(st==='ponytail'){
   hairArt.add(CAP(.049,.20),hairInk,[0,.070,-.187],[.30,0,0]);
   hairArt.add(CAP(.037,.145),hairInk,[0,-.065,-.206],[.20,0,0]);
  }
  if(st==='bun')hairArt.add(SPH(),hairInk,[0,.326,-.082],[0,0,0],[.080,.065,.083]);
 }else{
  // A closely shaved scalp retains the natural head contour.
  hairArt.add(npc2HairCap('buzz'),mixC(skin,hair,.085));
 }
 if(L.beard||L.stubble){
  const bc=L.beardColor??hairInk,shade=L.stubble?mixC(skin,bc,.32):mixC(skin,bc,.86);
  hairArt.add(SEG('npc2-beard',-.50*Math.PI,Math.PI,Math.PI*.58,Math.PI*.31),
    shade,[0,.155,.005],[0,0,0],[.145,.174,.148]);
  if(L.beard)hairArt.add(SPH(),shade,[0,.063,.114],[0,0,0],[.047,.018,.014]);
 }
 const hat=o.hat||L.hat;
 if(hat==='hard'){
  hairArt.add(SEG('npc2-hardhat',0,Math.PI*2,0,Math.PI*.45),0xe4ba4b,[0,.24,-.01],[0,0,0],[.176,.125,.174]);
  hairArt.add(SPH(),0xe4ba4b,[0,.230,.095],[0,0,0],[.152,.014,.106]);
 }else if(hat==='cap'){
  hairArt.add(SEG('npc2-softcap',0,Math.PI*2,0,Math.PI*.48),color(L.hatColor,0x314353),[0,.225,0],[0,0,0],[.165,.10,.165]);
  hairArt.add(SPH(),color(L.hatColor,0x314353),[0,.215,.119],[0,0,0],[.113,.013,.073]);
 }else if(hat==='chef'){
  hairArt.add(CYL(.136,.129,.105,30),0xfff8eb,[0,.330,0]);
  hairArt.add(SPH(),0xfff8eb,[0,.385,0],[0,0,0],[.160,.09,.16]);
 }
 if(hairArt.items.length)hpv.add(hairArt.build(AVM_DS));
 const hit=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,2.14,8),hideMat);
 hit.position.y=1.06;g.add(hit);rig.hit=hit;
 g.scale.setScalar(L.height||1);
 g.userData.characterArtVersion='Pathways NPC V2 · smooth cinematic';
 return {g,rig};
}

