const Sim=require('../game/sim.js');
for(let seed=0;seed<30;seed++){
const g=new Sim.Game(); const me=g.addPlayer('Me',null,0,false); g.newRound();
let stuck=false;
for(let i=0;i<60*200;i++){ g.setInput(me.id,-me.x/400,-me.y/400,0); g.step(1/60); g.events.length=0;
 if(g.phase==="play"&&g.elapsed>90){stuck=true;break;} if(g.phase==='over'&&0)break;}
if(stuck){console.log('stuck',g.phase,g.round,g.elapsed.toFixed(0),g.R,g.players.map(p=>[p.id,p.bot,p.alive,p.spec,p.x|0,p.y|0,p.fall].join(',')));break;}
}
