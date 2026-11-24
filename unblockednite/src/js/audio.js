'use strict';
// ===== Synthesized sound effects (WebAudio, no files needed) =====
const SFX = {
  ctx: null, master: null, noiseBuf: null,
  listener: null, listenerRight: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = SETTINGS.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.listener = new THREE.Vector3();
      this.listenerRight = new THREE.Vector3(1, 0, 0);
    } catch (e) { this.ctx = null; }
  },
  setVolume(v) { if (this.master) this.master.gain.value = v; },

  // ---- primitives ----
  _out(vol, pan) {
    const g = this.ctx.createGain();
    g.gain.value = vol;
    if (pan !== 0 && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan; g.connect(p); p.connect(this.master);
    } else g.connect(this.master);
    return g;
  },
  _noise(out, dur, type, f0, f1, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  },
  _tone(out, dur, wave, f0, f1, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = wave; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  },

  // volume and stereo pan of a sound at pos (null: your own sound), or null when it's too far to hear
  place(vol, pos, maxD = 260) {
    if (!this.ctx || this.ctx.state !== 'running') return null;
    let pan = 0;
    if (pos) {
      const dx = pos.x - this.listener.x, dy = pos.y - this.listener.y, dz = pos.z - this.listener.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > maxD) return null;
      vol *= Math.pow(1 - d / maxD, 2) * (1 / (1 + d / 30));
      if (vol < 0.01) return null;
      if (d > 0.5) pan = clamp((dx * this.listenerRight.x + dz * this.listenerRight.z) / d, -1, 1) * 0.8;
    }
    return { vol, pan };
  },
  play(name, vol = 1, pos = null) {
    const p = this.place(vol, pos, (name === 'sniper' || name === 'explode') ? 500 : 260);
    if (!p) return;
    const o = this._out(p.vol, p.pan);
    switch (name) {
      case 'ar': this._noise(o, 0.13, 'lowpass', 3200, 600, 0.55); this._tone(o, 0.09, 'triangle', 150, 50, 0.5); break;
      case 'smg': this._noise(o, 0.07, 'bandpass', 2200, 900, 0.5); this._tone(o, 0.05, 'square', 220, 90, 0.15); break;
      case 'pistol': this._noise(o, 0.1, 'lowpass', 3500, 700, 0.45); this._tone(o, 0.08, 'triangle', 260, 90, 0.4); break;
      case 'shotgun': this._noise(o, 0.38, 'lowpass', 1600, 200, 0.95); this._tone(o, 0.25, 'sine', 95, 35, 0.9); break;
      case 'sniper': this._noise(o, 0.6, 'lowpass', 5000, 250, 0.8); this._tone(o, 0.05, 'sawtooth', 1800, 300, 0.25); this._tone(o, 0.4, 'sine', 80, 30, 0.9); break;
      case 'laser': this._tone(o, 0.07, 'sawtooth', 1800, 900, 0.12); this._tone(o, 0.05, 'sine', 2600, 2400, 0.08); break;
      case 'cannon': this._noise(o, 0.3, 'lowpass', 3800, 300, 0.8); this._tone(o, 0.22, 'sine', 120, 40, 0.8); break;
      case 'rocket': this._noise(o, 0.7, 'bandpass', 300, 2500, 0.6); this._tone(o, 0.3, 'sawtooth', 120, 60, 0.2); break;
      case 'explode': this._noise(o, 1.2, 'lowpass', 900, 60, 1.0); this._tone(o, 0.8, 'sine', 70, 22, 1.0); break;
      case 'pickaxe': this._tone(o, 0.09, 'square', 320, 110, 0.25); this._noise(o, 0.06, 'highpass', 2500, 2500, 0.3); break;
      case 'swing': this._noise(o, 0.15, 'bandpass', 600, 1800, 0.18); break;
      case 'hit': this._tone(o, 0.06, 'sine', 950, 1300, 0.35); break;
      case 'headshot': this._tone(o, 0.09, 'sine', 1500, 2200, 0.4); this._tone(o, 0.12, 'triangle', 2400, 2600, 0.2, 0.03); break;
      case 'shieldhit': this._tone(o, 0.1, 'triangle', 700, 500, 0.35); this._noise(o, 0.08, 'highpass', 4000, 4000, 0.15); break;
      case 'shieldbreak': this._noise(o, 0.35, 'highpass', 3000, 6000, 0.5); this._tone(o, 0.3, 'triangle', 900, 200, 0.4); break;
      case 'hurt': this._tone(o, 0.15, 'sawtooth', 220, 110, 0.25); break;
      case 'build': this._tone(o, 0.07, 'triangle', 240, 360, 0.3); this._noise(o, 0.05, 'bandpass', 1200, 1200, 0.15); break;
      case 'destroy': this._noise(o, 0.3, 'lowpass', 1400, 200, 0.6); this._tone(o, 0.15, 'square', 140, 60, 0.15); break;
      case 'chest': [660, 880, 1100, 1320, 1760].forEach((f, i) => this._tone(o, 0.25, 'sine', f, f, 0.2, i * 0.06)); break;
      case 'pickup': this._tone(o, 0.09, 'sine', 520, 980, 0.3); break;
      case 'reload': this._noise(o, 0.04, 'highpass', 3000, 3000, 0.3); this._noise(o, 0.05, 'highpass', 2000, 2000, 0.35, 0.18); break;
      case 'empty': this._tone(o, 0.03, 'square', 1200, 1200, 0.1); break;
      case 'elim': [523, 659, 784].forEach((f, i) => this._tone(o, 0.35, 'triangle', f, f, 0.25, i * 0.05)); break;
      case 'heal': this._tone(o, 0.35, 'sine', 400, 900, 0.25); this._tone(o, 0.35, 'sine', 600, 1200, 0.15, 0.1); break;
      case 'shield': this._tone(o, 0.4, 'triangle', 500, 1500, 0.22); break;
      case 'storm': this._noise(o, 0.5, 'lowpass', 300, 150, 0.35); this._tone(o, 0.3, 'sawtooth', 70, 50, 0.15); break;
      case 'glide': this._noise(o, 0.9, 'lowpass', 500, 900, 0.25); break;
      case 'horn': this._tone(o, 0.35, 'sawtooth', 330, 330, 0.18); this._tone(o, 0.45, 'sawtooth', 262, 262, 0.18, 0.35); break;
      case 'click': this._tone(o, 0.04, 'sine', 800, 600, 0.2); break;
      case 'engine': this._tone(o, 0.2, 'sawtooth', 70 + vol * 160, 60 + vol * 150, 0.08); break;
      case 'victory': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this._tone(o, 0.4, 'triangle', f, f, 0.3, i * 0.12)); break;
      case 'death': [392, 330, 262, 196].forEach((f, i) => this._tone(o, 0.4, 'triangle', f, f * 0.95, 0.3, i * 0.16)); break;
      case 'stormwarn': this._tone(o, 0.6, 'sine', 300, 600, 0.25); this._tone(o, 0.6, 'sine', 300, 600, 0.25, 0.7); break;
    }
  },
};
