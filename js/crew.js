'use strict';
/* ================= STUDENT CREW — funny, but every line carries a real hint ================= */
const CREW={
 priya:{n:'Priya',r:'Tires & dynamics',c:'#2ecc71',e:'🛞'},
 marcus:{n:'Marcus',r:'Powertrain',c:'#e10600',e:'🔧'},
 lena:{n:'Lena',r:'Aero',c:'#4ea1ff',e:'🪽'},
 theo:{n:'Theo',r:'Structures',c:'#ffb020',e:'📐'}};
const Crew=(()=>{
 const pick=a=>a[Math.floor(Math.random()*a.length)];
 const LINES={
  cone:[['priya','Cone down. In my defence, that cone was asking for it. (+2 s — tighter line, earlier turn-in.)'],['theo','Another cone. I\'m starting a cone museum. Each one costs 2 seconds.']],
  failure:{
   stall:[['lena','So… the wing stopped being a wing. Past the stall angle the flow separates and the rear lift collapses — the car spins. Less angle of attack, or another element.']],
   aarm:[['theo','The A-arm said goodbye. Stress = F/A, and our A was optimistic. Thicker wall or stronger material.'],['theo','I said SF 1.2 was "fine". I would like to formally retract that.']],
   overheat:[['marcus','Smoke is not a performance upgrade. Heat in > heat out: bigger radiator, ducting, or less power.']],
   float:[['marcus','Valve float — the springs can\'t close the valves fast enough above that rpm. Valves met pistons. Pistons won.']]},
  pb:[['priya','Personal best! The tires are smiling. I can\'t prove that but I believe it.'],['marcus','PB! The engine would cry tears of joy if it had tear ducts. It has coolant, close enough.']],
  slow:[['priya','Fine lap, but the sim-driver is still faster in this car. Look at minimum corner speeds in Analytics.']],
  garage:[['theo','Reminder: every gram is a gram we have to accelerate. Twice. Every corner.'],['lena','Downforce is free grip… paid for in drag. Nothing is free. Except pizza at design review.'],['marcus','Restrictor\'s 20 mm. We can\'t add air, only use it better: tune runners and the exhaust.'],['priya','Tire window first, everything else second. Cold tires are hockey pucks.']],
  start:[['priya','Lights out! Smooth hands, fast car.'],['marcus','Remember: shift before the limiter, not after the regret.']],
  limits:[['priya','All four wheels over the white line. That\'s a second, and the stewards have no sense of humour. Kerbs are outside the track, so treat them like lava.'],['theo','Track limits. The shortest way round is only legal if your tyres stay on the paint.']],
  wall:[['theo','We hit the wall. Only the speed INTO the wall matters: glancing blows scrub speed, square hits bend A-arms. I\'m adding it to the reliability spreadsheet.'],['priya','Barrier contact! Use the runoff, that\'s what it\'s for.']],
  crest:[['lena','Over that crest the car went light. Fewer newtons on the tyres = less grip. Brake after it lands.']],
  gate:[['theo','Sign-off time. The Chief has a red pen and she is not afraid to use it.']]};
 function say(ev,kind){let L=LINES[ev];if(!L)return;if(!Array.isArray(L))L=L[kind];if(!L||!L.length)return;const[w,t]=pick(L);show(w,t);}
 function show(w,t,ms=5200){const m=CREW[w];const d=document.createElement('div');d.className='crew-toast';d.innerHTML=`<span class="cav" style="background:${m.c}">${m.e}</span><div><b>${m.n}</b> <span class="mut small">${m.r}</span><div>${t}</div></div>`;document.body.appendChild(d);
  const all=[...document.querySelectorAll('.crew-toast')];all.forEach((x,i)=>x.style.bottom=(18+(all.length-1-i)*78)+'px');setTimeout(()=>d.remove(),ms);}
 /* contextual comments about the current car — real advice, delivered by students */
 function comments(D){const o=[];
  if(D.massCar>210)o.push(['theo',`${f0(D.massCar)} kg. We are not a car, we are a lifestyle. Lighter materials on the A-arms or the chassis.`]);
  if(D.heatIdx>.9)o.push(['marcus',`Heat index ${f2(D.heatIdx)}. Last year's car cooked itself. Bigger radiator or ducting before endurance.`]);
  if(D.ice&&Math.abs(D.em.nH-D.em.nE)>2200)o.push(['marcus',`Intake resonates at ${f0(D.em.nH)} rpm, exhaust at ${f0(D.em.nE)} rpm. Make them agree and the torque curve stops looking like a mountain range.`]);
  if(D.ice&&D.em.floats)o.push(['marcus',`Rev limit ${D.redline} > valve float ${f0(D.em.nFloat)} rpm. Bold. Wrong, but bold.`]);
  if(D.am&&D.am.stallRisk)o.push(['lena',`Rear wing is ${f1(D.am.rw.margin)}° from stall. One bump and it lets go. Back off the angle or add an element.`]);
  if(D.am&&D.am.bottoming)o.push(['lena',`Under load we ride at ${f0(D.am.rhDyn)} mm — the floor is scraping. Stiffer springs or more static ride height.`]);
  if(Math.abs(D.bal)>2)o.push(['priya',`Balance ${f1(D.bal)} — ${D.bal>0?'understeer: the front gives up first. Soften front ARB or move weight back':'oversteer: the rear steps out. Stiffen the front or move weight forward'}.`]);
  if(D.sf<1.35)o.push(['theo',`Weakest part SF ${f2(D.sf)}. I have started sleeping badly.`]);
  if(D.sm&&Math.abs(D.sm.fn-D.sm.fopt)>.8)o.push(['priya',`Ride frequency ${f2(D.sm.fn)} Hz vs ~${f2(D.sm.fopt)} Hz ideal for our downforce. f = (1/2π)√(k/m).`]);
  if(!o.length)o.push(pick(LINES.garage));return o.slice(0,3);}
 function panel(D){return`<div class="crewp">${comments(D).map(([w,t])=>{const m=CREW[w];return`<div class="crewl"><span class="cav" style="background:${m.c}">${m.e}</span><div><b>${m.n}</b> <span class="mut small">${m.r}</span><div class="small">${t}</div></div></div>`;}).join('')}</div>`;}
 return{say,show,comments,panel};})();
