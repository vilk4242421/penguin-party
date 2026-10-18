// Прогон симуляции без браузера: каждый режим на ботах, турнир 3/5/7, проверка очков.
const Sim = require('../game/sim.js');
const { C, MODES } = Sim;
const only = process.argv[2] != null ? +process.argv[2] : -1;
const rounds = +(process.argv[3] || 6);
let fails = 0; const fail = (m) => { fails++; console.log('  FAIL:', m); };

function runMode(mid) {
  const durs = [], reasons = {};
  const g = new Sim.Game({ lobby: false });
  g.cfg.kind = 1; g.cfg.mode = mid; g.cfg.len = 7; g.cfg.bots = 1;
  g.startMatch();
  let r0 = 0, lastRound = 1, t = 0, safety = 0;
  while (g.phase !== 'final' && safety++ < 60 * 60 * 40) {
    g.step(1 / 60); t += 1 / 60;
    for (const e of g.events) {
      if (e[0] === 'res') {
        const res = e[1], n = res.length;
        durs.push(+g.elapsed.toFixed(1));
        const sum = res.reduce((s, r) => s + r[2], 0);
        if (sum !== n * (n - 1) / 2) fail('points sum ' + sum + ' for n=' + n);
        if (res[0][2] !== n - 1) fail('winner pts');
        if (new Set(res.map((r) => r[0])).size !== n) fail('dup ids in results');
        if (n !== 5) fail('participants ' + n);
      }
    }
    g.events.length = 0;
  }
  if (g.phase !== 'final') fail('mode ' + mid + ' match did not finish');
  return { durs, rank: g.ranking.length };
}
const list = only >= 0 ? [only] : MODES.map((m) => m.id);
for (const id of list) {
  const m = MODES[id]; let all = [];
  try { for (let k = 0; k < Math.max(1, Math.round(rounds / 7)); k++) { const r = runMode(id); all = all.concat(r.durs); } } catch (e) { fail('exception in mode ' + id + ': ' + e.stack.split('\n').slice(0, 3).join(' | ')); continue; }
  const avg = all.reduce((a, b) => a + b, 0) / (all.length || 1);
  console.log(`${m.icon} ${m.key.padEnd(7)} rounds=${all.length} avg=${avg.toFixed(1)}s min=${Math.min(...all)} max=${Math.max(...all)}`);
}
// турнир: 3/5/7 разных режимов
for (const len of C.LENS) {
  const g = new Sim.Game({ lobby: false }); g.cfg.kind = 0; g.cfg.len = len; g.cfg.bots = 1; g.startMatch();
  const plan = g.plan.slice();
  if (new Set(plan).size !== len) fail('tour plan not distinct ' + plan);
  let s = 0; while (g.phase !== 'final' && s++ < 60 * 60 * 60) { g.step(1 / 60); g.events.length = 0; }
  console.log(`tour len=${len} plan=${plan} finished=${g.phase === 'final'} ranking=${g.ranking.length} scores=${g.ranking.map((id) => g.players.find((p) => p.id === id).score)}`);
  if (g.phase !== 'final') fail('tour did not finish');
}
console.log(fails ? 'FAILS: ' + fails : 'ALL OK');
process.exit(fails ? 1 : 0);
