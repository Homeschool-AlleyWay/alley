// Source-level gate for the isolated dollhouse trial; does not claim visual QA.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = path => fs.readFileSync(path, 'utf8');
const page = read('dollhouse-trial.html');
const build = read('tools/build_netlify.py');
const npm = JSON.parse(read('package.json'));

assert.ok(page.includes('src="demo/dist/dollhouse.js"'), 'Dollhouse bundle reference missing');
assert.ok(npm.scripts.build.includes('demo/dollhouse.ts'), 'Dollhouse build step missing');
assert.ok(build.includes('"dollhouse-trial.html"'), 'Page not shipped in Netlify build');
assert.ok(build.includes('test_homoleen_world.cjs'), 'Existing world build check missing');
for (const target of ['/classroom3d.html', '/curriculum.html', '/dorm.html', '/auditorium3d.html']) {
  assert.ok(page.includes(target), 'Missing school room link: ' + target);
}
assert.ok(page.includes('Cafeteria'), 'Concept-only cafeteria missing');
assert.ok(page.includes('href:null'), 'Unbuilt cafeteria must remain non-navigable');
console.log('Dollhouse trial source and room links: passed');
