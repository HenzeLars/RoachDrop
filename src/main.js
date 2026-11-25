// RoachDrop entry point — wires engine, renderer, audio, input, and UI. 🪳
import { Game } from './game.js';
import { Renderer } from './render.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { MASCOT_SVG, setMascotState } from './mascot.js';
import { PIECE_COLORS, HIDDEN, TOTAL_ROWS, COLS } from './constants.js';
import { SHAPES, BOX } from './pieces.js';

const $ = (id) => document.getElementById(id);

const canvas = $('board');
const game = new Game();
const renderer = new Renderer(canvas);
const audio = new AudioEngine();
const input = new Input(game, audio);

// Inject mascot
const mascotWrap = $('mascot');
mascotWrap.innerHTML = MASCOT_SVG;
// State is set on the wrapper (.mascot) since that's what the CSS keys off.
const mascotEl = mascotWrap;

// Unlock audio on first interaction
const unlock = () => { audio.ensure(); audio.resume(); if (game.state === 'playing') audio.startMusic(); };
input._onFirst = unlock;
window.addEventListener('pointerdown', unlock, { once: false });

// UI controls
$('muteBtn').addEventListener('click', () => toggleMute());
$('musicBtn').addEventListener('click', () => {
  audio.ensure();
  audio.setMusic(!audio.musicOn);
  $('musicBtn').textContent = audio.musicOn ? '♫ Music On' : '♫ Music Off';
});
$('startBtn').addEventListener('click', () => { unlock(); game.start(); audio.startMusic(); });

function reflectMute() {
  $('muteBtn').textContent = audio.muted ? '🔇 Sound: Off' : '🔊 Sound: On';
  $('muteBtn').classList.toggle('off', audio.muted);
}
function toggleMute() {
  audio.ensure();
  audio.setMuted(!audio.muted);
  try { localStorage.setItem('roachdrop.muted', audio.muted ? '1' : '0'); } catch {}
  reflectMute();
}
// Restore saved sound preference.
try { audio.muted = localStorage.getItem('roachdrop.muted') === '1'; } catch {}
reflectMute();
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') toggleMute();
});

// Auto-pause when focus leaves the window or the tab is hidden.
function autoPause() {
  if (game.state === 'playing') {
    game.togglePause();
    audio.stopMusic();
  }
}
window.addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) autoPause();
});

// Small preview renderer for hold + next
function drawPreview(canvasEl, type) {
  const c = canvasEl.getContext('2d');
  const w = canvasEl.width, h = canvasEl.height;
  c.clearRect(0, 0, w, h);
  if (!type) return;
  const cells = SHAPES[type][0];
  const box = BOX[type];
  const xs = cells.map(p => p[0]), ys = cells.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pw = maxX - minX + 1, ph = maxY - minY + 1;
  const s = Math.min(w / (pw + 1), h / (ph + 1), 22);
  const ox = (w - pw * s) / 2, oy = (h - ph * s) / 2;
  const r = Math.max(2, s * 0.18);
  for (const [cx, cy] of cells) {
    const x = ox + (cx - minX) * s, y = oy + (cy - minY) * s;
    // glow body
    c.shadowColor = PIECE_COLORS[type];
    c.shadowBlur = 10;
    c.fillStyle = PIECE_COLORS[type];
    _rr(c, x + 1, y + 1, s - 2, s - 2, r);
    c.fill();
    // bevel highlight (matches board blocks)
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.25)';
    _rr(c, x + 3, y + 3, s - 6, (s - 6) / 2, r * 0.7);
    c.fill();
  }
  c.shadowBlur = 0;
}

// rounded-rect path helper (shared by previews)
function _rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// HUD update
let lastHud = {};
function updateHud() {
  const hud = {
    score: game.score, high: game.highScore, lines: game.lines,
    level: game.level, combo: Math.max(0, game.combo),
    hold: game.hold, next: game.nextQueue.join(','), state: game.state,
  };
  if (hud.score !== lastHud.score) $('score').textContent = hud.score;
  if (hud.high !== lastHud.high) $('high').textContent = hud.high;
  if (hud.lines !== lastHud.lines) $('lines').textContent = hud.lines;
  if (hud.level !== lastHud.level) { $('level').textContent = hud.level; audio.setLevel(hud.level); }
  if (hud.combo !== lastHud.combo) $('combo').textContent = hud.combo > 1 ? `x${hud.combo}` : '';
  if (hud.hold !== lastHud.hold) drawPreview($('holdCanvas'), game.hold);
  if (hud.next !== lastHud.next) {
    game.nextQueue.forEach((t, i) => drawPreview($('next' + i), t));
  }
  // overlays
  $('overlay').style.display = hud.state === 'playing' ? 'none' : 'flex';
  if (hud.state === 'ready') {
    $('overlayTitle').textContent = '🪳 RoachDrop';
    $('overlayText').textContent = 'Press Enter / Space to start';
  } else if (hud.state === 'paused') {
    $('overlayTitle').textContent = 'Paused';
    $('overlayText').textContent = 'Press P / Esc to resume';
  } else if (hud.state === 'over') {
    $('overlayTitle').textContent = 'Game Over 🪳';
    $('overlayText').textContent = `Score ${game.score} — Enter / Space to restart`;
    setMascotState(mascotEl, 'rip');
  }
  lastHud = hud;
}

// Event handling from engine → juice + audio
let calloutTimer = null;
function showCallout(text, ms) {
  const el = $('callout');
  if (calloutTimer) { clearTimeout(calloutTimer); calloutTimer = null; }
  el.textContent = text;
  el.classList.add('show');
  calloutTimer = setTimeout(() => { el.classList.remove('show'); calloutTimer = null; }, ms);
}
function hideCallout() {
  if (calloutTimer) { clearTimeout(calloutTimer); calloutTimer = null; }
  $('callout').classList.remove('show');
}

// Shared clear-effects: particles + sound + shake/strobe + callout + mascot.
// Used by both real line clears and the FX test buttons.
function playClearFx(cleared, combo = 0, cells = []) {
  if (cells.length) renderer.burst(cells.map(c => ({ x: c.x, y: c.y - HIDDEN })));
  if (cleared === 4) {
    audio.massiveDrop(); renderer.addStrobe(1); renderer.addShake(14);
    showCallout('MASSIVE DROP! 🪳', 900);
    setMascotState(mascotEl, 'spin', 1000);   // big spin for the 4-line drop
  } else {
    if (cleared >= 2) audio.multiClear(cleared, combo);
    else audio.stab(cleared, combo);
    // Shake ramps up hard for multi-clears so they "boom".
    renderer.addShake(cleared >= 2 ? 6 + cleared * 4 : 3);
    if (cleared >= 2) {
      renderer.addStrobe(0.4 + cleared * 0.2);
      showCallout(cleared === 3 ? 'TRIPLE! 🪳' : 'DOUBLE! 🪳', 700);
    } else {
      hideCallout(); // single: make sure no stale DOUBLE/TRIPLE lingers
    }
    // Mascot reacts per clear size.
    if (cleared === 1) setMascotState(mascotEl, 'hop');          // tiny hop
    else if (cleared === 2) setMascotState(mascotEl, 'wing');    // flap wings
    else if (cleared === 3) setMascotState(mascotEl, 'pop');     // eyes pop
    else setMascotState(mascotEl, 'hype');
  }
}

function handleEvents() {
  for (const ev of game.drainEvents()) {
    switch (ev.type) {
      case 'move': audio.click(false); break;
      case 'rotate': audio.click(true); break;
      case 'harddrop':
        audio.kick(); renderer.addShake(8);
        setMascotState(mascotEl, 'hype');
        break;
      case 'lock': break;
      case 'hold': audio.click(true); break;
      case 'clear': {
        playClearFx(ev.cleared, ev.combo, ev.cells || []);
        break;
      }
      case 'levelup': break;
      case 'gameover': audio.gameOver(); audio.stopMusic(); break;
    }
  }
}

// Fixed-timestep loop
let last = performance.now();
let acc = 0;
let prevState = game.state;
const STEP = 1000 / 60;
function frame(now) {
  let dt = now - last;
  last = now;
  if (dt > 200) dt = 200; // clamp after tab switch
  // Robust auto-pause: if the window doesn't have focus, pause (covers the
  // "typing in another window" case where blur events can be unreliable).
  if (game.state === 'playing' && !document.hasFocus()) {
    autoPause();
  }
  acc += dt;
  while (acc >= STEP) {
    game.update(STEP);
    input.update(STEP);
    acc -= STEP;
  }
  // Restart music whenever we (re)enter play (covers resume from auto-pause).
  if (game.state === 'playing' && prevState !== 'playing') {
    audio.startMusic();
  }
  prevState = game.state;
  handleEvents();
  updateHud();
  renderer.render(game, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Resize
window.addEventListener('resize', () => renderer._resize());