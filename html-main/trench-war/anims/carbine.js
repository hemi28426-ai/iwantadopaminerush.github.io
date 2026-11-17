(function(){
window.TWA = window.TWA || {};
var st = {lastFire:1e9, kick:0, kx:0, ky:0, kr:0, ex:0, ey:0, side:0, bolt:0};
function sm(x){x=x<0?0:x>1?1:x;return x*x*(3-2*x);}
function seg(x,a,b){return sm((x-a)/(b-a));}
TWA['carbine'] = function(S){
  var dt = Math.min(S.dt||0.016, 0.05), t = S.t, a = S.aim ? 0.15 : 1;
  // new shot detection
  if (S.fire < st.lastFire - 1e-4) {
    st.kick = Math.min(st.kick + 1, 2.2);
    st.side += (Math.random() - 0.5) * 2;
    st.side = Math.max(-1.5, Math.min(1.5, st.side));
    st.bolt = (Math.random() - 0.5);
  }
  st.lastFire = S.fire;
  var d = Math.exp(-14 * dt);
  st.kick *= Math.exp(-9 * dt);
  st.side *= Math.exp(-7 * dt);
  var k = st.kick;
  var x = st.side * 0.012 * a, y = 0.004 * k * a, z = 0.03 * k * a;
  var rx = 0.035 * k * a, ry = st.side * 0.025 * a, rz = -st.side * 0.02 * a;
  // draw
  var dr = 1 - seg(t, 0, 0.45);
  if (dr > 0) { y -= 0.18 * dr; z += 0.06 * dr; rx -= 0.5 * dr; rz += 0.22 * dr; ry -= 0.12 * dr; }
  // idle breathing + move sway
  var mv = Math.min(S.moving / 7, 1);
  rx += Math.sin(t * 1.5) * 0.004 * a; y += Math.sin(t * 1.5) * 0.002 * a;
  var sw = Math.sin(t * (S.moving > 6 ? 9 : 6.5)) * mv * a;
  x += sw * 0.008; rz += sw * 0.014; ry += Math.cos(t * 3.2) * mv * 0.01 * a;
  if (S.moving > 6 && !S.aim) { rx -= 0.05; y -= 0.015; }
  if (S.crouch) y += 0.005;
  // reload
  var r = S.reload;
  if (r >= 0) {
    var tilt = seg(r, 0.04, 0.22) * (1 - seg(r, 0.78, 0.9));
    rz += 0.75 * tilt; ry -= 0.25 * tilt; rx += 0.18 * tilt; x -= 0.04 * tilt; y -= 0.03 * tilt;
    var sw2 = seg(r, 0.35, 0.45) * (1 - seg(r, 0.5, 0.6));       // mag swap jolt
    y -= 0.03 * sw2; rx -= 0.1 * sw2; z += 0.015 * sw2;
    var pull = seg(r, 0.8, 0.9) * (1 - seg(r, 0.9, 0.93));        // charging pull, snap release
    z += 0.075 * pull; x -= 0.01 * pull; rz += 0.08 * pull * (1 - seg(r,0.78,0.9) * 0) ;
    var snap = seg(r, 0.93, 0.97) * (1 - seg(r, 0.97, 1));
    rx += 0.04 * snap; z -= 0.012 * snap;
  }
  return {p:[x, y, z], r:[rx, ry, rz]};
};
})();
