
let gameState = "TITLE"; // TITLE, TUTORIAL, BATTLE, BOSS, VICTORY, GAMEOVER

let buffer = [];
let lastInputTime = 0;
let autoCastDelay = 360;

let player;
let enemies = [];
let projectiles = [];
let enemyProjectiles = [];
let particles = [];
let floatingTexts = [];
let runes = [];

let lastSpellName = "";
let lastSpellTime = 0;

let battleStartTime = 0;
let bossSpawned = false;
let tutorialPage = 0;

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
  initRunes();
  resetGame();
}

function resetGame() {
  player = {
    x: 180,
    y: height / 2 + 40,
    hp: 100,
    maxHp: 100,
    lingua: 100,
    flow: 1,
    speed: 4.2,
    invuln: 0
  };

  enemies = [];
  projectiles = [];
  enemyProjectiles = [];
  particles = [];
  floatingTexts = [];
  buffer = [];
  bossSpawned = false;
  lastSpellName = "";
}

function draw() {
  drawBackground();
  drawLibraryScene();

  if (gameState === "TITLE") {
    drawTitle();
    return;
  }

  if (gameState === "TUTORIAL") {
    drawTutorial();
    return;
  }

  if (gameState === "BATTLE" || gameState === "BOSS") {
    handlePlayerMovement();
    handleAutoCast();
    updateCombat();
    drawCombat();
    drawHUD();
    drawControls();
    return;
  }

  if (gameState === "VICTORY") {
    drawCombat();
    drawHUD();
    drawVictory();
    return;
  }

  if (gameState === "GAMEOVER") {
    drawCombat();
    drawGameOver();
    return;
  }
}

function keyPressed() {
  if (gameState === "TITLE" && key === " ") {
    gameState = "TUTORIAL";
    return;
  }

  if (gameState === "TUTORIAL" && key === " ") {
    tutorialPage++;
    if (tutorialPage > 2) {
      startBattle();
    }
    return;
  }

  if ((gameState === "VICTORY" || gameState === "GAMEOVER") && (key === "r" || key === "R")) {
    resetGame();
    tutorialPage = 0;
    gameState = "TITLE";
    return;
  }

  if (gameState !== "BATTLE" && gameState !== "BOSS") return;

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

function startBattle() {
  gameState = "BATTLE";
  battleStartTime = millis();

  enemies.push(createEnemy(960, height / 2 - 65, "Ashling", 70, "ashling"));
  enemies.push(createEnemy(1060, height / 2 + 75, "Ashling", 70, "ashling"));
}

function spawnBoss() {
  gameState = "BOSS";
  bossSpawned = true;
  enemies = [];
  enemies.push(createEnemy(950, height / 2 + 8, "Speaker of Flame", 320, "boss"));
  floatingTexts.push({ text: "The Speaker of Flame appears", x: width / 2, y: 130, life: 150 });
}

function createEnemy(x, y, name, hp, type) {
  return {
    x,
    y,
    name,
    hp,
    maxHp: hp,
    type,
    pulse: random(1000),
    castTimer: random(40, 100),
    castDuration: type === "boss" ? 110 : 80,
    casting: false,
    castProgress: 0,
    currentSpell: null,
    nextSpellDelay: type === "boss" ? 120 : 150
  };
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
      damage: 30,
      speed: 8,
      radius: 26,
      color: [255, 88, 24],
      trail: [255, 200, 50]
    },
    "FIRE,FIRE,SHOT": {
      name: "Twin Flame Shot",
      damage: 42,
      speed: 11,
      radius: 15,
      color: [255, 205, 80],
      trail: [255, 90, 20]
    },
    "WATER,SHOT": {
      name: "Aqua Shot",
      damage: 16,
      speed: 9,
      radius: 16,
      color: [80, 185, 255],
      trail: [120, 230, 255]
    },
    "WIND,SHOT": {
      name: "Wind Dart",
      damage: 13,
      speed: 12,
      radius: 14,
      color: [180, 255, 220],
      trail: [120, 255, 190]
    },
    "LIGHT,BEAM": {
      name: "Lux Beam",
      damage: 26,
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
      x: player.x + 125,
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

function handlePlayerMovement() {
  let dx = 0;
  let dy = 0;

  if (keyIsDown(65)) dx -= 1; // A
  if (keyIsDown(68)) dx += 1; // D
  if (keyIsDown(87)) dy -= 1; // W
  if (keyIsDown(83)) dy += 1; // S

  if (dx !== 0 || dy !== 0) {
    let len = sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  player.x = constrain(player.x + dx * player.speed, 80, width - 160);
  player.y = constrain(player.y + dy * player.speed, 145, height - 150);
}

function updateCombat() {
  updateEnemies();
  updateProjectiles();
  updateEnemyProjectiles();
  updateParticles();
  updateFloatingTexts();

  player.lingua = min(100, player.lingua + 0.03);
  player.flow = max(1, player.flow - 0.0015);
  if (player.invuln > 0) player.invuln--;

  if (gameState === "BATTLE" && enemies.length === 0 && !bossSpawned) {
    if (millis() - battleStartTime > 1200) {
      spawnBoss();
    }
  }

  if (gameState === "BOSS" && enemies.length === 0) {
    gameState = "VICTORY";
  }

  if (player.hp <= 0) {
    gameState = "GAMEOVER";
  }
}

function updateEnemies() {
  for (let e of enemies) {
    e.castTimer--;

    if (!e.casting && e.castTimer <= 0) {
      e.casting = true;
      e.castProgress = 0;
      e.currentSpell = chooseEnemySpell(e);
    }

    if (e.casting) {
      e.castProgress++;
      if (e.castProgress >= e.castDuration) {
        enemyCast(e);
        e.casting = false;
        e.castTimer = e.nextSpellDelay + random(-30, 40);
      }
    }

    if (e.type === "ashling") {
      e.y += sin(frameCount * 0.015 + e.pulse) * 0.25;
    } else {
      e.y += sin(frameCount * 0.01 + e.pulse) * 0.18;
    }
  }
}

function chooseEnemySpell(e) {
  if (e.type === "boss") {
    let hpPct = e.hp / e.maxHp;
    if (hpPct < 0.35) return ["FIRE", "BEAM", "SEEK"];
    if (hpPct < 0.7) return random([["FIRE", "SHOT"], ["FIRE", "BEAM"]]);
    return ["FIRE", "SHOT"];
  }

  return ["FIRE", "SHOT"];
}

function enemyCast(e) {
  let spell = e.currentSpell || ["FIRE", "SHOT"];
  let key = spell.join(",");

  let speed = key === "FIRE,BEAM,SEEK" ? -7.2 : key === "FIRE,BEAM" ? -8.5 : -6.2;
  let damage = key === "FIRE,BEAM,SEEK" ? 22 : key === "FIRE,BEAM" ? 18 : 12;
  let radius = key === "FIRE,BEAM,SEEK" ? 18 : key === "FIRE,BEAM" ? 14 : 16;

  enemyProjectiles.push({
    x: e.x - 42,
    y: e.y,
    vx: speed,
    damage,
    radius,
    seek: key === "FIRE,BEAM,SEEK",
    color: key === "FIRE,BEAM,SEEK" ? [255, 45, 30] : [255, 100, 40],
    life: 360
  });

  burstParticles(e.x - 40, e.y, [255, 80, 30], 18);
}

function updateProjectiles() {
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
      if (dist(p.x, p.y, e.x, e.y) < p.radius + (e.type === "boss" ? 45 : 28) && !p.hit && !p.wall) {
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
}

function updateEnemyProjectiles() {
  for (let p of enemyProjectiles) {
    if (p.seek) {
      let dy = player.y - p.y;
      p.y += constrain(dy * 0.025, -2.2, 2.2);
    }

    p.x += p.vx;
    p.life--;

    particles.push({
      x: p.x + random(4, 14),
      y: p.y + random(-6, 6),
      vx: random(-0.2, 0.4),
      vy: random(-0.4, 0.4),
      life: 24,
      col: p.color,
      size: random(3, 7)
    });

    for (let wall of projectiles) {
      if (wall.wall && dist(p.x, p.y, wall.x, wall.y) < p.radius + 38) {
        p.life = 0;
        wall.life -= 40;
        burstParticles(p.x, p.y, [210, 170, 110], 24);
      }
    }

    if (dist(p.x, p.y, player.x, player.y) < p.radius + 24 && player.invuln <= 0) {
      player.hp -= p.damage;
      player.invuln = 45;
      p.life = 0;
      burstParticles(player.x, player.y, [255, 90, 90], 30);
      floatingTexts.push({ text: "-" + p.damage, x: player.x, y: player.y - 55, life: 70 });
    }
  }

  enemyProjectiles = enemyProjectiles.filter(p => p.life > 0 && p.x > -100);
}

function updateParticles() {
  for (let pt of particles) {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
  }
  particles = particles.filter(pt => pt.life > 0);
}

function updateFloatingTexts() {
  for (let ft of floatingTexts) {
    ft.y -= 0.55;
    ft.life--;
  }
  floatingTexts = floatingTexts.filter(ft => ft.life > 0);
}

function drawCombat() {
  drawArena();
  drawPlayer();
  drawEnemies();
  drawProjectiles();
  drawEnemyProjectiles();
  drawParticles();
  drawFloatingTexts();
}

function drawBackground() {
  background(5, 7, 19);

  noStroke();

  for (let i = 0; i < 18; i++) {
    let x = (i * 103 + frameCount * 0.08) % width;
    let y = 80 + noise(i * 2.4) * 540;
    fill(130, 80, 40, 28);
    circle(x, y, 2 + noise(i) * 3);
  }

  for (let r = 0; r < 8; r++) {
    let alpha = map(r, 0, 7, 40, 2);
    fill(80, 35, 24, alpha);
    ellipse(width / 2, height / 2 + 45, 1120 + r * 80, 450 + r * 35);
  }
}

function initRunes() {
  for (let i = 0; i < 36; i++) {
    runes.push({
      x: random(width),
      y: random(80, height - 100),
      s: random(12, 28),
      a: random(TWO_PI),
      speed: random(0.001, 0.006),
      glyph: random(["◇", "△", "◊", "□", "炎", "ξ", "λ"])
    });
  }
}

function drawLibraryScene() {
  drawPillars();
  drawRunes();
}

function drawPillars() {
  noStroke();

  for (let i = 0; i < 5; i++) {
    let x = 90 + i * 270;
    fill(45, 30, 35, 150);
    rect(x, 90, 42, 490, 10);

    fill(110, 55, 38, 90);
    rect(x - 8, 100, 58, 18, 6);
    rect(x - 8, 550, 58, 18, 6);
  }
}

function drawRunes() {
  textAlign(CENTER);
  for (let r of runes) {
    r.a += r.speed;
    let yy = r.y + sin(frameCount * r.speed * 20 + r.a) * 8;
    fill(255, 125, 60, 40 + 30 * sin(r.a));
    textSize(r.s);
    text(r.glyph, r.x, yy);
  }
}

function drawArena() {
  push();
  translate(width / 2, height / 2 + 105);

  noFill();
  stroke(180, 95, 65, 95);
  strokeWeight(2);
  ellipse(0, 0, 980, 250);

  stroke(180, 95, 65, 35);
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

  if (player.invuln > 0 && frameCount % 8 < 4) {
    tint(255, 120);
  }

  noStroke();
  fill(40, 135, 255, 65);
  circle(0, 0, 92 + pulse);

  fill(65, 185, 255);
  circle(0, 0, 44);

  fill(210, 245, 255);
  circle(-7, -6, 8);

  noFill();
  stroke(120, 220, 255, 170);
  strokeWeight(2);
  arc(0, 0, 68, 68, -PI * 0.2, PI * 1.25);

  pop();
}

function drawEnemies() {
  for (let e of enemies) {
    push();
    translate(e.x, e.y);

    let pulse = sin(frameCount * 0.07 + e.pulse) * 5;
    let scaleSize = e.type === "boss" ? 1.75 : 1;

    scale(scaleSize);

    noStroke();
    fill(255, 60, 60, e.type === "boss" ? 65 : 45);
    circle(0, 0, 95 + pulse);

    fill(e.type === "boss" ? [95, 18, 22] : [120, 24, 36]);
    rectMode(CENTER);
    rect(0, 0, 54, 66, 10);

    fill(255, 95, 70);
    triangle(-18, -30, 0, -58 - pulse * 0.4, 18, -30);

    fill(255, 180, 120);
    circle(-10, -6, 6);
    circle(10, -6, 6);

    if (e.type === "boss") {
      noFill();
      stroke(255, 120, 60, 180);
      strokeWeight(2);
      circle(0, 0, 88 + pulse);
    }

    pop();

    drawEnemyHealth(e);
    drawEnemyCasting(e);
  }
}

function drawEnemyHealth(e) {
  let w = e.type === "boss" ? 280 : 180;
  let h = e.type === "boss" ? 14 : 12;
  let x = e.x - w / 2;
  let y = e.y - (e.type === "boss" ? 125 : 72);
  let pct = max(0, e.hp / e.maxHp);

  noStroke();
  fill(40, 20, 28, 220);
  rect(x, y, w, h, 7);

  fill(e.type === "boss" ? [255, 65, 45] : [255, 80, 80]);
  rect(x, y, w * pct, h, 7);

  fill(255);
  textAlign(CENTER);
  textSize(e.type === "boss" ? 20 : 16);
  text(e.name, e.x, y - 14);
}

function drawEnemyCasting(e) {
  if (!e.casting || !e.currentSpell) return;

  let y = e.y + (e.type === "boss" ? 120 : 58);
  let x = e.x;
  let progress = e.castProgress / e.castDuration;

  textAlign(CENTER);
  textSize(14);
  fill(255, 185, 130);
  text("CHANTING", x, y);

  let totalW = e.currentSpell.length * 72;
  for (let i = 0; i < e.currentSpell.length; i++) {
    let sx = x - totalW / 2 + i * 72 + 36;
    let word = e.currentSpell[i];

    fill(colorForWord(word));
    rect(sx - 30, y + 10, 60, 28, 8);
    fill(20);
    textSize(11);
    text(WORD_LABEL[word] || word, sx, y + 29);
  }

  noStroke();
  fill(255, 90, 50, 160);
  rect(x - totalW / 2, y + 48, totalW * progress, 4, 2);
}

function drawProjectiles() {
  for (let p of projectiles) {
    if (p.wall) {
      push();
      translate(p.x, p.y);
      fill(...p.color, 220);
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

function drawEnemyProjectiles() {
  for (let p of enemyProjectiles) {
    noStroke();
    fill(p.color[0], p.color[1], p.color[2], 70);
    circle(p.x, p.y, p.radius * 3.2);

    fill(p.color[0], p.color[1], p.color[2]);
    circle(p.x, p.y, p.radius * 2);

    fill(255, 210, 160);
    circle(p.x + p.radius * 0.25, p.y - p.radius * 0.25, p.radius * 0.45);
  }
}

function drawParticles() {
  noStroke();
  for (let p of particles) {
    let a = map(p.life, 0, 36, 0, 190);
    fill(p.col[0], p.col[1], p.col[2], a);
    circle(p.x, p.y, p.size);
  }
}

function drawFloatingTexts() {
  textAlign(CENTER);
  textSize(18);
  for (let ft of floatingTexts) {
    fill(255, 230, 150, map(ft.life, 0, 150, 0, 255));
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

  drawBar(x, y + 28, 220, 14, player.hp / player.maxHp, [255, 70, 90], "HP");
  drawBar(x, y + 52, 220, 14, player.lingua / 100, [90, 175, 255], "LINGUA");

  fill(230, 205, 160);
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
  fill(8, 12, 28, 225);
  rect(cx - panelW / 2, y - 30, panelW, panelH, 18);

  stroke(210, 110, 70, 110);
  strokeWeight(1.5);
  noFill();
  rect(cx - panelW / 2, y - 30, panelW, panelH, 18);

  textAlign(CENTER);
  textSize(15);
  fill(230, 175, 130);
  text("CURRENT SENTENCE", cx, y - 8);

  let slotW = 102;
  for (let i = 0; i < 4; i++) {
    let sx = cx - slotW * 1.5 + i * slotW;
    let word = buffer[i];

    noStroke();
    fill(word ? colorForWord(word) : [22, 28, 48]);
    rect(sx - 43, y + 8, 86, 34, 10);

    stroke(230, 140, 90, word ? 155 : 50);
    noFill();
    rect(sx - 43, y + 8, 86, 34, 10);

    noStroke();
    fill(word ? 25 : 95);
    textSize(14);
    text(word ? WORD_LABEL[word] : "—", sx, y + 30);
  }

  if (buffer.length > 0) {
    let progress = constrain((millis() - lastInputTime) / autoCastDelay, 0, 1);
    noStroke();
    fill(255, 120, 70, 190);
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
  let y = height - 88;

  noStroke();
  fill(230, 220, 205, 195);
  textAlign(LEFT);
  textSize(14);
  text("Move: WASD", x, y);
  text("1 FIRE   2 WATER   3 WIND   4 EARTH   5 LIGHT", x, y + 24);
  text("Q SHOT   W BEAM   E WALL", x, y + 48);
}

function drawTitle() {
  fill(0, 0, 0, 110);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(255, 220, 170);
  textSize(72);
  text("LOGOS", width / 2, height / 2 - 90);

  textSize(22);
  fill(230);
  text("Speak the language beneath the world.", width / 2, height / 2 - 38);

  textSize(19);
  fill(255, 170 + sin(frameCount * 0.05) * 60, 120);
  text("Press SPACE to begin", width / 2, height / 2 + 40);
}

function drawTutorial() {
  fill(0, 0, 0, 125);
  rect(0, 0, width, height);

  let title = "";
  let body = "";

  if (tutorialPage === 0) {
    title = "1 / 3  Language";
    body = "Words form spells.\\n1 = Ignis / FIRE\\nQ = Shot\\nType 1 then Q to cast Fireball.";
  } else if (tutorialPage === 1) {
    title = "2 / 3  Movement";
    body = "Use WASD to move.\\nEnemy spells can hit you.\\nRead the enemy's chanting words above its head.";
  } else {
    title = "3 / 3  First Trial";
    body = "Defeat the Ashlings, then face the Speaker of Flame.\\nTry: 1, Q  →  Fireball\\nTry: 1, 3  →  Ignis Ventus";
  }

  textAlign(CENTER);
  fill(255, 220, 170);
  textSize(36);
  text(title, width / 2, height / 2 - 105);

  fill(240);
  textSize(24);
  text(body, width / 2, height / 2 - 40);

  fill(255, 180, 120);
  textSize(18);
  text("Press SPACE", width / 2, height / 2 + 125);
}

function drawVictory() {
  fill(0, 0, 0, 145);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(255, 220, 170);
  textSize(48);
  text("CHAPTER COMPLETE", width / 2, height / 2 - 120);

  textSize(24);
  fill(240);
  text("You learned the complete root:", width / 2, height / 2 - 55);

  fill(255, 110, 65);
  rect(width / 2 - 70, height / 2 - 20, 140, 48, 14);

  fill(30);
  textSize(26);
  text("IGNIS", width / 2, height / 2 + 13);

  fill(230);
  textSize(18);
  text("Press R to return to title", width / 2, height / 2 + 95);
}

function drawGameOver() {
  fill(0, 0, 0, 155);
  rect(0, 0, width, height);

  textAlign(CENTER);
  fill(255, 100, 90);
  textSize(54);
  text("LANGUAGE BROKEN", width / 2, height / 2 - 40);

  fill(230);
  textSize(20);
  text("Press R to retry", width / 2, height / 2 + 35);
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
    WALL: [190, 160, 115],
    SEEK: [255, 60, 60]
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
