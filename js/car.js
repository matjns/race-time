'use strict';
/* ================= CAR MODEL ================= */
function carEng(car){const id=car.parts.power;return Object.assign(engDefaults(id)||{},((car.eng||{})[id])||{});}
function carAero(car){return Object.assign({},AERO_DEF,car.aero||{});}
function carMat(car){const o={};for(const k in MAT_DEF)o[k]=Object.assign({},MAT_DEF[k],(car.mat||{})[k]||{});return o;}
function carSus(car){return Object.assign({},SUS_DEF,car.sus||{});}
const RW={10:.229,13:.262};
function derive(car,rd){
 rd=rd||{};const P=c=>part(c,car.parts[c]);const t=Object.assign({},DEF_TUNE,car.tune);const age=car.age||{};
 const ch=P('chassis'),pw=P('power'),ti=P('tires'),su=P('susp'),br=P('brakes'),co=P('cooling'),ae=P('aero');
 const D={ch,pw,ti,su,br,co,ae,t};
 const partsMass=CATS.reduce((s,c)=>s+P(c).mass,0);
 let massCar=48+partsMass+t.reinf*.08-(rd.light||0)*3;
 // ---- powertrain (engine model) ----
 D.ice=!!pw.ice;
 if(D.ice){const em=engineModel(pw.id,carEng(car),t.runner);D.em=em;D.kW0=em.peakKW;D.rpmPeak=em.tqN;D.redline=em.redline;
  D.lowEnd=clamp((em.lowRatio-.85)*3,-.5,.5);D.vGear=pw.vk/t.fd*(em.redline/ENG_DEF[pw.id].redline);}
 else{D.kW0=pw.kW;D.rpmPeak=0;D.redline=12000;D.lowEnd=.3;D.vGear=pw.vk/t.fd;}
 D.kW=D.kW0*(1+.03*(rd.power||0))*(1-.025*(age.power||0))*(rd.launch&&!D.ice?1.02:1);
 D.rpmF=D.ice?D.kW0/pw.kW:1;
 D.vKnee=D.vGear*.3*(1-D.lowEnd*.35)*(pw.ev?.75:1);
 D.rw=RW[ti.dia]||.23;
 // gears: 5-speed geometric spread; top gear hits the rev limit at vGear (EV: single reduction)
 const nG=pw.ev?1:5,v1=D.vGear*.42;D.gearV=[];for(let g=0;g<nG;g++)D.gearV.push(nG===1?D.vGear:v1*Math.pow(D.vGear/v1,g/(nG-1)));
 D.gearR=D.gearV.map(v=>D.redline*2*Math.PI/60*D.rw/v);
 // ---- mass, aero, suspension, structures (coupled) ----
 const sus=carSus(car);
 let m0=massCar+DRIVER;
 const am=aeroModel(ae.id,carAero(car),t.rh,t.wb,sus.kf,sus.kr);D.am=am;
 D.ClA=am.ClA||0;D.CdA=.8+(am.CdA||0)+co.cda;D.abal=ae.cla>0?am.bal:0;
 const st=structModel(carMat(car),compLoads(m0,ti.mu,D.ClA,t.wb,t.fw));D.st=st;D.sf=st.sfMin;
 massCar+=st.mass-structRefMass();
 D.massCar=massCar;D.m=massCar+DRIVER;D.mEff=D.m+(ti.dia===13?7:4);
 const sm=suspModel(sus,D.m,t.fw,D.ClA);D.sm=sm;
 // ---- tires & grip ----
 const tAge=age.tires||0;
 const pF=1-.007*Math.pow(t.psi-ti.psi,2);
 const cF=1-.022*Math.pow(t.camber+1.8,2);
 const rF=t.rh<28?1-.006*(28-t.rh):1;
 D.bal=(t.fw-46)*.45+t.arb*.5+((D.ClA>0)?(t.fw-D.abal)*-.12:0)+sm.balAdd;
 const sens=1-(t.wb-1525)/1000;
 const bF=Math.max(.84,1-.0035*sens*D.bal*D.bal);
 D.K=ch.k*(1+.4*t.reinf/100)*(1-.04*(age.chassis||0));
 const flex=D.K<1400+350*D.ClA?.965:1;D.flex=flex<1;
 const botF=am.bottoming?.95:1;
 D.mu=ti.mu*(1-.03*tAge)*pF*cF*rF*bF*su.mu*flex*sm.gripF*botF*(1+.015*(rd.grip||0));
 D.muParts={pF,cF,rF,bF,flex,susF:sm.gripF,botF};
 D.tight=1-(t.wb-1525)/2200;
 D.rear=clamp(1-t.fw/100+.07,.4,.68);
 D.brake=br.cap;D.launchF=rd.launch?1.06:1;
 // ---- cooling ----
 D.coolCap=co.cap*(1+.1*(rd.cool||0));
 D.heatIdx=pw.heat*D.kW/60/D.coolCap*(D.em?D.em.heatF:1);
 // ---- reliability ----
 let rel=1;const relOf={};
 for(const c of ['chassis','power','susp','brakes','cooling']){const r=P(c).rel*(1-.02*(age[c]||0))*(c==='susp'?1-.03*(car.crash||0):1);relOf[c]=r;rel*=r;} // barrier hits bend suspension (v2.2)
 const sfF=Math.pow(1.5/clamp(D.sf,.6,3),2.2);
 let extra=st.failP;if(D.em){if(D.em.floats)extra+=.06;if(D.em.knock>1)extra+=.03*(D.em.knock-1);}
 relOf.struct=1-st.failP;
 D.failP=clamp(((1-rel)*sfF+extra)*Math.pow(.75,rd.qa||0)*(D.heatIdx>.9?1+(D.heatIdx-.9)*6:1),.004,.9);
 D.rel=1-D.failP;D.relOf=relOf;
 D.eff=D.ice?pw.eff*(D.em.fuelF/ (12.8/14.7))*(D.em.etaTh/D.em.etaRef):pw.eff;
 D.cost=CATS.reduce((s,c)=>s+P(c).cost,0)+Math.round(st.cost-1000);
 let v=10;for(let i=0;i<60;i++){const f=D.kW*1000/v,r=.5*RHO*D.CdA*v*v+.015*D.m*G;v+=(f-r)>0?.5:-.5;}
 D.vPow=v;D.vTop=Math.min(v,D.vGear);D.gearLimited=D.vGear<v;
 D.pw2w=D.kW/D.m*1000;
 D.latG=latG(D,15);
 return D;
}
function latG(D,v,use=1){return D.mu*use*(1+.5*RHO*D.ClA*v*v/(D.m*G));}
function cornerV(D,k,use,grip,kv,cs){ // flat: v^2 = mu g / (k - mu rho ClA / 2m)
 // with elevation: m v² k = μ (m g cosθ + m v² κv + ½ρC_L A v²)  ⇒  v² = μ g cosθ / (k − μ κv − μ ρ C_L A / 2m)
 // κv<0 (crest) shrinks the limit, κv>0 (compression) raises it. On a crest the car also must stay on the ground:
 // N ≥ 10 % of static ⇒ v² (−κv − ρC_L A/2m) ≤ 0.9 g cosθ
 kv=kv||0;cs=cs==null?1:cs;let vc=1e9;
 if(k>=1e-4){let mu=D.mu*use*grip;if(1/k<14)mu*=D.tight;
  const den=k-mu*kv-mu*.5*RHO*D.ClA/D.m;vc=den<=0?1e9:Math.sqrt(mu*G*cs/den);}
 if(kv<0){const d2=-kv-.5*RHO*D.ClA/D.m;if(d2>0)vc=Math.min(vc,Math.sqrt(.9*G*cs/d2));}
 return vc;
}
/* wheel torque curve for the 3D car & dyno: N·m at the engine, scaled to the derived power */
function engTorque(D,rpm){if(D.ice){return D.em.T(rpm)*D.kW/D.em.peakKW;}const base=4000,Tm=D.kW*1000/(base*2*Math.PI/60);return rpm<=base?Tm:rpm<D.redline?Tm*base/rpm:0;}
function gearAt(D,v){for(let g=0;g<D.gearV.length;g++)if(v<D.gearV[g]*.93)return g;return D.gearV.length-1;}
function rpmAt(D,v,g){return Math.max(D.ice?1800:0,v/D.rw*D.gearR[g]*60/(2*Math.PI));}
