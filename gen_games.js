const fs=require('fs');
const files=fs.readdirSync('./html-main').filter(f=>f.endsWith('.html'));
const games=[];
for(const fname of files.sort()){
  try{
    const content=fs.readFileSync('./html-main/'+fname,'utf8').slice(0,2000);
    const m=content.match(/<title>(.*?)<\/title>/i);
    const title=m?m[1].trim():fname.replace('.html','');
    if(title&&title!='Unity WebGL Player'&&title.trim()!='') games.push({f:fname,t:title});
  }catch(e){}
}

const gamesJS=JSON.stringify(games);

// Emoji map — keyword → emoji
const EMOJI_MAP=[
  ['bloons tower defense 5','🐵'],['btd5','🐵'],['bloons tower defense 6','🐵'],['btd6','🐵'],
  ['bloons','🐵'],['hollow knight','🦋'],['ultrakill','💀'],['cookie clicker','🍪'],
  ['slope','⛷️'],['krunker','🎯'],['1v1','⚔️'],['minecraft','⛏️'],['geometry dash','▶️'],
  ['temple run','🏃'],['subway surfers','🛹'],['among us','👾'],['fall guys','🟡'],
  ['baldi','🎒'],['backrooms','👁️'],['buckshot','💀'],['brotato','🥔'],
  ['basketball','🏀'],['soccer','⚽'],['volleyball','🏐'],['boxing','🥊'],
  ['archery','🎯'],['chess','♟️'],['poker','🃏'],['blackjack','🃏'],['solitaire','🃏'],
  ['tetris','🟦'],['snake','🐍'],['mario','🍄'],['sonic','💨'],
  ['stickman','🏃'],['stick war','⚔️'],['zombie','🧟'],['tower defense','🏰'],
  ['puzzle','🧩'],['racing','🏎️'],['drift','🚗'],['bowling','🎳'],
  ['billiards','🎱'],['football','🏈'],['baseball','⚾'],['tennis','🎾'],
  ['golf','⛳'],['ninja','🥷'],['pirate','🏴‍☠️'],['space','🚀'],
  ['robot','🤖'],['helicopter','🚁'],['plane','✈️'],['dragon','🐉'],
  ['car','🚗'],['bike','🏍️'],['truck','🚛'],['battle','⚔️'],['war','⚔️'],
  ['tank','🪖'],['gun','🔫'],['shooting','🎯'],['sniper','🎯'],
  ['horror','👻'],['survival','🪓'],['adventure','🗺️'],['rpg','⚔️'],
  ['candy','🍬'],['ice cream','🍦'],['ice','🧊'],['fire','🔥'],
  ['farm','🌾'],['cooking','👨‍🍳'],['music','🎵'],['dance','💃'],
  ['fishing','🎣'],['dino','🦕'],['dinosaur','🦕'],['shark','🦈'],
  ['cat','🐱'],['dog','🐕'],['bird','🐦'],['frog','🐸'],['bee','🐝'],
  ['spider','🕷️'],['parkour','🏃'],['platform','🕹️'],['jump','🕹️'],
  ['2048','🔢'],['io game','🌐'],['multiplayer','👥'],['idle','💤'],
  ['clicker','🖱️'],['simulation','🏙️'],['city','🏙️'],['merge','🔀'],
  ['card','🃏'],['board','🎲'],['trivia','❓'],['quiz','❓'],
  ['math','➗'],['word','📝'],['escape','🚪'],['horror','👻'],
  ['ball','⚽'],['run','🏃'],['fly','✈️'],['swim','🏊'],
  ['beat','🎵'],['road','🛣️'],['street','🛣️'],['pixel','🟥'],
  ['anime','⚡'],['naruto','🍃'],['dragon ball','💥'],['pokemon','⚡'],
  ['gta','🚗'],['fnaf','🐻'],['roblox','🧱'],['fortnite','🏗️'],
  ['minecraft','⛏️'],['terraria','⛏️'],['stardew','🌱'],
  ['celeste','🏔️'],['cuphead','☕'],['undertale','❤️'],
  ['hades','🔱'],['dead cells','⚔️'],['binding of isaac','😢'],
  ['enter the gungeon','🔫'],['risk of rain','🌧️'],['slay the spire','🃏'],
  ['vampire survivors','🧛'],['brotato','🥔'],['20 minutes','⏱️'],
  ['crossy road','🐔'],['flappy bird','🐦'],['angry birds','🐦'],
  ['cut the rope','✂️'],['fruit ninja','🍉'],['jetpack','🚀'],
  ['doodle jump','📱'],['temple run','🏃'],['subway surfers','🛹'],
  ['bad ice cream','🍦'],['fireboy','🔥'],['watergirl','💧'],
  ['bob the robber','🦹'],['papa','👨‍🍳'],['fnf','🎵'],['friday night','🎵'],
  ['smash','👊'],['brawl','👊'],['mortal kombat','🥊'],['street fighter','🥊'],
  ['tekken','🥊'],['among','👾'],['fall','🟡'],['rocket league','🚀'],
  ['chess','♟️'],['checkers','⬛'],['backgammon','🎲'],['mahjong','🀄'],
  ['scrabble','🔡'],
];

function getEmoji(title){
  const lower=title.toLowerCase();
  for(const [kw,emoji] of EMOJI_MAP){
    if(lower.includes(kw)) return emoji;
  }
  return null;
}

const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Games Hub — DopamineRush</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#04080f;--card:#080f1c;--border:#1a2540;--text:#e8f0ff;--dim:#5a7090;--gold:#FFD700;--green:#22C55E;--pink:#FF0077;--blue:#3B82F6}
html,body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:#2a3a5c;border-radius:2px}
#header{background:linear-gradient(90deg,#04080f,#080f1c);border-bottom:1px solid var(--border);padding:10px 20px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:100;flex-wrap:wrap}
#header h1{font-size:15px;font-weight:900;letter-spacing:2px;color:var(--gold);font-family:monospace;white-space:nowrap}
#search{flex:1;min-width:160px;max-width:400px;padding:7px 12px;background:#0d1628;border:1px solid #1a2540;border-radius:8px;color:var(--text);font-size:13px;outline:none}
#search:focus{border-color:var(--blue)}
#count{color:var(--dim);font-size:11px;white-space:nowrap}
#back-btn{padding:6px 12px;background:linear-gradient(135deg,#FF007733,#FF007711);border:1px solid #FF007766;border-radius:8px;color:#FF0077;font-size:11px;font-weight:700;cursor:pointer;text-decoration:none;letter-spacing:1px;font-family:monospace;white-space:nowrap}
#featured{padding:16px 20px;border-bottom:1px solid var(--border)}
#featured-card{background:linear-gradient(135deg,#0d1628,#080f1c);border:2px solid var(--gold);border-radius:14px;padding:18px 22px;display:flex;align-items:center;gap:18px;max-width:560px;cursor:pointer;transition:transform .15s,box-shadow .15s;text-decoration:none;box-shadow:0 0 24px rgba(255,215,0,.08)}
#featured-card:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(255,215,0,.18)}
#featured-icon{font-size:44px;flex-shrink:0}
#featured-info h2{font-size:17px;font-weight:900;color:var(--gold);font-family:monospace;letter-spacing:2px;margin-bottom:4px}
#featured-info p{color:var(--dim);font-size:11px;line-height:1.5}
#featured-info span{display:inline-block;margin-top:8px;padding:5px 14px;background:linear-gradient(135deg,#FFD70033,#FFD70011);border:1px solid #FFD70055;border-radius:7px;color:var(--gold);font-size:10px;font-weight:700;font-family:monospace;letter-spacing:1px}
#grid-wrap{padding:14px 18px}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:7px}
.gc{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 7px;cursor:pointer;transition:transform .1s,border-color .1s;text-align:center;content-visibility:auto;contain-intrinsic-size:120px 95px}
.gc:hover{transform:scale(1.05)}
.gi{width:44px;height:44px;border-radius:8px;margin:0 auto 7px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:rgba(255,255,255,.9);font-family:monospace}
.gi.emoji{background:transparent!important;border:none!important;font-size:30px}
.gt{font-size:9px;color:var(--text);line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#load-more{display:block;margin:14px auto 24px;padding:9px 26px;background:#0d1628;border:1px solid var(--border);border-radius:10px;color:var(--dim);font-size:11px;cursor:pointer;font-family:monospace;letter-spacing:1px}
#load-more:hover{border-color:#2a3a5c;color:var(--text)}
#overlay{display:none;position:fixed;inset:0;z-index:9999;background:#000;flex-direction:column}
#overlay.active{display:flex}
#obar{background:#04080f;border-bottom:1px solid var(--border);padding:7px 12px;display:flex;align-items:center;gap:8px;flex-shrink:0}
#otitle{color:var(--gold);font-family:monospace;font-size:11px;font-weight:700;letter-spacing:1px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#save-btn{padding:4px 11px;background:linear-gradient(135deg,#22C55E22,#22C55E11);border:1px solid #22C55E55;border-radius:6px;color:var(--green);font-size:10px;cursor:pointer;font-weight:700}
#close-btn{padding:4px 12px;background:#0d1628;border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;cursor:pointer}
#game-frame{flex:1;width:100%;border:none;background:#000}
#loverlay{position:absolute;inset:0;background:#020617;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:1;pointer-events:none}
#loverlay.hidden{display:none}
#ltxt{color:var(--gold);font-family:monospace;font-size:13px;letter-spacing:3px;animation:lp 1.2s ease infinite}
#ltip{color:var(--dim);font-size:9px;max-width:280px;text-align:center;line-height:1.6}
@keyframes lp{0%,100%{opacity:1}50%{opacity:.25}}
</style>
</head>
<body>
<div id="header">
  <h1>🎮 GAMES HUB</h1>
  <input id="search" type="text" placeholder="Search ${games.length} games..." oninput="filterGames()">
  <span id="count">${games.length} games</span>
  <a id="back-btn" href="index.html">↩ DOPAMINE RUSH</a>
</div>
<div id="featured">
  <a id="featured-card" href="index.html">
    <div id="featured-icon">🎴</div>
    <div id="featured-info">
      <h2>⚡ DOPAMINERUSH</h2>
      <p>Pokémon TCG-inspired card game with leaderboard, stocks,<br>PvP battles, fusions &amp; more.</p>
      <span>▶ PLAY NOW</span>
    </div>
  </a>
</div>
<div id="grid-wrap">
  <div id="grid"></div>
  <button id="load-more" onclick="loadMore()">▼ LOAD MORE GAMES</button>
</div>
<div id="overlay">
  <div id="obar">
    <span id="otitle"></span>
    <button id="save-btn" onclick="manualSave()">💾 Save</button>
    <button id="close-btn" onclick="closeGame()">✕ Close</button>
  </div>
  <div style="position:relative;flex:1;display:flex;flex-direction:column">
    <div id="loverlay">
      <div id="ltxt">LOADING...</div>
      <div id="ltip">For best Chromebook performance, close other tabs before launching heavy games.</div>
    </div>
    <iframe id="game-frame" allow="autoplay *; fullscreen *; pointer-lock *" allowfullscreen></iframe>
  </div>
</div>
<script>
const GAMES=${gamesJS};
const EMOJI_MAP=[${EMOJI_MAP.map(([k,e])=>`[${JSON.stringify(k)},${JSON.stringify(e)}]`).join(',')}];

function getEmoji(title){
  const lower=title.toLowerCase();
  for(const[kw,emoji] of EMOJI_MAP) if(lower.includes(kw)) return emoji;
  return null;
}

let shown=0,filtered=GAMES,currentUnity=null;
const PAGE=60;

function colorFor(t){
  let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))&0xffff;
  const hue=h%360;
  return['hsl('+hue+',50%,18%)','hsl('+hue+',65%,40%)'];
}

function renderCards(list){
  const grid=document.getElementById('grid');
  const frag=document.createDocumentFragment();
  for(const g of list){
    const emoji=getEmoji(g.t);
    const[bg,border]=colorFor(g.t);
    const d=document.createElement('div');
    d.className='gc';
    d.style.borderColor=border;
    const icon=emoji
      ?'<div class="gi emoji">'+emoji+'</div>'
      :'<div class="gi" style="background:'+bg+';border:1px solid '+border+'">'+(g.t.replace(/[^a-zA-Z0-9]/g,'')[0]||'?').toUpperCase()+'</div>';
    d.innerHTML=icon+'<div class="gt">'+g.t+'</div>';
    d.onclick=()=>openGame(g);
    frag.appendChild(d);
  }
  grid.appendChild(frag);
}

function filterGames(){
  const q=document.getElementById('search').value.trim().toLowerCase();
  filtered=q?GAMES.filter(g=>g.t.toLowerCase().includes(q)):GAMES;
  document.getElementById('grid').innerHTML='';
  shown=0;
  loadMore();
  document.getElementById('count').textContent=filtered.length+' games';
}

function loadMore(){
  const next=filtered.slice(shown,shown+PAGE);
  renderCards(next);
  shown+=next.length;
  document.getElementById('load-more').style.display=shown>=filtered.length?'none':'block';
}

function injectSaveFix(frame){
  try{
    const w=frame.contentWindow;
    if(!w||w._savePatch) return;
    w._savePatch=true;
    if(w.navigator&&w.navigator.storage&&w.navigator.storage.persist) w.navigator.storage.persist();
    function sync(){try{if(w._unityInstance&&w._unityInstance.Module&&w._unityInstance.Module.FS)w._unityInstance.Module.FS.syncfs(false,function(){});}catch(e){}}
    setInterval(sync,30000);
    w.addEventListener('beforeunload',sync);
    currentUnity={sync};
  }catch(e){}
}

function openGame(g){
  const frame=document.getElementById('game-frame');
  const lov=document.getElementById('loverlay');
  document.getElementById('otitle').textContent=g.t.toUpperCase();
  currentUnity=null;
  lov.classList.remove('hidden');
  frame.src='';
  document.getElementById('overlay').classList.add('active');
  document.body.style.overflow='hidden';
  setTimeout(()=>{
    frame.src='html-main/'+g.f;
    frame.onload=()=>{lov.classList.add('hidden');injectSaveFix(frame);};
  },60);
}

function closeGame(){
  if(currentUnity)try{currentUnity.sync();}catch(e){}
  document.getElementById('game-frame').src='';
  document.getElementById('overlay').classList.remove('active');
  document.body.style.overflow='';
  currentUnity=null;
}

function manualSave(){
  const btn=document.getElementById('save-btn');
  injectSaveFix(document.getElementById('game-frame'));
  if(currentUnity)try{currentUnity.sync();}catch(e){}
  btn.textContent='✅ Saved!';
  setTimeout(()=>btn.textContent='💾 Save',1500);
}

filterGames();
</script>
</body>
</html>`;

// Patch existing games.html — only replace the GAMES array and game count
const existing=fs.readFileSync('games.html','utf8');
const patched=existing
  .replace(/const GAMES=\[.*?\];/s,'const GAMES='+gamesJS+';')
  .replace(/placeholder="Search \d+ games\.\.\."/, 'placeholder="Search '+games.length+' games..."')
  .replace(/<span id="count">\d+ games<\/span>/,'<span id="count">'+games.length+' games</span>');
fs.writeFileSync('games.html',patched);
console.log('Done. '+games.length+' games, size: '+Buffer.byteLength(patched)+' bytes');
console.log('Done.',games.length,'games, size:',html.length,'bytes');
