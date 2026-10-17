const WebSocket = require('../server/node_modules/ws');
const mk = () => new Promise(res => {
  const ws = new WebSocket('ws://localhost:8080'); const st = { ws, snaps: [], roster: null, info: null, err: null };
  ws.on('open', () => res(st));
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.t === 'joined') { st.id = m.id; st.code = m.code; }
    else if (m.t === 'r') st.roster = m;
    else if (m.t === 's') { st.last = m; st.snaps.push(m.ph); }
    else if (m.t === 'info') st.info = m.e;
    else if (m.t === 'err') st.err = m.e;
  });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify;
(async () => {
  const a = await mk(); a.ws.send(J({ t: 'join', v: 2, mode: 'create', name: 'Host', look: { c: 3, p: 1, h: 4, e: 1, t: 2 } }));
  await sleep(500);
  console.log('lobby phase', a.last.ph, 'players', a.last.p.length, 'host', a.roster.host === a.id);
  a.ws.send(J({ t: 'start' })); await sleep(300); console.log('solo start without bots ->', a.info, 'phase', a.last.ph);
  const b = await mk(); b.ws.send(J({ t: 'join', v: 2, mode: 'code', code: a.code, name: 'Friend', look: { c: 3, p: 1 } }));
  const old = await mk(); old.ws.send(J({ t: 'join', v: 1, mode: 'quick', name: 'Old' }));
  await sleep(500); console.log('old proto err ->', old.err, '| looks', J(a.roster.list.map(x => [x[2], x[3]])));
  b.ws.send(J({ t: 'cfg', rounds: 3, chaos: 1 })); await sleep(200); console.log('non-host cfg ignored', J(a.roster.cfg));
  a.ws.send(J({ t: 'cfg', rounds: 3, bots: 0, chaos: 1 })); await sleep(200); console.log('host cfg', J(a.roster.cfg));
  b.ws.send(J({ t: 'start' })); await sleep(200); console.log('non-host start ignored, phase', a.last.ph);
  a.ws.send(J({ t: 'start' })); await sleep(600); console.log('after host start phase', a.last.ph, 'players', a.last.p.length, 'rs', a.last.rs);
  const c = await mk(); c.ws.send(J({ t: 'join', v: 2, mode: 'code', code: a.code, name: 'Late' })); await sleep(500);
  const me = c.last.p.find(x => x[0] === c.id); console.log('late joiner is spectator', !!(me[5] & 8), 'phase', c.last.ph);
  const d = await mk(); d.ws.send(J({ t: 'join', v: 2, mode: 'quick', name: 'Pub' })); await sleep(700); console.log('public lobby phase', d.last.ph, 'autoT', d.last.tm);
  process.exit(0);
})();
