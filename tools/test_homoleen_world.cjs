#!/usr/bin/env node
// Lightweight deploy gate: syntax-check the actual shipped game source and required UI routes.
"use strict";
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const main=path.resolve(__dirname,"..","homoleen-living-world.html");
const html=fs.readFileSync(main,"utf8");
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let checked=0;
for(let i=0;i<scripts.length;i++){
 const attrs=scripts[i][1],body=scripts[i][2];
 if(!body.trim()||/\bsrc\s*=/.test(attrs)||/type\s*=\s*["'](?:application\/json|importmap)/i.test(attrs))continue;
 try{new vm.Script(body,{filename:"homoleen-inline-"+i+".js"});checked++;}
 catch(e){console.error("JavaScript syntax failure:",e.stack);process.exitCode=1;}
}
const required=[
 ["original Pathways avatar",/function\s+makeAvatar\s*\(/],
 ["playable Sim",/function\s+simStart\s*\(/],
 ["mobile walking controls",/data-sim-move/],
 ["district navigation",/window\.__homoleenDistrict/],
 ["community interiors",/function\s+makeInterior\s*\(/],
 ["outdoor NPCs",/function\s+animateOutsideNPCs\s*\(/],
 ["school interaction",/campusSchool&&r\.campusDistance/],
 ["cinematic transit",/function\s+scenicTravel\s*\(/],
 ["road geometry",/function\s+roadSegment\s*\(/],
 ["room atmosphere",/function\s+stage15InteriorArt\s*\(/],
 ["WebGL failure fallback",/id=["']homoleen-render-recovery/],
 ["browser diagnostics",/id=["']hl-qa-runner/]
];
for(const [label,regex] of required)if(!regex.test(html)){
 console.error("Missing world feature:",label);process.exitCode=1;
}
for(const asset of ["vendor/homoleen-three.min.js","vendor/homoleen-orbitcontrols.js"]){
 if(!fs.existsSync(path.resolve(__dirname,"..",asset))){
   console.error("Missing vendor asset:",asset);process.exitCode=1;
 }
}
if(!process.exitCode)console.log("Homoleen deploy checks passed:",checked,"embedded JS scripts; required world systems and vendor assets present.");
