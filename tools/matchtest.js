const Sim=require('../game/sim.js'); const g=new Sim.Game(); const me=g.addPlayer('Me',null,0,false); g.newRound(); g.round=1;
const seq=[]; let lastKey='';
for(let i=0;i<60*400;i++){ g.setInput(me.id,-me.x/360,-me.y/360,0); g.step(1/60); g.events.length=0;
  const k=g.phase+':'+g.round; if(k!==lastKey){seq.push(k);lastKey=k;} if(seq.length>16)break; }
console.log(seq.join(' → ')); console.log('scores',g.players.map(p=>p.score).join(','));
