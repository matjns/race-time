'use strict';
/* ================= 3D DRIVING (PolyTrack-style low-poly) =================
   Dynamic bicycle model at 240 Hz using the SAME derived car D as the lap sim:
   friction-circle tires (Pacejka-lite), load transfer, aero downforce split by computed aero balance,
   drag ∝ v², torque curve from the engine model through 5 geared ratios, brake capacity, tire & coolant temps. */
const Drive=(()=>{
 let R=null;const session=[];
 const keys={};let audio=null;let keyHook=null;
 // all bindings come from Keys (js/keys.js) so players can remap them in the Controls screen
 function onKey(e,down){if(!R||Keys.isOpen)return;if(e.target&&/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;const act=Keys.actionFor(e.code);if(!act)return;
  const hold=['up','down','left','right','hb'];if(hold.includes(act)){keys[act]=down;e.preventDefault();return;}
  if(!down||e.repeat&&act!=='upshift'&&act!=='downshift')return;e.preventDefault();
  if(act==='pause')togglePause();
  else if(act==='reset')resetCar();
  else if(act==='camera'){R.camMode=(R.camMode+1)%4;S.drive.cam=R.camMode;msg(['Chase cam','Cockpit cam','TV cam','Top-down cam'][R.camMode],900);}
  else if(act==='downshift'){R.manual=true;shift(-1);}else if(act==='upshift'){R.manual=true;shift(1);}
  else if(act==='ghost'){R.showGhost=!R.showGhost;msg(R.showGhost?'Ghost on':'Ghost off',800);}
  else if(act==='tc'){if(S.rd.tc||S.mode==='sandbox'){R.tc=!R.tc;msg(R.tc?'Traction control ON':'Traction control OFF',900);}else msg('Traction control needs the Tech-tree node',1200);}
  else if(act==='assist'){R.assist=!R.assist;S.drive.assist=R.assist;save();msg(R.assist?'Stability assist ON':'Stability assist OFF — feather the throttle yourself',1200);}
  else if(act==='mute'){R.mute=!R.mute;if(audio)audio.g.gain.value=0;msg(R.mute?'Sound off':'Sound on',700);}
  if(!audio&&!R.mute)initAudio();}
 window.addEventListener('rt-keys',()=>{for(const k in keys)keys[k]=false;if(R){const h=R.host.querySelector('.d-help');if(h)h.innerHTML=Keys.hud();}});
 window.addEventListener('keydown',e=>onKey(e,true));window.addEventListener('keyup',e=>onKey(e,false));
 function initAudio(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ac=new C();const o=ac.createOscillator(),o2=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=900;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g);g.connect(ac.destination);o.start();o2.start();audio={ac,o,o2,g,f};}catch(e){audio=null;}}

 /* ---------- scene ---------- */
 function buildWorld(trk){const tr=TR[trk],pts=tr.pts,n=pts.length,w=TW[trk]||5;const scene=R.scene;
  const P=(i,off,y)=>{const p=pts[(i%n+n)%n];return new THREE.Vector3(p.x-Math.sin(p.h)*off,y||0,-(p.y+Math.cos(p.h)*off));};
  // bounds
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  const cx=(x0+x1)/2,cy=(y0+y1)/2,ext=Math.max(x1-x0,y1-y0)/2+160;R.bounds={cx,cy,ext,x0,x1,y0,y1};
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(ext*2.4,ext*2.4,24,24),new THREE.MeshStandardMaterial({color:0x7cc46a,flatShading:true,roughness:1}));
  {const pa=ground.geometry.attributes.position;for(let i=0;i<pa.count;i++){pa.setZ(i,(Math.sin(pa.getX(i)*.05)+Math.cos(pa.getY(i)*.04))*.08-.06);}ground.geometry.computeVertexNormals();}
  ground.rotation.x=-Math.PI/2;ground.position.set(cx,0,-cy);ground.receiveShadow=true;scene.add(ground);
  // track ribbon + edge lines + kerbs
  const ribbon=(offA,offB,y,col,seg)=>{const pos=[],cols=[];const c=new THREE.Color();const last=tr.closed?n:n-1;
   for(let i=0;i<last;i++){const a1=P(i,offA,y),b1=P(i,offB,y),a2=P(i+1,offA,y),b2=P(i+1,offB,y);pos.push(a1.x,a1.y,a1.z,b1.x,b1.y,b1.z,a2.x,a2.y,a2.z,b1.x,b1.y,b1.z,b2.x,b2.y,b2.z,a2.x,a2.y,a2.z);
    const cc=typeof col==='function'?col(i):col;c.set(cc);for(let k=0;k<6;k++)cols.push(c.r,c.g,c.b);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.computeVertexNormals();
   const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide}));m.receiveShadow=true;scene.add(m);return m;};
  ribbon(w/2,-w/2,.02,i=>(Math.floor(i/3)%2?0x474d56:0x4b515a));
  ribbon(w/2,w/2-.18,.03,0xf4f4f4);ribbon(-w/2+.18,-w/2,.03,0xf4f4f4);
  const kerb=i=>{const p=pts[i];return p.k>1/40?(Math.floor(i/2)%2?0xe63946:0xffffff):null;};
  ribbon(w/2+.9,w/2,.025,i=>kerb(i)||0x7cc46a);ribbon(-w/2,-w/2-.9,.025,i=>kerb(i)||0x7cc46a);
  // start/finish
  const sfm=new THREE.Mesh(new THREE.PlaneGeometry(1.2,w),new THREE.MeshBasicMaterial({map:checkerTex()}));sfm.rotation.x=-Math.PI/2;sfm.rotation.z=pts[0].h;const s0=P(0,0,.04);sfm.position.copy(s0);scene.add(sfm);
  const arch=new THREE.Group();const am=new THREE.MeshStandardMaterial({color:0x22262c,flatShading:true});
  for(const o of[w/2+1.2,-w/2-1.2]){const post=new THREE.Mesh(new THREE.BoxGeometry(.4,4.2,.4),am);post.position.copy(P(0,o,2.1));arch.add(post);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.5,.9,w+3),new THREE.MeshStandardMaterial({color:0xe10600,flatShading:true}));beam.position.copy(P(0,0,4.3));beam.rotation.y=pts[0].h;arch.add(beam);scene.add(arch);
  if(!tr.closed){const fin=sfm.clone();fin.position.copy(P(n-1,0,.04));scene.add(fin);}
  // cones (instanced) along both edges
  const cones=[];const step=i=>pts[i].k>1/30?5:11;
  for(let i=0;i<(tr.closed?n:n-1);i+=step(i))for(const o of[w/2+.35,-w/2-.35]){const v=P(i,o,0);cones.push({x:v.x,z:v.z,y:0,vx:0,vy:0,vz:0,hit:false,rot:0,rx:0});}
  const cg=new THREE.ConeGeometry(.16,.45,6);cg.translate(0,.225,0);
  const cm=new THREE.InstancedMesh(cg,new THREE.MeshStandardMaterial({color:0xff7a1a,flatShading:true}),cones.length);
  const M=new THREE.Matrix4();cones.forEach((c,i)=>{M.makeTranslation(c.x,0,c.z);cm.setMatrixAt(i,M);});cm.castShadow=true;scene.add(cm);R.cones=cones;R.coneMesh=cm;
  // scenery: low-poly trees, rocks, mountains, tents
  const rng=mulberry(hash(trk));const trees=[];const near=(x,z,d)=>{for(let i=0;i<n;i+=4){const p=pts[i];const dx=p.x-x,dz=-p.y-z;if(dx*dx+dz*dz<d*d)return true;}return false;};
  for(let k=0;k<420&&trees.length<240;k++){const x=cx+(rng()*2-1)*(ext-20),z=-cy+(rng()*2-1)*(ext-20);if(near(x,z,w/2+9))continue;trees.push([x,z,.7+rng()*.9]);}
  const tg=new THREE.ConeGeometry(1.4,3.6,6);tg.translate(0,3.2,0);const tk=new THREE.CylinderGeometry(.22,.28,1.6,5);tk.translate(0,.8,0);
  const tm=new THREE.InstancedMesh(tg,new THREE.MeshStandardMaterial({color:0x2f8f4e,flatShading:true}),trees.length),km=new THREE.InstancedMesh(tk,new THREE.MeshStandardMaterial({color:0x7a5230,flatShading:true}),trees.length);
  trees.forEach((t,i)=>{M.compose(new THREE.Vector3(t[0],0,t[1]),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rng()*6),new THREE.Vector3(t[2],t[2],t[2]));tm.setMatrixAt(i,M);km.setMatrixAt(i,M);});
  tm.castShadow=true;scene.add(tm,km);
  const mg=new THREE.ConeGeometry(1,1,5);for(let k=0;k<16;k++){const a=k/16*Math.PI*2+rng(),d=ext*1.05+rng()*40,h=30+rng()*60;const m=new THREE.Mesh(mg,new THREE.MeshStandardMaterial({color:k%2?0x8fa3b8:0x7d93aa,flatShading:true}));m.scale.set(h*1.6,h,h*1.6);m.position.set(cx+Math.cos(a)*d,h/2-2,-cy+Math.sin(a)*d);scene.add(m);
   const cap=new THREE.Mesh(mg,new THREE.MeshStandardMaterial({color:0xf4f7fb,flatShading:true}));cap.scale.set(h*.48,h*.3,h*.48);cap.position.set(m.position.x,h-2-h*.15+.1,m.position.z);scene.add(cap);}
  const tentCols=[0xe10600,0x4ea1ff,0xffb020,0xffffff];for(let k=0;k<6;k++){const p=P(Math.min(n-1,8+k*5),w/2+9+(k%2)*5,0);const t=new THREE.Mesh(new THREE.ConeGeometry(2.4,2.2,4),new THREE.MeshStandardMaterial({color:tentCols[k%4],flatShading:true}));t.position.set(p.x,1.1,p.z);t.rotation.y=Math.PI/4;t.castShadow=true;scene.add(t);}
  // corner labels as flags
  for(const zn of tr.zones){if(!/^T\d|Hairpin|Slalom/.test(zn.label))continue;const mid=Math.floor((zn.i0+zn.i1)/2),p=pts[mid];const o=-(p.sg||1)*(w/2+3);const v=P(mid,o,0);const s=labelSprite(zn.label);s.position.set(v.x,2.6,v.z);scene.add(s);}
 }
 function checkerTex(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');for(let i=0;i<8;i++)for(let j=0;j<8;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*8,j*8,8,8);}const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t;}
 function labelSprite(txt){const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.fillStyle='rgba(225,6,0,.92)';g.fillRect(0,0,128,64);g.fillStyle='#fff';g.font='800 34px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,64,34);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c)}));s.scale.set(2.4,1.2,1);return s;}

 /* ---------- start ---------- */
 function start(o){stop(true);if(!window.THREE){alert('3D engine failed to load');return;}
  const trk=o.track,tr=TR[trk],D=o.D;
  const host=document.createElement('div');host.id='drive';host.innerHTML=hudHTML(o);document.body.appendChild(host);
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){host.remove();alert('WebGL is not available on this machine — use the Sim-driver instead.');o.onExit&&o.onExit(null);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.outputEncoding=THREE.sRGBEncoding;
  host.querySelector('.d-canvas').appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xa9d8ff);scene.fog=new THREE.Fog(0xa9d8ff,120,520);
  const cam=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,1500);
  scene.add(new THREE.HemisphereLight(0xdff1ff,0x5b7a3a,.85));
  const sun=new THREE.DirectionalLight(0xfff3dd,1.15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;sc.near=1;sc.far=150;scene.add(sun,sun.target);
  R={o,trk,tr,D,host,renderer,scene,cam,sun,camMode:S.drive.cam||0,manual:!!S.drive.manual,tc:!!S.drive.tc&&!!(S.rd.tc||S.mode==='sandbox'),assist:S.drive.assist!==false,showGhost:true,paused:false,raf:0,last:performance.now(),acc:0,
   runs:[],runNo:1,maxRuns:o.runs||1,smoke:[],flags:{},msgs:[],mute:false};
  buildWorld(trk);
  R.car3d=buildCar3D(o.car,D,{color:0xe10600});scene.add(R.car3d);
  // ghost (last season) + reference cars
  const g=o.ghost;if(g){R.ghost={L:g,obj:buildCar3D(o.car,D,{ghost:true}),i:0};scene.add(R.ghost.obj);}
  R.refs=(o.refs||[]).map(rf=>{const ob=buildCar3D(rf.car||o.car,rf.D||D,{color:rf.color||0x4ea1ff});scene.add(ob);return{...rf,obj:ob,i:0};});
  // smoke pool
  const sg=new THREE.IcosahedronGeometry(.35,0);for(let i=0;i<60;i++){const m=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({color:0xdddddd,transparent:true,opacity:0,depthWrite:false}));m.visible=false;scene.add(m);R.smoke.push({m,life:0});}
  drawMiniBase();resetRun();
  window.addEventListener('resize',onResize);
  for(const k in keys)keys[k]=false;
  const loop=()=>{R.raf=requestAnimationFrame(loop);frame();};loop();
  if(o.autoStart!==false)countdown();
 }
 function hudHTML(o){return`<div class="d-canvas"></div>
  <div class="d-top"><div class="d-title"><b>${o.title||'Drive'}</b><span>${TR[o.track].name}</span></div>
   <div class="d-times"><div class="d-lt">0:00.00</div><div class="d-sub"><span class="d-last">Last —</span> · <span class="d-best">Best —</span></div><div class="d-delta"></div><div class="d-sect"></div></div>
   <canvas class="d-mini" width="170" height="170"></canvas></div>
  <div class="d-msg"></div><div class="d-banner"></div>
  <div class="d-bot"><div class="d-left"><canvas class="d-gg" width="110" height="110"></canvas><div class="d-temps"><div>Tires <b class="d-tt">—</b></div><div>Coolant <b class="d-ct">—</b></div><div class="d-cones">Cones 0</div></div></div>
   <div class="d-center"><div class="d-rpm"><i></i><em></em></div><div class="d-spd">0</div><div class="d-unit">${U()==='si'?'km/h':'mph'}</div><div class="d-gear">N</div></div>
   <div class="d-right"><div class="d-ped"><div><i class="d-thr"></i></div><div><i class="d-brk"></i></div></div><div class="d-help">${Keys.hud()}</div></div></div>
  <div class="d-pause hidden"><div class="card"><h2>Paused</h2><div class="row" style="flex-direction:column;gap:8px">
   <button class="btn pri" data-a="resume">Resume</button><button class="btn" data-a="restart">Restart run</button><button class="btn" data-a="cam">Camera: cycle</button><button class="btn" data-a="keys">⌨ Controls…</button><button class="btn" data-a="exit">Exit to pits</button></div></div></div>
  <div class="d-result hidden"></div>`;}
 function onResize(){if(!R)return;R.renderer.setSize(innerWidth,innerHeight);R.cam.aspect=innerWidth/innerHeight;R.cam.updateProjectionMatrix();}
 function resetRun(){const tr=R.tr,p=tr.pts[0],D=R.D;
  R.c={x:p.x-Math.cos(p.h)*(R.trk==='skid'?0:2.2),y:p.y-Math.sin(p.h)*(R.trk==='skid'?0:2.2),h:p.h,u:0,v:0,r:0,delta:0,gear:0,rpm:D.ice?1800:0,shiftT:0,wheelSpin:0,ax:0,ay:0,
   tireT:R.o.warmTires?62:32,coolT:R.o.coolT||70,wear:0,idx:0,li:0,started:false,t:0,lapT0:0,lapNo:1,finished:false,off:0,dead:null,cones:0,pen:0,floatT:0,stallT:0,smokeT:0,lost:false,thr:0,brk:0,hb:0};
  R.c.x0=R.c.x;R.c.y0=R.c.y;
  R.lap=newLap(R.trk,'player');R.lap.ch.t=new Array(tr.pts.length).fill(null);R.rec=-1;R.sectI=0;R.sect=[];
  for(const c of R.cones||[]){c.hit=false;c.y=0;c.vx=c.vy=c.vz=0;c.rx=0;}if(R.coneMesh){const M=new THREE.Matrix4();R.cones.forEach((c,i)=>{M.makeTranslation(c.x,0,c.z);R.coneMesh.setMatrixAt(i,M);});R.coneMesh.instanceMatrix.needsUpdate=true;}
  if(R.ghost)R.ghost.i=0;R.refs.forEach(r=>r.i=0);R.go=R.o.autoStart===false;R.timed=R.trk!=='skid';R.skidLap1=null;
  q('.d-cones').textContent='Cones 0';hideResult();}
 function countdown(){R.go=false;let n=3;const tick=()=>{if(!R)return;if(n>0){msg(String(n),700,'big');n--;R.cdT=setTimeout(tick,650);}else{msg('GO!',700,'big go');R.go=true;}};tick();}
 function resetCar(){if(!R||R.c.finished)return;const c=R.c,p=R.tr.pts[c.idx],off=clamp(c.off,-(TW[R.trk]||5)/2+1,(TW[R.trk]||5)/2-1);
  c.x=p.x-Math.sin(p.h)*off;c.y=p.y+Math.cos(p.h)*off;c.h=p.h;c.u=0;c.v=0;c.r=0;c.lost=false;c.stallT=0;msg('Reset',600);}
 function shift(d){const c=R.c,ng=R.D.gearV.length;const g=clamp(c.gear+d,0,ng-1);if(g!==c.gear){c.gear=g;c.shiftT=.06;}}
 function togglePause(){if(!R||R.c.finished)return;R.paused=!R.paused;q('.d-pause').classList.toggle('hidden',!R.paused);
  q('.d-pause').onclick=e=>{const a=e.target.dataset.a;if(a==='resume')togglePause();if(a==='restart'){togglePause();resetRun();countdown();}if(a==='cam'){R.camMode=(R.camMode+1)%4;}if(a==='keys'){Keys.open();}if(a==='exit'){exit(null);}};}
 const q=s=>R.host.querySelector(s);
 function msg(t,ms,cls){const el=q('.d-msg');el.className='d-msg show '+(cls||'');el.textContent=t;clearTimeout(R.msgT);R.msgT=setTimeout(()=>{if(R)el.className='d-msg';},ms||1000);}
 function banner(t,cls){const el=q('.d-banner');el.innerHTML=t;el.className='d-banner show '+(cls||'');clearTimeout(R.banT);R.banT=setTimeout(()=>{if(R)el.className='d-banner';},4200);}

 /* ---------- physics ---------- */
 function step(dt){const c=R.c,D=R.D,tr=R.tr,w=TW[R.trk]||5;
  // inputs (rate-limited like a real driver/steering rack)
  if(keyHook)keyHook(keys,dt); // test harness: scripted key presses at physics rate
  const auto=R.o.autopilot?autopilot():null;
  const up=auto?auto.thr:(keys.up?1:0),dn=auto?auto.brk:(keys.down?1:0),st=auto?auto.steer:((keys.left?1:0)-(keys.right?1:0));
  c.thr+=clamp(up-c.thr,-dt*6,dt*5);c.brk+=clamp(dn-c.brk,-dt*8,dt*7);c.hb=keys.hb?1:0;
  if(!R.go||c.dead||c.finished){c.thr=0;if(c.finished||c.dead)c.brk=Math.max(c.brk,.5);}
  const sp=Math.abs(c.u);const maxSteer=clamp(.42/(1+sp*sp/260),.07,.42); // speed-sensitive lock
  const tgtD=auto?clamp(auto.steer,-1,1)*maxSteer:st*maxSteer;c.delta+=clamp(tgtD-c.delta,-dt*2.4,dt*2.4);
  const m=D.mEff,L=D.t.wb/1000,b=L*D.t.fw/100,a=L-b,h=.3,Iz=m*L*L*.36;
  const q2=.5*RHO*c.u*c.u;const stalled=c.stallT>0;const aero=q2*D.ClA,drag=q2*D.CdA*Math.sign(c.u);
  const ab=D.ClA>0?D.abal/100:.5;const aeroF=aero*ab,aeroR=aero*(1-ab)*(stalled?.25:1);
  let Fzf=m*G*b/L+aeroF-m*c.ax*G*h/L,Fzr=m*G*a/L+aeroR+m*c.ax*G*h/L;Fzf=Math.max(Fzf,80);Fzr=Math.max(Fzr,80);
  // surface & tire state
  const offT=Math.abs(c.off)>w/2+.6;const surf=offT?.58:1;
  const grip=D.mu/(D.su.mu*1)*tempGrip(D,c.tireT)*(1-.13*Math.pow(Math.min(c.wear,1),1.4))*surf;
  const balS=clamp(D.bal*.012,-.12,.12);const muF=grip*D.su.mu*(1-balS),muR=grip*D.su.mu*(1+balS);
  // drivetrain
  const ng=D.gearV.length;const vF=Math.max(c.u,0);
  if(!R.manual&&D.ice&&c.shiftT<=0){const rp=vF/D.rw*D.gearR[c.gear]*60/(2*Math.PI);if(rp>D.redline*.975&&c.gear<ng-1)shift(1);else if(c.gear>0&&rp<D.redline*.52&&vF<D.gearV[c.gear-1]*.9)shift(-1);}
  c.shiftT-=dt;
  let rpm=vF/D.rw*D.gearR[c.gear]*60/(2*Math.PI);let slipClutch=false;
  if(D.ice&&rpm<4200*Math.max(c.thr,.25)){rpm=Math.max(rpm,1800+(D.rpmPeak*.75-1800)*c.thr);slipClutch=true;}
  rpm=Math.min(rpm,D.redline*1.02);c.rpm+=(rpm-c.rpm)*Math.min(1,dt*25);
  let Tq=engTorque(D,Math.min(c.rpm,D.redline));if(c.rpm>=D.redline)Tq*=(Math.random()<.5?0:1); // limiter
  if(D.ice&&D.em.floats&&c.rpm>D.em.nFloat){Tq*=.35+Math.random()*.4;c.floatT+=dt;if(!R.flags.float){R.flags.float=1;banner('<b>VALVE FLOAT</b> — springs can\'t close the valves above '+f0(D.em.nFloat)+' rpm. Short-shift or lower the rev limit!','warn');}}
  const power=c.coolT>112?.85:1;
  let Fx=c.shiftT>0?0:Tq*D.gearR[c.gear]*.9/D.rw*c.thr*power*(D.kW/(D.kW0||D.kW));
  if(D.pw.ev)Fx=Math.min(Fx,D.kW*1000/Math.max(vF,3)*c.thr);
  if(c.dead)Fx=0;
  // reverse
  if(dn>.5&&c.u<.6&&up<.1&&!c.dead){Fx=-m*G*.25;c.brk=0;}
  // brakes (62% front)
  const Fb=c.brk*D.brake*m*G*(c.u>.2?1:c.u<-.2?-1:0);let Fbf=Fb*.62,Fbr=Fb*.38;
  if(c.hb){Fbr+=Math.sign(c.u)*m*G*.6;}
  // rear longitudinal (drive minus brake) limited by friction circle; TC caps wheelspin
  let FxR=Fx-Fbr;const capR=muR*Fzr*(c.u<12&&up>.5?(D.launchF||1):1);
  // stability assist (default on, toggle with Y): trims drive force as the rear slip angle grows, leaving side-grip
  // in the friction circle the way a driver feathers the throttle. Tech-tree TC additionally holds wheelspin at 97%.
  const usA=Math.max(Math.abs(c.u),1.5),arA=Math.abs(Math.atan2(c.v-b*c.r,usA));
  if(R.assist&&FxR>0){const k=Math.min(1,arA/.12);const need=Math.min(.95,Math.abs(c.u*c.r)*m*(a/L)/capR*1.1);
   FxR=Math.min(FxR,capR*Math.max(.3,Math.min(Math.sqrt(1-.8*k*k),Math.sqrt(1-need*need)))*(R.tc?.97:1));}
  if(R.tc&&FxR>capR*.97)FxR=capR*.97;
  const spin=Math.abs(FxR)>capR;c.wheelSpin=spin?1:0;
  FxR=clamp(FxR,-capR,capR);let FxF=clamp(-Fbf,-muF*Fzf,muF*Fzf);
  // slip angles & lateral forces (Pacejka-lite: peak ≈ 8.5°, slides at ~80% of peak)
  const us=Math.max(Math.abs(c.u),1.5);
  const af=Math.atan2(c.v+a*c.r,us)-c.delta*Math.sign(c.u||1),ar=Math.atan2(c.v-b*c.r,us);
  const pac=x=>Math.sin(1.4*Math.atan(14*x));
  // a spinning tyre still carries side force along its slip direction, so keep a floor (also keeps keyboard throttle drivable)
  const latR=Math.max(c.hb?0:.38,Math.sqrt(Math.max(0,1-Math.pow(FxR/capR,2))))*(c.hb?.45:1)*(spin?.75:1);
  const latF=Math.sqrt(Math.max(0,1-Math.pow(FxF/(muF*Fzf),2)));
  const Fyf=-muF*Fzf*pac(af)*latF,Fyr=-muR*Fzr*pac(ar)*latR;
  const roll=.015*m*G*Math.sign(c.u)*(Math.abs(c.u)>.05?1:0)+(offT?.08*m*G*Math.sign(c.u)*(Math.abs(c.u)>.05?1:0):0);
  const cd=Math.cos(c.delta),sd=Math.sin(c.delta);
  const Fxb=FxR+FxF*cd-Fyf*sd-drag-roll,Fyb=Fyr+Fyf*cd+FxF*sd;
  let du=Fxb/m+c.v*c.r,dv=Fyb/m-c.u*c.r,dr=(a*(Fyf*cd+FxF*sd)-b*Fyr)/Iz;
  c.u+=du*dt;c.v+=dv*dt;c.r+=dr*dt;
  // low-speed kinematic blend (stability near standstill)
  if(Math.abs(c.u)<4){const k=1-Math.abs(c.u)/4;const rk=c.u*Math.tan(c.delta)/L;c.r+=(rk-c.r)*k*Math.min(1,dt*20);c.v*=1-k*Math.min(1,dt*12);}
  if(Math.abs(c.u)<.15&&c.brk>.3&&up<.1){c.u=0;c.v*=.9;c.r*=.9;}
  c.ax+=((Fxb/m)/G-c.ax)*Math.min(1,dt*12);c.ay+=((c.u*c.r)/G-c.ay)*Math.min(1,dt*12);
  c.h+=c.r*dt;const ch=Math.cos(c.h),sh=Math.sin(c.h);c.x+=(c.u*ch-c.v*sh)*dt;c.y+=(c.u*sh+c.v*ch)*dt;
  // thermal + wear
  const g2=c.ax*c.ax+c.ay*c.ay;const Teq=tireTempEq(D,g2*Math.abs(c.u)*.9+(spin||Math.abs(ar)>.2?25:0));c.tireT+=(Teq-c.tireT)*dt/18;
  c.wear+=1.9e-5*g2*Math.abs(c.u)*dt*D.ti.wear*D.su.wear*(spin?3:1);
  const util=Math.max(0,Fx*vF)/(D.kW*1000);const Ceq=40+62*D.heatIdx*(.85+.15*util/.35);c.coolT+=(Ceq-c.coolT)*dt/(R.o.coolTau||40);
  c.slide=Math.abs(ar)>.16||Math.abs(af)>.2||spin||(c.hb&&Math.abs(c.u)>4);
  // failures driven by physics
  if(D.am&&D.am.stallRisk&&c.u>22&&!stalled&&Math.abs(c.ay)>.9&&Math.random()<dt*.35){c.stallT=1.3;failureFX('stall');}
  if(c.stallT>0)c.stallT-=dt;
  const aarm=D.st&&D.st.c.aarm;if(aarm&&!c.dead){const loadF=Math.sqrt(g2)/(1.6*(1+D.ClA*.15));if(loadF>aarm.sf&&Math.abs(c.u)>6)failureFX('aarm');}
  if(c.coolT>121&&!c.dead)failureFX('overheat');
  if(c.floatT>4&&!c.dead)failureFX('valve');
  c.t+=dt;
 }
 /* ---------- autopilot: the sim-driver in 3D (also used by headless tests via key events) ---------- */
 function autopilot(){const c=R.c,tr=R.tr,n=tr.pts.length,D=R.D;if(!R.apV){const r=simLap(D,tr,{v0:0,use:.9,standing:!tr.closed});R.apV=r.v;}
  const look=Math.max(4,Math.abs(c.u)*.45);const j=tr.closed?(c.idx+Math.round(look))%n:Math.min(n-1,c.idx+Math.round(look));
  const p=tr.pts[j],off=racingLine(R.trk)[j];const tx=p.x-Math.sin(p.h)*off,ty=p.y+Math.cos(p.h)*off;
  const ang=Math.atan2(ty-c.y,tx-c.x)-c.h;const e=Math.atan2(Math.sin(ang),Math.cos(ang));
  let vt=R.apV[j]*.97;for(let k=1;k<30;k++){const jj=tr.closed?(c.idx+k)%n:Math.min(n-1,c.idx+k);vt=Math.min(vt,R.apV[jj]*.97+k*.35);}
  if(!tr.closed&&c.idx>=n-2)vt=0;
  const dv=vt-c.u;return{steer:clamp(e*2.6/(.42/(1+c.u*c.u/260)),-1,1),thr:dv>0?clamp(dv*.6,0,1):0,brk:dv<-.8?clamp(-dv*.25,0,1):0};}
 function failureFX(kind){const c=R.c,D=R.D;if(R.flags[kind])return;R.flags[kind]=1;const ex=failureExplain(kind,D,c);
  R.failures=(R.failures||[]);R.failures.push({kind,...ex});
  if(kind==='stall'){banner('<b>REAR WING STALL</b> — '+ex.short,'bad');c.r+=(Math.random()<.5?-1:1)*.9;}
  if(kind==='aarm'){banner('<b>SNAP!</b> Front A-arm failed — '+ex.short,'bad');c.dead='aarm';const wh=R.car3d.userData.wheels[0];R.flyWheel={obj:wh.steer,vx:c.u*Math.cos(c.h)*.8,vy:6,vz:-c.u*Math.sin(c.h)*.8};R.car3d.attach(wh.steer);R.scene.attach(wh.steer);endRun('dnf',ex);}
  if(kind==='overheat'){banner('<b>ENGINE SEIZED</b> — '+ex.short,'bad');c.dead='overheat';endRun('dnf',ex);}
  if(kind==='valve'){banner('<b>DROPPED A VALVE</b> — '+ex.short,'bad');c.dead='valve';endRun('dnf',ex);}
  if(typeof Crew!=='undefined')Crew.say('failure',kind);
 }
 /* ---------- track progress, timing & telemetry ---------- */
 function track(){const c=R.c,tr=R.tr,pts=tr.pts,n=pts.length,w=TW[R.trk]||5;
  let best=1e9,bi=c.idx;const lo=-8,hi=30;
  for(let k=lo;k<=hi;k++){let j=c.idx+k;if(tr.closed)j=(j%n+n)%n;else if(j<0||j>=n)continue;const p=pts[j];const dx=c.x-p.x,dy=c.y-p.y;const d=dx*dx+dy*dy;if(d<best){best=d;bi=j;}}
  if(best>25*25){let gb=1e9,gi=bi;for(let j=0;j<n;j++){const p=pts[j];const d=(c.x-p.x)**2+(c.y-p.y)**2;if(d<gb){gb=d;gi=j;}}
   let jump=gi-c.idx;if(tr.closed)jump=((jump%n)+n+n/2)%n-n/2;
   if(Math.sqrt(gb)<w/2+3&&jump>40&&c.started&&!c.finished){c.pen+=20;msg('MISSED GATE +20 s',1500,'bad');}
   if(Math.sqrt(gb)<w/2+3){best=gb;bi=gi;}else{c.lost=true;}}
  const p=pts[bi];c.off=-(c.x-p.x)*Math.sin(p.h)+(c.y-p.y)*Math.cos(p.h);
  if(Math.abs(c.off)>w/2+14&&!c.lost){c.lost=true;}
  if(c.lost&&Math.abs(c.off)<w/2+3)c.lost=false;
  let d=bi-c.idx;if(tr.closed)d=((d%n)+n+n/2)%n-n/2;c.idx=bi;
  if(!c.started&&R.go&&(Math.abs(c.u)>.3)){c.started=true;c.lapT0=c.t;}
  if(!c.started||c.finished)return;
  c.li+=d;const lt=c.t-c.lapT0;
  const k=Math.floor(c.li);
  if(k>R.rec&&k<n){for(let i=Math.max(R.rec+1,0);i<=k;i++)record(i,lt);R.rec=k;}
  // sector splits vs ghost
  const secs=R.sectors||(R.sectors=sectorsOf(R.trk));
  if(R.sectI<secs.length&&k>=secs[R.sectI].i1){const s=secs[R.sectI];const ts=(R.lap.ch.t[s.i1]||lt)-(R.lap.ch.t[s.i0]||0);let dlt='';
   if(R.ghost&&R.ghost.L.ch.t[s.i1]!=null){const gs=R.ghost.L.ch.t[s.i1]-R.ghost.L.ch.t[s.i0];const dd=ts-gs;dlt=`<span class="${dd<=0?'gd':'bd'}">${dd>0?'+':''}${dd.toFixed(2)}</span>`;}
   R.sect.push(`${s.l} ${ts.toFixed(2)} ${dlt}`);q('.d-sect').innerHTML=R.sect.slice(-3).join('<br>');R.sectI++;}
  const doneIdx=tr.closed?n:n-1;
  if(c.li>=doneIdx){
   if(R.trk==='skid'&&!R.skidLap1){R.skidLap1=lt;msg('Warm-up lap done — timed lap!',1300);c.li-=n;c.lapT0=c.t;R.rec=-1;R.lap=newLap(R.trk,'player');R.lap.ch.t=new Array(n).fill(null);R.sectI=0;R.sect=[];return;}
   finishLap(lt);}
 }
 function record(i,lt){const c=R.c,L=R.lap.ch;L.t[i]=lt;L.v[i]=Math.max(0,c.u);L.thr[i]=c.thr;L.brk[i]=c.brk;L.st[i]=c.delta*180/Math.PI*14;L.g[i]=c.gear+1;L.rpm[i]=c.rpm;L.ax[i]=c.ax;L.ay[i]=c.ay;L.off[i]=c.off;L.tt[i]=c.tireT;L.ct[i]=c.coolT;}
 function finishLap(lt){const c=R.c;const L=R.lap;fillLap(L);L.raw=R.trk==='skid'?lt/2:lt;L.cones=c.cones;L.pen=c.pen+c.cones*(R.trk==='skid'?.25:2);L.time=L.raw+L.pen;roundLap(L);
  L.carSig={kW:+f1(R.D.kW),ClA:+f2(R.D.ClA),m:+f0(R.D.m),mu:+f2(R.D.mu)};L.failures=R.failures||[];
  session.push(L);if(session.length>12)session.shift();R.runs.push(L);
  const stored=R.o.store!==false?storeLap(L):{};
  if(R.o.continuous&&R.tr.closed){ // flying laps in test sessions
   c.li-=R.tr.pts.length;c.lapT0=c.t;R.rec=-1;R.lap=newLap(R.trk,'player');R.lap.ch.t=new Array(R.tr.pts.length).fill(null);R.sectI=0;R.sect=[];c.cones=0;c.pen=0;c.lapNo++;
   R.lastLapT=L.time;msg(`Lap ${fmtT(L.time)}${stored.pb?' — personal best!':''}`,1800,stored.pb?'go':'');R.o.onLap&&R.o.onLap(L);R.ghost&&(R.ghost.i=0);R.refs.forEach(r=>r.i=0);
   for(const cn of R.cones){cn.hit=false;}resetConesMesh();return;}
  c.finished=true;R.o.onLap&&R.o.onLap(L);endRun('done',null,L,stored);}
 function resetConesMesh(){const M=new THREE.Matrix4();R.cones.forEach((cn,i)=>{cn.y=0;cn.vx=cn.vy=cn.vz=0;cn.rx=0;M.makeTranslation(cn.x,0,cn.z);R.coneMesh.setMatrixAt(i,M);});R.coneMesh.instanceMatrix.needsUpdate=true;}
 function endRun(kind,ex,L,stored){if(R.ending)return;R.ending=true;setTimeout(()=>{if(!R)return;R.ending=false;showResult(kind,ex,L,stored);},kind==='dnf'?1800:900);}
 function showResult(kind,ex,L,stored){const el=q('.d-result');const more=R.runNo<R.maxRuns;
  const best=R.runs.length?R.runs.reduce((a,b)=>a.time<b.time?a:b):null;
  let h=`<div class="card">`;
  if(kind==='dnf'){h+=`<h2 style="color:var(--red)">DNF — ${ex.title}</h2><div class="why">${ex.html}</div>`;}
  else{h+=`<h2>${R.o.title||'Run'} ${R.maxRuns>1?`— run ${R.runNo}/${R.maxRuns}`:''}</h2><div class="big">${fmtT(L.time)}</div><div class="small mut">raw ${fmtT(L.raw)} ${L.cones?`· ${L.cones} cone(s) +${f1(L.cones*(R.trk==='skid'?.25:2))} s`:''} ${L.pen-L.cones*2>0?'· gate penalty':''}</div>`;
   if(R.ghost){const d=L.time-R.ghost.L.time;h+=`<div class="${d<=0?'gd':'bd'}" style="font-weight:800">${d>0?'+':''}${d.toFixed(2)} s vs last season's ghost</div>`;}
   if(stored&&stored.rec)h+=`<div class="pill g">New all-time record</div>`;else if(stored&&stored.pb)h+=`<div class="pill b">Season best</div>`;}
  h+=`<div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap">`;
  if(more)h+=`<button class="btn pri" data-a="next">Run ${R.runNo+1}</button>`;
  if(R.o.mode!=='comp')h+=`<button class="btn ${more?'':'pri'}" data-a="again">Drive again</button>`;
  h+=`<button class="btn ${more||R.o.mode!=='comp'?'':'pri'}" data-a="done">${R.o.mode==='comp'?(best?'Submit best run ('+fmtT(best.time)+')':'Continue'):'Back to pits'}</button>`;
  if(R.o.mode!=='comp'&&L)h+=`<button class="btn" data-a="anal">Open in Analytics</button>`;
  h+='</div></div>';el.innerHTML=h;el.classList.remove('hidden');
  el.onclick=e=>{const a=e.target.dataset.a;if(!a)return;if(a==='next'){R.runNo++;resetRun();countdown();}if(a==='again'){R.runNo=1;R.runs=[];R.flags={};R.failures=[];resetCar3D();resetRun();countdown();}if(a==='done')exit(best||null);if(a==='anal'){exit(best||L,'anal');}};}
 function resetCar3D(){R.scene.remove(R.car3d);R.car3d=buildCar3D(R.o.car,R.D,{color:0xe10600});R.scene.add(R.car3d);R.flyWheel=null;}
 function hideResult(){const el=q('.d-result');el.classList.add('hidden');el.innerHTML='';}
 function exit(best,then){if(!R)return;const o=R.o,fails=R.failures||[];const runs=R.runs.slice();stop();S.drive.cam=S.drive.cam||0;save();o.onExit&&o.onExit(best,{runs,failures:fails,then});}
 function stop(silent){if(!R)return;cancelAnimationFrame(R.raf);clearTimeout(R.cdT);window.removeEventListener('resize',onResize);
  try{R.renderer.dispose();R.renderer.forceContextLoss();}catch(e){}R.host.remove();R=null;if(audio)audio.g.gain.value=0;}

 /* ---------- frame ---------- */
 function frame(){const now=performance.now();let dt=Math.min(.1,(now-R.last)/1000);R.last=now;
  if(!R.paused){R.acc+=dt;const h=1/240;let n=0;while(R.acc>=h&&n<40){step(h);R.acc-=h;n++;}if(n>=40)R.acc=0;track();updCones(dt);}
  const c=R.c,D=R.D;
  // car pose
  R.car3d.position.set(c.x,0,-c.y);R.car3d.rotation.y=c.h;R.car3d.rotation.z=clamp(c.ax*.02,-.03,.03);R.car3d.rotation.x=clamp(-c.ay*.025,-.04,.04);
  setWheels(R.car3d,c.delta,(c.u/D.rw)*dt*(c.wheelSpin?1.5:1));
  if(R.flyWheel){const f=R.flyWheel;f.obj.position.x+=f.vx*dt;f.obj.position.y=Math.max(.25,f.obj.position.y+f.vy*dt);f.obj.position.z+=f.vz*dt;f.vy-=G*dt;f.vx*=.99;f.vz*=.99;f.obj.rotation.x+=dt*8;}
  // ghost & reference cars
  if(c.started&&!c.finished){const lt=c.t-c.lapT0;
   if(R.ghost){R.ghost.obj.visible=R.showGhost;placeAlong(R.ghost,lt,R.ghost.L.ch.t,R.ghost.L.ch.off);}
   for(const rf of R.refs)placeAlong(rf,lt,rf.L.ch.t,rf.L.ch.off);}
  else{if(R.ghost)placeAt(R.ghost.obj,0,0,-1.2);R.refs.forEach((rf,k)=>placeAt(rf.obj,0,(k%2?1:-1)*1.6,-4-3*k));}
  // smoke
  R.smokeAcc=(R.smokeAcc||0)+dt;if(R.smokeAcc>.05){R.smokeAcc=0;if(c.slide&&Math.abs(c.u)>2)puff(-1.0,.25,0xe6e6e6);if(c.coolT>112||c.dead==='overheat')puff(-.4,.6,0x9a9a9a);}
  for(const s of R.smoke){if(s.life<=0)continue;s.life-=dt;s.m.position.y+=dt*.8;s.m.scale.multiplyScalar(1+dt*1.2);s.m.material.opacity=Math.max(0,s.life*.5);if(s.life<=0)s.m.visible=false;}
  camera(dt);R.sun.position.set(c.x+30,60,-c.y+20);R.sun.target.position.set(c.x,0,-c.y);
  R.renderer.render(R.scene,R.cam);
  hud(dt);
  if(audio&&!R.mute){const f=Math.max(30,c.rpm/60*(D.pw.id==='i4'?2:D.pw.id==='single'?.5:1));audio.o.frequency.value=f;audio.o2.frequency.value=f*.5;audio.g.gain.value=R.paused?0:.03+.05*c.thr;audio.f.frequency.value=500+c.thr*1600;}
 }
 function placeAlong(o,lt,T,OFF){const n=T.length;while(o.i<n-1&&T[o.i+1]!=null&&T[o.i+1]<=lt)o.i++;const i=o.i,j=Math.min(n-1,i+1);let f=0;if(T[j]>T[i])f=clamp((lt-T[i])/(T[j]-T[i]),0,1);
  const p=R.tr.pts[i],pn=R.tr.pts[j];const off=(OFF[i]||0)*(1-f)+(OFF[j]||0)*f;const x=p.x+(pn.x-p.x)*f-Math.sin(p.h)*off,y=p.y+(pn.y-p.y)*f+Math.cos(p.h)*off;
  o.obj.position.set(x,0,-y);o.obj.rotation.y=p.h;if(i>=n-2&&lt>T[n-1]+1)o.obj.visible=false;}
 function placeAt(obj,i,off,back){const p=R.tr.pts[i];obj.position.set(p.x+Math.cos(p.h)*back-Math.sin(p.h)*off,0,-(p.y+Math.sin(p.h)*back+Math.cos(p.h)*off));obj.rotation.y=p.h;}
 function puff(dx,y,col){const s=R.smoke.find(s=>s.life<=0);if(!s)return;const c=R.c;s.life=1.4;s.m.visible=true;s.m.material.color.setHex(col);s.m.scale.setScalar(1);s.m.position.set(c.x+Math.cos(c.h)*dx+(Math.random()-.5)*.6,y,-(c.y+Math.sin(c.h)*dx)+(Math.random()-.5)*.6);}
 function updCones(dt){const c=R.c;const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),SC=new THREE.Vector3(1,1,1);let upd=false;
  const ch=Math.cos(c.h),sh=Math.sin(c.h);
  for(let i=0;i<R.cones.length;i++){const cn=R.cones[i];
   if(!cn.hit){const dx=cn.x-c.x,dy=(-cn.z)-c.y;if(dx*dx+dy*dy>9)continue;const lx=dx*ch+dy*sh,ly=-dx*sh+dy*ch;if(Math.abs(lx)<1.5&&Math.abs(ly)<.78){cn.hit=true;
     const vx=c.u*ch-c.v*sh,vy=c.u*sh+c.v*ch;cn.vx=vx*1.15+(Math.random()-.5)*2;cn.vz=-(vy*1.15)+(Math.random()-.5)*2;cn.vy=2.5+Math.abs(c.u)*.12;
     if(c.started&&!c.finished){c.cones++;q('.d-cones').textContent='Cones '+c.cones;msg(R.trk==='skid'?'CONE +0.25 s':'CONE +2 s',900,'bad');if(typeof Crew!=='undefined'&&c.cones===1)Crew.say('cone');}}
    else continue;}
   if(cn.vy!==0||cn.y>0){cn.x+=cn.vx*dt;cn.z+=cn.vz*dt;cn.y+=cn.vy*dt;cn.vy-=G*dt;cn.rx+=dt*9;if(cn.y<0){cn.y=0;cn.vy=Math.abs(cn.vy)>1.2?-cn.vy*.3:0;cn.vx*=.6;cn.vz*=.6;if(cn.vy===0){cn.rx=Math.PI/2;}}
    Q.setFromAxisAngle(V.set(1,0,.4).normalize(),cn.rx);M.compose(V.set(cn.x,cn.y,cn.z),Q,SC);R.coneMesh.setMatrixAt(i,M);upd=true;}}
  if(upd)R.coneMesh.instanceMatrix.needsUpdate=true;}
 function camera(dt){const c=R.c,cam=R.cam;const ch=Math.cos(c.h),sh=Math.sin(c.h);const X=c.x,Z=-c.y;let tx,ty,tz,lx,ly,lz;
  if(R.camMode===0){const vel=Math.atan2(c.v,Math.max(c.u,1))*.4;const hh=c.h+vel;const d=6.2+Math.abs(c.u)*.03;tx=X-Math.cos(hh)*d;tz=Z+Math.sin(hh)*d;ty=2.5;lx=X+ch*3;ly=.8;lz=Z-sh*3;
   const k=Math.min(1,dt*6);if(!R.camP)R.camP=new THREE.Vector3(tx,ty,tz);R.camP.x+=(tx-R.camP.x)*k;R.camP.y+=(ty-R.camP.y)*k;R.camP.z+=(tz-R.camP.z)*k;cam.position.copy(R.camP);cam.fov=60+Math.min(14,Math.abs(c.u)*.3);}
  else if(R.camMode===1){cam.position.set(X+ch*.05,1.02,Z-sh*.05);lx=X+ch*10;ly=.7;lz=Z-sh*10;cam.fov=75;}
  else if(R.camMode===2){const b=R.bounds;const tvx=X+12,tvz=Z+16;cam.position.set(tvx,9,tvz);lx=X;ly=.5;lz=Z;cam.fov=Math.max(18,48-Math.hypot(tvx-X,tvz-Z)*.2);}
  else{cam.position.set(X+.01,55,Z+.01);lx=X;ly=0;lz=Z;cam.fov=55;}
  cam.updateProjectionMatrix();cam.lookAt(lx,ly,lz);}
 function drawMiniBase(){const tr=R.tr;const cv=document.createElement('canvas');cv.width=cv.height=170;const g=cv.getContext('2d');const b=R.bounds;const sc=150/Math.max(b.x1-b.x0,b.y1-b.y0,1);
  R.mini={cv,sc,ox:85-(b.x0+b.x1)/2*sc,oy:85+(b.y0+b.y1)/2*sc};g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=4;g.lineJoin='round';g.beginPath();tr.pts.forEach((p,i)=>{const x=R.mini.ox+p.x*sc,y=R.mini.oy-p.y*sc;i?g.lineTo(x,y):g.moveTo(x,y);});if(tr.closed)g.closePath();g.stroke();
  const p0=tr.pts[0];g.fillStyle='#e10600';g.fillRect(R.mini.ox+p0.x*sc-3,R.mini.oy-p0.y*sc-3,6,6);}
 function hud(dt){R.hudT=(R.hudT||0)+dt;const c=R.c,D=R.D;
  const mc=q('.d-mini').getContext('2d');mc.clearRect(0,0,170,170);mc.drawImage(R.mini.cv,0,0);const dot=(x,y,col,r)=>{mc.fillStyle=col;mc.beginPath();mc.arc(R.mini.ox+x*R.mini.sc,R.mini.oy-y*R.mini.sc,r,0,7);mc.fill();};
  if(R.ghost&&R.showGhost)dot(R.ghost.obj.position.x,-R.ghost.obj.position.z,'rgba(255,255,255,.6)',4);for(const rf of R.refs)dot(rf.obj.position.x,-rf.obj.position.z,'#4ea1ff',4);dot(c.x,c.y,'#e10600',5);
  if(R.hudT<.06)return;R.hudT=0;
  const lt=c.started?(c.finished?R.runs[R.runs.length-1].time:c.t-c.lapT0):0;q('.d-lt').textContent=fmtT(lt);
  const best=R.runs.length?Math.min(...R.runs.map(x=>x.time)):null;q('.d-last').textContent='Last '+(R.lastLapT?fmtT(R.lastLapT):R.runs.length?fmtT(R.runs[R.runs.length-1].time):'—');q('.d-best').textContent='Best '+(best?fmtT(best):'—');
  if(R.ghost&&c.started&&!c.finished){const gt=R.ghost.L.ch.t[clamp(Math.floor(c.li),0,R.ghost.L.ch.t.length-1)];if(gt!=null){const d=lt-gt;const el=q('.d-delta');el.textContent=(d>0?'+':'')+d.toFixed(2)+' vs ghost';el.className='d-delta '+(d<=0?'gd':'bd');}}
  const v=Math.max(0,c.u);q('.d-spd').textContent=U()==='si'?f0(v*3.6):f0(v*MPH);q('.d-gear').textContent=c.u<-.3?'R':D.ice||D.gearV.length>1?String(c.gear+1)+(R.manual?'':' A'):'D';
  const rf=D.ice?clamp(c.rpm/D.redline,0,1):clamp(v/D.vGear,0,1);q('.d-rpm i').style.width=(rf*100)+'%';q('.d-rpm i').className=rf>.94?'shift':'';q('.d-rpm em').textContent=D.ice?f0(c.rpm)+' rpm':f0(v/D.vGear*100)+'%';
  q('.d-thr').style.height=(c.thr*100)+'%';q('.d-brk').style.height=(c.brk*100)+'%';
  const[lo,hi]=D.ti.win;const tt=q('.d-tt');tt.textContent=f0(c.tireT)+'°C';tt.style.color=c.tireT<lo?'#4ea1ff':c.tireT>hi?'#ff4d4d':'#2ecc71';
  const ct=q('.d-ct');ct.textContent=f0(c.coolT)+'°C';ct.style.color=c.coolT>105?'#ff4d4d':c.coolT>95?'#ffb020':'#2ecc71';
  const gg=q('.d-gg').getContext('2d');gg.clearRect(0,0,110,110);gg.strokeStyle='rgba(255,255,255,.3)';gg.lineWidth=1;for(const r of[20,40]){gg.beginPath();gg.arc(55,55,r,0,7);gg.stroke();}
  const lim=latG(D,v)*tempGrip(D,c.tireT);gg.strokeStyle='rgba(46,204,113,.7)';gg.beginPath();gg.arc(55,55,lim*20,0,7);gg.stroke();
  gg.fillStyle='#ffb020';gg.beginPath();gg.arc(55-c.ay*20,55-c.ax*20,5,0,7);gg.fill();gg.fillStyle='#aab3c0';gg.font='10px sans-serif';gg.fillText(f1(Math.hypot(c.ax,c.ay))+' g',4,106);
  if(c.lost&&!c.finished&&!c.dead)msg(`OFF COURSE — press ${Keys.txt('reset')} to reset`,400,'bad');
 }
 function state(){if(!R)return null;const c=R.c;return{trk:R.trk,idx:c.idx,li:c.li,n:R.tr.pts.length,x:c.x,y:c.y,h:c.h,u:c.u,off:c.off,started:c.started,finished:c.finished,dead:c.dead,go:R.go,runs:R.runs.length,result:!q('.d-result').classList.contains('hidden'),cones:c.cones,t:c.t,gear:c.gear,manual:R.manual,paused:R.paused,v:c.v,r:c.r,delta:c.delta,lost:c.lost};}
 // helper for test harness / accessibility: steering target from the racing line
 function hint(){if(!R)return null;const ap=autopilot();return ap;}
 return{start,stop,exit:()=>exit(null),state,hint,session,setKeyHook:f=>{keyHook=f;},click:a=>{const b=R&&R.host.querySelector(`[data-a="${a}"]`);if(b)b.click();return!!b;},get active(){return!!R;}};
})();
function failureExplain(kind,D,c){const v=Math.abs(c.u);
 if(kind==='stall'){const a=carAero(D._car||S.car);const st=D.am.rw?D.am.rw.stall:0;return{title:'Rear wing stalled',short:`AoA ${a.rwAoA}° is within 2° of stall (${f1(st)}°). At ${spd(v)} the rear lost ~75% of its downforce and the car snapped into oversteer.`,
  html:`<p>Lift coefficient rises linearly with angle of attack until the boundary layer separates: <code>C<sub>L</sub> = a·α</code> up to α<sub>stall</sub>, then collapses.</p><p>Your rear wing: ${a.rwEl} element(s) at <b>${a.rwAoA}°</b>, stall at <b>${f1(st)}°</b>. Gusts, yaw and pitch changes push the effective angle over the edge.</p><p>Downforce lost ≈ ½ρ·ΔC<sub>L</sub>A·v² = ½·1.225·${f2(D.ClA*(1-D.abal/100)*.75)}·${f1(v)}² ≈ <b>${f0(.5*RHO*D.ClA*(1-D.abal/100)*.75*v*v)} N</b> off the rear axle → rear grip drops → oversteer.</p><p><b>Fix:</b> back the angle off 2–3° or add an element (multi-element wings stall later).</p>`,concept:'stall'};}
 if(kind==='aarm'){const a=D.st.c.aarm;return{title:'Front A-arm snapped',short:`Peak load exceeded the tube strength (SF ${f2(a.sf)}).`,html:`<p>A-arm axial load ≈ wheel load × lever ratio. Your tube: ${a.info?`F = ${f0(a.info.F)} N, A = ${f1(a.info.A*1e6)} mm², σ = F/A = ${f0(a.info.sig)} MPa; Euler buckling P<sub>cr</sub> = π²EI/L² = ${f0(a.info.Pcr)} N (governing mode: ${a.info.mode}).`:''}</p><p>Safety factor <code>SF = σ<sub>allow</sub> / σ<sub>applied</sub></code> = <b>${f2(a.sf)}</b>. Under ${f1(Math.hypot(c.ax,c.ay))} g combined the applied stress exceeded the yield/buckling limit.</p><p><b>Fix:</b> larger OD or wall (area and second moment I grow fast with OD), or a stronger alloy. Aim for SF 1.4–1.8.</p>`,concept:'sf'};}
 if(kind==='overheat'){return{title:'Engine seized (overheating)',short:`Coolant passed 120°C. Heat index ${f2(D.heatIdx)} — radiator can't reject the waste heat.`,html:`<p>Waste heat ≈ fuel power − shaft power. A ${f0(D.kW)} kW engine at ~${f0(D.ice?D.em.etaTh*100:90)}% efficiency rejects roughly ${f0(D.kW*(1/(D.eff*8)))} kW to coolant at full load.</p><p>Radiator capacity scales with face area × airflow: <code>Q = h·A·ΔT</code>. Your heat index <b>${f2(D.heatIdx)}</b> (> 0.9 is undersized).</p><p><b>Fix:</b> bigger/dual radiator or ducted fan; a richer AFR also runs cooler.</p>`,concept:'cool'};}
 if(kind==='valve'){const e=D.em;return{title:'Dropped a valve (valve float)',short:`Rev limit ${D.redline} rpm is above float speed ${f0(e.nFloat)} rpm.`,html:`<p>Valve acceleration scales with <code>a ∝ lift·ω²</code>. Above <b>${f0(e.nFloat)} rpm</b> the spring force can't keep the follower on the cam, the valve "floats", and eventually meets the piston.</p><p>Your rev limit: <b>${D.redline} rpm</b>. Cam lift ${e.e?e.e.lift:''} mm.</p><p><b>Fix:</b> lower the rev limit, reduce lift, or (tech tree) stiffer springs.</p>`,concept:'float'};}
 return{title:kind,short:'',html:''};}
