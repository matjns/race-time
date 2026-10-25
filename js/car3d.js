'use strict';
/* ================= LOW-POLY 3D CAR (shared by garage turntable + driving) =================
   Car local frame: +X forward, +Y up, −Z = car's left (so rotation.y = heading maps to the 2D track). */
const MATCOL={'4130':0x8d96a3,mild:0x6f757d,'6061':0xc9d1da,'7075':0xb7c4d4,ti:0x8aa0c8,cfp:0x1d2126,cfw:0x2a2f36,gf:0xd8d2b8};
function lmat(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,flatShading:true,roughness:.62,metalness:.08},o||{}));}
function taperBox(len,w0,h0,w1,h1,y1off){ // along +X from x=0 (w0,h0) to x=len (w1,h1)
 const g=new THREE.BufferGeometry();const yo=y1off||0;
 const v=[[0,-h0/2,-w0/2],[0,-h0/2,w0/2],[0,h0/2,w0/2],[0,h0/2,-w0/2],[len,-h1/2+yo,-w1/2],[len,-h1/2+yo,w1/2],[len,h1/2+yo,w1/2],[len,h1/2+yo,-w1/2]];
 const f=[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[3,2,6],[3,6,7],[1,5,6],[1,6,2],[0,3,7],[0,7,4]];
 const p=[];for(const t of f)for(const i of t)p.push(...v[i]);g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;}
function tube(a,b,r,mat){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const d=B.clone().sub(A);const L=d.length();const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,5),mat);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
function buildCar3D(car,D,opt){
 opt=opt||{};const paint=opt.color!=null?opt.color:0xe10600;
 const root=new THREE.Group();root.userData.groups={};root.userData.wheels=[];
 const G=k=>{const g=new THREE.Group();g.name=k;root.add(g);root.userData.groups[k]=g;return g;};
 const L=D.t.wb/1000,tw=1.22,rw=D.rw,xf=L/2,xr=-L/2; // origin at mid-wheelbase
 const mPaint=lmat(paint,{roughness:.45}),mCarbon=lmat(0x1b1f25,{roughness:.35,metalness:.3}),mDark=lmat(0x2a2e35),mTire=lmat(0x16181b,{roughness:.9}),mRim=lmat(0xd9dde3,{metalness:.5,roughness:.3});
 // ---- chassis ----
 const gc=G('chassis');const cid=D.ch.id;
 const tubM=lmat(cid==='steel'?0x9aa3ad:0x9aa3ad,{metalness:.4,roughness:.4});
 if(cid==='steel'||cid==='hybrid'){ // spaceframe tubes + body panels
  const pts=[[xf+.25,.12,.18],[xf+.25,.12,-.18],[xf+.25,.42,.15],[xf+.25,.42,-.15],[-.1,.14,.32],[-.1,.14,-.32],[-.1,.58,.3],[-.1,.58,-.3],[xr-.25,.15,.28],[xr-.25,.15,-.28],[xr-.25,.5,.25],[xr-.25,.5,-.25]];
  const E=[[0,1],[2,3],[0,2],[1,3],[0,4],[1,5],[2,6],[3,7],[4,5],[6,7],[4,6],[5,7],[0,6],[1,7]];
  if(cid==='steel')E.push([4,8],[5,9],[6,10],[7,11],[8,9],[10,11],[8,10],[9,11],[4,10],[5,11]);
  for(const[a,b]of E)gc.add(tube(pts[a],pts[b],.013,tubM));
  const nose=new THREE.Mesh(taperBox(.9,.42,.34,.16,.16,-.05),mPaint);nose.position.set(xf-.25,.3,0);gc.add(nose);
  const side=new THREE.Mesh(taperBox(L*.7,.62,.3,.5,.26),mPaint);side.position.set(-L*.35,.3,0);gc.add(side);
  if(cid==='hybrid'){const r=new THREE.Mesh(taperBox(L*.55,.6,.42,.42,.3),mCarbon);r.position.set(xr-.25,.33,0);gc.add(r);}
 }else{
  const tubCol=cid==='carbon'?mCarbon:lmat(0xb9c2cc,{metalness:.5,roughness:.35});
  const tub=new THREE.Mesh(taperBox(L+.2,.64,.42,.34,.3,-.03),tubCol);tub.position.set(xr-.15,.33,0);gc.add(tub);
  const nose=new THREE.Mesh(taperBox(.65,.34,.3,.12,.12,-.06),mPaint);nose.position.set(xf+.05,.3,0);gc.add(nose);
  const cover=new THREE.Mesh(taperBox(L*.5,.5,.18,.3,.12),mPaint);cover.position.set(-.2,.56,0);gc.add(cover);}
 // cockpit, driver, roll hoops
 const hoopM=lmat(MATCOL[(carMat(car).rollhoop||{}).m]||0x9aa3ad,{metalness:.4});
 const hoop=new THREE.Mesh(new THREE.TorusGeometry(.26,.016,4,10,Math.PI),hoopM);hoop.rotation.y=Math.PI/2;hoop.position.set(-.35,.62,0);gc.add(hoop);
 const fh=new THREE.Mesh(new THREE.TorusGeometry(.22,.014,4,10,Math.PI),hoopM);fh.rotation.y=Math.PI/2;fh.position.set(.25,.5,0);gc.add(fh);
 const helm=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,1),lmat(0xffffff,{roughness:.3}));helm.position.set(-.18,.78,0);gc.add(helm);
 const visor=new THREE.Mesh(new THREE.BoxGeometry(.05,.06,.18),lmat(0x111111,{metalness:.6,roughness:.2}));visor.position.set(-.07,.79,0);gc.add(visor);
 // ---- powertrain ----
 const gp=G('power');const pid=D.pw.id;
 if(pid==='ev'){const bat=new THREE.Mesh(new THREE.BoxGeometry(.55,.32,.5),lmat(0xf2c230));bat.position.set(xr+.35,.38,0);gp.add(bat);
  const mot=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.3,8),lmat(0x5d6670,{metalness:.5}));mot.rotation.x=Math.PI/2;mot.position.set(xr+.02,.25,0);gp.add(mot);
  for(const z of[-.12,.12])gp.add(tube([xr+.35,.55,z],[xr+.02,.3,z],.018,lmat(0xff7a1a)));}
 else{const big=pid==='i4';const blk=new THREE.Mesh(new THREE.BoxGeometry(big?.42:.3,.34,big?.46:.26),lmat(0x50565e,{metalness:.5}));blk.position.set(xr+.42,.36,0);gp.add(blk);
  const e=carEng(car);const rl=(D.t.runner||300)/1000;const nC=big?4:1;
  const plen=new THREE.Mesh(new THREE.BoxGeometry(.18,.08+e.plenum*.03,.12+e.plenum*.05),lmat(0x2d3640,{metalness:.4}));plen.position.set(xr+.42,.62+rl*.4,0);gp.add(plen);
  for(let i=0;i<nC;i++){const z=(i-(nC-1)/2)*.09;gp.add(tube([xr+.42,.5,z],[xr+.42,.6+rl*.4,z],e.runnerD/2000,lmat(0xb0b8c2,{metalness:.6})));}
  const restr=new THREE.Mesh(new THREE.CylinderGeometry(.03,.05,.18,8),lmat(0x8899aa,{metalness:.6}));restr.rotation.z=Math.PI/2;restr.position.set(xr+.62,.64+rl*.4,0);gp.add(restr);
  const el=e.exhL/1000;for(let i=0;i<nC;i++){const z=(i-(nC-1)/2)*.08+.18;gp.add(tube([xr+.36,.32,z],[xr+.36-el*.5,.22,z+.06],e.exhD/2000,lmat(0xc7a46a,{metalness:.7,roughness:.3})));}
  const can=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.3,8),lmat(0x9aa3ad,{metalness:.7}));can.rotation.z=Math.PI/2;can.position.set(xr-.15,.3,.24);gp.add(can);}
 // ---- cooling ----
 const gco=G('cooling');const cool=D.co.id;
 const pod=(z)=>{const p=new THREE.Mesh(taperBox(.55,.2,.26,.16,.2),mPaint);p.position.set(-.45,.27,z);gco.add(p);const rad=new THREE.Mesh(new THREE.BoxGeometry(.03,.22,.18),lmat(0x3b4148,{metalness:.6}));rad.position.set(-.05,.27,z);rad.rotation.y=.3*Math.sign(z);gco.add(rad);};
 pod(.38);if(cool==='dual')pod(-.38);
 if(cool==='ducted'){const fan=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.02,10),lmat(0x111111));fan.rotation.z=Math.PI/2;fan.position.set(-.5,.27,.38);gco.add(fan);const sc=new THREE.Mesh(taperBox(.25,.12,.18,.22,.26),mCarbon);sc.position.set(.08,.27,.4);gco.add(sc);}
 // ---- aero ----
 const ga=G('aero');const aid=D.ae.id;
 if(aid!=='none'){const tray=new THREE.Mesh(new THREE.BoxGeometry(L*.75,.012,.95),mCarbon);tray.position.set(-.05,.07,0);ga.add(tray);
  const dif=new THREE.Mesh(new THREE.BoxGeometry(.45,.012,.9),mCarbon);dif.position.set(xr-.15,.13,0);dif.rotation.z=-.28;ga.add(dif);}
 if(aid==='wing'){const a=carAero(car);const am=D.am;
  const wing=(n,aoa,chord,span,x,y,stall,mount)=>{const g=new THREE.Group();g.position.set(x,y,0);
   for(let i=0;i<n;i++){const el=new THREE.Mesh(new THREE.BoxGeometry(chord*(1-i*.18),.014,span),i===0?mCarbon:mPaint);el.position.set(-i*chord*.42,i*.05,0);el.rotation.z=-(aoa+i*9)*Math.PI/180;g.add(el);}
   for(const z of[-span/2,span/2]){const ep=new THREE.Mesh(new THREE.BoxGeometry(chord*1.25,.12+n*.05,.01),mCarbon);ep.position.set(-chord*.3,n*.02,z);g.add(ep);}
   if(stall){const w=new THREE.Mesh(new THREE.BoxGeometry(chord*1.1,.01,span*.9),lmat(0xffb020,{emissive:0x553300}));w.position.y=.12+n*.05;g.add(w);g.userData.stallMark=w;}
   ga.add(g);return g;};
  wing(a.fwEl,a.fwAoA,.28,1.36,xf+.52,.11,am.fw&&am.fw.stalled);
  const rwg=wing(a.rwEl,a.rwAoA,.32,.98,xr-.42,1.0,am.rw&&am.rw.stalled);
  for(const z of[-.2,.2])ga.add(tube([xr-.25,.5,z],[xr-.4,1.0,z],.012,mCarbon));root.userData.rearWing=rwg;}
 // ---- wheels, brakes & suspension ----
 const gt=G('tires'),gs=G('susp'),gb=G('brakes');
 const soft=D.ti.id[0]==='s';
 const aM=lmat(MATCOL[(carMat(car).aarm||{}).m]||0x8d96a3,{metalness:.45,roughness:.35});
 for(const[x,z,front]of[[xf,-tw/2,1],[xf,tw/2,1],[xr,-tw/2,0],[xr,tw/2,0]]){
  const steer=new THREE.Group();steer.position.set(x,rw,z);gt.add(steer);
  const spin=new THREE.Group();steer.add(spin);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(rw,rw,.2,14),mTire);tire.rotation.x=Math.PI/2;spin.add(tire);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(rw*.62,rw*.62,.205,8),mRim);rim.rotation.x=Math.PI/2;spin.add(rim);
  const band=new THREE.Mesh(new THREE.TorusGeometry(rw*.8,.012,3,16),lmat(soft?0xe10600:0xf2f2f2));band.position.z=Math.sign(z)*.103;spin.add(band);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(D.br.id==='big'?rw*.55:rw*.42,D.br.id==='big'?rw*.55:rw*.42,.02,10),lmat(D.br.id==='std'?0x6a6f75:0xa9b0b8,{metalness:.7}));disc.rotation.x=Math.PI/2;disc.position.set(x,rw,z-Math.sign(z)*.06);gb.add(disc);
  const cal=new THREE.Mesh(new THREE.BoxGeometry(.08,.06,.04),lmat(D.br.id==='std'?0x777777:0xe10600));cal.position.set(x,rw+rw*.4,z-Math.sign(z)*.08);gb.add(cal);
  const cz=Math.sign(z)*.24,hz=z-Math.sign(z)*.1;
  gs.add(tube([x+.15,.16,cz],[x,rw-.06,hz],.011,aM),tube([x-.15,.16,cz],[x,rw-.06,hz],.011,aM),tube([x+.15,.4,cz],[x,rw+.08,hz],.011,aM),tube([x-.15,.4,cz],[x,rw+.08,hz],.011,aM));
  if(D.su.id!=='basic')gs.add(tube([x,rw-.05,hz*.9],[x+(front?-.1:.1),.5,cz*.6],.009,lmat(0xffb020)));
  root.userData.wheels.push({steer,spin,front:!!front});}
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;}});
 if(opt.ghost){root.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.32;o.material.depthWrite=false;o.castShadow=false;}});}
 return root;}
function setWheels(car3d,steerRad,spinDelta){for(const w of car3d.userData.wheels){if(w.front)w.steer.rotation.y=steerRad;w.spin.rotation.z-=spinDelta;}}

/* ================= GARAGE TURNTABLE ================= */
const Garage3D=(()=>{let R=null;
 function mount(host){unmount();if(!window.THREE){host.innerHTML='<div class="mut small">3D unavailable</div>';return;}
  const W=host.clientWidth||600,H=host.clientHeight||300;
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch(e){host.innerHTML='<div class="mut small" style="padding:20px">WebGL unavailable — 3D view disabled.</div>';return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(W,H);renderer.shadowMap.enabled=true;renderer.outputEncoding=THREE.sRGBEncoding;
  host.innerHTML='';host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d1117);scene.fog=new THREE.Fog(0x0d1117,8,22);
  const cam=new THREE.PerspectiveCamera(32,W/H,.1,100);
  scene.add(new THREE.HemisphereLight(0xbfd4ff,0x1a1410,.75));
  const key=new THREE.DirectionalLight(0xffffff,1.05);key.position.set(3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);const sc=key.shadow.camera;sc.left=-3;sc.right=3;sc.top=3;sc.bottom=-3;scene.add(key);
  const rim=new THREE.DirectionalLight(0xff4030,.5);rim.position.set(-4,2,-3);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(12,48),new THREE.MeshStandardMaterial({color:0x151a21,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.95,.05,48),new THREE.MeshStandardMaterial({color:0x222a35,roughness:.6,metalness:.3}));disc.position.y=.025;disc.receiveShadow=true;scene.add(disc);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.92,.012,4,64),new THREE.MeshBasicMaterial({color:0xe10600}));ring.rotation.x=Math.PI/2;ring.position.y=.055;scene.add(ring);
  const grid=new THREE.GridHelper(24,48,0x22303f,0x1a222d);grid.position.y=.001;scene.add(grid);
  const turn=new THREE.Group();turn.position.y=.05;scene.add(turn);
  R={renderer,scene,cam,turn,host,car:null,prevSig:{},anims:[],yaw:.7,pitch:.32,dist:5.3,drag:null,auto:true,raf:0,t0:performance.now()};
  const el=renderer.domElement;el.style.borderRadius='10px';el.style.cursor='grab';
  el.onpointerdown=e=>{R.drag=[e.clientX,e.clientY,R.yaw,R.pitch];R.auto=false;el.setPointerCapture(e.pointerId);};
  el.onpointermove=e=>{if(!R.drag)return;R.yaw=R.drag[2]-(e.clientX-R.drag[0])*.008;R.pitch=clamp(R.drag[3]+(e.clientY-R.drag[1])*.005,.05,1.2);};
  el.onpointerup=()=>{R.drag=null;};el.onwheel=e=>{e.preventDefault();R.dist=clamp(R.dist+e.deltaY*.004,3,9);};
  const loop=()=>{R.raf=requestAnimationFrame(loop);const now=performance.now();if(R.auto)R.yaw+=.004;
   cam.position.set(Math.cos(R.yaw)*Math.cos(R.pitch)*R.dist,.4+Math.sin(R.pitch)*R.dist,Math.sin(R.yaw)*Math.cos(R.pitch)*R.dist);cam.lookAt(0,.42,0);
   R.anims=R.anims.filter(a=>{const k=clamp((now-a.t0)/a.dur,0,1);const e=1-Math.pow(1-k,3);a.g.position.y=a.y0*(1-e);a.g.rotation.x=a.r0*(1-e);if(a.flash)a.flash.material.opacity=.8*(1-k);return k<1;});
   renderer.render(scene,cam);};loop();}
 function sig(car,D){return{chassis:car.parts.chassis,power:car.parts.power+JSON.stringify(carEng(car))+D.t.runner,tires:car.parts.tires,susp:car.parts.susp+JSON.stringify(carMat(car)),brakes:car.parts.brakes,cooling:car.parts.cooling,aero:car.parts.aero+JSON.stringify(carAero(car))};}
 function update(car,D){if(!R)return;const s=sig(car,D);if(R.car)R.turn.remove(R.car);const c=buildCar3D(car,D,{});R.turn.add(c);
  const now=performance.now();
  for(const k in s){if(R.prevSig[k]!=null&&R.prevSig[k]!==s[k]){const g=c.userData.groups[k];if(g){g.position.y=1.6;R.anims.push({g,y0:1.6,r0:.25,t0:now,dur:650});}}}
  if(!R.car){for(const k of['chassis','power','cooling','aero','susp','brakes','tires']){const g=c.userData.groups[k];const i=['chassis','power','cooling','aero','susp','brakes','tires'].indexOf(k);g.position.y=2;R.anims.push({g,y0:2,r0:.2,t0:now+i*110,dur:700});}}
  R.car=c;R.prevSig=s;}
 function unmount(){if(R){cancelAnimationFrame(R.raf);try{R.renderer.dispose();R.renderer.forceContextLoss();}catch(e){}R=null;}}
 return{mount,update,unmount,get active(){return!!R;}};})();
