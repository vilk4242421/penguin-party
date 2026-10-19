/* Penguin Sumo — сервер мультиплеера (WebSocket, авторитетная физика).
 * Запуск: npm install && node server.js   (PORT по умолчанию 8080)
 * Также раздаёт статику из ../game, чтобы игру можно было открыть и установить как PWA прямо отсюда.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const Sim = require(path.join(__dirname, '..', 'game', 'sim.js'));

const PORT = process.env.PORT || 8080;
const GAME_DIR = path.join(__dirname, '..', 'game');
const TICK = 1 / 60;
const SNAP_EVERY = 3; // 20 Гц
const MAX_CONN_PER_IP = 12;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

// «версия сборки» = хэш всех файлов игры; подставляется в sw.js, чтобы клиенты обновлялись сами после каждого деплоя
const crypto = require('crypto');
function computeBuild() {
  const h = crypto.createHash('sha1');
  const walk = (d) => fs.readdirSync(d).sort().forEach((f) => { const fp = path.join(d, f); if (fs.statSync(fp).isDirectory()) walk(fp); else { h.update(f); h.update(fs.readFileSync(fp)); } });
  try { walk(GAME_DIR); } catch (e) {}
  return h.digest('hex').slice(0, 10);
}
const BUILD = computeBuild();

const rooms = new Map(); // code -> room
let connCount = 0;
const ipCount = new Map();

// секретные коды проверяет сервер: в файлах игры лежат только награды, а сами коды (в виде хэшей) — здесь
const accounts = require('./accounts.js');
const codeTries = new Map(); // ip -> [время попыток] (не больше 8 в минуту)
setInterval(() => codeTries.clear(), 10 * 60 * 1000);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Account' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url.startsWith('/api/') && url !== '/api/code') {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    const send = (code, obj) => { res.writeHead(code, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, CORS)); res.end(JSON.stringify(obj)); };
    accounts.handle(req, res, url, send).catch((e) => { console.error('api', e.message); try { send(500, { ok: false }); } catch (e2) {} });
    return;
  }
  if (url === '/api/code') {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    if (req.method !== 'POST') { res.writeHead(405, CORS); return res.end(); }
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), now = Date.now();
    const arr = (codeTries.get(ip) || []).filter((t) => now - t < 60000);
    if (arr.length >= 8) { res.writeHead(429, Object.assign({ 'Content-Type': 'application/json' }, CORS)); return res.end('{"ok":false,"wait":true}'); }
    arr.push(now); codeTries.set(ip, arr);
    let body = ''; req.on('data', (d) => { body += d; if (body.length > 512) req.destroy(); });
    req.on('end', () => {
      let code = ''; try { code = JSON.parse(body).code; } catch (e) {}
      const id = accounts.codeId(code);
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, CORS));
      res.end(JSON.stringify(id ? { ok: true, id } : { ok: false }));
    });
    return;
  }
  if (url === '/stats') {
    let players = 0;
    for (const r of rooms.values()) players += r.clients.size;
    accounts.getStore().count().catch(() => -1).then((n) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ players, rooms: rooms.size, proto: Sim.C.PROTO, version: Sim.C.VERSION, build: BUILD, store: accounts.getStore().kind, accounts: n }));
    });
    return;
  }
  if (url === '/health') { res.writeHead(200); return res.end('ok'); }
  let file = path.normalize(path.join(GAME_DIR, url === '/' ? 'index.html' : url));
  if (!file.startsWith(GAME_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    if (path.basename(file) === 'sw.js') data = Buffer.from(String(data).replace("const BUILD = 'dev';", "const BUILD = '" + BUILD + "';"));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 2048, perMessageDeflate: false });

function makeCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
    if (!rooms.has(c)) return c;
  }
}

function cfgKey(c) { return (c.kind ? 'm' + c.mode + 'x' + c.len : 't' + c.len) + (c.bots ? 'b' : 'n'); }
function createRoom(pub, cfg) {
  const game = new Sim.Game({ lobby: true, pub });
  if (cfg) game.applyCfg(cfg);
  const room = { code: makeCode(), pub, game, clients: new Set() };
  rooms.set(room.code, room);
  return room;
}

function findPublicRoom(cfg) {
  const want = cfgKey(cfg);
  // лучше всего — комната в ожидании; иначе матч, который только начался
  let best = null, bs = -1;
  for (const r of rooms.values()) {
    if (!r.pub || cfgKey(r.game.cfg) !== want) continue;
    const g = r.game, n = g.humans().length;
    if (n >= Sim.C.MAX) continue;
    let sc = -1;
    if (g.phase === 'lobby') sc = 100 + n;
    else if (g.round <= 1 && g.phase !== 'final') sc = 50 + n;
    if (sc > bs) { bs = sc; best = r; }
  }
  return best || createRoom(true, cfg);
}

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
function broadcast(room, str) {
  for (const c of room.clients) send(c, str);
}

function cleanName(s) {
  s = String(s || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').trim().slice(0, 14);
  return s || 'Penguin';
}

wss.on('connection', (ws, req) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const n = (ipCount.get(ip) || 0) + 1;
  if (n > MAX_CONN_PER_IP) { ws.close(1008, 'too many'); return; }
  ipCount.set(ip, n); connCount++;

  ws.room = null; ws.pid = 0; ws.alive = true; ws.lastMsg = Date.now();
  ws.bucket = 60; ws.bucketT = Date.now();

  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', (raw) => {
    // простое ограничение частоты
    const now = Date.now();
    ws.bucket = Math.min(60, ws.bucket + ((now - ws.bucketT) / 1000) * 40); ws.bucketT = now;
    if (--ws.bucket < 0) return;
    ws.lastMsg = now;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'join' && !ws.room && !ws.joining) {
      if ((m.v | 0) !== Sim.C.PROTO) return send(ws, { t: 'err', e: 'old' });
      let room = null;
      const qpicks = Array.isArray(m.picks) ? m.picks.slice(0, 10).map((v) => v | 0).filter((v, i, a) => v >= 0 && v < Sim.C.N_MODES && a.indexOf(v) === i) : [];
      const qcfg = { kind: m.kind === 2 && qpicks.length ? 2 : m.kind ? 1 : 0, picks: qpicks, len: [1, 3, 5, 7].includes(m.len | 0) ? m.len | 0 : 3, mode: m.gm | 0, bots: m.bots === 0 ? 0 : 1, diff: [0, 1, 2].includes(m.diff | 0) ? m.diff | 0 : 1 };
      if (m.mode === 'create') room = createRoom(false, { bots: 0 });
      else if (m.mode === 'code') {
        room = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!room) return send(ws, { t: 'err', e: 'noroom' });
        if (room.game.humans().length >= Sim.C.MAX) return send(ws, { t: 'err', e: 'full' });
      } else room = findPublicRoom(qcfg);

      const g = room.game;
      if (g.players.length >= Sim.C.MAX) {
        const bot = g.players.find(p => p.bot);
        if (bot) g.removePlayer(bot.id);
      }
      ws.joining = true;
      accounts.isAdmin(m.acc).then((adm) => {
      if (ws.readyState !== 1) { ws.joining = false; return; }
      if (g.players.length >= Sim.C.MAX) { const bot2 = g.players.find((q) => q.bot); if (bot2) g.removePlayer(bot2.id); }
      const p = g.addPlayer(cleanName(m.name), m.look, false); p.adm = adm; g.rosterDirty = true; ws.joining = false;
      ws.room = room; ws.pid = p.id; room.clients.add(ws);
      send(ws, { t: 'joined', id: p.id, code: room.code, pub: room.pub ? 1 : 0 });
      const r = g.takeRoster(); if (r) { r.t = 'r'; broadcast(room, r); }
      });
      return;
    }
    if (!ws.room) return;
    const g = ws.room.game;
    if (m.t === 'in') g.setInput(ws.pid, m.x, m.y, m.d ? 1 : 0);
    else if (m.t === 'em') {
      const e = m.e | 0; if (e >= 0 && e < Sim.C.N_EMO) broadcast(ws.room, { t: 'em', id: ws.pid, e });
    } else if (m.t === 'ping') send(ws, { t: 'pong', ts: m.ts });
    else if (m.t === 'cfg') { if (!ws.room.pub) g.setCfg(ws.pid, m); }
    else if (m.t === 'start') {
      if (ws.pid === g.hostId) { if (!g.startMatch()) send(ws, { t: 'info', e: 'need2' }); }
    } else if (m.t === 'look') { // смена внешнего вида в ожидании
      const p = g.players.find(q => q.id === ws.pid);
      if (p && g.phase === 'lobby') { p.look = Sim.cleanLook(m.look); g.rosterDirty = true; }
    }
  });

  ws.on('close', () => {
    connCount--;
    ipCount.set(ip, Math.max(0, (ipCount.get(ip) || 1) - 1));
    const room = ws.room;
    if (!room) return;
    room.clients.delete(ws);
    room.game.removePlayer(ws.pid);
    if (room.clients.size === 0) rooms.delete(room.code);
    else { const r = room.game.takeRoster(); if (r) { r.t = 'r'; broadcast(room, r); } }
  });
  ws.on('error', () => {});
});

// главный цикл
let last = Date.now(), acc = 0, tick = 0;
setInterval(() => {
  const now = Date.now();
  acc += Math.min(now - last, 100) / 1000; last = now;
  while (acc >= TICK) {
    acc -= TICK; tick++;
    for (const room of rooms.values()) {
      room.game.step(TICK);
      if (tick % SNAP_EVERY === 0) {
        const r = room.game.takeRoster();
        if (r) { r.t = 'r'; broadcast(room, r); }
        const s = room.game.snapshot(); s.t = 's';
        broadcast(room, JSON.stringify(s));
      }
    }
  }
}, 8);

// выкидываем «мёртвые» соединения
setInterval(() => {
  const now = Date.now();
  for (const ws of wss.clients) {
    if (!ws.alive || now - ws.lastMsg > 20000) { ws.terminate(); continue; }
    ws.alive = false; try { ws.ping(); } catch {}
  }
}, 10000);

server.listen(PORT, () => { accounts.startupTasks().catch((e) => console.error('startupTasks:', e.message)); accounts.getStore().count().then((n) => console.log('Аккаунтов в хранилище: ' + n)).catch((e) => console.error('Хранилище аккаунтов недоступно:', e.message)); console.log('Penguin Sumo server on :' + PORT + ' build ' + BUILD); console.log('Хранилище аккаунтов: ' + accounts.getStore().kind + (accounts.getStore().kind === 'file' ? ' (на бесплатном Render пропадёт при перезапуске — задайте DATABASE_URL)' : '')); });
