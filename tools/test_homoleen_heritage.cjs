#!/usr/bin/env node
// Dependency-free consistency check for the isolated Claude/UNIFY heritage viewer.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('homoleen-heritage-review.html');
const build=read('tools/build_netlify.py');
const world=read('homoleen-living-world.html');
const expected=[
 'homoleen-pathways-art-preview.html',
 'homoleen-living-world.html?preview=school',
 'homoleen-living-world.html?preview=town',
 'homoleen-living-world.html?preview=family',
 'homoleen-living-world.html?preview=adult',
 'classroom3d.html',
 'auditorium3d.html',
 'homoleen-living-world.html?npc=studio',
 'homoleen-quaternius-studio.html'
];
function check(condition,message){if(!condition)throw new Error(message);console.log('PASS',message)}
check(build.includes('"homoleen-heritage-review.html"'),'Netlify includes isolated route');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
check(scripts.length===1,'One local self-contained viewer script');
new vm.Script(scripts[0][1],{filename:'homoleen-heritage-review.html'});
check(html.includes('id="photoMode"')&&html.includes('id="photoReturn"'),'Photo mode can be exited');
check(html.includes('localStorage')&&html.includes('Export review notes'),'Notes saved locally and exportable');
check(world.includes("query.get('preview')")&&world.includes("get('npc')"),'Existing world exposes district/NPC deep links');
for(const src of expected){
 check(html.includes("src:'"+src+"'"),'Real scene reference '+src);
 const file=src.split('?')[0];
 check(fs.existsSync(path.join(root,file)),'Scene page exists '+file);
}
check(!html.includes('sketchfab.com/models/'),'Viewer does not hotlink third-party character assets');
console.log('Homoleen heritage route checks passed');
