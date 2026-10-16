const Sim=require('../game/sim.js');
const g=new Sim.Game();
const me=g.addPlayer('Me',null,0,false);
g.newRound();
let rounds=0,last=g.round,wins={},kos=0,t=0,maxT=0,rt=0;
for(let i=0;i<60*60*10;i++){ // 10 min
  // human acts like a bot: random walk toward center
  g.setInput(me.id,-me.x/400,-me.y/400,0);
  g.step(1/60); rt+=1/60;
  for(const e of g.events){ if(e[0]==='ko')kos++; if(e[0]==='win'){wins[e[1]]=(wins[e[1]]||0)+1; maxT=Math.max(maxT,rt); rt=0; rounds++;} }
  g.events.length=0;
}
console.log("g.round",g.round);console.log({rounds,wins,kos,maxRoundSec:maxT.toFixed(1),players:g.players.length});
const s=JSON.stringify(g.snapshot()); console.log('snap bytes',s.length);
