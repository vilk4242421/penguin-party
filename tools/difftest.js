// Проверка сложности: за каждый режим один бот «тяжёлый», один «лёгкий», трое «средних». Средние места (1 — лучшее).
const Sim = require('../game/sim.js'); const { C, MODES } = Sim;
function setDiff(p, d) { const D = C.DIFFS[d]; p.ai.skill = (D.skill[0] + D.skill[1]) / 2; p.ai.dashP = (D.dash[0] + D.dash[1]) / 2; p.ai.react = D.react; }
const only = process.argv[2] != null ? +process.argv[2] : -1, games = +(process.argv[3] || 5);
const tot = { 0: [], 1: [], 2: [] };
for (const mid of MODES.map((m) => m.id)) {
  if (only >= 0 && mid !== only) continue;
  const places = { 0: [], 1: [], 2: [] };
  for (let k = 0; k < games; k++) {
    const g = new Sim.Game({ lobby: false }); g.cfg.kind = 1; g.cfg.mode = mid; g.cfg.len = 7; g.cfg.bots = 1; g.startMatch();
    const L = { [g.players[0].id]: 2, [g.players[1].id]: 0 }; g.players.forEach((p, i) => setDiff(p, i === 0 ? 2 : i === 1 ? 0 : 1));
    let safety = 0;
    while (g.phase !== 'final' && safety++ < 60 * 60 * 40) {
      g.step(1 / 60);
      for (const e of g.events) if (e[0] === 'res') for (const [id, pl] of e[1]) { const d = id in L ? L[id] : 1; places[d].push(pl); }
      g.events.length = 0;
    }
  }
  const av = (a) => (a.reduce((s, x) => s + x, 0) / Math.max(1, a.length)).toFixed(2);
  console.log(MODES[mid].icon, MODES[mid].key.padEnd(7), 'лёгкий', av(places[0]), '| средний', av(places[1]), '| тяжёлый', av(places[2]));
  for (const d of [0, 1, 2]) tot[d].push(...places[d]);
}
const av = (a) => (a.reduce((s, x) => s + x, 0) / Math.max(1, a.length)).toFixed(2);
console.log('ИТОГО  лёгкий', av(tot[0]), '| средний', av(tot[1]), '| тяжёлый', av(tot[2]));
