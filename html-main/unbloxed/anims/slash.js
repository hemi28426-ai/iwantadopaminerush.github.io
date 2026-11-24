// Unbloxed sword slash: classic rigid R6 chop (wind-up, diagonal chop, follow-through, settle)
(function(){
window.UBXA=window.UBXA||{};
var PI=Math.PI;
// keyframes: [f, armAngle, armZ, bodyYaw, bodyLean, leftArm, legR, legL]
var K=[
 [0.00,PI/2,   0,    0,    0,    0,    0,    0],
 [0.24,2.75,  -0.45,-0.55,-0.10, 0.5,  0.25,-0.25],  // wind-up: arm up and back, twist
 [0.30,2.85,  -0.5, -0.6, -0.12, 0.55, 0.28,-0.28],  // brief hold
 [0.52,0.55,   0.55, 0.65, 0.22,-0.4, -0.35, 0.35],  // fast chop down and across
 [0.68,0.35,   0.7,  0.7,  0.26,-0.45,-0.4,  0.4],   // follow-through
 [1.00,PI/2,   0,    0,    0,    0,    0,    0]
];
function ease(t){return t*t*(3-2*t)}
function fastOut(t){return 1-(1-t)*(1-t)*(1-t)}
UBXA.slash=function(c,f,o){
 f=f<0?0:f>1?1:f;
 var i=1;while(i<K.length-1&&f>K[i][0])i++;
 var a=K[i-1],b=K[i],t=(f-a[0])/(b[0]-a[0]);
 // wind-up eases smoothly, the chop snaps, the settle eases
 t=(i===1)?ease(t):(i===2)?t:(i===3)?fastOut(t):ease(t);
 var v=[];for(var k=1;k<8;k++)v.push(a[k]+(b[k]-a[k])*t);
 c.aR.rotation.x=-v[0];c.aR.rotation.z=v[1];
 c.aL.rotation.x=-v[4]*0+(-v[4]);
 c.aL.rotation.z=0;
 c.lR.rotation.x=-v[5];c.lL.rotation.x=-v[6];
 c.body.rotation.y=v[2];c.body.rotation.x=v[3];
 if(f>=1){c.aR.rotation.z=0;c.body.rotation.y=0;c.body.rotation.x=0}
};
})();
