/* ================= CHALLENGES ================= */
const TESTS={
 flow:{l:'Flow Ring — 3 flying laps',d:'Turn 3 min speed & back-straight top speed',track:'flow'},
 endu22:{l:'Endurance Loop — 22 laps',d:'Energy use, temps, wear over a full endurance',track:'endu'},
 endu100:{l:'Endurance Loop — long tire run',d:'Drive 2 laps, then time-accelerated until the target or tires are gone',track:'endu'},
 drag:{l:'0–60 mph strip',d:'Standing start acceleration run',track:'drag'},
 brake:{l:'60–0 mph brake test',d:'Straight-line stopping distance',track:null},
 skid:{l:'Skidpad practice',d:'Steady-state cornering',track:'skid'},
 autox:{l:'Autocross practice',d:'One timed lap of the autocross',track:'autox'},
 rig:{l:'Torsion rig',d:'Chassis torsional stiffness & mass',track:null},
 dyno:{l:'Engine dyno',d:'Torque curve & peak-torque rpm',track:null},
 aero:{l:'Coast-down / aero map',d:'Downforce, drag & aero balance',track:null}
};
const CH={
 t3:{giver:'Sponsor · Velocity Dynamics',test:'flow',hi:true,unit:'mph',
  title:c=>`${c.target} mph through Turn 3`,
  desc:c=>`Hold ≥ ${c.target} mph minimum speed through the 45 m-radius Turn 3 sweeper on the Flow Ring.`,
  val:d=>d.t3*MPH,
  phys:(D,c,u)=>{const v=c.target/MPH,r=45,mu=D.mu*u,a=v*v/r;const need=(1-mu*G*r/(v*v))*2*D.m/(mu*RHO*r);
   return `Steady-state cornering with downforce:<br><code>m v²/r = μ (m g + ½ ρ C<sub>L</sub>A v²)</code><br><code>⇒ v² = μ g r / (1 − μ ρ C<sub>L</sub>A r / 2m)</code><br>Target: ${both(v)} at r = 45 m ⇒ needs ${f1(a)} m/s² (${f2(a/G)} g) lateral.<br>Your car: μ<sub>eff</sub> = ${f2(mu)}, C<sub>L</sub>A = ${f2(D.ClA)} m², m = ${f0(D.m)} kg ⇒ predicted v<sub>max</sub> = ${both(Math.min(cornerV(D,1/45,u,1),D.vGear))}${D.vGear<cornerV(D,1/45,u,1)?' (gear-limited!)':''}.<br>With your μ you need C<sub>L</sub>A ≥ <b>${need>0?f2(need):'0'} m²</b>${need>8?' — not realistic; raise μ too':''}.`},
  math:(D,c,u)=>{const mu=D.mu*u;return{q:`Using μ<sub>eff</sub> = ${f2(mu)}, C<sub>L</sub>A = ${f2(D.ClA)} m², m = ${f0(D.m)} kg, r = 45 m, g = 9.81, ρ = 1.225 — what is the maximum steady-state speed through Turn 3, in m/s?`,ans:cornerV(D,1/45,u,1),tol:.04,unit:'m/s',hints:['What force has to point toward the center of the turn, and what provides it?','The tires supply μ × normal load — and the normal load is weight plus downforce: N = m g + ½ ρ C<sub>L</sub>A v².','Set m v²/r = μ N and solve for v²: v² = μ g r / (1 − μ ρ C<sub>L</sub>A r / 2m). Then take the square root.']}},
  reward:{cash:4000,tech:3,rep:3}},
 vmax:{giver:'Chief Engineer',test:'flow',hi:true,unit:'mph',
  title:c=>`${c.target} mph on the back straight`,desc:c=>`Reach ≥ ${c.target} mph on the Flow Ring's 300 m back straight.`,val:d=>d.vmax*MPH,
  phys:(D,c)=>{const v=c.target/MPH;const P=.5*RHO*D.CdA*v**3+.015*D.m*G*v;return `Power balance at top speed:<br><code>P = ½ ρ C<sub>D</sub>A v³ + C<sub>rr</sub> m g v</code> &nbsp; and gearing caps <code>v ≤ v<sub>rev-limit</sub> / FD</code><br>Target ${both(v)} needs ≥ <b>${f1(P/1000)} kW</b> at the wheels with your C<sub>D</sub>A = ${f2(D.CdA)} m² — you have ${f1(D.kW)} kW.<br>Gear-limited top speed at FD ${D.t.fd}: ${both(D.vGear)}. A 300 m straight may not be long enough to reach either limit.`},
  math:D=>({q:`Ignoring rolling resistance, with P = ${f1(D.kW)} kW and C<sub>D</sub>A = ${f2(D.CdA)} m² (ρ = 1.225), what is the power-limited top speed in m/s?`,ans:Math.cbrt(2*D.kW*1000/(RHO*D.CdA)),tol:.04,unit:'m/s',hints:['At top speed, all engine power goes into overcoming drag. What is drag force × speed?','Drag force is ½ ρ C<sub>D</sub>A v², so drag power is ½ ρ C<sub>D</sub>A v³.','v = (2P / (ρ C<sub>D</sub>A))<sup>1/3</sup> — remember P in watts.']}),
  reward:{cash:2500,tech:2,rep:1}},
 tire100:{giver:'Tire Partner · GripCo',test:'endu100',hi:true,unit:'laps',
  title:c=>`Tires last ${c.target} laps${c.aux==='soft'?' (soft compound)':''}`,desc:c=>`On the Endurance Loop, run ${c.target} laps before tire wear reaches 100%${c.aux==='soft'?', using a soft compound':''}. Drive 2 laps, then the sim time-accelerates using your lap as the reference.`,
  val:d=>d.lapsTo100,ok:(D,c)=>c.aux!=='soft'||D.ti.id[0]==='s',
  phys:(D,c,u,last)=>`Wear model: <code>wear/lap ∝ E<sub>slip</sub> · k<sub>compound</sub> · f(T) · f(camber)</code>, with <code>E<sub>slip</sub> = Σ (a/g)² · Δs</code> — harder cornering & braking scrub more rubber.<br>Temperature: tires heat with slip energy per second and low pressure; above the window (${D.ti.win[0]}–${D.ti.win[1]} °C for ${D.ti.name}) wear accelerates ~${f0(100/12)}%/°C.<br>Target: ≤ ${f2(100/c.target)}% wear per lap.${last?` Last run: ${f2(last.wl*100)}%/lap at ${f0(last.tireT)} °C.`:''}<br>Levers: compound, pressure, camber, suspension, driver style (conservative scrubs less).`,
  math:(D,c,u,last)=>{const w=last?last.wl*100:1;return{q:`Your steady-state wear was ${f2(w)}% per lap. Assuming it stays constant, how many laps until the tires reach 100%?`,ans:100/w,tol:.03,unit:'laps',hints:['Wear accumulates linearly if every lap is the same.','Total budget is 100%. How many chunks of '+f2(w)+'% fit?','laps = 100 / (wear % per lap). Bonus thought: why would real wear accelerate near the end?']}},
  reward:{cash:3500,tech:3,rep:2}},
 energy:{giver:'Sustainability Sponsor · VoltWorks',test:'endu22',hi:false,unit:'kWh',
  title:c=>`Endurance on < ${c.target} kWh`,desc:c=>`Complete a 22-lap endurance (test or competition) using less than ${c.target} kWh of fuel/battery energy (gasoline = 8.9 kWh/L).`,val:d=>d.energy,
  phys:(D,c)=>`Energy = work at the wheels / drivetrain efficiency:<br><code>E = (Σ F<sub>tractive</sub>·Δs) / η</code> &nbsp; EV: minus ~25% regen of braking energy.<br>Your η = ${D.eff} (${D.pw.ev?'battery→wheel':'fuel→wheel'}). Target ${c.target} kWh ${D.ice?`= ${f2(c.target/8.9)} L gasoline`:''}.<br>Levers: mass (less to accelerate), drag (C<sub>D</sub>A ${f2(D.CdA)}), efficient powertrain, smoother driving.`,
  math:(D,c,u,last)=>{const F=last?last.F:300;return{q:`On your run the average tractive force was ${f0(F)} N over 22 km, with drivetrain efficiency η = ${D.eff}. Ignoring regen, how much energy (kWh) was drawn?`,ans:F*22000/D.eff/3.6e6,tol:.03,unit:'kWh',hints:['Work = force × distance. What are the units?','W = '+f0(F)+' N × 22,000 m gives joules at the wheel. Divide by η for energy from the tank/battery.','1 kWh = 3.6 × 10⁶ J.']}},
  reward:{cash:3000,tech:2,rep:2}},
 zero60:{giver:'Chief Engineer',test:'drag',hi:false,unit:'s',
  title:c=>`0–60 mph under ${c.target} s`,desc:c=>`Standing start to 60 mph (26.8 m/s) in under ${c.target} s.`,val:d=>d.z60,
  phys:D=>{const a=D.mu*G*D.rear*1.2;return `Two limits fight: <code>a<sub>traction</sub> = μ g · W<sub>rear</sub>(+transfer)</code> and <code>a<sub>power</sub> = P / (m v)</code>.<br>Your traction limit ≈ ${f1(a)} m/s² (${f2(a/G)} g); power limit at 20 m/s ≈ ${f1(D.kW*1000/(D.mEff*20))} m/s².<br>Crossover speed v = P/(m·a<sub>t</sub>) ≈ ${both(D.kW*1000/(D.mEff*a))}. Final drive (${D.t.fd}) sets the low-speed torque knee; gear top ${both(D.vGear)} must exceed 60 mph!`},
  math:D=>{const a=D.mu*G*D.rear*1.2;return{q:`If the car could hold its traction-limited acceleration a = ${f2(a)} m/s² all the way, how long would 0–60 mph (26.82 m/s) take, in seconds?`,ans:26.822/a,tol:.03,unit:'s',hints:['Constant acceleration: how do v, a and t relate?','v = a·t.','t = 26.82 / '+f2(a)+'. Why is the real time longer?']}},
  reward:{cash:2500,tech:2,rep:1}},
 brake:{giver:'Safety Officer',test:'brake',hi:false,unit:'ft',
  title:c=>`60–0 mph in < ${c.target} ft`,desc:c=>`Stop from 60 mph in under ${c.target} ft (${f1(c.target/FT)} m).`,val:d=>d.b60*FT,
  phys:D=>{const a=Math.min(D.mu*.97,D.brake);return`Stopping distance: <code>d = v² / (2 a)</code>, with <code>a = min(μ<sub>tire</sub>, brake capacity)·g</code> (+ drag & downforce help at speed).<br>Your tire limit ${f2(D.mu*.97)} g vs brake capacity ${f2(D.brake)} g ⇒ ${D.brake<D.mu*.97?'<b>brake-limited</b>':'tire-limited'}.<br>Flat estimate: ${f1(26.822**2/(2*a*G))} m = ${f0(26.822**2/(2*a*G)*FT)} ft.`},
  math:D=>{const a=Math.min(D.mu*.97,D.brake);return{q:`Using a constant deceleration of ${f2(a)} g (ignore aero), what is the 60–0 mph (26.82 m/s) stopping distance in metres?`,ans:26.822**2/(2*a*G),tol:.03,unit:'m',hints:['Which kinematic equation links v, a and distance with no time?','v² = v₀² − 2 a d with v = 0.','d = v₀² / (2 a), and a = '+f2(a)+' × 9.81 m/s².']}},
  reward:{cash:2000,tech:2,rep:1}},
 stiff:{giver:'Chief Engineer',test:'rig',hi:true,unit:'Nm/°',
  title:c=>`Torsional stiffness ≥ ${c.target} Nm/° under ${c.aux} kg`,desc:c=>`Chassis torsional stiffness ≥ ${c.target} Nm/° with car mass (no driver) ≤ ${c.aux} kg.`,val:d=>d.K,ok:(D,c)=>D.massCar<=c.aux,
  phys:(D,c)=>`<code>K = T / θ</code> (torque per degree of twist). Rule of thumb: K ≥ 1400 + 350·C<sub>L</sub>A so the suspension, not the frame, controls the tires.<br>Yours: K = ${f0(D.K)} Nm/°, mass ${f1(D.massCar)} kg (limit ${c.aux}). Reinforcement adds ~0.4×K<sub>base</sub> for 8 kg; material choice moves both.`,
  math:D=>({q:`The torsion rig applies 1000 Nm. With K = ${f0(D.K)} Nm/°, how many degrees will the chassis twist?`,ans:1000/D.K,tol:.03,unit:'°',hints:['Stiffness is torque per unit twist.','K = T/θ → rearrange for θ.','θ = 1000 / '+f0(D.K)+'.']}),
  reward:{cash:2500,tech:2,rep:1}},
 safety:{giver:'Safety Officer',test:'comp',hi:true,unit:'',
  title:c=>`Zero failures, SF ≥ 1.5, ≤ ${c.aux} kg`,desc:c=>`Finish competition endurance with no failures, safety factor ≥ 1.5 and car mass ≤ ${c.aux} kg.`,val:d=>d.safe?1:0,
  phys:(D,c)=>`<code>SF = σ<sub>yield</sub> / σ<sub>working</sub></code>. Failure risk in this sim scales ≈ (1.5/SF)<sup>2.2</sup> × part wear × heat.<br>Yours: SF ${f2(D.sf)}, mass ${f1(D.massCar)} kg (limit ${c.aux}), endurance reliability ${f1(D.rel*100)}%. Fresh parts and good cooling matter as much as SF.`,
  math:()=>({q:'4130 steel has σ<sub>yield</sub> ≈ 435 MPa. What is the maximum allowable working stress (MPa) for a safety factor of 1.5?',ans:290,tol:.02,unit:'MPa',hints:['SF compares what the material can take to what you ask of it.','SF = σ_yield / σ_working.','σ_working = 435 / 1.5.']}),
  reward:{cash:3000,tech:2,rep:3}},
 rpm:{giver:'Powertrain Lead',test:'dyno',hi:true,unit:'rpm',ice:1,
  title:c=>`Peak torque at ${c.target} rpm (±250)`,desc:c=>`Tune the intake (runner length & diameter, plenum), exhaust primaries and cam so peak torque lands within ±250 rpm of ${c.target}. ICE only.`,val:(d,c)=>d.rpm?250-Math.abs(d.rpm-c.target):0,prog:(d,c)=>d.rpm?clamp(1-Math.max(0,Math.abs(d.rpm-c.target)-250)/3000,0,1):0,
  phys:(D,c)=>D.ice?`Helmholtz intake resonance: <code>f<sub>H</sub> = (c / 2π)·√(A / (L·V))</code>, tuned rpm ≈ <code>60·f<sub>H</sub> / 1.78</code>.<br>Yours: A = ${f1(D.em.A*1e6)} mm² (Ø${D.em.e.runnerD} mm), L<sub>eff</sub> = ${f0(D.em.Leff*1000)} mm, V = ${f0(D.em.V*1e6)} cm³ ⇒ f<sub>H</sub> = ${f0(D.em.fH)} Hz ⇒ <b>${f0(D.em.nH)} rpm</b>.<br>Exhaust wave tuning <code>N = 850·(180+EVO)/(L<sub>in</sub>+3)</code> = ${f0(D.em.nE)} rpm. Cam VE peak ≈ ${f0(D.em.nCam)} rpm. Measured torque peak: <b>${f0(D.rpmPeak)} rpm</b>.`:'<b>Requires an ICE powertrain.</b>',
  math:(D,c)=>D.ice?({q:`Your intake runner is Ø${D.em.e.runnerD} mm with effective length ${f0(D.em.Leff*1000)} mm, and the mean cylinder volume is ${f0(D.em.V*1e6)} cm³. Using c = 343 m/s, what is the Helmholtz frequency f<sub>H</sub> in Hz?`,ans:D.em.fH,tol:.05,unit:'Hz',hints:['A Helmholtz resonator is a mass of air (in the runner) bouncing on a spring of air (the cylinder).','f = (c/2π)·√(A/(L·V)) — get A from the diameter: A = π d²/4, and put everything in metres.','A = '+f1(D.em.A*1e6)+' mm² = '+(D.em.A).toExponential(3)+' m², L = '+f2(D.em.Leff)+' m, V = '+(D.em.V).toExponential(3)+' m³.']}):({q:'n/a',ans:1,tol:1,unit:'',hints:['','','']}),
  reward:{cash:2000,tech:3,rep:1}},
 aerobal:{giver:'Aero Lead',test:'aero',hi:true,unit:'%',
  title:()=>'Aero balance within 2% of weight distribution',desc:()=>'With downforce fitted, place the centre of pressure so aero balance (front %) is within ±2% of front weight distribution — then balance doesn\'t shift with speed.',val:d=>d.cla>0?2-Math.abs(d.abal-d.fw):-9,prog:d=>d.cla>0?clamp(1-Math.max(0,Math.abs(d.abal-d.fw)-2)/15,0,1):0,
  phys:D=>`Centre of pressure: <code>x<sub>cp</sub> = Σ(C<sub>L</sub>A<sub>i</sub>·x<sub>i</sub>) / ΣC<sub>L</sub>A<sub>i</sub></code>, front share = (L − x<sub>cp</sub>)/L. Move it with front/rear wing angles. If it differs from static weight distribution, the car's handling changes as downforce grows with v².<br>${D.ClA>0?`Yours: aero ${f1(D.abal)}% vs weight ${D.t.fw}% (Δ ${f1(D.abal-D.t.fw)}%). Downforce at 20 m/s: ${f0(.5*RHO*D.ClA*400)} N.`:'<b>No downforce fitted — add an undertray or wings.</b>'}`,
  math:D=>({q:`At 20 m/s your car makes F = ½ ρ C<sub>L</sub>A v² with C<sub>L</sub>A = ${f2(D.ClA||1)} m². With ${f1(D.abal)}% aero balance, how many newtons act on the front axle?`,ans:.5*RHO*(D.ClA||1)*400*D.abal/100,tol:.03,unit:'N',hints:['First compute total downforce.','F = 0.5 × 1.225 × '+f2(D.ClA||1)+' × 20².','Multiply by the front share ('+D.abal+'%).']}),
  reward:{cash:2000,tech:2,rep:1}}
};
function makeChallenge(key,season,multi){
 const c={id:key+'-'+season+'-'+Math.floor(Math.random()*1e5),key,issued:season,seasons:multi||1,left:multi||1,status:'open',best:null,inherited:false};
 const s=season;
 if(key==='t3')c.target=s<=2?75:80;
 if(key==='vmax')c.target=Math.min(95,84+2*(s-1));
 if(key==='tire100'){c.target=s<=2?100:70;if(s>=3)c.aux='soft';}
 if(key==='energy')c.target=Math.max(20,48-4*(s-1));
 if(key==='zero60')c.target=+Math.max(2.6,3.6-.12*(s-1)).toFixed(2);
 if(key==='brake')c.target=Math.max(60,80-3*(s-1));
 if(key==='stiff'){c.target=2400+250*(s-1);c.aux=215-4*(s-1);}
 if(key==='safety')c.aux=Math.max(190,222-4*(s-1));
 if(key==='rpm'){const ice=S&&S.car?S.car.parts.power:'i4';c.target=(ice==='single'?[6500,7000,7500,8000]:[8500,9000,9500,10500])[hash(season+'r')%4];}
 return c;
}
function genChallenges(season,carried,car){
 const out=carried.slice();const have=new Set(out.map(c=>c.key));
 if(season===1){for(const[k,m]of[['t3',2],['tire100',2],['zero60',1],['brake',1]])if(!have.has(k)){out.push(makeChallenge(k,1,m));have.add(k);}return out;}
 const ice=!!part('power',car.parts.power).ice;
 const pool=Object.keys(CH).filter(k=>!have.has(k)&&(!CH[k].ice||ice));
 const rng=mulberry(hash('ch'+season+(S?S.legacyId:'')));
 pool.sort(()=>rng()-.5);
 let multiDone=out.some(c=>c.seasons>1&&!c.inherited);
 while(out.length<5&&pool.length){const k=pool.shift();const m=!multiDone&&['t3','tire100','energy','safety','stiff'].includes(k)?2:1;if(m>1)multiDone=true;out.push(makeChallenge(k,season,m));}
 return out;
}
function chProgress(c){const T=CH[c.key];if(c.best==null)return 0;if(T.prog)return T.prog(c.bestData,c);
 if(c.key==='safety')return c.best?1:0;
 return T.hi?clamp(c.best/c.target,0,1):clamp(c.target/c.best,0,1);}
function chPass(c,d,D){const T=CH[c.key];const v=T.val(d,c);if(v==null||isNaN(v))return{v,pass:false};
 let pass;if(c.key==='rpm'||c.key==='aerobal')pass=v>=0;else if(c.key==='safety')pass=v>=1;else pass=T.hi?v>=c.target:v<c.target;
 if(T.ok&&!T.ok(D,c))pass=false;return{v,pass};}
function updateChallenges(test,d,D){const msgs=[];
 for(const c of S.challenges){const T=CH[c.key];if(T.test!==test||c.status==='signed'||c.status==='failed')continue;
  if(T.ice&&!D.ice)continue;
  const{v,pass}=chPass(c,d,D);
  const better=c.best==null||(c.key==='rpm'||c.key==='aerobal'||T.hi?v>c.best:v<c.best);
  if(better){c.best=v;c.bestData=d;}
  if(pass&&c.status==='open'){c.status='passed';c.passData=d;msgs.push(`✅ Challenge passed: ${T.title(c)} — sign off your math to claim the full reward!`);}
 }
 save();return msgs;}

