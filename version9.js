/* NEXORA FITNESS 9.7.0 — personalization, planning intelligence, progress and quality checks.
   Dependency-free; preserves the vtaper-pro-v2 localStorage key and existing backup format. */
(()=>{
  'use strict';
  window.__vtaperVersion9Loaded=true;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10);
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const groups=['Push','Pull','Shoulders','Legs','Core','Mobility','Recovery','General'];
  let calendarOffset=0, pendingPreview=null, skipPreview=false, libraryObserver=null, historyObserver=null;
  const v9Default={
    profile:{label:'My training profile',experience:'Getting started',preferredDays:['Monday','Wednesday','Friday'],sessionLength:45,equipment:['Bodyweight'],preferredCategories:['Push','Pull','Legs','Core'],selectedTitle:''},
    dashboard:{order:['weekly','goal','achievement','brief','recommendation'],hidden:[],sizes:{}},
    favorites:[],goals:[],xpLedger:[],calendarNotes:{},lastSessionFeedback:null
  };
  const clone=o=>JSON.parse(JSON.stringify(o));
  function ensure(){
    state.v9=state.v9&&typeof state.v9==='object'?state.v9:clone(v9Default);
    state.v9.profile={...clone(v9Default.profile),...(state.v9.profile||{})};
    state.v9.dashboard={...clone(v9Default.dashboard),...(state.v9.dashboard||{})};
    state.v9.favorites=Array.isArray(state.v9.favorites)?state.v9.favorites:[];
    state.v9.goals=Array.isArray(state.v9.goals)?state.v9.goals:[];
    state.v9.xpLedger=Array.isArray(state.v9.xpLedger)?state.v9.xpLedger:[];
    state.v9.calendarNotes=state.v9.calendarNotes||{};
    state.logs=Array.isArray(state.logs)?state.logs:[];
    const seen=new Set();
    state.logs.forEach((l,i)=>{if(!l.id||seen.has(l.id))l.id=`v9-${String(l.date||'legacy').replace(/\W/g,'')}-${i}`;seen.add(l.id);});
    // Rebuild the ledger from saved session entries only; this does not change the user's XP balance.
    const existing=new Set(state.v9.xpLedger.map(x=>x.sessionId));
    state.logs.forEach(l=>{if(Number(l.xp)>0&&!existing.has(l.id)){state.v9.xpLedger.push({id:`xp-${l.id}`,sessionId:l.id,date:l.date,label:l.workoutName||l.day||'Workout',amount:Number(l.xp)});existing.add(l.id);}});
    state.v9.xpLedger=state.v9.xpLedger.slice(-200);
    saveState();
  }
  function note(msg){if(typeof toast==='function')toast(msg);}
  function profile(){return state.v9.profile;}
  function monthStart(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;}
  function parseDate(s){const d=new Date(`${s}T12:00:00`);return Number.isNaN(d.getTime())?null:d;}
  function inCurrentMonth(s){return String(s||'').startsWith(monthStart());}
  function uniqueExercises(logs){return new Set(logs.flatMap(l=>(l.exerciseStats||[]).map(e=>e.name).filter(Boolean)));}
  function logNotesCount(l){return Number(!!l.sessionNote)+Number(!!l.sessionFeedback)+((l.setDetails||[]).filter(x=>x.note).length);}
  function currentGoalProgress(g){
    const monthLogs=state.logs.filter(l=>inCurrentMonth(l.date));
    if(g.metric==='activeDays')return new Set(monthLogs.map(l=>l.date)).size;
    if(g.metric==='newExercises')return uniqueExercises(monthLogs).size;
    if(g.metric==='notes')return monthLogs.filter(l=>logNotesCount(l)>0).length;
    return monthLogs.length;
  }
  function achievementList(){
    const logs=state.logs, unique=uniqueExercises(logs), activeDays=new Set(logs.map(l=>l.date)).size;
    const noted=logs.filter(l=>logNotesCount(l)>0).length;
    const fav=state.v9.favorites.length;
    const defs=[
      ['first-entry','First Entry','Consistency','Save your first workout session.',logs.length>=1],
      ['training-log','Training Log','Consistency','Save five separate sessions.',logs.length>=5],
      ['time-capsule','Over Time','Consistency','Log activity on five different days.',activeDays>=5],
      ['explorer','Movement Explorer','Exploration','Try five different movements.',unique.size>=5],
      ['curious','Curious Mind','Exploration','Save a favourite movement.',fav>=1],
      ['journal','Training Journal','Reflection','Add notes or feedback to three sessions.',noted>=3],
      ['planner','Planner Ready','Organization','Create a custom workout.',(state.customWorkouts||[]).length>=1],
      ['planner-plus','Routine Collection','Organization','Save three custom routines.',(state.customWorkouts||[]).length>=3]
    ];
    return defs.map(([id,name,category,description,unlocked])=>({id,name,category,description,unlocked}));
  }
  function renderProfile(){
    const p=profile();
    const fields={v9ProfileLabel:p.label,v9Experience:p.experience,v9SessionLength:String(p.sessionLength),v9GoalTitle:p.defaultGoal||''};
    Object.entries(fields).forEach(([id,value])=>{const el=$('#'+id);if(el&&document.activeElement!==el)el.value=value;});
    $$('#v9PreferredDays input').forEach(el=>el.checked=(p.preferredDays||[]).includes(el.value));
    $$('#v9Equipment input').forEach(el=>el.checked=(p.equipment||[]).includes(el.value));
    $$('#v9PreferredCategories input').forEach(el=>el.checked=(p.preferredCategories||[]).includes(el.value));
    const titles=Array.isArray(state.unlockedTitles)?state.unlockedTitles:[];
    const title=$('#v9ProfileTitle');if(title){const chosen=p.selectedTitle||'';title.innerHTML='<option value="">Use current level title</option>'+titles.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');title.value=titles.includes(chosen)?chosen:'';}
    const badge=$('#v9ProfileBadge');if(badge)badge.textContent=p.selectedTitle||titles.at(-1)||'Getting Started';applyDashboardProfile();
    const label=$('#v9ProfileSummary');if(label)label.textContent=`${p.label||'My training profile'} · ${p.experience||'Getting started'} · ${p.sessionLength||45} minute preference`;const hint=$('#v9PlannerPrefHint');if(hint)hint.textContent=`Your preferred days: ${(p.preferredDays||[]).join(', ')||'Flexible schedule'}. Your planner remains editable and will not move workouts automatically.`;
  }
  function saveProfile(){
    const p=profile();p.label=$('#v9ProfileLabel').value.trim().slice(0,32)||'My training profile';p.experience=$('#v9Experience').value;p.sessionLength=Math.max(15,Math.min(180,Number($('#v9SessionLength').value)||45));
    p.preferredDays=$$('#v9PreferredDays input:checked').map(x=>x.value);p.equipment=$$('#v9Equipment input:checked').map(x=>x.value);p.preferredCategories=$$('#v9PreferredCategories input:checked').map(x=>x.value);p.selectedTitle=$('#v9ProfileTitle').value;
    p.defaultGoal=$('#v9GoalTitle')?.value.trim().slice(0,70)||'';
    saveState();renderProfile();renderV9Dashboard();note('Profile preferences saved. Your existing training plan was not changed.');
  }
  function goalMetricLabel(metric){return ({sessions:'saved sessions this month',activeDays:'active days this month',newExercises:'different movements this month',notes:'sessions with notes this month'})[metric]||'progress';}
  function renderGoals(){
    const host=$('#v9GoalsList');if(!host)return;
    const active=state.v9.goals.filter(g=>!g.archived);
    host.innerHTML=active.length?active.map(g=>{const value=currentGoalProgress(g),pct=Math.min(100,Math.round(value/Math.max(1,g.target)*100));return `<article class="v9-goal-card"><div class="v9-goal-head"><div><b>${esc(g.title)}</b><small>${value} / ${g.target} ${esc(goalMetricLabel(g.metric))}</small></div><button class="mini-btn" type="button" data-v9-delete-goal="${esc(g.id)}" aria-label="Remove goal">×</button></div><div class="v9-meter"><span style="width:${pct}%"></span></div><small>${pct>=100?'Milestone reached. You can set a new goal whenever you are ready.':`${pct}% complete`}</small></article>`;}).join(''):'<p class="history-empty">No personal milestones yet. Add a small, flexible goal when one would be useful.</p>';
    const dashboard=$('#v9GoalWidget');if(dashboard){const first=active[0];if(!first){dashboard.innerHTML='<b>No active milestone</b><p>Set an optional goal from Progress when you are ready.</p>';}else{const value=currentGoalProgress(first),pct=Math.min(100,Math.round(value/Math.max(1,first.target)*100));dashboard.innerHTML=`<b>${esc(first.title)}</b><p>${value} / ${first.target} ${esc(goalMetricLabel(first.metric))}</p><div class="v9-meter"><span style="width:${pct}%"></span></div><small>${pct}% · Optional personal milestone</small>`;}}
  }
  function addGoal(){
    const title=$('#v9GoalName').value.trim(),metric=$('#v9GoalMetric').value,target=Math.max(1,Math.min(30,Number($('#v9GoalTarget').value)||1));
    if(!title){note('Give your milestone a name first.');$('#v9GoalName').focus();return;}
    state.v9.goals.push({id:`goal-${Date.now().toString(36)}`,title:title.slice(0,60),metric,target,createdAt:new Date().toISOString()});$('#v9GoalName').value='';saveState();renderGoals();renderAchievements();note('Personal milestone added.');
  }
  function renderAchievements(){
    const items=achievementList(),host=$('#v9AchievementList');
    if(host)host.innerHTML=items.map(a=>`<article class="v9-achievement ${a.unlocked?'unlocked':''}"><span class="v9-achievement-icon">${a.unlocked?'✦':'◇'}</span><div><b>${esc(a.name)}</b><small>${esc(a.category)} · ${esc(a.description)}</small></div><strong>${a.unlocked?'UNLOCKED':'LOCKED'}</strong></article>`).join('');
    const unlocked=items.filter(x=>x.unlocked);const dash=$('#v9AchievementWidget');if(dash)dash.innerHTML=unlocked.length?`<b>${esc(unlocked.at(-1).name)}</b><p>${unlocked.length} of ${items.length} achievements unlocked.</p><small>Explore at your own pace; no streaks or penalties.</small>`:`<b>Your first achievement is waiting</b><p>Save a session or try a new app feature.</p>`;
    const badge=$('#v9AchievementCount');if(badge)badge.textContent=`${unlocked.length} / ${items.length} unlocked`;
  }
  function renderXpLedger(){
    const host=$('#v9XpLedger');if(!host)return;
    const rows=state.v9.xpLedger.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,15);
    host.innerHTML=rows.length?rows.map(x=>`<div class="v9-ledger-row"><span><b>${esc(x.label)}</b><small>${esc(x.date)}</small></span><strong>+${Number(x.amount)||0} XP</strong></div>`).join(''):'<p class="history-empty">XP entries will appear after eligible saved sessions.</p>';
  }
  function renderProgressTimeline(){
    const host=$('#v9ProgressTimeline');if(!host)return;
    const events=[];
    state.logs.forEach(l=>events.push({date:l.date||'',label:l.workoutName||l.day||'Workout saved',detail:`${l.setsDone||0} sets saved · ${Number(l.xp)||0} XP`,type:'Session'}));
    (state.levelHistory||[]).forEach(l=>events.push({date:l.date||'',label:`Reached Level ${l.level}`,detail:l.title||'Level milestone',type:'Level'}));
    state.v9.goals.filter(g=>currentGoalProgress(g)>=g.target).forEach(g=>events.push({date:g.createdAt?.slice(0,10)||today(),label:`Milestone: ${g.title}`,detail:'Personal goal reached',type:'Goal'}));
    events.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    host.innerHTML=events.slice(0,18).map(e=>`<div class="v9-timeline-row"><span class="v9-timeline-dot"></span><div><b>${esc(e.label)}</b><small>${esc(e.date)} · ${esc(e.type)} · ${esc(e.detail)}</small></div></div>`).join('')||'<p class="history-empty">Your progress timeline will fill in as you use the app.</p>';
  }
  function renderProgressTrends(){
    const select=$('#v9ProgressExercise'),host=$('#v9ProgressTrend');if(!select||!host)return;
    const names=[...uniqueExercises(state.logs)].sort();const old=select.value;select.innerHTML=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')||'<option value="">No exercise history</option>';if(names.includes(old))select.value=old;
    const name=select.value;const rows=state.logs.filter(l=>(l.exerciseStats||[]).some(e=>e.name===name)).slice(-8).map(l=>{const e=l.exerciseStats.find(x=>x.name===name);return {date:l.date,amount:Number(e.bestSetReps)||Number(e.actualReps)||Number(e.reps)||0,load:Number(e.bestLoad)||0,unit:e.unit||'reps'};});
    const max=Math.max(1,...rows.map(x=>x.amount));
    host.innerHTML=rows.length?`<div class="v9-trend-bars">${rows.map(r=>`<div class="v9-trend-item"><div class="v9-trend-bar"><span style="height:${Math.max(5,r.amount/max*100)}%"></span></div><b>${r.amount}</b><small>${esc(r.date.slice(5))}</small>${r.load?`<small>${r.load} kg</small>`:''}</div>`).join('')}</div><p class="small-note">Logged values across saved sessions. Compare like-for-like entries; this is a history view, not a target to beat.</p>`:'<p class="history-empty">Save this exercise in a session to see its progression.</p>';
  }
  function categoryFor(ex){
    if(ex.category)return ex.category;
    const n=String(ex.name||'').toLowerCase();
    if(/push|press|chest|tricep/.test(n))return 'Push';if(/row|pull|lat|back/.test(n))return 'Pull';if(/raise|shoulder/.test(n))return 'Shoulders';if(/squat|lunge|leg|calf|hinge/.test(n))return 'Legs';if(/plank|dead bug|crunch|core/.test(n))return 'Core';if(/walk|mobility|stretch/.test(n))return 'Mobility';return 'General';
  }
  function renderMuscleActivity(){
    const host=$('#v9MuscleActivity');if(!host)return;
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-29);cutoff.setHours(0,0,0,0);
    const counts={};state.logs.filter(l=>{const d=parseDate(l.date);return d&&d>=cutoff&&l.date<=today();}).forEach(l=>(l.exerciseStats||[]).forEach(e=>{const n=Number(e.done)||0;if(n>0){const c=categoryFor(e);counts[c]=(counts[c]||0)+n;}}));
    const max=Math.max(1,...Object.values(counts));const entries=groups.map(g=>[g,counts[g]||0]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]);
    host.innerHTML=entries.length?entries.map(([name,value])=>`<div class="v9-muscle-row"><span>${esc(name)}</span><div class="v9-meter"><span style="width:${Math.round(value/max*100)}%"></span></div><b>${value}</b></div>`).join(''):'<p class="history-empty">Group activity will appear after you save exercise sessions.</p>';
  }
  function renderCalendar(){
    const host=$('#v9Calendar');if(!host)return;
    const base=new Date();base.setDate(1);base.setMonth(base.getMonth()+calendarOffset);const y=base.getFullYear(),m=base.getMonth(),count=new Date(y,m+1,0).getDate(),offset=(base.getDay()+6)%7;
    const label=$('#v9CalendarLabel');if(label)label.textContent=base.toLocaleDateString([],{month:'long',year:'numeric'});
    const data={};state.logs.forEach(l=>(data[l.date]??={done:[],planned:[]}).done.push(l.workoutName||l.day||'Workout'));
    (state.customSchedule||[]).forEach(s=>{const w=(state.customWorkouts||[]).find(x=>x.id===s.workoutId);if(w)(data[s.date]??={done:[],planned:[]}).planned.push(w.name);});
    let html=days.map(d=>`<div class="v9-calendar-head">${d.slice(0,3)}</div>`).join('');for(let i=0;i<offset;i++)html+='<div class="v9-calendar-cell empty"></div>';
    for(let d=1;d<=count;d++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,item=data[date],isToday=date===today();html+=`<button class="v9-calendar-cell ${item?.done.length?'is-done':''} ${item?.planned.length?'is-planned':''} ${isToday?'is-today':''}" data-v9-date="${date}" type="button" aria-label="${date}${item?.done.length?`, ${item.done.length} saved sessions`:''}${item?.planned.length?`, ${item.planned.length} planned workouts`:''}"><b>${d}</b>${item?.done.length?'<i>●</i>':''}${item?.planned.length?'<em>◆</em>':''}</button>`;}
    host.innerHTML=html;
  }
  function showCalendarDate(date){
    const saved=state.logs.filter(l=>l.date===date),planned=(state.customSchedule||[]).filter(s=>s.date===date).map(s=>state.customWorkouts.find(w=>w.id===s.workoutId)?.name).filter(Boolean);
    const host=$('#v9CalendarDetail');if(host)host.innerHTML=`<b>${esc(date)}</b><p>${saved.length?saved.map(l=>`Saved: ${esc(l.workoutName||l.day)} (${l.setsDone||0} sets)`).join('<br>'):'No saved sessions.'}</p><p>${planned.length?planned.map(n=>`Planned: ${esc(n)}`).join('<br>'):'No custom workouts scheduled.'}</p>`;
  }
  function renderReports(){
    const host=$('#v9Reports');if(!host)return;
    const now=new Date(),thisMonth=state.logs.filter(l=>inCurrentMonth(l.date)),lastMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1),lastKey=`${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`,lastMonth=state.logs.filter(l=>String(l.date||'').startsWith(lastKey));
    const unique=uniqueExercises(thisMonth).size,sets=thisMonth.reduce((n,l)=>n+(Number(l.setsDone)||0),0),daysActive=new Set(thisMonth.map(l=>l.date)).size;
    const minutes=thisMonth.reduce((n,l)=>n+(Number(l.durationSeconds)||0),0)/60;
    const val=(n,s)=>`${n} ${s}${n===1?'':'s'}`;
    host.innerHTML=`<div class="v9-report-grid"><article><small>THIS MONTH</small><b>${val(thisMonth.length,'session')}</b><span>${val(daysActive,'active day')}</span></article><article><small>SETS RECORDED</small><b>${sets}</b><span>${val(unique,'different movement')}</span></article><article><small>RECORDED TIME</small><b>${minutes?Math.round(minutes)+' min':'—'}</b><span>Only saved session timers</span></article><article><small>PREVIOUS MONTH</small><b>${val(lastMonth.length,'session')}</b><span>${val(new Set(lastMonth.map(l=>l.date)).size,'active day')}</span></article></div><p class="small-note">${daysActive?`You logged activity on ${daysActive} day${daysActive===1?'':'s'} this month.`:'No activity has been logged this month yet.'} Reports describe what you recorded. A quieter month is not a failure, and the app does not expect you to increase activity.</p>`;
  }
  function renderRecommendation(){
    const host=$('#v9RecommendationWidget');if(!host)return;
    const cards=$$('#xGuideLibrary .guide-card');if(!cards.length){host.innerHTML='<p>Open the exercise guide to load movement recommendations.</p>';return;}
    const preferred=profile().preferredCategories||[];const equipment=profile().equipment||['Bodyweight'];
    const logs=state.logs.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const lastUsed=new Map();logs.forEach(l=>(l.exerciseStats||[]).forEach(e=>{if(e.name&&!lastUsed.has(e.name))lastUsed.set(e.name,l.date);}));
    const candidates=cards.map(card=>({card,name:card.querySelector('b')?.textContent.trim()||'',meta:card.querySelector('small')?.textContent||''})).filter(x=>x.name).filter(x=>{const m=x.meta.toLowerCase();return (/none/.test(m)&&equipment.includes('Bodyweight'))||(/band/.test(m)&&equipment.includes('Resistance bands'))||(/dumbbell/.test(m)&&equipment.includes('Dumbbells'))||(/chair|stable/.test(m)&&equipment.includes('Stable chair'))||(/pull-up|pull up/.test(m)&&equipment.includes('Pull-up bar'));});
    candidates.sort((a,b)=>{const ca=preferred.findIndex(p=>a.meta.toLowerCase().includes(p.toLowerCase())),cb=preferred.findIndex(p=>b.meta.toLowerCase().includes(p.toLowerCase()));const ra=ca<0?99:ca,rb=cb<0?99:cb;if(ra!==rb)return ra-rb;return String(lastUsed.get(a.name)||'0000-00-00').localeCompare(String(lastUsed.get(b.name)||'0000-00-00'));});
    const pick=candidates.find(x=>!lastUsed.has(x.name))||candidates[0];if(!pick){host.innerHTML='<b>No match yet</b><p>Update your available equipment in Settings to get better movement suggestions.</p>';return;}
    const pref=preferred.find(p=>pick.meta.toLowerCase().includes(p.toLowerCase()));const reason=pref?`Matches your ${pref.toLowerCase()} movement preference and selected equipment.`:'Matches the equipment you selected in your profile.';
    host.innerHTML=`<b>${esc(pick.name)}</b><p>${esc(reason)}</p><small>Suggested from the exercise guide. Review the instructions and use a comfortable option.</small><button class="btn btn-outline btn-small" type="button" data-v9-open-guide="${esc(pick.name)}">View movement</button>`;
  }
  function renderWeeklyBrief(){
    const logs=state.logs.filter(l=>{const d=parseDate(l.date);const start=new Date();start.setDate(start.getDate()-6);start.setHours(0,0,0,0);return d&&d>=start&&l.date<=today();});
    const host=$('#v9WeeklyWidget');if(!host)return;
    const sets=logs.reduce((n,l)=>n+(Number(l.setsDone)||0),0),daysActive=new Set(logs.map(l=>l.date)).size;
    host.innerHTML=`<b>${logs.length} saved sessions in the last 7 days</b><p>${sets} sets recorded across ${daysActive} active day${daysActive===1?'':'s'}.</p><small>Use this as a record, not a weekly quota.</small>`;
  }
  function renderV9Dashboard(){
    renderGoals();renderAchievements();renderWeeklyBrief();renderProfile();applyDashboardProfile();renderRecommendation();
    const host=$('#v9DashboardGrid');if(!host)return;
    const widgets=[...host.children];const prefs=state.v9.dashboard;const order=prefs.order||[];
    widgets.sort((a,b)=>{const ai=order.indexOf(a.dataset.v9Widget),bi=order.indexOf(b.dataset.v9Widget);return (ai<0?999:ai)-(bi<0?999:bi);}).forEach(el=>host.append(el));
    widgets.forEach(el=>{const id=el.dataset.v9Widget;el.hidden=(prefs.hidden||[]).includes(id);el.classList.toggle('v9-widget-wide',prefs.sizes?.[id]==='wide');});
  }
  function loadSessionFeedback(){const d=typeof dailyData==='function'?dailyData():{};const a=$('#v9SessionEffort'),b=$('#v9SessionNote');if(a&&document.activeElement!==a)a.value=d.sessionFeedback||'';if(b&&document.activeElement!==b)b.value=d.sessionNote||'';}
  function renderV9All(){ensure();renderProfile();renderGoals();renderAchievements();renderXpLedger();renderProgressTimeline();renderProgressTrends();renderMuscleActivity();renderCalendar();renderReports();renderV9Dashboard();loadSessionFeedback();}
  function mount(){
    // Profile and preference controls.
    const settings=$('#settingsView .settings-grid');
    if(settings&&!$('#v9ProfilePanel'))settings.insertAdjacentHTML('afterbegin',`
      <section class="panel x-settings-panel" id="v9ProfilePanel"><div class="v9-panel-title"><div><p class="eyebrow">YOUR TRAINING PROFILE</p><h3>Personal preferences</h3></div><span class="pill" id="v9ProfileBadge">Getting Started</span></div>
        <label class="setting-row">Profile label<input id="v9ProfileLabel" maxlength="32" placeholder="My training profile"></label>
        <div class="form-two"><label>Experience<select id="v9Experience"><option>Getting started</option><option>Some experience</option><option>Experienced</option></select></label><label>Preferred session length<select id="v9SessionLength"><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label></div>
        <div class="v9-pref-grid"><fieldset id="v9PreferredDays"><legend>Preferred training days</legend>${days.map(d=>`<label><input type="checkbox" value="${d}"> ${d.slice(0,3)}</label>`).join('')}</fieldset><fieldset id="v9Equipment"><legend>Equipment available</legend>${['Bodyweight','Resistance bands','Dumbbells','Pull-up bar','Stable chair'].map(d=>`<label><input type="checkbox" value="${d}"> ${d}</label>`).join('')}</fieldset><fieldset id="v9PreferredCategories"><legend>Movement preferences</legend>${['Push','Pull','Shoulders','Legs','Core','Mobility','Recovery'].map(d=>`<label><input type="checkbox" value="${d}"> ${d}</label>`).join('')}</fieldset></div>
        <label class="setting-row">Profile title<select id="v9ProfileTitle"><option value="">Use current level title</option></select></label><label class="setting-row">Default personal focus (optional)<input id="v9GoalTitle" maxlength="70" placeholder="e.g. Learn the exercise library"></label>
        <p class="small-note" id="v9ProfileSummary">Your preferences stay on this device and can be changed any time.</p><button class="btn btn-primary btn-small" id="v9SaveProfile">Save profile preferences</button>
      </section>`);
    // Dashboard personalization cards (each is independently movable, resizable and hideable).
    const dash=$('#workoutView');if(dash&&!$('#v9DashboardGrid'))dash.insertAdjacentHTML('beforeend',`
      <section class="v9-dashboard-section"><div class="v9-panel-title"><div><p class="eyebrow">PERSONAL HOME</p><h2>Your personal training space</h2><p class="small-note">Move cards with drag-and-drop or the arrow controls. Hide or widen cards whenever you like.</p></div><button class="btn btn-outline btn-small" id="v9ResetDashboard">Reset cards</button></div>
        <div id="v9DashboardGrid" class="v9-dashboard-grid">
          <article class="panel v9-widget" data-v9-widget="weekly" draggable="true"><div class="v9-widget-head"><b>Weekly brief</b><span><button data-v9-move="up" aria-label="Move card up">↑</button><button data-v9-move="down" aria-label="Move card down">↓</button><button data-v9-size aria-label="Resize card">↔</button><button data-v9-hide aria-label="Hide card">×</button></span></div><div id="v9WeeklyWidget"></div></article>
          <article class="panel v9-widget" data-v9-widget="goal" draggable="true"><div class="v9-widget-head"><b>Personal milestone</b><span><button data-v9-move="up" aria-label="Move card up">↑</button><button data-v9-move="down" aria-label="Move card down">↓</button><button data-v9-size aria-label="Resize card">↔</button><button data-v9-hide aria-label="Hide card">×</button></span></div><div id="v9GoalWidget"></div></article>
          <article class="panel v9-widget" data-v9-widget="achievement" draggable="true"><div class="v9-widget-head"><b>Achievement showcase</b><span><button data-v9-move="up" aria-label="Move card up">↑</button><button data-v9-move="down" aria-label="Move card down">↓</button><button data-v9-size aria-label="Resize card">↔</button><button data-v9-hide aria-label="Hide card">×</button></span></div><div id="v9AchievementWidget"></div></article>
          <article class="panel v9-widget" data-v9-widget="brief" draggable="true"><div class="v9-widget-head"><b>Training preferences</b><span><button data-v9-move="up" aria-label="Move card up">↑</button><button data-v9-move="down" aria-label="Move card down">↓</button><button data-v9-size aria-label="Resize card">↔</button><button data-v9-hide aria-label="Hide card">×</button></span></div><div><b id="v9ProfileDashboardName">My training profile</b><p id="v9ProfileDashboardInfo">Your preferred schedule and movements.</p><small id="v9ProfileDashboardTitle"></small></div></article>
          <article class="panel v9-widget" data-v9-widget="recommendation" draggable="true"><div class="v9-widget-head"><b>Movement recommendation</b><span><button data-v9-move="up" aria-label="Move card up">↑</button><button data-v9-move="down" aria-label="Move card down">↓</button><button data-v9-size aria-label="Resize card">↔</button><button data-v9-hide aria-label="Hide card">×</button></span></div><div id="v9RecommendationWidget"></div></article>
        </div>
      </section>`);
    // Add feedback and session note fields to the workout screen.
    const phase=$('#phaseGrid');if(phase&&!$('#v9SessionFeedback'))phase.insertAdjacentHTML('afterend',`<section class="panel v9-session-panel" id="v9SessionFeedback"><div class="panel-heading"><div><p class="eyebrow">SESSION REFLECTION</p><h3>How did this session feel?</h3></div><span class="panel-icon">◎</span></div><div class="form-two"><label>Session feedback<select id="v9SessionEffort"><option value="">Prefer not to say</option><option>Comfortable</option><option>About right</option><option>Tiring</option><option>Interrupted / adjusted</option></select></label><label>Session note<input id="v9SessionNote" maxlength="180" placeholder="Optional note for your history"></label></div><p class="small-note">This is for reflection only. You never need to make a session harder or complete a target.</p></section>`);
    // Progress and insights pages.
    const progress=$('#progressView');if(progress&&!$('#v9ProgressExtras'))progress.insertAdjacentHTML('beforeend',`
      <section class="panel" id="v9ProgressExtras"><div class="panel-heading"><div><p class="eyebrow">PERSONAL MILESTONES</p><h3>Your goals</h3></div><span class="pill">OPTIONAL</span></div><div id="v9GoalsList" class="v9-goals-list"></div><div class="v9-goal-form"><input id="v9GoalName" maxlength="60" placeholder="Name a personal milestone"><select id="v9GoalMetric"><option value="sessions">Saved sessions this month</option><option value="activeDays">Active days this month</option><option value="newExercises">Different movements this month</option><option value="notes">Sessions with notes this month</option></select><input id="v9GoalTarget" type="number" min="1" max="30" value="3" aria-label="Goal target"><button class="btn btn-primary btn-small" id="v9AddGoal">Add milestone</button></div></section>
      <div class="two-col"><section class="panel"><div class="panel-heading"><div><p class="eyebrow">XP HISTORY</p><h3>Where your XP came from</h3></div></div><div id="v9XpLedger" class="v9-ledger"></div></section><section class="panel"><div class="panel-heading"><div><p class="eyebrow">ACHIEVEMENTS</p><h3>Achievement collection</h3></div><span class="pill" id="v9AchievementCount"></span></div><div id="v9AchievementList" class="v9-achievement-list"></div></section></div>
      <section class="panel"><div class="panel-heading"><div><p class="eyebrow">EXERCISE PROGRESSION</p><h3>Movement history</h3></div><select id="v9ProgressExercise" aria-label="Choose exercise"></select></div><div id="v9ProgressTrend"></div></section>
      <section class="panel"><div class="panel-heading"><div><p class="eyebrow">PROGRESS TIMELINE</p><h3>Important moments</h3></div></div><div id="v9ProgressTimeline" class="v9-timeline"></div></section>`);
    const plannerIntro=$('#plannerView .planner-intro');if(plannerIntro&&!$('#v9PlannerPrefHint'))plannerIntro.insertAdjacentHTML('beforeend','<p id="v9PlannerPrefHint" class="small-note"></p>');
    const insights=$('#insightsView');if(insights&&!$('#v9InsightsExtras'))insights.insertAdjacentHTML('beforeend',`
      <section class="panel"><div class="panel-heading"><div><p class="eyebrow">ACTIVITY MAP</p><h3>Movement categories · last 30 days</h3></div></div><div id="v9MuscleActivity" class="v9-muscle-list"></div><p class="small-note">Counts are based on exercise entries and completed sets in your saved sessions. They are not body-composition measurements.</p></section>
      <section class="panel"><div class="panel-heading"><div><p class="eyebrow">CALENDAR</p><h3>Completed and planned sessions</h3></div><div class="inline-controls"><button class="btn btn-quiet btn-small" id="v9CalendarPrev" aria-label="Previous month">←</button><b id="v9CalendarLabel"></b><button class="btn btn-quiet btn-small" id="v9CalendarNext" aria-label="Next month">→</button></div></div><div id="v9Calendar" class="v9-calendar"></div><div id="v9CalendarDetail" class="v9-calendar-detail">Choose a date to see saved and planned sessions.</div><div class="v9-calendar-legend"><span>● Completed</span><span>◆ Planned</span></div></section>
      <section class="panel"><div class="panel-heading"><div><p class="eyebrow">MONTHLY & WEEKLY REPORT</p><h3>Activity summary</h3></div></div><div id="v9Reports"></div></section>`);
    // Guide filters and a preparation preview dialog.
    const guide=$('#guideView .panel');if(guide&&!$('#v9GuideFilters'))guide.querySelector('.panel-heading')?.insertAdjacentHTML('beforeend',`<div id="v9GuideFilters" class="v9-guide-filters"><select id="v9EquipmentFilter" aria-label="Filter by equipment"><option value="all">All equipment</option><option value="none">No equipment</option><option value="available">My available equipment</option></select><label><input type="checkbox" id="v9FavoritesOnly"> Favorites only</label></div>`);
    if(!$('#v9PreviewDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog class="modal" id="v9PreviewDialog"><form method="dialog"><div class="modal-head"><div><p class="eyebrow">SESSION PREVIEW</p><h2 id="v9PreviewTitle">Get ready</h2></div><button class="icon-btn" value="cancel" aria-label="Close">✕</button></div><p class="small-note" id="v9PreviewMeta"></p><div id="v9PreviewExercises" class="v9-preview-list"></div><p class="small-note">Review the plan, equipment and time preference before starting. You can still pause, adjust or stop at any time.</p><div class="modal-actions"><button class="btn btn-quiet" value="cancel">Not now</button><button class="btn btn-primary" id="v9ConfirmStart" type="button">Start session</button></div></form></dialog>`);
    // Settings help and dashboard layout guide.
    const diag=$('#settingsView .settings-grid');if(diag&&!$('#v9QualityPanel'))diag.insertAdjacentHTML('beforeend',`<section class="panel x-settings-panel" id="v9QualityPanel"><h3>Version 9 dashboard & quality</h3><p class="small-note">Dashboard cards can be dragged, reordered, widened or hidden. The quality check validates your local data and key Version 9 features.</p><button class="btn btn-outline btn-small" id="v9ShowDashboardCards">Manage dashboard cards</button><button class="btn btn-outline btn-small" id="v9RunQuality">Run Version 9 quality check</button><p class="small-note" id="v9QualityResult">Quality check has not run yet.</p></section>`);
    if(!$('#v9DashboardDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog class="modal" id="v9DashboardDialog"><form method="dialog"><div class="modal-head"><h2>Dashboard cards</h2><button class="icon-btn" value="cancel" aria-label="Close">✕</button></div><div id="v9DashboardToggles" class="v9-dashboard-toggles"></div><p class="small-note">You can also drag cards on the dashboard. Hiding a card never deletes your data.</p><div class="modal-actions"><button class="btn btn-primary" value="cancel">Done</button></div></form></dialog>`);
    // Optional rest presets, using the app's existing timer.
    const tools=$('.tool-panel');if(tools&&!$('#v9RestPresets'))tools.insertAdjacentHTML('beforeend',`<div class="v9-rest-presets" id="v9RestPresets"><label>Quick rest timer</label><div><button type="button" data-v9-rest="30">30s</button><button type="button" data-v9-rest="45">45s</button><button type="button" data-v9-rest="60">60s</button><button type="button" data-v9-rest="90">90s</button></div></div>`);
    // Version labels.
    document.title='NEXORA FITNESS 9.7.0 — Training & Progress';$('#xAppVersion')?.replaceChildren(document.createTextNode('Version 9.7.0'));
    const footer=$('.app-footer');if(footer)footer.firstElementChild.textContent='NEXORA FITNESS 9.7.0 / HEALTH & TRAINING';
  }
  function renderDashboardControls(){
    const host=$('#v9DashboardToggles');if(!host)return;
    host.innerHTML=$$('#v9DashboardGrid .v9-widget').map(el=>`<label class="v9-toggle-row"><input type="checkbox" data-v9-card-toggle="${el.dataset.v9Widget}" ${!(state.v9.dashboard.hidden||[]).includes(el.dataset.v9Widget)?'checked':''}> ${esc(el.querySelector('.v9-widget-head>b')?.textContent||el.dataset.v9Widget)}</label>`).join('');
  }
  function applyDashboardProfile(){const p=profile();const name=$('#v9ProfileDashboardName');if(name)name.textContent=p.label||'My training profile';const info=$('#v9ProfileDashboardInfo');if(info)info.textContent=`Preferred days: ${(p.preferredDays||[]).map(x=>x.slice(0,3)).join(', ')||'Flexible'} · ${p.sessionLength||45} minutes`;const t=$('#v9ProfileDashboardTitle');if(t)t.textContent=p.selectedTitle||state.unlockedTitles?.at(-1)||'Getting Started';}
  function startPreview(id,scheduleId){
    const w=(state.customWorkouts||[]).find(x=>x.id===id);if(!w)return;
    pendingPreview={id,scheduleId:scheduleId||null};$('#v9PreviewTitle').textContent=w.name;
    $('#v9PreviewMeta').textContent=`${w.exercises.length} exercises · ${w.exercises.reduce((n,e)=>n+(Number(e.sets)||0),0)} planned sets · Preferred session length: ${profile().sessionLength||45} minutes`;
    $('#v9PreviewExercises').innerHTML=w.exercises.map((e,i)=>`<div><b>${i+1}. ${esc(e.name)}</b><small>${Number(e.sets)||1} × ${Number(e.reps)||0} ${esc(e.unit==='sec'?'seconds':e.unit==='min'?'minutes':'reps')} · ${Number(e.restSeconds)||0}s rest · ${esc(e.phase||'Strength')}</small></div>`).join('');
    $('#v9PreviewDialog').showModal();
  }
  function confirmPreview(){if(!pendingPreview)return;const target=pendingPreview;pendingPreview=null;$('#v9PreviewDialog').close();skipPreview=true;let selector=target.scheduleId?`[data-v81-action="start-scheduled"][data-id="${CSS.escape(target.id)}"][data-schedule="${CSS.escape(target.scheduleId)}"]`:`[data-v81-action="start"][data-id="${CSS.escape(target.id)}"]`;const btn=$(selector);if(btn)btn.click();else{skipPreview=false;note('That workout is no longer available. Refresh the routine list and try again.');}}
  function renderGuideFilters(){
    $$('#xGuideLibrary .guide-card').forEach(card=>{
      if(!card.dataset.v9Decorated){card.dataset.v9Decorated='true';const name=card.querySelector('b')?.textContent.trim();if(!name)return;
        const fav=document.createElement('button');fav.type='button';fav.className='v9-fav-btn';fav.dataset.v9Favorite=name;fav.setAttribute('aria-label',`Toggle ${name} favorite`);fav.textContent=state.v9.favorites.includes(name)?'★ Saved':'☆ Favorite';
        const altText=[...card.querySelectorAll('details p')].map(x=>x.textContent).find(x=>x.toLowerCase().includes('alternative:'))||'';const alt=altText.split(':').slice(1).join(':').trim();
        const tools=document.createElement('div');tools.className='v9-guide-card-actions';tools.append(fav);
        if(alt){const b=document.createElement('button');b.type='button';b.className='mini-btn';b.dataset.v9Alternative=alt;b.textContent=`Add alternative: ${alt}`;tools.append(b);}
        card.append(tools);
      }
      card.querySelector('.v9-fav-btn')?.replaceChildren(document.createTextNode(state.v9.favorites.includes(card.querySelector('.v9-fav-btn').dataset.v9Favorite)?'★ Saved':'☆ Favorite'));
    });
    filterGuideCards();
  }
  function filterGuideCards(){
    const q=($('#xGuideSearch')?.value||'').trim().toLowerCase(),equipment=$('#v9EquipmentFilter')?.value||'all',favOnly=$('#v9FavoritesOnly')?.checked;
    $$('#xGuideLibrary .guide-card').forEach(card=>{
      const text=card.textContent.toLowerCase(),name=card.querySelector('b')?.textContent.trim()||'',meta=card.querySelector('small')?.textContent.toLowerCase()||'';
      const matchQ=!q||text.includes(q),matchFav=!favOnly||state.v9.favorites.includes(name);
      const matchEquip=equipment==='all'||(equipment==='none'&&/none|no equipment/.test(meta))||(equipment==='available'&&(()=>{const e=profile().equipment||[];return (/none/.test(meta)&&e.includes('Bodyweight'))||(/band/.test(meta)&&e.includes('Resistance bands'))||(/dumbbell/.test(meta)&&e.includes('Dumbbells'))||(/pull-up|pull up/.test(meta)&&e.includes('Pull-up bar'))||(/chair|stable/.test(meta)&&e.includes('Stable chair'));})());
      card.hidden=!(matchQ&&matchFav&&matchEquip);
    });
  }
  function addAlternative(name){
    const d=getDayName(),target=state.plan[d]||(state.plan[d]=[]);if(target.some(e=>e.name===name)){note('That movement is already in today’s weekly plan.');return;}
    target.push({id:`v9-alt-${Date.now().toString(36)}`,name,phase:'Strength',sets:2,reps:8,unit:'reps',category:'General',equipment:'Check the movement guide',difficulty:'Beginner-friendly',restSeconds:state.settings.rest||60,cues:['Review the exercise guide before starting.','Use a comfortable range and controlled movement.']});saveState();if(typeof renderWorkout==='function')renderWorkout();note(`${name} added to today’s weekly plan.`);
  }
  function decorateHistory(){
    const used=new Set();
    $$('#historyList .history-item').forEach((detail)=>{
      if(detail.querySelector('.v9-history-note'))return;
      const summary=detail.querySelector('summary b')?.textContent||'';
      const log=state.logs.slice().reverse().find(l=>!used.has(l.id)&&summary.includes(l.date)&&summary.includes(l.workoutName||l.day||''));
      if(!log)return;used.add(log.id);
      if(log.sessionFeedback||log.sessionNote){const p=document.createElement('p');p.className='v9-history-note';p.innerHTML=`<b>Session reflection:</b> ${esc(log.sessionFeedback||'Not rated')}${log.sessionNote?` · ${esc(log.sessionNote)}`:''}`;detail.append(p);}
    });
  }
  function saveFeedbackWrapper(){
    const original=window.saveWorkout;if(typeof original!=='function'||original.__v9Wrapped)return;
    const wrapped=function(...args){
      const before=state.logs.length;let data={},sessionData=null;try{sessionData=typeof dailyData==='function'?dailyData():null;data={sessionFeedback:$('#v9SessionEffort')?.value||sessionData?.sessionFeedback||'',sessionNote:$('#v9SessionNote')?.value.trim()||sessionData?.sessionNote||'',setDetails:clone(sessionData?.setNotes||{})};}catch{}
      const result=original.apply(this,args);
      if(state.logs.length>before){const entry=state.logs.at(-1);entry.sessionFeedback=data.sessionFeedback;entry.sessionNote=data.sessionNote.slice(0,180);if(sessionData){sessionData.sessionFeedback='';sessionData.sessionNote='';}state.v9.lastSessionFeedback={date:entry.date,feedback:entry.sessionFeedback,note:entry.sessionNote};if(Number(entry.xp)>0&&!state.v9.xpLedger.some(x=>x.sessionId===entry.id))state.v9.xpLedger.push({id:`xp-${entry.id}`,sessionId:entry.id,date:entry.date,label:entry.workoutName||entry.day||'Workout',amount:Number(entry.xp)});state.v9.xpLedger=state.v9.xpLedger.slice(-200);saveState();if($('#v9SessionNote'))$('#v9SessionNote').value='';renderXpLedger();renderProgressTimeline();renderAchievements();renderGoals();renderReports();decorateHistory();}
      return result;
    };wrapped.__v9Wrapped=true;window.saveWorkout=wrapped;
  }
  function qualityChecks(){
    const checks=[];const ids=state.logs.map(l=>l.id);checks.push(['Unique saved session IDs',new Set(ids).size===ids.length]);
    checks.push(['Custom workout structure',(state.customWorkouts||[]).every(w=>w&&w.id&&w.name&&Array.isArray(w.exercises))]);
    checks.push(['Schedule references',(state.customSchedule||[]).every(s=>(state.customWorkouts||[]).some(w=>w.id===s.workoutId))]);
    checks.push(['Goal structure',state.v9.goals.every(g=>g.id&&g.title&&Number(g.target)>0)]);
    checks.push(['Profile preferences',Array.isArray(profile().preferredDays)&&Array.isArray(profile().equipment)]);
    checks.push(['Dashboard widget structure',!!$('#v9DashboardGrid')&&$$('#v9DashboardGrid .v9-widget').length===5]);
    checks.push(['Calendar and reports',!!$('#v9Calendar')&&!!$('#v9Reports')]);
    checks.push(['XP ledger integrity',state.v9.xpLedger.every(x=>Number.isFinite(Number(x.amount))&&x.sessionId)]);
    checks.push(['App scripts loaded',window.__vtaperVersion81Loaded===true&&window.__vtaperVersion9Loaded===true&&window.__vtaperVersion91Loaded===true]);
    checks.push(['Backup export function',typeof window.exportBackup==='function'||typeof exportBackup==='function']);
    const pass=checks.filter(x=>x[1]).length,host=$('#v9QualityResult');if(host)host.textContent=`Version 9.6.2 local quality check: ${pass}/${checks.length} passed. ${checks.filter(x=>!x[1]).map(x=>x[0]).join('; ')||'No local data-structure issues found.'}`;
    return {checks,pass,total:checks.length};
  }
  function bind(){
    $('#v9SaveProfile')?.addEventListener('click',saveProfile);
    $('#v9AddGoal')?.addEventListener('click',addGoal);
    $('#v9GoalName')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addGoal();}});
    $('#v9GoalsList')?.addEventListener('click',e=>{const b=e.target.closest('[data-v9-delete-goal]');if(!b)return;state.v9.goals=state.v9.goals.filter(g=>g.id!==b.dataset.v9DeleteGoal);saveState();renderGoals();renderProgressTimeline();});
    $('#v9ProgressExercise')?.addEventListener('change',renderProgressTrends);
    $('#v9CalendarPrev')?.addEventListener('click',()=>{calendarOffset--;renderCalendar();});
    $('#v9CalendarNext')?.addEventListener('click',()=>{if(calendarOffset<0){calendarOffset++;renderCalendar();}});
    $('#v9Calendar')?.addEventListener('click',e=>{const b=e.target.closest('[data-v9-date]');if(b)showCalendarDate(b.dataset.v9Date);});
    $('#v9EquipmentFilter')?.addEventListener('change',filterGuideCards);$('#v9FavoritesOnly')?.addEventListener('change',filterGuideCards);$('#xGuideSearch')?.addEventListener('input',filterGuideCards);
    $('#xGuideLibrary')?.addEventListener('click',e=>{const f=e.target.closest('[data-v9-favorite]');if(f){const name=f.dataset.v9Favorite;if(state.v9.favorites.includes(name))state.v9.favorites=state.v9.favorites.filter(x=>x!==name);else state.v9.favorites.push(name);saveState();renderGuideFilters();renderAchievements();return;}const a=e.target.closest('[data-v9-alternative]');if(a)addAlternative(a.dataset.v9Alternative);});
    $('#v9DashboardGrid')?.addEventListener('dragstart',e=>{const card=e.target.closest('.v9-widget');if(!card)return;e.dataTransfer.setData('text/plain',card.dataset.v9Widget);e.dataTransfer.effectAllowed='move';card.classList.add('dragging');});
    $('#v9DashboardGrid')?.addEventListener('dragend',e=>e.target.closest('.v9-widget')?.classList.remove('dragging'));
    $('#v9DashboardGrid')?.addEventListener('dragover',e=>{if(e.target.closest('.v9-widget'))e.preventDefault();});
    $('#v9DashboardGrid')?.addEventListener('drop',e=>{const target=e.target.closest('.v9-widget');if(!target)return;e.preventDefault();const id=e.dataTransfer.getData('text/plain'),source=$(`[data-v9-widget="${CSS.escape(id)}"]`);if(source&&source!==target){const r=target.getBoundingClientRect();hostInsert(source,target,e.clientY>r.top+r.height/2);state.v9.dashboard.order=$$('#v9DashboardGrid .v9-widget').map(x=>x.dataset.v9Widget);saveState();}});
    $('#v9DashboardGrid')?.addEventListener('click',e=>{const card=e.target.closest('.v9-widget');if(!card)return;const id=card.dataset.v9Widget;if(e.target.closest('[data-v9-hide]')){const hidden=new Set(state.v9.dashboard.hidden||[]);hidden.add(id);state.v9.dashboard.hidden=[...hidden];saveState();renderV9Dashboard();renderDashboardControls();}else if(e.target.closest('[data-v9-size]')){state.v9.dashboard.sizes[id]=state.v9.dashboard.sizes[id]==='wide'?'normal':'wide';saveState();renderV9Dashboard();}else if(e.target.closest('[data-v9-move]')){const list=$$('#v9DashboardGrid .v9-widget'),i=list.indexOf(card),up=e.target.closest('[data-v9-move]').dataset.v9Move==='up',j=up?i-1:i+1;if(j>=0&&j<list.length){hostInsert(card,list[j],up);state.v9.dashboard.order=$$('#v9DashboardGrid .v9-widget').map(x=>x.dataset.v9Widget);saveState();}}});
    $('#v9ResetDashboard')?.addEventListener('click',()=>{state.v9.dashboard=clone(v9Default.dashboard);saveState();renderV9Dashboard();renderDashboardControls();note('Dashboard layout reset.');});
    $('#v9ShowDashboardCards')?.addEventListener('click',()=>{renderDashboardControls();$('#v9DashboardDialog').showModal();});
    $('#v9DashboardToggles')?.addEventListener('change',e=>{const id=e.target.dataset.v9CardToggle;if(!id)return;const hidden=new Set(state.v9.dashboard.hidden||[]);if(e.target.checked)hidden.delete(id);else hidden.add(id);state.v9.dashboard.hidden=[...hidden];saveState();renderV9Dashboard();});
    $('#v9ConfirmStart')?.addEventListener('click',confirmPreview);
    $('#xConfirmBackupImport')?.addEventListener('click',()=>setTimeout(()=>{ensure();renderV9All();renderDashboardControls();renderGuideFilters();decorateHistory();},80));
    $('#clearDataBtn')?.addEventListener('click',()=>setTimeout(()=>{ensure();renderV9All();renderDashboardControls();},80));
    document.addEventListener('click',e=>{const b=e.target.closest('[data-v81-action="start"],[data-v81-action="start-scheduled"]');if(!b)return;if(skipPreview){skipPreview=false;return;}e.preventDefault();e.stopImmediatePropagation();startPreview(b.dataset.id,b.dataset.schedule||null);},true);
    $('#v9RestPresets')?.addEventListener('click',e=>{const b=e.target.closest('[data-v9-rest]');if(!b)return;const sec=Number(b.dataset.v9Rest);if(typeof startTimer==='function')startTimer(sec,'REST');});
    $('#v9SessionFeedback')?.addEventListener('change',e=>{const d=typeof dailyData==='function'?dailyData():null;if(!d)return;d.sessionFeedback=$('#v9SessionEffort')?.value||'';d.sessionNote=$('#v9SessionNote')?.value.trim()||'';saveState();});
    $('#v9SessionNote')?.addEventListener('input',()=>{const d=typeof dailyData==='function'?dailyData():null;if(d){d.sessionNote=$('#v9SessionNote').value.slice(0,180);saveState();}});
    $('#v9DashboardGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-v9-open-guide]');if(b){setTab('guide');if($('#xGuideSearch')){$('#xGuideSearch').value=b.dataset.v9OpenGuide;$('#xGuideSearch').dispatchEvent(new Event('input',{bubbles:true}));}}});
    $('#v9RunQuality')?.addEventListener('click',()=>{const r=qualityChecks();note(`Version 9 quality check: ${r.pass}/${r.total} passed.`);});
    // Keep app sections refreshed after their existing navigation and render cycles.
    const originalSetTab=window.setTab;if(typeof originalSetTab==='function'&&!originalSetTab.__v9Wrapped){const next=function(name){const r=originalSetTab.apply(this,arguments);setTimeout(()=>{renderV9All();renderGuideFilters();decorateHistory();},0);return r;};next.__v9Wrapped=true;window.setTab=next;}
    const originalProgress=window.renderProgress;if(typeof originalProgress==='function'&&!originalProgress.__v9Wrapped){const next=function(){const r=originalProgress.apply(this,arguments);renderV9All();return r;};next.__v9Wrapped=true;window.renderProgress=next;}
    saveFeedbackWrapper();
    if($('#historyList')){historyObserver=new MutationObserver(()=>decorateHistory());historyObserver.observe($('#historyList'),{childList:true,subtree:true});}
    if($('#xGuideLibrary')){libraryObserver=new MutationObserver(()=>renderGuideFilters());libraryObserver.observe($('#xGuideLibrary'),{childList:true,subtree:false});}
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){['v9PreviewDialog','v9DashboardDialog'].forEach(id=>{const d=$('#'+id);if(d?.open)d.close();});}});
  }
  function hostInsert(source,target,after){if(after)target.after(source);else target.before(source);}
  function init(){
    ensure();mount();bind();renderV9All();renderDashboardControls();applyDashboardProfile();
    // Re-apply custom profile title and dashboard widgets after the legacy app layer's first render.
    setTimeout(()=>{saveFeedbackWrapper();renderV9All();renderGuideFilters();decorateHistory();qualityChecks();},120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
