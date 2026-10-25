'use strict';
/* ================= "WHY?" CARDS — physics + a live worked example with YOUR numbers ================= */
const WHY={
 tune:{
  wb:D=>({t:'Wheelbase',p:`Yaw inertia and turning radius scale with wheelbase L. Steering geometry: R ≈ L/δ. A longer car needs more steering for the same radius and is slower to rotate in hairpins, but more stable at speed.`,ex:`Your L = ${D.t.wb} mm → tight-corner factor ${f2(D.tight)} (1.00 at the 1525 mm rule minimum).`}),
  fw:D=>({t:'Weight distribution',p:`Static rear load share sets drive traction: F<sub>x,max</sub> = μ·m·g·(rear share). Too much rear weight makes the rear axle saturate first in corners (oversteer).`,ex:`${D.t.fw}% front → rear traction share ${f0(D.rear*100)}% → F<sub>x,max</sub> = ${f2(D.mu)}·${f0(D.m)}·9.81·${f2(D.rear)} = <b>${f0(D.mu*D.m*G*D.rear)} N</b>.`}),
  rh:D=>({t:'Ride height & ground effect',p:`The diffuser accelerates air under the car; lower = faster flow = lower pressure (Bernoulli) — until the gap gets so small the flow chokes and separates.`,ex:`Static ${D.t.rh} mm → under load ${f0(D.am.rhDyn||D.t.rh)} mm; diffuser factor ${D.am.parts&&D.am.parts[0]?f2(D.am.parts[0].f):'—'}${D.am.bottoming?' — <b style="color:#ff6b63">bottoming</b>':''}.`}),
  fd:D=>({t:'Final drive',p:`Wheel force F = T·i·η/r and road speed v = ω<sub>engine</sub>·r/i. Short ratio (big i) = force; tall = top speed. Ideal: hit the limiter at the end of the longest straight.`,ex:`i = ${D.t.fd} → top gear runs out at <b>${spd1(D.vGear)}</b>; power-limited top speed ${spd1(D.vPow)} → ${D.gearLimited?'gear-limited — lengthen the ratio for top speed':'power-limited'}.`}),
  arb:D=>({t:'Anti-roll bar balance',p:`Lateral load transfer is fixed by mass, CG height and track (ΔW = m·a·h/t), but its front/rear split follows roll stiffness. The axle with more load transfer loses grip first (tire load sensitivity).`,ex:`ARB ${D.t.arb} contributes ${f1(D.t.arb*.5)} to balance index ${f1(D.bal)} (${Math.abs(D.bal)<1.5?'neutral':D.bal>0?'understeer':'oversteer'}).`}),
  psi:D=>({t:'Tire pressure',p:`Pressure sets contact-patch size (A ≈ F<sub>z</sub>/p) and carcass heating. Each compound has a pressure where the patch is flat and temperature lands in the window.`,ex:`${D.t.psi} psi vs sweet spot ≈ ${D.ti.psi} psi → pressure grip factor ${f3(D.muParts.pF)}.`}),
  camber:D=>({t:'Camber',p:`Body roll tilts the outside tire; static negative camber pre-tilts it so the patch is flat at mid-corner. Too much and the inner edge overheats.`,ex:`${D.t.camber}° vs ≈ −1.8° optimum → camber factor ${f3(D.muParts.cF)}.`}),
  reinf:D=>({t:'Chassis reinforcement',p:`Torsional stiffness K (Nm/°) lets springs and ARBs control load transfer. A floppy chassis is an undamped spring in series — aero load makes it worse.`,ex:`K = ${f0(D.K)} Nm/° vs need ≈ ${f0(1400+350*D.ClA)} for your C<sub>L</sub>A ${f2(D.ClA)} → ${D.flex?'<b style="color:#ff6b63">flexing</b>':'stiff enough'}.`}),
  runner:D=>D.ice?({t:'Intake runner (Helmholtz)',p:`The runner+plenum is a Helmholtz resonator: f<sub>H</sub> = (c/2π)·√(A/(V·L<sub>eff</sub>)). Peak ram effect when the intake pulse frequency matches: n<sub>H</sub> ≈ 60·f<sub>H</sub>/1.78 rpm.`,ex:`L<sub>eff</sub> = ${f0(D.em.Leff*1000)} mm, A = ${f0(D.em.A*1e6)} mm², V = ${f2(D.em.V*1000)} L → f<sub>H</sub> = ${f0(D.em.fH)} Hz → <b>${f0(D.em.nH)} rpm</b>.`}):({t:'Intake runner',p:'Not applicable to an EV.',ex:''})},
 eng:k=>D=>{if(!D.ice)return{t:ENG_LAB[k],p:'EV — no combustion engine parameters.',ex:''};const e=D.em,E=e.e;const M={
  ivo:['Intake valve opening','Earlier opening adds overlap: at high rpm the exhaust pulse scavenges the cylinder; at low rpm it pushes exhaust back into the intake.'],
  ivc:['Intake valve closing','Late closing uses the intake charge\'s inertia to keep filling after BDC — great at high rpm, but at low rpm the piston pushes charge back out.'],
  evo:['Exhaust valve opening','Opening early releases pressure before BDC (less pumping work) but wastes expansion work.'],
  evc:['Exhaust valve closing','Sets overlap with IVO; more overlap = peakier engine.'],
  lift:['Valve lift','Flow area ≈ π·d·L until L ≈ d/4; beyond that, more lift mostly adds spring load (valve float risk).'],
  cr:['Compression ratio','Otto efficiency η = 1 − 1/r<sup>γ−1</sup>. Higher r = more efficiency, until the end-gas autoignites (knock).'],
  ign:['Ignition advance','Peak pressure should land ≈ 15° ATDC (MBT). Too early → knock; too late → work lost.'],
  afr:['Air-fuel ratio','Stoichiometric gasoline is 14.7:1. Max power ≈ 12.8:1 (rich, uses all the air); lean saves fuel but runs hot and knocks.'],
  plenum:['Plenum volume','The plenum is the Helmholtz "bottle" and a reservoir past the restrictor: larger V lowers f<sub>H</sub> and smooths flow.'],
  runnerD:['Runner diameter','Bigger A raises f<sub>H</sub> and flow, but slows the air (less ram inertia at low rpm).'],
  exhL:['Exhaust primary length','The reflected expansion wave returns after 2L/c. Arriving during overlap it sucks the cylinder clean. Tuned rpm ∝ 1/L.'],
  exhD:['Exhaust primary diameter','Smaller = faster gas, stronger pulses at low rpm; larger = less back-pressure at high rpm.'],
  redline:['Rev limit','Power = torque·ω — revs are power, until the valve springs can\'t keep up (valve float).']}[k];
  const live={ivo:`overlap ${f0(e.ovl)}°, cam VE peak ${f0(e.nCam)} rpm`,ivc:`intake duration ${f0(e.dur)}°, cam VE peak ${f0(e.nCam)} rpm`,evo:`exhaust tuned ${f0(e.nE)} rpm`,evc:`overlap ${f0(e.ovl)}°`,lift:`valve float at ${f0(e.nFloat)} rpm (limit ${E.redline})`,
   cr:`r = ${E.cr}: η<sub>Otto</sub> = 1 − 1/${E.cr}<sup>0.3</sup> = ${f3(1-1/Math.pow(E.cr,.3))}; knock index ${f2(e.knock)}`,ign:`${E.ign}° vs MBT ≈ ${e.MBT}° → ignition factor ${f3(e.ignF)}; knock index ${f2(e.knock)}`,afr:`AFR ${E.afr} → power factor ${f3(e.afrF)}, fuel factor ${f2(e.fuelF)}`,
   plenum:`V = ${E.plenum} L → n<sub>H</sub> = ${f0(e.nH)} rpm`,runnerD:`A = ${f0(e.A*1e6)} mm² → n<sub>H</sub> = ${f0(e.nH)} rpm`,exhL:`L = ${E.exhL} mm → tuned at <b>${f0(e.nE)} rpm</b> (intake at ${f0(e.nH)})`,exhD:`D = ${E.exhD} mm (optimum ≈ ${f0(e.dOpt)} mm)`,redline:`${E.redline} rpm vs float ${f0(e.nFloat)} rpm ${e.floats?'— <b style="color:#ff6b63">floats!</b>':''}`}[k];
  return{t:M[0],p:M[1],ex:`Your engine: ${live}. Peak ${f1(D.kW)} kW @ ${e.peakN} rpm.`};},
 aero:k=>D=>{const a=D.am;const isF=k.startsWith('fw');const w=isF?a.fw:a.rw;if(!w)return{t:AERO_LAB[k],p:'Needs the wing package.',ex:''};
  return{t:AERO_LAB[k],p:k.endsWith('El')?`More elements = slots that re-energise the boundary layer: higher C<sub>L</sub> slope and a later stall (≈ 12° + 7° per extra element), at the cost of drag.`:`Lift grows linearly with angle of attack, C<sub>L</sub> = C<sub>L0</sub> + a·α, until the stall angle — then the flow separates and lift collapses while drag explodes.`,
   ex:`${isF?'Front':'Rear'} wing: C<sub>L</sub> ${f2(w.cl)}, C<sub>D</sub> ${f2(w.cd)}, stall at ${f1(w.stall)}°, margin <b>${f1(w.margin)}°</b>${w.stalled?' — <b style="color:#ff6b63">STALLED</b>':''}. Car C<sub>L</sub>A ${f2(D.ClA)}, CoP balance ${f1(D.abal)}% front vs CG ${D.t.fw}%.`};},
 sus:k=>D=>{const s=D.sm;if(k==='zeta')return{t:'Damping ratio ζ',p:`ζ = c / (2√(k·m)). ζ ≈ 0.65–0.7 settles a bump fastest without overshoot; low ζ bounces, high ζ crashes over bumps.`,ex:`ζ = ${D.sm.s.zeta}: critical damping c<sub>c</sub> = 2√(k·m) = ${f0(s.cc)} N·s/m (front).`};
  const F=k==='kf';return{t:F?'Front wheel rate':'Rear wheel rate',p:`Natural frequency f = (1/2π)·√(k/m). Aero cars run stiffer (≈ 3–4 Hz) so downforce doesn't crush the ride height; soft cars keep the tire in contact over bumps.`,
   ex:`k = ${F?s.s.kf:s.s.kr} N/mm, sprung corner mass m = ${f1(F?s.mf:s.mr)} kg → f = (1/2π)·√(${(F?s.s.kf:s.s.kr)*1000}/${f1(F?s.mf:s.mr)}) = <b>${f2(F?s.fnF:s.fnR)} Hz</b> (target ≈ ${f2(s.fopt)} Hz for C<sub>L</sub>A ${f2(D.ClA)}).`};},
 mat:k=>D=>{const c=D.st.c[k];return{t:COMPS[k].n,p:`Stress σ = F/A (axial) or M·c/I (bending), T·r/J (torsion). Safety factor SF = σ<sub>yield</sub>/σ. Fatigue: cyclic stress must stay under the endurance limit (≈ ${f0(c.M.fat*100)}% of UTS for ${c.M.n}).`,ex:`${c.M.n}: σ = ${f0(c.sig)} MPa vs yield ${c.M.sy} MPa → SF <b>${f2(c.sf)}</b>, mass ${f2(c.mass)} kg, fatigue ratio ${f2(c.FF)}, P(fail) ${f1(c.pf*100)}%. ${c.info||''}`};}
};
function f3(v){return(+v).toFixed(3);}
/* sensitivity: nudge the parameter and re-derive — a live worked example of cause → effect */
function whySens(group,key,comp){const car=deep(S.car);const D0=derive(car,S.rd);let lab='';
 const bump=(o,k,rng)=>{const st=rng[2],v=o[k];o[k]=+clamp(v+st*(rng[2]>=1?1:Math.max(1,Math.round(.05*(rng[1]-rng[0])/st))),rng[0],rng[1]).toFixed(3);lab=`${v} → ${o[k]}`;};
 if(group==='tune'){const t=TUNE.find(x=>x.k===key);car.tune[key]=+clamp(car.tune[key]+t.st*Math.max(1,Math.round((t.max-t.min)*.04/t.st)),t.min,t.max).toFixed(3);lab=`${S.car.tune[key]} → ${car.tune[key]}`;}
 if(group==='eng'){const id=car.parts.power;car.eng=car.eng||{};const e=Object.assign({},carEng(car));bump(e,key,ENG_RANGE[key]);car.eng[id]=e;}
 if(group==='aero'){const a=Object.assign({},carAero(car));bump(a,key,AERO_RANGE[key]);car.aero=a;}
 if(group==='sus'){const s=Object.assign({},carSus(car));bump(s,key,SUS_RANGE[key]);car.sus=s;}
 if(group==='mat'){const m=carMat(car);const d=m[comp];const dk=COMPS[comp].dims;const kk=Object.keys(dk)[0];bump(d,kk,dk[kk]);car.mat=m;}
 const D1=derive(car,S.rd);const T0=perfIndex(D0),T1=perfIndex(D1);
 const rows=[['Autocross lap',f2(T0)+' s',f2(T1)+' s',T1-T0,'s',-1],['Power',f1(D0.kW)+' kW',f1(D1.kW)+' kW',D1.kW-D0.kW,'kW',1],['Grip μ',f3(D0.mu),f3(D1.mu),D1.mu-D0.mu,'',1],['C<sub>L</sub>A',f2(D0.ClA),f2(D1.ClA),D1.ClA-D0.ClA,'m²',1],['C<sub>D</sub>A',f2(D0.CdA),f2(D1.CdA),D1.CdA-D0.CdA,'m²',-1],['Mass',f1(D0.massCar)+' kg',f1(D1.massCar)+' kg',D1.massCar-D0.massCar,'kg',-1],['Min SF',f2(D0.sf),f2(D1.sf),D1.sf-D0.sf,'',1],['Failure risk',f1(D0.failP*100)+'%',f1(D1.failP*100)+'%',D1.failP-D0.failP,'',-1]].filter(r=>Math.abs(r[3])>1e-4);
 return{lab,rows,T0,T1};}
function openWhy(group,key,comp){const D=curD();const f=group==='tune'?WHY.tune[key]:WHY[group](comp||key);const w=f(D);const s=whySens(group,key,comp);
 $('#modal').innerHTML=`<div class="modal"><div class="box" style="max-width:640px"><div class="small mut">WHY? · live worked example</div><h2 style="margin-top:4px">${w.t}</h2><p>${w.p}</p>${w.ex?`<div class="phys">${w.ex}</div>`:''}
 <h3>What if you nudge it? (${s.lab})</h3>${s.rows.length?`<table><tr><th></th><th>Now</th><th>After</th><th>Δ</th></tr>${s.rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="${r[3]*r[5]>0?'up':'dn'}">${r[3]>0?'+':''}${Math.abs(r[3])<.01?r[3].toExponential(1):f2(r[3])} ${r[4]}</td></tr>`).join('')}</table>`:'<p class="mut small">No measurable effect at this setting — the model says this parameter isn\'t your limiter right now.</p>'}
 <div class="row" style="margin-top:12px"><span class="small mut">Numbers are re-computed from your current car every time you open this card.</span><span class="sp"></span><button class="btn pri" id="whyX">Got it</button></div></div></div>`;
 $('#whyX').onclick=()=>$('#modal').innerHTML='';
 S.whySeen=(S.whySeen||0)+1;}
function whyBtn(group,key,comp){return`<button class="why" title="Why? — physics & live example" data-why="${group}|${key}|${comp||''}">?</button>`;}
function bindWhy(root){root.querySelectorAll('[data-why]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();const[g,k,c]=b.dataset.why.split('|');openWhy(g,k,c||null);});}
