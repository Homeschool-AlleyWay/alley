// @ts-nocheck
/** Chibi character drawing (ported from the cartoon prototype) + a baker that turns it into billboard sprite sheets.
 *  Sheet layout: 4 rows (down, up, left, right) x 5 columns (stand, walk 1..4). */
const OUT='#6b4a4f';
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function fs(c,fill,lw=1.4){c.fillStyle=fill;c.fill();if(lw){c.lineWidth=lw;c.strokeStyle=OUT;c.lineJoin='round';c.stroke();}}
function line(c,x1,y1,x2,y2,w,col){c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=OUT;c.lineWidth=w+2.2;c.stroke();c.strokeStyle=col;c.lineWidth=w;c.stroke();}

const SKINS=['#fbdcc4','#f0c29b','#d9a074','#a86f4f','#7a4a36'];
const SHIRTS=['#4f91c7','#88b89a','#eab94e','#b8a8da','#f6b294','#8fc9e8','#eaa5b2','#5e9c72','#f28f7e','#a9dcc0'];
const HAIRS=['#3a2a30','#694a38','#9a653d','#e0b04e','#2b2b33','#b5563e'];
const PANTS=['#5b6b8c','#7a6a58','#4f5d75','#8a5f6a','#5f7a68'];
function drawChar(c,fx,fy,o,t){
 c.save();c.translate(Math.round(fx*2)/2,Math.round(fy*2)/2);
 const mv=o.moving,sw=mv?Math.sin(o.walk):0,dir=o.dir,side=dir==='left'||dir==='right',fl=dir==='left'?-1:1,up=dir==='up',sit=o.sitting;
 c.fillStyle='rgba(70,45,55,.24)';c.beginPath();c.ellipse(0,1,10,3.6,0,0,7);c.fill();
 if(sit)c.translate(0,8);
 c.translate(0,mv?-Math.abs(Math.cos(o.walk))*1.8:Math.sin(t*2+o.id)*.35);
 const pants=PANTS[o.id%5],pack=o.pack||['#f28f7e','#4f91c7','#eab94e','#88b89a','#b8a8da'][o.id%5];
 // legs
 if(!sit)[-1,1].forEach(s=>{const lift=mv?Math.max(0,s*sw)*2.6:0,x1=side?0:s*3.2,x2=side?s*sw*4.2:s*3.2;
  line(c,x1,-9,x2,-2-lift,3.6,pants);c.beginPath();c.ellipse(x2+(side?fl*1.2:0),-.6-lift,3.4,1.9,0,0,7);fs(c,'#fbf6ee',1.1);});
 const arm=(s,near)=>{const ax=side?s*sw*3.5:s*8.2,hy=-9.5-(mv?-s*sw*1.5:0);line(c,side?0:s*6.6,-17,ax,hy,3.2,o.shirt);c.beginPath();c.arc(ax,hy+.6,1.9,0,7);fs(c,o.skin,1);};
 if(side)arm(-fl*-1,false);
 if(side){rr(c,-fl*9.5,-19,7,10,3);fs(c,pack,1.2);}                     // side backpack peeks out behind
 rr(c,-6.6,-19.5,13.2,11.5,4.5);fs(c,o.shirt,1.4);                        // torso
 c.fillStyle='rgba(255,255,255,.3)';c.beginPath();c.ellipse(-2.4,-16.5,2.4,3.4,0,0,7);c.fill();
 const v=o.id%3;
 if(v===0){c.fillStyle='rgba(255,255,255,.45)';c.fillRect(-6,-15.4,12,2.4);}
 else if(v===2&&!up){c.fillStyle='#fff';c.beginPath();c.moveTo(-3,-19.4);c.lineTo(0,-16);c.lineTo(3,-19.4);c.closePath();fs(c,'#fff',.9);}
 if(up){rr(c,-6,-19,12,10.5,4);fs(c,pack,1.3);c.fillStyle='rgba(255,255,255,.3)';c.fillRect(-4,-17.5,8,2);}
 else if(!side){line(c,-3.6,-19.2,-3.6,-11,1.5,pack);line(c,3.6,-19.2,3.6,-11,1.5,pack);}
 if(o.tag){c.beginPath();c.moveTo(-6,-19.5);c.lineTo(-1,-8.5);c.lineTo(-6.6,-9);c.closePath();c.fillStyle='#c4463c';c.fill();c.beginPath();c.moveTo(6,-19.5);c.lineTo(1,-8.5);c.lineTo(6.6,-9);c.closePath();c.fill();}
 if(!side){arm(-1);arm(1);}else arm(fl*1,true);
 // head + hair (back)
 const hy=-28,hc=o.hair,st=o.style;
 if(st==='long'||st==='bob'){rr(c,-9.8,hy-6,19.6,st==='long'?20:14,7);fs(c,hc,1.3);}
 if(st==='bun'){c.beginPath();c.arc(side?-fl*3:0,hy-9.5,4.4,0,7);fs(c,hc,1.3);}
 if(st==='pony'){c.save();c.translate(side?-fl*9:up?0:9,side?hy+2:up?hy+8:hy+1);c.rotate(side?0:up?0:-.5);c.beginPath();c.ellipse(0,4,3.2,6.5,0,0,7);fs(c,hc,1.3);c.restore();}
 if(st==='curly'){[[-8,hy-2],[8,hy-2],[-6,hy-8],[6,hy-8],[0,hy-10]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,4.6,0,7);fs(c,hc,1.2);});}
 if(!side){[-1,1].forEach(s=>{c.beginPath();c.arc(s*8.7,hy+1,2,0,7);fs(c,o.skin,1);});}
 c.beginPath();c.ellipse(side?fl*.6:0,hy,8.9,8.3,0,0,7);fs(c,o.skin,1.5);
 c.fillStyle='rgba(120,70,60,.13)';c.beginPath();c.ellipse(3,hy+3,7.5,6,0,0,7);c.fill();
 // face
 if(!up){
  const blink=(t*.9+o.id*1.7)%4<.13,ex=side?[fl*4.4]:[-3.5,3.5];
  ex.forEach(x=>{if(blink){c.strokeStyle='#3a2a30';c.lineWidth=1.1;c.beginPath();c.moveTo(x-1.6,hy);c.lineTo(x+1.6,hy);c.stroke();}
   else{c.fillStyle='#3a2a30';c.beginPath();c.ellipse(x,hy,1.7,2.3,0,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x-.5,hy-.9,.7,0,7);c.fill();}
   c.strokeStyle=o.hair;c.lineWidth=.9;c.beginPath();c.moveTo(x-2,hy-3.6);c.lineTo(x+2,hy-3.9);c.stroke();
   if(o.glasses){c.strokeStyle='#5b4048';c.lineWidth=.9;c.beginPath();c.arc(x,hy,3.2,0,7);c.stroke();}});
  if(o.glasses&&!side){c.strokeStyle='#5b4048';c.lineWidth=.9;c.beginPath();c.moveTo(-.3,hy-.5);c.lineTo(.3,hy-.5);c.stroke();}
  c.fillStyle='rgba(255,110,125,.38)';(side?[fl*6.4]:[-6,6]).forEach(x=>{c.beginPath();c.ellipse(x,hy+3.4,2.1,1.3,0,0,7);c.fill();});
  c.strokeStyle='#8a4650';c.lineWidth=1;c.lineCap='round';c.beginPath();c.arc(side?fl*3.6:0,hy+4.6,1.7,.15*Math.PI,.85*Math.PI);c.stroke();
  if(side){c.beginPath();c.arc(fl*9,hy+.6,1,0,7);c.fillStyle=o.skin;c.fill();}
 }
 // hair (front)
 const sx=side?-fl*1.6:0;
 if(up){c.beginPath();c.ellipse(0,hy-.4,9.4,8.9,0,0,7);fs(c,hc,1.4);c.fillStyle='rgba(255,255,255,.2)';c.beginPath();c.ellipse(-2.5,hy-4,3.5,2,0,0,7);c.fill();}
 else{c.beginPath();c.moveTo(-9.3+sx,hy+.5);c.bezierCurveTo(-11+sx,hy-14,11+sx,hy-14,9.3+sx,hy+.5);
  if(side)c.quadraticCurveTo(fl*7+sx,hy-2.6,fl*4+sx,hy-4.4);else{c.quadraticCurveTo(6,hy-3.4,2,hy-4.4);c.quadraticCurveTo(-3,hy-6,-9.3,hy+.5);}
  if(side){c.lineTo(-fl*9.3+sx,hy+.5);}c.closePath();fs(c,hc,1.4);
  c.fillStyle='rgba(255,255,255,.22)';c.beginPath();c.ellipse(-3+sx,hy-6.4,3.4,1.5,-.3,0,7);c.fill();}
 if(st==='long'&&!up&&!side){[-1,1].forEach(s=>{c.beginPath();c.ellipse(s*9,hy+6,2.3,7,0,0,7);fs(c,hc,1.1);});}
 if(o.tag){const my=hy-19+Math.sin(t*4)*1.5;c.beginPath();c.moveTo(-5,my-5);c.lineTo(5,my-5);c.lineTo(0,my+1);c.closePath();fs(c,'#f28f7e',1.3);}
 c.restore();
}


export const DIRS = ["down", "up", "left", "right"] as const;
export const FW = 160, FH = 240, COLS = 5, SCALE = 4.6, FEET = 12;
export interface Look { id: number; skin: string; hair: string; style: string; shirt: string; glasses?: boolean; tag?: boolean; pack?: string }
export { SKINS, SHIRTS, HAIRS };

/** Bake one character's sprite sheet into a canvas. */
export function bakeSheet(look: Look): HTMLCanvasElement {
  const cv = document.createElement("canvas"); cv.width = FW * COLS; cv.height = FH * DIRS.length;
  const c = cv.getContext("2d")!;
  DIRS.forEach((dir, r) => {
    for (let k = 0; k < COLS; k++) {
      c.save(); c.translate(k * FW + FW / 2, r * FH + FH - FEET); c.scale(SCALE, SCALE);
      c.shadowColor = "rgba(52,34,46,.35)"; c.shadowBlur = 2.2; c.shadowOffsetX = 0.5; c.shadowOffsetY = 1.2;    // paper cut-out drop shadow
      drawChar(c, 0, 0, { ...look, dir, moving: k > 0, walk: (k * Math.PI) / 2, sitting: false }, 0);
      c.restore();
    }
  });
  return cv;
}
