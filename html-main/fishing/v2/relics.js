// Fishing Unblocked v2 - Elderstone relics. Old things come up on the line at the ruins; the three
// statues will take them, and remember. Permanent rod upgrades (stacking, capped) + hidden awakenings.
// API: window.FRL = { roll(ctx), altarHTML(i), altarBind(el,i,rerender), rodMods(rodId), list(), TYPES, STATUES }
// State: S.relics = {typeId:count}, S.rodEnch = {rodId:{luck,pow,zone,ctl,spd,n:{typeId:offered},aw:[awakeningId]}}
(function(){
  var CHANCE = 1/25;                       // per catch at elder
  var CAPS = { luck:1.2, pow:1.0, zone:0.06, ctl:0.25, spd:0.12 };
  var RARN = ['Weathered','Carved','Storied','Ancient'];
  var RARC = ['#b8c4b0','#7fd0e8','#c89aff','#ffd060'];
  var STAT_N = { luck:'Luck', pow:'Power', zone:'Reel bar', ctl:'Steadiness', spd:'Bite speed' };
  function fmtStat(k,v){ return k==='zone' ? '+'+(v*100).toFixed(1)+'% bar' : k==='spd' ? '+'+Math.round(v*100)+'% bite' : k==='ctl' ? '+'+Math.round(v*100)+'% steady' : '+'+v.toFixed(2)+' '+STAT_N[k].toLowerCase(); }

  // ---- relic types. w = roll weight, need = conditions to surface it, st = statue that accepts it ----
  var TYPES = [
    { id:'tide',  n:'Tide-Carved Idol',  ico:'', rar:0, w:40, st:0, eff:{spd:0.015}, d:'A palm-sized figure, worn smooth by a sea that is no longer here.' },
    { id:'moss',  n:'Mossheart Bead',    ico:'', rar:0, w:34, st:1, eff:{ctl:0.03},  d:'Green stone, faintly warm. Something inside it is still growing.' },
    { id:'pearl', n:'Drowned Pearl',     ico:'', rar:1, w:16, st:0, eff:{luck:0.12}, d:'Black as a closed eye. It only comes up from open, deep water.', need:{spot:['deep','sea']} },
    { id:'rune',  n:'Rune Tablet',       ico:'', rar:1, w:14, st:1, eff:{pow:0.12},  d:'Scratched with words nobody has spoken for a thousand years.' },
    { id:'star',  n:'Fallen Star Shard', ico:'', rar:2, w:7,  st:2, eff:{zone:0.008}, d:'Cold light trapped in glass. Surfaces only after dark.', need:{night:true} },
    { id:'tear',  n:'Stormglass Tear',   ico:'', rar:2, w:6,  st:2, eff:{luck:0.10, ctl:0.01}, d:'A teardrop of rain frozen mid-fall. Found only in foul weather.', need:{wx:['rain','storm']} },
    { id:'crown', n:'Hollow Crown',      ico:'', rar:3, w:1.5,st:2, eff:{luck:0.25, zone:0.01, pow:0.1}, d:'No king wore it. It was waiting for someone to fish it up.', need:{night:true, tier:4} }
  ];
  var BY = {}; TYPES.forEach(function(t){ BY[t.id]=t; });

  var STATUES = [
    { n:'The Drowned Warden', ico:'', accepts:['tide','pearl'],
      flavor:'Water runs down its face, though the sky is dry. It speaks in the sound of a line tightening: it wants the sea\'s own offerings.' },
    { n:'The Stone Bearer', ico:'', accepts:['moss','rune'],
      flavor:'Vines hold its shoulders. It has carried a mountain for so long it forgot the mountain was a gift. It prefers things that grow, and things that are written.' },
    { n:'The Star-Eyed One', ico:'', accepts:['star','tear','crown'],
      flavor:'Two hollow eyes, and in them, slowly, a night sky turns. Only things from the high and the dark are worth its notice.' }
  ];

  // ---- awakenings: rare offering combos on ONE rod -> a named passive ----
  var AWAKE = [
    { id:'tidesong',  n:'Tidesong', ico:'', req:{tide:3, pearl:2}, passive:{id:'deep', v:0.5, desc:'Awakening: +50% luck in the open deep sea.'},
      line:'The rod hums a low note, like a shell held to the ear.' },
    { id:'stoneheart',n:'Stoneheart', ico:'', req:{moss:3, rune:3}, passive:{id:'tension', v:0.45, desc:'Awakening: the line rarely snaps.'},
      line:'Roots curl along the grip. It will not let go now.' },
    { id:'starborn',  n:'Starborn', ico:'', req:{star:2, tear:2, crown:1}, passive:{id:'night', v:0.6, desc:'Awakening: +60% luck at night.'},
      line:'Every star above turns, just slightly, toward your rod.' }
  ];

  // ---- state helpers ----
  function inv(){ if(!S.relics||typeof S.relics!=='object') S.relics={}; return S.relics; }
  function ench(rid){
    if(!S.rodEnch||typeof S.rodEnch!=='object') S.rodEnch={};
    var e=S.rodEnch[rid];
    if(!e){ e=S.rodEnch[rid]={luck:0,pow:0,zone:0,ctl:0,spd:0,n:{},aw:[]}; }
    return e;
  }
  function sv(){ if(typeof save==='function') save(); }
  function env(){ try{ return (typeof ENV==='function'&&ENV())||{}; }catch(e){ return {}; } }
  function rodName(rid){ var R=window.FWRODS||[]; for(var i=0;i<R.length;i++) if(R[i].id===rid) return R[i].n; return 'your rod'; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function beep(f,d,t,v){ if(typeof window.beep==='function'||typeof beep==='function'){ try{ window.beep(f,d,t,v); }catch(e){} } }

  // ---- roll: called by the game on every catch ----
  function eligible(t, ctx, E){
    var n=t.need; if(!n) return true;
    var night = ctx.night!==undefined ? ctx.night : !!E.night;
    var wx = ctx.wx || E.wx;
    if(n.night && !night) return false;
    if(n.wx && n.wx.indexOf(wx)<0) return false;
    if(n.spot && n.spot.indexOf(ctx.spot)<0) return false;
    if(n.tier && !(ctx.tier>=n.tier)) return false;
    return true;
  }
  function roll(ctx){
    ctx=ctx||{};
    if(ctx.isl!=='elder') return null;
    var rnd = ctx.rnd || Math.random;
    if(rnd() >= CHANCE) return null;
    var E=env(), pool=[], tot=0, i;
    for(i=0;i<TYPES.length;i++){ if(eligible(TYPES[i],ctx,E)){ pool.push(TYPES[i]); tot+=TYPES[i].w; } }
    if(!pool.length) return null;
    var r=rnd()*tot, t=pool[pool.length-1];
    for(i=0;i<pool.length;i++){ r-=pool[i].w; if(r<=0){ t=pool[i]; break; } }
    var I=inv(); I[t.id]=(I[t.id]||0)+1;
    var rel={id:t.id,n:t.n,ico:t.ico,rar:t.rar};
    if(typeof addFeed==='function') addFeed(t.ico+' The line comes up heavy: <b style="color:'+RARC[t.rar]+'">'+esc(t.n)+'</b> ('+RARN[t.rar]+' relic). The statues will want this.');
    if(typeof banner==='function') banner(t.ico+' RELIC: '+esc(t.n)+'!', RARC[t.rar]);
    if(typeof hint==='function') hint('A relic! Take it to the giant statues of Elderstone.',3);
    beep(t.rar>=2?523:392,.25,'triangle'); if(t.rar>=2) setTimeout(function(){beep(784,.4,'sine');},180);
    sv();
    return rel;
  }

  // ---- offering ----
  function room(e, t){ // true if this offering would still add something
    for(var k in t.eff) if(e[k] < CAPS[k]-1e-9) return true;
    return false;
  }
  function checkAwake(e){
    var out=null;
    for(var i=0;i<AWAKE.length;i++){
      var a=AWAKE[i]; if(e.aw.indexOf(a.id)>=0) continue;
      var ok=true; for(var k in a.req) if((e.n[k]||0)<a.req[k]) { ok=false; break; }
      if(ok){ e.aw.push(a.id); out=a; }
    }
    return out;
  }
  function offer(typeId, rodId){
    rodId = rodId || S.rod;
    var t=BY[typeId]; if(!t) return {ok:false,why:'unknown'};
    var I=inv(); if(!(I[typeId]>0)) return {ok:false,why:'none'};
    var e=ench(rodId);
    if(!room(e,t)) return {ok:false,why:'sated'};
    var gained={};
    for(var k in t.eff){ var nv=Math.min(CAPS[k], e[k]+t.eff[k]); gained[k]=+(nv-e[k]).toFixed(4); e[k]=+nv.toFixed(4); }
    I[typeId]--; if(I[typeId]<=0) delete I[typeId];
    e.n[typeId]=(e.n[typeId]||0)+1;
    var aw=checkAwake(e);
    sv();
    return {ok:true,gained:gained,awakened:aw,type:t};
  }

  // ---- what the game adds to the rod ----
  function rodMods(rodId){
    var e=S&&S.rodEnch&&S.rodEnch[rodId];
    var m={luck:0,pow:0,zone:0,ctl:0,spd:0};
    if(!e) return m;
    for(var k in CAPS) m[k]=Math.min(CAPS[k], e[k]||0);
    if(e.aw&&e.aw.length){
      m.aw=e.aw.map(function(id){ for(var i=0;i<AWAKE.length;i++) if(AWAKE[i].id===id) return AWAKE[i].n; return id; });
      for(var i=0;i<AWAKE.length;i++) if(e.aw.indexOf(AWAKE[i].id)>=0){ m.passive={id:AWAKE[i].passive.id,v:AWAKE[i].passive.v,desc:AWAKE[i].passive.desc}; break; }
    }
    return m;
  }
  function list(){
    var I=inv(), out=[];
    TYPES.forEach(function(t){ if(I[t.id]>0) out.push({id:t.id,n:t.n,ico:t.ico,rar:t.rar,count:I[t.id],d:t.d,statue:t.st}); });
    return out;
  }

  // ---- UI ----
  var CSS_DONE=false;
  function css(){
    if(CSS_DONE) return; CSS_DONE=true;
    var s=document.createElement('style');
    s.textContent='@keyframes frlIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}'+
      '@keyframes frlGlow{0%,100%{opacity:.55}50%{opacity:1}}'+
      '.frl-rev{text-align:center;padding:26px 8px}.frl-rev .big{font-size:56px;animation:frlGlow 1.1s ease-in-out infinite}'+
      '.frl-rev p{opacity:0;animation:frlIn .6s ease forwards;margin:8px 0}.frl-rev p:nth-of-type(2){animation-delay:.7s}.frl-rev p:nth-of-type(3){animation-delay:1.4s}'+
      '.frl-rel{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:7px 8px;margin:5px 0;border-radius:8px;background:rgba(255,255,255,.07)}'+
      '.frl-rel.off{opacity:.45}.frl-ico{font-size:26px;width:34px;text-align:center}';
    document.head.appendChild(s);
  }
  function effText(t){ var a=[]; for(var k in t.eff) a.push(fmtStat(k,t.eff[k])); return a.join(', '); }
  function hintAwake(e, st){ // cryptic, never reveals the recipe
    var typ=STATUES[st].accepts, any=false;
    AWAKE.forEach(function(a){ if(e.aw.indexOf(a.id)>=0) return; for(var k in a.req) if((e.n[k]||0)>0 && typ.indexOf(k)>=0) any=true; });
    return any;
  }

  function altarHTML(idx){
    var st=STATUES[idx]; if(!st) return '';
    var rid=S.rod, e=ench(rid), I=inv();
    var h='<h3>'+st.ico+' '+esc(st.n)+'</h3>'+
      '<p style="font-size:13px;opacity:.85;font-style:italic">'+esc(st.flavor)+'</p>'+
      '<p style="font-size:13px">Offering to bless: <b>'+esc(rodName(rid))+'</b></p>';
    // current gifts on this rod
    var g=[]; for(var k in CAPS) if(e[k]>0) g.push(fmtStat(k,e[k])+(e[k]>=CAPS[k]-1e-9?' (max)':''));
    h+='<div style="font-size:12px;opacity:.8;margin-bottom:6px">'+(g.length?'The stones remember: '+g.join(' · '):'This rod carries no gifts yet.')+'</div>';
    e.aw.forEach(function(id){ AWAKE.forEach(function(a){ if(a.id===id) h+='<div style="font-size:13px;color:#ffd060">'+a.ico+' Awakened: <b>'+esc(a.n)+'</b> — '+esc(a.passive.desc)+'</div>'; }); });
    if(hintAwake(e,idx)) h+='<div style="font-size:12px;color:#c89aff;animation:frlGlow 2.4s infinite">The stone hums. Something in this rod is half-awake...</div>';
    // inventory
    var any=false;
    h+='<h4 style="margin:10px 0 2px">Your relics</h4>';
    TYPES.forEach(function(t){
      var c=I[t.id]||0; if(!c) return; any=true;
      var mine=t.st===idx, sated=mine&&!room(e,t);
      h+='<div class="frl-rel'+(mine?'':' off')+'"><span class="frl-ico">'+t.ico+'</span><span style="flex:1;font-size:13px"><b style="color:'+RARC[t.rar]+'">'+esc(t.n)+'</b> ×'+c+
        '<br><span style="opacity:.8;font-size:12px">'+(mine ? esc(t.d)+'<br>Offer: <b>'+effText(t)+'</b> to this rod'+(sated?' — already at its limit':'') : 'Not for this statue. Another one will want it.')+'</span></span>'+
        (mine?'<button class="btn g" data-frl="'+t.id+'" '+(sated?'disabled':'')+'>Offer</button>':'')+'</div>';
    });
    if(!any) h+='<p style="font-size:13px;opacity:.75">You carry no relics. Fish around Elderstone, especially at night, in storms and in deep water: the old things sometimes bite.</p>';
    return h;
  }

  function altarBind(el, idx, rerender){
    if(!el||!el.querySelectorAll) return;
    css();
    var bs=el.querySelectorAll('[data-frl]');
    for(var i=0;i<bs.length;i++) (function(b){
      b.onclick=function(){
        var res=offer(b.getAttribute('data-frl'), S.rod);
        if(!res.ok){ if(typeof hint==='function') hint('The statue is silent.',2); return; }
        var t=res.type, rare=t.rar>=2||res.awakened;
        el.innerHTML='<div class="frl-rev"><div class="big">'+t.ico+'</div><p>The stone drinks the '+esc(t.n.toLowerCase())+'...</p>'+
          '<p style="color:#9fe8ff"><b>'+Object.keys(res.gained).map(function(k){return res.gained[k]>0?fmtStat(k,res.gained[k]):'';}).filter(Boolean).join(', ')+'</b></p>'+
          '<p style="color:#ffd060">'+(res.awakened?res.awakened.ico+' <b>'+esc(res.awakened.n)+'</b> awakens. '+esc(res.awakened.line):'It is done.')+'</p></div>';
        beep(262,.5,'sine'); setTimeout(function(){beep(330,.4,'triangle');},350); setTimeout(function(){beep(rare?784:523,.5,'triangle');},800);
        if(res.awakened){
          setTimeout(function(){beep(1046,.7,'sine');},1400);
          if(typeof banner==='function') banner(res.awakened.ico+' AWAKENING: '+esc(res.awakened.n)+'!','#ffd060');
          if(typeof addFeed==='function') addFeed(res.awakened.ico+' <b>'+esc(rodName(S.rod))+'</b> awakens: <b>'+esc(res.awakened.n)+'</b>!');
        }
        setTimeout(function(){ if(typeof rerender==='function') rerender(); },res.awakened?2400:1700);
      };
    })(bs[i]);
  }

  window.FRL = { roll:roll, altarHTML:altarHTML, altarBind:altarBind, rodMods:rodMods, list:list, offer:offer, TYPES:TYPES, STATUES:STATUES, AWAKENINGS:AWAKE, CAPS:CAPS };
})();
