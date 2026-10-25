'use strict';
/* ================= CHIEF ENGINEER: Socratic debriefs, sign-off gates, mastery (spaced repetition) ================= */
const CHIEF={name:'Dr. Ada Okafor',role:'Chief Engineer',av:'AO'};
const CONCEPTS={
 latg:{t:'Lateral acceleration',f:'a<sub>y</sub> = v² / r',d:'Cornering needs a centripetal force: tighter radius or more speed → more g.'},
 grip:{t:'Grip limit (traction circle)',f:'a<sub>max</sub> = μ·g·(1 + ρC<sub>L</sub>Av²/2mg)',d:'Tires give μ×load in any direction; downforce adds load that grows with v².'},
 brake:{t:'Braking distance',f:'d = (v₁² − v₂²) / 2a',d:'Energy you have to remove scales with v², so braking distance does too.'},
 power:{t:'Power-limited acceleration',f:'F = P / v,  a = (F − F<sub>drag</sub>) / m',d:'At low speed the tires limit you; above v* = P/(μ m<sub>r</sub> g) the engine does.'},
 aero:{t:'Downforce & drag',f:'F = ½ ρ C<sub>L</sub>A v²',d:'Aero forces grow with v²: little help in tight corners, huge in fast ones.'},
 helm:{t:'Helmholtz intake tuning',f:'f = (c/2π)·√(A / (L·V))',d:'A runner and cylinder form an air spring–mass system with a resonant rpm.'},
 sf:{t:'Safety factor',f:'SF = σ<sub>allow</sub> / σ<sub>applied</sub>',d:'Margin between the load and what the part can take. Too high = heavy, too low = snaps.'},
 fn:{t:'Ride natural frequency',f:'f<sub>n</sub> = (1/2π)·√(k / m)',d:'How fast the body bounces; higher with aero to control ride height.'},
 energy:{t:'Energy & efficiency',f:'E = F̄·d / η',d:'Work at the wheels divided by drivetrain/engine efficiency is the energy you burn.'},
 points:{t:'FSAE dynamic scoring',f:'P = P<sub>max</sub>·(T<sub>max</sub>/T − 1)/(T<sub>max</sub>/T<sub>min</sub> − 1) + P<sub>base</sub>',d:'Scores scale with how close you are to the winner, not linearly in time.'},
 stall:{t:'Wing stall',f:'C<sub>L</sub> = a·α up to α<sub>stall</sub>',d:'Past the stall angle the flow separates: downforce collapses, drag soars.'},
 heat:{t:'Heat rejection',f:'Q = h·A·ΔT',d:'Radiator capacity must match the engine\'s waste heat or coolant temperature climbs.'}
};
function sess(){S.sessions=(S.sessions||0)+1;return S.sessions;}
function master(c,ok){S.mastery=S.mastery||{};const m=S.mastery[c]||(S.mastery[c]={box:0,due:0,seen:0,ok:0});m.seen++;if(ok){m.ok++;m.box=Math.min(5,m.box+1);}else m.box=0;m.due=(S.sessions||0)+Math.pow(2,m.box);save();}
function dueConcepts(){const s=S.sessions||0;return Object.entries(S.mastery||{}).filter(([k,m])=>m.due<=s).map(([k])=>k);}
function note(e){S.notebook=S.notebook||[];S.notebook.unshift({...e,season:S.season,date:Date.now()});if(S.notebook.length>120)S.notebook.length=120;save();}
/* review question bank: own-car numbers */
const QB={
 latg:D=>{const r=[12,15,20,45][(S.sessions||0)%4],v=Math.sqrt(latG(D,10)*G*r)*.95;return{q:`You take a ${r} m radius corner at ${both(v)}. What lateral acceleration is that, in g?`,ans:v*v/r/G,tol:.1,unit:'g',hint:'a = v²/r, then divide by g = 9.81.'};},
 grip:D=>{const v=20;return{q:`Your car: μ = ${f2(D.mu)}, C<sub>L</sub>A = ${f2(D.ClA)} m², m = ${f0(D.m)} kg. What is the grip limit at ${v} m/s, in g?`,ans:latG(D,v),tol:.1,unit:'g',hint:'μ·(1 + ½ρC<sub>L</sub>Av²/(m g)), ρ = 1.225.'};},
 brake:D=>{const v1=25,v2=12,a=Math.min(D.mu*.97,D.brake)*G;return{q:`Braking from 25 to 12 m/s at ${f2(a/G)} g. Distance in m?`,ans:(v1*v1-v2*v2)/(2*a),tol:.1,unit:'m',hint:'d = (v₁² − v₂²)/(2a), a in m/s².'};},
 power:D=>({q:`Your engine makes ${f1(D.kW)} kW. At 25 m/s, what tractive force can it supply (ignore losses), in N?`,ans:D.kW*1000/25,tol:.1,unit:'N',hint:'P = F·v, so F = P/v.'}),
 aero:D=>({q:`C<sub>L</sub>A = ${f2(Math.max(D.ClA,1.2))} m². Downforce at 30 m/s in N?`,ans:.5*RHO*Math.max(D.ClA,1.2)*900,tol:.1,unit:'N',hint:'½·1.225·C<sub>L</sub>A·v².'}),
 helm:D=>{if(!D.ice)return QB.power(D);const e=D.em;return{q:`Runner area A = ${f1(e.A*1e6)} mm², L<sub>eff</sub> = ${f0(e.Leff*1000)} mm, V = ${f0(e.V*1e6)} cm³, c = 343 m/s. Helmholtz frequency in Hz?`,ans:e.fH,tol:.1,unit:'Hz',hint:'Convert to m², m, m³ first.'};},
 sf:D=>{const a=D.st.c.aarm;return{q:`A-arm stress σ = ${f0(a.sig)} MPa; material yield ${a.M.sy} MPa. Safety factor against yield?`,ans:a.M.sy/a.sig,tol:.1,unit:'',hint:'SF = σ<sub>y</sub>/σ.'};},
 fn:D=>{const sm=D.sm;return{q:`Front wheel rate ${sm.s.kf} N/mm, sprung corner mass ${f0(sm.mf)} kg. Natural frequency in Hz?`,ans:sm.fnF,tol:.1,unit:'Hz',hint:'k in N/m: ×1000. f = √(k/m)/2π.'};},
 energy:D=>{const F=420;return{q:`Average tractive force ${F} N over 22 km, efficiency ${f2(D.eff)}. Energy in kWh?`,ans:F*22000/D.eff/3.6e6,tol:.1,unit:'kWh',hint:'E = F·d/η in J; 1 kWh = 3.6 MJ.'};},
 points:D=>({q:'Autocross: winner 50.0 s, T<sub>max</sub> = 1.45×T<sub>min</sub>. You ran 55.0 s. Points? (P<sub>max</sub> 118.5, base 6.5)',ans:118.5*((72.5/55)-1)/((72.5/50)-1)+6.5,tol:.1,unit:'pts',hint:'118.5·(T<sub>max</sub>/T − 1)/(T<sub>max</sub>/T<sub>min</sub> − 1) + 6.5.'}),
 stall:D=>{const a=carAero(S.car),w=wingCoef(a.rwEl,a.rwAoA);return{q:`Your rear wing: ${a.rwEl} element(s). With stall at 12° + 7° per extra element, at what AoA does it stall (°)?`,ans:w.stall,tol:.05,unit:'°',hint:'12 + 7·(n − 1).'};},
 heat:D=>({q:`Heat index = (heat factor × kW/60) / cooling capacity. Heat factor ${D.pw.heat}, ${f1(D.kW)} kW, capacity ${f2(D.coolCap)}. Heat index?`,ans:D.pw.heat*D.kW/60/D.coolCap*(D.em?D.em.heatF:1),tol:.1,unit:'',hint:'Multiply by the engine heat factor from AFR/ignition if ICE (≈1).'})
};

/* ---------- lap comparison & Socratic chain ---------- */
function analyzeLap(L,R,D){const trk=L.track,tr=TR[trk],pts=tr.pts;const secs=sectorTimes(L,trk),rs=sectorTimes(R,trk);
 const ss=secs.map((s,i)=>({...s,dt:s.t-rs[i].t}));let worst=ss.reduce((a,b)=>b.dt>a.dt?b:a,ss[0]);const gained=worst.dt<=0;if(gained)worst=ss.reduce((a,b)=>b.dt<a.dt?b:a,ss[0]);
 const{i0,i1}=worst;let ent=0,mid=0,ext=0;let apex=i0,vmin=1e9;for(let i=i0;i<=i1;i++){if(pts[i].k>0&&L.ch.v[i]<vmin){vmin=L.ch.v[i];apex=i;}}
 if(vmin===1e9){vmin=Math.min(...L.ch.v.slice(i0,i1+1));apex=i0+L.ch.v.slice(i0,i1+1).indexOf(vmin);}
 let rApex=apex,rvmin=1e9;for(let i=i0;i<=i1;i++){if(pts[i].k>0&&R.ch.v[i]<rvmin){rvmin=R.ch.v[i];rApex=i;}}if(rvmin===1e9)rvmin=R.ch.v[apex];
 for(let i=i0;i<i1;i++){const d=(L.ch.t[i+1]-L.ch.t[i])-(R.ch.t[i+1]-R.ch.t[i]);if(pts[i].k>0)mid+=d;else if(i<apex)ent+=d;else ext+=d;}
 const bp=a=>{for(let i=i0;i<=apex;i++)if(a[i]>.25)return i;return null;};const lb=bp(L.ch.brk),rb=bp(R.ch.brk);
 const tp=a=>{for(let i=apex;i<=i1;i++)if(a[i]>.7)return i;return null;};const lt=tp(L.ch.thr),rt=tp(R.ch.thr);
 const parts={entry:ent,mid,exit:ext};let cat=Object.entries(parts).reduce((a,b)=>(gained?b[1]<a[1]:b[1]>a[1])?b:a)[0];
 const r=pts[apex].k>0?1/pts[apex].k:30;const ayL=vmin*vmin/r/G,lim=latG(D,vmin);
 return{secs:ss,worst,gained,cat,parts,apex,vmin,rvmin,r,ayL,lim,lb,rb,lt,rt,i0,i1};}
function debriefChain(L,R,D,refName){const A=analyzeLap(L,R,D);const w=A.worst,abs=Math.abs(w.dt);const verb=A.gained?'faster':'slower';
 const steps=[];const opts={entry:'Braking & turn-in (corner entry)',mid:'Minimum speed through the corner',exit:'Acceleration out of the corner / straight'};
 steps.push({kind:'mc',concept:null,q:`You were <b>${abs.toFixed(2)} s ${verb}</b> than ${refName} in <b>${w.l}</b>. Why? Look at the speed trace first.`,
  choices:Object.entries(opts).map(([k,t])=>({t,ok:k===A.cat})),explain:`Time split in ${w.l}: entry ${A.parts.entry>=0?'+':''}${A.parts.entry.toFixed(2)} s, mid-corner ${A.parts.mid>=0?'+':''}${A.parts.mid.toFixed(2)} s, exit ${A.parts.exit>=0?'+':''}${A.parts.exit.toFixed(2)} s.`,jump:{ch:'v',i0:A.i0,i1:A.i1}});
 if(A.cat==='mid'){
  steps.push({kind:'num',concept:'latg',q:`Your minimum speed was <b>${both(A.vmin)}</b> (${refName}: ${both(A.rvmin)}) on a <b>${f1(A.r)} m</b> radius. What lateral g were you pulling?`,ans:A.ayL,tol:.1,unit:'g',hint:'a<sub>y</sub> = v²/r, then ÷ 9.81.',jump:{ch:'ay',i0:A.i0,i1:A.i1}});
  const atLim=A.ayL/A.lim>.93;
  steps.push({kind:'mc',concept:'grip',q:`The car's grip limit at that speed is μ(1+ρC<sub>L</sub>Av²/2mg) = <b>${f2(A.lim)} g</b>. You used ${f2(A.ayL)} g (${f0(A.ayL/A.lim*100)}%). So what limited you?`,choices:[{t:'The car — I was at the grip limit',ok:atLim},{t:'Me — there was grip left over',ok:!atLim}],explain:atLim?'You were on the limit: only a higher grip ceiling (tires, downforce, balance) makes this corner faster.':'There was unused grip: carry more speed in; the g-g diagram shows the margin.',jump:{ch:'ay',i0:A.i0,i1:A.i1,view:'gg'}});
  const vlim=Math.sqrt(A.lim*G*A.r);const arc=(A.i1-A.i0)*.5;const gain=Math.max(0,arc*(1/A.vmin-1/vlim));
  steps.push({kind:'pred',concept:null,q:`If you reached the limit (${both(vlim)}) through the slowest ~${f0(arc)} m, how much time would you gain? (s)`,ans:gain,tol:.35,unit:'s',hint:'Δt ≈ d·(1/v − 1/v<sub>lim</sub>).',fixes:atLim?['Add downforce (C<sub>L</sub>A ↑) or softer tires','Rebalance (ARB / weight distribution)','Lower ride height (diffuser)']:['Brake less, carry more speed to the apex','Smoother steering to keep the tires at peak slip','Earlier turn-in on the racing line']});}
 else if(A.cat==='entry'){
  const v1=Math.max(...L.ch.v.slice(A.i0,A.apex+1)),v2=A.vmin,a=Math.min(D.mu*.97,D.brake)*G;const dmin=(v1*v1-v2*v2)/(2*a);const dAct=A.lb!=null?A.apex-A.lb:dmin*1.3;
  steps.push({kind:'num',concept:'brake',q:`You arrive at <b>${both(v1)}</b> and need <b>${both(v2)}</b> at the apex. Your brakes/tires give ${f2(a/G)} g. Minimum braking distance (m)?`,ans:dmin,tol:.1,unit:'m',hint:'d = (v₁² − v₂²)/(2a) with a = g × decel.',jump:{ch:'brk',i0:Math.max(0,A.i0),i1:A.apex}});
  steps.push({kind:'mc',concept:'brake',q:`You started braking about <b>${f0(dAct)} m</b> before the apex${A.rb!=null?` (${refName}: ${f0(A.apex-A.rb)} m)`:''}. The physics says ${f0(dmin)} m is enough. What's the fix?`,choices:[{t:'Brake later and harder — use the full deceleration',ok:dAct>dmin*1.15},{t:'Upgrade brakes — they are the limit',ok:dAct<=dmin*1.15}],explain:dAct>dmin*1.15?'You left braking distance on the table.':'You were braking at the limit; more capacity (or grip) is the lever.',jump:{ch:'brk',i0:A.i0,i1:A.apex}});
  const gain=Math.max(0,(dAct-dmin)/Math.max(v1,1)*.5);
  steps.push({kind:'pred',concept:null,q:'Predict the time gain if you brake at the physics limit (s).',ans:gain,tol:.4,unit:'s',hint:'Δt ≈ extra braking distance / (2·v₁) — you spend that distance at ~half speed.',fixes:['Brake later, harder','Upgrade brakes / bias','Softer tires for more decel']});}
 else{
  const vx=Math.max(3,L.ch.v[Math.min(A.i1,A.apex+15)]);const Fp=D.kW*1000/vx,Ft=D.mu*D.m*G*D.rear;const powLim=Fp<Ft;
  steps.push({kind:'num',concept:'power',q:`At <b>${f1(vx)} m/s</b> exiting the corner, your ${f1(D.kW)} kW engine can supply what force? (N)`,ans:Fp,tol:.1,unit:'N',hint:'F = P/v.',jump:{ch:'thr',i0:A.apex,i1:A.i1}});
  steps.push({kind:'mc',concept:'power',q:`The rear tires can transmit μ·m·g·(rear share) ≈ <b>${f0(Ft)} N</b>. So exiting this corner you were…`,choices:[{t:'Traction-limited (tires)',ok:!powLim},{t:'Power-limited (engine)',ok:powLim}],explain:powLim?'Power-limited: gearing (stay near peak power), less drag, more power help.':'Traction-limited: progressive throttle, rear grip, weight on the rear, TC.',jump:{ch:'thr',i0:A.apex,i1:A.i1}});
  const dTh=A.lt!=null&&A.rt!=null?Math.max(0,A.lt-A.rt):5;
  steps.push({kind:'pred',concept:null,q:`You reached full throttle ${A.lt!=null?f0(A.lt-A.apex)+' m after the apex':'late'}. Predict the gain from getting on throttle ${f0(dTh||5)} m earlier (s).`,ans:Math.max(.02,(dTh||5)/Math.max(vx,1)*.35),tol:.5,unit:'s',hint:'Δt ≈ distance × (fraction of speed lost) / v.',fixes:powLim?['Shorter final drive to stay near peak power','Reduce drag (wing angle)','Engine tuning (runner/exhaust)']:['Earlier, progressive throttle','More rear weight / softer rear','Traction control (tech tree)']});}
 steps.push({kind:'sum',q:`Debrief summary — ${w.l}`,concept:null});
 return{A,steps,title:`Debrief: ${TR[L.track].name} · ${w.l}`,ref:refName};}

/* ---------- generic step runner UI (used by debriefs & gates) ---------- */
function chiefShell(title,sub,body){return`<div class="chief"><div class="ch-head"><div class="ch-av">${CHIEF.av}</div><div><div class="ch-nm">${CHIEF.name} <span class="mut small">· ${CHIEF.role}</span></div><div class="ch-title">${title}</div>${sub?`<div class="small mut">${sub}</div>`:''}</div></div>${body}</div>`;}
function runDebrief(host,L,R,D,refName,onDone){const ch=debriefChain(L,R,D,refName);let k=0,tries=0;const log=[];sess();
 const draw=()=>{const s=ch.steps[k];const prog=`<div class="ch-steps">${ch.steps.map((x,i)=>`<i class="${i<k?'d':i===k?'c':''}"></i>`).join('')}</div>`;let b='';
  if(s.kind==='mc')b=`<p class="ch-q">${s.q}</p><div class="ch-choices">${s.choices.map((c,i)=>`<button class="btn" data-c="${i}">${c.t}</button>`).join('')}</div>`;
  if(s.kind==='num'||s.kind==='pred')b=`<p class="ch-q">${s.q}</p>${s.fixes?`<div class="small mut">Candidate fixes: ${s.fixes.join(' · ')}</div>`:''}<div class="row" style="margin-top:8px"><input type="number" step="any" id="chA" style="width:150px"> <span class="mut">${s.unit}</span><button class="btn pri" id="chOk">Answer</button><button class="btn ghost sm" id="chH">Hint</button></div>`;
  if(s.kind==='sum'){const ok=log.filter(x=>x.ok).length;b=`<p class="ch-q">${ok}/${log.length} first-try. ${ch.A.gained?'Keep doing what you did there.':'Fix that and the lap comes to you.'}</p><ul class="notes">${log.map(x=>`<li class="${x.ok?'ok':'bad'}">${x.q.replace(/<[^>]+>/g,'').slice(0,110)}…</li>`).join('')}</ul><div class="row"><span class="sp"></span><button class="btn pri" id="chFin">Save to notebook</button></div>`;}
  const jb=s.jump?`<button class="btn sm" id="chJ">📈 Show me: ${(TCH.find(c=>c.k===s.jump.ch)||{l:s.jump.ch}).l}${s.jump.view==='gg'?' + g-g':''}</button>`:'';
  host.innerHTML=chiefShell(ch.title,`vs ${refName}`,prog+b+`<div class="ch-fb" id="chFb"></div><div class="row" style="margin-top:8px">${jb}</div>`);
  const fb=m=>{host.querySelector('#chFb').innerHTML=m;};
  host.querySelectorAll('[data-c]').forEach(btn=>btn.onclick=()=>{const c=s.choices[+btn.dataset.c];if(c.ok){log.push({q:s.q,ok:tries===0});if(s.concept)master(s.concept,tries===0);fb(`<div class="hintbox ok">✔ ${s.explain||'Right.'}</div>`);setTimeout(()=>{k++;tries=0;draw();},900);}else{tries++;btn.disabled=true;fb(`<div class="hintbox bad">Not quite. ${s.explain&&tries>1?s.explain:'Check the trace again.'}</div>`);}});
  const ok=host.querySelector('#chOk');if(ok)ok.onclick=()=>{const v=parseFloat(host.querySelector('#chA').value);if(!isFinite(v))return;const err=Math.abs(v-s.ans)/Math.max(Math.abs(s.ans),1e-6);
   if(err<=s.tol||(s.kind==='pred'&&Math.abs(v-s.ans)<.05)){log.push({q:s.q,ok:tries===0});if(s.concept)master(s.concept,tries===0);if(s.kind==='pred')S.insight=(S.insight||0)+1;fb(`<div class="hintbox ok">✔ ${f2(s.ans)} ${s.unit}.</div>`);setTimeout(()=>{k++;tries=0;draw();},900);}
   else{tries++;fb(`<div class="hintbox bad">You said ${f2(v)} — not within ${f0(s.tol*100)}%. 💡 ${s.hint}${tries>=2?` (expected ≈ ${f2(s.ans)})`:''}</div>`);if(tries>=3){log.push({q:s.q,ok:false});if(s.concept)master(s.concept,false);setTimeout(()=>{k++;tries=0;draw();},1500);}}};
  const h=host.querySelector('#chH');if(h)h.onclick=()=>fb(`<div class="hintbox">💡 ${s.hint}</div>`);
  const j=host.querySelector('#chJ');if(j)j.onclick=()=>{if(typeof Analytics!=='undefined')Analytics.jump(L,R,s.jump);};
  const fin=host.querySelector('#chFin');if(fin)fin.onclick=()=>{note({type:'debrief',title:ch.title,ref:refName,dt:ch.A.worst.dt,track:L.track,score:`${log.filter(x=>x.ok).length}/${log.length}`});S.debriefs=(S.debriefs||0)+1;save();onDone&&onDone(log);};};
 host.__solve=()=>{const s=ch.steps[k];const q=x=>host.querySelector(x);if(s.kind==='mc'){const i=s.choices.findIndex(c=>c.ok);q(`[data-c="${i}"]`).click();}else if(s.kind==='num'||s.kind==='pred'){q('#chA').value=s.ans;q('#chOk').click();}else{const f=q('#chFin');if(f)f.click();}};
 draw();return ch;}

/* ---------- mandatory sign-off gates ---------- */
const RUBRIC_COMMON=[{l:'≥ 25 words',f:t=>t.trim().split(/\s+/).length>=25},{l:'Quotes a number from your data',f:t=>/\d/.test(t)},{l:'States a cause (because / so / therefore / due to)',f:t=>/\b(because|so|therefore|due to|since|which means|thus)\b/i.test(t)}];
function gateSpec(ev,ctx){const D=ctx.D;const g={ev,title:'',claim:null,evidence:null,eq:null,fix:null,rubric:[]};
 if(ev==='accel'){const vs=D.kW*1000/(D.mu*D.m*G*D.rear);const tT=vs/(D.mu*G*D.rear);const tr=tT>ctx.time*.5;
  g.title='Acceleration sign-off';
  g.claim={q:`Your 75 m time was <b>${f2(ctx.time)} s</b>. What limited it most?`,choices:[{t:'Traction — the rear tires (launch phase)',ok:tr},{t:'Power — the restricted engine / motor',ok:!tr},{t:'Aero drag',ok:false}],explain:`Traction→power crossover at v* = P/(μ·m·g·rear) = ${f1(vs)} m/s, reached after ≈ ${f2(tT)} s of the ${f2(ctx.time)} s run.`};
  const n=ctx.L.ch.v.length;const iX=ctx.L.ch.v.findIndex(v=>v>=vs);const ix=iX<0?n-1:iX;
  g.evidence={q:tr?'Click the part of the speed trace where the car is traction-limited (constant, tire-limited acceleration).':'Click where the car becomes power-limited (acceleration starts falling off).',ch:'v',i0:tr?0:Math.max(0,ix-6),i1:tr?Math.max(6,ix):Math.min(n-1,ix+20)};
  g.eq={q:tr?`Launch: μ = ${f2(D.mu)}, rear load share ≈ ${f2(D.rear)}. Maximum launch acceleration in m/s²?`:`Power ${f1(D.kW)} kW, μ = ${f2(D.mu)}, m = ${f0(D.m)} kg, rear share ${f2(D.rear)}. Crossover speed v* in m/s?`,ans:tr?D.mu*G*D.rear:vs,unit:tr?'m/s²':'m/s',concept:tr?'grip':'power',hint:tr?'a = μ·g·(rear share).':'v* = P/(μ·m·g·rear).'};
  g.fix={choices:tr?['More rear weight (lower front %)','Softer / bigger tires','Launch control (tech tree)','Lower CG']:['Final drive tuned to hit the line near peak power','Engine tuning (runner / exhaust / cam)','Less mass','Less drag'],unit:'s',kind:'time'};
  g.rubric=[{l:'Mentions traction/grip or power',f:t=>/(traction|grip|tire|tyre|μ|mu|friction|power|kw|engine|restrictor)/i.test(t)},{l:'Mentions mass/weight or force',f:t=>/(mass|weight|force|load|kg|newton|\bN\b)/i.test(t)}];}
 if(ev==='skid'){const r=9.875,v=2*Math.PI*r/ctx.time,ay=v*v/r/G;const balIssue=Math.abs(D.bal)>1.5;
  g.title='Skidpad sign-off';
  g.claim={q:`Skidpad ${f2(ctx.time)} s per lap. What limits steady-state cornering?`,choices:[{t:'Overall tire grip (μ) and load',ok:!balIssue},{t:`Balance — the car ${D.bal>0?'understeers':'oversteers'}`,ok:balIssue},{t:'Engine power',ok:false}],explain:`Balance index ${f1(D.bal)} (neutral is |bal| < 1.5).`};
  const n=ctx.L.ch.v.length;let mi=0;for(let i=5;i<n-5;i++)if(ctx.L.ch.v[i]<ctx.L.ch.v[mi]||mi<5)mi=i;
  g.evidence={q:'Click the slowest point of the lap on the speed trace (where the car is most grip-limited).',ch:'v',i0:Math.max(0,mi-25),i1:Math.min(n-1,mi+25)};
  g.eq={q:`Average lap speed v = 2πr/t with r = ${r} m (line radius) and t = ${f2(ctx.time)} s. What lateral g is that?`,ans:ay,unit:'g',concept:'latg',hint:'v = 2πr/t, then a = v²/(r·g).'};
  g.fix={choices:balIssue?['Adjust ARB toward neutral','Move weight distribution','Match aero balance to weight']:['Softer compound','Tire pressure / camber to the sweet spot','Better suspension kinematics'],unit:'s',kind:'time'};
  g.rubric=[{l:'Mentions grip/μ/tires or balance',f:t=>/(grip|tire|tyre|μ|mu|friction|balance|understeer|oversteer)/i.test(t)},{l:'Mentions radius, speed or v²/r',f:t=>/(radius|v²|v\^2|speed|velocity|centripetal|lateral)/i.test(t)}];}
 if(ev==='autox'){const A=analyzeLap(ctx.L,ctx.R,D);const opts={entry:'Braking & corner entry',mid:'Minimum corner speed',exit:'Exit / straight-line acceleration'};
  g.title='Autocross sign-off';
  g.claim={q:`Autocross ${fmtT(ctx.time)} vs the winner ${fmtT(ctx.Rtime)}. Biggest loss is in <b>${A.worst.l}</b> (${A.worst.dt>=0?'+':''}${A.worst.dt.toFixed(2)} s). Where in that sector?`,choices:Object.entries(opts).map(([k,t])=>({t,ok:k===A.cat})),explain:`entry ${A.parts.entry.toFixed(2)} s · mid ${A.parts.mid.toFixed(2)} s · exit ${A.parts.exit.toFixed(2)} s.`};
  g.evidence={q:`Click ${A.worst.l} on the speed trace or the track map.`,ch:'v',i0:A.i0,i1:A.i1,map:true};
  const vl=Math.sqrt(A.lim*G*A.r);g.eq={q:`Apex radius ${f1(A.r)} m, grip limit ${f2(A.lim)} g at that speed. Maximum apex speed in m/s?`,ans:vl,unit:'m/s',concept:'grip',hint:'v = √(a·g·r).'};
  g.fix={choices:['Driving: brake later / carry more apex speed','Downforce / tires for a higher grip ceiling','Gearing / power for the exits','Balance setup (ARB, weight distribution)'],unit:'s',kind:'time'};
  g.rubric=[{l:'Names the corner or sector',f:t=>new RegExp(A.worst.l.replace(/[^\w]/g,''),'i').test(t.replace(/\s/g,''))||/(corner|turn|sector|apex|hairpin|slalom)/i.test(t)},{l:'Mentions speed/grip/braking physics',f:t=>/(speed|grip|brak|μ|mu|downforce|traction|g\b|apex)/i.test(t)}];}
 if(ev==='endu'){const en=ctx.endu;const issue=en.dnf?'dnf':en.maxCool>105?'heat':en.wear>.85?'wear':'energy';
  g.title='Endurance sign-off';
  g.claim={q:`Endurance: ${en.dnf?'DNF — '+en.dnf.why:fmtT(en.time)}. Energy ${f2(en.energy)} kWh, peak coolant ${f0(en.maxCool)}°C, tire wear ${f0(en.wear*100)}%. What decided your endurance?`,choices:[{t:'Reliability (a failure)',ok:issue==='dnf'},{t:'Heat — cooling capacity',ok:issue==='heat'},{t:'Tire wear / temperature',ok:issue==='wear'},{t:'Energy use & pace (efficiency)',ok:issue==='energy'}],explain:`Model: failure risk ${f1(D.failP*100)}%, heat index ${f2(D.heatIdx)}, wear ${f0(en.wear*100)}%.`};
  const n=ctx.L.ch.v.length;let bi=0,bm=-1;for(let j=0;j<n;j++){let s=0;for(let q=Math.max(0,j-15);q<Math.min(n,j+15);q++)s+=(ctx.L.ch.brk[q]||0)*(ctx.L.ch.v[q]||0)**2;if(s>bm){bm=s;bi=j;}}g.evidence={q:'Click the heaviest braking zone of the endurance lap — where the most kinetic energy (½mv²) is thrown away as heat.',ch:'brk',i0:Math.max(0,bi-25),i1:Math.min(n-1,bi+25)};
  const F=en.eW/(22*TR.endu.len);g.eq={q:`Average tractive force F̄ = ${f0(F)} N over ${f1(22*TR.endu.len/1000)} km, efficiency η = ${f2(D.eff)}${D.pw.ev?' (ignore regen)':''}. Energy used (kWh)?`,ans:F*22*TR.endu.len/D.eff/3.6e6,unit:'kWh',concept:'energy',hint:'E = F̄·d/η, 1 kWh = 3.6×10⁶ J.'};
  g.fix={choices:['Bigger / ducted radiator','Harder compound or less camber','Leaner AFR / efficiency tuning','Reliability (QA, safety factors)'],unit:'s',kind:'time'};
  g.rubric=[{l:'Mentions heat, wear, energy or reliability',f:t=>/(heat|cool|temperature|wear|energy|fuel|kwh|efficien|reliab|fail)/i.test(t)},{l:'Mentions laps / distance / time',f:t=>/(lap|km|distance|minute|second|time)/i.test(t)}];}
 if(ev==='season'){const me=ctx.me,top=ctx.top;const loss=Object.keys(MAXP).map(k=>[k,(top.pts[k]||0)-(me.pts[k]||0)]).sort((a,b)=>b[1]-a[1]);const worst=loss[0][0];
  g.title=`Season ${S.season} review`;
  g.claim={q:`You finished P${ctx.place} (${f0(me.total)} pts). Compared with the winner (${top.name}, ${f0(top.total)}), which event cost you the most points?`,choices:loss.slice(0,4).sort(()=>.5-Math.random()).map(([k])=>({t:EVN[k],ok:k===worst})),explain:loss.slice(0,4).map(([k,d])=>`${EVN[k]} −${f1(d)}`).join(' · ')};
  g.evidence={q:`Click the ${EVN[worst]} bar on the points chart.`,bars:loss.map(([k,d])=>({k,d})),pickBar:worst};
  const Ta=ctx.autoxT,Tm=ctx.autoxMin;const Tx=1.45*Tm;g.eq={q:`Autocross points: you ran ${f2(Ta)} s, winner ${f2(Tm)} s, T<sub>max</sub> = 1.45·T<sub>min</sub>. P = 118.5·(T<sub>max</sub>/T − 1)/(T<sub>max</sub>/T<sub>min</sub> − 1) + 6.5. Your points?`,ans:Ta>Tx?6.5:118.5*((Tx/Ta)-1)/((Tx/Tm)-1)+6.5,unit:'pts',concept:'points',hint:'Plug in carefully; T<sub>max</sub>/T<sub>min</sub> = 1.45.'};
  g.fix={choices:['Next season priority: '+EVN[worst],'Next season priority: reliability','Next season priority: mass reduction','Next season priority: aero'],unit:'pts',kind:'points'};
  g.rubric=[{l:'Names an event',f:t=>/(design|cost|business|accel|skid|autocross|autox|endurance|efficien)/i.test(t)},{l:'Says what the next team should change',f:t=>/(next|should|change|improve|upgrade|fix|reduce|increase)/i.test(t)}];}
 return g;}
function runGate(host,g,ctx,onDone){const steps=['Claim','Evidence','Equation','Fix & prediction','Explanation'];let k=0,tries=0;const res={ev:g.ev,title:g.title,season:S.season,steps:[]};sess();
 const head=()=>`<div class="ch-steps big">${steps.map((s,i)=>`<span class="${i<k?'d':i===k?'c':''}">${i+1}. ${s}</span>`).join('')}</div>`;
 const fbH=m=>{const f=host.querySelector('#gFb');if(f)f.innerHTML=m;};
 const next=(r)=>{res.steps.push(r);k++;tries=0;draw();};
 const draw=()=>{let b='';
  if(k===0){b=`<p class="ch-q">${g.claim.q}</p><div class="ch-choices">${g.claim.choices.map((c,i)=>`<button class="btn" data-c="${i}">${c.t}</button>`).join('')}</div>`;}
  if(k===1){b=`<p class="ch-q">${g.evidence.q}</p>${g.evidence.bars?`<canvas id="gBars" width="900" height="240" class="gcv"></canvas>`:`<canvas id="gTr" width="900" height="220" class="gcv"></canvas>${g.evidence.map?'<canvas id="gMap" width="300" height="220" class="gcv" style="width:300px"></canvas>':''}`}`;}
  if(k===2){b=`<p class="ch-q">${g.eq.q}</p><div class="row"><input type="number" step="any" id="gA" style="width:160px"> <span class="mut">${g.eq.unit}</span><button class="btn pri" id="gOk">Check (±10%)</button><button class="btn ghost sm" id="gH">Hint</button></div>`;}
  if(k===3){b=`<p class="ch-q">Pick the change you'll make, and predict its effect. The Chief checks your prediction against the real result next season.</p><div class="ch-choices">${g.fix.choices.map((c,i)=>`<label class="opt2"><input type="radio" name="gfx" value="${i}" ${i===0?'checked':''}> ${c}</label>`).join('')}</div><div class="row" style="margin-top:8px"><span>Predicted change:</span><input type="number" step="any" id="gP" style="width:120px" placeholder="${g.fix.kind==='points'?'+40':'-0.8'}"><span class="mut">${g.fix.unit} (${g.fix.kind==='points'?'+ = more points':'− = faster'})</span><span class="sp"></span><button class="btn pri" id="gFx">Commit</button></div>`;}
  if(k===4){const rub=RUBRIC_COMMON.concat(g.rubric);b=`<p class="ch-q">In your own words: what happened, why (the physics), and what the next team should do. Checked offline against a rubric (need ${Math.min(4,rub.length)}/${rub.length}).</p><textarea id="gT" rows="4" style="width:100%"></textarea><div class="rub">${rub.map((r,i)=>`<span data-r="${i}">○ ${r.l}</span>`).join('')}</div><div class="row" style="margin-top:8px"><span class="sp"></span><button class="btn pri" id="gSub">Submit to the Chief</button></div>`;}
  if(k===5){const sc=res.steps.filter(s=>s.ok).length;b=`<p class="ch-q">Signed off. ${sc}/5 steps first-try.</p><ul class="notes">${res.steps.map((s,i)=>`<li class="${s.ok?'ok':'bad'}">${steps[i]}: ${s.note||''}</li>`).join('')}</ul><div class="row"><span class="sp"></span><button class="btn pri" id="gDone">Continue →</button></div>`;}
  host.innerHTML=chiefShell(g.title,'Mandatory sign-off — the team can\'t move on until the Chief signs.',head()+b+'<div id="gFb" class="ch-fb"></div>');
  host.querySelectorAll('[data-c]').forEach(btn=>btn.onclick=()=>{const c=g.claim.choices[+btn.dataset.c];if(c.ok){fbH(`<div class="hintbox ok">✔ ${g.claim.explain}</div>`);setTimeout(()=>next({ok:tries===0,note:c.t}),800);}else{tries++;btn.disabled=true;fbH(`<div class="hintbox bad">The data doesn't support that. ${tries>1?g.claim.explain:'Look again.'}</div>`);}});
  if(k===1)drawEvidence(host,g,ctx,(ok,i)=>{if(ok){fbH('<div class="hintbox ok">✔ That\'s the evidence.</div>');setTimeout(()=>next({ok:tries===0,note:'evidence located'}),700);}else{tries++;fbH(`<div class="hintbox bad">Not there. ${tries>1?'Hint: the highlighted band appears after 3 tries.':''}</div>`);if(tries>=3)drawEvidence(host,g,ctx,null,true);}});
  const ok=host.querySelector('#gOk');if(ok)ok.onclick=()=>{const v=parseFloat(host.querySelector('#gA').value);if(!isFinite(v))return;const err=Math.abs(v-g.eq.ans)/Math.max(1e-6,Math.abs(g.eq.ans));
   if(err<=.1){master(g.eq.concept,tries===0);fbH(`<div class="hintbox ok">✔ ${f2(g.eq.ans)} ${g.eq.unit} (you: ${f2(v)}).</div>`);setTimeout(()=>next({ok:tries===0,note:`${f2(v)} ${g.eq.unit} (model ${f2(g.eq.ans)})`}),800);}
   else{tries++;fbH(`<div class="hintbox bad">${f2(v)} is ${f0(err*100)}% off. 💡 ${g.eq.hint}${tries>=3?` Expected ≈ ${f2(g.eq.ans)}.`:''}</div>`);if(tries>=4){master(g.eq.concept,false);}}};
  const h=host.querySelector('#gH');if(h)h.onclick=()=>fbH(`<div class="hintbox">💡 ${g.eq.hint}</div>`);
  const fx=host.querySelector('#gFx');if(fx)fx.onclick=()=>{const p=parseFloat(host.querySelector('#gP').value);if(!isFinite(p)){fbH('<div class="hintbox bad">Enter a numeric prediction.</div>');return;}const ch=g.fix.choices[+host.querySelector('input[name=gfx]:checked').value];
   S.predictions=S.predictions||[];S.predictions.push({ev:g.ev,season:S.season,fix:ch,pred:p,base:ctx.base,kind:g.fix.kind,checked:false});save();next({ok:true,note:`${ch} → predicted ${p>0?'+':''}${p} ${g.fix.unit}`});};
  const ta=host.querySelector('#gT');if(ta){const rub=RUBRIC_COMMON.concat(g.rubric);const upd=()=>{const t=ta.value;rub.forEach((r,i)=>{const sp=host.querySelector(`[data-r="${i}"]`);const ok=r.f(t);sp.className=ok?'ok':'';sp.textContent=(ok?'● ':'○ ')+r.l;});};ta.oninput=upd;
   host.querySelector('#gSub').onclick=()=>{const t=ta.value;const n=rub.filter(r=>r.f(t)).length;const need=Math.min(4,rub.length);if(n>=need){res.text=t;S.insight=(S.insight||0)+(n===rub.length?2:1);next({ok:tries===0,note:`rubric ${n}/${rub.length}`});}else{tries++;fbH(`<div class="hintbox bad">Rubric ${n}/${rub.length} — need ${need}. Add what's missing.</div>`);}};}
  const dn=host.querySelector('#gDone');if(dn)dn.onclick=()=>{note({type:'signoff',title:g.title,ev:g.ev,steps:res.steps.map(s=>s.note),text:res.text});S.last.signoffs=S.last.signoffs||[];res.ok=true;onDone&&onDone(res);};};
 host.__solve=()=>{const q=x=>host.querySelector(x);if(k===0){const i=g.claim.choices.findIndex(c=>c.ok);q(`[data-c="${i}"]`).click();}else if(k===1){next({ok:true,note:'evidence located'});}else if(k===2){q('#gA').value=g.eq.ans;q('#gOk').click();}else if(k===3){q('#gP').value=g.fix.kind==='points'?20:-0.3;q('#gFx').click();}else if(k===4){const ta=q('#gT');ta.value='At the slow turn 3 corner apex the car lost 1.2 s because tire grip and traction were limited, so speed suffered; mass and weight force load on the tires plus radius matter. Heat, energy and wear over 22 laps matter too. The next team should change the design, improve the engine power and reduce mass for accel, skidpad, autocross and endurance.';ta.oninput&&ta.oninput();q('#gSub').click();}else if(k===5){q('#gDone').click();}return k;};
 draw();host.__gate=g;return res;}
function drawEvidence(host,g,ctx,cb,reveal){const E=g.evidence;
 if(E.bars){const c=host.querySelector('#gBars');const x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);const n=E.bars.length,bw=(W-40)/n;const mx=Math.max(...E.bars.map(b=>Math.abs(b.d)),1);
  E.bars.forEach((b,i)=>{const h=Math.abs(b.d)/mx*(H-60);x.fillStyle=reveal&&b.k===E.pickBar?'#ffb020':'#3fa9f5';x.fillRect(20+i*bw+6,H-30-h,bw-12,h);x.fillStyle='#c9d3e0';x.font='12px sans-serif';x.textAlign='center';x.fillText(EVN[b.k].slice(0,9),20+i*bw+bw/2,H-12);x.fillText('−'+f1(b.d),20+i*bw+bw/2,H-36-h);});
  x.fillStyle='#8b97a8';x.textAlign='left';x.fillText('Points behind the winner, per event',20,16);
  if(cb)c.onclick=e=>{const r=c.getBoundingClientRect();const X=(e.clientX-r.left)/r.width*W;const i=Math.floor((X-20)/bw);const b=E.bars[i];cb(b&&b.k===E.pickBar,i);};return;}
 const L=ctx.L,c=host.querySelector('#gTr');const x=c.getContext('2d'),W=c.width,H=c.height;const n=L.ch.v.length;const ch=E.ch||'v';
 const arr=L.ch[ch],R=ctx.R;const mx=Math.max(...arr,...(R&&R.ch[ch]?R.ch[ch]:[0]))*1.08||1;const X=i=>30+i/(n-1)*(W-40),Y=v=>H-20-v/mx*(H-40);
 x.clearRect(0,0,W,H);x.fillStyle='#0b1119';x.fillRect(0,0,W,H);
 if(reveal){x.fillStyle='rgba(255,176,32,.25)';x.fillRect(X(E.i0),10,X(E.i1)-X(E.i0),H-30);}
 if(R&&R.ch[ch]){x.strokeStyle='rgba(255,255,255,.4)';x.lineWidth=1.5;x.beginPath();R.ch[ch].forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v)));x.stroke();}
 x.strokeStyle=ch==='brk'?'#ff4d4d':'#4ea1ff';x.lineWidth=2.5;x.beginPath();arr.forEach((v,i)=>i?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v)));x.stroke();
 x.fillStyle='#8b97a8';x.font='12px sans-serif';x.fillText(`${(TCH.find(q=>q.k===ch)||{}).l||ch} vs distance (white = reference)`,34,16);
 for(const z of TR[L.track].zones){if(!z.r)continue;x.fillStyle='rgba(201,211,224,.5)';x.fillText(z.label,X((z.i0+z.i1)/2)-8,H-6);}
 const accept=i=>i>=E.i0-4&&i<=E.i1+4;
 if(cb)c.onclick=e=>{const r=c.getBoundingClientRect();const i=Math.round(((e.clientX-r.left)/r.width*W-30)/(W-40)*(n-1));cb(accept(i),i);};
 const m=host.querySelector('#gMap');if(m){const g2=m.getContext('2d');const pts=TR[L.track].pts;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}const sc=Math.min(260/(x1-x0||1),190/(y1-y0||1));const MX=p=>20+(p.x-x0)*sc,MY=p=>205-(p.y-y0)*sc;
  g2.fillStyle='#0b1119';g2.fillRect(0,0,300,220);g2.lineWidth=5;pts.forEach((p,i)=>{if(!i)return;const q=pts[i-1];g2.strokeStyle=reveal&&i>=E.i0&&i<=E.i1?'#ffb020':'#4b5563';g2.beginPath();g2.moveTo(MX(q),MY(q));g2.lineTo(MX(p),MY(p));g2.stroke();});
  if(cb)m.onclick=e=>{const r=m.getBoundingClientRect();const px=(e.clientX-r.left)/r.width*300,py=(e.clientY-r.top)/r.height*220;let bi=0,bd=1e9;pts.forEach((p,i)=>{const d=(MX(p)-px)**2+(MY(p)-py)**2;if(d<bd){bd=d;bi=i;}});cb(accept(bi),bi);};}}
/* check last season's predictions against this season's actual results */
function checkPredictions(ev,actual){const out=[];for(const p of S.predictions||[]){if(p.checked||p.ev!==ev||p.season!==S.season-1)continue;p.checked=true;const real=p.kind==='points'?actual-p.base:actual-p.base;p.actual=real;
  const sign=Math.sign(real)===Math.sign(p.pred)||Math.abs(real)<.05;const close=Math.abs(real-p.pred)<=Math.max(.5*Math.abs(p.pred),p.kind==='points'?10:.15);const pts=sign&&close?3:sign?1:0;S.insight=(S.insight||0)+pts;p.pts=pts;
  out.push(`Prediction check (${EVN[ev]||ev}): you predicted ${p.pred>0?'+':''}${p.pred} ${p.kind==='points'?'pts':'s'} from "${p.fix}", actual ${real>0?'+':''}${f2(real)} → +${pts} Insight`);note({type:'prediction',title:`Prediction check · ${EVN[ev]||ev}`,text:out[out.length-1]});}
 save();return out;}
/* Chief screen / review panel */
function reviewPanel(host){const due=dueConcepts();const all=Object.keys(CONCEPTS);const D=curD();
 host.innerHTML=chiefShell('Spaced-repetition review',`${due.length} concept(s) due · session ${S.sessions||0}`,`<div class="grid g3">${all.map(k=>{const m=(S.mastery||{})[k];const box=m?m.box:0;return`<div class="ch-card ${due.includes(k)?'due':''}"><div class="row"><b>${CONCEPTS[k].t}</b><span class="sp"></span><span class="lv">${'●'.repeat(box)}${'○'.repeat(5-box)}</span></div><div class="small mut">${CONCEPTS[k].f}</div><div class="row" style="margin-top:6px"><span class="small mut">${m?`seen ${m.seen}, ${m.ok} right`:'not yet seen'}${due.includes(k)?' · <b style="color:#ffb020">due</b>':''}</span><span class="sp"></span><button class="btn sm" data-rv="${k}">Practice</button></div></div>`;}).join('')}</div><div id="rvq" style="margin-top:12px"></div>`);
 host.querySelectorAll('[data-rv]').forEach(b=>b.onclick=()=>{const k=b.dataset.rv;const Q=QB[k](D);const box=host.querySelector('#rvq');let tries=0;sess();
  box.innerHTML=`<div class="card"><h3>${CONCEPTS[k].t}</h3><p>${Q.q}</p><div class="row"><input id="rvA" type="number" step="any" style="width:150px"> <span class="mut">${Q.unit}</span><button class="btn pri" id="rvOk">Check</button></div><div id="rvF"></div></div>`;
  box.querySelector('#rvOk').onclick=()=>{const v=parseFloat(box.querySelector('#rvA').value);if(!isFinite(v))return;const ok=Math.abs(v-Q.ans)/Math.max(1e-6,Math.abs(Q.ans))<=Q.tol;if(ok||tries>=1){master(k,ok&&tries===0);box.querySelector('#rvF').innerHTML=`<div class="hintbox ${ok?'ok':'bad'}">${ok?'✔':'✖'} ${f2(Q.ans)} ${Q.unit}. ${CONCEPTS[k].d}</div>`;setTimeout(()=>reviewPanel(host),1600);}else{tries++;box.querySelector('#rvF').innerHTML=`<div class="hintbox bad">💡 ${Q.hint}</div>`;}};});}
