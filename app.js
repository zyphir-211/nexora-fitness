'use strict';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = 'vtaper-pro-v2';
const todayKey = (date=new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const defaultPlan = {
  Monday: [
    {name:'Push-ups',phase:'Strength',sets:3,reps:8,cues:['Keep your body in one straight line.','Use a comfortable range of motion.','Move smoothly; do not rush.'],unilateral:false},
    {name:'Single-arm dumbbell row',phase:'Strength',sets:3,reps:10,cues:['Support yourself with a stable surface.','Pull your elbow toward your hip.','Keep your torso steady.'],unilateral:true},
    {name:'Lateral raise',phase:'Strength',sets:2,reps:10,cues:['Use a manageable load.','Keep shoulders relaxed.','Raise only as high as you can control.'],unilateral:false},
    {name:'Front plank',phase:'Core',sets:2,reps:20,cues:['Keep breathing normally.','Keep hips level.','Stop if your lower back feels uncomfortable.'],unilateral:false,unit:'sec'}
  ],
  Wednesday: [
    {name:'Bodyweight squat',phase:'Strength',sets:3,reps:10,cues:['Keep feet planted comfortably.','Move with control.','Use a depth that feels comfortable.'],unilateral:false},
    {name:'Single-arm dumbbell row',phase:'Strength',sets:3,reps:10,cues:['Start with your less-coordinated side.','Keep your back comfortable and steady.','Match the same reps on both sides.'],unilateral:true},
    {name:'Incline push-up',phase:'Strength',sets:3,reps:8,cues:['Use a stable elevated surface.','Keep elbows at a comfortable angle.','Move smoothly.'],unilateral:false},
    {name:'Dead bug',phase:'Core',sets:2,reps:8,cues:['Move opposite arm and leg slowly.','Keep your lower back comfortable.','Breathe throughout each rep.'],unilateral:false}
  ],
  Friday: [
    {name:'Push-ups',phase:'Strength',sets:3,reps:8,cues:['Keep your body aligned.','Lower under control.','Stop before your form changes.'],unilateral:false},
    {name:'Lateral raise',phase:'Strength',sets:3,reps:10,cues:['Use a light, controllable load.','Avoid shrugging.','Keep the movement smooth.'],unilateral:false},
    {name:'Single-arm dumbbell row',phase:'Strength',sets:3,reps:10,cues:['Start with the side that feels less coordinated.','Keep your torso stable.','Match reps on the other side.'],unilateral:true},
    {name:'Side plank',phase:'Core',sets:2,reps:15,cues:['Keep a straight, comfortable line.','Breathe normally.','Switch sides evenly.'],unilateral:true,unit:'sec'}
  ],
  Rest: [
    {name:'Easy walk (optional)',phase:'Cool-down',sets:1,reps:10,cues:['Keep the pace comfortable.','You should be able to talk easily.'],unilateral:false,unit:'min'},
    {name:'Gentle mobility (optional)',phase:'Cool-down',sets:1,reps:5,cues:['Move without forcing a stretch.','Stop if anything hurts.'],unilateral:false,unit:'min'}
  ]
};
const tips = [
  ['Control first','A smooth, controlled rep is more useful than rushing to finish a number.'],
  ['Leave room to recover','You do not need to train to exhaustion. Finish with enough energy for normal daily activities.'],
  ['Pain is a signal','Stop an exercise if you feel pain, dizziness, or unusual discomfort. Tell a parent, guardian, coach, or other trusted adult.'],
  ['Keep the setup stable','Check that your floor, chair, table, and exercise area are secure before starting.'],
  ['Rest is part of training','Rest days help you recover. Easy movement is optional; taking a full rest day is fine too.'],
  ['Breathe normally','Avoid holding your breath during repetitions. Keep breathing steadily.']
];
const achievementDefs = [
  ['First session','Save your first workout.'],['Three sessions','Log three completed sessions.'],['Five sessions','Log five completed sessions.'],['Warm-up habit','Complete a warm-up before three workouts.'],['Steady week','Complete three sessions in one week.'],['Consistency 10','Save ten workouts.'],['Notes keeper','Add notes to three exercises.'],['Recovery minded','Save three recovery check-ins.']
];
let state = loadState();
let workoutDay = getDayName();
let currentTimer = {remaining:0,total:0,interval:null,label:'READY',kind:'',running:false,rep:0,phase:0};
let currentExercise = null;
let currentTipIndex = Math.floor(Math.random()*tips.length);
let wakeLock = null;
let toastTimer = null;
let lastUndo = null;
let lastSavedSummary = '';

function loadState(){
  try { const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); return {...freshState(),...parsed}; }
  catch { return freshState(); }
}
function freshState(){return {plan:structuredClone(defaultPlan),logs:[],checkins:[],settings:{theme:'emerald',glow:65,start:'17:00',end:'17:45',rest:60,autoRest:true,voice:false,deload:false,saturday:false,bands:false,bar:false,adjustable:false},daily:{},weeklyFocus:'',xp:0,freezeShield:1,water:{},snack:false,meal:false};}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function getDayName(){return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];}
function activeDay(){if(workoutDay==='Saturday'&&state.settings.saturday)return 'Saturday';return ['Monday','Wednesday','Friday'].includes(workoutDay)?workoutDay:'Rest';}
function getPlan(){const day=activeDay();if(day==='Saturday')return [{name:'Easy mobility flow',phase:'Cool-down',sets:2,reps:8,cues:['Move gently.','Choose comfortable ranges.'],unilateral:false},{name:'Dead bug',phase:'Core',sets:2,reps:8,cues:['Move slowly and breathe.','Stop before form changes.'],unilateral:false},{name:'Incline push-up',phase:'Strength',sets:2,reps:8,cues:['Choose a stable surface.','Keep each rep controlled.'],unilateral:false}];return state.plan[day]||state.plan.Rest;}
function dailyData(){const key=todayKey();if(!state.daily[key])state.daily[key]={done:{},notes:{},effort:{},rir:{},leftRight:{},timestamps:{},collapsed:{},snack:false,meal:false,water:0};return state.daily[key];}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function formatTime(seconds){const s=Math.max(0,Math.floor(seconds));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function totalSets(){return getPlan().reduce((sum,e)=>sum+(state.settings.deload?Math.max(1,Math.ceil(e.sets/2)):e.sets),0);}
function doneSets(){return Object.values(dailyData().done).filter(Boolean).length;}
function progress(){return totalSets()?Math.min(100,Math.round(doneSets()/totalSets()*100)):0;}
function getEffectiveSets(ex){return state.settings.deload?Math.max(1,Math.ceil(ex.sets/2)):ex.sets;}
function saveDaily(){saveState();renderProgress();}
function toast(message,undo){const el=$('#toast');el.innerHTML='';const label=document.createElement('span');label.textContent=message;el.appendChild(label);if(typeof undo==='function'){const b=document.createElement('button');b.className='mini-btn';b.textContent='Undo';b.style.marginLeft='10px';b.addEventListener('click',()=>{undo();el.classList.remove('show');});el.appendChild(b);}el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4200);}
function renderClock(){const now=new Date();$('#clockLabel').textContent=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});$('#dayLabel').textContent=getDayName().toUpperCase();$('#dateLine').textContent=now.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});updateSchedule();}
function updateSchedule(){const [sh,sm]=state.settings.start.split(':').map(Number),[eh,em]=state.settings.end.split(':').map(Number);const now=new Date(),start=new Date(),end=new Date();start.setHours(sh,sm,0,0);end.setHours(eh,em,0,0);const total=end-start,elapsed=now-start;let label='Before your planned window';if(now>=start&&now<=end)label=elapsed/total<.5?'On schedule / early':'On schedule / later half';else if(now>end)label='Planned window has passed';$('#scheduleStatus').textContent=`${label} · ${state.settings.start}–${state.settings.end}`;}
function applyPhase(phase){document.body.classList.remove('phase-warm','phase-work','phase-cool');document.body.classList.add(phase==='Warm-up'?'phase-warm':phase==='Cool-down'?'phase-cool':'phase-work');$('#phaseEyebrow').textContent=`TRAINING CONSOLE / ${phase.toUpperCase()}`;}
function renderWorkout(){const plan=getPlan(),groups=['Warm-up','Strength','Core','Cool-down'];const data=dailyData();$('#workoutHeading').textContent=activeDay()==='Rest'?'Recovery day':`${activeDay()} session`;$ ('#workoutTypePill').textContent=activeDay()==='Rest'?'OPTIONAL':'45 MIN';$('#pageTitle').innerHTML=activeDay()==='Rest'?'Recover well.<br><span>Consistency includes rest.</span>':'Build consistency.<br><span>One session at a time.</span>';
  $('#weakSideNotice').style.display=plan.some(e=>e.unilateral)?'flex':'none';
  $('#phaseGrid').innerHTML=groups.map(phase=>{const exercises=plan.map((e,i)=>({...e,index:i})).filter(e=>e.phase===phase);if(!exercises.length)return '';return `<section class="phase-section"><div class="phase-title"><h3>${phase.toUpperCase()}</h3><span>${exercises.length} exercise${exercises.length===1?'':'s'}</span></div>${exercises.map(ex=>renderExercise(ex,data)).join('')}</section>`;}).join('');
  // Use delegated listeners so exercise cards can be rerendered safely.
  $$('#phaseGrid .exercise-name').forEach(btn=>btn.addEventListener('click',()=>{$(`#cues-${btn.dataset.index}`).classList.toggle('open');}));
  $$('#phaseGrid .set-check').forEach(btn=>btn.addEventListener('click',()=>toggleSet(btn.dataset.key,btn.dataset.exercise,Number(btn.dataset.set))));
  $$('#phaseGrid .mini-btn[data-action="timer"]').forEach(btn=>btn.addEventListener('click',()=>{currentExercise=Number(btn.dataset.exercise);startTimer(Number(btn.dataset.seconds)||state.settings.rest,'REST');}));
  $$('#phaseGrid .mini-btn[data-action="edit"]').forEach(btn=>btn.addEventListener('click',()=>openEdit(Number(btn.dataset.exercise))));
  $$('#phaseGrid .exercise-note').forEach(el=>el.addEventListener('change',()=>{data.notes[el.dataset.exercise]=el.value;saveDaily();}));
  $$('#phaseGrid .effort-select').forEach(el=>el.addEventListener('change',()=>{data.effort[el.dataset.exercise]=el.value;saveDaily();}));
  $$('#phaseGrid .rir-select').forEach(el=>el.addEventListener('change',()=>{data.rir[el.dataset.exercise]=el.value;saveDaily();}));
  $$('#phaseGrid .side-entry').forEach(el=>el.addEventListener('change',()=>{const i=el.dataset.exercise,side=el.dataset.side;data.leftRight[i]??={L:'',R:''};data.leftRight[i][side]=el.value;saveDaily();}));
  $$('#phaseGrid .collapse-btn').forEach(btn=>btn.addEventListener('click',()=>{const card=btn.closest('.exercise-card');card.classList.toggle('collapsed');data.collapsed[btn.dataset.index]=card.classList.contains('collapsed');saveDaily();}));
  wireCardTilt();updateProgressUI();updateFocusLabels();
}
function renderExercise(ex,data){const idx=ex.index,n=ex.name,sets=getEffectiveSets(ex),doneCount=Array.from({length:sets},(_,s)=>data.done[`${idx}-${s}`]).filter(Boolean).length;const isCollapsed=!!data.collapsed[idx];const prev=lastWeekExercise(n);const ghost=prev?`<span class="ghost-number">Last week: ${prev} reps / set</span>`:'';const sides=ex.unilateral?`<div class="set-row side-row"><span class="set-number">L / R</span><span class="set-target"><strong>Separate side log</strong>Start on your less-coordinated side</span><input class="side-input side-entry" data-exercise="${idx}" data-side="L" type="number" min="0" max="120" placeholder="Left" value="${escapeHtml(data.leftRight[idx]?.L??'')}"><input class="side-input side-entry" data-exercise="${idx}" data-side="R" type="number" min="0" max="120" placeholder="Right" value="${escapeHtml(data.leftRight[idx]?.R??'')}"></div>`:'';
 return `<article class="exercise-card ${doneCount===sets?'completed-card':''} ${isCollapsed?'collapsed':''}" data-card="${idx}"><div class="exercise-top"><div><button class="exercise-name" data-index="${idx}">${escapeHtml(n)}</button><div class="exercise-meta">${sets} sets · ${ex.reps} ${ex.unit||'reps'} each ${ghost}</div></div><button class="exercise-caret collapse-btn" data-index="${idx}" aria-label="Collapse exercise">${isCollapsed?'＋':'−'}</button></div><div class="exercise-body"><ul class="cue-list" id="cues-${idx}">${(ex.cues||[]).map(c=>`<li>${escapeHtml(c)}</li>`).join('')}</ul>${sides}<div class="set-list">${Array.from({length:sets},(_,s)=>{const key=`${idx}-${s}`,done=!!data.done[key];return `<div class="set-row ${done?'done':''}" data-row="${key}"><span class="set-number">${String(s+1).padStart(2,'0')}</span><span class="set-target"><strong>Set ${s+1}</strong>${ex.reps} ${ex.unit||'reps'}</span><span class="set-target">${data.timestamps[key]?new Date(data.timestamps[key]).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</span><button class="set-check" data-key="${key}" data-exercise="${idx}" data-set="${s}" aria-label="${done?'Uncheck':'Complete'} set ${s+1}">${done?'✓':'○'}</button></div>`;}).join('')}</div><div class="exercise-tools"><button class="mini-btn" data-action="timer" data-exercise="${idx}" data-seconds="${ex.restSeconds||state.settings.rest}">Start rest ${ex.restSeconds||state.settings.rest}s</button><button class="mini-btn" data-action="edit" data-exercise="${idx}">Edit target</button><label class="small-note">Effort <select class="effort-select" data-exercise="${idx}"><option value="">—</option>${['Easy','Moderate','Challenging','Too hard'].map(x=>`<option ${data.effort[idx]===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="small-note">Comfortable reps left <select class="rir-select" data-exercise="${idx}"><option value="">—</option>${['0–1','2–3','4+','Not sure'].map(x=>`<option ${data.rir[idx]===x?'selected':''}>${x}</option>`).join('')}</select></label></div><input class="exercise-note" data-exercise="${idx}" type="text" maxlength="180" placeholder="Exercise note..." value="${escapeHtml(data.notes[idx]||'')}"></div></article>`;
}
function lastWeekExercise(name){const d=new Date();d.setDate(d.getDate()-7);const key=todayKey(d);const log=state.logs.find(l=>l.date===key);const item=log?.exerciseStats?.find(x=>x.name===name);return item?.reps||null;}
function toggleSet(key,exerciseIndex,setIndex){const data=dailyData(),wasDone=!!data.done[key],oldStamp=data.timestamps[key];data.done[key]=!wasDone;if(!wasDone)data.timestamps[key]=Date.now();else delete data.timestamps[key];const sets=getEffectiveSets(getPlan()[exerciseIndex]);const completed=Array.from({length:sets},(_,s)=>data.done[`${exerciseIndex}-${s}`]).every(Boolean);if(completed&&!wasDone)data.collapsed[exerciseIndex]=state.settings.keepExpanded?false:true;if(!completed&&wasDone)data.collapsed[exerciseIndex]=false;saveDaily();renderWorkout();if(!wasDone&&state.settings.autoRest&&!completed)startTimer(Number(getPlan()[exerciseIndex]?.restSeconds||state.settings.rest)||60,'REST');const undo=()=>{data.done[key]=wasDone;if(oldStamp)data.timestamps[key]=oldStamp;else delete data.timestamps[key];data.collapsed[exerciseIndex]=false;saveDaily();renderWorkout();};if(progress()===100&&!wasDone){celebrate();toast('Session checklist complete. Save your workout when ready.',undo);}else toast(wasDone?'Set unchecked':'Set completed',undo);}
function updateProgressUI(){const p=progress();$('#progressText').textContent=`${p}%` ;$('#progressFill').style.width=`${p}%`;$('#setsDoneText').textContent=`${doneSets()} of ${totalSets()} sets complete`;const dashDay=$('#dashDay'),dashSets=$('#dashSets'),dashProgress=$('#dashProgress');if(dashDay)dashDay.textContent=activeDay()==='Rest'?'REST':activeDay().slice(0,3).toUpperCase();if(dashSets)dashSets.textContent=`${doneSets()}/${totalSets()}`;if(dashProgress)dashProgress.textContent=`${p}%`;$('#clockRing').style.setProperty('--timer-percent',`${currentTimer.total?100*(1-currentTimer.remaining/currentTimer.total):0}%`);}
function renderProgress(){updateProgressUI();const workouts=state.logs.length,streak=calculateStreak(),xp=state.xp||0,level=Math.min(50,1+Math.floor(xp/500));$('#levelPill').textContent=`LEVEL ${level}`;$('#historyStats').innerHTML=statCard('SESSIONS',workouts,'Saved workouts')+statCard('WEEKLY STREAK',streak,streak===1?'week':'weeks')+statCard('TOTAL XP',xp,'Consistency points');$('#progressStats').innerHTML=statCard('SESSIONS',workouts,'Saved workouts')+statCard('SETS LOGGED',state.logs.reduce((s,l)=>s+l.setsDone,0),'Across saved sessions')+statCard('CURRENT LEVEL',level,`${xp%500} / 500 XP`);renderHeatmap();renderHistoryList();renderAchievements();$('#weeklyFocus').value=state.weeklyFocus||'';}
function statCard(label,value,caption){return `<div class="stat-card"><small>${label}</small><strong>${value}</strong><span>${caption}</span></div>`;}
function calculateStreak(){const weeks=new Map();state.logs.forEach(l=>{const d=new Date(l.date+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));const key=todayKey(d);weeks.set(key,(weeks.get(key)||0)+1);});let count=0,d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));while((weeks.get(todayKey(d))||0)>=3){count++;d.setDate(d.getDate()-7);}return count;}
function renderHeatmap(){const now=new Date(),year=now.getFullYear(),month=now.getMonth(),first=new Date(year,month,1),days=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7,logged=new Set(state.logs.map(l=>l.date));$('#monthName').textContent=first.toLocaleDateString([],{month:'long',year:'numeric'});let html='';for(let i=0;i<offset;i++)html+='<div class="heat-cell" aria-hidden="true"></div>';for(let d=1;d<=days;d++){const date=todayKey(new Date(year,month,d));const done=logged.has(date);html+=`<div class="heat-cell ${done?'done':''}" title="${date}${done?' · session saved':''}">${d}</div>`;}$('#heatmap').innerHTML=html;}
function renderHistoryList(){const list=$('#historyList');if(!state.logs.length){list.innerHTML='<p class="history-empty">No saved workouts yet. Use “Finish & save workout” after a session.</p>';return;}list.innerHTML=state.logs.slice().reverse().slice(0,15).map((l,i)=>`<div class="history-item"><div><b>${escapeHtml(l.day)} · ${escapeHtml(l.date)}</b><small>${l.setsDone} sets · ${l.repsDone} reps logged · ${l.duration||'—'}</small></div><b>+${l.xp} XP</b></div>`).join('');}
function renderAchievements(){const n=state.logs.length,hasWarm=state.logs.filter(l=>l.warmup).length,notes=state.logs.filter(l=>l.notesCount>=1).length;const unlocked=[n>=1,n>=3,n>=5,hasWarm>=3,threeThisWeek(),n>=10,notes>=3,state.checkins.length>=3];$('#badgeGrid').innerHTML=achievementDefs.map((a,i)=>`<div class="achievement ${unlocked[i]?'unlocked':''}"><b>${unlocked[i]?'★ ':'◇ '}${a[0]}</b><small>${a[1]}</small></div>`).join('');}
function threeThisWeek(){const now=new Date(),monday=new Date(now);monday.setDate(now.getDate()-((now.getDay()+6)%7));return state.logs.filter(l=>new Date(l.date+'T12:00:00')>=monday).length>=3;}
function saveWorkout(){if(doneSets()===0){toast('Complete at least one set before saving.');return;}const data=dailyData(),plan=getPlan(),exerciseStats=plan.map((e,i)=>({name:e.name,reps:e.reps,done:Array.from({length:getEffectiveSets(e)},(_,s)=>data.done[`${i}-${s}`]).filter(Boolean).length}));const repsDone=exerciseStats.reduce((sum,e)=>sum+e.reps*e.done,0);const notesCount=Object.values(data.notes).filter(Boolean).length;const index=state.logs.findIndex(l=>l.date===todayKey());const firstSave=index<0;const entry={date:todayKey(),day:activeDay(),setsDone:doneSets(),repsDone,duration:'45 min window',xp:firstSave?doneSets()*50+250:state.logs[index].xp,exerciseStats,notesCount,warmup:!!data.warmupComplete};if(index>=0)state.logs[index]=entry;else state.logs.push(entry);if(firstSave)state.xp=(state.xp||0)+entry.xp;lastSavedSummary=`${entry.day} ${entry.date}\n${entry.setsDone} sets completed\n${entry.repsDone} reps logged\nXP earned: ${entry.xp}`;saveState();renderProgress();celebrate();toast('Workout saved to your local history.');$('#workoutHeading').scrollIntoView({behavior:'smooth',block:'start'});}
function sessionElapsedSeconds(){return Math.max(0,45*60-(currentTimer.remaining||45*60));}
function celebrate(){const layer=$('#confettiLayer');for(let i=0;i<70;i++){const p=document.createElement('i');p.className='confetti';p.style.left=`${Math.random()*100}%`;p.style.animationDelay=`${Math.random()*.5}s`;p.style.background=[ 'var(--accent)','var(--accent2)','var(--gold)'][i%3];layer.appendChild(p);setTimeout(()=>p.remove(),3000);}}
function beep(freq=660,duration=.12){if(state.muted)return;try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=freq;gain.gain.setValueAtTime(.06,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration);osc.onended=()=>ctx.close();}catch(e){console.warn('Audio unavailable',e);}}
function speak(text){if(!state.settings.voice||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.9;u.volume=.7;window.speechSynthesis.speak(u);}
function startTimer(seconds,label='REST',kind=''){clearInterval(currentTimer.interval);currentTimer.remaining=Math.max(1,seconds);currentTimer.total=currentTimer.remaining;currentTimer.label=label;currentTimer.kind=kind;currentTimer.running=true;currentTimer.rep=0;currentTimer.phase=0;renderTimer();currentTimer.interval=setInterval(tickTimer,1000);$('#timerStartBtn').textContent='Pause';if(kind==='tempo')speak('Tempo pacer started');}
function tickTimer(){if(!currentTimer.running)return;currentTimer.remaining--;if(currentTimer.kind==='tempo'){const elapsed=currentTimer.total-currentTimer.remaining;const phase=elapsed%5;const nextPhase=phase<3?'Lower':phase===3?'Hold':'Lift';const rep=Math.floor(elapsed/5)+1;if(rep!==currentTimer.rep){currentTimer.rep=rep;$('#timerLabel').textContent=`REP ${Math.min(rep,20)} / 20`;if(rep<=20&&state.settings.voice)speak(nextPhase);if(rep<=20)beep(phase===0?600:phase===3?520:680,.05);} }
  if(currentTimer.remaining<=3&&currentTimer.remaining>0){beep(880,.1);if(state.settings.voice)speak(String(currentTimer.remaining));}
  if(currentTimer.remaining<=0){clearInterval(currentTimer.interval);currentTimer.running=false;currentTimer.remaining=0;beep(990,.25);beep(740,.2);$('#clockRing').classList.add('timer-zero');document.body.classList.add('pulse-mode');setTimeout(()=>{$('#clockRing').classList.remove('timer-zero');document.body.classList.remove('pulse-mode');},1800);if(currentTimer.kind==='tabata'){const next=currentTimer.label==='WORK'?'REST':'WORK';startTimer(next==='WORK'?20:10,next,'tabata');}else{$('#timerStartBtn').textContent='Start';toast(`${currentTimer.label} timer complete`);speak(`${currentTimer.label} complete`);} }
  renderTimer();}
function renderTimer(){const text=formatTime(currentTimer.remaining);$('#timerDisplay').textContent=text;$('#timerLabel').textContent=currentTimer.label;$('#focusTimer').textContent=text;$('#focusStartBtn').textContent=currentTimer.running?'Pause':'Start timer';$('#timerStartBtn').textContent=currentTimer.running?'Pause':'Start';$('#clockRing').style.setProperty('--timer-percent',`${currentTimer.total?100*(currentTimer.total-currentTimer.remaining)/currentTimer.total:0}%`);const appName=state.morphset?.brandName||'NEXORA FITNESS';document.title=currentTimer.running?`${text} - ${currentTimer.label} | ${appName} 9.7.0`:`${appName} 9.7.0 — Training & Progress`;updateFocusLabels();}
function pauseTimer(){currentTimer.running=false;clearInterval(currentTimer.interval);$('#timerStartBtn').textContent='Resume';renderTimer();}
function resetTimer(){clearInterval(currentTimer.interval);currentTimer={remaining:0,total:0,interval:null,label:'READY',kind:'',running:false,rep:0,phase:0};renderTimer();}
function toggleMainTimer(){if(currentTimer.running)pauseTimer();else if(currentTimer.remaining>0){currentTimer.running=true;currentTimer.interval=setInterval(tickTimer,1000);renderTimer();}else startTimer(60,'REST');}
function updateFocusLabels(){const plan=getPlan();let idx=currentExercise??0;$('#focusExerciseName').textContent=plan[idx]?.name||'Current exercise';$('#focusSetLabel').textContent=currentTimer.label==='READY'?'Ready when you are':currentTimer.label;}
function startTempo(){startTimer(100,'TEMPO','tempo');toast('3 seconds lower · 1 hold · 1 lift');}
function startWarmup(){dailyData().warmupComplete=true;saveDaily();const drills=['March in place','Arm circles','Hip hinges','Easy bodyweight squats','Gentle shoulder mobility'];let index=0;const step=()=>{if(index>=drills.length){resetTimer();toast('Warm-up timer complete');return;}startTimer(60,drills[index],'warmup');toast(`Warm-up: ${drills[index]}`);index++;const watcher=setInterval(()=>{if(!currentTimer.running&&currentTimer.remaining===0){clearInterval(watcher);step();}},250);};step();}
function startSwitch(){startTimer(5,'SWITCH SIDES','switch');speak('Switch sides');}
function openEdit(index){const ex=getPlan()[index];if(!ex)return;currentExercise=index;$('#editName').value=ex.name;$('#editSets').value=ex.sets;$('#editReps').value=ex.reps;$('#editPhase').value=ex.phase;$('#editCues').value=(ex.cues||[]).join('\n');$('#editDialog').showModal();}
function saveEdit(e){e.preventDefault();const i=currentExercise,plan=getPlan();if(!plan[i])return;const oldSets=Number(plan[i].sets)||1;plan[i].name=$('#editName').value.trim();plan[i].sets=Number($('#editSets').value);plan[i].reps=Number($('#editReps').value);plan[i].phase=$('#editPhase').value;plan[i].cues=$('#editCues').value.split('\n').map(x=>x.trim()).filter(Boolean);if(plan[i].sets<oldSets){const d=dailyData();for(const field of ['done','timestamps','actualReps','setNotes','setLoad'])for(let s=plan[i].sets;s<oldSets;s++)delete d[field][`${i}-${s}`];}saveState();$('#editDialog').close();renderWorkout();toast('Exercise updated');}
function wireCardTilt(){$$('#phaseGrid .exercise-card').forEach(card=>{card.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${-y*3}deg) rotateY(${x*3}deg)`;});card.addEventListener('pointerleave',()=>card.style.transform='');});}
function setTab(name){$$('.tabs > .tab').forEach(b=>{const selected=b.dataset.tab===name;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$$('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`));if(name==='history'||name==='progress')renderProgress();}
function applySettings(){document.body.dataset.theme=state.settings.theme||'emerald';document.documentElement.style.setProperty('--glow',Number(state.settings.glow??65)/100);$('#themeSelect').value=state.settings.theme||'emerald';$('#glowSlider').value=state.settings.glow??65;$('#startTimeInput').value=state.settings.start;$('#endTimeInput').value=state.settings.end;$('#restInput').value=state.settings.rest;$('#autoRestToggle').checked=state.settings.autoRest;$('#voiceToggle').checked=state.settings.voice;$('#deloadToggle').checked=state.settings.deload;$('#saturdayToggle').checked=state.settings.saturday;$('#bandsToggle').checked=state.settings.bands;$('#barToggle').checked=state.settings.bar;$('#adjustableToggle').checked=state.settings.adjustable;$('#wakeToggle').checked=!!state.settings.wakeLock;$('#contrastToggle').checked=!!state.settings.highContrast;document.body.classList.toggle('high-contrast',!!state.settings.highContrast);$('#muteBtn').textContent=state.muted?'Sound: off':'Sound: on';$('#muteBtn').setAttribute('aria-pressed',String(!!state.muted));}
function bindSettings(){const map={themeSelect:['theme','value'],glowSlider:['glow','value'],startTimeInput:['start','value'],endTimeInput:['end','value'],restInput:['rest','number'],autoRestToggle:['autoRest','checked'],voiceToggle:['voice','checked'],deloadToggle:['deload','checked'],saturdayToggle:['saturday','checked'],bandsToggle:['bands','checked'],barToggle:['bar','checked'],adjustableToggle:['adjustable','checked'],contrastToggle:['highContrast','checked']};Object.entries(map).forEach(([id,[key,prop]])=>{$(`#${id}`).addEventListener('change',e=>{const val=prop==='number'?Math.max(15,Math.min(300,Number(e.target.value))):prop==='checked'?e.target.checked:e.target.value;state.settings[key]=val;if(key==='highContrast'){state.settings.contrastLevel=val?'high':'standard';}saveState();applySettings();renderWorkout();});});$('#wakeToggle').addEventListener('change',async e=>{state.settings.wakeLock=e.target.checked;saveState();await toggleWakeLock(e.target.checked);});}
async function toggleWakeLock(on){if(!('wakeLock'in navigator)){toast('Screen wake lock is not supported in this browser.');return;}try{if(on){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});toast('Screen wake lock enabled');}else if(wakeLock){await wakeLock.release();wakeLock=null;toast('Screen wake lock released');}}catch(e){toast('Could not enable screen wake lock.');}}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`nexora-fitness-backup-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);toast('Backup exported');}
function importBackup(file){const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);if(!incoming||typeof incoming!=='object'||!incoming.settings||!incoming.plan)throw new Error('Invalid backup');state={...freshState(),...incoming};saveState();applySettings();renderWorkout();renderProgress();toast('Backup imported');}catch{toast('That backup file could not be read.');}};reader.readAsText(file);}
function bindUI(){
  $$('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  $('#timerStartBtn').addEventListener('click',()=>toggleMainTimer());$('#timerResetBtn').addEventListener('click',()=>resetTimer());$('#focusStartBtn').addEventListener('click',()=>toggleMainTimer());$('#focusNextBtn').addEventListener('click',()=>{const p=getPlan();currentExercise=((currentExercise??-1)+1)%p.length;updateFocusLabels();});$('#focusBtn').addEventListener('click',()=>{$('#focusOverlay').hidden=false;updateFocusLabels();});$('#exitFocusBtn').addEventListener('click',()=>$('#focusOverlay').hidden=true);
  $('#warmupBtn').addEventListener('click',()=>startWarmup());$('#tempoBtn').addEventListener('click',()=>startTempo());$('#tabataBtn').addEventListener('click',()=>startTimer(20,'WORK','tabata'));$('#isoBtn').addEventListener('click',()=>startTimer(10,'FRIDAY HOLD','iso'));$('#customTimerBtn').addEventListener('click',()=>startTimer(Number($('#customSeconds').value)||60,'CUSTOM'));$('#add15Btn').addEventListener('click',()=>{currentTimer.remaining+=15;currentTimer.total+=15;renderTimer();toast('Added 15 seconds');});$('#switchSideBtn').addEventListener('click',startSwitch);$('#muteBtn').addEventListener('click',()=>{state.muted=!state.muted;saveState();applySettings();});
  $('#editTargetsBtn').addEventListener('click',()=>{const p=getPlan();if(p.length)openEdit(0);});$('#finishWorkoutBtn').addEventListener('click',()=>{if(state.settings.confirmFinish!==false&&!confirm('Save this workout to your history?'))return;saveWorkout();});$('#bumpTargetsBtn').addEventListener('click',()=>{if(!confirm('Increase each exercise target by one rep for this workout day? Only keep the change if it remains comfortable and your technique stays controlled.'))return;const p=getPlan();p.forEach(ex=>{if((ex.unit||'reps')==='reps')ex.reps=Math.min(120,Number(ex.reps)+1);});saveState();renderWorkout();toast('Targets adjusted by one rep.');});$('#saveExerciseBtn').addEventListener('click',saveEdit);$('#snackIdeasBtn').addEventListener('click',()=>$('#snackDialog').showModal());$('#nextTipBtn').addEventListener('click',()=>{currentTipIndex=(currentTipIndex+1)%tips.length;$('#dailyTipTitle').textContent=tips[currentTipIndex][0];$('#dailyTip').textContent=tips[currentTipIndex][1];});
  $('#snackCheck').addEventListener('change',e=>{dailyData().snack=e.target.checked;saveDaily();});$('#mealCheck').addEventListener('change',e=>{dailyData().meal=e.target.checked;saveDaily();});$('#waterButtons').addEventListener('click',e=>{if(e.target.tagName!=='BUTTON')return;const d=dailyData();d.water=Math.min(4,(d.water||0)+1);$$('button',$('#waterButtons')).forEach((b,i)=>b.classList.toggle('active',i<d.water));saveDaily();});
  $('#exportBtn').addEventListener('click',exportBackup);$('#importBtn').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value='';});$('#resetBtn').addEventListener('click',()=>{if(!confirm('Reset today’s set checkmarks and notes?'))return;state.daily[todayKey()]={done:{},notes:{},effort:{},rir:{},leftRight:{},timestamps:{},collapsed:{},snack:false,meal:false,water:0};saveState();renderWorkout();toast('Today reset');});$('#clearDataBtn').addEventListener('click',()=>{if(!confirm('This deletes workout history and settings stored in this browser. Export a backup first if you need one. Continue?'))return;localStorage.removeItem(STORAGE_KEY);state=freshState();applySettings();renderWorkout();renderProgress();toast('Local data cleared');});
  $('#copySummaryBtn').addEventListener('click',async()=>{const latest=lastSavedSummary||state.logs.length?lastSavedSummary||`${state.logs.at(-1).day} ${state.logs.at(-1).date}\n${state.logs.at(-1).setsDone} sets · ${state.logs.at(-1).repsDone} reps`:'';if(!latest){toast('No saved workout to copy yet.');return;}try{await navigator.clipboard.writeText(latest);toast('Summary copied');}catch{toast('Clipboard access is unavailable in this browser.');}});
  $('#saveCheckinBtn').addEventListener('click',()=>{state.checkins.push({date:todayKey(),energy:$('#energySelect').value,sleep:$('#sleepSelect').value,soreness:$('#sorenessSelect').value});saveState();renderProgress();toast('Recovery check-in saved');});$('#saveFocusBtn').addEventListener('click',()=>{state.weeklyFocus=$('#weeklyFocus').value.trim();saveState();toast('Weekly focus saved');});
  bindSettings();document.addEventListener('click',e=>{const target=e.target.closest('button');if(!target)return;const r=target.getBoundingClientRect(),rip=document.createElement('i');rip.className='ripple';rip.style.left=`${e.clientX-r.left}px`;rip.style.top=`${e.clientY-r.top}px`;target.appendChild(rip);setTimeout(()=>rip.remove(),650);});
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();toggleMainTimer();}else if(e.key.toLowerCase()==='t'){startTempo();}else if(e.key==='Enter'){const next=$('.set-check:not(:disabled)');if(next)next.click();}else if(e.key==='Escape')$('#focusOverlay').hidden=true;});
  // Swipe right to complete a set row on touch devices.
  let touchStart=null;$('#phaseGrid').addEventListener('touchstart',e=>{const row=e.target.closest('.set-row');if(row)touchStart={x:e.touches[0].clientX,row};},{passive:true});$('#phaseGrid').addEventListener('touchend',e=>{if(!touchStart)return;const dx=e.changedTouches[0].clientX-touchStart.x;if(dx>75){const b=$('.set-check',touchStart.row);if(b&&!touchStart.row.classList.contains('done'))b.click();}touchStart=null;},{passive:true});
}
function init(){applySettings();renderClock();renderWorkout();renderProgress();$('#dailyTipTitle').textContent=tips[currentTipIndex][0];$('#dailyTip').textContent=tips[currentTipIndex][1];const d=dailyData();$('#snackCheck').checked=!!d.snack;$('#mealCheck').checked=!!d.meal;$$('button',$('#waterButtons')).forEach((b,i)=>b.classList.toggle('active',i<(d.water||0)));bindUI();setInterval(renderClock,15000);setTimeout(()=>$('#bootScreen').classList.add('done'),1050);if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(err=>console.info('Offline worker unavailable',err));}
init();


/* ================================================================
   MORPHSET v2.0 — 100-improvement extension layer
   Kept dependency-free so the app remains usable offline.
   ================================================================ */
(function VtaperUpgrade(){
  const X_VERSION = '9.6.2';
  let xStoragePersistence = 'not requested';
  async function xRequestStoragePersistence(){
    try{
      if(navigator.storage?.persist){
        const granted=await navigator.storage.persist();
        xStoragePersistence=granted?'protected from routine eviction':'browser-managed';
      }else xStoragePersistence='not supported by this browser';
    }catch(err){xStoragePersistence='browser-managed';console.info('Storage persistence unavailable',err);}
    xUpdateStorage();
  }

  const X_DAYS = ['Monday','Wednesday','Friday','Saturday','Rest'];
  const X_FIELDS = ['done','timestamps','notes','effort','rir','leftRight','collapsed','actualReps','setNotes','setLoad','skipReasons'];
  const X_LIBRARY = [
    {name:'Push-up',category:'Push',equipment:'None',difficulty:'Beginner-friendly',muscles:'Chest, shoulders and arms',cues:['Keep a comfortable body line.','Lower only as far as you can control.','Breathe steadily.'],alternative:'Incline push-up'},
    {name:'Incline push-up',category:'Push',equipment:'Stable elevated surface',difficulty:'Beginner-friendly',muscles:'Chest, shoulders and arms',cues:['Use a stable surface.','Keep the movement smooth.','Avoid letting the hips sag.'],alternative:'Wall push-up'},
    {name:'Dumbbell row',category:'Pull',equipment:'Dumbbell and stable support',difficulty:'Moderate',muscles:'Back and arms',cues:['Support yourself on a stable surface.','Pull the elbow toward your hip.','Keep your torso steady.'],alternative:'Resistance-band row'},
    {name:'Resistance-band row',category:'Pull',equipment:'Resistance band',difficulty:'Beginner-friendly',muscles:'Back and arms',cues:['Secure the band safely.','Keep shoulders relaxed.','Pull smoothly.'],alternative:'Dumbbell row'},
    {name:'Lateral raise',category:'Shoulders',equipment:'Light dumbbells or no weight',difficulty:'Moderate',muscles:'Shoulders',cues:['Use a light, controllable load.','Avoid shrugging.','Stop at a comfortable height.'],alternative:'Unweighted arm raise'},
    {name:'Bodyweight squat',category:'Legs',equipment:'None',difficulty:'Beginner-friendly',muscles:'Legs and hips',cues:['Keep feet planted comfortably.','Move within a comfortable range.','Keep control on the way down.'],alternative:'Chair sit-to-stand'},
    {name:'Chair sit-to-stand',category:'Legs',equipment:'Stable chair',difficulty:'Beginner-friendly',muscles:'Legs and hips',cues:['Use a stable chair.','Stand smoothly.','Sit down with control.'],alternative:'Bodyweight squat'},
    {name:'Front plank',category:'Core',equipment:'Mat or clear floor',difficulty:'Moderate',muscles:'Core and shoulders',cues:['Keep breathing normally.','Keep hips level.','Stop if your back feels uncomfortable.'],alternative:'Incline plank'},
    {name:'Dead bug',category:'Core',equipment:'Mat or clear floor',difficulty:'Beginner-friendly',muscles:'Core',cues:['Move opposite arm and leg slowly.','Keep your back comfortable.','Breathe throughout.'],alternative:'Heel taps'},
    {name:'Side plank',category:'Core',equipment:'Mat or clear floor',difficulty:'Moderate',muscles:'Core and side body',cues:['Keep a comfortable straight line.','Breathe normally.','Use a shorter hold if needed.'],alternative:'Side plank from knees'},
    {name:'Easy walk',category:'Recovery',equipment:'Comfortable shoes',difficulty:'Beginner-friendly',muscles:'General movement',cues:['Choose an easy pace.','You should be able to talk comfortably.'],alternative:'Gentle indoor walk'},
    {name:'Gentle mobility flow',category:'Mobility',equipment:'None',difficulty:'Beginner-friendly',muscles:'General mobility',cues:['Move slowly.','Do not force a stretch.','Stop if anything hurts.'],alternative:'Rest'}
  ];
  const X_TUTORIAL = [
    ['Workout dashboard','The Workout tab shows the plan for today. Check off sets as you complete them and enter actual reps when you want a more detailed log.'],
    ['Timers and focus','Use the rest timer, tempo pacer, interval builder and Focus Mode. Timers continue using timestamps when the browser tab is in the background.'],
    ['Build your plan','Open Builder to add, edit, duplicate, remove or reorder exercises. You can copy a day or save a reusable template.'],
    ['History and insights','Finish & save stores a session locally. Insights lets you compare sessions and view activity, rep trends and check-in notes.'],
    ['Privacy and backups','Your information stays in this browser. Export a JSON backup periodically and keep it somewhere safe.']
  ];
  let xBuilderDay = activeDay();
  let xEditingIndex = -1;
  let xActiveIndex = null;
  let xSessionStartedAt = null;
  let xStopwatch = {running:false,startedAt:0,elapsed:0,interval:null};
  let xTimerChain = [];
  let xTutorialIndex = 0;
  let xInstallPrompt = null;
  let xLastDayKey = todayKey();
  let xMonthOffset = 0;
  let xPendingImport = null;
  let xUndoStack = [];
  let xWarmupQueue = [];
  let xWarmupStep = 0;
  let xWarmupWatcher = null;
  let xCooldownWatcher = null;
  let xOriginalToggleSet = toggleSet;
  let xOriginalSaveWorkout = saveWorkout;
  let xOriginalRenderWorkout = renderWorkout;
  let xOriginalSetTab = setTab;
  let xOriginalSaveState = saveState;

  const xId = () => `ex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const xDeep = value => JSON.parse(JSON.stringify(value));
  const xPlan = day => state.plan[day] || (state.plan[day] = []);
  const xEnsureState = () => {
    state.weeklySchedule ||= xDefaultWeek();
    Object.entries(xDefaultWeek()).forEach(([day,entry])=>{state.weeklySchedule[day] ||= entry;});
    state.weeklyFocusNote ||= '';
    state.settings = {...(freshState().settings), ...(state.settings||{})};
    state.settings.timerPresets ||= [{id:'p60',name:'Standard rest',seconds:60},{id:'p90',name:'Longer rest',seconds:90},{id:'p30',name:'Short rest',seconds:30}];
    state.settings.tempoDown ??= 3; state.settings.tempoHold ??= 1; state.settings.tempoUp ??= 1;
    state.settings.soundVolume ??= 35; state.settings.vibrate ??= false; state.settings.notifications ??= false;
    state.settings.fontScale ??= '1'; state.settings.focusFontScale ??= '1'; state.settings.reducedMotion ??= false; state.settings.autoScroll ??= true;
    state.settings.oneHand ??= false; state.settings.accentColor ??= ''; state.settings.showQuickTools ??= true;
    state.settings.customWarmup ||= ['March in place','Arm circles','Hip hinges','Easy bodyweight squats','Gentle shoulder mobility'];
    state.settings.customCooldown ||= ['Easy walk and breathing','Gentle shoulder mobility','Comfortable hip mobility'];
    state.customTemplates ||= {};
    // Normalize fields used by the Version 8.1+ extension layer after backup imports.
    // Older backups may omit these arrays even though the dashboard renderer expects them.
    state.customWorkouts = Array.isArray(state.customWorkouts) ? state.customWorkouts : [];
    state.customSchedule = Array.isArray(state.customSchedule) ? state.customSchedule : [];
    state.dashboardPrefs = state.dashboardPrefs && typeof state.dashboardPrefs === 'object' ? state.dashboardPrefs : {hidden:[]};
    state.dashboardPrefs.hidden = Array.isArray(state.dashboardPrefs.hidden) ? state.dashboardPrefs.hidden : [];
    state.levelHistory = Array.isArray(state.levelHistory) ? state.levelHistory : [];
    state.unlockedTitles = Array.isArray(state.unlockedTitles) ? state.unlockedTitles : [];
    state.activeCustomRun = state.activeCustomRun && typeof state.activeCustomRun === 'object' ? state.activeCustomRun : null;
    state.daily ||= {}; state.logs ||= []; state.checkins ||= [];
    X_DAYS.forEach(day=>{
      if(day==='Saturday' && !state.plan.Saturday) state.plan.Saturday = [
        {name:'Gentle mobility flow',phase:'Cool-down',sets:1,reps:8,unit:'reps',cues:['Move gently.','Choose comfortable ranges.'],unilateral:false},
        {name:'Dead bug',phase:'Core',sets:2,reps:6,cues:['Move slowly and breathe.','Stop if anything feels uncomfortable.'],unilateral:false}
      ];
      if(!state.plan[day]) state.plan[day]=[];
      state.plan[day].forEach(ex=>{ex.id ||= xId();ex.category ||= 'General';ex.equipment ||= 'As listed';ex.difficulty ||= 'Beginner-friendly';ex.restSeconds ??= state.settings.rest||60;ex.favorite=!!ex.favorite;});
    });
    const d=dailyData();d.actualReps ||= {};d.setNotes ||= {};d.setLoad ||= {};d.setupChecks ||= {};d.warmupChecks ||= {};d.startedAt ||= null;d.planDay ||= activeDay();
    if(!state.setupCompleted) state.setupCompleted=false;
  };
  xEnsureState();
  saveState = function(){
    try{xOriginalSaveState();const el=document.getElementById('xSaveStatus');if(el){el.textContent='Saved on this Chromebook';el.dataset.state='saved';}}
    catch(err){console.warn('NEXORA save failed',err);const el=document.getElementById('xSaveStatus');if(el){el.textContent='Save failed — export a backup and check Chrome storage settings.';el.dataset.state='error';}}
  };
  getPlan = function(){const d=activeDay();return state.plan[d]||state.plan.Rest;};
  const xDaily = () => {const d=dailyData();d.actualReps ||= {};d.setNotes ||= {};d.setLoad ||= {};d.setupChecks ||= {};d.warmupChecks ||= {};d.planDay ||= activeDay();return d;};

  function xMountViews(){
    const status=$('.top-status');if(status&&!$('#xStickyTimer'))status.insertAdjacentHTML('beforeend','<span class="status-divider"></span><span id="xStickyTimer" aria-live="off">Timer ready</span>');
    const nav=$('.tabs');
    if(nav && !$('.tab[data-tab="builder"]')) nav.insertAdjacentHTML('beforeend','<button class="tab" data-tab="builder">Builder</button><button class="tab" data-tab="insights">Insights</button><button class="tab" data-tab="guide">Guide</button>');
    if(!$('#builderView')){
      const settings=$('#settingsView');
      settings.insertAdjacentHTML('beforebegin', `
      <section id="builderView" class="view"><div class="section-heading"><div><p class="eyebrow">PLAN EDITOR</p><h2>Workout builder</h2></div><span class="pill">CUSTOMIZE</span></div>
      <section class="panel"><div class="builder-controls"><label>Editing day<select id="xBuilderDay">${X_DAYS.map(d=>`<option>${d}</option>`).join('')}</select></label><label>Copy plan from<select id="xCopyDay">${X_DAYS.map(d=>`<option>${d}</option>`).join('')}</select></label><button class="btn btn-outline btn-small" id="xCopyPlanBtn">Copy day</button><label>Template<select id="xTemplate"><option value="keep">Choose template...</option><option value="balanced">Balanced starter</option><option value="bodyweight">Bodyweight basics</option><option value="mobility">Gentle mobility</option><option value="restore">Restore starter plan</option></select></label><button class="btn btn-outline btn-small" id="xApplyTemplateBtn">Apply</button><button class="btn btn-primary btn-small" id="xAddExerciseBtn">+ Add exercise</button></div><p class="small-note" id="xBuilderStatus">Edits save locally.</p></section>
      <section class="panel"><div class="panel-heading"><h3>Arrange your exercises</h3><input id="xBuilderSearch" type="search" placeholder="Find an exercise..."></div><div id="xBuilderList" class="builder-list"></div></section>
      <div class="two-col"><section class="panel"><h3>Warm-up builder</h3><textarea id="xWarmupEditor" rows="5"></textarea><button class="btn btn-outline btn-small" id="xSaveWarmup">Save warm-up routine</button></section><section class="panel"><h3>Cool-down builder</h3><textarea id="xCooldownEditor" rows="5"></textarea><button class="btn btn-outline btn-small" id="xSaveCooldown">Save cooldown routine</button></section></div>
      <section class="panel"><h3>Saved templates</h3><p class="small-note">Create a reusable copy of your current day. Keep movement choices comfortable and leave rest days in your schedule.</p><div class="builder-controls"><input id="xTemplateName" maxlength="30" placeholder="Template name"><button class="btn btn-outline btn-small" id="xSaveTemplateBtn">Save current day</button><select id="xSavedTemplateSelect"><option value="">Saved templates</option></select><button class="btn btn-outline btn-small" id="xLoadTemplateBtn">Load template</button></div></section></section>
      <section id="insightsView" class="view"><div class="section-heading"><div><p class="eyebrow">YOUR TRAINING RECORD</p><h2>Insights & comparisons</h2></div><span class="pill">LOCAL DATA</span></div><div id="xWeeklySummary" class="stats-grid"></div><section class="panel"><h3>Recent weekly sessions</h3><div id="xWeeklyChart" class="bar-chart"></div></section><section class="panel"><h3>Planned vs completed sets</h3><div id="xCompletionChart" class="bar-chart"></div></section><section class="panel"><div class="panel-heading"><h3>Compare saved sessions</h3><div class="builder-controls"><select id="xCompareA"></select><select id="xCompareB"></select><button class="btn btn-outline btn-small" id="xCompareBtn">Compare</button></div></div><div id="xCompareOutput" class="compare-output"></div></section><section class="panel"><div class="panel-heading"><h3>Rep trends</h3><select id="xTrendExercise"></select></div><div id="xRepTrend" class="bar-chart"></div><div id="xExerciseConsistency" class="consistency-list"></div></section><div class="two-col"><section class="panel"><h3>Recovery timeline</h3><div id="xCheckinTimeline" class="timeline-list"></div></section><section class="panel"><h3>Training notes timeline</h3><div id="xNotesTimeline" class="timeline-list"></div></section></div></section>
      <section id="guideView" class="view"><div class="section-heading"><div><p class="eyebrow">MOVEMENT REFERENCE</p><h2>Exercise guide & recovery</h2></div><button class="btn btn-outline btn-small" id="xTutorialBtn">App tutorial</button></div><section class="panel"><div class="panel-heading"><h3>Exercise library</h3><input id="xGuideSearch" type="search" placeholder="Search movements..."></div><div id="xGuideLibrary" class="guide-grid"></div></section><div class="two-col"><section class="panel"><h3>Comfort & readiness</h3><label class="setting-row">How does movement feel today?<select id="xComfortSelect"><option value="ready">Comfortable and ready</option><option value="tired">A little tired</option><option value="sore">Noticeably sore</option><option value="uncomfortable">Something feels uncomfortable</option></select></label><p id="xComfortAdvice" class="small-note">Choose a comfortable pace and take breaks as needed.</p><div class="checklist-box"><b>Space and equipment checklist</b><label><input type="checkbox" class="xSetupCheck"> Floor and surrounding space are clear</label><label><input type="checkbox" class="xSetupCheck"> Support surface is stable</label><label><input type="checkbox" class="xSetupCheck"> Water is nearby</label><label><input type="checkbox" class="xSetupCheck"> There is enough room to move</label></div></section><section class="panel"><h3>Rest-day ideas</h3><p class="small-note">Rest is a normal part of a training routine. Optional activities should stay easy and comfortable.</p><ul class="guide-bullets"><li>Take an easy walk if it feels good.</li><li>Try gentle mobility without forcing a stretch.</li><li>Have regular meals, water and sleep.</li><li>Skip activity when you need extra rest.</li></ul><button class="btn btn-outline btn-small" id="xRecoveryReminderBtn">Set a rest-day reminder</button></section></div><section class="panel"><h3>Interactive tutorial</h3><p class="small-note">Learn how to edit plans, log sets, use timers, save sessions and back up your data.</p><button class="btn btn-primary" id="xStartTutorialBtn">Start tutorial</button></section></section>
      `);
    }
    // Append enhancement settings to the existing Settings view.
    if(!$('#xSettingsSearch')){
      const grid=$('#settingsView .settings-grid');
      if(grid){grid.insertAdjacentHTML('beforebegin','<div class="settings-search-row"><input id="xSettingsSearch" type="search" placeholder="Search settings..." aria-label="Search settings"><span id="xAppVersion" class="small-note">NEXORA FITNESS 9.7.0</span></div>');
        grid.insertAdjacentHTML('beforeend',`<section class="panel x-settings-panel"><h3>Accessibility & display</h3><label class="setting-row">Interface text size<select id="xFontScale"><option value="0.9">Small</option><option value="1" selected>Default</option><option value="1.1">Large</option><option value="1.2">Extra large</option></select></label><label class="setting-row">Reduced motion<input type="checkbox" id="xReducedMotion"></label><label class="setting-row">Auto-scroll to next exercise<input type="checkbox" id="xAutoScroll" checked></label><label class="setting-row">One-hand layout<input type="checkbox" id="xOneHand"></label><label class="setting-row">Custom accent color<input type="color" id="xAccentColor" value="#34e2a2"></label><label class="setting-row">Show quick tools<input type="checkbox" id="xShowQuickTools" checked></label><button class="btn btn-outline btn-small" id="xResetAppearance">Reset appearance</button></section>
        <section class="panel x-settings-panel"><h3>Timer & notifications</h3><label class="setting-row">Tempo lower (seconds)<input type="number" id="xTempoDown" min="1" max="10"></label><label class="setting-row">Tempo hold (seconds)<input type="number" id="xTempoHold" min="0" max="5"></label><label class="setting-row">Tempo lift (seconds)<input type="number" id="xTempoUp" min="1" max="10"></label><label class="setting-row">Timer sound level<input type="range" id="xSoundVolume" min="0" max="100"></label><label class="setting-row">Vibrate when timer ends<input type="checkbox" id="xVibrate"></label><label class="setting-row">Browser timer notifications<input type="checkbox" id="xNotifications"></label><button class="btn btn-outline btn-small" id="xPreviewSound">Preview sound</button><button class="btn btn-outline btn-small" id="xNotificationPermission">Enable notifications</button></section>
        <section class="panel x-settings-panel"><h3>Data, storage & diagnostics</h3><p id="xStorageUsage" class="small-note">Storage usage: calculating...</p><p id="xOfflineStatus" class="small-note">Connection status: checking...</p><p id="xDiagnostics" class="small-note">Diagnostics have not run yet.</p><div class="button-stack"><button class="btn btn-outline" id="xRunDiagnostics">Run app diagnostics</button><button class="btn btn-outline" id="xBackupPreviewBtn">Preview current backup</button><button class="btn btn-outline" id="xPwaHelpBtn">PWA / install help</button><button class="btn btn-outline" id="xRestoreSettings">Restore default settings</button></div></section>
        <section class="panel x-settings-panel"><h3>Timer presets & interval builder</h3><div class="builder-controls"><input id="xPresetName" maxlength="24" placeholder="Preset name"><input id="xPresetSeconds" type="number" min="1" max="3600" value="60"><button class="btn btn-outline btn-small" id="xSavePreset">Save preset</button></div><div id="xPresetList" class="preset-list"></div><div class="builder-controls"><label>Work seconds<input type="number" id="xIntervalWork" min="1" max="600" value="20"></label><label>Rest seconds<input type="number" id="xIntervalRest" min="1" max="600" value="10"></label><label>Rounds<input type="number" id="xIntervalRounds" min="1" max="20" value="4"></label><button class="btn btn-outline btn-small" id="xStartIntervals">Start intervals</button></div><div class="builder-controls"><label>Chain seconds<input type="number" id="xChainSeconds" min="1" max="3600" value="60"></label><button class="btn btn-outline btn-small" id="xAddChainStep">Add chain step</button><button class="btn btn-outline btn-small" id="xRunChain">Run timer chain</button></div><div id="xChainList" class="small-note">No timer steps added.</div></section>`);
      }
    }
    if(!$('#xExerciseDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="xExerciseDialog" class="modal"><form id="xExerciseForm"><div class="modal-head"><div><p class="eyebrow">PLAN EDITOR</p><h2 id="xExerciseDialogTitle">Add exercise</h2></div><button class="icon-btn" type="button" id="xCloseExercise">✕</button></div><label>Exercise name<input id="xExerciseName" maxlength="60" required></label><div class="form-two"><label>Sets<input id="xExerciseSets" type="number" min="1" max="8" value="2" required></label><label>Target reps / seconds<input id="xExerciseReps" type="number" min="1" max="120" value="8" required></label></div><div class="form-two"><label>Phase<select id="xExercisePhase"><option>Strength</option><option>Core</option><option>Warm-up</option><option>Cool-down</option></select></label><label>Unit<select id="xExerciseUnit"><option value="reps">Reps</option><option value="sec">Seconds</option><option value="min">Minutes</option></select></label></div><div class="form-two"><label>Category<input id="xExerciseCategory" maxlength="30" placeholder="General"></label><label>Equipment<input id="xExerciseEquipment" maxlength="50" placeholder="None / optional"></label></div><div class="form-two"><label>Difficulty<select id="xExerciseDifficulty"><option>Beginner-friendly</option><option>Moderate</option><option>More challenging</option></select></label><label>Rest seconds<input id="xExerciseRest" type="number" min="0" max="300" value="60"></label></div><label>Form cues (one per line)<textarea id="xExerciseCues" rows="3"></textarea></label><label>Alternative movement<input id="xExerciseAlternative" maxlength="80"></label><div class="modal-actions"><button class="btn btn-quiet" type="button" id="xCancelExercise">Cancel</button><button class="btn btn-primary" type="submit">Save exercise</button></div></form></dialog><dialog id="xBackupDialog" class="modal"><form method="dialog"><div class="modal-head"><h2>Backup preview</h2><button class="icon-btn" value="cancel">✕</button></div><pre id="xBackupPreview" class="backup-preview"></pre><button class="btn btn-primary" value="cancel">Close</button></form></dialog><dialog id="xTutorialDialog" class="modal"><form method="dialog"><div class="modal-head"><div><p class="eyebrow">QUICK TOUR</p><h2 id="xTutorialTitle">Welcome</h2></div><button class="icon-btn" value="cancel">✕</button></div><p id="xTutorialText" class="tutorial-copy"></p><div class="tutorial-progress" id="xTutorialProgress"></div><div class="modal-actions"><button class="btn btn-quiet" type="button" id="xTutorialBack">Back</button><button class="btn btn-primary" type="button" id="xTutorialNext">Next</button></div></form></dialog>`);
    // Workout controls and a live status strip.
    if(!$('#xWorkoutToolbar')){
      const phase=$('#phaseGrid');
      phase.insertAdjacentHTML('beforebegin',`<div class="x-workout-toolbar" id="xWorkoutToolbar"><div class="x-active-strip"><b id="xActiveName">Ready for today's session</b><span id="xNextName">Next: choose a set to begin</span><div id="xPhaseMeters" class="x-phase-meters"></div></div><div class="x-toolbar-actions"><button class="btn btn-quiet btn-small" id="xExpandAll">Expand all</button><button class="btn btn-quiet btn-small" id="xCollapseAll">Collapse all</button><button class="btn btn-outline btn-small" id="xUndoLastSet" disabled>Undo last set</button><button class="btn btn-outline btn-small" id="xOverviewBtn">Session overview</button></div></div>`);
      const toolPanel=$('.tool-panel'); if(toolPanel){const grid=$('.tool-grid',toolPanel);if(grid&&!$('#xCooldownBtn'))grid.insertAdjacentHTML('afterend','<div class="timer-row"><label>Guided cool-down</label><button class="btn btn-outline btn-small" id="xCooldownBtn">Start cool-down sequence</button></div>');toolPanel.insertAdjacentHTML('beforeend',`<div class="timer-row"><label>Workout stopwatch <strong id="xStopwatchDisplay">00:00</strong></label><div class="inline-controls"><button class="btn btn-outline btn-small" id="xStopwatchToggle">Start</button><button class="btn btn-quiet btn-small" id="xStopwatchReset">Reset</button></div></div><div class="timer-row"><label>Timer preset</label><div class="inline-controls"><select id="xTimerPreset"></select><button class="btn btn-outline btn-small" id="xRunPreset">Start preset</button></div></div>`);
      }
      const hist=$('#historyView .section-heading'); if(hist && !$('#xHistorySearch'))hist.insertAdjacentHTML('afterend','<div class="filter-row"><input id="xHistorySearch" type="search" placeholder="Search workouts or exercises..."><select id="xHistoryRange"><option value="all">All history</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>');
    }
    // Add a visible save-state and offline indicator to the footer.
    const footer=$('.app-footer');if(footer&&!$('#xSaveStatus'))footer.insertAdjacentHTML('beforeend','<span class="offline-pill" id="xOfflinePill">Online</span><span id="xSaveStatus" class="small-note">Saved on this Chromebook</span>');
  }

  function xRenderBuilder(){
    if(!$('#xBuilderList'))return;
    xBuilderDay=X_DAYS.includes(xBuilderDay)?xBuilderDay:activeDay();
    $('#xBuilderDay').value=xBuilderDay;
    $('#xWarmupEditor').value=state.settings.customWarmup.join('\n');
    $('#xCooldownEditor').value=state.settings.customCooldown.join('\n');
    const q=($('#xBuilderSearch')?.value||'').toLowerCase();
    const list=xPlan(xBuilderDay);
    $('#xBuilderList').innerHTML=list.map((ex,i)=>({ex,i})).filter(o=>!q||`${o.ex.name} ${o.ex.category||''} ${o.ex.equipment||''}`.toLowerCase().includes(q)).map(({ex,i})=>`<div class="builder-item" draggable="true" data-drag-index="${i}"><div><b>${escapeHtml(ex.name)} ${ex.favorite?'★':''}</b><small>${ex.phase} · ${ex.sets} sets · ${ex.reps} ${ex.unit||'reps'} · ${escapeHtml(ex.category||'General')} · ${escapeHtml(ex.equipment||'Equipment not set')} · ${escapeHtml(ex.difficulty||'Beginner-friendly')} · ${ex.restSeconds||state.settings.rest}s rest</small></div><div class="builder-actions"><button data-x-action="up" data-index="${i}" aria-label="Move ${escapeHtml(ex.name)} up">↑</button><button data-x-action="down" data-index="${i}" aria-label="Move ${escapeHtml(ex.name)} down">↓</button><button data-x-action="edit" data-index="${i}">Edit</button><button data-x-action="duplicate" data-index="${i}">Duplicate</button><button data-x-action="favorite" data-index="${i}" class="${ex.favorite?'x-favorite':''}">★</button><button data-x-action="delete" data-index="${i}">Delete</button></div></div>`).join('')||'<p class="history-empty">No exercises match this search. Add an exercise or clear the search.</p>';
    const templates=Object.keys(state.customTemplates||{});$('#xSavedTemplateSelect').innerHTML='<option value="">Saved templates</option>'+templates.map(n=>`<option>${escapeHtml(n)}</option>`).join('');
  }
  function xReindexDaily(day,oldPlan,newPlan){
    const newIndexById=new Map(newPlan.map((e,i)=>[e.id,i]));
    for(const rec of Object.values(state.daily||{})){
      if(rec.planDay!==day)continue;
      for(const field of X_FIELDS){const src=rec[field];if(!src||typeof src!=='object')continue;const dest={};
        for(const [key,value] of Object.entries(src)){
          const m=key.match(/^(\d+)(?:-(\d+))?$/);if(!m){dest[key]=value;continue;}
          const oldIndex=Number(m[1]),oldEx=oldPlan[oldIndex];if(!oldEx)continue;const nextIndex=newIndexById.get(oldEx.id);if(nextIndex===undefined)continue;
          dest[`${nextIndex}${m[2]!==undefined?'-'+m[2]:''}`]=value;
        }rec[field]=dest;
      }
    }
  }
  function xMoveExercise(index,delta){const old=xDeep(xPlan(xBuilderDay)),next=xDeep(old),target=index+delta;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];xReindexDaily(xBuilderDay,old,next);state.plan[xBuilderDay]=next;saveState();xRenderBuilder();renderWorkout();}
  function xOpenExercise(index=-1){xEditingIndex=index;const ex=index>=0?xPlan(xBuilderDay)[index]:null;$('#xExerciseDialogTitle').textContent=ex?'Edit exercise':'Add exercise';$('#xExerciseName').value=ex?.name||'';$('#xExerciseSets').value=ex?.sets||2;$('#xExerciseReps').value=ex?.reps||8;$('#xExercisePhase').value=ex?.phase||'Strength';$('#xExerciseUnit').value=ex?.unit||'reps';$('#xExerciseCategory').value=ex?.category||'';$('#xExerciseEquipment').value=ex?.equipment||'';$('#xExerciseDifficulty').value=ex?.difficulty||'Beginner-friendly';$('#xExerciseRest').value=ex?.restSeconds??state.settings.rest;$('#xExerciseCues').value=(ex?.cues||[]).join('\n');$('#xExerciseAlternative').value=ex?.alternative||'';$('#xExerciseDialog').showModal();}
  function xSubmitExercise(e){e.preventDefault();const plan=xPlan(xBuilderDay),old=xDeep(plan);const item={id:xEditingIndex>=0?plan[xEditingIndex].id:xId(),name:$('#xExerciseName').value.trim(),sets:Math.max(1,Math.min(8,Number($('#xExerciseSets').value)||1)),reps:Math.max(1,Math.min(120,Number($('#xExerciseReps').value)||1)),phase:$('#xExercisePhase').value,unit:$('#xExerciseUnit').value,category:$('#xExerciseCategory').value.trim()||'General',equipment:$('#xExerciseEquipment').value.trim()||'None',difficulty:$('#xExerciseDifficulty').value,restSeconds:Math.max(0,Math.min(300,Number($('#xExerciseRest').value)||0)),cues:$('#xExerciseCues').value.split('\n').map(x=>x.trim()).filter(Boolean),alternative:$('#xExerciseAlternative').value.trim(),unilateral:plan[xEditingIndex]?.unilateral||false,favorite:plan[xEditingIndex]?.favorite||false};
    if(xEditingIndex>=0)plan[xEditingIndex]=item;else plan.push(item);
    // Discard set slots that no longer exist if the target count was reduced.
    const d=xDaily();if(xEditingIndex>=0){const max=item.sets;for(const field of ['done','timestamps','actualReps','setNotes','setLoad'])for(const k of Object.keys(d[field]||{})){const m=k.match(new RegExp(`^${xEditingIndex}-(\\d+)$`));if(m&&Number(m[1])>=max){delete d[field][k];}}}
    saveState();$('#xExerciseDialog').close();xRenderBuilder();renderWorkout();toast(xEditingIndex>=0?'Exercise updated':'Exercise added');
  }
  function xCreateFromLibrary(name){const lib=X_LIBRARY.find(x=>x.name===name);if(!lib)return;xOpenExercise();$('#xExerciseName').value=lib.name;$('#xExerciseCategory').value=lib.category;$('#xExerciseEquipment').value=lib.equipment;$('#xExerciseDifficulty').value=lib.difficulty;$('#xExerciseCues').value=lib.cues.join('\n');$('#xExerciseAlternative').value=lib.alternative;}
  function xApplyTemplate(){const type=$('#xTemplate').value;let plan;
    if(type==='restore'){plan=xDeep(defaultPlan[xBuilderDay]||defaultPlan.Rest);}
    else if(type==='balanced'){plan=xDeep(defaultPlan[xBuilderDay]||defaultPlan.Monday);}
    else if(type==='bodyweight'){plan=[{name:'Incline push-up',phase:'Strength',sets:2,reps:8,cues:['Use a stable surface.','Keep reps controlled.'],equipment:'Stable surface',category:'Push',difficulty:'Beginner-friendly'},{name:'Bodyweight squat',phase:'Strength',sets:2,reps:8,cues:['Move comfortably.','Keep feet planted.'],equipment:'None',category:'Legs',difficulty:'Beginner-friendly'},{name:'Dead bug',phase:'Core',sets:2,reps:6,cues:['Move slowly.','Breathe normally.'],equipment:'None',category:'Core',difficulty:'Beginner-friendly'}];}
    else if(type==='mobility'){plan=[{name:'Gentle mobility flow',phase:'Warm-up',sets:1,reps:5,unit:'min',cues:['Move gently.','Do not force range.'],equipment:'None',category:'Mobility',difficulty:'Beginner-friendly'},{name:'Easy walk',phase:'Cool-down',sets:1,reps:10,unit:'min',cues:['Keep this easy.'],equipment:'Comfortable shoes',category:'Recovery',difficulty:'Beginner-friendly'}];}
    else {toast('Choose a template first.');return;}
    plan.forEach(ex=>{ex.id=xId();ex.unilateral=!!ex.unilateral;ex.category||='General';ex.equipment||='None';ex.difficulty||='Beginner-friendly';ex.restSeconds=state.settings.rest;});
    const old=xDeep(xPlan(xBuilderDay));xReindexDaily(xBuilderDay,old,[]);state.plan[xBuilderDay]=plan;saveState();xRenderBuilder();renderWorkout();toast('Template applied to '+xBuilderDay);
  }
  function xDefaultWeek(){return {Monday:{type:'Workout A',note:'Strength and control'},Tuesday:{type:'Rest',note:'Recovery'},Wednesday:{type:'Workout B',note:'Balanced session'},Thursday:{type:'Rest',note:'Recovery'},Friday:{type:'Workout C',note:'Move with control'},Saturday:{type:'Optional',note:'Only if it feels good'},Sunday:{type:'Rest',note:'Reset for the week'}};}
  const X_WEEK_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const X_WEEK_TYPES=['Workout A','Workout B','Workout C','Mobility','Optional','Rest'];
  function xRenderPlanner(){
    state.weeklySchedule ||= xDefaultWeek();
    $('#xPlannerGrid').innerHTML=X_WEEK_DAYS.map(day=>{const item=state.weeklySchedule[day]||{type:'Rest',note:''};const today=day===getDayName();return `<article class="panel planner-day ${today?'is-today':''}"><div class="planner-day-head"><b>${day}</b>${today?'<span class="pill">TODAY</span>':''}</div><label>Day focus<select data-planner-day="${day}" class="planner-type">${X_WEEK_TYPES.map(t=>`<option ${item.type===t?'selected':''}>${t}</option>`).join('')}</select></label><label>Note<input type="text" maxlength="70" data-planner-note="${day}" value="${escapeHtml(item.note||'')}" placeholder="Add a short note"></label><small>${item.type==='Rest'?'Recovery day':item.type==='Mobility'?'Gentle movement, if comfortable':item.type==='Optional'?'Optional activity — rest is equally valid':'Use the matching workout in your Builder'}</small></article>`;}).join('');
    $('#xPlannerFocus').value=state.weeklyFocusNote||'';
  }
  function xRenderPRs(){
    const totals={};
    state.logs.forEach(log=>(log.exerciseStats||[]).forEach(ex=>{const reps=(Number(ex.reps)||0)*(Number(ex.done)||0);if(!totals[ex.name]||reps>totals[ex.name].reps)totals[ex.name]={name:ex.name,reps,sets:Number(ex.done)||0,date:log.date};}));
    const records=Object.values(totals).sort((a,b)=>b.reps-a.reps).slice(0,6);
    $('#xPersonalRecords').innerHTML=records.length?records.map(r=>`<article class="pr-card"><small>${escapeHtml(r.name)}</small><strong>${r.reps}</strong><span>logged reps · ${r.sets} sets</span><em>${escapeHtml(r.date)}</em></article>`).join(''):'<p class="history-empty">Save a workout to start building your session highlights.</p>';
    const best=records[0];$('#xDashboardPR').textContent=best?best.name:'No records yet';$('#xDashboardPRText').textContent=best?`${best.reps} reps across ${best.sets} completed sets · ${best.date}`:'Your saved session highlights will appear here.';
  }
  function xRenderDashboard(){
    const today=getDayName(),idx=X_WEEK_DAYS.indexOf(today),schedule=state.weeklySchedule||xDefaultWeek();let next=null;
    for(let step=0;step<7;step++){const day=X_WEEK_DAYS[(idx+step)%7],entry=schedule[day]||{type:'Rest',note:''};if(!['Rest'].includes(entry.type)){next={day,entry,step};break;}}
    $('#xNextSessionTitle').textContent=next?(next.step===0?'Today · '+next.entry.type:next.day+' · '+next.entry.type):'Rest and reset';
    $('#xNextSessionText').textContent=next?(next.entry.note||'Your planned training day.'): 'Your current week is set aside for recovery.';
    const count=state.logs.length,targets=[1,3,5,10,15,20,30,40,50,75,100],goal=targets.find(n=>n>count)||count+10,previous=targets.filter(n=>n<=count).at(-1)||0;
    const sessionCount=$('#xDashSessions');if(sessionCount)sessionCount.textContent=String(count);
    const activity=$('#xWeeklyActivity');if(activity){
      const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const log=state.logs.find(item=>item.date===key);return {label:d.toLocaleDateString([], {weekday:'short'}).slice(0,2),sets:log?Number(log.setsDone)||0:0,active:!!log};});
      const max=Math.max(1,...days.map(day=>day.sets));activity.innerHTML=days.map(day=>`<div class="activity-day ${day.active?'has-activity':''}" title="${day.sets} sets logged"><em>${day.active?day.sets:'—'}</em><div class="activity-bar-wrap"><span style="height:${day.active?Math.max(12,Math.round(day.sets/max*100)):4}%"></span></div><small>${day.label}</small></div>`).join('');
      const total=days.filter(day=>day.active).length;const totalLabel=$('#xWeekTotal');if(totalLabel)totalLabel.textContent=`${total} ${total===1?'session':'sessions'}`;
    }
    $('#xDashboardMilestone').textContent=count===0?'First session':`${goal} saved sessions`;
    $('#xDashboardMilestoneText').textContent=count===0?'Save a session to begin your history.':`${count} saved · ${goal-count} to the next milestone`;
    $('#xMilestoneFill').style.width=`${Math.min(100,Math.round((count-previous)/(goal-previous)*100))}%`;
    xRenderPRs();
  }
  function xBindPlanner(){
    $('#xPlannerGrid').addEventListener('change',e=>{const day=e.target.dataset.plannerDay;if(day){state.weeklySchedule[day].type=e.target.value;saveState();xRenderPlanner();xRenderDashboard();toast(`${day} updated`);}});
    $('#xPlannerGrid').addEventListener('input',e=>{const day=e.target.dataset.plannerNote;if(day){state.weeklySchedule[day].note=e.target.value;saveState();xRenderDashboard();}});
    $('#xPlannerFocus').addEventListener('change',e=>{state.weeklyFocusNote=e.target.value.slice(0,240);saveState();});
    $('#xSavePlannerFocus').addEventListener('click',()=>{state.weeklyFocusNote=$('#xPlannerFocus').value.slice(0,240);saveState();toast('Weekly intention saved.');});
    $('#xResetPlanner').addEventListener('click',()=>{if(!confirm('Restore the starter weekly schedule?'))return;state.weeklySchedule=xDefaultWeek();saveState();xRenderPlanner();xRenderDashboard();toast('Starter week restored.');});
    $('#xOpenPlanner').addEventListener('click',()=>setTab('planner'));$('#xOpenProgress').addEventListener('click',()=>setTab('progress'));$('#xPlannerBuilder').addEventListener('click',()=>setTab('builder'));
  }

  function xRenderLibrary(){const q=($('#xGuideSearch')?.value||'').toLowerCase();$('#xGuideLibrary').innerHTML=X_LIBRARY.filter(x=>`${x.name} ${x.category} ${x.muscles}`.toLowerCase().includes(q)).map(x=>`<article class="guide-card"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.category)} · ${escapeHtml(x.difficulty)} · ${escapeHtml(x.equipment)}</small><p>Focus: ${escapeHtml(x.muscles)}<br>${x.cues.map(escapeHtml).join(' · ')}</p><details class="guide-detail"><summary>Technique & common mistakes</summary><ul>${x.cues.map(c=>`<li>${escapeHtml(c)}</li>`).join('')}</ul><p><b>Alternative:</b> ${escapeHtml(x.alternative)}</p><p><b>Reminder:</b> Use a comfortable range and stop if anything hurts or feels unusual.</p></details><button class="mini-btn" data-x-library="${escapeHtml(x.name)}">Add to current plan</button></article>`).join('')||'<p class="history-empty">No movements match that search.</p>';
  }
  function xChart(target,items){const max=Math.max(1,...items.map(x=>x.value));$(target).innerHTML=items.length?items.map(x=>`<div class="bar-col"><b>${x.value}</b><div class="bar-fill" style="height:${Math.max(2,x.value/max*100)}%" title="${escapeHtml(x.label)}: ${x.value}"></div><small>${escapeHtml(x.label)}</small></div>`).join(''):'<p class="history-empty">Save a few sessions to see a chart.</p>';}
  function xRenderInsights(){
    const logs=state.logs.slice().sort((a,b)=>a.date.localeCompare(b.date));
    const now=new Date(),weekAgo=new Date(now);weekAgo.setDate(now.getDate()-6);
    const weekly=logs.filter(l=>new Date(l.date+'T12:00:00')>=weekAgo);
    $('#xWeeklySummary').innerHTML=statCard('THIS WEEK',weekly.length,'Saved sessions')+statCard('SETS LOGGED',logs.reduce((a,l)=>a+(l.setsDone||0),0),'All saved sessions')+statCard('ACTUAL TIME',logs.reduce((a,l)=>a+(Number(l.durationSeconds)||0),0)?Math.round(logs.reduce((a,l)=>a+(Number(l.durationSeconds)||0),0)/60)+' min':'—','Recorded duration');
    const weekItems=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=todayKey(d);weekItems.push({label:d.toLocaleDateString([],{weekday:'short'}),value:logs.filter(l=>l.date===key).length});}xChart('#xWeeklyChart',weekItems);
    $('#xCompletionChart').innerHTML=logs.slice(-7).map(l=>{const done=l.setsDone||0,planned=l.plannedSets||done,max=Math.max(1,planned);return `<div class="bar-col"><b>${done}/${planned}</b><div class="bar-fill" style="height:${Math.max(2,done/max*100)}%"></div><small>${escapeHtml(l.date.slice(5))}</small></div>`;}).join('')||'<p class="history-empty">Save sessions to compare planned and completed sets.</p>';
    const opts=logs.slice().reverse().map(l=>`<option value="${escapeHtml(l.date)}">${escapeHtml(l.day)} · ${escapeHtml(l.date)}</option>`).join('');$('#xCompareA').innerHTML=opts||'<option value="">No sessions yet</option>';$('#xCompareB').innerHTML=opts||'<option value="">No sessions yet</option>';
    const names=[...new Set(logs.flatMap(l=>(l.exerciseStats||[]).map(e=>e.name)))];$('#xTrendExercise').innerHTML=names.map(n=>`<option>${escapeHtml(n)}</option>`).join('')||'<option value="">No exercises yet</option>';
    xRenderRepTrend();
    const totals={};logs.forEach(l=>(l.exerciseStats||[]).forEach(e=>totals[e.name]=(totals[e.name]||0)+1));$('#xExerciseConsistency').innerHTML=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,c])=>`<div class="consistency-item"><b>${escapeHtml(n)}</b><span>Logged in ${c} saved session${c===1?'':'s'}</span></div>`).join('')||'<p class="history-empty">Exercise consistency will appear after saving sessions.</p>';
    $('#xCheckinTimeline').innerHTML=state.checkins.slice().reverse().slice(0,10).map(c=>`<div class="timeline-item"><b>${escapeHtml(c.date)}</b><small>Energy: ${escapeHtml(c.energy)} · Rest: ${escapeHtml(c.sleep)} · Soreness: ${escapeHtml(c.soreness)}</small></div>`).join('')||'<p class="history-empty">No recovery check-ins yet.</p>';
    const notes=[];Object.entries(state.daily||{}).forEach(([date,d])=>{Object.entries(d.notes||{}).forEach(([idx,n])=>{if(n)notes.push({date,n});});Object.entries(d.setNotes||{}).forEach(([idx,n])=>{if(n)notes.push({date,n:`Set ${idx}: ${n}`});});});$('#xNotesTimeline').innerHTML=notes.slice(-15).reverse().map(n=>`<div class="timeline-item"><b>${escapeHtml(n.date)}</b><small>${escapeHtml(n.n)}</small></div>`).join('')||'<p class="history-empty">No exercise notes saved yet.</p>';
  }
  function xRenderRepTrend(){const name=$('#xTrendExercise')?.value;const arr=state.logs.filter(l=>(l.exerciseStats||[]).some(e=>e.name===name)).slice(-8).map(l=>{const e=l.exerciseStats.find(e=>e.name===name);return {label:l.date.slice(5),value:e.actualReps||e.reps||0};});xChart('#xRepTrend',arr);}
  function xCompare(){const a=state.logs.find(l=>l.date===$('#xCompareA').value),b=state.logs.find(l=>l.date===$('#xCompareB').value);if(!a||!b){$('#xCompareOutput').textContent='Save at least two sessions to compare them.';return;}$('#xCompareOutput').innerHTML=`<b>${escapeHtml(a.date)}</b> vs <b>${escapeHtml(b.date)}</b><br>Sets: ${a.setsDone||0} vs ${b.setsDone||0}<br>Actual reps logged: ${a.repsDone||0} vs ${b.repsDone||0}<br>Time: ${escapeHtml(a.duration||'—')} vs ${escapeHtml(b.duration||'—')}<br><br>Use this as a record of what you did, not a requirement to beat every previous session.`;}
  function xHistoryFilter(){if(!$('#historyList'))return;const q=($('#xHistorySearch')?.value||'').toLowerCase(),range=$('#xHistoryRange')?.value||'all',cut=new Date();if(range!=='all')cut.setDate(cut.getDate()-Number(range));const list=state.logs.slice().reverse().filter(l=>(range==='all'||new Date(l.date+'T12:00:00')>=cut)&&(!q||`${l.day} ${l.date} ${(l.exerciseStats||[]).map(e=>e.name).join(' ')}`.toLowerCase().includes(q)));$('#historyList').innerHTML=list.map(l=>`<details class="history-item"><summary><span><b>${escapeHtml(l.day)} · ${escapeHtml(l.date)}</b><small>${l.setsDone||0} sets · ${l.repsDone||0} reps · ${escapeHtml(l.duration||'—')}</small></span><b>+${l.xp||0} XP</b></summary><div class="small-note">${(l.exerciseStats||[]).map(e=>`${escapeHtml(e.name)}: ${e.done||0} sets, ${e.actualReps??e.reps??0} reps`).join('<br>')}<br>${(l.setDetails||[]).length?`Set detail: ${(l.setDetails||[]).map(d=>`${escapeHtml(d.key)} · ${d.actualReps??'target'} reps${d.note?` · ${escapeHtml(d.note)}`:''}`).join(' | ')}`:''}<br>${l.skippedReason?`Skipped note: ${escapeHtml(l.skippedReason)}`:''}</div></details>`).join('')||'<p class="history-empty">No workouts match these filters.</p>';}

  function xEnhanceWorkout(){
    const d=xDaily(),plan=getPlan();
    if(!d.planDay)d.planDay=activeDay();
    // Add actual rep inputs and one note field to each set row.
    $$('#phaseGrid .set-row[data-row]').forEach(row=>{
      const key=row.dataset.row;if(row.nextElementSibling?.classList.contains('set-extra'))return;
      const details=document.createElement('div');details.className='set-extra';
      details.innerHTML=`<label>Actual reps <input class="x-actual-reps" type="number" min="0" max="120" data-key="${key}" aria-label="Actual reps for set" placeholder="—" value="${escapeHtml(d.actualReps[key]??'')}"></label><input class="x-set-note" type="text" maxlength="100" data-key="${key}" aria-label="Note for this set" placeholder="Set note..." value="${escapeHtml(d.setNotes[key]||'')}">`;
      row.after(details);
    });
    // Add active exercise and a compact summary to the top.
    const incomplete=plan.findIndex((ex,i)=>Array.from({length:getEffectiveSets(ex)},(_,s)=>d.done[`${i}-${s}`]).some(v=>!v));
    if(xActiveIndex===null||!plan[xActiveIndex])xActiveIndex=incomplete>=0?incomplete:0;currentExercise=xActiveIndex;
    const current=plan[xActiveIndex],nextIndex=plan.findIndex((ex,i)=>i!==xActiveIndex&&Array.from({length:getEffectiveSets(ex)},(_,s)=>d.done[`${i}-${s}`]).some(v=>!v));
    const activeSet=current?Array.from({length:getEffectiveSets(current)},(_,s)=>s).find(s=>!d.done[`${xActiveIndex}-${s}`]):null;$('#xActiveName').textContent=current?`Current: ${current.name}${activeSet!==undefined?` · Set ${activeSet+1}`:' · Complete'}`:'Session complete';$('#xNextName').textContent=nextIndex>=0?`Next: ${plan[nextIndex].name}`:'All planned sets are checked off.';
    const phases=['Warm-up','Strength','Core','Cool-down'];$('#xPhaseMeters').innerHTML=phases.map(phase=>{const items=plan.map((e,i)=>({e,i})).filter(x=>x.e.phase===phase);if(!items.length)return '';const total=items.reduce((a,x)=>a+getEffectiveSets(x.e),0),done=items.reduce((a,x)=>a+Array.from({length:getEffectiveSets(x.e)},(_,s)=>d.done[`${x.i}-${s}`]).filter(Boolean).length,0),pct=total?Math.round(done/total*100):0;return `<div class="x-phase-meter"><span>${phase}</span><progress max="100" value="${pct}"></progress><span>${pct}%</span></div>`;}).join('');
    const undoButton=$('#xUndoLastSet');if(undoButton)undoButton.disabled=!xUndoStack.length;
    $$('#phaseGrid .exercise-card').forEach(c=>{c.classList.toggle('x-active',Number(c.dataset.card)===xActiveIndex);const idx=Number(c.dataset.card),ex=plan[idx],done=Array.from({length:getEffectiveSets(ex)},(_,s)=>d.done[`${idx}-${s}`]).filter(Boolean).length;const meta=$('.exercise-meta',c);if(meta&&!meta.querySelector('.x-done-count'))meta.insertAdjacentHTML('beforeend',` <span class="x-done-count">· ${done}/${getEffectiveSets(ex)} sets</span>`);});
    const skip=$('#skipReasonSelect');if(skip)skip.value=d.skipReason||'';
    const water=$('#waterButtons');if(water)$$('button',water).forEach((b,i)=>b.classList.toggle('active',i<(d.water||0)));
    const toolPanel=$('.tool-panel');if(toolPanel&&!$('#xWarmupCheckList')){const block=document.createElement('div');block.id='xWarmupCheckList';block.className='checklist-box';toolPanel.appendChild(block);}
    if($('#xWarmupCheckList')){$('#xWarmupCheckList').innerHTML='<b>Warm-up drill checklist</b>'+(state.settings.customWarmup||[]).map((drill,i)=>`<label><input type="checkbox" class="xWarmupCheck" data-index="${i}" ${d.warmupChecks[i]?'checked':''}> ${escapeHtml(drill)}</label>`).join('')+`<small>${d.warmupComplete?'Warm-up timer sequence completed.':`${(d.warmupProgress||[]).length} of ${(state.settings.customWarmup||[]).length} timed drills completed.`}</small>`;}
    if($('#xTimerPreset'))$('#xTimerPreset').innerHTML=(state.settings.timerPresets||[]).map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${p.seconds}s</option>`).join('');
    xRenderPresetList();
  }
  // Wrap the original renderer so the upgrade layer is refreshed after each set action.
  renderWorkout = function(){xOriginalRenderWorkout();xEnhanceWorkout();xUpdateNavProgress();};
  toggleSet = function(key,exerciseIndex,setIndex){
    const d=xDaily();if(!d.startedAt)d.startedAt=Date.now();if(!xSessionStartedAt)xSessionStartedAt=d.startedAt;xUndoStack.push({key,exerciseIndex,setIndex,wasDone:!!d.done[key],stamp:d.timestamps[key]||null});if(xUndoStack.length>30)xUndoStack.shift();xActiveIndex=exerciseIndex;currentExercise=exerciseIndex;applyPhase(getPlan()[exerciseIndex]?.phase||'Strength');
    xOriginalToggleSet(key,exerciseIndex,setIndex);
    if(state.settings.autoScroll){const next=Array.from($('#phaseGrid').querySelectorAll('.set-check')).find(b=>!b.closest('.set-row')?.classList.contains('done'));if(next){const r=next.getBoundingClientRect(),outside=r.top<0||r.bottom>window.innerHeight;if(next.dataset.exercise!==String(exerciseIndex)||outside)next.scrollIntoView({behavior:state.settings.reducedMotion?'auto':'smooth',block:'center'});}}
  };
  saveWorkout = function(){
    xOriginalSaveWorkout();
    const d=xDaily(),log=state.logs.find(l=>l.date===todayKey());if(!log)return;
    const start=d.startedAt||xSessionStartedAt;const seconds=start?Math.max(0,Math.round((Date.now()-start)/1000)):0;
    log.durationSeconds=seconds;log.duration=seconds?`${Math.floor(seconds/60)}m ${String(seconds%60).padStart(2,'0')}s`:'Not timed';
    log.plannedSets=totalSets();log.skippedReason=d.skipReason||'';log.leftRight=xDeep(d.leftRight||{});log.setDetails=Object.entries(d.done||{}).filter(([,v])=>v).map(([key])=>({key,actualReps:d.actualReps[key]??null,note:d.setNotes[key]||'',completedAt:d.timestamps[key]||null}));
    log.exerciseStats=(getPlan()).map((ex,i)=>{const n=getEffectiveSets(ex),keys=Array.from({length:n},(_,s)=>`${i}-${s}`),completed=keys.filter(k=>d.done[k]),done=completed.length,actual=completed.reduce((sum,k)=>sum+(Number(d.actualReps[k])||Number(ex.reps)||0),0);return {id:ex.id,name:ex.name,reps:ex.reps,done,actualReps:actual};});
    log.repsDone=log.exerciseStats.reduce((sum,e)=>sum+e.actualReps,0);
    saveState();renderProgress();xRenderInsights();xUpdateNavProgress();
    $('#xActiveName').textContent='Saved session';$('#xNextName').textContent=`Receipt: ${log.setsDone} sets · ${log.repsDone} reps · ${log.duration}`;
  };

  // Correct the warm-up: completion is stored only after every drill timer finishes.
  startWarmup = function(){
    xWarmupQueue=(state.settings.customWarmup||[]).filter(Boolean);xWarmupStep=0;
    if(!xWarmupQueue.length){toast('Add at least one warm-up drill in Builder.');return;}
    const d=xDaily();d.warmupProgress=[];d.warmupComplete=false;saveState();
    const run=()=>{if(xWarmupStep>=xWarmupQueue.length){d.warmupComplete=true;saveState();toast('Warm-up complete');renderWorkout();return;}
      const drill=xWarmupQueue[xWarmupStep];toast(`Warm-up ${xWarmupStep+1}/${xWarmupQueue.length}: ${drill}`);startTimer(60,drill,'warmup');
      const check=()=>{if(currentTimer.kind==='warmup'&&!currentTimer.running&&currentTimer.remaining===0){d.warmupProgress.push(drill);xWarmupStep++;clearInterval(xWarmupWatcher);xWarmupWatcher=null;run();}};
      clearInterval(xWarmupWatcher);xWarmupWatcher=setInterval(check,250);
    };run();
  };

  function xUndoLastSet(){
    const entry=xUndoStack.pop();if(!entry){toast('There is no recent set action to undo.');return;}
    const d=xDaily();d.done[entry.key]=entry.wasDone;if(entry.stamp)d.timestamps[entry.key]=entry.stamp;else delete d.timestamps[entry.key];d.collapsed[entry.exerciseIndex]=false;saveState();renderWorkout();renderProgress();toast('Last set action undone.');
  }
  // A timestamp-based timer remains accurate when a tab is throttled in the background.
  function xTimerTick(){
    if(!currentTimer.running||!currentTimer.endsAt)return;
    const previous=currentTimer.remaining;currentTimer.remaining=Math.max(0,Math.ceil((currentTimer.endsAt-Date.now())/1000));
    if(currentTimer.kind==='tempo'){
      const down=Number(state.settings.tempoDown)||3,hold=Number(state.settings.tempoHold)||1,up=Number(state.settings.tempoUp)||1,total=down+hold+up;
      const elapsed=Math.max(0,currentTimer.total-currentTimer.remaining),rep=Math.floor(elapsed/total)+1,phase=elapsed%total;
      const label=phase<down?'Lower':phase<down+hold?'Hold':'Lift';
      if(rep!==currentTimer.rep||label!==currentTimer.phaseLabel){currentTimer.rep=rep;currentTimer.phaseLabel=label;$('#timerLabel').textContent=`REP ${Math.min(rep,20)} / 20 · ${label.toUpperCase()}`;if(state.settings.voice&&rep<=20)speak(label);beep(label==='Lower'?580:label==='Hold'?480:680,.045);}
    }
    if(currentTimer.remaining<=3&&currentTimer.remaining>0&&previous!==currentTimer.remaining){beep(880,.08);if(state.settings.voice)speak(String(currentTimer.remaining));}
    if(currentTimer.remaining<=0){
      clearInterval(currentTimer.interval);currentTimer.interval=null;currentTimer.running=false;currentTimer.remaining=0;
      beep(980,.2);if(state.settings.vibrate&&navigator.vibrate)navigator.vibrate([120,60,120]);
      $('#clockRing').classList.add('timer-zero');document.body.classList.add('pulse-mode');setTimeout(()=>{$('#clockRing').classList.remove('timer-zero');document.body.classList.remove('pulse-mode');},1200);
      if(state.settings.notifications&&'Notification'in window&&Notification.permission==='granted'&&document.hidden)new Notification(`${currentTimer.label} complete`,{body:'Your NEXORA timer has finished.'});
      if(currentTimer.kind==='tabata'){
        const d=xDaily();d.intervalStage=(d.intervalStage||0)+1;const maxStages=Math.max(2,(Number(d.intervalRounds)||4)*2);
        if(d.intervalStage<maxStages){startTimer(currentTimer.label==='WORK'?Number($('#xIntervalRest')?.value)||10:Number($('#xIntervalWork')?.value)||20,currentTimer.label==='WORK'?'REST':'WORK','tabata');}
        else{d.intervalStage=0;toast('Intervals complete');}
      } else if(currentTimer.kind==='warmup'){
        // The warm-up sequence watcher advances the next drill.
      } else if(currentTimer.kind==='chain'&&xTimerChain.length){const step=xTimerChain.shift();startTimer(step.seconds,step.name,'chain');xUpdateChain();}
      else{toast(`${currentTimer.label} timer complete`);speak(`${currentTimer.label} complete`);}
    }
    renderTimer();
  }
  startTimer = function(seconds,label='REST',kind=''){
    clearInterval(currentTimer.interval);if(currentTimer.kind==='warmup'&&kind!=='warmup'){clearInterval(xWarmupWatcher);xWarmupWatcher=null;}if(currentTimer.kind==='cooldown'&&kind!=='cooldown'){clearInterval(xCooldownWatcher);xCooldownWatcher=null;}const duration=Math.max(1,Math.min(3600,Number(seconds)||1));
    currentTimer={remaining:duration,total:duration,interval:null,label,kind,running:true,rep:0,phase:0,phaseLabel:'',endsAt:Date.now()+duration*1000};
    currentTimer.interval=setInterval(xTimerTick,200);renderTimer();$('#timerStartBtn').textContent='Pause';
  };
  pauseTimer = function(){if(currentTimer.endsAt)currentTimer.remaining=Math.max(0,Math.ceil((currentTimer.endsAt-Date.now())/1000));currentTimer.running=false;clearInterval(currentTimer.interval);currentTimer.interval=null;currentTimer.endsAt=null;renderTimer();};
  resetTimer = function(){clearInterval(currentTimer.interval);clearInterval(xWarmupWatcher);clearInterval(xCooldownWatcher);xWarmupWatcher=null;xCooldownWatcher=null;currentTimer={remaining:0,total:0,interval:null,label:'READY',kind:'',running:false,rep:0,phase:0};renderTimer();};
  toggleMainTimer = function(){if(currentTimer.running){pauseTimer();return;}if(currentTimer.remaining>0){currentTimer.running=true;currentTimer.endsAt=Date.now()+currentTimer.remaining*1000;currentTimer.interval=setInterval(xTimerTick,200);renderTimer();}else startTimer(60,'REST');};
  startTempo = function(){const total=(Number(state.settings.tempoDown)||3)+(Number(state.settings.tempoHold)||1)+(Number(state.settings.tempoUp)||1);startTimer(total*20,'TEMPO','tempo');toast(`${state.settings.tempoDown||3} lower · ${state.settings.tempoHold||1} hold · ${state.settings.tempoUp||1} lift`);};
  beep = function(freq=660,duration=.12){if(state.muted)return;try{const ctx=new(window.AudioContext||window.webkitAudioContext)(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.linearRampToValueAtTime(Math.max(.001,(Number(state.settings.soundVolume)||35)/100*.08),ctx.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration+.02);osc.onended=()=>ctx.close();}catch(e){console.info('Audio unavailable',e);}};


  function xStartCooldown(){
    const steps=(state.settings.customCooldown||[]).filter(Boolean);if(!steps.length){toast('Add a cool-down activity in Builder first.');return;}let i=0;clearInterval(xCooldownWatcher);
    const run=()=>{if(i>=steps.length){xCooldownWatcher=null;xDaily().cooldownComplete=true;saveState();toast('Cool-down sequence complete.');return;}const name=steps[i++];toast(`Cool-down ${i}/${steps.length}: ${name}`);startTimer(60,name,'cooldown');clearInterval(xCooldownWatcher);xCooldownWatcher=setInterval(()=>{if(currentTimer.kind!=='cooldown'){clearInterval(xCooldownWatcher);xCooldownWatcher=null;return;}if(!currentTimer.running&&currentTimer.remaining===0){clearInterval(xCooldownWatcher);xCooldownWatcher=null;run();}},250);};run();
  }

  function xRenderPresetList(){const list=$('#xPresetList');if(!list)return;list.innerHTML=(state.settings.timerPresets||[]).map(p=>`<span class="preset-chip">${escapeHtml(p.name)} · ${p.seconds}s <button data-x-remove-preset="${p.id}" aria-label="Remove ${escapeHtml(p.name)}">×</button></span>`).join('')||'No saved presets.';}
  function xUpdateChain(){const el=$('#xChainList');if(el)el.textContent=xTimerChain.length?xTimerChain.map((x,i)=>`${i+1}. ${x.name} (${x.seconds}s)`).join(' → '):'No timer steps added.';}
  function xRunChain(){if(!xTimerChain.length){toast('Add a timer step first.');return;}const next=xTimerChain.shift();startTimer(next.seconds,next.name,'chain');xUpdateChain();}
  function xStopwatchRender(){const elapsed=xStopwatch.elapsed+(xStopwatch.running?Date.now()-xStopwatch.startedAt:0);const sec=Math.floor(elapsed/1000);$('#xStopwatchDisplay').textContent=formatTime(sec);$('#xStopwatchToggle').textContent=xStopwatch.running?'Pause':'Start';}
  function xStopwatchToggle(){if(xStopwatch.running){xStopwatch.elapsed+=Date.now()-xStopwatch.startedAt;xStopwatch.running=false;clearInterval(xStopwatch.interval);xStopwatch.interval=null;}else{xStopwatch.startedAt=Date.now();xStopwatch.running=true;xStopwatch.interval=setInterval(xStopwatchRender,250);}xStopwatchRender();}
  function xSavePreset(){const name=$('#xPresetName').value.trim(),seconds=Math.max(1,Math.min(3600,Number($('#xPresetSeconds').value)||60));if(!name){toast('Give the timer preset a name.');return;}state.settings.timerPresets.push({id:xId(),name,seconds});saveState();$('#xPresetName').value='';xRenderPresetList();xEnhanceWorkout();toast('Timer preset saved.');}

  function xSetupBuilderEvents(){
    $('#xBuilderDay').addEventListener('change',e=>{xBuilderDay=e.target.value;xRenderBuilder();});
    $('#xCopyPlanBtn').addEventListener('click',()=>{const from=$('#xCopyDay').value;if(from===xBuilderDay){toast('Choose a different source day.');return;}const old=xDeep(xPlan(xBuilderDay)),copy=xDeep(xPlan(from));copy.forEach(e=>e.id=xId());xReindexDaily(xBuilderDay,old,[]);state.plan[xBuilderDay]=copy;saveState();xRenderBuilder();renderWorkout();toast(`Copied ${from} into ${xBuilderDay}.`);});
    $('#xApplyTemplateBtn').addEventListener('click',xApplyTemplate);$('#xAddExerciseBtn').addEventListener('click',()=>xOpenExercise());$('#xBuilderSearch').addEventListener('input',xRenderBuilder);
    $('#xBuilderList').addEventListener('dragstart',e=>{const item=e.target.closest('[data-drag-index]');if(item)e.dataTransfer.setData('text/plain',item.dataset.dragIndex);});$('#xBuilderList').addEventListener('dragover',e=>{if(e.target.closest('[data-drag-index]'))e.preventDefault();});$('#xBuilderList').addEventListener('drop',e=>{const target=e.target.closest('[data-drag-index]');if(!target)return;e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain')),to=Number(target.dataset.dragIndex),old=xDeep(xPlan(xBuilderDay)),next=xDeep(old);if(from===to||!next[from])return;const [item]=next.splice(from,1);next.splice(to,0,item);xReindexDaily(xBuilderDay,old,next);state.plan[xBuilderDay]=next;saveState();xRenderBuilder();renderWorkout();});$('#xBuilderList').addEventListener('click',e=>{const b=e.target.closest('[data-x-action]');if(!b)return;const i=Number(b.dataset.index),plan=xPlan(xBuilderDay),act=b.dataset.xAction,old=xDeep(plan);
      if(act==='up')xMoveExercise(i,-1);else if(act==='down')xMoveExercise(i,1);else if(act==='edit')xOpenExercise(i);else if(act==='favorite'){plan[i].favorite=!plan[i].favorite;saveState();xRenderBuilder();}else if(act==='duplicate'){const clone=xDeep(plan[i]);clone.id=xId();clone.name+=' (copy)';plan.splice(i+1,0,clone);xReindexDaily(xBuilderDay,old,plan);saveState();xRenderBuilder();renderWorkout();}else if(act==='delete'){if(!confirm(`Remove ${plan[i].name} from ${xBuilderDay}?`))return;const next=plan.filter((_,j)=>j!==i);xReindexDaily(xBuilderDay,old,next);state.plan[xBuilderDay]=next;saveState();xRenderBuilder();renderWorkout();}}
    );
    $('#xExerciseForm').addEventListener('submit',xSubmitExercise);$('#xCloseExercise').addEventListener('click',()=>$('#xExerciseDialog').close());$('#xCancelExercise').addEventListener('click',()=>$('#xExerciseDialog').close());
    $('#xSaveWarmup').addEventListener('click',()=>{state.settings.customWarmup=$('#xWarmupEditor').value.split('\n').map(x=>x.trim()).filter(Boolean);saveState();toast('Warm-up routine saved.');});$('#xSaveCooldown').addEventListener('click',()=>{state.settings.customCooldown=$('#xCooldownEditor').value.split('\n').map(x=>x.trim()).filter(Boolean);saveState();toast('Cool-down routine saved.');});
    $('#xSaveTemplateBtn').addEventListener('click',()=>{const name=$('#xTemplateName').value.trim();if(!name){toast('Enter a template name.');return;}state.customTemplates[name]=xDeep(xPlan(xBuilderDay));saveState();xRenderBuilder();toast('Template saved.');});$('#xLoadTemplateBtn').addEventListener('click',()=>{const name=$('#xSavedTemplateSelect').value;if(!name||!state.customTemplates[name]){toast('Choose a saved template.');return;}const old=xDeep(xPlan(xBuilderDay)),copy=xDeep(state.customTemplates[name]);copy.forEach(e=>e.id=xId());xReindexDaily(xBuilderDay,old,[]);state.plan[xBuilderDay]=copy;saveState();renderWorkout();xRenderBuilder();toast('Template loaded.');});
    $('#xGuideSearch').addEventListener('input',xRenderLibrary);$('#xGuideLibrary').addEventListener('click',e=>{const b=e.target.closest('[data-x-library]');if(b){xBuilderDay=activeDay();xCreateFromLibrary(b.dataset.xLibrary);}});
    $('#xComfortSelect').addEventListener('change',e=>{const v=e.target.value;const text=v==='uncomfortable'?'Skip the uncomfortable movement. Stop if you feel pain, dizziness or unusual discomfort, and talk with a trusted adult or coach.':v==='sore'?'Keep activity gentle or rest. Do not push through soreness.':v==='tired'?'Consider a shorter, easier session or a full rest day.': 'Choose a comfortable pace and take breaks as needed.';$('#xComfortAdvice').textContent=text;});
    $$('.xSetupCheck').forEach((el,i)=>{el.checked=!!xDaily().setupChecks[i];el.addEventListener('change',()=>{xDaily().setupChecks[i]=el.checked;saveState();});});
    $('#xRecoveryReminderBtn').addEventListener('click',()=>{if('Notification'in window&&Notification.permission==='granted')new Notification('Recovery reminder',{body:'Take an easy rest day and choose only comfortable movement.'});else toast('Enable browser notifications in Settings first.');});
  }

  function xSettingsApply(){
    const set=state.settings;document.documentElement.style.setProperty('--x-font-scale',set.fontScale||'1');document.body.classList.toggle('x-reduced-motion',!!set.reducedMotion);document.body.dataset.reducedMotion=set.reducedMotion?'true':'false';document.body.classList.toggle('x-one-hand',!!set.oneHand);if(set.accentColor)document.body.style.setProperty('--accent',set.accentColor);else document.body.style.removeProperty('--accent');
    document.body.style.setProperty('--x-focus-font-scale',set.focusFontScale||'1');
    const values={xFontScale:set.fontScale||'1',xFocusFontScale:set.focusFontScale||'1',xReducedMotion:!!set.reducedMotion,xAutoScroll:set.autoScroll!==false,xOneHand:!!set.oneHand,xAccentColor:set.accentColor||'#34e2a2',xShowQuickTools:set.showQuickTools!==false,xTempoDown:set.tempoDown||3,xTempoHold:set.tempoHold??1,xTempoUp:set.tempoUp||1,xSoundVolume:set.soundVolume??35,xVibrate:!!set.vibrate,xNotifications:!!set.notifications};
    Object.entries(values).forEach(([id,val])=>{const el=$('#'+id);if(el){if(el.type==='checkbox')el.checked=val;else el.value=val;}});
    const extraValues={xColorMode:set.colorMode||'dark',xContrastLevel:set.contrastLevel||(set.highContrast?'high':'standard'),xFontFamily:set.fontFamily||'system',xDensity:set.density||'comfortable',xCorners:set.corners||'rounded',xContentWidth:set.contentWidth||'standard',xButtonLabels:set.buttonLabels!==false,xUnderlineLinks:!!set.underlineLinks,xReduceTransparency:!!set.reduceTransparency,xFlatSurfaces:!!set.flatSurfaces,xThickFocus:!!set.thickFocus,xStickyHeader:set.stickyHeader!==false,xGreeting:set.greeting||'motivational',xShowStats:set.showStats!==false,xShowLaunchpad:set.showLaunchpad!==false,xShowCoach:set.showCoach!==false,xShowRecovery:set.showRecovery!==false,xConfirmFinish:set.confirmFinish!==false,xKeepExpanded:!!set.keepExpanded,xGuideDetail:set.guideDetail||'simple'};
    Object.entries(extraValues).forEach(([id,val])=>{const el=$('#'+id);if(el){if(el.type==='checkbox')el.checked=val;else el.value=val;}});
    const requestedContrast=set.contrastLevel||(set.highContrast?'high':'standard');const activeContrast=['standard','high','maximum'].includes(requestedContrast)?requestedContrast:'standard';set.contrastLevel=activeContrast;set.highContrast=activeContrast!=='standard';document.body.dataset.colorMode=set.colorMode||'dark';document.body.dataset.contrast=activeContrast;document.body.classList.toggle('high-contrast',activeContrast!=='standard');if($('#contrastToggle'))$('#contrastToggle').checked=activeContrast!=='standard';document.body.dataset.density=set.density||'comfortable';document.body.dataset.corners=set.corners||'rounded';document.body.dataset.fontFamily=set.fontFamily||'system';document.body.dataset.underlineLinks=set.underlineLinks?'true':'false';document.body.dataset.buttonLabels=set.buttonLabels===false?'false':'true';document.body.dataset.transparency=set.reduceTransparency?'reduced':'normal';document.body.dataset.flat=set.flatSurfaces?'true':'false';document.body.dataset.thickFocus=set.thickFocus?'true':'false';document.body.dataset.sticky=set.stickyHeader===false?'false':'true';document.body.dataset.contentWidth=set.contentWidth||'standard';
    const mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches;document.body.classList.toggle('x-system-light',(set.colorMode||'dark')==='system'&&mq);
    const visibility={'#workoutView .dashboard-stats':set.showStats!==false,'#workoutView .dashboard-launchpad':set.showLaunchpad!==false,'#workoutView .coach-panel':set.showCoach!==false,'#workoutView .prep-panel':set.showRecovery!==false};Object.entries(visibility).forEach(([sel,show])=>{const el=$(sel);if(el)el.style.display=show?'':'none';});
    const welcome=$('#workoutView .dashboard-welcome h2');if(welcome){const mode=set.greeting||'motivational';welcome.textContent=mode==='minimal'?'Your training dashboard.':mode==='coach'?'Plan well. Move with control.':'Your next good session starts here.';}
    const tool=$('.tool-panel');if(tool)tool.style.display=set.showQuickTools===false?'none':'';
    $('#xAppVersion').textContent=`Version ${document.documentElement.dataset.vtaperVersion||X_VERSION}`;
  }
  function xSettingsEvents(){
    const map={xFontScale:['fontScale','value'],xFocusFontScale:['focusFontScale','value'],xReducedMotion:['reducedMotion','checked'],xAutoScroll:['autoScroll','checked'],xOneHand:['oneHand','checked'],xAccentColor:['accentColor','value'],xShowQuickTools:['showQuickTools','checked'],xTempoDown:['tempoDown','number'],xTempoHold:['tempoHold','number'],xTempoUp:['tempoUp','number'],xSoundVolume:['soundVolume','number'],xVibrate:['vibrate','checked'],xNotifications:['notifications','checked']};
    Object.entries(map).forEach(([id,[key,type]])=>$('#'+id).addEventListener('change',e=>{let val=type==='checked'?e.target.checked:type==='number'?Number(e.target.value):e.target.value;if(type==='number')val=Math.max(key==='tempoHold'?0:1,Math.min(key==='soundVolume'?100:key==='tempoDown'||key==='tempoUp'?10:5,val));state.settings[key]=val;saveState();xSettingsApply();}));
    const extra={xColorMode:['colorMode','value'],xContrastLevel:['contrastLevel','value'],xFontFamily:['fontFamily','value'],xDensity:['density','value'],xCorners:['corners','value'],xContentWidth:['contentWidth','value'],xButtonLabels:['buttonLabels','checked'],xUnderlineLinks:['underlineLinks','checked'],xReduceTransparency:['reduceTransparency','checked'],xFlatSurfaces:['flatSurfaces','checked'],xThickFocus:['thickFocus','checked'],xStickyHeader:['stickyHeader','checked'],xGreeting:['greeting','value'],xShowStats:['showStats','checked'],xShowLaunchpad:['showLaunchpad','checked'],xShowCoach:['showCoach','checked'],xShowRecovery:['showRecovery','checked'],xConfirmFinish:['confirmFinish','checked'],xKeepExpanded:['keepExpanded','checked'],xGuideDetail:['guideDetail','value']};
    Object.entries(extra).forEach(([id,[key,type]])=>$('#'+id).addEventListener('change',e=>{state.settings[key]=type==='checked'?e.target.checked:e.target.value;if(key==='contrastLevel')state.settings.highContrast=state.settings[key]!=='standard';saveState();xSettingsApply();}));
    $('#xSettingsSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();$$('#settingsView .settings-grid>.panel').forEach(card=>{card.style.display=!q||card.textContent.toLowerCase().includes(q)?'':'none';});});
    $('#xResetAppearance').addEventListener('click',()=>{Object.assign(state.settings,{theme:'emerald',glow:65,highContrast:false,fontScale:'1',focusFontScale:'1',reducedMotion:false,oneHand:false,accentColor:'',showQuickTools:true,colorMode:'dark',contrastLevel:'standard',fontFamily:'system',density:'comfortable',corners:'rounded',contentWidth:'standard',underlineLinks:false,reduceTransparency:false,flatSurfaces:false,thickFocus:false,stickyHeader:true,greeting:'motivational',showStats:true,showLaunchpad:false,showCoach:true,showRecovery:true,confirmFinish:true,keepExpanded:false,guideDetail:'simple'});applySettings();xSettingsApply();saveState();toast('Appearance restored.');});
    $('#xRestoreSettings').addEventListener('click',()=>{if(!confirm('Restore workout and display preferences? Your workout history and plans will stay.'))return;const base=freshState().settings;state.settings={...base,...{timerPresets:state.settings.timerPresets,customWarmup:state.settings.customWarmup,customCooldown:state.settings.customCooldown}};Object.assign(state.settings,{theme:'emerald',highContrast:false,contrastLevel:'standard',showLaunchpad:false,nexora97Migration:true});saveState();applySettings();xSettingsApply();xRenderBuilder();toast('Default settings restored.');});
    $('#xPreviewSound').addEventListener('click',()=>{const old=state.muted;state.muted=false;beep(600,.12);setTimeout(()=>beep(820,.16),180);state.muted=old;});
    $('#xNotificationPermission').addEventListener('click',async()=>{if(!('Notification'in window)){toast('This browser does not support notifications.');return;}const permission=await Notification.requestPermission();if(permission==='granted'){state.settings.notifications=true;saveState();xSettingsApply();toast('Notifications enabled.');}else toast('Notification permission was not granted.');});
    $('#xConfirmBackupImport').addEventListener('click',()=>{if(!xPendingImport)return;state={...freshState(),...xDeep(xPendingImport)};xPendingImport=null;xEnsureState();saveState();applySettings();renderWorkout();renderProgress();xRenderAll();$('#xBackupDialog').close();toast('Backup imported.');});$('#xRunDiagnostics').addEventListener('click',xDiagnostics);$('#xBackupPreviewBtn').addEventListener('click',()=>{xPendingImport=null;$('#xConfirmBackupImport').hidden=true;const preview={version:X_VERSION,workoutDays:Object.keys(state.plan),savedSessions:state.logs.length,checkIns:state.checkins.length,settings:state.settings,mostRecentSession:state.logs.at(-1)||null};$('#xBackupPreview').textContent=JSON.stringify(preview,null,2);$('#xBackupDialog').showModal();});
    $('#xPwaHelpBtn').addEventListener('click',async()=>{
      if(xInstallPrompt){const prompt=xInstallPrompt;xInstallPrompt=null;await prompt.prompt();return;}
      const isInstalled=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone;
      if(isInstalled){alert('NEXORA FITNESS is already installed as an app on this device.');return;}
      alert('On Chromebook: open NEXORA FITNESS from its HTTPS website in Chrome, select the three-dot menu, then choose Cast, save, and share → Install page as app (or use the Install icon in the address bar). If Install is not offered, the current address may not support PWA installation. Open the app once while online so its offline files can be cached.');
    });
    $('#xSavePreset').addEventListener('click',xSavePreset);$('#xPresetList').addEventListener('click',e=>{const b=e.target.closest('[data-x-remove-preset]');if(!b)return;state.settings.timerPresets=state.settings.timerPresets.filter(p=>p.id!==b.dataset.xRemovePreset);saveState();xRenderPresetList();xEnhanceWorkout();});
    $('#xStartIntervals').addEventListener('click',()=>{const rounds=Math.max(1,Math.min(20,Number($('#xIntervalRounds').value)||4));state.daily[todayKey()].intervalRounds=rounds;state.daily[todayKey()].intervalStage=0;startTimer(Number($('#xIntervalWork').value)||20,'WORK','tabata');});
    $('#xAddChainStep').addEventListener('click',()=>{const seconds=Math.max(1,Math.min(3600,Number($('#xChainSeconds').value)||60));xTimerChain.push({seconds,name:`Step ${xTimerChain.length+1}`});xUpdateChain();});$('#xRunChain').addEventListener('click',xRunChain);
    $('#xStopwatchToggle').addEventListener('click',xStopwatchToggle);$('#xStopwatchReset').addEventListener('click',()=>{xStopwatch={running:false,startedAt:0,elapsed:0,interval:null};xStopwatchRender();});
    $('#xRunPreset').addEventListener('click',()=>{const id=$('#xTimerPreset').value,p=state.settings.timerPresets.find(p=>p.id===id);if(p)startTimer(p.seconds,p.name,'preset');});
    $('#xTutorialBtn').addEventListener('click',()=>xOpenTutorial(0));$('#xStartTutorialBtn').addEventListener('click',()=>xOpenTutorial(0));$('#xTutorialBack').addEventListener('click',()=>xOpenTutorial(Math.max(0,xTutorialIndex-1)));$('#xTutorialNext').addEventListener('click',()=>{if(xTutorialIndex>=X_TUTORIAL.length-1){$('#xTutorialDialog').close();state.setupCompleted=true;saveState();}else xOpenTutorial(xTutorialIndex+1);});
  }

  function xOpenSetupWizard(){
    $('#xSetupStart').value=state.settings.start||'17:00';$('#xSetupEnd').value=state.settings.end||'17:45';$('#xSetupRest').value=state.settings.rest||60;$('#xSetupDialog').showModal();
  }
  function xBindSetupWizard(){
    $('#xSetupForm').addEventListener('submit',e=>{e.preventDefault();const start=$('#xSetupStart').value,end=$('#xSetupEnd').value;if(!start||!end||start===end){toast('Choose a valid start and end time.');return;}state.settings.start=start;state.settings.end=end;state.settings.rest=Math.max(15,Math.min(300,Number($('#xSetupRest').value)||60));state.setupCompleted=true;saveState();applySettings();$('#xSetupDialog').close();renderClock();toast('Setup saved.');});
    $('#xSetupSkip').addEventListener('click',()=>{state.setupCompleted=true;saveState();$('#xSetupDialog').close();});$('#xSetupClose').addEventListener('click',()=>{$('#xSetupDialog').close();state.setupCompleted=true;saveState();});
  }
  function xRenderMonthHeatmap(){
    const base=new Date();base.setDate(1);base.setMonth(base.getMonth()+xMonthOffset);const year=base.getFullYear(),month=base.getMonth(),days=new Date(year,month+1,0).getDate(),first=new Date(year,month,1),offset=(first.getDay()+6)%7,logged=new Set(state.logs.map(l=>l.date));
    $('#monthName').textContent=first.toLocaleDateString([],{month:'long',year:'numeric'});$('#xMonthNext').disabled=xMonthOffset>=0;
    let html='';for(let i=0;i<offset;i++)html+='<div class="heat-cell" aria-hidden="true"></div>';
    for(let d=1;d<=days;d++){const date=todayKey(new Date(year,month,d)),done=logged.has(date);html+=`<div class="heat-cell ${done?'done':''}" title="${date}${done?' · session saved':''}">${d}</div>`;}
    $('#heatmap').innerHTML=html;
  }

  function xOpenTutorial(i){xTutorialIndex=i;const item=X_TUTORIAL[i];$('#xTutorialTitle').textContent=item[0];$('#xTutorialText').textContent=item[1];$('#xTutorialProgress').style.setProperty('--tutorial-progress',`${(i+1)/X_TUTORIAL.length*100}%`);$('#xTutorialBack').disabled=i===0;$('#xTutorialNext').textContent=i===X_TUTORIAL.length-1?'Finish':'Next';$('#xTutorialDialog').showModal();}
  function xDiagnostics(){
    const tests=[
      ['Local storage',(()=>{try{localStorage.setItem('__vt_test','1');localStorage.removeItem('__vt_test');return true;}catch{return false;}})()],
      ['Workout plan',Object.keys(state.plan).length>=5],
      ['Timer support',typeof setInterval==='function'],
      ['Audio support',!!(window.AudioContext||window.webkitAudioContext)],
      ['Offline worker','serviceWorker'in navigator],
      ['Storage estimate',!!navigator.storage?.estimate],
      ['Install context',location.protocol==='https:'||location.hostname==='localhost']
    ];
    const pass=tests.filter(x=>x[1]).length;
    const platform=navigator.userAgentData?.platform||navigator.platform||'Browser';
    $('#xDiagnostics').textContent=`${pass}/${tests.length} checks passed · ${platform} · ${tests.map(x=>`${x[0]}: ${x[1]?'OK':'Unavailable here'}`).join(' · ')}`;
    toast(`Diagnostics finished: ${pass}/${tests.length} checks available.`);
  }
  let xLastStorageEstimate=0;
  let xStorageQuotaText='Browser quota varies by device.';
  async function xUpdateStorage(){
    const size=new Blob([JSON.stringify(state)]).size;
    if(Date.now()-xLastStorageEstimate>60000){
      xLastStorageEstimate=Date.now();
      try{if(navigator.storage?.estimate){const estimate=await navigator.storage.estimate();if(Number.isFinite(estimate.quota)){const used=Number.isFinite(estimate.usage)?(estimate.usage/1024/1024).toFixed(1):'—';const quota=(estimate.quota/1024/1024).toFixed(0);xStorageQuotaText=`Browser storage: ${used} MB used of about ${quota} MB available.`;}}}catch{}
    }
    const el=$('#xStorageUsage');if(el)el.textContent=`NEXORA data: ${(size/1024).toFixed(1)} KB · ${xStorageQuotaText} · Persistence: ${xStoragePersistence}.`;
  }
  function xOffline(){const offline=!navigator.onLine;$('#xOfflineStatus').textContent=`Connection status: ${offline?'Offline — cached app features remain available':'Online'}`;$('#xOfflinePill').textContent=offline?'Offline':'Online';}
  function xRegisterPwa(){
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();xInstallPrompt=e;const b=$('#xPwaHelpBtn');if(b)b.textContent='Install NEXORA FITNESS';});
    window.addEventListener('online',xOffline);window.addEventListener('offline',xOffline);xOffline();
    if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.getRegistration().then(reg=>{if(reg){reg.update().catch(()=>{});reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('A NEXORA update is ready. Refresh to use it.');});});}});
  }
  function xSessionOverview(){const plan=getPlan(),d=xDaily();const rows=plan.map((ex,i)=>{const total=getEffectiveSets(ex),done=Array.from({length:total},(_,s)=>d.done[`${i}-${s}`]).filter(Boolean).length;return `${ex.name}: ${done}/${total} sets`;});const html=rows.map(r=>`<div class="timeline-item">${escapeHtml(r)}</div>`).join('');let dlg=$('#xOverviewDialog');if(!dlg){document.body.insertAdjacentHTML('beforeend','<dialog id="xOverviewDialog" class="modal"><form method="dialog"><div class="modal-head"><h2>Session overview</h2><button class="icon-btn" value="cancel">✕</button></div><div id="xOverviewContent"></div><button class="btn btn-primary" value="cancel">Close</button></form></dialog>');dlg=$('#xOverviewDialog');}$('#xOverviewContent').innerHTML=html+`<p class="small-note">Overall: ${progress()}% complete · ${doneSets()} of ${totalSets()} sets.</p>`;dlg.showModal();}
  function xBindWorkoutTools(){
    $('#xUndoLastSet').addEventListener('click',xUndoLastSet);$('#xCooldownBtn').addEventListener('click',xStartCooldown);$('#xExpandAll').addEventListener('click',()=>{$$('#phaseGrid .exercise-card').forEach(c=>{c.classList.remove('collapsed');const idx=Number(c.dataset.card);xDaily().collapsed[idx]=false;});saveState();});
    $('#xCollapseAll').addEventListener('click',()=>{$$('#phaseGrid .exercise-card').forEach(c=>{c.classList.add('collapsed');const idx=Number(c.dataset.card);xDaily().collapsed[idx]=true;});saveState();});$('#xOverviewBtn').addEventListener('click',xSessionOverview);
    $('#phaseGrid').addEventListener('input',e=>{const d=xDaily(),key=e.target.dataset.key;if(!key)return;if(e.target.classList.contains('x-actual-reps'))d.actualReps[key]=e.target.value===''?'':Math.max(0,Math.min(120,Number(e.target.value)));if(e.target.classList.contains('x-set-note'))d.setNotes[key]=e.target.value;saveState();});
    $('#skipReasonSelect').addEventListener('change',e=>{xDaily().skipReason=e.target.value;saveState();});$('.tool-panel').addEventListener('change',e=>{if(e.target.classList.contains('xWarmupCheck')){const d=xDaily();d.warmupChecks[e.target.dataset.index]=e.target.checked;saveState();}});
    $('#xHistorySearch')?.addEventListener('input',xHistoryFilter);$('#xHistoryRange')?.addEventListener('change',xHistoryFilter);
    $('#xTrendExercise').addEventListener('change',xRenderRepTrend);$('#xMonthPrev').addEventListener('click',()=>{xMonthOffset--;xRenderMonthHeatmap();});$('#xMonthNext').addEventListener('click',()=>{if(xMonthOffset<0){xMonthOffset++;xRenderMonthHeatmap();}});
  }

  function xBindGlobalEvents(){
    document.addEventListener('visibilitychange',()=>{if(document.hidden)return;const d=xDaily();if(currentTimer.running&&currentTimer.endsAt){currentTimer.remaining=Math.max(0,Math.ceil((currentTimer.endsAt-Date.now())/1000));if(currentTimer.remaining===0)xTimerTick();else renderTimer();}const key=todayKey();if(key!==xLastDayKey){xLastDayKey=key;workoutDay=getDayName();xActiveIndex=null;renderClock();renderWorkout();xRenderBuilder();toast('Workout day updated for the new date.');}});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();xUndoLastSet();return;}if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key.toLowerCase()==='f'){$('#focusOverlay').hidden=false;updateFocusLabels();}else if(e.key.toLowerCase()==='o')xSessionOverview();});
    // Capture actual rep inputs in a stable local record before saving a workout.
    $('#xSetupWizardBtn').addEventListener('click',xOpenSetupWizard);$('#xSetupWizardOpenBtn').addEventListener('click',xOpenSetupWizard);
  }

  function xUpdateNavProgress(){
    const values={workout:`${progress()}%`,planner:'7 days',history:String(state.logs.length),progress:`Lv ${Math.min(50,1+Math.floor((state.xp||0)/500))}`,builder:String(getPlan().length),insights:String(state.logs.length),guide:String(X_LIBRARY.length)};
    Object.entries(values).forEach(([name,value])=>{const tab=$(`.tab[data-tab=\"${name}\"]`);if(!tab)return;let badge=tab.querySelector('.x-tab-count');if(!badge){badge=document.createElement('span');badge.className='x-tab-count';tab.appendChild(badge);}badge.textContent=value;tab.setAttribute('aria-label',`${name[0].toUpperCase()+name.slice(1)} · ${value}`);});
  }
  function xRenderAll(){xRenderBuilder();xRenderLibrary();xRenderInsights();xRenderPlanner();xRenderDashboard();xSettingsApply();xUpdateStorage();xEnhanceWorkout();xHistoryFilter();xOffline();xUpdateNavProgress();}

  importBackup = function(file){
    const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);if(!incoming||typeof incoming!=='object'||!incoming.settings||!incoming.plan||!Array.isArray(incoming.logs||[])||!Array.isArray(incoming.checkins||[]))throw new Error('Invalid structure');
      const validDays=Object.entries(incoming.plan).every(([day,list])=>X_DAYS.includes(day)&&Array.isArray(list)&&list.every(ex=>ex&&typeof ex.name==='string'&&Number(ex.sets)>=1&&Number(ex.reps)>=1));if(!validDays)throw new Error('Invalid workout plan');
      xPendingImport=incoming;const summary={savedSessions:incoming.logs?.length||0,checkIns:incoming.checkins?.length||0,workoutDays:Object.keys(incoming.plan),estimatedSizeKB:Math.round(reader.result.length/1024)};$('#xBackupPreview').textContent=JSON.stringify(summary,null,2);$('#xConfirmBackupImport').hidden=false;$('#xBackupDialog').showModal();
    }catch(err){toast('That backup is not valid or could not be read.');}};reader.readAsText(file);
  };

  function xInitialize(){
    xMountViews();xEnsureState();xSetupBuilderEvents();xSettingsEvents();xBindWorkoutTools();xBindGlobalEvents();xBindSetupWizard();xBindPlanner();
    $('#resetBtn').addEventListener('click',()=>{const d=state.daily[todayKey()];if(d){d.actualReps={};d.setNotes={};d.warmupChecks={};d.setupChecks={};d.startedAt=null;d.skipReason='';}saveState();renderWorkout();});
    $('#clearDataBtn').addEventListener('click',()=>{setTimeout(()=>{xEnsureState();applySettings();xSettingsApply();renderWorkout();xRenderAll();},0);});
    const baseSetTab=xOriginalSetTab;setTab=function(name){baseSetTab(name);if(name==='builder')xRenderBuilder();if(name==='insights')xRenderInsights();if(name==='guide')xRenderLibrary();if(name==='planner')xRenderPlanner();if(name==='progress')xRenderPRs();if(name==='settings'){xUpdateStorage();xSettingsApply();}};
    const xBaseProgress=renderProgress;renderProgress=function(){xBaseProgress();xHistoryFilter();xRenderPRs();};
    const xBaseSaveWorkout=saveWorkout;saveWorkout=function(){xBaseSaveWorkout();xRenderDashboard();xRenderPRs();};
    const xBaseApply=applySettings;applySettings=function(){xBaseApply();xSettingsApply();};
    renderHeatmap=xRenderMonthHeatmap;
    const xBaseRenderTimer=renderTimer;renderTimer=function(){xBaseRenderTimer();const sticky=$('#xStickyTimer');if(sticky)sticky.textContent=currentTimer.running||currentTimer.remaining?`${formatTime(currentTimer.remaining)} ${currentTimer.label}`:'Timer ready';};
    xRenderAll();renderHeatmap();xRegisterPwa();xRequestStoragePersistence();if(!state.setupCompleted)setTimeout(xOpenSetupWizard,350);
    $('#xTutorialDialog')?.addEventListener('close',()=>{if(xTutorialIndex===X_TUTORIAL.length-1){state.setupCompleted=true;saveState();}});
    // Migrate older history with unknown or incorrectly fixed duration to an explicit un-timed label.
    state.logs.forEach(l=>{if(l.duration==='45 min window'){l.duration='Not timed';}});saveState();
    setInterval(()=>{xStopwatchRender();xUpdateStorage();const key=todayKey();if(key!==xLastDayKey&&!document.hidden){xLastDayKey=key;workoutDay=getDayName();xActiveIndex=null;renderClock();renderWorkout();xRenderBuilder();}},1000);
    // Keep exercise ids stable across later edits and plan copies.
    Object.values(state.plan).forEach(list=>list.forEach(ex=>{ex.id||=xId();}));saveState();
  }
  xInitialize();
})();
