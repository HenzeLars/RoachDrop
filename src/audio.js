// Procedural Web Audio synth. Zero samples, zero external requests. 🪳
// Everything is synthesized live: kicks, hats, stabs, the 4-line DROP, and a
// driving techno pulse that intensifies with level.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.volume = 0.8;
    this.musicOn = true;
    this._musicTimer = null;
    this._step = 0;
    this._bpm = 162;
    this._level = 1;
  }

  // Must be called from a user gesture (click/keydown).
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master && !this.muted) this.master.gain.value = v;
  }

  setLevel(level) {
    this._level = level;
    this._bpm = Math.min(200, 158 + level * 3);
  }

  _env(node, t, a, d, peak = 1) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _osc(type, freq, t, dur, gain, dest) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    this._env(g, t, 0.005, dur, gain);
    o.connect(g).connect(dest || this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  // Crisp short click for move/rotate.
  click(high = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this._noiseBuffer();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = high ? 7000 : 5000;
    const g = this.ctx.createGain();
    this._env(g, t, 0.001, 0.03, 0.25);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.05);
  }

  // Punchy sub kick for hard drop.
  kick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    this._env(g, t, 0.002, 0.22, 0.9);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
  }

  // Filtered synth stab for line clears; pitch scales with combo.
  stab(lines, combo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const base = 220 * Math.pow(2, (combo + lines) / 12);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(4000, t + 0.08);
    lp.Q.value = 8;
    lp.connect(this.master);
    [1, 1.5, 2].forEach((m) => this._osc('sawtooth', base * m, t, 0.25, 0.18, lp));
  }

  // Punchier ascending arpeggio for multi-line clears (2-3). Scales with lines.
  multiClear(lines, combo) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const root = 330 * Math.pow(2, Math.max(0, combo) / 12);
    // Ascending notes — one per cleared line, plus a sparkle on top.
    const steps = lines + 1;
    for (let i = 0; i < steps; i++) {
      const t = t0 + i * 0.055;
      const freq = root * Math.pow(2, i / 6);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(600, t);
      lp.frequency.exponentialRampToValueAtTime(6000, t + 0.06);
      lp.Q.value = 6;
      lp.connect(this.master);
      this._osc('sawtooth', freq, t, 0.22, 0.16, lp);
      this._osc('square', freq * 2, t, 0.12, 0.06, lp);
    }
    // Noise transient "snap" on the downbeat for impact.
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;
    const ng = this.ctx.createGain();
    this._env(ng, t0, 0.001, 0.12, 0.3);
    src.connect(hp).connect(ng).connect(this.master);
    src.start(t0);
    src.stop(t0 + 0.16);
    // Pitch-sweeping sub kick — the "boom". Bigger for triple.
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, t0);
    o.frequency.exponentialRampToValueAtTime(38, t0 + 0.28);
    this._env(g, t0, 0.003, 0.34, lines >= 3 ? 1.0 : 0.85);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + 0.4);
    // Extra sub layer for the triple so it really lands.
    if (lines >= 3) this._osc('sine', 70, t0, 0.3, 0.7);
    // "da-dim" — two descending notes under the drum, double only.
    if (lines === 2) {
      this._osc('triangle', 392, t0 + 0.02, 0.16, 0.28);       // "da" (G4)
      this._osc('triangle', 311, t0 + 0.18, 0.22, 0.28);       // "dim" (Eb4)
    }
  }

  // Heavy impact + strobe for the 4-line DROP.
  massiveDrop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // sub boom
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    this._env(g, t, 0.005, 0.8, 1.0);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.9);
    // bright crash
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 0.7;
    const ng = this.ctx.createGain();
    this._env(ng, t, 0.005, 0.6, 0.5);
    src.connect(bp).connect(ng).connect(this.master);
    src.start(t);
    src.stop(t + 0.7);
  }

  gameOver() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [330, 247, 165].forEach((f, i) => {
      this._osc('triangle', f, t + i * 0.14, 0.3, 0.3);
    });
  }

  // --- Background techno loop ---
  startMusic() {
    if (!this.ctx || !this.musicOn || this._musicTimer) return;
    this._step = 0;
    const tick = () => {
      const stepDur = 60 / this._bpm / 4; // 16th notes
      this._musicStep(this._step, this.ctx.currentTime + 0.02);
      this._step = (this._step + 1) % 32;
      this._musicTimer = setTimeout(tick, stepDur * 1000);
    };
    tick();
  }

  stopMusic() {
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
  }

  setMusic(on) {
    this.musicOn = on;
    if (!on) this.stopMusic();
    else this.startMusic();
  }

  _musicStep(step, t) {
    const dest = this.musicGain;
    const s = step % 16;
    // Four-on-the-floor kick
    if (s % 4 === 0) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
      this._env(g, t, 0.002, 0.16, 0.5);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + 0.2);
    }
    // Off-beat open hat
    if (s % 4 === 2) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuffer();
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 8000;
      const g = this.ctx.createGain();
      this._env(g, t, 0.001, 0.05, 0.12);
      src.connect(hp).connect(g).connect(dest);
      src.start(t); src.stop(t + 0.08);
    }
    // Driving bassline on 16ths, root shifts every bar, intensifies with level
    const roots = [55, 55, 73.42, 49];
    const root = roots[Math.floor(step / 8) % roots.length];
    if (s % 2 === 0) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 300 + this._level * 40;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(root * (s % 8 === 4 ? 2 : 1), t);
      this._env(g, t, 0.005, 0.12, 0.22);
      o.connect(lp).connect(g).connect(dest);
      o.start(t); o.stop(t + 0.16);
    }
  }

  _noiseBuffer() {
    if (this._nb) return this._nb;
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._nb = buf;
    return buf;
  }
}