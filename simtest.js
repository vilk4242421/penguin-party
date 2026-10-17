// Проверка симуляции без браузера: матч из 5 раундов, ничего не зависает.
const Sim = require('../game/sim.js');
const g = new Sim.Game({ lobby: false });
const me = g.addPlayer('Me', { c: 1 }, false);
g.startMatch();
const seq = []; let key = '', fin = 0, kos = 0;
for (let i = 0; i < 60 * 600 && fin < 3; i++) {
  g.setInput(me.id, -me.x / 360, -me.y / 360, 0); g.step(1 / 60);
  for (const e of g.events) { if (e[0] === 'ko') kos++; if (e[0] === 'final') fin++; } g.events.length = 0;
  const k = g.phase + ':' + g.round; if (k !== key) { key = k; if (seq.length < 24) seq.push(k); }
}
console.log(seq.join(' → ')); console.log({ matchesFinished: fin, kos, players: g.players.length });
if (fin < 3) { console.error('FAIL: матчи не завершаются'); process.exit(1); }
