/* Penguin Sumo v2 — общая симуляция (сервер + офлайн-режим клиента) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const C = {
    PROTO: 2, VERSION: '2.0.0',
    R0: 360, RMIN: 8, PR: 34,
    ACC: 900, FRIC: 1.7,
    DASH_V: 700, DASH_CD: 1.5, DASH_T: 0.3,
    SHRINK_DELAY: 5, SHRINK_RATE: 11,
    MAX: 8, MIN_TOTAL: 5,
    COUNT: 3.2, OVER: 4.5, FINAL: 9,
    WIN_PTS: 3, FISH_EVERY: 6, BOOST_T: 6, SHIELD_T: 6, FREEZE_T: 1.6,
    WIND_F: 420,
    LOBBY_SOLO: 15, LOBBY_MULTI: 8, LOBBY_AFTER: 7,
    N_COLORS: 16, N_PAT: 6, N_HAT: 15, N_EYE: 5, N_TRAIL: 6, N_EMO: 8,
    ROUND_OPTIONS: [3, 5, 7, 10],
  };
  const BOT_NAMES = ['Snowy', 'Frosty', 'Iceberg', 'Waddle', 'Pingu', 'Mumble', 'Skipper', 'Gunter', 'Chilly', 'Flip', 'Rico', 'Kowalski'];
  const rnd = (n) => Math.floor(Math.random() * n);

  function cleanLook(l) {
    l = l || {};
    const n = (v, m) => { v = v | 0; return v >= 0 && v < m ? v : 0; };
    return { c: n(l.c, C.N_COLORS), p: n(l.p, C.N_PAT), h: n(l.h, C.N_HAT), e: n(l.e, C.N_EYE), t: n(l.t, C.N_TRAIL) };
  }

  class Game {
    /* opts.lobby — режим комнаты с ожиданием (сервер); opts.pub — публичная комната с автостартом */
    constructor(opts) {
      opts = opts || {};
      this.lobbyMode = !!opts.lobby;
      this.demo = !!opts.demo; // фон меню: только боты, нормальная скорость
      this.pub = !!opts.pub;
      this.cfg = { rounds: 5, bots: (this.pub || !this.lobbyMode) ? 1 : 0, chaos: 0 };
      this.players = [];
      this.nextId = 1; this.pid = 1;
      this.phase = 'lobby'; // lobby | count | play | over | final
      this.timer = 0; this.elapsed = 0; this.autoT = -1;
      this.R = C.R0; this.pickups = []; this.events = [];
      this.winner = 0; this.round = 0; this.time = 0;
      this.fishT = C.FISH_EVERY; this.hostId = 0;
      this.windState = 0; this.windT = 10; this.windA = 0;
      this.rosterDirty = true;
    }

    humans() { return this.players.filter(p => !p.bot); }

    /* ---------- игроки ---------- */
    addPlayer(name, look, bot) {
      look = cleanLook(look);
      const p = {
        id: this.nextId++, name: String(name || 'Penguin').slice(0, 14), look, bot: !!bot,
        x: 0, y: 0, vx: 0, vy: 0, alive: false, spec: true, fall: 1,
        dash: 0, cd: 0, boost: 0, shield: 0, frozen: 0, score: 0, face: 0, last: 0, lastT: -99,
        in: { x: 0, y: 0 }, dashReq: false,
        ai: { t: 0, target: 0, fish: null, skill: 0.72 + Math.random() * 0.22, dashP: 0.35 + Math.random() * 0.4, wantDash: false },
      };
      // у разных игроков не должно быть одинакового цвета+узора
      for (let k = 0; k < C.N_COLORS && this.players.some(q => q.look.c === p.look.c && q.look.p === p.look.p); k++) p.look.c = (p.look.c + 1) % C.N_COLORS;
      this.players.push(p);
      if (!bot && !this.hostId) this.hostId = p.id;
      this.rosterDirty = true;
      if (this.phase === 'lobby') this.placeLobby(p);
      else if (this.phase === 'count') this.placeAll();
      return p;
    }

    removePlayer(id) {
      const i = this.players.findIndex(p => p.id === id);
      if (i < 0) return;
      this.players.splice(i, 1);
      if (id === this.hostId) { const h = this.humans()[0]; this.hostId = h ? h.id : 0; }
      this.rosterDirty = true;
      if (this.phase === 'play') this.checkEnd();
    }

    setInput(id, x, y, dash) {
      const p = this.players.find(q => q.id === id);
      if (!p) return;
      x = +x || 0; y = +y || 0;
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      p.in.x = x; p.in.y = y;
      if (dash) p.dashReq = true;
    }

    setCfg(id, c) {
      if (id !== this.hostId || this.phase !== 'lobby' || !c) return;
      if (C.ROUND_OPTIONS.includes(c.rounds | 0)) this.cfg.rounds = c.rounds | 0;
      if (!this.pub) this.cfg.bots = c.bots ? 1 : 0;
      this.cfg.chaos = c.chaos ? 1 : 0;
      this.rosterDirty = true;
    }

    /* ---------- размещение ---------- */
    placeLobby(p) {
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * 6.283, r = 40 + Math.random() * 170;
        p.x = Math.cos(a) * r; p.y = Math.sin(a) * r;
        if (!this.players.some(q => q !== p && !q.spec && Math.hypot(q.x - p.x, q.y - p.y) < C.PR * 2.2)) break;
      }
      p.vx = p.vy = 0; p.alive = true; p.spec = false; p.fall = 0; p.face = Math.random() * 6.28;
      p.dash = 0; p.cd = 0; p.boost = 0; p.shield = 0; p.frozen = 0; p.in.x = p.in.y = 0; p.dashReq = false;
    }

    placeAll() {
      const n = this.players.length;
      const a0 = Math.random() * Math.PI * 2;
      this.players.forEach((p, i) => {
        const a = a0 + (i / n) * Math.PI * 2;
        p.x = Math.cos(a) * C.R0 * 0.55; p.y = Math.sin(a) * C.R0 * 0.55;
        p.vx = p.vy = 0; p.alive = true; p.spec = false; p.fall = 0;
        p.dash = 0; p.cd = 0; p.boost = 0; p.shield = 0; p.frozen = 0;
        p.face = a + Math.PI; p.last = 0; p.dashReq = false; p.in.x = p.in.y = 0;
      });
    }

    balanceBots() {
      const h = this.humans().length;
      const want = this.cfg.bots ? Math.max(0, Math.min(C.MIN_TOTAL - h, C.MAX - h)) : 0;
      const bots = this.players.filter(p => p.bot);
      while (bots.length > want) { const b = bots.pop(); this.players.splice(this.players.indexOf(b), 1); }
      while (bots.length < want) {
        const nm = BOT_NAMES[(this.nextId + bots.length) % BOT_NAMES.length];
        const look = { c: rnd(C.N_COLORS), p: rnd(3) === 0 ? rnd(C.N_PAT) : 0, h: rnd(C.N_HAT), e: rnd(3) === 0 ? rnd(C.N_EYE) : 0, t: 0 };
        bots.push(this.addPlayer(nm, look, true));
      }
      this.rosterDirty = true;
    }

    /* ---------- матч ---------- */
    startMatch() {
      if (this.phase !== 'lobby') return false;
      if (!this.cfg.bots && this.humans().length < 2) return false;
      for (const p of this.players) p.score = 0;
      this.round = 0; this.autoT = -1;
      this.events.push(['start']);
      this.newRound();
      return true;
    }

    resetMatch() { // офлайн: сразу новый матч
      for (const p of this.players) p.score = 0;
      this.round = 0;
      this.events.push(['start']);
      this.newRound();
    }

    toLobby() {
      this.players = this.players.filter(p => !p.bot);
      for (const p of this.players) { p.score = 0; this.placeLobby(p); }
      this.phase = 'lobby'; this.autoT = this.pub ? C.LOBBY_AFTER : -1;
      this.pickups = []; this.R = C.R0; this.windState = 0; this.round = 0; this.winner = 0;
      this.events.push(['lobby']);
      this.rosterDirty = true;
    }

    newRound() {
      this.balanceBots();
      this.round++;
      this.phase = 'count'; this.timer = C.COUNT; this.elapsed = 0; this.R = C.R0;
      this.pickups = []; this.winner = 0; this.fishT = this.cfg.chaos ? 2.5 : C.FISH_EVERY;
      this.windState = 0; this.windT = (this.cfg.chaos ? 8 : 12) + Math.random() * 4;
      this.placeAll();
      this.rosterDirty = true;
    }

    /* ---------- главный шаг ---------- */
    step(dt) {
      this.time += dt;
      switch (this.phase) {
        case 'lobby': return this.stepLobby(dt);
        case 'count':
          this.timer -= dt;
          if (this.timer <= 0) { this.phase = 'play'; this.timer = 0; this.elapsed = 0; this.events.push(['go']); }
          return;
        case 'over':
          this.timer -= dt; this.updateFalling(dt);
          for (const p of this.players) p.dash = Math.max(0, p.dash - dt);
          if (this.timer <= 0) {
            if (this.round >= this.cfg.rounds) { this.phase = 'final'; this.timer = C.FINAL; this.events.push(['final']); }
            else this.newRound();
          }
          return;
        case 'final':
          this.timer -= dt; this.updateFalling(dt);
          if (this.timer <= 0) { if (this.lobbyMode) this.toLobby(); else this.resetMatch(); }
          return;
        default: {
          const scale = this.demo || this.players.some(p => !p.bot && p.alive) ? 1 : 2.5;
          const n = Math.ceil(scale), h = (dt * scale) / n;
          for (let i = 0; i < n && this.phase === 'play'; i++) this.stepPlay(h);
        }
      }
    }

    stepLobby(dt) {
      const list = this.players.filter(p => p.alive);
      for (const p of list) {
        this.integrate(p, dt, true);
        const d = Math.hypot(p.x, p.y), lim = C.R0 - C.PR;
        if (d > lim) { // мягкая стенка
          const nx = p.x / d, ny = p.y / d;
          p.x = nx * lim; p.y = ny * lim;
          const vn = p.vx * nx + p.vy * ny;
          if (vn > 0) { p.vx -= 1.6 * vn * nx; p.vy -= 1.6 * vn * ny; }
        }
      }
      this.collideAll(list);
      if (this.pub) {
        const h = this.humans().length;
        if (h >= 1) {
          if (this.autoT < 0) this.autoT = h >= 2 ? C.LOBBY_MULTI : C.LOBBY_SOLO;
          else if (h >= 2 && this.autoT > C.LOBBY_MULTI) this.autoT = C.LOBBY_MULTI;
          this.autoT -= dt;
          if (this.autoT <= 0) { this.autoT = -1; this.startMatch(); }
        } else this.autoT = -1;
      }
    }

    /* движение одного пингвина */
    integrate(p, dt, lobby) {
      let ax = p.in.x, ay = p.in.y;
      if (p.frozen > 0) { ax = ay = 0; p.dashReq = false; p.frozen -= dt; }
      const m = Math.hypot(ax, ay);
      const acc = C.ACC * (p.boost > 0 ? 1.15 : 1);
      p.vx += ax * acc * dt; p.vy += ay * acc * dt;
      if (p.dashReq) {
        p.dashReq = false;
        if (p.cd <= 0) {
          let dx, dy;
          if (m > 0.2) { dx = ax / m; dy = ay / m; }
          else { const sp = Math.hypot(p.vx, p.vy); if (sp > 30) { dx = p.vx / sp; dy = p.vy / sp; } else { dx = Math.cos(p.face); dy = Math.sin(p.face); } }
          p.vx += dx * C.DASH_V; p.vy += dy * C.DASH_V;
          p.dash = C.DASH_T;
          p.cd = C.DASH_CD * (p.boost > 0 ? 0.5 : 1) * (!lobby && this.cfg.chaos ? 0.75 : 1);
          this.events.push(['dash', p.id]);
        }
      }
      const f = Math.exp(-C.FRIC * (p.frozen > 0 ? 2.4 : 1) * dt);
      p.vx *= f; p.vy *= f;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.dash > 0) p.dash -= dt;
      if (p.cd > 0) p.cd -= dt;
      if (p.boost > 0) p.boost -= dt;
      if (p.shield > 0) p.shield -= dt;
      if (m > 0.2) p.face = Math.atan2(ay, ax);
      else if (Math.hypot(p.vx, p.vy) > 40) p.face = Math.atan2(p.vy, p.vx);
    }

    mass(p) { return (p.dash > 0 ? 2.3 : 1) * (p.boost > 0 ? 1.8 : 1) * (p.shield > 0 ? 2.6 : 1); }

    collideAll(list) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy), min = C.PR * 2;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const ma = this.mass(a), mb = this.mass(b);
        const ov = min - d, tm = ma + mb;
        a.x -= nx * ov * mb / tm; a.y -= ny * ov * mb / tm;
        b.x += nx * ov * ma / tm; b.y += ny * ov * ma / tm;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const j2 = (-(1 + 1.05) * rel) / (1 / ma + 1 / mb);
          a.vx -= (j2 / ma) * nx; a.vy -= (j2 / ma) * ny;
          b.vx += (j2 / mb) * nx; b.vy += (j2 / mb) * ny;
          if (rel < -120) this.events.push(['hit', Math.round((a.x + b.x) / 2), Math.round((a.y + b.y) / 2), +Math.min(1, -rel / 900).toFixed(2), a.id, b.id]);
        }
        a.last = b.id; a.lastT = this.time; b.last = a.id; b.lastT = this.time;
      }
    }

    stepPlay(dt) {
      this.elapsed += dt;
      const chaos = this.cfg.chaos;
      if (this.elapsed > C.SHRINK_DELAY) this.R = Math.max(C.RMIN, C.R0 - (this.elapsed - C.SHRINK_DELAY) * C.SHRINK_RATE * (chaos ? 1.35 : 1));
      const alive = this.players.filter(p => p.alive);

      for (const p of alive) if (p.bot) this.think(p, dt);

      // ветер
      this.windT -= dt;
      if (this.windState === 0 && this.elapsed > 6 && this.windT <= 0) { this.windState = 1; this.windA = Math.random() * 6.283; this.windT = 1.6; this.events.push(['wind', +this.windA.toFixed(2)]); }
      else if (this.windState === 1 && this.windT <= 0) { this.windState = 2; this.windT = 3; }
      else if (this.windState === 2 && this.windT <= 0) { this.windState = 0; this.windT = (chaos ? 7 : 14) + Math.random() * 6; }
      if (this.windState === 2) {
        const wx = Math.cos(this.windA) * C.WIND_F * dt, wy = Math.sin(this.windA) * C.WIND_F * dt;
        for (const p of alive) { p.vx += wx / (this.mass(p) * 0.6 + 0.4); p.vy += wy / (this.mass(p) * 0.6 + 0.4); }
      }

      for (const p of alive) this.integrate(p, dt, false);
      this.collideAll(alive);

      // бонусы
      this.fishT -= dt;
      if (this.fishT <= 0) {
        this.fishT = chaos ? 2.5 : C.FISH_EVERY;
        if (this.pickups.length < (chaos ? 4 : 2) && this.R > 140) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (this.R - 80);
          const q = Math.random();
          const kind = q < 0.4 ? 0 : q < 0.6 ? 1 : q < 0.85 ? 2 : 3; // рыбка, заморозка, волна, щит
          this.pickups.push({ id: ++this.pid, x: Math.cos(a) * r, y: Math.sin(a) * r, kind });
        }
      }
      for (const p of alive) for (let k = this.pickups.length - 1; k >= 0; k--) {
        const f = this.pickups[k];
        if (Math.hypot(p.x - f.x, p.y - f.y) < C.PR + 16) {
          this.pickups.splice(k, 1);
          this.events.push(['pick', p.id, Math.round(f.x), Math.round(f.y), f.kind]);
          this.applyPickup(p, f.kind);
        }
      }

      // падение в воду
      for (const p of alive) {
        if (Math.hypot(p.x, p.y) > this.R + 6) {
          p.alive = false; p.fall = 0.001;
          let killer = 0;
          if (p.last && this.time - p.lastT < 4) {
            const k = this.players.find(q => q.id === p.last);
            if (k && k !== p) { k.score += 1; killer = k.id; }
          }
          this.events.push(['ko', p.id, killer]);
        }
      }
      this.updateFalling(dt);
      this.checkEnd();
    }

    applyPickup(p, kind) {
      if (kind === 0) p.boost = C.BOOST_T;
      else if (kind === 3) p.shield = C.SHIELD_T;
      else if (kind === 1) {
        for (const q of this.players) if (q !== p && q.alive && Math.hypot(q.x - p.x, q.y - p.y) < 280) q.frozen = C.FREEZE_T;
        this.events.push(['freeze', Math.round(p.x), Math.round(p.y)]);
      } else if (kind === 2) {
        for (const q of this.players) {
          if (q === p || !q.alive) continue;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
          if (d < 330 && d > 0) { const imp = (260 + 520 * (1 - d / 330)) / this.mass(q); q.vx += (dx / d) * imp; q.vy += (dy / d) * imp; q.last = p.id; q.lastT = this.time; }
        }
        this.events.push(['shock', Math.round(p.x), Math.round(p.y)]);
      }
    }

    updateFalling(dt) {
      for (const p of this.players) {
        if (!p.alive && !p.spec && p.fall < 1) {
          const f = Math.exp(-0.9 * dt);
          p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt;
          p.fall = Math.min(1, p.fall + dt * 1.1);
          if (p.fall >= 1) this.events.push(['splash', Math.round(p.x), Math.round(p.y)]);
        }
      }
    }

    checkEnd() {
      if (this.phase !== 'play') return;
      const alive = this.players.filter(p => p.alive);
      if (alive.length <= 1) {
        this.phase = 'over'; this.timer = C.OVER;
        if (alive.length === 1) { alive[0].score += C.WIN_PTS; this.winner = alive[0].id; }
        else this.winner = 0;
        this.events.push(['win', this.winner]);
      }
    }

    /* ---------- ИИ ботов ---------- */
    think(p, dt) {
      if (p.frozen > 0) return;
      const a = p.ai; a.t -= dt;
      const dc = Math.hypot(p.x, p.y);
      if (a.t <= 0) {
        a.t = 0.12 + Math.random() * 0.18;
        let best = 0, bs = 1e9;
        for (const q of this.players) {
          if (q === p || !q.alive) continue;
          const s = Math.hypot(q.x - p.x, q.y - p.y) - (Math.hypot(q.x, q.y) / this.R) * 160 + Math.random() * 40;
          if (s < bs) { bs = s; best = q.id; }
        }
        a.target = best;
        a.fish = null;
        for (const f of this.pickups) if (Math.hypot(f.x - p.x, f.y - p.y) < 260) { a.fish = f; break; }
        a.wantDash = Math.random() < a.dashP;
      }
      const tg = this.players.find(q => q.id === a.target && q.alive);
      let ix, iy;
      if (a.fish && dc < this.R - 110) { ix = a.fish.x - p.x; iy = a.fish.y - p.y; }
      else if (tg) {
        const tdc = Math.hypot(tg.x, tg.y) || 1;
        ix = tg.x - (tg.x / tdc) * C.PR * 1.3 - p.x; iy = tg.y - (tg.y / tdc) * C.PR * 1.3 - p.y;
      } else { ix = -p.x; iy = -p.y; }
      const m = Math.hypot(ix, iy) || 1; ix /= m; iy /= m;

      const safe = this.R - 90;
      const outward = dc > 1 ? (p.vx * p.x + p.vy * p.y) / dc : 0;
      if (dc > safe && outward > -60) { ix = -p.x / dc; iy = -p.y / dc; }
      else if (dc > safe - 40 && outward > 160) { ix = -p.x / dc; iy = -p.y / dc; }
      p.in.x = ix * a.skill; p.in.y = iy * a.skill;

      if (tg && a.wantDash && p.cd <= 0 && dc < this.R - 140) {
        const d = Math.hypot(tg.x - p.x, tg.y - p.y);
        const tOut = Math.hypot(tg.x, tg.y) > dc - 25;
        if (d < 130 && tOut) { p.dashReq = true; a.wantDash = false; }
      }
    }

    /* ---------- сериализация ---------- */
    takeRoster() {
      if (!this.rosterDirty) return null;
      this.rosterDirty = false;
      return {
        list: this.players.map(p => [p.id, p.name, p.look.c, p.look.p, p.look.h, p.look.e, p.look.t, p.bot ? 1 : 0]),
        host: this.hostId, cfg: [this.cfg.rounds, this.cfg.bots, this.cfg.chaos], pub: this.pub ? 1 : 0,
      };
    }

    snapshot() {
      const ph = { count: 0, play: 1, over: 2, final: 3, lobby: 4 }[this.phase];
      return {
        ph, tm: +(this.phase === 'lobby' ? this.autoT : this.timer).toFixed(2), el: +this.elapsed.toFixed(1), R: +this.R.toFixed(1),
        w: this.winner, rd: this.round, rs: this.cfg.rounds,
        p: this.players.map(p => [
          p.id, +p.x.toFixed(1), +p.y.toFixed(1), Math.round(p.vx), Math.round(p.vy),
          (p.alive ? 1 : 0) | (p.dash > 0 ? 2 : 0) | (p.boost > 0 ? 4 : 0) | (p.spec ? 8 : 0) | (p.frozen > 0 ? 16 : 0) | (p.shield > 0 ? 32 : 0),
          Math.round((Math.max(0, p.cd) / C.DASH_CD) * 100), p.score, Math.round(p.fall * 100),
        ]),
        f: this.pickups.map(f => [f.id, Math.round(f.x), Math.round(f.y), f.kind]),
        wd: this.windState ? [+this.windA.toFixed(2), this.windState] : 0,
        e: this.events.splice(0),
      };
    }
  }

  return { C, Game, cleanLook };
});
