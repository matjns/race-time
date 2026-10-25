'use strict';
/* ================= ENGINEERING MODELS (engine · aero · structures · suspension) =================
   Each model is deliberately simple but physically motivated, and returns the intermediate
   numbers so the "Why?" cards and the Chief Engineer can show worked examples. */

/* ---------- ENGINE: restrictor + Helmholtz + exhaust waves + cam + combustion ---------- */
const ENG_DEF={
 single:{cyl:1,vd:.45e-3,ivo:20,ivc:50,evo:50,evc:15,lift:9,cr:12.5,ign:30,afr:12.8,plenum:2.0,runnerD:38,exhL:630,exhD:42,redline:10500,dv:36,floatBase:11800,cal:.97},
 i4:{cyl:4,vd:.6e-3,ivo:25,ivc:55,evo:55,evc:20,lift:8,cr:12.5,ign:32,afr:12.8,plenum:3.0,runnerD:34,exhL:420,exhD:30,redline:13500,dv:27,floatBase:14400,cal:.765}
};
const ENG_KEYS=['ivo','ivc','evo','evc','lift','cr','ign','afr','plenum','runnerD','exhL','exhD','redline'];
const ENG_RANGE={ivo:[0,50,1,'° BTDC'],ivc:[20,80,1,'° ABDC'],evo:[20,80,1,'° BBDC'],evc:[0,50,1,'° ATDC'],lift:[5,12,.1,'mm'],cr:[10,15,.1,':1'],ign:[15,45,1,'° BTDC'],afr:[11,16,.1,':1'],plenum:[.5,6,.1,'L'],runnerD:[25,50,1,'mm'],exhL:[250,1000,10,'mm'],exhD:[24,55,1,'mm'],redline:[8000,16000,100,'rpm']};
const ENG_LAB={ivo:'Intake valve opens',ivc:'Intake valve closes',evo:'Exhaust valve opens',evc:'Exhaust valve closes',lift:'Valve lift',cr:'Compression ratio',ign:'Ignition advance (peak tq)',afr:'Air-fuel ratio',plenum:'Plenum volume',runnerD:'Runner diameter',exhL:'Exhaust primary length',exhD:'Exhaust primary diameter',redline:'Rev limit'};
const RESTRICT={d:.020,Cd:.92,p0:101325,T0:298,R:287,g:1.4};
function chokedFlow(){const A=Math.PI*RESTRICT.d*RESTRICT.d/4,{p0,T0,R,g,Cd}=RESTRICT;return Cd*A*p0*Math.sqrt(g/(R*T0))*Math.pow(2/(g+1),(g+1)/(2*(g-1)));}
const MDOT_MAX=chokedFlow(); // ≈ 0.0686 kg/s
function engDefaults(id){const d=ENG_DEF[id];if(!d)return null;const o={};for(const k of ENG_KEYS)o[k]=d[k];return o;}
function engineModel(id,e,runnerMM){
 const B=ENG_DEF[id];if(!B)return null;e=Object.assign(engDefaults(id),e||{});
 const c=343,vcyl=B.vd/B.cyl;
 // Helmholtz intake resonance: f = c/2π · sqrt(A / (L·V)), V = mean cylinder volume
 const A=Math.PI*Math.pow(e.runnerD/2000,2),Leff=runnerMM/1000+.5*e.runnerD/1000,V=vcyl*(e.cr+1)/(2*(e.cr-1));
 const fH=c/(2*Math.PI)*Math.sqrt(A/(Leff*V));const nH=60*fH/1.78;
 // exhaust wave tuning (Blair-style): L[in] = 850·ED/N − 3, ED = 180 + EVO
 const ED=180+e.evo,nE=850*ED/(e.exhL/25.4+3);
 const dOpt=42*Math.sqrt(vcyl/4.5e-4*nE/7000);
 // cam: later IVC & longer duration push the VE peak up; overlap helps up top, hurts low down
 const dur=e.ivo+180+e.ivc,ovl=e.ivo+e.evc;
 const nCam=(id==='single'?7000:10300)*(1+(e.ivc-B.ivc)*.012+(e.ivo-B.ivo)*.004);
 const wCam=4200*dur/250*(id==='single'?.85:1.1);
 const liftF=Math.pow(Math.min(1,e.lift/(.3*B.dv)),.5);
 const nFloat=B.floatBase*Math.sqrt(B.lift/e.lift);
 const plF=Math.min(1,e.plenum/(4*B.vd*1000));
 // combustion: Otto efficiency, ignition vs MBT, AFR, knock
 const etaTh=1-1/Math.pow(e.cr,.3),etaRef=1-1/Math.pow(12.5,.3);
 const MBT=29+(id==='single'?0:2);
 const ignF=1-.0009*Math.pow(e.ign-MBT,2);
 const afrF=1-.012*Math.pow(e.afr-12.8,2);
 const knock=Math.max(0,(e.cr-12.8)*.7+(e.ign-MBT-2)*.18+(e.afr-13.2)*.5);
 const knockF=knock>1?Math.max(.75,1-.04*(knock-1)):1;
 const fuelF=e.afr<14.7?e.afr/14.7:1-.02*(e.afr-14.7); // fraction of fuel energy usefully burnt
 const heatF=1+.05*(e.afr-12.8)+.02*(e.ign<MBT-6?MBT-6-e.ign:0)+.015*(e.cr-12.5)*-1;
 const ve=N=>{let v=.9*Math.exp(-Math.pow((N-nCam)/wCam,2))*.55+.45;v*=liftF;
  v*=1+(.07+.05*plF)*Math.exp(-Math.pow((N-nH)/1500,2));
  v*=1+.06*Math.exp(-Math.pow((N-nE)/1800,2));
  v*=1-.0025*Math.pow(e.exhD-dOpt,2)*(e.exhD<dOpt?N/nE:Math.max(.3,1-N/nE*.5));
  v*=1-Math.max(0,ovl-35)*.004*Math.max(0,1-N/nCam);
  if(N>nFloat)v*=Math.max(.3,1-(N-nFloat)/1500);return Math.max(.1,v);};
 const rpm=[],tq=[],kw=[],mdot=[],choke=[];let pk=0,pkN=0,tpk=0,tpkN=0;
 for(let N=2000;N<=e.redline;N+=250){
  const dem=ve(N)*1.184*B.vd*N/120;const m=dem/Math.pow(1+Math.pow(dem/MDOT_MAX,6),1/6);
  const Pind=m/e.afr*44e6*etaTh*ignF*afrF*knockF*fuelF*.95;
  const fric=(.9+.012*N/100)*1e5*B.vd*N/120*.1*(.6+N/2e4);
  const P=Math.max(0,(Pind*.86-fric))*B.cal;
  rpm.push(N);kw.push(P/1000);tq.push(P/(N*2*Math.PI/60));mdot.push(m);choke.push(dem>MDOT_MAX*.97);
  if(P>pk){pk=P;pkN=N;}if(tq[tq.length-1]>tpk){tpk=tq[tq.length-1];tpkN=N;}}
 const T=N=>{if(N<=rpm[0])return tq[0]*Math.max(.3,N/rpm[0]);if(N>=rpm[rpm.length-1])return 0;const i=Math.floor((N-rpm[0])/250);const f=(N-rpm[i])/250;return tq[i]+(tq[i+1]-tq[i])*f;};
 const iLow=rpm.findIndex(N=>N>=e.redline*.55);
 return{id,e,rpm,tq,kw,mdot,choke,peakKW:pk/1000,peakN:pkN,tqPeak:tpk,tqN:tpkN,T,nH,fH,nE,ED,dOpt,nCam,dur,ovl,nFloat,etaTh,etaRef,MBT,ignF,afrF,knock,knockF,fuelF,heatF,
  floats:e.redline>nFloat,lowRatio:tq[iLow]/tpk,chokeFrac:choke.filter(Boolean).length/choke.length,A,Leff,V,vcyl,redline:e.redline};
}
function evModel(D){const kW=D?D.kW:80;const base=4000,max=12000;const Tm=kW*1000/(base*2*Math.PI/60);const T=N=>N<=base?Tm:N<max?Tm*base/N:0;
 const rpm=[],tq=[],kw=[];for(let N=500;N<=max;N+=250){rpm.push(N);tq.push(T(N));kw.push(T(N)*N*2*Math.PI/60/1000);}
 return{id:'ev',rpm,tq,kw,peakKW:kW,peakN:base,tqPeak:Tm,tqN:500,T,redline:max,ev:1,lowRatio:1,choke:rpm.map(()=>false)};}

/* ---------- AERO: multi-element wings with stall, diffuser ride-height sensitivity, CoP ---------- */
const AERO_DEF={fwEl:2,fwAoA:12,rwEl:2,rwAoA:14};
const AERO_RANGE={fwEl:[1,3,1,'elements'],fwAoA:[0,30,.5,'°'],rwEl:[1,3,1,'elements'],rwAoA:[0,35,.5,'°']};
const AERO_LAB={fwEl:'Front wing elements',fwAoA:'Front wing angle of attack',rwEl:'Rear wing elements',rwAoA:'Rear wing angle of attack'};
function wingCoef(n,aoa){const slope=.075*(1+.38*(n-1)),stall=12+7*(n-1);const cl0=.25*n;
 let cl=cl0+slope*aoa,stalled=false;if(aoa>stall){stalled=true;cl=(cl0+slope*stall)*Math.max(.45,1-.09*(aoa-stall));}
 const cd=.03*n+.12*cl*cl/(1+.3*(n-1))+(stalled?.35+.03*(aoa-stall):0);return{cl,cd,stall,stalled,margin:stall-aoa};}
function diffuserF(rh){return rh>=22?1+(40-rh)*.01:Math.max(.55,1.18-(22-rh)*.09);}
function aeroModel(aeroId,a,rhStatic,wb,kf,kr){
 a=Object.assign({},AERO_DEF,a||{});const L=wb/1000;
 const out={id:aeroId,a,parts:[]};
 // ride height under aero load (iterate: downforce compresses springs → changes diffuser)
 let rhDyn=rhStatic;
 for(let it=0;it<4;it++){
  out.parts=[];
  if(aeroId==='wing'||aeroId==='tray'){const f=diffuserF(rhDyn);out.parts.push({n:'Undertray/diffuser',ClA:1.15*f,CdA:.06,x:.54*L,f});}
  if(aeroId==='wing'){const fw=wingCoef(a.fwEl,a.fwAoA),rw=wingCoef(a.rwEl,a.rwAoA);
   out.fw=fw;out.rw=rw;out.parts.push({n:'Front wing',ClA:fw.cl*.34*1.15,CdA:fw.cd*.34,x:-.62,w:fw},{n:'Rear wing',ClA:rw.cl*.42,CdA:rw.cd*.42+.08,x:L+.38,w:rw});}
  out.ClA=out.parts.reduce((s,p)=>s+p.ClA,0);out.CdA=out.parts.reduce((s,p)=>s+p.CdA,0);
  const Fz25=.5*RHO*out.ClA*625;const k=(kf+kr)*2*1000;rhDyn=rhStatic-Fz25/k*1000*.8;}
 out.rhDyn=rhDyn;out.bottoming=rhDyn<12;
 // centre of pressure → front share of downforce: moment balance about the rear axle
 if(out.ClA>0){const xcp=out.parts.reduce((s,p)=>s+p.ClA*p.x,0)/out.ClA;out.xcp=xcp;out.bal=clamp((L-xcp)/L*100,0,100);}else out.bal=0;
 out.LD=out.CdA>0?out.ClA/out.CdA:0;
 out.stall=aeroId==='wing'&&(out.rw.stalled||out.fw.stalled);
 out.stallRisk=aeroId==='wing'&&out.rw.margin<2.5; // close to stall: separation at speed in gusts/pitch
 return out;}

/* ---------- STRUCTURES: materials per component → mass, stiffness, SF, fatigue, cost ---------- */
const MATS={
 '4130':{n:'4130 chromoly steel',E:205,rho:7850,sy:460,su:560,fat:.5,cpk:9,metal:1},
 mild:{n:'Mild steel (1020)',E:200,rho:7870,sy:350,su:420,fat:.5,cpk:3,metal:1},
 '6061':{n:'Aluminium 6061-T6',E:69,rho:2700,sy:276,su:310,fat:.3,cpk:7,metal:1,noLimit:1},
 '7075':{n:'Aluminium 7075-T6',E:72,rho:2810,sy:503,su:572,fat:.28,cpk:14,metal:1,noLimit:1},
 ti:{n:'Ti-6Al-4V',E:114,rho:4430,sy:880,su:950,fat:.55,cpk:65,metal:1,req:'ti'},
 cfp:{n:'Carbon prepreg (quasi-iso)',E:70,rho:1600,sy:600,su:600,fat:.6,cpk:95,req:'prepreg'},
 cfw:{n:'Carbon wet layup',E:45,rho:1550,sy:330,su:330,fat:.45,cpk:38},
 gf:{n:'Fiberglass (E-glass)',E:20,rho:1900,sy:250,su:250,fat:.35,cpk:11}
}; // E in GPa, rho kg/m³, strengths in MPa, cost $/kg
const COMPS={
 aarm:{n:'Suspension A-arms (×8)',kind:'tube',count:8,len:.36,mats:['4130','mild','6061','7075','ti','cfp','cfw'],dims:{od:[12,30,.5],wall:[.7,3,.1]}},
 halfshaft:{n:'Halfshafts (×2)',kind:'shaft',count:2,len:.42,mats:['4130','mild','7075','ti','cfp'],dims:{od:[16,40,.5],wall:[1,8,.1]}},
 upright:{n:'Uprights (×4)',kind:'plate',count:4,len:.22,mats:['4130','mild','6061','7075','ti'],dims:{t:[4,20,.5]}},
 rollhoop:{n:'Main roll hoop',kind:'hoop',count:1,len:2.7,mats:['4130','mild','6061','ti','cfp'],dims:{od:[20,35,.5],wall:[1.2,4,.1]}}
};
const MAT_DEF={aarm:{m:'4130',od:16,wall:.9},halfshaft:{m:'4130',od:28,wall:6},upright:{m:'6061',t:14},rollhoop:{m:'4130',od:25.4,wall:2.4}};
function compLoads(m,mu,ClA,wb,fw){ // peak design loads (N) from vehicle state: 1.4 g cornering + 1.6 g braking combined, aero at 28 m/s, 1.3 bump factor
 const Fa=.5*RHO*ClA*28*28;const Fz=(m*G*.5*(1+.65)+Fa*.35)*1.3/2; // most-loaded wheel
 const Fy=Fz*Math.max(mu,1.2)*1.05;const Fwheel=Math.hypot(Fy,Fz*.6);
 return{Fz,Fy,Fwheel,Tshaft:Fz*Math.max(mu,1.2)*.235*.95};}
function structModel(mat,L){
 mat=Object.assign({},MAT_DEF,mat||{});const out={c:{},mass:0,cost:0,sfMin:9,failP:0,rule:[]};
 for(const k in COMPS){const C=COMPS[k],d=Object.assign({},MAT_DEF[k],mat[k]||{}),M=MATS[d.m]||MATS['4130'];
  const E=M.E*1e9,sy=M.sy*1e6;let A,I,mass,sig,sf,kStiff,info;
  if(C.kind==='tube'||C.kind==='hoop'||C.kind==='shaft'){const ro=d.od/2000,ri=Math.max(0,ro-d.wall/1000);A=Math.PI*(ro*ro-ri*ri);I=Math.PI/4*(ro**4-ri**4);mass=A*C.len*M.rho*C.count;
   if(C.kind==='tube'){const F=L.Fwheel*3.5;sig=F/A;const Pcr=Math.PI**2*E*I/Math.pow(C.len,2);const sfY=sy/sig,sfB=Pcr/F;sf=Math.min(sfY,sfB);kStiff=E*A/C.len/1e6;info={F,sig:sig/1e6,Pcr,sfY,sfB,mode:sfB<sfY?'buckling':'yield',A,I};}
   if(C.kind==='shaft'){const J=2*I;const tau=L.Tshaft*ro/J;sf=.577*sy/tau;sig=tau*1.732;kStiff=E/2.6*J/C.len/1e3;info={T:L.Tshaft,tau:tau/1e6,J};}
   if(C.kind==='hoop'){const F=7000,Mb=F*.035;sig=Mb*ro/I;sf=sy/sig;kStiff=E*I/1e3;info={F,M:Mb,sig:sig/1e6,I};
    if(!M.metal||!['4130','mild'].includes(d.m))out.rule.push('Main hoop must be steel tube (rule F.3) — '+M.n+' needs an approved Structural Equivalency Spreadsheet.');
    if(['4130','mild'].includes(d.m)&&(d.od<25||d.wall<2.4))out.rule.push(`Main hoop ${d.od}×${d.wall} mm is below the 25.0×2.4 mm minimum (rule F.3.4).`);}}
  else{const w=.07,t=d.t/1000;A=w*t;mass=A*C.len*M.rho*C.count*1.6;const Mb=L.Fwheel*.11;const Z=w*t*t/6;sig=Mb/Z;sf=sy/sig;kStiff=E*w*t**3/12/1e3;info={M:Mb,Z,sig:sig/1e6};}
  // fatigue: alternating stress ≈ 45% of peak, compared with endurance strength
  const sa=sig*.3/1e6,Se=M.fat*M.su;const FF=sa/Se;
  let pf=M.noLimit?Math.min(.3,.002+.01*Math.pow(FF/.6,6)):FF<1?0:Math.min(.3,.01*Math.pow(FF,6));
  if(!M.metal&&sf<1.6)pf+=.02;if(sf<1)pf+=.25*(1-sf)+.05; // composites fail suddenly (no yield warning)
  const cost=mass*M.cpk*4+(M.metal?120:350);
  out.c[k]={...d,M,mass,sf,sig:sig/1e6,FF,pf,cost,kStiff,info,spStiff:M.E/M.rho*1e3,spStr:M.sy/M.rho*1e3};
  out.mass+=mass;out.cost+=cost;out.sfMin=Math.min(out.sfMin,sf);out.failP+=pf;}
 return out;}
let _structRef=null;function structRefMass(){if(!_structRef){_structRef=structModel(MAT_DEF,compLoads(300,1.5,0,1550,46));}return _structRef.mass;}

/* ---------- SUSPENSION: wheel rates → natural frequency, damping, dynamic ride ---------- */
const SUS_DEF={kf:30,kr:34,zeta:.65};
const SUS_RANGE={kf:[10,80,1,'N/mm'],kr:[10,80,1,'N/mm'],zeta:[.2,1.2,.05,'']};
const SUS_LAB={kf:'Front wheel rate',kr:'Rear wheel rate',zeta:'Damping ratio ζ'};
function suspModel(s,m,fw,ClA){s=Object.assign({},SUS_DEF,s||{});const unspr=11;
 const mf=m*fw/100/2-unspr,mr=m*(1-fw/100)/2-unspr;
 const fnF=Math.sqrt(s.kf*1000/mf)/(2*Math.PI),fnR=Math.sqrt(s.kr*1000/mr)/(2*Math.PI);
 const fopt=2.9+.28*ClA,fn=(fnF+fnR)/2;
 const gripF=Math.max(.9,1-.010*Math.pow(fn-fopt,2))*(1-.08*Math.pow(s.zeta-.65,2));
 const balAdd=(fnF/fnR-.95)*4;
 return{s,mf,mr,fnF,fnR,fn,fopt,gripF,balAdd,cc:2*Math.sqrt(s.kf*1000*mf)};}
