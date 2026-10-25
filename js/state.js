/* ================= STATE ================= */
const LEGACY_CAR={parts:{chassis:'steel',power:'i4',tires:'h10',susp:'basic',brakes:'std',cooling:'small',aero:'none'},
 tune:{wb:1620,fw:52,rh:45,fd:3.2,arb:6,psi:15.5,camber:-.6,reinf:0,runner:380,style:'bal'},
 eng:{i4:{exhL:600,ign:26,afr:12.0}},aero:{},sus:{kf:46,kr:26,zeta:.45},
 mat:{aarm:{m:'mild',od:22,wall:2},halfshaft:{m:'4130',od:32,wall:8},upright:{m:'4130',t:12},rollhoop:{m:'4130',od:28,wall:3}},
 age:{chassis:3,power:2,tires:1,susp:3,brakes:2,cooling:2,aero:0}};
function freshState(mode){return{v:2,mode:mode||'career',legacyId:Math.floor(Math.random()*1e9),season:1,units:S?S.units:'imp',rep:10,tech:2,tree:[],rd:{},insight:0,
  history:[{season:0,total:314,place:6,team:'Legacy Team'}],notebook:[],mastery:{},predictions:[],laps:{},ghosts:{},records:{},debriefs:0,crew:{},drive:{cam:0,tc:false,manual:false},
  last:{season:0,scores:{design:62,cost:58,business:40,accel:61,skid:38,autox:55,endu:0,eff:0},total:314,place:6,of:7,dnf:'Engine overheated (112°C coolant) on lap 14 of endurance',fb:[],notes:[],userNote:'Good luck. She\'s heavy and she cooks herself, but the frame is bulletproof. — outgoing captain',signoffs:[]},
  inherited:null,car:null,rebuilt:{},bonusCash:0,challenges:[],screen:'handoff',comp:null,pitch:'perf'};}
function newLegacy(mode){
 const car=deep(LEGACY_CAR);S=freshState(mode);S.inherited=deep(car);S.car=deep(car);
 if(S.mode==='sandbox'){S.tree=TREE.map(n=>n.id);S.rd=rdFromTree(S.tree);S.tech=99;S.screen='garage';}
 const D=derive(car,S.rd);S.last.notes=diagnose(D,{dnf:S.last.dnf});
 S.last.fb=designScore(D,D,{oldPI:1,newPI:1,signed:0}).fb.filter(x=>x[0]!=='ok').slice(0,4);
 S.challenges=genChallenges(1,[],car);save();
}
function storeKey(){return S&&S.mode==='sandbox'?KEY_SBX:KEY;}
function save(){try{localStorage.setItem(storeKey(),JSON.stringify(S));}catch(e){console.warn('save failed',e&&e.message);}}
function load(mode){try{const s=JSON.parse(localStorage.getItem(mode==='sandbox'?KEY_SBX:KEY));if(s&&s.v===2){S=s;return true;}}catch(e){}return false;}
function switchMode(mode){if(S)save();const units=S&&S.units;if(!load(mode)){S=null;newLegacy(mode);}if(units)S.units=units;localStorage.setItem('raceTimeMode',mode);}
function budget(){return S.mode==='sandbox'?1e7:15000+S.rep*250+S.bonusCash;}
function matChangeCost(){let s=0;const a=carMat(S.car),b=carMat(S.inherited);for(const k in a){if(JSON.stringify(a[k])!==JSON.stringify(b[k])){const st=structModel({[k]:a[k]},compLoads(300,1.5,0,1550,46));s+=Math.round(st.c[k].cost);}}return s;}
function spent(){let s=0;for(const c of CATS){if(S.car.parts[c]!==S.inherited.parts[c])s+=part(c,S.car.parts[c]).cost;else if(S.rebuilt[c])s+=Math.round(part(c,S.car.parts[c]).cost*.35);}return s+matChangeCost();}
function syncAge(){S.car.age={};for(const c of CATS)S.car.age[c]=(S.car.parts[c]===S.inherited.parts[c]&&!S.rebuilt[c])?(S.inherited.age[c]||0):0;}
function reusedCount(){return CATS.filter(c=>S.car.parts[c]===S.inherited.parts[c]).length;}
function inspect(D){const out=[];const rem=budget()-spent();
 if(rem<0)out.push(['f',`Over budget by ${money(-rem)}.`]);
 if(D.t.wb<1525)out.push(['f',`Wheelbase ${D.t.wb} mm is below the 1525 mm minimum (rule T2.3).`]);
 if(D.t.rh<25)out.push(['f',`Ride height ${D.t.rh} mm: car bottoms out — minimum 25 mm.`]);
 if(D.br.need13&&D.ti.dia!==13)out.push(['f',`${D.br.name} won't fit inside 10" wheels.`]);
 if(D.sf<1.2)out.push(['f',`Weakest component SF ${f2(D.sf)} < 1.2 — structural sign-off refused.`]);for(const r of D.st.rule)out.push(['f',r]);if(D.am.bottoming)out.push(['w',`Under aero load the car runs at ${f0(D.am.rhDyn)} mm — it will bottom out (plank wear).`]);if(D.ice&&D.em.floats)out.push(['w','Rev limit above valve-float rpm.']);if(D.ice&&D.em.knock>1)out.push(['w','Engine calibration knocks.']);if(D.am&&D.am.stall)out.push(['w','A wing is stalled.']);
 if(D.heatIdx>.9)out.push(['w',`Cooling marginal (heat index ${f2(D.heatIdx)}) — expect overheating in endurance.`]);
 if(D.flex)out.push(['w','Chassis flex under aero load costs grip.']);
 if(D.pw.ev){const e=quickEnergy(D);if(e>D.pw.cap*.92)out.push(['w',`Endurance energy estimate ${f1(e)} kWh vs ${D.pw.cap} kWh pack — risk of running dry.`]);}
 if(Math.abs(D.bal)>3)out.push(['w',`Strong ${D.bal>0?'understeer':'oversteer'} (balance ${f1(D.bal)}).`]);
 if(!out.some(x=>x[0]==='f'))out.unshift(['p','Tech inspection: PASS — car is legal to compete.']);
 return out;}
let _qe={};function quickEnergy(D){const k=JSON.stringify([S.car,S.rd]);if(_qe.k===k)return _qe.v;const r=simLap(D,TR.endu,{v0:12,use:STYLES[S.car.tune.style].use});const v=energyKWh(D,r.eW*22,r.eB*22);_qe={k,v};return v;}
function legal(D){return !inspect(D).some(x=>x[0]==='f');}
function diagnose(D,res){const n=[];const ag=D.t&&S?S.car.age||{}:{};
 if(res&&res.dnf)n.push(['bad',`DNF in endurance: ${res.dnf}.`]);
 const ct=res&&res.maxCool?res.maxCool:40+66*D.heatIdx;
 if(ct>105)n.push(['bad',`Overheated in endurance — coolant peaked around ${f0(ct)}°C. Radiator is too small for this engine.`]);
 else if(D.heatIdx>.9)n.push(['warn',`Cooling is marginal (heat index ${f2(D.heatIdx)}, coolant ${f0(ct)}°C) — one hot day from a DNF.`]);
 if(D.massCar>215)n.push(['bad',`Too heavy: ${f0(D.massCar)} kg without driver. Every 10 kg costs ~0.1 s in autocross.`]);
 if(D.bal>2)n.push(['bad',`Understeered on skidpad — front washes out (balance +${f1(D.bal)}). Check weight distribution & front ARB.`]);
 if(D.bal<-2)n.push(['bad',`Snap oversteer on corner exit (balance ${f1(D.bal)}). Too much rear bias or rear ARB.`]);
 if(D.t.psi>D.ti.psi+1.2)n.push(['warn',`Tires never came up to temperature — ${D.t.psi} psi is too high for this compound (~${D.ti.psi}).`]);
 if(D.t.psi<D.ti.psi-1.5)n.push(['warn',`Tires got greasy and overheated — ${D.t.psi} psi is too low.`]);
 if(Math.abs(D.t.camber+1.8)>.7)n.push(['warn',`Camber at ${f1(D.t.camber)}° — contact patch isn't flat in corners (optimum ≈ −1.8°).`]);
 if(D.vGear<28)n.push(['warn',`Hit the rev limiter on the straights — final drive ${D.t.fd} is too short.`]);
 if(D.vGear>40)n.push(['warn',`Bogs out of hairpins — final drive ${D.t.fd} is too tall.`]);
 if(D.ice){const em=D.em;if(Math.abs(em.nH-em.nE)>2200)n.push(['warn',`Intake resonance (${f0(em.nH)} rpm) and exhaust wave tuning (${f0(em.nE)} rpm) are fighting each other — the torque curve is lumpy. Align runner and primary lengths.`]);
  if(em.knock>1)n.push(['bad',`Engine knocks (index ${f2(em.knock)}) — ECU pulls timing and pistons suffer. Lower compression or ignition advance, or richen AFR.`]);
  if(em.floats)n.push(['bad',`Valve float above ${f0(em.nFloat)} rpm but the limiter is at ${em.redline} — that's how valves meet pistons.`]);
  if(em.e.afr<12.3)n.push(['warn',`Running rich (AFR ${f1(em.e.afr)}): cool and safe but thirsty — efficiency suffers.`]);
  if(em.e.ign<em.MBT-4)n.push(['warn',`Ignition retarded ${f0(em.MBT-em.e.ign)}° from best torque (MBT ≈ ${em.MBT}°) — free power left on the table.`]);}
 for(const k in D.st.c){const c=D.st.c[k];if(c.sf>2.6)n.push(['warn',`${COMPS[k].n}: ${c.M.n} at SF ${f2(c.sf)} is overbuilt — ${f1(c.mass)} kg.`]);if(c.sf<1.25)n.push(['bad',`${COMPS[k].n}: SF ${f2(c.sf)} is too thin.`]);}
 if(D.am&&D.am.stallRisk)n.push(['warn','Rear wing is within 2.5° of stall — at speed it can separate and spin the car.']);
 for(const c of CATS)if((ag[c]||0)>=2&&c!=='aero')n.push(['warn',`${PARTS[c].label} has ${ag[c]} seasons on it — reliability falling. Rebuild or replace.`]);
 if(D.flex)n.push(['warn','Chassis flexes under aero load — add reinforcement or a stiffer chassis.']);
 if(D.brake<D.mu*1.0)n.push(['warn','Brakes fade before the tires lock — corner entry is brake-limited.']);
 if(D.t.wb>1650)n.push(['info',`Long wheelbase (${D.t.wb} mm) — stable but lazy in the hairpins.`]);
 if(res&&res.wear>.85)n.push(['warn',`Tires were ${f0(res.wear*100)}% worn by the end of endurance.`]);
 if(D.ClA===0)n.push(['info','No aero at all — fast on straights, but corner speed is purely mechanical grip.']);
 if(n.length<3)n.push(['ok','Solid, well-sorted car. Look for marginal gains: mass, aero, and driver style.']);
 return n;}

