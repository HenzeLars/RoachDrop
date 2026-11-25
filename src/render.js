// Canvas 2D renderer. Pure drawing — reads game state, never mutates it. 🪳
import { COLS, ROWS, HIDDEN, TOTAL_ROWS, COLORS, PIECE_COLORS } from './constants.js';
import { SHAPES } from './pieces.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cell = 30;
    this.shake = 0;
    this.strobe = 0;
    this.particles = [];
    this._resize();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.cell = Math.floor(this.canvas.clientWidth / COLS);
    this.canvas.width = this.cell * COLS * dpr;
    this.canvas.height = this.cell * ROWS * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = this.cell * COLS;
    this.h = this.cell * ROWS;
  }

  addShake(amount) { this.shake = Math.max(this.shake, amount); }
  addStrobe(amount) { this.strobe = Math.max(this.strobe, amount); }

  burst(cells) {
    for (const { x, y } of cells) {
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: (x + 0.5) * this.cell,
          y: (y + 0.5) * this.cell,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6 - 2,
          life: 1,
          color: PIECE_COLORS[Math.random() < 0.5 ? 'T' : 'Z'],
        });
      }
    }
  }

  _block(x, y, color, alpha = 1, ghost = false) {
    const c = this.ctx;
    const px = x * this.cell;
    const py = y * this.cell;
    const s = this.cell;
    c.save();
    c.globalAlpha = alpha;
    if (ghost) {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(px + 2, py + 2, s - 4, s - 4);
      c.globalAlpha = alpha * 0.15;
      c.fillStyle = color;
      c.fillRect(px + 2, py + 2, s - 4, s - 4);
    } else {
      c.shadowColor = color;
      c.shadowBlur = 12;
      c.fillStyle = color;
      this._roundRect(px + 1, py + 1, s - 2, s - 2, 4);
      c.fill();
      c.shadowBlur = 0;
      // bevel highlight
      c.fillStyle = 'rgba(255,255,255,0.25)';
      this._roundRect(px + 3, py + 3, s - 6, (s - 6) / 2, 3);
      c.fill();
    }
    c.restore();
  }

  _roundRect(x, y, w, h, r) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  render(game, time) {
    const c = this.ctx;
    if (this.canvas.clientWidth && Math.floor(this.canvas.clientWidth / COLS) !== this.cell) {
      this._resize();
    }
    c.clearRect(0, 0, this.w, this.h);

    // background
    c.fillStyle = COLORS.bg;
    c.fillRect(0, 0, this.w, this.h);

    c.save();
    if (this.shake > 0.1) {
      c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.shake *= 0.85;
    }

    // grid lines
    c.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      c.strokeStyle = COLORS.grid;
      c.beginPath(); c.moveTo(x * this.cell, 0); c.lineTo(x * this.cell, this.h); c.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      c.strokeStyle = COLORS.grid;
      c.beginPath(); c.moveTo(0, y * this.cell); c.lineTo(this.w, y * this.cell); c.stroke();
    }

    // settled blocks
    for (let y = HIDDEN; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = game.grid[y][x];
        if (t) this._block(x, y - HIDDEN, PIECE_COLORS[t]);
      }
    }

    if (game.piece) {
      // ghost
      const gy = game.ghostY();
      const ghostCells = SHAPES[game.piece.type][game.piece.rot].map(([cx, cy]) => ({
        x: game.piece.x + cx, y: gy + cy - HIDDEN,
      }));
      for (const g of ghostCells) {
        if (g.y >= 0) this._block(g.x, g.y, PIECE_COLORS[game.piece.type], 0.5, true);
      }
      // active piece
      const cells = SHAPES[game.piece.type][game.piece.rot].map(([cx, cy]) => ({
        x: game.piece.x + cx, y: game.piece.y + cy - HIDDEN,
      }));
      for (const g of cells) {
        if (g.y >= 0) this._block(g.x, g.y, PIECE_COLORS[game.piece.type], 1, false);
      }
    }

    // particles
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.03;
      if (p.life <= 0) continue;
      c.globalAlpha = p.life;
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, 4, 4);
    }
    c.globalAlpha = 1;
    this.particles = this.particles.filter(p => p.life > 0);

    c.restore();

    // strobe border on 4-line drop
    if (this.strobe > 0.01) {
      c.save();
      c.globalAlpha = this.strobe;
      c.strokeStyle = COLORS.pink;
      c.lineWidth = 6;
      c.shadowColor = COLORS.pink;
      c.shadowBlur = 30;
      c.strokeRect(3, 3, this.w - 6, this.h - 6);
      c.restore();
      this.strobe *= 0.9;
    }
  }
}