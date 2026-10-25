'use strict';
/* ================= CONSTANTS & DATA ================= */
const G=9.81, RHO=1.225, DRIVER=75, MPH=2.23694, FT=3.28084, KEY='raceTimeFSAE_v2', KEY_SBX='raceTimeFSAE_v2_sandbox';
const PARTS={
 chassis:{label:'Chassis',items:[
  {id:'steel',name:'4130 Steel Spaceframe',cost:3000,mass:38,k:1800,rel:.995,desc:'Cheap, forgiving, easy to weld-repair. Heavy and flexy.'},
  {id:'alu',name:'Bonded Aluminium Honeycomb',cost:7000,mass:29,k:2300,rel:.99,desc:'Lighter and stiffer; joints are fatigue-sensitive.'},
  {id:'hybrid',name:'Steel Front + CFRP Rear',cost:10000,mass:25,k:2800,rel:.99,desc:'Hybrid structure — good stiffness per dollar.'},
  {id:'carbon',name:'Carbon Fibre Monocoque',cost:15000,mass:19,k:3600,rel:.99,desc:'The dream: light, very stiff, very expensive.'}]},
 power:{label:'Powertrain',items:[
  {id:'single',name:'450cc Single, 20mm restrictor',cost:4000,mass:36,kW:40,heat:1.0,eff:.165,rel:.99,vk:128,sweet:7000,ice:1,co2:.26,desc:'Light, frugal, punchy low-down. Down on power.'},
  {id:'i4',name:'600cc Inline-4, 20mm restrictor',cost:5500,mass:58,kW:62,heat:1.4,eff:.13,rel:.975,vk:150,sweet:8500,ice:1,co2:.26,desc:'Classic FSAE screamer. Heavy, thirsty, runs hot.'},
  {id:'ev',name:'EV: 80 kW motor + 8 kWh pack',cost:16000,mass:84,kW:80,heat:.8,eff:.86,rel:.97,vk:160,sweet:0,ev:1,cap:8,co2:.65,desc:'Instant torque + regen. Heavy pack; run out of energy = DNF.'}]},
 tires:{label:'Tires & Wheels',items:[
  {id:'h10',name:'10" Hard compound',cost:1200,mass:13,mu:1.42,wear:.6,psi:13,win:[75,105],dia:10,desc:'Light wheels, durable rubber, modest grip.'},
  {id:'s10',name:'10" Soft compound',cost:1500,mass:13,mu:1.56,wear:1.35,psi:11,win:[60,90],dia:10,desc:'Light & grippy, but eats itself on long runs.'},
  {id:'h13',name:'13" Hard compound',cost:1500,mass:17,mu:1.47,wear:.5,psi:13,win:[75,105],dia:13,desc:'Bigger contact patch, longest life, room for big brakes.'},
  {id:'s13',name:'13" Soft compound',cost:1800,mass:17,mu:1.61,wear:1.1,psi:11,win:[60,90],dia:13,desc:'Max grip. Needs heat management to survive endurance.'}]},
 susp:{label:'Suspension',items:[
  {id:'basic',name:'Steel A-arms, fixed dampers',cost:1500,mass:24,mu:.97,wear:1.12,rel:.995,desc:'It works. Mostly.'},
  {id:'adj',name:'Pushrod + adjustable dampers',cost:3500,mass:21,mu:1.01,wear:1.0,rel:.99,desc:'Tunable; a solid all-rounder.'},
  {id:'kin',name:'Optimised kinematics + 4-way dampers',cost:6500,mass:19,mu:1.045,wear:.88,rel:.99,desc:'Keeps tires flat on the road — grip up, wear down.'}]},
 brakes:{label:'Brakes',items:[
  {id:'std',name:'Steel rotors, single-piston',cost:800,mass:9,cap:1.35,rel:.995,desc:'Fades when pushed. Limits deceleration.'},
  {id:'float',name:'Floating rotors, 4-piston',cost:2000,mass:8,cap:1.75,rel:.995,desc:'Consistent bite for most setups.'},
  {id:'big',name:'Large rotors + bias adjuster',cost:3400,mass:9,cap:2.2,rel:.995,need13:1,desc:'Stops on a dime — only fits inside 13" wheels.'}]},
 cooling:{label:'Cooling',items:[
  {id:'small',name:'Single side radiator',cost:400,mass:3,cap:1.0,cda:0,rel:.995,desc:'Fine for small engines.'},
  {id:'dual',name:'Dual radiators',cost:900,mass:5.5,cap:1.5,cda:.05,rel:.995,desc:'Lots of capacity, some drag.'},
  {id:'ducted',name:'Ducted radiator + PWM fan',cost:1700,mass:5,cap:1.8,cda:.02,rel:.99,desc:'Efficient and strong. Costs more.'}]},
 aero:{label:'Aero',items:[
  {id:'none',name:'No aero',cost:0,mass:0,cla:0,cda:0,desc:'Low drag, no downforce.'},
  {id:'tray',name:'Undertray + diffuser',cost:2500,mass:6,cla:1.2,cda:.06,desc:'Cheap downforce, sensitive to ride height.'},
  {id:'wing',name:'Full wing package (FW + RW + tray)',cost:6500,mass:17,cla:3.1,cda:.75,desc:'Big downforce & big drag. Wing angle trades the two.'}]}
};
const CATS=Object.keys(PARTS);
const TUNE=[
 {k:'wb',l:'Wheelbase',min:1500,max:1750,st:5,u:'mm',h:'FSAE rule: ≥ 1525 mm. Longer = stable, shorter = agile in tight turns.'},
 {k:'fw',l:'Front weight distribution',min:40,max:60,st:.5,u:'%',h:'More rear weight = traction off the line, but oversteer.'},
 {k:'rh',l:'Ride height',min:15,max:60,st:1,u:'mm',h:'Lower = more ground-effect downforce. < 25 mm fails tech (bottoming).'},
 {k:'fd',l:'Final drive ratio',min:2.5,max:5,st:.05,u:':1',h:'Short = acceleration, tall = top speed.'},
 {k:'arb',l:'Anti-roll bar balance',min:-10,max:10,st:1,u:'',h:'+ stiffer front (understeer), − stiffer rear (oversteer).'},
 {k:'psi',l:'Tire pressure',min:8,max:18,st:.5,u:'psi',h:'Low = hotter tires & bigger patch. Each compound has a sweet spot.'},
 {k:'camber',l:'Static camber',min:-3.5,max:0,st:.1,u:'°',h:'Some negative camber = grip. Too much = inner-edge wear.'},
 {k:'reinf',l:'Chassis reinforcement',min:0,max:100,st:5,u:'%',h:'Extra tubes / plies: +stiffness, +mass.'},
 {k:'runner',l:'Intake runner length',min:200,max:450,st:5,u:'mm',h:'ICE only. Longer runners lower the Helmholtz tuned rpm.',ice:1}
];
const TREE=[
 {id:'p1',br:'Powertrain',tier:1,n:'Dyno calibration I',e:'+3% power',c:2,rd:'power'},
 {id:'p2',br:'Powertrain',tier:2,n:'Dyno calibration II',e:'+3% power',c:2,req:['p1'],rd:'power'},
 {id:'lc',br:'Powertrain',tier:2,n:'Launch control',e:'+6% traction off the line (accel, 3D launch)',c:2,req:['p1'],rd:'launch'},
 {id:'p3',br:'Powertrain',tier:3,n:'Knock-sensing ECU',e:'+3% power (knock-sensing lets the ECU hold timing)',c:3,req:['p2'],rd:'power'},
 {id:'g1',br:'Vehicle dynamics',tier:1,n:'Tire data I',e:'+1.5% grip',c:2,rd:'grip'},
 {id:'g2',br:'Vehicle dynamics',tier:2,n:'Tire data II',e:'+1.5% grip',c:2,req:['g1'],rd:'grip'},
 {id:'tc',br:'Vehicle dynamics',tier:2,n:'Traction control',e:'Unlocks TC driver aid in the 3D car',c:2,req:['g1'],rd:'tc'},
 {id:'g3',br:'Vehicle dynamics',tier:3,n:'Kinematics & compliance rig',e:'+1.5% grip',c:3,req:['g2'],rd:'grip'},
 {id:'l1',br:'Structures',tier:1,n:'Lightweighting I',e:'−3 kg',c:2,rd:'light'},
 {id:'ti',br:'Structures',tier:2,n:'Titanium machining',e:'Unlocks Ti-6Al-4V components',c:2,req:['l1'],rd:'ti'},
 {id:'l2',br:'Structures',tier:2,n:'Lightweighting II',e:'−3 kg',c:2,req:['l1'],rd:'light'},
 {id:'pp',br:'Structures',tier:3,n:'Prepreg & autoclave',e:'Unlocks carbon prepreg components',c:3,req:['l2'],rd:'prepreg'},
 {id:'c1',br:'Aero & thermal',tier:1,n:'Thermal CFD I',e:'+10% cooling',c:1,rd:'cool'},
 {id:'c2',br:'Aero & thermal',tier:2,n:'Thermal CFD II',e:'+10% cooling',c:1,req:['c1'],rd:'cool'},
 {id:'el3',br:'Aero & thermal',tier:2,n:'3-element wing tooling',e:'Unlocks 3-element wings',c:2,req:['c1'],rd:'el3'},
 {id:'q1',br:'Reliability',tier:1,n:'QA process I',e:'−25% failure risk',c:2,rd:'qa'},
 {id:'q2',br:'Reliability',tier:2,n:'QA process II',e:'−25% failure risk',c:2,req:['q1'],rd:'qa'}
];
function rdFromTree(tree){const rd={};for(const id of tree||[]){const n=TREE.find(x=>x.id===id);if(n)rd[n.rd]=(rd[n.rd]||0)+1;}return rd;}
const STYLES={cons:{l:'Conservative',use:.935,risk:.7,wear:.8},bal:{l:'Balanced',use:.965,risk:1,wear:1},agg:{l:'Aggressive',use:.99,risk:1.5,wear:1.3}};
const RIVALS=[
 {name:'Northfield Tech',col:'#3fa9f5',q:.92,parts:{chassis:'carbon',power:'ev',tires:'s13',susp:'kin',brakes:'big',cooling:'ducted',aero:'wing'},tune:{wing:12,abal:45,fd:3.6,psi:11,camber:-1.8,arb:0,fw:46,sf:1.5}},
 {name:'Bavarian Polytechnic',col:'#a77bff',q:.88,parts:{chassis:'hybrid',power:'i4',tires:'s13',susp:'kin',brakes:'float',cooling:'dual',aero:'wing'},tune:{wing:11,abal:46,fd:4.0,psi:11.5,camber:-1.6,arb:1,fw:47,sf:1.5}},
 {name:'Cascade State',col:'#19d3c5',q:.8,parts:{chassis:'alu',power:'single',tires:'s10',susp:'adj',brakes:'float',cooling:'small',aero:'tray'},tune:{fd:4.2,psi:11,camber:-1.7,arb:-1,fw:46,sf:1.5,abal:45}},
 {name:'Kyoto Institute',col:'#ffb020',q:.84,parts:{chassis:'carbon',power:'single',tires:'s13',susp:'kin',brakes:'float',cooling:'small',aero:'wing'},tune:{wing:10,abal:46,fd:4.1,psi:11,camber:-1.9,arb:0,fw:46.5,sf:1.4}},
 {name:'Lakeside University',col:'#ff6fb1',q:.7,parts:{chassis:'steel',power:'i4',tires:'h13',susp:'adj',brakes:'float',cooling:'dual',aero:'none'},tune:{fd:3.8,psi:13,camber:-1.5,arb:2,fw:48,sf:1.7}},
 {name:'Pampas Racing',col:'#8bd34a',q:.65,parts:{chassis:'steel',power:'single',tires:'h10',susp:'basic',brakes:'std',cooling:'small',aero:'none'},tune:{fd:4.0,psi:13.5,camber:-1.2,arb:3,fw:49,sf:1.8}}
];
const DEF_TUNE={wb:1550,fw:46,rh:35,fd:3.8,arb:0,psi:12,camber:-1.8,reinf:20,runner:300,style:'bal'};

/* ================= HELPERS ================= */
const $=s=>document.querySelector(s);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const part=(cat,id)=>PARTS[cat].items.find(p=>p.id===id)||PARTS[cat].items[0];
const money=n=>(n<0?'−$':'$')+Math.abs(Math.round(n)).toLocaleString('en-US');
const f1=x=>(+x).toFixed(1), f2=x=>(+x).toFixed(2), f0=x=>Math.round(x).toString();
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const deep=o=>JSON.parse(JSON.stringify(o));
let S=null; // global state
const U=()=>S&&S.units==='si'?'si':'imp';
const spd=v=>U()==='si'?f0(v*3.6)+' km/h':f0(v*MPH)+' mph';
const spd1=v=>U()==='si'?f1(v*3.6)+' km/h':f1(v*MPH)+' mph';
const dist=m=>U()==='si'?f1(m)+' m':f0(m*FT)+' ft';
const both=v=>`${f1(v*MPH)} mph = ${f1(v)} m/s`;
const fmtT=t=>{if(!isFinite(t))return'DNF';const m=Math.floor(t/60),s=t-m*60;return m?`${m}:${s.toFixed(2).padStart(5,'0')}`:s.toFixed(3)+'s'};

