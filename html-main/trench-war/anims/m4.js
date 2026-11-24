(function(){
window.TWA = window.TWA || {};
var st = {lastFire:1e9, kick:0, side:0, rk:0, bump:0, prevRel:-1, sway:0, ph:0, seed:1};
function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
function seg(x,a,b){return ease((x-a)/(b-a));}
TWA['m4'] = function(S){
  var dt = Math.min(S.dt||0.016, 0.05);
  var aim = S.aim ? 0.25 : 1;
  // new shot
  if (S.fire < st.lastFire - 1e-6 && S.fire < 0.2) {
    st.kick = Math.min(st.kick + 1, 2.2);
    st.side += (Math.random() - 0.5) * 2;
    st.rk += (Math.random() - 0.5) * 2;
  }
  st.lastFire = S.fire;
  var d = Math.exp(-dt * 16);
  st.kick *= d; st.side *= Math.exp(-dt * 9); st.rk *= Math.exp(-dt * 9);
  // bolt release bump at end of reload
  if (S.reload >= 0 && S.reload > 0.8 && st.prevRel <= 0.8 && st.prevRel >= 0) st.bump = 1;
  st.prevRel = S.reload;
  st.bump *= Math.exp(-dt * 12);

  st.ph += dt * (S.moving > 0.5 ? (S.moving > 6 ? 9 : 6.5) : 0);
  var mv = Math.min(S.moving / 6, 1);
  st.sway += (mv - st.sway) * (1 - Math.exp(-dt * 6));
  var t = S.t;
  var br = Math.sin(t * 1.6) * (1 - st.sway * 0.6);

  var p = [0, 0, 0], r = [0, 0, 0];
  // idle breathing
  p[1] += br * 0.004 * aim; r[0] += br * 0.004 * aim;
  p[0] += Math.sin(t * 0.8) * 0.002 * aim;
  // movement sway
  p[0] += Math.sin(st.ph) * 0.012 * st.sway * aim;
  p[1] += Math.abs(Math.cos(st.ph)) * 0.008 * st.sway * aim;
  r[2] += Math.sin(st.ph) * 0.02 * st.sway * aim;
  r[1] += Math.cos(st.ph) * 0.012 * st.sway * aim;
  // recoil
  p[2] += st.kick * 0.022 * aim; p[1] += st.kick * 0.006 * aim;
  r[0] += st.kick * 0.03 * aim;
  r[1] += st.side * 0.007 * st.kick * aim;
  r[2] += st.rk * 0.008 * st.kick * aim;
  p[0] += st.side * 0.003 * st.kick * aim;
  // draw
  if (t < 0.6) {
    var k = 1 - seg(t, 0, 0.55);
    p[1] -= 0.32 * k; p[2] += 0.1 * k;
    r[0] -= 0.7 * k; r[2] -= 0.5 * k; r[1] += 0.2 * k;
  }
  // reload
  if (S.reload >= 0) {
    var x = S.reload;
    var tilt = seg(x, 0, 0.15) * (1 - seg(x, 0.85, 1));
    var drop = seg(x, 0.2, 0.32) * (1 - seg(x, 0.32, 0.42));    // mag out jerk
    var ins = seg(x, 0.55, 0.65) * (1 - seg(x, 0.65, 0.72));    // mag insert thump
    var shake = Math.sin(x * 30) * 0.004 * seg(x, 0.35, 0.5) * (1 - seg(x, 0.5, 0.55));
    p[1] -= 0.06 * tilt; p[0] -= 0.04 * tilt;
    r[0] -= 0.28 * tilt; r[2] += 0.5 * tilt; r[1] += 0.18 * tilt;
    p[1] -= 0.035 * drop; r[0] -= 0.1 * drop;
    p[1] += 0.03 * ins; r[0] += 0.08 * ins; p[2] += 0.015 * ins;
    p[1] += shake;
    p[2] -= 0.06 * st.bump; r[0] += 0.05 * st.bump; // bolt release bump
  }
  return {p: p, r: r};
};
})();
