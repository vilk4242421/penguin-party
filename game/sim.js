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
    N_COLORS: 17, N_PAT: 6, N_HAT: 32, N_EYE: 13, N_TRAIL: 16, N_SKIN: 4, N_EMO: 8,
    LENS: [3, 5, 7],
    SHRINK_DELAY: 5, SHRINK_RATE: 11, BOOST_T: 6, SHIELD_T: 6, FREEZE_T: 1.6, WIND_F: 420,
    N_MODES: 19,
    // сложность ботов: [мин, макс] точность управления, шанс рывка, скорость реакции
    DIFFS: [{ skill: [0.45, 0.6], dash: [0.1, 0.25], react: 0.7 }, { skill: [0.6, 0.8], dash: [0.22, 0.52], react: 1 }, { skill: [0.9, 1.0], dash: [0.5, 0.85], react: 1.45 }],
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
  /* ---------- Гонка: 7 больших трасс с поворотами (замкнутые сплайны) ---------- */
  const RACE = { LAPS: 2, HW: 175 };
  // трассы в духе Формулы-1: прямые, шпильки, шикана и скоростные повороты. Точка [x, y, r]: угол со скруглением r (0 — на прямой)
  // трассы в духе Формулы-1: прямые, шпильки, шикана и скоростные повороты. Точка [x, y, r]: угол со скруглением r (0 — на прямой)
  RACE.maps = [
 { name: 'Монца', ctrl: [[-300,-850,0],[1400,-850,200],[1800,-600,220],[2200,-850,200],[2350,-800,330],[2650,-200,420],[2350,550,360],[1500,850,300],[-300,850,0],[-1500,850,200],[-1900,600,220],[-2300,850,200],[-2550,700,380],[-2650,-100,420],[-2300,-750,330]] },
 { name: 'Монако', ctrl: [[0,-1100,0],[1300,-1100,250],[1700,-700,220],[1700,-100,200],[1100,150,200],[1100,700,230],[1650,1000,230],[1600,1700,260],[700,1750,230],[200,1300,200],[-500,1300,220],[-700,700,200],[-1500,700,230],[-1750,100,230],[-1500,-500,250],[-900,-1100,250]] },
 { name: 'Спа', ctrl: [[-600,-900,0],[1400,-900,240],[2300,-100,300],[1600,500,200],[900,350,200],[400,900,230],[1000,1500,280],[300,1900,250],[-900,1550,260],[-1200,800,230],[-2100,500,260],[-2500,-300,320],[-1900,-800,300]] },
 { name: 'Сузука', ctrl: [[-500,-1000,0],[1200,-1000,260],[1900,-600,230],[1900,0,200],[1200,200,200],[400,-100,200],[-300,300,200],[400,800,220],[1300,950,260],[1300,1600,260],[300,1700,250],[-800,1500,250],[-1500,900,260],[-1500,100,220],[-2100,-300,260],[-1700,-850,280]] },
 { name: 'Сильверстоун', ctrl: [[-200,-900,0],[1300,-900,220],[1850,-450,240],[1450,50,200],[1750,500,230],[1400,1050,250],[600,1100,230],[100,700,200],[-500,1100,230],[-1400,1100,260],[-2100,500,280],[-2150,-300,300],[-1500,-850,300]] },
 { name: 'Интерлагос', ctrl: [[-400,-800,0],[1000,-800,230],[1700,-350,250],[1500,300,220],[800,500,200],[1200,1000,230],[900,1550,250],[-100,1650,250],[-900,1300,230],[-1000,700,200],[-1900,650,260],[-2300,0,300],[-1900,-650,300]] },
 { name: 'Баку', ctrl: [[-700,-1000,0],[1700,-1000,220],[2100,-600,200],[2100,400,200],[1600,700,200],[1600,1200,220],[900,1500,220],[-200,1500,230],[-300,900,200],[-1100,900,200],[-1300,300,200],[-2000,300,230],[-2300,-300,260],[-2000,-900,280]] },
];
  function buildTrack(ctrl) {
    const raw = [], N = ctrl.length;
    for (let i = 0; i < N; i++) {
      const A = ctrl[(i - 1 + N) % N], B = ctrl[i], Cc = ctrl[(i + 1) % N], r0 = B[2] || 0;
      let u1 = [A[0] - B[0], A[1] - B[1]], u2 = [Cc[0] - B[0], Cc[1] - B[1]]; const l1 = Math.hypot(u1[0], u1[1]), l2 = Math.hypot(u2[0], u2[1]);
      u1 = [u1[0] / l1, u1[1] / l1]; u2 = [u2[0] / l2, u2[1] / l2];
      const phi = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
      if (r0 <= 0 || phi > 3.1) { raw.push([B[0], B[1]]); continue; }
      let t = r0 / Math.tan(phi / 2), r = r0; const tm = 0.48 * Math.min(l1, l2); if (t > tm) { t = tm; r = t * Math.tan(phi / 2); }
      const p1 = [B[0] + u1[0] * t, B[1] + u1[1] * t];
      let bis = [u1[0] + u2[0], u1[1] + u2[1]]; const bl = Math.hypot(bis[0], bis[1]); bis = [bis[0] / bl, bis[1] / bl];
      const cd = r / Math.sin(phi / 2), cx = B[0] + bis[0] * cd, cy = B[1] + bis[1] * cd, p2 = [B[0] + u2[0] * t, B[1] + u2[1] * t];
      const a1 = Math.atan2(p1[1] - cy, p1[0] - cx); let da = Math.atan2(p2[1] - cy, p2[0] - cx) - a1; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const steps = Math.max(4, Math.ceil(Math.abs(da) / 0.12));
      for (let k = 0; k <= steps; k++) { const aa = a1 + da * k / steps; raw.push([cx + Math.cos(aa) * r, cy + Math.sin(aa) * r]); }
    }
    const M = raw.length, seg = []; let total = 0;
    for (let i = 0; i < M; i++) { const a = raw[i], b = raw[(i + 1) % M], d = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(d); total += d; }
    const n = Math.round(total / 45), step = total / n, pts = []; let acc = 0, j = 0, goal = 0;
    for (let i = 0; i < n; i++) {
      goal = i * step; while (acc + seg[j % M] < goal) { acc += seg[j % M]; j++; }
      const a = raw[j % M], b = raw[(j + 1) % M], t = (goal - acc) / (seg[j % M] || 1);
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    const tr = { pts, n, step, len: step * n, hw: RACE.HW, tan: [] };
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; tr.tan.push([(b[0] - a[0]) / d, (b[1] - a[1]) / d]); }
    return tr;
  }
  const TRACKS = [];
  RACE.track = (id) => TRACKS[id] || (TRACKS[id] = buildTrack(RACE.maps[id % RACE.maps.length].ctrl));
  // ближайшая точка осевой линии: расстояние, длина дуги s, точка на оси, касательная
  function trackNear(tr, x, y) {
    let bd = 1e18, bi = 0, bt = 0;
    for (let i = 0; i < tr.n; i++) {
      const a = tr.pts[i], b = tr.pts[(i + 1) % tr.n], dx = b[0] - a[0], dy = b[1] - a[1];
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = a[0] + dx * t - x, qy = a[1] + dy * t - y, d2 = qx * qx + qy * qy;
      if (d2 < bd) { bd = d2; bi = i; bt = t; }
    }
    const a = tr.pts[bi], b = tr.pts[(bi + 1) % tr.n];
    return { d: Math.sqrt(bd), s: (bi + bt) * tr.step, cx: a[0] + (b[0] - a[0]) * bt, cy: a[1] + (b[1] - a[1]) * bt, tx: tr.tan[bi][0], ty: tr.tan[bi][1] };
  }
  function trackAt(tr, s, lat) {
    s = ((s % tr.len) + tr.len) % tr.len; const f = s / tr.step, i = Math.floor(f) % tr.n, t = f - Math.floor(f), a = tr.pts[i], b = tr.pts[(i + 1) % tr.n], tg = tr.tan[i];
    return { x: a[0] + (b[0] - a[0]) * t - tg[1] * (lat || 0), y: a[1] + (b[1] - a[1]) * t + tg[0] * (lat || 0), tx: tg[0], ty: tg[1] };
  }
  // стены трассы: возвращает s игрока
  function raceEdge(p, tr) {
    const n = trackNear(tr, p.x, p.y), lim = tr.hw - C.PR * 0.8;
    if (n.d > lim) {
      const nx = (p.x - n.cx) / (n.d || 1), ny = (p.y - n.cy) / (n.d || 1);
      p.x = n.cx + nx * lim; p.y = n.cy + ny * lim;
      const vn = p.vx * nx + p.vy * ny; if (vn > 0) { p.vx -= 1.3 * vn * nx; p.vy -= 1.3 * vn * ny; }
      p.vx *= 0.97; p.vy *= 0.97;
    }
    return n.s;
  }
  RACE.near = trackNear; RACE.at = trackAt; RACE.edge = raceEdge;
  const TILES = { N: 6, S: 120, O: -360, FALL_T: 1.5, DWELL: 1.1 };
  TILES.list = [];
  TILES.grid = new Array(TILES.N * TILES.N).fill(-1);
  for (let gy = 0; gy < TILES.N; gy++) for (let gx = 0; gx < TILES.N; gx++) {
    const x = TILES.O + gx * TILES.S + TILES.S / 2, y = TILES.O + gy * TILES.S + TILES.S / 2;
    if (Math.hypot(x, y) > 410) continue;
    TILES.grid[gy * TILES.N + gx] = TILES.list.length; TILES.list.push({ x, y });
  }
  const CROWN = { AW: 560, AH: 380, pillars: [[-230, -120], [230, -120], [-230, 130], [230, 130], [0, 0]].map(([x, y], i) => ({ x, y, r: i === 4 ? 52 : 44 })) };
  function crownWalls(p) {
    const lx = CROWN.AW - C.PR * 0.9, ly = CROWN.AH - C.PR * 0.9;
    if (p.x > lx) { p.x = lx; if (p.vx > 0) p.vx *= -0.55; } else if (p.x < -lx) { p.x = -lx; if (p.vx < 0) p.vx *= -0.55; }
    if (p.y > ly) { p.y = ly; if (p.vy > 0) p.vy *= -0.55; } else if (p.y < -ly) { p.y = -ly; if (p.vy < 0) p.vy *= -0.55; }
    for (const o of CROWN.pillars) pushFrom(p, o.x, o.y, o.r, 0.5);
  }
  const SNOW_V = 600;
  const SNOW_OBS = [0, 1, 2, 3].map((k) => { const a = Math.PI / 4 + k * Math.PI / 2; return { x: Math.cos(a) * 185, y: Math.sin(a) * 185, r: 46 }; });

  /* ---------- вспомогательные ---------- */
  function resetP(p) {
    p.vx = p.vy = 0; p.alive = true; p.spec = false; p.fall = 0; p.dash = 0; p.cd = 0; p.boost = 0; p.shield = 0; p.frozen = 0; p.air = 0; p.inv = 0; p.cant = 0;
    p.dashReq = false; p.in.x = p.in.y = 0; p.a = 0; p.b = 0; p.last = 0; p.lastT = -99; p.outT = 0; p.done = false; p.speedMul = 1; p.stun = 0; p.hot = false; p.fin = 0;
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

  /* ---------- 1. Гонка: 7 больших трасс, без льда ---------- */
  MODES.push({
    id: 1, key: 'race', icon: '🏎️', timed: 0, view: { follow: true, zoom: 460 },
    ru: { name: 'Гонка', goal: 'Проедь 2 круга первым! Трасса каждый раз новая. Врежешься в сугроб — он исчезнет, но ты потеряешь скорость. Лужи замедляют, плиты ускоряют.', btn: 'ТУРБО' },
    en: { name: 'Race', goal: 'Finish 2 laps first! The track is new every time. Hit a snowdrift and it vanishes, but you lose speed. Slush slows you, pads boost you.', btn: 'TURBO' },
    phys: { acc: 3300, fric: 8.5, dashV: 240, dashT: 0.3, dashCD: 3.0, dashBoost: 1.2, boostAcc: 1.4 },
    init(g) {
      const mp = rnd(RACE.maps.length), tr = RACE.track(mp), len = tr.len;
      g.ms = { first: -1, fin: [], mp, tr, dr: [], sl: [], pd: [] };
      const used = [];
      const put = (kind, lat, r) => {
        for (let k = 0; k < 40; k++) {
          const s = rr(len * 0.05, len - 700); if (s > len - 900 && s < len) continue;
          if (used.some((u) => Math.abs(u - s) < 450)) continue;
          used.push(s); const q = RACE.at(tr, s, rr(-lat, lat)), it = { id: ++g.uid, x: q.x, y: q.y, r, s, tx: q.tx, ty: q.ty };
          g.ms[kind].push(it); return;
        }
      };
      for (let i = 0; i < 3; i++) put('dr', RACE.HW * 0.55, 56);
      for (let i = 0; i < 2; i++) put('sl', RACE.HW * 0.4, 125);
      for (let i = 0; i < 2; i++) put('pd', RACE.HW * 0.5, 74);
      const parts = g.players.filter((p) => p.inRound).sort(() => Math.random() - 0.5);
      parts.forEach((p, i) => {
        const row = Math.floor(i / 2), s0 = len - (row + 1) * 85, q = RACE.at(tr, s0, i % 2 === 0 ? -60 : 60);
        p.x = q.x; p.y = q.y; p.face = Math.atan2(q.ty, q.tx); p.prog = s0 - len; p.lastS = s0; p.rs = s0; p.lap = 0; p.padCd = 0;
      });
    },
    step(g, dt) {
      const ms = g.ms, alive = g.alive(), tr = ms.tr, len = tr.len;
      for (const p of alive) {
        p.speedMul = ms.sl.some((z) => Math.hypot(p.x - z.x, p.y - z.y) < z.r) ? 0.45 : 1; if (p.stun > 0) { p.stun -= dt; p.speedMul *= 0.2; }
        g.integrate(p, dt);
      }
      g.collideAll(alive);
      for (const p of alive) {
        const s = RACE.edge(p, tr); p.rs = s;
        for (let k = ms.dr.length - 1; k >= 0; k--) { // сугроб: врезался — он пропал, скорость упала
          const d = ms.dr[k];
          if (Math.hypot(p.x - d.x, p.y - d.y) < d.r * 0.9 + C.PR * 0.8) { ms.dr.splice(k, 1); p.vx *= 0.04; p.vy *= 0.04; p.boost = 0; p.stun = 0.8; g.events.push(['drift', Math.round(d.x), Math.round(d.y), p.id]); }
        }
        p.padCd -= dt;
        if (p.padCd <= 0) for (const pd of ms.pd) if (Math.hypot(p.x - pd.x, p.y - pd.y) < pd.r) {
          p.vx += pd.tx * 260; p.vy += pd.ty * 260; p.boost = Math.max(p.boost, 1.3); p.padCd = 0.8; g.events.push(['pad', p.id]);
        }
        let dl = s - p.lastS; if (dl > len / 2) dl -= len; else if (dl < -len / 2) dl += len;
        p.prog += dl; p.lastS = s;
        const lap = Math.max(0, Math.floor(p.prog / len));
        if (lap > p.lap && lap < RACE.LAPS) { p.lap = lap; g.events.push(['lap', p.id, lap + 1]); }
        if (!p.fin && p.prog >= RACE.LAPS * len) {
          ms.fin.push(p.id); p.fin = ms.fin.length; p.finT = g.elapsed; p.done = true;
          if (ms.first < 0) ms.first = g.elapsed;
          g.events.push(['finish', p.id, p.fin]);
        }
        p.a = clampN(Math.floor((Math.max(0, p.prog) / len) * 100), 0, 300); p.b = p.fin;
      }
      const left = alive.filter((p) => !p.fin);
      if (left.length === 0 || (ms.first >= 0 && g.elapsed - ms.first > 14) || g.elapsed > 300) {
        const order = ms.fin.slice();
        left.sort((a, b) => b.prog - a.prog).forEach((p) => order.push(p.id));
        g.finishRound(order);
      }
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms, tr = ms.tr, hw = RACE.HW; a.t -= dt;
      const s = p.rs == null ? 0 : p.rs;
      if (a.t <= 0) {
        a.t = 0.2 + Math.random() * 0.2; let lane = (a.lane || 0) * 0.7 + rr(-60, 60) * 0.3;
        const ahead = (it) => { let d = it.s - s; if (d < -tr.len / 2) d += tr.len; if (d > tr.len / 2) d -= tr.len; return d; };
        const latOf = (it) => (it.x - RACE.near(tr, it.x, it.y).cx) * -RACE.near(tr, it.x, it.y).ty + (it.y - RACE.near(tr, it.x, it.y).cy) * RACE.near(tr, it.x, it.y).tx;
        for (const it of ms.dr.concat(ms.sl)) { const d = ahead(it); if (d > 0 && d < 520) { const lt = it.lat != null ? it.lat : (it.lat = latOf(it)); if (Math.abs(lane - lt) < it.r + 55) lane = lt > lane ? lt - it.r - 60 : lt + it.r + 60; } }
        for (const it of ms.pd) { const d = ahead(it); if (d > 0 && d < 600 && Math.random() < 0.8) { const lt = it.lat != null ? it.lat : (it.lat = latOf(it)); lane = lt; } }
        a.lane = Math.max(-hw * 0.62, Math.min(hw * 0.62, lane));
        a.wantDash = Math.random() < 0.35;
      }
      const sp = Math.hypot(p.vx, p.vy), look = 230 + sp * 0.32, q = RACE.at(tr, s + look, a.lane || 0);
      steer(p, q.x, q.y, a.skill);
      if (a.wantDash && p.cd <= 0 && !p.fin) { p.dashReq = true; a.wantDash = false; }
    },
    ex(g) { const ms = g.ms; return { mp: ms.mp, fl: ms.first >= 0 ? +Math.max(0, 14 - (g.elapsed - ms.first)).toFixed(1) : -1 }; },
    objs(g) {
      const ms = g.ms;
      return ms.dr.map((d) => [10, d.id, Math.round(d.x), Math.round(d.y), d.r]).concat(ms.sl.map((z) => [11, z.id, Math.round(z.x), Math.round(z.y), z.r]), ms.pd.map((z) => [12, z.id, Math.round(z.x), Math.round(z.y), z.r, Math.round(Math.atan2(z.ty, z.tx) * 100)]));
    },
  });

  /* ---------- 2. Рыбалка ---------- */
  MODES.push({
    id: 2, key: 'fish', icon: '🐟', timed: 30, live: '🐟', view: { r: 400 },
    ru: { name: 'Рыбалка', goal: 'За 30 секунд собери больше всех рыбы. Золотая — целых 3 очка!', btn: 'РЫВОК' },
    en: { name: 'Fishing', goal: 'Collect the most fish in 30 seconds. Golden fish are worth 3!', btn: 'DASH' },
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

  /* ---------- 3. Корона ---------- */
  MODES.splice(3, 0, {
    id: 3, key: 'crown', icon: '👑', timed: 60, live: '👑', liveSuf: 's', view: { rx: 600, ry: 420 },
    ru: { name: 'Корона', goal: 'У кого корона — тому очко каждую секунду. Убегай! Коснись того, у кого корона, — и она твоя.', btn: 'РЫВОК' },
    en: { name: 'Crown Chase', goal: 'Whoever wears the crown scores a point every second. Run! Touch the crown holder to steal it.', btn: 'DASH' },
    phys: { acc: 980, fric: 1.9, dashV: 560, dashT: 0.25, dashCD: 1.8 },
    init(g) {
      g.ms = { h: 0, acc: 0, swaps: 0 };
      placeRing(g, 260); for (const p of g.players) { p.sec = 0; p.a = 0; }
      const alive = g.alive(); const h = alive[rnd(alive.length)]; if (h) { g.ms.h = h.id; h.cant = 1.5; }
    },
    step(g, dt) {
      const ms = g.ms; let alive = g.alive();
      if (!alive.some((p) => p.id === ms.h) && alive.length) { ms.h = alive[rnd(alive.length)].id; }
      for (const p of alive) {
        p.hot = p.id === ms.h; p.speedMul = p.hot ? 1.1 : 1; if (p.cant > 0) p.cant -= dt;
        g.integrate(p, dt); crownWalls(p);
      }
      g.collideAll(alive, (a, b) => {
        const h = a.id === ms.h ? a : b.id === ms.h ? b : null; if (!h) return;
        const o = h === a ? b : a;
        if (h.cant <= 0 && o.cant <= 0) {
          ms.h = o.id; h.hot = false; o.hot = true; h.cant = 1.1; o.cant = 1.1; ms.swaps++;
          g.events.push(['crown', Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2), o.id]);
        }
      });
      const hp = alive.find((p) => p.id === ms.h);
      if (hp) { hp.sec += dt; hp.a = Math.floor(hp.sec); }
      if (g.elapsed >= this.timed) g.finishRound(alive.slice().sort((a, b) => b.sec - a.sec || Math.random() - 0.5).map((p) => p.id));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (a.t <= 0) { a.t = 0.15 + Math.random() * 0.2; a.wantDash = Math.random() < a.dashP * 0.7; }
      if (p.id === ms.h) { // убегаем от всех, держимся ближе к центру, обходим колонны
        let mx = 0, my = 0;
        for (const q of g.players) {
          if (q === p || !q.alive || !q.inRound) continue;
          const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1, w = Math.min(4, 260 / d);
          mx += (dx / d) * w; my += (dy / d) * w;
        }
        mx += -p.x * 0.0016; my += -p.y * 0.0016;
        const m0 = Math.hypot(mx, my) || 1; mx /= m0; my /= m0;
        const ex = CROWN.AW - 130, ey = CROWN.AH - 130;
        if (p.x > ex) mx -= (p.x - ex) / 90; if (p.x < -ex) mx += (-ex - p.x) / 90;
        if (p.y > ey) my -= (p.y - ey) / 90; if (p.y < -ey) my += (-ey - p.y) / 90;
        for (const o of CROWN.pillars) { const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy); if (d < o.r + 110 && d > 0) { mx += (dx / d) * 1.4; my += (dy / d) * 1.4; } }
        const m = Math.hypot(mx, my) || 1; p.in.x = (mx / m) * a.skill; p.in.y = (my / m) * a.skill;
        if (a.wantDash && p.cd <= 0) { const n = nearestAlive(g, p); if (n && n.d < 150) { p.dashReq = true; a.wantDash = false; } }
      } else {
        const h = g.players.find((q) => q.id === ms.h && q.alive);
        if (!h) { steer(p, 0, 0, 0.3); return; }
        const d = Math.hypot(h.x - p.x, h.y - p.y), lead = Math.min(0.5, d / 900);
        steer(p, h.x + h.vx * lead, h.y + h.vy * lead, p.cant > 0 ? 0.25 : a.skill * 0.9);
        if (a.wantDash && p.cd <= 0 && d < 190 && d > 70) { p.dashReq = true; a.wantDash = false; }
      }
    },
    ex(g) { return { h: g.ms.h }; },
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
   *  ЕЩЁ 10 РЕЖИМОВ (id 8–17)
   * ==================================================================== */
  const SECT = 8;
  const LIGHT = { Y0: 300, Y1: -300 };
  const PTS3 = [0, 1, 2].map((i) => { const a = -Math.PI / 2 + (i * TAU) / 3; return { x: Math.cos(a) * 190, y: Math.sin(a) * 190, r: 82 }; });
  const SPIN_L = 370;
  const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); };
  const heartsEnd = (g) => { const left = g.alive(); if (left.length <= 1 || g.elapsed > this_cap(g)) g.finishRound(left.sort((a, b) => b.hp - a.hp || Math.random() - 0.5).map((p) => p.id).concat(g.outOrder.slice().reverse())); };
  const this_cap = (g) => g.mode.cap || 60;

  /* ---------- 8. Метеориты ---------- */
  MODES.push({
    id: 8, key: 'meteor', icon: '☄️', timed: 0, cap: 40, view: { r: 400 }, hearts: 1,
    ru: { name: 'Метеориты', goal: 'С неба падают метеориты — красные круги показывают, куда. У каждого 3 сердца. Беги и уворачивайся!', btn: 'РЫВОК' },
    en: { name: 'Meteor Shower', goal: 'Meteors rain down — red circles show where. Everyone has 3 hearts. Run and dodge!', btn: 'DASH' },
    phys: { acc: 1000, fric: 2.0, dashV: 520, dashT: 0.25, dashCD: 1.6 },
    init(g) { g.ms = { w: [], spawnT: 1.5 }; placeRing(g, 200); for (const p of g.players) { p.hp = 3; p.a = 3; } },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { if (p.inv > 0) p.inv -= dt; g.integrate(p, dt); g.softWall(p, 350); }
      g.collideAll(alive);
      ms.spawnT -= dt;
      if (ms.spawnT <= 0) {
        ms.spawnT = Math.max(0.28, 0.85 - g.elapsed * 0.015);
        const n = g.elapsed > 12 && Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          let x, y;
          if (alive.length && Math.random() < 0.75) { const t = alive[rnd(alive.length)]; x = t.x + t.vx * 0.55; y = t.y + t.vy * 0.55; }
          else { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 300; x = Math.cos(a) * r; y = Math.sin(a) * r; }
          ms.w.push({ id: ++g.uid, x, y, t: 1.15, r: rr(90, 125) });
        }
      }
      for (let k = ms.w.length - 1; k >= 0; k--) {
        const w = ms.w[k]; w.t -= dt; if (w.t > 0) continue;
        ms.w.splice(k, 1); g.events.push(['boom', Math.round(w.x), Math.round(w.y)]);
        for (const q of alive) {
          if (!q.alive || q.inv > 0 || q.air > 0) continue;
          const dx = q.x - w.x, dy = q.y - w.y, d = Math.hypot(dx, dy);
          if (d < w.r + C.PR * 0.6) {
            q.hp--; q.a = q.hp; q.inv = 1.2; q.frozen = 0.35; q.vx += (dx / (d || 1)) * 480; q.vy += (dy / (d || 1)) * 480;
            g.events.push(['hurt', q.id, Math.round(q.x), Math.round(q.y)]);
            if (q.hp <= 0) g.eliminate(q, 0, 'squash');
          }
        }
      }
      heartsEnd(g);
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; let mx = 0, my = 0, danger = 0;
      for (const w of ms.w) { const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy) || 1, lim = w.r + C.PR + 45; if (d < lim) { const k = 1 + (lim - d) / 60; mx += (dx / d) * k; my += (dy / d) * k; danger++; } }
      const dc = Math.hypot(p.x, p.y);
      if (!danger) { mx = -p.x * 0.003 + Math.sin(g.time * 0.8 + p.id) * 0.4; my = -p.y * 0.003 + Math.cos(g.time * 0.7 + p.id) * 0.4; }
      if (dc > 290) { mx -= (p.x / dc) * 1.5; my -= (p.y / dc) * 1.5; }
      const m = Math.hypot(mx, my) || 1; p.in.x = (mx / m) * a.skill; p.in.y = (my / m) * a.skill;
      if (danger && p.cd <= 0 && Math.random() < dt * 2 * a.skill) p.dashReq = true;
    },
    ex() { return {}; },
    objs(g) { return g.ms.w.map((w) => [6, w.id, Math.round(w.x), Math.round(w.y), Math.round(w.r), 0, Math.round((1 - w.t / 1.15) * 100), 0]); },
  });

  /* ---------- 9. Снеговик-охотник ---------- */
  MODES.push({
    id: 9, key: 'yeti', icon: '⛄', timed: 0, cap: 60, view: { r: 400 },
    ru: { name: 'Снеговик-охотник', goal: 'Злой снеговик гонится за пингвинами! Кого коснётся — тот выбывает. Продержись дольше всех.', btn: 'РЫВОК' },
    en: { name: 'Snowman Hunter', goal: 'An evil snowman hunts the penguins! Whoever it touches is out. Survive the longest.', btn: 'DASH' },
    phys: { acc: 1050, fric: 1.8, dashV: 600, dashT: 0.25, dashCD: 1.6 },
    init(g) { g.ms = { y: [], ys: 0 }; placeRing(g, 220); },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 350); }
      g.collideAll(alive);
      const T = [1.5, 15, 32];
      if (ms.ys < T.length && g.elapsed >= T[ms.ys]) { const a = Math.random() * TAU; ms.y.push({ id: ++g.uid, x: Math.cos(a) * 340, y: Math.sin(a) * 340, st: 0 }); ms.ys++; }
      const spd = Math.min(290, 165 + g.elapsed * 2.2);
      for (const y of ms.y) {
        if (y.st > 0) { y.st -= dt; continue; }
        let best = null, bd = 1e9; for (const q of alive) { if (!q.alive) continue; const d = Math.hypot(q.x - y.x, q.y - y.y); if (d < bd) { bd = d; best = q; } }
        if (!best) continue;
        y.x += ((best.x - y.x) / (bd || 1)) * spd * dt; y.y += ((best.y - y.y) / (bd || 1)) * spd * dt;
        if (bd < C.PR + 34 && best.air <= 0) { g.events.push(['hit', Math.round(best.x), Math.round(best.y), 1, best.id, best.id]); g.eliminate(best, 0, 'squash'); y.st = 1.2; }
      }
      g.checkElim();
      if (g.phase === 'play' && g.elapsed > this.cap) g.finishRound(g.alive().sort(() => Math.random() - 0.5).map((p) => p.id).concat(g.outOrder.slice().reverse()));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; let mx = 0, my = 0, near = 1e9;
      for (const y of ms.y) {
        const dx = p.x - y.x, dy = p.y - y.y, d = Math.hypot(dx, dy) || 1; near = Math.min(near, d);
        const w = Math.min(5, 300 / d); mx += (dx / d) * w; my += (dy / d) * w;
        if (d < 320) { const s = (p.x * dy - p.y * dx) >= 0 ? 1 : -1; mx += (-dy / d) * s * w * 0.8; my += (dx / d) * s * w * 0.8; }
      }
      const dc = Math.hypot(p.x, p.y);
      mx += -p.x * 0.002; my += -p.y * 0.002; if (dc > 280) { mx -= (p.x / dc) * 2; my -= (p.y / dc) * 2; }
      const m = Math.hypot(mx, my) || 1; p.in.x = (mx / m) * a.skill; p.in.y = (my / m) * a.skill;
      if (near < 135 && p.cd <= 0 && Math.random() < dt * 6 * a.skill) p.dashReq = true;
    },
    ex() { return {}; },
    objs(g) { return g.ms.y.map((y) => [5, y.id, Math.round(y.x), Math.round(y.y), 0, 16, y.st > 0 ? 1 : 0]); },
  });

  /* ---------- 10. Снежный ком ---------- */
  MODES.push({
    id: 10, key: 'pushball', icon: '⚪', timed: 45, view: { r: 400 }, live: '⚪',
    ru: { name: 'Снежный ком', goal: 'Столкни огромный снежный ком с льдины! Очко получает тот, кто толкнул его последним. 45 секунд.', btn: 'РЫВОК' },
    en: { name: 'Snow Boulder', goal: 'Shove the giant snowball off the ice! The last one to touch it scores. 45 seconds.', btn: 'DASH' },
    phys: { acc: 980, fric: 1.9, dashV: 600, dashT: 0.28, dashCD: 1.5 },
    init(g) { g.ms = { b: { x: 0, y: 0, vx: 0, vy: 0, r: 62, last: 0 }, resp: 0 }; placeRing(g, 260); for (const p of g.players) p.a = 0; },
    step(g, dt) {
      const ms = g.ms, b = ms.b, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 348); }
      g.collideAll(alive);
      if (ms.resp > 0) { ms.resp -= dt; if (ms.resp <= 0) { b.x = b.y = b.vx = b.vy = 0; b.last = 0; } }
      else {
        const f = Math.exp(-0.55 * dt); b.vx *= f; b.vy *= f; b.x += b.vx * dt; b.y += b.vy * dt;
        for (const p of alive) {
          const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), min = b.r + C.PR * 0.9;
          if (d < min && d > 0) {
            const nx = dx / d, ny = dy / d, ov = min - d; b.x += nx * ov * 0.85; b.y += ny * ov * 0.85; p.x -= nx * ov * 0.15; p.y -= ny * ov * 0.15;
            const rel = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
            if (rel < 0) { const j = -1.3 * rel * (p.dash > 0 ? 1.5 : 1); b.vx += nx * j * 0.75; b.vy += ny * j * 0.75; p.vx -= nx * j * 0.2; p.vy -= ny * j * 0.2; }
            b.last = p.id;
          }
        }
        if (Math.hypot(b.x, b.y) > 345 + b.r * 0.4) {
          const sc = g.players.find((q) => q.id === b.last);
          if (sc) { sc.a++; g.events.push(['goal', Math.round(b.x * 0.8), Math.round(b.y * 0.8), sc.id]); }
          ms.resp = 1.4; b.vx = b.vy = 0; b.x = 9999;
        }
      }
      if (g.elapsed >= this.timed) g.finishRound(alive.slice().sort((a, b2) => b2.a - a.a || Math.random() - 0.5).map((p) => p.id));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms, b = ms.b; a.t -= dt;
      if (a.t <= 0) { a.t = 0.15 + Math.random() * 0.2; a.wantDash = Math.random() < a.dashP; }
      if (ms.resp > 0) { steer(p, 0, 0, 0.3); return; }
      const bd = Math.hypot(b.x, b.y) || 1; let ox = b.x / bd, oy = b.y / bd;
      if (bd < 50) { ox = Math.cos(a.ang || (a.ang = Math.random() * TAU)); oy = Math.sin(a.ang); } else a.ang = null;
      const px = b.x - ox * (b.r + C.PR * 1.05), py = b.y - oy * (b.r + C.PR * 1.05), dp = Math.hypot(px - p.x, py - p.y), db = Math.hypot(b.x - p.x, b.y - p.y);
      const behind = (p.x - b.x) * ox + (p.y - b.y) * oy < -b.r * 0.6;
      if (dp > 70 && !behind) steer(p, px, py, a.skill); else steer(p, b.x + ox * 20, b.y + oy * 20, a.skill);
      if (a.wantDash && p.cd <= 0 && db < b.r + C.PR + 70 && behind) { p.dashReq = true; a.wantDash = false; }
    },
    ex() { return {}; },
    objs(g) { return g.ms.resp > 0 ? [] : [[9, 1, Math.round(g.ms.b.x), Math.round(g.ms.b.y), g.ms.b.r]]; },
  });

  /* ---------- 11. Минное поле ---------- */
  MODES.push({
    id: 11, key: 'mines', icon: '💥', timed: 0, cap: 75, view: { r: 400 },
    ru: { name: 'Минное поле', goal: 'На льду спрятаны мины — наступишь, и тебя отбросит! Не дай им скинуть тебя в воду. Льдина тает.', btn: 'РЫВОК' },
    en: { name: 'Minefield', goal: 'Mines are hidden on the ice — step on one and you get blasted! Do not get thrown into the water. The floe melts.', btn: 'DASH' },
    phys: { acc: 950, fric: 1.8, dashV: 540, dashT: 0.25, dashCD: 1.7 },
    addMine(g) {
      const alive = g.alive();
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * TAU, r = rr(70, Math.max(100, g.ms.R - 70)), x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (alive.some((p) => Math.hypot(p.x - x, p.y - y) < 130) || g.ms.mines.some((m) => Math.hypot(m.x - x, m.y - y) < 90)) continue;
        g.ms.mines.push({ id: ++g.uid, x, y, r: 42 }); return;
      }
    },
    init(g) { g.ms = { R: C.R0, mines: [], mT: 0 }; placeRing(g, 200); for (let i = 0; i < 16; i++) this.addMine(g); },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      if (g.elapsed > 5) ms.R = Math.max(110, C.R0 - (g.elapsed - 5) * 9);
      for (const p of alive) g.integrate(p, dt);
      g.collideAll(alive);
      ms.mT -= dt; if (ms.mT <= 0) { ms.mT = 1.5; if (ms.mines.length < 16) this.addMine(g); }
      for (let k = ms.mines.length - 1; k >= 0; k--) {
        const m = ms.mines[k];
        if (Math.hypot(m.x, m.y) > ms.R - 10) { ms.mines.splice(k, 1); continue; }
        const trig = alive.find((p) => p.alive && Math.hypot(p.x - m.x, p.y - m.y) < m.r + C.PR * 0.4);
        if (!trig) continue;
        ms.mines.splice(k, 1); g.events.push(['boom', Math.round(m.x), Math.round(m.y)]);
        for (const q of alive) {
          if (!q.alive) continue;
          const dx = q.x - m.x, dy = q.y - m.y, d = Math.hypot(dx, dy) || 1;
          if (d < 180) { const imp = (300 + 520 * (1 - d / 180)) / g.mass(q); q.vx += (dx / d) * imp; q.vy += (dy / d) * imp; q.frozen = 0.35; q.last = q === trig ? 0 : trig.id; q.lastT = g.time; }
        }
      }
      for (const p of alive) if (p.alive && Math.hypot(p.x, p.y) > ms.R + 6) g.eliminate(p, p.last && g.time - p.lastT < 4 ? p.last : 0, 'fall');
      g.checkElim();
      if (g.phase === 'play' && g.elapsed > this.cap) g.finishRound(g.alive().sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)).map((p) => p.id).concat(g.outOrder.slice().reverse()));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (a.t <= 0) { a.t = 0.2 + Math.random() * 0.2; const n = nearestAlive(g, p); a.tg = n ? n.q.id : 0; a.wantDash = Math.random() < a.dashP * 0.6; }
      const tg = g.players.find((q) => q.id === a.tg && q.alive);
      let mx = 0, my = 0;
      if (tg) { const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy) || 1; mx = (dx / d) * 0.5; my = (dy / d) * 0.5; }
      for (const m of ms.mines) { const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1, lim = m.r + C.PR + 70; if (d < lim) { const k = 1.2 + (lim - d) / 40; mx += (dx / d) * k; my += (dy / d) * k; } }
      const dc = Math.hypot(p.x, p.y), safe = ms.R - 100; if (dc > safe) { mx -= (p.x / dc) * (1 + (dc - safe) / 40); my -= (p.y / dc) * (1 + (dc - safe) / 40); }
      const mm = Math.hypot(mx, my) || 1; p.in.x = (mx / mm) * a.skill; p.in.y = (my / mm) * a.skill;
      if (tg && a.wantDash && p.cd <= 0 && Math.hypot(tg.x - p.x, tg.y - p.y) < 120 && dc < ms.R - 150) { p.dashReq = true; a.wantDash = false; }
    },
    ex(g) { return { R: +g.ms.R.toFixed(1) }; },
    objs(g) { return g.ms.mines.map((m) => [6, m.id, Math.round(m.x), Math.round(m.y), m.r, 0, 0, 2]); },
  });

  /* ---------- 12. Ледяные стульчики ---------- */
  MODES.push({
    id: 12, key: 'chairs', icon: '🎵', timed: 0, cap: 100, view: { r: 400 },
    ru: { name: 'Ледяные кружки', goal: 'Пока играет музыка — гуляй. Музыка стихла — беги в светящийся круг! Кругов на один меньше, чем игроков.', btn: 'РЫВОК', hints: ['🎵 Гуляй! Скоро музыка стихнет…', '🏃 БЕГИ В КРУГ! Один круг — один пингвин'] },
    en: { name: 'Ice Circles', goal: 'While the music plays — wander. When it stops, run into a glowing circle! There is one circle fewer than players.', btn: 'DASH', hints: ['🎵 Wander! The music will stop soon…', '🏃 RUN TO A CIRCLE! One circle — one penguin'] },
    phys: { acc: 1000, fric: 1.9, dashV: 560, dashT: 0.25, dashCD: 1.5 },
    init(g) { g.ms = { ph: 0, t: rr(3.5, 5), tt: 1, zones: [], cyc: 0 }; placeRing(g, 230); },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 350); }
      g.collideAll(alive);
      ms.t -= dt;
      if (ms.ph === 0 && ms.t <= 0) {
        const n = Math.max(1, alive.length - 1); ms.zones = [];
        for (let tries = 0; tries < 200 && ms.zones.length < n; tries++) {
          const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 235, x = Math.cos(a) * r, y = Math.sin(a) * r;
          if (ms.zones.every((z) => Math.hypot(z.x - x, z.y - y) > 140 || tries > 150)) ms.zones.push({ id: ++g.uid, x, y, r: 58 });
        }
        ms.ph = 1; ms.tt = ms.t = Math.max(2.3, 3.8 - ms.cyc * 0.35); g.events.push(['stop']);
      } else if (ms.ph === 1 && ms.t <= 0) {
        const safe = new Set();
        for (const z of ms.zones) {
          const occ = alive.filter((p) => p.alive && Math.hypot(p.x - z.x, p.y - z.y) < z.r + 12).sort((a, b) => Math.hypot(a.x - z.x, a.y - z.y) - Math.hypot(b.x - z.x, b.y - z.y));
          if (occ[0]) safe.add(occ[0].id);
        }
        for (const p of alive) if (p.alive && !safe.has(p.id)) g.eliminate(p, 0, 'fall');
        ms.zones = []; ms.ph = 0; ms.t = rr(3, 4.8); ms.cyc++; g.events.push(['judge']);
        g.checkElim();
      }
      if (g.phase === 'play' && g.elapsed > this.cap) g.finishRound(g.alive().map((p) => p.id).concat(g.outOrder.slice().reverse()));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (ms.ph === 0) { const th = g.time * 0.55 + p.id * 1.7; steer(p, Math.cos(th) * 170, Math.sin(th) * 170, 0.5); return; }
      if (a.t <= 0) {
        a.t = 0.2; let best = null, bs = 1e9;
        for (const z of ms.zones) {
          const dm = Math.hypot(z.x - p.x, z.y - p.y); let s = dm;
          for (const q of g.players) if (q !== p && q.alive && q.inRound && Math.hypot(z.x - q.x, z.y - q.y) < dm - 25) s += 170;
          if (s < bs) { bs = s; best = z; }
        }
        a.zone = best; a.wantDash = Math.random() < a.dashP + 0.2;
      }
      if (a.zone) { steer(p, a.zone.x, a.zone.y, a.skill); const d = Math.hypot(a.zone.x - p.x, a.zone.y - p.y); if (a.wantDash && p.cd <= 0 && d > 160) { p.dashReq = true; a.wantDash = false; } }
    },
    ex(g) { return { hi: g.ms.ph, t: +Math.max(0, g.ms.t).toFixed(1) }; },
    objs(g) { return g.ms.ph === 1 ? g.ms.zones.map((z) => [6, z.id, Math.round(z.x), Math.round(z.y), z.r, 0, Math.round((1 - g.ms.t / g.ms.tt) * 100), 1]) : []; },
  });

  /* ---------- 13. Светофор ---------- */
  MODES.push({
    id: 13, key: 'light', icon: '🚦', timed: 0, cap: 50, view: { r: 420 }, live: '🏁', liveSuf: '%',
    ru: { name: 'Светофор', goal: 'Беги к финишу, пока горит зелёный. Красный — замри! Кто двигается на красный, возвращается на старт.', btn: 'РЫВОК', hints: ['🟢 БЕГИ!', '🟡 Приготовься…', '🔴 СТОЙ! Не двигайся!'] },
    en: { name: 'Red Light', goal: 'Run to the finish on green. Red — freeze! Anyone moving on red goes back to the start.', btn: 'DASH', hints: ['🟢 RUN!', '🟡 Get ready…', '🔴 STOP! Do not move!'] },
    phys: { acc: 330, fric: 2.8, dashV: 230, dashT: 0.2, dashCD: 4 },
    init(g) {
      g.ms = { l: 0, t: rr(2.4, 3.6), redT: 0, fin: [] };
      const parts = g.players.filter((p) => p.inRound).sort(() => Math.random() - 0.5), n = parts.length;
      parts.forEach((p, i) => { p.x = (i - (n - 1) / 2) * 84; p.y = LIGHT.Y0 + 10 + (i % 2) * 28; p.face = -Math.PI / 2; p.a = 0; });
    },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 430); }
      g.collideAll(alive);
      ms.t -= dt;
      if (ms.l === 0 && ms.t <= 0) { ms.l = 1; ms.t = 0.75; g.events.push(['warn']); }
      else if (ms.l === 1 && ms.t <= 0) { ms.l = 2; ms.t = rr(1.8, 3); ms.redT = 0; g.events.push(['red']); }
      else if (ms.l === 2 && ms.t <= 0) { ms.l = 0; ms.t = rr(2.4, 4); g.events.push(['green']); }
      if (ms.l === 2) ms.redT += dt;
      for (const p of alive) {
        if (p.done) continue;
        if (ms.l === 2 && ms.redT > 0.5 && Math.hypot(p.vx, p.vy) > 52) { p.y = LIGHT.Y0 + 10; p.vx = p.vy = 0; p.frozen = 0.7; g.events.push(['back', p.id, Math.round(p.x), Math.round(p.y)]); }
        p.a = clampN(Math.round(((LIGHT.Y0 - p.y) / (LIGHT.Y0 - LIGHT.Y1)) * 100), 0, 100);
        if (p.y < LIGHT.Y1) { ms.fin.push(p.id); p.fin = ms.fin.length; p.done = true; p.a = 100; p.in.x = p.in.y = 0; g.events.push(['finish', p.id, p.fin]); }
      }
      const left = alive.filter((p) => !p.fin);
      if (left.length === 0 || g.elapsed > this.cap) g.finishRound(ms.fin.concat(left.sort((a, b) => a.y - b.y).map((p) => p.id)));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms;
      if (p.done) { p.in.x = p.in.y = 0; return; }
      if (ms.l === 0) { a.stopAt = null; steer(p, p.x * 0.96, LIGHT.Y1 - 40, a.skill); if (a.wantDash == null) a.wantDash = false; a.t -= dt; if (a.t <= 0) { a.t = 0.4; a.wantDash = Math.random() < a.dashP * 0.5; } if (a.wantDash && p.cd <= 0 && p.y > LIGHT.Y1 + 150) { p.dashReq = true; a.wantDash = false; } }
      else if (ms.l === 1) { if (a.stopAt == null) a.stopAt = Math.random() * 0.62 / (a.react || 1); a.stopAt -= dt; if (a.stopAt > 0) steer(p, p.x * 0.96, LIGHT.Y1 - 40, a.skill); else { p.in.x = p.in.y = 0; } }
      else { p.in.x = p.in.y = 0; }
    },
    ex(g) { return { l: g.ms.l, hi: g.ms.l }; },
    objs() { return []; },
  });

  /* ---------- 14. Три точки ---------- */
  MODES.push({
    id: 14, key: 'points', icon: '📍', timed: 50, view: { r: 400 }, live: '📍', liveSuf: 's',
    ru: { name: 'Три точки', goal: 'Захватывай светящиеся круги: стой в круге один — и копи очко каждую секунду. 50 секунд.', btn: 'РЫВОК' },
    en: { name: 'Three Points', goal: 'Capture the glowing circles: stand in one alone and earn a point every second. 50 seconds.', btn: 'DASH' },
    phys: { acc: 980, fric: 1.9, dashV: 600, dashT: 0.28, dashCD: 1.5 },
    init(g) { g.ms = { own: [0, 0, 0] }; placeRing(g, 250); for (const p of g.players) { p.sec = 0; p.a = 0; } },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 348); }
      g.collideAll(alive);
      PTS3.forEach((z, i) => {
        const ins = alive.filter((p) => Math.hypot(p.x - z.x, p.y - z.y) < z.r - 6);
        if (ins.length === 1) { ms.own[i] = ins[0].id; ins[0].sec += dt; ins[0].a = Math.floor(ins[0].sec); } else ms.own[i] = ins.length > 1 ? -1 : 0;
      });
      if (g.elapsed >= this.timed) g.finishRound(alive.slice().sort((a, b) => b.sec - a.sec || Math.random() - 0.5).map((p) => p.id));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (a.t <= 0) {
        a.t = 0.25 + Math.random() * 0.2; let best = 0, bs = 1e9;
        PTS3.forEach((z, i) => { let s = Math.hypot(z.x - p.x, z.y - p.y); const o = ms.own[i]; if (o === p.id) s -= 120; else if (o > 0) s -= 50; else if (o === -1) s += 30; if (s < bs) { bs = s; best = i; } });
        a.zi = best; a.wantDash = Math.random() < a.dashP;
      }
      const z = PTS3[a.zi || 0], d = Math.hypot(z.x - p.x, z.y - p.y), own = ms.own[a.zi || 0] === p.id;
      if (own && d < 40) { p.in.x = p.in.y = 0; return; }
      steer(p, z.x, z.y, d < 50 ? 0.5 : a.skill);
      const occ = ms.own[a.zi || 0] > 0 && !own ? g.players.find((q) => q.id === ms.own[a.zi || 0] && q.alive) : null;
      if (occ && a.wantDash && p.cd <= 0 && Math.hypot(occ.x - p.x, occ.y - p.y) < 130) { p.dashReq = true; a.wantDash = false; }
    },
    ex(g) { return { own: g.ms.own.slice() }; },
    objs(g) { return PTS3.map((z, i) => [6, 100 + i, z.x, z.y, z.r, g.ms.own[i], 0, 1]); },
  });

  /* ---------- 15. Ураган ---------- */
  MODES.push({
    id: 15, key: 'storm', icon: '🌪️', timed: 0, cap: 70, view: { r: 400 },
    ru: { name: 'Ураган', goal: 'Ветер крутится и крепчает! Держись на льдине, рывком упрись или толкни соперника. Последний выживший побеждает.', btn: 'РЫВОК' },
    en: { name: 'Hurricane', goal: 'The wind spins and strengthens! Stay on the ice, dash to brace, or shove a rival. Last one standing wins.', btn: 'DASH' },
    phys: { acc: 950, fric: 1.8, dashV: 620, dashT: 0.3, dashCD: 1.6 },
    init(g) { g.ms = { R: 330, wA: Math.random() * TAU, dir: Math.random() < 0.5 ? 1 : -1 }; placeRing(g, 170); },
    step(g, dt) {
      const ms = g.ms, alive = g.alive(), el = g.elapsed;
      const S = Math.min(750, 230 + el * 13); ms.wA += dt * ms.dir * (0.35 + el * 0.012); ms.S = S;
      if (el > 10) ms.R = Math.max(215, 330 - (el - 10) * 2.2);
      const wx = Math.cos(ms.wA) * S * dt, wy = Math.sin(ms.wA) * S * dt;
      for (const p of alive) { const k = g.mass(p) * 0.6 + 0.4; p.vx += wx / k; p.vy += wy / k; g.integrate(p, dt); }
      g.collideAll(alive);
      for (const p of alive) if (p.alive && Math.hypot(p.x, p.y) > ms.R + 6) g.eliminate(p, p.last && g.time - p.lastT < 4 ? p.last : 0, 'fall');
      g.checkElim();
      if (g.phase === 'play' && el > this.cap) g.finishRound(g.alive().sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)).map((p) => p.id).concat(g.outOrder.slice().reverse()));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (a.t <= 0) { a.t = 0.15 + Math.random() * 0.2; const n = nearestAlive(g, p); a.tg = n ? n.q.id : 0; a.wantDash = Math.random() < a.dashP * 0.7; }
      const dc = Math.hypot(p.x, p.y) || 1, k = (ms.S || 300) / 600;
      let mx = -p.x / dc * Math.min(1.2, dc / 90) - Math.cos(ms.wA) * k * 1.4, my = -p.y / dc * Math.min(1.2, dc / 90) - Math.sin(ms.wA) * k * 1.4;
      const m = Math.hypot(mx, my) || 1; p.in.x = (mx / m) * a.skill; p.in.y = (my / m) * a.skill;
      const tg = g.players.find((q) => q.id === a.tg && q.alive);
      if (tg && a.wantDash && p.cd <= 0 && dc < ms.R - 120) { const d = Math.hypot(tg.x - p.x, tg.y - p.y), tdc = Math.hypot(tg.x, tg.y); if (d < 120 && tdc > dc) { p.dashReq = true; a.wantDash = false; } }
    },
    ex(g) { return { R: +g.ms.R.toFixed(1), wd: [+(((g.ms.wA % TAU) + TAU) % TAU).toFixed(2), 2] }; },
    objs() { return []; },
  });

  /* ---------- 16. Карусель ---------- */
  MODES.push({
    id: 16, key: 'spinner', icon: '🎠', timed: 0, cap: 55, view: { r: 400 }, hearts: 1,
    ru: { name: 'Карусель', goal: 'Огромная перекладина крутится всё быстрее! Перепрыгивай её кнопкой. 3 сердца у каждого.', btn: 'ПРЫЖОК' },
    en: { name: 'Merry-Go-Round', goal: 'A giant beam spins faster and faster! Hop over it with the button. Everyone has 3 hearts.', btn: 'HOP' },
    phys: { acc: 1000, fric: 2.4, dashV: 0, dashT: 0, dashCD: 1.25 },
    init(g) { g.ms = { ang: Math.random() * TAU, w: 1.25 }; placeRing(g, 210); for (const p of g.players) { p.hp = 3; p.a = 3; } },
    onDash(g, p, dx, dy) { p.air = 0.55; p.cd = 1.25; p.vx += dx * 130; p.vy += dy * 130; g.events.push(['hop', p.id]); return true; },
    beams(g) { const ms = g.ms; const b = [ms.ang]; if (g.elapsed > 22) b.push(ms.ang + Math.PI); return b; },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      ms.w = Math.min(3.4, 1.25 + g.elapsed * 0.04); ms.ang += ms.w * dt;
      for (const p of alive) { if (p.inv > 0) p.inv -= dt; if (p.air > 0) p.air -= dt; g.integrate(p, dt); g.softWall(p, 350); }
      g.collideAll(alive);
      const beams = this.beams(g);
      for (const q of alive) {
        if (!q.alive || q.inv > 0 || q.air > 0) continue;
        for (const th of beams) {
          if (distSeg(q.x, q.y, 0, 0, Math.cos(th) * SPIN_L, Math.sin(th) * SPIN_L) < 20 + C.PR * 0.75) {
            q.hp--; q.a = q.hp; q.inv = 1.3; q.frozen = 0.3;
            q.vx += -Math.sin(th) * 520; q.vy += Math.cos(th) * 520;
            g.events.push(['hurt', q.id, Math.round(q.x), Math.round(q.y)]);
            if (q.hp <= 0) g.eliminate(q, 0, 'squash');
            break;
          }
        }
      }
      heartsEnd(g);
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms, beams = this.beams(g), pa = Math.atan2(p.y, p.x), dc = Math.hypot(p.x, p.y);
      steer(p, Math.cos(g.time * 0.3 + p.id) * 220, Math.sin(g.time * 0.3 + p.id) * 220, 0.35);
      if (dc > 300) steer(p, 0, 0, 0.6);
      for (const th of beams) {
        const tt = wrapPi(pa - th) / ms.w;
        if (tt > 0.06 && tt < 0.3 && p.cd <= 0 && Math.random() < dt * 16 * a.skill) { p.dashReq = true; break; }
      }
    },
    ex(g) { return { b: this.beams(g).map((x) => +(x % TAU).toFixed(2)), L: SPIN_L }; },
    objs() { return []; },
  });

  /* ---------- 17. Секторы ---------- */
  MODES.push({
    id: 17, key: 'sectors', icon: '🍕', timed: 0, cap: 70, view: { r: 400 },
    ru: { name: 'Тонущие секторы', goal: 'Льдина разбита на дольки. Красная долька скоро утонет — перебегай на целую! Кто остался на тонущей — за борт.', btn: 'РЫВОК' },
    en: { name: 'Sinking Slices', goal: 'The floe is split into slices. A red slice will sink soon — run to a safe one! Whoever stays on it goes overboard.', btn: 'DASH' },
    phys: { acc: 1000, fric: 1.9, dashV: 560, dashT: 0.25, dashCD: 1.5 },
    sec(x, y) { let a = Math.atan2(y, x); if (a < 0) a += TAU; return Math.min(SECT - 1, Math.floor(a / (TAU / SECT))); },
    init(g) { g.ms = { s: Array.from({ length: SECT }, () => ({ st: 0, t: 0 })), nt: 2 }; placeRing(g, 180); },
    step(g, dt) {
      const ms = g.ms, alive = g.alive();
      for (const p of alive) { g.integrate(p, dt); g.softWall(p, 355); }
      g.collideAll(alive);
      ms.nt -= dt;
      if (ms.nt <= 0) {
        ms.nt = Math.max(1.0, 2.5 - g.elapsed * 0.02);
        const bad = ms.s.filter((x) => x.st !== 0).length, ok = ms.s.map((x, i) => (x.st === 0 ? i : -1)).filter((i) => i >= 0);
        if (bad < 3 && ok.length) { const i = ok[rnd(ok.length)]; ms.s[i].st = 1; ms.s[i].t = 1.7; }
      }
      ms.s.forEach((x, i) => {
        if (x.st === 1) { x.t -= dt; if (x.t <= 0) { x.st = 2; x.t = 4.2; g.events.push(['sink', i]); } }
        else if (x.st === 2) { x.t -= dt; if (x.t <= 0) { x.st = 0; g.events.push(['rise', i]); } }
      });
      for (const p of alive) if (p.alive && Math.hypot(p.x, p.y) > 18 && ms.s[this.sec(p.x, p.y)].st === 2) g.eliminate(p, 0, 'fall');
      g.checkElim();
      if (g.phase === 'play' && g.elapsed > this.cap) g.finishRound(g.alive().map((p) => p.id).concat(g.outOrder.slice().reverse()));
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt;
      if (a.t <= 0) { a.t = 0.2 + Math.random() * 0.2; a.wantDash = Math.random() < a.dashP * 0.5; }
      const cur = this.sec(p.x, p.y), cs = ms.s[cur];
      if (cs.st !== 0 || ms.s[(cur + 1) % SECT].st === 1 || ms.s[(cur + SECT - 1) % SECT].st === 1 && Math.hypot(p.x, p.y) < 80) {
        let best = -1, bd = 1e9;
        ms.s.forEach((x, i) => { if (x.st !== 0) return; const ang = (i + 0.5) * (TAU / SECT), d = Math.hypot(Math.cos(ang) * 170 - p.x, Math.sin(ang) * 170 - p.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { const ang = (best + 0.5) * (TAU / SECT); steer(p, Math.cos(ang) * 170, Math.sin(ang) * 170, a.skill); if (cs.st === 1 && a.wantDash && p.cd <= 0 && bd > 150) { p.dashReq = true; a.wantDash = false; } return; }
      }
      const n = nearestAlive(g, p);
      if (n && n.d < 200 && a.skill > 0.7) { steer(p, n.q.x, n.q.y, 0.5); if (a.wantDash && p.cd <= 0 && n.d < 110) { p.dashReq = true; a.wantDash = false; } }
      else steer(p, 0, 0, 0.25);
    },
    ex(g) { return { sc: g.ms.s.map((x) => (x.st === 0 ? 0 : x.st === 1 ? 1 + Math.floor((1 - x.t / 1.7) * 8) : 10)) }; },
    objs() { return []; },
  });

  /* ---------- 18. Танки: захват флага ---------- */
  const TANK = {
    A: 600, BR: 84, SHELL: 540, CAPS: 3,
    base: [{ x: -510, y: 0 }, { x: 510, y: 0 }],
    walls: [[0, 0, 26, 170], [-300, -250, 26, 110], [-300, 250, 26, 110], [300, -250, 26, 110], [300, 250, 26, 110],
      [-150, -420, 90, 26], [150, -420, 90, 26], [-150, 420, 90, 26], [150, 420, 90, 26], [-430, 0, 26, 70], [430, 0, 26, 70]].map(([x, y, hw, hh]) => ({ x, y, hw, hh })),
  };
  function tankWalls(p) {
    const lim = TANK.A - C.PR * 0.9;
    if (p.x > lim) { p.x = lim; if (p.vx > 0) p.vx *= -0.4; } else if (p.x < -lim) { p.x = -lim; if (p.vx < 0) p.vx *= -0.4; }
    if (p.y > lim) { p.y = lim; if (p.vy > 0) p.vy *= -0.4; } else if (p.y < -lim) { p.y = -lim; if (p.vy < 0) p.vy *= -0.4; }
    const r = C.PR * 0.85;
    for (const w of TANK.walls) {
      const cx = Math.max(w.x - w.hw, Math.min(p.x, w.x + w.hw)), cy = Math.max(w.y - w.hh, Math.min(p.y, w.y + w.hh));
      let dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
      if (d < r) {
        if (d < 0.001) { const ox = (w.hw - Math.abs(p.x - w.x)), oy = (w.hh - Math.abs(p.y - w.y)); if (ox < oy) { dx = p.x < w.x ? -1 : 1; dy = 0; } else { dx = 0; dy = p.y < w.y ? -1 : 1; } d = 0; }
        else { dx /= d; dy /= d; }
        p.x = cx + dx * r + (d < 0.001 ? dx * (r) : 0); p.y = cy + dy * r + (d < 0.001 ? dy * r : 0);
        const vn = p.vx * dx + p.vy * dy; if (vn < 0) { p.vx -= 1.3 * vn * dx; p.vy -= 1.3 * vn * dy; }
      }
    }
  }
  const tankHit = (x, y, pad) => {
    if (Math.abs(x) > TANK.A - 4 || Math.abs(y) > TANK.A - 4) return true;
    for (const w of TANK.walls) if (Math.abs(x - w.x) < w.hw + pad && Math.abs(y - w.y) < w.hh + pad) return true;
    return false;
  };
  const tankSee = (x0, y0, x1, y1, pad) => {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.ceil(d / 18));
    for (let i = 1; i < n; i++) { const k = i / n; if (tankHit(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, pad)) return false; }
    return true;
  };
  // навигационная сетка для ботов (строится один раз)
  const TNAV = { n: [], adj: [] };
  (function () {
    for (let y = -TANK.A + 60; y <= TANK.A - 60; y += 80) for (let x = -TANK.A + 60; x <= TANK.A - 60; x += 80) if (!tankHit(x, y, C.PR + 14)) TNAV.n.push({ x, y });
    TNAV.adj = TNAV.n.map((a, i) => { const l = []; TNAV.n.forEach((b, j) => { if (i !== j) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 120 && tankSee(a.x, a.y, b.x, b.y, C.PR + 4)) l.push([j, d]); } }); return l; });
  })();
  function tankPath(x0, y0, x1, y1) { // возвращает ближайшую промежуточную точку или саму цель
    if (tankSee(x0, y0, x1, y1, C.PR + 6)) return [x1, y1];
    const N = TNAV.n, dist = new Float32Array(N.length).fill(1e9), prev = new Int16Array(N.length).fill(-1), done = new Uint8Array(N.length);
    N.forEach((n, i) => { if (tankSee(x0, y0, n.x, n.y, C.PR + 6)) dist[i] = Math.hypot(n.x - x0, n.y - y0); });
    let goal = -1, gb = 1e9;
    N.forEach((n, i) => { if (tankSee(n.x, n.y, x1, y1, C.PR + 6)) { const t = Math.hypot(n.x - x1, n.y - y1); if (t < gb + 1e-6 || goal < 0) { /* кандидат */ } } });
    for (let it = 0; it < N.length; it++) {
      let u = -1, bd = 1e9; for (let i = 0; i < N.length; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
      if (u < 0) break; done[u] = 1;
      for (const [v, w] of TNAV.adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
    let best = -1, bc = 1e9;
    N.forEach((n, i) => { if (dist[i] < 1e8 && tankSee(n.x, n.y, x1, y1, C.PR + 6)) { const c = dist[i] + Math.hypot(n.x - x1, n.y - y1); if (c < bc) { bc = c; best = i; } } });
    if (best < 0) return [x1, y1];
    let k = best; while (prev[k] >= 0) k = prev[k];
    return [N[k].x, N[k].y];
  }
  MODES.push({
    id: 18, key: 'tanks', icon: '🪖', timed: 110, live: '🚩', view: { rx: 640, ry: 640 },
    ru: { name: 'Танки', goal: 'Две команды. Забери флаг врага и привези на свою базу! Стреляй кнопкой — попадание отбрасывает врага и заставляет бросить флаг. Первые 3 флага или больше за 110 секунд.', btn: 'ОГОНЬ',
      hints: ['🚩 Забери флаг врага и вези на свою базу!', '🚩 У тебя флаг! Вези на свою базу!', '🛡️ Верни свой флаг — сбей врага!'] },
    en: { name: 'Tanks', goal: 'Two teams. Grab the enemy flag and bring it to your base! Fire with the button — a hit knocks the enemy back and makes them drop the flag. First to 3 flags, or the most in 110 seconds.', btn: 'FIRE',
      hints: ['🚩 Grab the enemy flag and bring it home!', '🚩 You have the flag! Get to your base!', '🛡️ Get your flag back — shoot the carrier!'] },
    phys: { acc: 3600, fric: 10, dashV: 0, dashT: 0, dashCD: 1.1 },
    spawn(g, p) {
      const b = TANK.base[p.tm], cnt = g.players.filter((q) => q.inRound && q.tm === p.tm).length, k = p.ti - (cnt - 1) / 2;
      p.x = b.x + (p.tm ? -50 : 50); p.y = k * 150; p.vx = p.vy = 0; p.face = p.tm ? Math.PI : 0; p.carry = 0;
    },
    init(g) {
      { // максимум 4 танка, команды всегда 2 на 2 (или 1 на 1): лишние — зрители, сначала отключаем ботов
        let ps = g.players.filter((p) => p.inRound);
        const cap = Math.min(4, ps.length - (ps.length % 2));
        while (ps.length > Math.max(2, cap)) {
          const out = ps.filter((p) => p.bot).pop() || ps[ps.length - 1];
          out.inRound = false; out.alive = false; out.spec = true; ps = ps.filter((p) => p !== out);
        }
      }
      const parts = g.players.filter((p) => p.inRound), hum = parts.filter((p) => !p.bot), bots = parts.filter((p) => p.bot);
      for (let i = hum.length - 1; i > 0; i--) { const j = rnd(i + 1); [hum[i], hum[j]] = [hum[j], hum[i]]; }
      const order = hum.concat(bots), cnt = [0, 0];
      order.forEach((p, i) => { p.tm = i % 2; p.ti = cnt[p.tm]++; });
      for (const p of parts) {
        p.a = 0; p.b = 0; p.pt = 0; p.carry = 0; p.hits = 0; p.dead = 0;
      }
      for (const p of parts) this.spawn(g, p);
      g.ms = { caps: [0, 0], hits: [0, 0], sh: [], fl: [0, 1].map((t) => ({ x: TANK.base[t].x, y: TANK.base[t].y, car: 0, drop: 0, home: 1 })) };
    },
    aim(g, p) {
      let ang = p.face, best = null, bd = 0.5;
      for (const q of g.players) {
        if (q === p || !q.alive || !q.inRound || q.tm === p.tm) continue;
        const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d > 700 || d < 20 || !tankSee(p.x, p.y, q.x, q.y, 6)) continue;
        const da = Math.abs(wrapPi(Math.atan2(dy, dx) - p.face)); if (da < bd) { bd = da; best = q; }
      }
      if (best) { const d = Math.hypot(best.x - p.x, best.y - p.y), t = d / TANK.SHELL; ang = Math.atan2(best.y + best.vy * t * 0.7 - p.y, best.x + best.vx * t * 0.7 - p.x); }
      return ang;
    },
    onDash(g, p) {
      const ang = p.bot ? p.aimA : this.aim(g, p), dx = Math.cos(ang), dy = Math.sin(ang);
      g.ms.sh.push({ id: ++g.uid, x: p.x + dx * (C.PR + 10), y: p.y + dy * (C.PR + 10), vx: dx * TANK.SHELL, vy: dy * TANK.SHELL, own: p.id, tm: p.tm, life: 1.1 });
      p.cd = 1.1; p.face = ang; p.dash = 0.1; g.events.push(["tfire", p.id, Math.round(p.x + dx * 30), Math.round(p.y + dy * 30)]);
      return true;
    },
    drop(g, p) {
      const f = g.ms.fl.find((q) => q.car === p.id); if (!f) return;
      f.car = 0; f.x = p.x; f.y = p.y; f.drop = 10; f.home = 0; p.carry = 0;
      g.events.push(['fdrop', Math.round(p.x), Math.round(p.y)]);
    },
    step(g, dt) {
      const ms = g.ms, all = g.players.filter((p) => p.inRound);
      for (const p of all) if (p.dead > 0) { // подбитый танк возрождается на своей базе через 3 секунды
        p.dead -= dt; p.in.x = p.in.y = 0; p.dashReq = false;
        if (p.dead <= 0) { p.dead = 0; p.alive = true; p.fall = 0; p.inv = 1.6; this.spawn(g, p); g.events.push(['trespawn', Math.round(p.x), Math.round(p.y), p.id]); }
      }
      const alive = g.alive();
      for (const p of alive) {
        if (p.inv > 0) p.inv -= dt;
        p.speedMul = p.carry ? 1.04 : 1;
        g.integrate(p, dt); tankWalls(p);
        if (p.bot && p.aimOn) p.face = p.aimA;
      }
      g.collideAll(alive, null);
      for (const p of alive) tankWalls(p);
      // снаряды
      for (let k = ms.sh.length - 1; k >= 0; k--) {
        const b = ms.sh[k]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        let dead = b.life <= 0 || tankHit(b.x, b.y, 4);
        if (dead && b.life > 0) g.events.push(['tspark', Math.round(b.x), Math.round(b.y)]);
        if (!dead) for (const q of alive) {
          if (q.id === b.own || q.tm === b.tm || q.inv > 0) continue;
          if (Math.hypot(q.x - b.x, q.y - b.y) < C.PR + 8) {
            dead = true;
            const own = g.players.find((o) => o.id === b.own); if (own) { own.hits++; own.pt += 2; own.b = own.pt; ms.hits[own.tm]++; }
            if (q.carry) { this.drop(g, q); if (own) { own.pt += 2; own.b = own.pt; } }
            q.alive = false; q.fall = 1; q.dead = 3; q.vx = q.vy = 0; q.in.x = q.in.y = 0; q.carry = 0;
            g.events.push(['thit', Math.round(q.x), Math.round(q.y), q.id, b.own]);
            break;
          }
        }
        if (dead) ms.sh.splice(k, 1);
      }
      // флаги
      for (let t = 0; t < 2; t++) {
        const f = ms.fl[t], hb = TANK.base[t];
        if (f.car) { const c = alive.find((p) => p.id === f.car); if (c) { f.x = c.x; f.y = c.y; } else { f.car = 0; f.drop = 10; f.home = 0; } continue; }
        if (!f.home) { f.drop -= dt; if (f.drop <= 0) { f.x = hb.x; f.y = hb.y; f.home = 1; g.events.push(['fback', t]); continue; } }
        for (const p of alive) {
          if (Math.hypot(p.x - f.x, p.y - f.y) > 52) continue;
          if (p.tm !== t) { if (!p.carry && p.inv <= 0.4) { f.car = p.id; p.carry = 1; f.home = 0; p.inv = 1.0; g.events.push(["fgrab", p.id, t]); break; } }
          else if (!f.home) { f.x = hb.x; f.y = hb.y; f.home = 1; f.drop = 0; p.pt += 2; p.b = p.pt; g.events.push(['fback', t, p.id]); break; }
        }
      }
      for (const p of alive) {
        if (!p.carry) continue; const hb = TANK.base[p.tm];
        if (Math.hypot(p.x - hb.x, p.y - hb.y) < TANK.BR) {
          const f = ms.fl.find((q) => q.car === p.id); if (!f) { p.carry = 0; continue; }
          f.car = 0; f.x = TANK.base[1 - p.tm].x; f.y = TANK.base[1 - p.tm].y; f.home = 1; p.carry = 0;
          ms.caps[p.tm]++; p.pt += 6; p.b = p.pt;
          for (const q of alive) if (q.tm === p.tm) q.a = ms.caps[p.tm];
          g.events.push(['fcap', p.tm, p.id, hb.x, hb.y]);
        }
      }
      for (const p of all) p.a = ms.caps[p.tm];
      if (ms.caps[0] >= TANK.CAPS || ms.caps[1] >= TANK.CAPS || g.elapsed >= this.timed) {
        let win = ms.caps[0] > ms.caps[1] ? 0 : ms.caps[1] > ms.caps[0] ? 1 : ms.hits[0] > ms.hits[1] ? 0 : ms.hits[1] > ms.hits[0] ? 1 : rnd(2);
        g.finishRound(all.slice().sort((a, b) => (b.tm === win) - (a.tm === win) || b.pt - a.pt || Math.random() - 0.5).map((p) => p.id));
      }
    },
    bot(g, p, dt) {
      const a = p.ai, ms = g.ms; a.t -= dt; p.aimOn = false;
      const myF = ms.fl[p.tm], enF = ms.fl[1 - p.tm], hb = TANK.base[p.tm];
      if (a.t <= 0) {
        a.t = 0.25 + Math.random() * 0.15;
        let gx, gy;
        if (p.carry) { gx = hb.x; gy = hb.y; }
        else if (myF.car) { const c = g.players.find((q) => q.id === myF.car); gx = c ? c.x : myF.x; gy = c ? c.y : myF.y; }              // догнать вора
        else if (!myF.home) { gx = myF.x; gy = myF.y; }                                                                                   // вернуть свой флаг
        else if (p.ti === 1 && !enF.car) { gx = hb.x + (p.tm ? -150 : 150); gy = Math.sin(g.elapsed * 0.6 + p.id) * 200; }               // защитник
        else if (enF.car && enF.car !== p.id) { const c = g.players.find((q) => q.id === enF.car); gx = c ? c.x + (c.tm === p.tm ? 0 : 0) : enF.x; gy = c ? c.y : enF.y; if (c && c.tm === p.tm) { gx = TANK.base[1 - p.tm].x * 0.2 + c.x * 0.8; gy = c.y; } }
        else { gx = enF.x; gy = enF.y; }
        a.gx = gx; a.gy = gy; const w = tankPath(p.x, p.y, gx, gy); a.wx = w[0]; a.wy = w[1];
        const n = nearestAlive(g, p, (q) => q.tm !== p.tm && tankSee(p.x, p.y, q.x, q.y, 6)); a.tg = n && n.d < 640 ? n.q.id : 0;
      }
      if (a.wx == null) { steer(p, 0, 0, 0); return; }
      const d = Math.hypot(a.wx - p.x, a.wy - p.y);
      steer(p, a.wx, a.wy, d < 24 ? 0.2 : a.skill);
      const tg = a.tg && g.players.find((q) => q.id === a.tg && q.alive);
      if (tg) {
        const dd = Math.hypot(tg.x - p.x, tg.y - p.y), t = dd / TANK.SHELL;
        p.aimA = Math.atan2(tg.y + tg.vy * t * 0.7 - p.y, tg.x + tg.vx * t * 0.7 - p.x) + rr(-0.16, 0.16) * (1.25 - a.skill) * 3; p.aimOn = true;
        if (p.cd <= 0 && dd < 600 && tankSee(p.x, p.y, tg.x, tg.y, 6) && Math.random() < dt * 0.9 * a.skill) p.dashReq = true;
      }
    },
    ex(g) {
      const T = {}; for (const p of g.players) if (p.inRound) T[p.id] = p.tm | 0;
      const hi = 0;
      const D = {}; for (const p of g.players) if (p.inRound && p.dead > 0) D[p.id] = Math.ceil(p.dead);
      return { c: g.ms.caps.slice(), D, fl: g.ms.fl.map((f) => [Math.round(f.x), Math.round(f.y), f.car, f.home ? 1 : 0]), T };
    },
    objs(g) { return g.ms.sh.map((b) => [7, b.id, Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.tm]); },
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
      this.cfg = { kind: 0, len: 3, mode: 0, bots: (this.pub || !this.lobbyMode) ? 1 : 0, chaos: 0, diff: 1, picks: [] };
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
        ai: { t: 0, target: 0, fish: null, skill: 0.7, dashP: 0.3, react: 1, wantDash: false, lane: 0, strafe: 1 },
      };
      if (bot) { const D = C.DIFFS[this.cfg.diff] || C.DIFFS[1]; p.ai.skill = rr(D.skill[0], D.skill[1]); p.ai.dashP = rr(D.dash[0], D.dash[1]); p.ai.react = D.react; }
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
      if (['sumo', 'potato', 'tiles', 'slide', 'snow', 'meteor', 'yeti', 'mines', 'chairs', 'storm', 'spinner', 'sectors'].includes(m)) this.checkElim();
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
      if (c.kind != null) this.cfg.kind = c.kind === 2 ? 2 : c.kind ? 1 : 0;
      if (Array.isArray(c.picks)) { const seen = []; for (const v of c.picks) { const m = v | 0; if (m >= 0 && m < MODES.length && !seen.includes(m) && seen.length < 10) seen.push(m); } this.cfg.picks = seen; }
      if (c.len != null && (C.LENS.includes(c.len | 0) || (c.len | 0) === 1 || (c.len | 0) === 2)) this.cfg.len = c.len | 0;
      if (c.mode != null) { const m = c.mode | 0; if (m >= 0 && m < MODES.length && !(MODES[m].key === 'tanks' && this.humans().length > 4)) this.cfg.mode = m; }
      if (c.bots != null) this.cfg.bots = c.bots ? 1 : 0;
      if (c.chaos != null) this.cfg.chaos = c.chaos ? 1 : 0;
      if (c.diff != null) { const d = c.diff | 0; if (d >= 0 && d < C.DIFFS.length) this.cfg.diff = d; }
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
      if (this.cfg.kind === 2 && this.cfg.picks.length) return this.cfg.picks.slice();
      const ids = MODES.map((m) => m.id); for (let i = ids.length - 1; i > 0; i--) { const j = rnd(i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      return ids.slice(0, len);
    }

    startMatch() {
      if (this.phase !== 'lobby') return false;
      if (!this.cfg.bots && this.humans().length < 2) return false;
      this.plan = this.demo ? new Array(1000).fill(0) : this.makePlan();
      if (this.humans().length > 4) { // танки — максимум 4 игрока (2 на 2): при пяти людях режим недоступен
        const tk = MODES.find((m) => m.key === 'tanks').id;
        this.plan = this.plan.map((id) => { if (id !== tk) return id; const ok = MODES.map((m) => m.id).filter((i) => i !== tk && !this.plan.includes(i)); return ok.length ? ok[rnd(ok.length)] : 0; });
      }
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
          const active = this.mode.key === 'tanks' || this.players.some((p) => !p.bot && p.alive && p.inRound && !p.done);
          const scale = this.demo || active ? 1 : 2.5;
          const n = Math.ceil(scale), h = (dt * scale) / n;
          for (let i = 0; i < n && this.phase === 'play'; i++) {
            this.elapsed += h;
            for (const p of this.players) if (p.bot && p.alive && p.inRound) this.mode.bot(this, p, h * (p.ai.react || 1));
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
        host: this.hostId, cfg: [this.cfg.kind, this.cfg.len, this.cfg.mode, this.cfg.bots, this.cfg.chaos, this.cfg.diff, this.cfg.picks.slice()], pub: this.pub ? 1 : 0,
        plan: this.plan.slice(0, 10),
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
  return { C, Game, MODES, RACE, TILES, SNOW_OBS, CROWN, TANK, tankWalls, PTS3, LIGHT, SECT, cleanLook, pointsFor, PHASES };
});
