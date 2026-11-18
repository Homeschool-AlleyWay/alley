#!/usr/bin/env node
// Structural checks only. Actual GLB/GLTF scene and Android screenshot require a live browser.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const check = (ok,label) => {
 if(!ok) throw new Error('FAIL '+label);
 console.log('PASS '+label);
};
const page = read('homoleen-quaternius-studio.html');
const ts = read('demo/quaternius-studio.ts');
const importer = read('tools/import_quaternius_trial.py');
const pkg = JSON.parse(read('package.json'));
const build = read('tools/build_netlify.py');
check(page.includes('id="viewport"')&&page.includes('demo/dist/quaternius-studio.js'),'Art studio loads its compiled Three.js engine');
check(page.includes('data-model="female"')&&page.includes('data-model="male"'),'Actual female and male model selectors');
check(ts.includes('GLTFLoader')&&ts.includes('AnimationMixer')&&ts.includes('animationsForCharacter'),'Rigged glTF and real animation tracks used');
check(!ts.includes('SphereGeometry')&&!ts.includes('CapsuleGeometry'),'No generated placeholder humanoids');
check(importer.includes('quaternius.com/packs/universalbasecharacters.html'),'Original asset attribution and license source present');
check(importer.includes('5821923af517ac5fdc82505faa92a0d575fc1b1a'),'Immutable source revision pinned');
check(importer.includes('UAL1_Standard.glb')&&!importer.includes('mixamo.com'),'Quaternius CC0 animation assets, not redistributable Adobe downloads');
check(pkg.scripts.build.includes('demo/quaternius-studio.ts'),'Art studio bundle in npm build');
check(build.includes('"homoleen-quaternius-studio.html"'),'Preview route in Netlify published artifact');
check(build.includes('"import_quaternius_trial.py"'),'Asset importer invoked during preview build');
console.log('Quaternius art source checks passed');
