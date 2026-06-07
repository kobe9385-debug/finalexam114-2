
let buffer = [];
let lastInputTime = 0;
let autoCastDelay = 360;

let player;
let enemies = [];
let projectiles = [];
let particles = [];
let floatingTexts = [];

let lastSpellName = "";
let lastSpellTime = 0;

const WORD_LABEL = {
  FIRE: "Ignis",
  WATER: "Aqua",
  WIND: "Ventus",
  EARTH: "Terra",
  LIGHT: "Lux",
  SHOT: "Shot",
  BEAM: "Beam",
  WALL: "Wall"
};

function setup() {
  createCanvas(1280, 720);
  textFont("Georgia");

  player = {
    x: 180,
    y: height / 2 + 20,
    hp: 100,
    lingua: 100,
    flow: 1
  };

  enemies.push(createEnemy(980, height / 2, "Ashling", 100));
}

function draw() {
  drawBackground();
  handleAutoCast();
  updateWorld();

  drawArena();
  drawPlayer();
  drawEnemies();
  drawProjectiles();
  drawParticles();
  drawFloatingTexts();

  drawHUD();
  drawControls();
}

function createEnemy(x, y, name, hp) {
  return {
    x,
    y,
    name,
    hp,
    maxHp: hp,
    pulse: random(1000)
  };
}

function keyPressed() {
  let word = null;

  if (key === "1") word = "FIRE";
  if (key === "2") word = "WATER";
  if (key === "3") word = "WIND";
  if (key === "4") word = "EARTH";
  if (key === "5") word = "LIGHT";

  if (key === "q" || key === "Q") word = "SHOT";
  if (key === "w" || key === "W") word = "BEAM";
  if (key === "e" || key === "E") word = "WALL";

  if (word) {
    addWord(word);
  }
}

function addWord(word) {
  if (buffer.length >= 4) return;

  buffer.push(word);
  lastInputTime = millis();

  burstParticles(player.x + 34 + buffer.length * 12, player.y - 70, colorForWord(word), 10);
}

function handleAutoCast() {
  if (buffer.length === 0) return;

  if (millis() - lastInputTime > autoCastDelay || buffer.length >= 4) {
    castSpell(buffer);
    buffer = [];
  }
}

function resolveSpell(words) {
  const key = words.join(",");

  const spells = {
    "FIRE": {
      name: "Spark",
      damage: 6,
      speed: 7,
      radius: 10,
      color: [255, 168, 48],
      trail: [255, 72, 24]
    },
    "FIRE,SHOT": {
      name: "Fireball",
      damage: 18,
      speed: 9,
      radius: 18,
      color: [255, 120, 30],
      trail: [255, 45, 18]
    },
    "FIRE,WIND": {
      name: "Ignis Ventus",
      damage: 28,
      speed: 8,
      radius: 26,
      color: [255, 88, 24],
      trail: [255, 200, 50]
    },
    "FIRE,FIRE,SHOT": {
      name: "Twin Flame Shot",
      damage: 38,
      speed: 11,
      radius: 15,
      color: [255, 205, 80],
      trail: [255, 90, 20]
    },
    "WATER,SHOT": {
      name: "Aqua Shot",
      damage: 15,
      speed: 9,
      radius: 16,
      color: [80, 185, 255],
      trail: [120, 230, 255]
    },
    "WIND,SHOT": {
      name: "Wind Dart",
      damage: 12,
      speed: 12,
      radius: 14,
      color: [180, 255, 220],
      trail: [120, 255, 190]
    },
    "LIGHT,BEAM": {
      name: "Lux Beam",
      damage: 24,
      speed: 13,
      radius: 12,
      color: [255, 255, 190],
      trail: [255, 245, 120]
    },
    "EARTH,WALL": {
      name: "Stone Wall",
      damage: 0,
      speed: 0,
      radius: 34,
      color: [150, 120, 80],
      trail: [210, 170, 110],
      wall: true
    }
  };

  return spells[key] || {
    name: "Broken Word",
    damage: 4,
    speed: 6,
    radius: 9,
    color: [160, 160, 180],
    trail: [90, 90, 110]
  };
}

function castSpell(words) {
  const spell = resolveSpell(words);
  lastSpellName = spell.name;
  lastSpellTime = millis();

  player.lingua = max(0, player.lingua - max(2, words.length * 3));
  player.flow = min(5, player.flow + 0.15);

  if (spell.wall) {
    projectiles.push({
      x: player.x + 145,
      y: player.y,
      vx: 0,
      damage: 0,
      radius: spell.radius,
      color: spell.color,
      trail: spell.trail,
      wall: true,
      life: 160
    });
    floatingTexts.push({ text: spell.name, x: player.x + 110, y: player.y - 80, life: 90 });
    return;
  }

  projectiles.push({
    x: player.x + 38,
    y: player.y,
    vx: spell.speed,
    damage: spell.damage,
    radius: spell.radius,
    color: spell.color,
    trail: spell.trail,
    wall: false,
    life: 300
  });

  burstParticles(player.x + 50, player.y, spell.color, 24);
  floatingTexts.push({ text: spell.name, x: player.x + 80, y: player.y - 80, life: 90 });
}

function updateWorld() {
  for (let p of projectiles) {
    p.x += p.vx;
    p.life--;

    if (!p.wall) {
      particles.push({
        x: p.x - random(4, 14),
        y: p.y + random(-6, 6),
        vx: random(-0.4, 0.2),
        vy: random(-0.4, 0.4),
        life: 28,
        col: p.trail,
        size: random(3, 7)
      });
    }

    for (let e of enemies) {
      if (dist(p.x, p.y, e.x, e.y) < p.radius + 28 && !p.hit && !p.wall) {
        e.hp -= p.damage;
        p.hit = true;
        p.life = 0;
        burstParticles(e.x, e.y, p.color, 36);
        floatingTexts.push({ text: "-" + p.damage, x: e.x, y: e.y - 50, life: 70 });
      }
    }
  }

  projectiles = projectiles.filter(p => p.life > 0 && p.x < width + 100 && !p.hit);
  enemies = enemies.filter(e => e.hp > 0);

  for (let pt of particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
  }
  particles = particles.filter(pt => pt.life > 0);

  for (let ft of floatingTexts) {
    ft.y -= 0.55;
    ft.life--;
  }
  floatingTexts = floatingTexts.filter(ft => ft.life > 0);

  player.lingua = min(100, player.lingua + 0.025);
  player.flow = max(1, player.flow - 0.0015);
}

function drawBackground() {
  background(5, 7, 19);

  noStroke();

  for (let i = 0; i < 16; i++) {
    let x = (i * 97 + frameCount * 0.12) % width;
    let y = 80 + noise(i * 2.4) * 540;
    fill(70, 90, 150, 26);
    circle(x, y, 2 + noise(i) * 3);
  }

  for (let r = 0; r < 8; r++) {
    let alpha = map(r, 0, 7, 35, 2);
    fill(40, 55, 100, alpha);
    ellipse(width / 2, height / 2 + 30, 1100 + r * 70, 430 + r * 35);
  }
}

function drawArena() {
  push();
  translate(width / 2, height / 2 + 90);

  noFill();
  stroke(88, 120, 185, 80);
  strokeWeight(2);
  ellipse(0, 0, 980, 250);

  stroke(88, 120, 185, 28);
  for (let i = 0; i < 7; i++) {
    ellipse(0, 0, 320 + i * 90, 80 + i * 25);
  }

  for (let i = 0; i < 18; i++) {
    let a = TWO_PI * i / 18;
    let x1 = cos(a) * 180;
    let y1 = sin(a) * 50;
    let x2 = cos(a) * 500;
    let y2 = sin(a) * 130;
    line(x1, y1, x2, y2);
  }

  pop();
}

function drawPlayer() {
  push();
  translate(player.x, player.y);

  let pulse = sin(frameCount * 0.06) * 4;

  noStroke();
  fill(40, 135, 255, 60);
  circle(0, 0, 92 + pulse);

  fill(65, 185, 255);
  circle(0, 0, 44);

  fill(210, 245, 255);
  circle(-7, -6, 8);

  noFill();
  stroke(120, 220, 255, 160);
  strokeWeight(2);
  arc(0, 0, 68, 68, -PI * 0.2, PI * 1.25);

  pop();
}

function drawEnemies() {
  for (let e of enemies) {
    push();
    translate(e.x, e.y);

    let pulse = sin(frameCount * 0.07 + e.pulse) * 5;

    noStroke();
    fill(255, 60, 60, 45);
    circle(0, 0, 95 + pulse);

    fill(120, 24, 36);
    rectMode(CENTER);
    rect(0, 0, 54, 66, 10);

    fill(255, 95, 70);
    triangle(-18, -30, 0, -58 - pulse * 0.4, 18, -30);

    fill(255, 180, 120);
    circle(-10, -6, 6);
    circle(10, -6, 6);

    pop();

    drawEnemyHealth(e);
  }
}

function drawEnemyHealth(e) {
  let w = 180;
  let h = 12;
  let x = e.x - w / 2;
  let y = e.y - 72;
  let pct = max(0, e.hp / e.maxHp);

  noStroke();
  fill(40, 20, 28, 210);
  rect(x, y, w, h, 7);

  fill(255, 80, 80);
  rect(x, y, w * pct, h, 7);

  fill(255);
  textAlign(CENTER);
  textSize(16);
  text(e.name, e.x, y - 12);
}

function drawProjectiles() {
  for (let p of projectiles) {
    if (p.wall) {
      push();
      translate(p.x, p.y);
      fill(...p.color, 210);
      stroke(240, 210, 150, 180);
      strokeWeight(2);
      rectMode(CENTER);
      rect(0, 0, 34, 110, 8);
      pop();
      continue;
    }

    noStroke();
    fill(...p.color, 70);
    circle(p.x, p.y, p.radius * 3.5);

    fill(...p.color);
    circle(p.x, p.y, p.radius * 2);

    fill(255, 240, 180);
    circle(p.x - p.radius * 0.25, p.y - p.radius * 0.25, p.radius * 0.55);
  }
}

function drawParticles() {
  noStroke();
  for (let p of particles) {
    let a = map(p.life, 0, 28, 0, 180);
    fill(p.col[0], p.col[1], p.col[2], a);
    circle(p.x, p.y, p.size);
  }
}

function drawFloatingTexts() {
  textAlign(CENTER);
  textSize(18);
  for (let ft of floatingTexts) {
    fill(255, 230, 150, map(ft.life, 0, 90, 0, 255));
    text(ft.text, ft.x, ft.y);
  }
}

function drawHUD() {
  drawTopBars();
  drawSpellBuffer();
  drawLastSpell();
}

function drawTopBars() {
  let x = 28;
  let y = 24;

  textAlign(LEFT);
  textSize(26);
  fill(245);
  text("LOGOS", x, y + 8);

  drawBar(x, y + 28, 220, 14, player.hp / 100, [255, 70, 90], "HP");
  drawBar(x, y + 52, 220, 14, player.lingua / 100, [90, 175, 255], "LINGUA");

  fill(200, 220, 255);
  textSize(15);
  text("FLOW x" + nf(player.flow, 1, 2), x, y + 92);
}

function drawBar(x, y, w, h, pct, col, label) {
  noStroke();
  fill(25, 30, 48, 230);
  rect(x, y, w, h, 8);

  fill(col[0], col[1], col[2]);
  rect(x, y, w * constrain(pct, 0, 1), h, 8);

  fill(220);
  textSize(12);
  text(label, x + w + 10, y + h - 2);
}

function drawSpellBuffer() {
  let cx = width / 2;
  let y = height - 112;

  let panelW = 520;
  let panelH = 86;

  noStroke();
  fill(8, 12, 28, 220);
  rect(cx - panelW / 2, y - 30, panelW, panelH, 18);

  stroke(100, 140, 220, 90);
  strokeWeight(1.5);
  noFill();
  rect(cx - panelW / 2, y - 30, panelW, panelH, 18);

  textAlign(CENTER);
  textSize(15);
  fill(150, 180, 230);
  text("CURRENT SENTENCE", cx, y - 8);

  let slotW = 102;
  for (let i = 0; i < 4; i++) {
    let sx = cx - slotW * 1.5 + i * slotW;
    let word = buffer[i];

    noStroke();
    fill(word ? colorForWord(word) : [22, 28, 48]);
    rect(sx - 43, y + 8, 86, 34, 10);

    stroke(120, 160, 230, word ? 150 : 45);
    noFill();
    rect(sx - 43, y + 8, 86, 34, 10);

    noStroke();
    fill(word ? 255 : 95);
    textSize(14);
    text(word ? WORD_LABEL[word] : "—", sx, y + 30);
  }

  if (buffer.length > 0) {
    let progress = constrain((millis() - lastInputTime) / autoCastDelay, 0, 1);
    noStroke();
    fill(100, 180, 255, 180);
    rect(cx - panelW / 2, y + 60, panelW * progress, 4, 2);
  }
}

function drawLastSpell() {
  if (!lastSpellName) return;

  let alpha = map(millis() - lastSpellTime, 0, 1200, 255, 0);
  if (alpha <= 0) return;

  textAlign(CENTER);
  textSize(30);
  fill(255, 235, 170, alpha);
  text(lastSpellName, width / 2, 120);
}

function drawControls() {
  let x = 28;
  let y = height - 78;

  noStroke();
  fill(210, 215, 230, 190);
  textAlign(LEFT);
  textSize(14);
  text("1 FIRE   2 WATER   3 WIND   4 EARTH   5 LIGHT", x, y);
  text("Q SHOT   W BEAM   E WALL", x, y + 24);
}

function colorForWord(word) {
  const c = {
    FIRE: [255, 100, 40],
    WATER: [80, 170, 255],
    WIND: [160, 255, 210],
    EARTH: [160, 120, 75],
    LIGHT: [255, 245, 150],
    SHOT: [210, 220, 255],
    BEAM: [255, 255, 210],
    WALL: [190, 160, 115]
  };

  return c[word] || [180, 180, 190];
}

function burstParticles(x, y, col, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: random(-2.2, 2.2),
      vy: random(-2.2, 2.2),
      life: random(18, 36),
      col,
      size: random(3, 8)
    });
  }
}
