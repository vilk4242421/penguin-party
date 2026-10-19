/* Пингвины — 3D-сцена (наклонная ортографическая проекция): льдины с толщиной, трасса, плитки, пьедестал.
 * Мир: x вправо, y «к зрителю», z вверх. Экран: sx = ox + (x-cx)·S,  sy = oy + ((y-cy)·K − z·ZH)·S. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const Cos = root.Cosmetics, Sim = root.Sim;
  const C = Sim.C, PR = C.PR, RACE = Sim.RACE, TILES = Sim.TILES, SNOW_OBS = Sim.SNOW_OBS, CROWN = Sim.CROWN, TANK = Sim.TANK, LIGHT = Sim.LIGHT, SECT = Sim.SECT;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rngf = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ell = Cos.ell, circ = Cos.circ;
  const FLOE_R = 360;

  /* ---------- камера ---------- */
  function makeCam(W, H, view, fx, fy, shake) {
    const asp = H / W;
    const K = clamp(0.6 + (asp - 1) * 0.22, 0.6, 0.8), ZH = Math.sqrt(1 - K * K);
    let S, ox = W / 2, oy = H / 2, cx = 0, cy = 0;
    if (view && view.follow) {
      const z = view.zoom;
      S = Math.min(W / (2 * z), H / (2 * z * K * 0.95));
      cx = fx || 0; cy = fy || 0; oy = H * 0.5;
    } else {
      const R = (view && view.r) || 400, rx = (view && view.rx) || R, ry = (view && view.ry) || R;
      S = Math.min(W / (2 * rx * 1.08), (H * 0.86) / (2 * ry * K * 1.08 + 120 * ZH));
      oy = H * 0.5 + 24 * ZH * S;
    }
    if (shake) { ox += (Math.random() - 0.5) * shake; oy += (Math.random() - 0.5) * shake; }
    return { W, H, K, ZH, S, ox, oy, cx, cy };
  }
  const px = (cam, x) => cam.ox + (x - cam.cx) * cam.S;
  const py = (cam, y, z) => cam.oy + ((y - cam.cy) * cam.K - (z || 0) * cam.ZH) * cam.S;
  const pr = (cam, x, y, z) => [px(cam, x), py(cam, y, z)];
  function ground(ctx, cam, fn) {
    ctx.save();
    ctx.transform(cam.S, 0, 0, cam.S * cam.K, cam.ox - cam.cx * cam.S, cam.oy - cam.cy * cam.K * cam.S);
    fn(); ctx.restore();
  }
  const zoff = (cam, z) => (-z * cam.ZH) / cam.K; // сдвиг по y в «земной» системе для высоты z

  /* ---------- цвета ---------- */
  function rgbOf(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  const colCache = {};
  function lit(hex, k) { // k: яркость 0..1.2 (тени уходят в синий)
    const key = hex + '|' + Math.round(k * 50);
    if (colCache[key]) return colCache[key];
    const c = rgbOf(hex), m = Math.max(0, 1 - k) * 0.55, f = (a, sh) => Math.min(255, Math.round(a * Math.min(k, 1.2) * (1 - m) + sh * m));
    const v = `rgb(${f(c[0], 30)},${f(c[1], 70)},${f(c[2], 140)})`;
    return (colCache[key] = v);
  }

  /* ---------- темы ---------- */
  const THEMES = [
    { water: ['#4cc3f5', '#1b86c8', '#0c4a7e'], top: ['#ffffff', '#e6f7ff', '#bfe6fa'], side: ['#bfe8fb', '#5fb4e4', '#2f7fb8'], snow: 40, kind: 'day' },
    { water: ['#ffb27a', '#d1587f', '#40306f'], top: ['#fff7ef', '#ffe6e4', '#efc7db'], side: ['#ffd9e8', '#d994bd', '#8a5a9a'], snow: 26, kind: 'sunset' },
    { water: ['#5ff0d0', '#1fb0a8', '#0b5f78'], top: ['#ffffff', '#e4fbf7', '#b6eee4'], side: ['#c3f5ec', '#58cdc0', '#2a8f96'], snow: 24, kind: 'day' },
    { water: ['#b58cff', '#6a4fd0', '#241a66'], top: ['#fbf6ff', '#eadcff', '#cdb8f5'], side: ['#dccbff', '#9a82e0', '#5a47a8'], snow: 36, kind: 'dusk' },
    { water: ['#7ea5ba', '#456d84', '#1b3140'], top: ['#f5fafd', '#dbe9f1', '#b3cddb'], side: ['#c5dbe7', '#7fa6bb', '#48687c'], snow: 150, kind: 'storm' },
    { water: ['#1f3f78', '#10265a', '#050b22'], top: ['#f0f8ff', '#cfe6fc', '#a0c5ed'], side: ['#a9c9ee', '#5d86bf', '#2e4d86'], snow: 46, kind: 'night' },
    { water: ['#52d4ff', '#1393d6', '#08487e'], top: ['#ffffff', '#e9f9ff', '#c6ecfb'], side: ['#b9e7fb', '#4cb0e2', '#2a74ad'], snow: 34, kind: 'day' },
    { water: ['#9aa9d4', '#5b6aa6', '#252f5e'], top: ['#f6f8ff', '#dde4f6', '#b9c5e6'], side: ['#c6d0ee', '#7f90c8', '#4a5a96'], snow: 90, kind: 'dusk' },
  ];

  /* ---------- декор: айсберги, трещины, звёзды ---------- */
  const R1 = rngf(777);
  const cracksU = []; for (let i = 0; i < 16; i++) { const a = R1() * TAU, pts = []; let d = 0.1 + R1() * 0.3, aa = a; for (let j = 0; j < 5; j++) { pts.push([Math.cos(aa) * d, Math.sin(aa) * d]); d += 0.1 + R1() * 0.12; aa += (R1() - 0.5) * 0.5; } cracksU.push(pts); }
  const sparkle = []; for (let i = 0; i < 70; i++) { const a = R1() * TAU, r = Math.sqrt(R1()); sparkle.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, p: R1() * 6 }); }
  const bergs = []; for (let i = 0; i < 30; i++) { bergs.push({ a: R1() * TAU, d: R1(), s: 0.45 + R1() * 0.7, p: R1() * 6, v: R1(), pk: [R1(), R1(), R1()] }); }
  const stars = []; for (let i = 0; i < 90; i++) stars.push({ x: R1(), y: R1(), r: 0.6 + R1() * 1.4, p: R1() * 6 });
  const flakes = []; for (let i = 0; i < 160; i++) flakes.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random(), r: 1 + Math.random() * 2.4 });
  const pines = []; for (let i = 0; i < 9; i++) { const a = R1() * TAU, d = 60 + R1() * 380; pines.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, h: 0.8 + R1() * 0.6 }); }

  /* ---------- частицы ---------- */
  const parts = [];
  function part(o) { o.max = o.life; o.z = o.z || 0; o.vz = o.vz || 0; o.vx = o.vx || 0; o.vy = o.vy || 0; parts.push(o); }
  function clearParts() { parts.length = 0; }
  const puff = (x, y, z, n, spd, col, r) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.3 + Math.random()); part({ type: 'dot', x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7, vz: 40 + Math.random() * 120, life: 0.5 + Math.random() * 0.4, r: (r || 3) + Math.random() * 4, col: col || '#fff' }); } };
  const sparks = (x, y, z, n, spd) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random()); part({ type: 'star', x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 60 + Math.random() * 150, life: 0.4 + Math.random() * 0.3, r: 4 + Math.random() * 4, col: '#fff3a6', rot: Math.random() * 6 }); } };
  const ring = (x, y, col, gr, life) => part({ type: 'ring', x, y, life: life || 0.7, r: 12, gr: gr || 80, col: col || '#fff' });
  const popup = (x, y, z, txt, col) => part({ type: 'text', x, y, z: z || 60, vz: 50, life: 1.3, txt, col: col || '#fff' });
  const chunk = (x, y, vx, vy) => part({ type: 'chunk', x, y, z: 4, vx, vy, vz: 80 + Math.random() * 60, life: 1.4, r: 8 + Math.random() * 8, rot: Math.random() * 6 });

  function drawParts(ctx, cam, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
      const a = q.life / q.max;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.type !== 'ring' && q.type !== 'text' && q.type !== 'scratch') { q.vz -= (q.type === 'fire' || q.type === 'heart' || q.type === 'glyph' ? -30 : 380) * dt; q.z += q.vz * dt; if (q.z < 0 && q.type !== 'heart' && q.type !== 'fire' && q.type !== 'glyph') { q.z = 0; q.vz *= -0.3; } q.vx *= 0.97; q.vy *= 0.97; }
      const sx = px(cam, q.x), sy = py(cam, q.y, q.z), S = cam.S;
      switch (q.type) {
        case 'ring': { const rr = q.r + (1 - a) * q.gr; ctx.strokeStyle = q.col; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 5 * a * S + 1; ctx.beginPath(); ctx.ellipse(sx, sy, rr * S, rr * S * cam.K, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break; }
        case 'text': { q.z += q.vz * dt; ctx.globalAlpha = Math.min(1, a * 2); ctx.font = 'bold 22px "Trebuchet MS",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,30,60,.85)'; ctx.fillStyle = q.col; ctx.strokeText(q.txt, sx, sy); ctx.fillText(q.txt, sx, sy); ctx.globalAlpha = 1; break; }
        case 'scratch': { ctx.strokeStyle = q.col; ctx.globalAlpha = a * 0.5; ctx.lineWidth = 3; for (const o of [-8, 8]) { const x0 = q.x - Math.sin(q.ang) * o, y0 = q.y + Math.cos(q.ang) * o, x1 = x0 - Math.cos(q.ang) * 90, y1 = y0 - Math.sin(q.ang) * 90; ctx.beginPath(); ctx.moveTo(px(cam, x0), py(cam, y0, 0)); ctx.lineTo(px(cam, x1), py(cam, y1, 0)); ctx.stroke(); } ctx.globalAlpha = 1; break; }
        case 'glyph': ctx.globalAlpha = Math.min(1, a * 1.6); ctx.font = Math.round(q.r * S * 2.2 + 6) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.txt, sx, sy); ctx.globalAlpha = 1; break;
        case 'heart': ctx.fillStyle = q.col; ctx.globalAlpha = a; Cos.heart(ctx, sx, sy, (q.r * (0.5 + a * 0.5)) * S * 1.6 + 2); ctx.fill(); ctx.globalAlpha = 1; break;
        case 'star': ctx.fillStyle = q.col; ctx.globalAlpha = a; Cos.star(ctx, sx, sy, (q.r * (0.4 + a * 0.6)) * S * 1.5 + 1, (q.rot || 0) + (1 - a) * 4); ctx.fill(); ctx.globalAlpha = 1; break;
        case 'fire': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = q.col; ctx.globalAlpha = a * 0.9; ctx.beginPath(); ctx.arc(sx, sy, q.r * a * S * 1.4 + 1, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; break;
        case 'chunk': ctx.save(); ctx.translate(sx, sy); ctx.rotate(q.rot + (1 - a) * 2); ctx.globalAlpha = a; ctx.fillStyle = '#eaf7ff'; ctx.strokeStyle = '#9fd8f5'; ctx.lineWidth = 2; { const r = q.r * S * 1.3 + 1; ctx.beginPath(); ctx.moveTo(-r, -r * 0.6); ctx.lineTo(r, -r * 0.3); ctx.lineTo(r * 0.6, r * 0.7); ctx.lineTo(-r * 0.7, r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1; break;
        case 'boom': { const rr = (1 - a) * q.gr; const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, rr * S + 4); g.addColorStop(0, `rgba(255,255,200,${a})`); g.addColorStop(0.4, `rgba(255,140,40,${a * 0.9})`); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rr * S + 4, 0, TAU); ctx.fill(); break; }
        default: ctx.fillStyle = q.col; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(sx, sy, (q.r * (0.4 + a * 0.6)) * S * 1.3 + 0.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
  }

  /* ---------- фон: вода, айсберги, снег ---------- */
  function drawWater(ctx, cam, th, t) {
    const { W, H } = cam;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.water[0]); g.addColorStop(0.5, th.water[1]); g.addColorStop(1, th.water[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (th.kind === 'sunset') { const gg = ctx.createRadialGradient(W * 0.5, 0, 10, W * 0.5, 0, Math.max(W, H) * 0.7); gg.addColorStop(0, 'rgba(255,235,160,.8)'); gg.addColorStop(0.35, 'rgba(255,150,110,.3)'); gg.addColorStop(1, 'rgba(255,120,100,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H); }
    if (th.kind === 'night' || th.kind === 'dusk') {
      for (const s of stars) { ctx.globalAlpha = 0.35 + 0.5 * Math.sin(t * 1.6 + s.p); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H * 0.55, s.r, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (th.kind === 'night') for (let k = 0; k < 3; k++) {
        const col = k === 1 ? '190,120,255' : '80,255,170';
        const gg = ctx.createLinearGradient(0, 0, 0, H * 0.5); gg.addColorStop(0, `rgba(${col},0)`); gg.addColorStop(0.5, `rgba(${col},.18)`); gg.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= W; x += 24) ctx.lineTo(x, H * (0.08 + 0.06 * k) + Math.sin(x * 0.006 + t * 0.5 + k * 2) * H * 0.06);
        ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
      }
    }
    // волны (смещаются вместе с камерой)
    ctx.lineWidth = 2;
    const offx = cam.cx * cam.S * 0.5, offy = cam.cy * cam.S * cam.K;
    for (let k = 0; k < 9; k++) {
      ctx.strokeStyle = `rgba(255,255,255,${th.kind === 'night' ? 0.05 : 0.09})`; ctx.beginPath();
      const by = ((H * (k + 0.5)) / 9 - offy * (0.6 + k * 0.05) + H * 3) % H;
      for (let x = 0; x <= W + 20; x += 26) { const y = by + Math.sin((x + offx) * 0.012 + t * (0.8 + k * 0.1) + k) * (4 + k * 0.7); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
  }
  function drawBerg(ctx, cam, x, y, s, th, t, b) {
    const sx = px(cam, x), sy = py(cam, y + Math.sin(t * 0.7 + b.p) * 4, 0), S = cam.S * s * 60;
    if (sx < -S * 2 || sx > cam.W + S * 2 || sy < -S * 3 || sy > cam.H + S * 2) return;
    const K = cam.K;
    ctx.fillStyle = 'rgba(0,40,90,.22)'; ell(ctx, sx + S * 0.1, sy + S * 0.12, S * 1.15, S * 1.15 * K); ctx.fill();
    // основание
    ctx.fillStyle = th.side[1]; ell(ctx, sx, sy, S, S * K); ctx.fill();
    ctx.fillStyle = th.side[0];
    ctx.beginPath(); ctx.moveTo(sx - S, sy); ctx.lineTo(sx - S * 0.7, sy - S * (0.9 + b.pk[0] * 0.7)); ctx.lineTo(sx - S * 0.1, sy - S * (0.5 + b.pk[1] * 0.3)); ctx.lineTo(sx + S * 0.2, sy - S * (1.2 + b.pk[2] * 0.9)); ctx.lineTo(sx + S * 0.7, sy - S * 0.6); ctx.lineTo(sx + S, sy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.moveTo(sx - S * 0.7, sy - S * (0.9 + b.pk[0] * 0.7)); ctx.lineTo(sx - S * 0.1, sy - S * (0.5 + b.pk[1] * 0.3)); ctx.lineTo(sx - S * 0.3, sy); ctx.lineTo(sx - S, sy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.side[2]; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(sx + S * 0.2, sy - S * (1.2 + b.pk[2] * 0.9)); ctx.lineTo(sx + S * 0.7, sy - S * 0.6); ctx.lineTo(sx + S, sy); ctx.lineTo(sx + S * 0.15, sy); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  function drawBergs(ctx, cam, th, t, near, far) {
    for (let i = 0; i < bergs.length; i++) {
      const b = bergs[i], d = near + b.d * (far - near);
      drawBerg(ctx, cam, Math.cos(b.a) * d, Math.sin(b.a) * d, b.s, th, t, b);
    }
  }
  function drawSnowfall(ctx, cam, th, t, dt, wind) {
    const { W, H } = cam; const n = Math.min(flakes.length, th.snow);
    ctx.fillStyle = th.kind === 'sunset' ? 'rgba(255,240,230,.8)' : 'rgba(255,255,255,.78)';
    const stormy = th.kind === 'storm';
    for (let i = 0; i < n; i++) {
      const f = flakes[i];
      f.y += dt * (0.06 + (stormy ? 0.1 : 0)) * f.s; f.x += Math.sin(t + f.s * 9) * dt * 0.01 + ((stormy ? 0.08 : 0.004) + (wind ? Math.cos(wind) * 0.25 : 0)) * dt * f.s;
      if (wind) f.y += Math.sin(wind) * 0.25 * dt * f.s;
      if (f.y > 1) { f.y = -0.02; f.x = Math.random(); } if (f.x > 1.02) f.x = -0.02; if (f.x < -0.02) f.x = 1.02;
      ctx.globalAlpha = 0.35 + f.s * 0.3; ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- объёмные примитивы ---------- */
  // цилиндр: центр (x,y), верх на высоте z1, толщина h
  function cylinder(ctx, cam, x, y, r, z1, h, topFill, sideFill, edge) {
    const sx = px(cam, x), syTop = py(cam, y, z1), rx = r * cam.S, ry = rx * cam.K, th = h * cam.ZH * cam.S;
    ctx.fillStyle = typeof sideFill === 'function' ? sideFill(sx, rx) : sideFill;
    ell(ctx, sx, syTop + th, rx, ry); ctx.fill();
    ctx.fillRect(sx - rx, syTop, rx * 2, th);
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx, syTop + th, rx, ry, 0, 0, Math.PI); ctx.stroke(); }
    ctx.fillStyle = typeof topFill === 'function' ? topFill(sx, syTop, rx, ry) : topFill;
    ell(ctx, sx, syTop, rx, ry); ctx.fill();
    return [sx, syTop, rx, ry, th];
  }
  function drawBox(ctx, cam, cx, cy, z0, hx, hy, hz, rot, base, edge, topBase) {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const loc = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
    const w = loc.map(([x, y]) => [cx + x * cr - y * sr, cy + x * sr + y * cr]);
    const b = w.map(([x, y]) => pr(cam, x, y, z0)), t = w.map(([x, y]) => pr(cam, x, y, z0 + hz));
    const nl = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const nx = nl[i][0] * cr - nl[i][1] * sr, ny = nl[i][0] * sr + nl[i][1] * cr;
      if (ny <= 0.02) continue;
      const j = (i + 1) & 3, br = clamp(0.62 + 0.38 * ((nx * -0.55 + ny * 0.55) / 0.78), 0.4, 1);
      ctx.beginPath(); ctx.moveTo(b[i][0], b[i][1]); ctx.lineTo(b[j][0], b[j][1]); ctx.lineTo(t[j][0], t[j][1]); ctx.lineTo(t[i][0], t[i][1]); ctx.closePath();
      ctx.fillStyle = lit(base, br); ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.4; ctx.stroke(); }
    }
    ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(t[i][0], t[i][1]); ctx.closePath();
    ctx.fillStyle = lit(topBase || base, 1.08); ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1.4; ctx.stroke(); }
    return t;
  }
  function drawMound(ctx, cam, x, y, r, th) { // сугроб-«купол»
    const sx = px(cam, x), sy = py(cam, y, 0), rx = r * cam.S, ry = rx * cam.K, hh = rx * 0.95;
    ctx.fillStyle = 'rgba(0,40,90,.25)'; ell(ctx, sx + rx * 0.12, sy + ry * 0.2, rx * 1.1, ry * 1.1); ctx.fill();
    const g = ctx.createRadialGradient(sx - rx * 0.35, sy - hh * 0.65, rx * 0.1, sx, sy - hh * 0.3, rx * 1.3);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e6f4fc'); g.addColorStop(1, '#a9cfe8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, rx, hh, 0, Math.PI, TAU); ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,170,210,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(150,190,225,.55)'; ctx.lineWidth = 1.2;
    for (const k of [0.45, 0.8]) { ctx.beginPath(); ctx.ellipse(sx, sy - hh * (k * 0.35), rx * (1 - k * 0.55), ry * (1 - k * 0.55), 0, 0, Math.PI); ctx.stroke(); }
  }
  function drawPine(ctx, cam, x, y, h) {
    const sx = px(cam, x), sy = py(cam, y, 0), S = cam.S * 36 * h;
    ctx.fillStyle = 'rgba(0,40,90,.22)'; ell(ctx, sx + S * 0.2, sy + S * 0.05, S * 0.9, S * 0.3); ctx.fill();
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(sx - S * 0.12, sy - S * 0.5, S * 0.24, S * 0.55);
    for (let i = 0; i < 3; i++) {
      const by = sy - S * (0.35 + i * 0.7), w = S * (1.05 - i * 0.25);
      ctx.beginPath(); ctx.moveTo(sx - w, by); ctx.lineTo(sx, by - S * 1.0); ctx.lineTo(sx + w, by); ctx.closePath();
      ctx.fillStyle = i === 0 ? '#1f7a4c' : i === 1 ? '#25905a' : '#2fa56a'; ctx.fill(); ctx.strokeStyle = 'rgba(5,60,40,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(sx - w * 0.55, by - S * 0.55); ctx.lineTo(sx, by - S * 1.0); ctx.lineTo(sx + w * 0.55, by - S * 0.55); ctx.quadraticCurveTo(sx, by - S * 0.4, sx - w * 0.55, by - S * 0.55); ctx.fill();
    }
  }
  function drawFish(ctx, sx, sy, s, col, ang, wag) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 0.09;
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.moveTo(-0.7, 0); ctx.lineTo(-1.25, -0.42 + wag * 0.3); ctx.lineTo(-1.25, 0.42 + wag * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.1, -0.35); ctx.lineTo(0.1, -0.78); ctx.lineTo(0.45, -0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    const g = ctx.createLinearGradient(0, -0.5, 0, 0.5); g.addColorStop(0, col[0]); g.addColorStop(1, col[2]);
    ctx.fillStyle = g; ell(ctx, 0, 0, 0.95, 0.5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.06; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-0.1 + i * 0.28, 0, 0.2, -1.1, 1.1); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 0.07; circ(ctx, 0.5, -0.1, 0.13); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0a2540'; circ(ctx, 0.53, -0.1, 0.065); ctx.fill();
    ctx.restore();
  }
  function drawBomb(ctx, sx, sy, r, t, fuseLeft, red) {
    const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r * 1.1);
    g.addColorStop(0, red ? '#ff8a7a' : '#6a6f7e'); g.addColorStop(0.5, red ? '#d12a1c' : '#2a2d38'); g.addColorStop(1, red ? '#7a0f08' : '#0d0f16');
    ctx.fillStyle = g; ctx.strokeStyle = '#05080f'; ctx.lineWidth = Math.max(1.5, r * 0.1); circ(ctx, sx, sy, r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ell(ctx, sx - r * 0.38, sy - r * 0.42, r * 0.22, r * 0.12, -0.7); ctx.fill();
    ctx.fillStyle = '#7a5a3a'; ctx.fillRect(sx - r * 0.18, sy - r * 1.18, r * 0.36, r * 0.3);
    const fx = sx + r * 0.1, fy = sy - r * 1.45;
    ctx.strokeStyle = '#d8c9a0'; ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.beginPath(); ctx.moveTo(sx, sy - r * 1.15); ctx.quadraticCurveTo(sx + r * 0.1, fy + r * 0.2, fx, fy); ctx.stroke();
    const fl = 0.7 + 0.5 * Math.sin(t * 40);
    ctx.fillStyle = '#ffd23f'; Cos.star(ctx, fx, fy, r * 0.42 * fl, t * 8); ctx.fill(); ctx.fillStyle = '#ff6a1c'; Cos.star(ctx, fx, fy, r * 0.22 * fl, -t * 6); ctx.fill();
  }

  /* ---------- льдина ---------- */
  function drawFloe(ctx, cam, R, th, t, o) {
    o = o || {};
    const T = o.thick || 52;
    // рябь и подводное свечение
    ground(ctx, cam, () => {
      for (let i = 0; i < 4; i++) { const ph = (t * 0.12 + i / 4) % 1, r = R + 24 + ph * 260; ctx.strokeStyle = `rgba(255,255,255,${0.22 * (1 - ph)})`; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
      ctx.translate(0, zoff(cam, -T * 0.55));
      const gg = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, R + 70); gg.addColorStop(0, 'rgba(140,235,255,.55)'); gg.addColorStop(1, 'rgba(140,235,255,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, R + 70, 0, TAU); ctx.fill();
    });
    const S = th.side;
    const [sx, syTop, rx, ry, thk] = cylinder(ctx, cam, 0, 0, R, 0, T,
      (x, y, rx2, ry2) => { const g = ctx.createRadialGradient(x - rx2 * 0.3, y - ry2 * 0.4, rx2 * 0.05, x, y, rx2); g.addColorStop(0, th.top[0]); g.addColorStop(0.6, th.top[1]); g.addColorStop(1, th.top[2]); return g; },
      (x, rx2) => { const g = ctx.createLinearGradient(x - rx2, 0, x + rx2, 0); g.addColorStop(0, S[0]); g.addColorStop(0.45, S[1]); g.addColorStop(1, S[2]); return g; });
    // прожилки на боковой стенке
    ctx.save(); ctx.beginPath(); ctx.rect(sx - rx, syTop, rx * 2, thk + ry); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2;
    for (let i = -5; i <= 5; i++) { const xx = sx + (i / 5.5) * rx * 0.95, yy = syTop + ry * Math.sqrt(Math.max(0, 1 - (i / 5.5) * (i / 5.5))); ctx.beginPath(); ctx.moveTo(xx, yy + 2); ctx.lineTo(xx + (i % 2 ? 4 : -3), yy + thk * (0.45 + (i % 3) * 0.15)); ctx.stroke(); }
    ctx.restore();
    // верхняя поверхность: трещины, искорки, иней
    ground(ctx, cam, () => {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(110,170,215,.45)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (const c of cracksU) { ctx.beginPath(); c.forEach((q, i) => (i ? ctx.lineTo(q[0] * FLOE_R, q[1] * FLOE_R) : ctx.moveTo(q[0] * FLOE_R, q[1] * FLOE_R))); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(140,195,235,.3)'; for (const f of [0.35, 0.68]) { ctx.beginPath(); ctx.arc(0, 0, FLOE_R * f, 0, TAU); ctx.stroke(); }
      const fg = ctx.createRadialGradient(0, 0, Math.max(1, R - 44), 0, 0, R); fg.addColorStop(0, 'rgba(150,215,250,0)'); fg.addColorStop(1, 'rgba(140,205,245,.6)');
      ctx.fillStyle = fg; ctx.fillRect(-R, -R, R * 2, R * 2);
      for (let i = 0; i < sparkle.length; i++) {
        const s = sparkle[i]; if (Math.hypot(s.x, s.y) * FLOE_R > R - 8) continue;
        const a = 0.5 + 0.5 * Math.sin(t * 2.2 + s.p); if (a < 0.72) continue;
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.8; const x = s.x * FLOE_R, y = s.y * FLOE_R, l = 4 + a * 5;
        ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y); ctx.moveTo(x, y - l * 1.5); ctx.lineTo(x, y + l * 1.5); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = o.shrink ? `rgba(255,90,90,${0.55 + 0.35 * Math.sin(t * 6)})` : 'rgba(255,255,255,.95)'; ctx.lineWidth = o.shrink ? 7 : 5;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    });
  }

  /* ---------- гоночная трасса: замкнутая лента по осевой линии ---------- */
  function drawTrack(ctx, cam, th, t, mp, objs) {
    const tr = RACE.track(mp || 0), hw = tr.hw;
    ground(ctx, cam, () => {
      const path = () => { ctx.beginPath(); for (let i = 0; i < tr.n; i++) { const p = tr.pts[i]; if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.closePath(); };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.save(); ctx.translate(0, zoff(cam, -78)); path(); ctx.lineWidth = hw * 2 + 120; ctx.strokeStyle = 'rgba(0,30,70,.26)'; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(0, zoff(cam, -50)); path(); ctx.lineWidth = hw * 2 + 70; ctx.strokeStyle = th.side[1]; ctx.stroke(); ctx.restore();
      path(); ctx.lineWidth = hw * 2 + 70; ctx.strokeStyle = '#eaf6ff'; ctx.stroke();
      ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
      for (let k = 0; k < 2; k++) { path(); ctx.lineWidth = hw * 2 + 28; ctx.setLineDash([60, 60]); ctx.lineDashOffset = k ? 60 : 0; ctx.strokeStyle = k ? '#ffffff' : '#e53946'; ctx.stroke(); }
      ctx.setLineDash([]); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      path(); ctx.lineWidth = hw * 2; ctx.strokeStyle = '#8db6d6'; ctx.stroke();
      path(); ctx.lineWidth = hw * 2 - 36; ctx.strokeStyle = '#a9cbe6'; ctx.stroke();
      ctx.lineCap = 'butt'; path(); ctx.lineWidth = 8; ctx.setLineDash([54, 66]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); ctx.setLineDash([]);
      // старт/финиш
      const q = RACE.at(tr, 0, 0), ang = Math.atan2(q.ty, q.tx), n = 10, w = hw * 2 / n;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang);
      for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) & 1 ? '#111' : '#fff'; ctx.fillRect(-30 + j * 20, -hw + i * w, 20.5, w + 0.5); }
      ctx.restore();
      // лужи (замедление) и плиты (ускорение)
      for (const o of objs) {
        if (o[0] === 11) {
          const [, , x, y, r] = o;
          const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(70,95,130,.85)'); g.addColorStop(0.8, 'rgba(95,125,160,.7)'); g.addColorStop(1, 'rgba(110,140,175,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(200,225,245,.55)'; ctx.lineWidth = 4;
          for (let k = 0; k < 3; k++) { const rr = r * (0.3 + 0.2 * ((t * 0.5 + k / 3) % 1) * 2); ctx.beginPath(); ctx.arc(x, y, Math.min(rr, r * 0.9), 0, TAU); ctx.stroke(); }
        } else if (o[0] === 12) {
          const [, , x, y, r, a100] = o;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a100 / 100);
          const g = ctx.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, '#ffe34a'); g.addColorStop(1, '#ff9a1c');
          ctx.fillStyle = g; ctx.strokeStyle = '#a85c00'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r * 1.1, -r * 0.95, r * 2.2, r * 1.9, 16) : ctx.rect(-r * 1.1, -r * 0.95, r * 2.2, r * 1.9); ctx.fill(); ctx.stroke();
          for (let k = 0; k < 3; k++) { const ph = ((t * 1.6 + k / 3) % 1); ctx.fillStyle = `rgba(255,255,255,${0.9 - ph * 0.6})`; const xx = -r * 0.8 + ph * r * 1.6; ctx.beginPath(); ctx.moveTo(xx - 14, -r * 0.55); ctx.lineTo(xx + 12, 0); ctx.lineTo(xx - 14, r * 0.55); ctx.lineTo(xx - 4, 0); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        }
      }
    });
  }
  function drawMinimap(ctx, cam, tr, st, md) {
    const sz = Math.min(150, cam.W * 0.34), pad = 12, x0 = pad, y0 = cam.H - pad - sz;
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; for (const p of tr.pts) { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); }
    const sc = (sz - 16) / Math.max(mxx - mnx, mxy - mny), ox = x0 + sz / 2 - ((mnx + mxx) / 2) * sc, oy = y0 + sz / 2 - ((mny + mxy) / 2) * sc;
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = 'rgba(8,30,60,.55)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, sz, sz, 14) : ctx.rect(x0, y0, sz, sz); ctx.fill();
    ctx.beginPath(); for (let i = 0; i < tr.n; i += 2) { const p = tr.pts[i]; if (i) ctx.lineTo(ox + p[0] * sc, oy + p[1] * sc); else ctx.moveTo(ox + p[0] * sc, oy + p[1] * sc); } ctx.closePath();
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; ctx.stroke();
    const q = RACE.at(tr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(ox + q.x * sc - 3, oy + q.y * sc - 3, 6, 6);
    for (const p of st.players) { if (p.spec) continue; const me = p.id === st.me; ctx.fillStyle = Cos.SKIN_COL[p.look.s] || Cos.color(p.look.c); ctx.strokeStyle = '#fff'; ctx.lineWidth = me ? 2.5 : 1; ctx.beginPath(); ctx.arc(ox + p.x * sc, oy + p.y * sc, me ? 5.5 : 4, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  /* ---------- новые режимы: земля и предметы ---------- */
  function ownerCol(st, id) { const p = st.players.find((q) => q.id === id); return p ? (Cos.SKIN_COL[p.look.s] || Cos.color(p.look.c)) : '#ffd23f'; }
  function drawZones(ctx, cam, st, t) {
    const zs = st.objs.filter((o) => o[0] === 6); if (!zs.length) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ground(ctx, cam, () => {
      for (const o of zs) {
        const [, , x, y, r, own, prog, style] = o;
        if (style === 0) { // метеорит: красный круг и растущая сердцевина
          const k = prog / 100;
          ctx.fillStyle = `rgba(255,60,40,${0.12 + 0.28 * k})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.strokeStyle = `rgba(255,${120 - k * 80},60,${0.7 + 0.3 * pulse})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
          ctx.fillStyle = `rgba(255,150,40,${0.25 + 0.5 * k})`; ctx.beginPath(); ctx.arc(x, y, r * k, 0, TAU); ctx.fill();
        } else if (style === 1) { // круг-зона
          const col = own === -1 ? '#ff5d5d' : own > 0 ? ownerCol(st, own) : '#ffd23f';
          ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(x, y, r + 12, 0, TAU); ctx.fill();
          const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, col);
          ctx.globalAlpha = 0.55 + 0.2 * pulse; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r - 3, 0, TAU); ctx.stroke();
          if (prog > 0) { ctx.strokeStyle = '#ff8a1c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, y, r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - prog / 100)); ctx.stroke(); }
        } else { // мина (еле заметна)
          const blink = Math.sin(t * 5 + o[1]) > 0.6;
          ctx.fillStyle = 'rgba(40,20,30,.28)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(60,30,40,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - r * 0.5, y); ctx.lineTo(x + r * 0.5, y); ctx.moveTo(x, y - r * 0.5); ctx.lineTo(x, y + r * 0.5); ctx.stroke();
          if (blink) { ctx.fillStyle = 'rgba(255,60,60,.9)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); }
        }
      }
    });
  }
  function drawSectors(ctx, cam, ex, R, t) {
    const sc = ex.sc || [], pulse = 0.5 + 0.5 * Math.sin(t * 14), step = TAU / SECT;
    ground(ctx, cam, () => {
      ctx.save(); ctx.translate(0, zoff(cam, 1));
      for (let i = 0; i < SECT; i++) {
        const k = sc[i] || 0, a0 = i * step, a1 = a0 + step;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0, a1); ctx.closePath();
        if (k === 10) { ctx.fillStyle = 'rgba(8,50,100,.96)'; ctx.fill(); }
        else if (k > 0) { ctx.fillStyle = `rgba(255,60,50,${0.2 + 0.18 * pulse + k * 0.03})`; ctx.fill(); }
        else if (i & 1) { ctx.fillStyle = 'rgba(120,170,220,.12)'; ctx.fill(); }
      }
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 4;
      for (let i = 0; i < SECT; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * step) * R, Math.sin(i * step) * R); ctx.stroke(); }
      ctx.restore();
    });
  }
  function drawBeams(ctx, cam, ex, t) {
    const bs = ex.b || []; if (!bs.length) return; const L = ex.L || 370;
    ground(ctx, cam, () => {
      ctx.fillStyle = 'rgba(0,30,70,.3)';
      for (const th of bs) { ctx.save(); ctx.translate(10, 10); ctx.rotate(th); ctx.fillRect(0, -20, L, 40); ctx.restore(); }
      ctx.save(); ctx.translate(0, zoff(cam, 16));
      for (const th of bs) {
        ctx.save(); ctx.rotate(th);
        const n = 10, w = L / n; for (let i = 0; i < n; i++) { ctx.fillStyle = i & 1 ? '#ffffff' : '#ff4d5e'; ctx.fillRect(i * w, -20, w + 1, 40); }
        ctx.strokeStyle = '#7a1730'; ctx.lineWidth = 3; ctx.strokeRect(0, -20, L, 40); ctx.restore();
      }
      ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
  }
  function drawLightLines(ctx, cam, ex, R) {
    ground(ctx, cam, () => {
      ctx.save(); ctx.translate(0, zoff(cam, 1));
      const n = 20, w = 520 / n, y = LIGHT.Y1; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) & 1 ? '#18202e' : '#ffffff'; ctx.fillRect(-260 + i * w, y - 16 + j * 16, w, 16); }
      ctx.strokeStyle = 'rgba(40,110,200,.8)'; ctx.lineWidth = 7; ctx.setLineDash([26, 18]); ctx.beginPath(); ctx.moveTo(-270, LIGHT.Y0 - 30); ctx.lineTo(270, LIGHT.Y0 - 30); ctx.stroke(); ctx.setLineDash([]);
      if (ex.l === 2) { ctx.fillStyle = 'rgba(255,40,40,.13)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); }
      else if (ex.l === 1) { ctx.fillStyle = 'rgba(255,200,40,.1)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); }
      ctx.restore();
    });
  }
  function drawLightPost(ctx, cam, l, t) {
    const [bx, by] = pr(cam, 0, LIGHT.Y1 - 60, 0), h = 190 * cam.ZH * cam.S, w = 46 * cam.S;
    ctx.fillStyle = 'rgba(0,40,90,.25)'; ell(ctx, bx + 12 * cam.S, by + 2, w * 0.7, w * 0.25); ctx.fill();
    ctx.fillStyle = '#2c3a58'; ctx.fillRect(bx - w * 0.12, by - h, w * 0.24, h);
    ctx.fillStyle = '#10182a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; const bh = w * 2.7, bt = by - h - bh * 0.7;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - w * 0.5, bt, w, bh, w * 0.2) : ctx.rect(bx - w * 0.5, bt, w, bh); ctx.fill(); ctx.stroke();
    const cols = [['#48ff7a', 0], ['#ffd23f', 1], ['#ff4d4d', 2]];
    cols.forEach(([c, k], i) => { const on = (k === 1 ? l === 1 : k === 0 ? l === 0 : l === 2), cy = bt + bh * (0.2 + i * 0.3); if (on) { const g = ctx.createRadialGradient(bx, cy, 1, bx, cy, w * 0.9); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; circ(ctx, bx, cy, w * 0.9); ctx.fill(); } ctx.fillStyle = on ? c : '#2a3040'; circ(ctx, bx, cy, w * 0.24); ctx.fill(); });
  }
  function drawSnowman(ctx, cam, o, t) {
    const sc = (o[5] || 16) / 10 * cam.S, st = o[6];
    const [sx, sy] = pr(cam, o[2], o[3], 0), wob = Math.sin(t * 9 + o[1]) * (st ? 0 : 0.06);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(wob);
    ctx.fillStyle = 'rgba(0,40,90,.3)'; ell(ctx, 6 * sc, 2 * sc, 34 * sc, 11 * sc); ctx.fill();
    const ball = (cy, r) => { const g = ctx.createRadialGradient(-r * 0.3, cy - r * 0.35, r * 0.1, 0, cy, r * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#dbeaf6'); g.addColorStop(1, '#8fb2d2'); ctx.fillStyle = g; ctx.strokeStyle = '#5f87ad'; ctx.lineWidth = 2; circ(ctx, 0, cy, r); ctx.fill(); ctx.stroke(); };
    ball(-24 * sc, 28 * sc); ball(-62 * sc, 22 * sc); ball(-94 * sc, 16 * sc);
    const hy = -94 * sc;
    ctx.fillStyle = '#10182a'; ctx.fillRect(-14 * sc, hy - 30 * sc, 28 * sc, 18 * sc); ctx.fillRect(-20 * sc, hy - 14 * sc, 40 * sc, 5 * sc);
    ctx.strokeStyle = '#10182a'; ctx.lineWidth = 3 * sc / 1.6;
    if (st) { for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 8 * sc - 4 * sc, hy - 5 * sc); ctx.lineTo(d * 8 * sc + 4 * sc, hy + 3 * sc); ctx.moveTo(d * 8 * sc + 4 * sc, hy - 5 * sc); ctx.lineTo(d * 8 * sc - 4 * sc, hy + 3 * sc); ctx.stroke(); } }
    else { ctx.fillStyle = '#ff2b2b'; for (const d of [-1, 1]) { circ(ctx, d * 7 * sc, hy - 1 * sc, 3.2 * sc); ctx.fill(); } ctx.strokeStyle = '#10182a'; ctx.beginPath(); ctx.moveTo(-14 * sc, hy - 9 * sc); ctx.lineTo(-3 * sc, hy - 5 * sc); ctx.moveTo(14 * sc, hy - 9 * sc); ctx.lineTo(3 * sc, hy - 5 * sc); ctx.stroke(); }
    ctx.fillStyle = '#ff8a1c'; ctx.beginPath(); ctx.moveTo(0, hy + 2 * sc); ctx.lineTo(0, hy + 8 * sc); ctx.lineTo(-17 * sc, hy + 9 * sc); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e53946'; ctx.fillRect(-17 * sc, -78 * sc, 34 * sc, 8 * sc);
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 3 * sc / 1.6; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 26 * sc, -60 * sc); ctx.lineTo(d * 50 * sc, -76 * sc + (st ? 18 * sc : Math.sin(t * 8) * 6 * sc)); ctx.stroke(); }
    ctx.restore();
  }
  function drawPushBall(ctx, cam, o) {
    const r = o[4], [sx, sy] = pr(cam, o[2], o[3], r * 0.9), rr = r * cam.S;
    ctx.fillStyle = 'rgba(0,40,90,.3)'; ell(ctx, sx + rr * 0.15, py(cam, o[3], 0) + rr * 0.05, rr * 1.05, rr * cam.K * 1.05); ctx.fill();
    const g = ctx.createRadialGradient(sx - rr * 0.35, sy - rr * 0.4, rr * 0.1, sx, sy, rr * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#e3f1fb'); g.addColorStop(1, '#8fb2d2');
    ctx.fillStyle = g; ctx.strokeStyle = '#5f87ad'; ctx.lineWidth = 3; circ(ctx, sx, sy, rr); ctx.fill(); ctx.stroke();
    ctx.save(); circ(ctx, sx, sy, rr); ctx.clip(); ctx.fillStyle = 'rgba(120,160,200,.4)';
    for (let i = 0; i < 6; i++) { const a = (o[2] + o[3]) * 0.012 + i * 1.1; circ(ctx, sx + Math.cos(a) * rr * 0.55, sy + Math.sin(a * 1.4 + i) * rr * 0.5, rr * (0.12 + (i % 3) * 0.05)); ctx.fill(); }
    ctx.restore();
  }
  function drawMeteorRock(ctx, cam, o) {
    const k = o[6] / 100, z = (1 - k) * 700 + 30, [sx, sy] = pr(cam, o[2], o[3], z), r = 26 * cam.S * 1.5 + 5;
    const g = ctx.createLinearGradient(sx, sy - r * 6, sx, sy); g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, 'rgba(255,160,50,.8)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - r * 0.8, sy); ctx.lineTo(sx, sy - r * 6); ctx.lineTo(sx + r * 0.8, sy); ctx.closePath(); ctx.fill();
    const rg = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 2, sx, sy, r); rg.addColorStop(0, '#fff2a0'); rg.addColorStop(0.5, '#ff9a2b'); rg.addColorStop(1, '#8a2410');
    ctx.fillStyle = rg; circ(ctx, sx, sy, r); ctx.fill();
  }

  /* ---------- отдельные режимы: земля ---------- */
  function drawCrownArena(ctx, cam, th, t) {
    const AW = CROWN.AW, AH = CROWN.AH, d = 44;
    // подводная тень и плита
    ground(ctx, cam, () => { ctx.fillStyle = 'rgba(0,30,70,.3)'; ctx.fillRect(-AW - 40, -AH - 20, AW * 2 + 80, AH * 2 + 70); });
    drawBox(ctx, cam, 0, 0, -d, AW, AH, d, 0, th.side[1], 'rgba(40,90,140,.8)', th.top[1]);
    ground(ctx, cam, () => {
      ctx.save(); ctx.translate(0, zoff(cam, 0));
      const g = ctx.createLinearGradient(0, -AH, 0, AH); g.addColorStop(0, th.top[0]); g.addColorStop(1, th.top[2]);
      ctx.fillStyle = g; ctx.fillRect(-AW, -AH, AW * 2, AH * 2);
      ctx.strokeStyle = 'rgba(120,170,210,.35)'; ctx.lineWidth = 2;
      for (let x = -AW + 140; x < AW; x += 140) { ctx.beginPath(); ctx.moveTo(x, -AH); ctx.lineTo(x, AH); ctx.stroke(); }
      for (let y = -AH + 140; y < AH; y += 140) { ctx.beginPath(); ctx.moveTo(-AW, y); ctx.lineTo(AW, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.stroke();
      ctx.restore();
    });
    // задняя и боковые стены (ниже всех игроков)
    const wt = 22, wh = 78, col = '#8aa4cf';
    drawBox(ctx, cam, 0, -AH - wt, 0, AW + wt * 2, wt, wh, 0, col, '#26406e', '#dbe7fa');
    drawBox(ctx, cam, -AW - wt, 0, 0, wt, AH, wh, 0, col, '#26406e', '#dbe7fa');
    drawBox(ctx, cam, AW + wt, 0, 0, wt, AH, wh, 0, col, '#26406e', '#dbe7fa');
  }
  function drawCrownFront(ctx, cam) {
    const AW = CROWN.AW, AH = CROWN.AH, wt = 22;
    drawBox(ctx, cam, 0, AH + wt, 0, AW + wt * 2, wt, 40, 0, '#8aa4cf', '#26406e', '#dbe7fa');
  }
  function drawPillar(ctx, cam, o) {
    drawBox(ctx, cam, o.x, o.y, 0, o.r * 0.92, o.r * 0.92, 92, 0, '#7f9bc9', '#26406e', '#e6f0ff');
    const [sx, sy] = pr(cam, o.x, o.y + o.r * 0.92, 52);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(sx - o.r * 0.5 * cam.S, sy - 6 * cam.S, o.r * cam.S, 5 * cam.S);
  }

  const TEAM_COL = ['#ff5d5d', '#3fa0ff'];
  function drawTankArena(ctx, cam, th, t) {
    const A = TANK.A, d = 44;
    ground(ctx, cam, () => { ctx.fillStyle = 'rgba(0,30,70,.3)'; ctx.fillRect(-A - 40, -A - 20, A * 2 + 80, A * 2 + 70); });
    drawBox(ctx, cam, 0, 0, -d, A, A, d, 0, th.side[1], 'rgba(40,90,140,.8)', th.top[1]);
    ground(ctx, cam, () => {
      ctx.save(); ctx.translate(0, zoff(cam, 0));
      const g = ctx.createLinearGradient(0, -A, 0, A); g.addColorStop(0, th.top[0]); g.addColorStop(1, th.top[2]);
      ctx.fillStyle = g; ctx.fillRect(-A, -A, A * 2, A * 2);
      ctx.strokeStyle = 'rgba(120,170,210,.3)'; ctx.lineWidth = 2;
      for (let x = -A + 150; x < A; x += 150) { ctx.beginPath(); ctx.moveTo(x, -A); ctx.lineTo(x, A); ctx.stroke(); }
      for (let y = -A + 150; y < A; y += 150) { ctx.beginPath(); ctx.moveTo(-A, y); ctx.lineTo(A, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.setLineDash([26, 20]); ctx.beginPath(); ctx.moveTo(0, -A); ctx.lineTo(0, A); ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < 2; k++) { // базы команд
        const b = TANK.base[k], col = TEAM_COL[k];
        ctx.fillStyle = col + '40'; ctx.beginPath(); ctx.arc(b.x, b.y, TANK.BR, 0, TAU); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.stroke();
        ctx.fillStyle = col + '30'; ctx.fillRect(k ? A - 150 : -A, -A, 150, A * 2);
      }
      ctx.restore();
    });
    const wt = 22, wh = 78, col = '#8aa4cf';
    drawBox(ctx, cam, 0, -A - wt, 0, A + wt * 2, wt, wh, 0, col, '#26406e', '#dbe7fa');
    drawBox(ctx, cam, -A - wt, 0, 0, wt, A, wh, 0, col, '#26406e', '#dbe7fa');
    drawBox(ctx, cam, A + wt, 0, 0, wt, A, wh, 0, col, '#26406e', '#dbe7fa');
  }
  function drawTankFront(ctx, cam) { drawBox(ctx, cam, 0, TANK.A + 22, 0, TANK.A + 44, 22, 40, 0, '#8aa4cf', '#26406e', '#dbe7fa'); }
  function drawTankWall(ctx, cam, w) { drawBox(ctx, cam, w.x, w.y, 0, w.hw, w.hh, 76, 0, '#7f9bc9', '#26406e', '#e6f0ff'); }
  function drawFlag(ctx, cam, x, y, team, t, carried, home) {
    const col = TEAM_COL[team], [sx, sy] = pr(cam, x, y, 0), S = cam.S, h = 118 * cam.ZH * S, w = 62 * S;
    if (!carried) {
      ctx.fillStyle = 'rgba(0,35,80,.3)'; ell(ctx, sx, sy + 2, 20 * S, 8 * S); ctx.fill();
      if (!home) { ctx.strokeStyle = col; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 8); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy, 34 * S, 34 * S * cam.K, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    drawFlagShape(ctx, sx, sy - (carried ? 0 : 0), h, w, col, t);
  }
  function drawFlagShape(ctx, bx, by, h, w, col, t) {
    ctx.strokeStyle = '#33415c'; ctx.lineWidth = Math.max(2, h * 0.045); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - h); ctx.stroke();
    const n = 10; ctx.beginPath(); ctx.moveTo(bx, by - h);
    for (let i = 0; i <= n; i++) { const k = i / n; ctx.lineTo(bx + k * w, by - h + Math.sin(t * 7 + k * 5) * h * 0.05 * k); }
    for (let i = n; i >= 0; i--) { const k = i / n; ctx.lineTo(bx + k * w * 0.98, by - h * 0.62 + Math.sin(t * 7 + k * 5) * h * 0.05 * k); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + w * 0.3, by - h * 0.81, h * 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(bx, by - h, h * 0.045, 0, TAU); ctx.fill();
  }
  function drawShell(ctx, cam, o) {
    const [sx, sy] = pr(cam, o[2], o[3], 30), r = 9 * cam.S * 1.4 + 2, col = TEAM_COL[o[6]] || '#fff';
    ctx.fillStyle = 'rgba(0,40,90,.3)'; ell(ctx, px(cam, o[2]), py(cam, o[3], 0), r, r * cam.K); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, r * 2.2); g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; circ(ctx, sx, sy, r * 2.2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#2a2f3d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circ(ctx, sx, sy, r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; circ(ctx, sx, sy, r * 0.5); ctx.fill();
  }
  function drawTank(ctx, cam, p, t, team) {
    const S = cam.S, col = TEAM_COL[team] || '#8fa0b8';
    const a = p.face, cr = Math.cos(a), sr = Math.sin(a), L = PR * 1.35, Wd = PR * 1.0, hz = PR * 0.5, dark = '#232a3a';
    let alpha = 1; if (p.inv && Math.floor(t * 14) % 2) alpha = 0.45;
    const [sx, sy] = pr(cam, p.x, p.y, 0);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,35,80,.3)'; ell(ctx, sx, sy + 2, PR * 1.9 * S, PR * 1.25 * S * cam.K); ctx.fill();
    for (const sd of [-1, 1]) { // гусеницы
      const tx = p.x - sr * sd * (Wd + PR * 0.1), ty = p.y + cr * sd * (Wd + PR * 0.1);
      drawBox(ctx, cam, tx, ty, 0, L * 1.05, PR * 0.3, PR * 0.52, a, dark, '#000');
    }
    drawBox(ctx, cam, p.x, p.y, PR * 0.18, L * 0.95, Wd * 0.9, hz, a, col, '#0a2540');
    // башня и ствол
    const tz = PR * 0.18 + hz, bx = p.x + cr * L * 1.25, by = p.y + sr * L * 1.25;
    drawBox(ctx, cam, bx, by, tz + PR * 0.1, L * 0.85, PR * 0.2, PR * 0.2, a, '#2b3347', '#000');
    const cyTop = py(cam, p.y, tz);
    ctx.fillStyle = 'rgba(8,20,40,.8)'; ell(ctx, sx, cyTop, PR * 0.78 * S, PR * 0.78 * S * cam.K); ctx.fill();
    // пингвин-командир в люке
    const u = uOf(cam);
    ctx.save(); ctx.beginPath(); ctx.rect(sx - 4 * PR * S, cyTop - 6 * PR * S, 8 * PR * S, 6 * PR * S + PR * 0.26 * S * cam.K + 1); ctx.clip();
    Cos.drawPenguin(ctx, p.look, { x: sx, y: cyTop + PR * 0.5 * S * cam.K, u: u * 0.9, fx: Math.cos(a), fz: Math.sin(a), t: t * 1000, id: p.id, speed: 0, phase: 0, noShadow: true, alpha: 1 });
    ctx.restore();
    ctx.strokeStyle = '#2b3347'; ctx.lineWidth = Math.max(3, PR * 0.2 * S); ctx.beginPath(); ctx.ellipse(sx, cyTop, PR * 0.84 * S, PR * 0.84 * S * cam.K, 0, 0.05, Math.PI - 0.05); ctx.stroke();
    ctx.globalAlpha = 1; ctx.restore();
    return [sx, sy, u, 0];
  }
  function drawZone(ctx, cam, ex, st, t) {
    const x = ex.zx, y = ex.zy, r = ex.zr;
    let col = '#ffd23f';
    if (ex.occ) { const p = st.players.find((q) => q.id === ex.occ); if (p) col = Cos.color(p.look.c); }
    if (ex.ct) col = '#ff5d5d';
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ground(ctx, cam, () => {
      if (ex.w) { // следующая позиция
        ctx.setLineDash([24, 18]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * pulse})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex.nx, ex.ny, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(x, y, r + 14, 0, TAU); ctx.fill();
    });
    cylinder(ctx, cam, x, y, r, 14, 14, (sx, sy, rx, ry) => { const g = ctx.createRadialGradient(sx, sy, rx * 0.1, sx, sy, rx); g.addColorStop(0, '#fff7c4'); g.addColorStop(1, col); return g; }, lit(col, 0.72));
    ground(ctx, cam, () => {
      ctx.translate(0, zoff(cam, 14)); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r - 4, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.35 * pulse})`; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(x, y, r * (0.4 + 0.35 * ((t * 0.7) % 1)), 0, TAU); ctx.stroke();
    });
  }

  function drawTiles(ctx, cam, ex, th, t) {
    const tl = ex.tl || [];
    const h = 44, hs = TILES.S / 2 - 5;
    // темная вода под плитками
    ground(ctx, cam, () => { ctx.fillStyle = 'rgba(0,30,70,.28)'; for (let i = 0; i < TILES.list.length; i++) { if (tl[i] === 10) continue; const T = TILES.list[i]; ctx.fillRect(T.x - hs - 8, T.y - hs - 4, hs * 2 + 16, hs * 2 + 16); } });
    const order = TILES.list.map((T, i) => i).sort((a, b) => TILES.list[a].y - TILES.list[b].y || TILES.list[a].x - TILES.list[b].x);
    for (const i of order) {
      const T = TILES.list[i], k = tl[i] || 0; if (k === 10) continue;
      const shake = k ? Math.sin(t * 60 + i) * k * 0.45 : 0, sink = k * 2.2, tint = k / 9;
      const base = k === 0 ? '#e8f7ff' : tint < 0.5 ? '#cfe6f6' : '#a9c8e0';
      drawBox(ctx, cam, T.x + shake, T.y + shake * 0.5, -h - sink * 0.2, hs, hs, h, 0, base, 'rgba(60,120,170,.75)', k ? base : '#ffffff');
      if (k) {
        ground(ctx, cam, () => {
          ctx.translate(0, zoff(cam, -sink * 0.2)); ctx.strokeStyle = `rgba(30,70,120,${0.45 + tint * 0.4})`; ctx.lineWidth = 2.5 + tint * 2; ctx.lineJoin = 'round';
          const n = 1 + Math.floor(k / 2); const r = rngf(i * 97 + 5);
          for (let c = 0; c < n; c++) { ctx.beginPath(); let x = T.x + (r() - 0.5) * hs, y = T.y + (r() - 0.5) * hs; ctx.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (r() - 0.5) * 70; y += (r() - 0.5) * 70; ctx.lineTo(x, y); } ctx.stroke(); }
          if (k >= 6) { ctx.fillStyle = `rgba(255,90,60,${0.1 + 0.15 * Math.sin(t * 20)})`; ctx.fillRect(T.x - hs, T.y - hs, hs * 2, hs * 2); }
        });
      }
    }
  }

  /* ---------- игроки ---------- */
  function uOf(cam) { return PR * 0.8 * cam.S; }

  function drawPlayerPenguin(ctx, cam, p, t, o2) {
    const u = uOf(cam);
    let lift = 0, alpha = 1, sc = 1;
    if (!p.alive) { const f = clamp(p.fall, 0, 1); sc = Math.max(0.25, 1 - f * 0.75); alpha = Math.max(0, 1 - f * 1.05); lift = -f * u * 2.2; }
    if (p.air) lift += Math.sin(clamp(p.air, 0, 1) * Math.PI) * u * 2.2;
    const [sx, sy] = pr(cam, p.x, p.y, 0);
    const fx = Math.cos(p.face), fz = Math.sin(p.face);
    Cos.drawPenguin(ctx, p.look, Object.assign({
      x: sx, y: sy, u: u * sc, fx, fz, t: t * 1000, id: p.id, speed: Math.hypot(p.vx, p.vy), phase: p.walk || 0,
      dash: p.dash, boost: p.boost, shield: p.shield, frozen: p.frozen, hot: p.hot, inv: p.inv, alpha, lift, sad: !p.alive,
    }, o2 || {}));
    return [sx, sy, u * sc, lift];
  }

  function drawKart(ctx, cam, p, t) {
    const S = cam.S, col = (Cos.SKIN_COL[p.look.s] || Cos.color(p.look.c));
    const a = p.face, cr = Math.cos(a), sr = Math.sin(a);
    const L = PR * 1.35, Wd = PR * 0.98, hz = PR * 0.5;
    const rot = a;
    const dark = '#1b2233';
    const wheels = [[0.85, -1], [0.85, 1], [-0.85, -1], [-0.85, 1]].map(([lx, sd]) => {
      const wx = p.x + cr * lx * PR - sr * sd * (Wd + PR * 0.05), wy = p.y + sr * lx * PR + cr * sd * (Wd + PR * 0.05);
      return { wx, wy };
    }).sort((m, n) => m.wy - n.wy);
    const wheelDraw = (w) => drawBox(ctx, cam, w.wx, w.wy, 0, PR * 0.36, PR * 0.2, PR * 0.42, rot, dark, '#000');
    ctx.save();
    // тень
    const [sx, sy] = pr(cam, p.x, p.y, 0);
    ctx.fillStyle = 'rgba(0,35,80,.3)'; ell(ctx, sx, sy + 2, PR * 1.9 * S, PR * 1.25 * S * cam.K); ctx.fill();
    // эффекты ускорения (сзади)
    if (p.boost) {
      for (let i = 0; i < 2; i++) {
        const bx = p.x - cr * L * 1.05 - sr * (i ? 0.45 : -0.45) * PR, by = p.y - sr * L * 1.05 + cr * (i ? 0.45 : -0.45) * PR;
        const [fx0, fy0] = pr(cam, bx, by, PR * 0.35); const fl = 0.7 + 0.5 * Math.sin(t * 50 + i);
        const g = ctx.createRadialGradient(fx0, fy0, 1, fx0, fy0, PR * S * 1.3 * fl); g.addColorStop(0, 'rgba(255,255,200,.95)'); g.addColorStop(0.4, 'rgba(255,150,40,.8)'); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx0, fy0, PR * S * 1.3 * fl, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      }
    }
    wheelDraw(wheels[0]); wheelDraw(wheels[1]);
    // корпус и капот
    drawBox(ctx, cam, p.x, p.y, PR * 0.12, L, Wd, hz, rot, col, '#0a2540');
    const noseX = p.x + cr * L * 0.95, noseY = p.y + sr * L * 0.95;
    drawBox(ctx, cam, noseX, noseY, PR * 0.12, L * 0.42, Wd * 0.72, hz * 0.7, rot, lit(col, 0.9).startsWith('rgb') ? col : col, '#0a2540');
    // заднее антикрыло
    const spX = p.x - cr * L * 0.95, spY = p.y - sr * L * 0.95;
    drawBox(ctx, cam, spX, spY, PR * 0.55, PR * 0.18, Wd * 1.1, PR * 0.12, rot, '#222a3c', '#000');
    // полоса-гоночная
    ground(ctx, cam, () => { ctx.save(); ctx.translate(p.x, p.y + zoff(cam, PR * 0.12 + hz)); ctx.rotate(rot); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-L * 0.9, -Wd * 0.14, L * 1.8, Wd * 0.28); ctx.restore(); });
    // кокпит
    const cyTop = py(cam, p.y, PR * 0.12 + hz);
    ctx.fillStyle = 'rgba(8,20,40,.75)'; ell(ctx, sx, cyTop, PR * 0.86 * S, PR * 0.86 * S * cam.K); ctx.fill();
    wheelDraw(wheels[2]); wheelDraw(wheels[3]);
    // пингвин (виден по пояс)
    const u = uOf(cam);
    ctx.save();
    ctx.beginPath(); ctx.rect(sx - 4 * PR * S, cyTop - 6 * PR * S, 8 * PR * S, 6 * PR * S + PR * 0.28 * S * cam.K + 1); ctx.clip();
    const fx = Math.cos(p.face), fz = Math.sin(p.face);
    Cos.drawPenguin(ctx, p.look, { x: sx, y: cyTop + PR * 0.55 * S * cam.K, u: u * 0.95, fx, fz, t: t * 1000, id: p.id, speed: 0, phase: 0, boost: false, noShadow: true, cheer: p.fin === 1, alpha: 1 });
    ctx.restore();
    // передний борт кокпита
    ctx.strokeStyle = lit(col, 0.85); ctx.lineWidth = Math.max(3, PR * 0.22 * S); ctx.beginPath(); ctx.ellipse(sx, cyTop, PR * 0.9 * S, PR * 0.9 * S * cam.K, 0, 0.05, Math.PI - 0.05); ctx.stroke();
    ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(sx, cyTop, PR * 1.0 * S, PR * 1.0 * S * cam.K, 0, 0.05, Math.PI - 0.05); ctx.stroke();
    // номер финиша
    ctx.restore();
    return [sx, sy, u, 0];
  }

  /* ---------- главная отрисовка арены ---------- */
  function themeFor(st) { return THEMES[st.lobby ? 0 : st.md % THEMES.length] || THEMES[0]; }

  const FISH_COL = [['#ffb44d', '#ff8a1c', '#e5671c'], ['#fff28a', '#ffd23f', '#ffb000']];
  const PK = [{ e: '🐟', c: '255,200,60' }, { e: '❄️', c: '120,220,255' }, { e: '💥', c: '255,130,60' }, { e: '🛡️', c: '120,255,170' }];

  function draw(ctx, cam, st, t, dt) {
    drawMain(ctx, cam, st, t, dt);
    if (!st.lobby && st.md === 1 && st.ex) drawMinimap(ctx, cam, RACE.track(st.ex.mp || 0), st, 1);
  }
  function drawMain(ctx, cam, st, t, dt) {
    const th = themeFor(st), md = st.lobby ? 0 : st.md, ex = st.ex || {};
    drawWater(ctx, cam, th, t);
    // --- земля ---
    const R = (md === 0 || md === 11 || md === 15) && !st.lobby && ex.R ? ex.R : FLOE_R;
    if (md === 1 && !st.lobby) {
      drawBergs(ctx, cam, th, t, 300, 3500);
      drawTrack(ctx, cam, th, t, ex.mp, st.objs);
    } else {
      drawBergs(ctx, cam, th, t, 560, 1100);
      if (md === 6 && !st.lobby) drawTiles(ctx, cam, ex, th, t);
      else if (md === 3 && !st.lobby) drawCrownArena(ctx, cam, th, t);
      else if (md === 18 && !st.lobby) drawTankArena(ctx, cam, th, t);
      else {
        drawFloe(ctx, cam, R, th, t, { shrink: !st.lobby && st.phase === 1 && ((md === 0 && st.el > C.SHRINK_DELAY) || ((md === 11 || md === 15) && R < FLOE_R - 4)) });
        if (!st.lobby) {
          if (md === 17) drawSectors(ctx, cam, ex, R, t);
          else if (md === 13) drawLightLines(ctx, cam, ex, R);
          else if (md === 16) drawBeams(ctx, cam, ex, t);
          if (md === 8 || md === 11 || md === 12 || md === 14) drawZones(ctx, cam, st, t);
        }
      }
    }
    // --- ветер/предупреждения на земле ---
    if (md === 7 && !st.lobby) for (const o of st.objs) if (o[0] === 4) {
      const a = o[4] / 100, r = o[5], tl = o[6] / 100, pulse = 0.5 + 0.5 * Math.sin(t * 14);
      ground(ctx, cam, () => {
        ctx.save(); ctx.translate(o[2], o[3]); ctx.rotate(a);
        const g = ctx.createLinearGradient(0, 0, 1100, 0); g.addColorStop(0, `rgba(255,70,50,${0.5 + 0.25 * pulse})`); g.addColorStop(1, 'rgba(255,70,50,0)');
        ctx.fillStyle = g; ctx.fillRect(0, -r, 1100, r * 2);
        ctx.restore();
      });
    }
    // --- сортируемые объекты ---
    const q = [];
    for (const p of st.players) { if (p.spec) continue; if (!p.alive && p.fall >= 1) continue; q.push({ y: p.y, k: 'p', p }); }
    if (md === 7 && !st.lobby) for (const o of st.objs) if (o[0] === 3) q.push({ y: o[3], k: 'boulder', o });
    if (!st.lobby && md === 8) for (const o of st.objs) if (o[0] === 6) q.push({ y: o[3] + 800, k: 'meteor', o });
    if (!st.lobby && md === 9) for (const o of st.objs) if (o[0] === 5) q.push({ y: o[3], k: 'yeti', o });
    if (!st.lobby && md === 10) for (const o of st.objs) if (o[0] === 9) q.push({ y: o[3], k: 'pball', o });
    if (!st.lobby && md === 13) q.push({ y: LIGHT.Y1 - 60, k: 'lpost' });
    if (md === 3 && !st.lobby) { for (const o of CROWN.pillars) q.push({ y: o.y, k: 'pillar', o }); q.push({ y: CROWN.AH + 5, k: 'cfront' }); }
    if (md === 18 && !st.lobby) {
      for (const w of TANK.walls) q.push({ y: w.y + w.hh, k: 'twall', o: w }); q.push({ y: TANK.A + 5, k: 'tfront' });
      for (const o of st.objs) if (o[0] === 7) q.push({ y: o[3], k: 'shell', o });
      (ex.fl || []).forEach((f, i) => { if (!f[2]) q.push({ y: f[1], k: 'flag', f, i }); });
    }
    if (md === 4 && !st.lobby) { for (const o of SNOW_OBS) q.push({ y: o.y, k: 'fort', o }); for (const o of st.objs) if (o[0] === 2) q.push({ y: o[3], k: 'ball', o }); }
    if (md === 2 && !st.lobby) for (const o of st.objs) if (o[0] === 1) q.push({ y: o[3], k: 'fish', o });
    if (md === 0 && !st.lobby) for (const o of st.objs) if (o[0] === 0) q.push({ y: o[3], k: 'pick', o });
    if (md === 1 && !st.lobby) {
      for (const o of st.objs) if (o[0] === 10) q.push({ y: o[3], k: 'pile', o: { x: o[2], y: o[3], r: o[4] } });
      const tr0 = RACE.track(ex.mp || 0), g0 = RACE.at(tr0, 0, 0);
      for (const sd of [-1, 1]) { const gx = g0.x - g0.ty * sd * (tr0.hw + 24), gy = g0.y + g0.tx * sd * (tr0.hw + 24); q.push({ y: gy, k: 'gate', gx, gy }); }
    }
    q.sort((a, b) => a.y - b.y);
    const heads = [];
    for (const e of q) {
      switch (e.k) {
        case 'p': {
          const p = e.p;
          if (md === 3 && !st.lobby && ex.h === p.id && p.alive) ground(ctx, cam, () => { const g = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, 90); g.addColorStop(0, 'rgba(255,215,60,.85)'); g.addColorStop(1, 'rgba(255,215,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 90, 0, TAU); ctx.fill(); });
          if (p.ring && p.alive) ground(ctx, cam, () => { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, PR + 10, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.cd)); ctx.stroke(); });
          if (p.dash && p.alive && md !== 1) ground(ctx, cam, () => { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 5; for (const o of [-12, 0, 12]) { const c = Math.cos(p.face), s = Math.sin(p.face); ctx.beginPath(); ctx.moveTo(p.x - c * 26 - s * o, p.y - s * 26 + c * o); ctx.lineTo(p.x - c * 70 - s * o, p.y - s * 70 + c * o); ctx.stroke(); } });
          const h = md === 1 && !st.lobby ? drawKart(ctx, cam, p, t) : md === 18 && !st.lobby && ex.T && ex.T[p.id] != null ? drawTank(ctx, cam, p, t, ex.T[p.id]) : drawPlayerPenguin(ctx, cam, p, t);
          if (p.alive) heads.push({ p, h });
          break;
        }
        case 'meteor': drawMeteorRock(ctx, cam, e.o); break;
        case 'yeti': drawSnowman(ctx, cam, e.o, t); break;
        case 'pball': drawPushBall(ctx, cam, e.o); break;
        case 'lpost': drawLightPost(ctx, cam, ex.l, t); break;
        case 'pillar': drawPillar(ctx, cam, e.o); break;
        case 'twall': drawTankWall(ctx, cam, e.o); break;
        case 'tfront': drawTankFront(ctx, cam); break;
        case 'shell': drawShell(ctx, cam, e.o); break;
        case 'flag': drawFlag(ctx, cam, e.f[0], e.f[1], e.i, t, false, e.f[3]); break;
        case 'cfront': drawCrownFront(ctx, cam); break;
        case 'pile': drawMound(ctx, cam, e.o.x, e.o.y, e.o.r); break;
        case 'fort': drawMound(ctx, cam, e.o.x, e.o.y, e.o.r * 1.1); break;
        case 'pine': drawPine(ctx, cam, e.o.x, e.o.y, e.o.h); break;
        case 'gate': drawBox(ctx, cam, e.gx, e.gy, 0, 14, 14, 120, 0, '#e53946', '#0a2540', '#fff'); break;
        case 'boulder': {
          const o = e.o, r = o[6], [sx, sy] = pr(cam, o[2], o[3], r * 0.85), rr = r * cam.S, sp = Math.hypot(o[4], o[5]) || 1;
          ctx.fillStyle = 'rgba(0,40,90,.28)'; ell(ctx, sx + rr * 0.15, py(cam, o[3], 0) + rr * 0.05, rr * 1.05, rr * cam.K * 1.05); ctx.fill();
          const g = ctx.createRadialGradient(sx - rr * 0.35, sy - rr * 0.4, rr * 0.1, sx, sy, rr * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#dcecf8'); g.addColorStop(1, '#8fb2d2');
          ctx.fillStyle = g; ctx.strokeStyle = '#6b97bb'; ctx.lineWidth = 2; circ(ctx, sx, sy, rr); ctx.fill(); ctx.stroke();
          const spin = (o[2] * o[4] / sp + o[3] * o[5] / sp) / r;
          ctx.save(); circ(ctx, sx, sy, rr); ctx.clip(); ctx.fillStyle = 'rgba(120,160,200,.45)';
          for (let i = 0; i < 5; i++) { const a = spin + i * 1.3, dd = (0.25 + (i % 3) * 0.2) * rr * Math.cos(a * 0.7); circ(ctx, sx + Math.cos(a) * dd * 1.6, sy + Math.sin(a * 1.3 + i) * rr * 0.55, rr * (0.12 + (i % 2) * 0.08)); ctx.fill(); }
          ctx.restore();
          break;
        }
        case 'ball': {
          const o = e.o, [sx, sy] = pr(cam, o[2], o[3], 34), r = 10 * cam.S * 1.7 + 2;
          ctx.fillStyle = 'rgba(0,40,90,.3)'; ell(ctx, px(cam, o[2]), py(cam, o[3], 0), r, r * cam.K); ctx.fill();
          const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 1, sx, sy, r); g.addColorStop(0, '#fff'); g.addColorStop(1, '#a8c9e6'); ctx.fillStyle = g; ctx.strokeStyle = '#6b97bb'; ctx.lineWidth = 1.5; circ(ctx, sx, sy, r); ctx.fill(); ctx.stroke();
          break;
        }
        case 'fish': {
          const o = e.o, gold = o[4] === 3, [sx, sy] = pr(cam, o[2], o[3], 6 + Math.abs(Math.sin(t * 6 + o[1])) * 10), sc = (gold ? 24 : 18) * cam.S * 1.5;
          if (o[5] < 3 && Math.floor(t * 8) % 2) break;
          const gd = py(cam, o[3], 0);
          ctx.fillStyle = 'rgba(0,40,90,.25)'; ell(ctx, sx, gd + 2, sc * 1.2, sc * 0.45); ctx.fill();
          if (gold) { const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, sc * 2.4); g.addColorStop(0, 'rgba(255,230,90,.7)'); g.addColorStop(1, 'rgba(255,230,90,0)'); ctx.fillStyle = g; circ(ctx, sx, sy, sc * 2.4); ctx.fill(); }
          drawFish(ctx, sx, sy, sc, FISH_COL[gold ? 1 : 0], Math.sin(o[1] * 1.7) * 0.5 + Math.sin(t * 9 + o[1]) * 0.25, Math.sin(t * 16 + o[1]));
          break;
        }
        case 'pick': {
          const o = e.o, k = PK[o[4] | 0], bob = Math.sin(t * 4 + o[1]) * 6, [sx, sy] = pr(cam, o[2], o[3], 38 + bob), r = 21 * cam.S * 1.6 + 6;
          ground(ctx, cam, () => { const g = ctx.createRadialGradient(o[2], o[3], 4, o[2], o[3], 52); g.addColorStop(0, `rgba(${k.c},.8)`); g.addColorStop(1, `rgba(${k.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o[2], o[3], 52, 0, TAU); ctx.fill(); });
          const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.35, 1, sx, sy, r); g.addColorStop(0, '#fff'); g.addColorStop(1, `rgba(${k.c},.95)`);
          ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; circ(ctx, sx, sy, r); ctx.fill(); ctx.stroke();
          ctx.font = `${Math.round(r * 1.2)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(k.e, sx, sy + 1);
          break;
        }
      }
    }
    // --- надстройки над головами ---
    const nf = Math.max(12, Math.min(17, 11 + cam.S * 6));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const { p, h } of heads) {
      const [sx, sy, u, lift] = h, topY = sy - u * 2.85 - lift - (md === 1 && !st.lobby ? u * 0.0 : 0);
      let yy = topY;
      if (md === 5 && p.hot) { drawBomb(ctx, sx, yy - u * 0.9, u * 0.62, t, ex.f, (ex.f || 9) < 3.2 && Math.floor(t * (6 + (3.2 - (ex.f || 0)) * 3)) % 2 === 0); yy -= u * 2.0; }
      if (md === 18 && !st.lobby && ex.fl) { const fi = ex.fl.findIndex((f) => f[2] === p.id); if (fi >= 0) { drawFlagShape(ctx, sx, yy + u * 0.2, u * 2.4, u * 1.5, TEAM_COL[fi], t); yy -= u * 2.0; } }
      if (md === 3 && !st.lobby && ex.h === p.id) { ctx.font = `${Math.round(u * 1.5)}px serif`; ctx.fillStyle = '#000'; ctx.fillText('👑', sx, yy - u * 0.5 + Math.sin(t * 5) * 3); yy -= u * 1.4; }
      if (!st.lobby && Sim.MODES[md] && Sim.MODES[md].hearts) {
        const n = p.a | 0, hs = u * 0.42; const x0 = sx - ((n - 1) * hs * 1.15) / 2;
        for (let i = 0; i < n; i++) { ctx.fillStyle = '#ff4d6d'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; Cos.heart(ctx, x0 + i * hs * 1.15, yy - hs, hs * 0.6); ctx.fill(); ctx.stroke(); }
        yy -= hs * 2.4;
      }
      if (md === 1 && !st.lobby && p.b) { ctx.font = `bold ${nf + 3}px "Trebuchet MS",sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,30,60,.9)'; ctx.fillStyle = '#ffd23f'; ctx.strokeText('#' + p.b, sx, yy - 4); ctx.fillText('#' + p.b, sx, yy - 4); yy -= nf + 6; }
      // имя
      ctx.font = `bold ${nf}px "Trebuchet MS",system-ui,sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,30,60,.85)'; ctx.fillStyle = p.isMe ? '#ffd23f' : '#fff';
      ctx.strokeText(p.name, sx, yy - nf * 0.6); ctx.fillText(p.name, sx, yy - nf * 0.6);
      if (p.isMe) { const by = yy - nf * 1.5 + Math.sin(t * 6) * 3; ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx - 8, by - 12); ctx.lineTo(sx + 8, by - 12); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (p.emote) { ctx.font = `${Math.round(Math.max(30, u * 1.8))}px serif`; ctx.fillStyle = '#000'; ctx.fillText(p.emote.e, sx + u * 1.5, topY - u * 0.4 - (1 - p.emote.k) * 14); }
    }
    drawParts(ctx, cam, dt);
    // ветер (сумо)
    if (ex.wd) {
      const [wa, ws] = ex.wd; ctx.strokeStyle = `rgba(255,255,255,${ws === 2 ? 0.5 : 0.2})`; ctx.lineWidth = 3;
      const n = ws === 2 ? 26 : 8;
      for (let i = 0; i < n; i++) { const k = (t * (ws === 2 ? 1.6 : 0.4) + i * 0.137) % 1, x0 = ((i * 0.618) % 1) * cam.W, y0 = ((i * 0.3819) % 1) * cam.H, dx = Math.cos(wa), dy = Math.sin(wa) * 0.6; const x = x0 + dx * k * 500 - 250 * dx, y = y0 + dy * k * 500 - 250 * dy; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 90, y + dy * 90); ctx.stroke(); }
    }
    drawSnowfall(ctx, cam, th, t, dt, ex.wd && ex.wd[1] === 2 ? ex.wd[0] : 0);
  }

  /* ---------- пьедестал ---------- */
  function drawCage(ctx, cam, x, y, t, drawInner) {
    const hw = PR * 1.5, hh = PR * 3.3, hx = hw, hy = hw;
    const c = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([a, b]) => [x + a, y + b]);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const bar = (X, Y, w) => { const a = pr(cam, X, Y, 0), b = pr(cam, X, Y, hh); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const bw = Math.max(2, PR * 0.14 * cam.S);
    // плита-основание
    drawBox(ctx, cam, x, y, 0, hx + PR * 0.2, hy + PR * 0.2, PR * 0.3, 0, '#59647c', '#0a2540');
    ctx.strokeStyle = '#2a3347';
    // задние прутья
    for (let i = 0; i <= 6; i++) { const f = -1 + (i / 6) * 2; bar(x + f * hx, y - hy, bw); }
    for (const sd of [-1, 1]) for (let i = 1; i < 6; i++) { const f = -1 + (i / 6) * 2; bar(x + sd * hx, y + f * hy, bw); }
    drawInner();
    // передние прутья и верх
    ctx.strokeStyle = '#3a455f';
    for (let i = 0; i <= 6; i++) { const f = -1 + (i / 6) * 2; bar(x + f * hx, y + hy, bw * 1.15); }
    ctx.strokeStyle = '#2a3347';
    const rim = (z) => { ctx.lineWidth = bw * 1.5; ctx.beginPath(); c.forEach((q, i) => { const s = pr(cam, q[0], q[1], z); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.closePath(); ctx.stroke(); };
    rim(hh); rim(PR * 0.9);
    // крыша
    ctx.fillStyle = 'rgba(70,82,110,.55)'; ctx.beginPath(); c.forEach((q, i) => { const s = pr(cam, q[0], q[1], hh); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.closePath(); ctx.fill();
    // замок
    const lk = pr(cam, x, y + hy, PR * 1.7); ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 2; ctx.fillRect(lk[0] - 9, lk[1], 18, 14); ctx.strokeRect(lk[0] - 9, lk[1], 18, 14); ctx.beginPath(); ctx.arc(lk[0], lk[1], 7, Math.PI, TAU); ctx.stroke();
  }

  const MEDAL = ['#ffd23f', '#d6dde8', '#d98a4a'];
  function drawPodium(ctx, W, H, rank, t, dt, opts) {
    // rank: [{id,name,look,score,place(1..), isMe}] — по порядку мест
    const th = THEMES[3];
    const asp = H / W, K = clamp(0.6 + (asp - 1) * 0.22, 0.6, 0.8), ZH = Math.sqrt(1 - K * K);
    const n = rank.length; if (!n) return;
    const podiumN = Math.max(1, n - 1), slotW = PR * 2.5;
    // слоты: 1 — центр, 2 — слева, 3 — справа, 4 — левее, ...
    const slot = (place) => { if (place === 1) return 0; const k = Math.ceil((place - 1) / 2); return place % 2 === 0 ? -k : k; };
    let minS = 0, maxS = 0; for (let p = 1; p <= podiumN; p++) { const s = slot(p); minS = Math.min(minS, s); maxS = Math.max(maxS, s); }
    const cageSlot = maxS + 1.9; // клетка справа от пьедестала
    const worldW = (cageSlot - minS) * slotW + slotW * 2.2, worldCx = ((cageSlot + minS) / 2) * slotW;
    const S = Math.min(W / worldW, (H * 0.8) / (PR * 9 * ZH + PR * 3 * K));
    const cam = { W, H, K, ZH, S, ox: W / 2, oy: H * 0.66, cx: worldCx, cy: 0 };
    drawWater(ctx, cam, th, t);
    // прожектор
    const gg = ctx.createRadialGradient(W / 2, H * 0.1, 10, W / 2, H * 0.55, Math.max(W, H) * 0.7); gg.addColorStop(0, 'rgba(255,240,180,.35)'); gg.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    // льдина-сцена
    const stageHalf = (worldW / 2) * 0.98;
    ctx.save();
    const sx0 = px(cam, worldCx), sy0 = py(cam, 0, 0);
    const rxs = stageHalf * S, rys = (PR * 3.2) * S * K * 1.0 + PR * 2.2 * S * K;
    // широкий овал льда
    ctx.fillStyle = (() => { const g = ctx.createLinearGradient(0, sy0 - rys, 0, sy0 + rys + 50 * S); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cde8f8'); return g; })();
    const th2 = 40 * ZH * S;
    ctx.fillStyle = '#6aa5d6'; ell(ctx, sx0, sy0 + th2, rxs, rys); ctx.fill(); ctx.fillRect(sx0 - rxs, sy0, rxs * 2, th2);
    ctx.fillStyle = (() => { const g = ctx.createRadialGradient(sx0, sy0 - rys * 0.3, rxs * 0.1, sx0, sy0, rxs); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfe6f6'); return g; })();
    ell(ctx, sx0, sy0, rxs, rys); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    // сущности: ступени, пингвины, клетка — по y (все на одной линии, порядок: дальние сначала)
    const stepH = (place) => PR * (2.6 - 0.55 * (place - 1)) * (place === 1 ? 1.12 : 1);
    const items = [];
    const sorted = rank.slice();
    const heads = [];
    // ступени: рисуем от краёв к центру (чтобы центральная перекрывала)
    const podium = sorted.filter((r) => r.place < n || n === 1);
    const order = podium.slice().sort((a, b) => Math.abs(slot(b.place)) - Math.abs(slot(a.place)));
    for (const r of order) {
      const x = slot(r.place) * slotW, h = Math.max(PR * 0.9, stepH(r.place)), col = r.place <= 3 ? MEDAL[r.place - 1] : '#a8cdea';
      drawBox(ctx, cam, x, 0, 0, slotW * 0.46, PR * 1.25, h, 0, col, '#0a2540', col);
      // номер на передней грани
      const f = pr(cam, x, PR * 1.25, h * 0.45);
      ctx.font = `bold ${Math.round(PR * 1.3 * S)}px "Trebuchet MS",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(10,37,64,.75)'; ctx.fillText(String(r.place), f[0], f[1]);
      items.push({ r, x, z: h });
    }
    // пингвины на ступенях
    for (const it of items.sort((a, b) => a.x - b.x)) {
      const r = it.r, [sx, sy] = pr(cam, it.x, 0, it.z), u = PR * 0.8 * S * (r.place === 1 ? 1.12 : 1);
      Cos.drawPenguin(ctx, r.look, { x: sx, y: sy, u, fx: 0, fz: 1, t: t * 1000, id: r.id, cheer: r.place === 1, shield: false, noShadow: false });
      heads.push({ r, sx, sy: sy - u * 2.9, u });
      if (r.place === 1) { ctx.font = `${Math.round(u * 1.4)}px serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('👑', sx, sy - u * 3.5 + Math.sin(t * 4) * 3); }
    }
    // клетка с последним
    const last = sorted.find((r) => r.place === n && n > 1);
    if (last) {
      const x = cageSlot * slotW, y = 0;
      drawCage(ctx, cam, x, y, t, () => {
        const [sx, sy] = pr(cam, x, y, PR * 0.3), u = PR * 0.8 * S;
        Cos.drawPenguin(ctx, last.look, { x: sx, y: sy, u, fx: 0, fz: 1, t: t * 1000, id: last.id, sad: true, noShadow: true });
        heads.push({ r: last, sx, sy: sy - u * 2.9, u, caged: true });
      });
    }
    // подписи
    const nf = clamp(10 + S * 7, 11, 18);
    for (const h of heads) {
      const r = h.r, y0 = h.sy - (h.caged ? PR * 2.2 * S : 0) - 8;
      ctx.font = `bold ${nf}px "Trebuchet MS",system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,30,60,.85)';
      ctx.fillStyle = r.isMe ? '#ffd23f' : '#fff'; ctx.strokeText(r.name, h.sx, y0 - nf * 0.2); ctx.fillText(r.name, h.sx, y0 - nf * 0.2);
      ctx.fillStyle = '#ffe08a'; ctx.strokeText(r.score + ' 🏅', h.sx, y0 - nf * 1.35); ctx.fillText(r.score + ' 🏅', h.sx, y0 - nf * 1.35);
    }
    // конфетти
    if (opts && opts.confetti) {
      if (!drawPodium.conf || drawPodium.conf.length < 90) { drawPodium.conf = []; for (let i = 0; i < 90; i++) drawPodium.conf.push({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random(), r: Math.random() * 6, c: ['#ff5d5d', '#ffd23f', '#6be36b', '#3fd0ff', '#c06bff', '#ff6bd0'][i % 6] }); }
      for (const c of drawPodium.conf) {
        c.y += dt * 0.12 * c.s; c.x += Math.sin(t * 2 + c.r) * dt * 0.03; if (c.y > 1.05) { c.y = -0.05; c.x = Math.random(); }
        ctx.save(); ctx.translate(c.x * W, c.y * H); ctx.rotate(c.r + t * 3 * c.s); ctx.fillStyle = c.c; ctx.fillRect(-4, -2, 8, 4 + Math.sin(t * 8 + c.r) * 2); ctx.restore();
      }
    }
  }

  /* ---------- фон меню ---------- */
  function drawMenuBg(ctx, W, H, t, dt) {
    const cam = makeCam(W, H, { r: 400 }, 0, 0);
    const th = THEMES[0];
    drawWater(ctx, cam, th, t);
    drawBergs(ctx, cam, th, t, 420, 900);
    cam.oy = H * 0.72;
    drawFloe(ctx, cam, 300, th, t, { thick: 50 });
    drawSnowfall(ctx, cam, th, t, dt, 0);
  }

  /* ---------- мини-сцена для превью пингвина (кликер/гардероб) ---------- */
  function drawStage(ctx, w, h, look, t, o) {
    o = o || {};
    ctx.save();
    const g = ctx.createRadialGradient(w / 2, h * 0.86, 4, w / 2, h * 0.86, w * 0.5); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ell(ctx, w / 2, h * 0.86, w * 0.45, h * 0.12); ctx.fill();
    ctx.fillStyle = '#e6f6ff'; ell(ctx, w / 2, h * 0.86, w * 0.38, h * 0.09); ctx.fill();
    const u = (o.u || h * 0.3) * (o.squash || 1);
    const by = h * 0.86;
    if (o.sx || o.sy || o.lift || o.rot) { ctx.translate(w / 2, by - (o.lift || 0)); ctx.rotate(o.rot || 0); ctx.scale(o.sx || 1, o.sy || 1); ctx.translate(-w / 2, -by); }
    const fx = o.fx != null ? o.fx : Math.sin(t * 0.0013) * 0.7, fz = o.fz != null ? o.fz : Math.max(0.35, Math.cos(t * 0.0013));
    Cos.drawPenguin(ctx, look, { x: w / 2, y: h * 0.86, u, fx, fz, t, id: 2, cheer: o.cheer });
    ctx.restore();
  }

  root.Scene = { makeCam, draw, drawPodium, drawMenuBg, drawStage, part, puff, sparks, ring, popup, chunk, clearParts, THEMES, PK, FLOE_R, pr, drawParts, ground };
})(window);
