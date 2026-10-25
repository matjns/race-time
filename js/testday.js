'use strict';
/* ================= TEST DAY ================= */
let lastTest=null;const tdOpt={ghost:true,ai:true};let tdLast=null;
const DRIVE_TRACKS=[['autox','Autocross','One timed lap — the reference lap for analytics'],['flow','Flow Ring','Flying laps · Turn 3 speed challenge'],['skid','Skidpad','Warm-up lap + timed lap'],['accel','Acceleration 75 m','Launch & shifts'],['drag','0–60 strip','250 m · measures 0–60 mph'],['endu','Endurance Loop','Flying laps · watch temps']];
function rTest(a){
 const D=curD();
 a.innerHTML=`<div class="row" style="margin-bottom:12px"><div><h1>Test Day & Engineering Challenges</h1><div class="sub" style="margin:0">Drive the car yourself in 3D, or let the sim-driver run time-accelerated tests. Challenge targets are checked against telemetry.</div></div><span class="sp"></span><button class="btn" id="back">← Garage</button><button class="btn pri" id="toComp">Enter competition →</button></div>
 <div class="card hero" style="margin-bottom:14px"><div class="row" style="flex-wrap:wrap;gap:10px"><h2 style="margin:0">🏎 Drive in 3D</h2><span class="small mut" id="tdKeys">${Keys.short()}</span> <button class="kbbtn" data-keys>⌨ Controls</button><span class="sp"></span>
  <label class="small"><input type="checkbox" id="oG" ${tdOpt.ghost?'checked':''}> Last season's ghost</label><label class="small"><input type="checkbox" id="oA" ${tdOpt.ai?'checked':''}> Sim-driver rival car</label><label class="small"><input type="checkbox" id="oM" ${S.drive.manual?'checked':''}> Manual gears</label></div>
  <div class="row" style="flex-wrap:wrap;gap:8px;margin-top:10px">${DRIVE_TRACKS.map(([k,l,d])=>`<button class="btn ${k==='autox'?'pri':''}" data-drive="${k}" title="${d}">${l}${S.laps&&S.laps[k]?` <span class="small mut">PB ${fmtT(S.laps[k].time)}</span>`:''}</button>`).join('')}</div>
  <div id="chiefBox" style="margin-top:12px">${tdLast?debriefPrompt():''}</div></div>
 <div class="race"><div class="card"><div class="row small mut" style="margin-bottom:6px">Sim-driver tests (time-accelerated)</div><div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:10px">${Object.entries(TESTS).map(([k,t])=>`<button class="btn sm" data-t="${k}" title="${t.d}">${t.l}</button>`).join('')}</div><div id="vh"></div></div>
 <div><div class="card"><h3>Live telemetry</h3><div id="th"></div></div><div class="card" style="margin-top:14px"><h3>Last test result</h3><div id="tres" class="small">${lastTest?lastTest.html:'<span class="mut">No test run yet this session.</span>'}</div></div></div></div>
 <h2 style="margin-top:20px">Engineering challenges — Season ${S.season}</h2>
 <div class="grid g3" id="chs"></div>`;
 VIEW=Viewer($('#vh'),$('#th'));
 a.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>runTest(b.dataset.t));
 a.querySelectorAll('[data-drive]').forEach(b=>b.onclick=()=>startDrive(b.dataset.drive));
 $('#oG').onchange=e=>tdOpt.ghost=e.target.checked;$('#oA').onchange=e=>tdOpt.ai=e.target.checked;$('#oM').onchange=e=>{S.drive.manual=e.target.checked;save();};
 a.querySelector('[data-keys]').onclick=()=>Keys.open();
 $('#back').onclick=()=>go('garage');$('#toComp').onclick=()=>go('comp');
 bindDebrief();renderChallenges(D);
}
function debriefPrompt(){const L=tdLast.L;return`<div class="row" style="gap:10px;background:#1a1530;border:1px solid #4b3a8a;border-radius:10px;padding:10px"><div class="ch-av" style="width:36px;height:36px">${CHIEF.av}</div><div><b>${CHIEF.name}</b>: “${TR[L.track].name} in ${fmtT(L.time)}. Let's look at the data together.”</div><span class="sp"></span><button class="btn pri" id="dbGo">Debrief (Socratic, ~2 min)</button><button class="btn" id="dbAn">Open in Analytics</button></div>`;}
function bindDebrief(){const g=$('#dbGo');if(g)g.onclick=()=>{const {L,R,refName}=tdLast;const D=curD();runDebrief($("#chiefBox"),L,R,D,refName,()=>{tdLast=null;renderHeader();$('#chiefBox').innerHTML='<div class="hintbox ok">Debrief logged in the Engineering Notebook.</div>';});};
 const an=$('#dbAn');if(an)an.onclick=()=>{Analytics.st.A=tdLast.L;Analytics.st.B=tdLast.R;Analytics.st.zone=null;go('analytics');};}
function startDrive(trk,extra){const D=curD();const ghost=tdOpt.ghost?((S.ghosts||{})[trk]||null):null;
 const simL=Analytics.refSim(trk);const refs=tdOpt.ai&&trk!=='skid'?[{L:simL,car:S.car,D,color:0x4ea1ff,name:'Sim-driver'}]:[];
 if(typeof Crew!=='undefined')setTimeout(()=>Crew.say('start'),400);
 Drive.start(Object.assign({track:trk,D,car:S.car,title:'Test Day',mode:'test',ghost,refs,continuous:TR[trk].closed&&trk!=='skid'&&trk!=='autox',warmTires:true,
  onLap:L=>{driveFeed(L,D);},
  onExit:(best,info)=>{const runs=info.runs||[];const last=runs[runs.length-1];
   if(last){const R=(S.ghosts||{})[trk]||simL;tdLast={L:last,R,refName:(S.ghosts||{})[trk]?"last season's ghost":'the sim-driver (your car on the limit)'};}
   if(info.then==='anal'&&last){Analytics.st.A=last;Analytics.st.B=tdLast.R;Analytics.st.zone=null;go('analytics');return;}
   if(S.screen==='test')rTest($('#app'));}},extra||{}));}
/* driven laps feed the engineering challenges */
function driveFeed(L,D){const tr=TR[L.track];const zone=lbl=>tr.zones.find(z=>z.label===lbl);const msgs=[];
 if(L.track==='flow'){const z=zone('T3'),b=zone('Back straight');if(z){let mn=1e9,mx=0;for(let i=z.i0;i<=z.i1;i++)mn=Math.min(mn,L.ch.v[i]);if(b)for(let i=b.i0;i<=b.i1;i++)mx=Math.max(mx,L.ch.v[i]);msgs.push(...updateChallenges('flow',{t3:mn,vmax:mx,driven:1},D));}}
 if(L.track==='drag'||L.track==='accel'){const i=L.ch.v.findIndex(v=>v>=26.822);if(i>0&&L.track==='drag'){msgs.push(...updateChallenges('drag',{z60:L.ch.t[i]-(L.ch.t[0]||0),driven:1},D));}}
 msgs.forEach((m,i)=>setTimeout(()=>toast(m,4500),i*600));}
function renderChallenges(D){const el=$('#chs');if(!el)return;D=D||curD();const u=STYLES[S.car.tune.style].use;
 el.innerHTML=S.challenges.map((c,i)=>{const T=CH[c.key];const pr=chProgress(c);
  const st=c.status==='signed'?'<span class="pill g">✔ SIGNED OFF</span>':c.status==='passed'?'<span class="pill g">PASSED · sign-off pending</span>':c.status==='claimed'?'<span class="pill g">✔ CLAIMED (no sign-off)</span>':'<span class="pill">OPEN</span>';
  const best=c.best==null?'—':c.key==='rpm'?f0(c.bestData.rpm)+' rpm':c.key==='aerobal'?(c.bestData.cla>0?'Δ '+f1(Math.abs(c.bestData.abal-c.bestData.fw))+'%':'no aero'):c.key==='safety'?(c.best?'yes':'no'):c.key==='stiff'?f0(c.best)+' Nm/°':(c.unit==='s'?f2(c.best):f1(c.best))+' '+T.unit;
  const lastLap=c.bestData&&c.bestData.lastLap;const drv=TESTS[T.test]&&['flow','drag'].includes(T.test);
  return`<div class="ch ${c.status==='signed'||c.status==='claimed'?'signed':c.status==='passed'?'passed':''}"><div class="row"><span class="giver">${T.giver}</span><span class="sp"></span>${c.inherited?'<span class="pill a">INHERITED</span>':''}${c.seasons>1?`<span class="pill p">${c.left} of ${c.seasons} seasons left</span>`:''}</div>
  <div class="tt">${T.title(c)}</div><div class="small mut">${T.desc(c)}</div>
  <div class="prog"><i style="width:${pr*100}%"></i></div><div class="row small"><span>Best: <b>${best}</b></span><span class="sp"></span>${st}</div>
  <details ${i===0?'open':''}><summary class="small" style="cursor:pointer;margin-top:6px;color:#9fb3c8">Governing physics & required numbers</summary><div class="phys">${T.phys(D,c,u,lastLap)}</div></details>
  <div class="row small" style="margin-top:6px"><span class="mut">Reward: ${money(T.reward.cash*(c.seasons>1?1.5:1))} · ${T.reward.tech} tech · +${T.reward.rep} rep</span><span class="sp"></span>
   ${c.status==='open'&&drv?`<button class="btn sm" data-drv="${TESTS[T.test].track}">Drive it</button>`:''}${c.status==='open'&&T.test!=='comp'?`<button class="btn sm" data-run="${T.test}">Sim test</button>`:''}${T.test==='comp'&&c.status==='open'?'<span class="small mut">Checked at competition</span>':''}${c.status==='passed'?`<button class="btn sm pri" data-sign="${c.id}">Show your math ✍</button>`:''}</div></div>`;}).join('');
 el.querySelectorAll('[data-run]').forEach(b=>b.onclick=()=>{runTest(b.dataset.run);window.scrollTo({top:0,behavior:'smooth'});});
 el.querySelectorAll('[data-drv]').forEach(b=>b.onclick=()=>startDrive(b.dataset.drv));
 el.querySelectorAll('[data-sign]').forEach(b=>b.onclick=()=>signOff(b.dataset.sign));
}
function runTest(kind){const D=curD();const style=S.car.tune.style;const use=STYLES[style].use;let data={},html='';
 const fin=()=>{const msgs=updateChallenges(kind,data,D);lastTest={html};const r=$('#tres');if(r)r.innerHTML=html;renderChallenges(D);msgs.forEach((m,i)=>setTimeout(()=>toast(m,4500),i*600));};
 if(kind==='flow'){const res=runStint(D,TR.flow,{laps:3,style,keepArrays:true,coldStart:false});
  data.t3=Math.max(...res.laps.slice(1).map(l=>l.r.zones.T3.vmin));data.vmax=Math.max(...res.laps.map(l=>l.r.zones['Back straight'].vmax));
  html=`<b>Flow Ring</b> best lap ${fmtT(Math.min(...res.laps.map(l=>l.time)))}<br>Turn 3 minimum: <b>${spd1(data.t3)}</b> (${both(data.t3)})<br>Back straight max: <b>${spd1(data.vmax)}</b><br><span class="mut">Turn 3 limit: ${D.vGear<cornerV(D,1/45,use,1)?'gearing':'grip'}.</span>`;
  VIEW.play({track:TR.flow,laps:res.laps,title:'Flow Ring · 3 flying laps',onDone:fin});return;}
 if(kind==='endu22'){const res=runStint(D,TR.endu,{laps:22,style,keepArrays:true});const last=res.laps[res.laps.length-1];
  data={energy:res.energy,F:res.eW/(22*TR.endu.len),wear:res.wear,lastLap:{...last,F:res.eW/(22*TR.endu.len),r:null}};
  html=`<b>22-lap endurance sim</b>: ${fmtT(res.time)}<br>Energy: <b>${f2(res.energy)} kWh</b>${D.ice?` (${f2(res.energy/8.9)} L fuel)`:` of ${D.pw.cap} kWh pack`}<br>Peak coolant ${f0(res.maxCool)} °C · tires ${f0(res.maxTire)} °C · wear ${f0(res.wear*100)}%${res.dnf?`<br><span class="dn">${res.dnf.why}</span>`:''}`;
  VIEW.play({track:TR.endu,laps:res.laps,accelAfter:1,title:'Endurance Loop · 22 laps',dnf:res.dnf&&res.dnf.why,onDone:fin});return;}
 if(kind==='endu100'){const tc=S.challenges.find(c=>c.key==='tire100');const target=tc?tc.target:100;const res=runStint(D,TR.endu,{laps:Math.min(170,target+25),style,keepArrays:true,stopAtWear:true});
  const L=res.laps;let lapsTo=L.length;if(res.wear>=1){const l=L[L.length-1];lapsTo=L.length-1+(1-(res.wear-l.wl))/l.wl;}
  const ref=L[Math.min(5,L.length-1)];data={lapsTo100:lapsTo,lastLap:{...ref,r:null}};
  html=`<b>Long tire run</b>: ${res.wear>=1?`tires reached 100% after <b>${f1(lapsTo)} laps</b>`:`<b>${L.length} laps</b> completed at ${f0(res.wear*100)}% wear`}<br>Steady wear ${f2(ref.wl*100)}%/lap at ${f0(ref.tireT)} °C (window ${D.ti.win[0]}–${D.ti.win[1]} °C)<br><canvas id="wearC" width="560" height="160" style="width:100%;margin-top:6px"></canvas>`;
  VIEW.play({track:TR.endu,laps:L,accelAfter:2,title:`Tire run · target ${target} laps`,onDone:()=>{fin();wearChart(L,target);}});return;}
 if(kind==='drag'){const r=simLap(D,TR.drag,{v0:0,use,standing:true,noBrakeEnd:true});data.z60=zeroTo60(D,use);
  html=`<b>0–60 mph: ${f2(data.z60)} s</b><br>250 m in ${f2(r.time)} s, trap ${spd(r.vEnd)}<br>75 m accel event: ${f2(simLap(D,TR.accel,{v0:0,use,standing:true,noBrakeEnd:true}).time)} s`;
  VIEW.play({track:TR.drag,laps:[{r}],title:'0–60 strip',onDone:fin});return;}
 if(kind==='skid'){const r=simLap(D,TR.skid,{v0:12,use});const t=skidTime(D,use);html=`<b>Skidpad</b>: ${f2(t)} s per lap · ${f2(latG(D,2*Math.PI*9.875/t,use))} g steady-state`;VIEW.play({track:TR.skid,laps:[{r}],title:'Skidpad',onDone:fin});return;}
 if(kind==='autox'){const r=simLap(D,TR.autox,{v0:0,use,standing:true});html=`<b>Autocross</b>: ${fmtT(r.time)} · top ${spd(Math.max(...r.v))}`;VIEW.play({track:TR.autox,laps:[{r}],title:'Autocross practice',onDone:fin});return;}
 if(kind==='brake'){const d=brake60(D);data.b60=d;const tc=S.challenges.find(c=>c.key==='brake');
  html=`<b>60–0 mph: ${f0(d*FT)} ft</b> (${f1(d)} m) · ${Math.min(D.mu*.97,D.brake)===D.brake?'brake-limited':'tire-limited'}`;
  VIEW.info((g,W,H)=>{const mx=Math.max(d,tc?tc.target/FT:0)*1.25;const X=m=>120+m/mx*(W-240);g.fillStyle='#2b3038';g.fillRect(100,H/2-50,W-200,100);g.fillStyle='#e10600';g.fillRect(X(0),H/2-20,X(d)-X(0),40);
   if(tc){g.strokeStyle='#ffb020';g.lineWidth=4;g.beginPath();g.moveTo(X(tc.target/FT),H/2-80);g.lineTo(X(tc.target/FT),H/2+80);g.stroke();g.fillStyle='#ffb020';g.font='700 26px sans-serif';g.textAlign='center';g.fillText('target '+tc.target+' ft',X(tc.target/FT),H/2-92);}
   g.fillStyle='#fff';g.font='800 44px sans-serif';g.textAlign='center';g.fillText(`60–0 mph: ${f0(d*FT)} ft · ${f1(d)} m`,W/2,H/2+150);g.fillStyle='#8b97a8';g.font='600 26px sans-serif';g.fillText('d = v² / 2a',W/2,140);});
  fin();return;}
 if(kind==='rig'){data.K=D.K;data.mass=D.massCar;html=`<b>Torsion rig</b>: ${f0(D.K)} Nm/° · car mass ${f1(D.massCar)} kg · twist at 1000 Nm: ${f2(1000/D.K)}°`;
  VIEW.info((g,W,H)=>{const th=1000/D.K*14;g.save();g.translate(W/2,H/2);g.strokeStyle='#3fa9f5';g.lineWidth=6;for(let i=0;i<9;i++){const x=-420+i*105;const a=th*(i/8)*Math.PI/180;g.beginPath();g.moveTo(x,-90*Math.cos(a));g.lineTo(x,90*Math.cos(a));g.stroke();}g.beginPath();g.moveTo(-420,-90);g.lineTo(420,-90*Math.cos(th*Math.PI/180));g.moveTo(-420,90);g.lineTo(420,90*Math.cos(th*Math.PI/180));g.stroke();g.restore();g.fillStyle='#fff';g.font='800 44px sans-serif';g.textAlign='center';g.fillText(`K = ${f0(D.K)} Nm/°`,W/2,H-150);g.fillStyle='#8b97a8';g.font='600 26px sans-serif';g.fillText(`θ = T/K = ${f2(1000/D.K)}° at 1000 Nm (exaggerated ×14) · mass ${f1(D.massCar)} kg`,W/2,H-100);});
  fin();return;}
 if(kind==='dyno'){data.rpm=D.ice?D.rpmPeak:0;
  html=D.ice?`<b>Dyno</b>: peak torque at ${f0(D.rpmPeak)} rpm · ${f1(D.kW)} kW @ ${D.em.peakN} rpm · Helmholtz ${f0(D.em.nH)} rpm · exhaust ${f0(D.em.nE)} rpm`:'EV: flat torque to base speed — no intake tuning.';
  VIEW.info((g,W,H)=>{const c=document.createElement('canvas');c.width=W;c.height=H;Analytics.drawDyno(c,D,null);g.drawImage(c,0,0);});
  fin();return;}
 if(kind==='aero'){data={cla:D.ClA,abal:D.abal,fw:D.t.fw};const F=.5*RHO*D.ClA*400;html=`<b>Aero map @20 m/s</b>: downforce ${f0(F)} N, drag ${f0(.5*RHO*D.CdA*400)} N · balance ${D.ClA>0?f1(D.abal)+'% front':'—'} vs weight ${D.t.fw}%`;
  VIEW.info((g,W,H)=>{g.fillStyle='#fff';g.font='800 40px sans-serif';g.textAlign='center';g.fillText(D.ClA>0?`Downforce ${f0(F)} N @ 20 m/s`:'No downforce fitted',W/2,110);const fb=D.ClA>0?D.abal/100:0;const bw=W-400;g.fillStyle='#3fa9f5';g.fillRect(200,300,bw*fb,70);g.fillStyle='#a77bff';g.fillRect(200+bw*fb,300,bw*(1-fb),70);g.fillStyle='#ffb020';g.fillRect(200+bw*D.t.fw/100-3,270,6,130);g.font='600 26px sans-serif';g.fillStyle='#c9d3e0';g.fillText(`aero front ${D.ClA>0?f1(D.abal):0}% | weight front ${D.t.fw}% (amber)`,W/2,460);g.fillText(`C_LA ${f2(D.ClA)} m² · C_DA ${f2(D.CdA)} m² · L/D ${D.ClA?f2(D.ClA/D.CdA):'—'}`,W/2,520);});
  fin();return;}
}
function wearChart(L,target){const c=document.getElementById('wearC');if(!c)return;const g=c.getContext('2d'),W=c.width,H=c.height;const n=Math.max(target,L.length)*1.05;g.clearRect(0,0,W,H);g.strokeStyle='#263142';g.strokeRect(30,10,W-40,H-30);
 g.strokeStyle='#ffb020';g.setLineDash([5,5]);g.beginPath();const tx=30+target/n*(W-40);g.moveTo(tx,10);g.lineTo(tx,H-20);g.stroke();g.setLineDash([]);
 g.strokeStyle='#e10600';g.lineWidth=2.5;g.beginPath();L.forEach((l,i)=>{const X=30+(i+1)/n*(W-40),Y=H-20-Math.min(1,l.wear)*(H-30);i?g.lineTo(X,Y):g.moveTo(X,Y);});g.stroke();
 g.fillStyle='#8b97a8';g.font='11px sans-serif';g.fillText('wear % vs lap — dashed = target',36,24);}
function signOff(id){const c=S.challenges.find(x=>x.id===id);const T=CH[c.key];const D=curD();const u=STYLES[S.car.tune.style].use;const M=T.math(D,c,u,c.passData&&c.passData.lastLap);let hints=0;
 const mult=c.seasons>1?1.5:1;
 const box=()=>{$('#modal').innerHTML=`<div class="modal"><div class="box"><div class="giver small mut">${T.giver} · SIGN-OFF</div><h2 style="margin-top:4px">${T.title(c)} — show your math</h2>
 <p class="small mut">The data says you hit the target. Before the Chief Engineer signs it off, prove you know <i>why</i>. Values below come from your current car.</p>
 <div class="phys" style="font-size:14px">${M.q}</div>
 <div class="row"><input type="number" step="any" id="ans" placeholder="your answer" style="width:180px"> <span class="mut">${M.unit}</span><span class="sp"></span><button class="btn pri" id="chk">Check</button></div>
 <div id="fbk" style="margin-top:10px">${M.hints.slice(0,hints).map((h,i)=>`<div class="hintbox">💡 Hint ${i+1}: ${h}</div>`).join('')}</div>
 <div class="row" style="margin-top:14px"><button class="btn sm ghost" id="hint" ${hints>=M.hints.length?'disabled':''}>Ask a guiding question</button><span class="sp"></span><button class="btn sm" id="claim">Claim 50% without sign-off</button><button class="btn sm ghost" id="cl">Close</button></div></div></div>`;
  $('#cl').onclick=()=>$('#modal').innerHTML='';
  $('#hint').onclick=()=>{hints++;box();};
  $('#claim').onclick=()=>{reward(c,.5);c.status='claimed';$('#modal').innerHTML='';done();};
  $('#chk').onclick=()=>{const v=parseFloat($('#ans').value);if(!isFinite(v)){return;}const err=Math.abs(v-M.ans)/Math.abs(M.ans);
   if(err<=M.tol){reward(c,1);c.status='signed';c.signedSeason=S.season;note({type:'challenge',title:'Challenge signed: '+T.title(c),text:`${f2(v)} ${M.unit} (model ${f2(M.ans)})`});$('#modal').innerHTML=`<div class="modal"><div class="box"><h2>✔ Signed off</h2><p>Correct — ${f2(M.ans)} ${M.unit}. Full reward: ${money(T.reward.cash*mult)}, ${T.reward.tech} tech pts, +${T.reward.rep} reputation.</p><div class="row"><span class="sp"></span><button class="btn pri" id="ok">Nice</button></div></div></div>`;$('#ok').onclick=()=>{$('#modal').innerHTML='';done();};}
   else{hints=Math.min(M.hints.length,hints+1);box();$('#fbk').insertAdjacentHTML('afterbegin',`<div class="hintbox" style="border-color:#e10600">Not quite (${f2(v)} vs. expected within ${f0(M.tol*100)}%). ${err>.5?'Check your units and which forces you included.':'Close — check rounding and units.'}</div>`);}};};
 const done=()=>{save();renderHeader();renderChallenges();};
 box();}
function reward(c,f){const T=CH[c.key];const mult=c.seasons>1?1.5:1;S.bonusCash+=Math.round(T.reward.cash*mult*f);S.tech+=Math.round(T.reward.tech*f);S.rep+=Math.round(T.reward.rep*f);save();toast(`Reward: +${money(T.reward.cash*mult*f)} budget · +${Math.round(T.reward.tech*f)} tech · +${Math.round(T.reward.rep*f)} rep`);}
window.addEventListener('rt-keys',()=>{const e=document.getElementById('tdKeys');if(e)e.innerHTML=Keys.short();});
