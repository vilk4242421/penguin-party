/* Пингвины — общая симуляция: матч/турнир, 8 режимов, боты.
 * Один и тот же код работает на сервере (онлайн) и в браузере (офлайн против ботов). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const C = {
    PROTO: 3, VERSION: '3.0.0',
    R0: 360, PR: 34,
    MAX: 8, MIN_TOTAL: 5,
    INTRO: 3.6, COUNT: 3.2, OVER: 5.5, FINAL: 16,
    LOBBY_SOLO: 15, LOBBY_MULTI: 8, LOBBY_AFTER: 7,
    N_COLORS: 17, N_PAT: 6, N_HAT: 16, N_EYE: 5, N_TRAIL: 6, N_SKIN: 2, N_EMO: 8,
    LENS: [3, 5, 7],
    SHRINK_DELAY: 5, SHRINK_RATE: 11, BOOST_T: 6, SHIELD_T: 6, FREEZE_T: 1.6, WIND_F: 420,
    N_MODES: 8,
  };

  const rnd = (n) => Math.floor(Math.random() * n);
  const rr = (a, b) => a + Math.random() * (b - a);
  const wrapPi = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);
  const BOT_NAMES = ['Snowy', 'Frosty', 'Iceberg', 'Waddle', 'Pingu', 'Mumble', 'Skipper', 'Gunter', 'Chilly', 'Flip', 'Rico', 'Kowalski', 'Ледышка', 'Морозко', 'Пинга', 'Снежок'];

  function cleanLook(l) {
    l = l || {};
    const n = (v, m) => { v = v | 0; return v >= 0 && v < m ? v : 0; };
    return { c: n(l.c, C.N_COLORS), p: n(l.p, C.N_PAT), h: n(l.h, C.N_HAT), e: n(l.e, C.N_EYE), t: n(l.t, C.N_TRAIL), s: n(l.s, C.N_SKIN) };
  }

  /* ---------- геометрия режимов (используется и клиентом) ---------- */
  const RACE = { RC: 700, HW: 150, LAPS: 3, Ri: 550, Ro: 850 };
  RACE.obs = [[1.0, -70], [1.9, 70], [2.9, -70], [3.9, 70], [4.8, -70], [5.8, 70]].map(([a, o]) => ({ th: a, off: o, x: Math.cos(a) * (RACE.RC + o), y: Math.sin(a) * (RACE.RC + o), r: 44 }));
  RACE.pads = [[0.5, 60], [2.4, -60], [3.4, 60], [5.3, -60]].map(([a, o]) => ({ th: a, off: o, x: Math.cos(a) * (RACE.RC + o), y: Math.sin(a) * (RACE.RC + o), r: 62 }));
  const TILES = { N: 6, S: 120, O: -360, FALL_T: 1.5, DWELL: 1.1 };
  TILES.list = [];
  TILES.grid = new Array(TILES.N * TILES.N).fill(-1);
  for (let gy = 0; gy < TILES.N; gy++) for (let gx = 0; gx < TILES.N; gx++) {
    const x = TILES.O + gx * TILES.S + TILES.S / 2, y = TILES.O + gy * TILES.S + TILES.S / 2;
    if (Math.hypot(x, y) > 410) continue;
    TILES.grid[gy * TILES.N + gx] = TILES.list.length; TILES.list.push({ x, y });
  }
  const SNOW_V = 600;
  const SNOW_OBS = [0, 1, 2, 3].map((k) => { const a = Math.PI / 4 + k * Math.PI / 2; return { x: Math.cos(a) * 185, y: Math.sin(a) * 185, r: 46 }; });

  /* ---------- вспомогательные ---------- */
  function resetP(p) {
    p.vx = p.vy = 0; p.alive = true; p.spec = false; p.fall = 0; p.dash = 0; p.cd = 0; p.boost = 0; p.shield = 0; p.frozen = 0; p.air = 0; p.inv = 0; p.cant = 0;
    p.dashReq = false; p.in.x = p.in.y = 0; p.a = 0; p.b = 0; p.last = 0; p.lastT = -99; p.outT = 0; p.done = false; p.speedMul = 1; p.hot = false; p.fin = 0;
  }
  function placeRing(g, r) {
    const parts = g.players.filter((p) => p.inRound), n = parts.length, a0 = Math.random() * TAU;
    parts.forEach((p, i) => { const a = a0 + (i / n) * TAU; p.x = Math.cos(a) * r; p.y = Math.sin(a) * r; p.face = a + Math.PI; });
  }
  function steer(p, tx, ty, mag) {
    const dx = tx - p.x, dy = ty - p.y, m = Math.hypot(dx, dy) || 1;
    p.in.x = (dx / m) * mag; p.in.y = (dy / m) * mag;
  }
  function pushFrom(p, ox, oy, orad, bounce) {
    const dx = p.x - ox, dy = p.y - oy, d = Math.hypot(dx, dy), min = orad + C.PR * 0.85;
    if (d < min && d > 0) {
      const nx = dx / d, ny = dy / d; p.x = ox + nx * min; p.y = oy + ny * min;
      const vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= (1 + bounce) * vn * nx; p.vy -= (1 + bounce) * vn * ny; }
      return true;
    }
    return false;
  }
  const nearestAlive = (g, p, pred) => {
    let best = null, bd = 1e9;
    for (const q of g.players) { if (q === p || !q.alive || !q.inRound || (pred && !pred(q))) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } }
    return best ? { q: best, d: bd } : null;
  };

  /* ====================================================================
   *  РЕЖИМЫ
   * ==================================================================== */
  const MODES = [];

  /* ---------- 0. Сумо на льдине ---------- */
  MODES.push({
    id: 0, key: 'sumo', icon: '🧊', timed: 0, view: { r: 400 },
    ru: { name: 'Сумо на льдине', goal: 'Столкни всех в воду. Последний на льдине — победитель!', btn: 'РЫВОК' },
    en: { name: 'Ice Sumo', goal: 'Knock everyone into the water. Last one standing wins!', btn: 'DASH' },
    phys: { acc: 900, fric: 1.7, dashV: 700, dashT: 0.3, dashCD: 1.5 },
    init(g) {
      g.ms = { R: C.R0, pk: [], fishT: g.cfg.chaos ? 2.5 : 6, windS: 0, windT: (g.cfg.chaos ? 8 : 12) + Math.random() * 4, windA: 0 };
      placeRing(g, C.R0 * 0.55);
    },
    step(g, dt) {
      const ms = g.ms, chaos = g.cfg.chaos, alive = g.alive();
      if (g.elapsed > C.SHRINK_DELAY) ms.R = Math.max(8, C.R0 - (g.elapsed - C.SHRINK_DELAY) * C.SHRINK_RATE * (chaos ? 1.35 : 1));
      ms.windT -= dt;
      if (ms.windS === 0 && g.elapsed > 6 && ms.windT <= 0) { ms.windS = 1; ms.windA = Math.random() * TAU; ms.windT = 1.6; g.events.push(['wind', +ms.windA.toFixed(2)]); }
      else if (ms.windS === 1 && ms.windT <= 0) { ms.windS = 2; ms.windT = 3; }
      else if (ms.windS === 2 && ms.windT <= 0) { ms.windS = 0; ms.windT = (chaos ? 7 : 14) + Math.random() * 6; }
      if (ms.windS === 2) {
        const wx = Math.cos(ms.windA) * C.WIND_F * dt, wy = Math.sin(ms.windA) * C.WIND_F * dt;
        for (const p of alive) { const k = g.mass(p) * 0.6 + 0.4; p.vx += wx / k; p.vy += wy / k; }
      }
      for (const p of alive) g.integrate(p, dt);
      g.collideAll(alive);
      ms.fishT -= dt;
      if (ms.fishT <= 0) {
        ms.fishT = chaos ? 2.5 : 6;
        if (ms.pk.length < (chaos ? 4 : 2) && ms.R > 140) {
          const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * (ms.R - 80), q = Math.random();
          ms.pk.push({ id: ++g.uid, x: Math.cos(a) * r, y: Math.sin(a) * r, kind: q < 0.4 ? 0 : q < 0.6 ? 1 : q < 0.85 ? 2 : 3 });
        }
      }
      for (const p of alive) for (let k = ms.pk.length - 1; k >= 0; k--) {
        const f = ms.pk[k];
        if (Math.hypot(p.x - f.x, p.y - f.y) < C.PR + 16) {
          ms.pk.splice(k, 1);
          g.events.push(['pick', p.id, Math.round(f.x), Math.round(f.y), f.kind]);
          if (f.kind === 0) p.boost = C.BOOST_T;
          else if (f.kind === 3) p.shield = C.SHIELD_T;
          else if (f.kind === 1) { for (const q of g.players) if (q !== p && q.alive && q.inRound && Math.hypot(q.x - p.x, q.y - p.y) < 280) q.frozen = C.FREEZE_T; g.events.push(['freeze', Math.round(p.x), Math.round(p.y)]); }
          else {
            for (const q of g.players) {
              if (q === p || !q.alive || !q.inRound) continue;
              const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
              if (d < 330 && d > 0) { const imp = (260 + 520 * (1 - d / 330)) / g.mass(q); q.vx += (dx / d) * imp; q.vy += (dy / d) * imp; q.last = p.id; q.lastT = g.time; }
            }
            g.events.push(['shock', Math.round(p.x), Math.round(p.y)]);
          }
        }
      }
      for (const p of alive) {
        if (Math.hypot(p.x, p.y) > ms.R + 6) {
          const kid = p.last && g.time - p.lastT < 4 ? p.last : 0;
          g.eliminate(p, kid, 'fall');
        }
      }
      g.checkElim();
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      const dc = Math.hypot(p.x, p.y);
      if (a.t <= 0) {
        a.t = 0.12 + Math.random() * 0.18;
        let best = 0, bs = 1e9;
        for (const q of g.players) {
          if (q === p || !q.alive || !q.inRound) continue;
          const s = Math.hypot(q.x - p.x, q.y - p.y) - (Math.hypot(q.x, q.y) / ms.R) * 160 + Math.random() * 40;
          if (s < bs) { bs = s; best = q.id; }
        }
        a.target = best; a.fish = null;
        for (const f of ms.pk) if (Math.hypot(f.x - p.x, f.y - p.y) < 260) { a.fish = f; break; }
        a.wantDash = Math.random() < a.dashP * 0.45;
      }
      const tg = g.players.find((q) => q.id === a.target && q.alive);
      let ix, iy;
      if (a.fish && dc < ms.R - 110) { ix = a.fish.x - p.x; iy = a.fish.y - p.y; }
      else if (tg) { const tdc = Math.hypot(tg.x, tg.y) || 1; ix = tg.x - (tg.x / tdc) * C.PR * 1.3 - p.x; iy = tg.y - (tg.y / tdc) * C.PR * 1.3 - p.y; }
      else { ix = -p.x; iy = -p.y; }
      const m = Math.hypot(ix, iy) || 1; ix /= m; iy /= m;
      const safe = ms.R - 90, outward = dc > 1 ? (p.vx * p.x + p.vy * p.y) / dc : 0;
      if (dc > safe && outward > -60) { ix = -p.x / dc; iy = -p.y / dc; }
      else if (dc > safe - 40 && outward > 160) { ix = -p.x / dc; iy = -p.y / dc; }
      p.in.x = ix * a.skill * 0.8; p.in.y = iy * a.skill * 0.8;
      if (tg && a.wantDash && g.elapsed > 1.8 && p.cd <= 0 && dc < ms.R - 140) {
        const d = Math.hypot(tg.x - p.x, tg.y - p.y), tOut = Math.hypot(tg.x, tg.y) > dc - 25;
        if (d < 110 && tOut) { p.dashReq = true; a.wantDash = false; }
      }
    },
    ex(g) { const ms = g.ms; return { R: +ms.R.toFixed(1), wd: ms.windS ? [+ms.windA.toFixed(2), ms.windS] : 0 }; },
    objs(g) { return g.ms.pk.map((f) => [0, f.id, Math.round(f.x), Math.round(f.y), f.kind]); },
  });

  /* ---------- 1. Гонка по льду ---------- */
  MODES.push({
    id: 1, key: 'race', icon: '🏎️', timed: 0, view: { follow: true, zoom: 440 },
    ru: { name: 'Гонка по льду', goal: 'Проедь 3 круга первым! Плиты ускоряют, сугробы мешают.', btn: 'ТУРБО' },
    en: { name: 'Ice Race', goal: 'Finish 3 laps first! Pads boost you, snow piles slow you.', btn: 'TURBO' },
    phys: { acc: 1300, fric: 2.5, dashV: 420, dashT: 0.35, dashCD: 3.2, dashBoost: 1.2, boostAcc: 1.35 },
    init(g) {
      g.ms = { first: -1, fin: [] };
      const parts = g.players.filter((p) => p.inRound).sort(() => Math.random() - 0.5);
      parts.forEach((p, i) => {
        const row = Math.floor(i / 2), ang = -0.075 * (row + 1) - 0.02, lane = i % 2 === 0 ? -55 : 55;
        p.x = Math.cos(ang) * (RACE.RC + lane); p.y = Math.sin(ang) * (RACE.RC + lane);
        p.face = ang + Math.PI / 2; p.prog = ang; p.lastTh = ang; p.lap = 0; p.padCd = 0;
      });
    },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) {
        g.integrate(p, dt);
      }
      g.collideAll(alive);
      for (const p of alive) {
        const d = Math.hypot(p.x, p.y) || 1, lo = RACE.Ri + C.PR * 0.8, hi = RACE.Ro - C.PR * 0.8;
        if (d < lo || d > hi) {
          const tgt = d < lo ? lo : hi, nx = p.x / d, ny = p.y / d; p.x = nx * tgt; p.y = ny * tgt;
          const vn = p.vx * nx + p.vy * ny;
          if (d < lo ? vn < 0 : vn > 0) { p.vx -= 1.4 * vn * nx; p.vy -= 1.4 * vn * ny; }
          p.vx *= 0.985; p.vy *= 0.985;
        }
        for (const o of RACE.obs) if (pushFrom(p, o.x, o.y, o.r, 0.25)) { p.vx *= 0.8; p.vy *= 0.8; }
        p.padCd -= dt;
        if (p.padCd <= 0) for (const pd of RACE.pads) if (Math.hypot(p.x - pd.x, p.y - pd.y) < pd.r) {
          const dd = Math.hypot(p.x, p.y) || 1; p.vx += (-p.y / dd) * 330; p.vy += (p.x / dd) * 330; p.boost = Math.max(p.boost, 1.1); p.padCd = 0.6;
          g.events.push(['pad', p.id]);
        }
        const th = Math.atan2(p.y, p.x); p.prog += wrapPi(th - p.lastTh); p.lastTh = th;
        const lap = Math.max(0, Math.floor(p.prog / TAU));
        if (lap > p.lap && lap < RACE.LAPS) { p.lap = lap; g.events.push(['lap', p.id, lap + 1]); }
        if (!p.fin && p.prog >= RACE.LAPS * TAU) {
          ms.fin.push(p.id); p.fin = ms.fin.length; p.finT = g.elapsed; p.done = true;
          if (ms.first < 0) ms.first = g.elapsed;
          g.events.push(['finish', p.id, p.fin]);
        }
        p.a = clampN(Math.floor((Math.max(0, p.prog) / TAU) * 100), 0, 300); p.b = p.fin;
      }
      const left = alive.filter((p) => !p.fin);
      if (left.length === 0 || (ms.first >= 0 && g.elapsed - ms.first > 9) || g.elapsed > 85) {
        const order = ms.fin.slice();
        left.sort((a, b) => b.prog - a.prog).forEach((p) => order.push(p.id));
        g.finishRound(order);
      }
    },
    bot(g, p, dt) {
      const a = p.ai; a.t -= dt;
      const th = Math.atan2(p.y, p.x);
      if (a.t <= 0) {
        a.t = 0.25 + Math.random() * 0.3; a.lane = (a.lane || 0) * 0.6 + rr(-90, 90) * 0.4;
        for (const o of RACE.obs) { const dth = wrapPi(o.th - th); if (dth > 0 && dth < 0.6 && Math.abs(a.lane - o.off) < 90) a.lane = o.off > 0 ? -100 : 100; }
        for (const pd of RACE.pads) { const dth = wrapPi(pd.th - th); if (dth > 0 && dth < 0.5 && Math.random() < 0.6) a.lane = pd.off; }
        a.wantDash = Math.random() < 0.4;
      }
      const la = 0.2 + (Math.hypot(p.vx, p.vy) / 520) * 0.12, rad = RACE.RC + a.lane;
      steer(p, Math.cos(th + la) * rad, Math.sin(th + la) * rad, a.skill);
      if (a.wantDash && p.cd <= 0 && !p.fin) { p.dashReq = true; a.wantDash = false; }
    },
    ex(g) { const ms = g.ms; return { fl: ms.first >= 0 ? +Math.max(0, 9 - (g.elapsed - ms.first)).toFixed(1) : -1 }; },
    objs() { return []; },
  });

  /* ---------- 2. Рыбалка ---------- */
  MODES.push({
    id: 2, key: 'fish', icon: '🐟', timed: 45, view: { r: 400 },
    ru: { name: 'Рыбалка', goal: 'За 45 секунд собери больше всех рыбы. Золотая — целых 3 очка!', btn: 'РЫВОК' },
    en: { name: 'Fishing', goal: 'Collect the most fish in 45 seconds. Golden fish are worth 3!', btn: 'DASH' },
    phys: { acc: 950, fric: 1.9, dashV: 560, dashT: 0.25, dashCD: 1.8 },
    init(g) { g.ms = { fish: [], spawnT: 0.2 }; placeRing(g, 200); for (const p of g.players) p.lastPick = 0; },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 350); }
      g.collideAll(alive);
      ms.spawnT -= dt;
      if (ms.spawnT <= 0) {
        ms.spawnT = 0.5;
        if (ms.fish.length < 11) {
          const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 285, gold = Math.random() < 0.14;
          ms.fish.push({ id: ++g.uid, x: Math.cos(a) * r, y: Math.sin(a) * r, v: gold ? 3 : 1, life: gold ? 7 : 12 });
        }
      }
      for (let k = ms.fish.length - 1; k >= 0; k--) {
        const f = ms.fish[k]; f.life -= dt;
        if (f.life <= 0) { ms.fish.splice(k, 1); continue; }
        for (const p of alive) if (Math.hypot(p.x - f.x, p.y - f.y) < C.PR + 18) {
          p.a += f.v; p.lastPick = g.elapsed; ms.fish.splice(k, 1);
          g.events.push(['fish', p.id, Math.round(f.x), Math.round(f.y), f.v]); break;
        }
      }
      if (g.elapsed >= this.timed) g.finishRound(alive.slice().sort((a, b) => b.a - a.a || a.lastPick - b.lastPick).map((p) => p.id));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (a.t <= 0) {
        a.t = 0.15 + Math.random() * 0.15;
        let best = null, bs = -1;
        for (const f of ms.fish) {
          const d = Math.hypot(f.x - p.x, f.y - p.y); let s = f.v / (d + 70);
          for (const q of g.players) if (q !== p && q.alive && q.inRound && Math.hypot(q.x - f.x, q.y - f.y) < d - 40) s *= 0.55;
          if (s > bs) { bs = s; best = f; }
        }
        a.fish = best; a.wantDash = Math.random() < a.dashP + 0.2;
      }
      if (a.fish) {
        steer(p, a.fish.x, a.fish.y, a.skill);
        const d = Math.hypot(a.fish.x - p.x, a.fish.y - p.y);
        if (a.wantDash && p.cd <= 0 && d > 170 && d < 380) { p.dashReq = true; a.wantDash = false; }
      } else steer(p, 0, 0, 0.3);
    },
    ex() { return {}; },
    objs(g) { return g.ms.fish.map((f) => [1, f.id, Math.round(f.x), Math.round(f.y), f.v, +f.life.toFixed(1)]); },
  });

  /* ---------- 3. Царь горы ---------- */
  MODES.push({
    id: 3, key: 'king', icon: '👑', timed: 50, view: { r: 400 },
    ru: { name: 'Царь горы', goal: 'Удерживай светящийся круг в одиночку — так копятся очки. Выталкивай соперников!', btn: 'ТОЛЧОК' },
    en: { name: 'King of the Hill', goal: 'Hold the glowing circle alone to score. Shove your rivals out!', btn: 'SHOVE' },
    phys: { acc: 950, fric: 1.8, dashV: 650, dashT: 0.3, dashCD: 1.5 },
    init(g) {
      g.ms = { zx: 0, zy: 0, zr: 105, nx: 0, ny: 0, moveT: 13, warn: 0, occ: 0, cont: 0 };
      placeRing(g, 250); for (const p of g.players) p.sec = 0;
    },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 345); }
      g.collideAll(alive);
      ms.moveT -= dt;
      if (ms.moveT <= 2 && !ms.warn) { const a = Math.random() * TAU, r = rr(60, 190); ms.nx = Math.cos(a) * r; ms.ny = Math.sin(a) * r; ms.warn = 1; }
      if (ms.moveT <= 0) { ms.zx = ms.nx; ms.zy = ms.ny; ms.moveT = 13; ms.warn = 0; g.events.push(['zone', Math.round(ms.zx), Math.round(ms.zy)]); }
      const inside = alive.filter((p) => Math.hypot(p.x - ms.zx, p.y - ms.zy) < ms.zr - 8);
      ms.occ = 0; ms.cont = 0;
      if (inside.length === 1) { ms.occ = inside[0].id; inside[0].sec += dt; inside[0].a = Math.round(inside[0].sec * 10); }
      else if (inside.length > 1) ms.cont = 1;
      if (g.elapsed >= this.timed) g.finishRound(alive.slice().sort((a, b) => b.sec - a.sec || Math.random() - 0.5).map((p) => p.id));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      const dz = Math.hypot(p.x - ms.zx, p.y - ms.zy);
      if (a.t <= 0) { a.t = 0.15 + Math.random() * 0.15; a.wantDash = Math.random() < a.dashP + 0.2; }
      const occ = ms.occ && ms.occ !== p.id ? g.players.find((q) => q.id === ms.occ && q.alive) : null;
      const enemy = occ || nearestAlive(g, p, (q) => Math.hypot(q.x - ms.zx, q.y - ms.zy) < ms.zr + 30)?.q;
      if (enemy) {
        const ez = Math.hypot(enemy.x - ms.zx, enemy.y - ms.zy) || 1;
        const bx = enemy.x - ((enemy.x - ms.zx) / ez) * C.PR * 1.4, by = enemy.y - ((enemy.y - ms.zy) / ez) * C.PR * 1.4;
        steer(p, bx, by, a.skill);
        const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (a.wantDash && p.cd <= 0 && d < 135) { p.dashReq = true; a.wantDash = false; }
      } else steer(p, ms.zx, ms.zy, dz > 40 ? a.skill : 0.15);
    },
    ex(g) { const ms = g.ms; return { zx: Math.round(ms.zx), zy: Math.round(ms.zy), zr: ms.zr, nx: Math.round(ms.nx), ny: Math.round(ms.ny), w: ms.warn, occ: ms.occ, ct: ms.cont, mt: +ms.moveT.toFixed(1) }; },
    objs() { return []; },
  });

  /* ---------- 4. Снежная битва ---------- */
  MODES.push({
    id: 4, key: 'snow', icon: '❄️', timed: 60, view: { r: 400 },
    ru: { name: 'Снежная битва', goal: 'Бросай снежки кнопкой — у каждого 5 сердец. Останься в игре последним!', btn: 'СНЕЖОК' },
    en: { name: 'Snowball Fight', goal: 'Throw snowballs with the button — everyone has 5 hearts. Be the last one left!', btn: 'THROW' },
    phys: { acc: 950, fric: 2.0, dashV: 0, dashT: 0, dashCD: 0.6 },
    init(g) { g.ms = { balls: [] }; placeRing(g, 270); for (const p of g.players) { p.hp = 5; p.a = 5; p.b = 0; p.aimA = p.face; } },
    aim(g, p) {
      let ang = p.face, best = null, bd = 0.45;
      for (const q of g.players) {
        if (q === p || !q.alive || !q.inRound) continue;
        const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d > 650 || d < 20) continue;
        const da = Math.abs(wrapPi(Math.atan2(dy, dx) - p.face)); if (da < bd) { bd = da; best = q; }
      }
      if (best) { const d = Math.hypot(best.x - p.x, best.y - p.y), t = d / SNOW_V; ang = Math.atan2(best.y + best.vy * t * 0.8 - p.y, best.x + best.vx * t * 0.8 - p.x); }
      return ang;
    },
    onDash(g, p) {
      const ang = p.bot ? p.aimA : this.aim(g, p), dx = Math.cos(ang), dy = Math.sin(ang);
      g.ms.balls.push({ id: ++g.uid, x: p.x + dx * (C.PR + 8), y: p.y + dy * (C.PR + 8), vx: dx * SNOW_V + p.vx * 0.25, vy: dy * SNOW_V + p.vy * 0.25, own: p.id, life: 1.5 });
      p.cd = 0.6; p.face = ang; p.dash = 0.12; g.events.push(['throw', p.id]);
      return true;
    },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) {
        if (p.inv > 0) p.inv -= dt;
        g.integrate(p, dt); g.softWall(p, 350);
        for (const o of SNOW_OBS) pushFrom(p, o.x, o.y, o.r, 0.2);
        if (p.bot) p.face = p.aimA;
      }
      g.collideAll(alive);
      for (let k = ms.balls.length - 1; k >= 0; k--) {
        const b = ms.balls[k]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        let dead = b.life <= 0 || Math.hypot(b.x, b.y) > 460;
        if (!dead) for (const o of SNOW_OBS) if (Math.hypot(b.x - o.x, b.y - o.y) < o.r + 8) { dead = true; g.events.push(['snowpuff', Math.round(b.x), Math.round(b.y)]); break; }
        if (!dead) for (const q of alive) {
          if (!q.alive || q.id === b.own || q.inv > 0) continue;
          if (Math.hypot(q.x - b.x, q.y - b.y) < C.PR + 10) {
            dead = true; q.hp--; q.a = q.hp; q.inv = 1.1;
            const sp = Math.hypot(b.vx, b.vy) || 1; q.vx += (b.vx / sp) * 320; q.vy += (b.vy / sp) * 320;
            const own = g.players.find((o) => o.id === b.own); if (own) own.b++;
            g.events.push(['snowhit', Math.round(b.x), Math.round(b.y), q.id]);
            if (q.hp <= 0) g.eliminate(q, b.own, 'kill');
            break;
          }
        }
        if (dead) ms.balls.splice(k, 1);
      }
      const left = g.alive();
      if (left.length <= 1 || g.elapsed >= this.timed) {
        const order = left.sort((a, b) => b.hp - a.hp || b.b - a.b).map((p) => p.id);
        g.finishRound(order.concat(g.outOrder.slice().reverse()));
      }
    },
    bot(g, p, dt) {
      const a = p.ai; a.t -= dt;
      if (a.t <= 0) {
        a.t = 0.2 + Math.random() * 0.2;
        const n = nearestAlive(g, p); a.tg = n ? n.q.id : 0; a.td = n ? n.d : 0;
        if (Math.random() < 0.35) a.strafe = -(a.strafe || 1);
      }
      const tg = g.players.find((q) => q.id === a.tg && q.alive);
      if (!tg) { steer(p, 0, 0, 0.3); return; }
      const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy) || 1;
      const t = d / SNOW_V, ax = tg.x + tg.vx * t * 0.7, ay = tg.y + tg.vy * t * 0.7;
      p.aimA = Math.atan2(ay - p.y, ax - p.x) + rr(-0.16, 0.16) * (1.25 - a.skill) * 3;
      const sx = -dy / d, sy = dx / d; let mx = (a.strafe || 1) * sx * 0.6, my = (a.strafe || 1) * sy * 0.6;
      if (d > 380) { mx += (dx / d) * 0.7; my += (dy / d) * 0.7; } else if (d < 230) { mx -= (dx / d) * 0.8; my -= (dy / d) * 0.8; }
      const dc = Math.hypot(p.x, p.y); if (dc > 290) { mx -= (p.x / dc) * 1.2; my -= (p.y / dc) * 1.2; }
      const m = Math.hypot(mx, my) || 1; p.in.x = (mx / m) * a.skill; p.in.y = (my / m) * a.skill;
      if (p.cd <= 0 && d < 560 && Math.random() < dt * 1.8 * a.skill) p.dashReq = true;
    },
    ex() { return {}; },
    objs(g) { return g.ms.balls.map((b) => [2, b.id, Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy)]); },
  });

  /* ---------- 5. Горячая бомба ---------- */
  MODES.push({
    id: 5, key: 'potato', icon: '💣', timed: 0, view: { r: 400 },
    ru: { name: 'Горячая бомба', goal: 'Бомба взрывается у того, кто её держит. Коснись другого, чтобы передать!', btn: 'РЫВОК' },
    en: { name: 'Hot Bomb', goal: 'The bomb blows up whoever holds it. Touch someone to pass it on!', btn: 'DASH' },
    phys: { acc: 950, fric: 1.8, dashV: 560, dashT: 0.25, dashCD: 2.2 },
    init(g) {
      g.ms = { h: 0, fuse: 11, fmax: 9, booms: 0 }; placeRing(g, 230);
      const alive = g.alive(); const h = alive[rnd(alive.length)]; if (h) { g.ms.h = h.id; h.hot = true; }
    },
    step(g, dt) {
      const ms = g.ms; let alive = g.alive();
      if (!alive.some((p) => p.id === ms.h) && alive.length > 1) { const h = alive[rnd(alive.length)]; ms.h = h.id; h.hot = true; h.cant = 1; }
      for (const p of alive) { p.hot = p.id === ms.h; p.speedMul = p.hot ? 1.2 : 1; if (p.cant > 0) p.cant -= dt; g.integrate(p, dt); g.softWall(p, 350); }
      g.collideAll(alive, (a, b) => {
        const h = a.id === ms.h ? a : b.id === ms.h ? b : null; if (!h) return;
        const o = h === a ? b : a;
        if (h.cant <= 0 && o.cant <= 0) { ms.h = o.id; h.hot = false; o.hot = true; h.cant = 0.9; o.cant = 0.9; g.events.push(['pass', Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2), o.id]); }
      });
      ms.fuse -= dt;
      if (ms.fuse <= 0) {
        const h = alive.find((p) => p.id === ms.h);
        if (h) {
          g.events.push(['boom', Math.round(h.x), Math.round(h.y)]);
          g.eliminate(h, 0, 'boom'); h.hot = false; ms.booms++;
          alive = g.alive();
          if (alive.length > 1) { const n = alive[rnd(alive.length)]; ms.h = n.id; n.hot = true; n.cant = 1.3; ms.fmax = Math.max(5, 9 - 0.8 * ms.booms); ms.fuse = ms.fmax; }
        }
      }
      g.checkElim();
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (a.t <= 0) { a.t = 0.15 + Math.random() * 0.15; a.wantDash = Math.random() < a.dashP + 0.25; }
      const dc = Math.hypot(p.x, p.y);
      if (p.id === ms.h) {
        const n = nearestAlive(g, p, (q) => q.cant <= 0);
        if (n) { steer(p, n.q.x, n.q.y, 1); if (a.wantDash && p.cd <= 0 && n.d < 170) { p.dashReq = true; a.wantDash = false; } } else steer(p, 0, 0, 0.3);
      } else {
        const h = g.players.find((q) => q.id === ms.h && q.alive);
        if (!h) { steer(p, 0, 0, 0.2); return; }
        let fx = p.x - h.x, fy = p.y - h.y; const d = Math.hypot(fx, fy) || 1; fx /= d; fy /= d;
        let mx = fx, my = fy;
        if (dc > 230) { mx -= (p.x / dc) * ((dc - 230) / 60); my -= (p.y / dc) * ((dc - 230) / 60); }
        if (d > 330) { mx = -p.x / (dc || 1) * 0.2; my = -p.y / (dc || 1) * 0.2; }
        const m = Math.hypot(mx, my) || 1; p.in.x = (mx / m) * a.skill; p.in.y = (my / m) * a.skill;
        if (a.wantDash && p.cd <= 0 && d < 140) { p.dashReq = true; a.wantDash = false; }
      }
    },
    ex(g) { const ms = g.ms; return { h: ms.h, f: +Math.max(0, ms.fuse).toFixed(2), m: ms.fmax }; },
    objs() { return []; },
  });

  /* ---------- 6. Хрупкий лёд ---------- */
  MODES.push({
    id: 6, key: 'tiles', icon: '🧩', timed: 0, view: { r: 400 },
    ru: { name: 'Хрупкий лёд', goal: 'Плитки трескаются, если стоять на них, и сами по себе. Не стой на месте — и спихни соперников!', btn: 'РЫВОК' },
    en: { name: 'Cracking Ice', goal: 'Tiles crack when you stand on them — and on their own. Keep moving and shove your rivals!', btn: 'DASH' },
    phys: { acc: 1100, fric: 3.4, dashV: 330, dashT: 0.2, dashCD: 1.6 },
    init(g) {
      g.ms = { t: TILES.list.map(() => ({ s: 0, t: 0, d: 0 })), auto: 0 }; placeRing(g, 190);
    },
    tileAt(g, x, y) {
      const gx = Math.floor((x - TILES.O) / TILES.S), gy = Math.floor((y - TILES.O) / TILES.S);
      if (gx < 0 || gy < 0 || gx >= TILES.N || gy >= TILES.N) return -1;
      return TILES.grid[gy * TILES.N + gx];
    },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) g.integrate(p, dt);
      g.collideAll(alive);
      const occ = new Set();
      for (const p of alive) {
        const i = this.tileAt(g, p.x, p.y);
        if (i < 0 || ms.t[i].s === 2) { g.eliminate(p, 0, 'fall'); continue; }
        occ.add(i);
        if (ms.t[i].s === 0) { ms.t[i].d += dt; if (ms.t[i].d >= TILES.DWELL) { ms.t[i].s = 1; ms.t[i].t = 0; } }
      }
      for (let i = 0; i < ms.t.length; i++) if (ms.t[i].s === 0 && !occ.has(i)) ms.t[i].d = Math.max(0, ms.t[i].d - dt * 2);
      if (g.elapsed > 4) {
        ms.auto -= dt;
        if (ms.auto <= 0) {
          ms.auto = Math.max(0.5, 1.3 - (g.elapsed - 4) * 0.025);
          const solid = ms.t.map((t, i) => (t.s === 0 ? i : -1)).filter((i) => i >= 0);
          if (solid.length) { const i = solid[rnd(solid.length)]; ms.t[i].s = 1; ms.t[i].t = 0; g.events.push(['crack', i]); }
        }
      }
      for (let i = 0; i < ms.t.length; i++) {
        const t = ms.t[i];
        if (t.s === 1) { t.t += dt; if (t.t >= TILES.FALL_T) { t.s = 2; g.events.push(['tile', i]); } }
      }
      g.checkElim();
      if (g.phase === 'play' && g.elapsed > 75) g.finishRound(g.alive().map((p) => p.id).concat(g.outOrder.slice().reverse()));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      const cur = this.tileAt(g, p.x, p.y);
      if (a.t <= 0 || (cur >= 0 && ms.t[cur].s === 1 && Math.random() < 0.3)) {
        a.t = 0.2 + Math.random() * 0.2;
        let best = -1, bs = 1e9;
        for (let i = 0; i < ms.t.length; i++) {
          const t = ms.t[i]; if (t.s !== 0) continue;
          const T = TILES.list[i]; let s = Math.hypot(T.x - p.x, T.y - p.y);
          if (i === cur) s += 140;
          for (const q of g.players) if (q !== p && q.alive && q.inRound && Math.hypot(q.x - T.x, q.y - T.y) < 70) s += 120;
          s += Math.hypot(T.x, T.y) * 0.12 + Math.random() * 40;
          if (s < bs) { bs = s; best = i; }
        }
        a.tile = best; a.wantDash = Math.random() < a.dashP;
      }
      if (a.tile >= 0) {
        const T = TILES.list[a.tile], d = Math.hypot(T.x - p.x, T.y - p.y);
        steer(p, T.x, T.y, a.skill);
        if (a.wantDash && p.cd <= 0 && d > 150 && cur >= 0 && ms.t[cur].s === 1) { p.dashReq = true; a.wantDash = false; }
      } else steer(p, 0, 0, 0.2);
    },
    ex(g) { return { tl: g.ms.t.map((t) => (t.s === 0 ? 0 : t.s === 2 ? 10 : 1 + Math.min(8, Math.floor((t.t / TILES.FALL_T) * 9)))) }; },
    objs() { return []; },
  });

  /* ---------- 7. Снежный обвал ---------- */
  MODES.push({
    id: 7, key: 'slide', icon: '⛰️', timed: 0, view: { r: 400 },
    ru: { name: 'Снежный обвал', goal: 'Уворачивайся от катящихся глыб. Прыжок даёт миг неуязвимости. 3 сердца!', btn: 'ПРЫЖОК' },
    en: { name: 'Avalanche', goal: 'Dodge the rolling boulders. A hop makes you untouchable for a moment. 3 hearts!', btn: 'HOP' },
    phys: { acc: 1000, fric: 2.2, dashV: 0, dashT: 0, dashCD: 1.6 },
    init(g) { g.ms = { boulders: [], warns: [], spawnT: 1.6 }; placeRing(g, 200); for (const p of g.players) { p.hp = 3; p.a = 3; } },
    onDash(g, p, dx, dy) { p.air = 0.55; p.cd = 1.6; p.vx += dx * 240; p.vy += dy * 240; g.events.push(['hop', p.id]); return true; },
    spawn(g) {
      const ms = g.ms, a = Math.random() * TAU, r = rr(44, 74), R = 470;
      const sx = Math.cos(a) * R, sy = Math.sin(a) * R, ta = Math.random() * TAU, tr = Math.sqrt(Math.random()) * 170;
      const tx = Math.cos(ta) * tr, ty = Math.sin(ta) * tr, dx = tx - sx, dy = ty - sy, dd = Math.hypot(dx, dy);
      ms.warns.push({ id: ++g.uid, t: 1.3, x: sx, y: sy, dx: dx / dd, dy: dy / dd, r, sp: rr(380, 520) });
    },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) {
        if (p.inv > 0) p.inv -= dt;
        if (p.air > 0) p.air -= dt;
        g.integrate(p, dt); g.softWall(p, 350);
      }
      g.collideAll(alive);
      ms.spawnT -= dt;
      if (ms.spawnT <= 0) {
        ms.spawnT = Math.max(0.55, 2.0 - g.elapsed * 0.03);
        this.spawn(g); if (g.elapsed > 18 && Math.random() < 0.35) this.spawn(g);
      }
      for (let k = ms.warns.length - 1; k >= 0; k--) {
        const w = ms.warns[k]; w.t -= dt;
        if (w.t <= 0) { ms.boulders.push({ id: w.id, x: w.x, y: w.y, vx: w.dx * w.sp, vy: w.dy * w.sp, r: w.r }); ms.warns.splice(k, 1); }
      }
      for (let k = ms.boulders.length - 1; k >= 0; k--) {
        const b = ms.boulders[k]; b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.hypot(b.x, b.y) > 560 && b.x * b.vx + b.y * b.vy > 0) { ms.boulders.splice(k, 1); continue; }
        for (const q of alive) {
          if (!q.alive || q.inv > 0 || q.air > 0) continue;
          const dx = q.x - b.x, dy = q.y - b.y, d = Math.hypot(dx, dy);
          if (d < b.r + C.PR - 8) {
            q.hp--; q.a = q.hp; q.inv = 1.3; q.frozen = 0.45;
            const nx = dx / (d || 1), ny = dy / (d || 1), sp = Math.hypot(b.vx, b.vy) || 1;
            q.vx += nx * 420 + (b.vx / sp) * 260; q.vy += ny * 420 + (b.vy / sp) * 260;
            g.events.push(['hurt', q.id, Math.round(q.x), Math.round(q.y)]);
            if (q.hp <= 0) g.eliminate(q, 0, 'squash');
          }
        }
      }
      const left = g.alive();
      if (left.length <= 1 || g.elapsed > 60) {
        g.finishRound(left.sort((a, b) => b.hp - a.hp || Math.random() - 0.5).map((p) => p.id).concat(g.outOrder.slice().reverse()));
      }
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      const thr = []; // опасные траектории
      for (const b of ms.boulders) thr.push({ x: b.x, y: b.y, dx: b.vx / (Math.hypot(b.vx, b.vy) || 1), dy: b.vy / (Math.hypot(b.vx, b.vy) || 1), r: b.r, sp: Math.hypot(b.vx, b.vy), t0: 0 });
      for (const w of ms.warns) thr.push({ x: w.x, y: w.y, dx: w.dx, dy: w.dy, r: w.r, sp: w.sp, t0: w.t });
      let mx = 0, my = 0, danger = 0, nearest = 1e9;
      for (const t of thr) {
        const rx = p.x - t.x, ry = p.y - t.y, along = rx * t.dx + ry * t.dy;
        if (along < -t.r - 60) continue;
        const lat = rx * -t.dy + ry * t.dx, al = Math.abs(lat);
        if (al < t.r + C.PR + 55) {
          const sgn = lat >= 0 ? 1 : -1, w = (t.r + C.PR + 55 - al) / 60;
          mx += -t.dy * sgn * (1 + w); my += t.dx * sgn * (1 + w); danger += 1;
          const dist = Math.max(0, along - t.sp * t.t0); if (dist < nearest) nearest = dist;
        }
      }
      const dc = Math.hypot(p.x, p.y);
      if (danger === 0) { mx = -p.x * 0.004 + Math.sin(g.time * 0.7 + p.id) * 0.5; my = -p.y * 0.004 + Math.cos(g.time * 0.6 + p.id) * 0.5; }
      if (dc > 300) { mx -= (p.x / dc) * 1.5; my -= (p.y / dc) * 1.5; }
      const m = Math.hypot(mx, my) || 1; p.in.x = (mx / m) * Math.min(1, a.skill + 0.1); p.in.y = (my / m) * Math.min(1, a.skill + 0.1);
      if (danger && p.cd <= 0 && nearest < 150 && nearest > -40 && Math.random() < dt * 5 * a.skill) p.dashReq = true;
    },
    ex() { return {}; },
    objs(g) {
      const o = g.ms.boulders.map((b) => [3, b.id, Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), Math.round(b.r)]);
      for (const w of g.ms.warns) o.push([4, w.id, Math.round(w.x), Math.round(w.y), Math.round(Math.atan2(w.dy, w.dx) * 100), Math.round(w.r), Math.round(w.t * 100)]);
      return o;
    },
  });

  /* ====================================================================
   *  ИГРА / МАТЧ / ТУРНИР
   * ==================================================================== */
  const PHASES = { count: 0, play: 1, over: 2, final: 3, lobby: 4, intro: 5 };

  class Game {
    /* opts.lobby — комната с ожиданием (сервер); opts.pub — публичная комната с автостартом; opts.demo — фон меню */
    constructor(opts) {
      opts = opts || {};
      this.lobbyMode = !!opts.lobby; this.demo = !!opts.demo; this.pub = !!opts.pub;
      this.cfg = { kind: 0, len: 3, mode: 0, bots: (this.pub || !this.lobbyMode) ? 1 : 0, chaos: 0 };
      this.players = []; this.nextId = 1; this.uid = 1;
      this.phase = 'lobby'; this.timer = 0; this.elapsed = 0; this.autoT = -1;
      this.round = 0; this.plan = []; this.mode = MODES[0]; this.ms = {};
      this.events = []; this.winner = 0; this.time = 0; this.hostId = 0; this.rosterDirty = true;
      this.outOrder = []; this.lastRes = []; this.ranking = []; this.timeLeft = 0;
    }

    humans() { return this.players.filter((p) => !p.bot); }
    alive() { return this.players.filter((p) => p.alive && p.inRound); }
    phys() { return this.phase === 'lobby' ? MODES[0].phys : this.mode.phys; }

    /* ---------- игроки ---------- */
    addPlayer(name, look, bot) {
      look = cleanLook(look);
      const p = {
        id: this.nextId++, name: String(name || 'Penguin').slice(0, 14), look, bot: !!bot,
        x: 0, y: 0, vx: 0, vy: 0, alive: false, spec: true, fall: 1, inRound: false,
        dash: 0, cd: 0, boost: 0, shield: 0, frozen: 0, air: 0, inv: 0, cant: 0, speedMul: 1, hot: false, done: false, fin: 0,
        score: 0, wins: 0, placeSum: 0, rounds: 0, a: 0, b: 0, face: 0, last: 0, lastT: -99, outT: 0,
        in: { x: 0, y: 0 }, dashReq: false,
        ai: { t: 0, target: 0, fish: null, skill: 0.78 + Math.random() * 0.2, dashP: 0.35 + Math.random() * 0.4, wantDash: false, lane: 0, strafe: 1 },
      };
      if (!look.s) for (let k = 0; k < C.N_COLORS && this.players.some((q) => q.look.c === p.look.c && q.look.p === p.look.p && !q.look.s); k++) p.look.c = (p.look.c + 1) % C.N_COLORS;
      this.players.push(p);
      if (!bot && !this.hostId) this.hostId = p.id;
      this.rosterDirty = true;
      if (this.phase === 'lobby') this.placeLobby(p);
      return p;
    }

    removePlayer(id) {
      const i = this.players.findIndex((p) => p.id === id);
      if (i < 0) return;
      this.players.splice(i, 1);
      if (id === this.hostId) { const h = this.humans()[0]; this.hostId = h ? h.id : 0; }
      this.rosterDirty = true;
      if (this.phase === 'play') { try { this.mode.step && this.checkElim && this.checkAfterLeave(); } catch (e) {} }
    }
    checkAfterLeave() {
      if (this.phase !== 'play') return;
      const m = this.mode.key;
      if (m === 'sumo' || m === 'potato' || m === 'tiles' || m === 'slide' || m === 'snow') this.checkElim();
    }

    setInput(id, x, y, dash) {
      const p = this.players.find((q) => q.id === id); if (!p) return;
      x = +x || 0; y = +y || 0;
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      p.in.x = x; p.in.y = y; if (dash) p.dashReq = true;
    }

    setCfg(id, c) { if (id !== this.hostId || this.phase !== 'lobby' || !c) return; this.applyCfg(c); }
    applyCfg(c) {
      if (!c) return;
      if (c.kind != null) this.cfg.kind = c.kind ? 1 : 0;
      if (c.len != null && (C.LENS.includes(c.len | 0) || (c.len | 0) === 1 || (c.len | 0) === 2)) this.cfg.len = c.len | 0;
      if (c.mode != null) { const m = c.mode | 0; if (m >= 0 && m < MODES.length) this.cfg.mode = m; }
      if (c.bots != null) this.cfg.bots = c.bots ? 1 : 0;
      if (c.chaos != null) this.cfg.chaos = c.chaos ? 1 : 0;
      this.rosterDirty = true;
    }

    /* ---------- размещение / боты ---------- */
    placeLobby(p) {
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * TAU, r = 40 + Math.random() * 170;
        p.x = Math.cos(a) * r; p.y = Math.sin(a) * r;
        if (!this.players.some((q) => q !== p && !q.spec && Math.hypot(q.x - p.x, q.y - p.y) < C.PR * 2.2)) break;
      }
      resetP(p); p.face = Math.random() * TAU;
    }

    balanceBots() {
      const h = this.humans().length;
      const want = this.cfg.bots ? Math.max(0, C.MIN_TOTAL - h) : 0;
      const bots = this.players.filter((p) => p.bot);
      while (bots.length > want) { const b = bots.pop(); this.players.splice(this.players.indexOf(b), 1); }
      while (bots.length < want) {
        const nm = BOT_NAMES[(this.nextId * 7 + bots.length * 3) % BOT_NAMES.length];
        const look = { c: rnd(16), p: rnd(3) === 0 ? rnd(C.N_PAT) : 0, h: rnd(3) === 0 ? 0 : rnd(15), e: rnd(3) === 0 ? rnd(C.N_EYE) : 0, t: 0, s: 0 };
        bots.push(this.addPlayer(nm, look, true));
      }
      this.rosterDirty = true;
    }

    /* ---------- матч ---------- */
    makePlan() {
      const len = this.cfg.len, plan = [];
      if (this.cfg.kind === 1) { for (let i = 0; i < len; i++) plan.push(this.cfg.mode); return plan; }
      const ids = MODES.map((m) => m.id); for (let i = ids.length - 1; i > 0; i--) { const j = rnd(i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      return ids.slice(0, len);
    }

    startMatch() {
      if (this.phase !== 'lobby') return false;
      if (!this.cfg.bots && this.humans().length < 2) return false;
      this.plan = this.demo ? new Array(1000).fill(0) : this.makePlan();
      for (const p of this.players) { p.score = 0; p.wins = 0; p.placeSum = 0; p.rounds = 0; }
      this.round = 0; this.autoT = -1; this.ranking = [];
      this.events.push(['start', this.plan.slice(0, 12)]);
      this.nextRound();
      return true;
    }

    nextRound() {
      this.balanceBots();
      this.round++;
      this.mode = MODES[this.plan[this.round - 1]];
      for (const p of this.players) { p.inRound = true; resetP(p); }
      this.outOrder = []; this.winner = 0; this.elapsed = 0; this.lastRes = [];
      this.mode.init(this);
      this.phase = 'intro'; this.timer = this.demo ? 0.05 : C.INTRO;
      this.events.push(['mode', this.mode.id, this.round]);
      this.rosterDirty = true;
    }

    toLobby() {
      this.players = this.players.filter((p) => !p.bot);
      for (const p of this.players) { p.score = 0; p.wins = 0; p.placeSum = 0; p.rounds = 0; p.inRound = false; this.placeLobby(p); }
      this.phase = 'lobby'; this.autoT = this.pub ? C.LOBBY_AFTER : -1;
      this.round = 0; this.winner = 0; this.ranking = []; this.mode = MODES[0]; this.ms = {};
      this.events.push(['lobby']);
      this.rosterDirty = true;
    }

    /* офлайн: «ещё раз» тем же составом */
    again() { this.toLobby(); return this.startMatch(); }

    /* ---------- элиминация ---------- */
    eliminate(p, killerId, kind) {
      p.alive = false; p.outT = this.time; p.done = true;
      p.fall = kind === 'fall' ? 0.001 : 1;
      this.outOrder.push(p.id);
      this.events.push(['ko', p.id, killerId || 0, kind === 'fall' ? 0 : 1]);
    }
    checkElim() {
      if (this.phase !== 'play') return;
      const alive = this.alive();
      if (alive.length <= 1) this.finishRound(alive.map((p) => p.id).concat(this.outOrder.slice().reverse()));
    }

    /* итог раунда: order — id от лучшего к худшему */
    finishRound(orderIds) {
      if (this.phase !== 'play') return;
      const parts = this.players.filter((p) => p.inRound);
      const ids = []; for (const id of orderIds) if (!ids.includes(id) && parts.some((p) => p.id === id)) ids.push(id);
      for (const p of parts) if (!ids.includes(p.id)) ids.push(p.id);
      const n = ids.length, res = [];
      ids.forEach((id, i) => {
        const p = parts.find((q) => q.id === id), pts = Math.max(0, n - 1 - i);
        p.score += pts; p.rounds++; p.placeSum += i + 1; if (i === 0) p.wins++;
        res.push([id, i + 1, pts]);
      });
      this.winner = ids[0] || 0; this.lastRes = res;
      this.phase = 'over'; this.timer = this.demo ? 2.2 : C.OVER;
      this.events.push(['res', res, this.mode.id]);
    }

    finishMatch() {
      const parts = this.players.filter((p) => p.rounds > 0);
      parts.sort((a, b) => b.score - a.score || b.wins - a.wins || a.placeSum - b.placeSum || a.id - b.id);
      this.ranking = parts.map((p) => p.id);
      this.phase = 'final'; this.timer = C.FINAL;
      this.events.push(['final', this.ranking.slice(), this.cfg.kind]);
    }

    /* ---------- физика ---------- */
    mass(p) { return (p.dash > 0 ? 2.3 : 1) * (p.boost > 0 ? 1.8 : 1) * (p.shield > 0 ? 2.6 : 1); }

    integrate(p, dt, ph) {
      ph = ph || this.phys();
      let ax = p.in.x, ay = p.in.y;
      if (p.frozen > 0) { ax = ay = 0; p.dashReq = false; p.frozen -= dt; }
      const m = Math.hypot(ax, ay);
      const k = ph.acc * (p.boost > 0 ? (ph.boostAcc || 1.15) : 1) * (p.speedMul || 1);
      p.vx += ax * k * dt; p.vy += ay * k * dt;
      if (p.dashReq) {
        p.dashReq = false;
        if (p.cd <= 0) {
          let dx, dy;
          if (m > 0.2) { dx = ax / m; dy = ay / m; }
          else { const sp = Math.hypot(p.vx, p.vy); if (sp > 30) { dx = p.vx / sp; dy = p.vy / sp; } else { dx = Math.cos(p.face); dy = Math.sin(p.face); } }
          const handled = this.phase === 'play' && this.mode.onDash ? this.mode.onDash(this, p, dx, dy) : false;
          if (!handled) {
            p.vx += dx * ph.dashV; p.vy += dy * ph.dashV; p.dash = ph.dashT;
            p.cd = ph.dashCD * (p.boost > 0 && !ph.dashBoost ? 0.5 : 1) * (this.phase === 'play' && this.cfg.chaos && this.mode.id === 0 ? 0.75 : 1);
            if (ph.dashBoost) p.boost = Math.max(p.boost, ph.dashBoost);
            this.events.push(['dash', p.id]);
          }
        }
      }
      const f = Math.exp(-ph.fric * (p.frozen > 0 ? 2.4 : 1) * dt);
      p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.dash > 0) p.dash -= dt;
      if (p.cd > 0) p.cd -= dt;
      if (p.boost > 0) p.boost -= dt;
      if (p.shield > 0) p.shield -= dt;
      if (m > 0.2) p.face = Math.atan2(ay, ax);
      else if (Math.hypot(p.vx, p.vy) > 40) p.face = Math.atan2(p.vy, p.vx);
    }

    softWall(p, R) {
      const d = Math.hypot(p.x, p.y), lim = R - C.PR * 0.6;
      if (d > lim) {
        const nx = p.x / d, ny = p.y / d; p.x = nx * lim; p.y = ny * lim;
        const vn = p.vx * nx + p.vy * ny; if (vn > 0) { p.vx -= 1.5 * vn * nx; p.vy -= 1.5 * vn * ny; }
      }
    }

    collideAll(list, cb) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = C.PR * 2;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d, ma = this.mass(a), mb = this.mass(b), ov = min - d, tm = ma + mb;
        a.x -= nx * ov * mb / tm; a.y -= ny * ov * mb / tm; b.x += nx * ov * ma / tm; b.y += ny * ov * ma / tm;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const j2 = (-(1 + 1.05) * rel) / (1 / ma + 1 / mb);
          a.vx -= (j2 / ma) * nx; a.vy -= (j2 / ma) * ny; b.vx += (j2 / mb) * nx; b.vy += (j2 / mb) * ny;
          if (rel < -120) this.events.push(['hit', Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2), +Math.min(1, -rel / 900).toFixed(2), a.id, b.id]);
        }
        a.last = b.id; a.lastT = this.time; b.last = a.id; b.lastT = this.time;
        if (cb) cb(a, b);
      }
    }

    /* ---------- главный шаг ---------- */
    step(dt) {
      this.time += dt;
      switch (this.phase) {
        case 'lobby': return this.stepLobby(dt);
        case 'intro':
          this.timer -= dt;
          if (this.timer <= 0) { this.phase = 'count'; this.timer = this.demo ? 0.05 : C.COUNT; }
          return;
        case 'count':
          this.timer -= dt;
          if (this.timer <= 0) { this.phase = 'play'; this.timer = 0; this.elapsed = 0; this.events.push(['go']); }
          return;
        case 'over':
          this.timer -= dt; this.updateFalling(dt);
          if (this.timer <= 0) { if (this.round >= this.plan.length) this.finishMatch(); else this.nextRound(); }
          return;
        case 'final':
          this.timer -= dt;
          if (this.timer <= 0) {
            if (this.lobbyMode) this.toLobby();
            else if (this.demo) { this.toLobby(); this.startMatch(); }
            else this.timer = 0;
          }
          return;
        default: {
          const active = this.players.some((p) => !p.bot && p.alive && p.inRound && !p.done);
          const scale = this.demo || active ? 1 : 2.5;
          const n = Math.ceil(scale), h = (dt * scale) / n;
          for (let i = 0; i < n && this.phase === 'play'; i++) {
            this.elapsed += h;
            for (const p of this.players) if (p.bot && p.alive && p.inRound) this.mode.bot(this, p, h);
            this.mode.step(this, h);
            this.updateFalling(h);
          }
          this.timeLeft = this.mode.timed ? Math.max(0, this.mode.timed - this.elapsed) : 0;
        }
      }
    }

    stepLobby(dt) {
      const list = this.players.filter((p) => p.alive);
      for (const p of list) { this.integrate(p, dt, MODES[0].phys); this.softWall(p, C.R0); }
      this.collideAll(list);
      if (this.pub) {
        const h = this.humans().length;
        if (h >= (this.cfg.bots ? 1 : 2)) {
          if (this.autoT < 0) this.autoT = h >= 2 ? C.LOBBY_MULTI : C.LOBBY_SOLO;
          else if (h >= 2 && this.autoT > C.LOBBY_MULTI) this.autoT = C.LOBBY_MULTI;
          this.autoT -= dt;
          if (this.autoT <= 0) { this.autoT = -1; this.startMatch(); }
        } else this.autoT = -1;
      } else if (this.demo && this.phase === 'lobby') { this.startMatch(); }
    }

    updateFalling(dt) {
      for (const p of this.players) {
        if (!p.alive && !p.spec && p.fall > 0 && p.fall < 1) {
          const f = Math.exp(-0.9 * dt);
          p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt;
          p.fall = Math.min(1, p.fall + dt * 1.1);
          if (p.fall >= 1) this.events.push(['splash', Math.round(p.x), Math.round(p.y)]);
        }
      }
    }

    /* ---------- сериализация ---------- */
    takeRoster() {
      if (!this.rosterDirty) return null;
      this.rosterDirty = false;
      return {
        list: this.players.map((p) => [p.id, p.name, p.look.c, p.look.p, p.look.h, p.look.e, p.look.t, p.look.s, p.bot ? 1 : 0]),
        host: this.hostId, cfg: [this.cfg.kind, this.cfg.len, this.cfg.mode, this.cfg.bots, this.cfg.chaos], pub: this.pub ? 1 : 0,
        plan: this.plan.slice(0, 7),
      };
    }

    snapshot() {
      const ph = PHASES[this.phase];
      const lobby = this.phase === 'lobby';
      const md = lobby ? 0 : this.mode.id;
      const tm = lobby ? this.autoT : this.phase === 'play' ? this.timeLeft : this.timer;
      const s = {
        ph, tm: +tm.toFixed(2), el: +this.elapsed.toFixed(1), rd: this.round, rs: this.plan.length || this.cfg.len, md, w: this.winner,
        p: this.players.map((p) => [
          p.id, +p.x.toFixed(1), +p.y.toFixed(1), Math.round(p.vx), Math.round(p.vy),
          (p.alive ? 1 : 0) | (p.dash > 0 ? 2 : 0) | (p.boost > 0 ? 4 : 0) | (p.spec ? 8 : 0) | (p.frozen > 0 ? 16 : 0) | (p.shield > 0 ? 32 : 0) | (p.hot ? 64 : 0) | (p.inv > 0 ? 128 : 0) | (p.air > 0 ? 256 : 0),
          Math.round((Math.max(0, p.cd) / (this.phys().dashCD || 1)) * 100), p.score, Math.round(p.fall * 100), p.a | 0, p.b | 0, Math.round(p.face * 100),
        ]),
        o: lobby ? [] : this.mode.objs(this),
        ex: lobby ? {} : this.mode.ex(this),
        e: this.events.splice(0),
      };
      if (this.phase === 'over') s.lr = this.lastRes;
      if (this.phase === 'final') s.fr = this.ranking;
      return s;
    }
  }

  const pointsFor = (n, i) => Math.max(0, n - 1 - i);
  return { C, Game, MODES, RACE, TILES, SNOW_OBS, cleanLook, pointsFor, PHASES };
});
