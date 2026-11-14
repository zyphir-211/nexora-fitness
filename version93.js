/* NEXORA FITNESS 9.7.0 — Training Flow. Adds a focused, resumable workout experience on top of 9.2. */
(() => {
  'use strict';
  if (window.__vtaperVersion93Loaded) return;
  window.__vtaperVersion93Loaded = true;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (value, min, max, fallback = min) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  let selectedExercise = 0;
  let lastSetAction = null;
  let timerPaint = 0;
  let trainingDialog = null;
  let previewDialog = null;
  let completionDialog = null;
  let replaceDialog = null;
  let skipDialog = null;
  let plannedSnapshot = null;
  let focusReturn = null;

  function activeRoutine() {
    const run = state.activeCustomRun;
    if (!run || run.date !== todayKey()) return null;
    return (state.customWorkouts || []).find(w => w.id === run.workoutId) || null;
  }
  function sessionName() {
    return activeRoutine()?.name || `${activeDay()} session`;
  }
  function sessionData() {
    const data = dailyData();
    data.done ||= {};
    data.timestamps ||= {};
    data.actualReps ||= {};
    data.setNotes ||= {};
    data.setLoad ||= {};
    data.notes ||= {};
    data.skipReasons ||= {};
    return data;
  }
  function plan() { return getPlan(); }
  function ensurePlanSnapshot() {
    const d=sessionData();
    if(!Array.isArray(d.v93Plan)) d.v93Plan=plan().map(ex=>({...ex,cues:[...(ex.cues||[])]}));
    saveState();
    return d.v93Plan;
  }
  function plannedCount() {
    return plan().reduce((sum, ex) => sum + getEffectiveSets(ex), 0);
  }
  function completedCount() {
    const d = sessionData();
    let count = 0;
    plan().forEach((ex, i) => {
      for (let set = 0; set < getEffectiveSets(ex); set++) if (d.done[`${i}-${set}`]) count++;
    });
    return count;
  }
  function percentComplete() {
    const total = plannedCount();
    return total ? Math.round(completedCount() / total * 100) : 0;
  }
  function elapsedSeconds() {
    const d = sessionData();
    const start = Number(d.startedAt) || Date.now();
    const stop = d.v93PausedAt ? Number(d.v93PausedAt) : Date.now();
    return Math.max(0, Math.floor((stop - start) / 1000));
  }
  function elapsedLabel() {
    const sec = elapsedSeconds();
    return `${String(Math.floor(sec / 3600)).padStart(2,'0')}:${String(Math.floor(sec % 3600 / 60)).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}`;
  }
  function unitLabel(unit) { return unit === 'sec' ? 'seconds' : unit === 'min' ? 'minutes' : 'reps'; }
  function setStarted() {
    const d = sessionData();
    if (!Number(d.startedAt)) d.startedAt = Date.now();
    if (d.v93PausedAt) {
      d.startedAt += Math.max(0, Date.now() - Number(d.v93PausedAt));
      delete d.v93PausedAt;
    }
    d.v93TrainingOpened = true;
    saveState();
  }
  function hasActiveSession() {
    const d = sessionData();
    return !!state.activeCustomRun || !!Number(d.startedAt) || completedCount() > 0;
  }
  function firstIncompleteExercise() {
    const d = sessionData();
    const p = plan();
    for (let i = 0; i < p.length; i++) {
      if (Array.from({length:getEffectiveSets(p[i])}, (_, s) => d.done[`${i}-${s}`]).some(v => !v)) return i;
    }
    return Math.max(0, p.length - 1);
  }
  function firstIncompleteSet(i) {
    const d = sessionData();
    const ex = plan()[i];
    if (!ex) return -1;
    for (let s = 0; s < getEffectiveSets(ex); s++) if (!d.done[`${i}-${s}`]) return s;
    return -1;
  }
  function ensureDialogs() {
    if (!$('#v93TrainingDialog')) document.body.insertAdjacentHTML('beforeend', `
      <dialog id="v93TrainingDialog" class="v93-dialog v93-training-dialog" aria-labelledby="v93TrainingTitle">
        <div class="v93-shell">
          <header class="v93-topline">
            <div><span class="v93-kicker">NEXORA FITNESS / TRAINING</span><h2 id="v93TrainingTitle">Active workout</h2><p id="v93TrainingSubtitle">One step at a time.</p></div>
            <div class="v93-top-actions"><span class="v93-save-state" id="v93SaveState" role="status" aria-live="polite">Saved on this device</span><button type="button" class="v93-icon-button" id="v93ExitTraining" aria-label="Close workout screen and keep progress">×</button></div>
          </header>
          <section class="v93-progress-strip" aria-label="Workout progress"><div class="v93-progress-copy"><b id="v93ProgressLabel">0% complete</b><span id="v93ProgressCount">0 of 0 sets</span></div><div class="v93-progress-track"><span id="v93ProgressBar"></span></div></section>
          <div class="v93-workspace">
            <aside class="v93-exercise-rail"><div class="v93-rail-heading"><span>YOUR EXERCISES</span><small id="v93ExerciseCount">0 movements</small></div><div id="v93ExerciseRail" class="v93-exercise-list"></div><div class="v93-rail-help">Select a movement to view its sets, guidance and notes.</div></aside>
            <main class="v93-main-panel" id="v93MainPanel" tabindex="-1"></main>
            <aside class="v93-side-panel">
              <section class="v93-side-card v93-clock-card"><div class="v93-side-heading"><span>SESSION TIME</span><i>◷</i></div><strong id="v93Elapsed">00:00:00</strong><small>Time in this session</small><button type="button" id="v93PauseSession" class="v93-secondary-button">Pause session</button></section>
              <section class="v93-side-card v93-rest-card"><div class="v93-side-heading"><span>REST TIMER</span><i>◌</i></div><strong id="v93RestTime">00:00</strong><small id="v93RestLabel">Ready when you are</small><div class="v93-timer-actions"><button type="button" id="v93RestToggle" class="v93-secondary-button">Start rest</button><button type="button" id="v93RestReset" class="v93-quiet-button">Reset</button></div><div class="v93-rest-presets" aria-label="Rest timer presets"><button type="button" data-v93-rest="30">30s</button><button type="button" data-v93-rest="45">45s</button><button type="button" data-v93-rest="60">60s</button><button type="button" data-v93-rest="90">90s</button><button type="button" data-v93-rest="120">120s</button></div></section>
              <section class="v93-side-card v93-next-card"><div class="v93-side-heading"><span>UP NEXT</span><i>→</i></div><b id="v93NextName">—</b><small id="v93NextMeta">Complete this movement at your own pace.</small></section>
              <section class="v93-side-card v93-reflection-card"><label for="v93SessionFeeling">Session reflection</label><select id="v93SessionFeeling"><option value="">Choose optional feedback</option><option>Comfortable</option><option>About right</option><option>Tiring</option><option>Interrupted / adjusted</option></select><label for="v93SessionNote">Session note</label><textarea id="v93SessionNote" rows="3" maxlength="180" placeholder="Anything you want to remember…"></textarea><small>Saved locally as you type. You never need to push through discomfort.</small></section>
            </aside>
          </div>
          <footer class="v93-bottom-actions"><div class="v93-bottom-note" id="v93SessionHint">Progress saves automatically on this device.</div><div><button type="button" id="v93FinishTraining" class="v93-finish-button">Finish & review</button></div></footer>
        </div>
      </dialog>
      <dialog id="v93PreviewDialog" class="v93-dialog v93-preview-dialog" aria-labelledby="v93PreviewTitle"><div class="v93-preview-shell"><header class="v93-topline"><div><span class="v93-kicker">SESSION PREVIEW</span><h2 id="v93PreviewTitle">Get ready</h2><p id="v93PreviewSummary">Review the movements before starting.</p></div><button type="button" class="v93-icon-button" id="v93ClosePreview" aria-label="Close workout preview">×</button></header><div id="v93PreviewList" class="v93-preview-list"></div><div class="v93-preview-footer"><button type="button" class="v93-secondary-button" id="v93PreviewCancel">Not now</button><button type="button" class="v93-finish-button" id="v93BeginTraining">Begin training</button></div></div></dialog>
      <dialog id="v93CompletionDialog" class="v93-dialog v93-completion-dialog" aria-labelledby="v93CompletionTitle"><div class="v93-completion-shell"><div class="v93-completion-mark" aria-hidden="true">✓</div><span class="v93-kicker">SESSION SAVED</span><h2 id="v93CompletionTitle">Workout complete</h2><p id="v93CompletionSub">Your session has been added to your local history.</p><div id="v93CompletionStats" class="v93-completion-stats"></div><section class="v93-week-review"><b>YOUR LAST 7 DAYS</b><p id="v93WeeklySummary">Your recent activity will appear here.</p></section><div class="v93-schedule-again"><label for="v93RepeatDate">Schedule this routine again</label><div><input type="date" id="v93RepeatDate"><button type="button" class="v93-secondary-button" id="v93ScheduleAgain">Add to planner</button></div><small id="v93ScheduleStatus">Optional — scheduling does not change your weekly plan.</small></div><div class="v93-preview-footer"><button type="button" id="v93CompletionHistory" class="v93-secondary-button">Review history</button><button type="button" id="v93CompletionDone" class="v93-finish-button">Back to app</button></div></div></dialog>
      <dialog id="v93ReplaceDialog" class="v93-dialog v93-replace-dialog" aria-labelledby="v93ReplaceTitle"><div class="v93-preview-shell"><header class="v93-topline"><div><span class="v93-kicker">MOVEMENT OPTIONS</span><h2 id="v93ReplaceTitle">Replace exercise</h2><p>Choose an item from your guide or enter a different movement.</p></div><button type="button" id="v93CloseReplace" class="v93-icon-button" aria-label="Close exercise alternatives">×</button></header><label class="v93-search-label">Search exercise library<input type="search" id="v93ReplaceSearch" placeholder="Search movements…"></label><div id="v93ReplaceList" class="v93-replace-list"></div><form id="v93ReplaceCustomForm" class="v93-replace-custom"><label for="v93ReplaceCustomName">Or enter an alternative</label><div><input id="v93ReplaceCustomName" maxlength="60" placeholder="Movement name"><button class="v93-secondary-button" type="submit">Use this</button></div></form></div></dialog>
      <dialog id="v93SkipDialog" class="v93-dialog v93-skip-dialog" aria-labelledby="v93SkipTitle"><div class="v93-preview-shell"><header class="v93-topline"><div><span class="v93-kicker">SESSION ADJUSTMENT</span><h2 id="v93SkipTitle">Skip this movement</h2><p>Record why you are changing the plan. Skipping is okay.</p></div><button type="button" id="v93CloseSkip" class="v93-icon-button" aria-label="Close skip movement dialog">×</button></header><label class="v93-search-label" for="v93SkipReason">Reason for skipping<select id="v93SkipReason"><option>Equipment unavailable</option><option>Need an alternative</option><option>Not enough time</option><option>Stopped due to discomfort</option><option>Other</option></select></label><div class="v93-preview-footer"><button type="button" id="v93CancelSkip" class="v93-secondary-button">Cancel</button><button type="button" id="v93ConfirmSkip" class="v93-finish-button">Save adjustment</button></div></div></dialog>`);
    trainingDialog = $('#v93TrainingDialog'); previewDialog = $('#v93PreviewDialog'); completionDialog = $('#v93CompletionDialog'); replaceDialog = $('#v93ReplaceDialog'); skipDialog = $('#v93SkipDialog');
  }
  function mountLaunchControls() {
    const actions = $('.section-heading .heading-actions', $('#workoutView'));
    if (actions && !$('#v93OpenPreview')) {
      const button = document.createElement('button'); button.type = 'button'; button.id = 'v93OpenPreview'; button.className = 'btn btn-primary btn-small'; button.textContent = 'Start training';
      actions.insertBefore(button, actions.firstChild);
    }
    const heading = $('#workoutView .section-heading');
    if (heading && !$('#v93ResumeBanner')) {
      const banner = document.createElement('section'); banner.id = 'v93ResumeBanner'; banner.className = 'v93-resume-banner'; banner.hidden = true;
      banner.innerHTML = '<div><span class="v93-kicker">SESSION IN PROGRESS</span><b id="v93ResumeName">Your saved session</b><small id="v93ResumeDetail">Your checklist is stored on this device.</small></div><button type="button" id="v93ResumeButton" class="v93-secondary-button">Resume session</button>';
      heading.insertAdjacentElement('afterend', banner);
    }
    refreshResumeBanner();
  }
  function refreshResumeBanner() {
    const banner = $('#v93ResumeBanner'); if (!banner) return;
    const active = hasActiveSession(); banner.hidden = !active;
    if (active) {
      $('#v93ResumeName').textContent = sessionName();
      $('#v93ResumeDetail').textContent = `${completedCount()} of ${plannedCount()} sets completed · progress saved locally`;
      const button = $('#v93OpenPreview'); if (button) button.textContent = 'Continue training';
    } else {
      const button = $('#v93OpenPreview'); if (button) button.textContent = 'Start training';
    }
  }
  function makePreview() {
    const p = plan();
    $('#v93PreviewTitle').textContent = sessionName();
    $('#v93PreviewSummary').textContent = `${p.length} exercises · ${plannedCount()} planned sets · Review the movement cues before you begin.`;
    $('#v93PreviewList').innerHTML = p.map((ex, i) => `
      <article class="v93-preview-item"><div class="v93-preview-index">${String(i+1).padStart(2,'0')}</div><div><b>${esc(ex.name)}</b><small>${getEffectiveSets(ex)} sets · ${esc(ex.reps)} ${unitLabel(ex.unit)} · ${esc(ex.equipment || 'Equipment varies')}</small><p>${esc((ex.cues || ['Move with control and use a comfortable range.'])[0])}</p></div><span>${esc(ex.phase || 'Exercise')}</span></article>`).join('') || '<p>No exercises are in this session yet.</p>';
    const existing = hasActiveSession();
    $('#v93BeginTraining').textContent = existing ? 'Resume session' : 'Begin training';
  }
  function openPreview() {
    if (!plan().length) { toast('Add an exercise to this plan before starting.'); return; }
    focusReturn = document.activeElement; makePreview(); previewDialog.showModal();
  }
  function startTraining() {
    previewDialog.close(); ensurePlanSnapshot(); setStarted(); selectedExercise = firstIncompleteExercise();
    renderTraining(); trainingDialog.showModal(); $('#v93MainPanel').focus({preventScroll:true});
    clearInterval(timerPaint); timerPaint = setInterval(paintLiveStats, 500);
    paintLiveStats();
  }
  function closeTraining() {
    persistTrainingFields();
    const d=sessionData();
    if(!d.v93PausedAt){d.v93PausedAt=Date.now();if(currentTimer?.running)pauseTimer();}
    saveState(); trainingDialog.close(); clearInterval(timerPaint); refreshResumeBanner();
    if (focusReturn?.isConnected) focusReturn.focus();
    toast('Workout progress saved and paused. You can resume this session later.');
  }
  function paintLiveStats() {
    if (!trainingDialog?.open) return;
    const elapsed = $('#v93Elapsed'); if (elapsed) elapsed.textContent = elapsedLabel();
    const time = $('#v93RestTime'), label = $('#v93RestLabel');
    if (time && typeof currentTimer !== 'undefined') {
      time.textContent = formatTime(currentTimer.remaining || 0);
      label.textContent = currentTimer.remaining > 0 ? `${currentTimer.label || 'REST'} · ${currentTimer.running ? 'running' : 'paused'}` : 'Ready when you are';
      $('#v93RestToggle').textContent = currentTimer.running ? 'Pause rest' : currentTimer.remaining > 0 ? 'Resume rest' : 'Start rest';
    }
    const stateLabel = $('#v93SaveState'); if (stateLabel) stateLabel.textContent = 'Saved on this device';
  }
  function renderTraining() {
    const p = plan(), d = sessionData();
    if (!p.length) { $('#v93MainPanel').innerHTML = '<p>No exercises are available in this session.</p>'; return; }
    selectedExercise = clamp(selectedExercise, 0, p.length - 1, 0);
    const ex = p[selectedExercise], sets = getEffectiveSets(ex), done = completedCount(), total = plannedCount(), pct = percentComplete();
    const completedForExercise = Array.from({length:sets},(_,s)=>!!d.done[`${selectedExercise}-${s}`]).filter(Boolean).length;
    const nextIndex = findNextExercise(selectedExercise);
    const isFav = Array.isArray(state.v9?.favorites) && state.v9.favorites.includes(ex.name);
    $('#v93TrainingTitle').textContent = sessionName();
    $('#v93TrainingSubtitle').textContent = `${activeDay()} · ${esc(ex.phase || 'Training')} · Move at a comfortable pace`;
    $('#v93ProgressLabel').textContent = `${pct}% complete`;
    $('#v93ProgressCount').textContent = `${done} of ${total} sets`;
    $('#v93ProgressBar').style.width = `${pct}%`;
    $('#v93ExerciseCount').textContent = `${p.length} movements`;
    $('#v93ExerciseRail').innerHTML = p.map((item, i) => {
      const n = getEffectiveSets(item), complete = Array.from({length:n},(_,s)=>!!d.done[`${i}-${s}`]).filter(Boolean).length;
      return `<button type="button" class="v93-rail-item ${i===selectedExercise?'active':''} ${complete===n?'done':''}" data-v93-exercise="${i}" aria-current="${i===selectedExercise?'step':'false'}"><span class="v93-rail-number">${String(i+1).padStart(2,'0')}</span><span class="v93-rail-copy"><b>${esc(item.name)}</b><small>${complete}/${n} sets · ${esc(item.phase || 'Exercise')}</small></span><i aria-hidden="true">${complete===n?'✓':'›'}</i></button>`;
    }).join('');
    const cues = (ex.cues || ['Move with control.','Use a comfortable range of motion.','Stop if you feel pain or unusual discomfort.']);
    const next = nextIndex >= 0 ? p[nextIndex] : null;
    const currentSet = firstIncompleteSet(selectedExercise);
    const setRows = Array.from({length:sets},(_,s)=>{
      const key = `${selectedExercise}-${s}`, isDone = !!d.done[key];
      return `<div class="v93-set-row ${isDone?'is-done':''}"><span class="v93-set-num">${String(s+1).padStart(2,'0')}</span><div class="v93-set-target"><b>Set ${s+1}</b><small>${esc(ex.reps)} ${unitLabel(ex.unit)}</small></div><label>Actual ${ex.unit==='reps'?'reps':'time'}<input type="number" min="0" max="300" step="1" inputmode="numeric" data-v93-actual="${key}" aria-label="Actual ${unitLabel(ex.unit)} for set ${s+1}" value="${esc(d.actualReps[key] ?? '')}" ${isDone?'':'placeholder="Optional"'}></label><label>Load kg<input type="number" min="0" max="500" step="0.5" inputmode="decimal" data-v93-load="${key}" aria-label="Optional load for set ${s+1}" value="${esc(d.setLoad[key] ?? '')}" placeholder="—"></label><button type="button" class="v93-set-toggle ${isDone?'done':''}" data-v93-toggle-set="${key}" aria-label="${isDone?'Uncomplete':'Complete'} set ${s+1}">${isDone?'✓':'○'}</button></div><div class="v93-set-note-row"><label for="v93SetNote-${key}">Set note</label><input id="v93SetNote-${key}" type="text" maxlength="100" data-v93-set-note="${key}" value="${esc(d.setNotes[key] || '')}" placeholder="Optional note for set ${s+1}"></div>`;
    }).join('');
    const skip = d.skipReasons?.[selectedExercise] || '';
    $('#v93MainPanel').innerHTML = `
      <div class="v93-current-head"><div><span class="v93-kicker">EXERCISE ${selectedExercise+1} OF ${p.length}</span><h3>${esc(ex.name)}</h3><div class="v93-tags"><span>${esc(ex.phase || 'Training')}</span><span>${esc(ex.category || 'General')}</span><span>${esc(ex.difficulty || 'Comfortable pace')}</span></div></div><button type="button" id="v93FavoriteExercise" class="v93-fav-button ${isFav?'on':''}" aria-pressed="${isFav}" title="${isFav?'Remove from':'Add to'} favourites">${isFav?'★':'☆'} <span>${isFav?'Saved':'Favourite'}</span></button></div>
      <div class="v93-exercise-summary"><div><b>${sets} × ${esc(ex.reps)} ${unitLabel(ex.unit)}</b><small>${esc(ex.equipment || 'Use the equipment listed in your routine')}</small></div><span>${completedForExercise} / ${sets} sets</span></div>
      <section class="v93-instruction-card"><div class="v93-card-title"><b>Movement guide</b><span>Technique reminders</span></div><ul>${cues.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><p>Use a range and pace that feel comfortable. If you feel pain, dizziness or unusual discomfort, stop and adjust or end the activity.</p><small class="v93-common-reminders">Common reminders: avoid rushing, keep your setup stable, breathe steadily and do not force a range of motion.</small>${ex.alternative?`<small>Suggested alternative: ${esc(ex.alternative)}</small>`:''}</section>
      <section class="v93-sets-section"><div class="v93-card-title"><b>Set tracker</b><span>Progress saves as you go</span></div>${setRows}<div class="v93-inline-tools"><button type="button" data-v93-add-set class="v93-tool-button" ${sets>=8?'disabled':''}>＋ Add set</button><button type="button" data-v93-remove-set class="v93-tool-button" ${sets<=1?'disabled':''}>− Remove last set</button><button type="button" data-v93-undo-set class="v93-tool-button" ${lastSetAction?'':'disabled'}>Undo last set</button></div></section>
      <section class="v93-notes-section"><label for="v93ExerciseNote">Exercise note</label><textarea id="v93ExerciseNote" rows="2" maxlength="180" placeholder="Optional note for this movement…">${esc(d.notes[selectedExercise] || '')}</textarea><div class="v93-exercise-tools"><button type="button" data-v93-move="up" ${selectedExercise===0?'disabled':''}>↑ Move earlier</button><button type="button" data-v93-move="down" ${selectedExercise===p.length-1?'disabled':''}>↓ Move later</button><button type="button" id="v93ReplaceExercise">Replace movement</button><button type="button" id="v93SkipExercise">Skip with note</button></div>${skip?`<small class="v93-skip-note">Skipped: ${esc(skip)}</small>`:''}</section>
      <div class="v93-main-navigation"><button type="button" class="v93-secondary-button" id="v93PreviousExercise" ${selectedExercise===0?'disabled':''}>← Previous</button><button type="button" class="v93-finish-button" data-v93-complete-next ${currentSet<0?'disabled':''}>${currentSet<0?'Exercise complete':'Complete next set'}</button><button type="button" class="v93-secondary-button" id="v93NextExercise" ${nextIndex<0?'disabled':''}>Next →</button></div>`;
    const currentRemaining=firstIncompleteSet(selectedExercise)>=0;
    $('#v93NextName').textContent = next?.name || (currentRemaining?'Finish current movement':'All exercises reviewed');
    $('#v93NextMeta').textContent = next ? `${getEffectiveSets(next)} sets · ${next.reps} ${unitLabel(next.unit)}` : currentRemaining?'Complete the remaining sets before moving on.':'You can review any movement or save your session.';
    $('#v93PauseSession').textContent = d.v93PausedAt ? 'Resume session' : 'Pause session';
    $('#v93SessionFeeling').value = d.sessionFeedback || '';
    $('#v93SessionNote').value = d.sessionNote || '';
    paintLiveStats();
  }
  function findNextExercise(from) {
    const p=plan(),d=sessionData();
    for(let offset=1;offset<p.length;offset++){
      const i=(from+offset)%p.length;
      if(Array.from({length:getEffectiveSets(p[i])},(_,s)=>d.done[`${i}-${s}`]).some(v=>!v))return i;
    }
    return -1;
  }
  function persistTrainingFields() {
    if (!trainingDialog?.open) return;
    const d=sessionData();
    const note=$('#v93SessionNote')?.value || '';
    const feeling=$('#v93SessionFeeling')?.value || '';
    d.sessionNote=note.slice(0,180); d.sessionFeedback=feeling;
    const p=plan(); if (p[selectedExercise]) d.notes[selectedExercise]=$('#v93ExerciseNote')?.value || '';
    saveState();
    const label=$('#v93SaveState'); if(label) label.textContent='Saved just now';
  }
  function toggleSetFromMode(key) {
    const [i,s]=key.split('-').map(Number), btn=$(`#phaseGrid .set-check[data-key="${CSS.escape(key)}"]`);
    if (!btn || !plan()[i]) return;
    lastSetAction={key,wasDone:!!sessionData().done[key],index:i};
    btn.click();
    selectedExercise=i;
    setTimeout(()=>{if(trainingDialog?.open)renderTraining();refreshResumeBanner();},0);
  }
  function undoLastSet() {
    if (!lastSetAction) return;
    const key=lastSetAction.key, btn=$(`#phaseGrid .set-check[data-key="${CSS.escape(key)}"]`);
    if(btn && sessionData().done[key]) { btn.click(); lastSetAction=null; renderTraining(); refreshResumeBanner(); }
  }
  function addSet() {
    const ex=plan()[selectedExercise]; if(!ex)return;
    if(state.settings.deload){toast('Turn off reduced-set mode in Settings to change the planned set count.');return;}
    if(Number(ex.sets)>=8){toast('This exercise is already at the 8-set limit.');return;}
    ex.sets=clamp(Number(ex.sets)+1,1,8,1);saveState();renderWorkout();renderTraining();refreshResumeBanner();toast('Set added to this session. Your saved weekly routine is unchanged.');
  }
  function removeSet() {
    const ex=plan()[selectedExercise];if(!ex)return;
    if(state.settings.deload){toast('Turn off reduced-set mode in Settings to change the planned set count.');return;}
    const sets=getEffectiveSets(ex);if(sets<=1)return;
    const d=sessionData(),last=sets-1,key=`${selectedExercise}-${last}`;
    if(d.done[key]){toast('Uncheck the last completed set before removing it.');return;}
    ex.sets=clamp(Number(ex.sets)-1,1,8,1);
    ['done','timestamps','actualReps','setNotes','setLoad'].forEach(field=>{if(d[field])delete d[field][key];});
    saveState();renderWorkout();renderTraining();refreshResumeBanner();toast('Set removed from this session. Your saved weekly routine is unchanged.');
  }
  function remapIndexes(order) {
    const d=sessionData();
    const fields=['done','timestamps','actualReps','setNotes','setLoad'];
    fields.forEach(field=>{
      const old=d[field]||{},next={};
      Object.entries(old).forEach(([key,value])=>{const m=String(key).match(/^(\d+)-(\d+)$/);if(!m)return;const oldIndex=Number(m[1]),set=Number(m[2]),newIndex=order.indexOf(oldIndex);if(newIndex>=0)next[`${newIndex}-${set}`]=value;});
      d[field]=next;
    });
    ['notes','effort','rir','leftRight','collapsed','skipReasons'].forEach(field=>{
      const old=d[field]||{},next={};Object.entries(old).forEach(([key,value])=>{const oldIndex=Number(key),newIndex=order.indexOf(oldIndex);if(newIndex>=0)next[newIndex]=value;});d[field]=next;
    });
    if(lastSetAction){const [oldIndex,set]=lastSetAction.key.split('-').map(Number),newIndex=order.indexOf(oldIndex);if(newIndex>=0){lastSetAction.key=`${newIndex}-${set}`;lastSetAction.index=newIndex;}}
  }
  function moveExercise(direction) {
    const p=plan(),i=selectedExercise,j=direction==='up'?i-1:i+1;
    if(j<0||j>=p.length)return;
    const order=p.map((_,idx)=>idx);[order[i],order[j]]=[order[j],order[i]];
    remapIndexes(order);[p[i],p[j]]=[p[j],p[i]];selectedExercise=j;
    saveState();renderWorkout();renderTraining();toast('Exercise order updated. Set history stayed with each movement.');
  }
  function replaceExercise(name) {
    const cleaned=String(name||'').trim().slice(0,60);if(!cleaned)return;
    const p=plan(),ex=p[selectedExercise];if(!ex)return;
    const d=sessionData(),oldName=ex.name;
    const hasLogged=Array.from({length:getEffectiveSets(ex)},(_,s)=>!!d.done[`${selectedExercise}-${s}`]).some(Boolean);
    if(hasLogged&&!confirm(`Replace ${oldName}? Completed sets for this movement will be cleared so they are not incorrectly attributed to ${cleaned}.`))return;
    for(let set=0;set<8;set++){const key=`${selectedExercise}-${set}`;['done','timestamps','actualReps','setNotes','setLoad'].forEach(field=>{if(d[field])delete d[field][key];});}
    ['notes','effort','rir','leftRight','collapsed'].forEach(field=>{if(d[field])delete d[field][selectedExercise];});
    const libraryCard=$$('#xGuideLibrary .guide-card').find(card=>$('b',card)?.textContent.trim()===cleaned);
    const summary=libraryCard?.querySelector('p')?.textContent?.trim();
    const cueList=libraryCard?.querySelectorAll('li');
    ex.name=cleaned;ex.id=`v93-${Date.now().toString(36)}`;
    if(cueList?.length)ex.cues=[...cueList].slice(0,4).map(li=>li.textContent.trim());
    else if(summary)ex.cues=[summary,'Move with control and a comfortable range.','Stop if you feel pain or unusual discomfort.'];
    else ex.cues=['Use a stable setup.','Move with control and a comfortable range.','Stop if you feel pain or unusual discomfort.'];
    ex.equipment=libraryCard?.dataset?.equipment||ex.equipment||'Check the movement guide';
    d.replacedExercises ||= [];d.replacedExercises.push({from:oldName,to:cleaned,at:Date.now()});
    if(lastSetAction?.index===selectedExercise)lastSetAction=null;
    saveState();replaceDialog.close();renderWorkout();renderTraining();refreshResumeBanner();toast(`Movement changed to ${cleaned}. Its previous set entries were cleared.`);
  }
  function openReplace() {
    const cards=$$('#xGuideLibrary .guide-card');
    const options=[...new Set(cards.map(card=>$('b',card)?.textContent.trim()).filter(Boolean))];
    const favorites=state.v9?.favorites||[];
    const recent=(state.logs||[]).slice().reverse().flatMap(log=>(log.exerciseStats||[]).map(e=>e.name)).filter(Boolean);
    const choices=[...new Set([...favorites,...recent,...options])];
    $('#v93ReplaceSearch').value='';$('#v93ReplaceCustomName').value='';
    renderReplaceChoices(choices);replaceDialog.showModal();$('#v93ReplaceSearch').focus();
  }
  function renderReplaceChoices(choices) {
    const host=$('#v93ReplaceList');
    host.innerHTML=choices.slice(0,100).map(name=>`<button type="button" data-v93-replace="${esc(name)}"><b>${esc(name)}</b><small>${(state.v9?.favorites||[]).includes(name)?'Favourite · ':''}Movement library or recent history</small></button>`).join('')||'<p class="v93-empty">No matching movements found. Enter a name below.</p>';
  }
  function filterReplaceChoices() {
    const q=$('#v93ReplaceSearch').value.trim().toLowerCase();
    const cards=$$('#xGuideLibrary .guide-card');
    const names=[...new Set([...((state.v9?.favorites)||[]),...(state.logs||[]).slice().reverse().flatMap(l=>(l.exerciseStats||[]).map(e=>e.name)),...cards.map(c=>$('b',c)?.textContent.trim())].filter(Boolean))];
    renderReplaceChoices(names.filter(n=>n.toLowerCase().includes(q)));
  }
  function skipExercise() {
    if (skipDialog && !skipDialog.open) skipDialog.showModal();
  }
  function confirmSkipExercise() {
    const reason=$('#v93SkipReason')?.value || 'Other';
    const d=sessionData();d.skipReasons[selectedExercise]=reason;d.skipReason=Object.values(d.skipReasons).join('; ');
    saveState();skipDialog.close();renderTraining();
    toast(reason==='Stopped due to discomfort'?'Movement stopped and noted. Choose a comfortable alternative or end the session.':'Skip saved.');
  }
  function finishSession() {
    persistTrainingFields();
    const activeData=sessionData();
    if(activeData.v93PausedAt){activeData.startedAt=(Number(activeData.startedAt)||Date.now())+(Date.now()-Number(activeData.v93PausedAt));delete activeData.v93PausedAt;}
    if(completedCount()===0){toast('Complete at least one set before saving a workout. You can keep this session and resume later.');return;}
    if(!confirm('Save this session to your history? You can keep any unfinished sets in the session summary.'))return;
    const savedPlan=plan().map(ex=>({...ex,cues:[...(ex.cues||[])]}));
    const savedName=sessionName();const savedRun=state.activeCustomRun?{...state.activeCustomRun}:null;
    const before=state.logs.length;
    try { window.saveWorkout(); } catch(error) { console.error('Could not save workout',error);toast('The workout could not be saved. Your progress is still stored locally.');return; }
    if(state.logs.length<=before){toast('No new history entry was created. Your progress remains saved.');return;}
    const entry=state.logs.at(-1);entry.workoutName=entry.workoutName||savedName;saveState();
    if(trainingDialog.open)trainingDialog.close();clearInterval(timerPaint);
    showCompletion(entry,savedPlan,savedRun);refreshResumeBanner();
  }
  function showCompletion(entry,savedPlan,savedRun) {
    $('#v93CompletionTitle').textContent='Workout saved';
    $('#v93CompletionSub').textContent=`${entry.workoutName || entry.day} · ${entry.date}`;
    const duration=entry.duration || 'Not timed';
    const cells=[['SETS',entry.setsDone||0],['REPS / TIME',entry.repsDone||0],['DURATION',duration],['XP EARNED',`+${Number(entry.xp)||0}`]];
    $('#v93CompletionStats').innerHTML=cells.map(([label,value])=>`<div><small>${esc(label)}</small><b>${esc(value)}</b></div>`).join('');
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-6);cutoff.setHours(0,0,0,0);
    const week=(state.logs||[]).filter(l=>{const d=new Date(`${l.date}T12:00:00`);return Number.isFinite(d.getTime())&&d>=cutoff;});
    const weekSets=week.reduce((n,l)=>n+(Number(l.setsDone)||0),0);
    $('#v93WeeklySummary').textContent=`${week.length} saved ${week.length===1?'session':'sessions'} and ${weekSets} completed sets in the last seven days. This is a record of activity, not a target.`;
    const input=$('#v93RepeatDate');const minDate=new Date();minDate.setDate(minDate.getDate()+1);const min=todayKey(minDate);input.min=min;input.value=min;
    input.dataset.savedPlan=JSON.stringify(savedPlan);input.dataset.savedRunId=savedRun?.workoutId||entry.customWorkoutId||'';input.dataset.savedName=entry.workoutName||entry.day||'Workout';
    $('#v93ScheduleStatus').textContent='Optional — scheduling does not change your weekly plan.';
    completionDialog.showModal();
  }
  function scheduleAgain() {
    const date=$('#v93RepeatDate').value;const min=new Date();min.setDate(min.getDate()+1);const minKey=todayKey(min);
    if(!date||date<minKey){$('#v93ScheduleStatus').textContent='Choose a future date.';return;}
    let saved=[];try{saved=JSON.parse($('#v93RepeatDate').dataset.savedPlan||'[]');}catch{}
    if(!saved.length){$('#v93ScheduleStatus').textContent='This session could not be turned into a reusable routine.';return;}
    const id=`cw-v93-${Date.now().toString(36)}`;
    const sourceName=$('#v93RepeatDate').dataset.savedName||'Workout';
    const routine={id,name:`Repeat · ${sourceName}`.slice(0,48),createdAt:new Date().toISOString(),repeatSourceWorkoutId:$('#v93RepeatDate').dataset.savedRunId||null,exercises:saved.map(ex=>({...ex,id:`v93-ex-${Math.random().toString(36).slice(2,7)}`}))};
    state.customWorkouts ||= [];state.customWorkouts.push(routine);
    state.customSchedule ||= [];
    state.customSchedule.push({id:`schedule-v93-${Date.now().toString(36)}`,workoutId:id,date,createdAt:new Date().toISOString()});
    saveState();$('#v93ScheduleStatus').textContent=`Added ${routine.name} to your planner for ${date}.`;
    toast('A repeat session was added to your planner.');
  }
  function bind() {
    $('#v93OpenPreview')?.addEventListener('click',openPreview);
    $('#v93ResumeButton')?.addEventListener('click',()=>{setStarted();selectedExercise=firstIncompleteExercise();renderTraining();trainingDialog.showModal();clearInterval(timerPaint);timerPaint=setInterval(paintLiveStats,500);});
    $('#v93ClosePreview')?.addEventListener('click',()=>previewDialog.close());$('#v93PreviewCancel')?.addEventListener('click',()=>previewDialog.close());$('#v93BeginTraining')?.addEventListener('click',startTraining);
    $('#v93ExitTraining')?.addEventListener('click',closeTraining);
    $('#v93PauseSession')?.addEventListener('click',()=>{
      const d=sessionData();
      if(d.v93PausedAt){d.startedAt=(Number(d.startedAt)||Date.now())+(Date.now()-Number(d.v93PausedAt));delete d.v93PausedAt;toast('Session resumed.');}
      else{d.v93PausedAt=Date.now();if(currentTimer.running)pauseTimer();toast('Session paused. Your progress is saved.');}
      saveState();renderTraining();
    });
    $('#v93RestToggle')?.addEventListener('click',()=>{
      if(currentTimer.running)pauseTimer();else if(currentTimer.remaining>0)toggleMainTimer();else startTimer(Number(plan()[selectedExercise]?.restSeconds)||Number(state.settings.rest)||60,'REST');
      paintLiveStats();
    });
    $('#v93RestReset')?.addEventListener('click',()=>{resetTimer();paintLiveStats();});
    $('#v93TrainingDialog')?.addEventListener('click',e=>{
      const rest=e.target.closest('[data-v93-rest]');if(rest){const seconds=Number(rest.dataset.v93Rest);const ex=plan()[selectedExercise];if(ex){ex.restSeconds=seconds;saveState();}startTimer(seconds,'REST');paintLiveStats();return;}
      const exercise=e.target.closest('[data-v93-exercise]');if(exercise){persistTrainingFields();selectedExercise=Number(exercise.dataset.v93Exercise);renderTraining();return;}
      const set=e.target.closest('[data-v93-toggle-set]');if(set){toggleSetFromMode(set.dataset.v93ToggleSet);return;}
      if(e.target.closest('[data-v93-complete-next]')){const n=firstIncompleteSet(selectedExercise);if(n>=0)toggleSetFromMode(`${selectedExercise}-${n}`);return;}
      if(e.target.closest('[data-v93-add-set]')){addSet();return;}
      if(e.target.closest('[data-v93-remove-set]')){removeSet();return;}
      if(e.target.closest('[data-v93-undo-set]')){undoLastSet();return;}
      const move=e.target.closest('[data-v93-move]');if(move){moveExercise(move.dataset.v93Move);return;}
      if(e.target.closest('#v93PreviousExercise')){selectedExercise=Math.max(0,selectedExercise-1);persistTrainingFields();renderTraining();return;}
      if(e.target.closest('#v93NextExercise')){const n=findNextExercise(selectedExercise);if(n>=0){selectedExercise=n;persistTrainingFields();renderTraining();}return;}
      if(e.target.closest('#v93FavoriteExercise')){
        const name=plan()[selectedExercise]?.name;if(!name)return;state.v9 ||= {favorites:[]};state.v9.favorites ||= [];
        if(state.v9.favorites.includes(name))state.v9.favorites=state.v9.favorites.filter(x=>x!==name);else state.v9.favorites.push(name);
        saveState();renderTraining();toast(state.v9.favorites.includes(name)?'Exercise added to favourites.':'Exercise removed from favourites.');return;
      }
      if(e.target.closest('#v93ReplaceExercise')){openReplace();return;}
      if(e.target.closest('#v93SkipExercise')){skipExercise();return;}
      if(e.target.closest('#v93FinishTraining')){finishSession();return;}
    });
    $('#v93TrainingDialog')?.addEventListener('input',e=>{
      const target=e.target,d=sessionData();
      if(target.matches('[data-v93-actual]')){d.actualReps[target.dataset.v93Actual]=target.value===''?'':clamp(target.value,0,300,0);saveState();}
      if(target.matches('[data-v93-load]')){d.setLoad[target.dataset.v93Load]=target.value===''?'':clamp(target.value,0,500,0);saveState();}
      if(target.matches('[data-v93-set-note]')){d.setNotes[target.dataset.v93SetNote]=target.value.slice(0,100);saveState();}
      if(target.id==='v93ExerciseNote'){d.notes[selectedExercise]=target.value.slice(0,180);saveState();}
      if(target.id==='v93SessionNote'){d.sessionNote=target.value.slice(0,180);saveState();}
    });
    $('#v93SessionFeeling')?.addEventListener('change',e=>{sessionData().sessionFeedback=e.target.value;saveState();});
    $('#v93ReplaceSearch')?.addEventListener('input',filterReplaceChoices);
    $('#v93CloseReplace')?.addEventListener('click',()=>replaceDialog.close());
    $('#v93CloseSkip')?.addEventListener('click',()=>skipDialog.close());$('#v93CancelSkip')?.addEventListener('click',()=>skipDialog.close());$('#v93ConfirmSkip')?.addEventListener('click',confirmSkipExercise);
    $('#v93ReplaceList')?.addEventListener('click',e=>{const b=e.target.closest('[data-v93-replace]');if(b)replaceExercise(b.dataset.v93Replace);});
    $('#v93ReplaceCustomForm')?.addEventListener('submit',e=>{e.preventDefault();replaceExercise($('#v93ReplaceCustomName').value);});
    $('#v93ScheduleAgain')?.addEventListener('click',scheduleAgain);
    $('#v93CompletionDone')?.addEventListener('click',()=>{completionDialog.close();setTab('workout');refreshResumeBanner();});
    $('#v93CompletionHistory')?.addEventListener('click',()=>{completionDialog.close();setTab('history');});
    // Upgrade the existing Finish & Save action to use the same review screen.
    document.addEventListener('click',e=>{const b=e.target.closest('#finishWorkoutBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();finishSession();},true);
    ['v93PreviewDialog','v93ReplaceDialog'].forEach(id=>$('#'+id)?.addEventListener('cancel',()=>{}));
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&trainingDialog?.open){/* Native dialog closes; session data remains saved. */}
      if(trainingDialog?.open&&e.key==='ArrowDown'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&e.altKey){e.preventDefault();selectedExercise=Math.min(plan().length-1,selectedExercise+1);renderTraining();}
      if(trainingDialog?.open&&e.key==='ArrowUp'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&e.altKey){e.preventDefault();selectedExercise=Math.max(0,selectedExercise-1);renderTraining();}
    });
    trainingDialog?.addEventListener('close',()=>{clearInterval(timerPaint);refreshResumeBanner();});
    trainingDialog?.addEventListener('cancel',()=>{setTimeout(()=>{clearInterval(timerPaint);refreshResumeBanner();},0);});
    window.addEventListener('pagehide',()=>{persistTrainingFields();saveState();});
    window.addEventListener('beforeunload',e=>{if(trainingDialog?.open&&completedCount()>0){e.preventDefault();e.returnValue='Your workout is saved locally. Leave this page?';}});
    const phase=$('#phaseGrid');if(phase&&'MutationObserver'in window){new MutationObserver(()=>refreshResumeBanner()).observe(phase,{childList:true,subtree:true});}
  }
  function qualityChecks() {
    const checks=[
      ['Training screen exists',!!$('#v93TrainingDialog')],['Preview screen exists',!!$('#v93PreviewDialog')],['Completion review exists',!!$('#v93CompletionDialog')],
      ['Exercise replacement dialog exists',!!$('#v93ReplaceDialog')],['Skip-reason dialog exists',!!$('#v93SkipDialog')],['Resume control exists',!!$('#v93ResumeBanner')],
      ['Existing save function retained',typeof window.saveWorkout==='function'],['Existing plan function retained',typeof window.getPlan==='function'],
      ['Local data key unchanged',localStorage.getItem('vtaper-pro-v2')!==null || !!state],['PWA shell updated',!!document.querySelector('script[src="version93.js"]')&&!!document.querySelector('link[href="version93.css"]') || (window.__vtaperVersion93Loaded===true&&!!document.querySelector('style[data-inline="version93.css"]'))]
    ];
    return {checks,pass:checks.filter(x=>x[1]).length,total:checks.length};
  }
  function init() {
    ensureDialogs();mountLaunchControls();bind();
    const baseGetPlan=window.getPlan;
    if(typeof baseGetPlan==='function'&&!baseGetPlan.__v93PlanWrapped){const wrapped=function(){const d=window.dailyData();return Array.isArray(d?.v93Plan)?d.v93Plan:baseGetPlan.apply(this,arguments);};wrapped.__v93PlanWrapped=true;window.getPlan=wrapped;}
    if (typeof state.v93 !== 'object') state.v93={};
    document.documentElement.dataset.trainingVersion='9.3';
    document.title='NEXORA FITNESS 9.7.0 — Training Flow';
    const baseTimerRenderer=window.renderTimer;if(typeof baseTimerRenderer==='function'&&!baseTimerRenderer.__v93Wrapped){const wrapped=function(){const result=baseTimerRenderer.apply(this,arguments);document.title=document.title.replace(/9\.2/g,'9.3');return result;};wrapped.__v93Wrapped=true;window.renderTimer=wrapped;}
    const version=$('#xAppVersion');if(version)version.textContent='Version 9.6.2';
    const footer=$('.app-footer');if(footer?.firstElementChild)footer.firstElementChild.textContent='NEXORA FITNESS 9.7.0 / PERSONAL DESIGN STUDIO';
    const quality=$('#v9QualityResult');if(quality)quality.textContent=quality.textContent.replace(/Version 9\.2/g,'Version 9.6.2');
    refreshResumeBanner();
    window.v93QualityChecks=qualityChecks;
    window.setTimeout(()=>{
      const host=$('#v9QualityResult');const r=qualityChecks();
      if(host)host.textContent=`Version 9.6.2 Training Flow checks: ${r.pass}/${r.total} passed.`;
    },120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
