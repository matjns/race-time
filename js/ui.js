'use strict';
/* ================= UI CORE ================= */
const SCREENS=[['handoff','Handoff'],['garage','Garage'],['test','Test Day'],['comp','Competition'],['results','Results'],['analytics','Analytics'],['notebook','Chief & Notebook']];
let VIEW=null;
function go(s){if(VIEW&&VIEW.stop)VIEW.stop();VIEW=null;if(Garage3D.active)Garage3D.unmount();S.screen=s;save();render();window.scrollTo(0,0);}
function toast(m,ms=3200){const d=document.createElement('div');d.className='toast';d.innerHTML=m;document.body.appendChild(d);setTimeout(()=>d.remove(),ms);}
function curD(){syncAge();S.rd=rdFromTree(S.tree);return derive(S.car,S.rd);}
function renderHeader(){
 const locked=S.comp&&S.comp.started;const done=S.comp&&S.comp.finished;
 $('#nav').innerHTML=SCREENS.map(([k,l],i)=>{const dis=(k==='results'&&!done)||((k==='garage'||k==='test')&&locked);return`<button data-s="${k}" class="${S.screen===k?'on':''}" ${dis?'disabled':''}>${i<5?(i+1)+' · ':''}${l}</button>`}).join('');
 $('#nav').querySelectorAll('button').forEach(b=>b.onclick=()=>go(b.dataset.s));
 const rem=budget()-spent();
 $('#hstat').innerHTML=`<button class="modebtn" id="modeB" title="Switch between Career and Sandbox (separate saves)">${S.mode==='sandbox'?'🧪 SANDBOX':'🏆 CAREER'}</button><div>Season<b>${S.season}</b></div><div>Budget left<b style="color:${rem<0?'#ff6b63':'#5ee08f'}">${S.mode==='sandbox'?'∞':money(rem)}</b></div><div>Rep<b>${S.rep}</b></div><div>Tech<b>${S.tech}</b></div><div>Insight<b style="color:#c39bff">${S.insight||0}</b></div><button class="kbbtn" id="keysB" title="Key bindings">⌨ Controls</button>`;
 $('#keysB').onclick=()=>Keys.open();
 $('#modeB').onclick=()=>confirmBox(S.mode==='sandbox'?'Back to Career?':'Open Sandbox?',S.mode==='sandbox'?'Your career save is untouched and will resume where you left it.':'Sandbox: unlimited budget, the whole tech tree unlocked, separate save. Your career is kept safe.',()=>{if(Drive.active)Drive.exit();switchMode(S.mode==='sandbox'?'career':'sandbox');COMP=null;render();toast(S.mode==='sandbox'?'Sandbox mode — build anything.':'Career resumed.');});
 document.querySelectorAll('#unitT button').forEach(b=>{b.className=S.units===b.dataset.u?'on':'';b.onclick=()=>{S.units=b.dataset.u;save();render();}});
}
function render(){if(Garage3D.active&&S.screen!=='garage')Garage3D.unmount();renderHeader();const a=$('#app');({handoff:rHandoff,garage:rGarage,test:rTest,comp:rComp,results:rResults,analytics:Analytics.render,notebook:rNotebook})[S.screen](a);}
function notesHTML(n){return`<ul class="notes">${n.map(([c,t])=>`<li class="${c==='bad'?'bad':c==='ok'?'ok':c==='info'?'info':''}">${t}</li>`).join('')}</ul>`;}
function scoreBars(sc,prev){return`<table><tr><th>Event</th><th>Points</th><th>Max</th>${prev?'<th>Δ vs last</th>':''}<th style="width:32%"></th></tr>${Object.keys(MAXP).map(k=>{const v=sc[k]||0;const d=prev?v-(prev[k]||0):0;return`<tr><td>${EVN[k]}</td><td>${f1(v)}</td><td class="mut">${MAXP[k]}</td>${prev?`<td class="${d>0.05?'up':d<-.05?'dn':'mut'}">${d>0.05?'▲ +'+f1(d):d<-.05?'▼ '+f1(d):'—'}</td>`:''}<td><div class="bar ${v/MAXP[k]>.6?'g':''}"><i style="width:${v/MAXP[k]*100}%"></i></div></td></tr>`}).join('')}<tr><td><b>Total</b></td><td><b>${f1(Object.values(sc).reduce((a,b)=>a+b,0))}</b></td><td class="mut">1000</td>${prev?'<td></td>':''}<td></td></tr></table>`;}
function histChart(){const h=S.history;const mx=Math.max(1000*.7,...h.map(x=>x.total));return`<svg viewBox="0 0 ${Math.max(6,h.length)*60} 120" style="width:100%;height:130px">${h.map((x,i)=>{const H=x.total/mx*90;return`<g><rect x="${i*60+12}" y="${100-H}" width="36" height="${H}" rx="5" fill="${i===h.length-1?'#e10600':'#2b3a52'}"/><text x="${i*60+30}" y="${96-H}" fill="#e6ebf2" font-size="12" text-anchor="middle" font-weight="700">${f0(x.total)}</text><text x="${i*60+30}" y="116" fill="#8b97a8" font-size="11" text-anchor="middle">${x.season===0?'Legacy':'S'+x.season}</text></g>`}).join('')}</svg>`;}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function confirmBox(t,m,ok){$('#modal').innerHTML=`<div class="modal"><div class="box"><h2>${t}</h2><p class="mut">${m}</p><div class="row"><span class="sp"></span><button class="btn" id="mc">Cancel</button><button class="btn pri" id="mo">Confirm</button></div></div></div>`;$('#mc').onclick=()=>$('#modal').innerHTML='';$('#mo').onclick=()=>{$('#modal').innerHTML='';ok();};}

/* ================= HANDOFF ================= */
function rHandoff(a){
 const L=S.last;const car=S.inherited;const D=derive(car,S.rd);
 const inh=S.challenges.filter(c=>c.inherited),fresh=S.challenges.filter(c=>!c.inherited);
 const so=L.signoffs||[];const pend=(S.predictions||[]).filter(p=>p.season===S.season-1&&!p.checked);
 a.innerHTML=`
 <div class="card hero" style="margin-bottom:14px"><div class="row" style="align-items:flex-start;gap:24px;flex-wrap:wrap">
  <div style="flex:1;min-width:300px"><div class="pill r">${S.mode==='sandbox'?'SANDBOX · ':''}SEASON ${S.season} · HANDOFF</div>
   <h1 style="margin-top:8px">${S.season===1?'You\'ve inherited the Legacy Team car.':`You've inherited Season ${S.season-1}'s car.`}</h1>
   <p class="sub">The outgoing team graduated. Their car, their notes, their ghost laps and their unfinished promises are now yours. Make it better.</p>
   <div class="row" style="gap:28px">
    <div class="kpi"><small>Last season total</small><span class="big">${f0(L.total)}</span></div>
    <div class="kpi"><small>Finish</small><span class="big">P${L.place}<span class="mut" style="font-size:16px">/${L.of}</span></span></div>
    <div class="kpi"><small>Budget this season</small><span class="big">${S.mode==='sandbox'?'∞':money(budget())}</span></div>
   </div>
   <div class="row" style="margin-top:16px"><button class="btn pri" id="goG">Enter the garage →</button><button class="btn" id="goD">🏎 Quick drive (autocross)</button><button class="btn ghost" id="reset">Start fresh legacy</button></div>
  </div>
  <div style="width:420px;max-width:100%"><h3>Legacy history — total points</h3>${histChart()}</div>
 </div></div>
 <div class="grid g3">
  <div class="card"><h2>Inherited car</h2><div id="h3d" style="height:190px;margin-bottom:8px"></div>${CATS.map(c=>{const p=part(c,car.parts[c]);const ag=car.age[c]||0;return`<div class="stat"><span class="mut">${PARTS[c].label}</span><span style="text-align:right">${p.name} ${c!=='aero'&&ag?`<span class="pill ${ag>=2?'r':'a'}">${ag} season${ag>1?'s':''} old</span>`:''}</span></div>`}).join('')}
   <div class="stat"><span class="mut">Mass (no driver)</span><span>${f0(D.massCar)} kg</span></div><div class="stat"><span class="mut">Reliability (endurance)</span><span>${f0(D.rel*100)}%</span></div><div class="stat"><span class="mut">Lateral grip @15 m/s</span><span>${f2(D.latG)} g</span></div></div>
  <div class="card"><h2>Last season — event scores</h2>${scoreBars(L.scores)}${L.dnf?`<div class="insp"><div class="f">⚠ ${L.dnf}</div></div>`:''}</div>
  <div class="card"><h2>Judges' feedback</h2>${notesHTML(L.fb.length?L.fb:[['info','No design feedback recorded.']])}</div>
  <div class="card" style="grid-column:span 2"><h2>Outgoing team's handoff notes</h2>${notesHTML(L.notes)}${L.userNote?`<div class="hintbox" style="margin-top:8px">📝 “${esc(L.userNote)}”</div>`:''}
   ${so.length?`<h3 style="margin-top:12px">Chief Engineer sign-offs (${so.length})</h3>${so.map(s=>`<div class="nb signoff"><b>${s.title}</b><div class="small mut">${(s.steps||[]).join(' · ')}</div>${s.text?`<div class="small" style="margin-top:4px">“${esc(s.text)}”</div>`:''}</div>`).join('')}`:''}
   ${pend.length?`<h3 style="margin-top:12px">Predictions to verify this season</h3>${pend.map(p=>`<div class="nb prediction"><b>${EVN[p.ev]||'Season'}</b>: “${p.fix}” → predicted ${p.pred>0?'+':''}${p.pred} ${p.kind==='points'?'pts':'s'} <span class="mut small">(checked automatically when the event runs)</span></div>`).join('')}`:''}
   ${Object.keys(S.ghosts||{}).length?`<div class="small mut" style="margin-top:8px">👻 Ghost laps inherited: ${Object.entries(S.ghosts).map(([k,L])=>`${TR[k].name} ${fmtT(L.time)}`).join(' · ')}</div>`:''}</div>
  <div class="card"><h2>This season's engineering challenges</h2>
   ${inh.length?`<div class="small mut" style="margin-bottom:6px">Inherited (unfinished multi-season programs):</div>`+inh.map(c=>`<div class="stat"><span>📜 ${CH[c.key].title(c)}</span><span class="pill a">${c.left} season left</span></div>`).join(''):''}
   ${fresh.map(c=>`<div class="stat"><span>${CH[c.key].title(c)}</span><span class="pill ${c.seasons>1?'p':'b'}">${c.seasons>1?c.seasons+'-season program':'this season'}</span></div>`).join('')}
   <div class="small mut" style="margin-top:8px">Hit the targets on Test Day, then sign off your math for full rewards.</div></div>
  <div class="card" style="grid-column:span 3"><h2>Season history</h2><table><tr><th>Season</th><th>Team</th><th>Accel</th><th>Skid</th><th>Autox</th><th>Endu</th><th>Eff</th><th>Static</th><th>Total</th><th>Place</th></tr>
   ${S.history.map(h=>`<tr><td>${h.season===0?'Legacy':'Season '+h.season}</td><td>${h.team||'You'}</td>${h.scores?['accel','skid','autox','endu','eff'].map(k=>`<td>${f0(h.scores[k])}</td>`).join('')+`<td>${f0(h.scores.design+h.scores.cost+h.scores.business)}</td>`:'<td colspan=6 class="mut">—</td>'}<td><b>${f0(h.total)}</b></td><td>P${h.place}</td></tr>`).join('')}</table></div>
 </div>`;
 $('#goG').onclick=()=>go('garage');
 $('#goD').onclick=()=>{go('test');setTimeout(()=>startDrive('autox'),50);};
 $('#reset').onclick=()=>confirmBox('Start a fresh legacy?','This wipes every season, the inherited car and history in this mode, and starts again from the original Legacy Team car.',()=>{localStorage.removeItem(storeKey());const m=S.mode;newLegacy(m);go('handoff');});
 Garage3D.mount($('#h3d'));Garage3D.update(car,D);
}

/* ================= GARAGE ================= */
let gCat='chassis',gTab='parts';
const GTABS=[['parts','Parts'],['setup','Setup'],['engine','Engine'],['aero','Aero'],['struct','Structures'],['susp','Suspension'],['tree','Tech tree']];
function rGarage(a){
 const D=curD();const Di=derive(S.inherited,S.rd);
 a.innerHTML=`<div class="row" style="margin-bottom:12px"><div><h1>Garage & Design</h1><div class="sub" style="margin:0">Inherited parts are free to keep (but age). New parts and materials cost money. Tuning is free. Press <b>?</b> on anything for the physics.</div></div><span class="sp"></span><button class="btn" id="toTest">Test Day →</button><button class="btn pri" id="toComp">Enter competition →</button></div>
 <div style="display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:14px">
  <div><div class="tabs" id="gtabs">${GTABS.map(([k,l])=>`<button data-gt="${k}" class="${gTab===k?'on':''}">${l}</button>`).join('')}</div><div class="card" id="gbody" style="margin-top:8px"></div></div>
  <div><div class="card" style="padding:8px"><div id="g3d"></div><div class="small mut" style="padding:4px 4px 0">Drag to rotate · scroll to zoom · changed parts drop in</div></div>
   <div class="card" style="margin-top:12px"><h3>Crew</h3><div id="crewP"></div></div>
   <div class="card statcol" id="stats" style="margin-top:12px"></div></div>
 </div>`;
 a.querySelectorAll('[data-gt]').forEach(b=>b.onclick=()=>{gTab=b.dataset.gt;a.querySelectorAll('[data-gt]').forEach(x=>x.classList.toggle('on',x===b));gBody(Di);});
 $('#toTest').onclick=()=>go('test');$('#toComp').onclick=()=>go('comp');
 Garage3D.mount($('#g3d'));Garage3D.update(S.car,D);
 gBody(Di);updStats(Di);}
let _g3t=0,_chT=0;
function carChanged(Di,full){save();updStats(Di);clearTimeout(_g3t);_g3t=setTimeout(()=>{Garage3D.update(S.car,curD());},280);clearTimeout(_chT);_chT=setTimeout(()=>liveCharts(),90);if(full)gBody(Di);}
function sl(o){// o: g,k,c,l,v,min,max,st,u,why,dis,was
 return`<div class="sl" style="${o.dis?'opacity:.4':''}"><div class="lab"><span>${o.l}${o.why||''}${o.was!=null&&Math.abs(o.was-o.v)>1e-9?` <span class="mut small">(was ${o.was})</span>`:''}</span><b>${o.v}${o.u?' '+o.u:''}</b></div><input type="range" data-g="${o.g}" data-k="${o.k}" ${o.c?`data-c="${o.c}"`:''} min="${o.min}" max="${o.max}" step="${o.st}" value="${o.v}" ${o.dis?'disabled':''}>${o.h||o.dis?`<div class="hint">${o.dis||o.h}</div>`:''}</div>`;}
function setParam(g,k,c,v){const car=S.car;
 if(g==='tune')car.tune[k]=v;
 if(g==='eng'){car.eng=car.eng||{};const id=car.parts.power;car.eng[id]=Object.assign({},carEng(car),{[k]:v});}
 if(g==='aero')car.aero=Object.assign({},carAero(car),{[k]:v});
 if(g==='sus')car.sus=Object.assign({},carSus(car),{[k]:v});
 if(g==='mat'){car.mat=carMat(car);car.mat[c][k]=v;}}
function bindSliders(root,Di){root.querySelectorAll('input[type=range]').forEach(r=>r.oninput=()=>{const v=+r.value;setParam(r.dataset.g,r.dataset.k,r.dataset.c,v);const b=r.parentElement.querySelector('.lab b');const u=b.textContent.split(' ').slice(1).join(' ');b.textContent=v+(u?' '+u:'');carChanged(Di);});bindWhy(root);}
function gBody(Di){const el=$('#gbody');if(!el)return;const D=curD();
 if(gTab==='parts'){const cur=part(gCat,S.car.parts[gCat]);
  el.innerHTML=`<div class="cats">${CATS.map(c=>`<button data-c="${c}" class="${c===gCat?'on':''}">${PARTS[c].label}${S.car.parts[c]!==S.inherited.parts[c]||S.rebuilt[c]?'<span class="dot"></span>':''}</button>`).join('')}</div>
   <div class="opts">${PARTS[gCat].items.map(p=>optCard(gCat,p,cur)).join('')}</div>
   ${S.car.parts[gCat]===S.inherited.parts[gCat]&&gCat!=='aero'&&(S.inherited.age[gCat]||0)>0?`<div class="row" style="margin-top:10px"><span class="small mut">Inherited ${PARTS[gCat].label.toLowerCase()} is ${S.inherited.age[gCat]} season(s) old (−${(S.inherited.age[gCat]*(gCat==='tires'?3:2))}% ${gCat==='tires'?'grip':'reliability'}).</span><span class="sp"></span><button class="btn sm" id="rebuild">${S.rebuilt[gCat]?'Undo rebuild':'Rebuild for '+money(cur.cost*.35)}</button></div>`:''}`;
  el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{gCat=b.dataset.c;gBody(Di);});
  el.querySelectorAll('.opt').forEach(o=>o.onclick=()=>{S.car.parts[o.dataset.cat]=o.dataset.id;if(o.dataset.id!==S.inherited.parts[o.dataset.cat])delete S.rebuilt[o.dataset.cat];renderHeader();carChanged(Di,true);});
  const rb=$('#rebuild');if(rb)rb.onclick=()=>{S.rebuilt[gCat]=!S.rebuilt[gCat];renderHeader();carChanged(Di,true);};return;}
 if(gTab==='setup'){el.innerHTML=`<div class="grid g2"><div>${TUNE.map(t=>{let dis='';if(t.ice&&!D.ice)dis='Not applicable to EV';const v=S.car.tune[t.k];return sl({g:'tune',k:t.k,l:t.l,v,min:t.min,max:t.max,st:t.st,u:t.u,why:whyBtn('tune',t.k),dis,was:S.inherited.tune[t.k],h:t.h});}).join('')}</div>
   <div><div class="sl"><div class="lab"><span>Sim-driver approach</span></div><select id="style" style="width:100%">${Object.entries(STYLES).map(([k,s])=>`<option value="${k}" ${S.car.tune.style===k?'selected':''}>${s.l} — ${f1(s.use*100)}% of grip limit</option>`).join('')}</select><div class="hint">Used by the sim-driver (endurance, AI laps). Aggressive is faster but wears tires and raises failure risk.</div></div>
   <button class="btn sm ghost" id="revert">Revert all tuning to inherited</button>
   <h3 style="margin-top:14px">Gear-speed traction chart</h3><canvas id="lcGear" width="640" height="300" style="width:100%;background:#0b1119;border-radius:8px"></canvas><div class="small mut">Colored: tractive force in each gear. Green dashed: what the rear tires can transmit. Where a gear curve is above the green line you have wheelspin — wasted power.</div></div></div>`;
  bindSliders(el,Di);$('#style').onchange=e=>{S.car.tune.style=e.target.value;carChanged(Di);};
  $('#revert').onclick=()=>{S.car.tune=deep(S.inherited.tune);S.car.eng=deep(S.inherited.eng||{});S.car.aero=deep(S.inherited.aero||{});S.car.sus=deep(S.inherited.sus||{});carChanged(Di,true);};liveCharts();return;}
 if(gTab==='engine'){if(!D.ice){el.innerHTML=`<h2>Electric powertrain</h2><p class="mut">The EV has no intake, cam or combustion to tune: constant torque to base speed (4000 rpm), constant power above. Single reduction gear. Tune the final drive in Setup.</p><canvas id="lcDyno" width="900" height="340" style="width:100%;background:#0b1119;border-radius:8px"></canvas>`;liveCharts();return;}
  const e=carEng(S.car),ie=carEng(S.inherited);const grp=[['Cam timing',['ivo','ivc','evo','evc','lift']],['Combustion',['cr','ign','afr']],['Intake (20 mm restrictor downstream)',['plenum','runnerD']],['Exhaust',['exhL','exhD']],['Limits',['redline']]];
  el.innerHTML=`<div style="display:grid;grid-template-columns:330px 1fr;gap:14px"><div>${grp.map(([t,ks])=>`<h3>${t}</h3>`+ks.map(k=>{const R=ENG_RANGE[k];return sl({g:'eng',k,l:ENG_LAB[k],v:e[k],min:R[0],max:R[1],st:R[2],u:R[3],why:whyBtn('eng',k),was:S.car.parts.power===S.inherited.parts.power?ie[k]:null});}).join('')).join('')}
   ${sl({g:'tune',k:'runner',l:'Intake runner length',v:S.car.tune.runner,min:200,max:450,st:5,u:'mm',why:whyBtn('tune','runner')})}</div>
   <div><h3>Live dyno</h3><canvas id="lcDyno" width="900" height="360" style="width:100%;background:#0b1119;border-radius:8px"></canvas><div id="engTxt" class="small" style="margin-top:6px"></div>
   <h3 style="margin-top:12px">Gear-speed traction chart</h3><canvas id="lcGear" width="900" height="300" style="width:100%;background:#0b1119;border-radius:8px"></canvas></div></div>`;
  bindSliders(el,Di);liveCharts();return;}
 if(gTab==='aero'){const ae=carAero(S.car),ia=carAero(S.inherited);const wing=S.car.parts.aero==='wing';
  el.innerHTML=`<div style="display:grid;grid-template-columns:330px 1fr;gap:14px"><div>${wing?Object.keys(AERO_RANGE).map(k=>{const R=AERO_RANGE[k];const max=k.endsWith('El')&&!S.rd.el3?2:R[1];return sl({g:'aero',k,l:AERO_LAB[k],v:Math.min(ae[k],max),min:R[0],max,st:R[2],u:R[3],why:whyBtn('aero',k),was:ia[k],h:k.endsWith('El')&&!S.rd.el3?'3-element wings need the tech-tree tooling.':''});}).join(''):`<p class="mut">Fit the <b>wing package</b> (Parts → Aero) to tune wings. ${S.car.parts.aero==='tray'?'Undertray only: ride height still matters.':''}</p>`}
   ${sl({g:'tune',k:'rh',l:'Static ride height',v:S.car.tune.rh,min:15,max:60,st:1,u:'mm',why:whyBtn('tune','rh')})}
   <div id="aeroTxt" class="small"></div></div>
   <div><h3>Aero map</h3><canvas id="lcAero" width="900" height="300" style="width:100%;background:#0b1119;border-radius:8px"></canvas><div class="small mut">Rear wing C<sub>L</sub> vs angle of attack for 1–3 elements (yours highlighted). Past the stall angle, lift collapses.</div>
   <h3 style="margin-top:12px">Ride height sensitivity & balance</h3><canvas id="lcRH" width="900" height="240" style="width:100%;background:#0b1119;border-radius:8px"></canvas></div></div>`;
  bindSliders(el,Di);liveCharts();return;}
 if(gTab==='struct'){const m=carMat(S.car),im=carMat(S.inherited);
  el.innerHTML=`<p class="small mut">Each component is sized from the load cases (1.4 g cornering + 1.6 g braking, aero at 28 m/s, bump factor 1.3). Changing a material or size from the inherited spec costs fabrication money.</p><div class="grid g2">${Object.keys(COMPS).map(k=>{const C=COMPS[k],d=m[k],c=D.st.c[k];return`<div class="card" style="background:var(--card2)"><div class="row"><h3 style="margin:0">${C.n}</h3>${whyBtn('mat','m',k)}<span class="sp"></span><span class="pill ${c.sf<1.2?'r':c.sf>2.4?'a':'g'}">SF ${f2(c.sf)}</span></div>
   <select data-mat="${k}" style="width:100%;margin:8px 0">${C.mats.map(id=>{const M=MATS[id];const ok=!M.req||S.rd[M.req];return`<option value="${id}" ${d.m===id?'selected':''} ${ok?'':'disabled'}>${M.n}${ok?'':' — needs tech tree'} · E ${M.E} GPa · σy ${M.sy} MPa · ρ ${M.rho}</option>`;}).join('')}</select>
   ${Object.entries(C.dims).map(([dk,R])=>sl({g:'mat',k:dk,c:k,l:{od:'Outer diameter',wall:'Wall thickness',t:'Plate thickness'}[dk],v:d[dk],min:R[0],max:R[1],st:R[2],u:'mm',was:im[k][dk]})).join('')}
   <div class="small">σ ${f0(c.sig)} MPa · mass ${f2(c.mass)} kg · fatigue ${f2(c.FF)} · P(fail) ${f1(c.pf*100)}% · ${money(c.cost)}</div></div>`;}).join('')}</div>`;
  el.querySelectorAll('[data-mat]').forEach(s=>s.onchange=()=>{setParam('mat','m',s.dataset.mat,s.value);renderHeader();carChanged(Di,true);});
  bindSliders(el,Di);el.querySelectorAll('input[data-g=mat]').forEach(r=>r.addEventListener('change',()=>{renderHeader();gBody(Di);}));return;}
 if(gTab==='susp'){const s=carSus(S.car),is=carSus(S.inherited);
  el.innerHTML=`<div style="display:grid;grid-template-columns:330px 1fr;gap:14px"><div>${Object.keys(SUS_RANGE).map(k=>{const R=SUS_RANGE[k];return sl({g:'sus',k,l:SUS_LAB[k],v:s[k],min:R[0],max:R[1],st:R[2],u:R[3],why:whyBtn('sus',k),was:is[k]});}).join('')}
   ${sl({g:'tune',k:'arb',l:'Anti-roll bar balance',v:S.car.tune.arb,min:-10,max:10,st:1,u:'',why:whyBtn('tune','arb')})}${sl({g:'tune',k:'camber',l:'Static camber',v:S.car.tune.camber,min:-3.5,max:0,st:.1,u:'°',why:whyBtn('tune','camber')})}</div>
   <div><h3>Ride frequency</h3><canvas id="lcSus" width="900" height="300" style="width:100%;background:#0b1119;border-radius:8px"></canvas><div id="susTxt" class="small" style="margin-top:6px"></div></div></div>`;
  bindSliders(el,Di);liveCharts();return;}
 if(gTab==='tree'){const br=[...new Set(TREE.map(n=>n.br))];
  el.innerHTML=`<p class="small mut">Permanent capabilities the whole legacy inherits. Earn tech points from challenges and seasons. ${S.mode==='sandbox'?'<b>Sandbox: everything unlocked.</b>':''}</p><div class="tree">${br.map(b=>`<div><h3>${b}</h3>${TREE.filter(n=>n.br===b).map(n=>{const own=S.tree.includes(n.id);const can=!own&&(n.req||[]).every(r=>S.tree.includes(r));return`<div class="tnode ${own?'own':can?'':'lock'}" style="margin-bottom:8px"><b>${n.n}</b><div class="mut">${n.e}</div><div class="row" style="margin-top:6px"><span class="mut">T${n.tier}</span><span class="sp"></span>${own?'<span class="pill g">✔</span>':`<button class="btn sm" data-tn="${n.id}" ${can&&S.tech>=n.c?'':'disabled'}>${n.c} pts</button>`}</div></div>`;}).join('')}</div>`).join('')}</div>`;
  el.querySelectorAll('[data-tn]').forEach(b=>b.onclick=()=>{const n=TREE.find(x=>x.id===b.dataset.tn);S.tech-=n.c;S.tree.push(n.id);S.rd=rdFromTree(S.tree);renderHeader();toast('Researched: '+n.n);carChanged(Di,true);});return;}}
function liveCharts(){const D=curD();const g=id=>document.getElementById(id);
 if(g('lcDyno'))Analytics.drawDyno(g('lcDyno'),D,null);
 if(g('lcGear'))Analytics.drawGearChart(g('lcGear'),D);
 if(g('engTxt'))g('engTxt').innerHTML=dynoText2(D);
 if(g('lcAero'))drawAeroMap(g('lcAero'),D);if(g('lcRH'))drawRH(g('lcRH'),D);
 if(g('aeroTxt'))g('aeroTxt').innerHTML=D.am.parts.length?`<div class="phys">${D.am.parts.map(p=>`${p.n}: C<sub>L</sub>A ${f2(p.ClA)}, C<sub>D</sub>A ${f2(p.CdA)} at x = ${f2(p.x)} m`).join('<br>')}<br>Total C<sub>L</sub>A ${f2(D.ClA)} · L/D ${f2(D.am.LD)} · CoP ${f1(D.abal)}% front vs CG ${D.t.fw}% front · ride under load ${f0(D.am.rhDyn)} mm${D.am.stall?' · <b style="color:#ff6b63">STALLED</b>':D.am.stallRisk?' · <b style="color:#ffb020">near stall</b>':''}</div>`:'<span class="mut">No aero fitted.</span>';
 if(g('lcSus'))drawSus(g('lcSus'),D);if(g('susTxt'))g('susTxt').innerHTML=`<div class="phys">f<sub>front</sub> = (1/2π)√(${D.sm.s.kf*1000}/${f1(D.sm.mf)}) = <b>${f2(D.sm.fnF)} Hz</b> · f<sub>rear</sub> = <b>${f2(D.sm.fnR)} Hz</b> · target ${f2(D.sm.fopt)} Hz · grip factor ${f3(D.sm.gripF)} · balance shift ${f1(D.sm.balAdd)}</div>`;}
function dynoText2(D){const e=D.em;return`<div class="phys">Peak <b>${f1(D.kW)} kW</b> @ ${e.peakN} rpm · torque peak ${f1(e.tqPeak*D.kW/e.peakKW)} N·m @ ${e.tqN} rpm<br>Helmholtz ${f0(e.nH)} rpm · exhaust ${f0(e.nE)} rpm · cam ${f0(e.nCam)} rpm · valve float ${f0(e.nFloat)} rpm${e.floats?' <b style="color:#ff6b63">FLOAT</b>':''}<br>η<sub>th</sub> ${f3(e.etaTh)} · knock ${f2(e.knock)}${e.knock>1?' <b style="color:#ff6b63">KNOCK</b>':''} · restrictor choked over ${f0(e.chokeFrac*100)}% of the range</div>`;}
function drawAeroMap(c,D){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);const X=a=>50+a/35*(W-70),Y=v=>H-30-v/3.2*(H-50);g.strokeStyle='#1d2633';g.fillStyle='#5b6676';g.font='11px sans-serif';for(let a=0;a<=35;a+=5){g.beginPath();g.moveTo(X(a),15);g.lineTo(X(a),H-30);g.stroke();g.fillText(a+'°',X(a)-6,H-12);}for(let v=0;v<=3;v+=.5)g.fillText(v.toFixed(1),14,Y(v)+4);
 const ae=carAero(S.car);[1,2,3].forEach(n=>{const mine=n===ae.rwEl&&D.ae.id==='wing';g.strokeStyle=mine?'#4ea1ff':'#3a4a60';g.lineWidth=mine?3:1.5;g.beginPath();for(let a=0;a<=35;a+=.5){const w=wingCoef(n,a);a?g.lineTo(X(a),Y(w.cl)):g.moveTo(X(a),Y(w.cl));}g.stroke();const st=wingCoef(n,0).stall;g.fillStyle=mine?'#4ea1ff':'#5b6676';g.fillText(`${n} el · stall ${st}°`,X(st)+4,Y(wingCoef(n,st).cl)-6);});
 if(D.ae.id==='wing'){const w=D.am.rw;g.fillStyle=w.stalled?'#ff4d4d':'#ffb020';g.beginPath();g.arc(X(ae.rwAoA),Y(w.cl),7,0,7);g.fill();const f=D.am.fw;g.fillStyle='#2ecc71';g.beginPath();g.arc(X(ae.fwAoA),Y(wingCoef(ae.fwEl,ae.fwAoA).cl),6,0,7);g.fill();g.fillStyle='#c9d3e0';g.fillText('● rear (amber)  ● front (green)',W-200,20);}}
function drawRH(c,D){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);const X=r=>50+(r-10)/50*(W/2-70),Y=f=>H-30-(f-.5)/.8*(H-50);g.strokeStyle='#1d2633';g.fillStyle='#5b6676';g.font='11px sans-serif';for(let r=10;r<=60;r+=10){g.fillText(r+' mm',X(r)-12,H-12);}
 g.strokeStyle='#19d3c5';g.lineWidth=2.5;g.beginPath();for(let r=10;r<=60;r+=.5){r===10?g.moveTo(X(r),Y(diffuserF(r))):g.lineTo(X(r),Y(diffuserF(r)));}g.stroke();g.fillStyle='#19d3c5';g.fillText('diffuser factor vs ride height',60,16);
 [[D.t.rh,'#8b97a8','static'],[D.am.rhDyn||D.t.rh,'#ffb020','under load']].forEach(([r,col,l])=>{g.strokeStyle=col;g.setLineDash([4,4]);g.beginPath();g.moveTo(X(r),20);g.lineTo(X(r),H-30);g.stroke();g.setLineDash([]);g.fillStyle=col;g.fillText(l,X(r)+3,32+(l==='static'?0:14));});
 const x0=W/2+30,bw=W/2-60;g.fillStyle='#c9d3e0';g.fillText('Centre of pressure vs centre of gravity (front ← → rear)',x0,16);g.fillStyle='#263142';g.fillRect(x0,90,bw,40);
 const cg=1-D.t.fw/100,cp=D.ClA>0?1-D.abal/100:null;g.fillStyle='#ffb020';g.fillRect(x0+bw*cg-3,70,6,80);g.fillText('CG '+D.t.fw+'% front',x0+bw*cg-30,64);if(cp!=null){g.fillStyle='#4ea1ff';g.fillRect(x0+bw*cp-3,80,6,60);g.fillText('CoP '+f1(D.abal)+'%',x0+bw*cp-26,160);}
 g.fillStyle='#8b97a8';g.fillText(cp==null?'no downforce':Math.abs(D.abal-D.t.fw)<3?'Balanced: aero load matches weight split':D.abal<D.t.fw?'CoP behind CG → high-speed understeer (stable)':'CoP ahead of CG → high-speed oversteer (nervous)',x0,190);}
function drawSus(c,D){const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);const X=k=>50+(k-10)/70*(W-70),Y=f=>H-30-f/6*(H-50);g.strokeStyle='#1d2633';g.fillStyle='#5b6676';g.font='11px sans-serif';for(let k=10;k<=80;k+=10){g.fillText(k+' N/mm',X(k)-16,H-12);}for(let f=0;f<=6;f++){g.fillText(f+' Hz',10,Y(f)+4);}
 g.fillStyle='rgba(46,204,113,.15)';g.fillRect(50,Y(D.sm.fopt+.4),W-70,Y(D.sm.fopt-.4)-Y(D.sm.fopt+.4));g.fillStyle='#2ecc71';g.fillText('target band (rises with downforce)',60,Y(D.sm.fopt+.4)-4);
 [[D.sm.mf,'#4ea1ff','front',D.sm.s.kf,D.sm.fnF],[D.sm.mr,'#ff7ab6','rear',D.sm.s.kr,D.sm.fnR]].forEach(([m,col,l,k,fn])=>{g.strokeStyle=col;g.lineWidth=2;g.beginPath();for(let kk=10;kk<=80;kk++){const f=Math.sqrt(kk*1000/m)/(2*Math.PI);kk===10?g.moveTo(X(kk),Y(f)):g.lineTo(X(kk),Y(f));}g.stroke();g.fillStyle=col;g.beginPath();g.arc(X(k),Y(fn),6,0,7);g.fill();g.fillText(l,X(80)-30,Y(Math.sqrt(80000/m)/(2*Math.PI))-6);});}
function optCard(cat,p,cur){const sel=S.car.parts[cat]===p.id;const inh=S.inherited.parts[cat]===p.id;
 const tags=[];if(p.mass!=null)tags.push(p.mass+' kg');
 if(cat==='chassis')tags.push(p.k+' Nm/°');if(cat==='power')tags.push(p.kW+' kW',p.ev?'η '+p.eff+' · '+p.cap+' kWh':'η '+p.eff,'heat ×'+p.heat);
 if(cat==='tires')tags.push('μ '+p.mu,'wear ×'+p.wear,p.win[0]+'–'+p.win[1]+' °C');if(cat==='susp')tags.push('grip ×'+p.mu,'wear ×'+p.wear);
 if(cat==='brakes')tags.push(p.cap+' g max');if(cat==='cooling')tags.push('capacity ×'+p.cap);if(cat==='aero')tags.push('C_LA '+p.cla,'+C_DA '+p.cda);
 if(p.rel)tags.push('rel '+f1(p.rel*100)+'%');
 const dm=p.mass-cur.mass;
 return`<div class="opt ${sel?'sel':''}" data-cat="${cat}" data-id="${p.id}"><div class="price ${inh?'free':''}">${inh?'INHERITED':money(p.cost)}</div><div class="nm">${p.name}</div><div class="ds">${p.desc||''}</div><div class="tags">${tags.map(t=>`<span>${t}</span>`).join('')}</div>${!sel&&dm?`<div class="deltas"><span class="${dm<0?'up':'dn'}">${dm>0?'+':''}${f1(dm)} kg</span></div>`:''}</div>`;}
function updStats(Di){const D=curD();const el=$('#stats');if(!el)return;const pi=perfIndex(D),piI=ctxPI(Di);const rem=budget()-spent();
 const dl=(v,b,hi,fmt=f1)=>{const d=v-b;if(Math.abs(d)<1e-3)return'';const good=hi?d>0:d<0;return`<span class="d ${good?'up':'dn'}">${d>0?'+':''}${fmt(d)}</span>`;};
 const balTxt=Math.abs(D.bal)<1.5?'Neutral':D.bal>0?'Understeer':'Oversteer';
 const insp=inspect(D);
 el.innerHTML=`<h2>Live derived stats</h2>
 <div class="stat"><span class="mut">Budget spent</span><span>${money(spent())} / ${S.mode==='sandbox'?'∞':money(budget())}</span></div><div class="bar ${rem>=0?'g':''}"><i style="width:${clamp(spent()/budget()*100,0,100)}%"></i></div>
 <div style="height:8px"></div>
 <div class="stat"><span class="mut">Est. autocross lap (sim-driver)</span><span>${f2(pi)} s${dl(pi,piI,false,f2)}</span></div>
 <div class="stat"><span class="mut">Mass (car / +driver)</span><span>${f0(D.massCar)} / ${f0(D.m)} kg${dl(D.massCar,Di.massCar,false,f0)}</span></div>
 <div class="stat"><span class="mut">Power</span><span>${f1(D.kW)} kW${dl(D.kW,Di.kW,true)}</span></div>
 <div class="stat"><span class="mut">Lateral g @ 15 / 25 m/s</span><span>${f2(D.latG)} / ${f2(latG(D,25))} g${dl(D.latG,Di.latG,true,f2)}</span></div>
 <div class="stat"><span class="mut">Top speed${D.gearLimited?' (gear-limited)':''}</span><span>${spd(D.vTop)}${dl(D.vTop*MPH,Di.vTop*MPH,true,f0)}</span></div>
 <div class="stat"><span class="mut">C<sub>D</sub>A / C<sub>L</sub>A</span><span>${f2(D.CdA)} / ${f2(D.ClA)} m²</span></div>
 <div class="stat"><span class="mut">Balance</span><span>${balTxt} (${f1(D.bal)})</span></div>
 <div class="stat"><span class="mut">Ride freq F / R</span><span>${f2(D.sm.fnF)} / ${f2(D.sm.fnR)} Hz</span></div>
 <div class="stat"><span class="mut">Weakest SF</span><span style="color:${D.sf<1.2?'#ff6b63':'inherit'}">${f2(D.sf)}</span></div>
 <div class="stat"><span class="mut">Endurance reliability</span><span>${f1(D.rel*100)}%${dl(D.rel*100,Di.rel*100,true)}</span></div>
 <div class="stat"><span class="mut">Cooling heat index</span><span style="color:${D.heatIdx>.9?'#ff6b63':'inherit'}">${f2(D.heatIdx)}${D.heatIdx>.9?' HOT':''}</span></div>
 <div class="stat"><span class="mut">Endurance energy (est.)</span><span>${f1(quickEnergy(D))} kWh${D.pw.ev?' / '+D.pw.cap:''}</span></div>
 ${D.ice?`<div class="stat"><span class="mut">Intake / exhaust tuned</span><span>${f0(D.em.nH)} / ${f0(D.em.nE)} rpm</span></div>`:''}
 <div class="stat"><span class="mut">Brake 60–0 (est.)</span><span>${dist(brake60(D))}</span></div>
 <h3 style="margin-top:12px">Tech inspection</h3><div class="insp">${insp.map(([c,t])=>`<div class="${c}">${c==='f'?'✖':c==='w'?'⚠':'✔'} ${t}</div>`).join('')}</div>`;
 const cp=$('#crewP');if(cp)cp.innerHTML=Crew.panel(D);
 renderHeader();}
let _pic={};function ctxPI(D){const k=JSON.stringify([S.inherited,S.rd]);if(_pic.k!==k)_pic={k,v:perfIndex(D)};return _pic.v;}

/* ================= CHIEF & NOTEBOOK ================= */
function rNotebook(a){const nb=S.notebook||[];const preds=S.predictions||[];
 a.innerHTML=`<div class="row" style="margin-bottom:12px"><div><h1>Chief Engineer & Engineering Notebook</h1><div class="sub" style="margin:0">${CHIEF.name} keeps score of what you <i>understand</i>, not just what you win. Concepts you miss come back sooner (spaced repetition).</div></div><span class="sp"></span><div class="kpi"><small>Insight points</small><span class="big" style="color:#c39bff">${S.insight||0}</span></div></div>
 <div id="rvHost"></div>
 <div class="grid g2" style="margin-top:14px"><div class="card"><h2>Notebook (${nb.length})</h2>${nb.length?nb.slice(0,40).map(n=>`<div class="nb ${n.type}"><div class="row"><b>${n.title||n.type}</b><span class="sp"></span><span class="small mut">S${n.season} · ${new Date(n.date).toLocaleDateString()}</span></div>${n.steps?`<div class="small mut">${n.steps.join(' · ')}</div>`:''}${n.text?`<div class="small" style="margin-top:4px">${esc(n.text)}</div>`:''}</div>`).join(''):'<p class="mut">Empty. Debriefs, sign-offs and prediction checks land here.</p>'}</div>
 <div><div class="card"><h2>Predictions</h2>${preds.length?`<table><tr><th>Season</th><th>Event</th><th>Fix</th><th>Predicted</th><th>Actual</th><th>Insight</th></tr>${preds.map(p=>`<tr><td>S${p.season}</td><td>${EVN[p.ev]||p.ev}</td><td class="small" style="text-align:left">${p.fix}</td><td>${p.pred>0?'+':''}${p.pred}</td><td>${p.checked?(p.actual>0?'+':'')+f2(p.actual):'<span class="mut">pending</span>'}</td><td>${p.checked?'+'+p.pts:'—'}</td></tr>`).join('')}</table>`:'<p class="mut">Make predictions in the sign-off gates and before events.</p>'}</div>
 <div class="card" style="margin-top:14px"><h2>Physics library</h2>${Object.entries(CONCEPTS).map(([k,c])=>`<details><summary><b>${c.t}</b></summary><div class="phys">${c.f}</div><p class="small">${c.d}</p></details>`).join('')}</div></div></div>`;
 reviewPanel($('#rvHost'));}
