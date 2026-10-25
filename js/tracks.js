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
 return{...def,pts,zones,len:L};
}
const TRACKS={
 autox:{name:'FSAE Autocross',desc:'Tight, technical course. Standing start, one lap.',closed:true,segs:[
  ['S',80,1],['C',8,90,'T1'],['S',60],['C',12,-45],['C',12,90,'Slalom'],['C',12,-90],['C',12,45],['C',15,45,'T2'],['C',10,-60,'T3'],['S',50],['C',7,120,'Hairpin'],['S',100],['C',18,90,'T5'],['C',8,-45,'T6'],['S',50,1],['C',10,120,'T7'],['C',20,-30],['S',40],['C',9,90,'T8'],['C',15,-60]]},
 endu:{name:'Endurance Loop',desc:'~1 km flowing-but-tight loop. 22 laps = 22 km.',closed:true,segs:[
  ['S',200],['C',12,90,'T1'],['S',120],['C',20,45,'T2'],['C',15,-60,'T3'],['S',100],['C',10,120,'T4'],['S',160,1],['C',25,90,'T5'],['C',9,-45,'T6'],['S',80,1],['C',14,120,'T7'],['C',30,-30],['S',60],['C',11,90,'T8'],['C',20,-60]]},
 flow:{name:'Flow Ring Test Circuit',desc:'Fast test circuit: 250 m approach into the 45 m sweeper (Turn 3) and a 300 m back straight.',closed:true,segs:[
  ['S',150,1],['C',15,90,'T1'],['S',60],['C',25,-45,'T2'],['S',250],['C',45,135,'T3'],['S',300,0,'Back straight'],['C',14,90,'T4'],['S',80,1],['C',20,90,'T5']]},
 accel:{name:'Acceleration Strip',desc:'75 m standing start.',closed:false,segs:[['S',75]]},
 drag:{name:'0–60 Strip',desc:'250 m strip for 0–60 mph runs.',closed:false,segs:[['S',250]]},
 skid:{name:'Skidpad',desc:'Figure-8, 15.25 m inner circle. Timed lap on each side.',closed:true,segs:[['C',9.125,360,'Right'],['C',9.125,-360,'Left']]}
};
const TR={};for(const k in TRACKS)TR[k]=buildTrack(TRACKS[k]);

