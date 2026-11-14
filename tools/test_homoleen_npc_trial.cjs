/* Structural checks for optional Homoleen GLB integration preview.
 * These are not a substitute for WebGL screenshots or Android motion QA. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const filename=path.resolve(__dirname,'..','homoleen-npc-trial.html');
const html=fs.readFileSync(filename,'utf8');
const match=html.match(/window\.HomoleenNPCTrialAssetData=(\[[^;]+\]);/);
assert.ok(match,'embedded trial character data must exist');
const people=JSON.parse(match[1]);
assert.equal(people.length,6,'expected six preview GLBs');
assert.equal(new Set(people.map(p=>p.i)).size,6);
for(const p of people){
  assert.ok(p.name&&p.band&&p.data,'NPC must have roster metadata and model bytes');
  const glb=Buffer.from(p.data,'base64');
  assert.equal(glb.toString('ascii',0,4),'glTF','valid binary glTF header');
  assert.equal(glb.readUInt32LE(4),2,'glTF version 2');
  assert.equal(glb.readUInt32LE(8),glb.length,'embedded GLB size matches header');
  const jsonLength=glb.readUInt32LE(12);
  const meta=JSON.parse(glb.toString('utf8',20,20+jsonLength));
  assert.ok(meta.nodes.length>0&&meta.meshes.length>0,'must include geometry and nodes');
  for(const n of ['Idle','Walk','Wave','Cheer']){
    assert.ok(meta.animations.some(a=>a.name===n),p.name+' missing '+n);
  }
}
assert.ok(html.includes('function pass4ReadGlb('),'runtime GLB parser is present');
assert.ok(html.includes('pass4Update(dt,t);'),'animation tied to main frame clock');
assert.ok(html.includes('function stage15InteriorArt('),'current detailed-world foundation preserved');
assert.ok(html.includes("pass4Panel.id='hl-pass4-panel'"),'separate toggle UI exists');
console.log('PASS: 6 GLBs, 4 animations each, Stage 15 preserved and loop hook present');
