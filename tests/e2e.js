// Headless browser e2e for Race Time (puppeteer-core + system Chrome, SwiftShader WebGL).
// Run: NODE_PATH=/path/to/node_modules node tests/e2e.js   (needs puppeteer-core)   Screenshots → shots/
const puppeteer=require('puppeteer-core');const path=require('path'),fs=require('fs');
const ROOT=path.resolve(__dirname,'..'),SHOTS=path.join(ROOT,'shots');fs.mkdirSync(SHOTS,{recursive:true});
const CHROME=process.env.CHROME||'/usr/bin/google-chrome';const URL='file://'+path.join(ROOT,'index.html');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let pass=0,fail=0;const errs=[];
async function T(name,fn){try{const r=await fn();if(r===false)throw new Error('returned false');pass++;console.log('  ✔',name);}catch(e){fail++;console.log('  ✘',name,'—',e.message.split('\n')[0]);}}
const ok=(c,m)=>{if(!c)throw new Error(m||'assert');};
(async()=>{
 const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1400,860','--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage();await p.setViewport({width:1400,height:860});
 p.on('console',m=>{if(m.type()==='error'&&!/favicon/.test(m.text()))errs.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
 const ev=(f,...a)=>p.evaluate(f,...a);
 const fresh=async()=>{await p.goto(URL);await ev(()=>localStorage.clear());await p.goto(URL);await sleep(500);};
 const drive=async(trk,opt)=>{await ev((t,o)=>{if(RT.Drive.active)RT.Drive.exit();RT.go('test');RT.startDrive(t,o||{});},trk,opt);await p.waitForFunction(()=>{const s=RT.Drive.state();return s&&s.go;},{timeout:20000});await sleep(300);};
 const st=()=>ev(()=>RT.Drive.state());
 const idxAt=(trk,s)=>ev((t,s)=>TR[t].pts.findIndex(q=>q.s>=s),trk,s);
 const shot=n=>p.screenshot({path:path.join(SHOTS,n)});
 await fresh();
 console.log('Boot');
 await T('loads with no console errors, shows v2.2',async()=>{ok(!errs.length,errs.join('|'));return (await ev(()=>document.querySelector('.logo').textContent)).includes('v2.2');});
 await T('test day shows Barriers toggle (default OFF) and the track-limits rule',async()=>{await ev(()=>RT.go('test'));const r=await ev(()=>({b:document.querySelector('#oB')&&document.querySelector('#oB').checked,rule:/four wheels/.test(document.body.innerHTML)}));ok(r.b===false,'barriers');ok(r.rule,'rule');});
 console.log('Controls');
 await T('M/N shifting works in manual',async()=>{await drive('autox');await ev(()=>RT.Drive.setKeyHook(k=>{k.up=1;}));await sleep(800);const g0=(await st()).gear;await p.keyboard.press('KeyM');await sleep(250);const g1=(await st()).gear;await p.keyboard.press('KeyN');await sleep(250);const g2=(await st()).gear;await ev(()=>RT.Drive.setKeyHook(null));ok(g1===g0+1&&g2===g0,`${g0} ${g1} ${g2}`);ok((await st()).manual,'manual');});
 await T('remapped upshift key works; default restored',async()=>{await ev(()=>Keys.set('upshift',0,'KeyU'));const g0=(await st()).gear;await p.keyboard.press('KeyU');await sleep(250);const g1=(await st()).gear;await ev(()=>Keys.reset());ok(g1===g0+1,`${g0}->${g1}`);});
 console.log('Elevation');
 await T('3D world follows the hills (car height tracks crest) — screenshot',async()=>{await drive('flow');const i=await idxAt('flow',318);await ev(i=>RT.Drive.teleport(i,0,24),i);await ev(()=>RT.Drive.setKeyHook((k,dt)=>{const h=RT.Drive.hint();if(h){k.left=h.left;k.right=h.right;k.up=h.up;k.down=h.down;k.steer=h.steer;}}));
  let zmax=-9,nzmin=9,shotDone=false;const t0=Date.now();while(Date.now()-t0<6000){const s=await st();zmax=Math.max(zmax,s.z);nzmin=Math.min(nzmin,s.nz);if(!shotDone&&s.idx>=(await idxAt('flow',368))){await shot('v22-crest-drive.png');shotDone=true;}if(s.idx>(await idxAt('flow',400)))break;await sleep(120);}
  await ev(()=>RT.Drive.setKeyHook(null));ok(zmax>2.2,'zmax '+zmax);ok(nzmin<.95,'nz '+nzmin);ok(shotDone,'no shot');});
 await T('HUD shows vertical load and grade',async()=>{const t=await ev(()=>document.querySelector('#drive .d-load').textContent);return /g$/.test(t);});
 await T('autopilot lap on autocross records elevation + nz channels, no limits incidents',async()=>{await drive('autox',{autopilot:true});await p.waitForFunction(()=>RT.Drive.state().result,{timeout:150000,polling:500});
  const L=await ev(()=>{const L=RT.Drive.session.slice(-1)[0];return{z:Math.max(...L.ch.z)-Math.min(...L.ch.z),nz:Math.min(...L.ch.nz.filter(x=>x!=null)),tl:L.tl,inv:L.invalid,elev:L.elev,time:L.time};});ok(L.z>2,'z range '+L.z);ok(L.elev===1);ok(L.tl===0&&!L.inv,'autopilot cut track: '+L.tl);console.log('     autopilot autox',L.time.toFixed(2),'s');});
 await T('analytics shows elevation trace — screenshot',async()=>{await ev(()=>RT.Drive.click('anal'));await sleep(1500);const has=await ev(()=>document.body.innerHTML.includes('Elevation'));await shot('v22-analytics-elevation.png');return has&&(await ev(()=>S.screen))==='analytics';});
 await T('2D viewer shows elevation — screenshot',async()=>{await ev(()=>RT.go('test'));await ev(()=>{const b=document.querySelector('[data-t]');b.click();});await sleep(3500);const has=await ev(()=>/Elevation|elev/i.test(document.querySelector('#th').innerHTML+document.querySelector('#vh').innerHTML));await shot('v22-viewer2d-elevation.png');return has;});
 console.log('Track limits');
 await T('all four wheels off → +1 s, HUD warning — screenshot',async()=>{await drive('autox');const i=await idxAt('autox',30);const w=await ev(()=>TW.autox||5);await ev(()=>{RT.Drive.setKeyHook(k=>{k.up=0;});});await ev(()=>RT.Drive.teleport(5,0,8));await sleep(300);await ev((i,o)=>RT.Drive.teleport(i,o,7),i,w/2+1.6);await sleep(700);
  const s=await st();const hud=await ev(()=>({lim:document.querySelector('#drive .d-limits').className,txt:document.querySelector('#drive .d-limits').textContent,tl:document.querySelector('#drive .d-tl').textContent}));await shot('v22-track-limits-hud.png');
  ok(s.tl===1&&s.tlPen===1&&s.tlOn,JSON.stringify(s));ok(/show/.test(hud.lim)&&/FOUR WHEELS/.test(hud.txt),JSON.stringify(hud));ok(/\+1 s/.test(hud.tl),hud.tl);});
 await T('off for > 2 s → off course, lap invalid',async()=>{await sleep(2300);const s=await st();ok(s.invalid,JSON.stringify(s));});
 await T('two wheels over the line is NOT a penalty',async()=>{await drive('autox');const i=await idxAt('autox',30);const w=await ev(()=>TW.autox||5);await ev(()=>RT.Drive.teleport(5,0,8));await sleep(300);await ev((i,o)=>RT.Drive.teleport(i,o,7),i,w/2+.1);await sleep(500);const s=await st();ok(s.tl===0&&s.wheelsOff>=1,JSON.stringify({tl:s.tl,w:s.wheelsOff}));});
 console.log('Barriers');
 const wallRun=async on=>{await drive('autox',{barriers:on});await ev(()=>RT.Drive.setKeyHook(k=>{k.up=0;}));const i=await idxAt('autox',35);await ev(()=>RT.Drive.teleport(5,0,8));await sleep(300);await ev(i=>RT.Drive.teleport(i,0,14,.9),i);await sleep(1300);return st();};
 await T('barriers OFF by default: no wall contact',async()=>{const s=await wallRun(undefined);ok(!s.barriers&&s.walls===0,JSON.stringify({b:s.barriers,w:s.walls}));});
 await T('barriers ON: car hits the wall, loses speed, logged — screenshot',async()=>{const s=await wallRun(true);await ev(()=>{RT.Drive.setKeyHook(null);});await shot('v22-barriers-on.png');ok(s.barriers&&s.walls>=1,JSON.stringify({b:s.barriers,w:s.walls,u:s.u}));ok(Math.hypot(s.u,s.v)<13,'speed '+s.u);});
 await T('barriers ON overview — screenshot',async()=>{await drive('flow',{barriers:true});const i=await idxAt('flow',470);await ev(i=>RT.Drive.teleport(i,0,1),i);await ev(()=>RT.Drive.setKeyHook(k=>{k.down=1;}));await sleep(900);await shot('v22-barriers-corner.png');await ev(()=>RT.Drive.setKeyHook(null));});
 await T('pause-menu barriers toggle persists to settings',async()=>{await ev(()=>RT.Drive.setBarriers(false));const v=await ev(()=>S.drive.barriers);await ev(()=>RT.Drive.exit());return v===false;});
 console.log('Dr. Okafor (Socratic crest question)');
 await T('debrief asks about grip lost over a crest — screenshot',async()=>{const r=await ev(()=>{const D=curD();const sim=Analytics.refSim('flow');const L=JSON.parse(JSON.stringify(sim));L.who='player';const cr=TR.flow.feats.find(f=>f.type==='crest'&&TR.flow.pts[f.iPk].s>300&&TR.flow.pts[f.iPk].s<450);
   // slow the player through the crest sector so it is the worst sector
   for(let i=cr.i0-60;i<=cr.i1+30;i++)L.ch.v[i]*=.8;let t=0;for(let i=1;i<L.ch.v.length;i++){t+=(TR.flow.pts[i].s-TR.flow.pts[i-1].s)/Math.max(1,(L.ch.v[i]+L.ch.v[i-1])/2);L.ch.t[i]=t;}L.time=L.raw=t;
   const ch=debriefChain(L,sim,D,'the sim-driver');const st=ch.steps.filter(s=>s.concept==='crest');return{n:st.length,q:st.map(s=>s.q),ans:st[0]&&st[0].ans,L};});
  ok(r.n===2,'crest steps '+r.n);ok(r.ans>0&&r.ans<1,'ans '+r.ans);
  await ev(L=>{RT.go('test');const host=document.querySelector('#chiefBox');runDebrief(host,L,Analytics.refSim('flow'),curD(),'the sim-driver',()=>{});window.__dbHost=host;},r.L);
  for(let k=0;k<12;k++){const q=await ev(()=>document.querySelector('#chiefBox .ch-q')&&document.querySelector('#chiefBox .ch-q').innerHTML);if(/crest/.test(q||''))break;await ev(()=>RT.solveGate());await sleep(1000);}
  const q=await ev(()=>document.querySelector('#chiefBox .ch-q').innerHTML);await ev(()=>{const r=document.querySelector('#chiefBox').getBoundingClientRect();window.scrollBy(0,r.top-70);});await sleep(200);await shot('v22-chief-crest.png');ok(/crest/.test(q),q);});
 await T('crest review question in the question bank',async()=>{const q=await ev(()=>QB.crest(curD()));return q.ans>0&&q.ans<1;});
 console.log('Season loop (e2e)');
 await T('full season: comp → gates → results → next season',async()=>{await fresh();await ev(()=>RT.go('comp'));await sleep(300);await ev(()=>document.querySelector('#start').click());const s0=await ev(()=>S.season);
  for(let k=0;k<200;k++){const scr=await ev(()=>S.screen);if(scr==='handoff')break;
   const did=await ev(()=>{const c=x=>{const e=document.querySelector(x);if(e&&!e.disabled){e.click();return true;}return false;};if(RT.solveGate())return'gate';if(c('#gateGo'))return'go';if(c('#run'))return'run';if(c('#toRes2')||c('#toRes'))return'res';if(c('#sgo'))return'sgo';if(c('#next'))return'next';return null;});
   await sleep(did==='run'?400:250);if(did==='run'){await p.waitForFunction(()=>!document.querySelector('#run')||!document.querySelector('#run').disabled||S.comp.revealed>=S.comp.step,{timeout:200000,polling:300}).catch(()=>{});
    await ev(()=>{if(typeof VIEW!=='undefined'&&VIEW&&VIEW.skip)VIEW.skip();});}}
  const s1=await ev(()=>S.season);ok(s1===s0+1,`season ${s0}->${s1} screen ${await ev(()=>S.screen)}`);});
 await T('challenges generated for the new season, crash damage reset',async()=>ev(()=>S.challenges.length>0&&S.crash==null));
 console.log('Back-compat');
 await T('a v2.1 save (no barriers, no z channels, no crash) still loads',async()=>{await ev(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('raceTimeFSAE'));const s=JSON.parse(localStorage.getItem(k));delete s.drive.barriers;delete s.crash;
   for(const g of [s.ghosts||{},s.laps||{}])for(const t in g){const L=g[t];if(L&&L.ch){delete L.ch.z;delete L.ch.nz;delete L.elev;delete L.tl;delete L.limits;delete L.walls;}}localStorage.setItem(k,JSON.stringify(s));});
  await p.goto(URL);await sleep(700);await ev(()=>RT.go('analytics'));await sleep(800);await ev(()=>RT.go('test'));await sleep(300);const r=await ev(()=>({b:S.drive.barriers,v:S.v}));ok(r.b===false&&r.v===2,JSON.stringify(r));});
 await T('no console errors during the whole run',async()=>{ok(!errs.length,errs.slice(0,5).join(' | '));});
 console.log(`\n${pass} passed, ${fail} failed`);await b.close();process.exit(fail?1:0);})().catch(e=>{console.error(e);process.exit(2);});
