/* Аккаунты: ник + пароль, профиль игрока хранится на сервере.
 * Хранилище: если задана переменная DATABASE_URL — Postgres (данные не пропадают), иначе файл data/accounts.json
 * (на бесплатном Render файлы стираются при перезапуске — для постоянных аккаунтов подключите базу).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* ---------- хранилище ---------- */
function fileStore() {
  const dir = path.join(__dirname, 'data'), file = path.join(dir, 'accounts.json');
  let db = {}; try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
  let timer = null;
  const flush = () => { timer = null; try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(db)); fs.renameSync(file + '.tmp', file); } catch (e) { console.error('save accounts:', e.message); } };
  return {
    kind: 'file',
    async get(k) { return db[k] ? JSON.parse(JSON.stringify(db[k])) : null; },
    async set(k, v) { db[k] = v; if (!timer) timer = setTimeout(flush, 800); },
    async count() { return Object.keys(db).filter((n) => !n.startsWith('ip:')).length; },
    async names() { return Object.keys(db).filter((n) => !n.startsWith('ip:')); },
    async top(kind, n) {
      const rows = Object.keys(db).filter((k) => !k.startsWith('ip:')).map((k) => ({ k, n: db[k].name, v: kind === 'wins' ? (db[k].ow | 0) : Math.floor(Number(db[k].profile && db[k].profile.coins) || 0) })).filter((r) => r.v > 0);
      rows.sort((a, b) => b.v - a.v || String(a.n).localeCompare(String(b.n))); return rows.slice(0, n);
    },
    flush,
  };
}
function pgStore(url) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000 });
  // Neon «засыпает» и рвёт неиспользуемые соединения — без обработчика Node падает и сервер перезапускается
  pool.on('error', (e) => console.error('pg pool:', e.message));
  const ready = pool.query('CREATE TABLE IF NOT EXISTS accounts (name TEXT PRIMARY KEY, data JSONB NOT NULL)').catch((e) => { console.error('pg init:', e.message); });
  const run = async (sql, args) => { await ready; try { return await pool.query(sql, args); } catch (e) { return pool.query(sql, args); } }; // одна повторная попытка после обрыва
  return {
    kind: 'postgres',
    async get(k) { const r = await run('SELECT data FROM accounts WHERE name=$1', [k]); return r.rows[0] ? r.rows[0].data : null; },
    async set(k, v) { await run('INSERT INTO accounts(name,data) VALUES($1,$2::jsonb) ON CONFLICT (name) DO UPDATE SET data=$2::jsonb', [k, JSON.stringify(v)]); },
    async count() { const r = await run("SELECT COUNT(*) FROM accounts WHERE name NOT LIKE 'ip:%'"); return +r.rows[0].count; },
    async names() { const r = await run("SELECT name FROM accounts WHERE name NOT LIKE 'ip:%'"); return r.rows.map((x) => x.name); },
    async top(kind, n) {
      const val = kind === 'wins' ? "COALESCE((data->>'ow')::bigint,0)" : "COALESCE(FLOOR((data->'profile'->>'coins')::numeric),0)";
      const r = await run(`SELECT name AS k, data->>'name' AS n, ${val} AS v FROM accounts WHERE name NOT LIKE 'ip:%' AND ${val} > 0 ORDER BY v DESC, n LIMIT $1`, [n]);
      return r.rows.map((x) => ({ k: x.k, n: x.n, v: Number(x.v) }));
    },
    flush() {},
  };
}
let store = null;
function getStore() {
  if (store) return store;
  if (process.env.DATABASE_URL) { try { store = pgStore(process.env.DATABASE_URL); } catch (e) { console.error('Postgres недоступен, использую файл:', e.message); } }
  return (store = store || fileStore());
}

/* ---------- утилиты ---------- */
const ADMINS = String(process.env.ADMINS || '').split(',').map((x) => String(x || '').trim().toLowerCase()).filter(Boolean);

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hashPass = (pw, salt) => crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 32).toString('hex');
const eq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const keyOf = (n) => String(n || '').trim().toLowerCase();
const validName = (n) => /^[a-zа-яё0-9_\-]{3,16}$/i.test(String(n || '').trim());
const newToken = () => crypto.randomBytes(24).toString('hex');
const newRecovery = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 12; i++) s += A[crypto.randomInt(A.length)]; return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8); };

/* ---------- ограничение попыток ---------- */
const hits = new Map();
setInterval(() => hits.clear(), 15 * 60 * 1000);
function limited(key, max, ms) {
  const now = Date.now(), a = (hits.get(key) || []).filter((t) => now - t < ms);
  if (a.length >= max) { hits.set(key, a); return true; }
  a.push(now); hits.set(key, a); return false;
}

/* ---------- проверка профиля: явную накрутку отклоняем ---------- */
const COIN_BURST = 3000, COIN_PER_MIN = 500, XP_BURST = 4000, XP_PER_MIN = 700, MAX_NEW_ITEMS = 4;
const arr = (a) => (Array.isArray(a) ? a : []);
function sanitize(acc, p, now) {
  if (!p || typeof p !== 'object') return 'bad';
  const old = acc.profile || null;
  if (JSON.stringify(p).length > 20000) return 'big';
  for (const k of ['coins', 'xp']) if (!Number.isFinite(p[k]) || p[k] < 0 || p[k] > 1e9) return 'bad';
  if (p.c67 == null) p.c67 = 0; if (!Number.isFinite(p.c67) || p.c67 < 0 || p.c67 > 1e9) return 'bad';
  if (old) {
    // «разрешённый прирост»: накапливается со временем (как ведро), код-награды сервер добавляет сам
    const dt = Math.max(0, (now - (acc.t || now)) / 60000);
    const cAllow = Math.min(COIN_BURST * 3, COIN_BURST + dt * COIN_PER_MIN) + (acc.bonusC || 0), xAllow = Math.min(XP_BURST * 3, XP_BURST + dt * XP_PER_MIN) + (acc.bonusC || 0);
    if (p.coins - old.coins > cAllow) return 'coins';
    if (p.c67 - (old.c67 || 0) > cAllow + (acc.bonus67 || 0)) return 'coins';
    if (p.xp - old.xp > xAllow) return 'xp';
    let added = 0; for (const s of Object.keys(p.owned || {})) added += arr(p.owned[s]).filter((v) => !arr(old.owned && old.owned[s]).includes(v)).length;
    if (added > MAX_NEW_ITEMS) return 'items';
  } else if (p.coins > 60000 || p.xp > 400000 || p.c67 > 130000) return 'coins'; // первый профиль (перенос с устройства)
  return null;
}

/* ---------- секретные коды (хэши только здесь) ---------- */
const normC = (t) => String(t || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
const fnvC = (t) => { let h = 0x811c9dc5; for (const ch of t) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const CODE_IDS = { '12809762': 'veriti', 'bc164324': 'lutikov', '257bb5e5': 'rbveriti', 'd83f00d2': 'rybkisbest', '31f8c03b': 'komarov' };
const COIN_CODES = { rybkisbest: 10000 }, C67_CODES = { komarov: 67000 };
const codeId = (c) => CODE_IDS[fnvC(normC(c))] || null;

/* ---------- API ---------- */
function ipOf(req) { return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function readJson(req, max = 24000) {
  return new Promise((res, rej) => { let b = ''; req.on('data', (d) => { b += d; if (b.length > max) { req.destroy(); rej(new Error('big')); } }); req.on('end', () => { try { res(JSON.parse(b || '{}')); } catch (e) { rej(e); } }); req.on('error', rej); });
}
const safeDec = (s) => { try { return decodeURIComponent(s); } catch (e) { return ''; } };
const bearer = (req) => (String(req.headers.authorization || '').match(/^Bearer ([0-9a-f]{48})$/) || [])[1] || '';

async function handle(req, res, url, send) {
  const st = getStore(), ip = ipOf(req);
  let body = {};
  if (req.method === 'POST' || req.method === 'PUT') { try { body = await readJson(req); } catch (e) { return send(400, { ok: false, e: 'bad' }); } }

  if (url === '/api/top' && req.method === 'GET') {
    try { return send(200, { ok: true, wins: await topList('wins'), coins: await topList('coins') }); } catch (e) { return send(200, { ok: false, e: 'err' }); }
  }
  if (url === '/api/register' && req.method === 'POST') {
    if (limited('reg:' + ip, 5, 60 * 60 * 1000)) return send(429, { ok: false, e: 'wait' });
    const name = String(body.name || '').trim(), pw = String(body.pass || '');
    if (!validName(name)) return send(200, { ok: false, e: 'name' });
    if (pw.length < 6 || pw.length > 64) return send(200, { ok: false, e: 'pass' });
    if (await st.get(keyOf(name))) { console.log('[acc] register: ник занят', keyOf(name)); return send(200, { ok: false, e: 'taken' }); }
    const salt = crypto.randomBytes(16).toString('hex'), token = newToken(), rec = newRecovery();
    const acc = { name, salt, hash: hashPass(pw, salt), rec: sha(rec.replace(/-/g, '')), tokens: [sha(token)], profile: null, t: Date.now(), made: Date.now(), bonusC: 0 };
    await st.set(keyOf(name), acc); console.log('[acc] register: создан', keyOf(name), 'store=' + st.kind);
    return send(200, { ok: true, token, name, recovery: rec, profile: null, admin: ADMINS.includes(keyOf(name)), nAdm: ADMINS.length });
  }
  if (url === '/api/login' && req.method === 'POST') {
    const name = String(body.name || '').trim(), k = keyOf(name);
    if (limited('log:' + ip, 15, 10 * 60 * 1000) || limited('loga:' + k, 8, 10 * 60 * 1000)) return send(429, { ok: false, e: 'wait' });
    const acc = await st.get(k);
    if (!acc || !eq(hashPass(String(body.pass || ''), acc.salt), acc.hash)) { console.log('[acc] login: отказ', JSON.stringify(k), acc ? 'аккаунт есть, пароль не подошёл' : 'аккаунта с таким ником нет'); return send(200, { ok: false, e: 'creds' }); }
    console.log('[acc] login: ок', k);
    const token = newToken(); acc.tokens = arr(acc.tokens).slice(-7).concat(sha(token)); await st.set(k, acc);
    return send(200, { ok: true, token, name: acc.name, profile: acc.profile, admin: ADMINS.includes(k), nAdm: ADMINS.length });
  }
  if (url === '/api/reset' && req.method === 'POST') {
    const k = keyOf(body.name);
    if (limited('res:' + ip, 6, 60 * 60 * 1000) || limited('resa:' + k, 5, 60 * 60 * 1000)) return send(429, { ok: false, e: 'wait' });
    const acc = await st.get(k), pw = String(body.pass || '');
    if (!acc || !eq(sha(String(body.recovery || '').toUpperCase().replace(/[^A-Z0-9]/g, '')), acc.rec)) return send(200, { ok: false, e: 'creds' });
    if (pw.length < 6 || pw.length > 64) return send(200, { ok: false, e: 'pass' });
    acc.salt = crypto.randomBytes(16).toString('hex'); acc.hash = hashPass(pw, acc.salt);
    const token = newToken(); acc.tokens = [sha(token)]; await st.set(k, acc);
    return send(200, { ok: true, token, name: acc.name, profile: acc.profile });
  }
  // дальше нужен токен
  const tk = bearer(req); let acc = null, k = '';
  if (tk) { k = keyOf(safeDec(req.headers['x-account'] || '')); acc = k ? await st.get(k) : null; if (acc && !arr(acc.tokens).includes(sha(tk))) acc = null; }
  if (!acc) { console.log('[acc] 401', JSON.stringify(k), tk ? 'токен не подошёл или нет аккаунта' : 'нет токена'); return send(401, { ok: false, e: 'auth' }); }

  if (url === '/api/profile' && req.method === 'GET') return send(200, { ok: true, name: acc.name, profile: acc.profile, v: acc.v || 0, admin: ADMINS.includes(k), nAdm: ADMINS.length });
  if (url === '/api/profile' && req.method === 'PUT') {
    if (limited('put:' + k, 60, 60 * 1000)) return send(429, { ok: false, e: 'wait' });
    const p = body.profile, why = sanitize(acc, p, Date.now());
    if (why) return send(200, { ok: false, e: 'rejected', why, profile: acc.profile, v: acc.v || 0 });
    if (body.v != null && (acc.v || 0) !== body.v && acc.profile) return send(200, { ok: false, e: 'conflict', profile: acc.profile, v: acc.v || 0 });
    delete p.sig; acc.profile = p; acc.v = (acc.v || 0) + 1; acc.t = Date.now(); acc.bonusC = 0; acc.bonus67 = 0; await st.set(k, acc);
    return send(200, { ok: true, v: acc.v });
  }
  if (url === '/api/acode' && req.method === 'POST') { // секретный код для аккаунта: золото выдаётся один раз на аккаунт
    if (limited('ac:' + k, 8, 60 * 1000)) return send(429, { ok: false, wait: true });
    const id = codeId(body.code); if (!id) return send(200, { ok: false });
    acc.codes = acc.codes || {}; const had = !!acc.codes[id], coins = COIN_CODES[id] || 0, c67 = C67_CODES[id] || 0;
    if (!had) { acc.codes[id] = 1; if (coins) acc.bonusC = (acc.bonusC || 0) + coins; if (c67) acc.bonus67 = (acc.bonus67 || 0) + c67; await st.set(k, acc); }
    return send(200, { ok: true, id, had });
  }
  if (url === '/api/logout' && req.method === 'POST') { acc.tokens = arr(acc.tokens).filter((t) => t !== sha(tk)); await st.set(k, acc); return send(200, { ok: true }); }
  return send(404, { ok: false });
}
// администраторы: ники через запятую в переменной окружения ADMINS (например ADMINS=Rybkis)
// проверка токена аккаунта при входе в игру: возвращает true, если это подтверждённый администратор
async function verify(accIn) { // подтверждённый вход: { k, name } или null
  try {
    if (!accIn || typeof accIn.token !== 'string' || !/^[0-9a-f]{48}$/.test(accIn.token)) return null;
    const k = keyOf(String(accIn.name || '')); if (!k) return null;
    const acc = await getStore().get(k);
    return acc && arr(acc.tokens).includes(sha(accIn.token)) ? { k, name: acc.name } : null;
  } catch (e) { return null; }
}
const isAdminKey = (k) => ADMINS.includes(k);
async function isAdmin(accIn) { const v = await verify(accIn); return !!(v && isAdminKey(v.k)); }
// победа в матче с живыми игроками
async function addWin(k) {
  try { const st = getStore(), acc = await st.get(k); if (!acc) return; acc.ow = (acc.ow | 0) + 1; await st.set(k, acc); topCache.clear(); } catch (e) { console.error('addWin:', e.message); }
}
const topCache = new Map();
async function topList(kind) {
  const c = topCache.get(kind); if (c && Date.now() - c.t < 20000) return c.v;
  const rows = await getStore().top(kind, 50);
  const v = rows.map((r) => ({ n: r.n, v: r.v, a: isAdminKey(r.k) ? 1 : 0 }));
  topCache.set(kind, { t: Date.now(), v }); return v;
}
/* Аварийный сброс: переменная RESET_PASS=ник:новыйпароль — при запуске задаёт пароль аккаунту (или создаёт его). После входа УДАЛИ переменную. */
async function startupTasks() {
  const st = getStore();
  try { console.log('Ники в хранилище: ' + JSON.stringify(await st.names())); } catch (e) { console.error('names:', e.message); }
  const rp = process.env.RESET_PASS;
  if (rp && rp.includes(':')) {
    const i = rp.indexOf(':'), name = rp.slice(0, i).trim(), pw = rp.slice(i + 1);
    if (validName(name) && pw.length >= 6) {
      const k = keyOf(name), salt = crypto.randomBytes(16).toString('hex');
      const acc = (await st.get(k)) || { name, rec: '', tokens: [], profile: null, t: Date.now(), made: Date.now(), bonusC: 0 };
      acc.salt = salt; acc.hash = hashPass(pw, salt); acc.tokens = [];
      await st.set(k, acc); console.log('[acc] RESET_PASS применён для', k, '— удали переменную RESET_PASS');
    } else console.log('[acc] RESET_PASS: неверный формат (ник:пароль, пароль от 6 символов)');
  }
}
module.exports = { startupTasks, handle, getStore, codeId, isAdmin, isAdminKey, verify, addWin };
