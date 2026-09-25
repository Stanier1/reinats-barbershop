// A small score synthesised in the browser: a warm pad that changes chord per scene, vinyl crackle,
// a clipper motor for the skin fade and one-shot snips and razor rings. Nothing plays until the
// visitor turns sound on.
export function createSound() {
  let ctx = null, master, filter, buzzGain, on = false, chord = -1;
  const voices = [];
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = [[45, 52, 55, 59, 60], [41, 48, 52, 55, 57], [48, 55, 59, 62, 64], [43, 50, 52, 57, 59]];

  function noiseBuffer(sec, fn) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = fn(i, len); return b;
  }
  function init() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.37; const fb = ctx.createGain(); fb.gain.value = 0.38; const wet = ctx.createGain(); wet.gain.value = 0.28;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 950; filter.Q.value = 0.8; filter.connect(master); filter.connect(delay);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06; const lfoG = ctx.createGain(); lfoG.gain.value = 380; lfo.connect(lfoG); lfoG.connect(filter.frequency); lfo.start();
    CHORDS[0].forEach((m, i) => {
      const a = ctx.createOscillator(), b = ctx.createOscillator(); a.type = 'triangle'; b.type = 'sine';
      a.frequency.value = midi(m); b.frequency.value = midi(m) * 1.004;
      const g = ctx.createGain(); g.gain.value = 0.05 / (1 + i * 0.2); a.connect(g); b.connect(g); g.connect(filter); a.start(); b.start(); voices.push([a, b]);
    });
    const crackle = ctx.createBufferSource(); crackle.loop = true;
    crackle.buffer = noiseBuffer(2.5, () => (Math.random() * 2 - 1) * 0.018 + (Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.6 : 0));
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400; const cg = ctx.createGain(); cg.gain.value = 0.3;
    crackle.connect(hp); hp.connect(cg); cg.connect(master); crackle.start();
    const m1 = ctx.createOscillator(), m2 = ctx.createOscillator(); m1.type = 'sawtooth'; m2.type = 'square'; m1.frequency.value = 118; m2.frequency.value = 236.6;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 760; bp.Q.value = 1.3;
    buzzGain = ctx.createGain(); buzzGain.gain.value = 0; m1.connect(bp); m2.connect(bp); bp.connect(buzzGain); buzzGain.connect(master); m1.start(); m2.start();
    return true;
  }
  function burst(t, dur, freq, gain, type = 'highpass') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(dur, (i, n) => (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3));
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(master); s.start(t); return f;
  }
  return {
    get on() { return on; },
    toggle() {
      if (!ctx && !init()) return false;
      on = !on; if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(on ? 0.75 : 0, t, on ? 0.7 : 0.12);
      return on;
    },
    scene(i) {
      if (!ctx) return; const k = i % CHORDS.length; if (k === chord) return; chord = k;
      const t = ctx.currentTime; voices.forEach(([a, b], v) => { const f = midi(CHORDS[k][v]); a.frequency.setTargetAtTime(f, t, 0.6); b.frequency.setTargetAtTime(f * 1.004, t, 0.6); });
    },
    buzz(level) { if (ctx) buzzGain.gain.setTargetAtTime(on ? level * 0.07 : 0, ctx.currentTime, 0.06); },
    snip() { if (!ctx || !on) return; const t = ctx.currentTime; burst(t, 0.04, 4200, 0.55); burst(t + 0.055, 0.03, 5200, 0.4); },
    shing() {
      if (!ctx || !on) return; const t = ctx.currentTime;
      const f = burst(t, 0.45, 2200, 0.28, 'bandpass'); f.Q.value = 6; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(8000, t + 0.3);
      const o = ctx.createOscillator(); o.frequency.value = 3150; const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 1);
    },
    pause() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && on && ctx.state === 'suspended') ctx.resume(); },
  };
}
