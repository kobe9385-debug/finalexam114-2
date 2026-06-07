
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const state = {
  t:0,
  sentence:[],
  projectiles:[],
  letters:[
    {x:560,y:500,char:'S',taken:false},
    {x:720,y:510,char:'E',taken:false},
    {x:850,y:500,char:'K',taken:false}
  ],
  player:{x:390,y:455,hp:100},
  lost:{x:780,y:360,hp:100},
  boss:{x:865,y:310,hp:78},
  gesture:'Fallback Mode',
  confidence:0,
  lastGesture:'',
  cameraEnabled:false,
  letterCount:0,
  bossCast:3.0
};

function loop(){
  state.t++;
  update();
  draw();
  requestAnimationFrame(loop);
}

function update(){
  for (const p of state.projectiles){ p.x += p.vx; p.y += p.vy; p.life--; }
  state.projectiles = state.projectiles.filter(p=>p.life>0 && p.x<1300);

  for (const p of state.projectiles){
    const dx = p.x - state.lost.x, dy = p.y - state.lost.y;
    if (!p.hit && Math.hypot(dx,dy) < 80) {
      p.hit = true;
      state.lost.hp = Math.max(0, state.lost.hp - 18);
    }
  }

  state.bossCast -= 1/60;
  if (state.bossCast <= 0) state.bossCast = 3.0;
  document.getElementById('bossTimer').textContent = `Cast in ${state.bossCast.toFixed(1)}s`;
}

function draw(){
  ctx.clearRect(0,0,1280,720);
  drawLibrary();
  drawBoss();
  drawLostPage();
  drawWordCore();
  drawProjectiles();
  drawLetters();
}

function drawLibrary(){
  const g = ctx.createLinearGradient(0,0,1280,720);
  g.addColorStop(0,'#050407');
  g.addColorStop(.45,'#15100d');
  g.addColorStop(1,'#050407');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,1280,720);

  // shelves
  for (let x=250; x<1250; x+=95){
    ctx.fillStyle = 'rgba(36,24,18,.55)';
    ctx.fillRect(x,0,58,720);
    for(let y=25;y<700;y+=55){
      ctx.fillStyle = 'rgba(95,60,34,.45)';
      ctx.fillRect(x+6,y,46,25);
    }
  }

  // rune floor
  ctx.save();
  ctx.translate(640,520);
  ctx.strokeStyle='rgba(215,155,75,.23)';
  ctx.lineWidth=2;
  for(const r of [90,170,270,390]){
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  }
  for(let i=0;i<48;i++){
    const a=Math.PI*2*i/48;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*70,Math.sin(a)*70);
    ctx.lineTo(Math.cos(a)*405,Math.sin(a)*405);
    ctx.stroke();
  }
  ctx.restore();

  // candles / particles
  ctx.fillStyle='rgba(255,170,70,.35)';
  for(let i=0;i<80;i++){
    const x=(i*73+state.t*.2)%1280;
    const y=(i*47+Math.sin(state.t*.01+i)*16)%720;
    ctx.fillRect(x,y,2,2);
  }
}

function drawWordCore(){
  const x=state.player.x, y=state.player.y + Math.sin(state.t*.04)*7;
  const pulse = 1 + Math.sin(state.t*.08)*0.04;

  ctx.save();
  ctx.translate(x,y);

  // glow
  let rg=ctx.createRadialGradient(0,0,20,0,0,120);
  rg.addColorStop(0,'rgba(255,210,120,.35)');
  rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(0,0,120,0,Math.PI*2); ctx.fill();

  // rings
  for(const [r,spd,col] of [[82,.018,'rgba(230,170,80,.85)'],[60,-.026,'rgba(230,170,80,.65)'],[40,.04,'rgba(130,220,255,.5)']]){
    ctx.save();
    ctx.rotate(state.t*spd);
    ctx.strokeStyle=col; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,r,0.2,5.4); ctx.stroke();
    for(let i=0;i<8;i++){
      const a=Math.PI*2*i/8;
      ctx.fillStyle='rgba(230,170,80,.75)';
      ctx.fillRect(Math.cos(a)*r-4,Math.sin(a)*r-4,8,8);
    }
    ctx.restore();
  }

  // body
  ctx.fillStyle='#09090d';
  ctx.strokeStyle='rgba(230,170,80,.9)';
  ctx.lineWidth=4;
  ctx.beginPath(); ctx.arc(0,0,42*pulse,0,Math.PI*2); ctx.fill(); ctx.stroke();

  // cracks
  ctx.strokeStyle='rgba(255,180,90,.55)';
  ctx.lineWidth=1;
  for(let i=0;i<8;i++){
    const a=Math.PI*2*i/8 + .3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*10,Math.sin(a)*10);
    ctx.lineTo(Math.cos(a)*38,Math.sin(a)*38);
    ctx.stroke();
  }

  // eye
  ctx.fillStyle='rgba(80,220,255,.85)';
  ctx.beginPath(); ctx.arc(0,0,14+Math.sin(state.t*.09)*2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();

  ctx.restore();
}

function drawLostPage(){
  const x=state.lost.x, y=state.lost.y + Math.sin(state.t*.04)*5;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(Math.sin(state.t*.025)*.08);

  let rg=ctx.createRadialGradient(0,0,10,0,0,90);
  rg.addColorStop(0,'rgba(130,60,210,.35)');
  rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(0,0,90,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='rgba(210,188,138,.95)';
  ctx.strokeStyle='rgba(65,40,25,.95)';
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(-45,-70); ctx.lineTo(48,-52); ctx.lineTo(35,70); ctx.lineTo(-58,52); ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.fillStyle='rgba(15,10,8,.85)';
  ctx.beginPath(); ctx.arc(0,0,21,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,130,45,.9)';
  ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();

  ctx.strokeStyle='rgba(45,30,22,.6)';
  for(let i=0;i<7;i++){
    ctx.beginPath();
    ctx.moveTo(-28,-36+i*12);
    ctx.lineTo(28+Math.sin(i)*12,-35+i*12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoss(){
  const x=state.boss.x, y=state.boss.y + Math.sin(state.t*.02)*4;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(Math.sin(state.t*.012)*.025);

  let rg=ctx.createRadialGradient(0,0,20,0,0,170);
  rg.addColorStop(0,'rgba(255,90,25,.32)');
  rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(0,0,170,0,Math.PI*2); ctx.fill();

  ctx.fillStyle='rgba(52,28,18,.95)';
  ctx.strokeStyle='rgba(255,115,45,.85)';
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(-75,-110); ctx.lineTo(95,-80); ctx.lineTo(65,125); ctx.lineTo(-100,85); ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.fillStyle='rgba(210,180,130,.85)';
  ctx.beginPath();
  ctx.moveTo(-45,-75); ctx.lineTo(60,-58); ctx.lineTo(45,78); ctx.lineTo(-62,62); ctx.closePath();
  ctx.fill();

  ctx.strokeStyle='rgba(45,30,20,.7)';
  for(let i=0;i<8;i++){
    ctx.beginPath();
    ctx.moveTo(-28,-38+i*16);
    ctx.lineTo(32+Math.sin(i)*12,-36+i*16);
    ctx.stroke();
  }

  ctx.strokeStyle='rgba(255,180,75,.85)';
  ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(0,10,34,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-42,10); ctx.lineTo(42,10); ctx.moveTo(0,-34); ctx.lineTo(0,52); ctx.stroke();
  ctx.fillStyle='rgba(255,120,35,.95)';
  ctx.beginPath(); ctx.arc(0,10,10,0,Math.PI*2); ctx.fill();
  ctx.restore();

  document.getElementById('bossHp').style.width = `${state.boss.hp}%`;
}

function drawProjectiles(){
  for (const p of state.projectiles){
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(-0.1);
    ctx.font='bold 42px Georgia';
    ctx.fillStyle='rgba(255,225,130,.95)';
    ctx.shadowColor='rgba(255,100,25,.9)';
    ctx.shadowBlur=20;
    ctx.fillText('IGNIS',-65,10);
    ctx.restore();

    let g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,95);
    g.addColorStop(0,'rgba(255,120,35,.4)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,95,0,Math.PI*2); ctx.fill();
  }
}

function drawLetters(){
  ctx.font='42px Georgia';
  for (const l of state.letters){
    if (l.taken) continue;
    const y = l.y + Math.sin(state.t*.04 + l.x)*9;
    ctx.fillStyle='rgba(130,230,255,.25)';
    ctx.beginPath(); ctx.arc(l.x,y,28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(220,245,255,.95)';
    ctx.fillText(l.char,l.x-13,y+14);
  }
}

function addWord(word){
  if (state.sentence.length >= 5) return;
  state.sentence.push(word);
  renderSentence();
}

function renderSentence(){
  const slots = document.querySelectorAll('#slots button');
  slots.forEach((s,i)=>{
    s.textContent = state.sentence[i] || '';
    s.classList.toggle('filled', !!state.sentence[i]);
  });
  document.getElementById('sentenceResult').textContent =
    state.sentence.length ? state.sentence.join(' ') : 'Select words, then use gesture or Space.';
}

function compileSentence(){
  if (!state.sentence.length) return;
  const sentence = state.sentence.join(' ');
  if (sentence.includes('Ignis') && sentence.includes('Shot')) {
    state.projectiles.push({x:state.player.x+72,y:state.player.y-8,vx:7.8,vy:-1.1,life:145,hit:false});
    document.getElementById('sentenceResult').textContent = sentence + ' cast.';
  } else {
    document.getElementById('sentenceResult').textContent = 'Broken sentence.';
  }
  state.sentence = [];
  setTimeout(renderSentence,250);
}

document.querySelectorAll('.lexicon button').forEach(btn=>btn.onclick=()=>addWord(btn.dataset.word));
document.getElementById('compileBtn').onclick=compileSentence;

window.addEventListener('keydown', e=>{
  if(e.key==='1') addWord('Ignis');
  if(e.key==='2') addWord('Shot');
  if(e.key==='3') addWord('Seek');
  if(e.code==='Space') compileSentence();
  if(e.key.toLowerCase()==='c') initCamera();
});

// Camera / MediaPipe Hands
const video = document.getElementById('webcam');
const handCanvas = document.getElementById('handCanvas');
const hctx = handCanvas.getContext('2d');

function setGesture(name, conf){
  state.gesture = name;
  state.confidence = conf;
  document.getElementById('gestureName').textContent = name;
  document.getElementById('gestureConfidence').style.width = Math.round(conf*100)+'%';

  if (name === 'Open Palm' && conf > 0.75 && state.lastGesture !== 'Open Palm') {
    document.getElementById('gestureHint').textContent = 'Compile gesture detected.';
    compileSentence();
  } else if (name === 'Point' && conf > 0.75) {
    document.getElementById('gestureHint').textContent = 'Seek lock active.';
  } else if (name === 'Fist' && conf > 0.75) {
    document.getElementById('gestureHint').textContent = 'Preparing compile chain.';
  }
  state.lastGesture = name;
}

function classifyHand(lm){
  const tips=[8,12,16,20], pips=[6,10,14,18];
  let open=0;
  for(let i=0;i<tips.length;i++) if(lm[tips[i]].y < lm[pips[i]].y) open++;
  const indexOpen = lm[8].y < lm[6].y;
  const othersClosed = lm[12].y > lm[10].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y;
  if(open>=4) return ['Open Palm',.95];
  if(indexOpen && othersClosed) return ['Point',.9];
  if(open<=1) return ['Fist',.88];
  return ['Unknown',.45];
}

async function initCamera(){
  if(state.cameraEnabled) return;
  state.cameraEnabled = true;
  document.getElementById('camStatus').textContent = 'Loading hand tracker...';

  if(!window.Hands || !window.Camera){
    document.getElementById('camStatus').textContent = 'MediaPipe failed. Keyboard fallback active.';
    return;
  }

  const hands = new Hands({locateFile:file=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
  hands.setOptions({maxNumHands:1,modelComplexity:1,minDetectionConfidence:.65,minTrackingConfidence:.65});
  hands.onResults(results=>{
    hctx.clearRect(0,0,handCanvas.width,handCanvas.height);
    hctx.drawImage(results.image,0,0,handCanvas.width,handCanvas.height);
    if(results.multiHandLandmarks && results.multiHandLandmarks.length){
      const lm = results.multiHandLandmarks[0];
      drawConnectors(hctx,lm,HAND_CONNECTIONS,{color:'#d6a252',lineWidth:2});
      drawLandmarks(hctx,lm,{color:'#ffffff',lineWidth:1,radius:2});
      const [name,conf]=classifyHand(lm);
      setGesture(name,conf);
      document.getElementById('camStatus').textContent = 'Camera ready.';
    }else{
      setGesture('No Hand',.15);
      document.getElementById('camStatus').textContent = 'No hand detected.';
    }
  });

  const camera = new Camera(video,{onFrame:async()=>{await hands.send({image:video});},width:320,height:240});
  camera.start();
  document.getElementById('camStatus').textContent = 'Requesting camera permission...';
}

renderSentence();
loop();
