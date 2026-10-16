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
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

const rooms = new Map(); // code -> room
let connCount = 0;
const ipCount = new Map();

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/stats') {
    let players = 0;
    for (const r of rooms.values()) players += r.clients.size;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ players, rooms: rooms.size }));
  }
  if (url === '/health') { res.writeHead(200); return res.end('ok'); }
  let file = path.normalize(path.join(GAME_DIR, url === '/' ? 'index.html' : url));
  if (!file.startsWith(GAME_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
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

function createRoom(pub) {
  const room = { code: makeCode(), pub, game: new Sim.Game(), clients: new Set() };
  rooms.set(room.code, room);
  return room;
}

function findPublicRoom() {
  let best = null;
  for (const r of rooms.values()) {
    if (!r.pub) continue;
    const n = r.game.humans().length;
    if (n >= Sim.C.MAX) continue;
    if (!best || n > best.game.humans().length) best = r;
  }
  return best || createRoom(true);
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

    if (m.t === 'join' && !ws.room) {
      let room = null;
      if (m.mode === 'create') room = createRoom(false);
      else if (m.mode === 'code') {
        room = rooms.get(String(m.code || '').toUpperCase().trim());
        if (!room) return send(ws, { t: 'err', e: 'noroom' });
        if (room.game.humans().length >= Sim.C.MAX) return send(ws, { t: 'err', e: 'full' });
      } else room = findPublicRoom();

      const g = room.game;
      // человек вытесняет бота в свободном месте
      if (g.players.length >= Sim.C.MAX) {
        const bot = g.players.find(p => p.bot);
        if (bot) g.removePlayer(bot.id);
      }
      const p = g.addPlayer(cleanName(m.name), m.color, m.hat, false);
      ws.room = room; ws.pid = p.id; room.clients.add(ws);
      send(ws, { t: 'joined', id: p.id, code: room.code, pub: room.pub });
      const r = g.takeRoster(); if (r) broadcast(room, { t: 'r', list: r });
      return;
    }
    if (!ws.room) return;
    const g = ws.room.game;
    if (m.t === 'in') g.setInput(ws.pid, m.x, m.y, m.d ? 1 : 0);
    else if (m.t === 'em') {
      const e = m.e | 0; if (e >= 0 && e < 4) broadcast(ws.room, { t: 'em', id: ws.pid, e });
    } else if (m.t === 'ping') send(ws, { t: 'pong', ts: m.ts });
  });

  ws.on('close', () => {
    connCount--;
    ipCount.set(ip, Math.max(0, (ipCount.get(ip) || 1) - 1));
    const room = ws.room;
    if (!room) return;
    room.clients.delete(ws);
    room.game.removePlayer(ws.pid);
    if (room.clients.size === 0) rooms.delete(room.code);
    else { const r = room.game.takeRoster(); if (r) broadcast(room, { t: 'r', list: r }); }
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
        if (r) broadcast(room, { t: 'r', list: r });
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

server.listen(PORT, () => console.log('Penguin Sumo server on :' + PORT));
