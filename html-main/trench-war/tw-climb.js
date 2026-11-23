// Trench War: mantle/climb. Hooked from trench-war.html via TWC.init/update/cam/low.
(function(){
const MAXH=2.6,DUR=.5;let P=null;
const ss=t=>{t=t<0?0:t>1?1:t;return t*t*(3-2*t)};
function probe(o,dx,dz){ // find a climbable edge ahead of o.pos in unit dir (dx,dz)
 const p=o.pos,L=Math.hypot(dx,dz);if(L<.01)return null;dx/=L;dz/=L;
 if(!P.blocked(p.x+dx*.15,p.z+dz*.15,p.y))return null; // must be pressed against something
 let d0=-1,top=0;for(let d=.1;d<=1.2;d+=.05){const h=P.hAt(p.x+dx*d,p.z+dz*d);if(h>p.y+P.STEP-.01){d0=d;top=h;break}}
 if(d0<0)return null;
 const rise=top-p.y;if(rise>MAXH||P.cType(p.x+dx*d0,p.z+dz*d0)===3)return null;
 for(let d=d0+.45;d<=d0+1.3;d+=.1){const x=p.x+dx*d,z=p.z+dz*d;if(P.groundUnder(x,z)<=top+.01&&!P.blocked(x,z,top))return{x,z,y:top,rise}}
 return null}
// returns true while o is mid-climb (caller must skip normal physics)
function update(o,vx,vz,dt,want){
 let c=o.climb;
 if(c&&(Math.abs(o.pos.x-c.cx)>.4||Math.abs(o.pos.y-c.cy)>.4||Math.abs(o.pos.z-c.cz)>.4))c=o.climb=null; // teleported/respawned
 if(!c){if(!want||!P)return false;const t=probe(o,vx,vz);if(!t)return false;
  c=o.climb={t:0,dur:DUR*(.8+.2*t.rise/MAXH),x0:o.pos.x,y0:o.pos.y,z0:o.pos.z,x1:t.x,y1:t.y,z1:t.z,cx:0,cy:0,cz:0,u:0}}
 c.t+=dt;const u=Math.min(1,c.t/c.dur);c.u=u;
 const v=ss(u/.7),h=ss((u-.3)/.7);
 o.pos.set(c.x0+(c.x1-c.x0)*h,c.y0+(c.y1-c.y0)*v,c.z0+(c.z1-c.z0)*h);
 c.cx=o.pos.x;c.cy=o.pos.y;c.cz=o.pos.z;
 if(u>=1)o.climb=null;
 return true}
const cam=o=>{const c=o.climb;return c?-.2*Math.sin(Math.PI*c.u)+.035*Math.sin(c.u*Math.PI*4):0};
const low=o=>{const c=o.climb;return c?.32*Math.sin(Math.PI*Math.min(1,c.u*1.15)):0};
window.TWC={init:p=>{P=p},update,cam,low,probe};
})();
