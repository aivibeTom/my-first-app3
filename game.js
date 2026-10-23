const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreLabel = document.querySelector("#score");
const healthLabel = document.querySelector("#health");
const progressBar = document.querySelector("#progress");
const message = document.querySelector("#message");
const messageKicker = document.querySelector("#message-kicker");
const messageTitle = document.querySelector("#message-title");
const messageText = document.querySelector("#message-text");
const startButton = document.querySelector("#start-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND = 454;
const ENEMY_FLOAT_HEIGHT = 105;
const LEVEL_END = 4800;
const keys = new Set();
const controls = { left: false, right: false, up: false, down: false };
const enemySpots = [620, 1030, 1480, 1900, 2380, 2810, 3250, 3690, 4110, 4490];
const platforms = enemySpots.map((x) => ({
  x: x - 55,
  y: GROUND - ENEMY_FLOAT_HEIGHT,
  width: 145,
  height: 14
}));
const enemies = enemySpots
  .map((x, index) => ({
    x,
    homeX: x,
    platform: platforms[index],
    y: platforms[index].y - 34 - 130,
    homeY: platforms[index].y - 34,
    vy: 30,
    alive: true,
    phase: index * 1.7
  }));

let state = "ready";
let score = 0;
let cameraX = 0;
let lastTime = 0;
let elapsed = 0;
let shake = 0;
let particles = [];
let player;

function resetGame() {
  score = 0;
  cameraX = 0;
  elapsed = 0;
  shake = 0;
  particles = [];
  enemies.forEach((enemy) => {
    enemy.alive = true;
    enemy.x = enemy.homeX;
    enemy.y = enemy.homeY - 130;
    enemy.vy = 30;
  });
  player = {
    x: 100, y: GROUND - 48, width: 32, height: 48, vy: 0,
    facing: 1, health: 3, invulnerable: 0, attackTime: 0,
    attackCooldown: 0, hitEnemies: new Set(), walkTime: 0, onGround: true
  };
  scoreLabel.textContent = "0000";
  healthLabel.textContent = "♥ ♥ ♥";
  progressBar.style.width = "0%";
}

function showMessage(kicker, title, text, buttonText) {
  messageKicker.textContent = kicker;
  messageTitle.textContent = title;
  messageText.textContent = text;
  startButton.innerHTML = `${buttonText} <span>→</span>`;
  message.hidden = false;
}

function startGame() {
  resetGame();
  state = "playing";
  message.hidden = true;
  lastTime = performance.now();
}

startButton.addEventListener("click", startGame);

function jump() {
  if (state === "playing" && player.onGround) {
    player.vy = -11.8;
    player.onGround = false;
  }
}

function attack() {
  if (state !== "playing" || player.attackCooldown > 0) return;
  player.attackTime = 0.24;
  player.attackCooldown = 0.38;
  player.hitEnemies.clear();
}

function setKey(key, pressed) {
  const normalized = key.toLowerCase();
  if (["arrowleft", "a"].includes(normalized)) controls.left = pressed;
  if (["arrowright", "d"].includes(normalized)) controls.right = pressed;
  if (["arrowup", "w"].includes(normalized)) controls.up = pressed;
  if (["arrowdown", "s"].includes(normalized)) controls.down = pressed;
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "a", "d", "w", "s", "z", "x"].includes(key)) {
    event.preventDefault();
  }
  if (keys.has(key)) return;
  keys.add(key);
  setKey(key, true);
  if (["arrowup", " ", "w"].includes(key)) jump();
  if (["z", "x"].includes(key)) attack();
  if (key === "enter" && state !== "playing") startGame();
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key);
  setKey(key, false);
});

window.addEventListener("blur", () => {
  keys.clear();
  controls.left = false;
  controls.right = false;
  controls.up = false;
  controls.down = false;
});

document.querySelectorAll("[data-control]").forEach((button) => {
  const control = button.dataset.control;
  const press = (event) => {
    event.preventDefault();
    button.classList.add("is-pressed");
    if (["left", "right", "up", "down"].includes(control)) controls[control] = true;
    if (control === "jump") jump();
    if (control === "attack") attack();
  };
  const release = () => {
    button.classList.remove("is-pressed");
    if (["left", "right", "up", "down"].includes(control)) controls[control] = false;
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

function update(dt) {
  if (state !== "playing") return;
  elapsed += dt;
  const left = controls.left || keys.has("arrowleft") || keys.has("a");
  const right = controls.right || keys.has("arrowright") || keys.has("d");
  const up = controls.up || keys.has("arrowup") || keys.has("w");
  const down = controls.down || keys.has("arrowdown") || keys.has("s");
  const direction = Number(right) - Number(left);
  const verticalDirection = Number(down) - Number(up);

  if (direction) {
    player.x += direction * 250 * dt;
    player.facing = direction;
    player.walkTime += dt * 12;
  }
  const previousBottom = player.y + player.height;
  if (verticalDirection) {
    player.y += verticalDirection * 170 * dt;
    player.vy = 0;
    player.onGround = false;
  }
  player.x = Math.max(0, Math.min(LEVEL_END, player.x));
  player.y = Math.max(40, Math.min(GROUND - player.height, player.y));
  player.vy += 32 * dt;
  player.y += player.vy;

  let landed = false;
  if (player.vy >= 0) {
    for (const platform of platforms) {
      const overlapsPlatform = player.x + player.width > platform.x
        && player.x < platform.x + platform.width;
      if (overlapsPlatform && previousBottom <= platform.y
        && player.y + player.height >= platform.y) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.onGround = true;
        landed = true;
        break;
      }
    }
  }
  if (player.y + player.height >= GROUND) {
    player.y = GROUND - player.height;
    player.vy = 0;
    player.onGround = true;
  } else if (!landed) {
    player.onGround = false;
  }

  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.attackTime = Math.max(0, player.attackTime - dt);
  if (player.attackTime === 0) player.hitEnemies.clear();

  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const gap = player.x - enemy.x;
    if (Math.abs(gap) < 300) enemy.x += Math.sign(gap) * 34 * dt;
    enemy.x = Math.max(enemy.platform.x, Math.min(enemy.platform.x + enemy.platform.width - 32, enemy.x));

    const previousEnemyBottom = enemy.y + 34;
    enemy.vy = Math.min(enemy.vy + 180 * dt, 220);
    enemy.y += enemy.vy * dt;
    if (enemy.vy >= 0 && previousEnemyBottom <= enemy.platform.y
      && enemy.y + 34 >= enemy.platform.y) {
      enemy.y = enemy.platform.y - 34;
      enemy.vy = 0;
    }

    if (Math.abs(gap) < 32 && Math.abs(player.y - enemy.y) < 32 && player.invulnerable === 0) {
      player.health -= 1;
      player.invulnerable = 1.15;
      player.x = Math.max(0, player.x - player.facing * 55);
      player.vy = -5;
      shake = 0.18;
      healthLabel.textContent = "♥ ".repeat(player.health).trim() || "—";
      spawnBurst(player.x + 16, player.y + 20, "#ff917f", 8);
      if (player.health <= 0) {
        state = "over";
        showMessage("ADVENTURE OVER", "もう一度チャレンジ！", `スコア ${String(score).padStart(4, "0")} — ゴールはもうすぐ！`, "リトライ");
      }
    }

    const inAttack = player.attackTime > 0
      && (enemy.x - player.x) * player.facing > -8
      && (enemy.x - player.x) * player.facing < 65
      && Math.abs(player.y - enemy.y) < 48;
    if (inAttack && !player.hitEnemies.has(enemy)) {
      player.hitEnemies.add(enemy);
      enemy.alive = false;
      score += 100;
      scoreLabel.textContent = String(score).padStart(4, "0");
      spawnBurst(enemy.x + 17, enemy.y + 16, "#b5f5c3", 12);
    }
  });

  particles = particles.filter((particle) => particle.life > 0);
  particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 500 * dt;
    particle.life -= dt;
  });

  cameraX = Math.max(0, Math.min(LEVEL_END - WIDTH + 100, player.x - WIDTH * 0.36));
  progressBar.style.width = `${Math.min(100, (player.x / LEVEL_END) * 100)}%`;
  if (player.x >= LEVEL_END) {
    state = "won";
    showMessage("WORLD CLEAR", "やったね！ゴール！", `敵を ${String(score / 100).padStart(2, "0")} 体たおしたよ。`, "もう一度遊ぶ");
  }
  shake = Math.max(0, shake - dt);
}

function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 45 + Math.random() * 100;
    particles.push({
      x, y, color, life: 0.35 + Math.random() * 0.25,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 35
    });
  }
}

function roundedRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#8dcbdc");
  sky.addColorStop(0.68, "#d4e6ce");
  sky.addColorStop(1, "#e7d9aa");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(255, 239, 179, 0.9)";
  ctx.beginPath();
  ctx.arc(775 - cameraX * 0.05, 112, 35, 0, Math.PI * 2);
  ctx.fill();

  drawHills(0.13, 310, "#9bc8b5", 130, 0.0028);
  drawHills(0.25, 365, "#76b59d", 105, 0.004);
  drawClouds();
  drawGround();
}

function drawHills(parallax, baseline, color, amplitude, frequency) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  for (let x = -20; x <= WIDTH + 20; x += 8) {
    const worldX = x + cameraX * parallax;
    const y = baseline + Math.sin(worldX * frequency) * amplitude
      + Math.sin(worldX * frequency * 0.48 + 1.4) * amplitude * 0.45;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WIDTH, HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawClouds() {
  for (let i = 0; i < 7; i += 1) {
    const x = ((i * 203 - cameraX * 0.16) % (WIDTH + 180) + WIDTH + 180) % (WIDTH + 180) - 70;
    const y = 95 + (i % 3) * 45;
    ctx.fillStyle = "rgba(250, 255, 244, 0.45)";
    ctx.beginPath();
    ctx.ellipse(x, y, 36, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 16, y - 5, 22, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 34, y, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  ctx.fillStyle = "#637c54";
  ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
  ctx.fillStyle = "#8eaa64";
  ctx.fillRect(0, GROUND, WIDTH, 8);
  ctx.fillStyle = "#667953";
  for (let i = 0; i < 45; i += 1) {
    const x = ((i * 61 - cameraX * 0.9) % (WIDTH + 70) + WIDTH + 70) % (WIDTH + 70) - 30;
    ctx.fillRect(x, GROUND + 25 + (i % 4) * 14, 22, 3);
  }

  for (let i = 0; i < 24; i += 1) {
    const worldX = i * 225 + 50;
    const x = worldX - cameraX;
    if (x < -30 || x > WIDTH + 30) continue;
    ctx.fillStyle = "#477b56";
    ctx.fillRect(x, GROUND - 16, 4, 16);
    ctx.fillStyle = i % 2 ? "#f6c778" : "#f3f2ce";
    ctx.beginPath();
    ctx.arc(x + 2, GROUND - 17, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatforms() {
  platforms.forEach((platform) => {
    const x = platform.x - cameraX;
    if (x < -platform.width || x > WIDTH) return;
    ctx.fillStyle = "rgba(37, 62, 59, 0.16)";
    ctx.fillRect(x + 5, platform.y + platform.height, platform.width - 10, 7);
    roundedRect(x, platform.y, platform.width, platform.height, 5, "#755d45");
    roundedRect(x, platform.y, platform.width, 6, 3, "#a6bf79");
    ctx.fillStyle = "#d4c28b";
    for (let plankX = x + 14; plankX < x + platform.width - 8; plankX += 28) {
      ctx.fillRect(plankX, platform.y + 8, 2, 4);
    }
  });
}

function drawPlayer() {
  const x = player.x - cameraX;
  const y = player.y;
  if (player.invulnerable > 0 && Math.floor(elapsed * 14) % 2 === 0) return;
  const running = Math.abs(player.walkTime % (Math.PI * 2));
  const legSwing = Math.abs(player.y + player.height - GROUND) < 1 ? Math.sin(running) * 4 : 0;

  ctx.save();
  if (player.facing < 0) {
    ctx.translate(x + player.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(x, 0);
  }

  ctx.fillStyle = "rgba(37, 62, 59, 0.2)";
  ctx.beginPath();
  ctx.ellipse(16, player.onGround ? player.y + player.height + 2 : GROUND + 2,
    player.onGround ? 19 : 12, player.onGround ? 5 : 3, 0, 0, Math.PI * 2);
  ctx.fill();

  roundedRect(8, y + 4, 21, 19, 7, "#efbd87");
  roundedRect(5, y + 19, 25, 22, 7, "#e7785e");
  roundedRect(4, y + 37 + legSwing, 10, 11 - Math.max(0, legSwing), 4, "#344958");
  roundedRect(20, y + 37 - legSwing, 10, 11 + Math.min(0, legSwing), 4, "#344958");
  roundedRect(5, y + 1, 25, 8, 4, "#315d68");
  ctx.fillStyle = "#315d68";
  ctx.beginPath();
  ctx.moveTo(7, y + 6);
  ctx.lineTo(-3, y + 12);
  ctx.lineTo(8, y + 13);
  ctx.fill();
  ctx.fillStyle = "#2c3b44";
  ctx.fillRect(21, y + 12, 3, 4);
  ctx.fillStyle = "#fff0cc";
  ctx.fillRect(12, y + 26, 8, 3);

  if (player.attackTime > 0) {
    ctx.strokeStyle = `rgba(255, 249, 205, ${0.45 + player.attackTime})`;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(31, y + 23, 27, -0.9, 0.9);
    ctx.stroke();
    ctx.fillStyle = "#fff6ce";
    ctx.beginPath();
    ctx.arc(53, y + 19, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  const x = enemy.x - cameraX;
  const bob = Math.sin(elapsed * 3.5 + enemy.phase) * 1.5;
  const heightAboveGround = GROUND - (enemy.y + 34);
  const shadowScale = Math.max(0.45, 1 - heightAboveGround / 260);
  ctx.fillStyle = `rgba(37, 62, 59, ${0.18 * shadowScale})`;
  ctx.beginPath();
  ctx.ellipse(x + 17, GROUND + 2, 19 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  roundedRect(x + 2, enemy.y + 10 + bob, 30, 23, 9, "#705c8e");
  roundedRect(x + 7, enemy.y + 4 + bob, 21, 18, 8, "#9a7bb3");
  ctx.fillStyle = "#f8dca9";
  ctx.fillRect(x + 21, enemy.y + 12 + bob, 3, 4);
  ctx.fillRect(x + 9, enemy.y + 32, 6, 4);
  ctx.fillRect(x + 23, enemy.y + 32, 6, 4);
}

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5);
  drawBackground();
  drawPlatforms();
  enemies.forEach((enemy) => {
    if (enemy.alive && enemy.x - cameraX > -50 && enemy.x - cameraX < WIDTH + 50) drawEnemy(enemy);
  });

  const goalX = LEVEL_END - cameraX;
  if (goalX > -50 && goalX < WIDTH + 60) {
    ctx.fillStyle = "#526c62";
    ctx.fillRect(goalX, 268, 5, GROUND - 268);
    ctx.fillStyle = "#f0bb68";
    ctx.beginPath();
    ctx.moveTo(goalX + 5, 272);
    ctx.lineTo(goalX + 55, 287);
    ctx.lineTo(goalX + 5, 303);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff2cd";
    ctx.font = "bold 11px Nunito, sans-serif";
    ctx.fillText("GOAL", goalX + 8, 291);
  }

  drawPlayer();
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / 0.6);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x - cameraX, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000 || 0, 0.033);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

resetGame();
showMessage("WORLD 01 · GREEN HILLS", "冒険に出発！", "走って、ジャンプして、敵をたおそう。", "ゲームスタート");
requestAnimationFrame((now) => {
  lastTime = now;
  frame(now);
});
