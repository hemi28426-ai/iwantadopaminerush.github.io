(function(){
window.TWA = window.TWA || {};
var st = {lastFire:1e9, kx:0, kz:0, side:1, sw:0, sx:0, sy:0, mv:0};
function cl(x,a,b){return x<a?a:x>b?b:x;}
function es(x){x=cl(x,0,1);return x*x*(3-2*x);}
function bump(x,a,b){ // 0->1->0 smooth over [a,b]
  if(x<=a||x>=b) return 0; var u=(x-a)/(b-a); return Math.sin(Math.PI*u);
}
TWA['awp'] = function(S){
  var t=S.t, dt=Math.min(S.dt||0.016,0.05);
  if(S.fire < st.lastFire - 0.0001){ st.side = Math.random()<.5?-1:1; st.kx = (0.4+Math.random()*0.6)*st.side; }
  st.lastFire = S.fire;
  var p=[0,0,0], r=[0,0,0];
  if(S.aim){ // near zero, smoothly
    st.mv += (0-st.mv)*(1-Math.exp(-dt*12));
    return {p:[0,0,0], r:[0,0,0]};
  }
  // draw: slow heavy raise
  var d = es(t/1.0);
  var dr = 1-d;
  p[1] -= 0.45*dr; p[2] += 0.15*dr;
  r[0] -= 0.9*dr; r[2] += 0.25*dr;
  r[0] += 0.05*Math.sin(Math.PI*cl(t/1.1,0,1))*(1-d)*0; 
  // idle breathing
  var br = Math.sin(t*1.5);
  p[1] += 0.006*br; r[0] += 0.007*br; r[2] += 0.003*Math.sin(t*0.9);
  // movement sway, smoothed
  var mt = cl(S.moving/7,0,1.2);
  st.mv += (mt-st.mv)*(1-Math.exp(-dt*3));
  var ph = t*(S.moving>6?6.2:4.4);
  p[0] += Math.sin(ph*0.5)*0.025*st.mv;
  p[1] += -Math.abs(Math.sin(ph*0.5))*0.02*st.mv;
  r[2] += Math.sin(ph*0.5)*0.04*st.mv;
  r[1] += Math.cos(ph*0.5)*0.03*st.mv;
  r[0] += 0.03*st.mv;
  if(S.crouch){ p[1]+=0.01; }
  // recoil: massive kick, heavy settle
  var f=S.fire;
  if(f<3){
    var k = Math.exp(-f*4.2);
    var rise = 1-Math.exp(-f*60);
    var kk = k*rise;
    r[0] += 0.32*kk;
    p[2] += 0.2*kk;
    p[1] += -0.03*kk + 0.02*kk;
    r[1] += 0.06*st.kx*kk;
    r[2] += 0.1*st.kx*kk;
    p[0] += 0.02*st.kx*kk;
    // heavy overshoot settle
    var ov = Math.sin(f*7)*Math.exp(-f*3.2)*(1-Math.exp(-f*20));
    r[0] -= 0.05*ov;
    // bolt cycle 0.35 - 1.0
    if(f>0.3 && f<1.25){
      var u=(f-0.35)/0.65;
      var roll = es(cl(u/0.2,0,1)) - es(cl((u-0.75)/0.25,0,1)); // roll up, hold, back
      var pull = es(cl((u-0.2)/0.3,0,1)) - es(cl((u-0.5)/0.25,0,1)); // pull back then push
      var lift = bump(u,0.0,0.85);
      var fade = es((f-0.3)/0.1)*(1-es((f-1.05)/0.2));
      r[2] += 0.28*roll*fade;
      r[0] += 0.05*lift*fade;
      p[1] += 0.02*lift*fade;
      p[2] += 0.10*pull*fade;
      p[0] -= 0.02*roll*fade;
      r[1] += 0.04*pull*fade;
    }
  }
  // reload: long deliberate tilt and push
  if(S.reload>=0){
    var q=S.reload;
    var inn = es(q/0.15), out = 1-es((q-0.85)/0.15);
    var w = inn*out;
    r[2] += 0.5*w; r[0] -= 0.25*w; r[1] -= 0.18*w;
    p[1] -= 0.1*w; p[0] -= 0.05*w;
    var push = bump(q,0.3,0.45)+bump(q,0.6,0.75);
    p[2] -= 0.08*push; r[0] += 0.08*push;
    p[2] += 0.06*bump(q,0.45,0.6);
  }
  return {p:p, r:r};
};
})();
