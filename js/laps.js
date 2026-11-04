'use strict';
/* ================= LAPS: compact telemetry format shared by the 3D driver, sim-driver and analytics ================= */
const TW={autox:5,endu:6.5,flow:9,accel:5,drag:6,skid:3.5};
const TCH=[ // channel registry for analytics
 {k:'v',l:'Speed',u:'spd',col:'#4ea1ff'},{k:'thr',l:'Throttle',u:'%',col:'#2ecc71',max:1},{k:'brk',l:'Brake',u:'%',col:'#ff4d4d',max:1},
 {k:'st',l:'Steering',u:'°',col:'#ffb020'},{k:'g',l:'Gear',u:'',col:'#c39bff'},{k:'rpm',l:'RPM',u:'rpm',col:'#ff7ab6'},
 {k:'ax',l:'Long g',u:'g',col:'#7fdbca'},{k:'ay',l:'Lat g',u:'g',col:'#f78c6c'},{k:'off',l:'Line offset',u:'m',col:'#aab3c0'},
 {k:'tt',l:'Tire temp',u:'°C',col:'#ffd166'},{k:'ct',l:'Coolant',u:'°C',col:'#ef476f'},
 {k:'z',l:'Elevation',u:'m',col:'#b5e48c'},{k:'nz',l:'Vertical load',u:'g',col:'#90e0ef'}];
/* ---- TRACK LIMITS (v2.2) — modelled on FSAE's "off course" rule, scaled for a video game ----
   An incident = all four tyre contact patches past the white line (kerbs are outside the line). */
const TL_PEN=1,TL_OC_T=2,TL_OC_PEN=20,TL_MAX=4;
const TL_RULE=`<b>Track-limits rule:</b> the white line is the edge of the track and kerbs are outside it. If <b>all four wheels</b> cross the line, that is an incident: <b>+${TL_PEN} s</b>. Off for more than <b>${TL_OC_T} s</b> counts as <b>off course: +${TL_OC_PEN} s</b> and the lap is <b>invalid</b> for records. ${TL_MAX} or more incidents in a lap also invalidate it. Cutting past a gate is still +20 s. (FSAE: +2 s per cone down/out, and an off-course penalty when a car leaves the course with all four wheels.)`;
// v2.2 channels derived from the track, so laps saved by older versions still show them
function elevCh(L){if(!L||!L.ch||!TR[L.track])return L;const pts=TR[L.track].pts,n=(L.ch.t||[]).length;
 if(!L.ch.z||L.ch.z.length!==n||L.ch.z.every(x=>x==null))L.ch.z=Array.from({length:n},(_,i)=>+(((pts[i]||pts[pts.length-1]).z||0).toFixed(2)));
 if(!L.ch.nz||L.ch.nz.length!==n||L.ch.nz.every(x=>x==null))L.ch.nz=Array.from({length:n},(_,i)=>{const p=pts[i]||pts[pts.length-1],v=(L.ch.v&&L.ch.v[i])||0;return +(((p.cs||1)+v*v*(p.kv||0)/G)).toFixed(2);});
 return L;}
const _rl={};
function racingLine(trk){if(_rl[trk])return _rl[trk];const tr=TR[trk],n=tr.pts.length,w=TW[trk]||5;
 if(trk==='skid'||trk==='accel'||trk==='drag'){return _rl[trk]=new Float32Array(n);}
 const a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=tr.pts[i].k>0?(tr.pts[i].sg||1)*Math.min(1,tr.pts[i].k*12):0;
 const sm=new Float32Array(n),R=6;const at=i=>tr.closed?a[(i%n+n)%n]:a[clamp(i,0,n-1)];
 for(let i=0;i<n;i++){let s=0;for(let j=-R;j<=R;j++)s+=at(i+j);sm[i]=s/(2*R+1);}
 const smA=i=>tr.closed?sm[(i%n+n)%n]:sm[clamp(i,0,n-1)];
 const o=new Float32Array(n);for(let i=0;i<n;i++){const c=smA(i),f=smA(i+22),b=smA(i-18);o[i]=(w/2-1.1)*clamp(c-.75*f*(1-Math.abs(c))-.6*b*(1-Math.abs(c)),-1,1);}
 const o2=new Float32Array(n);for(let i=0;i<n;i++){let s=0;for(let j=-5;j<=5;j++)s+=tr.closed?o[((i+j)%n+n)%n]:o[clamp(i+j,0,n-1)];o2[i]=s/11;}
 return _rl[trk]=o2;}
function newLap(trk,src){const n=TR[trk].pts.length,ch={};for(const c of TCH)ch[c.k]=new Array(n).fill(null);return{track:trk,src,season:S?S.season:0,time:0,raw:0,cones:0,pen:0,ch,date:Date.now()};}
function fillLap(L){const n=L.ch.t.length;for(const k of['t',...TCH.map(c=>c.k)]){const a=L.ch[k];if(!a)continue;let last=null;for(let i=0;i<n;i++){if(a[i]==null)a[i]=last;else last=a[i];}let first=a.find(x=>x!=null);for(let i=0;i<n&&a[i]==null;i++)a[i]=first==null?0:first;}return L;}
function roundLap(L){const r={t:3,v:2,thr:2,brk:2,st:1,g:0,rpm:-1,ax:2,ay:2,off:2,tt:1,ct:1};for(const k in L.ch){const d=r[k]==null?2:r[k];const m=Math.pow(10,d);L.ch[k]=L.ch[k].map(x=>x==null?null:Math.round(x*m)/m);}return L;}
function lapFromSim(D,trk,r,src,extra){const tr=TR[trk],n=tr.pts.length,L=newLap(trk,src||'sim');L.ch.t=[];const off=racingLine(trk);
 for(let i=0;i<n;i++){const v=r.v[i],g=gearAt(D,v);L.ch.t.push(r.t[i]);L.ch.v[i]=v;L.ch.ax[i]=r.ax[i];L.ch.ay[i]=r.ay[i];
  L.ch.thr[i]=r.ax[i]>.02?clamp(r.pw[i]/(D.kW*1000)*1.05,0,1):r.ax[i]>-.05?.25:0;L.ch.brk[i]=r.ax[i]<-.12?clamp(-r.ax[i]/(D.brake||1.4),0,1):0;
  L.ch.st[i]=Math.atan(D.t.wb/1000*tr.pts[i].k)*180/Math.PI*(tr.pts[i].sg||1)*14;L.ch.g[i]=g+1;L.ch.rpm[i]=D.ice?Math.min(D.redline,rpmAt(D,v,g)):v/D.rw*D.gearR[0]*60/(2*Math.PI);
  L.ch.off[i]=off[i];L.ch.tt[i]=extra&&extra.tt||70;L.ch.ct[i]=extra&&extra.ct||85;}
 L.ch.z=null;L.ch.nz=null;elevCh(L);L.elev=1;
 L.time=L.raw=r.time;return roundLap(L);}
function lapT(L,i){return L.ch.t[clamp(i,0,L.ch.t.length-1)];}
function deltaTrace(L,ref){const n=Math.min(L.ch.t.length,ref.ch.t.length),d=new Float32Array(n);for(let i=0;i<n;i++)d[i]=(L.ch.t[i]||0)-(ref.ch.t[i]||0);return d;}
function sectorsOf(trk){const tr=TR[trk];const n=tr.pts.length;if(!tr.zones.length||!tr.closed)return[{l:'S1',i0:0,i1:Math.floor(n/3)},{l:'S2',i0:Math.floor(n/3),i1:Math.floor(2*n/3)},{l:'S3',i0:Math.floor(2*n/3),i1:n-1}];
 // one sector per labelled corner zone: from previous zone end to this zone end
 const z=tr.zones.filter(z=>/^T\d|Hairpin|Slalom|Right|Left/.test(z.label));const out=[];let s=0;z.forEach((q,k)=>{const e=k===z.length-1?n-1:q.i1;out.push({l:q.label,i0:s,i1:e});s=e;});return out;}
function sectorTimes(L,trk){return sectorsOf(trk).map(s=>({l:s.l,i0:s.i0,i1:s.i1,t:(L.ch.t[s.i1]||0)-(L.ch.t[s.i0]||0)}));}
function bestRef(trk){return(S.ghosts&&S.ghosts[trk])||(S.records&&S.records[trk])||null;}
function storeLap(L){ // keep season best + all-time record per track (invalid laps — track limits — never count)
 S.laps=S.laps||{};S.records=S.records||{};const b=S.laps[L.track];let pb=false,rec=false;
 if(L.invalid){save();return{pb,rec,invalid:true};}
 if(!b||L.time<b.time){S.laps[L.track]=L;pb=true;}
 if(!S.records[L.track]||L.time<S.records[L.track].time){S.records[L.track]=L;rec=true;}
 save();return{pb,rec};}
function lapsList(){const o=[];if(!S)return o;const add=(L,lab)=>{if(L){elevCh(L);o.push({L,lab:lab+(L.invalid?' (invalid)':'')});}};
 if(typeof Drive!=='undefined')for(const L of(Drive.session||[]).slice(-6))add(L,`S${L.season} ${TR[L.track].name} ${L.src} ${fmtT(L.time)}`);
 for(const k in S.laps||{})add(S.laps[k],`Season best · ${TR[k].name} ${fmtT(S.laps[k].time)}`);
 for(const k in S.ghosts||{})add(S.ghosts[k],`Last season ghost · ${TR[k].name} ${fmtT(S.ghosts[k].time)}`);
 for(const k in S.records||{})add(S.records[k],`Record · ${TR[k].name} ${fmtT(S.records[k].time)}`);return o;}
