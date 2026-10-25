'use strict';
/* ================= COMPETITION ================= */
const STEPS=['static','accel','skid','autox','endu'];
const EV_TRK={accel:'accel',skid:'skid',autox:'autox',endu:'endu'};
let COMP=null;const COMP_LAPS={};
function computeComp(){
 const key=JSON.stringify([S.comp.seed,S.car,S.rd,S.pitch,S.season,S.comp.driven]);if(COMP&&COMP.key===key)return COMP;
 const rng=mulberry(S.comp.seed);const teams=[];
 syncAge();const D=derive(S.car,S.rd);const st=S.car.tune.style;const use=STYLES[st].use;
 const Di=derive(S.inherited,S.rd);
 const signed=S.challenges.filter(c=>c.status==='signed'&&c.signedSeason===S.season).length;
 const ds=designScore(D,Di,{oldPI:ctxPI(Di),newPI:perfIndex(D),signed});
 const me={me:1,name:'Your team',col:'#e10600',D,use,style:st,car:S.car};
 me.static={design:ds.score,cost:costScore(D,reusedCount()),business:businessScore(D,S.pitch,S.rep,reusedCount())};me.fb=ds.fb;
 // endurance pace calibrated from YOUR autocross driving (if you drove it)
 const dv=S.comp.driven||{};
 if(dv.autox&&dv.autox.t){const Tsim=simLap(D,TR.autox,{v0:0,use:.965,standing:true}).time;me.enduUse=clamp(.965*Math.pow(Tsim/dv.autox.t,1.5),.85,.99);}
 teams.push(me);
 const lvl=Math.min(3,S.season-1);
 RIVALS.forEach((R,i)=>{const car={parts:R.parts,tune:{...DEF_TUNE,...R.tune},age:{},aero:R.q>.85?{rwEl:3,rwAoA:13}:{}};const Dr=derive(car,{power:lvl,grip:lvl,light:Math.min(3,Math.floor(S.season/2))});
  const t={name:R.name,col:R.col,D:Dr,car,use:.945+R.q*.03+Math.min(.012,S.season*.003),style:'bal'};
  t.static={design:Math.round(clamp(55+R.q*85+(rng()-.5)*18+S.season*2,20,150)),cost:Math.round(clamp(costScore(Dr,3)+(rng()-.5)*14,10,100)),business:Math.round(clamp(28+R.q*38+(rng()-.5)*12,10,75))};teams.push(t);});
 for(const t of teams){const D=t.D;
  t.accR=simLap(D,TR.accel,{v0:0,use:t.use,standing:true,noBrakeEnd:true});t.times={accel:t.accR.time,skid:skidTime(D,t.use)};
  t.axR=simLap(D,TR.autox,{v0:0,use:t.use,standing:true});t.times.autox=t.axR.time;
  t.skR=simLap(D,TR.skid,{v0:12,use:t.use});
  const en=runStint(D,TR.endu,{laps:22,style:t.style,use:t.enduUse||t.use,rng:mulberry(S.comp.seed^hash(t.name)),failRolls:true,tireFail:true,keepArrays:t.me?true:2});
  t.endu=en;t.times.endu=en.dnf?Infinity:en.time;t.co2=en.energy*D.pw.co2;}
 // driven times override the sim-driver
 for(const ev of['accel','skid','autox']){const d=dv[ev];if(d){me.times[ev]=d.dnf?Infinity:d.t;me.drove=me.drove||{};me.drove[ev]=1;}}
 const fin=teams.filter(t=>isFinite(t.times.endu));
 for(const ev of ['accel','skid','autox','endu']){const Tmin=Math.min(...teams.map(t=>t.times[ev]));for(const t of teams)t.pts=t.pts||{},t.pts[ev]=scoreDyn(ev,t.times[ev],Tmin);}
 const Tm=Math.min(...fin.map(t=>t.times.endu)),Cm=Math.min(...fin.map(t=>t.co2));
 for(const t of fin)t.EF=(Tm/t.times.endu)*(Cm/t.co2);
 const efs=fin.map(t=>t.EF),emx=Math.max(...efs);
 for(const t of teams){t.pts.eff=isFinite(t.times.endu)?100*clamp((t.EF/emx-.25)/.75,0,1):0;Object.assign(t.pts,t.static);t.total=Object.values(t.pts).reduce((a,b)=>a+b,0);}
 COMP={key,teams,me};return COMP;}
function bestRival(C,ev){return C.teams.filter(t=>!t.me).sort((x,y)=>x.times[ev]-y.times[ev])[0];}
function evLap(C,ev){const me=C.me;if(COMP_LAPS[ev])return COMP_LAPS[ev];
 if(ev==='accel')return lapFromSim(me.D,'accel',me.accR,'sim-driver');if(ev==='skid')return lapFromSim(me.D,'skid',me.skR,'sim-driver');if(ev==='autox')return lapFromSim(me.D,'autox',me.axR,'sim-driver');
 const ls=me.endu.laps.filter(l=>l.r&&l.r.v);const l=ls[ls.length-1]||ls[0];return lapFromSim(me.D,'endu',l.r,'sim-driver',{tt:l.tireT,ct:l.coolT});}
function rComp(a){
 const D=curD();
 if(!S.comp||!S.comp.started){const insp=inspect(D);const ok=legal(D);
  a.innerHTML=`<h1>Competition — Season ${S.season}</h1><p class="sub">Once you enter, the car goes into parc fermé: no more changes until next season. You can drive Acceleration, Skidpad and Autocross yourself (best of 2 runs) or hand them to the sim-driver. After every event the Chief Engineer signs off on what happened.</p>
  <div class="grid g2"><div class="card"><h2>Tech inspection</h2><div class="insp">${insp.map(([c,t])=>`<div class="${c}">${c==='f'?'✖':c==='w'?'⚠':'✔'} ${t}</div>`).join('')}</div>
   ${ok?'':'<p class="dn">Fix the failures in the Garage before you can compete.</p><button class="btn" id="bg">← Back to garage</button>'}</div>
  <div class="card"><h2>Business presentation pitch</h2><p class="small mut">Pick the story your car tells best. The judges score how well the car fits the pitch.</p>
   ${Object.entries(PITCH).map(([k,p])=>`<label class="stat" style="cursor:pointer"><span><input type="radio" name="pitch" value="${k}" ${S.pitch===k?'checked':''}> <b>${p.l}</b> <span class="mut small">${p.d}</span></span></label>`).join('')}
   <div class="row" style="margin-top:14px"><span class="small mut">Sim-driver approach: <b>${STYLES[S.car.tune.style].l}</b> · Reliability ${f1(D.rel*100)}%</span><span class="sp"></span><button class="btn pri" id="start" ${ok?'':'disabled'}>Lock car & start competition 🏁</button></div></div></div>`;
  a.querySelectorAll('input[name=pitch]').forEach(r=>r.onchange=()=>{S.pitch=r.value;save();});
  const bg=$('#bg');if(bg)bg.onclick=()=>go('garage');
  const sb=$('#start');if(sb)sb.onclick=()=>{S.comp={started:true,step:0,seed:hash(S.legacyId+':'+S.season+':'+JSON.stringify(S.car)),revealed:-1,finished:false,driven:{},gates:{},preds:{}};for(const k in COMP_LAPS)delete COMP_LAPS[k];save();renderHeader();rComp(a);};
  return;}
 S.comp.driven=S.comp.driven||{};S.comp.gates=S.comp.gates||{};S.comp.preds=S.comp.preds||{};
 const C=computeComp();const step=S.comp.step;const rev=S.comp.revealed;
 const chips=STEPS.map((s,i)=>`<span class="ev ${i<=rev?'done':i===step?'cur':''}">${i<=rev?'✔ ':''}${s==='static'?'Static events':EVN[s]}${s==='endu'?' + Efficiency':''}${S.comp.gates[s]?' 🖋':''}</span>`).join('');
 a.innerHTML=`<div class="row" style="margin-bottom:8px"><h1>Competition — Season ${S.season}</h1><span class="sp"></span>${S.comp.finished&&S.comp.gates.endu?'<button class="btn pri" id="toRes">See results →</button>':''}</div>
 <div class="evlist">${chips}</div>
 <div class="card" id="evact" style="margin-bottom:14px"></div>
 <div class="race"><div class="card"><div id="vh"></div></div><div><div class="card"><h3>Live telemetry</h3><div id="th"></div></div><div class="card" style="margin-top:14px"><h3>Standings so far</h3><div id="stand"></div></div></div></div>
 <div class="card" style="margin-top:14px" id="evres"></div>`;
 VIEW=Viewer($('#vh'),$('#th'));
 const tr=$('#toRes');if(tr)tr.onclick=()=>go('results');
 standings(C);
 const ev=STEPS[step];const act=$('#evact');
 if(S.comp.finished&&S.comp.gates.endu){VIEW.idle('Competition complete — see results');evResults(C,'endu');act.innerHTML=`<div class="row"><b>All events complete and signed off.</b><span class="sp"></span><button class="btn pri" id="toRes2">See results →</button></div>`;$('#toRes2').onclick=()=>go('results');return;}
 if(rev>=step){evResults(C,ev);VIEW.idle(ev==='static'?'Static events judged':EVN[ev]+' complete');
  if(ev!=='static'&&!S.comp.gates[ev]){act.innerHTML=`<div class="row" style="gap:10px"><div class="ch-av">${CHIEF.av}</div><div><b>${CHIEF.name}:</b> “Before anyone touches the car again — walk me through ${EVN[ev]}. Claim, evidence, equation, fix, explanation.”</div><span class="sp"></span><button class="btn pri" id="gateGo">Begin sign-off</button></div><div id="gateHost" style="margin-top:12px"></div>`;
   $('#gateGo').onclick=()=>{$('#gateGo').disabled=true;if(typeof Crew!=='undefined')Crew.say('gate');const best=bestRival(C,ev);const L=evLap(C,ev);const Rl=ev==='autox'?lapFromSim(best.D,'autox',best.axR,best.name):null;
    const ctx={D:C.me.D,L,R:Rl||L,time:C.me.times[ev],Rtime:best.times[ev],endu:C.me.endu,base:C.me.times[ev]};
    runGate($('#gateHost'),gateSpec(ev,ctx),ctx,res=>{S.comp.gates[ev]=true;S.last.signoffs=S.last.signoffs||[];save();rComp(a);});};
   return;}
  act.innerHTML=`<div class="row"><span class="mut">${ev==='static'?'Static events judged.':EVN[ev]+' complete and signed off.'}</span><span class="sp"></span><button class="btn pri" id="run">${ev==='endu'?'Finish competition →':'Next event →'}</button></div>`;
  $('#run').onclick=()=>{if(ev==='endu'){go('results');return;}S.comp.step++;save();rComp(a);};return;}
 const drivable=['accel','skid','autox'].includes(ev);const simT=C.me.times[ev];
 const desc={static:'Design, Cost and Business judges are waiting.',accel:'75 m standing start. Best of 2 runs.',skid:'Skidpad: warm-up lap, then a timed lap of the circle.',autox:'One timed lap of the tight autocross, best of 2 runs. +2 s per cone, +20 s for a missed gate.',endu:'22 km endurance, driven by the sim-driver'+(C.me.enduUse?` at a pace calibrated from YOUR autocross (${f1(C.me.enduUse*100)}% of the grip limit)`:'')+'. Reliability rolls every lap.'}[ev];
 act.innerHTML=`<div class="row" style="flex-wrap:wrap;gap:10px"><div><h2 style="margin:0">${ev==='static'?'Static events':EVN[ev]}</h2><div class="small mut">${desc}</div></div><span class="sp"></span>
  ${ev!=='static'?`<label class="small">Predict your ${ev==='endu'?'endurance time (s)':'time (s)'} <input type="number" step="any" id="predT" style="width:90px" value="${S.comp.preds[ev]!=null?S.comp.preds[ev]:''}"></label>`:''}
  ${drivable?`<button class="btn pri" id="drv">🏎 Drive it (2 runs)</button><button class="btn" id="run">Sim-driver ▶</button>`:`<button class="btn pri" id="run">${ev==='static'?'Present to the judges ▶':'Run '+EVN[ev]+' ▶'}</button>`}</div>
  ${ev!=='static'?'<div class="small mut" style="margin-top:6px">A prediction within 2% earns +3 Insight (5%: +1). Use your test-day data and the physics.</div>':''}`;
 VIEW.idle(ev==='static'?'Static events':EVN[ev]);
 const takePred=()=>{const p=$('#predT');if(p&&p.value!==''&&isFinite(+p.value)){S.comp.preds[ev]=+p.value;save();}};
 const finish=()=>{S.comp.revealed=step;const C2=computeComp();const t=C2.me.times[ev];const msgs=[];
  if(S.comp.preds[ev]!=null&&isFinite(t)){const err=Math.abs(S.comp.preds[ev]-t)/t;const pts=err<=.02?3:err<=.05?1:0;S.insight=(S.insight||0)+pts;msgs.push(`Prediction ${f2(S.comp.preds[ev])} s vs actual ${f2(t)} s (${f1(err*100)}% off) → +${pts} Insight`);note({type:'prediction',title:`Pre-event prediction · ${EVN[ev]}`,text:msgs[msgs.length-1]});}
  if(isFinite(t))msgs.push(...checkPredictions(ev,t));
  if(ev==='endu'){S.comp.finished=true;const me=C2.me,D=me.D;
   if(!me.endu.dnf)msgs.push(...updateChallenges('endu22',{energy:me.endu.energy,F:me.endu.eW/(22*TR.endu.len),lastLap:{...me.endu.laps[me.endu.laps.length-1],F:me.endu.eW/(22*TR.endu.len),r:null}},D));
   msgs.push(...updateChallenges('comp',{safe:!me.endu.dnf&&D.sf>=1.5&&D.massCar<=(S.challenges.find(c=>c.key==='safety')||{aux:999}).aux},D));}
  msgs.forEach((m,i)=>setTimeout(()=>toast(m,4500),i*500));save();renderHeader();rComp(a);};
 const rb=$('#run');rb.onclick=()=>{takePred();rb.disabled=true;const d=$('#drv');if(d)d.disabled=true;window.scrollTo({top:0});const me=C.me;const best=bestRival(C,ev==='static'?'autox':ev);
  if(ev==='static'){finish();return;}
  delete S.comp.driven[ev];delete COMP_LAPS[ev];
  if(ev==='accel')VIEW.play({track:TR.accel,laps:[{r:me.accR}],ghost:{laps:[{r:best.accR}],col:best.col,name:best.name},title:'Acceleration (sim-driver)',onDone:finish});
  if(ev==='skid')VIEW.play({track:TR.skid,laps:[{r:me.skR}],title:'Skidpad (sim-driver)',onDone:finish});
  if(ev==='autox')VIEW.play({track:TR.autox,laps:[{r:me.axR}],ghost:{laps:[{r:best.axR}],col:best.col,name:best.name},title:'Autocross (sim-driver)',onDone:finish});
  if(ev==='endu'){const gl=best.endu.laps.filter(l=>l.r.v);const ghostLaps=[];for(let i=0;i<22;i++)ghostLaps.push(gl[Math.min(i,gl.length-1)]);
   VIEW.play({track:TR.endu,laps:me.endu.laps,accelAfter:1,ghost:{laps:ghostLaps,col:best.col,name:best.name},title:'Endurance',dnf:me.endu.dnf&&`${me.endu.dnf.why} (lap ${me.endu.dnf.lap})`,onDone:finish});}};
 const db=$('#drv');if(db)db.onclick=()=>{takePred();const trk=EV_TRK[ev];const best=bestRival(C,ev);const rl=ev!=='skid'?[{L:lapFromSim(best.D,trk,ev==='accel'?best.accR:best.axR,best.name),car:best.car,D:best.D,color:parseInt(best.col.slice(1),16),name:best.name}]:[];
  Drive.start({track:trk,D:C.me.D,car:S.car,title:`Competition · ${EVN[ev]}`,mode:'comp',runs:ev==='skid'?1:2,ghost:(S.ghosts||{})[trk]||null,refs:rl,warmTires:true,
   onExit:(bestRun,info)=>{if(bestRun){S.comp.driven[ev]={t:bestRun.time};COMP_LAPS[ev]=bestRun;finish();}else if(info&&info.failures&&info.failures.length){S.comp.driven[ev]={t:null,dnf:true};finish();}else{rComp(a);}}});};
}
function revealedEvents(){const r=S.comp.revealed;const evs=[];if(r>=0)evs.push('design','cost','business');for(let i=1;i<=r;i++){evs.push(STEPS[i]);if(STEPS[i]==='endu')evs.push('eff');}return evs;}
function standings(C){const evs=revealedEvents();const rows=C.teams.map(t=>({t,s:evs.reduce((a,e)=>a+t.pts[e],0)})).sort((a,b)=>b.s-a.s);
 $('#stand').innerHTML=`<table><tr><th>#</th><th>Team</th><th>Pts</th></tr>${rows.map((r,i)=>`<tr class="${r.t.me?'me':''}"><td>${i+1}</td><td style="text-align:left"><span style="color:${r.t.col}">●</span> ${r.t.name}</td><td>${f1(r.s)}</td></tr>`).join('')}</table>`;}
function evResults(C,ev){const el=$('#evres');
 if(ev==='static'){const me=C.me;const rows=[...C.teams].sort((a,b)=>(b.static.design+b.static.cost+b.static.business)-(a.static.design+a.static.cost+a.static.business));
  el.innerHTML=`<div class="grid g2"><div><h2>Static events</h2><table><tr><th>Team</th><th>Design /150</th><th>Cost /100</th><th>Business /75</th></tr>${rows.map(t=>`<tr class="${t.me?'me':''}"><td>${t.name}</td><td>${t.static.design}</td><td>${t.static.cost}</td><td>${t.static.business}</td></tr>`).join('')}</table></div><div><h2>Design judges' feedback</h2>${notesHTML(me.fb)}</div></div>`;return;}
 const tk=ev;const rows=[...C.teams].sort((a,b)=>a.times[tk]-b.times[tk]);
 el.innerHTML=`<h2>${EVN[ev]} results</h2><table><tr><th>Team</th><th>Time</th>${ev==='endu'?'<th>Energy</th><th>CO₂ kg</th><th>Efficiency pts</th><th>Note</th>':''}<th>Points</th></tr>${rows.map(t=>`<tr class="${t.me?'me':''}"><td><span style="color:${t.col}">●</span> ${t.name}${t.me&&t.drove&&t.drove[ev]?' <span class="pill r">DRIVEN</span>':''}</td><td>${isFinite(t.times[tk])?fmtT(t.times[tk]):'DNF'}</td>${ev==='endu'?`<td>${f2(t.endu.energy)} kWh</td><td>${f2(t.co2)}</td><td>${f1(t.pts.eff)}</td><td class="small" style="text-align:left">${t.endu.dnf?'<span class="dn">'+t.endu.dnf.why+' (lap '+t.endu.dnf.lap+')</span>':'wear '+f0(t.endu.wear*100)+'% · '+f0(t.endu.maxCool)+'°C'}</td>`:''}<td><b>${f1(t.pts[ev])}</b></td></tr>`).join('')}</table>`;}

/* ================= RESULTS ================= */
function rResults(a){const C=computeComp();const me=C.me;const D=me.D;
 const rows=[...C.teams].sort((x,y)=>y.total-x.total);const place=rows.indexOf(me)+1;
 const notes=diagnose(D,{dnf:me.endu.dnf?`${me.endu.dnf.why} on lap ${me.endu.dnf.lap}`:null,maxCool:me.endu.maxCool,wear:me.endu.wear});
 const L=S.last;const delta=me.total-L.total;const gated=!!S.comp.gates.season;
 a.innerHTML=`<div class="card hero" style="margin-bottom:14px"><div class="row" style="flex-wrap:wrap;gap:28px"><div><div class="pill r">SEASON ${S.season} · FINAL</div><h1 style="margin-top:8px">P${place} of ${rows.length} — ${f0(me.total)} points</h1><p class="sub" style="margin:0">${delta>=0?`<span class="up">▲ ${f0(delta)} points better</span>`:`<span class="dn">▼ ${f0(-delta)} points worse</span>`} than the team you inherited from (${f0(L.total)}, P${L.place}).</p></div><span class="sp"></span>${gated?`<button class="btn pri" id="next">Save car & begin Season ${S.season+1} →</button>`:'<button class="btn pri" id="sgo">Season sign-off with the Chief (required)</button>'}</div><div id="sgHost" style="margin-top:12px"></div></div>
 <div class="grid g2"><div class="card"><h2>Final standings</h2><table><tr><th>#</th><th>Team</th>${Object.keys(MAXP).map(k=>`<th>${EVN[k].slice(0,5)}</th>`).join('')}<th>Total</th></tr>${rows.map((t,i)=>`<tr class="${t.me?'me':''}"><td>${i+1}</td><td style="text-align:left;white-space:nowrap"><span style="color:${t.col}">●</span> ${t.name}</td>${Object.keys(MAXP).map(k=>`<td>${f0(t.pts[k])}</td>`).join('')}<td><b>${f0(t.total)}</b></td></tr>`).join('')}</table></div>
 <div class="card"><h2>You vs. last season</h2>${scoreBars(Object.fromEntries(Object.keys(MAXP).map(k=>[k,me.pts[k]])),L.scores)}</div>
 <div class="card"><h2>Notes for the next team (auto-generated)</h2>${notesHTML(notes)}<h3 style="margin-top:12px">Your personal handoff note</h3><textarea id="unote" rows="3" style="width:100%" placeholder="What should the next team know?">${esc(S.userNote||'')}</textarea></div>
 <div class="card"><h2>Engineering challenges</h2>${S.challenges.map(c=>{const T=CH[c.key];const s=c.status;const carry=s==='open'&&c.left>1;return`<div class="stat"><span>${T.title(c)}</span><span>${s==='signed'?'<span class="pill g">SIGNED OFF</span>':s==='claimed'?'<span class="pill g">CLAIMED</span>':s==='passed'?'<span class="pill a">passed — 50% auto-claimed at handoff</span>':carry?'<span class="pill p">carries to next team</span>':'<span class="pill r">FAILED (−1 rep)</span>'}</span></div>`}).join('')}
  <p class="small mut">Reputation after this season: ${S.rep} → ${S.rep+repGain(place)} (affects next budget: ${money(15000+(S.rep+repGain(place))*250)} base).</p></div></div>`;
 $('#unote').oninput=e=>{S.userNote=e.target.value;save();};
 const nb=$('#next');if(nb)nb.onclick=()=>beginNext(C,place,notes);
 const sg=$('#sgo');if(sg)sg.onclick=()=>{sg.disabled=true;const top=rows[0]===me?rows[1]:rows[0];const ctx={D,me,top,place,autoxT:me.times.autox,autoxMin:Math.min(...C.teams.map(t=>t.times.autox)),base:me.total};
  runGate($('#sgHost'),gateSpec('season',ctx),ctx,()=>{S.comp.gates.season=true;checkPredictions('season',me.total);save();rResults(a);});};}
function repGain(place){return Math.max(-1,6-place);}
function beginNext(C,place,notes){const me=C.me;
 const scores=Object.fromEntries(Object.keys(MAXP).map(k=>[k,Math.round(me.pts[k]*10)/10]));
 let rep=S.rep+repGain(place);const carried=[];const failed=[];
 for(const c of S.challenges){if(c.status==='passed'){reward(c,.5);c.status='claimed';}
  if(c.status==='open'){if(c.left>1){const n=deep(c);n.left--;n.inherited=true;carried.push(n);}else{failed.push(c);rep-=1;}}}
 for(const f of failed)notes.push(['bad',`Failed challenge: ${CH[f.key].title(f)}.`]);
 for(const c of carried)notes.push(['info',`Unfinished program handed to you: ${CH[c.key].title(c)} (${c.left} season left).`]);
 S.history.push({season:S.season,total:me.total,place,scores,team:'You',car:{m:me.D.massCar,kW:me.D.kW,ClA:me.D.ClA},autox:isFinite(me.times.autox)?me.times.autox:null});
 const signoffs=(S.notebook||[]).filter(n=>n.type==='signoff'&&n.season===S.season).map(n=>({title:n.title,steps:n.steps,text:n.text}));
 S.last={season:S.season,scores,total:me.total,place,of:C.teams.length,dnf:me.endu.dnf?`${me.endu.dnf.why} on lap ${me.endu.dnf.lap} of endurance`:null,fb:me.fb.filter(x=>x[0]!=='ok').slice(0,5).concat(me.fb.filter(x=>x[0]==='ok').slice(0,2)),notes,userNote:S.userNote||'',signoffs};
 syncAge();const age={};for(const c of CATS)age[c]=(S.car.age[c]||0)+1;
 S.inherited={parts:deep(S.car.parts),tune:deep(S.car.tune),eng:deep(S.car.eng||{}),aero:deep(S.car.aero||{}),sus:deep(S.car.sus||{}),mat:deep(S.car.mat||{}),age};
 // this season's best laps become next season's ghosts
 S.ghosts=Object.assign({},S.ghosts||{},S.laps||{});S.laps={};
 S.car=deep(S.inherited);S.rebuilt={};S.bonusCash=0;S.comp=null;S.userNote='';S.rep=Math.max(0,rep);S.tech+=2;
 S.season++;S.challenges=genChallenges(S.season,carried,S.car);S.screen='handoff';COMP=null;for(const k in COMP_LAPS)delete COMP_LAPS[k];save();go('handoff');toast(`Season ${S.season} begins. The car is now someone else's problem — yours.`);}
