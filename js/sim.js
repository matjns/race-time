/* ================= LAP SIMULATION ================= */
function simLap(D,tr,o){
 const pts=tr.pts,n=pts.length,use=o.use,grip=o.grip||1,pm=o.pm||1,muU=D.mu*use*grip;
 const vl=new Float64Array(n);for(let i=0;i<n;i++)vl[i]=Math.min(cornerV(D,pts[i].k,use,grip),D.vGear*.995);
 const Fd=vv=>vv>=D.vGear*.995?0:D.kW*1000*pm/Math.max(vv,D.vKnee);
 const longAvail=(vv,k)=>{const N=D.m*G+.5*RHO*D.ClA*vv*vv,fm=muU*N,lat=D.m*vv*vv*k;return Math.sqrt(Math.max(0,fm*fm-lat*lat));};
 const pass=v0=>{const v=new Float64Array(n);v[0]=Math.min(v0,vl[0]);
  for(let i=0;i<n-1;i++){const vv=v[i],d=pts[i].d;const F=Math.min(Fd(vv),longAvail(vv,pts[i].k)*D.rear*1.2*(vv<12?D.launchF||1:1));
   const a=(F-.5*RHO*D.CdA*vv*vv-.015*D.m*G)/D.mEff;v[i+1]=Math.min(vl[i+1],Math.sqrt(Math.max(.04,vv*vv+2*a*d)));}
  if(!o.noBrakeEnd)for(let i=n-2;i>=0;i--){const vv=v[i+1],d=pts[i].d;const dec=(Math.min(longAvail(vv,pts[i].k),D.brake*D.m*G*grip)+.5*RHO*D.CdA*vv*vv)/D.m;v[i]=Math.min(v[i],Math.sqrt(vv*vv+2*dec*d));}
  return v;};
 let v=pass(o.v0);
 if(!o.standing&&tr.closed){v=pass(v[n-1]);}
 const t=new Float32Array(n),ax=new Float32Array(n),ay=new Float32Array(n),pw=new Float32Array(n);
 let T=0,eW=0,eB=0,slip=0;const zones={};
 for(let i=0;i<n-1;i++){const d=pts[i].d,va=(v[i]+v[i+1])/2;const dt=d/Math.max(va,.2);
  const a=(v[i+1]*v[i+1]-v[i]*v[i])/(2*Math.max(d,1e-6));
  const Ft=D.mEff*a+.5*RHO*D.CdA*va*va+.015*D.m*G;
  if(Ft>0){eW+=Ft*d;pw[i]=Ft*va;}else eB+=-Ft*d;
  ax[i]=a/G;ay[i]=va*va*pts[i].k/G*(pts[i].sg||1);slip+=(ax[i]*ax[i]+ay[i]*ay[i])*d;
  t[i]=T;T+=dt;}
 t[n-1]=T;ax[n-1]=ax[n-2];ay[n-1]=ay[n-2];
 for(const z of tr.zones){let mn=1e9,mx=0;for(let i=z.i0;i<=z.i1;i++){mn=Math.min(mn,v[i]);mx=Math.max(mx,v[i]);}zones[z.label]={vmin:mn,vmax:mx};}
 return{v,t,ax,ay,pw,time:T,eW,eB,slip,zones,avgP:eW/T,vEnd:v[n-1]};
}
function tireTempEq(D,slipRate){return 30+14*Math.sqrt(slipRate)*(1+(D.ti.psi-D.t.psi)*.06)*(D.su.id==='kin'?.96:1);}
function tempGrip(D,T){const[lo,hi]=D.ti.win;return T<lo?1-.004*(lo-T):T>hi?1-.006*(T-hi):1;}
function runStint(D,tr,o){
 const st=STYLES[o.style||'bal'];const rng=o.rng||Math.random;const laps=[];
 let wear=0,tireT=o.coldStart===false?60:30,coolT=70,eW=0,eB=0,T=0,dnf=null,v0=0;
 for(let L=1;L<=o.laps;L++){
  const grip=(1-.13*Math.pow(Math.min(wear,1),1.4))*tempGrip(D,tireT);
  const pm=coolT>108?.88:1;
  const r=simLap(D,tr,{v0,use:o.use||st.use,grip,pm,standing:L===1});
  v0=r.vEnd;
  const Teq=tireTempEq(D,r.slip/r.time);tireT+=(Teq-tireT)*(L===1?.55:.5);
  const[lo,hi]=D.ti.win;
  const wl=1.9e-5*r.slip*D.ti.wear*D.su.wear*st.wear*(1+.18*Math.abs(D.t.camber+1.8))*(1+Math.max(0,tireT-hi)/12)*(1+Math.max(0,lo-tireT)/40);
  wear+=wl;
  const util=r.avgP/(D.kW*1000);const Ceq=40+62*D.heatIdx*(.85+.15*util/.35);coolT+=(Ceq-coolT)*.45;
  eW+=r.eW;eB+=r.eB;T+=r.time;
  const lap={n:L,r,time:r.time,wear,wl,tireT,coolT,grip};laps.push(lap);
  if(!(o.keepArrays===true||L<=(o.keepArrays||0)))lap.r={time:r.time,zones:r.zones,avgP:r.avgP};
  if(o.failRolls){const p=D.failP/22*st.risk*(coolT>105?1+(coolT-105)/3:1);
   if(rng()<p){dnf={lap:L,why:failWhy(D,coolT,rng)};break;}}
  if(D.pw.ev&&energyKWh(D,eW,eB)>D.pw.cap){dnf={lap:L,why:'Accumulator depleted — ran out of energy'};break;}
  if(wear>=1&&o.tireFail){dnf={lap:L,why:'Tires corded — worn through the rubber'};break;}
  if(o.stopAtWear&&wear>=1)break;
 }
 return{laps,time:T,eW,eB,energy:energyKWh(D,eW,eB),wear,tireT,coolT,dnf,maxCool:Math.max(...laps.map(l=>l.coolT)),maxTire:Math.max(...laps.map(l=>l.tireT))};
}
function energyKWh(D,eW,eB){return D.pw.ev?(eW/D.eff-eB*.25)/3.6e6:eW/D.eff/3.6e6;}
function failWhy(D,coolT,rng){
 if(coolT>105&&rng()<.7)return`Engine overheated (${f0(coolT)}°C coolant) — head gasket let go`;
 const w=Object.entries(D.relOf).map(([c,r])=>[c,1-r]);const tot=w.reduce((s,x)=>s+x[1],0);let x=rng()*tot;
 const msg={chassis:'Cracked chassis node near the rear suspension pickup',power:D.pw.ev?'Inverter fault — car shut down':'Engine failure — dropped a valve',susp:'Rod end failure on a rear pushrod',brakes:'Brake line chafed through',cooling:'Radiator hose split'};
 for(const[c,v]of w){x-=v;if(x<=0)return msg[c];}return msg.power;
}
function skidTime(D,use){const r=9.125+.75;const v=Math.min(cornerV(D,1/r,use,1),D.vGear);return 2*Math.PI*r/v;}
function zeroTo60(D,use){const r=simLap(D,TR.drag,{v0:0,use,standing:true,noBrakeEnd:true});const tgt=26.822;for(let i=1;i<r.v.length;i++)if(r.v[i]>=tgt){const f=(tgt-r.v[i-1])/(r.v[i]-r.v[i-1]);return r.t[i-1]+f*(r.t[i]-r.t[i-1]);}return 99;}
function brake60(D){const v=26.822;let d=0,vv=v;while(vv>0.05){const N=D.m*G+.5*RHO*D.ClA*vv*vv;const F=Math.min(D.mu*.97*N,D.brake*D.m*G)+.5*RHO*D.CdA*vv*vv;const a=F/D.m;const dv=Math.min(vv,a*.002);d+=(vv-dv/2)*.002;vv-=dv;}return d;}

/* ================= SCORING ================= */
const MAXP={design:150,cost:100,business:75,accel:100,skid:75,autox:125,endu:275,eff:100};
const EVN={design:'Design',cost:'Cost',business:'Business',accel:'Acceleration',skid:'Skidpad',autox:'Autocross',endu:'Endurance',eff:'Efficiency'};
function scoreDyn(ev,T,Tmin){if(!isFinite(T))return 0;
 if(ev==='accel'){const Tm=1.5*Tmin;return T>Tm?4.5:95.5*((Tm/T)-1)/((Tm/Tmin)-1)+4.5;}
 if(ev==='skid'){const Tm=1.25*Tmin;return T>Tm?3.5:71.5*((Tm/T)**2-1)/((Tm/Tmin)**2-1)+3.5;}
 if(ev==='autox'){const Tm=1.45*Tmin;return T>Tm?6.5:118.5*((Tm/T)-1)/((Tm/Tmin)-1)+6.5;}
 if(ev==='endu'){const Tm=1.45*Tmin;return T>Tm?25:250*((Tm/T)-1)/((Tm/Tmin)-1)+25;}
}
function perfIndex(D){return simLap(D,TR.autox,{v0:0,use:.965,standing:true}).time;}
function designScore(D,Dold,ctx){
 let s=50;const fb=[];
 const hi=D.heatIdx;
 if(hi>.8){s-=8;fb.push(['bad',`Cooling undersized: heat index ${f2(hi)} (target 0.55–0.90). Expect endurance overheating.`]);}
 else if(hi<.42){s+=3;fb.push(['warn',`Cooling oversized (heat index ${f2(hi)}): carrying extra mass and drag.`]);}
 else{s+=12;fb.push(['ok','Cooling package well matched to the powertrain.']);}
 const b=D.bal;if(Math.abs(b)<1.5){s+=12;fb.push(['ok','Neutral mechanical/aero balance — judges liked the balance rationale.']);}
 else fb.push(['bad',`Car is ${b>0?'understeering':'oversteering'} (balance index ${f1(b)}): revisit weight distribution / ARB${D.ClA>0?' / aero balance':''}.`]);
 if(Math.abs(D.t.psi-D.ti.psi)<=1){s+=6;}else fb.push(['warn',`Tire pressure ${D.t.psi} psi is outside the ${D.ti.name} sweet spot (~${D.ti.psi} psi).`]);
 if(Math.abs(D.t.camber+1.8)<=.5)s+=5;else fb.push(['warn',`Camber ${f1(D.t.camber)}° is far from the tire's optimum (~−1.8°).`]);
 if(D.ClA>0){if(D.flex){s-=4;fb.push(['bad',`Chassis too flexible for the aero loads (${f0(D.K)} Nm/° — needs ≥ ${f0(1400+350*D.ClA)}).`]);}
  if(Math.abs(D.abal-D.t.fw)<=3){s+=8;fb.push(['ok','Aero balance matched to weight distribution.']);}else fb.push(['warn','Aero balance not matched to weight distribution.']);}
 if(D.brake>=D.mu*1.08)s+=6;else fb.push(['warn','Brakes cannot reach the tire limit — upgrade or the car stops short of its potential.']);
 if(D.vGear>=28&&D.vGear<=40)s+=6;else fb.push(['warn',D.vGear<28?`Final drive too short: rev-limited at ${spd(D.vGear)}.`:`Final drive very tall (gear top ${spd(D.vGear)}): sluggish out of slow corners.`]);
 if(D.sf>=1.4&&D.sf<=1.8)s+=6;else fb.push(['warn',D.sf>1.8?`Safety factor ${f2(D.sf)} is overbuilt — heavy.`:`Safety factor ${f2(D.sf)} is marginal — judges questioned validation.`]);
 if(D.massCar<190){s+=8;fb.push(['ok',`Light car (${f0(D.massCar)} kg) — good mass discipline.`]);}else if(D.massCar>225)fb.push(['bad',`Heavy car (${f0(D.massCar)} kg without driver).`]);
 if(D.ice){if(D.em.knock>1){s-=5;fb.push(['bad',`Engine is knocking (knock index ${f2(D.em.knock)}): compression/ignition/AFR too aggressive.`]);}else if(D.em.floats){s-=5;fb.push(['bad',`Rev limit ${D.redline} rpm is above valve-float speed (${f0(D.em.nFloat)} rpm).`]);}else s+=4;
  if(Math.abs(D.em.nH-D.em.nE)<1500)s+=3;}
 if(D.am&&D.am.stall){s-=6;fb.push(['bad','A wing is set past its stall angle — drag without downforce.']);}
 const sfx=D.st;for(const k in sfx.c)if(sfx.c[k].sf<1.2)fb.push(['bad',`${COMPS[k].n} safety factor ${f2(sfx.c[k].sf)} — below 1.2.`]);
 // improvement over inherited car
 const imp=(ctx.oldPI-ctx.newPI)/ctx.oldPI;const ib=clamp(imp*250,-10,22);s+=ib;
 if(imp>.005)fb.push(['ok',`Measured improvement over the inherited car: ${f1(imp*100)}% faster autocross estimate.`]);
 else fb.push(['warn','Little evidence of improvement over the inherited design.']);
 const sg=Math.min(20,ctx.signed*5);s+=sg;if(sg)fb.push(['ok',`${ctx.signed} engineering challenge(s) signed off with calculations — strong validation story.`]);
 return{score:clamp(Math.round(s),5,150),fb};
}
function costScore(D,reused){const c=clamp((42000-D.cost)/(42000-14000),0,1);return Math.round(c*72+reused/7*28);}
const PITCH={value:{l:'Affordable weekend racer',d:'Pitch low build cost & easy maintenance.'},perf:{l:'Track-day performance flagship',d:'Pitch lap times and engineering excellence.'},green:{l:'Sustainable motorsport',d:'Pitch efficiency, low CO₂, and reuse.'}};
function businessScore(D,pitch,rep,reused){let s=24+Math.min(18,rep*1.2);
 if(pitch==='value')s+=clamp((30000-D.cost)/12000,0,1)*28;
 if(pitch==='perf')s+=clamp((D.latG-1.3)/.7,0,1)*16+clamp((D.pw2w-150)/200,0,1)*12;
 if(pitch==='green')s+=(D.pw.ev?16:D.pw.id==='single'?10:3)+reused/7*12;
 return clamp(Math.round(s),5,75);}

