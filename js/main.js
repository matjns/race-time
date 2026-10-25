'use strict';
/* ================= INIT ================= */
window.addEventListener('error',e=>{console.error('Uncaught',e.message);});
(function init(){const mode=localStorage.getItem('raceTimeMode')||'career';if(!load(mode))newLegacy(mode);
 if(S.comp&&S.comp.started&&!(S.comp.finished&&S.comp.gates&&S.comp.gates.endu)&&S.screen!=='comp')S.screen='comp';
 render();})();
/* test / automation hooks */
window.RT={get S(){return S;},Drive,go,save,curD,startDrive,Analytics,Crew,
 solveGate(){for(const el of document.querySelectorAll('#app *,#modal *'))if(el.__solve){el.__solve();return true;}return false;}};
