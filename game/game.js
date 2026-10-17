/* Пингвины-сумо v2 — клиент */
(function () {
'use strict';
const { C, Game } = Sim;
const Cos = Cosmetics, Pro = Profile, GA = GameAudio;
const $ = (id) => document.getElementById(id);
const PR = C.PR;
const TAU = Math.PI * 2;
Pro.load();
const P = Pro.P;

/* ================= локальное хранилище (мелочи) ================= */
const ls = {
  get(k, d) { try { const v = localStorage.getItem('ps_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ps_' + k, JSON.stringify(v)); } catch (e) {} },
};

/* ================= локализация ================= */
const L = {
  ru: {
    title: 'Пингвины-сумо', tag: 'Столкни всех со льдины!', yourName: 'Твоё имя',
    online: 'Играть онлайн', onlineSub: 'Быстрый матч с живыми игроками', friends: 'С друзьями (по коду)',
    create: 'Создать комнату', join: 'Войти', offline: 'Против ботов', offlineSub: 'Без интернета', install: '📲 Установить',
    wardrobe: 'Гардероб', achievements: 'Награды', settings: 'Настройки', back: 'Назад',
    sfx: 'Звуки', music: 'Музыка', vibe: 'Вибрация', language: 'Язык', update: '🔄 Обновить игру',
    howto: '🏁 Матч — несколько раундов, побеждает тот, у кого больше очков.<br>🕹 Двигайся джойстиком (WASD / стрелки), ⚡ рывок — кнопка (Пробел).<br>🐟 сила · ❄️ заморозка · 💥 волна · 🛡 щит · 💨 ветер — береги льдину!',
    dash: 'РЫВОК', go: 'ВПЕРЁД!', round: 'Раунд', draw: 'Ничья!', youWon: 'ТЫ ПОБЕДИЛ!',
    fell: 'Ты упал в воду! 🌊', watching: 'Смотришь за боем', nextRound: 'Войдёшь в следующем раунде',
    alive: 'Живы', connecting: 'Подключаемся…', waking: 'Сервер просыпается, подождите до минуты…',
    noServer: 'Сервер недоступен. Попробуй позже или играй против ботов.', noRoom: 'Комната не найдена', full: 'Комната заполнена',
    lost: 'Соединение потеряно', old: 'Вышла новая версия — обновляем игру…', room: 'Комната', copied: 'Код скопирован!',
    online_n: (n) => `Сейчас онлайн: ${n}`, enterCode: 'Введи код из 4 букв', youTag: 'ты', matchEnd: 'Итоги матча', newMatchIn: 'Новый матч через',
    lobbyTitle: 'Комната ожидания', lobbyWait: 'Ждём друзей… нужно минимум 2 игрока', lobbyAuto: (n) => `Матч начнётся через ${n}…`,
    lobbyAutoWait: 'Ищем соперников…', lobbyReady: 'Все готовы? Жми СТАРТ!', lobbyWaitHost: 'Ждём, пока хозяин начнёт матч', start: 'СТАРТ',
    rounds: 'Раунды', bots: 'Боты', chaos: 'Хаос', share: 'Позвать друзей', hintLobby: 'Пока ждёте — потренируйтесь: рывок, толчки, эмоции!',
    tabc: 'Цвет', tabp: 'Узор', tabh: 'Шляпа', tabe: 'Очки', tabt: 'След', notEnough: 'Не хватает монет 🪙', bought: 'Куплено!',
    achUnlocked: 'Достижение', daily: 'Ежедневный подарок', windWarn: '💨 Ветер!', earned: 'Заработано', levelUp: 'Новый уровень', level: 'Ур.',
    updating: 'Обновляем…', joinRoomHint: 'Нажми «Войти», чтобы попасть в комнату друзей',
    pk: ['Сила!', 'Заморозка!', 'Ударная волна!', 'Щит!'], dashHint: '', needTwo: 'Нужно минимум 2 игрока (или включи ботов)',
  },
  en: {
    title: 'Penguin Sumo', tag: 'Knock everyone off the ice!', yourName: 'Your name',
    online: 'Play online', onlineSub: 'Quick match with real players', friends: 'With friends (room code)',
    create: 'Create room', join: 'Join', offline: 'Vs bots', offlineSub: 'No internet needed', install: '📲 Install',
    wardrobe: 'Wardrobe', achievements: 'Awards', settings: 'Settings', back: 'Back',
    sfx: 'Sounds', music: 'Music', vibe: 'Vibration', language: 'Language', update: '🔄 Update game',
    howto: '🏁 A match is several rounds — most points wins.<br>🕹 Move with the joystick (WASD / arrows), ⚡ dash with the button (Space).<br>🐟 power · ❄️ freeze · 💥 shockwave · 🛡 shield · 💨 wind — mind the ice!',
    dash: 'DASH', go: 'GO!', round: 'Round', draw: 'Draw!', youWon: 'YOU WIN!',
    fell: 'You fell in! 🌊', watching: 'Spectating', nextRound: 'You join next round',
    alive: 'Alive', connecting: 'Connecting…', waking: 'Server is waking up, up to a minute…',
    noServer: 'Server unavailable. Try later or play vs bots.', noRoom: 'Room not found', full: 'Room is full',
    lost: 'Connection lost', old: 'A new version is out — updating…', room: 'Room', copied: 'Code copied!',
    online_n: (n) => `Online now: ${n}`, enterCode: 'Enter a 4-letter code', youTag: 'you', matchEnd: 'Match results', newMatchIn: 'New match in',
    lobbyTitle: 'Waiting room', lobbyWait: 'Waiting for friends… need at least 2 players', lobbyAuto: (n) => `Match starts in ${n}…`,
    lobbyAutoWait: 'Looking for opponents…', lobbyReady: 'Everyone ready? Hit START!', lobbyWaitHost: 'Waiting for the host to start', start: 'START',
    rounds: 'Rounds', bots: 'Bots', chaos: 'Chaos', share: 'Invite friends', hintLobby: 'While waiting, practice: dash, bump, emotes!',
    tabc: 'Color', tabp: 'Pattern', tabh: 'Hat', tabe: 'Eyewear', tabt: 'Trail', notEnough: 'Not enough coins 🪙', bought: 'Purchased!',
    achUnlocked: 'Achievement', daily: 'Daily gift', windWarn: '💨 Wind!', earned: 'Earned', levelUp: 'Level up', level: 'Lv.',
    updating: 'Updating…', joinRoomHint: 'Press “Join” to enter your friends’ room',
    pk: ['Power!', 'Freeze!', 'Shockwave!', 'Shield!'], dashHint: '', needTwo: 'Need at least 2 players (or enable bots)',
  },
};
let lang = ls.get('lang', null);
if (!lang) { const l = (navigator.language || 'ru').slice(0, 2).toLowerCase(); lang = ['ru', 'uk', 'be', 'kk', 'uz', 'tg', 'hy', 'az', 'ky'].includes(l) ? 'ru' : 'en'; }
const T = (k, ...a) => { const v = (L[lang] && L[lang][k]) ?? L.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((el) => { el.innerHTML = T(el.dataset.t); });
  document.querySelectorAll('[data-ph]').forEach((el) => { el.placeholder = T(el.dataset.ph); });
  $('bLang').textContent = lang.toUpperCase();
  document.title = T('title');
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMOJI = ['😂', '😡', '👍', '🐟', '😎', '🥶', '💀', '❤️'];
const PK = [{ e: '🐟', c: '255,200,60' }, { e: '❄️', c: '120,220,255' }, { e: '💥', c: '255,130,60' }, { e: '🛡️', c: '120,255,170' }];

/* ================= Яндекс Игры SDK (безопасно, если его нет) ================= */
const Y = { sdk: null, player: null, inAd: false };
function initYandex() {
  if (typeof YaGames === 'undefined') return Promise.resolve();
  return YaGames.init().then((sdk) => {
    Y.sdk = sdk;
    try { const l = sdk.environment.i18n.lang; if (ls.get('lang', null) === null) lang = ['ru', 'be', 'kk', 'uk', 'uz', 'hy', 'az', 'ky', 'tg'].includes(l) ? 'ru' : 'en'; } catch (e) {}
    try { sdk.on && sdk.on('game_api_pause', () => setPaused(true)); sdk.on && sdk.on('game_api_resume', () => setPaused(false)); } catch (e) {}
    return sdk.getPlayer({ scopes: false }).then((p) => { Y.player = p; }).catch(() => {});
  }).catch(() => {});
}
function yReady() { try { Y.sdk && Y.sdk.features.LoadingAPI && Y.sdk.features.LoadingAPI.ready(); } catch (e) {} }
function yPlay(on) { try { const g = Y.sdk && Y.sdk.features.GameplayAPI; if (g) on ? g.start() : g.stop(); } catch (e) {} }
function yAd(cb) {
  if (!Y.sdk || !Y.sdk.adv) return cb();
  let done = false; const fin = () => { if (done) return; done = true; Y.inAd = false; GA.setHardMute(paused); cb(); };
  try { Y.inAd = true; GA.setHardMute(true); Y.sdk.adv.showFullscreenAdv({ callbacks: { onClose: fin, onError: fin } }); setTimeout(fin, 60000); } catch (e) { fin(); }
}
function yLeaderboard(wins) {
  try {
    if (!Y.sdk || !Y.sdk.getLeaderboards || !Y.player || (Y.player.getMode && Y.player.getMode() === 'lite')) return;
    Y.sdk.getLeaderboards().then((lb) => lb.setLeaderboardScore('wins', wins)).catch(() => {});
  } catch (e) {}
}

/* ================= состояние ================= */
let mode = 'menu'; // menu | offline | online
let paused = false;
let game = null, demo = null;
let myId = 0, roomCode = '', roomPub = false, hostId = 0;
let roster = new Map();
let cfg = { rounds: 5, bots: 0, chaos: 0 };
let V = null;
let acc = 0, lastT = 0;
let roundsPlayed = 0, connectSeq = 0;
const anim = new Map();   // id -> {face, phase, trail}
const emotes = new Map();
let goFlash = 0, windFlash = 0, lastCountNum = 0;
let finalShown = false, matchEarn = 0, rKo = 0, camPunch = 0, flash = 0, shake = 0;
let pendingReload = false;

function setPaused(p) { paused = p; GA.setHardMute(p || Y.inAd); if (!p) lastT = performance.now(); }
document.addEventListener('visibilitychange', () => setPaused(document.hidden));

const lookNow = () => Object.assign({}, P.look);

/* ================= сеть ================= */
const net = { ws: null, snaps: [], me: null, ping: 0, lastSent: 0, lastIn: '', timer: null, pingTimer: null };

function serverBase() {
  const q = new URLSearchParams(location.search).get('server');
  let u = q || (window.GAME_CONFIG && window.GAME_CONFIG.SERVER_URL) || '';
  if (!u) {
    if (location.protocol === 'file:') return '';
    if (/yandex\.(net|ru|com)$/.test(location.hostname)) return '';
    u = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  }
  return u.replace(/\/+$/, '');
}
const httpBase = (u) => u.replace(/^ws/, 'http');

function fetchOnline() {
  const base = serverBase(); const el = $('online');
  if (!base) { el.textContent = ''; return; }
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
  fetch(httpBase(base) + '/stats', { signal: ctl.signal, cache: 'no-store' }).then((r) => r.json()).then((j) => {
    el.textContent = T('online_n', j.players);
  }).catch(() => { el.textContent = ''; }).finally(() => clearTimeout(to));
}

function showMsg(t) { $('msg').textContent = t || ''; }

function connect(joinMode, code) {
  const base = serverBase();
  if (!base) { showMsg(T('noServer')); return; }
  GA.init();
  const seq = ++connectSeq;
  const deadline = Date.now() + 75000; // бесплатные хостинги «просыпаются» до минуты
  const t0 = Date.now();
  showMsg(T('connecting'));
  const stale = () => seq !== connectSeq || mode !== 'menu';
  const giveUp = (txt) => { if (seq === connectSeq && mode === 'menu') showMsg(txt || T('noServer')); };

  function attempt() {
    if (stale()) return;
    let ws;
    try { ws = new WebSocket(base); } catch (e) { return giveUp(); }
    net.ws = ws; net.snaps = []; net.me = null;
    let joined = false, done = false;
    const retry = () => {
      if (done) return; done = true; clearTimeout(to);
      try { ws.close(); } catch (e) {}
      if (net.ws === ws) net.ws = null;
      if (stale()) return;
      if (Date.now() < deadline) { showMsg(Date.now() - t0 > 4000 ? T('waking') : T('connecting')); setTimeout(attempt, 2500); }
      else giveUp();
    };
    const to = setTimeout(() => { if (!joined) retry(); }, 9000);

    ws.onopen = () => ws.send(JSON.stringify({ t: 'join', v: C.PROTO, mode: joinMode, code, name: P.name || 'Penguin', look: lookNow() }));
    ws.onerror = () => { if (!joined) retry(); };
    ws.onclose = () => {
      clearTimeout(to);
      if (!joined) { retry(); return; }
      if (net.ws === ws) { net.ws = null; leaveToMenu(); showMsg(T('lost')); }
    };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      switch (m.t) {
        case 'joined':
          if (stale()) { try { ws.close(); } catch (e) {} return; }
          joined = true; done = true; clearTimeout(to); myId = m.id; roomCode = m.code; roomPub = !!m.pub; startPlay('online'); break;
        case 'err':
          done = true; clearTimeout(to); try { ws.close(); } catch (e) {} if (net.ws === ws) net.ws = null;
          if (m.e === 'old') { showMsg(T('old')); setTimeout(hardReload, 1200); } else giveUp(m.e === 'full' ? T('full') : T('noRoom'));
          break;
        case 'info': if (m.e === 'need2') toast(T('needTwo')); break;
        case 'r': onRoster(m); break;
        case 's': onSnapshot(m); break;
        case 'em': emotes.set(m.id, { e: m.e, until: performance.now() + 2200 }); GA.play('emote'); break;
        case 'pong': net.ping = Math.round(Date.now() - m.ts); break;
      }
    };
  }
  attempt();
}

function onRoster(m) {
  const prev = roster.size;
  roster = new Map(m.list.map((r) => [r[0], { name: r[1], look: { c: r[2], p: r[3], h: r[4], e: r[5], t: r[6] }, bot: !!r[7] }]));
  hostId = m.host; cfg = { rounds: m.cfg[0], bots: m.cfg[1], chaos: m.cfg[2] }; roomPub = !!m.pub;
  if (roster.size > prev && prev > 0 && V && V.phase === 4) GA.play('join');
  lobbySig = '';
}

function onSnapshot(m) {
  m.at = performance.now();
  const map = new Map();
  for (const a of m.p) map.set(a[0], { id: a[0], x: a[1], y: a[2], vx: a[3], vy: a[4], alive: !!(a[5] & 1), dash: !!(a[5] & 2), boost: !!(a[5] & 4), spec: !!(a[5] & 8), frozen: !!(a[5] & 16), shield: !!(a[5] & 32), cd: a[6] / 100, score: a[7], fall: a[8] / 100 });
  m.map = map;
  net.snaps.push(m); if (net.snaps.length > 30) net.snaps.shift();
  handleEvents(m.e, map);
  const s = map.get(myId);
  if (s) {
    const me = net.me;
    if (!me || m.ph === 0 || !s.alive || Math.hypot(me.x - s.x, me.y - s.y) > 140) net.me = { x: s.x, y: s.y, vx: s.vx, vy: s.vy, cdUntil: 0 };
    net.me.srv = s; net.me.srvAt = m.at;
    net.me.cdUntil = performance.now() + s.cd * C.DASH_CD * 1000;
  }
}

function sendIn(force, dash) {
  const ws = net.ws; if (!ws || ws.readyState !== 1) return;
  const now = performance.now();
  const iv = getInputVec();
  const x = Math.round(iv.x * 100) / 100, y = Math.round(iv.y * 100) / 100;
  const key = x + ',' + y;
  if (dash || (key !== net.lastIn && now - net.lastSent > 45) || now - net.lastSent > 250 || force) {
    ws.send(JSON.stringify({ t: 'in', x, y, d: dash ? 1 : 0 }));
    net.lastIn = key; net.lastSent = now;
  }
}
const wsSend = (o) => { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(o)); };

/* ================= ввод ================= */
const keys = new Set();
const joy = { id: -1, active: false, bx: 0, by: 0, x: 0, y: 0, kx: 0, ky: 0 };
let dashQueued = false;
const cv = $('c'); const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

function getInputVec() {
  let x = 0, y = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
  if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m }; }
  if (joy.active) return { x: joy.x, y: joy.y };
  return { x: 0, y: 0 };
}
window.addEventListener('keydown', (e) => {
  if (mode === 'menu') return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (!e.repeat) doDash(); }
  else if (/^Digit[1-8]$/.test(e.code)) sendEmote(+e.code.slice(5) - 1);
  else keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('contextmenu', (e) => e.preventDefault());

cv.addEventListener('pointerdown', (e) => {
  if (mode === 'menu') return;
  GA.init();
  if (joy.id !== -1) return;
  joy.id = e.pointerId; joy.active = true; joy.bx = e.clientX; joy.by = e.clientY; joy.x = joy.y = 0; joy.kx = e.clientX; joy.ky = e.clientY;
  try { cv.setPointerCapture(e.pointerId); } catch (er) {}
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  const R = 56; let dx = e.clientX - joy.bx, dy = e.clientY - joy.by; const m = Math.hypot(dx, dy);
  if (m > R) { joy.bx += (dx / m) * (m - R); joy.by += (dy / m) * (m - R); dx = (dx / m) * R; dy = (dy / m) * R; }
  joy.x = dx / R; joy.y = dy / R; joy.kx = joy.bx + dx; joy.ky = joy.by + dy;
});
const endJoy = (e) => { if (e.pointerId === joy.id) { joy.id = -1; joy.active = false; joy.x = joy.y = 0; } };
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);

function doDash() {
  if (mode === 'menu') return;
  GA.init();
  if (mode === 'online') {
    const me = net.me;
    if (me && performance.now() >= me.cdUntil && V && (V.phase === 1 || V.phase === 4)) {
      const iv = getInputVec(); let dx = iv.x, dy = iv.y; const m = Math.hypot(dx, dy);
      if (m < 0.2) { const sp = Math.hypot(me.vx, me.vy); if (sp > 30) { dx = me.vx / sp; dy = me.vy / sp; } else { dx = 0; dy = 0; } }
      me.vx += dx * C.DASH_V; me.vy += dy * C.DASH_V; me.cdUntil = performance.now() + C.DASH_CD * 1000;
    }
    sendIn(true, true);
  } else dashQueued = true;
}
$('dash').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doDash(); });

function sendEmote(i) {
  if (mode === 'online') wsSend({ t: 'em', e: i });
  else { emotes.set(myId, { e: i, until: performance.now() + 2200 }); GA.play('emote'); }
}
$('emobtns').innerHTML = EMOJI.map((e, i) => `<button data-e="${i}">${e}</button>`).join('');
$('bEmo').addEventListener('click', () => $('emobtns').classList.toggle('hide'));
$('emobtns').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { sendEmote(+b.dataset.e); $('emobtns').classList.add('hide'); } });

/* ================= тосты ================= */
function toast(html) {
  const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = html; $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 3700);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
}
Pro.onAch = (a) => { toast(`🏆 ${T('achUnlocked')}: <b>${lang === 'ru' ? a.ru : a.en}</b> +${a.rew} 🪙`); GA.play('ach'); refreshProfileUI(); };

/* ================= частицы ================= */
const parts = [];
function addP(o) { o.max = o.life; parts.push(o); }
function puff(x, y, n, spd, col, r) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.3 + Math.random()); addP({ type: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, r: (r || 3) + Math.random() * 5, col: col || '#fff' }); } }
function sparks(x, y, n, spd) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random()); addP({ type: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, r: 4 + Math.random() * 4, col: '#fff3a6', rot: Math.random() * 6 }); } }
function ring(x, y, col, gr, life) { addP({ type: 'ring', x, y, vx: 0, vy: 0, life: life || 0.7, r: 10, gr: gr || 70, col: col || '#fff' }); }
function popup(x, y, txt, col) { addP({ type: 'text', x, y, vx: 0, vy: -50, life: 1.2, txt, col: col || '#fff' }); }
function findP(id) { return V && V.players.find((p) => p.id === id); }
const nameOf = (id) => { const p = findP(id); if (p) return p.name; const r = roster.get(id); return r ? r.name : '?'; };
const colOf = (id) => { const p = findP(id); return p ? Cos.color(p.look.c) : '#fff'; };

/* ================= события ================= */
function feed(html) {
  const f = $('killfeed'); const d = document.createElement('div'); d.innerHTML = html; f.appendChild(d);
  setTimeout(() => d.remove(), 4600); while (f.children.length > 4) f.firstChild.remove();
}
function vibe(ms) { try { if (P.opts.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

function handleEvents(evs) {
  const tracking = (mode === 'online' || mode === 'offline');
  for (const e of evs) {
    switch (e[0]) {
      case 'hit': {
        sparks(e[1], e[2], 4 + Math.round(e[3] * 6), 200 + e[3] * 260); puff(e[1], e[2], 6 + Math.round(e[3] * 8), 140 + e[3] * 240);
        GA.play('hit', e[3]);
        if (e[4] === myId || e[5] === myId) { shake = Math.max(shake, 6 + e[3] * 12); vibe(20 + e[3] * 40); } else shake = Math.max(shake, e[3] * 5);
        break;
      }
      case 'dash': { GA.play('dash'); const p = findP(e[1]); if (p) { puff(p.x, p.y, 6, 120); const a = anim.get(e[1]); if (a) addP({ type: 'scratch', x: p.x, y: p.y, vx: 0, vy: 0, life: 1.8, ang: a.face, col: '#a8c8e2' }); } if (e[1] === myId && tracking) Pro.stat('dashes'); break; }
      case 'ko': {
        GA.play('ko'); const p = findP(e[1]);
        if (p) { ring(p.x, p.y, '#fff'); puff(p.x, p.y, 14, 200, '#bfe6fa'); }
        feed(e[2] ? `<span style="color:${colOf(e[2])}">${esc(nameOf(e[2]))}</span> 💥 <span style="color:${colOf(e[1])}">${esc(nameOf(e[1]))}</span>` : `<span style="color:${colOf(e[1])}">${esc(nameOf(e[1]))}</span> 🌊`);
        if (e[1] === myId) { GA.play('lose'); flash = 0.35; camPunch = 0.05; if (tracking) Pro.stat('falls'); }
        if (e[2] === myId && tracking) {
          rKo++; Pro.stat('ko'); Pro.statMax('bestKoRound', rKo); Pro.earn(8); matchEarn += 8; refreshProfileUI();
          if (p) popup(p.x, p.y - 20, '+8 🪙', '#ffe08a'); GA.play('coin'); shake = Math.max(shake, 10); camPunch = 0.06;
        }
        break;
      }
      case 'splash': ring(e[1], e[2], '#bfe6fa', 90); puff(e[1], e[2], 10, 160, '#8fd0f5'); GA.play('splash'); break;
      case 'pick': {
        const k = e[4] | 0; GA.play(['pick', 'freeze', 'shock', 'shield'][k] === 'pick' ? 'pick' : 'pick'); puff(e[2], e[3], 12, 160, `rgb(${PK[k].c})`);
        const p = findP(e[1]); if (p) popup(p.x, p.y - 40, T('pk')[k], '#fff');
        if (e[1] === myId && tracking) Pro.stat('picks');
        break;
      }
      case 'freeze': ring(e[1], e[2], '#9fe6ff', 300, 0.9); for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, s = 100 + Math.random() * 220; addP({ type: 'star', x: e[1], y: e[2], vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8, r: 6, col: '#c8f3ff', rot: Math.random() * 6 }); } GA.play('freeze'); shake = Math.max(shake, 6); break;
      case 'shock': ring(e[1], e[2], '#ffae5c', 330, 0.7); ring(e[1], e[2], '#fff', 220, 0.5); GA.play('shock'); shake = Math.max(shake, 14); camPunch = 0.05; break;
      case 'wind': windFlash = performance.now() + 1700; GA.play('wind'); break;
      case 'go': GA.play('go'); goFlash = performance.now() + 900; rKo = 0; break;
      case 'start': matchEarn = 0; finalShown = false; rKo = 0; break;
      case 'lobby': finalShown = false; break;
      case 'win': {
        GA.play(e[1] === myId ? 'win' : 'tick'); roundsPlayed++;
        const me = findP(myId);
        if (me && !me.spec && tracking) { Pro.earn(5); matchEarn += 5; }
        if (e[1] === myId && tracking) { Pro.stat('roundWins'); Pro.earn(25); matchEarn += 25; popup(me.x, me.y - 30, '+25 🪙', '#ffe08a'); }
        refreshProfileUI();
        break;
      }
    }
  }
}

/* ================= жизненный цикл ================= */
function showScreen(id) {
  for (const s of ['menu', 'wardrobe', 'achs', 'settings']) $(s).classList.toggle('hide', s !== id);
}

function startPlay(m) {
  mode = m; showMsg('');
  showScreen(null); $('hud').classList.remove('hide');
  anim.clear(); emotes.clear(); parts.length = 0; V = null; acc = 0; lastT = performance.now(); finalShown = false; matchEarn = 0; rKo = 0;
  $('killfeed').innerHTML = ''; lobbySig = '';
  $('roomline').innerHTML = '';
  if (m === 'online') {
    $('roomline').innerHTML = `${T('room')}: <span id="roomcode">${roomCode}</span> <span id="pingv"></span>`;
    $('roomcode').addEventListener('click', shareRoom);
    net.pingTimer = setInterval(() => wsSend({ t: 'ping', ts: Date.now() }), 2000);
    net.timer = setInterval(() => sendIn(false, false), 50);
  }
  $('hint').textContent = '';
  yPlay(true);
}

function shareRoom() {
  const url = location.protocol.startsWith('http') && !/yandex/.test(location.hostname) ? `${location.origin}${location.pathname}?room=${roomCode}` : '';
  const txt = `${T('title')} — ${T('room')}: ${roomCode}`;
  let done = false;
  try { if (navigator.share) { navigator.share({ title: T('title'), text: txt, url: url || undefined }).catch(() => {}); done = true; } } catch (e) {}
  if (!done) { try { navigator.clipboard.writeText(url || roomCode); toast(T('copied')); } catch (e) {} }
}

function startOffline() {
  GA.init();
  game = new Game({ lobby: false });
  const p = game.addPlayer(P.name || 'Penguin', lookNow(), false);
  myId = p.id; roster = new Map(); game.startMatch();
  startPlay('offline');
}

function leaveToMenu() {
  const hadRounds = roundsPlayed >= 2;
  clearInterval(net.timer); clearInterval(net.pingTimer);
  if (net.ws) { const w = net.ws; net.ws = null; try { w.close(); } catch (e) {} }
  mode = 'menu'; game = null; V = null; keys.clear(); joy.active = false; joy.id = -1; myId = 0;
  $('hud').classList.add('hide'); showScreen('menu'); $('emobtns').classList.add('hide');
  $('final').classList.add('hide'); $('lobby').classList.add('hide');
  yPlay(false); fetchOnline(); refreshProfileUI(); GA.setIntensity(0);
  if (pendingReload) { location.reload(); return; }
  if (hadRounds) { roundsPlayed = 0; yAd(() => {}); }
}
$('bExit').addEventListener('click', () => { GA.play('click'); leaveToMenu(); });

/* ================= представление мира ================= */
function infoOf(id) {
  if (mode === 'offline' && game) { const p = game.players.find((q) => q.id === id); if (p) return { name: p.name, look: p.look, bot: p.bot }; }
  return roster.get(id) || { name: '…', look: { c: 4, p: 0, h: 0, e: 0, t: 0 } };
}
function viewFromGame(g, infoFn) {
  return {
    phase: { count: 0, play: 1, over: 2, final: 3, lobby: 4 }[g.phase], tm: g.phase === 'lobby' ? g.autoT : g.timer, el: g.elapsed, R: g.R, winner: g.winner, round: g.round, rs: g.cfg.rounds,
    wind: g.windState ? [g.windA, g.windState] : null,
    players: g.players.map((p) => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, alive: p.alive, dash: p.dash > 0, boost: p.boost > 0, frozen: p.frozen > 0, shield: p.shield > 0, spec: p.spec, cd: Math.max(0, p.cd) / C.DASH_CD, score: p.score, fall: p.fall, ...infoFn(p.id) })),
    fish: g.pickups.map((f) => ({ id: f.id, x: f.x, y: f.y, kind: f.kind })),
  };
}

function buildOnline(now, dt) {
  const sn = net.snaps; if (!sn.length) return null;
  const last = sn[sn.length - 1];
  const rt = now - 110;
  let a = sn[0], b = sn[0];
  for (let i = sn.length - 1; i >= 0; i--) { if (sn[i].at <= rt) { a = sn[i]; b = sn[Math.min(i + 1, sn.length - 1)]; break; } a = sn[i]; b = sn[i]; }
  let k = 0; if (b !== a && b.at > a.at) k = Math.min(1, Math.max(0, (rt - a.at) / (b.at - a.at)));
  const over = rt > last.at ? Math.min(0.15, (rt - last.at) / 1000) : 0;
  const players = [];
  for (const [id, pb] of last.map) {
    const pa = a.map.get(id) || pb, pb2 = b.map.get(id) || pb;
    let x, y;
    if (over > 0) { x = pb.x + pb.vx * over; y = pb.y + pb.vy * over; }
    else { x = pa.x + (pb2.x - pa.x) * k; y = pa.y + (pb2.y - pa.y) * k; }
    players.push({ id, x, y, vx: pb.vx, vy: pb.vy, alive: pb.alive, dash: pb.dash, boost: pb.boost, frozen: pb.frozen, shield: pb.shield, spec: pb.spec, cd: pb.cd, score: pb.score, fall: pb.fall, ...infoOf(id) });
  }
  const me = net.me, mp = players.find((p) => p.id === myId);
  if (me && mp && (last.ph === 1 || last.ph === 4) && mp.alive) {
    const iv = mp.frozen ? { x: 0, y: 0 } : getInputVec();
    const acc2 = C.ACC * (mp.boost ? 1.15 : 1);
    me.vx += iv.x * acc2 * dt; me.vy += iv.y * acc2 * dt;
    const f = Math.exp(-C.FRIC * dt); me.vx *= f; me.vy *= f; me.x += me.vx * dt; me.y += me.vy * dt;
    if (me.srv) {
      const age = Math.min(0.25, (now - me.srvAt) / 1000);
      const tx = me.srv.x + me.srv.vx * age, ty = me.srv.y + me.srv.vy * age;
      const kk = Math.min(1, dt * 9);
      me.x += (tx - me.x) * kk; me.y += (ty - me.y) * kk;
      const kv = Math.min(1, dt * 5);
      me.vx += (me.srv.vx - me.vx) * kv; me.vy += (me.srv.vy - me.vy) * kv;
    }
    mp.x = me.x; mp.y = me.y; mp.vx = me.vx; mp.vy = me.vy;
    mp.cd = Math.max(0, (me.cdUntil - now) / (C.DASH_CD * 1000));
  } else if (me && mp) { me.x = mp.x; me.y = mp.y; me.vx = mp.vx; me.vy = mp.vy; }
  return { phase: last.ph, tm: last.tm, el: last.el, R: last.R, winner: last.w, round: last.rd, rs: last.rs, wind: last.wd ? [last.wd[0], last.wd[1]] : null, players, fish: last.f.map((f) => ({ id: f[0], x: f[1], y: f[2], kind: f[3] })) };
}

/* ================= рендер ================= */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
window.addEventListener('resize', resize); resize();

const THEMES = [
  { water: ['#38b6ee', '#1a7bb8', '#0b3d6b'], ice: ['#ffffff', '#dff4ff', '#b4e2fb'], rim: '#9fd8f5', snow: 46, wind: 0, kind: 'day' },
  { water: ['#ffa86e', '#c4507c', '#3a2a6b'], ice: ['#fff7ef', '#ffe4e2', '#e6c2da'], rim: '#f1bfd3', snow: 30, wind: 0, kind: 'sunset' },
  { water: ['#1c3d70', '#0e2550', '#050b20'], ice: ['#f0f8ff', '#cfe6fc', '#9fc4ec'], rim: '#8db5e0', snow: 40, wind: 0, kind: 'night' },
  { water: ['#6f9bb0', '#3a5f74', '#1a2f3d'], ice: ['#f5fafd', '#d8e7ef', '#acc6d5'], rim: '#a5c1d1', snow: 130, wind: 90, kind: 'storm' },
];
const rng = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const cracks = []; for (let i = 0; i < 16; i++) { const a = rng() * 6.28, pts = []; let d = 0.1 + rng() * 0.3, aa = a; for (let j = 0; j < 5; j++) { pts.push([Math.cos(aa) * d, Math.sin(aa) * d]); d += 0.1 + rng() * 0.12; aa += (rng() - 0.5) * 0.5; } cracks.push(pts); }
const flakes = []; for (let i = 0; i < 130; i++) flakes.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random(), r: 1 + Math.random() * 2.4 });
const stars = []; for (let i = 0; i < 90; i++) stars.push({ x: Math.random(), y: Math.random() * 0.7, r: 0.5 + Math.random() * 1.4, p: Math.random() * 6 });
const sparkle = []; for (let i = 0; i < 60; i++) { const a = rng() * 6.28, r = Math.sqrt(rng()); sparkle.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, p: rng() * 6 }); }
const bergs = []; for (let i = 0; i < 8; i++) { const pts = []; const n = 7; for (let j = 0; j < n; j++) pts.push([Math.cos((j / n) * TAU), Math.sin((j / n) * TAU), 0.7 + rng() * 0.5]); bergs.push({ a: (i / 8) * TAU + rng() * 0.5, d: 150 + rng() * 120, s: 32 + rng() * 46, p: rng() * 6, pts }); }
const bubbles = []; for (let i = 0; i < 24; i++) bubbles.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, s: 0.01 + Math.random() * 0.03 });

function themeNow() {
  if (!V || V.phase === 4 || V.round < 1) return THEMES[0];
  return THEMES[(V.round - 1) % 4];
}

function drawSky(t, th) {
  const wg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, Math.max(W, H) * 0.78);
  wg.addColorStop(0, th.water[0]); wg.addColorStop(0.55, th.water[1]); wg.addColorStop(1, th.water[2]);
  ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);
  if (th.kind === 'sunset') {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.08, 10, W * 0.5, H * 0.08, Math.max(W, H) * 0.55);
    g.addColorStop(0, 'rgba(255,230,150,.75)'); g.addColorStop(0.3, 'rgba(255,150,110,.35)'); g.addColorStop(1, 'rgba(255,120,100,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (th.kind === 'night') {
    for (const s of stars) { ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 1.6 + s.p); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      const col = k === 1 ? '190,120,255' : '80,255,170';
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.55); g.addColorStop(0, `rgba(${col},.0)`); g.addColorStop(0.45, `rgba(${col},.2)`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * (0.1 + 0.07 * k) + Math.sin(x * 0.006 + t * 0.5 + k * 2) * H * 0.07 + Math.sin(x * 0.015 + t * 0.9) * 10);
      ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
    }
  }
  // волны
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    ctx.strokeStyle = `rgba(255,255,255,${th.kind === 'night' ? 0.05 : 0.08})`; ctx.beginPath();
    const by = (H * (k + 0.5)) / 7;
    for (let x = 0; x <= W + 20; x += 24) { const y = by + Math.sin(x * 0.012 + t * (0.8 + k * 0.1) + k) * 7; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  // пузырьки
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  for (const b of bubbles) { b.y -= b.s * 0.016; if (b.y < -0.02) { b.y = 1.02; b.x = Math.random(); } ctx.beginPath(); ctx.arc(b.x * W + Math.sin(t + b.x * 9) * 6, b.y * H, b.r, 0, TAU); ctx.fill(); }
}

function drawFarIce(t, th) {
  for (const b of bergs) {
    const r = C.R0 + b.d + 40, x = Math.cos(b.a) * r, y = Math.sin(b.a) * r + Math.sin(t * 0.7 + b.p) * 5;
    ctx.save(); ctx.translate(x, y); ctx.scale(b.s, b.s);
    ctx.fillStyle = 'rgba(0,30,70,.25)'; ctx.beginPath(); ctx.ellipse(0.12, 0.2, 1.1, 0.9, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); b.pts.forEach((q, i) => { const px = q[0] * q[2], py = q[1] * q[2]; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
    const g = ctx.createLinearGradient(-1, -1, 1, 1); g.addColorStop(0, th.ice[0]); g.addColorStop(1, th.ice[2]); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 0.06; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke(); ctx.restore();
  }
}

function drawFloe(R, t, th, shrinking) {
  const R0 = C.R0;
  // рябь
  ctx.lineWidth = 3.5;
  for (let i = 0; i < 4; i++) { const ph = ((t * 0.12 + i / 4) % 1), r = R + 20 + ph * 260; ctx.strokeStyle = `rgba(255,255,255,${0.2 * (1 - ph)})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
  // тень и толщина льда
  ctx.fillStyle = 'rgba(0,30,70,.35)'; ctx.beginPath(); ctx.arc(6, 16, R + 12, 0, TAU); ctx.fill();
  ctx.fillStyle = th.rim; ctx.beginPath(); ctx.arc(0, 8, R + 9, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(0, 0, R + 9, 0, TAU); ctx.fill();
  // «прибой» у края
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
  for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(0, 0, R + 14 + k * 8 + Math.sin(t * 2 + k) * 2.5, 0, TAU); ctx.stroke(); }
  const ig = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R);
  ig.addColorStop(0, th.ice[0]); ig.addColorStop(0.6, th.ice[1]); ig.addColorStop(1, th.ice[2]);
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(120,180,220,.5)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  for (const c of cracks) { ctx.beginPath(); c.forEach((q, i) => i ? ctx.lineTo(q[0] * R0, q[1] * R0) : ctx.moveTo(q[0] * R0, q[1] * R0)); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(150,200,235,.35)'; for (const f of [0.35, 0.68]) { ctx.beginPath(); ctx.arc(0, 0, R0 * f, 0, TAU); ctx.stroke(); }
  // иней по краю
  const fg = ctx.createRadialGradient(0, 0, Math.max(1, R - 38), 0, 0, R); fg.addColorStop(0, 'rgba(170,220,250,0)'); fg.addColorStop(1, 'rgba(150,210,245,.55)');
  ctx.fillStyle = fg; ctx.fillRect(-R, -R, R * 2, R * 2);
  // искорки
  for (let i = 0; i < sparkle.length; i++) {
    const s = sparkle[i]; if (Math.hypot(s.x, s.y) * R0 > R - 6) continue;
    const a = 0.5 + 0.5 * Math.sin(t * 2.2 + s.p); if (a < 0.7) continue;
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.6; const x = s.x * R0, y = s.y * R0, l = 3 + a * 4;
    ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y); ctx.moveTo(x, y - l); ctx.lineTo(x, y + l); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = shrinking ? `rgba(255,90,90,${0.55 + 0.35 * Math.sin(t * 6)})` : 'rgba(255,255,255,.92)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
}

function spawnTrails(p, a, dt) {
  const tr = p.look.t | 0; if (!tr || !p.alive) return;
  const sp = Math.hypot(p.vx, p.vy); if (sp < 130) return;
  a.trail = (a.trail || 0) + dt; if (a.trail < 0.04) return; a.trail = 0;
  const bx = p.x - Math.cos(a.face) * 20, by = p.y - Math.sin(a.face) * 20;
  if (tr === 1) addP({ type: 'dot', x: bx, y: by, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.6, r: 5 + Math.random() * 4, col: '#fff' });
  else if (tr === 2) addP({ type: 'heart', x: bx, y: by, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 0.9, r: 7 + Math.random() * 3, col: '#ff5fa0' });
  else if (tr === 3) addP({ type: 'star', x: bx, y: by, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.8, r: 7, col: '#ffe35a', rot: Math.random() * 6 });
  else if (tr === 4) addP({ type: 'fire', x: bx, y: by, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.45, r: 10 + Math.random() * 4, col: Math.random() < 0.5 ? '#ff8a1c' : '#ff4a1c' });
  else if (tr === 5) addP({ type: 'dot', x: bx, y: by, vx: 0, vy: 0, life: 0.7, r: 8, col: `hsl(${(performance.now() / 4) % 360},95%,60%)` });
}

function drawParticles(dt, now) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
    const a = q.life / q.max;
    switch (q.type) {
      case 'ring': { const rr = q.r + (1 - a) * q.gr; ctx.strokeStyle = q.col; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 5 * a + 1; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break; }
      case 'text': { q.y += q.vy * dt; ctx.globalAlpha = Math.min(1, a * 2); ctx.font = 'bold 26px "Trebuchet MS",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,30,60,.85)'; ctx.fillStyle = q.col; ctx.strokeText(q.txt, q.x, q.y); ctx.fillText(q.txt, q.x, q.y); ctx.globalAlpha = 1; break; }
      case 'scratch': { ctx.strokeStyle = q.col; ctx.globalAlpha = a * 0.5; ctx.lineWidth = 3; for (const o of [-8, 8]) { ctx.beginPath(); ctx.moveTo(q.x - Math.sin(q.ang) * o, q.y + Math.cos(q.ang) * o); ctx.lineTo(q.x - Math.cos(q.ang) * 90 - Math.sin(q.ang) * o, q.y - Math.sin(q.ang) * 90 + Math.cos(q.ang) * o); ctx.stroke(); } ctx.globalAlpha = 1; break; }
      case 'heart': q.x += q.vx * dt; q.y += q.vy * dt; ctx.fillStyle = q.col; ctx.globalAlpha = a; Cos.heart(ctx, q.x, q.y, q.r * (0.5 + a * 0.5)); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'star': q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; ctx.fillStyle = q.col; ctx.globalAlpha = a; Cos.star(ctx, q.x, q.y, q.r * (0.4 + a * 0.6), (q.rot || 0) + (1 - a) * 4); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'fire': q.x += q.vx * dt; q.y += q.vy * dt; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = q.col; ctx.globalAlpha = a * 0.9; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * a, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; break;
      case 'chunk': q.x += q.vx * dt; q.y += q.vy * dt; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot + (1 - a) * 2); ctx.globalAlpha = a; ctx.fillStyle = '#eaf7ff'; ctx.strokeStyle = '#9fd8f5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-q.r, -q.r * 0.6); ctx.lineTo(q.r, -q.r * 0.3); ctx.lineTo(q.r * 0.6, q.r * 0.7); ctx.lineTo(-q.r * 0.7, q.r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; break;
      default: q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.95; q.vy *= 0.95; ctx.fillStyle = q.col; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.4 + a * 0.6), 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
}

let fishT = 3;
function render(now, dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const t = now / 1000; const th = themeNow();
  drawSky(t, th);
  const R0 = C.R0, span = 2 * R0 + 100;
  const lobby = V && V.phase === 4;
  camPunch *= Math.pow(0.02, dt);
  const camS = Math.min(W / span, H / span) * (lobby ? 0.84 : 1) * (1 + camPunch);
  let ox = W / 2, oy = H / 2 + (lobby ? Math.min(H * 0.07, 56) : 0);
  if (shake > 0.2) { ox += (Math.random() - 0.5) * shake; oy += (Math.random() - 0.5) * shake; shake *= Math.pow(0.001, dt); }
  ctx.save(); ctx.translate(ox, oy); ctx.scale(camS, camS);

  drawFarIce(t, th);
  const R = V ? V.R : R0;
  const shrinking = V && V.phase === 1 && V.el > C.SHRINK_DELAY;
  drawFloe(R, t, th, shrinking);

  // отваливающиеся льдинки и прыгающая рыба
  if (shrinking && Math.random() < dt * 9) { const a = Math.random() * TAU; addP({ type: 'chunk', x: Math.cos(a) * (R + 4), y: Math.sin(a) * (R + 4), vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 1.4, r: 8 + Math.random() * 8, rot: Math.random() * 6 }); }
  fishT -= dt; if (fishT <= 0) { fishT = 4 + Math.random() * 5; const a = Math.random() * TAU, d = R0 + 70 + Math.random() * 90; ring(Math.cos(a) * d, Math.sin(a) * d, '#fff', 40, 0.6); addP({ type: 'fish', x: Math.cos(a) * d, y: Math.sin(a) * d, vx: Math.cos(a + 1.2) * 90, vy: Math.sin(a + 1.2) * 90, life: 1.1 }); }

  if (V) {
    for (const f of V.fish) {
      const bob = Math.sin(t * 4 + f.id) * 3, k = PK[f.kind || 0];
      ctx.save(); ctx.translate(f.x, f.y + bob);
      const g = ctx.createRadialGradient(0, 0, 6, 0, 0, 34); g.addColorStop(0, `rgba(${k.c},.65)`); g.addColorStop(1, `rgba(${k.c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
      ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(k.e, 0, 2); ctx.restore();
    }

    const list = V.players.filter((p) => !p.spec && p.fall < 1).sort((a, b) => a.y - b.y);
    for (const p of list) {
      let a = anim.get(p.id); if (!a) { a = { face: Math.atan2(-p.y, -p.x), phase: 0, trail: 0 }; anim.set(p.id, a); }
      const sp = Math.hypot(p.vx, p.vy);
      let target = a.face;
      if (p.id === myId && p.alive && !p.frozen) { const iv = getInputVec(); if (Math.hypot(iv.x, iv.y) > 0.15) target = Math.atan2(iv.y, iv.x); else if (sp > 50) target = Math.atan2(p.vy, p.vx); }
      else if (sp > 50 && !p.frozen) target = Math.atan2(p.vy, p.vx);
      let d = target - a.face; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      a.face += d * Math.min(1, dt * 14); a.phase += sp * dt * 0.06;
      spawnTrails(p, a, dt);
      if (p.dash && p.alive) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 5; for (const o of [-10, 0, 10]) { ctx.beginPath(); ctx.moveTo(p.x - Math.cos(a.face) * 22 - Math.sin(a.face) * o, p.y - Math.sin(a.face) * 22 + Math.cos(a.face) * o); ctx.lineTo(p.x - Math.cos(a.face) * 60 - Math.sin(a.face) * o, p.y - Math.sin(a.face) * 60 + Math.cos(a.face) * o); ctx.stroke(); } }
      const fall = p.fall, sc = p.alive ? 1 : Math.max(0.05, 1 - fall * 0.95), al = p.alive ? 1 : Math.max(0, 1 - fall * 0.9);
      Cos.drawPenguin(ctx, p.look, { x: p.x, y: p.y, s: (PR / 26) * sc, face: a.face, spin: p.alive ? 0 : fall * 5, alpha: al, t: now, id: p.id, dash: p.dash, boost: p.boost, shield: p.shield, frozen: p.frozen, speed: sp, phase: a.phase });
      if (p.alive && p.id === myId) {
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, PR + 9, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.cd)); ctx.stroke();
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 2; const bob = Math.sin(t * 6) * 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - PR - 22 + bob); ctx.lineTo(p.x - 9, p.y - PR - 36 + bob); ctx.lineTo(p.x + 9, p.y - PR - 36 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const nf = Math.max(17, 12 / camS);
    for (const p of list) {
      if (!p.alive) continue;
      ctx.font = `bold ${nf}px "Trebuchet MS",system-ui,sans-serif`; ctx.lineWidth = nf / 4; ctx.strokeStyle = 'rgba(5,30,60,.8)'; ctx.fillStyle = p.id === myId ? '#ffd23f' : '#fff';
      ctx.strokeText(p.name, p.x, p.y + PR + nf); ctx.fillText(p.name, p.x, p.y + PR + nf);
      const em = emotes.get(p.id);
      if (em && em.until > now) { const age = (em.until - now) / 2200; ctx.globalAlpha = Math.min(1, age * 3); ctx.font = `${Math.max(34, 24 / camS)}px serif`; ctx.fillText(EMOJI[em.e], p.x, p.y - PR - 28 - (1 - age) * 14); ctx.globalAlpha = 1; }
    }
  }
  // прыгающая рыба (частицы типа fish) рисуем отдельно
  for (const q of parts) if (q.type === 'fish') { const a = q.life / q.max; q.x += q.vx * dt; q.y += q.vy * dt; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.atan2(q.vy, q.vx)); const s = 0.6 + Math.sin((1 - a) * Math.PI) * 0.9; ctx.scale(s, s); ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🐟', 0, 0); ctx.restore(); }
  drawParticles(dt, now);
  ctx.restore();

  // снег
  const snowN = Math.min(flakes.length, th.snow);
  ctx.fillStyle = th.kind === 'sunset' ? 'rgba(255,240,230,.8)' : 'rgba(255,255,255,.78)';
  const windPush = V && V.wind && V.wind[1] === 2 ? 1 : 0;
  const wA = windPush ? V.wind[0] : 0;
  for (let i = 0; i < snowN; i++) {
    const f = flakes[i];
    f.y += dt * (0.03 + th.wind * 0.0008) * f.s; f.x += Math.sin(t + f.s * 9) * dt * 0.004 + (th.wind * 0.0006 + windPush * Math.cos(wA) * 0.25) * dt * f.s;
    if (windPush) f.y += Math.sin(wA) * 0.25 * dt * f.s;
    if (f.y > 1) { f.y = -0.02; f.x = Math.random(); } if (f.x > 1.02) f.x = -0.02; if (f.x < -0.02) f.x = 1.02;
    ctx.globalAlpha = 0.35 + f.s * 0.3; ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ветер: полосы
  if (V && V.wind) {
    const [wa, ws] = V.wind; ctx.strokeStyle = `rgba(255,255,255,${ws === 2 ? 0.45 : 0.18})`; ctx.lineWidth = 3;
    const n = ws === 2 ? 26 : 8;
    for (let i = 0; i < n; i++) { const k = ((t * (ws === 2 ? 1.6 : 0.4) + i * 0.137) % 1), px = ((i * 0.6180339) % 1) * W, py = ((i * 0.3819) % 1) * H; const dx = Math.cos(wa), dy = Math.sin(wa); const x = px + dx * k * 500 - 250 * dx, y = py + dy * k * 500 - 250 * dy; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 90, y + dy * 90); ctx.stroke(); }
    if (ws === 1) { ctx.save(); ctx.translate(W / 2, H * 0.2); ctx.rotate(wa); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(-10, -26); ctx.lineTo(-10, -9); ctx.lineTo(-40, -9); ctx.lineTo(-40, 9); ctx.lineTo(-10, 9); ctx.lineTo(-10, 26); ctx.closePath(); ctx.fill(); ctx.restore(); }
  }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.6); }
  if (mode !== 'menu' && joy.active) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(joy.bx, joy.by, 56, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.kx, joy.ky, 26, 0, TAU); ctx.fill();
  }
}

/* ================= HUD ================= */
let hudT = 0, lobbySig = '';
function updateHud(now) {
  if (!V) return;
  if (now - hudT < 90) return; hudT = now;
  const me = V.players.find((p) => p.id === myId);
  const lobby = V.phase === 4;
  const aliveN = V.players.filter((p) => p.alive).length, tot = V.players.filter((p) => !p.spec).length;
  $('alive').textContent = lobby ? '🧊 ' + T('lobbyTitle') : V.phase === 3 ? T('matchEnd') : `${T('alive')}: ${aliveN}/${tot}  ·  ${T('round')} ${Math.min(V.round, V.rs)}/${V.rs}${cfg.chaos && mode === 'online' ? ' 🌪' : ''}`;
  if (mode === 'online') { const pv = $('pingv'); if (pv) pv.textContent = `· ${net.ping}ms`; }
  $('score').classList.toggle('hide', lobby);
  if (!lobby) {
    const sorted = [...V.players].filter((p) => !p.spec || p.score).sort((a, b) => b.score - a.score).slice(0, 6);
    $('score').innerHTML = sorted.map((p) => `<div class="${p.id === myId ? 'me' : ''} ${!p.alive && V.phase === 1 && !p.spec ? 'dead' : ''}"><i style="background:${Cos.color(p.look.c)}"></i>${esc(p.name)}<b>${p.score}</b></div>`).join('');
  }
  const cd = me ? me.cd : 0; $('dash').style.setProperty('--p', `${Math.round((1 - cd) * 100)}%`); $('dash').classList.toggle('cd', cd > 0.02);

  let txt = '', sub = '';
  if (V.phase === 0) {
    const n = Math.ceil(V.tm - 0.2); txt = n > 0 ? String(n) : T('go'); sub = `${T('round')} ${V.round}/${V.rs}`;
    if (n !== lastCountNum && n > 0) { GA.play('tick'); lastCountNum = n; }
  } else if (V.phase === 1) {
    if (now < goFlash) txt = T('go');
    else if (me && me.spec) sub = T('nextRound');
    else if (me && !me.alive) sub = T('fell') + ' · ' + T('watching');
  } else if (V.phase === 2) {
    if (V.winner === myId) txt = T('youWon'); else if (V.winner) { const w = V.players.find((p) => p.id === V.winner); txt = '🏆 ' + (w ? esc(w.name) : ''); } else txt = T('draw');
  }
  const bn = $('banner'); const html = txt + (sub ? `<small>${sub}</small>` : '');
  bn.classList.toggle('subonly', !txt);
  if (bn.innerHTML !== html) bn.innerHTML = html;
  $('windmsg').textContent = V.wind && V.wind[1] === 1 ? T('windWarn') : '';
  GA.setIntensity(V.phase === 1);
  updateFinal(me); updateLobby();
}

function updateFinal(me) {
  const box = $('final');
  if (V.phase !== 3) { box.classList.add('hide'); return; }
  const list = V.players.filter((p) => !p.spec || p.score > 0).sort((a, b) => b.score - a.score);
  if (!finalShown) {
    finalShown = true;
    const top = list[0], iWon = top && top.id === myId && top.score > 0 && (!list[1] || list[1].score < top.score || true);
    const participated = me && !me.spec;
    if (participated) {
      Pro.stat('matches'); Pro.earn(20); matchEarn += 20;
      if (iWon) { Pro.stat('matchWins'); Pro.earn(60); matchEarn += 60; yLeaderboard(P.stats.matchWins); }
      if (mode === 'online' && !roomPub && [...roster.values()].filter((r) => !r.bot).length >= 2) Pro.stat('friendMatches');
      const lvl = Pro.level(); refreshProfileUI(); if (lvl > (finalShown.lvl || 0)) { /* уровень показываем на экране меню */ }
    }
    GA.play(iWon ? 'win' : 'lose'); if (iWon) flash = 0.3;
  }
  const medals = ['🥇', '🥈', '🥉'];
  box.innerHTML = `<h2>🏆 ${T('matchEnd')}</h2>` + list.slice(0, 8).map((p, i) =>
    `<div class="${p.id === myId ? 'me' : ''}"><span>${medals[i] || (i + 1)}</span><i style="background:${Cos.color(p.look.c)}"></i><em>${esc(p.name)}${p.id === myId ? ' (' + T('youTag') + ')' : ''}</em><b>${p.score}</b></div>`).join('') +
    (matchEarn ? `<p class="earn">${T('earned')}: +${matchEarn} 🪙</p>` : '') +
    `<p>${T('newMatchIn')} ${Math.max(1, Math.ceil(V.tm))}…</p>`;
  box.classList.remove('hide');
}

/* ---------- комната ожидания ---------- */
function updateLobby() {
  const box = $('lobby');
  if (V.phase !== 4 || mode !== 'online') { box.classList.add('hide'); $('hud').classList.remove('inlobby'); if ($('hint').textContent === T('hintLobby')) $('hint').textContent = ''; return; }
  box.classList.remove('hide'); $('hud').classList.add('inlobby');
  const humans = [...roster.entries()].filter(([, r]) => !r.bot);
  const isHost = hostId === myId;
  const sig = [roomCode, humans.map(([id, r]) => id + r.name + r.look.c).join(), isHost, cfg.rounds, cfg.bots, cfg.chaos, roomPub, lang].join('|');
  if (sig !== lobbySig) {
    lobbySig = sig;
    const opts = [3, 5, 7, 10].map((n) => `<button data-a="r${n}" class="${cfg.rounds === n ? 'on' : ''}" ${isHost ? '' : 'disabled'}>${n}</button>`).join('');
    box.innerHTML =
      `<div class="hd">🧊 <span class="code" data-a="share">${roomCode}</span> <button class="mini" data-a="share">📤 ${T('share')}</button></div>` +
      `<div class="pl">${humans.map(([id, r]) => `<span><i style="background:${Cos.color(r.look.c)}"></i>${esc(r.name)}${id === hostId ? ' 👑' : ''}${id === myId ? ' ·' + T('youTag') : ''}</span>`).join('')}</div>` +
      `<div class="opts"><span style="font-size:13px;align-self:center">${T('rounds')}:</span>${opts}` +
      (roomPub ? '' : `<button data-a="bots" class="${cfg.bots ? 'on' : ''}" ${isHost ? '' : 'disabled'}>🤖 ${T('bots')}</button>`) +
      `<button data-a="chaos" class="${cfg.chaos ? 'on' : ''}" ${isHost ? '' : 'disabled'}>🌪 ${T('chaos')}</button></div>` +
      `<div class="st" id="lbSt"></div>` +
      (isHost ? `<button class="btn go" id="lbStart" data-a="start">▶ ${T('start')}</button>` : '');
  }
  let st;
  if (roomPub) st = V.tm > 0 ? T('lobbyAuto', Math.ceil(V.tm)) : T('lobbyAutoWait');
  else st = humans.length < 2 && !cfg.bots ? T('lobbyWait') : isHost ? T('lobbyReady') : T('lobbyWaitHost');
  const el = $('lbSt'); if (el && el.textContent !== st) el.textContent = st;
  const sb = $('lbStart'); if (sb) sb.disabled = humans.length < 2 && !cfg.bots;
  $('hint').textContent = T('hintLobby');
}
$('lobby').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a; GA.play('click');
  if (a === 'share') shareRoom();
  else if (a === 'start') wsSend({ t: 'start' });
  else if (a === 'bots') wsSend({ t: 'cfg', rounds: cfg.rounds, bots: cfg.bots ? 0 : 1, chaos: cfg.chaos });
  else if (a === 'chaos') wsSend({ t: 'cfg', rounds: cfg.rounds, bots: cfg.bots, chaos: cfg.chaos ? 0 : 1 });
  else if (a[0] === 'r') wsSend({ t: 'cfg', rounds: +a.slice(1), bots: cfg.bots, chaos: cfg.chaos });
});

/* ================= главный цикл ================= */
const prevCtx = { a: $('prev').getContext('2d'), w: $('wprev').getContext('2d') };
function drawPreview(cvEl, c2, now) {
  const w = cvEl.width; c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, w, w);
  c2.setTransform(w / 120, 0, 0, w / 120, 0, 0);
  const g = c2.createRadialGradient(60, 66, 6, 60, 66, 50); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = g; c2.beginPath(); c2.arc(60, 66, 50, 0, TAU); c2.fill();
  const t = now / 1000;
  Cos.drawPenguin(c2, P.look, { x: 60, y: 62, s: 1.55, face: 0.2 + Math.sin(t * 1.3) * 0.35 - 0.2, t: now, id: 3, speed: 0 });
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (paused) return;

  if (mode === 'offline' && game) {
    acc += dt;
    while (acc >= 1 / 60) {
      const iv = getInputVec(); game.setInput(myId, iv.x, iv.y, dashQueued); dashQueued = false;
      game.step(1 / 60); acc -= 1 / 60;
      if (game.events.length) { V = viewFromGame(game, infoOf); handleEvents(game.events.splice(0)); }
    }
    V = viewFromGame(game, infoOf);
  } else if (mode === 'online') {
    V = buildOnline(now, dt);
  } else {
    if (!demo) { demo = new Game({ lobby: false, demo: true }); demo.cfg.bots = 1; demo.startMatch(); }
    acc += dt; while (acc >= 1 / 60) { demo.step(1 / 60); demo.events.length = 0; acc -= 1 / 60; }
    V = viewFromGame(demo, (id) => { const p = demo.players.find((q) => q.id === id); return { name: p.name, look: p.look, bot: true }; });
  }
  render(now, dt);
  if (mode !== 'menu') updateHud(now);
  else {
    if (!$('menu').classList.contains('hide')) drawPreview($('prev'), prevCtx.a, now);
    if (!$('wardrobe').classList.contains('hide')) drawPreview($('wprev'), prevCtx.w, now);
  }
}

/* ================= профиль, гардероб, награды ================= */
function refreshProfileUI() {
  $('lvlTxt').textContent = `${T('level')} ${Pro.level()}`;
  $('lvlFill').style.width = Math.round(Pro.levelProgress() * 100) + '%';
  $('coinsTxt').textContent = `🪙 ${P.coins}`;
  $('coins').textContent = `🪙 ${P.coins}`;
}
let wTab = 'c';
function buildWardrobe() {
  refreshProfileUI();
  const tabs = $('tabs'); tabs.innerHTML = '';
  for (const s of ['c', 'p', 'h', 'e', 't']) { const b = document.createElement('button'); b.textContent = T('tab' + s); b.className = s === wTab ? 'sel' : ''; b.onclick = () => { wTab = s; GA.play('click'); buildWardrobe(); }; tabs.appendChild(b); }
  const grid = $('grid'); grid.innerHTML = '';
  const n = Cos.count(wTab);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div'); const own = Pro.owned(wTab, i), sel = P.look[wTab] === i;
    d.className = 'item' + (sel ? ' sel' : '') + (own ? '' : ' lock');
    d.appendChild(Cos.thumb(wTab, i, P.look, 56, lang));
    const l = document.createElement('span'); l.textContent = Cos.name(wTab, i, lang); d.appendChild(l);
    const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = own ? (sel ? '✓' : '') : `🪙 ${Cos.price(wTab, i)}`; d.appendChild(pr);
    d.onclick = () => {
      if (own) { Pro.equip(wTab, i); GA.play('click'); buildWardrobe(); return; }
      if (Pro.buy(wTab, i)) { Pro.equip(wTab, i); GA.play('buy'); toast('✅ ' + T('bought')); buildWardrobe(); }
      else { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); toast(T('notEnough')); }
    };
    grid.appendChild(d);
  }
}
function buildAchs() {
  $('achList').innerHTML = Pro.ACH.map((a) => {
    const v = Math.min(a.v(), a.goal), done = !!P.ach[a.id];
    return `<div class="ach ${done ? 'done' : ''}"><div class="ic">${done ? '🏆' : '🔒'}</div><div class="tx"><b>${lang === 'ru' ? a.ru : a.en}</b><br>${lang === 'ru' ? a.dru : a.den}<div class="bar"><i style="width:${Math.round((v / a.goal) * 100)}%"></i></div></div><div class="rw">${done ? '✓' : v + '/' + a.goal}<br>+${a.rew}🪙</div></div>`;
  }).join('');
}
function syncToggles() {
  for (const [id, k] of [['tSfx', 'sound'], ['tMusic', 'music'], ['tVibe', 'vibe']]) { $(id).textContent = P.opts[k] ? 'ON' : 'OFF'; $(id).classList.toggle('on', !!P.opts[k]); }
  $('bS2').textContent = P.opts.sound ? '🔊' : '🔇';
  GA.setSfx(P.opts.sound); GA.setMusic(P.opts.music);
}
function hardReload() {
  toast(T('updating'));
  const done = () => location.reload();
  try {
    const p = [];
    if ('serviceWorker' in navigator) p.push(navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))));
    if (window.caches) p.push(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
    Promise.all(p).then(done, done); setTimeout(done, 2500);
  } catch (e) { done(); }
}

function commitName() { const v = $('name').value.replace(/[<>&"'`]/g, '').trim().slice(0, 14); P.name = v; Pro.save(); }

function initMenu() {
  applyLang(); syncToggles(); refreshProfileUI();
  if (!P.name && Y.player) { try { const n = Y.player.getName(); if (n) { P.name = n.slice(0, 14); Pro.save(); } } catch (e) {} }
  $('name').value = P.name;
  $('name').addEventListener('input', commitName); $('name').addEventListener('change', commitName);
  $('bOnline').onclick = () => { commitName(); GA.init(); GA.play('click'); connect('quick'); };
  $('bFriends').onclick = () => { GA.init(); GA.play('click'); $('friends').classList.toggle('hide'); };
  $('bCreate').onclick = () => { commitName(); GA.play('click'); connect('create'); };
  $('bJoin').onclick = () => { commitName(); GA.play('click'); const c = $('code').value.trim().toUpperCase(); if (c.length !== 4) return showMsg(T('enterCode')); connect('code', c); };
  $('code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  $('bOffline').onclick = () => { commitName(); GA.init(); GA.play('click'); startOffline(); };
  $('bWard').onclick = () => { GA.init(); GA.play('click'); buildWardrobe(); showScreen('wardrobe'); };
  $('bWBack').onclick = () => { GA.play('click'); showScreen('menu'); };
  $('bAch').onclick = () => { GA.init(); GA.play('click'); buildAchs(); showScreen('achs'); };
  $('bABack').onclick = () => { GA.play('click'); showScreen('menu'); };
  $('bSet').onclick = () => { GA.init(); GA.play('click'); syncToggles(); showScreen('settings'); };
  $('bSBack').onclick = () => { GA.play('click'); showScreen('menu'); };
  for (const [id, k] of [['tSfx', 'sound'], ['tMusic', 'music'], ['tVibe', 'vibe']]) $(id).onclick = () => { P.opts[k] = !P.opts[k]; Pro.save(); syncToggles(); GA.play('click'); };
  $('bS2').onclick = () => { GA.init(); P.opts.sound = !P.opts.sound; Pro.save(); syncToggles(); };
  $('bLang').onclick = () => { lang = lang === 'ru' ? 'en' : 'ru'; ls.set('lang', lang); applyLang(); refreshProfileUI(); fetchOnline(); };
  $('bUpdate').onclick = hardReload;
  $('ver').textContent = $('ver2').textContent = 'v' + C.VERSION;
  fetchOnline(); setInterval(() => { if (mode === 'menu' && !document.hidden) fetchOnline(); }, 15000);

  const room = new URLSearchParams(location.search).get('room');
  if (room) { $('code').value = room.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); $('friends').classList.remove('hide'); showMsg(T('joinRoomHint')); }
  const d = Pro.daily(); if (d) setTimeout(() => { toast(`🎁 ${T('daily')}: +${d} 🪙`); GA.play('coin'); refreshProfileUI(); }, 600);
}

/* ---------- установка и автообновление (PWA) ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('bInstall').classList.remove('hide'); });
$('bInstall').addEventListener('click', () => { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; $('bInstall').classList.add('hide'); }); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && window.top === window) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return; // первая установка — перезагрузка не нужна
    reloading = true;
    if (mode === 'menu') location.reload(); else pendingReload = true; // во время матча — перезагрузим при выходе в меню
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.update().catch(() => {});
    setInterval(() => reg.update().catch(() => {}), 10 * 60 * 1000);
  }).catch(() => {}));
}

/* ================= старт ================= */
Promise.race([initYandex(), new Promise((r) => setTimeout(r, 4000))]).then(() => {
  initMenu();
  requestAnimationFrame(frame);
  yReady();
});
window.__ps = { iv: getInputVec, get V() { return V; }, get mode() { return mode; }, get net() { return net; }, get game() { return game; }, startOffline, connect };
})();
