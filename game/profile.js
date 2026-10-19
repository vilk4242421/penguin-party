/* Пингвины — профиль игрока: монеты, уровень, покупки, статистика, достижения, кликер, секретные коды */
(function (root) {
  'use strict';
  const KEY = 'ps_profile_v2';
  const C = root.Cosmetics;

  const DEF = () => ({
    name: '', coins: 0, xp: 0,
    look: { c: 4, p: 0, h: 0, e: 0, t: 0, s: 0 },
    owned: { c: [], p: [], h: [], e: [], t: [], s: [] },
    stats: { ko: 0, roundWins: 0, matchWins: 0, matches: 0, dashes: 0, picks: 0, falls: 0, bestKoRound: 0, friendMatches: 0, tours: 0, tourWins: 0, modeMask: 0, taps: 0, podium: 0 },
    ach: {}, lastDaily: '',
    clk: { fish: 0, total: 0, lp: 0, la: 0, done: 0, seen: 0 },
    codes: {},
    opts: { sound: true, music: true, vibe: true },
  });
  let P = DEF();

  /* ---------- кликер: параметры ---------- */
  const CLK = {
    GOAL: 80000, MAXL: 25,
    STAGES: [0, 2500, 12000, 35000, 65000],
    LOOKS: [
      { c: 4, p: 0, h: 0, e: 0, t: 0, s: 0 }, { c: 5, p: 0, h: 1, e: 0, t: 0, s: 0 }, { c: 0, p: 1, h: 0, e: 1, t: 0, s: 0 },
      { c: 15, p: 0, h: 13, e: 0, t: 0, s: 0 }, { c: 16, p: 0, h: 15, e: 0, t: 0, s: 0 },
    ],
    NAMES: [['Малыш', 'Little one'], ['Рыбак', 'Fisher'], ['Крутой', 'Cool one'], ['Чемпион', 'Champion'], ['Легенда льдов', 'Ice legend']],
    costP: (l) => Math.floor(25 * Math.pow(1.55, l)),
    costA: (l) => Math.floor(120 * Math.pow(1.6, l)),
    power: () => 1 + P.clk.lp,
    // авто-клики слабее ручных: уровень даёт 0.3 клика/с, и каждый приносит лишь часть силы клика
    autoRate: () => P.clk.la * 0.3,
    income: () => P.clk.la * 0.3 * (1 + P.clk.lp * 0.2),
    stage: () => { let s = 0; for (let i = 0; i < CLK.STAGES.length; i++) if (P.clk.total >= CLK.STAGES[i]) s = i; return s; },
  };

  /* ---------- секретные коды (хранятся только хэши) ---------- */
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
  const fnv = (s) => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
  const CODES = { '12809762': { slot: 's', idx: 1, id: 'veriti' }, 'bc164324': { slot: 's', idx: 2, id: 'lutikov' }, '257bb5e5': { slot: 's', idx: 3, id: 'rbveriti' }, 'd83f00d2': { coins: 10000, id: 'rybkisbest' } };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw), d = DEF();
        P = Object.assign(d, o);
        P.look = Object.assign(DEF().look, o.look); P.stats = Object.assign(DEF().stats, o.stats); P.opts = Object.assign(DEF().opts, o.opts);
        P.owned = Object.assign(DEF().owned, o.owned); P.clk = Object.assign(DEF().clk, o.clk); P.codes = o.codes || {};
        if (P.clk.done && !P.owned.h.includes(31)) P.owned.h.push(31); // прошедшие симулятор получают радужную корону
      } else {
        const old = (k, d) => { try { const v = localStorage.getItem('ps_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
        P.name = old('name', ''); P.opts.sound = old('sound', true);
      }
    } catch (e) { P = DEF(); }
    for (const slot of Object.keys(P.owned)) for (let i = 0; i < C.count(slot); i++) if (C.price(slot, i) === 0 && !P.owned[slot].includes(i)) P.owned[slot].push(i);
    // экипированное, которого нет в наличии, снимаем
    for (const k of Object.keys(P.look)) if (!P.owned[k] || !P.owned[k].includes(P.look[k])) P.look[k] = 0;
    if (P.look.c === 0 && !P.owned.c.includes(0)) P.look.c = 4;
    return P;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }

  const level = () => Math.floor(Math.sqrt(P.xp / 60)) + 1;
  const levelProgress = () => { const L = level(); const a = (L - 1) * (L - 1) * 60, b = L * L * 60; return (P.xp - a) / (b - a); };

  function earn(n) { P.coins += n; P.xp += n; save(); }
  const owned = (slot, i) => P.owned[slot].includes(i);
  function buy(slot, i) {
    const pr = C.price(slot, i);
    if (owned(slot, i)) return true;
    if (pr < 0 || P.coins < pr) return false;
    P.coins -= pr; P.owned[slot].push(i); save(); checkAch(); return true;
  }
  function unlock(slot, i) { if (!owned(slot, i)) { P.owned[slot].push(i); save(); checkAch(); return true; } return false; }
  function equip(slot, i) { if (owned(slot, i)) { P.look[slot] = i; save(); return true; } return false; }
  const ownedCount = () => Object.keys(P.owned).reduce((s, k) => s + P.owned[k].length, 0);

  /* ---------- достижения ---------- */
  const popc = (n) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
  const ACH = [
    { id: 'rw1', ru: 'Первая победа', en: 'First win', dru: 'Выиграй раунд', den: 'Win a round', rew: 30, v: () => P.stats.roundWins, goal: 1 },
    { id: 'ko10', ru: 'Задира', en: 'Bully', dru: 'Скинь 10 соперников', den: 'Knock off 10 rivals', rew: 50, v: () => P.stats.ko, goal: 10 },
    { id: 'ko100', ru: 'Грозный пингвин', en: 'Mighty penguin', dru: 'Скинь 100 соперников', den: 'Knock off 100 rivals', rew: 200, v: () => P.stats.ko, goal: 100 },
    { id: 'tk', ru: 'Тройной нокаут', en: 'Triple knockout', dru: '3 нокаута за один раунд', den: '3 knockouts in one round', rew: 60, v: () => P.stats.bestKoRound, goal: 3 },
    { id: 'm1', ru: 'Чемпион', en: 'Champion', dru: 'Выиграй матч', den: 'Win a match', rew: 100, v: () => P.stats.matchWins, goal: 1 },
    { id: 'm10', ru: 'Легенда льдов', en: 'Ice legend', dru: 'Выиграй 10 матчей', den: 'Win 10 matches', rew: 300, v: () => P.stats.matchWins, goal: 10 },
    { id: 'p10', ru: 'Свой на льдине', en: 'Regular', dru: 'Сыграй 10 матчей', den: 'Play 10 matches', rew: 60, v: () => P.stats.matches, goal: 10 },
    { id: 'd50', ru: 'Рывок!', en: 'Dash!', dru: 'Сделай 50 рывков', den: 'Dash 50 times', rew: 40, v: () => P.stats.dashes, goal: 50 },
    { id: 'd500', ru: 'Ракета', en: 'Rocket', dru: 'Сделай 500 рывков', den: 'Dash 500 times', rew: 150, v: () => P.stats.dashes, goal: 500 },
    { id: 'pk20', ru: 'Коллекционер', en: 'Collector', dru: 'Подбери 20 бонусов', den: 'Pick up 20 bonuses', rew: 60, v: () => P.stats.picks, goal: 20 },
    { id: 'f10', ru: 'Закалка', en: 'Cold bath', dru: 'Упади в воду 10 раз', den: 'Fall in the water 10 times', rew: 30, v: () => P.stats.falls, goal: 10 },
    { id: 'fr', ru: 'С друзьями веселее', en: 'Friends', dru: 'Сыграй матч в комнате с друзьями', den: 'Play a match in a friends room', rew: 40, v: () => P.stats.friendMatches, goal: 1 },
    { id: 'wd', ru: 'Модник', en: 'Fashionista', dru: 'Собери 20 предметов гардероба', den: 'Own 20 wardrobe items', rew: 80, v: () => ownedCount(), goal: 20 },
    { id: 'tr1', ru: 'Турнирщик', en: 'Tournament player', dru: 'Доиграй турнир до пьедестала', den: 'Finish a tournament', rew: 60, v: () => P.stats.tours, goal: 1 },
    { id: 'tw1', ru: 'Чемпион турнира', en: 'Tournament champion', dru: 'Выиграй турнир', den: 'Win a tournament', rew: 150, v: () => P.stats.tourWins, goal: 1 },
    { id: 'pod', ru: 'Пьедестал', en: 'On the podium', dru: 'Попади в тройку турнира 5 раз', den: 'Reach a top-3 finish 5 times', rew: 100, v: () => P.stats.podium, goal: 5 },
    { id: 'all', ru: 'Универсал', en: 'All-rounder', dru: 'Выиграй раунд в 5 разных режимах', den: 'Win a round in 5 different modes', rew: 150, v: () => popc(P.stats.modeMask), goal: 5 },
    { id: 'tap', ru: 'Рыбный магнат', en: 'Fish tycoon', dru: 'Сделай 1000 кликов в симуляторе', den: 'Tap 1000 times in the simulator', rew: 80, v: () => P.stats.taps, goal: 1000 },
    { id: 'sim', ru: 'Прошёл симулятор', en: 'Simulator complete', dru: 'Пройди симулятор кликов', den: 'Complete the click simulator', rew: 200, v: () => (P.clk.done ? 1 : 0), goal: 1 },
  ];
  let onAch = null;
  function checkAch() {
    for (const a of ACH) if (!P.ach[a.id] && a.v() >= a.goal) { P.ach[a.id] = 1; P.coins += a.rew; P.xp += a.rew; save(); if (onAch) onAch(a); }
  }
  function stat(k, n) { P.stats[k] = (P.stats[k] || 0) + (n == null ? 1 : n); save(); checkAch(); }
  function statMax(k, v) { if (v > (P.stats[k] || 0)) { P.stats[k] = v; save(); checkAch(); } }
  function modeWin(id) { P.stats.modeMask |= 1 << id; save(); checkAch(); }

  /* ежедневный подарок */
  function daily() {
    const d = new Date(); const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    if (P.lastDaily === key) return 0;
    P.lastDaily = key; earn(50); return 50;
  }

  /* ---------- кликер ---------- */
  function clickerReward() { // за прохождение симулятора: уникальный цвет и шляпа
    if (P.clk.done) return false;
    P.clk.done = 1; unlock('c', 16); unlock('h', 31); P.look.c = 16; P.look.h = 31; save(); checkAch(); return true;
  }

  /* ---------- коды ---------- */
  function redeem(code) {
    const h = fnv(norm(code)), c = CODES[h];
    if (!c) return { ok: false };
    if (c.coins) { const had = !!P.codes[c.id]; if (!had) { P.coins += c.coins; P.codes[c.id] = 1; save(); } return { ok: true, had, coins: c.coins }; }
    const had = owned(c.slot, c.idx);
    unlock(c.slot, c.idx); P.codes[c.id] = 1; P.look[c.slot] = c.idx; save();
    return { ok: true, had, slot: c.slot, idx: c.idx };
  }

  root.Profile = { load, save, get P() { return P; }, level, levelProgress, earn, owned, buy, unlock, equip, ACH, checkAch, stat, statMax, modeWin, daily, set onAch(f) { onAch = f; }, ownedCount, CLK, clickerReward, redeem };
})(window);
