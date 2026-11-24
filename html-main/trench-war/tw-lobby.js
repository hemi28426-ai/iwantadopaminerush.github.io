// Trench War lobby: the main menu becomes a tactical-shooter style lobby. Left: a thin icon rail (Play, Online, Armory, Settings,
// Quit) and a translucent panel that shows News (update notes + a Daily Orders / Rank / New Arms strip), Play (callsign, mode,
// bots, enemies, Play Solo), Online (Host / Join, room players) or the Armory (read-only gun list). Right: a live 3D preview of
// your own Unbloxed avatar standing in a foggy, ruined trench, idling with the gun you spawn with (drag to turn), and your rank
// badge top-right. The original #menu inputs and buttons are moved into the panel, so every existing handler keeps working.
// Rendering reuses the game's own WebGLRenderer (R) with a tiny separate scene: no second WebGL context, and the big map is not
// drawn while the lobby is up. Hooks in trench-war.html: frame() calls TWL.render(dt); the match-over timers call TWL.matchOver().
(function(){'use strict';
if(typeof THREE==='undefined'||typeof R==='undefined'||!document.getElementById('menu'))return;
const $=id=>document.getElementById(id);
const menu=$('menu'),box=menu.querySelector('.box');
const TWL=window.TWL={active:false};

// ---------------------------------------------------------------- styles
const css=document.createElement('style');css.textContent=`
#menu.twl{background:linear-gradient(90deg,rgba(6,7,5,.55) 0,rgba(6,7,5,.25) 36%,rgba(6,7,5,0) 52%);pointer-events:none}
#twlRail{position:absolute;left:0;top:0;bottom:0;width:60px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 0;pointer-events:auto;
 background:linear-gradient(180deg,rgba(16,16,13,.97),rgba(9,9,7,.98));border-right:1px solid var(--line);z-index:2}
#twlRail .logo{font:700 22px/1 var(--hfont);letter-spacing:1px;color:#f3e3b5;text-shadow:0 2px 0 #3a2d14;margin:2px 0 12px;user-select:none}
#twlRail .logo i{font-style:normal;color:var(--gold)}
#twlRail .sep{width:30px;height:1px;background:var(--line);margin:4px 0}
#twlRail .sp{flex:1}
#menu.twl #twlRail button{position:relative;width:46px;height:46px;margin:0;padding:0;border-radius:8px;background:transparent;border:1px solid transparent;box-shadow:none;
 display:flex;align-items:center;justify-content:center;color:#bdb39a;transition:background .15s,color .15s,border-color .15s}
#menu.twl #twlRail button:hover{background:rgba(255,240,200,.07);color:#f3e3b5;transform:none}
#menu.twl #twlRail button.on{background:rgba(233,196,106,.14);border-color:rgba(233,196,106,.45);color:var(--gold)}
#twlRail button svg{width:26px;height:26px;display:block}
#menu.twl #twlRail button.play{width:48px;height:48px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#3a3528,#1b1a14);border:2px solid rgba(233,196,106,.55);color:#f3e3b5}
#menu.twl #twlRail button.play:hover,#menu.twl #twlRail button.play.on{background:radial-gradient(circle at 50% 40%,#8a7440,#4d3f1f);border-color:#e9c46a;color:#fff}
#twlRail button[data-tip]:hover::after{content:attr(data-tip);position:absolute;left:54px;top:50%;transform:translateY(-50%);white-space:nowrap;padding:5px 10px;border-radius:5px;
 background:rgba(10,10,8,.94);border:1px solid var(--line);font:500 13px var(--hfont);letter-spacing:1.5px;color:#f3e3b5;pointer-events:none;z-index:5}
#menu.twl .box{position:absolute;left:60px;top:0;bottom:0;margin:0;width:clamp(330px,29vw,390px);max-width:none;max-height:none;min-width:0;border-radius:0;
 padding:0;overflow:hidden;pointer-events:auto;display:flex;flex-direction:column;
 background:linear-gradient(180deg,rgba(24,24,19,.86),rgba(13,13,10,.9));border:0;border-right:1px solid var(--line);box-shadow:12px 0 40px #0007;backdrop-filter:none}
.twl-ph{display:flex;align-items:center;gap:8px;padding:12px 16px 9px;font:600 13px var(--hfont);letter-spacing:3px;color:#e8dcc0;text-transform:uppercase;border-bottom:1px solid var(--line);flex:none}
.twl-ph svg{width:16px;height:16px;color:var(--gold)}
#menu.twl #err{margin:8px 14px 0;min-height:0;flex:none}#menu.twl #err:empty{display:none}
.twl-view{display:none;flex:1;min-height:0;flex-direction:column}
.twl-view.on{display:flex}
.twl-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:10px 12px;display:flex;flex-direction:column;gap:9px}
.twl-scroll::-webkit-scrollbar,.twl-hs::-webkit-scrollbar{width:6px;height:6px}.twl-scroll::-webkit-scrollbar-thumb,.twl-hs::-webkit-scrollbar-thumb{background:rgba(255,240,200,.18);border-radius:3px}
.twl-n{display:flex;gap:10px;padding:7px;border-radius:7px;background:rgba(255,255,255,.035);border:1px solid rgba(255,240,200,.07);flex:none}
.twl-n:hover{background:rgba(255,255,255,.06)}
.twl-n svg{flex:none;width:112px;height:64px;border-radius:4px;display:block}
.twl-n .tx{min-width:0;display:flex;flex-direction:column;gap:2px}
.twl-n .d{font:500 10px Inter,sans-serif;color:var(--gold);letter-spacing:.5px;opacity:.85}
.twl-n .t{font:600 14px/1.15 var(--hfont);letter-spacing:.8px;color:#f3e3b5}
.twl-n .b{font:400 11.5px/1.35 Inter,sans-serif;color:#aba591;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.twl-strip{flex:none;border-top:1px solid var(--line);background:rgba(0,0,0,.22);padding:0 0 10px}
.twl-tabs{display:flex;gap:16px;padding:8px 14px 6px}
#menu.twl .twl-tabs button{margin:0;padding:2px 0 4px;background:none;border:0;border-bottom:2px solid transparent;border-radius:0;box-shadow:none;font:500 12px var(--hfont);letter-spacing:1.5px;color:#9c9686}
#menu.twl .twl-tabs button:hover{color:#e8dcc0;transform:none}
#menu.twl .twl-tabs button.on{color:#f3e3b5;border-bottom-color:var(--gold)}
.twl-hs{display:none;gap:8px;overflow-x:auto;overflow-y:hidden;padding:2px 12px 4px;height:120px}
.twl-hs.on{display:flex}
.twl-hc{position:relative;flex:none;width:136px;padding:8px 9px;border-radius:7px;background:rgba(255,255,255,.045);border:1px solid rgba(255,240,200,.09);display:flex;flex-direction:column;gap:4px;overflow:hidden}
.twl-hc img{width:118px;height:44px;object-fit:contain;display:block;margin-top:6px}
.twl-hc img:not([src]),.twl-ar img:not([src]){visibility:hidden}
.twl-hc .nm{font:600 13px/1.1 var(--hfont);letter-spacing:.6px;color:#f3e3b5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.twl-hc .pr{font:600 12px var(--hfont);color:#8cff7a;letter-spacing:1px;display:flex;justify-content:space-between}
.twl-hc .pr span{color:#9c9686;font-weight:500}.twl-hc .pr span.lk{color:#ff9a7a}
.twl-tag{position:absolute;left:6px;top:5px;z-index:1;font:700 9px var(--hfont);letter-spacing:1.5px;padding:1px 5px;border-radius:3px;background:#c9a24a;color:#1a1408}
#lobbyDaily{display:contents}
#lobbyDaily>.twpSm{display:none}
#lobbyDaily .twpD{flex:none;width:156px;margin:0;padding:8px 9px;border-radius:7px;background:rgba(255,255,255,.045);border:1px solid rgba(255,240,200,.09);display:flex;flex-direction:column;justify-content:space-between}
#lobbyDaily .twpD .l{flex-direction:column;gap:4px;font-size:12.5px;line-height:1.3}
#lobbyDaily .twpD .l span{font:600 12px var(--hfont);letter-spacing:1px}
#lobbyDaily .twpD.done{border-color:rgba(140,255,122,.35)}
.twl-rk{width:230px}
.twl-card{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:9px;padding:11px 13px;flex:none}
.twl-h{font:600 11.5px var(--hfont);letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin:0 0 7px;opacity:.9}
#menu.twl .row{margin:8px 0;display:flex;align-items:center;gap:8px}
#menu.twl label{min-width:0;flex:0 0 98px;font-size:12px;white-space:nowrap}
#menu.twl #name{flex:1;width:auto;min-width:0}
.twl-seg{display:flex;gap:5px;flex:1}
#menu.twl .twl-seg button{flex:1;margin:0;padding:7px 0;background:rgba(0,0,0,.4);border:1px solid var(--line);box-shadow:none;font-size:14px;letter-spacing:2px;color:#cfc4a6}
#menu.twl .twl-seg button.on{background:linear-gradient(180deg,#8a7440,#5e4e28);border-color:#a88f52;color:#fff}
.twl-desc{color:#9c9686;font-size:12px;margin:-2px 0 2px 106px;min-height:15px}
.twl-step{display:flex;align-items:center;gap:5px}
#menu.twl .twl-step button{margin:0;padding:6px 0;width:32px;font-size:16px;box-shadow:none;background:rgba(0,0,0,.4);border:1px solid var(--line)}
#menu.twl #bots{width:54px!important;text-align:center;padding:7px 4px}
#menu.twl #enemyTypes{flex:1;min-width:0}
#menu.twl #bSolo{width:100%;margin:0;padding:14px;font-size:22px;letter-spacing:4px;flex:none}
#menu.twl #bHost{width:100%;margin:0}
#menu.twl .twl-join{display:flex;gap:6px;margin:8px 0 0}
#menu.twl #joinCode{flex:1;width:auto;min-width:0}
#menu.twl #bJoin{margin:0}
#menu.twl #twRemix{margin-top:0!important;align-self:flex-start;font-size:13px}
#menu.twl .keys{margin-top:auto;padding-top:4px;font-size:11px;line-height:1.7;color:#8f8a7a}
.twl-big{font:600 24px/1.1 var(--hfont);letter-spacing:1px}
.twl-code{font:700 30px var(--hfont);color:#8cff7a;letter-spacing:6px}
.twl-pl{font:500 14px var(--hfont);letter-spacing:.5px;display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.twl-note{font:400 12px/1.5 Inter,sans-serif;color:#9c9686}
.twl-ar{display:flex;align-items:center;gap:10px;padding:5px 6px;border-radius:6px;background:rgba(255,255,255,.03);flex:none}
.twl-ar img{width:96px;height:38px;object-fit:contain;flex:none}
.twl-ar .nm{flex:1;min-width:0;font:600 13.5px/1.15 var(--hfont);letter-spacing:.5px;color:#f3e3b5}
.twl-ar .nm small{display:block;font:400 11px Inter,sans-serif;color:#9c9686;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.twl-ar .pr{font:600 13px var(--hfont);color:#8cff7a;letter-spacing:1px;text-align:right;flex:none}
.twl-ar .pr small{display:block;font-weight:500;font-size:11px;color:#9c9686}
.twl-ar.lk{opacity:.62}.twl-ar.lk .pr small{color:#ff9a7a}
.twl-cat{font:600 11px var(--hfont);letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin:6px 2px 0;flex:none}
#twlRank{position:absolute;right:14px;top:12px;width:56px;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:auto;cursor:pointer;text-align:center}
#twlRank .twpb{font-size:22px;line-height:38px;min-width:42px;margin:0;border-width:2px;border-radius:7px;background:rgba(10,10,8,.75)}
#twlRank .rn{font:500 10px/1.15 var(--hfont);letter-spacing:1px;color:#cfc4a6;text-transform:uppercase;text-shadow:0 1px 4px #000}
#twlRank:empty{display:none}
#twlStash{display:none!important}
#twlPlate{position:absolute;bottom:14px;text-align:center;pointer-events:none;font-family:var(--hfont);text-shadow:0 2px 10px #000,0 0 2px #000}
#twlPlate .n{font:600 26px/1 var(--hfont);letter-spacing:3px;color:#f3e3b5;text-transform:uppercase}
#twlPlate .g{font:500 13px var(--hfont);letter-spacing:3px;color:var(--gold);margin-top:5px;text-transform:uppercase}
#twlPlate .h{font:400 11px Inter;color:#b3ad9c;margin-top:6px;letter-spacing:.5px}
#twlLoad{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;flex-direction:column;opacity:0;transition:opacity .35s;
 background:radial-gradient(ellipse at center,#2a2219 0,#120f0b 60%,#070605 100%)}
#twlLoad.on{opacity:1}
#twlLoad .t{font:500 13px var(--hfont);letter-spacing:6px;color:var(--gold)}
#twlLoad .d{font:700 52px/1.1 var(--hfont);letter-spacing:8px;color:#f3e3b5;text-shadow:0 4px 0 #3a2d14,0 10px 30px #000;margin:6px 0 18px}
#twlLoad .b{width:min(360px,70vw);height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
#twlLoad .b i{display:block;height:100%;width:30%;background:linear-gradient(90deg,#c9a24a,#ffe08a);border-radius:3px;animation:twlbar 1.1s ease-in-out infinite}
@keyframes twlbar{0%{transform:translateX(-110%)}100%{transform:translateX(340%)}}
#twlLoad .s{color:#9c9686;margin-top:16px;font-size:13px;max-width:520px;text-align:center;line-height:1.5}
#twlLoad .c{margin-top:14px;text-align:center;font:500 13px var(--hfont);letter-spacing:2px;color:#cfc4a6}
@media (max-height:740px){.twl-n svg{width:100px;height:57px}.twl-hs{height:112px}#menu.twl .row{margin:6px 0}}
`;document.head.appendChild(css);

// ---------------------------------------------------------------- icons (inline SVG, currentColor)
const SV=(p,vb)=>'<svg viewBox="'+(vb||'0 0 24 24')+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const IC={
 play:SV('<path d="M9 6.5v11l9-5.5z" fill="currentColor" stroke="none"/>'),
 online:SV('<circle cx="12" cy="11" r="2" fill="currentColor"/><path d="M8.5 14.5a5 5 0 0 1 0-7M15.5 7.5a5 5 0 0 1 0 7M5.6 17.4a9 9 0 0 1 0-12.8M18.4 4.6a9 9 0 0 1 0 12.8M12 13v8"/>'),
 armory:SV('<path d="M2 11h13l2-2h4v3l-3 1v1h-6l-1 3h-3l1-3H5l-3-1z" fill="currentColor" fill-opacity=".25"/><path d="M15 11v2M7 7h4"/>'),
 gear:SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
 quit:SV('<path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/>'),
 news:SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>')};
// news thumbnails: small drawn scenes, 112x64
const TH=(inner)=>'<svg viewBox="0 0 112 64"><defs><linearGradient id="twlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4636"/><stop offset="1" stop-color="#1c1b15"/></linearGradient></defs><rect width="112" height="64" fill="url(#twlg)"/>'+inner+'</svg>';
const THUMB={
 guns:TH('<g fill="#d9c487" stroke="#2a2416" stroke-width=".8"><path d="M10 26h52l4-3h18v4l-6 2v2H58l-3 8h-6l2-7H22l-8 6h-6l4-8z"/><path d="M20 46h46l3-3h28v4l-8 1v2H62l-2 6h-5l1-5H30l-6 4h-6l3-6z" fill="#b59e62"/></g><text x="94" y="20" font-family="Oswald,Impact,sans-serif" font-size="15" font-weight="700" fill="#ffe08a" text-anchor="middle">13</text>'),
 rank:TH('<g fill="none" stroke="#e9c46a" stroke-width="5" stroke-linejoin="round"><path d="M38 30l18-11 18 11"/><path d="M38 41l18-11 18 11"/><path d="M38 52l18-11 18 11"/></g><path d="M88 9l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.8 2.7 1-5.3-4-3.7 5.4-.6z" fill="#ffe08a"/>'),
 enemies:TH('<g fill="#7d7a62" stroke="#1d1b14" stroke-width="1"><path d="M14 54v-8a12 11 0 0 1 24 0v8z"/><path d="M8 47h36v4H8z"/><path d="M48 54v-6a9 8 0 0 1 18 0v6z" fill="#8f8b70"/><path d="M44 49h26v3H44z" fill="#8f8b70"/><path d="M80 54v-5a7 6 0 0 1 14 0v5z" fill="#a39f80"/><path d="M77 50h20v2.5H77z" fill="#a39f80"/></g><path d="M57 42L57 30M52 33h10" stroke="#d9c487" stroke-width="1.5"/><path d="M98 38l8-4M100 44l8-2" stroke="#e9c46a" stroke-width="2" stroke-linecap="round"/><text x="26" y="24" font-family="Oswald,Impact,sans-serif" font-size="10" fill="#e9c46a" text-anchor="middle">HEAVY</text>'),
 climb:TH('<path d="M0 30h112v34H0z" fill="#2e271c"/><g fill="#8a7454" stroke="#2a2416" stroke-width=".8"><rect x="6" y="20" width="22" height="9" rx="4"/><rect x="30" y="20" width="22" height="9" rx="4"/><rect x="74" y="20" width="22" height="9" rx="4"/><rect x="18" y="12" width="22" height="9" rx="4"/><rect x="82" y="12" width="22" height="9" rx="4"/></g><g stroke="#c9a86a" stroke-width="2.4"><path d="M56 62L60 22M70 62L74 22M57 52h14M58 42h14M59 32h14"/></g><path d="M90 52V36m-6 6l6-7 6 7" stroke="#ffe08a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
 settings:TH('<rect x="16" y="14" width="50" height="32" rx="3" fill="#2a281f" stroke="#a89a72" stroke-width="2"/><path d="M8 48h66l-5 5H13z" fill="#a89a72"/><path d="M24 36l8-8 6 5 10-12 8 7" stroke="#8cff7a" stroke-width="2" fill="none"/><g transform="translate(88 30)" fill="#e9c46a"><circle r="9"/><g stroke="#e9c46a" stroke-width="4"><path d="M0-14v28M-14 0h28M-10-10l20 20M10-10l-20 20"/></g><circle r="4" fill="#2a281f"/></g>')};
const NEWS=[
 ['guns','New: 13 weapons arrive at the front','Marksman and burst rifles, crossbow, double barrel, grenade launcher, heavy MG, flamethrower, akimbo revolvers, flare pistol, shovel and club. Find them in the Armory.'],
 ['rank','Ranks and daily orders','Earn XP for kills, headshots, rounds and wins to climb the ranks and unlock heavier arms. Three new daily orders every day, each worth bonus XP.'],
 ['enemies','Heavy, Sniper and Rusher enemies','Bot squads now bring armoured Heavies, long-range Snipers and fast Rushers. Pick "Mixed" under Enemies, or keep them classic.'],
 ['climb','Climb out of any trench','Walk into a trench wall and jump to haul yourself over the parapet. No more running the long way round to the ladders.'],
 ['settings','Settings and smoother Chromebook play','Mouse sensitivity, field of view, volume and a Low graphics preset that drops shadows and resolution for steady frames on school laptops.']];
const NEWS_DATE='2026-11-22';

// ---------------------------------------------------------------- restructure the menu (move the original controls)
const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const old=[...box.children];
const stash=mk('div');stash.id='twlStash';document.body.appendChild(stash);
const keysEl=box.querySelector('.keys'),backA=[...box.querySelectorAll('a')].find(a=>/unbloxed\.html/.test(a.getAttribute('href')||''));
// --- play view
const MODES=[['bomb','BOMB'],['classic','TDM'],['ffa','FFA']];
const cardA=mk('div','twl-card');cardA.appendChild(mk('div','twl-h','Soldier · Match'));
const rName=mk('div','row');rName.appendChild(mk('label',null,'Callsign'));if($('name'))rName.appendChild($('name'));cardA.appendChild(rName);
const rMode=mk('div','row');rMode.appendChild(mk('label',null,'Mode'));const seg=mk('div','twl-seg');rMode.appendChild(seg);cardA.appendChild(rMode);
const desc=mk('div','twl-desc');cardA.appendChild(desc);
const sel=$('mode');if(sel){sel.style.display='none';cardA.appendChild(sel)}
const rBots=mk('div','row');rBots.appendChild(mk('label',null,'Bots / team'));const step=mk('div','twl-step');rBots.appendChild(step);cardA.appendChild(rBots);
const bots=$('bots');const bMinus=mk('button',null,'&minus;'),bPlus=mk('button',null,'+');bMinus.type=bPlus.type='button';
step.appendChild(bMinus);if(bots)step.appendChild(bots);step.appendChild(bPlus);
const stepBots=d=>{if(!bots)return;const lo=+bots.min||0,hi=+bots.max||8;bots.value=Math.max(lo,Math.min(hi,(+bots.value||0)+d))};
bMinus.onclick=()=>stepBots(-1);bPlus.onclick=()=>stepBots(1);
{const et=$('enemyTypes');if(et){const rE=mk('div','row');rE.appendChild(mk('label',null,'Enemies'));rE.appendChild(et);cardA.appendChild(rE)}}
const segB={};
function syncMode(){const v=sel?sel.value:'bomb';for(const k in segB)segB[k].classList.toggle('on',k===v);
 const o=sel&&sel.options[sel.selectedIndex];desc.textContent=o?o.textContent.split('·').slice(1).join('·').trim():''}
for(const[v,l] of MODES){if(sel&&![...sel.options].some(o=>o.value===v))continue;const b=mk('button',null,l);b.type='button';b.onclick=()=>{sel.value=v;sel.dispatchEvent(new Event('change'));syncMode()};seg.appendChild(b);segB[v]=b}
if(sel)sel.addEventListener('change',syncMode);syncMode();
const solo=$('bSolo');if(solo)solo.textContent='Play Solo';
const lastCard=mk('div','twl-card');lastCard.style.display='none';
const foot=mk('div');foot.style.cssText='display:flex;flex-direction:column;gap:6px;flex:none';
// --- online view
const cardO=mk('div','twl-card');cardO.appendChild(mk('div','twl-h','Host a room'));
cardO.appendChild(mk('div','twl-note','Start a match and get a 5-letter room code for your friends.'));
const host=$('bHost');if(host){host.textContent='Host Online';host.style.marginTop='8px';cardO.appendChild(host)}
const cardJ=mk('div','twl-card');cardJ.appendChild(mk('div','twl-h','Join a friend'));
const jr=mk('div','twl-join');if($('joinCode'))jr.appendChild($('joinCode'));if($('bJoin'))jr.appendChild($('bJoin'));cardJ.appendChild(jr);
const roomCard=mk('div','twl-card');roomCard.style.display='none';
// --- views
const ph=mk('div','twl-ph');
const V={news:mk('div','twl-view'),play:mk('div','twl-view'),online:mk('div','twl-view'),armory:mk('div','twl-view')};
const TITLE={news:'News',play:'Play · Trench War',online:'Online · play with friends',armory:'Armory'};
const PHI={news:IC.news,play:IC.play,online:IC.online,armory:IC.armory};
// news: scrolling cards + bottom strip with tabs
const newsL=mk('div','twl-scroll');
for(const[k,t,b] of NEWS)newsL.appendChild(mk('div','twl-n',THUMB[k]+'<div class="tx"><div class="d">'+NEWS_DATE+'</div><div class="t">'+t+'</div><div class="b">'+b+'</div></div>'));
const strip=mk('div','twl-strip'),tabs=mk('div','twl-tabs');strip.appendChild(tabs);
const HS={daily:mk('div','twl-hs'),rank:mk('div','twl-hs'),arms:mk('div','twl-hs')},tabB={};
for(const[k,l] of[['daily','Daily Orders'],['rank','Rank'],['arms','New Arms']]){const b=mk('button',null,l);b.type='button';b.onclick=()=>setTab(k);tabs.appendChild(b);tabB[k]=b;strip.appendChild(HS[k])}
{let e=$('lobbyDaily');if(!e){e=mk('div');e.id='lobbyDaily'}HS.daily.appendChild(e)}
{const c=mk('div','twl-hc twl-rk');let e=$('lobbyRank');if(!e){e=mk('div');e.id='lobbyRank'}c.appendChild(mk('div','twl-h','Your rank'));c.appendChild(e);HS.rank.appendChild(c)}
const nextCard=mk('div','twl-hc');nextCard.style.width='180px';HS.rank.appendChild(nextCard);
V.news.appendChild(newsL);V.news.appendChild(strip);
// play
{const s=mk('div','twl-scroll');s.appendChild(lastCard);s.appendChild(cardA);if(solo)s.appendChild(solo);{const rx=$('twRemix');if(rx){rx.textContent=rx.textContent.replace(/^[^A-Za-z]+/,'');s.appendChild(rx)}}s.appendChild(foot);if(keysEl)s.appendChild(keysEl);V.play.appendChild(s)}
// online
{const s=mk('div','twl-scroll');s.appendChild(roomCard);s.appendChild(cardO);s.appendChild(cardJ);
 s.appendChild(mk('div','twl-note','Up to 8 players per room. Bots fill the empty slots, and the host’s mode and bot settings are used.'));V.online.appendChild(s)}
// armory (filled when opened)
const armL=mk('div','twl-scroll');V.armory.appendChild(armL);
// assemble: header, error line, views
const err=$('err');
for(const e of old){if(e.parentNode===box)stash.appendChild(e)}
box.appendChild(ph);if(err)box.appendChild(err);for(const k in V)box.appendChild(V[k]);
// other features' controls that lived in the menu are kept, in the play view footer (the back link + settings button stay hidden)
for(const e of[...stash.children]){if(e===keysEl||e===backA||e.id==='twSettingsBtn'||/^H1$/.test(e.tagName)||e.classList.contains('tag'))continue;
 if(e.classList.contains('card')&&!e.querySelector('input,select,button,a,canvas,img,[id]'))continue;
 const keep=e.id&&!['lobbyRank','lobbyDaily','err'].includes(e.id)||e.matches('a,button,input,select,canvas,img')||e.querySelector('input,select,button,a,canvas,img,[id]');
 if(keep&&!e.classList.contains('card'))foot.appendChild(e)}
// --- rail
const rail=mk('div');rail.id='twlRail';rail.innerHTML='<div class="logo">T<i>W</i></div>';
const railB={};
function rb(k,tip,icon,cls){const b=mk('button',cls||'',icon);b.type='button';b.dataset.tip=tip;b.setAttribute('aria-label',tip);rail.appendChild(b);railB[k]=b;return b}
rb('play','Play','<svg viewBox="0 0 24 24"><path d="M8.5 5.5v13l10.5-6.5z" fill="currentColor"/></svg>','play').onclick=()=>show(view==='play'?'news':'play');
rail.appendChild(mk('div','sep'));
rb('online','Online',IC.online).onclick=()=>show(view==='online'?'news':'online');
rb('armory','Armory',IC.armory).onclick=()=>show(view==='armory'?'news':'armory');
rb('settings','Settings',IC.gear).onclick=()=>{const s=$('twSettingsBtn');if(s)s.click()};
rail.appendChild(mk('div','sp'));
rb('quit','Back to Unbloxed',IC.quit).onclick=()=>{
 try{if(document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1){history.back();return}}catch(e){}
 location.href=backA?backA.href:'unbloxed.html'};
menu.insertBefore(rail,box);
const rankB=mk('div');rankB.id='twlRank';rankB.title='Your rank';rankB.onclick=()=>{show('news');setTab('rank')};menu.appendChild(rankB);
const plate=mk('div');plate.id='twlPlate';plate.innerHTML='<div class="n"></div><div class="g"></div><div class="h">Drag to turn your soldier</div>';menu.appendChild(plate);
menu.classList.add('twl');
const load=mk('div');load.id='twlLoad';load.innerHTML='<div class="t">TRENCH WAR</div><div class="d">DEPLOYING</div><div class="b"><i></i></div><div class="s"></div><div class="c"></div>';document.body.appendChild(load);
const TIPS=['Crouch behind sandbags: bullets lose their bite through cover.','Buy armor early. A helmet saves you from one-shot headshots.','Hold E to plant or defuse. A defuse kit halves the time.',
 'Pistols are accurate when you stand still. Stop, then shoot.','Smoke a sightline before you cross it.','Free For All: 20 kills for a turret, 35 for a shield, 50 for the nuke.'];

// ---------------------------------------------------------------- gun icons: the game's own gunIcon(), made one per tick so opening a list never stalls
const iconQ=[];let iconBusy=false;
function iconInto(img,id){if(typeof gunIcon!=='function')return;iconQ.push([img,id]);if(!iconBusy)pumpIcons()}
function pumpIcons(){const j=iconQ.shift();if(!j){iconBusy=false;return}iconBusy=true;
 if(j[0].isConnected&&!j[0].getAttribute('src')){try{const u=gunIcon(j[1]);if(u)j[0].src=u}catch(e){}}setTimeout(pumpIcons,16)}
const GU=()=>typeof GUNS!=='undefined'?GUNS:{};
const isLocked=id=>{try{return!!(window.TWP&&TWP.locked(id))}catch(e){return false}};
const gunRank=id=>{const G=GU()[id];return G&&typeof G.rank==='number'?G.rank:0};

// ---------------------------------------------------------------- views + strip tabs
let view='news',tab='daily';
function show(v){if(!V[v])v='news';view=v;for(const k in V)V[k].classList.toggle('on',k===v);
 ph.innerHTML=PHI[v]+TITLE[v];
 for(const k of['play','online','armory'])railB[k].classList.toggle('on',k===v);
 if(v==='armory')fillArmory();if(v==='news'&&tab==='arms')fillArms();if(v==='online')roomInfo();
 if(TWL.active)layout()}
function setTab(k){tab=k;for(const n in HS){HS[n].classList.toggle('on',n===k);tabB[n].classList.toggle('on',n===k)}if(k==='arms')fillArms();if(k==='rank')rankStrip()}
let armsDone=false,armoryDone=false;
function fillArms(){if(armsDone)return;armsDone=true;const ids=window.TWNG&&TWNG.defs?Object.keys(TWNG.defs).filter(i=>GU()[i]):[];
 for(const id of ids){const G=GU()[id],lk=isLocked(id);const c=mk('div','twl-hc');
  c.innerHTML='<span class="twl-tag">NEW</span><img alt=""><div class="nm">'+escH(G.n)+'</div><div class="pr">$'+(G.cost|0)+(lk?'<span class="lk">Rank '+gunRank(id)+'</span>':'<span>'+escH(G.cat||'')+'</span>')+'</div>';
  HS.arms.appendChild(c);iconInto(c.querySelector('img'),id)}
 if(!ids.length)HS.arms.appendChild(mk('div','twl-note','No new arms in this build.'))}
function fillArmory(){if(armoryDone){for(const r of armL.querySelectorAll('.twl-ar'))r.classList.toggle('lk',isLocked(r.dataset.id));return}armoryDone=true;
 armL.appendChild(mk('div','twl-note','Every gun you can buy in a match (press B in your spawn during buy time). Heavier arms unlock as your rank rises.'));
 const cats={};for(const id in GU()){const G=GU()[id];if(!G||!G.cat||!G.dmg)continue;(cats[G.cat]=cats[G.cat]||[]).push(id)}
 for(const c in cats){armL.appendChild(mk('div','twl-cat',escH(c)));
  for(const id of cats[c].sort((a,b)=>(GU()[a].cost||0)-(GU()[b].cost||0))){const G=GU()[id],lk=isLocked(id);const r=mk('div','twl-ar'+(lk?' lk':''));r.dataset.id=id;
   r.innerHTML='<img alt=""><div class="nm">'+escH(G.n)+'<small>'+G.dmg+(G.pel?'×'+G.pel:'')+' dmg · '+G.rpm+' rpm'+(G.auto?' · auto':'')+(G.tag?' · '+escH(G.tag):'')+'</small></div>'+
    '<div class="pr">$'+(G.cost|0)+'<small>'+(lk?'Locked · Rank '+gunRank(id):(window.TWNG&&TWNG.defs&&TWNG.defs[id]?'New':''))+'</small></div>';
   armL.appendChild(r);iconInto(r.querySelector('img'),id)}}}
function rankStrip(){let n=1;try{n=window.TWP?TWP.rank():1}catch(e){}
 const up=Object.keys(GU()).filter(id=>gunRank(id)>n).sort((a,b)=>gunRank(a)-gunRank(b)).slice(0,3);
 nextCard.innerHTML='<div class="twl-h">Next unlocks</div>'+(up.length?up.map(id=>'<div class="twl-pl" style="font-size:12.5px;padding:2px 0"><span>'+escH(GU()[id].n)+'</span><span style="color:var(--gold)">R'+gunRank(id)+'</span></div>').join(''):'<div class="twl-note">Everything is unlocked.</div>')}

// ---------------------------------------------------------------- the 3D trench preview (own small scene, drawn with the game's renderer)
const FOGC=0x76756a;
const S=new THREE.Scene();S.fog=new THREE.Fog(FOGC,5,21);
const C=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,120);C.position.set(0,1.1,5.5);
const skyU={fl:{value:0}};
{const sky=new THREE.Mesh(new THREE.SphereGeometry(90,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyU,
 vertexShader:'varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform float fl;varying vec3 vp;void main(){float h=vp.y;vec3 gr=vec3(.30,.29,.25),hz=vec3(.47,.46,.41),mid=vec3(.42,.43,.41),zen=vec3(.25,.28,.30);'+
  'vec3 c=h<0.?mix(hz,gr,min(1.,-h*4.)):h<.25?mix(hz,mid,h/.25):mix(mid,zen,min(1.,(h-.25)/.6));vec3 sd=normalize(vec3(.6,.25,-.75));float s=max(0.,dot(vp,sd));'+
  'c+=vec3(.85,.78,.6)*(pow(s,24.)*.35+pow(s,4.)*.12);c+=vec3(1.,.62,.32)*fl*exp(-abs(h)*14.)*(.5+.3*sin(vp.x*9.));gl_FragColor=vec4(c,1.);}'}));
 sky.renderOrder=-1;sky.frustumCulled=false;S.add(sky)}
// same light set as the battlefield (hemi + shadowed sun + 2 point lights), so shared materials reuse their shader programs
S.add(new THREE.HemisphereLight(0xb4b8bc,0x4a3e30,.78));
const sun=new THREE.DirectionalLight(0xffe2b8,1.0);sun.position.set(4.5,5,5);sun.target.position.set(0,1,0);S.add(sun,sun.target);
sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3.2,bottom:-1.5,near:.5,far:20});sun.shadow.bias=-.0008;sun.shadow.normalBias=.02;
const lamp=new THREE.PointLight(0xffa040,.9,6,1.6);lamp.position.set(-1.9,1.25,-2.55);S.add(lamp);
const flash=new THREE.PointLight(0xffb070,0,60);flash.position.set(6,8,-30);S.add(flash);
function mesh(g,m,x,y,z,ry){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.y=ry||0;o.receiveShadow=true;S.add(o);return o}
function inst(tw,fallG,fallM,list){const n=list.length;const im=new THREE.InstancedMesh(tw?tw.geometry:fallG,tw?tw.material:fallM,n);const o=new THREE.Object3D();
 list.forEach((p,i)=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(p[4]||0,p[3]||0,p[5]||0,'YXZ');o.scale.set(p[6]||1,p[7]||1,p[8]||1);o.updateMatrix();im.setMatrixAt(i,o.matrix)});
 im.receiveShadow=true;S.add(im);return im}
try{
 const dt2=typeof dirtTex!=='undefined'?dirtTex.clone():null;if(dt2){dt2.needsUpdate=true;dt2.repeat.set(10,3)}
 const mud=new THREE.MeshLambertMaterial({color:0x4a3b2c,map:dt2});
 const fl=mesh(new THREE.PlaneGeometry(40,14),mud,0,0,0);fl.rotation.x=-Math.PI/2;
 // a wide, shallow trench bay: parapet earth behind the wall, and the churned ground beyond it
 const D=1.6,WZ=-3;
 const bank=new THREE.MeshLambertMaterial({color:0x4a4032,map:dt2});
 mesh(new THREE.BoxGeometry(40,D,6),bank,0,D/2,WZ-3.25);
 const far=mesh(new THREE.PlaneGeometry(120,60),bank,0,D,-37);far.rotation.x=-Math.PI/2;
 const plankT=typeof plankTex!=='undefined'?plankTex:null,burlT=typeof burlapTex!=='undefined'?burlapTex:null,rb=typeof RBox==='function'?RBox:(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 // duckboards along the trench floor
 const dL=[];for(let x=-7;x<=7;x++)for(let z=-2;z<=1;z++)dL.push([x,0,z,Math.PI/2]);
 inst(TW('duckboard'),(()=>{const g=rb(.9,.05,.95,.02);g.translate(0,.03,0);return g})(),new THREE.MeshLambertMaterial({color:0xa08060,map:plankT}),dL);
 // revetment panels + posts holding the back wall
 const pL=[],poL=[];for(let x=-7.5;x<=7.5;x+=1.02)pL.push([x,D*.46,WZ-.02,Math.PI,.1,0,1,D*.93,1]);for(let x=-7;x<=7;x+=2)poL.push([x,D*.47,WZ+.04,0,.1,0,1,D*.95,1]);
 const pg=rb(1.02,1,.05);inst(TW('revetPanel'),pg,new THREE.MeshLambertMaterial({color:0xb09070,map:plankT}),pL);
 inst(TW('revetPost'),new THREE.CylinderGeometry(.06,.07,1,8),new THREE.MeshLambertMaterial({color:0x5a4028,map:plankT}),poL);
 // sandbag parapet on top (three staggered layers) + a small pile on the left, foreground
 const twS=TW('sandbag');const bL=[];let sd=7;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;
 for(let l=0;l<3;l++)for(let x=-8;x<=8;x+=.9){if(l===2&&x>1.5&&x<4)continue;bL.push([x+(l%2)*.45+(r()-.5)*.08,D+.03+l*.27,WZ-.45+(r()-.5)*.1-l*.08,(r()-.5)*.15])}
 for(const p of[[-2.5,.15,.35,.3],[-2.45,.15,-.15,-.2],[-3.4,.15,.15,.1],[-2.95,.42,.12,.4],[-2.6,.15,.85,1.3]])bL.push(p);
 const bags=inst(twS,typeof sackGeo==='function'?sackGeo():new THREE.BoxGeometry(.9,.28,.45),new THREE.MeshLambertMaterial({color:0xb8a77c,map:burlT}),bL);bags.castShadow=true;
 // ammo crates on the right
 const cr=TW('crate');const crL=[[2.4,.05,-2.2,.25],[3.25,.05,-1.55,-.3],[2.75,1.05,-2.1,.6]];
 const cg=rb(1,1,1);cg.translate(0,.5,0);const crates=inst(cr,cg,new THREE.MeshLambertMaterial({color:0xe0c8a0,map:typeof crateTex!=='undefined'?crateTex:null}),crL.map(p=>cr?p:[...p,0,0,.8,.9,.7]));crates.castShadow=true;
 // shell-shattered brick ruins rising out of the fog behind the parapet (the battlefield's cached ruin model: no new textures)
 const twR=TW('ruin');
 if(twR){const rL=[];let s2=11;const q=()=>(s2=(s2*16807)%2147483647)/2147483647;
  for(const[x,z,w,h] of[[2.2,-5.6,1.3,4.6],[3.5,-5.9,1.1,6.2],[4.7,-5.5,1.2,3.6],[4,-9,2.2,7],[6.4,-7.6,1.4,5],[8.2,-6.6,1.5,2.8],[-.8,-10,1.8,3.4],[-4.8,-8,1.4,4.4],[-6.4,-11,2,5.6],[-2.6,-15,2.4,7],[9.5,-13,3,8.5],[1,-19,3,6]])
   rL.push([x,D-.05,z,(q()-.5)*.5,0,0,w,h,.7+q()*.5]);
  inst(twR,null,null,rL)}
 // barbed wire + dead trees on the skyline
 for(let i=0;i<5;i++){const w=TW('wireSection',i);if(w){w.position.set(-6+i*3,D,WZ-2.4-(i%2)*.6);w.rotation.y=(i%2)*.4;S.add(w)}}
 for(const[x,z,s] of[[-6.5,-10,11],[6.8,-11,4],[-1,-21,7]]){const t=TW('deadTree',s);if(t){t.position.set(x,D,z);t.scale.setScalar(1.1);S.add(t)}}
 // hanging lantern on the post left of the soldier
 const lg=new THREE.Group();lg.position.copy(lamp.position);
 const iron=new THREE.MeshLambertMaterial({color:0x222018});lg.add(new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.03,10),iron));
 const glass=new THREE.Mesh(new THREE.CylinderGeometry(.055,.06,.16,10),new THREE.MeshBasicMaterial({color:0xffc070}));glass.position.y=.095;lg.add(glass);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(.08,.07,10),iron);cap.position.y=.21;lg.add(cap);
 const hook=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.45),iron);hook.position.set(0,.3,-.2);lg.add(hook);S.add(lg);
}catch(e){console.warn('[lobby] scene',e)}
// drifting dust / ash in the fog
const EMB=(()=>{const N=70,pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*7;pos[i*3+1]=Math.random()*3.2;pos[i*3+2]=-.8+Math.random()*2.6}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xe8e0cc,size:.022,transparent:true,opacity:.55,depthWrite:false}));S.add(p);return p})();

// ---------------------------------------------------------------- your soldier
const YAW0=-.42;
let ch=null,yaw=YAW0,yawV=0,drag=null,t0=0,shownGun='';
function spawnGun(){const g=window.TW_SPAWN_GUN;return typeof GUNS!=='undefined'&&g&&GUNS[g]?g:(typeof GUNS!=='undefined'&&GUNS.service?'service':'')}
function buildChar(){try{if(ch){S.remove(ch);ch=null}
  ch=makeSoldier(typeof me!=='undefined'?me.team||0:0,MYAV,'');S.add(ch); // makeSoldier adds it to the battlefield; S.add moves it here
  ch.position.set(0,.07,.45);shownGun=ch.userData.gunId||'';if(ch.userData.tag)ch.userData.tag.visible=false}catch(e){console.warn('[lobby] avatar',e);ch=null}}
function setGun(){if(!ch)return;const g=spawnGun();if(g&&g!==shownGun){try{setSoldierGun(ch,g)}catch(e){}shownGun=g}
 plate.querySelector('.g').textContent=(typeof GUNS!=='undefined'&&GUNS[shownGun]?GUNS[shownGun].n:'')}
const nameIn=$('name');const setName=()=>{plate.querySelector('.n').textContent=(nameIn&&nameIn.value||'Soldier').slice(0,14)};if(nameIn)nameIn.addEventListener('input',setName);

// drag to turn (the menu overlay lets pointer events through outside its panels, so they land on the canvas)
R.domElement.addEventListener('pointerdown',e=>{if(!TWL.active)return;drag={x:e.clientX,id:e.pointerId};try{R.domElement.setPointerCapture(e.pointerId)}catch(_){}R.domElement.style.cursor='grabbing'});
addEventListener('pointermove',e=>{if(!drag||!TWL.active)return;const d=e.clientX-drag.x;drag.x=e.clientX;yaw+=d*.012;yawV=d*.012});
addEventListener('pointerup',()=>{if(!drag)return;drag=null;R.domElement.style.cursor=TWL.active?'grab':''});

// ---------------------------------------------------------------- layout: soldier stands right of centre in the space right of the panel
let cx=innerWidth/2;
function layout(){const W=innerWidth,H=innerHeight;
 const L=box.getBoundingClientRect().right,Rr=W-72; // 72: the rank badge column
 cx=L+(Rr-L)*.54;plate.style.left=(cx-200)+'px';plate.style.width='400px';
 C.aspect=W/H;C.setViewOffset(W,H,W/2-cx,0,W,H);
 // keep the whole soldier in view on short / narrow screens
 const span=Math.max(.1,Rr-L)/W*C.aspect;C.position.z=span<.6?5.5*.6/span:5.5}

// ---------------------------------------------------------------- dynamic cards
function roomInfo(){const code=typeof roomCode!=='undefined'?roomCode:'';const net=(typeof peer!=='undefined'&&peer)||(typeof hostConn!=='undefined'&&hostConn);
 if(!net||!(code||Object.keys((typeof others!=='undefined'&&others)||{}).length)){roomCard.style.display='none';return false}
 let h='<div class="twl-h">Room</div>';if(code)h+='<div class="twl-code">'+escH(code)+'</div><div class="twl-note">Friends type this in Join</div>';
 const L=[[me.name+' (you)',me.team]];for(const id in others)L.push([others[id].name,others[id].team]);
 h+='<div style="margin-top:8px">'+L.map(p=>'<div class="twl-pl"><span>'+escH(p[0])+'</span><span style="color:'+(TC[p[1]]||'#ddd')+'">'+(TN[p[1]]||'')+'</span></div>').join('')+'</div>';
 roomCard.innerHTML=h;roomCard.style.display='';return true}
let last=null;
function lastInfo(){if(!last){lastCard.style.display='none';return}
 lastCard.innerHTML='<div class="twl-h">Last match</div><div class="twl-big" style="color:'+last.col+'">'+escH(last.head)+'</div><div class="twl-note" style="margin-top:4px">'+escH(last.sub)+'</div>'+
  '<div style="margin-top:6px;font:500 15px var(--hfont);letter-spacing:1px">'+last.k+' kills · '+last.d+' deaths</div>';lastCard.style.display=''}
function progress(){const P=window.TWP;if(!P)return;try{if(typeof P.renderRank==='function')P.renderRank($('lobbyRank'))}catch(e){console.warn('[lobby] rank',e)}
 try{if(typeof P.renderDaily==='function')P.renderDaily($('lobbyDaily'))}catch(e){console.warn('[lobby] daily',e)}
 try{const i=P.info();rankB.innerHTML=P.badge(i.n)+'<div class="rn">'+escH(i.name)+'</div>';rankB.title=i.name+' · '+i.xp+' XP'}catch(e){}
 rankStrip()}

// ---------------------------------------------------------------- open / close
const DPR=Math.min(devicePixelRatio,1.5);
function open(){if(TWL.active)return;TWL.active=true;try{R.setPixelRatio(1)}catch(e){}
 if(!ch)buildChar();setGun();setName();lastInfo();progress();
 if(roomInfo())show('online');else if(last)show('play');else show(view);layout();R.domElement.style.cursor='grab'}
function close(){if(!TWL.active)return;TWL.active=false;drag=null;R.domElement.style.cursor='';try{R.setPixelRatio(DPR)}catch(e){}}
TWL.open=open;TWL.close=close;TWL.show=show;TWL.refresh=()=>{if(TWL.active){roomInfo();lastInfo();progress();layout()}};
setTab('daily');show('news');

// ---------------------------------------------------------------- loading screen
let loadT=0,loadF=0,loading=false,loadMin=700;
function showLoad(msg){load.querySelector('.d').textContent=msg||'DEPLOYING';
 if(!loading){load.querySelector('.s').textContent='Tip: '+TIPS[Math.random()*TIPS.length|0];load.querySelector('.c').innerHTML='';loading=true;loadT=performance.now();loadF=0;load.style.display='flex';void load.offsetWidth;load.classList.add('on')}}
function hideLoad(){loading=false;load.classList.remove('on');setTimeout(()=>{if(!loading)load.style.display='none'},380);
 // you clicked Play (pointer lock taken then); if the lock held, no "Click to fight" screen
 if(typeof running!=='undefined'&&running&&document.pointerLockElement===R.domElement)$('pause').style.display='none'}
TWL.loading=()=>loading;

// Play Solo: show the loading screen first, then build the match (bots, guns) behind it
if(solo&&solo.onclick){const orig=solo.onclick;solo.onclick=function(e){if(loading)return;try{R.domElement.requestPointerLock()}catch(_){}
 showLoad('DEPLOYING');requestAnimationFrame(()=>requestAnimationFrame(()=>{try{orig.call(solo,e)}catch(err){console.error(err)}if(menu.style.display!=='none'){hideLoad()}}))}}

// the menu shows / hides through the game's own code (begin(), host left...): follow it
function vis(){return getComputedStyle(menu).display!=='none'}
new MutationObserver(()=>{if(vis())open();else{if(TWL.active){close();
  const code=typeof roomCode!=='undefined'&&roomCode;showLoad(code?'ROOM OPEN':'DEPLOYING');if(code){load.querySelector('.c').innerHTML='Room code<div class="twl-code">'+escH(code)+'</div>Friends type this in Join';loadMin=2200}}}}).observe(menu,{attributes:true,attributeFilter:['style','class']});

// ---------------------------------------------------------------- match over (solo): back to the lobby instead of an automatic rematch
TWL.matchOver=function(){
 if(typeof isHost==='undefined'||!isHost||(typeof peer!=='undefined'&&peer)||(typeof hostConn!=='undefined'&&hostConn))return false; // online keeps its rematch loop
 try{const ffa=RS.mode==='ffa';
  if(ffa){const L=leaderboard(),i=L.findIndex(x=>x.id===me.id);last={head:i===0?'VICTORY':'#'+(i+1)+' OF '+L.length,col:i===0?'#8cff7a':'#f3e3b5',sub:'Free For All · winner '+(L[0]?L[0].n:''),k:me.kills,d:me.deaths}}
  else{const my=RS.sc[me.team],th=RS.sc[1-me.team];last={head:my>th?'VICTORY':my<th?'DEFEAT':'DRAW',col:my>th?'#8cff7a':my<th?'#ff8a7a':'#f3e3b5',sub:(RS.mode==='classic'?'Team Deathmatch':'Bomb Defusal')+' · '+TN[0]+' '+RS.sc[0]+' – '+RS.sc[1]+' '+TN[1],k:me.kills,d:me.deaths}}
 }catch(e){last=null}
 running=false;RS.ph='wait';RS.tl=0;try{document.exitPointerLock()}catch(e){}
 for(const k in keys)keys[k]=false;
 for(const id of['hud','pause','buy','board'])if($(id))$(id).style.display='none';if($('center'))$('center').style.opacity=0;if($('err'))$('err').textContent='';
 menu.style.display='flex';open();return true};

// ---------------------------------------------------------------- per frame (called from the game's frame())
TWL.render=function(dt){
 if(loading){loadF++;if(loadF>3&&performance.now()-loadT>loadMin){loadMin=700;hideLoad()}}
 if(!TWL.active)return false;dt=Math.min(.05,dt||.016);t0+=dt;
 layout();
 if(ch){if(!drag){yaw+=yawV;yawV*=Math.pow(.02,dt);yaw+=(YAW0+Math.sin(t0*.25)*.1-yaw)*dt*.15*(Math.abs(yawV)<.002?1:0)}
  ch.rotation.y=Math.PI+yaw;
  try{animSoldier(ch,0,-.55+Math.sin(t0*1.3)*.035,dt,false)}catch(e){}
  if(ch.userData.tag)ch.userData.tag.visible=false;if(ch.userData.pack)ch.userData.pack.visible=false;
  ch.position.y=.07+Math.sin(t0*1.6)*.006}
 // lantern flicker, distant shell flashes in the fog, drifting dust, a slow camera sway
 lamp.intensity=.85+Math.sin(t0*13)*.05+Math.sin(t0*7.3)*.06+(Math.random()-.5)*.04;
 if(Math.random()<dt*.25&&flash.intensity<.05){flash.position.x=(Math.random()-.5)*50;flash.intensity=1.6;skyU.fl.value=.7}
 flash.intensity*=Math.pow(.02,dt);skyU.fl.value*=Math.pow(.03,dt);
 const a=EMB.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)+dt*(.04+(i%5)*.015),x=a.getX(i)+Math.sin(t0*.7+i)*dt*.08;if(y>3.3){y=0;x=(Math.random()-.5)*7}a.setX(i,x);a.setY(i,y)}a.needsUpdate=true;
 C.position.x=Math.sin(t0*.21)*.08;C.position.y=1.0+Math.sin(t0*.33)*.03;C.lookAt(C.position.x*.5,.98,0);
 R.render(S,C);return true};

addEventListener('resize',()=>{if(TWL.active)layout()});
if(vis())open();
})();
