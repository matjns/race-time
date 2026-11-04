/* ================= TRACKS ================= */
function buildTrack(def){
 // segments: ['S',len,adj] or ['C',r,deg,label]
 const segs=deep(def.segs);
 const walk=()=>{let x=0,y=0,h=0;const adj=[];for(const s of segs){if(s[0]==='S'){if(s[2])adj.push({s,dx:Math.cos(h),dy:Math.sin(h)});x+=Math.cos(h)*s[1];y+=Math.sin(h)*s[1];}else{const r=s[1],a=s[2]*Math.PI/180,sg=Math.sign(a);const cx=x-Math.sin(h)*r*sg,cy=y+Math.cos(h)*r*sg;h+=a;x=cx+Math.sin(h)*r*sg;y=cy-Math.cos(h)*r*sg;}}return{x,y,adj}};
 if(def.closed){const w=walk();if(w.adj.length===2){const[a,b]=w.adj;const det=a.dx*b.dy-a.dy*b.dx;if(Math.abs(det)<.1)throw new Error('track closure degenerate');const ex=-w.x,ey=-w.y;const la=(ex*b.dy-ey*b.dx)/det,lb=(a.dx*ey-a.dy*ex)/det;a.s[1]+=la;b.s[1]+=lb;}def.adjLens=w.adj.map(q=>q.s[1]);}
 const pts=[];let x=0,y=0,h=0;const ds=1;const zones=[];
 for(const s of segs){const st=pts.length;
  if(s[0]==='S'){const n=Math.max(1,Math.round(s[1]/ds));const d=s[1]/n;for(let i=0;i<n;i++){pts.push({x,y,h,k:0,d});x+=Math.cos(h)*d;y+=Math.sin(h)*d;}}
  else{const r=s[1],a=s[2]*Math.PI/180,L=Math.abs(a)*r,n=Math.max(2,Math.round(L/ds)),d=L/n,da=a/n;for(let i=0;i<n;i++){pts.push({x,y,h,k:1/r,d,sg:Math.sign(a)});x+=Math.cos(h+da/2)*d;y+=Math.sin(h+da/2)*d;h+=da;}}
  if(s[3]||s[4])zones.push({label:s[3]||s[4],i0:st,i1:pts.length-1,r:s[0]==='C'?s[1]:0});
 }
 if(!def.closed)pts.push({x,y,h,k:0,d:0});
 let L=0;for(const p of pts){p.s=L;L+=p.d;}
 const tr={...def,pts,zones,len:L};applyElev(tr);
 return tr;
}
/* ---- ELEVATION (v2.2) ----
   Each track carries a list of raised-cosine bumps [centre s (m), half-width w (m), height h (m)]:
     z(u) = h·(1+cos(πu/w))/2  for |u|<w   (u = distance from the bump centre, wrapped on closed loops)
   Summing them gives smooth hills (+h) and dips (−h), periodic on a closed loop so z(0)=z(L).
   Per point we store z, grade z' = dz/ds, cosθ / sinθ and vertical curvature κv = z''/(1+z'²)^1.5
   (κv<0 → crest, road falls away; κv>0 → dip/compression). Physics uses:
     longitudinal: −m g sinθ        normal load: N = m (g cosθ + v² κv) + ½ ρ C_L A v²  */
function applyElev(tr){
 const B=tr.elev||[],L=tr.len,pts=tr.pts;let zmin=0,zmax=0;
 for(const p of pts){let z=0,z1=0,z2=0;
  for(const[c,w,h]of B){let u=p.s-c;if(tr.closed){u=((u%L)+L*1.5)%L-L/2;}
   if(Math.abs(u)>=w)continue;const a=Math.PI/w;z+=h*(1+Math.cos(a*u))/2;z1+=-h*a*Math.sin(a*u)/2;z2+=-h*a*a*Math.cos(a*u)/2;}
  const q=1+z1*z1;p.z=z;p.gr=z1;p.cs=1/Math.sqrt(q);p.sn=z1/Math.sqrt(q);p.kv=z2/Math.pow(q,1.5);
  zmin=Math.min(zmin,z);zmax=Math.max(zmax,z);}
 tr.zmin=zmin;tr.zmax=zmax;
 // crest / dip features for the 2D viewer, analytics markers and the Chief's debrief
 const feats=[];let cur=null;
 pts.forEach((p,i)=>{const t=p.kv<-1/900?'crest':p.kv>1/900?'dip':null;
  if(t&&cur&&cur.type===t){if(Math.abs(p.kv)>Math.abs(pts[cur.iPk].kv))cur.iPk=i;cur.i1=i;}
  else{if(cur)feats.push(cur);cur=t?{type:t,i0:i,i1:i,iPk:i}:null;}});
 if(cur)feats.push(cur);
 for(const f of feats){f.R=1/Math.abs(pts[f.iPk].kv);f.z=pts[f.iPk].z;}
 tr.feats=feats.filter(f=>f.i1-f.i0>=4);
}
// Elevation helper used by the 3D view: height of the road at fractional index (smooth between points)
function zAtIdx(tr,fi){const n=tr.pts.length;let i=Math.floor(fi),f=fi-i;i=((i%n)+n)%n;const j=tr.closed?(i+1)%n:Math.min(i+1,n-1);return tr.pts[i].z*(1-f)+tr.pts[j].z*f;}
const TRACKS={
 autox:{name:'FSAE Autocross',desc:'Tight, technical course. Standing start, one lap.',closed:true,segs:[
  ['S',80,1],['C',8,90,'T1'],['S',60],['C',12,-45],['C',12,90,'Slalom'],['C',12,-90],['C',12,45],['C',15,45,'T2'],['C',10,-60,'T3'],['S',50],['C',7,120,'Hairpin'],['S',100],['C',18,90,'T5'],['C',8,-45,'T6'],['S',50,1],['C',10,120,'T7'],['C',20,-30],['S',40],['C',9,90,'T8'],['C',15,-60]],
  // crest on the T1→slalom straight, compression after the hairpin, a hill through T5/T6, a dip before T7
  elev:[[126,30,1.5],[346,40,-1.5],[420,45,2],[532,30,-1]]},
 endu:{name:'Endurance Loop',desc:'~1 km flowing-but-tight loop. 22 laps = 22 km.',closed:true,segs:[
  ['S',200],['C',12,90,'T1'],['S',120],['C',20,45,'T2'],['C',15,-60,'T3'],['S',100],['C',10,120,'T4'],['S',160,1],['C',25,90,'T5'],['C',9,-45,'T6'],['S',80,1],['C',14,120,'T7'],['C',30,-30],['S',60],['C',11,90,'T8'],['C',20,-60]],
  // a big crest on the main straight (brake for T1 after it), a dip on the T3→T4 straight, crest on the long straight, T7 bowl
  elev:[[115,70,3],[420,40,-2],[605,60,2.5],[940,50,-1.5]]},
 flow:{name:'Flow Ring Test Circuit',desc:'Fast test circuit: 250 m approach into the 45 m sweeper (Turn 3) and a 300 m back straight.',closed:true,segs:[
  ['S',150,1],['C',15,90,'T1'],['S',60],['C',25,-45,'T2'],['S',250],['C',45,135,'T3'],['S',300,0,'Back straight'],['C',14,90,'T4'],['S',80,1],['C',20,90,'T5']],
  // hill through T1/T2, blind crest on the T3 approach (braking starts on the downslope), compression on the back straight
  elev:[[190,45,2],[372,62,3],[740,80,-3]]},
 accel:{name:'Acceleration Strip',desc:'75 m standing start.',closed:false,segs:[['S',75]],elev:[[38,30,-.3]]},
 drag:{name:'0–60 Strip',desc:'250 m strip for 0–60 mph runs.',closed:false,segs:[['S',250]],elev:[[170,60,.8]]},
 skid:{name:'Skidpad',desc:'Figure-8, 15.25 m inner circle. Timed lap on each side.',closed:true,segs:[['C',9.125,360,'Right'],['C',9.125,-360,'Left']]} // skidpad stays level: steady-state cornering needs flat ground
};
const TR={};for(const k in TRACKS)TR[k]=buildTrack(TRACKS[k]);

