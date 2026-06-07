import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";


let gameState = "TITLE";
let buffer = [];
let lastInputTime = 0;
let autoCastDelay = 430;

let player, enemies = [], projectiles = [], enemyProjectiles = [], particles = [], floatingTexts = [], runes = [], books = [];
let lastSpellName = "", lastSpellTime = 0;
let counterFlash = 0;
let counterText = "";

let cameraEnabled = false;
let cameraReady = false;
let cameraError = "";
let videoElement = null;
let handLandmarker = null;
let latestLandmarks = null;
let latestGesture = "NONE";
let stableGesture = "NONE";
let latestZone = "IDLE";
let inputState = "IDLE";
let lastCameraWordTime = 0;
let gestureHistory = [];
let battleStartTime = 0, bossSpawned = false, tutorialPage = 0;

const WORDS = {
  FIRE:   { key:"1", label:"Ignis",  type:"ROOT",     color:[255,105,48] },
  WATER:  { key:"2", label:"Aqua",   type:"ROOT",     color:[70,170,255] },
  WIND:   { key:"3", label:"Ventus", type:"ROOT",     color:[145,255,205] },
  EARTH:  { key:"4", label:"Terra",  type:"ROOT",     color:[170,125,78] },
  LIGHT:  { key:"5", label:"Lux",    type:"ROOT",     color:[255,240,150] },
  SHOT:   { key:"6", label:"Shot",   type:"ACTION",   color:[205,220,255] },
  BEAM:   { key:"7", label:"Beam",   type:"ACTION",   color:[255,255,215] },
  WALL:   { key:"8", label:"Wall",   type:"ACTION",   color:[190,160,115] },
  SEEK:   { key:"9", label:"Seek",   type:"MODIFIER", color:[255,90,90] }
};

const KEY_TO_WORD = {"1":"FIRE","2":"WATER","3":"WIND","4":"EARTH","5":"LIGHT","6":"SHOT","7":"BEAM","8":"WALL","9":"SEEK"};

async function setup(){
  createCanvas(1280,720);
  textFont("Georgia");
  initRunes(); initBooks(); resetGame();
  initCamera();
}

function resetGame(){
  player={x:180,y:height/2+40,hp:100,maxHp:100,lingua:100,flow:1,speed:4.3,invuln:0};
  enemies=[]; projectiles=[]; enemyProjectiles=[]; particles=[]; floatingTexts=[]; buffer=[];
  bossSpawned=false; lastSpellName="";
}

function draw(){
  drawBackground(); drawLibraryArchitecture();

  if(gameState==="TITLE"){ drawTitle(); return; }
  if(gameState==="TUTORIAL"){ drawTutorial(); return; }

  if(gameState==="BATTLE"||gameState==="BOSS"){
    handlePlayerMovement(); updateCameraInput(); handleAutoCast(); updateCombat(); drawCombat(); drawHUD(); drawControls(); drawCameraDebug(); return;
  }
  if(gameState==="VICTORY"){ drawCombat(); drawHUD(); drawVictory(); return; }
  if(gameState==="GAMEOVER"){ drawCombat(); drawGameOver(); return; }
}

function keyPressed(){
  if(gameState==="TITLE" && key===" "){ gameState="TUTORIAL"; return; }
  if(gameState==="TUTORIAL" && key===" "){ tutorialPage++; if(tutorialPage>2) startBattle(); return; }
  if((gameState==="VICTORY"||gameState==="GAMEOVER") && (key==="r"||key==="R")){ resetGame(); tutorialPage=0; gameState="TITLE"; return; }
  if((key==="c" || key==="C") && (gameState==="BATTLE" || gameState==="BOSS")){
    cameraEnabled = !cameraEnabled;
    return;
  }

  if(gameState!=="BATTLE" && gameState!=="BOSS") return;

  const word=KEY_TO_WORD[key];
  if(word) addWord(word);
}

function startBattle(){
  gameState="BATTLE"; battleStartTime=millis();
  enemies.push(createEnemy(950,height/2-72,"Ashling",75,"ashling"));
  enemies.push(createEnemy(1060,height/2+78,"Ashling",75,"ashling"));
}

function spawnBoss(){
  gameState="BOSS"; bossSpawned=true; enemies=[];
  enemies.push(createEnemy(955,height/2+8,"Speaker of Flame",360,"boss"));
  floatingTexts.push({text:"The Speaker of Flame appears",x:width/2,y:135,life:150});
}

function createEnemy(x,y,name,hp,type){
  return {x,y,name,hp,maxHp:hp,type,pulse:random(1000),castTimer:random(50,120),castDuration:type==="boss"?118:86,casting:false,castProgress:0,currentSpell:null,nextSpellDelay:type==="boss"?124:155};
}

function addWord(word){
  if(buffer.length>=5) return;
  buffer.push(word); lastInputTime=millis();
  burstParticles(player.x+38+buffer.length*12,player.y-72,WORDS[word].color,12);
}

function handleAutoCast(){
  if(buffer.length===0) return;
  if(millis()-lastInputTime>autoCastDelay || buffer.length>=5){ castSpell(buffer); buffer=[]; }
}

/* v0.6: spell visual grammar
ROOT changes material/color/secondary behavior.
ACTION changes shape:
- no action: pulse/orb
- SHOT: orb projectile
- BEAM: long continuous ray
- WALL: stationary barrier
MODIFIER changes behavior:
- SEEK: homing and red lock ring
*/
function resolveSpell(words){
  const root = words.find(w=>WORDS[w]?.type==="ROOT");
  const action = words.find(w=>WORDS[w]?.type==="ACTION");
  const modifiers = words.filter(w=>WORDS[w]?.type==="MODIFIER");
  const rootWord = root ? WORDS[root] : null;
  const actionWord = action ? WORDS[action] : null;
  const seek = modifiers.includes("SEEK");

  let name = root ? rootWord.label : "Broken";
  if(action) name += " " + actionWord.label;
  else name += " Pulse";
  if(seek) name = "Seeking " + name;

  let visual = "pulse";
  if(action==="SHOT") visual="shot";
  if(action==="BEAM") visual="beam";
  if(action==="WALL") visual="wall";

  let color = rootWord ? rootWord.color : [160,160,180];
  let damage = root ? 12 : 4;
  let speed = 6;
  let radius = 14;
  let duration = 1;

  if(visual==="pulse"){ damage+=2; speed=5; radius=24; }
  if(visual==="shot"){ damage+=12; speed=9; radius=17; }
  if(visual==="beam"){ damage+=5; speed=0; radius=18; duration=34; }
  if(visual==="wall"){ damage=0; speed=0; radius=40; duration=175; }

  const repeat = root ? words.filter(w=>w===root).length : 0;
  if(repeat>1){ damage += (repeat-1)*10; radius += (repeat-1)*3; }

  if(root==="FIRE"){ damage+=5; }
  if(root==="WATER"){ radius+=4; }
  if(root==="WIND"){ speed+=3; }
  if(root==="EARTH" && visual==="wall"){ duration+=40; }
  if(root==="LIGHT" && visual==="beam"){ damage+=10; duration+=8; }

  if(seek){ damage+=7; speed=max(4, speed-1); }

  return {name, words:[...words], root, action, modifiers, visual, damage, speed, radius, duration, color, seek};
}

function castSpell(words){
  const spell=resolveSpell(words);
  lastSpellName=spell.name; lastSpellTime=millis();
  player.lingua=max(0,player.lingua-max(2,words.length*3));
  player.flow=min(5,player.flow+0.13);

  if(spell.visual==="beam"){
    projectiles.push({
      kind:"beam", root:spell.root, action:spell.action, x:player.x+34, y:player.y, length:spell.seek?780:620, width:spell.radius,
      damage:spell.damage, color:spell.color, seek:spell.seek, life:spell.duration, hitSet:new Set()
    });
    burstParticles(player.x+54,player.y,spell.color,28);
  } else if(spell.visual==="wall"){
    projectiles.push({kind:"wall",root:spell.root,action:spell.action,x:player.x+125,y:player.y,damage:0,radius:spell.radius,color:spell.color,life:spell.duration});
  } else if(spell.visual==="pulse"){
    projectiles.push({kind:"pulse",root:spell.root,action:spell.action,x:player.x+48,y:player.y,vx:spell.speed,damage:spell.damage,radius:spell.radius,color:spell.color,life:220,seek:spell.seek,angle:0});
  } else {
    projectiles.push({kind:"shot",root:spell.root,action:spell.action,x:player.x+42,y:player.y,vx:spell.speed,damage:spell.damage,radius:spell.radius,color:spell.color,life:320,seek:spell.seek,angle:0});
  }

  floatingTexts.push({text:spell.name,x:player.x+100,y:player.y-82,life:90});
}

function handlePlayerMovement(){
  let dx=0,dy=0;
  if(keyIsDown(LEFT_ARROW)) dx-=1;
  if(keyIsDown(RIGHT_ARROW)) dx+=1;
  if(keyIsDown(UP_ARROW)) dy-=1;
  if(keyIsDown(DOWN_ARROW)) dy+=1;
  if(dx||dy){ let len=sqrt(dx*dx+dy*dy); dx/=len; dy/=len; }
  player.x=constrain(player.x+dx*player.speed,85,width-160);
  player.y=constrain(player.y+dy*player.speed,155,height-150);
}

function updateCombat(){
  updateEnemies(); updateProjectiles(); updateEnemyProjectiles(); updateParticles(); updateFloatingTexts();
  player.lingua=min(100,player.lingua+0.035); player.flow=max(1,player.flow-0.0015);
  if(player.invuln>0) player.invuln--;
  if(gameState==="BATTLE" && enemies.length===0 && !bossSpawned && millis()-battleStartTime>1000) spawnBoss();
  if(gameState==="BOSS" && enemies.length===0) gameState="VICTORY";
  if(player.hp<=0) gameState="GAMEOVER";
}

function updateEnemies(){
  for(let e of enemies){
    e.castTimer--;
    if(!e.casting && e.castTimer<=0){ e.casting=true; e.castProgress=0; e.currentSpell=chooseEnemySpell(e); }
    if(e.casting){
      e.castProgress++;
      if(e.castProgress>=e.castDuration){ enemyCast(e); e.casting=false; e.castTimer=e.nextSpellDelay+random(-25,42); }
    }
    e.y += sin(frameCount*(e.type==="boss"?0.01:0.016)+e.pulse)*0.22;
  }
}

function chooseEnemySpell(e){
  if(e.type==="boss"){
    const hpPct=e.hp/e.maxHp;
    if(hpPct<0.38) return random([["FIRE","BEAM","SEEK"],["FIRE","FIRE","SHOT"]]);
    if(hpPct<0.72) return random([["FIRE","SHOT"],["FIRE","BEAM"]]);
    return ["FIRE","SHOT"];
  }
  return ["FIRE","SHOT"];
}

function enemyCast(e){
  const spell=resolveSpell(e.currentSpell||["FIRE","SHOT"]);
  if(spell.visual==="beam"){
    enemyProjectiles.push({kind:"beam",root:spell.root,action:spell.action,x:e.x-42,y:e.y,length:spell.seek?720:560,width:spell.radius,damage:max(10,floor(spell.damage*.62)),color:spell.color,seek:spell.seek,life:spell.duration,hit:false});
  }else{
    enemyProjectiles.push({kind:"shot",root:spell.root,action:spell.action,x:e.x-46,y:e.y,vx:-max(5.8,spell.speed*.72),damage:max(10,floor(spell.damage*.72)),radius:max(13,spell.radius),seek:spell.seek,color:spell.color,life:360});
  }
  burstParticles(e.x-42,e.y,spell.color,18);
}

function updateProjectiles(){
  for(let p of projectiles){
    if(p.kind==="shot" || p.kind==="pulse"){
      if(p.seek && enemies.length){
        const target=nearestEnemy(p.x,p.y);
        if(target){ const dy=target.y-p.y; p.y+=constrain(dy*.025,-2.2,2.2); }
      }
      p.x+=p.vx; p.life--; p.angle+=0.2;
      spawnTrail(p.x,p.y,p.color,p.kind==="pulse"?2:1);

      for(let ep of enemyProjectiles){
        if(ep.kind==="shot" && dist(p.x,p.y,ep.x,ep.y)<p.radius+ep.radius+8 && !p.hit && ep.life>0){
          const result = resolveCounter(p, ep);
          if(result.playerWins){
            ep.life=0;
            p.damage += 5;
            triggerCounter(result.text, p.x, p.y, p.color);
          }else if(result.enemyWins){
            p.life=0;
            p.hit=true;
            triggerCounter("COUNTER FAILED", p.x, p.y, [255,80,80]);
          }else{
            ep.life=0;
            p.life=0;
            p.hit=true;
            triggerCounter("SPELL CLASH", p.x, p.y, [255,220,150]);
          }
        }
      }

      for(let e of enemies){
        const hitR=e.type==="boss"?52:30;
        if(dist(p.x,p.y,e.x,e.y)<p.radius+hitR && !p.hit){
          e.hp-=p.damage; p.hit=true; p.life=0;
          burstParticles(e.x,e.y,p.color,42);
          floatingTexts.push({text:"-"+p.damage,x:e.x,y:e.y-55,life:72});
        }
      }
    } else if(p.kind==="beam"){
      p.life--;
      if(p.seek && enemies.length){
        const target=nearestEnemy(p.x,p.y);
        if(target) p.y += constrain((target.y-p.y)*0.035,-2.8,2.8);
      }

      for(let ep of enemyProjectiles){
        if(ep.kind==="shot"){
          const withinX = ep.x > p.x && ep.x < p.x+p.length;
          const withinY = abs(ep.y-p.y) < p.width+ep.radius;
          if(withinX && withinY){
            const result = resolveCounter(p, ep);
            if(result.playerWins || !result.enemyWins){
              ep.life=0;
              triggerCounter(result.playerWins ? result.text : "BEAM BREAK", ep.x, ep.y, p.color);
            }
          }
        }
      }

      for(let e of enemies){
        const withinX = e.x > p.x && e.x < p.x+p.length;
        const withinY = abs(e.y-p.y) < p.width+(e.type==="boss"?45:25);
        const key=e.name+e.x+e.y;
        if(withinX && withinY && !p.hitSet.has(key)){
          e.hp-=p.damage; p.hitSet.add(key);
          burstParticles(e.x,e.y,p.color,32);
          floatingTexts.push({text:"-"+p.damage,x:e.x,y:e.y-55,life:60});
        }
      }
    } else if(p.kind==="wall"){
      p.life--;
    }
  }
  projectiles=projectiles.filter(p=>p.life>0 && (p.x<width+140 || p.kind==="beam") && !p.hit);
  enemies=enemies.filter(e=>e.hp>0);
}

function updateEnemyProjectiles(){
  for(let p of enemyProjectiles){
    if(p.kind==="beam"){
      p.life--;
      if(p.seek) p.y += constrain((player.y-p.y)*0.03,-2.5,2.5);
      const withinX = player.x < p.x && player.x > p.x-p.length;
      const withinY = abs(player.y-p.y) < p.width+24;
      if(withinX && withinY && !p.hit && player.invuln<=0){
        player.hp-=p.damage; player.invuln=45; p.hit=true;
        burstParticles(player.x,player.y,p.color,34);
        floatingTexts.push({text:"-"+p.damage,x:player.x,y:player.y-58,life:72});
      }
    }else{
      if(p.seek){ let dy=player.y-p.y; p.y+=constrain(dy*.024,-2.1,2.1); }
      p.x+=p.vx; p.life--; spawnTrail(p.x,p.y,p.color,1);
      for(let wall of projectiles){
        if(wall.kind==="wall" && dist(p.x,p.y,wall.x,wall.y)<p.radius+38){
          p.life=0; wall.life-=42; burstParticles(p.x,p.y,[210,170,110],26); triggerCounter("TERRA WALL BLOCK", p.x, p.y, [210,170,110]);
        }
      }
      if(dist(p.x,p.y,player.x,player.y)<p.radius+24 && player.invuln<=0){
        player.hp-=p.damage; player.invuln=45; p.life=0;
        burstParticles(player.x,player.y,[255,90,90],32);
        floatingTexts.push({text:"-"+p.damage,x:player.x,y:player.y-58,life:72});
      }
    }
  }
  enemyProjectiles=enemyProjectiles.filter(p=>p.life>0 && p.x>-120);
}


function resolveCounter(playerSpell, enemySpell){
  const pr = playerSpell.root;
  const er = enemySpell.root;
  const pa = playerSpell.action;
  const ea = enemySpell.action;

  if(pr==="WATER" && er==="FIRE") return {playerWins:true, text:"AQUA COUNTERS IGNIS"};
  if(pr==="EARTH" && pa==="WALL") return {playerWins:true, text:"TERRA WALL BLOCK"};
  if(pr==="LIGHT" && pa==="BEAM" && enemySpell.seek) return {playerWins:true, text:"LUX DISPELS SEEK"};
  if(pr===er && pa===ea) return {playerWins:false, enemyWins:false, text:"MIRROR CLASH"};
  if(pr==="FIRE" && er==="WATER") return {enemyWins:true, text:"IGNIS EXTINGUISHED"};

  return {playerWins:false, enemyWins:false, text:"SPELL CLASH"};
}

function triggerCounter(text,x,y,col){
  counterText = text;
  counterFlash = 28;
  burstParticles(x,y,col,36);
  floatingTexts.push({text,x,y:y-40,life:80});
}

function nearestEnemy(x,y){
  let best=null,bestD=Infinity;
  for(let e of enemies){ const d=dist(x,y,e.x,e.y); if(d<bestD){best=e;bestD=d;} }
  return best;
}

function spawnTrail(x,y,col,amount){
  for(let i=0;i<amount;i++){
    particles.push({x:x+random(-8,8),y:y+random(-6,6),vx:random(-.35,.2),vy:random(-.45,.45),life:24,col,size:random(3,7)});
  }
}

function updateParticles(){ for(let p of particles){p.x+=p.vx;p.y+=p.vy;p.life--;} particles=particles.filter(p=>p.life>0); }
function updateFloatingTexts(){ for(let f of floatingTexts){f.y-=.55;f.life--;} floatingTexts=floatingTexts.filter(f=>f.life>0); }

function drawCombat(){
  drawArena(); drawPlayer(); drawEnemies(); drawProjectiles(); drawEnemyProjectiles(); drawParticles(); drawFloatingTexts();
}

function drawBackground(){
  background(7,4,10);
  for(let r=0;r<16;r++){ noStroke(); fill(125,48,22,map(r,0,15,42,0)); ellipse(width/2,height/2+70,600+r*80,260+r*38); }
  for(let i=0;i<10;i++){ stroke(130,64,38,18); strokeWeight(2); line(0,height-120+i*8,width,height-170+i*5); }
}

function initRunes(){
  for(let i=0;i<42;i++) runes.push({x:random(width),y:random(80,height-130),s:random(13,30),a:random(TWO_PI),speed:random(.001,.006),glyph:random(["◇","△","◊","□","Ignis","ξ","λ","∴"])});
}
function initBooks(){
  for(let i=0;i<16;i++) books.push({x:random(120,width-120),y:random(120,520),w:random(28,54),h:random(12,20),a:random(TWO_PI),speed:random(.002,.009)});
}

function drawLibraryArchitecture(){ drawPillars(); drawFloatingBooks(); drawRunes(); drawForegroundVignette(); }
function drawPillars(){
  noStroke();
  for(let i=0;i<6;i++){
    let x=52+i*238;
    fill(35,22,28,190); rect(x,82,56,515,12);
    fill(95,45,32,140); rect(x-10,95,76,22,7); rect(x-10,552,76,24,7);
    fill(210,92,45,36); rect(x+15,120,8,410,6);
  }
}
function drawFloatingBooks(){
  rectMode(CENTER);
  for(let b of books){
    b.a+=b.speed; let y=b.y+sin(frameCount*b.speed*18+b.a)*8;
    push(); translate(b.x,y); rotate(sin(b.a)*.08);
    noStroke(); fill(85,38,32,115); rect(0,0,b.w,b.h,3);
    fill(205,140,78,80); rect(0,-2,b.w*.82,2,2); pop();
  }
  rectMode(CORNER);
}
function drawRunes(){
  textAlign(CENTER);
  for(let r of runes){
    r.a+=r.speed; let yy=r.y+sin(frameCount*r.speed*20+r.a)*9;
    fill(255,125,60,26+28*sin(r.a)); textSize(r.s); text(r.glyph,r.x,yy);
  }
}
function drawForegroundVignette(){
  noFill();
  for(let i=0;i<18;i++){ stroke(0,0,0,i*5); strokeWeight(12); rect(i*5,i*5,width-i*10,height-i*10,18); }
}

function drawArena(){
  push(); translate(width/2,height/2+105);
  noFill(); stroke(210,104,62,105); strokeWeight(2); ellipse(0,0,980,250);
  stroke(210,104,62,34);
  for(let i=0;i<8;i++) ellipse(0,0,300+i*92,80+i*25);
  for(let i=0;i<24;i++){ let a=TWO_PI*i/24; line(cos(a)*170,sin(a)*45,cos(a)*500,sin(a)*128); }
  textAlign(CENTER); textSize(18); fill(255,120,65,55); text("IGNIS  •  VERBUM  •  AETERNA",0,8);
  pop();
}

function drawPlayer(){
  push(); translate(player.x,player.y);
  let pulse=sin(frameCount*.06)*4, flicker=player.invuln>0&&frameCount%8<4;
  noStroke(); fill(40,135,255,flicker?45:70); circle(0,0,94+pulse);
  fill(58,180,255,flicker?120:255); circle(0,0,44);
  fill(210,245,255); circle(-7,-6,8);
  noFill(); stroke(120,220,255,180); strokeWeight(2); arc(0,0,70,70,-PI*.2,PI*1.25);
  pop();
}

function drawEnemies(){
  for(let e of enemies){
    push(); translate(e.x,e.y);
    let pulse=sin(frameCount*.07+e.pulse)*5, s=e.type==="boss"?1.82:1; scale(s);
    noStroke(); fill(255,60,50,e.type==="boss"?70:50); circle(0,0,96+pulse);
    fill(e.type==="boss"?[85,15,24]:[115,25,35]); rectMode(CENTER); rect(0,0,56,68,12);
    fill(245,75,55); triangle(-20,-28,0,-62-pulse*.4,20,-28);
    fill(255,180,120); circle(-11,-6,6); circle(11,-6,6);
    if(e.type==="boss"){ noFill(); stroke(255,115,55,190); strokeWeight(2); circle(0,0,91+pulse); stroke(255,190,90,80); circle(0,0,118+pulse); }
    pop();
    drawEnemyHealth(e); drawEnemyCasting(e);
  }
}

function drawEnemyHealth(e){
  let w=e.type==="boss"?300:180, h=e.type==="boss"?16:12, x=e.x-w/2, y=e.y-(e.type==="boss"?132:72), pct=max(0,e.hp/e.maxHp);
  noStroke(); fill(26,14,20,235); rect(x,y,w,h,8);
  fill(e.type==="boss"?[255,58,40]:[255,80,80]); rect(x,y,w*pct,h,8);
  fill(255,220,190); textAlign(CENTER); textSize(e.type==="boss"?21:16); text(e.name,e.x,y-14);
}

function drawEnemyCasting(e){
  if(!e.casting||!e.currentSpell) return;
  let y=e.y+(e.type==="boss"?128:58), x=e.x, progress=e.castProgress/e.castDuration;
  textAlign(CENTER); textSize(14); fill(255,185,130); text("ENEMY SENTENCE",x,y);
  let totalW=e.currentSpell.length*78;
  for(let i=0;i<e.currentSpell.length;i++){
    let sx=x-totalW/2+i*78+39, word=e.currentSpell[i], c=WORDS[word]?.color||[180,180,180];
    noStroke(); fill(c[0],c[1],c[2],235); rect(sx-33,y+10,66,30,9);
    stroke(255,220,180,95); noFill(); rect(sx-33,y+10,66,30,9);
    noStroke(); fill(20); textSize(11); text(WORDS[word]?.label||word,sx,y+30);
  }
  noStroke(); fill(255,90,50,170); rect(x-totalW/2,y+52,totalW*progress,5,3);
}

function drawProjectiles(){
  for(let p of projectiles){
    if(p.kind==="wall"){
      push(); translate(p.x,p.y);
      fill(...p.color,225); stroke(255,215,150,170); strokeWeight(2); rectMode(CENTER); rect(0,0,42,124,9);
      for(let i=-2;i<=2;i++){ line(-15,i*20,15,i*20); }
      pop();
    }else if(p.kind==="beam"){
      let alpha=map(p.life,0,40,0,190);
      noStroke(); fill(p.color[0],p.color[1],p.color[2],55); rect(p.x,p.y-p.width*1.5,p.length,p.width*3,18);
      fill(p.color[0],p.color[1],p.color[2],alpha); rect(p.x,p.y-p.width*.45,p.length,p.width*.9,12);
      fill(255,245,210,alpha); rect(p.x,p.y-p.width*.13,p.length,p.width*.26,6);
      if(p.seek){ noFill(); stroke(255,70,70,160); strokeWeight(2); ellipse(p.x+p.length-28,p.y,p.width*2.4,p.width*2.4); }
    }else if(p.kind==="pulse"){
      push(); translate(p.x,p.y); rotate(p.angle);
      noFill(); stroke(p.color[0],p.color[1],p.color[2],160); strokeWeight(3);
      ellipse(0,0,p.radius*2.8,p.radius*1.5); ellipse(0,0,p.radius*1.5,p.radius*2.8);
      fill(p.color[0],p.color[1],p.color[2],100); noStroke(); circle(0,0,p.radius*1.5);
      pop();
    }else{
      noStroke(); fill(...p.color,70); circle(p.x,p.y,p.radius*3.6);
      fill(...p.color); circle(p.x,p.y,p.radius*2);
      fill(255,240,185); circle(p.x-p.radius*.25,p.y-p.radius*.25,p.radius*.52);
      if(p.seek){ noFill(); stroke(255,70,70,170); strokeWeight(2); circle(p.x,p.y,p.radius*3); }
    }
  }
}

function drawEnemyProjectiles(){
  for(let p of enemyProjectiles){
    if(p.kind==="beam"){
      let alpha=map(p.life,0,40,0,170);
      noStroke(); fill(p.color[0],p.color[1],p.color[2],45); rect(p.x-p.length,p.y-p.width*1.5,p.length,p.width*3,18);
      fill(p.color[0],p.color[1],p.color[2],alpha); rect(p.x-p.length,p.y-p.width*.45,p.length,p.width*.9,12);
      fill(255,210,160,alpha); rect(p.x-p.length,p.y-p.width*.13,p.length,p.width*.26,6);
    }else{
      noStroke(); fill(p.color[0],p.color[1],p.color[2],70); circle(p.x,p.y,p.radius*3.3);
      fill(p.color[0],p.color[1],p.color[2]); circle(p.x,p.y,p.radius*2);
      fill(255,210,160); circle(p.x+p.radius*.25,p.y-p.radius*.25,p.radius*.45);
      if(p.seek){ noFill(); stroke(255,70,70,160); strokeWeight(2); circle(p.x,p.y,p.radius*3); }
    }
  }
}

function drawParticles(){ noStroke(); for(let p of particles){ let a=map(p.life,0,36,0,200); fill(p.col[0],p.col[1],p.col[2],a); circle(p.x,p.y,p.size); } }
function drawFloatingTexts(){ textAlign(CENTER); textSize(18); for(let f of floatingTexts){ fill(255,230,150,map(f.life,0,150,0,255)); text(f.text,f.x,f.y); } }

function drawHUD(){ drawTopBars(); drawSpellBuffer(); drawLastSpell(); drawWordLegend(); drawCounterFlash(); }

function drawCounterFlash(){
  if(counterFlash<=0) return;
  counterFlash--;
  const a = map(counterFlash,0,28,0,210);
  noStroke();
  fill(255,170,80,a*0.18);
  rect(0,0,width,height);
  textAlign(CENTER);
  textSize(28);
  fill(255,225,170,a);
  text(counterText,width/2,170);
}

function drawTopBars(){
  let x=28,y=24; textAlign(LEFT); textSize(28); fill(255,230,190); text("LOGOS",x,y+8);
  drawBar(x,y+30,220,14,player.hp/player.maxHp,[255,70,90],"HP");
  drawBar(x,y+54,220,14,player.lingua/100,[90,175,255],"LINGUA");
  fill(230,205,160); textSize(15); text("FLOW x"+nf(player.flow,1,2),x,y+94);
}
function drawBar(x,y,w,h,pct,col,label){
  noStroke(); fill(25,30,48,235); rect(x,y,w,h,8);
  fill(col[0],col[1],col[2]); rect(x,y,w*constrain(pct,0,1),h,8);
  fill(230); textSize(12); text(label,x+w+10,y+h-2);
}
function drawSpellBuffer(){
  let cx=width/2,y=height-116,panelW=620,panelH=92;
  noStroke(); fill(8,9,20,232); rect(cx-panelW/2,y-34,panelW,panelH,20);
  stroke(230,118,70,120); strokeWeight(1.5); noFill(); rect(cx-panelW/2,y-34,panelW,panelH,20);
  textAlign(CENTER); textSize(15); fill(240,178,130); text("CURRENT SENTENCE",cx,y-11);
  let slotW=108;
  for(let i=0;i<5;i++){
    let sx=cx-slotW*2+i*slotW, word=buffer[i];
    noStroke();
    if(word){ const c=WORDS[word].color; fill(c[0],c[1],c[2],235); } else fill(22,28,48,225);
    rect(sx-46,y+8,92,36,11);
    stroke(240,150,90,word?160:52); noFill(); rect(sx-46,y+8,92,36,11);
    noStroke(); fill(word?22:95); textSize(14); text(word?WORDS[word].label:"—",sx,y+31);
  }
  if(buffer.length>0){ let progress=constrain((millis()-lastInputTime)/autoCastDelay,0,1); noStroke(); fill(255,120,70,195); rect(cx-panelW/2,y+64,panelW*progress,5,3); }
}
function drawLastSpell(){
  if(!lastSpellName) return;
  let alpha=map(millis()-lastSpellTime,0,1300,255,0); if(alpha<=0) return;
  textAlign(CENTER); textSize(31); fill(255,235,170,alpha); text(lastSpellName,width/2,122);
}
function drawWordLegend(){
  const x=width-265,y=26;
  noStroke(); fill(8,9,20,190); rect(x-16,y-12,240,250,16);
  fill(245,210,170); textAlign(LEFT); textSize(15); text("WORDS",x,y+6);
  let i=0;
  for(const [id,data] of Object.entries(WORDS)){
    const rowY=y+34+i*22;
    fill(data.color[0],data.color[1],data.color[2]); rect(x,rowY-12,26,16,5);
    fill(230); textSize(13); text(`${data.key}  ${data.label}`,x+36,rowY+1); i++;
  }
}
function drawControls(){
  let x=28,y=height-70;
  noStroke(); fill(235,225,210,200); textAlign(LEFT); textSize(14);
  text("Move: Arrow Keys   |   C: Toggle Camera Input",x,y);
  text("Keyboard Words: 1 Ignis  2 Aqua  3 Ventus  4 Terra  5 Lux  6 Shot  7 Beam  8 Wall  9 Seek",x,y+24);
}
function drawTitle(){
  fill(0,0,0,125); rect(0,0,width,height);
  textAlign(CENTER); fill(255,220,170); textSize(78); text("LOGOS",width/2,height/2-95);
  textSize(22); fill(235); text("Move your hand from READY to CAST to speak.",width/2,height/2-38);
  textSize(18); fill(245,178,120); text("v0.8 Camera Integrated",width/2,height/2+4);
  textSize(20); fill(255,170+sin(frameCount*.05)*60,120); text("Press SPACE to begin",width/2,height/2+58);
}
function drawTutorial(){
  fill(0,0,0,138); rect(0,0,width,height);
  let title="",body="";
  if(tutorialPage===0){ title="1 / 3  Visual Grammar"; body="ACTION changes the shape of the spell.\\n6 Shot = orb projectile\\n7 Beam = long ray\\n8 Wall = barrier"; }
  else if(tutorialPage===1){ title="2 / 3  Modifier"; body="9 Seek adds homing behavior and a red lock ring.\\nTry: 1 + 7 + 9\\nIgnis Beam Seek"; }
  else{ title="3 / 3  First Trial"; body="Defeat the Ashlings, then face the Speaker of Flame.\\nTry 2+6 to counter fire, 4+8 to block, 5+7 against Seek."; }
  textAlign(CENTER); fill(255,220,170); textSize(36); text(title,width/2,height/2-105);
  fill(240); textSize(23); text(body,width/2,height/2-40);
  fill(255,180,120); textSize(18); text("Press SPACE",width/2,height/2+135);
}
function drawVictory(){
  fill(0,0,0,152); rect(0,0,width,height);
  textAlign(CENTER); fill(255,220,170); textSize(50); text("CHAPTER COMPLETE",width/2,height/2-122);
  textSize(24); fill(240); text("You learned the complete root:",width/2,height/2-55);
  fill(WORDS.FIRE.color); rect(width/2-76,height/2-18,152,52,15);
  fill(25); textSize(27); text("IGNIS",width/2,height/2+16);
  fill(230); textSize(18); text("Press R to return to title",width/2,height/2+100);
}
function drawGameOver(){
  fill(0,0,0,160); rect(0,0,width,height);
  textAlign(CENTER); fill(255,100,90); textSize(54); text("LANGUAGE BROKEN",width/2,height/2-40);
  fill(230); textSize(20); text("Press R to retry",width/2,height/2+35);
}

async function initCamera(){
  try{
    videoElement = document.createElement("video");
    videoElement.setAttribute("playsinline","");
    videoElement.style.display = "none";
    document.body.appendChild(videoElement);

    const stream = await navigator.mediaDevices.getUserMedia({
      video:{width:640,height:480,facingMode:"user"},
      audio:false
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision,{
      baseOptions:{
        modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate:"GPU"
      },
      runningMode:"VIDEO",
      numHands:1
    });

    cameraReady = true;
  }catch(err){
    cameraError = err.message || String(err);
    console.error(err);
  }
}

function updateCameraInput(){
  if(!cameraEnabled || !cameraReady || !handLandmarker || !videoElement) return;

  const result = handLandmarker.detectForVideo(videoElement, performance.now());
  latestLandmarks = result.landmarks && result.landmarks.length ? result.landmarks[0] : null;

  if(!latestLandmarks){
    latestGesture = "NONE";
    stableGesture = "NONE";
    latestZone = "IDLE";
    inputState = "IDLE";
    return;
  }

  latestZone = detectInputZone(latestLandmarks);
  latestGesture = analyzeGesture(latestLandmarks);
  stableGesture = getStableGesture(latestGesture);

  updateCameraStateMachine();
}

function detectInputZone(points){
  const y = points[0].y;
  if(y > 0.62) return "READY";
  if(y >= 0.28 && y <= 0.62) return "CAST";
  return "INVALID";
}

function updateCameraStateMachine(){
  if(latestZone==="IDLE" || latestZone==="INVALID"){
    inputState = "IDLE";
    return;
  }

  if(inputState==="IDLE" && latestZone==="READY"){
    inputState = "READY";
    return;
  }

  if(inputState==="RETURN_REQUIRED"){
    if(latestZone==="READY") inputState = "READY";
    return;
  }

  if(inputState==="READY" && latestZone==="CAST"){
    const now = millis();
    if(stableGesture !== "NONE" && now - lastCameraWordTime > 180){
      const word = gestureToWord(stableGesture);
      if(word){
        addWord(word);
        lastCameraWordTime = now;
        inputState = "RETURN_REQUIRED";
      }
    }
  }
}

function gestureToWord(g){
  const map = {
    THUMB_INDEX_TOUCH:"FIRE",
    THUMB_MIDDLE_TOUCH:"WATER",
    THUMB_RING_TOUCH:"WIND",
    THUMB_PINKY_TOUCH:"EARTH",
    OPEN_PALM:"LIGHT",
    INDEX_POINT:"SHOT",
    TWO_FINGER_BEAM:"BEAM",
    PALM_WALL:"WALL"
  };
  return map[g] || null;
}

function getStableGesture(g){
  gestureHistory.push(g);
  if(gestureHistory.length > 6) gestureHistory.shift();

  const counts = {};
  for(const item of gestureHistory){
    if(item==="NONE") continue;
    counts[item] = (counts[item] || 0) + 1;
  }

  let best = "NONE";
  let bestCount = 0;
  for(const k in counts){
    if(counts[k] > bestCount){
      best = k;
      bestCount = counts[k];
    }
  }

  return bestCount >= 4 ? best : "NONE";
}

function analyzeGesture(points){
  if(!points || points.length < 21) return "NONE";

  const palm = d(points[5], points[17]);
  const d48 = nd(points,4,8,palm);
  const d412 = nd(points,4,12,palm);
  const d416 = nd(points,4,16,palm);
  const d420 = nd(points,4,20,palm);
  const d812 = nd(points,8,12,palm);

  const index = fingerExtended(points,8,6);
  const middle = fingerExtended(points,12,10);
  const ring = fingerExtended(points,16,14);
  const pinky = fingerExtended(points,20,18);

  const touch = 0.35;

  if(d48 < touch) return "THUMB_INDEX_TOUCH";
  if(d412 < touch) return "THUMB_MIDDLE_TOUCH";
  if(d416 < touch) return "THUMB_RING_TOUCH";
  if(d420 < touch) return "THUMB_PINKY_TOUCH";

  if(index && middle && !ring && !pinky && d812 < 0.48) return "TWO_FINGER_BEAM";
  if(index && !middle && !ring && !pinky) return "INDEX_POINT";
  if(index && middle && ring && pinky) return "OPEN_PALM";
  if(index && middle && ring && pinky) return "PALM_WALL";

  return "NONE";
}

function d(a,b){
  const dx = a.x-b.x;
  const dy = a.y-b.y;
  return Math.sqrt(dx*dx+dy*dy);
}

function nd(points,a,b,palm){
  return d(points[a],points[b]) / Math.max(palm,0.0001);
}

function fingerExtended(points,tip,pip){
  return d(points[tip],points[0]) > d(points[pip],points[0]) * 1.12;
}

function drawCameraDebug(){
  const x = width - 265;
  const y = 300;

  noStroke();
  fill(8,9,20,205);
  rect(x-16,y-12,240,190,16);

  fill(245,210,170);
  textAlign(LEFT);
  textSize(15);
  text("CAMERA",x,y+6);

  fill(cameraEnabled ? [130,255,170] : [220,160,120]);
  textSize(13);
  text("Input: " + (cameraEnabled ? "ON" : "OFF"),x,y+34);

  fill(cameraReady ? [130,255,170] : [255,120,120]);
  text("Ready: " + cameraReady,x,y+56);

  fill(230);
  text("Zone: " + latestZone,x,y+78);
  text("Gesture: " + latestGesture,x,y+100);
  text("Stable: " + stableGesture,x,y+122);
  text("State: " + inputState,x,y+144);

  if(cameraError){
    fill(255,120,120);
    textSize(11);
    text(cameraError.substring(0,26),x,y+166);
  }

  drawHandSkeleton();
}

function drawHandSkeleton(){
  if(!latestLandmarks) return;

  const ox = width - 250;
  const oy = 505;
  const w = 210;
  const h = 150;

  noFill();
  stroke(230,130,80,80);
  rect(ox-10,oy-10,w+20,h+20,12);

  const pairs = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  stroke(120,220,255,170);
  strokeWeight(2);
  for(const [a,b] of pairs){
    const ax = ox + latestLandmarks[a].x*w;
    const ay = oy + latestLandmarks[a].y*h;
    const bx = ox + latestLandmarks[b].x*w;
    const by = oy + latestLandmarks[b].y*h;
    line(ax,ay,bx,by);
  }

  noStroke();
  fill(255,230,170);
  for(const p of latestLandmarks){
    circle(ox+p.x*w, oy+p.y*h, 5);
  }

  strokeWeight(1);
}

function burstParticles(x,y,col,count){
  for(let i=0;i<count;i++) particles.push({x,y,vx:random(-2.3,2.3),vy:random(-2.3,2.3),life:random(18,36),col,size:random(3,8)});
}
