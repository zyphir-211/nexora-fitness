/* MORPHSET 8.1 — reliability, data accuracy, custom routines and dashboard refinement.
   Dependency-free. Keeps the existing vtaper-pro-v2 localStorage key. */
(()=>{
  window.__vtaperVersion81Loaded=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>todayKey();
  const baseGetPlan=window.getPlan;
  const baseDailyData=window.dailyData;
  const baseRenderWorkout=window.renderWorkout;
  const baseSaveState=window.saveState;
  const XP_PER_ACTIVE_DAY=100;
  const titleTiers=[
    {level:1,name:'Getting Started'}, {level:6,name:'Routine Builder'},
    {level:11,name:'Consistency Seeker'}, {level:16,name:'Steady Performer'},
    {level:21,name:'Training Explorer'}, {level:26,name:'Progress Tracker'},
    {level:31,name:'Habit Keeper'}, {level:36,name:'Focused Mover'},
    {level:41,name:'Experienced Planner'}, {level:46,name:'Training Strategist'}
  ];
  let draft=[],editingId=null,menuReturnFocus=null;

  function blankSession(){return {done:{},notes:{},effort:{},rir:{},leftRight:{},timestamps:{},collapsed:{},actualReps:{},setNotes:{},setLoad:{},skipReasons:{},skipReason:'',snack:false,meal:false,water:0,warmupChecks:{},setupChecks:{},startedAt:Date.now()};}
  function ensureState(){
    state.customWorkouts=Array.isArray(state.customWorkouts)?state.customWorkouts:[];
    state.customSchedule=Array.isArray(state.customSchedule)?state.customSchedule:[];
    state.daily=state.daily||{};state.logs=Array.isArray(state.logs)?state.logs:[];
    state.dashboardPrefs=state.dashboardPrefs||{hidden:[]};
    state.levelHistory=Array.isArray(state.levelHistory)?state.levelHistory:[];
    state.unlockedTitles=Array.isArray(state.unlockedTitles)?state.unlockedTitles:[];
    state.activeCustomRun=state.activeCustomRun||null;
    // Normalize older custom routines without deleting their stored exercises.
    state.customWorkouts=state.customWorkouts.filter(Boolean).map((w,i)=>({
      ...w,id:String(w.id||`cw-migrated-${i}`),name:String(w.name||'Custom workout').slice(0,48),
      exercises:Array.isArray(w.exercises)?w.exercises.map((e,j)=>({...e,id:String(e.id||`ce-${i}-${j}`),sets:clamp(e.sets,1,8,2),reps:clamp(e.reps,1,120,8),unit:['reps','sec','min'].includes(e.unit)?e.unit:'reps',restSeconds:clamp(e.restSeconds,0,300,60),phase:['Warm-up','Strength','Core','Cool-down'].includes(e.phase)?e.phase:'Strength'})):[]
    }));
    // Upgrade active custom sessions saved by 8.0 into resumable run IDs.
    const run=state.activeCustomRun;
    if(run&&(!state.customWorkouts.some(w=>w.id===run.workoutId)||run.date!==today()))state.activeCustomRun=null;
    saveState();
  }
  function clamp(v,min,max,fallback){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
  function currentRun(){const r=state.activeCustomRun;if(!r||r.date!==today())return null;return state.customWorkouts.find(w=>w.id===r.workoutId)?r:null;}
  function activeRoutine(){const r=currentRun();return r?state.customWorkouts.find(w=>w.id===r.workoutId):null;}
  function activeData(){
    const r=currentRun();
    if(!r)return baseDailyData();
    state.daily=state.daily||{};const day=state.daily[today()]=state.daily[today()]||{};day.customSessions=day.customSessions||{};
    day.customSessions[r.runId]=day.customSessions[r.runId]||blankSession();
    return day.customSessions[r.runId];
  }
  // The active custom routine and its progress survive refreshes and tab switches.
  window.getPlan=function(){const w=activeRoutine();return w?w.exercises:baseGetPlan();};
  window.dailyData=function(){return activeData();};
  window.renderWorkout=function(){baseRenderWorkout();const w=activeRoutine();if(w){const h=$('#workoutHeading'),pill=$('#workoutTypePill'),title=$('#pageTitle');if(h)h.textContent=w.name;if(pill)pill.textContent='CUSTOM';if(title)title.innerHTML='Your custom session.<br><span>Built by you.</span>';}addLoadInputs();};

  function addLoadInputs(){
    const d=dailyData();d.setLoad=d.setLoad||{};
    $$('#phaseGrid .set-row[data-row]').forEach(row=>{
      const key=row.dataset.row;
      let extra=row.nextElementSibling?.classList.contains('set-extra')?row.nextElementSibling:null;
      if(!extra){extra=document.createElement('div');extra.className='set-extra';row.after(extra);}
      if(extra.querySelector('.v81-load'))return;
      const label=document.createElement('label');label.className='v81-load-wrap';
      label.innerHTML=`Optional load <span><input class="v81-load" type="number" min="0" max="500" step="0.5" inputmode="decimal" data-key="${esc(key)}" aria-label="Optional load used for set" placeholder="—" value="${esc(d.setLoad[key]??'')}"> <small>kg</small></span>`;
      extra.append(label);
    });
  }

  function sessionSnapshot(){
    const plan=getPlan(),d=dailyData(),date=today(),run=currentRun(),routine=activeRoutine();
    const stats=plan.map((ex,i)=>{
      const keys=Array.from({length:getEffectiveSets(ex)},(_,s)=>`${i}-${s}`),doneKeys=keys.filter(k=>!!d.done[k]);
      const vals=doneKeys.map(k=>Number(d.actualReps[k])>0?Number(d.actualReps[k]):Number(ex.reps)||0);
      const actual=vals.reduce((a,b)=>a+b,0),loads=doneKeys.filter(k=>String(d.setLoad?.[k]??'').trim()!=='').map(k=>Number(d.setLoad[k])).filter(Number.isFinite);
      return {id:ex.id||`ex-${i}`,name:ex.name,reps:Number(ex.reps)||0,unit:ex.unit||'reps',done:doneKeys.length,actualReps:actual,bestSetReps:vals.length?Math.max(...vals):0,bestLoad:loads.length?Math.max(...loads):null,category:ex.category||'',setsPlanned:keys.length};
    });
    const doneKeys=Object.entries(d.done||{}).filter(([,v])=>!!v).map(([key])=>key);
    const detail=doneKeys.map(key=>{const [exerciseIndex]=key.split('-').map(Number),ex=plan[exerciseIndex]||{};return {key,exercise:ex.name||`Exercise ${exerciseIndex+1}`,unit:ex.unit||'reps',actualReps:d.actualReps?.[key]??null,load:String(d.setLoad?.[key]??'').trim()===''?null:Number(d.setLoad[key]),note:d.setNotes?.[key]||'',completedAt:d.timestamps?.[key]||null};});
    const start=Number(d.startedAt)||Date.now(),durationSeconds=Math.max(0,Math.round((Date.now()-start)/1000));
    const xp=state.logs.some(l=>l.date===date)?0:XP_PER_ACTIVE_DAY;
    return {
      id:`session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,date,day:getDayName(),
      workoutName:routine?.name||`${activeDay()} session`,customWorkoutId:routine?.id||null,customRunId:run?.runId||null,
      setsDone:doneKeys.length,plannedSets:totalSets(),repsDone:stats.reduce((a,e)=>a+e.actualReps,0),
      durationSeconds,duration:durationSeconds?`${Math.floor(durationSeconds/60)}m ${String(durationSeconds%60).padStart(2,'0')}s`:'Not timed',
      exerciseStats:stats,notesCount:Object.values(d.notes||{}).filter(Boolean).length,
      setDetails:detail,skippedReason:d.skipReason||'',leftRight:d.leftRight||{},warmup:!!d.warmupComplete,xp
    };
  }
  function saveSession(){
    if(doneSets()===0){toast('Complete at least one set before saving.');return;}
    const run=currentRun(),entry=sessionSnapshot();
    state.logs.push(entry);state.xp=(Number(state.xp)||0)+entry.xp;
    if(run){const slot=state.customSchedule.find(s=>s.id===run.scheduleId);if(slot)slot.completedAt=new Date().toISOString();state.activeCustomRun=null;}
    else{const day=state.daily?.[today()];if(day){for(const field of ['done','timestamps','actualReps','setNotes','setLoad','notes','effort','rir','leftRight','collapsed'])day[field]={};day.startedAt=null;day.skipReason='';}}
    saveState();
    const summary=`${entry.workoutName} · ${entry.date}\n${entry.setsDone} sets completed\n${entry.repsDone} logged target units\nXP earned: ${entry.xp}`;
    try{window.lastSavedSummary=summary;}catch{}
    renderProgress();renderWorkout();renderAccurateDashboard();renderHistory();renderLevelPanel();renderSchedule();renderPRs();
    toast(entry.xp?`Session saved. +${entry.xp} XP for today's activity.`:"Session saved. Today's activity XP was already earned.");
  }
  window.saveWorkout=saveSession;

  function levelState(){
    const xp=Math.max(0,Number(state.xp)||0),level=Math.min(50,1+Math.floor(xp/500));
    const capped=level>=50,within=capped?500:xp%500,next=capped?0:500-within;
    const tier=[...titleTiers].reverse().find(t=>level>=t.level)||titleTiers[0];
    return {xp,level,within,next,capped,tier,progress:capped?100:within/5};
  }
  function updateTitles(){
    state.levelHistory=Array.isArray(state.levelHistory)?state.levelHistory:[];state.unlockedTitles=Array.isArray(state.unlockedTitles)?state.unlockedTitles:[];
    const l=levelState();state.unlockedTitles=titleTiers.filter(t=>l.level>=t.level).map(t=>t.name);
    const latest=state.levelHistory.at(-1);if(!latest||latest.level!==l.level){state.levelHistory.push({level:l.level,title:l.tier.name,date:today()});state.levelHistory=state.levelHistory.slice(-30);}
  }
  function renderLevelPanel(){
    updateTitles();const l=levelState();
    if($('#levelName'))$('#levelName').textContent=`Level ${l.level} · ${l.tier.name}`;
    if($('#levelNumber'))$('#levelNumber').textContent=String(l.level).padStart(2,'0');
    if($('#levelXpLabel'))$('#levelXpLabel').textContent=l.capped?'MAX LEVEL · 24,500 XP+':`${l.within} / 500 XP`;
    if($('#levelNextLabel'))$('#levelNextLabel').textContent=l.capped?'Maximum level reached':`${l.next} XP to next level`;
    if($('#levelFill'))$('#levelFill').style.width=`${l.progress}%`;
    if($('#levelDescription'))$('#levelDescription').textContent=`Current title: ${l.tier.name} · ${state.unlockedTitles.length} of ${titleTiers.length} titles unlocked.`;
    if($('#levelReward'))$('#levelReward').textContent=l.capped?'You reached the current level cap. Keep using the tracker without chasing extra sessions.':`Next title: ${titleTiers.find(t=>t.level>l.level)?.name||'Maximum level'} · XP is awarded once per calendar day.`;
    let panel=$('#v81LevelHistory');if(!panel){panel=document.createElement('div');panel.id='v81LevelHistory';panel.className='v81-inline-history';$('#levelPanel')?.append(panel);}
    if(panel)panel.innerHTML=`<div class="v81-subheading">UNLOCKED TITLES</div><div class="v81-title-chips">${state.unlockedTitles.map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="v81-subheading">RECENT XP HISTORY</div><div class="v81-xp-history">${state.logs.slice(-5).reverse().map(x=>`<div><span>${esc(x.workoutName||x.day)} · ${esc(x.date)}</span><b>+${Number(x.xp)||0} XP</b></div>`).join('')||'<small>No XP history yet.</small>'}</div>`;
    saveState();
  }

  function categoryName(ex){
    if(ex.category)return ex.category;
    const n=String(ex.name||'').toLowerCase();
    if(/row|pull|lat|back/.test(n))return 'Pull';
    if(/push|press|chest|tricep/.test(n))return 'Push';
    if(/squat|lunge|leg|calf|hinge/.test(n))return 'Legs';
    if(/plank|dead bug|crunch|core/.test(n))return 'Core';
    if(/walk|mobility|stretch|recovery/.test(n))return 'Recovery';
    if(/raise|shoulder/.test(n))return 'Shoulders';
    return 'General';
  }
  function renderSmartInsights(){
    const logs=state.logs.slice().filter(l=>l.date<=today()).sort((a,b)=>a.date.localeCompare(b.date));
    const start=new Date();start.setDate(start.getDate()-6);start.setHours(0,0,0,0);
    const recent=logs.filter(l=>new Date(`${l.date}T12:00:00`)>=start);
    const sessions=recent.length,sets=recent.reduce((n,l)=>n+(Number(l.setsDone)||0),0);
    const muscles={};recent.forEach(l=>(l.exerciseStats||[]).forEach(e=>{const c=categoryName(e);muscles[c]=(muscles[c]||0)+1;}));
    const most=Object.entries(muscles).sort((a,b)=>b[1]-a[1])[0];
    const dates=[...new Set(recent.map(l=>l.date))],last=logs.at(-1);let next='Save a session to begin building a useful activity picture.';let reason='This suggestion updates from your saved sessions.';
    if(sessions>=3){next='Keep recovery days in your weekly plan.';reason=`You logged ${sessions} sessions in the last seven days. More sessions are not automatically better.`;}
    else if(last){const gap=Math.floor((Date.now()-new Date(`${last.date}T12:00:00`).getTime())/86400000);if(gap>=3){next='Review your plan and choose a comfortable next step.';reason=`Your latest saved session was ${gap} days ago. Restart at an easy pace if it suits you.`;}else{next='Use your planner to keep the week balanced.';reason='Your latest session is recent; the planner can help leave space for recovery.';}}
    const cards=[
      ['LAST 7 DAYS',`${sessions} session${sessions===1?'':'s'}`,`${dates.length} active day${dates.length===1?'':'s'} · ${sets} total sets saved.`],
      ['MOST PRACTICED',most?most[0]:'Not enough data',most?`${most[1]} exercise entries in the last seven days.`:'Save a few sessions to identify exercise patterns.'],
      ['SMART NEXT STEP',next,reason],
      ['RECENT RECORD',last?esc(last.workoutName||last.day):'No saved session',last?`Latest entry: ${esc(last.date)} · ${last.setsDone||0} sets.`:'Your recent activity will appear here.' ]
    ];
    const host=$('#smartInsights');if(host)host.innerHTML=cards.map(c=>`<article class="smart-insight"><span>${c[0]}</span><strong>${c[1]}</strong><p>${c[2]}</p></article>`).join('');
  }

  function renderPRs(){
    const best={};
    state.logs.forEach(log=>(log.exerciseStats||[]).forEach(ex=>{
      const name=ex.name||'Exercise';let reps=Number(ex.bestSetReps)||0,load=Number(ex.bestLoad)||0;
      if(!reps&&Number(ex.actualReps)>0&&Number(ex.done)>0)reps=Math.ceil(Number(ex.actualReps)/Number(ex.done));
      if(!reps)reps=Number(ex.reps)||0;
      const item=best[name]||(best[name]={name,reps:0,load:0,repsDate:'',loadDate:'',unit:ex.unit||'reps'});
      if(reps>item.reps){item.reps=reps;item.repsDate=log.date;item.unit=ex.unit||item.unit;}
      if(load>item.load){item.load=load;item.loadDate=log.date;}
    }));
    const rows=Object.values(best).sort((a,b)=>b.reps-a.reps||b.load-a.load).slice(0,6),host=$('#xPersonalRecords');
    if(host)host.innerHTML=rows.length?rows.map(r=>`<article class="pr-card"><small>${esc(r.name)}</small><strong>${r.reps}</strong><span>best logged set · ${esc(r.unit)}${r.load?` · top recorded load ${r.load} kg`:''}</span><em>${esc(r.repsDate||r.loadDate)}</em></article>`).join(''):'<p class="history-empty">Save a workout to start building your session highlights.</p>';
    if($('#xDashboardPR'))$('#xDashboardPR').textContent=rows[0]?rows[0].name:'No records yet';
    if($('#xDashboardPRText'))$('#xDashboardPRText').textContent=rows[0]?`${rows[0].reps} ${rows[0].unit} in the best logged set${rows[0].load?` · ${rows[0].load} kg top recorded load`:''} · ${rows[0].repsDate||rows[0].loadDate}`:'Your saved session highlights will appear here.';
  }

  function renderAccurateDashboard(){
    const now=new Date(),recentStart=new Date(now);recentStart.setDate(recentStart.getDate()-6);recentStart.setHours(0,0,0,0);
    const recent=state.logs.filter(l=>l.date<=today()&&new Date(`${l.date}T12:00:00`)>=recentStart).sort((a,b)=>a.date.localeCompare(b.date));
    const activity=$('#xWeeklyActivity');if(activity){
      const days=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()-6+i);const key=todayKey(d);const dayLogs=recent.filter(x=>x.date===key);return {label:d.toLocaleDateString([],{weekday:'short'}).slice(0,2),sets:dayLogs.reduce((n,x)=>n+(Number(x.setsDone)||0),0),sessions:dayLogs.length};});
      const max=Math.max(1,...days.map(d=>d.sets));activity.innerHTML=days.map(d=>`<div class="activity-day ${d.sessions?'has-activity':''}" title="${d.sessions} session(s), ${d.sets} sets"><em>${d.sessions?d.sets:'—'}</em><div class="activity-bar-wrap"><span style="height:${d.sets?Math.max(12,Math.round(d.sets/max*100)):4}%"></span></div><small>${d.label}</small></div>`).join('');
      if($('#xWeekTotal'))$('#xWeekTotal').textContent=`${recent.length} sessions`;
    }
    if($('#xDashSessions'))$('#xDashSessions').textContent=String(state.logs.length);
    const latest=state.logs.at(-1),host=$('#v81RecentActivity');if(host)host.innerHTML=state.logs.slice(-4).reverse().map(l=>`<div class="v81-activity-row"><span class="v81-activity-dot"></span><div><b>${esc(l.workoutName||l.day||'Workout')}</b><small>${esc(l.date)} · ${Number(l.setsDone)||0} sets · ${Number(l.repsDone)||0} logged target units</small></div><strong>+${Number(l.xp)||0} XP</strong></div>`).join('')||'<p class="history-empty">No activity yet. Your first saved session will show here.</p>';
    if($('#v81LatestWorkout'))$('#v81LatestWorkout').innerHTML=latest?`<b>${esc(latest.workoutName||latest.day)}</b><span>${esc(latest.date)} · ${latest.setsDone||0} sets · ${esc(latest.duration||'Not timed')}</span>`:'<b>No saved workout yet</b><span>Finish a session to create your first activity entry.</span>';
    const run=currentRun(),routine=activeRoutine();if($('#v81ResumeCard'))$('#v81ResumeCard').hidden=!run;
    if($('#v81ResumeText')&&routine)$('#v81ResumeText').textContent=`${routine.name} · unfinished session saved today`;
    // A dated custom routine takes precedence over a weekly-plan label when it is the next scheduled item.
    const future=state.customSchedule.filter(s=>!s.completedAt&&s.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
    if(future){const w=state.customWorkouts.find(x=>x.id===future.workoutId);if(w){$('#xNextSessionTitle').textContent=`${future.date===today()?'Today':future.date} · ${w.name}`;$('#xNextSessionText').textContent='Custom workout scheduled separately from your weekly plan.';}}
    renderPRs();renderSmartInsights();
  }
  function renderHistory(){
    const host=$('#historyList');if(!host)return;
    const q=($('#xHistorySearch')?.value||'').trim().toLowerCase(),range=$('#xHistoryRange')?.value||'all',cut=new Date();cut.setHours(0,0,0,0);if(range!=='all')cut.setDate(cut.getDate()-Number(range));
    const rows=state.logs.slice().reverse().filter(l=>(range==='all'||new Date(`${l.date}T12:00:00`)>=cut)&&(!q||`${l.workoutName||l.day} ${l.date} ${(l.exerciseStats||[]).map(x=>x.name).join(' ')}`.toLowerCase().includes(q)));
    host.innerHTML=rows.map(l=>`<details class="history-item"><summary><span><b>${esc(l.workoutName||l.day)} · ${esc(l.date)}</b><small>${l.setsDone||0} sets · ${l.repsDone||0} logged target units · ${esc(l.duration||'Not timed')}</small></span><b>+${Number(l.xp)||0} XP</b></summary><div class="small-note">${(l.exerciseStats||[]).map(e=>`${esc(e.name)}: ${e.done||0} sets · ${e.actualReps??e.reps??0} ${esc(e.unit||'reps')}`).join('<br>')}<br>${(l.setDetails||[]).map(d=>`${esc(d.exercise||d.key)} · ${d.actualReps??'target'} ${esc(d.unit||'reps')}${d.load!==null&&d.load!==undefined?` · ${d.load} kg`:''}${d.note?` · ${esc(d.note)}`:''}`).join(' | ')}</div></details>`).join('')||'<p class="history-empty">No workouts match these filters.</p>';
  }
  function renderCompareOptions(){const a=$('#xCompareA'),b=$('#xCompareB');if(!a||!b)return;const opts=state.logs.slice().reverse().map((l,i)=>`<option value="${esc(l.id||`${l.date}-${i}`)}">${esc(l.workoutName||l.day)} · ${esc(l.date)} · ${l.setsDone||0} sets</option>`).join('');a.innerHTML=opts;b.innerHTML=opts;if(state.logs.length>1)b.selectedIndex=1;}
  function bindCompare(){const btn=$('#xCompareBtn');btn?.addEventListener('click',()=>{const a=state.logs.find((l,i)=>(l.id||`${l.date}-${state.logs.length-1-i}`)===$('#xCompareA').value),b=state.logs.find((l,i)=>(l.id||`${l.date}-${state.logs.length-1-i}`)===$('#xCompareB').value);if(!a||!b)return;$('#xCompareOutput').innerHTML=`<b>${esc(a.workoutName||a.day)} · ${esc(a.date)}</b> vs <b>${esc(b.workoutName||b.day)} · ${esc(b.date)}</b><br>Sets: ${a.setsDone||0} vs ${b.setsDone||0}<br>Logged reps / seconds: ${a.repsDone||0} vs ${b.repsDone||0}<br>Duration: ${esc(a.duration||'—')} vs ${esc(b.duration||'—')}<br><br>Use this as a history reference, not a requirement to beat a previous session.`;});}

  function openCreator(id=null){
    if(currentRun()&&id===currentRun().workoutId){toast('Finish or reset this active session before editing its routine.');return;}
    editingId=id;draft=[];const form=$('#createWorkoutForm');if(!form)return;
    const w=id?state.customWorkouts.find(x=>x.id===id):null;
    $('#customWorkoutName').value=w?.name||'';$('#customExerciseName').value='';$('#customExerciseSets').value='2';$('#customExerciseReps').value='8';
    if($('#customExerciseUnit'))$('#customExerciseUnit').value='reps';if($('#customExerciseCategory'))$('#customExerciseCategory').value='General';if($('#customExerciseRest'))$('#customExerciseRest').value=String(state.settings?.rest||60);if($('#customExercisePhase'))$('#customExercisePhase').value='Strength';if($('#customScheduleDate'))$('#customScheduleDate').value='';if($('#customLibrarySelect'))$('#customLibrarySelect').value='';
    if(w)draft=w.exercises.map(e=>({...e}));
    const h=form.querySelector('h2');if(h)h.textContent=w?'Edit custom workout':'Create something new';
    const save=form.querySelector('[type="submit"]');if(save)save.textContent=w?'Save changes':'Save new workout';
    populateLibrary();renderDraft();$('#createWorkoutDialog').showModal();
  }
  function populateLibrary(query=''){
    const select=$('#customLibrarySelect');if(!select)return;
    const q=String(query||'').toLowerCase();
    const names=[...new Set($$('#xGuideLibrary .guide-card b').map(x=>x.textContent.trim()).filter(n=>n&&n.toLowerCase().includes(q)))];
    const current=select.value;select.innerHTML='<option value="">Choose from exercise library…</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');select.value=names.includes(current)?current:'';
  }
  function addExercise(nameOverride=null){
    const name=(nameOverride||$('#customExerciseName').value).trim();if(!name){toast('Choose an exercise or enter a name.');return;}
    const unit=$('#customExerciseUnit')?.value||'reps';const phase=$('#customExercisePhase')?.value||'Strength';
    const sets=clamp($('#customExerciseSets').value,1,8,2),reps=clamp($('#customExerciseReps').value,1,120,8),restSeconds=clamp($('#customExerciseRest')?.value,0,300,60);
    const card=$$('#xGuideLibrary .guide-card').find(x=>x.querySelector('b')?.textContent.trim()===name);
    const category=card?.querySelector('small')?.textContent.split('·')[0].trim()||$('#customExerciseCategory')?.value||'General';
    draft.push({id:`ce-${Date.now().toString(36)}-${draft.length}`,name,phase,category,sets,reps,unit,restSeconds,cues:['Move with control.','Choose a comfortable range.','Stop if you feel pain or unusual discomfort.'],unilateral:false});
    $('#customExerciseName').value='';if($('#customLibrarySelect'))$('#customLibrarySelect').value='';renderDraft();
  }
  function renderDraft(){const list=$('#customExerciseList');if(!list)return;list.innerHTML=draft.length?draft.map((e,i)=>`<div class="custom-exercise-row"><div><b>${esc(e.name)}</b><small>${e.sets} sets · ${e.reps} ${e.unit==='sec'?'seconds':e.unit==='min'?'minutes':'reps'} · ${e.restSeconds||0}s rest · ${esc(e.phase)}</small></div><div class="v81-row-actions"><button type="button" data-draft-up="${i}" aria-label="Move ${esc(e.name)} up" ${i===0?'disabled':''}>↑</button><button type="button" data-draft-down="${i}" aria-label="Move ${esc(e.name)} down" ${i===draft.length-1?'disabled':''}>↓</button><button type="button" data-draft-remove="${i}" aria-label="Remove ${esc(e.name)}">×</button></div></div>`).join(''):'<p class="small-note">No exercises added yet.</p>';}
  function saveDraft(e){
    e.preventDefault();const name=$('#customWorkoutName').value.trim();if(!name||!draft.length){toast('Add a workout name and at least one exercise.');return;}
    const date=$('#customScheduleDate')?.value;if(date&&date<today()){toast('Choose today or a future date for the schedule.');return;}
    const existing=editingId?state.customWorkouts.find(w=>w.id===editingId):null;
    if(existing){existing.name=name;existing.exercises=draft.map(x=>({...x}));existing.updatedAt=new Date().toISOString();}
    else state.customWorkouts.push({id:`cw-${Date.now().toString(36)}`,name,createdAt:new Date().toISOString(),exercises:draft.map(x=>({...x}))});
    if(date){const target=existing||state.customWorkouts.at(-1);state.customSchedule.push({id:`schedule-${Date.now().toString(36)}`,workoutId:target.id,date,createdAt:new Date().toISOString()});}
    saveState();$('#createWorkoutDialog').close();renderCustomWorkouts();renderSchedule();renderAccurateDashboard();toast(existing?'Custom workout updated. Your weekly plan is unchanged.':'Custom workout saved separately from your weekly plan.');
  }
  function startCustom(id,scheduleId=null){
    const w=state.customWorkouts.find(x=>x.id===id);if(!w)return;
    const active=currentRun();if(active){if(active.workoutId===id){resumeCustom();return;}toast('You already have a custom session in progress. Resume or finish it before starting another.');return;}
    // Reuse the Version 8.0 in-progress checklist once, but never reuse a completed/new run.
    const old=state.daily[today()]?.customSessions?.[id];let runId=`run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    state.daily[today()]=state.daily[today()]||{};state.daily[today()].customSessions=state.daily[today()].customSessions||{};
    if(old){
      if(!state.logs.some(l=>l.customWorkoutId===id&&l.date===today())){runId=`legacy-${id}-${today()}`;state.daily[today()].customSessions[runId]=old;}
      delete state.daily[today()].customSessions[id];
    }
    state.daily[today()].customSessions[runId]=state.daily[today()].customSessions[runId]||blankSession();
    state.activeCustomRun={workoutId:id,runId,date:today(),scheduleId};saveState();renderWorkout();setTab('workout');
    $('#workoutHeading').textContent=w.name;$('#workoutTypePill').textContent='CUSTOM';$('#pageTitle').innerHTML='Your custom session.<br><span>Built by you.</span>';
    toast(`Started ${w.name}. Your weekly plan has not changed.`);window.scrollTo({top:0,behavior:state.settings?.reducedMotion?'auto':'smooth'});
  }
  function resumeCustom(){const r=currentRun();if(!r)return;setTab('workout');renderWorkout();toast(`Resumed ${activeRoutine()?.name||'custom workout'}. Your progress is restored.`);}
  function scheduleRoutine(id,date){if(!date||date<today()){toast('Choose today or a future date.');return;}if(!state.customWorkouts.some(w=>w.id===id))return;state.customSchedule.push({id:`schedule-${Date.now().toString(36)}`,workoutId:id,date,createdAt:new Date().toISOString()});saveState();renderSchedule();renderAccurateDashboard();toast('Custom workout scheduled. Your weekly plan is unchanged.');}
  function renderCustomWorkouts(){
    const builder=$('#builderView');if(!builder)return;let host=$('#customWorkoutShelf');
    if(!host){host=document.createElement('section');host.id='customWorkoutShelf';host.className='panel custom-workout-shelf';host.innerHTML='<div class="panel-heading"><div><p class="eyebrow">YOUR OWN ROUTINES</p><h3>Custom workouts</h3></div><button class="btn btn-primary btn-small" id="v81NewCustom">+ New workout</button></div><div id="savedCustomWorkouts"></div>';const first=builder.querySelector('.builder-toolbar');builder.insertBefore(host,first?.nextSibling||builder.firstChild);}
    const newBtn=$('#v81NewCustom');if(newBtn&&!newBtn.dataset.bound){newBtn.dataset.bound='1';newBtn.addEventListener('click',()=>openCreator());}
    const list=$('#savedCustomWorkouts');if(!list)return;
    const items=state.customWorkouts||[],active=currentRun();list.innerHTML=items.length?items.map((w,i)=>`<article class="v81-routine"><div class="v81-routine-main"><div><b>${esc(w.name)}</b><small>${w.exercises.length} exercises · separate from weekly plan</small></div><div class="v81-routine-actions"><button class="btn btn-primary btn-small" data-v81-action="start" data-id="${esc(w.id)}" ${active&&active.workoutId!==w.id?'disabled':''}>${active?.workoutId===w.id?'Resume active':active?'Finish current first':'Start new'}</button><button class="btn btn-outline btn-small" data-v81-action="edit" data-id="${esc(w.id)}" ${active?.workoutId===w.id?'disabled title="Finish the active session before editing"':''}>Edit</button><button class="btn btn-quiet btn-small" data-v81-action="duplicate" data-id="${esc(w.id)}">Duplicate</button><button class="btn btn-quiet btn-small" data-v81-action="up" data-id="${esc(w.id)}" ${i===0?'disabled':''} aria-label="Move routine up">↑</button><button class="btn btn-quiet btn-small" data-v81-action="down" data-id="${esc(w.id)}" ${i===items.length-1?'disabled':''} aria-label="Move routine down">↓</button><button class="btn btn-quiet btn-small" data-v81-action="delete" data-id="${esc(w.id)}">Delete</button></div></div><details class="v81-preview"><summary>Preview exercises & schedule</summary><ul>${w.exercises.map(x=>`<li>${esc(x.name)} — ${x.sets} × ${x.reps} ${esc(x.unit||'reps')}, ${Number(x.restSeconds)||0}s rest</li>`).join('')}</ul><div class="v81-schedule-controls"><label>Schedule date <input type="date" min="${today()}" data-schedule-date="${esc(w.id)}"></label><button class="btn btn-outline btn-small" data-v81-action="schedule" data-id="${esc(w.id)}">Schedule</button></div></details></article>`).join(''):'<p class="small-note">No custom workouts yet. Use the + button in the bottom navigation to create one.</p>';
  }
  function renderSchedule(){
    const planner=$('#plannerView');if(!planner)return;let panel=$('#v81SchedulePanel');if(!panel){panel=document.createElement('section');panel.id='v81SchedulePanel';panel.className='panel v81-schedule-panel';const heading=planner.querySelector('.section-heading');(heading||planner).after(panel);}
    const rows=state.customSchedule.filter(s=>!s.completedAt).sort((a,b)=>a.date.localeCompare(b.date));
    const scheduleRows=rows.map(s=>{const w=state.customWorkouts.find(x=>x.id===s.workoutId);if(!w)return '';return `<div class="v81-scheduled-row"><div><b>${esc(w.name)}</b><small>${esc(s.date)} · ${w.exercises.length} exercises</small></div><div><button class="btn btn-primary btn-small" data-v81-action="start-scheduled" data-id="${esc(w.id)}" data-schedule="${esc(s.id)}">Start</button><button class="btn btn-quiet btn-small" data-v81-action="unschedule" data-schedule="${esc(s.id)}">Remove</button></div></div>`;}).join('');
    panel.innerHTML=`<div class="panel-heading"><div><p class="eyebrow">CUSTOM ROUTINE CALENDAR</p><h3>Scheduled workouts</h3></div><span class="pill">SEPARATE PLAN</span></div>${scheduleRows||'<p class="small-note">No custom workouts scheduled. Use a saved routine preview to add a date.</p>'}`;
  }

  function renderGreeting(){
    const h=new Date().getHours(),g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    if(!currentRun()&&$('#pageTitle'))$('#pageTitle').innerHTML=`${g}.<br><span>Make time to move.</span>`;
    const sub=$('.hero-sub');if(sub&&!currentRun())sub.textContent='Your plans, saved sessions, and next steps in one place. Keep the pace comfortable and leave room to recover.';
  }
  function addDashboardCards(){
    const anchor=$('#xDashboardInsights');if(!anchor||$('#v81DashboardPanel'))return;
    const panel=document.createElement('section');panel.id='v81DashboardPanel';panel.className='v81-dashboard-panel';
    panel.innerHTML=`<article class="panel v81-latest"><div class="panel-heading"><div><p class="eyebrow">LATEST SESSION</p><h3>Recent workout</h3></div><button class="btn btn-quiet btn-small" data-v81-action="history">View history</button></div><div id="v81LatestWorkout" class="v81-latest-content"></div></article><article class="panel v81-recent"><div class="panel-heading"><div><p class="eyebrow">YOUR ACTIVITY</p><h3>Recent activity</h3></div><span class="pill">LOCAL LOG</span></div><div id="v81RecentActivity"></div></article><article class="panel v81-resume" id="v81ResumeCard" hidden><div><p class="eyebrow">SESSION IN PROGRESS</p><h3>Pick up where you left off</h3><p id="v81ResumeText" class="small-note"></p></div><button class="btn btn-primary" data-v81-action="resume">Resume session</button></article>`;
    anchor.after(panel);
  }
  function addCustomizeDialog(){
    if($('#v81CustomizeDialog'))return;
    document.body.insertAdjacentHTML('beforeend',`<dialog class="modal v81-modal" id="v81CustomizeDialog"><form method="dialog"><div class="modal-head"><div><p class="eyebrow">DASHBOARD SETTINGS</p><h2>Customize your home</h2></div><button class="icon-btn" value="cancel" aria-label="Close">✕</button></div><p class="small-note">Choose which dashboard sections stay visible. Your workout data is not changed.</p>${[['xDashboardInsights','Weekly overview'],['dashboard-launchpad','Quick actions'],['levelPanel','Level and XP'],['smartInsights','Training snapshot']].map(([id,label])=>`<label class="v81-check"><input type="checkbox" data-dashboard-section="${id}" checked> ${label}</label>`).join('')}<div class="modal-actions"><button class="btn btn-quiet" value="cancel">Done</button><button class="btn btn-primary" type="button" id="v81ResetDashboard">Reset layout</button></div></form></dialog>`);
  }
  function applyDashboardPrefs(){
    const hidden=new Set(state.dashboardPrefs?.hidden||[]);
    ['xDashboardInsights','dashboard-launchpad','levelPanel','smartInsights'].forEach(id=>{const el=id==='smartInsights'?$('#smartInsights')?.closest('.smart-panel'):document.getElementById(id);if(el)el.classList.toggle('v81-dashboard-hidden',hidden.has(id));});
    $$('[data-dashboard-section]').forEach(c=>c.checked=!hidden.has(c.dataset.dashboardSection));
  }
  function openMenu(){const menu=$('#moreMenu'),btn=$('#moreMenuBtn');if(!menu||!btn)return;menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden){menuReturnFocus=btn;menu.querySelector('button')?.focus();}else btn.focus();}
  function closeMenu(){const menu=$('#moreMenu'),btn=$('#moreMenuBtn');if(menu&&!menu.hidden){menu.hidden=true;btn?.setAttribute('aria-expanded','false');menuReturnFocus?.focus();}}
  function installMenu(){
    const menu=$('#moreMenu'),trigger=$('#moreMenuBtn');if(!menu||!trigger)return;
    menu.innerHTML=`<button data-more-tab="planner">Planner <small>Organize your week</small></button><button data-more-tab="insights">Insights <small>Training patterns and comparisons</small></button><button data-more-tab="guide">Exercise guide <small>Movement library</small></button><button data-more-tab="settings">Settings & appearance <small>Preferences, backup and accessibility</small></button><button data-v81-action="customize">Customize dashboard <small>Choose your home sections</small></button><button data-v81-action="help">Help & app guide <small>Learn the app</small></button>`;
    trigger.addEventListener('click',e=>{e.stopPropagation();openMenu();});
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!trigger.contains(e.target))closeMenu();});
    menu.addEventListener('click',e=>{const tab=e.target.closest('[data-more-tab]');if(tab){setTab(tab.dataset.moreTab);closeMenu();}});
  }

  function bindEvents(){
    $('#createWorkoutBtn')?.addEventListener('click',()=>openCreator());
    $('#closeCreateWorkout')?.addEventListener('click',()=>$('#createWorkoutDialog').close());$('#cancelCreateWorkout')?.addEventListener('click',()=>$('#createWorkoutDialog').close());
    $('#addCustomExercise')?.addEventListener('click',()=>addExercise());$('#createWorkoutForm')?.addEventListener('submit',saveDraft);
    $('#customLibrarySelect')?.addEventListener('change',e=>{if(e.target.value){$('#customExerciseName').value=e.target.value;const card=$$('#xGuideLibrary .guide-card').find(x=>x.querySelector('b')?.textContent.trim()===e.target.value);const cat=card?.querySelector('small')?.textContent.split('·')[0].trim();if(cat&&$('#customExerciseCategory'))$('#customExerciseCategory').value=cat;}});
    $('#customLibrarySearch')?.addEventListener('input',e=>populateLibrary(e.target.value));
    $('#customExerciseList')?.addEventListener('click',e=>{
      const up=e.target.closest('[data-draft-up]'),down=e.target.closest('[data-draft-down]'),remove=e.target.closest('[data-draft-remove]');
      if(up||down){const i=Number((up||down).dataset[up?'draftUp':'draftDown']),j=up?i-1:i+1;[draft[i],draft[j]]=[draft[j],draft[i]];renderDraft();}
      if(remove){draft.splice(Number(remove.dataset.draftRemove),1);renderDraft();}
    });
    $('#builderView')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-v81-action]');if(!b)return;const action=b.dataset.v81Action,id=b.dataset.id;
      if(action==='start')startCustom(id);
      if(action==='start-scheduled')startCustom(id,b.dataset.schedule);
      if(action==='edit')openCreator(id);
      if(action==='duplicate'){const w=state.customWorkouts.find(x=>x.id===id);if(w){state.customWorkouts.push({...structuredClone(w),id:`cw-${Date.now().toString(36)}`,name:`${w.name} copy`,createdAt:new Date().toISOString()});saveState();renderCustomWorkouts();toast('Routine duplicated.');}}
      if(action==='up'||action==='down'){const i=state.customWorkouts.findIndex(x=>x.id===id),j=action==='up'?i-1:i+1;if(j>=0&&j<state.customWorkouts.length){[state.customWorkouts[i],state.customWorkouts[j]]=[state.customWorkouts[j],state.customWorkouts[i]];saveState();renderCustomWorkouts();}}
      if(action==='delete'){const w=state.customWorkouts.find(x=>x.id===id);if(w&&confirm(`Delete "${w.name}"? Saved workout history will remain.`)){const wasActive=state.activeCustomRun?.workoutId===id,runId=wasActive?state.activeCustomRun.runId:null;state.customWorkouts=state.customWorkouts.filter(x=>x.id!==id);state.customSchedule=state.customSchedule.filter(x=>x.workoutId!==id);Object.values(state.daily).forEach(day=>{if(day.customSessions){Object.keys(day.customSessions).filter(k=>k===id||k.includes(id)||k===runId).forEach(k=>delete day.customSessions[k]);}});if(wasActive)state.activeCustomRun=null;saveState();renderCustomWorkouts();renderSchedule();renderWorkout();toast('Routine deleted. Saved history was kept.');}}
      if(action==='schedule'){const date=$(`[data-schedule-date="${CSS.escape(id)}"]`)?.value;scheduleRoutine(id,date);}
    });
    $('#plannerView')?.addEventListener('click',e=>{const b=e.target.closest('[data-v81-action]');if(!b)return;if(b.dataset.v81Action==='start-scheduled')startCustom(b.dataset.id,b.dataset.schedule);if(b.dataset.v81Action==='unschedule'){state.customSchedule=state.customSchedule.filter(s=>s.id!==b.dataset.schedule);saveState();renderSchedule();renderAccurateDashboard();}});
    $('#moreMenu')?.addEventListener('click',e=>{const b=e.target.closest('[data-v81-action]');if(!b)return;const a=b.dataset.v81Action;if(a==='customize'){$('#v81CustomizeDialog').showModal();applyDashboardPrefs();closeMenu();}if(a==='help'){setTab('guide');closeMenu();}});
    document.addEventListener('click',e=>{const b=e.target.closest('[data-v81-action]');if(!b)return;if(b.dataset.v81Action==='resume')resumeCustom();if(b.dataset.v81Action==='history')setTab('history');});
    $('#v81CustomizeDialog')?.addEventListener('change',e=>{if(!e.target.matches('[data-dashboard-section]'))return;const id=e.target.dataset.dashboardSection,hidden=new Set(state.dashboardPrefs.hidden||[]);if(e.target.checked)hidden.delete(id);else hidden.add(id);state.dashboardPrefs.hidden=[...hidden];saveState();applyDashboardPrefs();});
    $('#v81ResetDashboard')?.addEventListener('click',()=>{state.dashboardPrefs.hidden=[];saveState();applyDashboardPrefs();$('#v81CustomizeDialog').close();});
    $('#phaseGrid')?.addEventListener('input',e=>{if(!e.target.classList.contains('v81-load'))return;const d=dailyData();d.setLoad=d.setLoad||{};d.setLoad[e.target.dataset.key]=e.target.value===''?'':clamp(e.target.value,0,500,0);saveState();});
    $('#xHistorySearch')?.addEventListener('input',renderHistory);$('#xHistoryRange')?.addEventListener('change',renderHistory);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();} });
    $('#createWorkoutDialog')?.addEventListener('close',()=>{editingId=null;});
    $('#xConfirmBackupImport')?.addEventListener('click',()=>setTimeout(()=>{ensureState();renderWorkout();renderAll();toast('Backup loaded and checked.');},0));
    $('#clearDataBtn')?.addEventListener('click',()=>setTimeout(()=>{ensureState();renderAll();renderWorkout();},0));
    $('#xRunDiagnostics')?.addEventListener('click',()=>setTimeout(()=>{const ids=state.logs.map(l=>l.id).filter(Boolean);const checks=[['Custom routine structure',state.customWorkouts.every(w=>w&&w.id&&w.name&&Array.isArray(w.exercises)&&w.exercises.length>0)],['Schedule references',state.customSchedule.every(s=>state.customWorkouts.some(w=>w.id===s.workoutId))],['Session identifiers',new Set(ids).size===ids.length],['Active session reference',!state.activeCustomRun||!!currentRun()],['Local app shell',!!document.querySelector('script[src=\"version81.js\"]')&&!!document.querySelector('link[href=\"styles.css\"]')]];const pass=checks.filter(x=>x[1]).length,el=$('#xDiagnostics');if(el)el.textContent=`Version 9.6 base checks: ${pass}/${checks.length} passed · ${checks.filter(x=>!x[1]).map(x=>x[0]).join(', ')||'No local data issues found.'}`;},0));
    $('#resetBtn')?.addEventListener('click',()=>setTimeout(()=>{const d=activeData();if(currentRun()){Object.assign(d,blankSession());saveState();renderWorkout();toast('Custom session checklist reset.');}},0));
  }
  function addReminderSettings(){
    const host=$('#settingsView .settings-grid');if(!host)return;if($('#v81ReminderPanel')){$('#v81ReminderToggle').checked=!!state.settings.browserReminders;updateReminderStatus();return;}
    const panel=document.createElement('section');panel.id='v81ReminderPanel';panel.className='panel x-settings-panel';
    panel.innerHTML='<h3>Scheduled workout reminders</h3><p class="small-note">Optional browser notifications can remind you about a custom workout when you open the app on its scheduled date. They do not run as background push notifications.</p><label class="setting-row">Enable browser reminders <input type="checkbox" id="v81ReminderToggle"></label><button class="btn btn-outline btn-small" id="v81EnableReminder">Allow browser notifications</button><p class="small-note" id="v81ReminderStatus">Notifications are optional and can be changed in Chrome site settings.</p>';
    host.append(panel);
    $('#v81ReminderToggle').checked=!!state.settings.browserReminders;
    $('#v81ReminderToggle').addEventListener('change',e=>{state.settings.browserReminders=e.target.checked;saveState();if(e.target.checked)enableReminders();else $('#v81ReminderStatus').textContent='Browser reminders are turned off.';});
    $('#v81EnableReminder').addEventListener('click',enableReminders);
    updateReminderStatus();
  }
  function updateReminderStatus(){const el=$('#v81ReminderStatus');if(!el)return;if(!('Notification'in window)){el.textContent='This browser context does not support notifications.';return;}el.textContent=Notification.permission==='granted'?'Browser notifications are allowed. Reminders are checked when the app opens.':Notification.permission==='denied'?'Notifications are blocked for this site. Change the permission in Chrome site settings.':'Notifications have not been allowed yet.';}
  async function enableReminders(){
    const el=$('#v81ReminderStatus');
    if(!('Notification'in window)){if(el)el.textContent='Notifications are not supported in this browser context.';return;}
    if(!window.isSecureContext&&location.hostname!=='localhost'){if(el)el.textContent='Chrome requires a secure site (HTTPS) for browser notifications. The local file version still supports in-app schedule reminders.';toast('Browser notifications require HTTPS.');return;}
    try{const permission=await Notification.requestPermission();state.settings.browserReminders=permission==='granted';saveState();if(el)el.textContent=permission==='granted'?'Allowed. Scheduled reminders will be checked when the app opens.':'Permission was not granted. In-app reminders remain available.';$('#v81ReminderToggle').checked=permission==='granted';checkDueReminders();}catch{if(el)el.textContent='The browser could not request notification permission.';}
  }
  function checkDueReminders(){
    const due=state.customSchedule.filter(s=>s.date===today()&&!s.completedAt&&!s.notifiedAt);
    due.forEach(s=>{const w=state.customWorkouts.find(x=>x.id===s.workoutId);if(!w)return;toast(`Scheduled for today: ${w.name}`);if(state.settings.browserReminders&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('NEXORA reminder',{body:`${w.name} is on your custom schedule for today.`});}catch{}}s.notifiedAt=new Date().toISOString();});
    if(due.length)saveState();
  }
  function renderAll(){renderLevelPanel();renderAccurateDashboard();renderPRs();renderHistory();renderCustomWorkouts();renderSchedule();renderGreeting();applyDashboardPrefs();addReminderSettings();updateReminderStatus();checkDueReminders();}
  function init(){
    ensureState();addDashboardCards();addCustomizeDialog();installMenu();bindEvents();
    // Add the current title / session panels after the Version 7 base views have mounted.
    renderCustomWorkouts();renderSchedule();
    const run=currentRun();if(run){renderWorkout();toast(`Your unfinished ${activeRoutine()?.name||'custom workout'} was restored.`);}
    window.renderProgress=(function(base){return function(){base();renderLevelPanel();renderHistory();renderPRs();renderAccurateDashboard();};})(window.renderProgress);
    window.setTab=(function(base){return function(name){base(name);if(name==='builder')renderCustomWorkouts();if(name==='planner')renderSchedule();if(name==='history'){renderHistory();}if(name==='progress'||name==='insights'){renderPRs();renderLevelPanel();renderCompareOptions();}if(name==='workout'){renderAccurateDashboard();renderGreeting();}};})(window.setTab);
    const oldRender=window.renderWorkout;window.renderWorkout=function(){oldRender();addLoadInputs();const w=activeRoutine();if(w){$('#workoutHeading').textContent=w.name;$('#workoutTypePill').textContent='CUSTOM';$('#pageTitle').innerHTML='Your custom session.<br><span>Built by you.</span>';}else renderGreeting();};
    const baseProgress=window.renderProgress; // render wrapper installed above; refresh after base init is complete.
    bindCompare();renderAll();
    // Keep the current date and session context accurate if the app stays open across midnight.
    document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(!currentRun()&&state.activeCustomRun){state.activeCustomRun=null;saveState();renderWorkout();}checkDueReminders();renderSchedule();renderAccurateDashboard();});
    saveState();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
