// Trench War settings panel (sensitivity, FOV, volume, graphics). Saved in localStorage tw_settings.
(function(){
const G=TWG,E=id=>document.getElementById(id);
function save(){try{localStorage.setItem('tw_settings',JSON.stringify(TWS))}catch(e){}}
function applyGfx(){const q=G[TWS.gfx];R.setPixelRatio(q.pr);R.setSize(innerWidth,innerHeight);
 const on=q.sh>0;R.shadowMap.enabled=on;sun.castShadow=on;
 if(on&&sun.shadow.mapSize.x!==q.sh){sun.shadow.mapSize.set(q.sh,q.sh);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
 scene.traverse(o=>{const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>x.needsUpdate=true)});
 dust.visible=q.dust>0}
function apply(){cam.fov=TWS.fov;cam.updateProjectionMatrix();const a=window.AC;if(a&&a.MG)a.MG.gain.value=TWS.vol}
const ov=document.createElement('div');ov.id='twSet';ov.className='ov';ov.style.display='none';
ov.innerHTML='<div class="box" style="min-width:min(440px,94vw)"><h2>Settings</h2>'+
 '<div class="row"><label>Mouse sensitivity</label><input type="range" id="twsSens" min="0.3" max="2.5" step="0.05"><span class="v" id="twvSens"></span></div>'+
 '<div class="row"><label>Field of view</label><input type="range" id="twsFov" min="60" max="100" step="1"><span class="v" id="twvFov"></span></div>'+
 '<div class="row"><label>Master volume</label><input type="range" id="twsVol" min="0" max="1" step="0.05"><span class="v" id="twvVol"></span></div>'+
 '<div class="row"><label>Graphics</label><select id="twsGfx"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>'+
 '<div class="st" id="twsNote" style="min-height:16px"></div>'+
 '<div class="st">Low: no shadows, lower resolution, no dust. High: sharper shadows and smoothing (smoothing needs a reload).</div>'+
 '<div style="margin-top:12px"><button id="twsClose">Back</button></div></div>';
document.body.appendChild(ov);
let gfx0=TWS.gfx;
function sync(){E('twsSens').value=TWS.sens;E('twvSens').textContent=TWS.sens.toFixed(2)+'x';E('twsFov').value=TWS.fov;E('twvFov').textContent=TWS.fov;E('twsVol').value=TWS.vol;E('twvVol').textContent=Math.round(TWS.vol*100)+'%';E('twsGfx').value=TWS.gfx}
E('twsSens').oninput=e=>{TWS.sens=+e.target.value;sync();save()};
E('twsFov').oninput=e=>{TWS.fov=+e.target.value;sync();apply();save()};
E('twsVol').oninput=e=>{TWS.vol=+e.target.value;sync();apply();save()};
E('twsGfx').onchange=e=>{TWS.gfx=e.target.value;save();applyGfx();E('twsNote').textContent=(TWS.gfx==='high')!==(gfx0==='high')?'Reload the page to change smoothing (antialiasing).':''};
function open(){sync();ov.style.display='flex'}
E('twsClose').onclick=()=>{ov.style.display='none'};
for(const id of['twSettingsBtn','twSettingsBtn2']){const b=E(id);if(b)b.onclick=open}
})();
