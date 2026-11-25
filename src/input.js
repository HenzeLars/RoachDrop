// Keyboard input with smooth DAS/ARR auto-shift. 🪳
import { DAS, ARR, SOFT_DROP } from './constants.js';

export class Input {
  constructor(game, audio) {
    this.game = game;
    this.audio = audio;
    this.down = new Set();
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.dasDir = 0;
    this.softTimer = 0;
    this._onFirst = null;

    window.addEventListener('keydown', (e) => this._down(e));
    window.addEventListener('keyup', (e) => this._up(e));
  }

  _down(e) {
    const k = e.key;
    const handled = ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','Control','Shift',
      'a','d','s','w','A','D','S','W','x','X','z','Z','c','C','p','P','Escape','Enter','m','M'];
    if (handled.includes(k)) e.preventDefault();
    if (this._onFirst) { this._onFirst(); this._onFirst = null; }

    if (e.repeat) return;
    this.down.add(k);

    switch (k) {
      case 'ArrowLeft': case 'a': case 'A':
        this.dasDir = -1; this.dasTimer = 0; this.arrTimer = 0; this.game.move(-1); break;
      case 'ArrowRight': case 'd': case 'D':
        this.dasDir = 1; this.dasTimer = 0; this.arrTimer = 0; this.game.move(1); break;
      case 'ArrowDown': case 's': case 'S':
        this.softTimer = 0; this.game.softDrop(); break;
      case ' ': this.game.hardDrop(); break;
      case 'ArrowUp': case 'x': case 'X': this.game.rotate(1); break;
      case 'z': case 'Z': case 'Control': this.game.rotate(-1); break;
      case 'c': case 'C': case 'Shift': this.game.holdPiece(); break;
      case 'p': case 'P': case 'Escape': this.game.togglePause(); break;
      case 'Enter':
        if (this.game.state === 'ready' || this.game.state === 'over') this.game.start();
        else if (this.game.state === 'paused') this.game.togglePause();
        break;
    }
  }

  _up(e) {
    const k = e.key;
    this.down.delete(k);
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
      if (this.dasDir === -1) { this.dasDir = 0; this._syncDir(); }
    }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') {
      if (this.dasDir === 1) { this.dasDir = 0; this._syncDir(); }
    }
  }

  _syncDir() {
    // If the other direction is still held, resume DAS the other way.
    if (this.down.has('ArrowLeft') || this.down.has('a') || this.down.has('A')) {
      this.dasDir = -1;
    } else if (this.down.has('ArrowRight') || this.down.has('d') || this.down.has('D')) {
      this.dasDir = 1;
    }
    this.dasTimer = 0; this.arrTimer = 0;
  }

  // Called each frame with dt in ms.
  update(dt) {
    if (this.game.state !== 'playing') return;

    // Soft drop repeat while held.
    if (this.down.has('ArrowDown') || this.down.has('s') || this.down.has('S')) {
      this.softTimer += dt;
      while (this.softTimer >= SOFT_DROP) {
        this.softTimer -= SOFT_DROP;
        if (!this.game.softDrop()) { this.softTimer = 0; break; }
      }
    } else {
      this.softTimer = 0;
    }

    // Horizontal DAS/ARR.
    if (this.dasDir === 0) return;
    this.dasTimer += dt;
    if (this.dasTimer >= DAS) {
      this.arrTimer += dt;
      while (this.arrTimer >= ARR) {
        this.arrTimer -= ARR;
        this.game.move(this.dasDir);
      }
    }
  }
}