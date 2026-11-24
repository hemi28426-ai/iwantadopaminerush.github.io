// Fishing Unblocked UI icons: tiny inline-SVG line icons (24x24 grid, 2px round stroke, currentColor).
// window.FICON(name, size?) -> '<svg ...>' string ('' for an unknown name). No emoji anywhere in the UI.
(function(){
 var P={
  money:'<circle cx="12" cy="12" r="9"/><path d="M15 9.2c-.5-.9-1.6-1.4-3-1.4-1.7 0-3 .8-3 2.1 0 2.9 6 1.4 6 4.2 0 1.3-1.3 2.1-3 2.1-1.5 0-2.6-.6-3.1-1.6M12 6v1.8M12 16.2V18"/>',
  coin:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
  rod:'<path d="M3.5 20.5L17 4"/><path d="M17 4v10.5"/><path d="M17 14.5c0 2.2-3.2 2.2-3.2 0"/><circle cx="7" cy="16.4" r="1.9"/>',
  bait:'<path d="M3 15c1.6-3.4 3.6-3.4 4.8 0s3.4 3.4 4.8 0 3.4-3.4 4.8 0"/><path d="M19.8 14.2c.9-.5 1.4-1.4 1.2-2.6"/><circle cx="20.4" cy="10.4" r=".6"/>',
  bag:'<path d="M6 8h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M8 13h8"/>',
  book:'<path d="M2.5 5H8a4 4 0 0 1 4 4v11.5a3 3 0 0 0-3-3H2.5z"/><path d="M21.5 5H16a4 4 0 0 0-4 4v11.5a3 3 0 0 1 3-3h6.5z"/>',
  map:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  boat:'<path d="M12 3v13"/><path d="M12 4.5l6.5 9.5H12"/><path d="M10 7l-4.5 7H10"/><path d="M3 17h18l-2.2 3.5H5.2z"/>',
  shop:'<path d="M4 9.5L5.6 4h12.8L20 9.5"/><path d="M4 9.5h16a2.7 2.7 0 0 1-5.3.8 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3-.8z"/><path d="M5.5 12.5V20h13v-7.5"/><path d="M10 20v-4.5h4V20"/>',
  star:'<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon:'<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>',
  cloud:'<path d="M7 18h10.5a3.6 3.6 0 0 0 .5-7.2A6 6 0 0 0 6.4 10 4 4 0 0 0 7 18z"/>',
  rain:'<path d="M7 14h10.5a3.6 3.6 0 0 0 .5-7.2A6 6 0 0 0 6.4 6 4 4 0 0 0 7 14z"/><path d="M8.5 17l-1 3M12.5 17l-1 3M16.5 17l-1 3"/>',
  fog:'<path d="M5 7h11M3 11h18M6 15h14M4 19h10"/>',
  wind:'<path d="M3 8.5h11a3 3 0 1 0-3-3"/><path d="M3 12.5h15a3 3 0 1 1-3 3"/><path d="M3 16.5h7"/>',
  storm:'<path d="M7 14h10.5a3.6 3.6 0 0 0 .5-7.2A6 6 0 0 0 6.4 6 4 4 0 0 0 7 14z"/><path d="M12.5 12.5l-2.2 4h3.4l-2.2 4"/>',
  flame:'<path d="M12 2.8c.8 3 5.2 5.1 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.6 1.4-4 2.2-5.6.9 1 1.3 2 1.3 3.2 1.4-1.6 1.9-4.6 1.7-7.8z"/>',
  island:'<path d="M2 20.5h20"/><path d="M5 20.5c1.2-2.8 4-4 7-4s5.8 1.2 7 4"/><path d="M12 16.5V8"/><path d="M12 8C10.3 5.6 7.4 5.2 5 6.3"/><path d="M12 8c1.7-2.4 4.6-2.8 7-1.7"/><path d="M12 8c-.2-2.2.8-4 2.8-5"/>',
  sea:'<path d="M2 9.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 15.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
  fish:'<path d="M5.5 12c2.4-3.4 5.8-5 9.2-5 3 0 5.4 2.5 6.3 5-.9 2.5-3.3 5-6.3 5-3.4 0-6.8-1.6-9.2-5z"/><path d="M5.5 12L2.5 8.5v7z"/><circle cx="16.6" cy="11" r=".7"/>',
  trophy:'<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3.2 4M16 6h3a3 3 0 0 1-3.2 4"/><path d="M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/>',
  quest:'<path d="M8 3h11v15a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2v-2h11v2"/><path d="M8 3a2 2 0 0 0-2 2v12"/><path d="M10.5 8h5.5M10.5 12h5.5"/>',
  hunt:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/><circle cx="12" cy="12" r=".8"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  warning:'<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.3"/>',
  event:'<path d="M11 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M19 2.5v4M17 4.5h4"/>',
  time:'<path d="M6 3h12M6 21h12"/><path d="M7.5 3c0 4.5 4.5 6 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6-4.5 9s4.5 4.5 4.5 9"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  key:'<circle cx="8" cy="15" r="4.2"/><path d="M11 12l8.5-8.5M16 7l2.3 2.3M13.6 9.4l2 2"/>',
  crown:'<path d="M3 8l4.5 4.5L12 5l4.5 7.5L21 8l-2 11H5z"/>',
  trade:'<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  save:'<path d="M5 3h11.5L20 6.5V21H5z"/><path d="M8.5 3v5h6.5V3M8.5 21v-6.5h7V21"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2z"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  relic:'<path d="M8.5 21V9.5a3.5 3.5 0 0 1 7 0V21"/><path d="M6 21h12M10.5 11h.1M13.5 11h.1M10.5 15h3"/>',
  anchor:'<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8"/><path d="M4 13a8 8 0 0 0 16 0"/>',
  coral:'<path d="M12 21v-8.5"/><path d="M12 12.5c-2.8 0-4-2.4-4-5.5V4"/><path d="M12 15c2.8 0 4.4-2 4.4-5V6"/><path d="M8 8.5c-1.6 0-3-1-3-3M16.4 10c1.5 0 2.6-1 2.6-2.8"/><path d="M8 21h8"/>',
  frost:'<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/><path d="M9.3 4.3L12 6l2.7-1.7M9.3 19.7L12 18l2.7 1.7"/>',
  dunes:'<circle cx="17" cy="6.5" r="2.5"/><path d="M2 19c3.5-5 7.5-5 11 0"/><path d="M9 16.5c3.2-4 8.8-5.2 13-1.5"/>',
  mire:'<path d="M4 12a8 8 0 0 1 16 0z"/><path d="M10 12v6a2 2 0 0 0 4 0v-6"/><path d="M9 8.5h.1M14.5 7.5h.1"/>',
  crystal:'<path d="M6.5 3.5h11L21 9l-9 12L3 9z"/><path d="M3 9h18M9.5 3.5L8.5 9 12 21l3.5-12-1-5.5"/>',
  ember:'<path d="M2 21l6.5-10h7L22 21z"/><path d="M8.5 11l2 2 1.5-1.5 1.5 1.5 2-2"/><path d="M10.5 7.5c0-2 1.2-3 1-4.5M13.8 7.5c1-1 2-1.5 2-3.2"/>',
  sky:'<path d="M7 18h10.5a3.6 3.6 0 0 0 .5-7.2A6 6 0 0 0 6.4 10 4 4 0 0 0 7 18z"/><path d="M4 6.5h4M16.5 4h3"/>',
  elder:'<path d="M3 21h18M3.5 9h17L12 3.5z"/><path d="M6 9v12M10 9v12M14 9v12M18 9v12"/>',
  grotto:'<path d="M3 21v-7.5a9 9 0 0 1 18 0V21"/><path d="M9 21v-3.5a3 3 0 0 1 6 0V21"/><path d="M2 21h20"/>',
  aurora:'<path d="M3 18.5c2-7.2 5.2-11 9-11s7 3.8 9 11"/><path d="M7 18.5c1.1-4.2 2.9-6.5 5-6.5s3.9 2.3 5 6.5"/>',
  arrow:'<path d="M12 20V4M6 10l6-6 6 6"/>',
  fin:'<path d="M3 17c4 0 6-1 8-4 2-4 3-8 3-10 3 3 6 8 6 14"/><path d="M2 20c3-1.5 6-1.5 10 0s7 1.5 10 0"/>',
  coil:'<path d="M5 18c-2-2-2-5 0-7s5-2 7 0 5 2 7 0 2-5 0-7"/><path d="M5 18c2 2 5 2 7 0"/><circle cx="18.5" cy="4.5" r="1.2"/>',
  kelp:'<path d="M8 21c-2-4 2-6 0-10S8 5 7 3"/><path d="M16 21c2-3-2-6 0-9s1-6 2-8"/><path d="M8 11c2-1 3-3 3-5M16 12c-2-1-3-3-3-5"/>',
  tusk:'<path d="M5 4c0 8 4 14 12 16-3-4-5-9-5-16"/><path d="M12 4c2 5 5 8 9 9"/>',
  lantern:'<path d="M12 2v4"/><path d="M8 6h8l1 3v8a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V9z"/><path d="M12 11v4"/>',
  skull:'<path d="M5 11a7 7 0 1 1 14 0v3l-2 1v3H7v-3l-2-1z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/><path d="M11 18v2M13 18v2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  volume:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mouse:'<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v3"/>',
  keyboard:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.1M9.5 10h.1M13 10h.1M16.5 10h.1M7 14h10"/>',
  exit:'<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  reset:'<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  play:'<path d="M7 4.5l12.5 7.5L7 19.5z"/>',
  sell:'<path d="M3 12.5V4h8.5l9 9-8.5 8.5z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  gift:'<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10.5 4 6.5 4.5 7.5 7c.4 1 2.4 1 4.5 1zM12 8c1.5-4 5.5-3.5 4.5-1-.4 1-2.4 1-4.5 1z"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  ruler:'<path d="M3 16.5L16.5 3 21 7.5 7.5 21z"/><path d="M7 12.5l2 2M10 9.5l2 2M13 6.5l2 2"/>',
  dna:'<path d="M7 3c0 6 10 6 10 9s-10 3-10 9M17 3c0 6-10 6-10 9s10 3 10 9"/><path d="M8.5 6.5h7M8.5 17.5h7"/>'
 };
 // aliases: weather ids, level/streak words, island ids from the world defs
 var A={level:'star',xp:'star',streak:'flame',fire:'flame',clear:'sun',day:'sun',night:'moon',windy:'wind',harbor:'anchor',driftwood:'anchor',
  lurerock:'fish',lake:'sea',pond:'sea',ocean:'sea',open:'sea',locked:'lock',hourglass:'time',dial:'time',sparkle:'event',eye:'hunt',x:'close',ok:'check',alert:'warning',scroll:'quest',shiny:'event',mutation:'dna',size:'ruler'};
 function FICON(name,size){var k=P[name]?name:A[name];if(!k||!P[k])return '';var s=size||18;
  return '<svg class="fic fic-'+k+'" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+P[k]+'</svg>';}
 FICON.has=function(n){return !!(P[n]||A[n]);};
 FICON.names=Object.keys(P);
 // strip emoji (Extended_Pictographic + variation selectors + ZWJ + keycaps) from text shown in the UI: a backstop for strings from other modules
 var RE;try{RE=new RegExp('[\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}\\u{1F3FB}-\\u{1F3FF}]\\uFE0F?(\\u200D[\\p{Extended_Pictographic}]\\uFE0F?)*|[\\uFE0E\\uFE0F\\u20E3]','gu');}catch(e){RE=/[\u2600-\u27BF\uFE0F\uFE0E]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g;}
 // keep a few typographic arrows/marks that are not emoji-looking in our font (the island tag triangle is drawn as a path anyway)
 FICON.strip=function(t){if(t==null)return t;t=String(t);if(!t)return t;var o=t.replace(RE,'');if(o!==t)o=o.replace(/^[  ]+/,'').replace(/([>(\[]) +/g,'$1').replace(/ {2,}/g,' ');return o.replace(/ \u2022 /g,' \u00b7 ').replace(/ \u2014 /g,' \u00b7 ');}; // one separator style everywhere
 // canvas drawing of the same icons (map, labels): FICON.draw(ctx, name, cx, cy, size, color, lineWidthPx?)
 var PC={};function paths(k){if(PC[k])return PC[k];var L=[],re=/<(path|circle|rect)([^>]*)\/>/g,m;
  function at(s,n){var r=new RegExp(' '+n+'="([^"]*)"').exec(s);return r?r[1]:null;}
  if(typeof Path2D==='undefined')return PC[k]=L;
  while((m=re.exec(P[k]))){var s=m[2],q;if(m[1]==='path')q=new Path2D(at(s,'d'));
   else if(m[1]==='circle'){q=new Path2D();q.arc(+at(s,'cx'),+at(s,'cy'),+at(s,'r'),0,Math.PI*2);}
   else{q=new Path2D();q.rect(+at(s,'x'),+at(s,'y'),+at(s,'width'),+at(s,'height'));}L.push(q);}
  return PC[k]=L;}
 FICON.draw=function(g,name,cx,cy,size,color,lw){var k=P[name]?name:A[name];if(!k||!P[k])return false;var L=paths(k);if(!L.length)return false;var s=size/24;
  g.save();g.translate(cx-size/2,cy-size/2);g.scale(s,s);g.lineWidth=(lw||2*s)/s;g.lineCap='round';g.lineJoin='round';g.strokeStyle=color||'#fff';
  for(var i=0;i<L.length;i++)g.stroke(L[i]);g.restore();return true;};
 window.FICON=FICON;
})();
