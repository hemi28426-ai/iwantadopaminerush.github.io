// zlooks/anim.js: zombie animation layer. Runs after the normal avatar pose (animAvatar + TWA_TP) for anything wearing a zombie look,
// on the host and on clients alike (both animate zombies through animAvatar). Players and bots are untouched.
//  walk:   a slow, stiff shamble. Short dragging steps, one leg limps, the body rolls side to side and pitches forward a little each step.
//  arms:   both arms reach out in front, drooping and swaying out of sync, hands drifting toward the target.
//  idle:   arms sag lower and the body sways slowly, the head lolls.
//  attack: both arms rear up and claw down in a two-handed swipe (pitch < -0.3 is the game's "swinging" signal).
(function(){if(typeof animAvatar!=='function')return;
const base=animAvatar,PI2=Math.PI/2,lerp=(a,b,k)=>a+(b-a)*k;
window.animAvatar=function(o,speed,pitch,dt,crouch){base(o,speed,pitch,dt,crouch);const u=o.userData;if(!u.zl||u.zl==='hound'||!u.arms)return;
 try{zAnim(o,u,speed||0,pitch||0,Math.min(dt||.016,.1))}catch(e){}};
function zAnim(o,u,speed,pitch,dt){
 const z=u._za||(u._za={t:Math.random()*9,mv:0,atk:0,was:false,seed:Math.random(),dir:Math.random()<.5?1:-1}),k=1-Math.exp(-dt*8);
 z.t+=dt;const mvT=speed>.3?1:0;z.mv+=(mvT-z.mv)*k;
 z.ph=(z.ph||0)+dt*Math.min(speed,6)*1.35;const ph=z.ph,mv=z.mv,idle=1-mv,T=z.t,sd=z.seed*6;
 const L=u.legs,s=Math.sin(ph),gi=z.dir>0?0:1,bi=1-gi;
 // legs: the good leg steps normally; the bad leg drags (short forward reach, kept splayed out) and the body dips when it takes weight
 const badW=Math.max(0,Math.sin(ph+Math.PI))*mv; // 0..1 while the bad leg is planted
 if(L&&L.length===2){L[gi].rotation.x=s*.55*mv;L[bi].rotation.x=Math.max(-.15,Math.min(.35,-s*.4))*mv;L[bi].rotation.z=(z.dir>0?-1:1)*.12*mv;L[gi].rotation.z=0}
 const b=u.body,a=u.arms,R=a.children[0],Lf=a.children[1];
 // attack: 0.5 s. wind-up (arms rear up and spread, lean back), slash (snap down and in, lunge forward), recover
 const swing=pitch<-.3;if(swing&&!z.was)z.atk=.5;z.was=swing;
 let up=0,spread=0,lean=0;if(z.atk>0){z.atk=Math.max(0,z.atk-dt);const p=1-z.atk/.5;
  if(p<.35){const q=p/.35;up=-1.4*q;spread=.3*q;lean=-.15*q}
  else if(p<.55){const q=(p-.35)/.2;up=-1.4+2.4*q;spread=.3-.45*q;lean=-.15+.45*q}
  else{const q=(p-.55)/.45;up=1.0*(1-q);spread=-.15*(1-q);lean=.3*(1-q)}}
 // body: uneven roll (extra dip toward the bad side), forward pitch, idle sway
 if(b){const side=z.dir>0?-1:1,roll=Math.sin(ph)*.1*mv+side*badW*.1+Math.sin(T*.8+sd)*.035*idle,
   pit=(.08+Math.abs(Math.cos(ph))*.05)*mv+.06*idle+lean;
  b.rotation.z=roll;b.rotation.x=pit;b.rotation.y=Math.sin(ph*.5)*.06*mv+0;b.position.y-=badW*.07}
 // head lolls on its neck
 const hd=u.zhead;if(hd){hd.rotation.z=Math.sin(T*.7+sd)*.2*idle+Math.sin(ph)*.08*mv;hd.rotation.x=.1+Math.sin(T*.5+sd*1.3)*.15*idle+Math.cos(ph*2)*.05*mv}
 // arms reach forward, out of sync and unevenly sagging, splaying a little; sag much more when idle
 const atkOn=z.atk>0?1:0,sag=(.6*idle+.08)*(1-atkOn),sw=.25*mv+.08*idle,ws=idle?Math.sin(T*1.1+sd):0;
 const rx=-PI2+sag+Math.sin(ph+sd)*sw+ws*.08*idle+up,lx=-PI2+sag+.15+Math.sin(ph+1.9+sd)*sw+Math.sin(T*.9+sd+2)*.08*idle+up;
 const cl=v=>Math.max(-PI2-1.5,Math.min(-PI2+.8,v));
 R.rotation.order='XYZ';R.rotation.set(cl(rx),.06,-.1*Math.sin(ph+sd)*mv-spread);
 Lf.rotation.order='XYZ';Lf.rotation.set(cl(lx),-.06,.1*Math.sin(ph+sd+1.5)*mv+spread);
 a.rotation.x=0;a.rotation.y=0;a.position.y=.5+Math.abs(s)*.03*mv}
})();
