
let assets = {};
let gameState = "TITLE";
let player, enemies = [], projectiles = [], enemyProjectiles = [], particles = [];
let buffer = [], lastInputTime = 0, autoCastDelay = 430;
let battleStartTime = 0, bossSpawned = false, tutorialPage = 0;
let lastSpellName = "", lastSpellTime = 0;

const WORDS = {
  FIRE:{key:"1", label:"Ignis", type:"ROOT", color:[255,105,48], icon:"assets/Icons/Root/icon_ignis.png"},
  WATER:{key:"2", label:"Aqua", type:"ROOT", color:[70,170,255], icon:"assets/Icons/Root/icon_aqua.png"},
  WIND:{key:"3", label:"Ventus", type:"ROOT", color:[95,242,179], icon:"assets/Icons/Root/icon_ventus.png"},
  EARTH:{key:"4", label:"Terra", type:"ROOT", color:[208,168,106], icon:"assets/Icons/Root/icon_terra.png"},
  SHOT:{key:"5", label:"Shot", type:"ACTION", color:[220,220,255], icon:"assets/Icons/Action/icon_shot.png"},
  BEAM:{key:"6", label:"Beam", type:"ACTION", color:[255,245,180], icon:"assets/Icons/Action/icon_beam.png"},
  WALL:{key:"7", label:"Wall", type:"ACTION", color:[190,160,115], icon:"assets/Icons/Action/icon_wall.png"},
  SEEK:{key:"8", label:"Seek", type:"MODIFIER", color:[255,90,90], icon:"assets/Icons/Modifier/icon_seek.png"},
  SPLIT:{key:"9", label:"Split", type:"MODIFIER", color:[255,120,50], icon:"assets/Icons/Modifier/icon_split.png"},
};
const KEY_TO_WORD = {"1":"FIRE","2":"WATER","3":"WIND","4":"EARTH","5":"SHOT","6":"BEAM","7":"WALL","8":"SEEK","9":"SPLIT"};

function preload(){
  const paths = {
    floor:"assets/Environment/Floor/arena_floor.png",
    bossFloor:"assets/Environment/Floor/boss_floor.png",
    bookshelf:"assets/Environment/Props/bookshelf_a.png",
    candle:"assets/Environment/Props/candle_a.png",
    pillar:"assets/Environment/Props/rune_pillar.png",
    page:"assets/Environment/Props/floating_page.png",
    wordcore:"assets/Characters/Player/WordCore/wordcore_idle_sheet.png",
    lostpage:"assets/Characters/Enemies/LostPage/lostpage_idle.png",
    inkwisp:"assets/Characters/Enemies/InkWisp/inkwisp_idle.png",
    boss:"assets/Characters/Boss/BurningManuscript/boss_idle.png",
    panelLexicon:"assets/UI/Panels/panel_lexicon.png",
    panelBoss:"assets/UI/Panels/panel_enemysentence.png",
    slotEmpty:"assets/UI/Slots/sentence_slot_empty.png",
    slotFilled:"assets/UI/Slots/sentence_slot_filled.png",
    compile:"assets/UI/Buttons/compile_idle.png",
    lingua:"assets/UI/Bars/bar_lingua.png",
    vital:"assets/UI/Bars/bar_vital.png",
    stability:"assets/UI/Bars/bar_stability.png",
    ignis:"assets/VFX/Root/ignis_projectile.png",
    aqua:"assets/VFX/Root/aqua_projectile.png",
    ventus:"assets/VFX/Root/ventus_projectile.png",
    terraWall:"assets/VFX/Action/wall_idle.png",
    beam:"assets/VFX/Action/beam_core.png",
    seek:"assets/VFX/Modifier/seek_lock.png",
    split:"assets/VFX/Modifier/split_effect.png",
  };
  for (const [k,p] of Object.entries(paths)) assets[k] = loadImage(p);
  for (const [id,w] of Object.entries(WORDS)) assets["icon_"+id] = loadImage(w.icon);
}

function setup(){
  createCanvas(1280,720);
  textFont("Georgia");
  resetGame();
}

function resetGame(){
  player={x:240,y:400,hp:100,maxHp:100,lingua:100,stability:90,flow:1,speed:4,invuln:0,frame:0};
  enemies=[]; projectiles=[]; enemyProjectiles=[]; particles=[]; buffer=[]; bossSpawned=false; lastSpellName="";
}

function draw(){
  drawScene();
  if(gameState==="TITLE"){ drawTitle(); return; }
  if(gameState==="TUTORIAL"){ drawTutorial(); return; }
  if(gameState==="BATTLE" || gameState==="BOSS"){ handleMovement(); handleAutoCast(); updateCombat(); drawCombat(); drawHUD(); return; }
  if(gameState==="VICTORY"){ drawCombat(); drawHUD(); drawVictory(); return; }
  if(gameState==="GAMEOVER"){ drawCombat(); drawGameOver(); return; }
}

function keyPressed(){
  if(gameState==="TITLE" && key===" "){ gameState="TUTORIAL"; return; }
  if(gameState==="TUTORIAL" && key===" "){ tutorialPage++; if(tutorialPage>2) startBattle(); return; }
  if((gameState==="VICTORY"||gameState==="GAMEOVER") && (key==="r"||key==="R")){ resetGame(); gameState="TITLE"; tutorialPage=0; return; }
  if(gameState!=="BATTLE" && gameState!=="BOSS") return;
  const w=KEY_TO_WORD[key]; if(w) addWord(w);
}

function startBattle(){
  gameState="BATTLE"; battleStartTime=millis();
  enemies.push(createEnemy(930,320,"Lost Page",70,"lostpage"));
  enemies.push(createEnemy(1030,455,"Ink Wisp",95,"inkwisp"));
}
function spawnBoss(){
  gameState="BOSS"; bossSpawned=true; enemies=[];
  enemies.push(createEnemy(930,350,"The Burning Manuscript",360,"boss"));
}
function createEnemy(x,y,name,hp,type){
  return {x,y,name,hp,maxHp:hp,type,castTimer:random(70,140),casting:false,castProgress:0,castDuration:type==="boss"?120:85,currentSpell:null};
}

function addWord(w){ if(buffer.length>=5)return; buffer.push(w); lastInputTime=millis(); }
function handleAutoCast(){ if(buffer.length && (millis()-lastInputTime>autoCastDelay || buffer.length>=5)){ castSpell(buffer); buffer=[]; } }

function resolveSpell(words){
  const root=words.find(w=>WORDS[w]?.type==="ROOT");
  const action=words.find(w=>WORDS[w]?.type==="ACTION");
  const mods=words.filter(w=>WORDS[w]?.type==="MODIFIER");
  if(words.join(",")==="FIRE,WATER") return {name:"Steam",root:"WATER",action:"CLOUD",kind:"cloud",damage:18,color:[180,220,230],radius:70,speed:0,life:150,mods};
  let kind="pulse"; if(action==="SHOT")kind="shot"; if(action==="BEAM")kind="beam"; if(action==="WALL")kind="wall";
  let color=root?WORDS[root].color:[160,160,180], damage=root?14:4, speed=7, radius=16, life=250;
  if(action==="SHOT"){damage+=10; speed=9;}
  if(action==="BEAM"){damage+=16; speed=0; radius=18; life=35;}
  if(action==="WALL"){damage=0; speed=0; radius=45; life=180;}
  if(mods.includes("SEEK")){damage+=6; speed=max(4,speed-1);}
  if(mods.includes("SPLIT")){damage=floor(damage*.55);}
  let name=(root?WORDS[root].label:"Broken")+" "+(action?WORDS[action].label:"Pulse");
  if(mods.includes("SEEK")) name="Seeking "+name;
  if(mods.includes("SPLIT")) name="Split "+name;
  return {name,root,action,mods,kind,damage,speed,radius,life,color};
}
function castSpell(words){
  const sp=resolveSpell(words); lastSpellName=sp.name; lastSpellTime=millis();
  player.lingua=max(0,player.lingua-words.length*4);
  if(sp.mods && sp.mods.includes("SPLIT")){
    for(let i=-1;i<=1;i++) spawnPlayerSpell(sp, i*0.18);
  }else spawnPlayerSpell(sp,0);
}
function spawnPlayerSpell(sp, angleOffset){
  if(sp.kind==="wall") projectiles.push({...sp,x:player.x+110,y:player.y,owner:"player"});
  else if(sp.kind==="beam") projectiles.push({...sp,x:player.x+35,y:player.y,owner:"player",length:620,hitSet:new Set()});
  else if(sp.kind==="cloud") projectiles.push({...sp,x:player.x+180,y:player.y,owner:"player"});
  else projectiles.push({...sp,x:player.x+35,y:player.y,vx:sp.speed,vy:sin(angleOffset)*4,owner:"player"});
}

function handleMovement(){
  let dx=0,dy=0; if(keyIsDown(LEFT_ARROW))dx--; if(keyIsDown(RIGHT_ARROW))dx++; if(keyIsDown(UP_ARROW))dy--; if(keyIsDown(DOWN_ARROW))dy++;
  if(dx||dy){let l=sqrt(dx*dx+dy*dy);dx/=l;dy/=l;}
  player.x=constrain(player.x+dx*player.speed,120,620); player.y=constrain(player.y+dy*player.speed,170,560);
}

function updateCombat(){
  for(let e of enemies){
    e.castTimer--;
    if(!e.casting && e.castTimer<=0){ e.casting=true; e.castProgress=0; e.currentSpell=chooseEnemySpell(e); }
    if(e.casting){ e.castProgress++; if(e.castProgress>=e.castDuration){ enemyCast(e); e.casting=false; e.castTimer=random(90,160); } }
  }
  updateProjectiles(projectiles, enemies, false);
  updateProjectiles(enemyProjectiles, [player], true);
  enemies=enemies.filter(e=>e.hp>0);
  if(gameState==="BATTLE" && enemies.length===0 && !bossSpawned) spawnBoss();
  if(gameState==="BOSS" && enemies.length===0) gameState="VICTORY";
  if(player.hp<=0) gameState="GAMEOVER";
  if(player.invuln>0)player.invuln--;
}
function chooseEnemySpell(e){
  if(e.type==="boss") return random([["FIRE","SHOT"],["FIRE","BEAM","SEEK"],["FIRE","SHOT","SPLIT"]]);
  if(e.type==="inkwisp") return ["FIRE","SHOT","SEEK"];
  return ["FIRE","SHOT"];
}
function enemyCast(e){
  const sp=resolveSpell(e.currentSpell); 
  if(sp.kind==="beam") enemyProjectiles.push({...sp,x:e.x-20,y:e.y,owner:"enemy",length:560,life:40});
  else enemyProjectiles.push({...sp,x:e.x-20,y:e.y,vx:-max(5,sp.speed*.7),vy:0,owner:"enemy",life:260});
}
function updateProjectiles(arr, targets, enemyOwned){
  for(let p of arr){
    p.life--;
    if(p.kind==="beam"){
      for(let t of targets){
        const hit = enemyOwned ? (t.x < p.x && t.x > p.x-p.length && abs(t.y-p.y)<p.radius+25) : (t.x > p.x && t.x < p.x+p.length && abs(t.y-p.y)<p.radius+45);
        if(hit && !p.hit){
          damageTarget(t,p.damage); p.hit=true;
        }
      }
    } else if(p.kind==="wall") {
      for(let ep of enemyProjectiles){ if(dist(p.x,p.y,ep.x,ep.y)<p.radius+ep.radius){ ep.life=0; } }
    } else if(p.kind==="cloud") {
      for(let t of targets){ if(dist(p.x,p.y,t.x,t.y)<p.radius+35 && frameCount%20===0) damageTarget(t,3); }
    } else {
      if(p.mods&&p.mods.includes("SEEK")&&targets.length){ let t=targets[0]; p.y += constrain((t.y-p.y)*.025,-2,2); }
      p.x+=p.vx; p.y+=p.vy||0;
      for(let t of targets){ if(dist(p.x,p.y,t.x,t.y)<p.radius+28){ damageTarget(t,p.damage); p.life=0; } }
    }
  }
  for(let i=arr.length-1;i>=0;i--) if(arr[i].life<=0 || arr[i].x<-100 || arr[i].x>1400) arr.splice(i,1);
}
function damageTarget(t,dmg){ if(t===player){ if(player.invuln>0)return; player.hp-=dmg; player.invuln=35; } else t.hp-=dmg; }

function drawScene(){
  background(8,5,10);
  imageMode(CENTER);
  tint(255,160); image(gameState==="BOSS"?assets.bossFloor:assets.floor,width/2,380,900,900); noTint();
  for(let x of [80,1180]) image(assets.bookshelf,x,340,150,300);
  image(assets.pillar,90,365,90,280); image(assets.pillar,1190,365,90,280);
  for(let i=0;i<5;i++) image(assets.candle,120+i*220,610,60,60);
}
function drawCombat(){
  imageMode(CENTER);
  drawPlayer();
  for(const e of enemies) drawEnemy(e);
  drawSpellObjects(projectiles,false); drawSpellObjects(enemyProjectiles,true);
}
function drawPlayer(){
  const fw=256, f=floor(frameCount/8)%8;
  image(assets.wordcore,player.x,player.y,130,130,f*fw,0,fw,fw);
}
function drawEnemy(e){
  if(e.type==="boss"){ const fw=512, f=floor(frameCount/7)%8; image(assets.boss,e.x,e.y,290,290,f*fw,0,fw,fw); }
  else if(e.type==="inkwisp"){ const fw=256, f=floor(frameCount/7)%6; image(assets.inkwisp,e.x,e.y,110,110,f*fw,0,fw,fw); }
  else { const fw=192, f=floor(frameCount/8)%4; image(assets.lostpage,e.x,e.y,90,90,f*fw,0,fw,fw); }
  drawEnemyUI(e);
}
function drawEnemyUI(e){
  fill(20,10,10,210); noStroke(); rect(e.x-80,e.y-85,160,12,6); fill(255,70,45); rect(e.x-80,e.y-85,160*(e.hp/e.maxHp),12,6);
  fill(255,220,180); textAlign(CENTER); textSize(14); text(e.name,e.x,e.y-95);
  if(e.casting && e.currentSpell){
    for(let i=0;i<e.currentSpell.length;i++){
      const w=e.currentSpell[i], c=WORDS[w].color;
      fill(c); rect(e.x-70+i*48,e.y+70,42,24,6); fill(20); textSize(10); text(WORDS[w].label,e.x-49+i*48,e.y+86);
    }
  }
}
function drawSpellObjects(arr, enemy){
  imageMode(CENTER);
  for(const p of arr){
    const a = p.root==="WATER"?assets.aqua:p.root==="WIND"?assets.ventus:p.root==="EARTH"?assets.terraWall:assets.ignis;
    if(p.kind==="beam") image(assets.beam, enemy?p.x-250:p.x+250,p.y,520,80);
    else if(p.kind==="wall") image(assets.terraWall,p.x,p.y,130,130);
    else if(p.kind==="cloud"){ fill(180,220,230,80); noStroke(); ellipse(p.x,p.y,p.radius*2.2,p.radius*1.5); }
    else image(a,p.x,p.y,p.radius*3,p.radius*3);
    if(p.mods&&p.mods.includes("SEEK")) image(assets.seek,p.x,p.y,p.radius*4,p.radius*4);
  }
}

function drawHUD(){
  imageMode(CORNER);
  image(assets.panelLexicon,18,135,245,420);
  fill(240,210,160); textSize(18); textAlign(LEFT); text("LEXICON",45,165);
  let y=200; for(const id of Object.keys(WORDS)){ image(assets["icon_"+id],45,y-18,26,26); fill(230); textSize(14); text(`${WORDS[id].key}  ${WORDS[id].label}`,78,y); y+=30; }
  image(assets.lingua,20,25,230,36); image(assets.vital,20,65,230,36); image(assets.stability,20,105,230,36);
  drawSentenceBar();
  drawLastSpell();
  fill(230); textSize(14); textAlign(LEFT); text("Move: Arrow Keys | SPACE Start | R Retry",20,695);
}
function drawSentenceBar(){
  const cx=width/2, y=615;
  fill(8,8,12,230); stroke(180,120,65); rect(cx-360,y-55,720,95,16);
  textAlign(CENTER); textSize(16); fill(240,190,120); text("SENTENCE BAR",cx,y-30);
  for(let i=0;i<5;i++){
    const x=cx-260+i*110, w=buffer[i];
    image(w?assets.slotFilled:assets.slotEmpty,x-50,y-10,100,44);
    if(w){ fill(WORDS[w].color); textSize(18); text(WORDS[w].label,x,y+18); }
  }
}
function drawLastSpell(){ if(!lastSpellName)return; let a=map(millis()-lastSpellTime,0,1200,255,0); if(a<=0)return; fill(255,230,160,a); textAlign(CENTER); textSize(28); text(lastSpellName,width/2,125); }

function drawTitle(){ fill(0,0,0,160); rect(0,0,width,height); textAlign(CENTER); fill(255,220,160); textSize(76); text("LOGOS",width/2,260); textSize(22); text("Chapter 1 Integrated Asset Build",width/2,310); textSize(20); text("Press SPACE",width/2,380); }
function drawTutorial(){ fill(0,0,0,160); rect(0,0,width,height); textAlign(CENTER); fill(255,220,160); textSize(36); text("The Lost Library",width/2,230); fill(240); textSize(22); text("1 Ignis  2 Aqua  3 Ventus  4 Terra\\n5 Shot  6 Beam  7 Wall  8 Seek  9 Split\\nUse sentences to attack, defend, and discover hidden spells.",width/2,300); fill(255,180,120); text("Press SPACE",width/2,430); }
function drawVictory(){ fill(0,0,0,170); rect(0,0,width,height); textAlign(CENTER); fill(255,220,160); textSize(48); text("CHAPTER COMPLETE",width/2,280); textSize(20); text("You learned Ignis.",width/2,335); text("Press R",width/2,390); }
function drawGameOver(){ fill(0,0,0,180); rect(0,0,width,height); textAlign(CENTER); fill(255,90,70); textSize(52); text("LANGUAGE BROKEN",width/2,320); fill(240); textSize(20); text("Press R",width/2,380); }
