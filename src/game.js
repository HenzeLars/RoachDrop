// Core deterministic game engine. Rendering & audio are kept separate. 🪳
import {
  COLS, ROWS, HIDDEN, TOTAL_ROWS, LOCK_DELAY, MAX_LOCK_RESETS,
  DAS, ARR, LINES_PER_LEVEL, GRAVITY,
} from './constants.js';
import { Bag } from './rng.js';
import { SHAPES, BOX, kicksFor } from './pieces.js';

export class Game {
  constructor() {
    this.bag = new Bag();
    this.grid = this._emptyGrid();
    this.reset();
  }

  _emptyGrid() {
    return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
  }

  reset() {
    this.grid = this._emptyGrid();
    this.bag = new Bag();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.highScore = this._loadHigh();
    this.hold = null;
    this.canHold = true;
    this.nextQueue = [this.bag.next(), this.bag.next(), this.bag.next()];
    this.state = 'ready'; // ready | playing | paused | over
    this._timers = { gravity: 0, lock: 0, lockResets: 0 };
    this._grounded = false;
    this._events = [];
    this._spawn();
  }

  _loadHigh() {
    try { return parseInt(localStorage.getItem('roachdrop.high') || '0', 10) || 0; }
    catch { return 0; }
  }

  _saveHigh() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try { localStorage.setItem('roachdrop.high', String(this.highScore)); } catch {}
    }
  }

  start() {
    if (this.state === 'ready' || this.state === 'over') {
      if (this.state === 'over') this.reset();
      this.state = 'playing';
    } else if (this.state === 'paused') {
      this.state = 'playing';
    }
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }

  _spawn(type) {
    let t;
    if (type) {
      t = type; // holding: swap in a specific piece, queue unchanged
    } else {
      t = this.nextQueue.shift();     // consume the real front of the queue
      this.nextQueue.push(this.bag.next()); // advance the bag to refill
    }
    const box = BOX[t];
    const cells = SHAPES[t][0];
    const maxX = Math.max(...cells.map(c => c[0]));
    const x = Math.floor((COLS - (maxX + 1)) / 2);
    this.piece = { type: t, rot: 0, x, y: 0 };
    this._grounded = false;
    this._timers.lock = 0;
    this._timers.lockResets = 0;
    if (this._collides(this.piece)) {
      this._gameOver();
    }
  }

  _cells(piece, rot = piece.rot) {
    return SHAPES[piece.type][rot].map(([cx, cy]) => ({
      x: piece.x + cx,
      y: piece.y + cy,
    }));
  }

  _collides(piece) {
    for (const { x, y } of this._cells(piece)) {
      if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
      if (y >= 0 && this.grid[y][x]) return true;
    }
    return false;
  }

  _emit(type, data) { this._events.push({ type, ...data }); }
  drainEvents() { const e = this._events; this._events = []; return e; }

  // --- Player actions (each returns true if it acted) ---
  move(dx) {
    if (this.state !== 'playing') return false;
    const p = { ...this.piece, x: this.piece.x + dx };
    if (!this._collides(p)) {
      this.piece = p;
      this._afterMove();
      this._emit('move');
      return true;
    }
    return false;
  }

  rotate(dir) { // dir: 1 CW, -1 CCW
    if (this.state !== 'playing' || this.piece.type === 'O') return false;
    const from = this.piece.rot;
    const to = (from + (dir === 1 ? 1 : 3)) % 4;
    for (const [dx, dy] of kicksFor(this.piece.type, from, to)) {
      const p = { ...this.piece, rot: to, x: this.piece.x + dx, y: this.piece.y + dy };
      if (!this._collides(p)) {
        this.piece = p;
        this._afterMove();
        this._emit('rotate');
        return true;
      }
    }
    return false;
  }

  softDrop() {
    if (this.state !== 'playing') return false;
    const p = { ...this.piece, y: this.piece.y + 1 };
    if (!this._collides(p)) {
      this.piece = p;
      this.score += 1;
      this._grounded = false;
      this._timers.gravity = 0;
      return true;
    }
    return false;
  }

  hardDrop() {
    if (this.state !== 'playing') return false;
    let dist = 0;
    while (true) {
      const p = { ...this.piece, y: this.piece.y + 1 };
      if (this._collides(p)) break;
      this.piece = p;
      dist++;
    }
    this.score += dist * 2;
    this._emit('harddrop', { dist });
    this._lock();
    return true;
  }

  holdPiece() {
    if (this.state !== 'playing' || !this.canHold) return false;
    const cur = this.piece.type;
    if (this.hold) {
      const swap = this.hold;
      this.hold = cur;
      this._spawn(swap);
    } else {
      this.hold = cur;
      this._spawn();
    }
    this.canHold = false;
    this._emit('hold');
    return true;
  }

  _afterMove() {
    // Reset lock timer on successful move/rotate while grounded (capped).
    if (this._grounded && this._timers.lockResets < MAX_LOCK_RESETS) {
      this._timers.lock = 0;
      this._timers.lockResets++;
    }
  }

  // Ghost landing Y for current piece.
  ghostY() {
    let y = this.piece.y;
    while (true) {
      const p = { ...this.piece, y: y + 1 };
      if (this._collides(p)) break;
      y++;
    }
    return y;
  }

  _lock() {
    for (const { x, y } of this._cells(this.piece)) {
      if (y >= 0 && y < TOTAL_ROWS) this.grid[y][x] = this.piece.type;
    }
    this._emit('lock');
    this._clearLines();
    this.canHold = true;
    this._spawn();
  }

  _clearLines() {
    let cleared = 0;
    const clearedRows = [];
    for (let y = TOTAL_ROWS - 1; y >= 0; y--) {
      if (this.grid[y].every(c => c)) {
        clearedRows.push(y);
        this.grid.splice(y, 1);
        this.grid.unshift(Array(COLS).fill(null));
        cleared++;
        y++; // recheck same index
      }
    }
    if (cleared > 0) {
      this.combo++;
      const table = [0, 100, 300, 500, 800];
      const comboBonus = Math.max(0, this.combo) * 50;
      this.score += (table[cleared] + comboBonus) * this.level;
      this.lines += cleared;
      const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
      if (newLevel !== this.level) {
        this.level = newLevel;
        this._emit('levelup', { level: this.level });
      }
      // Emit the board cells that were cleared (full rows) so the renderer can burst them.
      const cells = [];
      for (const row of clearedRows) {
        for (let x = 0; x < COLS; x++) cells.push({ x, y: row });
      }
      this._emit('clear', { cleared, combo: this.combo, cells });
    } else {
      this.combo = -1;
    }
  }

  _gameOver() {
    this.state = 'over';
    this._saveHigh();
    this._emit('gameover');
  }

  // Fixed-timestep update. dt in ms.
  update(dt) {
    if (this.state !== 'playing') return;
    const g = GRAVITY[Math.min(this.level - 1, GRAVITY.length - 1)];

    this._timers.gravity += dt;
    while (this._timers.gravity >= g) {
      this._timers.gravity -= g;
      const p = { ...this.piece, y: this.piece.y + 1 };
      if (!this._collides(p)) {
        this.piece = p;
        this._grounded = false;
      } else {
        this._grounded = true;
        break;
      }
    }

    // Ground / lock handling
    const below = { ...this.piece, y: this.piece.y + 1 };
    if (this._collides(below)) {
      this._grounded = true;
      this._timers.lock += dt;
      if (this._timers.lock >= LOCK_DELAY) this._lock();
    } else {
      this._grounded = false;
      this._timers.lock = 0;
    }
  }
}