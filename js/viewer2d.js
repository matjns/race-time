/* ================= RACE VIEWER ================= */
function Viewer(host,teleHost){
 host.innerHTML=`<canvas class="cv" width="1600" height="900"></canvas>
 <div class="row" style="margin-top:8px;flex-wrap:wrap"><span class="small mut">Playback</span><div class="toggle" id="spdT">${[1,4,16,64].map(s=>`<button data-x="${s}">${s}×</button>`).join('')}</div><button class="btn sm" id="vSkip">Skip ▶▶</button><span class="sp"></span><span id="vBanner" class="pill"></span></div>
 <canvas class="spark" width="1600" height="150" style="margin-top:8px;background:#0b1119;border-radius:9px;border:1px solid var(--line)"></canvas>`;
 const cv=host.querySelector('canvas.cv'),cx=cv.getContext('2d'),tc=host.querySelector('canvas.spark'),tx=tc.getContext('2d');
 let spec=null,raf=0,tau=0,speed=1,last=0,bg=null,tf=null,trail=[],done=false,frame=0;
 const setSpd=x=>{speed=x;host.querySelectorAll('#spdT button').forEach(b=>b.className=+b.dataset.x===x?'on':'');};
 host.querySelectorAll('#spdT button').forEach(b=>b.onclick=()=>setSpd(+b.dataset.x));
 host.querySelector('#vSkip').onclick=()=>{if(spec){tau=spec.total;}};
 setSpd(1);
 teleHost.innerHTML=`<div class="tele">${[['spd','Speed'],['lat','Lateral g'],['lon','Long g'],['lap','Lap'],['lt','Lap time'],['best','Best lap'],['cool','Coolant'],['tire','Tire temp']].map(([k,l])=>`<div class="t"><small>${l}</small><b id="tl_${k}">—</b></div>`).join('')}<div class="t wide"><small>Tire wear</small><div class="bar" style="height:9px"><i id="tl_wear" style="width:0"></i></div><div class="small mut" id="tl_wtxt" style="margin-top:3px">—</div></div></div>`;
 function idle(title){stop();spec=null;drawIdle(title);}
 function drawIdle(title){cx.fillStyle='#0c1410';cx.fillRect(0,0,cv.width,cv.height);grid();cx.fillStyle='#8b97a8';cx.font='600 34px -apple-system,Segoe UI,sans-serif';cx.textAlign='center';cx.fillText(title||'Choose a test to run',cv.width/2,cv.height/2);tx.clearRect(0,0,tc.width,tc.height);}
 function grid(){cx.strokeStyle='rgba(255,255,255,.035)';cx.lineWidth=1;for(let x=0;x<cv.width;x+=50){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,cv.height);cx.stroke();}for(let y=0;y<cv.height;y+=50){cx.beginPath();cx.moveTo(0,y);cx.lineTo(cv.width,y);cx.stroke();}}
 function makeBg(tr){const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const g=c.getContext('2d');
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;for(const p of tr.pts){mnx=Math.min(mnx,p.x);mxx=Math.max(mxx,p.x);mny=Math.min(mny,p.y);mxy=Math.max(mxy,p.y);}
  const pad=90,w=mxx-mnx||1,h=mxy-mny||1;let s=Math.min((c.width-2*pad)/w,(c.height-2*pad)/h);if(!isFinite(s))s=1;
  const ox=(c.width-w*s)/2,oy=(c.height-h*s)/2;tf={X:x=>ox+(x-mnx)*s,Y:y=>c.height-(oy+(y-mny)*s),s};
  g.fillStyle='#0c1410';g.fillRect(0,0,c.width,c.height);const cxs=cx;
  g.strokeStyle='rgba(255,255,255,.035)';for(let x=0;x<c.width;x+=50){g.beginPath();g.moveTo(x,0);g.lineTo(x,c.height);g.stroke();}for(let y=0;y<c.height;y+=50){g.beginPath();g.moveTo(0,y);g.lineTo(c.width,y);g.stroke();}
  const tw=Math.max(16,Math.min(60,6.5*s));
  const path=()=>{g.beginPath();tr.pts.forEach((p,i)=>i?g.lineTo(tf.X(p.x),tf.Y(p.y)):g.moveTo(tf.X(p.x),tf.Y(p.y)));if(tr.closed)g.closePath();};
  g.lineJoin='round';g.lineCap='round';
  path();g.strokeStyle='#1d2a22';g.lineWidth=tw+26;g.stroke();
  path();g.strokeStyle='#e8e8e8';g.lineWidth=tw+6;g.stroke();
  path();g.strokeStyle='#2b3038';g.lineWidth=tw;g.stroke();
  // kerbs on corners
  g.setLineDash([10,10]);for(const z of tr.zones){if(!z.r)continue;g.beginPath();for(let i=z.i0;i<=z.i1;i++){const p=tr.pts[i];i===z.i0?g.moveTo(tf.X(p.x),tf.Y(p.y)):g.lineTo(tf.X(p.x),tf.Y(p.y));}g.strokeStyle='rgba(225,6,0,.55)';g.lineWidth=tw+6;g.stroke();}
  g.setLineDash([]);path();g.strokeStyle='#2b3038';g.lineWidth=tw-4;g.stroke();
  path();g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;g.setLineDash([14,18]);g.stroke();g.setLineDash([]);
  // start line
  const p0=tr.pts[0];g.save();g.translate(tf.X(p0.x),tf.Y(p0.y));g.rotate(-p0.h);for(let i=0;i<6;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(j*7-7,-tw/2+i*tw/6,7,tw/6);}g.restore();
  if(!tr.closed){const pe=tr.pts[tr.pts.length-1];g.fillStyle='#e10600';g.fillRect(tf.X(pe.x)-4,tf.Y(pe.y)-tw/2-6,8,tw+12);}
  // labels
  g.font='700 24px -apple-system,Segoe UI,sans-serif';g.textAlign='center';
  // labels with collision avoidance: try several offsets on both sides, reject overlaps with other labels, the track ribbon and HUD boxes
  const placed=[[cv.width-340,10,cv.width-10,148],[0,0,560,60]];const ov=(r,q)=>!(r[2]<q[0]||r[0]>q[2]||r[3]<q[1]||r[1]>q[3]);
  const hitsTrack=r=>{for(let i=0;i<tr.pts.length;i+=2){const X=tf.X(tr.pts[i].x),Y=tf.Y(tr.pts[i].y);if(X>r[0]-tw/2&&X<r[2]+tw/2&&Y>r[1]-tw/2&&Y<r[3]+tw/2)return true;}return false;};
  for(const z of tr.zones){const p=tr.pts[(z.i0+z.i1)>>1];const txt=z.label+(z.r?` · r${f0(z.r)}m`:'');const tw2=g.measureText(txt).width+16;
   let best=null;
   outer:for(const side of[1,-1])for(const extra of[30,60,95,135,180]){const nx=-Math.sin(p.h)*(p.sg||1)*side,ny=Math.cos(p.h)*(p.sg||1)*side;const off=tw/2+extra;
    const X=tf.X(p.x-nx*off/s),Y=tf.Y(p.y-ny*off/s);const r=[X-tw2/2,Y-17,X+tw2/2,Y+11];
    if(r[0]<4||r[2]>cv.width-4||r[1]<4||r[3]>cv.height-4)continue;if(placed.some(q=>ov(r,q)))continue;if(hitsTrack(r))continue;best={X,Y,r};break outer;}
    if(!best){const X=tf.X(p.x),Y=tf.Y(p.y)-tw/2-40;best={X,Y,r:[X-tw2/2,Y-17,X+tw2/2,Y+11]};}
   placed.push(best.r);const{X,Y}=best;
   g.strokeStyle='rgba(201,211,224,.35)';g.lineWidth=2;g.beginPath();g.moveTo(tf.X(p.x),tf.Y(p.y));g.lineTo(X,Y-3);g.stroke();
   g.fillStyle='rgba(10,13,18,.82)';g.fillRect(X-tw2/2,Y-17,tw2,28);g.fillStyle=z.label==='T3'?'#ffb020':'#c9d3e0';g.fillText(txt,X,Y+5);}
  g.fillStyle='#8b97a8';g.textAlign='left';g.font='600 22px -apple-system,Segoe UI,sans-serif';g.fillText(tr.name+' · '+(tr.len>=1000?f2(tr.len/1000)+' km':f0(tr.len)+' m'),24,40);
  return c;}
 function at(r,tl){const t=r.t;let lo=0,hi=t.length-1;if(tl>=t[hi])return{i:hi,f:0};while(hi-lo>1){const m=(lo+hi)>>1;if(t[m]<=tl)lo=m;else hi=m;}const f=(tl-t[lo])/Math.max(1e-6,t[lo+1]-t[lo]);return{i:lo,f:clamp(f,0,1)};}
 function pos(tr,r,tl){const{i,f}=at(r,tl);const a=tr.pts[i],b=tr.pts[Math.min(i+1,tr.pts.length-1)];return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,h:a.h,v:r.v[i]+(r.v[Math.min(i+1,r.v.length-1)]-r.v[i])*f,ax:r.ax[i],ay:r.ay[i],i};}
 function car(p,col,big){const X=tf.X(p.x),Y=tf.Y(p.y);cx.save();cx.translate(X,Y);cx.rotate(-p.h);const L=big?34:26,W=big?16:12;
  cx.shadowColor=col;cx.shadowBlur=18;cx.fillStyle=col;cx.beginPath();cx.moveTo(L/2+6,0);cx.lineTo(L/2-4,-W/2);cx.lineTo(-L/2,-W/2);cx.lineTo(-L/2,W/2);cx.lineTo(L/2-4,W/2);cx.closePath();cx.fill();cx.shadowBlur=0;
  cx.fillStyle='#111';cx.fillRect(L/2-10,-W/2-4,7,4);cx.fillRect(L/2-10,W/2,7,4);cx.fillRect(-L/2+2,-W/2-4,8,4);cx.fillRect(-L/2+2,W/2,8,4);cx.fillStyle='#fff';cx.beginPath();cx.arc(-2,0,3.5,0,7);cx.fill();cx.restore();}
 function play(sp){stop();spec=sp;done=false;tau=0;trail=[];bg=makeBg(sp.track);
  let c=0;spec.starts=sp.laps.map(l=>{const s=c;c+=l.r.time;return s;});spec.total=c;
  if(sp.ghost){let g=0;sp.ghost.starts=sp.ghost.laps.map(l=>{const s=g;g+=l.r.time;return s;});sp.ghost.total=g;}
  setSpd(sp.speed||1);last=performance.now();host.querySelector('#vBanner').textContent=sp.title||'';host.querySelector('#vBanner').className='pill b';raf=requestAnimationFrame(loop);}
 function lapAt(L,starts,tt){let k=0;while(k<starts.length-1&&tt>=starts[k+1])k++;return k;}
 function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;tau+=dt*speed;frame++;
  if(tau>=spec.total){tau=spec.total;}
  const k=lapAt(0,spec.starts,tau);const lap=spec.laps[k];const tl=tau-spec.starts[k];
  if(spec.accelAfter!=null&&k>=spec.accelAfter&&speed<64&&!spec._acc){spec._acc=1;setSpd(64);host.querySelector('#vBanner').textContent=`⏩ TIME-ACCELERATED — extrapolating from your reference lap${spec.accelAfter>1?'s':''}`;host.querySelector('#vBanner').className='pill a';}
  const p=pos(spec.track,lap.r,tl);
  cx.drawImage(bg,0,0);
  trail.push([p.x,p.y]);if(trail.length>50)trail.shift();
  cx.lineCap='round';for(let i=1;i<trail.length;i++){cx.strokeStyle=`rgba(225,6,0,${i/trail.length*.6})`;cx.lineWidth=4;cx.beginPath();cx.moveTo(tf.X(trail[i-1][0]),tf.Y(trail[i-1][1]));cx.lineTo(tf.X(trail[i][0]),tf.Y(trail[i][1]));cx.stroke();}
  if(spec.ghost){const G2=spec.ghost;const gt=Math.min(tau,G2.total);const gk=lapAt(0,G2.starts,gt);const gp=pos(spec.track,G2.laps[gk].r,gt-G2.starts[gk]);car(gp,G2.col,false);cx.fillStyle=G2.col;cx.font='600 18px -apple-system,sans-serif';cx.textAlign='left';cx.fillText(G2.name,tf.X(gp.x)+16,tf.Y(gp.y)-14);}
  car(p,'#e10600',true);
  // HUD
  cx.fillStyle='rgba(10,13,18,.82)';cx.fillRect(cv.width-330,20,310,118);cx.fillStyle='#fff';cx.textAlign='right';cx.font='800 54px -apple-system,sans-serif';cx.fillText(fmtT(tau).replace('s',''),cv.width-36,82);cx.font='600 22px -apple-system,sans-serif';cx.fillStyle='#8b97a8';cx.fillText(`LAP ${k+1}/${spec.laps.length} · ${spd(p.v)}`,cv.width-36,120);
  if(spec.dnf&&tau>=spec.total){cx.fillStyle='rgba(225,6,0,.9)';cx.fillRect(0,cv.height/2-50,cv.width,100);cx.fillStyle='#fff';cx.textAlign='center';cx.font='800 40px -apple-system,sans-serif';cx.fillText('DNF — '+spec.dnf,cv.width/2,cv.height/2+14);}
  if(frame%3===0||tau>=spec.total){tele(p,lap,k,tl);trace(lap.r,p.i,spec.ghost?spec.ghost.laps[Math.min(k,spec.ghost.laps.length-1)].r:null);}
  if(tau>=spec.total){if(!done){done=true;host.querySelector('#vBanner').textContent='Finished';host.querySelector('#vBanner').className='pill g';spec.onDone&&spec.onDone();}return;}
  raf=requestAnimationFrame(loop);}
 function tele(p,lap,k,tl){const set=(id,v)=>{const e=document.getElementById('tl_'+id);if(e)e.textContent=v;};
  set('spd',spd(p.v));set('lat',f2(Math.abs(p.ay))+' g');set('lon',(p.ax>=0?'+':'')+f2(p.ax)+' g');set('lap',`${k+1} / ${spec.laps.length}`);set('lt',fmtT(tl));
  const done=spec.laps.slice(0,k+(tl>=lap.r.time-1e-6?1:0));set('best',done.length?fmtT(Math.min(...done.map(l=>l.r.time))):'—');
  set('cool',lap.coolT!=null?f0(lap.coolT)+' °C':'—');set('tire',lap.tireT!=null?f0(lap.tireT)+' °C':'—');
  const w=lap.wear!=null?lap.wear:0;const e=document.getElementById('tl_wear');if(e){e.style.width=clamp(w*100,0,100)+'%';e.parentElement.className='bar'+(w<.7?' g':'');}
  const wt=document.getElementById('tl_wtxt');if(wt)wt.textContent=lap.wear!=null?`${f1(w*100)}% worn · ${f2((lap.wl||0)*100)}%/lap`:'—';
  const cc=document.getElementById('tl_cool');if(cc)cc.style.color=lap.coolT>105?'#ff6b63':'';}
 function trace(r,i,gr){const W=tc.width,H=tc.height;tx.clearRect(0,0,W,H);const vm=Math.max(...r.v,gr?Math.max(...gr.v):0)*1.08;const n=r.v.length;
  const line=(arr,col,lw)=>{tx.strokeStyle=col;tx.lineWidth=lw;tx.beginPath();for(let j=0;j<arr.length;j+=2){const X=j/(arr.length-1)*W,Y=H-8-arr[j]/vm*(H-24);j?tx.lineTo(X,Y):tx.moveTo(X,Y);}tx.stroke();};
  if(gr)line(gr.v,'rgba(63,169,245,.55)',2);line(r.v,'rgba(255,255,255,.25)',2);
  tx.strokeStyle='#e10600';tx.lineWidth=3;tx.beginPath();for(let j=0;j<=i;j+=2){const X=j/(n-1)*W,Y=H-8-r.v[j]/vm*(H-24);j?tx.lineTo(X,Y):tx.moveTo(X,Y);}tx.stroke();
  tx.fillStyle='#8b97a8';tx.font='600 20px -apple-system,sans-serif';tx.textAlign='left';tx.fillText('Speed trace vs distance'+(gr?' (blue = rival)':''),12,24);tx.textAlign='right';tx.fillText('max '+spd(vm/1.08),W-12,24);}
 function info(drawFn){stop();spec=null;cx.fillStyle='#0c1410';cx.fillRect(0,0,cv.width,cv.height);grid();drawFn(cx,cv.width,cv.height);tx.clearRect(0,0,tc.width,tc.height);}
 function stop(){cancelAnimationFrame(raf);}
 drawIdle();
 return{play,stop,idle,info,skip:()=>{if(spec)tau=spec.total;}};
}

