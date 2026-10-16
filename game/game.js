/* Пингвины-сумо — клиент */
(function () {
'use strict';
const { C, COLORS, Game } = Sim;
const $ = (id) => document.getElementById(id);
const PR = C.PR;

/* ================= хранилище ================= */
const store = {
  get(k, d) { try { const v = localStorage.getItem('ps_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ps_' + k, JSON.stringify(v)); } catch (e) {} },
};

/* ================= локализация ================= */
const L = {
  ru: {
    title: 'Пингвины-сумо', tag: 'Столкни всех со льдины!', yourName: 'Твоё имя',
    online: 'Играть онлайн', onlineSub: 'Быстрый матч с живыми игроками', friends: 'С друзьями (по коду)',
    create: 'Создать комнату', join: 'Войти', offline: 'Против ботов', offlineSub: 'Без интернета', install: '📲 Установить',
    howto: '🏁 В матче 5 раундов — побеждает тот, у кого больше очков.<br>🕹 Двигайся джойстиком (или WASD / стрелки).<br>⚡ Рывок — кнопка (или Пробел): таранит и отбрасывает.<br>🧊 Льдина тает — не упади в воду! 🐟 Рыбка даёт силу на 6 секунд.',
    dash: 'РЫВОК', hint: '', ready: 'Готовься…', go: 'ВПЕРЁД!', round: 'Раунд', win: 'Победитель', draw: 'Ничья!',
    youWon: 'ТЫ ПОБЕДИЛ!', fell: 'Ты упал в воду! 🌊', watching: 'Смотришь за боем', nextRound: 'Войдёшь в следующем раунде',
    alive: 'Живы', connecting: 'Подключаемся…', noServer: 'Сервер недоступен. Попробуй позже или играй против ботов.',
    noRoom: 'Комната не найдена', full: 'Комната заполнена', lost: 'Соединение потеряно', room: 'Комната', copied: 'Код скопирован!',
    matchEnd: 'Итоги матча', newMatchIn: 'Новый матч через', online_n: (n) => `Сейчас онлайн: ${n}`, ping: 'пинг', enterCode: 'Введи код из 4 букв', youTag: 'ты',
  },
  en: {
    title: 'Penguin Sumo', tag: 'Knock everyone off the ice!', yourName: 'Your name',
    online: 'Play online', onlineSub: 'Quick match with real players', friends: 'With friends (room code)',
    create: 'Create room', join: 'Join', offline: 'Vs bots', offlineSub: 'No internet needed', install: '📲 Install',
    howto: '🏁 A match is 5 rounds — most points wins.<br>🕹 Move with the joystick (or WASD / arrows).<br>⚡ Dash with the button (or Space): rams and knocks back.<br>🧊 The ice melts — don\'t fall in! 🐟 A fish gives power for 6 s.',
    dash: 'DASH', hint: '', ready: 'Get ready…', go: 'GO!', round: 'Round', win: 'Winner', draw: 'Draw!',
    youWon: 'YOU WIN!', fell: 'You fell in! 🌊', watching: 'Spectating', nextRound: 'You join next round',
    alive: 'Alive', connecting: 'Connecting…', noServer: 'Server unavailable. Try later or play vs bots.',
    noRoom: 'Room not found', full: 'Room is full', lost: 'Connection lost', room: 'Room', copied: 'Code copied!',
    matchEnd: 'Match results', newMatchIn: 'New match in', online_n: (n) => `Online now: ${n}`, ping: 'ping', enterCode: 'Enter a 4-letter code', youTag: 'you',
  },
};
let lang = store.get('lang', null);
function detectLang() {
  let l = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  return ['ru', 'uk', 'be', 'kk', 'uz', 'tg', 'hy', 'az', 'ky'].includes(l) ? 'ru' : 'en';
}
if (!lang) lang = detectLang();
const T = (k, ...a) => { const v = (L[lang] && L[lang][k]) ?? L.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((el) => { el.innerHTML = T(el.dataset.t); });
  document.querySelectorAll('[data-ph]').forEach((el) => { el.placeholder = T(el.dataset.ph); });
  $('bLang').textContent = lang.toUpperCase();
  document.title = T('title');
}

/* ================= Яндекс Игры SDK (безопасно, если его нет) ================= */
const Y = { sdk: null, player: null, inAd: false };
function initYandex() {
  if (typeof YaGames === 'undefined') return Promise.resolve();
  return YaGames.init().then((sdk) => {
    Y.sdk = sdk;
    try { const l = sdk.environment.i18n.lang; if (!store.get('lang', null)) { lang = ['ru', 'be', 'kk', 'uk', 'uz', 'hy', 'az', 'ky', 'tg'].includes(l) ? 'ru' : 'en'; } } catch (e) {}
    try { sdk.on && sdk.on('game_api_pause', () => setPaused(true)); sdk.on && sdk.on('game_api_resume', () => setPaused(false)); } catch (e) {}
    return sdk.getPlayer({ scopes: false }).then((p) => { Y.player = p; }).catch(() => {});
  }).catch(() => {});
}
function yReady() { try { Y.sdk && Y.sdk.features.LoadingAPI && Y.sdk.features.LoadingAPI.ready(); } catch (e) {} }
function yPlay(on) { try { const g = Y.sdk && Y.sdk.features.GameplayAPI; if (g) on ? g.start() : g.stop(); } catch (e) {} }
function yAd(cb) {
  if (!Y.sdk || !Y.sdk.adv) return cb();
  let done = false; const fin = () => { if (done) return; done = true; Y.inAd = false; audio.mute(!soundOn); cb(); };
  try {
    Y.inAd = true; audio.mute(true);
    Y.sdk.adv.showFullscreenAdv({ callbacks: { onClose: fin, onError: fin, onOpen: () => {} } });
    setTimeout(fin, 60000);
  } catch (e) { fin(); }
}
function yLeaderboard(wins) {
  try {
    if (!Y.sdk || !Y.sdk.getLeaderboards || !Y.player || Y.player.getMode && Y.player.getMode() === 'lite') return;
    Y.sdk.getLeaderboards().then((lb) => lb.setLeaderboardScore('wins', wins)).catch(() => {});
  } catch (e) {}
}

/* ================= звук (синтез, без файлов) ================= */
const audio = (function () {
  let ctx = null, master = null, muted = false, noiseBuf = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function tone(f, t, dur, type, vol, f2) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine';
    const t0 = ctx.currentTime + (t || 0);
    o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t, dur, vol, f1, f2) {
    if (!ctx || muted) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 0.9;
    const g = ctx.createGain(); const t0 = ctx.currentTime + (t || 0);
    fl.frequency.setValueAtTime(f1, t0); fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  const fx = {
    hit(p) { tone(140 + Math.random() * 40, 0, 0.14, 'triangle', 0.25 + 0.35 * p, 60); noise(0, 0.1, 0.25 * p + 0.1, 1800, 400); },
    dash() { noise(0, 0.22, 0.28, 500, 3000); },
    ko() { noise(0, 0.5, 0.45, 2500, 300); tone(300, 0, 0.35, 'sine', 0.2, 90); },
    splash() { noise(0, 0.35, 0.3, 1500, 250); },
    pick() { tone(660, 0, 0.1, 'square', 0.15); tone(880, 0.08, 0.1, 'square', 0.15); tone(1320, 0.16, 0.18, 'square', 0.15); },
    tick() { tone(520, 0, 0.12, 'square', 0.18); },
    go() { tone(880, 0, 0.35, 'square', 0.22); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.28)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, i * 0.15, 0.3, 'sawtooth', 0.12)); },
    emote() { tone(700, 0, 0.08, 'sine', 0.2, 1000); },
  };
  return {
    init, play(n, a) { try { fx[n] && fx[n](a); } catch (e) {} },
    mute(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
  };
})();
let soundOn = store.get('sound', true);
function setSound(on) { soundOn = on; store.set('sound', on); audio.mute(!on || paused || Y.inAd); $('bSound').textContent = on ? '🔊' : '🔇'; $('bS2').textContent = on ? '🔊' : '🔇'; }

/* ================= состояние ================= */
let mode = 'menu'; // menu | offline | online
let paused = false;
let game = null;       // офлайн-симуляция
let myId = 0;
let roomCode = '';
let roster = new Map(); // id -> {name,color,hat,bot}
let V = null;           // текущее «представление» мира для рендера
let acc = 0, lastT = 0;
let roundsPlayed = 0, totalWins = store.get('wins', 0);
const faces = new Map(); // id -> угол для плавного поворота
const emotes = new Map(); // id -> {e, until}
let banner = { text: '', sub: '', until: 0 };
let goFlash = 0;
let lastPhase = -1, lastCountNum = 0;

const prof = {
  name: store.get('name', ''), color: store.get('color', COLORS[4]), hat: store.get('hat', 0),
};

function setPaused(p) { paused = p; audio.mute(!soundOn || paused || Y.inAd); if (!p) lastT = performance.now(); }
document.addEventListener('visibilitychange', () => setPaused(document.hidden));

/* ================= сеть ================= */
const net = { ws: null, snaps: [], me: null, ping: 0, lastSent: 0, lastIn: '', pingT: 0, timer: null, pingTimer: null };

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
function httpBase(u) { return u.replace(/^ws/, 'http'); }

function fetchOnline() {
  const base = serverBase(); const el = $('online');
  if (!base) { el.textContent = ''; return; }
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
  fetch(httpBase(base) + '/stats', { signal: ctl.signal, cache: 'no-store' }).then((r) => r.json()).then((j) => {
    el.textContent = T('online_n', j.players);
  }).catch(() => { el.textContent = ''; }).finally(() => clearTimeout(to));
}

function connect(joinMode, code) {
  const base = serverBase();
  if (!base) { showMsg(T('noServer')); return; }
  audio.init();
  showMsg(T('connecting'));
  let ws;
  try { ws = new WebSocket(base); } catch (e) { showMsg(T('noServer')); return; }
  net.ws = ws; net.snaps = []; net.me = null;
  let joined = false;
  const fail = (txt) => { if (net.ws !== ws) return; try { ws.close(); } catch (e) {} net.ws = null; if (joined) { leaveToMenu(); } showMsg(txt || T('noServer')); };
  const to = setTimeout(() => { if (!joined) fail(T('noServer')); }, 7000);

  ws.onopen = () => ws.send(JSON.stringify({ t: 'join', mode: joinMode, code, name: prof.name || 'Penguin', color: prof.color, hat: prof.hat }));
  ws.onerror = () => { if (!joined) { clearTimeout(to); fail(T('noServer')); } };
  ws.onclose = () => { clearTimeout(to); if (net.ws === ws) { net.ws = null; if (joined) { leaveToMenu(); showMsg(T('lost')); } else showMsg(T('noServer')); } };
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    switch (m.t) {
      case 'joined':
        joined = true; clearTimeout(to); myId = m.id; roomCode = m.code; startPlay('online'); break;
      case 'err': clearTimeout(to); fail(m.e === 'full' ? T('full') : T('noRoom')); break;
      case 'r': roster = new Map(m.list.map((r) => [r[0], { name: r[1], color: r[2], hat: r[3], bot: !!r[4] }])); break;
      case 's': onSnapshot(m); break;
      case 'em': emotes.set(m.id, { e: m.e, until: performance.now() + 2200 }); audio.play('emote'); break;
      case 'pong': net.ping = Math.round(Date.now() - m.ts); break;
    }
  };
}

function onSnapshot(m) {
  m.at = performance.now();
  const map = new Map();
  for (const a of m.p) map.set(a[0], { id: a[0], x: a[1], y: a[2], vx: a[3], vy: a[4], alive: !!(a[5] & 1), dash: !!(a[5] & 2), boost: !!(a[5] & 4), spec: !!(a[5] & 8), cd: a[6] / 100, score: a[7], fall: a[8] / 100 });
  m.map = map;
  net.snaps.push(m); if (net.snaps.length > 30) net.snaps.shift();
  handleEvents(m.e);
  // сверка локального предсказания
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

/* ================= ввод ================= */
const keys = new Set();
const joy = { id: -1, active: false, bx: 0, by: 0, x: 0, y: 0 };
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
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (!e.repeat) doDash(); }
  else if (/^Digit[1-4]$/.test(e.code)) sendEmote(+e.code.slice(5) - 1);
  else keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('contextmenu', (e) => e.preventDefault());

cv.addEventListener('pointerdown', (e) => {
  if (mode === 'menu') return;
  audio.init();
  if (joy.id !== -1) return;
  joy.id = e.pointerId; joy.active = true; joy.bx = e.clientX; joy.by = e.clientY; joy.x = joy.y = 0;
  try { cv.setPointerCapture(e.pointerId); } catch (er) {}
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  const R = 56; let dx = e.clientX - joy.bx, dy = e.clientY - joy.by; const m = Math.hypot(dx, dy);
  if (m > R) { joy.bx += (dx / m) * (m - R); joy.by += (dy / m) * (m - R); dx = (dx / m) * R; dy = (dy / m) * R; }
  joy.x = dx / R; joy.y = dy / R; joy.kx = e.clientX; joy.ky = e.clientY;
  if (m > R) { joy.kx = joy.bx + dx; joy.ky = joy.by + dy; }
});
const endJoy = (e) => { if (e.pointerId === joy.id) { joy.id = -1; joy.active = false; joy.x = joy.y = 0; } };
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);

function doDash() {
  if (mode === 'menu') return;
  audio.init();
  if (mode === 'online') {
    const me = net.me;
    if (me && performance.now() >= me.cdUntil && V && V.phase === 1) {
      // локальное предсказание рывка
      const iv = getInputVec(); let dx = iv.x, dy = iv.y; const m = Math.hypot(dx, dy);
      if (m < 0.2) { const sp = Math.hypot(me.vx, me.vy); if (sp > 30) { dx = me.vx / sp; dy = me.vy / sp; } else { dx = 0; dy = 0; } }
      me.vx += dx * C.DASH_V; me.vy += dy * C.DASH_V; me.cdUntil = performance.now() + C.DASH_CD * 1000;
    }
    sendIn(true, true);
  } else dashQueued = true;
}
$('dash').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); doDash(); });

function sendEmote(i) {
  if (mode === 'online' && net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify({ t: 'em', e: i }));
  else { emotes.set(myId, { e: i, until: performance.now() + 2200 }); audio.play('emote'); }
}
$('bEmo').addEventListener('click', () => $('emobtns').classList.toggle('hide'));
$('emobtns').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { sendEmote(+b.dataset.e); $('emobtns').classList.add('hide'); } });

/* ================= жизненный цикл ================= */
function showMsg(t) { $('msg').textContent = t || ''; }

function startPlay(m) {
  mode = m; roundsPlayed = roundsPlayed; showMsg('');
  $('menu').classList.add('hide'); $('hud').classList.remove('hide');
  $('hint').textContent = '';
  faces.clear(); emotes.clear(); V = null; lastPhase = -1; finalShown = false; acc = 0; lastT = performance.now();
  $('roomline').innerHTML = '';
  if (m === 'online') {
    $('roomline').innerHTML = `${T('room')}: <span id="roomcode">${roomCode}</span> <span id="pingv"></span>`;
    $('roomcode').addEventListener('click', () => {
      const txt = roomCode;
      try { navigator.clipboard.writeText(txt); $('roomcode').textContent = T('copied'); setTimeout(() => { const e = $('roomcode'); if (e) e.textContent = roomCode; }, 1200); } catch (e) {}
      try { if (navigator.share) navigator.share({ title: T('title'), text: `${T('title')} — ${T('room')}: ${txt}` }); } catch (e) {}
    });
    net.pingTimer = setInterval(() => { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify({ t: 'ping', ts: Date.now() })); }, 2000);
    net.timer = setInterval(() => sendIn(false, false), 50);
  }
  yPlay(true);
}

function startOffline() {
  audio.init();
  game = new Game();
  const p = game.addPlayer(prof.name || 'Penguin', prof.color, prof.hat, false);
  myId = p.id; game.newRound(); game.round = 1;
  roster = new Map();
  startPlay('offline');
}

function leaveToMenu() {
  const hadRounds = roundsPlayed >= 2;
  clearInterval(net.timer); clearInterval(net.pingTimer);
  if (net.ws) { const w = net.ws; net.ws = null; try { w.close(); } catch (e) {} }
  mode = 'menu'; game = null; V = null; keys.clear(); joy.active = false; joy.id = -1;
  $('hud').classList.add('hide'); $('menu').classList.remove('hide'); $('emobtns').classList.add('hide');
  yPlay(false);
  fetchOnline();
  if (hadRounds) { roundsPlayed = 0; yAd(() => {}); }
}
$('bExit').addEventListener('click', leaveToMenu);

/* ================= события (звук/частицы) ================= */
const parts = [];
let shake = 0;
function spawnPuff(x, y, n, spd, col) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = spd * (0.3 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 0.9, r: 3 + Math.random() * 5, col: col || '#fff', t: 0 }); }
}
function spawnRing(x, y, col) { parts.push({ x, y, vx: 0, vy: 0, life: 0.7, max: 0.7, r: 10, col: col || '#fff', t: 1 }); }
function handleEvents(evs) {
  for (const e of evs) {
    switch (e[0]) {
      case 'hit': {
        spawnPuff(e[1], e[2], 8 + Math.round(e[3] * 10), 140 + e[3] * 260);
        audio.play('hit', e[3]);
        if (e[4] === myId || e[5] === myId) { shake = Math.max(shake, 6 + e[3] * 12); try { navigator.vibrate && navigator.vibrate(20 + e[3] * 40); } catch (er) {} }
        else shake = Math.max(shake, e[3] * 5);
        break;
      }
      case 'dash': audio.play('dash'); { const p = findP(e[1]); if (p) spawnPuff(p.x, p.y, 6, 120); } break;
      case 'ko': audio.play('ko'); { const p = findP(e[1]); if (p) { spawnRing(p.x, p.y, '#fff'); spawnPuff(p.x, p.y, 14, 200, '#bfe6fa'); } if (e[1] === myId) { audio.play('lose'); } } break;
      case 'splash': spawnRing(e[1], e[2], '#bfe6fa'); audio.play('splash'); break;
      case 'pick': audio.play('pick'); spawnPuff(e[2], e[3], 12, 160, '#ffd54a'); break;
      case 'go': audio.play('go'); goFlash = performance.now() + 900; break;
      case 'win': audio.play(e[1] === myId ? 'win' : 'tick'); roundsPlayed++; break;
      case 'final': break;
    }
  }
}
function findP(id) { return V && V.players.find((p) => p.id === id); }

/* ================= построение «представления» ================= */
function infoOf(id) {
  if (mode === 'offline' && game) { const p = game.players.find((q) => q.id === id); return p ? { name: p.name, color: p.color, hat: p.hat, bot: p.bot } : { name: '?', color: '#fff', hat: 0 }; }
  return roster.get(id) || { name: '…', color: '#ddd', hat: 0 };
}

function buildOffline() {
  const g = game;
  return {
    phase: g.phase === 'count' ? 0 : g.phase === 'play' ? 1 : g.phase === 'over' ? 2 : 3, tm: g.timer, el: g.elapsed, R: g.R, winner: g.winner, round: g.round,
    players: g.players.map((p) => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, alive: p.alive, dash: p.dash > 0, boost: p.boost > 0, spec: p.spec, cd: Math.max(0, p.cd) / C.DASH_CD, score: p.score, fall: p.fall, ...infoOf(p.id) })),
    fish: g.pickups.map((f) => ({ id: f.id, x: f.x, y: f.y })),
  };
}

function buildOnline(now, dt) {
  const sn = net.snaps; if (!sn.length) return null;
  const last = sn[sn.length - 1];
  const rt = now - 110;
  let a = sn[0], b = sn[0];
  for (let i = sn.length - 1; i >= 0; i--) { if (sn[i].at <= rt) { a = sn[i]; b = sn[Math.min(i + 1, sn.length - 1)]; break; } a = sn[i]; b = sn[i]; }
  let k = 0; if (b !== a && b.at > a.at) k = Math.min(1, Math.max(0, (rt - a.at) / (b.at - a.at)));
  // если отстали — экстраполируем от последнего
  const over = rt > last.at ? Math.min(0.15, (rt - last.at) / 1000) : 0;
  const players = [];
  for (const [id, pb] of last.map) {
    const pa = a.map.get(id) || pb, pb2 = b.map.get(id) || pb;
    let x, y;
    if (over > 0) { x = pb.x + pb.vx * over; y = pb.y + pb.vy * over; }
    else { x = pa.x + (pb2.x - pa.x) * k; y = pa.y + (pb2.y - pa.y) * k; }
    players.push({ id, x, y, vx: pb.vx, vy: pb.vy, alive: pb.alive, dash: pb.dash, boost: pb.boost, spec: pb.spec, cd: pb.cd, score: pb.score, fall: pb.fall, ...infoOf(id) });
  }
  // предсказание своего пингвина
  const me = net.me, mp = players.find((p) => p.id === myId);
  if (me && mp && last.ph === 1 && mp.alive) {
    const iv = getInputVec();
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
  return { phase: last.ph, tm: last.tm, el: last.el, R: last.R, winner: last.w, round: last.rd, players, fish: last.f.map((f) => ({ id: f[0], x: f[1], y: f[2] })) };
}

/* ================= рендер ================= */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
window.addEventListener('resize', resize); resize();

// трещины льдины (в единичных координатах)
const cracks = []; { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 16; i++) { const a = r() * 6.28, pts = []; let d = 0.1 + r() * 0.3, aa = a; for (let j = 0; j < 5; j++) { pts.push([Math.cos(aa) * d, Math.sin(aa) * d]); d += 0.1 + r() * 0.12; aa += (r() - 0.5) * 0.5; } cracks.push(pts); } }
const flakes = []; for (let i = 0; i < 46; i++) flakes.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random(), r: 1 + Math.random() * 2.2 });

function drawPenguin(p, sx, sy, face, scale, alpha, tnow) {
  const PR = 26; // локальные координаты рисунка
  ctx.save(); ctx.translate(sx, sy); ctx.globalAlpha = alpha;
  const sc = scale * (C.PR / 26);
  // тень
  ctx.fillStyle = 'rgba(0,30,70,.28)'; ctx.beginPath(); ctx.ellipse(3 * sc, 7 * sc, PR * 1.02 * sc, PR * 0.8 * sc, 0, 0, 6.3); ctx.fill();
  if (p.boost) { const g = ctx.createRadialGradient(0, 0, PR * 0.6, 0, 0, PR * 2.1); const pu = 0.55 + 0.25 * Math.sin(tnow / 110); g.addColorStop(0, `rgba(255,210,60,${pu})`); g.addColorStop(1, 'rgba(255,210,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, PR * 2.1 * sc, 0, 6.3); ctx.fill(); }
  ctx.rotate(face); ctx.scale(sc * (p.dash ? 1.14 : 1), sc * (p.dash ? 0.9 : 1));
  const dark = shade(p.color, -0.35);
  // ласты
  const fl = Math.sin(tnow / 120 + p.id) * 0.25;
  ctx.fillStyle = dark; for (const sd of [-1, 1]) { ctx.save(); ctx.translate(-2, sd * PR * 0.92); ctx.rotate(sd * (0.5 + fl)); ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
  // лапки
  ctx.fillStyle = '#ff9f1c'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-PR * 0.85, sd * 8, 7, 4.5, 0, 0, 6.3); ctx.fill(); }
  // тело
  const g = ctx.createRadialGradient(-6, -8, 4, 0, 0, PR * 1.1); g.addColorStop(0, shade(p.color, 0.3)); g.addColorStop(1, p.color);
  ctx.fillStyle = g; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, PR, 0, 6.3); ctx.fill(); ctx.stroke();
  // белая мордочка
  ctx.fillStyle = '#f6fbff'; ctx.beginPath(); ctx.ellipse(PR * 0.42, 0, PR * 0.55, PR * 0.72, 0, 0, 6.3); ctx.fill();
  // глаза
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(PR * 0.5, sd * PR * 0.3, 6, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0a2540'; ctx.beginPath(); ctx.arc(PR * 0.58, sd * PR * 0.3, 3, 0, 6.3); ctx.fill();
  }
  // клюв
  ctx.fillStyle = '#ff9f1c'; ctx.strokeStyle = '#b86b00'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(PR * 0.78, -6); ctx.lineTo(PR * 1.22, 0); ctx.lineTo(PR * 0.78, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  // шляпа
  const hat = p.hat | 0;
  if (hat === 1) { ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(-3, 0, 12, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, 0, 4, 0, 6.3); ctx.fill(); }
  else if (hat === 2) { ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(-10, 11); ctx.lineTo(2, 7); ctx.lineTo(8, 0); ctx.lineTo(2, -7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (hat === 3) { ctx.fillStyle = '#c06bff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.lineTo(-14, 9); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, 0, 3, 0, 6.3); ctx.fill(); }
  ctx.restore();
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

let camS = 1;
function render(now, dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const t = now / 1000;
  // вода
  const wg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, Math.max(W, H) * 0.75);
  wg.addColorStop(0, '#2f9fd8'); wg.addColorStop(0.55, '#1a7bb8'); wg.addColorStop(1, '#0b3d6b');
  ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);

  const R0 = C.R0, span = 2 * R0 + 100;
  camS = Math.min(W / span, H / span);
  if (mode !== 'menu') {
    // небольшой сдвиг арены вниз на мобильном ландшафте не нужен
  }
  let ox = W / 2, oy = H / 2;
  if (shake > 0.2) { ox += (Math.random() - 0.5) * shake; oy += (Math.random() - 0.5) * shake; shake *= Math.pow(0.001, dt); }
  ctx.save(); ctx.translate(ox, oy); ctx.scale(camS, camS);

  // рябь
  ctx.lineWidth = 3 / camS * 1.2;
  for (let i = 0; i < 4; i++) { const ph = ((t * 0.12 + i / 4) % 1), r = (V ? V.R : R0) + 20 + ph * 260; ctx.strokeStyle = `rgba(255,255,255,${0.18 * (1 - ph)})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.3); ctx.stroke(); }

  const R = V ? V.R : R0;
  const shrinking = V && V.phase === 1 && V.el > C.SHRINK_DELAY;
  // тень и льдина
  ctx.fillStyle = 'rgba(0,30,70,.35)'; ctx.beginPath(); ctx.arc(6, 14, R + 12, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#9fd8f5'; ctx.beginPath(); ctx.arc(0, 0, R + 9, 0, 6.3); ctx.fill();
  const ig = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.1, 0, 0, R);
  ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.6, '#dff4ff'); ig.addColorStop(1, '#b4e2fb');
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.3); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.3); ctx.clip();
  ctx.strokeStyle = 'rgba(120,180,220,.5)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  for (const c of cracks) { ctx.beginPath(); c.forEach((q, i) => i ? ctx.lineTo(q[0] * C.R0, q[1] * C.R0) : ctx.moveTo(q[0] * C.R0, q[1] * C.R0)); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(150,200,235,.35)'; ctx.lineWidth = 2; for (const f of [0.35, 0.68]) { ctx.beginPath(); ctx.arc(0, 0, C.R0 * f, 0, 6.3); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = shrinking ? `rgba(255,90,90,${0.55 + 0.35 * Math.sin(t * 6)})` : 'rgba(255,255,255,.9)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.3); ctx.stroke();

  if (V) {
    // рыбки
    for (const f of V.fish) { const bob = Math.sin(t * 4 + f.id) * 3; ctx.save(); ctx.translate(f.x, f.y + bob); ctx.font = '34px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,230,120,.4)'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 6.3); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillText('🐟', 0, 2); ctx.restore(); }

    // пингвины (по y, для красивого перекрытия)
    const list = V.players.filter((p) => !p.spec && p.fall < 1).sort((a, b) => a.y - b.y);
    for (const p of list) {
      let f = faces.get(p.id); if (f === undefined) f = Math.atan2(-p.y, -p.x);
      const sp = Math.hypot(p.vx, p.vy);
      let target = f;
      if (p.id === myId && p.alive) { const iv = getInputVec(); if (Math.hypot(iv.x, iv.y) > 0.15) target = Math.atan2(iv.y, iv.x); else if (sp > 50) target = Math.atan2(p.vy, p.vx); }
      else if (sp > 50) target = Math.atan2(p.vy, p.vx);
      let d = target - f; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832;
      f += d * Math.min(1, dt * 14); faces.set(p.id, f);
      // след рывка
      if (p.dash && p.alive) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 5; for (const o of [-10, 0, 10]) { ctx.beginPath(); ctx.moveTo(p.x - Math.cos(f) * 22 - Math.sin(f) * o, p.y - Math.sin(f) * 22 + Math.cos(f) * o); ctx.lineTo(p.x - Math.cos(f) * 60 - Math.sin(f) * o, p.y - Math.sin(f) * 60 + Math.cos(f) * o); ctx.stroke(); } }
      const fall = p.fall; const sc = p.alive ? 1 : Math.max(0.05, 1 - fall * 0.95); const al = p.alive ? 1 : Math.max(0, 1 - fall * 0.9);
      drawPenguin(p, p.x, p.y, f + (p.alive ? 0 : fall * 5), sc, al, now);
      if (p.alive && p.id === myId) { // кольцо перезарядки + маркер
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, PR + 9, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - p.cd)); ctx.stroke();
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#0a2540'; ctx.lineWidth = 2; const bob = Math.sin(t * 6) * 3; ctx.beginPath(); ctx.moveTo(p.x, p.y - PR - 22 + bob); ctx.lineTo(p.x - 9, p.y - PR - 36 + bob); ctx.lineTo(p.x + 9, p.y - PR - 36 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    // имена и эмоции
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of list) {
      if (!p.alive) continue;
      const nf = Math.max(17, 12 / camS); ctx.font = `bold ${nf}px "Trebuchet MS",system-ui,sans-serif`; ctx.lineWidth = nf / 4; ctx.strokeStyle = 'rgba(5,30,60,.8)'; ctx.fillStyle = p.id === myId ? '#ffd23f' : '#fff';
      ctx.strokeText(p.name, p.x, p.y + PR + nf); ctx.fillText(p.name, p.x, p.y + PR + nf);
      const em = emotes.get(p.id);
      if (em && em.until > now) { const age = (em.until - now) / 2200; ctx.globalAlpha = Math.min(1, age * 3); ctx.font = `${Math.max(34, 24 / camS)}px serif`; ctx.fillText(['😂', '😡', '👍', '🐟'][em.e], p.x, p.y - PR - 28 - (1 - age) * 14); ctx.globalAlpha = 1; }
    }
  }
  // частицы
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
    const a = q.life / q.max;
    if (q.t === 1) { const rr = q.r + (1 - a) * 70; ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`; ctx.lineWidth = 4 * a + 1; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, 6.3); ctx.stroke(); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.95; q.vy *= 0.95;
    ctx.fillStyle = q.col; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.4 + a * 0.6), 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();

  // снег поверх
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (const f of flakes) { f.y += dt * 0.03 * f.s; f.x += Math.sin(t + f.s * 9) * dt * 0.004; if (f.y > 1) { f.y = -0.02; f.x = Math.random(); } ctx.globalAlpha = 0.35 + f.s * 0.3; ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, 6.3); ctx.fill(); }
  ctx.globalAlpha = 1;

  // джойстик
  if (mode !== 'menu' && joy.active) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(joy.bx, joy.by, 56, 0, 6.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.bx + joy.x * 56, joy.by + joy.y * 56, 26, 0, 6.3); ctx.fill();
  }
}

/* ================= HUD ================= */
let hudT = 0;
function updateHud(now) {
  if (!V) return;
  if (now - hudT < 90) return; hudT = now;
  const me = V.players.find((p) => p.id === myId);
  const aliveN = V.players.filter((p) => p.alive).length, tot = V.players.filter((p) => !p.spec).length;
  $('alive').textContent = V.phase === 3 ? T('matchEnd') : `${T('alive')}: ${aliveN}/${tot}  ·  ${T('round')} ${Math.min(V.round, C.ROUNDS)}/${C.ROUNDS}`;
  updateFinal(me);
  if (mode === 'online') { const pv = $('pingv'); if (pv) pv.textContent = `· ${net.ping}ms`; }
  // таблица
  const sorted = [...V.players].sort((a, b) => b.score - a.score).slice(0, 6);
  $('score').innerHTML = sorted.map((p) => `<div class="${p.id === myId ? 'me' : ''} ${!p.alive && V.phase === 1 && !p.spec ? 'dead' : ''}"><i style="background:${p.color}"></i>${esc(p.name)}<b>${p.score}</b></div>`).join('');
  // кнопка рывка
  const cd = me ? me.cd : 0; $('dash').style.setProperty('--p', `${Math.round((1 - cd) * 100)}%`); $('dash').classList.toggle('cd', cd > 0.02);
  // баннер
  let txt = '', sub = '';
  if (V.phase === 0) {
    const n = Math.ceil(V.tm - 0.2);
    txt = n > 0 ? String(n) : T('go'); sub = `${T('round')} ${V.round}/${C.ROUNDS}`;
    if (n !== lastCountNum && n > 0) { audio.play('tick'); lastCountNum = n; }
  } else if (V.phase === 1) {
    if (now < goFlash) txt = T('go');
    else if (me && me.spec) { txt = ''; sub = T('nextRound'); }
    else if (me && !me.alive) { txt = ''; sub = T('fell') + ' · ' + T('watching'); }
  } else if (V.phase === 3) {
    txt = '';
  } else {
    if (V.winner === myId) txt = T('youWon');
    else if (V.winner) { const w = V.players.find((p) => p.id === V.winner); txt = '🏆 ' + (w ? esc(w.name) : ''); }
    else txt = T('draw');
  }
  const bn = $('banner'); const html = (txt ? txt : '') + (sub ? `<small>${sub}</small>` : '');
  bn.classList.toggle('subonly', !txt);
  if (bn.innerHTML !== html) bn.innerHTML = html;
  lastPhase = V.phase;
}
function updateFinal(me) {
  const box = $('final');
  if (V.phase !== 3) { box.classList.add('hide'); finalShown = false; return; }
  const list = V.players.filter((p) => !p.spec || p.score > 0).sort((a, b) => b.score - a.score);
  if (!finalShown) {
    finalShown = true;
    const top = list[0];
    if (top && top.id === myId && top.score > 0) { audio.play('win'); totalWins++; store.set('wins', totalWins); yLeaderboard(totalWins); }
    else audio.play('lose');
  }
  const medals = ['🥇', '🥈', '🥉'];
  const best = list.length ? list[0].score : 0;
  box.innerHTML = `<h2>🏆 ${T('matchEnd')}</h2>` + list.slice(0, 8).map((p, i) =>
    `<div class="${p.id === myId ? 'me' : ''}"><span>${medals[i] || (i + 1)}</span><i style="background:${p.color}"></i><em>${esc(p.name)}${p.id === myId ? ' (' + T('youTag') + ')' : ''}</em><b>${p.score}</b></div>`).join('') +
    `<p>${T('newMatchIn')} ${Math.max(1, Math.ceil(V.tm))}…</p>`;
  box.classList.remove('hide');
}
let finalShown = false;
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ================= главный цикл ================= */
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (paused) { return; }

  if (mode === 'offline' && game) {
    acc += dt;
    while (acc >= 1 / 60) {
      const iv = getInputVec(); game.setInput(myId, iv.x, iv.y, dashQueued); dashQueued = false;
      game.step(1 / 60); acc -= 1 / 60;
      if (game.events.length) handleEvents(game.events.splice(0));
    }
    V = buildOffline();
  } else if (mode === 'online') {
    V = buildOnline(now, dt);
  } else {
    V = null;
  }
  render(now, dt);
  if (mode !== 'menu') updateHud(now);
}

/* ================= меню ================= */
function penguinSVG(color, hat) {
  const dk = shade(color, -0.35);
  const hats = ['', '<path d="M-22 -18 A22 22 0 0 1 0 -26 L0 -8 Z" fill="#e63946"/><circle cx="-3" cy="-26" r="4" fill="#fff"/>',
    '<path d="M-20 -26 L-20 -8 L-9 -14 L0 -8 L9 -14 L20 -8 L20 -26 L10 -18 L0 -28 L-10 -18Z" fill="#ffd23f" stroke="#b8860b" stroke-width="2"/>',
    '<path d="M-14 -14 L0 -42 L14 -14Z" fill="#c06bff" stroke="#fff" stroke-width="2"/><circle cx="0" cy="-42" r="4" fill="#fff"/>'];
  return `<ellipse cx="0" cy="30" rx="24" ry="6" fill="rgba(0,30,70,.3)"/>
  <ellipse cx="-27" cy="4" rx="7" ry="13" fill="${dk}" transform="rotate(20 -27 4)"/><ellipse cx="27" cy="4" rx="7" ry="13" fill="${dk}" transform="rotate(-20 27 4)"/>
  <ellipse cx="-9" cy="29" rx="8" ry="4.5" fill="#ff9f1c"/><ellipse cx="9" cy="29" rx="8" ry="4.5" fill="#ff9f1c"/>
  <ellipse cx="0" cy="2" rx="24" ry="28" fill="${color}" stroke="#0a2540" stroke-width="3"/>
  <ellipse cx="0" cy="8" rx="15" ry="19" fill="#f6fbff"/>
  <circle cx="-8" cy="-8" r="6" fill="#fff" stroke="#0a2540" stroke-width="1.6"/><circle cx="8" cy="-8" r="6" fill="#fff" stroke="#0a2540" stroke-width="1.6"/>
  <circle cx="-8" cy="-6" r="3" fill="#0a2540"/><circle cx="8" cy="-6" r="3" fill="#0a2540"/>
  <path d="M-6 2 L0 11 L6 2Z" fill="#ff9f1c" stroke="#b86b00" stroke-width="1.5"/>${hats[hat] || ''}`;
}
function buildPicker() {
  const cb = $('colors'); cb.innerHTML = '';
  COLORS.forEach((c) => { const b = document.createElement('button'); b.className = 'sw' + (c === prof.color ? ' sel' : ''); b.style.background = c; b.setAttribute('aria-label', c); b.onclick = () => { prof.color = c; store.set('color', c); buildPicker(); }; cb.appendChild(b); });
  const hb = $('hats'); hb.innerHTML = '';
  ['🚫', '🧢', '👑', '🎉'].forEach((h, i) => { const b = document.createElement('button'); b.className = 'hatb' + (i === prof.hat ? ' sel' : ''); b.textContent = h; b.onclick = () => { prof.hat = i; store.set('hat', i); buildPicker(); }; hb.appendChild(b); });
  $('prev').innerHTML = penguinSVG(prof.color, prof.hat);
}
function commitName() { const v = $('name').value.replace(/[<>&"'`]/g, '').trim().slice(0, 14); prof.name = v; store.set('name', v); }

function initMenu() {
  applyLang(); buildPicker(); setSound(soundOn);
  if (!prof.name && Y.player) { try { const n = Y.player.getName(); if (n) prof.name = n.slice(0, 14); } catch (e) {} }
  $('name').value = prof.name;
  $('name').addEventListener('change', commitName); $('name').addEventListener('input', commitName);
  $('bOnline').onclick = () => { commitName(); connect('quick'); };
  $('bFriends').onclick = () => $('friends').classList.toggle('hide');
  $('bCreate').onclick = () => { commitName(); connect('create'); };
  $('bJoin').onclick = () => { commitName(); const c = $('code').value.trim().toUpperCase(); if (c.length !== 4) return showMsg(T('enterCode')); connect('code', c); };
  $('code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  $('bOffline').onclick = () => { commitName(); startOffline(); };
  $('bSound').onclick = $('bS2').onclick = () => { audio.init(); setSound(!soundOn); };
  $('bLang').onclick = () => { lang = lang === 'ru' ? 'en' : 'ru'; store.set('lang', lang); applyLang(); fetchOnline(); };
  if (!serverBase()) { /* без сервера онлайн-кнопки остаются, но покажут понятную ошибку */ }
  fetchOnline(); setInterval(() => { if (mode === 'menu' && !document.hidden) fetchOnline(); }, 15000);
}

/* ---------- установка как приложение (PWA) ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('bInstall').classList.remove('hide'); });
$('bInstall').addEventListener('click', () => { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; $('bInstall').classList.add('hide'); }); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && window.top === window) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* ================= старт ================= */
Promise.race([initYandex(), new Promise((r) => setTimeout(r, 4000))]).then(() => {
  initMenu();
  requestAnimationFrame(frame);
  yReady();
});
window.__ps = { iv: getInputVec, get V() { return V; }, get mode() { return mode; }, get net() { return net; }, startOffline, connect };
})();
