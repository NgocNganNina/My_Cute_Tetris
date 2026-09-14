/* ============================================================
   JEWEL TETRIS – game.js  (fixed)
   Themes: galaxy (shooting stars) | ocean (bubbles) | candy (cotton candy)
   All pieces drawn as faceted jewel blocks
============================================================ */

"use strict";

/* ── Constants ── */
const COLS = 10, ROWS = 20, CELL = 30;
const TICK_START = 800;
const TICK_MIN   = 80;

/* ── Tetrominoes ── */
const SHAPES = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};
const SHAPE_KEYS = Object.keys(SHAPES);

/* ── Jewel colours per theme ── */
const JEWEL_COLORS = {
  galaxy: {
    I: {main:"#b060ff",light:"#d8aaff",dark:"#6010cc",shine:"#f0e0ff"},
    O: {main:"#60c0ff",light:"#b0e4ff",dark:"#1060cc",shine:"#e0f4ff"},
    T: {main:"#ff60d0",light:"#ffb0ea",dark:"#cc1090",shine:"#fff0f8"},
    S: {main:"#60ffb0",light:"#b0ffe0",dark:"#10cc60",shine:"#e0fff4"},
    Z: {main:"#ffb060",light:"#ffd8b0",dark:"#cc6010",shine:"#fff4e0"},
    J: {main:"#f060ff",light:"#f8b0ff",dark:"#9010cc",shine:"#fde0ff"},
    L: {main:"#60d0ff",light:"#b0ecff",dark:"#1090cc",shine:"#e0f8ff"},
  },
  ocean: {
    I: {main:"#00c8e0",light:"#80eaf0",dark:"#007090",shine:"#dfffff"},
    O: {main:"#00e0a0",light:"#80f8d0",dark:"#008060",shine:"#d0ffee"},
    T: {main:"#0080ff",light:"#80bfff",dark:"#003088",shine:"#d0e8ff"},
    S: {main:"#00d4d4",light:"#80eeee",dark:"#007070",shine:"#d0fafa"},
    Z: {main:"#20b0ff",light:"#90d8ff",dark:"#006090",shine:"#d8f0ff"},
    J: {main:"#5050ff",light:"#a0a0ff",dark:"#200080",shine:"#e0e0ff"},
    L: {main:"#00f0d0",light:"#80ffe8",dark:"#007060",shine:"#d0fff8"},
  },
  candy: {
    I: {main:"#ff6eb4",light:"#ffb8dc",dark:"#cc2080",shine:"#fff0f8"},
    O: {main:"#ff9e40",light:"#ffd0a0",dark:"#cc5010",shine:"#fff4e0"},
    T: {main:"#a040ff",light:"#d090ff",dark:"#5000aa",shine:"#f0e0ff"},
    S: {main:"#ff4040",light:"#ff9090",dark:"#aa0000",shine:"#ffe0e0"},
    Z: {main:"#40d0ff",light:"#a0eaff",dark:"#0060aa",shine:"#e0f8ff"},
    J: {main:"#ffdd00",light:"#ffee80",dark:"#bb9900",shine:"#fffce0"},
    L: {main:"#60e060",light:"#b0f0b0",dark:"#208020",shine:"#e0ffe0"},
  },
};

/* ── State ── */
let board, currentPiece, nextPiece, score, level, lines, highScore, gameState, theme, lastTick;
let paused = false;

/* ── Canvas references ── */
const gameCanvas = document.getElementById("game-canvas");
const gCtx       = gameCanvas.getContext("2d");
const nextCanvas = document.getElementById("next-canvas");
const nCtx       = nextCanvas.getContext("2d");
const pCanvas    = document.getElementById("particles-canvas");
const pCtx       = pCanvas.getContext("2d");

/* ── UI references ── */
const scoreEl    = document.getElementById("score");
const levelEl    = document.getElementById("level");
const linesEl    = document.getElementById("lines");
const highScEl   = document.getElementById("high-score");
const overlay    = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMsg   = document.getElementById("overlay-msg");
const startBtn   = document.getElementById("start-btn");
const pauseBtn   = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const themeBtns  = document.querySelectorAll(".theme-btn");

/* ── Init ── */
theme     = "galaxy";
highScore = 0;

/* ── Resize particles canvas ── */
function resizeParticles() {
  pCanvas.width  = window.innerWidth;
  pCanvas.height = window.innerHeight;
}
window.addEventListener("resize", () => { resizeParticles(); initBgStars(); });
resizeParticles();

/* ══════════════════════════════════════════════════════════
   ROUNDED RECT POLYFILL
   (ctx.roundRect is not in all browsers – use manual path)
══════════════════════════════════════════════════════════ */
function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}

/* ══════════════════════════════════════════════════════════
   PARTICLE SYSTEM
══════════════════════════════════════════════════════════ */
let particles = [];

function spawnShootingStar() {
  const angle = (Math.random() * 30 + 15) * Math.PI / 180;
  const speed = Math.random() * 12 + 8;
  return {
    type:"star", alpha:1, tail:[],
    x: Math.random() * pCanvas.width * 0.7,
    y: Math.random() * pCanvas.height * 0.4,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function spawnBubble() {
  return {
    type:"bubble",
    x: Math.random() * pCanvas.width,
    y: pCanvas.height + 30,
    r: Math.random() * 22 + 6,
    vy: -(Math.random() * 1.2 + 0.4),
    vx: (Math.random() - 0.5) * 0.5,
    alpha: Math.random() * 0.5 + 0.3,
    wobble: Math.random() * Math.PI * 2,
  };
}

function spawnCandyPuff() {
  const colors = ["#ffb3e6","#ff80cc","#ffd6f0","#ffaadd","#fff0f8","#ffe6f3"];
  return {
    type:"puff",
    x: Math.random() * pCanvas.width,
    y: pCanvas.height + 60,
    r: Math.random() * 40 + 20,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -(Math.random() * 0.8 + 0.3),
    alpha: Math.random() * 0.35 + 0.15,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.01,
  };
}

/* background star field for galaxy */
let bgStars = [];
function initBgStars() {
  bgStars = [];
  for (let i = 0; i < 200; i++) {
    bgStars.push({
      x: Math.random() * pCanvas.width,
      y: Math.random() * pCanvas.height,
      r: Math.random() * 1.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.005,
    });
  }
}
initBgStars();

let particleTimer = 0;
function updateParticles(dt) {
  particleTimer += dt;
  const spawnRate = theme === "galaxy" ? 1200 : theme === "ocean" ? 400 : 600;
  if (particleTimer > spawnRate) {
    particleTimer = 0;
    if (theme === "galaxy")       particles.push(spawnShootingStar());
    else if (theme === "ocean")   { for(let i=0;i<3;i++) particles.push(spawnBubble()); }
    else if (theme === "candy")   { for(let i=0;i<2;i++) particles.push(spawnCandyPuff()); }
  }

  particles = particles.filter(p => {
    if (p.type === "star")   return p.alpha > 0.01 && p.x < pCanvas.width + 200;
    if (p.type === "bubble") return p.y > -80 && p.alpha > 0.01;
    if (p.type === "puff")   return p.y > -120 && p.alpha > 0.01;
    return false;
  });

  particles.forEach(p => {
    if (p.type === "star") {
      p.tail.push({x: p.x, y: p.y});
      if (p.tail.length > 18) p.tail.shift();
      p.x += p.vx; p.y += p.vy;
      p.alpha -= 0.018;
    }
    if (p.type === "bubble") {
      p.wobble += 0.03;
      p.x += p.vx + Math.sin(p.wobble) * 0.4;
      p.y += p.vy;
      if (p.y < pCanvas.height * 0.1) p.alpha -= 0.01;
    }
    if (p.type === "puff") {
      p.x += p.vx; p.y += p.vy;
      p.rotation += p.rotSpeed;
      if (p.y < pCanvas.height * 0.15) p.alpha -= 0.003;
    }
  });
}

function drawParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

  if (theme === "galaxy") {
    bgStars.forEach(s => {
      s.phase += s.speed;
      const a = (Math.sin(s.phase) + 1) / 2 * 0.8 + 0.1;
      pCtx.save();
      pCtx.globalAlpha = a;
      pCtx.fillStyle = "#ffffff";
      pCtx.beginPath();
      pCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.restore();
    });
  }

  particles.forEach(p => {
    pCtx.save();

    if (p.type === "star") {
      for (let i = 1; i < p.tail.length; i++) {
        const ratio = i / p.tail.length;
        pCtx.globalAlpha = ratio * p.alpha;
        pCtx.strokeStyle = "rgba(220,180,255,1)";
        pCtx.lineWidth = ratio * 3;
        pCtx.beginPath();
        pCtx.moveTo(p.tail[i-1].x, p.tail[i-1].y);
        pCtx.lineTo(p.tail[i].x,   p.tail[i].y);
        pCtx.stroke();
      }
      pCtx.globalAlpha = p.alpha;
      const gr = pCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(1, "rgba(180,100,255,0)");
      pCtx.fillStyle = gr;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      pCtx.fill();
    }

    if (p.type === "bubble") {
      pCtx.globalAlpha = p.alpha;
      const gr = pCtx.createRadialGradient(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.05, p.x, p.y, p.r);
      gr.addColorStop(0, "rgba(255,255,255,0.7)");
      gr.addColorStop(0.4, "rgba(150,230,255,0.25)");
      gr.addColorStop(1,   "rgba(0,180,220,0.15)");
      pCtx.fillStyle = gr;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.strokeStyle = `rgba(100,220,255,${p.alpha * 0.7})`;
      pCtx.lineWidth = 1.5;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.stroke();
      /* shine dot */
      pCtx.fillStyle = `rgba(255,255,255,${p.alpha * 0.8})`;
      pCtx.beginPath();
      pCtx.arc(p.x - p.r*0.3, p.y - p.r*0.3, p.r*0.2, 0, Math.PI*2);
      pCtx.fill();
    }

    if (p.type === "puff") {
      pCtx.globalAlpha = p.alpha;
      pCtx.translate(p.x, p.y);
      pCtx.rotate(p.rotation);
      const offsets = [[0,0,1],[-.5,-.3,.75],[.5,-.25,.7],[.6,.2,.6],[-.55,.15,.65],[0,.45,.55]];
      offsets.forEach(([ox,oy,rs]) => {
        const gr = pCtx.createRadialGradient(ox*p.r*.8, oy*p.r*.8, 0, ox*p.r*.8, oy*p.r*.8, p.r*rs);
        gr.addColorStop(0, "#fff");
        gr.addColorStop(0.4, p.color);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        pCtx.fillStyle = gr;
        pCtx.beginPath();
        pCtx.arc(ox*p.r*0.8, oy*p.r*0.8, p.r*rs, 0, Math.PI*2);
        pCtx.fill();
      });
    }

    pCtx.restore();
  });
}

/* ══════════════════════════════════════════════════════════
   JEWEL BLOCK DRAWING
   FIX: use ctx.save/restore so alpha & shadow never leak out
        use manual roundedRect() instead of ctx.roundRect()
══════════════════════════════════════════════════════════ */
function drawJewelBlock(ctx, x, y, size, colorSet, alpha) {
  if (!colorSet) return;
  ctx.save();                          /* ← isolate all state changes */
  ctx.globalAlpha = (alpha !== undefined) ? alpha : 1;

  const {main, light, dark, shine} = colorSet;
  const pad = 1.5;
  const bx  = x + pad, by = y + pad, bs = size - pad * 2;
  const bev = bs * 0.2;

  /* outer glow */
  ctx.shadowColor = main;
  ctx.shadowBlur  = 12;

  /* main fill */
  const gFill = ctx.createLinearGradient(bx, by, bx + bs, by + bs);
  gFill.addColorStop(0,   light);
  gFill.addColorStop(0.4, main);
  gFill.addColorStop(1,   dark);
  ctx.fillStyle = gFill;
  roundedRect(ctx, bx, by, bs, bs, 5);
  ctx.fill();

  /* turn off shadow for the rest */
  ctx.shadowBlur  = 0;
  ctx.shadowColor = "transparent";

  /* top-left bevel highlight */
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(bx,        by);
  ctx.lineTo(bx + bs,   by);
  ctx.lineTo(bx+bs-bev, by+bev);
  ctx.lineTo(bx+bev,    by+bev);
  ctx.lineTo(bx,        by+bs);
  ctx.closePath();
  ctx.fill();

  /* bottom-right bevel shadow */
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.moveTo(bx+bs,     by);
  ctx.lineTo(bx+bs,     by+bs);
  ctx.lineTo(bx,        by+bs);
  ctx.lineTo(bx+bev,    by+bs-bev);
  ctx.lineTo(bx+bs-bev, by+bs-bev);
  ctx.lineTo(bx+bs-bev, by+bev);
  ctx.closePath();
  ctx.fill();

  /* inner diamond shine */
  const cx2 = bx + bs/2, cy2 = by + bs/2, dh = bs * 0.22;
  ctx.fillStyle  = shine;
  ctx.globalAlpha = (alpha !== undefined) ? alpha * 0.6 : 0.6;
  ctx.beginPath();
  ctx.moveTo(cx2,           cy2 - dh);
  ctx.lineTo(cx2 + dh*0.6,  cy2);
  ctx.lineTo(cx2,           cy2 + dh*0.5);
  ctx.lineTo(cx2 - dh*0.6,  cy2);
  ctx.closePath();
  ctx.fill();

  /* corner gloss */
  ctx.fillStyle  = "#ffffff";
  ctx.globalAlpha = (alpha !== undefined) ? alpha * 0.75 : 0.75;
  ctx.beginPath();
  ctx.ellipse(bx + bs*0.27, by + bs*0.24, bs*0.12, bs*0.07, -0.5, 0, Math.PI*2);
  ctx.fill();

  /* outline */
  ctx.globalAlpha = (alpha !== undefined) ? alpha * 0.5 : 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth   = 1;
  roundedRect(ctx, bx, by, bs, bs, 5);
  ctx.stroke();

  ctx.restore();                       /* ← restore ALL state */
}

/* ══════════════════════════════════════════════════════════
   BOARD RENDERING
══════════════════════════════════════════════════════════ */
function getThemeColors(key) {
  return JEWEL_COLORS[theme][key];
}

function drawBoard() {
  /* CLEAR the canvas completely every frame */
  gCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

  /* background tint */
  gCtx.save();
  gCtx.fillStyle = theme === "candy"
    ? "rgba(60,0,30,0.50)"
    : theme === "ocean"
    ? "rgba(0,10,40,0.70)"
    : "rgba(5,0,20,0.75)";
  gCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  gCtx.restore();

  /* grid lines */
  gCtx.save();
  gCtx.strokeStyle = theme === "candy"
    ? "rgba(255,100,200,0.10)"
    : theme === "ocean"
    ? "rgba(0,150,200,0.10)"
    : "rgba(150,80,255,0.10)";
  gCtx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    gCtx.beginPath();
    gCtx.moveTo(0, r * CELL);
    gCtx.lineTo(gameCanvas.width, r * CELL);
    gCtx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    gCtx.beginPath();
    gCtx.moveTo(c * CELL, 0);
    gCtx.lineTo(c * CELL, gameCanvas.height);
    gCtx.stroke();
  }
  gCtx.restore();

  /* placed blocks */
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawJewelBlock(gCtx, c * CELL, r * CELL, CELL, getThemeColors(board[r][c]));
      }
    }
  }
}

function drawGhost() {
  if (!currentPiece || gameState !== "playing") return;
  let ghostY = currentPiece.y;
  while (!collides(currentPiece.shape, currentPiece.x, ghostY + 1)) ghostY++;
  if (ghostY === currentPiece.y) return;

  /* FIX: pass alpha as parameter, never touch ctx.globalAlpha externally */
  currentPiece.shape.forEach((row, dr) => {
    row.forEach((v, dc) => {
      if (v) {
        const px = (currentPiece.x + dc) * CELL;
        const py = (ghostY + dr) * CELL;
        if (py >= 0) drawJewelBlock(gCtx, px, py, CELL, getThemeColors(currentPiece.key), 0.18);
      }
    });
  });
}

function drawCurrent() {
  if (!currentPiece || gameState !== "playing") return;
  currentPiece.shape.forEach((row, dr) => {
    row.forEach((v, dc) => {
      if (v) {
        const px = (currentPiece.x + dc) * CELL;
        const py = (currentPiece.y + dr) * CELL;
        if (py >= 0) drawJewelBlock(gCtx, px, py, CELL, getThemeColors(currentPiece.key));
      }
    });
  });
}

function drawNext() {
  nCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const shape = nextPiece.shape;
  const cols  = shape[0].length, rows = shape.length;
  const offX  = Math.floor((4 - cols) / 2);
  const offY  = Math.floor((4 - rows) / 2);
  const mini  = 28;
  shape.forEach((row, dr) => {
    row.forEach((v, dc) => {
      if (v) drawJewelBlock(nCtx, (offX+dc)*mini+2, (offY+dr)*mini+2, mini, getThemeColors(nextPiece.key));
    });
  });
}

/* ══════════════════════════════════════════════════════════
   GAME LOGIC
══════════════════════════════════════════════════════════ */
function createBoard() {
  return Array.from({length: ROWS}, () => Array(COLS).fill(null));
}

function randomPiece() {
  const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  /* spawn at y=0 so piece is immediately visible */
  return { key, shape: SHAPES[key].map(r => [...r]), x: Math.floor(COLS/2) - 1, y: 0 };
}

function collides(shape, px, py) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = px + c, ny = py + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotate(shape) {
  const rows = shape.length, cols = shape[0].length;
  const out = Array.from({length: cols}, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out[c][rows - 1 - r] = shape[r][c];
  return out;
}

function lockPiece() {
  currentPiece.shape.forEach((row, dr) => {
    row.forEach((v, dc) => {
      if (v) {
        const ny = currentPiece.y + dr;
        if (ny >= 0) board[ny][currentPiece.x + dc] = currentPiece.key;
      }
    });
  });
  clearLines();
  currentPiece = nextPiece;
  nextPiece    = randomPiece();
  drawNext();
  if (collides(currentPiece.shape, currentPiece.x, currentPiece.y)) {
    gameOver();
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(c => c !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  if (cleared > 0) {
    const pts = [0, 100, 300, 500, 800];
    score += (pts[cleared] || 800) * level;
    lines += cleared;
    level  = Math.floor(lines / 10) + 1;
    updateUI();
    if (score > highScore) { highScore = score; highScEl.textContent = highScore; }
  }
}

function updateUI() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  linesEl.textContent = lines;
}

function moveDown() {
  if (!currentPiece || gameState !== "playing" || paused) return;
  if (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
  } else {
    lockPiece();
  }
}

/* ══════════════════════════════════════════════════════════
   GAME STATE MANAGEMENT
══════════════════════════════════════════════════════════ */
function startGame() {
  board        = createBoard();
  score        = 0; level = 1; lines = 0;
  paused       = false;
  gameState    = "playing";
  particles    = [];
  currentPiece = randomPiece();
  nextPiece    = randomPiece();
  lastTick     = performance.now();
  updateUI();
  drawNext();
  overlay.classList.add("hidden");
  pauseBtn.textContent = "⏸ PAUSE";
}

function pauseGame() {
  if (gameState !== "playing" && gameState !== "paused") return;
  paused    = !paused;
  gameState = paused ? "paused" : "playing";
  pauseBtn.textContent = paused ? "▶ RESUME" : "⏸ PAUSE";
  if (paused) {
    overlayTitle.textContent = "⏸ PAUSED";
    overlayMsg.textContent   = "Press P or Resume to continue";
    startBtn.textContent     = "▶ RESUME";
    overlay.classList.remove("hidden");
  } else {
    lastTick = performance.now();
    overlay.classList.add("hidden");
  }
}

function gameOver() {
  gameState = "gameover";
  overlayTitle.textContent = "💥 GAME OVER";
  overlayMsg.textContent   = `Score: ${score}`;
  startBtn.textContent     = "🔄 PLAY AGAIN";
  overlay.classList.remove("hidden");
}

/* ══════════════════════════════════════════════════════════
   INPUT
══════════════════════════════════════════════════════════ */
document.addEventListener("keydown", e => {
  if (e.key === "p" || e.key === "P") {
    if (gameState === "playing" || gameState === "paused") pauseGame();
    return;
  }
  if (!currentPiece || gameState !== "playing" || paused) return;

  switch (e.key) {
    case "ArrowLeft":
      if (!collides(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) currentPiece.x--;
      break;
    case "ArrowRight":
      if (!collides(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) currentPiece.x++;
      break;
    case "ArrowDown":
      e.preventDefault();
      if (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) { currentPiece.y++; score += 1; }
      else lockPiece();
      break;
    case "ArrowUp": {
      e.preventDefault();
      const rot = rotate(currentPiece.shape);
      let kick = 0;
      if (collides(rot, currentPiece.x, currentPiece.y)) {
        if      (!collides(rot, currentPiece.x+1, currentPiece.y)) kick=1;
        else if (!collides(rot, currentPiece.x-1, currentPiece.y)) kick=-1;
        else if (!collides(rot, currentPiece.x+2, currentPiece.y)) kick=2;
        else if (!collides(rot, currentPiece.x-2, currentPiece.y)) kick=-2;
      }
      if (!collides(rot, currentPiece.x + kick, currentPiece.y)) {
        currentPiece.shape = rot;
        currentPiece.x    += kick;
      }
      break;
    }
    case " ":
      e.preventDefault();
      while (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 2;
      }
      lockPiece();
      break;
  }
  updateUI();
});

/* ══════════════════════════════════════════════════════════
   THEME SWITCHING
══════════════════════════════════════════════════════════ */
themeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    theme = btn.dataset.theme;
    document.body.className = `theme-${theme}`;
    themeBtns.forEach(b => b.classList.toggle("active", b === btn));
    particles = [];
    if (theme === "galaxy") initBgStars();
  });
});

/* ══════════════════════════════════════════════════════════
   BUTTON HANDLERS
══════════════════════════════════════════════════════════ */
startBtn.addEventListener("click", () => {
  if (gameState === "paused") pauseGame();
  else startGame();
});
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", startGame);

/* ══════════════════════════════════════════════════════════
   MAIN GAME LOOP
══════════════════════════════════════════════════════════ */
let prevTime = 0;
function loop(ts) {
  const dt = ts - prevTime || 0;
  prevTime = ts;

  /* gravity */
  if (gameState === "playing" && !paused) {
    const tickMs = Math.max(TICK_MIN, TICK_START - (level - 1) * 70);
    if (ts - lastTick >= tickMs) {
      lastTick = ts;
      moveDown();
    }
  }

  /* particles */
  updateParticles(dt);
  drawParticles();

  /* board – always draw so we see the grid even on start screen */
  if (board) {
    drawBoard();
    drawGhost();
    drawCurrent();
  } else {
    /* before first game: just draw empty dark board */
    gCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    gCtx.save();
    gCtx.fillStyle = "rgba(5,0,20,0.75)";
    gCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    gCtx.restore();
  }

  requestAnimationFrame(loop);
}

/* ── Kick off ── */
gameState = "start";
overlayTitle.textContent = "💎 JEWEL TETRIS";
overlayMsg.textContent   = "Choose a theme and press Start!";
startBtn.textContent     = "▶ START GAME";
requestAnimationFrame(loop);
