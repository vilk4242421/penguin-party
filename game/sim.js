/* Penguin Sumo — общая симуляция (используется и сервером, и клиентом в офлайн-режиме) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const C = {
    R0: 360, RMIN: 8, PR: 34,
    ACC: 900, FRIC: 1.7,
    DASH_V: 700, DASH_CD: 1.5, DASH_T: 0.3,
    SHRINK_DELAY: 5, SHRINK_RATE: 11,
    MAX: 8, MIN_TOTAL: 5,
    COUNT: 3.2, OVER: 4.5, ROUNDS: 5, FINAL: 9,
    WIN_PTS: 3, FISH_EVERY: 6, BOOST_T: 6,
  };
  const COLORS = ['#ff5d5d', '#ffa73d', '#ffe14d', '#6be36b', '#3fd0ff', '#5b7bff', '#c06bff', '#ff6bd0'];
  const BOT_NAMES = ['Snowy', 'Frosty', 'Iceberg', 'Waddle', 'Pingu', 'Mumble', 'Skipper', 'Gunter', 'Chilly', 'Flip'];

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  class Game {
    constructor() {
      this.players = [];
      this.nextId = 1;
      this.pid = 1;
      this.phase = 'count'; // count | play | over
      this.timer = C.COUNT;
      this.elapsed = 0;
      this.R = C.R0;
      this.pickups = [];
      this.events = [];
      this.winner = 0;
      this.round = 1;
      this.time = 0;
      this.fishT = C.FISH_EVERY;
      this.rosterDirty = true;
    }

    humans() { return this.players.filter(p => !p.bot); }

    freeColor(pref) {
      const used = new Set(this.players.map(p => p.color));
      if (pref && COLORS.includes(pref) && !used.has(pref)) return pref;
      return COLORS.find(c => !used.has(c)) || COLORS[0];
    }

    addPlayer(name, color, hat, bot) {
      const p = {
        id: this.nextId++, name: String(name || 'Penguin').slice(0, 14),
        color: this.freeColor(color), hat: (hat | 0) % 4, bot: !!bot,
        x: 0, y: 0, vx: 0, vy: 0, alive: false, spec: true, fall: 1,
        dash: 0, cd: 0, boost: 0, score: 0, face: 0, last: 0, lastT: -99,
        in: { x: 0, y: 0 }, dashReq: false,
        ai: { t: 0, target: 0, fish: null, skill: 0.72 + Math.random() * 0.22, dashP: 0.35 + Math.random() * 0.4 },
      };
      this.players.push(p);
      this.rosterDirty = true;
      if (this.phase === 'count') { if (!bot) this.balanceBots(); this.placeAll(); }
      return p;
    }

    removePlayer(id) {
      const i = this.players.findIndex(p => p.id === id);
      if (i < 0) return;
      this.players.splice(i, 1);
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

    placeAll() {
      const n = this.players.length;
      const a0 = Math.random() * Math.PI * 2;
      this.players.forEach((p, i) => {
        const a = a0 + (i / n) * Math.PI * 2;
        p.x = Math.cos(a) * C.R0 * 0.55; p.y = Math.sin(a) * C.R0 * 0.55;
        p.vx = p.vy = 0; p.alive = true; p.spec = false; p.fall = 0;
        p.dash = 0; p.cd = 0; p.boost = 0; p.face = a + Math.PI; p.last = 0; p.dashReq = false;
        p.in.x = p.in.y = 0;
      });
    }

    balanceBots() {
      const h = this.humans().length;
      const want = Math.max(0, Math.min(C.MIN_TOTAL - h, C.MAX - h));
      const bots = this.players.filter(p => p.bot);
      while (bots.length > want) { const b = bots.pop(); this.players.splice(this.players.indexOf(b), 1); }
      while (bots.length < want) {
        const nm = BOT_NAMES[(this.nextId + bots.length) % BOT_NAMES.length];
        bots.push(this.addPlayer(nm, null, Math.floor(Math.random() * 4), true));
      }
      this.rosterDirty = true;
    }

    resetMatch() {
      for (const p of this.players) p.score = 0;
      this.round = 0;
      this.newRound();
    }

    newRound() {
      this.balanceBots();
      this.round++;
      this.phase = 'count'; this.timer = C.COUNT; this.elapsed = 0; this.R = C.R0;
      this.pickups = []; this.winner = 0; this.fishT = C.FISH_EVERY;
      this.placeAll();
      this.rosterDirty = true;
    }

    /* ---------- главный шаг ---------- */
    step(dt) {
      this.time += dt;
      if (this.phase === 'count') {
        this.timer -= dt;
        if (this.timer <= 0) { this.phase = 'play'; this.timer = 0; this.elapsed = 0; this.events.push(['go']); }
        return;
      }
      if (this.phase === 'over') {
        this.timer -= dt;
        this.updateFalling(dt);
        for (const p of this.players) { p.dash = Math.max(0, p.dash - dt); }
        if (this.timer <= 0) {
          if (this.round >= C.ROUNDS) { this.phase = 'final'; this.timer = C.FINAL; this.events.push(['final']); }
          else this.newRound();
        }
        return;
      }
      if (this.phase === 'final') {
        this.timer -= dt;
        this.updateFalling(dt);
        if (this.timer <= 0) this.resetMatch();
        return;
      }
      const scale = this.players.some(p => !p.bot && p.alive) ? 1 : 2.5;
      const n = Math.ceil(scale), h = (dt * scale) / n;
      for (let i = 0; i < n && this.phase === 'play'; i++) this.stepPlay(h);
    }

    stepPlay(dt) {
      this.elapsed += dt;
      if (this.elapsed > C.SHRINK_DELAY) this.R = Math.max(C.RMIN, C.R0 - (this.elapsed - C.SHRINK_DELAY) * C.SHRINK_RATE);
      const alive = this.players.filter(p => p.alive);

      for (const p of alive) if (p.bot) this.think(p, dt);

      for (const p of alive) {
        let { x: ax, y: ay } = p.in;
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
            p.dash = C.DASH_T; p.cd = C.DASH_CD * (p.boost > 0 ? 0.5 : 1);
            this.events.push(['dash', p.id]);
          }
        }
        const f = Math.exp(-C.FRIC * dt);
        p.vx *= f; p.vy *= f;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.dash > 0) p.dash -= dt;
        if (p.cd > 0) p.cd -= dt;
        if (p.boost > 0) p.boost -= dt;
        if (m > 0.2) p.face = Math.atan2(ay, ax);
        else if (Math.hypot(p.vx, p.vy) > 40) p.face = Math.atan2(p.vy, p.vx);
      }

      // столкновения
      for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy), min = C.PR * 2;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const ma = (a.dash > 0 ? 2.3 : 1) * (a.boost > 0 ? 1.8 : 1);
        const mb = (b.dash > 0 ? 2.3 : 1) * (b.boost > 0 ? 1.8 : 1);
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

      // рыбки
      this.fishT -= dt;
      if (this.fishT <= 0) {
        this.fishT = C.FISH_EVERY;
        if (this.pickups.length < 2 && this.R > 140) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (this.R - 80);
          this.pickups.push({ id: ++this.pid, x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
      }
      for (const p of alive) for (let k = this.pickups.length - 1; k >= 0; k--) {
        const f = this.pickups[k];
        if (Math.hypot(p.x - f.x, p.y - f.y) < C.PR + 16) {
          p.boost = C.BOOST_T; this.pickups.splice(k, 1);
          this.events.push(['pick', p.id, Math.round(f.x), Math.round(f.y)]);
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
      if (a.fish && p.boost <= 0 && dc < this.R - 110) { ix = a.fish.x - p.x; iy = a.fish.y - p.y; }
      else if (tg) {
        const tdc = Math.hypot(tg.x, tg.y) || 1;
        ix = tg.x - (tg.x / tdc) * C.PR * 1.3 - p.x; iy = tg.y - (tg.y / tdc) * C.PR * 1.3 - p.y;
      } else { ix = -p.x; iy = -p.y; }
      let m = Math.hypot(ix, iy) || 1; ix /= m; iy /= m;

      const safe = this.R - 90;
      const outward = dc > 1 ? (p.vx * p.x + p.vy * p.y) / dc : 0;
      if (dc > safe && outward > -60) {
        ix = -p.x / dc; iy = -p.y / dc;
        // тормозим, гася скорость наружу
      } else if (dc > safe - 40 && outward > 160) {
        ix = -p.x / dc; iy = -p.y / dc;
      }
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
      return this.players.map(p => [p.id, p.name, p.color, p.hat, p.bot ? 1 : 0]);
    }

    snapshot() {
      return {
        ph: this.phase === 'count' ? 0 : this.phase === 'play' ? 1 : this.phase === 'over' ? 2 : 3,
        tm: +this.timer.toFixed(2), el: +this.elapsed.toFixed(1), R: +this.R.toFixed(1),
        w: this.winner, rd: this.round,
        p: this.players.map(p => [
          p.id, +p.x.toFixed(1), +p.y.toFixed(1), Math.round(p.vx), Math.round(p.vy),
          (p.alive ? 1 : 0) | (p.dash > 0 ? 2 : 0) | (p.boost > 0 ? 4 : 0) | (p.spec ? 8 : 0),
          Math.round((Math.max(0, p.cd) / C.DASH_CD) * 100), p.score, Math.round(p.fall * 100),
        ]),
        f: this.pickups.map(f => [f.id, Math.round(f.x), Math.round(f.y)]),
        e: this.events.splice(0),
      };
    }
  }

  return { C, COLORS, Game, clamp };
});
