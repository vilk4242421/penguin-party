// Проверка онлайн-протокола v3: node tools/lobbytest.js  (сервер должен работать на :8080)
const WebSocket = require('../server/node_modules/ws');
const mk = () => new Promise((res) => {
  const ws = new WebSocket('ws://localhost:8080'); const st = { ws, roster: null, info: null, err: null };
  ws.on('open', () => res(st));
  ws.on('message', (d) => {
    const m = JSON.parse(d);
    if (m.t === 'joined') { st.id = m.id; st.code = m.code; }
    else if (m.t === 'r') st.roster = m;
    else if (m.t === 's') st.last = m;
    else if (m.t === 'info') st.info = m.e;
    else if (m.t === 'err') st.err = m.e;
  });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = JSON.stringify;
let bad = 0; const ok = (c, msg) => { console.log(c ? 'OK  ' : 'FAIL', msg); if (!c) bad++; };
(async () => {
  const a = await mk(); a.ws.send(J({ t: 'join', v: 3, mode: 'create', name: 'Host', look: { c: 3, p: 1, h: 4, e: 1, t: 2, s: 0 } }));
  await sleep(500);
  ok(a.last.ph === 4 && a.last.p.length === 1 && a.roster.host === a.id, 'комната создана, ждёт друзей (без ботов)');
  a.ws.send(J({ t: 'start' })); await sleep(300);
  ok(a.last.ph === 4 && a.info === 'need2', 'соло без ботов не стартует');
  const b = await mk(); b.ws.send(J({ t: 'join', v: 3, mode: 'code', code: a.code, name: 'Friend', look: { c: 3, p: 1, s: 1 } }));
  const old = await mk(); old.ws.send(J({ t: 'join', v: 2, mode: 'quick', name: 'Old' }));
  await sleep(500);
  ok(old.err === 'old', 'старый протокол отклонён');
  ok(a.roster.list.length === 2 && a.roster.list[1][7] === 1, 'второй игрок вошёл со скином Верити');
  b.ws.send(J({ t: 'cfg', kind: 0, len: 7 })); await sleep(200);
  ok(a.roster.cfg[1] === 3, 'не-хост не меняет настройки');
  a.ws.send(J({ t: 'cfg', kind: 0, len: 5, bots: 1, chaos: 0 })); await sleep(200);
  ok(a.roster.cfg[1] === 5 && a.roster.cfg[3] === 1, 'хост: турнир на 5 режимов, с ботами');
  a.ws.send(J({ t: 'cfg', kind: 1, mode: 1, len: 3, bots: 0 })); await sleep(200);
  ok(a.roster.cfg[0] === 1 && a.roster.cfg[2] === 1 && a.roster.cfg[3] === 0, 'хост: серия «Гонка», без ботов');
  b.ws.send(J({ t: 'start' })); await sleep(200);
  ok(a.last.ph === 4, 'не-хост не стартует');
  a.ws.send(J({ t: 'cfg', kind: 0, len: 3, bots: 1 })); await sleep(150);
  a.ws.send(J({ t: 'start' })); await sleep(700);
  ok(a.last.ph === 5 && a.last.p.length === 5, 'старт: 2 игрока + 3 бота = 5, фаза intro');
  const c = await mk(); c.ws.send(J({ t: 'join', v: 3, mode: 'code', code: a.code, name: 'Late' })); await sleep(500);
  const me = c.last.p.find((x) => x[0] === c.id);
  ok(me && (me[5] & 8), 'опоздавший — зритель до следующего раунда');
  const d = await mk(); d.ws.send(J({ t: 'join', v: 3, mode: 'quick', name: 'Pub', kind: 0, len: 5 })); await sleep(700);
  ok(d.last.ph === 4 && d.roster.pub === 1 && d.roster.cfg[1] === 5, 'публичная комната: турнир на 5');
  d.ws.send(J({ t: 'cfg', len: 7 })); await sleep(200);
  ok(d.roster.cfg[1] === 5, 'в публичной комнате настройки менять нельзя');
  console.log(bad ? 'ПРОВАЛЕНО: ' + bad : 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');
  process.exit(bad ? 1 : 0);
})();
