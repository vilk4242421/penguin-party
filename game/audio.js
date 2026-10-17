/* Penguin Sumo — синтезированные звуки и музыка (без файлов) */
(function (root) {
  'use strict';
  let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  let sfxOn = true, musOn = true, hardMute = false, intensity = 0;
  let timer = null, step = 0, nextT = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = 0.16; musBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      apply(); startMusic();
    } catch (e) { ctx = null; }
  }
  function apply() { if (!master) return; master.gain.value = hardMute ? 0 : 0.55; sfxBus.gain.value = sfxOn ? 1 : 0; musBus.gain.value = musOn ? 0.16 : 0; }

  function tone(f, t, dur, type, vol, f2, bus) {
    if (!ctx || (!sfxOn && bus !== musBus)) return;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine';
    const t0 = ctx.currentTime + (t || 0);
    o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(t, dur, vol, f1, f2, type) {
    if (!ctx || !sfxOn) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.Q.value = 0.9;
    const g = ctx.createGain(); const t0 = ctx.currentTime + (t || 0);
    fl.frequency.setValueAtTime(f1, t0); fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t0); s.stop(t0 + dur + 0.02);
  }

  const fx = {
    hit(p) { tone(140 + Math.random() * 40, 0, 0.14, 'triangle', 0.25 + 0.35 * p, 60); noise(0, 0.1, 0.25 * p + 0.1, 1800, 400); },
    dash() { noise(0, 0.22, 0.28, 500, 3000); },
    ko() { noise(0, 0.5, 0.45, 2500, 300); tone(300, 0, 0.35, 'sine', 0.2, 90); },
    splash() { noise(0, 0.35, 0.3, 1500, 250); },
    pick() { tone(660, 0, 0.1, 'square', 0.13); tone(880, 0.08, 0.1, 'square', 0.13); tone(1320, 0.16, 0.18, 'square', 0.13); },
    freeze() { noise(0, 0.5, 0.25, 6000, 1500, 'highpass'); tone(1800, 0, 0.4, 'sine', 0.12, 700); },
    shock() { tone(90, 0, 0.5, 'sawtooth', 0.28, 30); noise(0, 0.4, 0.4, 800, 100); },
    shield() { tone(500, 0, 0.3, 'sine', 0.2, 1000); tone(750, 0.1, 0.3, 'sine', 0.15, 1500); },
    wind() { noise(0, 1.6, 0.18, 300, 1200); },
    tick() { tone(520, 0, 0.12, 'square', 0.16); },
    go() { tone(880, 0, 0.35, 'square', 0.2); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.28)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, i * 0.15, 0.3, 'sawtooth', 0.12)); },
    emote() { tone(700, 0, 0.08, 'sine', 0.2, 1000); },
    coin() { tone(988, 0, 0.08, 'square', 0.12); tone(1319, 0.07, 0.2, 'square', 0.12); },
    ach() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.22)); },
    click() { tone(600, 0, 0.05, 'square', 0.08); },
    join() { tone(440, 0, 0.08, 'sine', 0.18); tone(660, 0.08, 0.12, 'sine', 0.18); },
    buy() { tone(523, 0, 0.1, 'triangle', 0.2); tone(784, 0.08, 0.1, 'triangle', 0.2); tone(1047, 0.16, 0.2, 'triangle', 0.2); },
  };

  /* простая музыка: аккорды + арпеджио + бас, tempo растёт с «интенсивностью» */
  const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function sched() {
    if (!ctx) return;
    const spb = intensity ? 0.19 : 0.26;
    while (nextT < ctx.currentTime + 0.4) {
      const t = Math.max(0, nextT - ctx.currentTime);
      const bar = Math.floor(step / 8) % 4, k = step % 8, ch = CH[bar];
      const n = ch[[0, 1, 2, 1, 2, 1, 2, 1][k] % 3] + 12;
      tone(mf(n), t, spb * 1.6, 'triangle', 0.5, null, musBus);
      if (k === 0) tone(mf(ch[0] - 12), t, spb * 3.5, 'sine', 0.9, null, musBus);
      if (k === 4) tone(mf(ch[0] - 12), t, spb * 2.5, 'sine', 0.7, null, musBus);
      if (intensity && k % 2 === 0) { tone(mf(ch[0] + 24), t, spb * 0.8, 'square', 0.12, null, musBus); }
      if (intensity && (k === 0 || k === 4)) { // «бочка»
        tone(110, t, 0.12, 'sine', 0.8, 45, musBus);
      }
      step++; nextT += spb;
    }
  }
  function startMusic() { if (timer || !ctx) return; nextT = ctx.currentTime + 0.1; timer = setInterval(sched, 120); }

  root.GameAudio = {
    init,
    play(n, a) { if (ctx && !hardMute) try { fx[n] && fx[n](a); } catch (e) {} },
    setSfx(v) { sfxOn = v; apply(); },
    setMusic(v) { musOn = v; apply(); },
    setHardMute(v) { hardMute = v; apply(); },
    setIntensity(v) { intensity = v ? 1 : 0; },
  };
})(window);
