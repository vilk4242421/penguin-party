/* Penguin Sumo — профиль игрока: монеты, уровень, покупки, статистика, достижения */
(function (root) {
  'use strict';
  const KEY = 'ps_profile_v2';
  const C = root.Cosmetics;

  const DEF = () => ({
    name: '', coins: 0, xp: 0,
    look: { c: 4, p: 0, h: 0, e: 0, t: 0 },
    owned: { c: [], p: [], h: [], e: [], t: [] },
    stats: { ko: 0, roundWins: 0, matchWins: 0, matches: 0, dashes: 0, picks: 0, falls: 0, bestKoRound: 0, friendMatches: 0 },
    ach: {}, lastDaily: '',
    opts: { sound: true, music: true, vibe: true },
  });
  let P = DEF();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const o = JSON.parse(raw); P = Object.assign(DEF(), o); P.look = Object.assign(DEF().look, o.look); P.stats = Object.assign(DEF().stats, o.stats); P.opts = Object.assign(DEF().opts, o.opts); P.owned = Object.assign(DEF().owned, o.owned); }
      else { // миграция со старой версии
        const old = (k, d) => { try { const v = localStorage.getItem('ps_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
        P.name = old('name', ''); P.opts.sound = old('sound', true);
      }
    } catch (e) { P = DEF(); }
    // бесплатное — всегда «куплено»
    for (const slot of Object.keys(P.owned)) for (let i = 0; i < C.count(slot); i++) if (C.price(slot, i) === 0 && !P.owned[slot].includes(i)) P.owned[slot].push(i);
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
    if (P.coins < pr) return false;
    P.coins -= pr; P.owned[slot].push(i); save(); checkAch(); return true;
  }
  function equip(slot, i) { if (owned(slot, i)) { P.look[slot] = i; save(); return true; } return false; }
  const ownedCount = () => Object.keys(P.owned).reduce((s, k) => s + P.owned[k].length, 0);

  /* ---------- достижения ---------- */
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
  ];
  let onAch = null;
  function checkAch() {
    for (const a of ACH) if (!P.ach[a.id] && a.v() >= a.goal) { P.ach[a.id] = 1; P.coins += a.rew; P.xp += a.rew; save(); if (onAch) onAch(a); }
  }
  function stat(k, n) { P.stats[k] = (P.stats[k] || 0) + (n == null ? 1 : n); save(); checkAch(); }
  function statMax(k, v) { if (v > (P.stats[k] || 0)) { P.stats[k] = v; save(); checkAch(); } }

  /* ежедневный подарок */
  function daily() {
    const d = new Date(); const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    if (P.lastDaily === key) return 0;
    P.lastDaily = key; earn(50); return 50;
  }

  root.Profile = { load, save, get P() { return P; }, level, levelProgress, earn, owned, buy, equip, ACH, checkAch, stat, statMax, daily, set onAch(f) { onAch = f; }, ownedCount };
})(window);
