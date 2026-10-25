'use strict';
/* ================= KEY BINDINGS =================
   Stored apart from career/sandbox saves (localStorage 'raceTimeKeys_v1'; in the Mac app this lives in
   ~/Library/Application Support/RaceTime), so starting a fresh legacy never touches your controls. */
const Keys=(()=>{
 const STORE='raceTimeKeys_v1';
 const ACTIONS=[
  {id:'up',l:'Throttle',d:['KeyW','ArrowUp'],hold:1},{id:'down',l:'Brake / reverse',d:['KeyS','ArrowDown'],hold:1},
  {id:'left',l:'Steer left',d:['KeyA','ArrowLeft'],hold:1},{id:'right',l:'Steer right',d:['KeyD','ArrowRight'],hold:1},
  {id:'hb',l:'Handbrake',d:['Space',null],hold:1},
  {id:'upshift',l:'Upshift',d:['KeyM',null]},{id:'downshift',l:'Downshift',d:['KeyN',null]},
  {id:'reset',l:'Reset car to track',d:['KeyR',null]},{id:'camera',l:'Cycle camera',d:['KeyC',null]},
  {id:'ghost',l:'Ghost on / off',d:['KeyG',null]},{id:'tc',l:'Traction control (tech node)',d:['KeyT',null]},
  {id:'assist',l:'Stability assist on / off',d:['KeyY',null]},{id:'mute',l:'Mute engine sound',d:['KeyK',null]},
  {id:'pause',l:'Pause menu',d:['Escape','KeyP']}];
 const defaults=()=>Object.fromEntries(ACTIONS.map(a=>[a.id,a.d.slice()]));
 let map=defaults();
 try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s&&typeof s==='object')for(const a of ACTIONS)if(Array.isArray(s[a.id]))map[a.id]=[s[a.id][0]||null,s[a.id][1]||null];}catch(e){}
 const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(map));}catch(e){}window.dispatchEvent(new Event('rt-keys'));};
 const NAMES={Space:'Space',Escape:'Esc',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'L-Shift',ShiftRight:'R-Shift',ControlLeft:'L-Ctrl',ControlRight:'R-Ctrl',AltLeft:'L-Alt',AltRight:'R-Alt',MetaLeft:'L-Cmd',MetaRight:'R-Cmd',Enter:'Enter',Tab:'Tab',Backspace:'Backspace',CapsLock:'Caps',Comma:',',Period:'.',Slash:'/',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Backslash:'\\',Minus:'-',Equal:'=',Backquote:'`'};
 function name(c){if(!c)return'—';if(NAMES[c])return NAMES[c];if(/^Key[A-Z]$/.test(c))return c.slice(3);if(/^Digit\d$/.test(c))return c.slice(5);if(/^Numpad/.test(c))return'Num '+c.slice(6);return c;}
 function actionFor(code){for(const a of ACTIONS)if(map[a.id][0]===code||map[a.id][1]===code)return a.id;return null;}
 function txt(id){const k=map[id].filter(Boolean).map(name);return k.length?k.join('/'):'unbound';}
 function set(id,slot,code){let swapped=null;
  if(code){for(const a of ACTIONS)for(let s=0;s<2;s++)if(map[a.id][s]===code&&!(a.id===id&&s===slot)){map[a.id][s]=map[id][slot]||null;swapped={id:a.id,l:a.l,slot:s,got:map[id][slot]};}}
  map[id][slot]=code||null;persist();return swapped;}
 function reset(){map=defaults();persist();}
 // one-line hints for the HUD / Test Day header / pause menu
 function hud(){return`${txt('up')} throttle · ${txt('down')} brake · ${txt('left')} ${txt('right')} steer · ${txt('hb')} handbrake<br>${txt('reset')} reset · ${txt('camera')} camera · ${txt('downshift')}/${txt('upshift')} shift down/up · ${txt('ghost')} ghost · ${txt('tc')} TC · ${txt('assist')} assist · ${txt('mute')} mute · ${txt('pause')} pause`;}
 function short(){return`${txt('up')}/${txt('down')}/${txt('left')}/${txt('right')} drive · ${txt('hb')} handbrake · ${txt('reset')} reset · ${txt('camera')} camera · ${txt('upshift')} upshift · ${txt('downshift')} downshift · ${txt('ghost')} ghost · ${txt('pause')} pause`;}
 let capturing=null;
 function open(){close();const ov=document.createElement('div');ov.id='keysOv';ov.className='overlay keys-ov';document.body.appendChild(ov);draw();
  window.addEventListener('keydown',onCap,true);}
 function close(){capturing=null;const o=document.getElementById('keysOv');if(o)o.remove();window.removeEventListener('keydown',onCap,true);window.dispatchEvent(new Event('rt-keys'));}
 function draw(note){const ov=document.getElementById('keysOv');if(!ov)return;
  ov.innerHTML=`<div class="ovbox" style="max-width:720px"><div class="row"><h2 style="margin:0">⌨ Controls</h2><span class="sp"></span><button class="btn sm" id="kbReset">Reset to defaults</button><button class="btn sm pri" id="kbClose">Done</button></div>
  <p class="small mut" style="margin:6px 0 10px">Click a key box, then press the new key. Esc cancels, Backspace/Delete clears. If the key is already used, the two actions swap. Saved separately from your career, so starting a new legacy keeps your controls.</p>
  ${note?`<div class="hintbox" id="kbNote" style="margin-bottom:8px">${note}</div>`:''}
  <table class="kb"><tr><th style="text-align:left">Action</th><th>Primary</th><th>Secondary</th></tr>${ACTIONS.map(a=>`<tr><td style="text-align:left">${a.l}</td>${[0,1].map(s=>`<td><button class="kbk ${capturing&&capturing.id===a.id&&capturing.slot===s?'cap':''}" data-k="${a.id}" data-s="${s}">${capturing&&capturing.id===a.id&&capturing.slot===s?'press a key…':name(map[a.id][s])}</button></td>`).join('')}</tr>`).join('')}</table></div>`;
  ov.querySelectorAll('.kbk').forEach(b=>b.onclick=()=>{capturing={id:b.dataset.k,slot:+b.dataset.s};draw();});
  ov.querySelector('#kbClose').onclick=close;ov.querySelector('#kbReset').onclick=()=>{reset();capturing=null;draw('Controls reset to defaults.');};
  ov.onclick=e=>{if(e.target===ov)close();};}
 function onCap(e){if(!document.getElementById('keysOv'))return;e.stopPropagation();e.stopImmediatePropagation();
  if(!capturing){if(e.code==='Escape'){e.preventDefault();close();}return;}
  e.preventDefault();const c=capturing;capturing=null;
  if(e.code==='Escape'){draw();return;}
  if(e.code==='Backspace'||e.code==='Delete'){set(c.id,c.slot,null);draw();return;}
  const sw=set(c.id,c.slot,e.code);const a=ACTIONS.find(x=>x.id===c.id);
  draw(sw?`⚠ ${name(e.code)} was bound to <b>${sw.l}</b> — swapped: ${sw.l} now uses ${name(sw.got)}.`:`${a.l} → ${name(e.code)}`);}
 return{ACTIONS,actionFor,txt,name,set,reset,hud,short,open,close,get map(){return map;},get isOpen(){return!!document.getElementById('keysOv');}};
})();
