'use strict';
/* ================= ANALYTICS WORKSPACE (MoTeC-style) ================= */
const Analytics=(()=>{
 const st={tab:'traces',A:null,B:null,chs:['delta','v','z','nz','thr','brk','st','g','ay'],mapCh:'v',cursor:null,zone:null,trk:'autox'};
 const TABS=[['traces','Traces & delta'],['map','Track map'],['gg','g-g diagram'],['vr','Speed vs radius'],['sect','Sectors'],['dyno','Dyno & gears'],['energy','Energy'],['rel','Reliability'],['career','Career trends'],['break','Lap-time breakdown']];
 function refSim(trk){const D=curD();const tr=TR[trk];const r=simLap(D,tr,{v0:0,use:STYLES[S.car.tune.style].use,standing:!tr.closed||trk==='autox'});return lapFromSim(D,trk,r,'sim-driver');}
 function lastSeasonSim(trk){const Di=derive(S.inherited,S.rd);const tr=TR[trk];const r=simLap(Di,tr,{v0:0,use:.965,standing:trk==='autox'||!tr.closed});return lapFromSim(Di,trk,r,'last-season car (sim)');}
 function options(){const o=lapsList();for(const k of['autox','flow','endu','skid','accel']){o.push({L:null,lab:`Sim-driver · current car · ${TR[k].name}`,sim:k});o.push({L:null,lab:`Last-season car (sim) · ${TR[k].name}`,last:k});}return o;}
 function resolve(opt){if(!opt)return null;if(opt.L)return opt.L;if(opt.sim)return refSim(opt.sim);if(opt.last)return lastSeasonSim(opt.last);return null;}
 function ensure(){if(!st.A){const ses=(typeof Drive!=='undefined'&&Drive.session.length)?Drive.session[Drive.session.length-1]:null;st.A=ses||S.laps&&Object.values(S.laps)[0]||refSim('autox');}
  if(!st.B||st.B.track!==st.A.track){st.B=(S.ghosts||{})[st.A.track]||(S.records||{})[st.A.track]&&S.records[st.A.track]!==st.A&&S.records[st.A.track]||refSim(st.A.track);}st.trk=st.A.track;}
 function render(a){ensure();elevCh(st.A);if(st.B)elevCh(st.B);const opts=options();const A=st.A,B=st.B;
  a.innerHTML=`<div class="row" style="margin-bottom:10px;flex-wrap:wrap;gap:8px"><div><h1>Analytics</h1><div class="sub" style="margin:0">Data-driven engineering: traces vs distance, overlays, maps, envelopes. Hover a trace to sync the cursor.</div></div><span class="sp"></span>
   <label class="small">Lap A <select id="anA">${opts.map((o,i)=>`<option value="${i}" ${o.L===A?'selected':''}>${o.lab}</option>`).join('')}</select></label>
   <label class="small">Reference B <select id="anB"><option value="-1">— none —</option>${opts.map((o,i)=>`<option value="${i}" ${o.L===B?'selected':''}>${o.lab}</option>`).join('')}</select></label>
   <button class="btn sm" id="anCsv">⬇ CSV (lap A)</button></div>
  <div class="row small" style="margin-bottom:8px;gap:14px;flex-wrap:wrap"><span class="pill r">A</span> ${lapLab(A)} <span class="pill b">B</span> ${B?lapLab(B):'—'} ${B?`<b class="${A.time<=B.time?'up':'dn'}">${A.time<=B.time?'':'+'}${(A.time-B.time).toFixed(2)} s</b>`:''}</div>
  <div class="card" id="insights"></div>
  <div class="tabs" style="margin-top:12px">${TABS.map(([k,l])=>`<button data-tab="${k}" class="${st.tab===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="card" id="anBody" style="margin-top:8px"></div>`;
  a.querySelector('#anA').onchange=e=>{st.A=resolve(opts[+e.target.value]);st.B=null;st.zone=null;render(a);};
  a.querySelector('#anB').onchange=e=>{const v=+e.target.value;st.B=v<0?null:resolve(opts[v]);if(st.B&&st.B.track!==st.A.track){toast('Reference must be on the same track');st.B=null;}render(a);};
  if(!st.B)ensureNullB();
  a.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{st.tab=b.dataset.tab;render(a);});
  a.querySelector('#anCsv').onclick=()=>csv(A);
  insights(a.querySelector('#insights'));body(a.querySelector('#anBody'));}
 function ensureNullB(){}
 function lapLab(L){return`${TR[L.track].name} · ${L.src} · S${L.season} · <b>${fmtT(L.time)}</b>${L.cones?` (${L.cones} cones)`:''}${L.tl?` <span class="dn">(${L.tl} track limit${L.tl>1?'s':''} +${f0(L.tlPen)} s)</span>`:''}${L.invalid?' <span class="pill r">invalid</span>':''}${L.walls&&L.walls.length?` · ${L.walls.length} wall hit(s)`:''}${L.elev?'':' <span class="mut">(flat track, pre-2.2)</span>'}`;}
 function insights(el){const A=st.A,B=st.B,D=curD();const ops=[];
  const sim=refSim(A.track);const sA=sectorTimes(A,A.track),sS=sectorTimes(sim,A.track);
  sA.forEach((s,i)=>{const d=s.t-sS[i].t;if(d>.05)ops.push({sec:s.l,dt:d,t:`<b>${s.l}</b>: ${d.toFixed(2)} s slower than the sim-driver's limit lap in your own car — driving opportunity.`,jump:{ch:'v',i0:s.i0,i1:s.i1}});});
  if(B&&B!==sim){const sB=sectorTimes(B,A.track);sA.forEach((s,i)=>{const d=s.t-sB[i].t;if(d>.08)ops.push({sec:s.l,dt:d,t:`<b>${s.l}</b>: ${d.toFixed(2)} s behind ${B.src==='player'?'reference lap':B.src} — compare speed & brake traces.`,jump:{ch:'v',i0:s.i0,i1:s.i1}});});}
  // model opportunities: what would grip / downforce / power be worth on this track?
  const tr=TR[A.track];const base=simLap(D,tr,{v0:0,use:.965,standing:true}).time;
  const tryD=(mod,lab)=>{const D2=Object.assign({},D);mod(D2);const t=simLap(D2,tr,{v0:0,use:.965,standing:true}).time;if(base-t>.03)ops.push({model:1,dt:base-t,t:`${lab}: worth <b>${(base-t).toFixed(2)} s</b> per lap here (model).`});};
  tryD(d=>{d.mu*=1.03;},'+3% grip (tires/setup)');tryD(d=>{d.ClA+=.5;d.CdA+=.12;},'+0.5 m² C<sub>L</sub>A (at the drag cost)');tryD(d=>{d.kW*=1.05;},'+5% power');tryD(d=>{d.m-=8;d.mEff-=8;},'−8 kg');
  if(Math.abs(D.bal)>1.5)ops.push({model:1,dt:.3,t:`Balance index ${f1(D.bal)}: the car ${D.bal>0?'understeers':'oversteers'} — fixing it is "free" grip.`});
  ops.sort((a,b)=>b.dt-a.dt);const seen=new Set();const uniq=ops.filter(o=>{if(!o.sec)return true;if(seen.has(o.sec))return false;seen.add(o.sec);return true;});
  const top=uniq.slice(0,3);const bestModel=uniq.find(o=>o.model);if(bestModel&&!top.some(o=>o.model)&&top.length===3)top[2]=bestModel;
  el.innerHTML=`<h2>Top 3 opportunities (seconds)</h2>${top.length?top.map((o,i)=>`<div class="stat"><span>${i+1}. ${o.t}</span><span>${o.jump?`<button class="btn sm" data-j="${i}">Show</button>`:''} <b>${o.dt.toFixed(2)} s</b></span></div>`).join(''):'<span class="mut">You are on the limit everywhere — impressive.</span>'}`;
  el.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{const o=top[+b.dataset.j];st.zone=[o.jump.i0,o.jump.i1];st.tab='traces';render($('#app'));});}
 function body(el){({traces,map,gg,vr,sect,dyno,energy,rel,career,break:breakdown})[st.tab](el);}
 /* ---- traces ---- */
 function traces(el){const A=st.A,B=st.B;const n=A.ch.v.length;const chs=st.chs;
  el.innerHTML=`<div class="row small" style="flex-wrap:wrap;gap:10px;margin-bottom:6px">${[{k:'delta',l:'Delta time'},...TCH].map(c=>`<label><input type="checkbox" data-ch="${c.k}" ${chs.includes(c.k)?'checked':''}> ${c.l}</label>`).join('')}</div>
  <div style="display:grid;grid-template-columns:1fr 260px;gap:10px"><canvas id="trc" width="1200" height="${chs.length*110+30}" style="width:100%;background:#0b1119;border-radius:8px"></canvas><div><canvas id="trMap" width="260" height="220" style="background:#0b1119;border-radius:8px;width:260px"></canvas><div id="trRead" class="small" style="margin-top:6px"></div></div></div>`;
  el.querySelectorAll('[data-ch]').forEach(c=>c.onchange=()=>{const k=c.dataset.ch;st.chs=c.checked?[...st.chs,k]:st.chs.filter(x=>x!==k);traces(el);});
  const cv=el.querySelector('#trc'),g=cv.getContext('2d'),W=cv.width,H=cv.height;const X=i=>60+i/(n-1)*(W-70);
  const dlt=B?deltaTrace(A,B):null;
  const drawAll=()=>{g.clearRect(0,0,W,H);
   if(st.zone){g.fillStyle='rgba(255,176,32,.13)';g.fillRect(X(st.zone[0]),0,X(st.zone[1])-X(st.zone[0]),H);}
   chs.forEach((k,row)=>{const y0=10+row*110,h=96;g.strokeStyle='#1d2633';g.strokeRect(60,y0,W-70,h);
    const meta=k==='delta'?{l:'Delta A−B (s)',col:'#ffd166'}:TCH.find(c=>c.k===k);g.fillStyle=meta.col;g.font='12px sans-serif';g.textAlign='left';g.fillText(meta.l,4,y0+12);
    let a=k==='delta'?(dlt?Array.from(dlt):null):A.ch[k],b=k==='delta'?null:(B?B.ch[k]:null);if(!a)return;
    const conv=k==='v'?(U()==='si'?3.6:MPH):k==='thr'||k==='brk'?100:1;
    let mn=Math.min(...a,...(b||[])),mx=Math.max(...a,...(b||[]));if(k==='delta'){const m=Math.max(Math.abs(mn),Math.abs(mx),.1);mn=-m;mx=m;}if(mx-mn<1e-6){mx=mn+1;}
    const Y=v=>y0+h-((v-mn)/(mx-mn))*(h-8)-4;g.fillStyle='#5b6676';g.fillText(f1(mx*conv),4,y0+26);g.fillText(f1(mn*conv),4,y0+h-2);
    if(k==='delta'){g.strokeStyle='#334';g.beginPath();g.moveTo(60,Y(0));g.lineTo(W-10,Y(0));g.stroke();}
    if(b){g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.3;g.beginPath();b.forEach((v,i)=>i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)));g.stroke();}
    g.strokeStyle=meta.col;g.lineWidth=2;g.beginPath();a.forEach((v,i)=>i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)));g.stroke();});
   // crest/dip labels on the elevation row, track-limit incidents & wall hits across all rows
   const zr=chs.indexOf('z');if(zr>=0){g.font='11px sans-serif';g.textAlign='center';for(const f of TR[A.track].feats||[]){if(f.R>700)continue;const y0=10+zr*110;g.fillStyle=f.type==='crest'?'#ff9f43':'#4ea1ff';g.fillText(`${f.type==='crest'?'▲ crest':'▼ dip'} R${f0(f.R)} m`,X(f.iPk),f.type==='crest'?y0+24:y0+90);}}
   for(const e of A.limits||[]){g.strokeStyle='rgba(255,77,77,.85)';g.setLineDash([4,3]);g.lineWidth=1.5;g.beginPath();g.moveTo(X(e.i),4);g.lineTo(X(e.i),H-24);g.stroke();g.setLineDash([]);g.fillStyle='#ff4d4d';g.font='bold 11px sans-serif';g.textAlign='left';g.fillText(`${e.kind==='OC'?'OFF COURSE':'TRACK LIMITS'} +${e.pen}s`,X(e.i)+3,14);}
   for(const e of A.walls||[]){g.fillStyle='#ffb020';g.font='bold 11px sans-serif';g.textAlign='left';g.fillText(`▮ wall ${f1(e.vn)} m/s`,X(e.i)+3,28);}
   g.fillStyle='#5b6676';g.textAlign='center';for(let d=0;d<n;d+=100)g.fillText(d+' m',X(d),H-6);
   for(const z of TR[A.track].zones){if(!z.r)continue;g.fillStyle='rgba(201,211,224,.55)';g.fillText(z.label,X((z.i0+z.i1)/2),H-18);}
   if(st.cursor!=null){g.strokeStyle='#fff';g.lineWidth=1;g.beginPath();g.moveTo(X(st.cursor),0);g.lineTo(X(st.cursor),H-24);g.stroke();}};
  const mp=el.querySelector('#trMap');const mapF=miniMap(mp,A.track,A.ch[st.mapCh]||A.ch.v);
  const read=()=>{const i=st.cursor;if(i==null)return;mapF(i);el.querySelector('#trRead').innerHTML=`<b>${i} m</b>`+[...TCH].map(c=>`<div class="stat"><span style="color:${c.col}">${c.l}</span><span>${fmtCh(c,(A.ch[c.k]||[])[i])}${B?` <span class="mut">/ ${fmtCh(c,(B.ch[c.k]||[])[i])}</span>`:''}</span></div>`).join('')+(dlt?`<div class="stat"><span style="color:#ffd166">Delta</span><span>${dlt[i]>0?'+':''}${dlt[i].toFixed(3)} s</span></div>`:'');};
  cv.onmousemove=e=>{const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;st.cursor=clamp(Math.round((x-60)/(W-70)*(n-1)),0,n-1);drawAll();read();};
  if(st.cursor==null)st.cursor=st.zone?st.zone[0]:Math.floor(n/3);drawAll();read();}
 function fmtCh(c,v){if(v==null)return'—';if(c.k==='v')return spd1(v);if(c.k==='thr'||c.k==='brk')return f0(v*100)+'%';if(c.k==='rpm')return f0(v);if(c.k==='g')return f0(v);return f2(v)+(c.u&&c.u!=='spd'?' '+c.u:'');}
 function miniMap(cv,trk,vals,label){const g=cv.getContext('2d'),W=cv.width,H=cv.height;const pts=TR[trk].pts;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  const sc=Math.min((W-30)/(x1-x0||1),(H-40)/(y1-y0||1));const ox=(W-(x1-x0)*sc)/2,oy=(H-(y1-y0)*sc)/2;const MX=p=>ox+(p.x-x0)*sc,MY=p=>H-oy-(p.y-y0)*sc;
  const mn=Math.min(...vals),mx=Math.max(...vals);const col=v=>{const t=(v-mn)/((mx-mn)||1);return`hsl(${240-240*t},85%,55%)`;};
  const base=()=>{g.clearRect(0,0,W,H);g.lineWidth=Math.max(3,W/60);g.lineCap='round';for(let i=1;i<pts.length;i++){g.strokeStyle=col(vals[i]);g.beginPath();g.moveTo(MX(pts[i-1]),MY(pts[i-1]));g.lineTo(MX(pts[i]),MY(pts[i]));g.stroke();}
   if(st.zone){g.strokeStyle='rgba(255,176,32,.9)';g.lineWidth=2;g.beginPath();for(let i=st.zone[0];i<=st.zone[1];i++)i===st.zone[0]?g.moveTo(MX(pts[i]),MY(pts[i])):g.lineTo(MX(pts[i]),MY(pts[i]));g.stroke();}
   g.fillStyle='#8b97a8';g.font='11px sans-serif';g.textAlign='left';g.fillText(`${label||''} low`,6,H-6);g.textAlign='right';g.fillText('high',W-6,H-6);
   for(const z of TR[trk].zones){if(!z.r)continue;const p=pts[(z.i0+z.i1)>>1];g.fillStyle='rgba(230,235,242,.75)';g.textAlign='center';g.fillText(z.label,MX(p),MY(p)-8);}};
  base();return i=>{base();const p=pts[i];g.fillStyle='#fff';g.beginPath();g.arc(MX(p),MY(p),5,0,7);g.fill();};}
 /* ---- track map colored by channel ---- */
 function map(el){const A=st.A;el.innerHTML=`<div class="row small" style="gap:8px;margin-bottom:8px">Color by <select id="mapCh">${[...TCH,{k:'delta',l:'Delta vs B'}].map(c=>`<option value="${c.k}" ${st.mapCh===c.k?'selected':''}>${c.l}</option>`).join('')}</select></div><canvas id="bigMap" width="1100" height="560" style="width:100%;background:#0b1119;border-radius:8px"></canvas>`;
  el.querySelector('#mapCh').onchange=e=>{st.mapCh=e.target.value;map(el);};
  const vals=st.mapCh==='delta'?(st.B?Array.from(deltaTrace(A,st.B)).map((d,i,a)=>i?d-a[i-1]:0):A.ch.v):(A.ch[st.mapCh]||A.ch.v);miniMap(el.querySelector('#bigMap'),A.track,vals,(TCH.find(c=>c.k===st.mapCh)||{l:'Δ time gained/lost'}).l);}
 /* ---- g-g ---- */
 function gg(el){const A=st.A,D=curD();el.innerHTML=`<div style="display:grid;grid-template-columns:560px 1fr;gap:14px"><canvas id="ggc" width="560" height="560" style="background:#0b1119;border-radius:8px;width:100%"></canvas><div class="small"><h3>Reading the g-g diagram</h3><p>Each dot is one metre of lap A: lateral g (x) vs longitudinal g (y). The tires can deliver μ×load in <i>any</i> direction — the <b>traction circle</b>. Downforce grows the circle with speed (rings shown at 10, 20, 30 m/s).</p><p>Dots well inside the ring = unused grip. Dots on the ring with a gap at the diagonals = not trail-braking / not combining.</p><div class="phys">a<sub>max</sub>(v) = μ·(1 + ρC<sub>L</sub>Av²/2mg) → ${[10,20,30].map(v=>`${v} m/s: <b>${f2(latG(D,v))} g</b>`).join(' · ')}</div><p>Utilisation: <b>${f0(util(A,D)*100)}%</b> of the available envelope on average in corners.</p></div></div>`;
  const c=el.querySelector('#ggc'),g=c.getContext('2d'),W=c.width;const s=W/2/2.6;const C=W/2;g.strokeStyle='#1d2633';for(let r=.5;r<=2.5;r+=.5){g.beginPath();g.arc(C,C,r*s,0,7);g.stroke();g.fillStyle='#3b4757';g.fillText(r+' g',C+r*s+2,C-2);}
  g.beginPath();g.moveTo(0,C);g.lineTo(W,C);g.moveTo(C,0);g.lineTo(C,W);g.stroke();
  [10,20,30].forEach((v,i)=>{g.strokeStyle=['rgba(46,204,113,.35)','rgba(46,204,113,.6)','rgba(46,204,113,.9)'][i];g.lineWidth=2;g.beginPath();g.ellipse(C,C,latG(D,v)*s,Math.min(latG(D,v),D.brake)*s,0,0,7);g.stroke();});
  const pt=(L,col)=>{g.fillStyle=col;for(let i=0;i<L.ch.v.length;i++){g.fillRect(C+L.ch.ay[i]*s-1.5,C-L.ch.ax[i]*s-1.5,3,3);}};if(st.B)pt(st.B,'rgba(255,255,255,.25)');pt(A,'rgba(255,176,32,.75)');
  g.fillStyle='#8b97a8';g.fillText('braking ↓   accel ↑   lateral ←→',10,W-10);}
 function util(L,D){let s=0,n=0;for(let i=0;i<L.ch.v.length;i++){if(TR[L.track].pts[i].k>0){s+=Math.hypot(L.ch.ax[i],L.ch.ay[i])/latG(D,L.ch.v[i]);n++;}}return n?s/n:0;}
 /* ---- speed vs radius ---- */
 function vr(el){const A=st.A,D=curD();const tr=TR[A.track];el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 300px;gap:14px"><canvas id="vrc" width="900" height="460" style="background:#0b1119;border-radius:8px;width:100%"></canvas><div class="small"><h3>Corner speed vs radius</h3><p>Dots: your minimum speed in each corner of lap A. Curves: the steady-state limit.</p><div class="phys">No aero: v = √(μ g r)<br>With aero: v² = μ g / (1/r − μρC<sub>L</sub>A/2m)</div><p>Dots close to the solid curve = driving on the limit. Dashed = without your downforce: the gap between curves is what aero buys you, and it grows with radius.</p></div></div>`;
  const c=el.querySelector('#vrc'),g=c.getContext('2d'),W=c.width,H=c.height;const rMax=60,vMax=32;const X=r=>50+r/rMax*(W-70),Y=v=>H-30-v/vMax*(H-50);
  g.strokeStyle='#1d2633';g.fillStyle='#5b6676';g.font='11px sans-serif';for(let r=0;r<=rMax;r+=10){g.beginPath();g.moveTo(X(r),Y(0));g.lineTo(X(r),Y(vMax));g.stroke();g.fillText(r+' m',X(r)-8,H-12);}for(let v=0;v<=vMax;v+=5){g.beginPath();g.moveTo(X(0),Y(v));g.lineTo(X(rMax),Y(v));g.stroke();g.fillText(U()==='si'?f0(v*3.6):f0(v*MPH),14,Y(v)+4);}
  const curve=(aero,dash,col)=>{g.strokeStyle=col;g.lineWidth=2.5;g.setLineDash(dash);g.beginPath();for(let r=3;r<=rMax;r+=.5){const v=Math.min(aero?cornerV(D,1/r,1,1):Math.sqrt(D.mu*G*r*(r<14?D.tight:1)),vMax);r===3?g.moveTo(X(r),Y(v)):g.lineTo(X(r),Y(v));}g.stroke();g.setLineDash([]);};
  curve(false,[6,6],'#8b97a8');curve(true,[],'#2ecc71');
  for(const z of tr.zones){if(!z.r)continue;let mn=1e9;for(let i=z.i0;i<=z.i1;i++)mn=Math.min(mn,A.ch.v[i]);g.fillStyle='#ffb020';g.beginPath();g.arc(X(z.r),Y(mn),6,0,7);g.fill();g.fillStyle='#e6ebf2';g.fillText(z.label,X(z.r)+8,Y(mn)-6);
   if(st.B){let mb=1e9;for(let i=z.i0;i<=z.i1;i++)mb=Math.min(mb,st.B.ch.v[i]);g.strokeStyle='#fff';g.beginPath();g.arc(X(z.r),Y(mb),5,0,7);g.stroke();}}
  g.fillStyle='#8b97a8';g.fillText(`speed (${U()==='si'?'km/h':'mph'}) vs corner radius — solid: limit with aero · dashed: no aero · white rings: reference B`,60,16);}
 /* ---- sectors & theoretical best ---- */
 function sect(el){const A=st.A,B=st.B;const sA=sectorTimes(A,A.track),sB=B?sectorTimes(B,A.track):null;const all=lapsList().map(o=>o.L).filter(L=>L.track===A.track);all.push(refSim(A.track));
  const best=sA.map((s,i)=>Math.min(...all.map(L=>sectorTimes(L,A.track)[i].t)));const theo=best.reduce((a,b)=>a+b,0);
  el.innerHTML=`<table><tr><th>Sector</th><th>Lap A</th>${B?'<th>Ref B</th><th>Δ</th>':''}<th>Best of all laps</th><th>A − best</th></tr>${sA.map((s,i)=>`<tr><td>${s.l}</td><td>${f2(s.t)}</td>${B?`<td>${f2(sB[i].t)}</td><td class="${s.t-sB[i].t<=0?'up':'dn'}">${s.t-sB[i].t>0?'+':''}${(s.t-sB[i].t).toFixed(2)}</td>`:''}<td>${f2(best[i])}</td><td>${(s.t-best[i]).toFixed(2)}</td></tr>`).join('')}
  <tr><td><b>Total</b></td><td><b>${f2(sA.reduce((a,s)=>a+s.t,0))}</b></td>${B?`<td>${f2(sB.reduce((a,s)=>a+s.t,0))}</td><td></td>`:''}<td><b>${f2(theo)}</b> theoretical best</td><td>${f2(sA.reduce((a,s)=>a+s.t,0)-theo)}</td></tr></table><p class="small mut">Theoretical best = sum of the fastest sector times across every lap stored for this track (session, season best, ghost, record, sim-driver).</p>`;}
 /* ---- dyno & gears ---- */
 function dyno(el){const D=curD();const A=st.A;const em=D.ice?D.em:evModel(D);el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><h3>Dyno with lap-A operating points</h3><canvas id="dy" width="640" height="340" style="width:100%;background:#0b1119;border-radius:8px"></canvas></div><div><h3>Tractive force per gear vs traction limit</h3><canvas id="gs" width="640" height="340" style="width:100%;background:#0b1119;border-radius:8px"></canvas></div></div><div class="row" style="margin-top:12px;gap:14px"><div style="flex:1"><h3>Time in gear (lap A)</h3><canvas id="tig" width="640" height="120" style="width:100%;background:#0b1119;border-radius:8px"></canvas></div><div style="flex:1" class="small">${dynoText(D)}</div></div>`;
  drawDyno(el.querySelector('#dy'),D,A);drawGearChart(el.querySelector('#gs'),D);
  const t=el.querySelector('#tig'),g=t.getContext('2d');const n=D.gearV.length;const tg=new Array(n).fill(0);for(let i=1;i<A.ch.t.length;i++){const gi=clamp((A.ch.g[i]||1)-1,0,n-1);tg[gi]+=A.ch.t[i]-A.ch.t[i-1];}const tot=tg.reduce((a,b)=>a+b,0)||1;let x=10;
  tg.forEach((v,i)=>{const w=v/tot*(t.width-20);g.fillStyle=['#4ea1ff','#2ecc71','#ffb020','#ff7ab6','#c39bff'][i%5];g.fillRect(x,30,w,50);g.fillStyle='#0b1119';g.font='bold 13px sans-serif';if(w>40)g.fillText(`G${i+1} ${f0(v/tot*100)}%`,x+6,60);x+=w;});}
 function dynoText(D){if(!D.ice)return'<p>EV: constant torque to base speed, then constant power. No intake/exhaust tuning; single reduction gear.</p>';const e=D.em;
  return`<div class="phys">Helmholtz intake: <b>${f0(e.nH)} rpm</b> · exhaust wave: <b>${f0(e.nE)} rpm</b> · cam VE peak <b>${f0(e.nCam)} rpm</b><br>Restrictor choked over ${f0(e.chokeFrac*100)}% of the rev range (ṁ<sub>max</sub> = ${f2(MDOT_MAX*1000)} g/s)<br>Peak ${f1(D.kW)} kW @ ${e.peakN} rpm · torque peak @ ${e.tqN} rpm · valve float ${f0(e.nFloat)} rpm${e.floats?' <b style="color:#ff6b63">(below rev limit!)</b>':''} · knock index ${f2(e.knock)}</div>`;}
 function drawDyno(c,D,L){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);const em=D.ice?D.em:evModel(D);const sc=D.kW/(em.peakKW||D.kW);
  const rMax=em.redline||12000,tMax=Math.max(...em.tq)*sc*1.15,pMax=D.kW*1.15;const X=r=>40+r/rMax*(W-80),Yt=t=>H-30-t/tMax*(H-50),Yp=p=>H-30-p/pMax*(H-50);
  g.strokeStyle='#1d2633';g.fillStyle='#5b6676';g.font='11px sans-serif';for(let r=2000;r<=rMax;r+=2000){g.beginPath();g.moveTo(X(r),20);g.lineTo(X(r),H-30);g.stroke();g.fillText(r,X(r)-12,H-12);}
  if(L&&L.ch.rpm){const bins=new Array(40).fill(0);for(let i=1;i<L.ch.rpm.length;i++){const b=clamp(Math.floor(L.ch.rpm[i]/rMax*40),0,39);bins[b]+=(L.ch.t[i]-L.ch.t[i-1])*((L.ch.thr[i]||0)>.6?1:.3);}const bm=Math.max(...bins)||1;bins.forEach((v,b)=>{g.fillStyle='rgba(78,161,255,.22)';const h=v/bm*(H-60);g.fillRect(X(b/40*rMax),H-30-h,(W-80)/40-1,h);});}
  if(D.ice){const e=D.em;[[e.nH,'Helmholtz','#19d3c5'],[e.nE,'exhaust','#a77bff'],[e.nFloat,'valve float','#ff6b63']].forEach(([n,l,col])=>{if(n>rMax*1.05)return;g.strokeStyle=col;g.setLineDash([5,5]);g.beginPath();g.moveTo(X(n),20);g.lineTo(X(n),H-30);g.stroke();g.setLineDash([]);g.fillStyle=col;g.fillText(l,X(n)+3,30);});}
  g.lineWidth=2.5;g.strokeStyle='#e10600';g.beginPath();em.rpm.forEach((r,i)=>i?g.lineTo(X(r),Yt(em.tq[i]*sc)):g.moveTo(X(r),Yt(em.tq[i]*sc)));g.stroke();
  g.strokeStyle='#ffb020';g.beginPath();em.rpm.forEach((r,i)=>i?g.lineTo(X(r),Yp(em.kw[i]*sc)):g.moveTo(X(r),Yp(em.kw[i]*sc)));g.stroke();
  const tc=(S.challenges||[]).find(c=>c.key==='rpm');if(tc&&D.ice){g.fillStyle='rgba(46,204,113,.15)';g.fillRect(X(tc.target-250),20,X(tc.target+250)-X(tc.target-250),H-50);}
  g.fillStyle='#e10600';g.fillText('torque (N·m)',44,16);g.fillStyle='#ffb020';g.fillText('power (kW)',130,16);g.fillStyle='rgba(78,161,255,.9)';g.fillText('operating time (lap A)',210,16);}
 function drawGearChart(c,D){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);const vMax=D.vGear*1.08;const Fmax=D.mu*D.m*G*1.25;const X=v=>40+v/vMax*(W-60),Y=f=>H-30-f/Fmax*(H-50);
  g.strokeStyle='#1d2633';g.fillStyle='#5b6676';g.font='11px sans-serif';for(let v=0;v<=vMax;v+=5){g.beginPath();g.moveTo(X(v),20);g.lineTo(X(v),H-30);g.stroke();g.fillText(U()==='si'?f0(v*3.6):f0(v*MPH),X(v)-6,H-12);}
  g.strokeStyle='#2ecc71';g.lineWidth=2;g.setLineDash([6,4]);g.beginPath();for(let v=0;v<=vMax;v+=.5){const N=D.m*G+.5*RHO*D.ClA*v*v;const f=D.mu*N*D.rear;v?g.lineTo(X(v),Y(f)):g.moveTo(X(v),Y(f));}g.stroke();g.setLineDash([]);
  g.strokeStyle='#8b97a8';g.beginPath();for(let v=0;v<=vMax;v+=.5){const f=D.kW*1000/Math.max(v,1);v?g.lineTo(X(v),Y(Math.min(f,Fmax))):g.moveTo(X(v),Y(Math.min(f,Fmax)));}g.stroke();
  g.strokeStyle='#ff4d4d';g.beginPath();for(let v=1;v<=vMax;v+=.5){const f=.5*RHO*D.CdA*v*v+.015*D.m*G;v>1?g.lineTo(X(v),Y(f)):g.moveTo(X(v),Y(f));}g.stroke();
  const cols=['#4ea1ff','#2ecc71','#ffb020','#ff7ab6','#c39bff'];D.gearR.forEach((R,gi)=>{g.strokeStyle=cols[gi%5];g.lineWidth=2.5;g.beginPath();let first=true;for(let v=.5;v<=D.gearV[gi];v+=.25){const rpm=v/D.rw*R*60/(2*Math.PI);if(D.ice&&rpm<2000)continue;const F=engTorque(D,rpm)*R*.9/D.rw;first?g.moveTo(X(v),Y(Math.min(F,Fmax))):g.lineTo(X(v),Y(Math.min(F,Fmax)));first=false;}g.stroke();g.fillStyle=cols[gi%5];g.fillText('G'+(gi+1),X(D.gearV[gi])-14,Y(Math.min(engTorque(D,D.redline*.95)*R*.9/D.rw,Fmax))-6);});
  g.fillStyle='#2ecc71';g.fillText('rear traction limit μ·N·rear',44,16);g.fillStyle='#8b97a8';g.fillText('P/v',220,16);g.fillStyle='#ff4d4d';g.fillText('drag + rolling',260,16);}
 /* ---- energy ---- */
 function energy(el){const A=st.A,D=curD();const n=A.ch.v.length;let Ed=0,Er=0,Eb=0,Ew=0,Eup=0;const pts=TR[A.track].pts;
  for(let i=0;i<n-1;i++){const v=(A.ch.v[i]+A.ch.v[i+1])/2,d=pts[i].d||1;const dKE=.5*D.mEff*(A.ch.v[i+1]**2-A.ch.v[i]**2);const fd=.5*RHO*D.CdA*v*v*d,fr=.015*D.m*G*d;
   const dPE=D.m*G*(((pts[i+1]||pts[i]).z||0)-(pts[i].z||0)); // m g Δz: climbing stores energy, descending returns it
   Ed+=fd;Er+=fr;if(dPE>0)Eup+=dPE;const net=dKE+fd+fr+dPE;if(net>0)Ew+=net;else Eb+=-net;}
  const fuel=Ew/D.eff;const rows=[['Aerodynamic drag',Ed,'#ff7ab6'],['Rolling resistance',Er,'#ffb020'],['Climbing hills (m g Δz, paid back downhill)',Eup,'#b5e48c'],['Braking (heat in rotors)',Eb,'#ff4d4d'],['Kinetic energy left at the line',Math.max(0,Ew-Ed-Er-Eb),'#4ea1ff']];const tot=rows.reduce((a,r)=>a+r[1],0)||1;
  el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><h3>Where the wheel energy goes (lap A)</h3>${rows.map(r=>`<div class="stat"><span><span style="color:${r[2]}">■</span> ${r[0]}</span><span>${f1(r[1]/1000)} kJ (${f0(r[1]/tot*100)}%)</span></div><div class="bar"><i style="width:${r[1]/tot*100}%;background:${r[2]}"></i></div>`).join('')}
   <div class="stat" style="margin-top:10px"><span class="mut">Energy at the wheels</span><span>${f1(Ew/1000)} kJ</span></div><div class="stat"><span class="mut">${D.pw.ev?'Battery':'Fuel'} energy (÷ η = ${f2(D.eff)})</span><span>${f1(fuel/1000)} kJ = ${f2(fuel/3.6e6*1000)} Wh</span></div><div class="stat"><span class="mut">Engine waste heat (≈ fuel − wheel)</span><span>${f1((fuel-Ew)/1000)} kJ</span></div></div>
   <div class="small"><h3>Physics</h3><div class="phys">Drag work = Σ ½ρC<sub>D</sub>A v²·Δs<br>Rolling = C<sub>rr</sub>·m·g·Δs (C<sub>rr</sub> = 0.015)<br>Braking = kinetic energy removed ½m(v₁² − v₂²) beyond drag & rolling</div><p>Braking energy is the share an EV can partly recover with regen. Every kJ of drag costs you twice — once in fuel, once in top speed.</p></div></div>`;}
 /* ---- reliability ---- */
 function rel(el){const D=curD();const rows=Object.entries(D.relOf).map(([k,r])=>[k==='struct'?'Structures (fatigue/overload)':PARTS[k]?PARTS[k].label:k,1-r]);
  el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><h3>Endurance failure risk by system</h3>${rows.map(([l,p])=>`<div class="stat"><span>${l}</span><span>${f1(p*100)}%</span></div><div class="bar ${p<.02?'g':''}"><i style="width:${clamp(p*400,0,100)}%"></i></div>`).join('')}<div class="stat" style="margin-top:8px"><span><b>Total (incl. heat ×, QA ×)</b></span><span><b>${f1(D.failP*100)}%</b></span></div></div>
  <div><h3>Structural components</h3><table><tr><th>Part</th><th>Material</th><th>SF</th><th>Fatigue ratio</th><th>P(fail)</th></tr>${Object.entries(D.st.c).map(([k,c])=>`<tr><td>${COMPS[k].n}</td><td>${c.M.n}</td><td class="${c.sf<1.2?'dn':c.sf>2.2?'mut':'up'}">${f2(c.sf)}</td><td>${f2(c.FF)}</td><td>${f1(c.pf*100)}%</td></tr>`).join('')}</table>
  <h3 style="margin-top:12px">Thermal</h3><div class="stat"><span>Heat index</span><span style="color:${D.heatIdx>.9?'#ff6b63':'inherit'}">${f2(D.heatIdx)}</span></div>${D.ice?`<div class="stat"><span>Knock index</span><span>${f2(D.em.knock)}</span></div><div class="stat"><span>Valve float margin</span><span>${f0(D.em.nFloat-D.redline)} rpm</span></div>`:''}</div></div>`;}
 /* ---- career trends ---- */
 function career(el){const h=S.history;const evs=Object.keys(MAXP);el.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><h3>Points per event by season</h3><canvas id="ct1" width="640" height="300" style="width:100%;background:#0b1119;border-radius:8px"></canvas></div><div><h3>Car evolution</h3><table><tr><th>Season</th><th>Total</th><th>Place</th><th>Mass</th><th>kW</th><th>C<sub>L</sub>A</th><th>Autox</th></tr>${h.map(x=>`<tr><td>${x.season?'S'+x.season:'Legacy'}</td><td>${f0(x.total)}</td><td>P${x.place}</td><td>${x.car?f0(x.car.m):'—'}</td><td>${x.car?f1(x.car.kW):'—'}</td><td>${x.car?f2(x.car.ClA):'—'}</td><td>${x.autox?f2(x.autox):'—'}</td></tr>`).join('')}</table><p class="small mut">Insight points: <b>${S.insight||0}</b> · debriefs: ${S.debriefs||0} · sign-offs: ${(S.notebook||[]).filter(n=>n.type==='signoff').length}</p></div></div>`;
  const c=el.querySelector('#ct1'),g=c.getContext('2d'),W=c.width,H=c.height;const hs=h.filter(x=>x.scores);if(!hs.length){g.fillStyle='#8b97a8';g.fillText('Complete a season to see trends.',20,30);return;}
  const cols=['#e10600','#ffb020','#2ecc71','#4ea1ff','#a77bff','#19d3c5','#ff7ab6','#c9d3e0'];const X=i=>50+i/(Math.max(1,hs.length-1))*(W-80),Y=v=>H-30-v/275*(H-50);
  evs.forEach((k,j)=>{g.strokeStyle=cols[j];g.lineWidth=2;g.beginPath();hs.forEach((x,i)=>i?g.lineTo(X(i),Y(x.scores[k]||0)):g.moveTo(X(i),Y(x.scores[k]||0)));g.stroke();g.fillStyle=cols[j];g.fillText(EVN[k],W-70,20+j*14);});
  g.fillStyle='#5b6676';hs.forEach((x,i)=>g.fillText(x.season?'S'+x.season:'L',X(i)-6,H-10));}
 /* ---- lap-time breakdown vs last season ---- */
 function breakdown(el){const D=curD(),Di=derive(S.inherited,S.rd);const tr=TR.autox;const T=d=>simLap(d,tr,{v0:0,use:.965,standing:true}).time;
  const steps=[['Cornering grip (μ, balance, tires)',d=>{d.mu=D.mu;d.tight=D.tight;}],['Downforce (C<sub>L</sub>A) incl. its drag',d=>{d.ClA=D.ClA;d.CdA=D.CdA;}],['Power & top speed (kW, gearing)',d=>{d.kW=D.kW;d.vGear=D.vGear;d.vKnee=D.vKnee;d.gearV=D.gearV;d.gearR=D.gearR;}],['Mass',d=>{d.m=D.m;d.mEff=D.mEff;}],['Brakes',d=>{d.brake=D.brake;}],['Traction (rear load)',d=>{d.rear=D.rear;}]];
  let cur=Object.assign({},Di);let t0=T(cur);const base=t0;const rows=[];for(const[l,f]of steps){f(cur);const t=T(cur);rows.push([l,t-t0]);t0=t;}
  const dRel=(D.failP-Di.failP);rows.push([`Reliability (expected endurance points, ${dRel>0?'+':''}${f1(dRel*100)}% DNF risk)`,null,-dRel*250]);
  const mx=Math.max(...rows.filter(r=>r[1]!=null).map(r=>Math.abs(r[1])),.1);
  el.innerHTML=`<h3>Autocross lap-time waterfall: last season's car → yours (sim-driver, same driving)</h3><div class="stat"><span>Last season's car</span><span><b>${f2(base)} s</b></span></div>${rows.map(r=>r[1]!=null?`<div class="stat"><span>${r[0]}</span><span class="${r[1]<=0?'up':'dn'}">${r[1]>0?'+':''}${r[1].toFixed(2)} s</span></div><div class="bar ${r[1]<=0?'g':''}"><i style="width:${Math.abs(r[1])/mx*100}%"></i></div>`:`<div class="stat"><span>${r[0]}</span><span class="${r[2]>=0?'up':'dn'}">${r[2]>0?'+':''}${f1(r[2])} pts</span></div>`).join('')}<div class="stat"><span><b>Your car</b></span><span><b>${f2(t0)} s</b> (${t0-base>0?'+':''}${(t0-base).toFixed(2)})</span></div><p class="small mut">Each bucket swaps one group of derived properties from last season's car to yours, in order, and re-runs the lap sim. Order matters a little (interactions), as in any real lap-time attribution.</p>`;}
 function csv(L){const keys=['t',...TCH.map(c=>c.k)];let s='dist_m,'+keys.join(',')+'\n';for(let i=0;i<L.ch.v.length;i++)s+=i+','+keys.map(k=>L.ch[k]?L.ch[k][i]:'').join(',')+'\n';
  const b=new Blob([s],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`racetime_${L.track}_S${L.season}_${L.src}_${f2(L.time)}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast('CSV exported');}
 function jump(L,R,j){st.A=L;st.B=R;st.zone=[j.i0,j.i1];st.cursor=j.i0;st.tab=j.view==='gg'?'gg':'traces';if(!st.chs.includes(j.ch))st.chs=[...st.chs,j.ch];openOverlay();}
 function openOverlay(){let o=document.getElementById('anOv');if(!o){o=document.createElement('div');o.id='anOv';o.className='overlay';document.body.appendChild(o);}o.innerHTML='<div class="ovbox"><div class="row"><span class="sp"></span><button class="btn sm" id="anOvX">Close ✕</button></div><div id="anOvBody"></div></div>';o.querySelector('#anOvX').onclick=()=>o.remove();const b=o.querySelector('#anOvBody');const prev=$('#app');
  // render into overlay using the same functions
  ensure();b.innerHTML=`<div class="tabs">${TABS.slice(0,5).map(([k,l])=>`<button data-tab="${k}" class="${st.tab===k?'on':''}">${l}</button>`).join('')}</div><div class="card" id="ovBody" style="margin-top:8px"></div>`;b.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>{st.tab=x.dataset.tab;openOverlay();});body(b.querySelector('#ovBody'));}
 return{render,jump,st,refSim,drawDyno,drawGearChart,miniMap};
})();
