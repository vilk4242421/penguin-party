/* Пингвины v3 — клиент: 3D-арена, 8 режимов, турнир с пьедесталом, кликер, гардероб */
(function () {
'use strict';
const { C, Game, MODES, RACE, SNOW_OBS } = Sim;
const Cos = Cosmetics, Pro = Profile, GA = GameAudio, Sc = Scene;
const $ = (id) => document.getElementById(id);
const PR = C.PR;
const TAU = Math.PI * 2;
Pro.load();
if (Pro.tampered) setTimeout(() => { try { toast('⚠️ Профиль был изменён вручную и сброшен'); } catch (e) {} }, 900);
const P = Pro.P;

/* ================= локальное хранилище (мелочи) ================= */
const ls = {
  get(k, d) { try { const v = localStorage.getItem('ps_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ps_' + k, JSON.stringify(v)); } catch (e) {} },
};

/* ================= локализация ================= */
const L = {
  ru: {
    title: 'Пингвины', tag: 'Турниры, гонки и сумо на льдинах!', yourName: 'Твоё имя',
    online: 'Играть онлайн', onlineSub: 'Быстрый турнир с живыми игроками', tournament: 'Турнир', modes: 'Режимы', friends: 'С друзьями (по коду)',
    create: 'Создать комнату', join: 'Войти', offline: 'Против ботов', offlineSub: 'Без интернета — быстрый турнир', install: '📲 Установить',
    clicker: 'Симулятор', wardrobe: 'Гардероб', achievements: 'Награды', settings: 'Настройки', back: 'Назад',
    account: 'Аккаунт', accSynced: 'Золото, покупки и прогресс сохраняются на сервере — зайди с другого устройства под этим ником и паролем.', accOut: 'Выйти', accInfo: 'Создай аккаунт, чтобы прогресс не терялся и был на всех устройствах. Без аккаунта можно играть как гость.', accUser: 'Ник аккаунта', accPass: 'Пароль (от 6 символов)', accRec: 'Код восстановления', accLogin: 'Войти', accReg: 'Создать аккаунт', accForgot: 'Забыл пароль?', accReset: 'Сменить пароль', accE: { name: 'Ник: 3–16 символов, буквы, цифры, _ и -', pass: 'Пароль: от 6 символов', taken: 'Такой ник уже занят', creds: 'Неверный ник или пароль', wait: 'Слишком много попыток, подожди немного', net: 'Нет связи с сервером', err: 'Ошибка, попробуй ещё раз' }, accDone: (n) => `Добро пожаловать, ${n}!`, accRecShow: (c) => `Твой код восстановления: ${c}\nЗапиши его — это единственный способ вернуть аккаунт при потере пароля.`, accSt: { ok: 'Синхронизировано', offline: 'Нет связи — синхронизация позже', rejected: 'Подозрительное изменение отклонено, профиль восстановлен с сервера', conflict: 'Профиль обновлён с другого устройства', expired: 'Сессия истекла — войди снова', err: 'Ошибка синхронизации' }, accGuest: 'Гость',
    sfx: 'Звуки', music: 'Музыка', vibe: 'Вибрация', language: 'Язык', update: '🔄 Обновить игру',
    tRand: '🎲 Случайные', tPick: '🎯 Свои режимы', pickHint: 'Выбери от 2 до 10 режимов — они пойдут по порядку', pickSel: (n) => `Выбрано режимов: ${n}`, sumPick: (n, b) => `🎯 Свои режимы: ${n}${b ? ' · с ботами' : ''}`,
    tankDead: (n) => `💥 Подбит! Возрождение на базе через ${n}`, gotFlag: 'Флаг у тебя! Вези на базу', flagCap: 'Флаг захвачен!',
    tourNote: 'Несколько разных режимов подряд. За каждое место — очки, а в конце — пьедестал. Последний окажется в клетке!',
    diffL: 'Сложность ботов:', diffS: 'Боты:', diffs: ['Лёгкие', 'Средние', 'Тяжёлые'], tourLen: 'Сколько режимов в турнире:', tourBots: 'Недостающие игроки:', botsOn: '🤖 С ботами (до 5 игроков)', botsOff: '👥 Без ботов (только живые)',
    tInfoOn: 'Если игроков меньше пяти, добавим ботов. Очки за места: 4 · 3 · 2 · 1 · 0.',
    tInfoOff: 'Играют только живые игроки: очки = число игроков − место. Например, 5 игроков: 4·3·2·1·0, 4 игрока: 3·2·1·0, 3: 2·1·0, 2: 1·0.',
    vsBots: 'Против ботов', offlineSub2: 'офлайн, сразу играем', onlineTour: 'Онлайн-турнир', onlineTourSub: 'с живыми игроками', withFriends: 'С друзьями (комната)', onlineShort: 'Онлайн',
    rounds: 'Раундов:', pickMode: 'Режим:', roomSet: 'Настройки комнаты', format: 'Формат:', fTour: '🏆 Турнир', fSeries: '🎮 Один режим', ok: 'Готово',
    enter: 'Ввести', promoPh: 'Секретный код', badCode: 'Такого кода нет', codeNet: 'Нет связи с сервером — коды работают только онлайн', codeWait: 'Слишком много попыток, подожди минуту', codeOk: (n) => `🎉 Получено: ${n}!`, codeCoins: (n) => `🎉 +${n} 🪙 золота!`, codeHad: 'Этот приз уже у тебя — надето!',
    lockClicker: '🎣 Выдаётся за прохождение симулятора', lockCode: '🔑 Выдаётся по секретному коду', lkClicker: '🎣 за прохождение симулятора', lkCode: '🔑 по секретному коду',
    tabs: 'Облик', tabc: 'Цвет', tabp: 'Узор', tabh: 'Шляпа', tabe: 'Очки', tabt: 'След',
    dash: 'РЫВОК', go: 'ВПЕРЁД!', round: 'Раунд', draw: 'Ничья!', youWon: 'ТЫ ПОБЕДИЛ!', fell: 'Ты выбыл! 🌊', watching: 'Смотришь за боем', nextRound: 'Войдёшь в следующем раунде',
    alive: 'Живы', connecting: 'Подключаемся…', waking: 'Сервер просыпается, подождите до минуты…',
    noServer: 'Сервер недоступен. Попробуй позже или играй против ботов.', noRoom: 'Комната не найдена', full: 'Комната заполнена',
    lost: 'Соединение потеряно', old: 'Вышла новая версия — обновляем игру…', room: 'Комната', copied: 'Код скопирован!',
    online_n: (n) => `Сейчас онлайн: ${n}`, enterCode: 'Введи код из 4 букв', youTag: 'ты',
    lobbyTitle: 'Комната ожидания', lobbyWait: 'Ждём друзей… нужно минимум 2 игрока', lobbyAuto: (n) => `Старт через ${n}…`, lobbyAutoWait: 'Ищем соперников…',
    lobbyReady: 'Все готовы? Жми СТАРТ!', lobbyWaitHost: 'Ждём, пока хозяин начнёт игру', start: 'СТАРТ', share: 'Позвать друзей', hintLobby: 'Пока ждёте — потренируйтесь: рывок, толчки, эмоции!',
    sumTour: (n, b) => `🏆 Турнир: ${n} ${n === 1 ? 'режим' : n < 5 ? 'режима' : 'режимов'} · ${b ? '🤖 с ботами' : '👥 без ботов'}`, sumSeries: (m, n, b) => `${m}${n > 1 ? ' × ' + n : ''} · ${b ? '🤖 с ботами' : '👥 без ботов'}`, chaosL: '🌪 Хаос', botsL: '🤖 Боты',
    notEnough: 'Не хватает монет 🪙', bought: 'Куплено!', achUnlocked: 'Достижение', daily: 'Ежедневный подарок', windWarn: '💨 Ветер!', earned: 'Заработано', level: 'Ур.',
    updating: 'Обновляем…', joinRoomHint: 'Нажми «Войти», чтобы попасть в комнату друзей', needTwo: 'Нужно минимум 2 игрока (или включи ботов)',
    pk: ['Сила!', 'Заморозка!', 'Ударная волна!', 'Щит!'], roundN: (a, b) => `Раунд ${a} из ${b}`, results: 'Итоги раунда', nextIn: 'Дальше через', pts: 'очк.',
    finalT: 'Итоги', winnerIs: 'Победитель', yourPlace: (n) => `Твоё место: ${n}`, caged: 'Ты в клетке! 😅', again: '🔁 Ещё раз', toMenu: '🏠 В меню', leave: '✖ Выйти', newGameIn: 'Новая игра через',
    laps: (n) => `Круг ${n}/2`, lap: (n) => `Круг ${n}!`, fin: (n) => `Финиш — ${n} место!`, pass: 'Бомба у тебя! Передай!', youHot: '💣 БОМБА У ТЕБЯ!', youSnow: '⛄ ТЫ СНЕГОВИК! Лови пингвинов!', hurt: 'Ай!', fishGot: (n) => `+${n} 🐟`,
    kingHint: '👑 Лови того, у кого корона!', youCrown: '👑 КОРОНА У ТЕБЯ! Убегай!', wait2: 'Ждём соперников…',
  },
  en: {
    title: 'Penguins', tag: 'Tournaments, races and sumo on ice!', yourName: 'Your name',
    online: 'Play online', onlineSub: 'Quick tournament with real players', tournament: 'Tournament', modes: 'Modes', friends: 'With friends (room code)',
    create: 'Create room', join: 'Join', offline: 'Vs bots', offlineSub: 'No internet — quick tournament', install: '📲 Install',
    clicker: 'Simulator', wardrobe: 'Wardrobe', achievements: 'Awards', settings: 'Settings', back: 'Back',
    account: 'Account', accSynced: 'Coins, purchases and progress are saved on the server — sign in with this name and password on another device.', accOut: 'Sign out', accInfo: 'Create an account so progress is never lost and works on every device. You can also play as a guest.', accUser: 'Account name', accPass: 'Password (6+ chars)', accRec: 'Recovery code', accLogin: 'Sign in', accReg: 'Create account', accForgot: 'Forgot password?', accReset: 'Reset password', accE: { name: 'Name: 3–16 chars, letters, digits, _ and -', pass: 'Password: 6+ characters', taken: 'That name is taken', creds: 'Wrong name or password', wait: 'Too many tries, wait a bit', net: 'No connection to the server', err: 'Error, try again' }, accDone: (n) => `Welcome, ${n}!`, accRecShow: (c) => `Your recovery code: ${c}\nWrite it down — it is the only way back into the account if you lose the password.`, accSt: { ok: 'Synced', offline: 'Offline — will sync later', rejected: 'A suspicious change was rejected, profile restored from the server', conflict: 'Profile updated from another device', expired: 'Session expired — sign in again', err: 'Sync error' }, accGuest: 'Guest',
    sfx: 'Sounds', music: 'Music', vibe: 'Vibration', language: 'Language', update: '🔄 Update game',
    tRand: '🎲 Random', tPick: '🎯 Pick modes', pickHint: 'Pick 2 to 10 modes — they play in this order', pickSel: (n) => `Modes picked: ${n}`, sumPick: (n, b) => `🎯 Picked modes: ${n}${b ? ' · with bots' : ''}`,
    tankDead: (n) => `💥 Destroyed! Respawn at base in ${n}`, gotFlag: 'You have the flag! Get home', flagCap: 'Flag captured!',
    tourNote: 'Several different modes in a row. Every place scores points, then comes the podium. Last place goes in the cage!',
    diffL: 'Bot difficulty:', diffS: 'Bots:', diffs: ['Easy', 'Medium', 'Hard'], tourLen: 'Modes in the tournament:', tourBots: 'Missing players:', botsOn: '🤖 With bots (up to 5 players)', botsOff: '👥 No bots (real players only)',
    tInfoOn: 'If fewer than five players, bots join. Points by place: 4 · 3 · 2 · 1 · 0.',
    tInfoOff: 'Only real players: points = players − place. E.g. 5 players: 4·3·2·1·0, 4 players: 3·2·1·0, 3: 2·1·0, 2: 1·0.',
    vsBots: 'Vs bots', offlineSub2: 'offline, play right away', onlineTour: 'Online tournament', onlineTourSub: 'with real players', withFriends: 'With friends (room)', onlineShort: 'Online',
    rounds: 'Rounds:', pickMode: 'Mode:', roomSet: 'Room settings', format: 'Format:', fTour: '🏆 Tournament', fSeries: '🎮 Single mode', ok: 'Done',
    enter: 'Enter', promoPh: 'Secret code', badCode: 'No such code', codeNet: 'No connection to the server — codes need internet', codeWait: 'Too many tries, wait a minute', codeOk: (n) => `🎉 Unlocked: ${n}!`, codeCoins: (n) => `🎉 +${n} 🪙 gold!`, codeHad: 'You already have it — equipped!',
    lockClicker: '🎣 Given for completing the simulator', lockCode: '🔑 Unlocked with a secret code', lkClicker: '🎣 for completing the simulator', lkCode: '🔑 secret code',
    tabs: 'Skin', tabc: 'Color', tabp: 'Pattern', tabh: 'Hat', tabe: 'Eyewear', tabt: 'Trail',
    dash: 'DASH', go: 'GO!', round: 'Round', draw: 'Draw!', youWon: 'YOU WIN!', fell: 'You are out! 🌊', watching: 'Spectating', nextRound: 'You join next round',
    alive: 'Alive', connecting: 'Connecting…', waking: 'Server is waking up, up to a minute…',
    noServer: 'Server unavailable. Try later or play vs bots.', noRoom: 'Room not found', full: 'Room is full',
    lost: 'Connection lost', old: 'A new version is out — updating…', room: 'Room', copied: 'Code copied!',
    online_n: (n) => `Online now: ${n}`, enterCode: 'Enter a 4-letter code', youTag: 'you',
    lobbyTitle: 'Waiting room', lobbyWait: 'Waiting for friends… need at least 2 players', lobbyAuto: (n) => `Starting in ${n}…`, lobbyAutoWait: 'Looking for opponents…',
    lobbyReady: 'Everyone ready? Hit START!', lobbyWaitHost: 'Waiting for the host to start', start: 'START', share: 'Invite friends', hintLobby: 'While waiting, practice: dash, bump, emotes!',
    sumTour: (n, b) => `🏆 Tournament: ${n} mode${n === 1 ? '' : 's'} · ${b ? '🤖 with bots' : '👥 no bots'}`, sumSeries: (m, n, b) => `${m}${n > 1 ? ' × ' + n : ''} · ${b ? '🤖 with bots' : '👥 no bots'}`, chaosL: '🌪 Chaos', botsL: '🤖 Bots',
    notEnough: 'Not enough coins 🪙', bought: 'Purchased!', achUnlocked: 'Achievement', daily: 'Daily gift', windWarn: '💨 Wind!', earned: 'Earned', level: 'Lv.',
    updating: 'Updating…', joinRoomHint: 'Press “Join” to enter your friends’ room', needTwo: 'Need at least 2 players (or enable bots)',
    pk: ['Power!', 'Freeze!', 'Shockwave!', 'Shield!'], roundN: (a, b) => `Round ${a} of ${b}`, results: 'Round results', nextIn: 'Next in', pts: 'pts',
    finalT: 'Results', winnerIs: 'Winner', yourPlace: (n) => `Your place: ${n}`, caged: 'You are caged! 😅', again: '🔁 Again', toMenu: '🏠 Menu', leave: '✖ Leave', newGameIn: 'New game in',
    laps: (n) => `Lap ${n}/2`, lap: (n) => `Lap ${n}!`, fin: (n) => `Finished — place ${n}!`, pass: 'You have the bomb! Pass it!', youHot: '💣 YOU HAVE THE BOMB!', youSnow: '⛄ YOU ARE A SNOWMAN! Catch the penguins!', hurt: 'Ouch!', fishGot: (n) => `+${n} 🐟`,
    kingHint: '👑 Chase the crown holder!', youCrown: '👑 YOU HAVE THE CROWN! Run!', wait2: 'Waiting for opponents…',
  },
};
let lang = ls.get('lang', null);
if (!lang) { const l = (navigator.language || 'ru').slice(0, 2).toLowerCase(); lang = ['ru', 'uk', 'be', 'kk', 'uz', 'tg', 'hy', 'az', 'ky'].includes(l) ? 'ru' : 'en'; }
const T = (k, ...a) => { const v = (L[lang] && L[lang][k]) ?? L.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const MT = (id) => MODES[id][lang];
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((el) => { el.innerHTML = T(el.dataset.t); });
  document.querySelectorAll('[data-ph]').forEach((el) => { el.placeholder = T(el.dataset.ph); });
  $('bLang').textContent = lang.toUpperCase();
  document.title = T('title');
  if (typeof renderDiff === 'function') renderDiff();
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMOJI = ['😂', '😡', '👍', '🐟', '😎', '🥶', '💀', '❤️'];
const DASH_IC = ['⚡', '🚀', '⚡', '⚡', '❄️', '⚡', '⚡', '⬆️', '⚡', '⚡', '⚡', '⚡', '⚡', '🚀', '⚡', '⚡', '⬆️', '⚡', '💥'];

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
let game = null;
let myId = 0, roomCode = '', roomPub = false, hostId = 0;
let roster = new Map();
let cfg = { kind: 0, len: 3, mode: 0, bots: 0, chaos: 0, diff: 1, picks: [] };
let diffSel = +ls.get('diff', 1); if (![0, 1, 2].includes(diffSel)) diffSel = 1;
let V = null, lastMap = null;
let acc = 0, lastT = 0, connectSeq = 0, roundsPlayed = 0;
const anim = new Map();   // id -> {face, walk, trail}
const emotes = new Map();
let goFlash = 0, windFlash = 0, lastCountNum = 0;
let finalShown = false, finalInfo = null, matchEarn = 0, rKo = 0, flash = 0, shake = 0;
let pendingReload = false, cam = null, camF = { x: 0, y: 0, init: false }, lastMode = -1, lastRound = 0;
let tourSel = Object.assign({ len: 3, bots: 1, kind: 0, picks: [] }, ls.get('tour', {}));
function togglePick(arr, id) { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else if (arr.length < 10) arr.push(id); return arr; }
const noTanks = () => mode === 'online' && [...roster.values()].filter((r) => !r.bot).length > 4;
const tankOff = (m) => m.key === 'tanks' && noTanks();
function pickHtml(arr) { return MODES.map((m) => { const i = arr.indexOf(m.id); return `<button ${tankOff(m) ? 'disabled style="opacity:.3"' : ''} class="${i >= 0 ? 'on' : ''}" data-p="${m.id}" title="${esc(m[lang].name)}">${m.icon}${i >= 0 ? `<i>${i + 1}</i>` : ''}</button>`; }).join(''); }
function tourCfg() { const pk = tourSel.kind === 2 && tourSel.picks.length >= 2; return pk ? { kind: 2, picks: tourSel.picks.slice(), len: tourSel.picks.length, mode: 0 } : { kind: 0, len: tourSel.len }; }
let modeSel = ls.get('modesel', { mode: 0, len: 1 });
let cfgWorking = null;

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

/* joinMode: quick | create | code;  ex: {kind,len,gm,bots,cfg} */
function connect(joinMode, code, ex) {
  ex = ex || {};
  const base = serverBase();
  const back = () => { const sc = ['tourney', 'modes'].find((s) => !$(s).classList.contains('hide')); return sc; };
  if (!base) { showMsg(T('noServer')); toast(T('noServer')); return; }
  GA.init();
  const seq = ++connectSeq;
  const deadline = Date.now() + 75000; // бесплатные хостинги «просыпаются» до минуты
  const t0 = Date.now();
  showMsg(T('connecting')); if (back()) toast(T('connecting'));
  const stale = () => seq !== connectSeq || mode !== 'menu';
  const giveUp = (txt) => { if (seq === connectSeq && mode === 'menu') { showMsg(txt || T('noServer')); toast(txt || T('noServer')); } };

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

    ws.onopen = () => ws.send(JSON.stringify({ t: 'join', v: C.PROTO, mode: joinMode, code, name: P.name || 'Penguin', look: lookNow(), kind: ex.kind || 0, picks: ex.picks || [], len: ex.len || 3, gm: ex.gm || 0, bots: ex.bots === 0 ? 0 : 1, diff: ex.diff == null ? diffSel : ex.diff }));
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
          joined = true; done = true; clearTimeout(to); myId = m.id; roomCode = m.code; roomPub = !!m.pub; startPlay('online');
          if (joinMode === 'create' && ex.cfg) wsSend(Object.assign({ t: 'cfg' }, ex.cfg));
          break;
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
  roster = new Map(m.list.map((r) => [r[0], { name: r[1], look: { c: r[2], p: r[3], h: r[4], e: r[5], t: r[6], s: r[7] }, bot: !!r[8] }]));
  hostId = m.host; cfg = { kind: m.cfg[0], len: m.cfg[1], mode: m.cfg[2], bots: m.cfg[3], chaos: m.cfg[4], diff: m.cfg[5] == null ? 1 : m.cfg[5], picks: m.cfg[6] || [] }; roomPub = !!m.pub;
  if (roster.size > prev && prev > 0 && V && V.ph === 4) GA.play('join');
  lobbySig = '';
}

function parseSnap(m) {
  const map = new Map();
  for (const a of m.p) map.set(a[0], { id: a[0], x: a[1], y: a[2], vx: a[3], vy: a[4], fl: a[5], cd: a[6] / 100, score: a[7], fall: a[8] / 100, a: a[9], b: a[10], face: a[11] / 100 });
  m.map = map; return m;
}
function onSnapshot(m) {
  m.at = performance.now(); parseSnap(m);
  net.snaps.push(m); if (net.snaps.length > 30) net.snaps.shift();
  lastMap = m.map;
  handleEvents(m.e);
  const s = m.map.get(myId);
  if (s) {
    const me = net.me, ph = physOf(m);
    if (!me || m.ph === 0 || m.ph === 5 || !(s.fl & 1) || Math.hypot(me.x - s.x, me.y - s.y) > 260) net.me = { x: s.x, y: s.y, vx: s.vx, vy: s.vy, cdUntil: 0 };
    net.me.srv = s; net.me.srvAt = m.at;
    if (me && me.dashGrace) net.me.dashGrace = me.dashGrace;
    net.me.cdUntil = performance.now() + s.cd * (ph.dashCD || 1) * 1000;
  }
}
const physOf = (m) => (m.ph === 4 ? MODES[0].phys : MODES[m.md].phys);

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
    const me = net.me, last = net.snaps[net.snaps.length - 1];
    if (me && last && (last.ph === 1 || last.ph === 4)) {
      const M = last.ph === 4 ? MODES[0] : MODES[last.md], ph = M.phys;
      if (ph.dashV > 0 && !M.onDash && performance.now() >= me.cdUntil) {
        const iv = getInputVec(); let dx = iv.x, dy = iv.y; const m = Math.hypot(dx, dy);
        if (m < 0.2) { const sp = Math.hypot(me.vx, me.vy); if (sp > 30) { dx = me.vx / sp; dy = me.vy / sp; } else { const a = (anim.get(myId) || { face: 0 }).face; dx = Math.cos(a); dy = Math.sin(a); } }
        me.vx += dx * ph.dashV; me.vy += dy * ph.dashV; me.cdUntil = performance.now() + ph.dashCD * 1000; me.dashGrace = performance.now() + (net.ping || 100) + 120;
      }
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
/* ================= события ================= */
const infoOf = (id) => roster.get(id) || { name: '…', look: { c: 4, p: 0, h: 0, e: 0, t: 0, s: 0 }, bot: false };
const nameOf = (id) => infoOf(id).name;
const colOf = (id) => { const l = infoOf(id).look; return Cos.SKIN_COL[l.s] || Cos.color(l.c); };
const posOf = (id) => (lastMap && lastMap.get(id)) || null;
let curMd = 0;
function feed(html) {
  const f = $('killfeed'); const d = document.createElement('div'); d.innerHTML = html; f.appendChild(d);
  setTimeout(() => d.remove(), 4600); while (f.children.length > 4) f.firstChild.remove();
}
function vibe(ms) { try { if (P.opts.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
const tileXY = (i) => Sim.TILES.list[i] || { x: 0, y: 0 };
let crackSnd = 0;

function handleEvents(evs) {
  for (const e of evs) {
    switch (e[0]) {
      case 'hit':
        Sc.sparks(e[1], e[2], 30, 4 + Math.round(e[3] * 6), 200 + e[3] * 260); Sc.puff(e[1], e[2], 18, 6 + Math.round(e[3] * 8), 140 + e[3] * 240);
        GA.play('hit', e[3]);
        if (e[4] === myId || e[5] === myId) { shake = Math.max(shake, 6 + e[3] * 12); vibe(20 + e[3] * 40); } else shake = Math.max(shake, e[3] * 5);
        break;
      case 'dash': {
        GA.play('dash'); const p = posOf(e[1]);
        if (p) { Sc.puff(p.x, p.y, 8, 6, 120); if (curMd !== 1) Sc.part({ type: 'scratch', x: p.x, y: p.y, ang: (anim.get(e[1]) || { face: 0 }).face, life: 1.8, col: '#a8c8e2' }); }
        if (e[1] === myId) Pro.stat('dashes');
        break;
      }
      case 'ko': {
        GA.play('ko'); const p = posOf(e[1]);
        if (p) { Sc.ring(p.x, p.y, '#fff', 90); Sc.puff(p.x, p.y, 22, 14, 200, '#bfe6fa'); }
        feed(e[2] ? `<span style="color:${colOf(e[2])}">${esc(nameOf(e[2]))}</span> 💥 <span style="color:${colOf(e[1])}">${esc(nameOf(e[1]))}</span>` : `<span style="color:${colOf(e[1])}">${esc(nameOf(e[1]))}</span> ${e[3] ? '💫' : '🌊'}`);
        if (e[1] === myId) { GA.play('lose'); flash = 0.3; Pro.stat('falls'); vibe(80); }
        if (e[2] === myId && e[2] !== e[1]) {
          rKo++; Pro.stat('ko'); Pro.statMax('bestKoRound', rKo); Pro.earn(3); matchEarn += 3; refreshProfileUI();
          if (p) Sc.popup(p.x, p.y, 70, '+8 🪙', '#ffe08a'); GA.play('coin'); shake = Math.max(shake, 10);
        }
        break;
      }
      case 'splash': Sc.ring(e[1], e[2], '#bfe6fa', 110); Sc.puff(e[1], e[2], 10, 12, 160, '#8fd0f5'); GA.play('splash'); break;
      case 'pick': {
        const k = e[4] | 0; GA.play(k === 3 ? 'shield' : 'pick'); Sc.puff(e[2], e[3], 30, 12, 160, `rgb(${Sc.PK[k].c})`);
        const p = posOf(e[1]); if (p) Sc.popup(p.x, p.y, 110, T('pk')[k], '#fff');
        if (e[1] === myId) Pro.stat('picks');
        break;
      }
      case 'fish': {
        const p = posOf(e[1]); GA.play('pick'); Sc.puff(e[2], e[3], 20, 10, 140, e[4] === 3 ? '#ffe35a' : '#ffb44d');
        if (p) Sc.popup(p.x, p.y, 110, T('fishGot', e[4]), e[4] === 3 ? '#ffe35a' : '#fff');
        if (e[1] === myId) Pro.stat('picks');
        break;
      }
      case 'wallsw': GA.play('hit'); shake = Math.max(shake, 6); break;
      case 'snow': Sc.puff(e[1], e[2], 26, 10, 200, '#ffffff'); Sc.ring(e[1], e[2], '#bfe6fa', 160); GA.play('hit'); break;
      case 'freeze': Sc.ring(e[1], e[2], '#9fe6ff', 300, 0.9); for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, s = 100 + Math.random() * 220; Sc.part({ type: 'star', x: e[1], y: e[2], z: 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 80, life: 0.8, r: 6, col: '#c8f3ff', rot: Math.random() * 6 }); } GA.play('freeze'); shake = Math.max(shake, 6); break;
      case 'shock': Sc.ring(e[1], e[2], '#ffae5c', 330, 0.7); Sc.ring(e[1], e[2], '#fff', 220, 0.5); GA.play('shock'); shake = Math.max(shake, 14); break;
      case 'wind': windFlash = performance.now() + 1700; GA.play('wind'); break;
      case 'go': GA.play('go'); goFlash = performance.now() + 900; rKo = 0; break;
      case 'start': matchEarn = 0; finalShown = false; finalInfo = null; rKo = 0; roundsPlayed = 0; break;
      case 'lobby': finalShown = false; finalInfo = null; break;
      case 'mode': Sc.clearParts(); rKo = 0; camF.init = false; GA.play('join'); break;
      case 'res': {
        const my = e[1].find((r) => r[0] === myId); roundsPlayed++;
        if (my) {
          const gain = 2 + my[2] * 2; Pro.earn(gain); matchEarn += gain;
          if (my[1] === 1) { Pro.stat('roundWins'); Pro.modeWin(e[2]); Pro.earn(8); matchEarn += 8; GA.play('win'); }
          refreshProfileUI();
        }
        break;
      }
      case 'final': {
        const rk = e[1], n = rk.length, place = rk.indexOf(myId) + 1;
        finalInfo = { place, n, kind: e[2], first: rk[0] };
        if (place > 0) {
          Pro.stat('matches'); Pro.earn(8); matchEarn += 8;
          if (e[2] === 0) Pro.stat('tours');
          if (place === 1) { Pro.stat('matchWins'); Pro.earn(25); matchEarn += 25; if (e[2] !== 1) Pro.stat('tourWins'); yLeaderboard(P.stats.matchWins); }
          if (place <= 3 && e[2] !== 1 && n >= 3) Pro.stat('podium');
          if (mode === 'online' && !roomPub && [...roster.values()].filter((r) => !r.bot).length >= 2) Pro.stat('friendMatches');
          if (place === n && n > 1) setTimeout(() => toast(T('caged')), 900);
          refreshProfileUI();
        }
        GA.play(place === 1 ? 'win' : 'lose'); if (place === 1) flash = 0.3;
        break;
      }
            case 'throw': { GA.play('throw'); const p = posOf(e[1]); if (p) Sc.puff(p.x, p.y, 30, 5, 80, '#fff'); break; }
      case 'snowpuff': Sc.puff(e[1], e[2], 30, 8, 120, '#fff'); break;
      case 'snowhit': { Sc.puff(e[1], e[2], 40, 10, 150, '#fff'); Sc.sparks(e[1], e[2], 40, 4, 160); GA.play('hit', 0.5); if (e[3] === myId) { shake = Math.max(shake, 10); vibe(40); } break; }
      case 'tfire': { GA.play('throw'); Sc.puff(e[2], e[3], 36, 6, 120, '#ffd9a0'); Sc.sparks(e[2], e[3], 20, 5, 140); break; }
      case 'tspark': Sc.sparks(e[1], e[2], 24, 4, 120); Sc.puff(e[1], e[2], 20, 5, 90, '#ddd'); break;
      case 'thit': { Sc.puff(e[1], e[2], 60, 12, 170, '#ff9d4d'); Sc.sparks(e[1], e[2], 60, 7, 260); Sc.ring(e[1], e[2], '#ff9d4d', 160, 0.5); GA.play('hit', 0.8); if (e[3] === myId) { shake = Math.max(shake, 16); vibe(80); } break; }
      case 'trespawn': { Sc.ring(e[1], e[2], '#9be8ff', 140, 0.6); Sc.sparks(e[1], e[2], 24, 5, 160); break; }
      case 'fgrab': { GA.play('shock'); if (e[1] === myId) toast('🚩 ' + T('gotFlag')); break; }
      case 'fdrop': Sc.ring(e[1], e[2], '#ffffff', 130, 0.6); break;
      case 'fback': GA.play('click'); break;
      case 'fcap': { Sc.ring(e[3], e[4], e[1] ? '#3fa0ff' : '#ff5d5d', 260, 0.9); Sc.sparks(e[3], e[4], 50, 9, 300); GA.play('win'); toast((e[1] ? '🔵 ' : '🔴 ') + T('flagCap')); break; }
      case 'crown': { Sc.ring(e[1], e[2], '#ffd23f', 170, 0.7); Sc.sparks(e[1], e[2], 30, 8, 220); GA.play('shock'); if (e[3] === myId) toast(T('youCrown')); break; }
      case 'goal': { Sc.ring(e[1], e[2], '#ffffff', 200, 0.8); Sc.sparks(e[1], e[2], 40, 8, 260); GA.play(e[3] === myId ? 'win' : 'pick'); Sc.popup(e[1], e[2], 100, '+1', '#ffd23f'); break; }
      case 'back': { const p = posOf(e[1]); if (p) Sc.puff(p.x, p.y, 8); GA.play('hit'); if (e[1] === myId) { toast('🔴 ' + (lang === 'ru' ? 'Двигался на красный! Назад на старт' : 'Moved on red! Back to start')); shake = Math.max(shake, 10); } break; }
      case 'stop': GA.play('go'); break;
      case 'judge': GA.play('splash'); break;
      case 'sink': GA.play('crack'); break;
      case 'red': case 'warn': GA.play('tick'); break;
      case 'pass': { Sc.ring(e[1], e[2], '#ff8a1c', 160, 0.6); Sc.sparks(e[1], e[2], 40, 8, 240); GA.play('shock'); if (e[3] === myId) toast(T('pass')); break; }
      case 'boom': { Sc.part({ type: 'boom', x: e[1], y: e[2], z: 30, life: 0.8, gr: 300 }); Sc.ring(e[1], e[2], '#ffae5c', 300, 0.7); Sc.puff(e[1], e[2], 30, 30, 260, '#555', 6); GA.play('boom'); shake = Math.max(shake, 22); vibe(120); break; }
      case 'crack': { const t = tileXY(e[1]); Sc.puff(t.x, t.y, 10, 4, 60, '#dff4ff'); if (performance.now() - crackSnd > 90) { crackSnd = performance.now(); GA.play('crack'); } break; }
      case 'tile': { const t = tileXY(e[1]); for (let i = 0; i < 5; i++) Sc.chunk(t.x + (Math.random() - 0.5) * 80, t.y + (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80); Sc.ring(t.x, t.y, '#bfe6fa', 120); GA.play('splash'); break; }
      case 'hop': { GA.play('hop'); const p = posOf(e[1]); if (p) Sc.puff(p.x, p.y, 4, 6, 100, '#fff'); break; }
      case 'hurt': { Sc.sparks(e[2], e[3], 40, 8, 240); Sc.popup(e[2], e[3], 100, '💔', '#ff6b8b'); GA.play('hit', 0.7); if (e[1] === myId) { shake = Math.max(shake, 14); flash = 0.2; vibe(70); } break; }
      case 'drift': { Sc.puff(e[1], e[2], 70, 14, 220, '#fff'); Sc.sparks(e[1], e[2], 30, 6, 220); GA.play('hit', 0.6); if (e[3] === myId) { shake = Math.max(shake, 10); vibe(40); } break; }
      case 'pad': { GA.play('pad'); const p = posOf(e[1]); if (p) Sc.sparks(p.x, p.y, 10, 8, 200); break; }
      case 'lap': { GA.play('lap'); if (e[1] === myId) toast('🏁 ' + T('lap', e[2])); break; }
      case 'finish': { GA.play(e[1] === myId ? 'win' : 'lap'); feed(`🏁 <span style="color:${colOf(e[1])}">${esc(nameOf(e[1]))}</span> — ${e[2]}`); if (e[1] === myId) toast('🏁 ' + T('fin', e[2])); break; }
    }
  }
}

/* ================= жизненный цикл ================= */
const SCREENS = ['menu', 'tourney', 'modes', 'clicker', 'wardrobe', 'achs', 'settings', 'account'];
function showScreen(id) {
  for (const s of SCREENS) $(s).classList.toggle('hide', s !== id);
  if (id === 'clicker') Clicker.open();
  if (id === 'menu') showMsg('');
}

function startPlay(m) {
  mode = m; showMsg('');
  showScreen(null); $('hud').classList.remove('hide');
  anim.clear(); emotes.clear(); Sc.clearParts(); V = null; lastMap = null; acc = 0; lastT = performance.now(); finalShown = false; finalInfo = null; matchEarn = 0; rKo = 0; camF.init = false;
  $('killfeed').innerHTML = ''; lobbySig = ''; $('roomline').innerHTML = '';
  for (const id of ['intro', 'over', 'final', 'finalTop', 'lobby']) $(id).classList.add('hide');
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

function startOffline(c) {
  GA.init();
  c = Object.assign({ kind: 0, len: 3, mode: 0, chaos: 0, diff: diffSel }, c || {}, { bots: 1 });
  game = new Game({ lobby: false });
  game.applyCfg(c);
  const p = game.addPlayer(P.name || 'Penguin', lookNow(), false);
  myId = p.id; roster = new Map(); game.startMatch();
  startPlay('offline');
}

function leaveToMenu() {
  const hadRounds = roundsPlayed >= 2;
  clearInterval(net.timer); clearInterval(net.pingTimer);
  if (net.ws) { const w = net.ws; net.ws = null; try { w.close(); } catch (e) {} }
  document.body.classList.remove('fin');
  mode = 'menu'; game = null; V = null; lastMap = null; keys.clear(); joy.active = false; joy.id = -1; myId = 0; roster = new Map();
  $('hud').classList.add('hide'); showScreen('menu'); $('emobtns').classList.add('hide'); $('cfgSheet').classList.add('hide');
  for (const id of ['intro', 'over', 'final', 'finalTop', 'lobby']) $(id).classList.add('hide');
  Sc.clearParts(); yPlay(false); fetchOnline(); refreshProfileUI(); GA.setIntensity(0);
  if (pendingReload) { location.reload(); return; }
  if (hadRounds) { roundsPlayed = 0; yAd(() => {}); }
}
$('bExit').addEventListener('click', () => { GA.play('click'); leaveToMenu(); });

/* ================= представление мира ================= */
function makeView(last, a, b, k, over) {
  const players = [];
  for (const [id, pb] of last.map) {
    const pa = a.map.get(id) || pb, pb2 = b.map.get(id) || pb;
    let x, y;
    if (over > 0) { x = pb.x + pb.vx * over; y = pb.y + pb.vy * over; }
    else { x = pa.x + (pb2.x - pa.x) * k; y = pa.y + (pb2.y - pa.y) * k; }
    const f = pb.fl;
    players.push({ id, x, y, vx: pb.vx, vy: pb.vy, alive: !!(f & 1), dash: !!(f & 2), boost: !!(f & 4), spec: !!(f & 8), frozen: !!(f & 16), shield: !!(f & 32), hot: !!(f & 64), inv: !!(f & 128), airF: !!(f & 256), cd: pb.cd, score: pb.score, fall: pb.fall, a: pb.a, b: pb.b, fin: pb.b, faceRaw: pb.face });
  }
  return { ph: last.ph, tm: last.tm, el: last.el, rd: last.rd, rs: last.rs, md: last.md, w: last.w, ex: last.ex || {}, o: last.o || [], lr: last.lr, fr: last.fr, players };
}

function pushC(me, ox, oy, orad, bounce, damp) {
  const dx = me.x - ox, dy = me.y - oy, d = Math.hypot(dx, dy), min = orad + PR * 0.85;
  if (d < min && d > 0) {
    const nx = dx / d, ny = dy / d; me.x = ox + nx * min; me.y = oy + ny * min;
    const vn = me.vx * nx + me.vy * ny; if (vn < 0) { me.vx -= (1 + bounce) * vn * nx; me.vy -= (1 + bounce) * vn * ny; }
    me.vx *= damp; me.vy *= damp;
  }
}
const WALL_R = { 2: 350, 3: 345, 4: 350, 5: 350, 7: 350, 8: 350, 9: 350, 10: 348, 12: 350, 13: 430, 14: 348, 16: 350, 17: 355 };
function wallFix(me, md) {
  if (md === 18) { Sim.tankWalls(me); return; }
  if (md === 9) { (Sim.YETI.layouts[curW] || Sim.YETI).push(me); return; }
  if (md === 3) {
    const CR = Sim.CROWN, lx = CR.AW - PR * 0.9, ly = CR.AH - PR * 0.9;
    if (me.x > lx) { me.x = lx; if (me.vx > 0) me.vx *= -0.55; } else if (me.x < -lx) { me.x = -lx; if (me.vx < 0) me.vx *= -0.55; }
    if (me.y > ly) { me.y = ly; if (me.vy > 0) me.vy *= -0.55; } else if (me.y < -ly) { me.y = -ly; if (me.vy < 0) me.vy *= -0.55; }
    for (const o of CR.pillars) pushC(me, o.x, o.y, o.r, 0.5, 1);
    return;
  }
  if (md === 1) {
    const mpi = V && V.ex && V.ex.mp != null ? V.ex.mp : 0;
    RACE.edge(me, RACE.track(mpi));
    return;
  }
  const R = md === -1 ? 360 : WALL_R[md];
  if (R) {
    const d = Math.hypot(me.x, me.y), lim = R - PR * 0.6;
    if (d > lim) { const nx = me.x / d, ny = me.y / d; me.x = nx * lim; me.y = ny * lim; const vn = me.vx * nx + me.vy * ny; if (vn > 0) { me.vx -= 1.5 * vn * nx; me.vy -= 1.5 * vn * ny; } }
  }
  if (md === 4) for (const o of SNOW_OBS) pushC(me, o.x, o.y, o.r, 0.25, 1);
}

let curW = 0;
function buildOnline(now, dt) {
  const sn = net.snaps; if (!sn.length) return null;
  const last = sn[sn.length - 1];
  curW = (last.ex && last.ex.w) | 0;
  const rt = now - 110;
  let a = sn[0], b = sn[0];
  for (let i = sn.length - 1; i >= 0; i--) { if (sn[i].at <= rt) { a = sn[i]; b = sn[Math.min(i + 1, sn.length - 1)]; break; } a = sn[i]; b = sn[i]; }
  let k = 0; if (b !== a && b.at > a.at) k = Math.min(1, Math.max(0, (rt - a.at) / (b.at - a.at)));
  const over = rt > last.at ? Math.min(0.15, (rt - last.at) / 1000) : 0;
  const v = makeView(last, a, b, k, over);
  curMd = last.md;
  const me = net.me, mp = v.players.find((p) => p.id === myId);
  if (me && mp && (last.ph === 1 || last.ph === 4) && mp.alive && !mp.spec) {
    const md = last.ph === 4 ? -1 : last.md, M = md < 0 ? MODES[0] : MODES[md], ph = M.phys;
    const iv = mp.frozen ? { x: 0, y: 0 } : getInputVec();
    let slowK = 1; if (md === 1) for (const o of last.o) if (o[0] === 11 && Math.hypot(me.x - o[2], me.y - o[3]) < o[4]) { slowK = 0.45; break; }
    const kk0 = ph.acc * (mp.boost ? (ph.boostAcc || 1.15) : 1) * (mp.hot ? (md === 3 ? 1.1 : 1.2) : 1) * slowK * (md === 9 && last.ex && last.ex.S && last.ex.S.includes(myId) ? 1.06 : 1);
    me.vx += iv.x * kk0 * dt; me.vy += iv.y * kk0 * dt;
    const f = Math.exp(-ph.fric * (mp.frozen ? 2.4 : 1) * dt); me.vx *= f; me.vy *= f; me.x += me.vx * dt; me.y += me.vy * dt;
    wallFix(me, md);
    if (me.srv) {
      // сервер видит нас с задержкой ≈ пинг/2 (+ ввод идёт ещё пинг/2) — экстраполируем на это время, иначе при пинге 200 тянет назад
      const lat = Math.min(0.3, (net.ping || 0) / 1000);
      const age = Math.min(0.5, (now - me.srvAt) / 1000 + lat);
      const tx = me.srv.x + me.srv.vx * age, ty = me.srv.y + me.srv.vy * age;
      const gr = now < (me.dashGrace || 0) ? 0.15 : 1; // после рывка сервер ещё не знает о нём — не тянем назад
      const kp = Math.min(1, dt * 6 * gr);
      me.x += (tx - me.x) * kp; me.y += (ty - me.y) * kp;
      const kv = Math.min(1, dt * 3 * gr);
      me.vx += (me.srv.vx - me.vx) * kv; me.vy += (me.srv.vy - me.vy) * kv;
    }
    mp.x = me.x; mp.y = me.y; mp.vx = me.vx; mp.vy = me.vy;
    if (ph.dashV > 0 && !M.onDash) mp.cd = Math.max(0, (me.cdUntil - now) / (ph.dashCD * 1000));
  } else if (me && mp) { me.x = mp.x; me.y = mp.y; me.vx = mp.vx; me.vy = mp.vy; }
  return v;
}

/* ================= рендер ================= */
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
window.addEventListener('resize', resize); resize();
const wrapPi = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

function spawnTrails(p, an, dt, now) {
  const tr = p.look.t | 0; if (!tr || !p.alive) return;
  const sp = Math.hypot(p.vx, p.vy); if (sp < 130) return;
  an.trail = (an.trail || 0) + dt; if (an.trail < 0.045) return; an.trail = 0;
  const bx = p.x - Math.cos(an.face) * 22, by = p.y - Math.sin(an.face) * 22, rv = () => (Math.random() - 0.5) * 50;
  if (tr === 1) Sc.part({ type: 'dot', x: bx, y: by, z: 8, vx: rv(), vy: rv(), vz: 40, life: 0.6, r: 5 + Math.random() * 4, col: '#fff' });
  else if (tr === 2) Sc.part({ type: 'heart', x: bx, y: by, z: 20, vx: rv(), vy: rv() * 0.4, vz: 50, life: 0.9, r: 7 + Math.random() * 3, col: '#ff5fa0' });
  else if (tr === 3) Sc.part({ type: 'star', x: bx, y: by, z: 15, vx: rv(), vy: rv(), vz: 50, life: 0.8, r: 7, col: '#ffe35a', rot: Math.random() * 6 });
  else if (tr === 4) Sc.part({ type: 'fire', x: bx, y: by, z: 14, vx: rv(), vy: rv(), vz: 30, life: 0.45, r: 10 + Math.random() * 4, col: Math.random() < 0.5 ? '#ff8a1c' : '#ff4a1c' });
  else if (tr === 5) Sc.part({ type: 'dot', x: bx, y: by, z: 12, vx: 0, vy: 0, vz: 0, life: 0.7, r: 8, col: `hsl(${(now / 4) % 360},95%,60%)` });
  else if (tr === 6) Sc.part({ type: 'glyph', txt: '🫧', x: bx, y: by, z: 10, vx: rv() * 0.6, vy: rv() * 0.6, vz: 60, life: 0.9, r: 6 });
  else if (tr === 7) Sc.part({ type: 'star', x: bx, y: by, z: 22, vx: rv() * 1.4, vy: rv() * 1.4, vz: 120, life: 0.8, r: 5 + Math.random() * 3, col: `hsl(${Math.random() * 360},95%,62%)`, rot: Math.random() * 6 });
  else if (tr === 8) Sc.part({ type: 'glyph', txt: '⚡', x: bx, y: by, z: 18, vx: rv() * 0.5, vy: rv() * 0.5, vz: 20, life: 0.4, r: 7 });
  else if (tr === 9) Sc.part({ type: 'glyph', txt: ['🍃', '🍂'][Math.random() * 2 | 0], x: bx, y: by, z: 24, vx: rv() * 0.8, vy: rv() * 0.8, vz: 10, life: 1.0, r: 6 });
  else if (tr === 10) Sc.part({ type: 'glyph', txt: '🌸', x: bx, y: by, z: 24, vx: rv() * 0.8, vy: rv() * 0.8, vz: 25, life: 1.0, r: 6 });
  else if (tr === 11) Sc.part({ type: 'dot', x: bx, y: by, z: 14, vx: rv() * 0.4, vy: rv() * 0.4, vz: 20, life: 0.9, r: 10 + Math.random() * 5, col: 'rgba(210,215,225,.7)' });
  else if (tr === 12) Sc.part({ type: 'glyph', txt: '🐟', x: bx, y: by, z: 16, vx: rv() * 0.5, vy: rv() * 0.5, vz: 40, life: 0.8, r: 6 });
  else if (tr === 13) Sc.part({ type: 'glyph', txt: ['🎵', '🎶'][Math.random() * 2 | 0], x: bx, y: by, z: 24, vx: rv() * 0.6, vy: rv() * 0.6, vz: 35, life: 0.9, r: 6 });
  else if (tr === 14) Sc.part({ type: 'fire', x: bx, y: by, z: 14, vx: rv() * 2, vy: rv() * 2, vz: 60, life: 0.35, r: 4 + Math.random() * 2, col: Math.random() < 0.5 ? '#fff3a0' : '#ffd23f' });
  else if (tr === 15) Sc.part({ type: 'star', x: bx, y: by, z: 20, vx: rv() * 0.8, vy: rv() * 0.8, vz: 30, life: 1.0, r: 5 + Math.random() * 4, col: ['#b58cff', '#6fb4ff', '#ff8fe0', '#fff'][Math.random() * 4 | 0], rot: Math.random() * 6 });
}

function sceneList(now, dt) {
  const list = [];
  for (const p of V.players) {
    const info = infoOf(p.id);
    let an = anim.get(p.id); if (!an) { an = { face: p.faceRaw || Math.PI / 2, walk: 0, trail: 0, airOn: false, airT: 0 }; anim.set(p.id, an); }
    const sp = Math.hypot(p.vx, p.vy);
    let target = p.faceRaw;
    if (p.id === myId && p.alive && !p.frozen) { const iv = getInputVec(); if (Math.hypot(iv.x, iv.y) > 0.15) target = Math.atan2(iv.y, iv.x); }
    an.face += wrapPi(target - an.face) * Math.min(1, dt * 14); an.walk += sp * dt * 0.06;
    let air = 0;
    if (p.airF) { if (!an.airOn) { an.airOn = true; an.airT = now; } air = Math.min(1, (now - an.airT) / 550); } else an.airOn = false;
    const q = Object.assign({}, p, { name: info.name, look: info.look, face: an.face, walk: an.walk, isMe: p.id === myId, ring: p.id === myId && p.alive && !p.spec, air });
    spawnTrails(q, an, dt, now);
    const em = emotes.get(p.id); if (em && em.until > now) q.emote = { e: EMOJI[em.e], k: (em.until - now) / 2200 };
    list.push(q);
  }
  return list;
}

function render(now, dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const t = now / 1000;
  if (mode === 'menu' || !V) { Sc.drawMenuBg(ctx, W, H, t, dt); return; }
  if (V.ph === 3 && V.fr && V.fr.length) {
    const rank = [];
    V.fr.forEach((id, i) => { const pl = V.players.find((q) => q.id === id), inf = infoOf(id); rank.push({ id, name: inf.name, look: inf.look, score: pl ? pl.score : 0, place: i + 1, isMe: id === myId }); });
    Sc.drawPodium(ctx, W, H, rank, t, dt, { confetti: true });
    return;
  }
  const lobby = V.ph === 4, md = lobby ? 0 : V.md, M = MODES[md];
  const list = sceneList(now, dt);
  const view = lobby ? { r: 400 } : M.view;
  if (view.follow) {
    let tg = list.find((p) => p.id === myId && p.alive && !p.spec);
    if (!tg) tg = list.filter((p) => p.alive && !p.spec).sort((p, q) => q.a - p.a)[0];
    const tx = tg ? tg.x : 0, ty = tg ? tg.y : 0;
    if (!camF.init) { camF.x = tx; camF.y = ty; camF.init = true; } else { const kc = Math.min(1, dt * 7); camF.x += (tx - camF.x) * kc; camF.y += (ty - camF.y) * kc; }
  }
  if (shake > 0.2) shake *= Math.pow(0.001, dt); else shake = 0;
  cam = Sc.makeCam(W, H, view, camF.x, camF.y, shake);
  Sc.draw(ctx, cam, { lobby, md, ex: V.ex, phase: V.ph, el: V.el, objs: V.o, players: list, me: myId }, t, dt);
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.6); }
  if (mode !== 'menu' && joy.active) {
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(joy.bx, joy.by, 56, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.kx, joy.ky, 26, 0, TAU); ctx.fill();
  }
}

/* ================= HUD ================= */
let hudT = 0, lobbySig = '', introSig = '', overSig = '', finalSig = '', dashSig = '';
const MEDALS = ['🥇', '🥈', '🥉'];
const SURV = [0, 4, 5, 6, 7, 8, 9, 11, 12, 15, 16, 17];
function updateHud(now) {
  if (!V) return;
  if (now - hudT < 90) return; hudT = now;
  const me = V.players.find((p) => p.id === myId);
  const ph = V.ph, lobby = ph === 4, md = V.md, M = MODES[md];
  const parts = V.players.filter((p) => !p.spec), aliveN = parts.filter((p) => p.alive).length;
  $('alive').textContent = lobby ? '🧊 ' + T('lobbyTitle') : ph === 3 ? '' : T('roundN', Math.min(V.rd, V.rs), V.rs) + (cfg.chaos && mode === 'online' ? ' 🌪' : '');
  if (mode === 'online') { const pv = $('pingv'); if (pv) pv.textContent = `· ${net.ping}ms`; }
  // метка режима и таймер
  const showMode = !lobby && ph !== 3;
  let tag = '', tm = '', low = false;
  if (showMode) {
    tag = `${M.icon} ${MT(md).name}`;
    if (md === 18 && V.ex.c) tag += ` · 🔴 ${V.ex.c[0]} : ${V.ex.c[1]} 🔵`;
    if (ph === 1 && SURV.includes(md)) tag += ` · ${T('alive')} ${aliveN}/${parts.length}`;
    if (md === 1 && me && !me.spec) tag += me.b ? ` · 🏁 ${me.b}` : ` · ${T('laps', Math.min(Sim.RACE.LAPS, Math.floor(me.a / 100) + 1))}`;
    if (ph === 1) {
      if (M.timed) { const s = Math.ceil(V.tm); tm = '⏱ ' + s; low = s <= 10; }
      else if (md === 1 && V.ex.fl >= 0) { tm = '🏁 ' + Math.ceil(V.ex.fl); low = true; }
      else if (md === 5 && V.ex.f != null) { tm = '💣 ' + Math.ceil(V.ex.f); low = V.ex.f < 3.5; }
      else if (md === 12 && V.ex.hi === 1) { tm = '⏱ ' + Math.ceil(V.ex.t); low = V.ex.t < 1.5; }
    }
  }
  if ($('modeTag').textContent !== tag) $('modeTag').textContent = tag;
  $('modeTag').classList.toggle('hide', !tag);
  const te = $('timer'); if (te.textContent !== tm) te.textContent = tm; te.classList.toggle('low', low);
  // таблица очков
  $('score').classList.toggle('hide', lobby || ph === 3);
  if (!lobby && ph !== 3) {
    const lrMap = new Map((V.lr || []).map((r) => [r[0], r[2]]));
    const live = ph === 1 && !!M.live;
    const liveTx = (p) => `${M.live}${p.a}${M.liveSuf || ''} · `;
    const sorted = V.players.filter((p) => !p.spec || p.score).sort((a, b) => (live ? b.a - a.a : 0) || b.score - a.score).slice(0, 6);
    $('score').innerHTML = sorted.map((p) => { const inf = infoOf(p.id); return `<div class="${p.id === myId ? 'me' : ''} ${!p.alive && ph === 1 && !p.spec ? 'dead' : ''}"><i style="background:${(Cos.SKIN_COL[inf.look.s] || Cos.color(inf.look.c))}"></i>${esc(inf.name)}<b>${live ? `<span style="font-size:12px;opacity:.9">${liveTx(p)}</span>` : ''}${p.score}${lrMap.has(p.id) ? ` <u style="text-decoration:none;color:#9be8b0;font-size:12px">+${lrMap.get(p.id)}</u>` : ''}</b></div>`; }).join('');
  }
  // кнопка действия
  const dSig = (lobby ? -1 : md) + lang;
  if (dSig !== dashSig) { dashSig = dSig; $('dashIc').textContent = lobby ? '⚡' : DASH_IC[md]; $('dashTx').textContent = lobby ? T('dash') : MT(md).btn; }
  const cd = me ? me.cd : 0; $('dash').style.setProperty('--p', `${Math.round((1 - cd) * 100)}%`); $('dash').classList.toggle('cd', cd > 0.02);
  $('dash').classList.toggle('hide', ph === 3);
  $('emo').classList.toggle('hide', ph === 3);

  // баннер
  let txt = '', sub = '';
  if (ph === 0) {
    const n = Math.ceil(V.tm - 0.2); txt = n > 0 ? String(n) : T('go'); sub = `${M.icon} ${MT(md).name}`;
    if (n !== lastCountNum && n > 0) { GA.play('tick'); lastCountNum = n; }
  } else if (ph === 1) {
    if (now < goFlash) txt = T('go');
    else if (me && me.spec) sub = T('nextRound');
    else if (md === 18 && me && !me.alive) sub = T('tankDead', (V.ex.D && V.ex.D[myId]) || 1);
    else if (me && !me.alive && md !== 1) sub = T('fell') + ' · ' + T('watching');
    else if (md === 5 && me && me.hot) sub = T('youHot');
    else if (md === 9 && me && V.ex && V.ex.S && V.ex.S.includes(myId)) sub = T('youSnow');
    else if (md === 18 && V.ex && V.ex.T && V.ex.T[myId] != null && (V.el < 7 || (V.ex.fl && (V.ex.fl[1 - V.ex.T[myId]][2] === myId || V.ex.fl[V.ex.T[myId]][2])))) { const t0 = V.ex.T[myId], hs = M[lang].hints; sub = (t0 ? '🔵 ' : '🔴 ') + (V.ex.fl[1 - t0][2] === myId ? hs[1] : V.ex.fl[t0][2] ? hs[2] : hs[0]); }
    else if (M[lang] && M[lang].hints && V.ex && V.ex.hi != null && M[lang].hints[V.ex.hi]) sub = M[lang].hints[V.ex.hi];
    else if (md === 3 && me && me.hot) sub = T('youCrown');
    else if (md === 3 && V.el < 6) sub = T('kingHint');
  }
  const bn = $('banner'); const html = txt + (sub ? `<small>${sub}</small>` : '');
  bn.classList.toggle('subonly', !txt);
  if (bn.innerHTML !== html) bn.innerHTML = html;
  $('windmsg').textContent = V.ex && V.ex.wd && V.ex.wd[1] === 1 ? T('windWarn') : '';
  GA.setIntensity(ph === 1);
  updateIntro(); updateOver(me); updateFinal(me); updateLobby();
}

function updateIntro() {
  const box = $('intro');
  if (V.ph !== 5) { box.classList.add('hide'); introSig = ''; return; }
  const sig = V.rd + '|' + V.md + lang;
  if (sig !== introSig) {
    introSig = sig; const M = MODES[V.md];
    box.innerHTML = `<div class="rd">${T('roundN', V.rd, V.rs)}</div><div class="ic">${M.icon}</div><h3>${esc(MT(V.md).name)}</h3><p>${esc(MT(V.md).goal)}</p>`;
    box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
  }
  box.classList.remove('hide');
}

function updateOver(me) {
  const box = $('over');
  if (V.ph !== 2 || !V.lr) { box.classList.add('hide'); overSig = ''; return; }
  const last = V.rd >= V.rs;
  const w = V.lr.find((r) => r[1] === 1);
  const sig = V.rd + '|' + V.lr.map((r) => r[0] + ':' + r[2]).join() + lang + Math.ceil(V.tm);
  if (sig !== overSig) {
    overSig = sig;
    const rows = V.lr.map((r) => {
      const inf = infoOf(r[0]), pl = V.players.find((q) => q.id === r[0]);
      return `<div class="r ${r[0] === myId ? 'me' : ''}"><span>${MEDALS[r[1] - 1] || r[1]}</span><i style="background:${(Cos.SKIN_COL[inf.look.s] || Cos.color(inf.look.c))}"></i><em>${esc(inf.name)}${r[0] === myId ? ' (' + T('youTag') + ')' : ''}</em><u>+${r[2]}</u><b>${pl ? pl.score : ''}</b></div>`;
    }).join('');
    const wn = w ? (w[0] === myId ? T('youWon') : '🏆 ' + esc(nameOf(w[0]))) : T('draw');
    box.innerHTML = `<h2>${wn}</h2><div style="font-size:12px;opacity:.8;margin-bottom:4px">${MODES[V.md].icon} ${T('results')} · ${T('roundN', V.rd, V.rs)}</div>${rows}<p>${last ? '🏆 ' : T('nextIn') + ' '}${Math.max(1, Math.ceil(V.tm))}…</p>`;
  }
  box.classList.remove('hide');
}

function updateFinal(me) {
  const box = $('final'), top = $('finalTop');
  document.body.classList.toggle('fin', V.ph === 3);
  if (V.ph !== 3) { box.classList.add('hide'); top.classList.add('hide'); finalSig = ''; return; }
  const fi = finalInfo || { place: 0, n: V.fr ? V.fr.length : 0, first: V.fr && V.fr[0] };
  const wn = fi.first ? esc(nameOf(fi.first)) : '';
  top.innerHTML = `🏆 ${wn}<small>${fi.place ? T('yourPlace', fi.place) + (fi.place === fi.n && fi.n > 1 ? ' · ' + T('caged') : '') : ''}</small>`;
  top.classList.remove('hide');
  const sig = (mode === 'offline' ? 'o' : 'n') + lang + matchEarn;
  if (sig !== finalSig) {
    finalSig = sig;
    box.innerHTML = (matchEarn ? `<div class="earn">${T('earned')}: +${matchEarn} 🪙</div>` : '') +
      (mode === 'offline'
        ? `<div class="rowb"><button class="btn go" data-a="again">${T('again')}</button><button class="btn sub" data-a="menu">${T('toMenu')}</button></div>`
        : `<p>${T('newGameIn')} <span id="fnT"></span>…</p><div class="rowb"><button class="btn sub" data-a="menu">${T('leave')}</button></div>`);
  }
  const ft = $('fnT'); if (ft) ft.textContent = Math.max(1, Math.ceil(V.tm));
  box.classList.remove('hide');
}
$('final').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return; GA.play('click');
  if (b.dataset.a === 'menu') leaveToMenu();
  else if (b.dataset.a === 'again' && game) {
    finalShown = false; finalInfo = null; matchEarn = 0; Sc.clearParts(); game.again(); finalSig = '';
  }
});

/* ---------- комната ожидания ---------- */
function summaryText() { return (cfg.kind === 2 ? T('sumPick', (cfg.picks || []).length, cfg.bots) : cfg.kind ? T('sumSeries', MT(cfg.mode).name, cfg.len, cfg.bots) : T('sumTour', cfg.len, cfg.bots)) + (cfg.bots ? ' · ' + DIFF_IC[cfg.diff == null ? 1 : cfg.diff] : ''); }
function updateLobby() {
  const box = $('lobby');
  if (V.ph !== 4 || mode !== 'online') { box.classList.add('hide'); $('hud').classList.remove('inlobby'); if ($('hint').textContent === T('hintLobby')) $('hint').textContent = ''; return; }
  box.classList.remove('hide'); $('hud').classList.add('inlobby');
  const humans = [...roster.entries()].filter(([, r]) => !r.bot);
  const isHost = hostId === myId;
  const sig = [cfg.diff, roomCode, humans.map(([id, r]) => id + r.name + r.look.c + r.look.s).join(), isHost, cfg.kind, (cfg.picks || []).join(), cfg.len, cfg.mode, cfg.bots, cfg.chaos, roomPub, lang].join('|');
  if (sig !== lobbySig) {
    lobbySig = sig;
    box.innerHTML =
      `<div class="hd">🧊 <span class="code" data-a="share">${roomCode}</span> <button class="mini" data-a="share">📤 ${T('share')}</button></div>` +
      `<div class="pl">${humans.map(([id, r]) => `<span><i style="background:${(Cos.SKIN_COL[r.look.s] || Cos.color(r.look.c))}"></i>${esc(r.name)}${id === hostId ? ' 👑' : ''}${id === myId ? ' ·' + T('youTag') : ''}</span>`).join('')}</div>` +
      `<div class="sum">${summaryText()}${cfg.chaos ? ' · 🌪' : ''}</div>` +
      (isHost && !roomPub ? `<div class="opts"><button class="cfgb" data-a="cfg">⚙️ ${T('roomSet')}</button></div>` : '') +
      `<div class="st" id="lbSt"></div>` +
      (isHost ? `<button class="btn go" id="lbStart" data-a="start">▶ ${T('start')}</button>` : '');
  }
  let st;
  const few = humans.length < 2 && !cfg.bots;
  if (roomPub) st = V.tm > 0 ? T('lobbyAuto', Math.ceil(V.tm)) : (few ? T('wait2') : T('lobbyAutoWait'));
  else st = few ? T('lobbyWait') : isHost ? T('lobbyReady') : T('lobbyWaitHost');
  const el = $('lbSt'); if (el && el.textContent !== st) el.textContent = st;
  const sb = $('lbStart'); if (sb) sb.disabled = few;
  $('hint').textContent = T('hintLobby');
}
$('lobby').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a; GA.play('click');
  if (a === 'share') shareRoom();
  else if (a === 'start') wsSend({ t: 'start' });
  else if (a === 'cfg') openCfg();
});

/* ---------- сложность ботов ---------- */
const DIFF_IC = ['🟢', '🟡', '🔴'];
function diffChips(sel) { return [0, 1, 2].map((i) => `<button class="chip ${sel === i ? 'on' : ''}" data-d="${i}">${DIFF_IC[i]} ${T('diffs')[i]}</button>`).join(''); }
function renderDiff() { for (const id of ['tDiff', 'mDiff', 'menuDiff']) { const el = $(id); if (el) el.innerHTML = diffChips(diffSel); } ls.set('diff', diffSel); }
function onDiffClick(e) { const b = e.target.closest('[data-d]'); if (!b) return; diffSel = +b.dataset.d; GA.play('click'); renderDiff(); }
for (const id of ['tDiff', 'mDiff', 'menuDiff']) $(id).addEventListener('click', onDiffClick);

/* ---------- настройки комнаты (хозяин) ---------- */
function validLen(kind, len) { if (kind === 2) return len; const ok = kind ? [1, 3, 5] : [3, 5, 7]; return ok.includes(len) ? len : 3; }
function openCfg() { cfgWorking = Object.assign({}, cfg); renderCfg(); $('cfgSheet').classList.remove('hide'); }
function pushCfg() { if (cfgWorking.kind === 2) cfgWorking.len = (cfgWorking.picks || []).length || 2; else cfgWorking.len = validLen(cfgWorking.kind, cfgWorking.len); wsSend({ t: 'cfg', kind: cfgWorking.kind, picks: cfgWorking.picks || [], len: cfgWorking.len, mode: cfgWorking.mode, bots: cfgWorking.bots, chaos: cfgWorking.chaos, diff: cfgWorking.diff }); renderCfg(); }
function renderCfg() {
  const c = cfgWorking;
  $('cfK0').textContent = T('tRand'); $('cfK2').textContent = T('tPick'); $('cfK1').textContent = T('fSeries');
  $('cfK0').classList.toggle('on', !c.kind); $('cfK2').classList.toggle('on', c.kind === 2); $('cfK1').classList.toggle('on', c.kind === 1);
  $('cfModeBox').classList.toggle('hide', c.kind !== 1); $('cfPickBox').classList.toggle('hide', c.kind !== 2);
  c.picks = c.picks || []; $('cfPicks').innerHTML = pickHtml(c.picks); $('cfPickInfo').textContent = c.picks.length >= 2 ? T('pickSel', c.picks.length) : T('pickHint');
  $('cfLen').classList.toggle('hide', c.kind === 2); $('cfLenLbl').classList.toggle('hide', c.kind === 2);
  $('cfModes').innerHTML = MODES.map((m) => `<button ${tankOff(m) ? 'disabled style="opacity:.3"' : ''} class="chip ${c.mode === m.id ? 'on' : ''}" data-m="${m.id}" title="${esc(m[lang].name)}">${m.icon}</button>`).join('');
  $('cfLenLbl').textContent = c.kind ? T('rounds') : T('tourLen');
  $('cfLen').innerHTML = (c.kind ? [1, 3, 5] : [3, 5, 7]).map((n) => `<button class="chip ${c.len === n ? 'on' : ''}" data-l="${n}">${n}</button>`).join('');
  $('cfDiff').innerHTML = diffChips(c.diff == null ? 1 : c.diff);
  $('cfBots').textContent = T('botsL') + ': ' + (c.bots ? 'ON' : 'OFF'); $('cfBots').classList.toggle('on', !!c.bots);
  $('cfChaos').textContent = T('chaosL') + ': ' + (c.chaos ? 'ON' : 'OFF'); $('cfChaos').classList.toggle('on', !!c.chaos);
}
$('cfK0').onclick = () => { cfgWorking.kind = 0; pushCfg(); GA.play('click'); };
$('cfK2').onclick = () => { cfgWorking.kind = 2; pushCfg(); GA.play('click'); };
$('cfPicks').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; cfgWorking.picks = togglePick(cfgWorking.picks || [], +b.dataset.p); pushCfg(); GA.play('click'); };
$('cfK1').onclick = () => { cfgWorking.kind = 1; pushCfg(); GA.play('click'); };
$('cfModes').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; cfgWorking.mode = +b.dataset.m; pushCfg(); GA.play('click'); };
$('cfLen').onclick = (e) => { const b = e.target.closest('[data-l]'); if (!b) return; cfgWorking.len = +b.dataset.l; pushCfg(); GA.play('click'); };
$('cfDiff').onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; cfgWorking.diff = +b.dataset.d; pushCfg(); GA.play('click'); };
$('cfBots').onclick = () => { cfgWorking.bots = cfgWorking.bots ? 0 : 1; pushCfg(); GA.play('click'); };
$('cfChaos').onclick = () => { cfgWorking.chaos = cfgWorking.chaos ? 0 : 1; pushCfg(); GA.play('click'); };
$('cfOk').onclick = () => { $('cfgSheet').classList.add('hide'); GA.play('click'); };
/* ================= главный цикл ================= */
const prevCtx = { a: $('prev').getContext('2d'), w: $('wprev').getContext('2d') };
function drawPreview(cvEl, c2, now) {
  const w = cvEl.width; c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, w, w);
  Sc.drawStage(c2, w, w, P.look, now, { u: w * 0.29 });
}

let offPrev = null, offCur = null, offGame = null;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (paused) return;

  if (mode === 'offline' && game) {
    acc += dt;
    let stepped = 0;
    while (acc >= 1 / 60) {
      const iv = getInputVec(); game.setInput(myId, iv.x, iv.y, dashQueued); dashQueued = false;
      game.step(1 / 60); acc -= 1 / 60; stepped++;
    }
    const r = game.takeRoster(); if (r) onRoster(r);
    // шаг симуляции фиксирован (60 Гц), а экран может быть 120/144 Гц — интерполируем между двумя последними шагами, иначе картинка дёргается
    if (stepped || !offCur || offGame !== game) {
      const m = parseSnap(game.snapshot()); m.at = now; lastMap = m.map; curMd = m.md; handleEvents(m.e);
      offPrev = (offGame === game && offCur && stepped === 1) ? offCur : m; offCur = m; offGame = game;
    }
    V = makeView(offCur, offPrev, offCur, Math.min(1, acc * 60), 0);
  } else if (mode === 'online') {
    V = buildOnline(now, dt);
  } else V = null;
  render(now, dt);
  if (mode !== 'menu') updateHud(now);
  else {
    if (!$('menu').classList.contains('hide')) drawPreview($('prev'), prevCtx.a, now);
    if (!$('wardrobe').classList.contains('hide')) drawPreview($('wprev'), prevCtx.w, now);
    if (!$('clicker').classList.contains('hide')) Clicker.frame(now, dt);
  }
}

/* ================= профиль, турнир, режимы ================= */
function refreshProfileUI() {
  $('lvlTxt').textContent = `${T('level')} ${Pro.level()}`;
  $('lvlFill').style.width = Math.round(Pro.levelProgress() * 100) + '%';
  $('coinsTxt').textContent = `🪙 ${P.coins}`;
  $('coins').textContent = `🪙 ${P.coins}`;
}
const modesWord = (n) => (lang === 'ru' ? (n === 1 ? 'режим' : n < 5 ? 'режима' : 'режимов') : 'modes');

function renderTour() {
  const pk = tourSel.kind === 2;
  $('tType').innerHTML = `<button class="chip ${!pk ? 'on' : ''}" data-k="0">${T('tRand')}</button><button class="chip ${pk ? 'on' : ''}" data-k="2">${T('tPick')}</button>`;
  $('tLen').classList.toggle('hide', pk); $('tLenLbl').classList.toggle('hide', pk); $('tPickBox').classList.toggle('hide', !pk);
  $('tPick').innerHTML = pickHtml(tourSel.picks); $('tPickInfo').textContent = tourSel.picks.length >= 2 ? T('pickSel', tourSel.picks.length) : T('pickHint');
  for (const id of ['bTOff', 'bTOn', 'bTFr']) $(id).disabled = pk && tourSel.picks.length < 2;
  $('tLen').innerHTML = [3, 5, 7].map((n) => `<button class="chip ${tourSel.len === n ? 'on' : ''}" data-l="${n}">${n} ${modesWord(n)}</button>`).join('');
  $('tBotsOn').textContent = T('botsOn'); $('tBotsOff').textContent = T('botsOff');
  $('tBotsOn').classList.toggle('on', !!tourSel.bots); $('tBotsOff').classList.toggle('on', !tourSel.bots);
  $('tInfo').textContent = tourSel.bots ? T('tInfoOn') : T('tInfoOff');
  const sp = (a) => `<span>${a}</span>`;
  $('tPts').innerHTML = tourSel.bots
    ? ['🥇 4', '🥈 3', '🥉 2', '4 → 1', '5 → 0'].map(sp).join('')
    : [5, 4, 3, 2].map((n) => sp(`${n}: ` + Array.from({ length: n }, (_, i) => n - 1 - i).join('·'))).join('');
  ls.set('tour', tourSel);
}
$('tLen').onclick = (e) => { const b = e.target.closest('[data-l]'); if (!b) return; tourSel.len = +b.dataset.l; GA.play('click'); renderTour(); };
$('tType').onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; tourSel.kind = +b.dataset.k; GA.play('click'); renderTour(); };
$('tPick').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; togglePick(tourSel.picks, +b.dataset.p); GA.play('click'); renderTour(); };
$('tBotsOn').onclick = () => { tourSel.bots = 1; GA.play('click'); renderTour(); };
$('tBotsOff').onclick = () => { tourSel.bots = 0; GA.play('click'); renderTour(); };
$('bTOff').onclick = () => { commitName(); GA.play('click'); startOffline(tourCfg()); };
$('bTOn').onclick = () => { commitName(); GA.play('click'); connect('quick', null, Object.assign({ bots: tourSel.bots }, tourCfg())); };
$('bTFr').onclick = () => { commitName(); GA.play('click'); connect('create', null, { cfg: Object.assign({ bots: tourSel.bots, diff: diffSel }, tourCfg()) }); };
$('bTBack').onclick = () => { GA.play('click'); showScreen('menu'); };

function renderModes() {
  $('modeGrid').innerHTML = MODES.map((m) => `<button class="mcard ${modeSel.mode === m.id ? 'on' : ''}" data-m="${m.id}"><b>${m.icon}</b>${esc(m[lang].name)}</button>`).join('');
  $('modeInfo').textContent = MT(modeSel.mode).goal;
  $('mLen').innerHTML = [1, 3, 5].map((n) => `<button class="chip ${modeSel.len === n ? 'on' : ''}" data-l="${n}">${n}</button>`).join('');
  ls.set('modesel', modeSel);
}
$('modeGrid').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; modeSel.mode = +b.dataset.m; GA.play('click'); renderModes(); };
$('mLen').onclick = (e) => { const b = e.target.closest('[data-l]'); if (!b) return; modeSel.len = +b.dataset.l; GA.play('click'); renderModes(); };
$('bMOff').onclick = () => { commitName(); GA.play('click'); startOffline({ kind: 1, len: modeSel.len, mode: modeSel.mode }); };
$('bMOn').onclick = () => { commitName(); GA.play('click'); connect('quick', null, { kind: 1, len: modeSel.len, gm: modeSel.mode, bots: 1, diff: diffSel }); };
$('bMFr').onclick = () => { commitName(); GA.play('click'); connect('create', null, { cfg: { kind: 1, len: modeSel.len, mode: modeSel.mode, bots: 0, diff: diffSel } }); };
$('bMBack').onclick = () => { GA.play('click'); showScreen('menu'); };

/* ================= гардероб и награды ================= */
let wTab = 'c';
function buildWardrobe() {
  refreshProfileUI();
  const tabs = $('tabs'); tabs.innerHTML = ''; $('wNote').textContent = '';
  for (const s of ['c', 'p', 'h', 'e', 't', 's']) { const b = document.createElement('button'); b.textContent = T('tab' + s); b.className = s === wTab ? 'sel' : ''; b.onclick = () => { wTab = s; GA.play('click'); buildWardrobe(); }; tabs.appendChild(b); }
  const grid = $('grid'); grid.innerHTML = '';
  const n = Cos.count(wTab);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div'); const own = Pro.owned(wTab, i), sel = P.look[wTab] === i, lk = Cos.lock(wTab, i);
    d.className = 'item' + (sel ? ' sel' : '') + (own ? '' : ' lock');
    d.appendChild(Cos.thumb(wTab, i, P.look, 56, lang));
    const l = document.createElement('span'); l.textContent = Cos.name(wTab, i, lang); d.appendChild(l);
    if (own) { const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = sel ? '✓' : ''; d.appendChild(pr); }
    else if (lk) { const k = document.createElement('span'); k.className = 'lk'; k.textContent = lk === 'clicker' ? T('lkClicker') : T('lkCode'); d.appendChild(k); }
    else { const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = `🪙 ${Cos.price(wTab, i)}`; d.appendChild(pr); }
    d.onclick = () => {
      if (own) { Pro.equip(wTab, i); GA.play('click'); buildWardrobe(); return; }
      if (lk) { const note = lk === 'clicker' ? T('lockClicker') : T('lockCode'); $('wNote').textContent = note; toast(note); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); GA.play('click'); return; }
      if (Pro.buy(wTab, i)) { Pro.equip(wTab, i); GA.play('buy'); toast('✅ ' + T('bought')); buildWardrobe(); }
      else { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); toast(T('notEnough')); }
    };
    grid.appendChild(d);
  }
}
$('bPromo').onclick = async () => {
  GA.init(); const code = $('promo').value; if (!code.trim()) return;
  const r = await Pro.redeem(code);
  if (!r.ok) { toast('❌ ' + (r.net ? T('codeNet') : r.wait ? T('codeWait') : T('badCode'))); GA.play('click'); return; }
  GA.play('ach'); $('promo').value = '';
  if (r.coins) { toast(r.had ? T('codeHad') : T('codeCoins', r.coins)); refreshProfileUI(); return; }
  toast(r.had ? T('codeHad') : T('codeOk', Cos.name(r.slot, r.idx, lang)));
  wTab = r.slot; buildWardrobe();
};
$('promo').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('bPromo').click(); });

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
  Clicker.init({ lang: () => lang, toast, refresh: refreshProfileUI, wardrobe: () => { buildWardrobe(); showScreen('wardrobe'); } });
  if (!P.name && Y.player) { try { const n = Y.player.getName(); if (n) { P.name = n.slice(0, 14); Pro.save(); } } catch (e) {} }
  $('name').value = P.name;
  $('name').addEventListener('input', commitName); $('name').addEventListener('change', commitName);
  $('bOnline').onclick = () => { commitName(); GA.init(); GA.play('click'); connect('quick', null, { kind: 0, len: 3, bots: 1, diff: diffSel }); };
  $('bTour').onclick = () => { GA.init(); GA.play('click'); renderTour(); showScreen('tourney'); };
  $('bModes').onclick = () => { GA.init(); GA.play('click'); renderModes(); showScreen('modes'); };
  $('bFriends').onclick = () => { GA.init(); GA.play('click'); $('friends').classList.toggle('hide'); };
  $('bCreate').onclick = () => { commitName(); GA.play('click'); connect('create', null, { cfg: { kind: 0, len: 3, bots: 0, diff: diffSel } }); };
  $('bJoin').onclick = () => { commitName(); GA.play('click'); const c = $('code').value.trim().toUpperCase(); if (c.length !== 4) return showMsg(T('enterCode')); connect('code', c); };
  $('code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  $('bOffline').onclick = () => { commitName(); GA.init(); GA.play('click'); startOffline({ kind: 0, len: 3 }); };
  $('bClk').onclick = () => { GA.init(); GA.play('click'); showScreen('clicker'); };
  $('bWard').onclick = () => { GA.init(); GA.play('click'); buildWardrobe(); showScreen('wardrobe'); };
  $('bWBack').onclick = () => { GA.play('click'); showScreen('menu'); };
  $('bCkBack').onclick = () => { GA.play('click'); Profile.save(); showScreen('menu'); refreshProfileUI(); };
  $('bAch').onclick = () => { GA.init(); GA.play('click'); buildAchs(); showScreen('achs'); };
  $('bABack').onclick = () => { GA.play('click'); showScreen('menu'); };
  $('bSet').onclick = () => { GA.init(); GA.play('click'); syncToggles(); showScreen('settings'); };
  // ---- аккаунт ----
  let accReset = false;
  const accE = (e) => (T('accE')[e] || T('accE').err);
  function renderAcc() {
    const on = !!Pro.Acc.token;
    $('accIn').classList.toggle('hide', !on); $('accOut').classList.toggle('hide', on);
    $('accName').textContent = Pro.Acc.name; $('accRecBox').classList.toggle('hide', !accReset);
    $('bAccLogin').textContent = accReset ? T('accReset') : T('accLogin'); $('bAccReg').classList.toggle('hide', accReset);
    $('accState').textContent = T('accSt')[Pro.Acc.state] || '';
  }
  Pro.Acc.onChange = (s) => { renderAcc(); if (s === 'rejected' || s === 'conflict') { toast(T('accSt')[s]); refreshProfileUI(); } if (s === 'expired') toast(T('accSt').expired); };
  $('bAcc').onclick = () => { GA.init(); GA.play('click'); accReset = false; $('accMsg').textContent = ''; renderAcc(); showScreen('account'); };
  $('bAccBack').onclick = () => { GA.play('click'); showScreen('settings'); };
  $('bAccForgot').onclick = () => { accReset = !accReset; GA.play('click'); renderAcc(); };
  async function accGo(kind) {
    const name = $('accUser').value.trim(), pass = $('accPass').value; $('accMsg').textContent = '…';
    const r = kind === 'reg' ? await Pro.register(name, pass) : accReset ? await Pro.resetPass(name, $('accRec').value, pass) : await Pro.login(name, pass);
    if (!r.ok) { $('accMsg').textContent = '❌ ' + accE(r.e); GA.play('click'); return; }
    $('accPass').value = ''; $('accMsg').textContent = ''; accReset = false; GA.play('ach'); renderAcc(); refreshProfileUI(); try { buildWardrobe(); } catch (e) {}
    $('promo') && ($('promo').value = '');
    toast(T('accDone', Pro.Acc.name));
    if (r.recovery) $('accMsg').textContent = '🔑 ' + T('accRecShow', r.recovery);
  }
  $('bAccLogin').onclick = () => accGo('login'); $('bAccReg').onclick = () => accGo('reg');
  $('accPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') accGo('login'); });
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
window.__ps = { iv: getInputVec, get V() { return V; }, get mode() { return mode; }, get net() { return net; }, get game() { return game; }, startOffline, connect, T, get cfg() { return cfg; } };
})();
