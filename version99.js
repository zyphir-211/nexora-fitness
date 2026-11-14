/* NEXORA FITNESS 9.9.0 — Training, recovery and release history layer.
   Extends the existing 9.8 engine without changing the original localStorage key. */
(() => {
  'use strict';
  if (window.__nexora99Loaded) return;
  window.__nexora99Loaded = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const RELEASES = [
    {v:'10.0 Beta',date:'November 2026',title:'Nebula — Complete visual rebuild',items:['Rebuilt Today, Train, Progress, Browse, Planner, Builder, Guide, History and Settings with one new visual system.','Introduced deep navy surfaces, violet and cyan accents, redesigned dashboard, cards, charts and navigation.','Preserved the NEXORA icon, workout engine, local storage key, saved routines and backup format.','Added responsive layouts and consistent light/dark styling.']},
    {v:'9.9.0.1',date:'November 2026',title:'Persistent animated logo',items:['NEXORA heart-and-pulse logo remains visible in the sticky top header across app sections.','Added a restrained heartbeat and gradient halo animation.','Logo returns to Today and closes the More menu.','Animation respects system and in-app reduced-motion preferences.']},
    {v:'9.9.0',date:'November 2026',title:'Training & recovery',items:['Smart weekly planner and preferred training-day suggestions.','Session recovery card with local checkpoints and safe discard.','Training Workspace with progress, preview and planner shortcuts.','In-app Update History with release notes and known limitations.']},
    {v:'9.8.3',date:'November 2026',title:'Appearance options',items:['Expanded colour choices and controlled appearance settings.','Additional spacing, card, corner, background, button, navigation and motion options.']},
    {v:'9.8.2',date:'November 2026',title:'Interaction update',items:['NEXORA logo returns to Today.','First-workout prompt opens the Planner.','Internal links and dashboard shortcuts route to their intended sections.']},
    {v:'9.8.1',date:'November 2026',title:'Navigation hotfix',items:['Restored the floating bottom navigation.','Positioned the More menu below its trigger and above page content.']},
    {v:'9.8 Beta',date:'November 2026',title:'Fusion redesign',items:['New Today, Train, Progress and Browse layouts.','Responsive navigation, light/dark modes and updated cards and charts.']},
    {v:'9.7.0',date:'November 2026',title:'NEXORA identity and settings refinement',items:['NEXORA branding and heart-and-pulse identity.','Simplified dashboard, colour-named themes and restored familiar Settings.','High contrast remains available but is off by default.']},
    {v:'9.6.2',date:'November 2026',title:'Today and Browse navigation',items:['Today focus metrics and a searchable Browse directory.','Pin frequently used destinations and keep History accessible inside Browse.']},
    {v:'9.5.0',date:'November 2026',title:'Customization Studio',items:['App identity, design profiles, colour controls and dashboard customization.','Import/export of design profiles.']},
    {v:'9.4.1',date:'November 2026',title:'Appearance reliability fixes',items:['Fixed theme reset, theme selection after backup import and version-label synchronization.']},
    {v:'9.4.0',date:'November 2026',title:'Appearance overhaul',items:['Refined NEXORA logo, visual identity, cards, navigation and appearance themes.']},
    {v:'9.3.0',date:'November 2026',title:'Training Flow',items:['Dedicated active-workout screen, set controls, rest timer, exercise guidance and completion review.']},
    {v:'9.2.0',date:'November 2026',title:'Settings and smoothness',items:['Redesigned Settings experience, search, categories, previews and save feedback.']},
    {v:'9.1.0',date:'November 2026',title:'Design and accessibility',items:['Visual system refinements, keyboard navigation, focus states, screen-reader improvements and responsive fixes.']},
    {v:'9.0.0',date:'November 2026',title:'Personalization',items:['Personal profile, dashboard preferences, planner preferences, achievements and training insights.']}
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save = () => { try { if (typeof window.saveState === 'function') window.saveState(); } catch (error) { console.warn('NEXORA 9.9 preferences not saved', error); } };
  const today = () => typeof todayKey === 'function' ? todayKey() : new Date().toISOString().slice(0,10);
  const getDay = date => DAYS[(new Date(`${date}T12:00:00`).getDay() + 6) % 7];

  function ensureState() {
    try { if (typeof state !== 'object' || !state) return false; } catch (_) { return false; }
    state.nx99 = state.nx99 && typeof state.nx99 === 'object' ? state.nx99 : {};
    state.nx99.weeklyTarget = Math.max(2, Math.min(5, Number(state.nx99.weeklyTarget) || 3));
    state.nx99.preferredDays = Array.isArray(state.nx99.preferredDays) ? state.nx99.preferredDays.filter(day => DAYS.includes(day)) : [];
    state.nx99.lastSavedAt = Number(state.nx99.lastSavedAt) || 0;
    state.customWorkouts = Array.isArray(state.customWorkouts) ? state.customWorkouts : [];
    state.customSchedule = Array.isArray(state.customSchedule) ? state.customSchedule : [];
    state.logs = Array.isArray(state.logs) ? state.logs : [];
    state.daily = state.daily && typeof state.daily === 'object' ? state.daily : {};
    return true;
  }

  function dayDataForRecovery() {
    const day = state.daily?.[today()] || {};
    const run = state.activeCustomRun;
    if (run?.runId) return day.customSessions?.[run.runId] || day;
    return day;
  }
  function recoveryInfo() {
    if (!ensureState()) return null;
    const day = dayDataForRecovery();
    const done = Object.values(day.done || {}).filter(Boolean).length;
    const started = !!state.activeCustomRun || Number(day.startedAt) > 0 || done > 0;
    if (!started) return null;
    const routine = state.customWorkouts.find(item => item.id === state.activeCustomRun?.workoutId);
    const name = routine?.name || (Array.isArray(day.v93Plan) ? 'Today’s workout' : 'Saved workout');
    const plan = Array.isArray(day.v93Plan) ? day.v93Plan : (typeof window.getPlan === 'function' ? window.getPlan() : []);
    const planned = plan.reduce((total, item) => total + (typeof window.getEffectiveSets === 'function' ? window.getEffectiveSets(item) : Math.max(1, Number(item.sets) || 1)), 0);
    return {name, done, planned, lastSaved: state.nx99.lastSavedAt || day.startedAt || Date.now(), run: !!state.activeCustomRun};
  }

  function installRecoveryPersistence() {
    if (window.__nx99SaveWrapped || typeof window.saveState !== 'function') return;
    const baseSave = window.saveState;
    window.saveState = function (...args) {
      try {
        ensureState();
        state.nx99.lastSavedAt = Date.now();
        const day = dayDataForRecovery();
        const done = Object.values(day.done || {}).filter(Boolean).length;
        const active = !!state.activeCustomRun || Number(day.startedAt) > 0 || done > 0;
        state.nx99.recovery = active ? {
          date: today(), workoutId: state.activeCustomRun?.workoutId || null,
          runId: state.activeCustomRun?.runId || null,
          startedAt: Number(day.startedAt) || Date.now(),
          completedSets: done, savedAt: state.nx99.lastSavedAt
        } : null;
      } catch (error) { console.warn('Could not update recovery checkpoint', error); }
      const result = baseSave.apply(this, args);
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => refreshRecoveryCard());
      return result;
    };
    window.__nx99SaveWrapped = true;

    // The underlying session data is already saved on every set/input change.
    // On pagehide, pause elapsed time so time spent with the app closed is not counted.
    window.addEventListener('pagehide', () => {
      try {
        if (!ensureState()) return;
        const day = dayDataForRecovery();
        if (Number(day.startedAt) && !Number(day.v93PausedAt)) day.v93PausedAt = Date.now();
        state.nx99.lastSavedAt = Date.now();
        state.nx99.recovery = recoveryInfo() ? {
          date: today(), workoutId: state.activeCustomRun?.workoutId || null,
          runId: state.activeCustomRun?.runId || null,
          startedAt: Number(day.startedAt) || Date.now(),
          completedSets: Object.values(day.done || {}).filter(Boolean).length,
          savedAt: state.nx99.lastSavedAt
        } : null;
        baseSave.call(window);
      } catch (error) { console.warn('Session checkpoint on page exit failed', error); }
    });
  }

  function mountRecoveryCard() {
    const todayView = $('#workoutView');
    if (!todayView || $('#nx99RecoveryCard')) return;
    const anchor = $('#v93ResumeBanner') || $('.dashboard-welcome', todayView) || $('.section-heading', todayView);
    const card = document.createElement('section');
    card.id = 'nx99RecoveryCard';
    card.className = 'nx99-recovery-card panel';
    card.hidden = true;
    card.innerHTML = `<div class="nx99-recovery-mark" aria-hidden="true">↻</div><div class="nx99-recovery-copy"><span class="nx99-kicker">SAVED SESSION</span><h3 id="nx99RecoveryTitle">Pick up where you left off</h3><p id="nx99RecoveryText">Your session progress is saved on this device.</p><small id="nx99RecoverySaved">Autosave is active</small></div><div class="nx99-recovery-actions"><button type="button" class="btn btn-primary btn-small" id="nx99Resume">Resume session</button><button type="button" class="btn btn-quiet btn-small" id="nx99Discard">Discard session</button></div>`;
    if (anchor) anchor.insertAdjacentElement('afterend', card); else todayView.prepend(card);
    $('#nx99Resume').addEventListener('click', () => {
      const resume = $('#v93ResumeButton');
      if (resume && !$('#v93ResumeBanner')?.hidden) resume.click();
      else if ($('#v93OpenPreview')) $('#v93OpenPreview').click();
      else if (typeof window.setTab === 'function') window.setTab('workout');
    });
    $('#nx99Discard').addEventListener('click', () => {
      if (!confirm('Discard this unfinished session? Your saved workout history and routines will remain.')) return;
      const day = state.daily?.[today()] || {};
      if (state.activeCustomRun?.runId) {
        const run = state.activeCustomRun;
        if (day.customSessions) delete day.customSessions[run.runId];
        state.activeCustomRun = null;
      } else {
        ['done','timestamps','actualReps','setNotes','setLoad','notes','effort','rir','leftRight','collapsed','skipReasons'].forEach(key => { day[key] = {}; });
        delete day.startedAt; delete day.v93PausedAt; delete day.v93Plan; delete day.v93TrainingOpened;
      }
      state.nx99.recovery = null;
      save();
      if (typeof window.renderWorkout === 'function') window.renderWorkout();
      refreshRecoveryCard();
      if (typeof window.toast === 'function') window.toast('Unfinished session discarded. Your history was kept.');
    });
  }

  function refreshRecoveryCard() {
    const card = $('#nx99RecoveryCard'); if (!card || !ensureState()) return;
    const info = recoveryInfo();
    card.hidden = !info;
    if (!info) return;
    $('#nx99RecoveryTitle').textContent = info.name;
    $('#nx99RecoveryText').textContent = `${info.done} ${info.done === 1 ? 'set' : 'sets'} completed${info.planned ? ` · ${info.planned} planned` : ''}. You can resume or safely discard this session.`;
    $('#nx99RecoverySaved').textContent = `Saved locally · ${new Date(info.lastSaved).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
  }

  function suggestedDays(target, preferred) {
    const defaults = {
      2:['Monday','Thursday'],
      3:['Monday','Wednesday','Friday'],
      4:['Monday','Tuesday','Thursday','Saturday'],
      5:['Monday','Tuesday','Thursday','Friday','Saturday']
    }[target] || ['Monday','Wednesday','Friday'];
    const picked = [];
    [...preferred, ...defaults, ...DAYS].forEach(day => { if (DAYS.includes(day) && !picked.includes(day) && picked.length < target) picked.push(day); });
    return DAYS.filter(day => picked.includes(day));
  }
  function renderPlannerAssist() {
    const host = $('#nx99PlannerAssist'); if (!host || !ensureState()) return;
    const p = state.v9?.profile || {};
    const preferred = state.nx99.preferredDays.length ? state.nx99.preferredDays : (Array.isArray(p.preferredDays) ? p.preferredDays : ['Monday','Wednesday','Friday']);
    const target = state.nx99.weeklyTarget || Math.max(2, Math.min(5, preferred.length || 3));
    const checks = DAYS.map(day => `<label class="nx99-day-choice"><input type="checkbox" value="${day}" data-nx99-day ${preferred.includes(day) ? 'checked' : ''}><span>${day.slice(0,3)}</span></label>`).join('');
    const routines = state.customWorkouts.length ? state.customWorkouts.map(w => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('') : '';
    host.innerHTML = `
      <div class="nx99-planner-head"><div><span class="nx99-kicker">SMART WEEK PLANNER</span><h3>Build a week that fits your schedule.</h3><p>Suggestions use your preferred days. Nothing changes until you save it.</p></div><span class="nx99-ai-mark">N</span></div>
      <div class="nx99-planner-grid">
        <section class="nx99-planner-block"><label for="nx99WeeklyTarget">Sessions you'd like to plan each week</label><select id="nx99WeeklyTarget"><option value="2" ${target===2?'selected':''}>2 days</option><option value="3" ${target===3?'selected':''}>3 days</option><option value="4" ${target===4?'selected':''}>4 days</option><option value="5" ${target===5?'selected':''}>5 days</option></select><p class="small-note">A flexible planning preference, not a requirement.</p><div class="nx99-days-label">Preferred days</div><div class="nx99-day-grid">${checks}</div><div class="nx99-planner-actions"><button type="button" class="btn btn-outline btn-small" id="nx99SuggestDays">Suggest days</button><button type="button" class="btn btn-primary btn-small" id="nx99SaveDays">Save preferences</button></div><p class="nx99-status" id="nx99PlannerStatus" aria-live="polite">Your current preferences are shown.</p></section>
        <section class="nx99-planner-block nx99-schedule-block"><span class="nx99-kicker">SCHEDULE A ROUTINE</span><label for="nx99RoutineSelect">Saved custom workout</label><select id="nx99RoutineSelect"><option value="">Choose a routine</option>${routines}</select><label for="nx99ScheduleDate">Date</label><input id="nx99ScheduleDate" type="date" min="${today()}"><button type="button" class="btn btn-primary btn-small" id="nx99AddSchedule" ${state.customWorkouts.length?'':'disabled'}>Add to planner</button><div id="nx99ScheduleStatus" class="nx99-status" aria-live="polite">${state.customWorkouts.length ? 'This adds a calendar entry without changing your weekly plan.' : 'Create a custom workout in Train first.'}</div></section>
      </div>
      <section class="nx99-suggested" aria-live="polite"><div><span class="nx99-kicker">SUGGESTED WEEK</span><b id="nx99SuggestedTitle">${target} preferred days</b><small id="nx99SuggestedNote">Choose Suggest days to preview a balanced arrangement.</small></div><div id="nx99SuggestedDays" class="nx99-suggested-days"></div></section>`;
    $('#nx99WeeklyTarget').addEventListener('change', () => {
      state.nx99.weeklyTarget = Number($('#nx99WeeklyTarget').value) || 3;
      const next = suggestedDays(state.nx99.weeklyTarget, $$('#nx99PlannerAssist [data-nx99-day]:checked').map(el => el.value));
      displaySuggested(next, 'Based on your selected days. Save preferences when this looks right.');
      save();
    });
    $('#nx99SuggestDays').addEventListener('click', () => {
      const count = Number($('#nx99WeeklyTarget').value) || 3;
      const selected = $$('#nx99PlannerAssist [data-nx99-day]:checked').map(el => el.value);
      const days = suggestedDays(count, selected);
      $$('#nx99PlannerAssist [data-nx99-day]').forEach(el => { el.checked = days.includes(el.value); });
      displaySuggested(days, 'Suggested from your preferences. Review and save to update your profile.');
    });
    $('#nx99SaveDays').addEventListener('click', () => {
      const days = $$('#nx99PlannerAssist [data-nx99-day]:checked').map(el => el.value);
      if (days.length < 1) { $('#nx99PlannerStatus').textContent = 'Choose at least one preferred day.'; return; }
      state.nx99.weeklyTarget = Number($('#nx99WeeklyTarget').value) || days.length;
      state.nx99.preferredDays = days;
      state.v9 ||= {}; state.v9.profile ||= {};
      state.v9.profile.preferredDays = days;
      save();
      displaySuggested(days, 'Saved. Your weekly exercise plan has not been changed.');
      $('#nx99PlannerStatus').textContent = 'Preferences saved on this device.';
    });
    $('#nx99AddSchedule').addEventListener('click', () => {
      const id = $('#nx99RoutineSelect').value, date = $('#nx99ScheduleDate').value;
      if (!state.customWorkouts.some(w => w.id === id)) { $('#nx99ScheduleStatus').textContent = 'Choose one of your saved custom workouts.'; return; }
      if (!date || date < today()) { $('#nx99ScheduleStatus').textContent = 'Choose today or a future date.'; return; }
      const duplicate = state.customSchedule.some(s => s.workoutId === id && s.date === date && !s.completedAt);
      if (duplicate) { $('#nx99ScheduleStatus').textContent = 'That routine is already scheduled for this date.'; return; }
      state.customSchedule.push({id:`schedule-99-${Date.now().toString(36)}`,workoutId:id,date,createdAt:new Date().toISOString(),source:'nx99-planner'});
      save();
      if (typeof window.setTab === 'function') window.setTab('planner');
      // Keep the chosen routine/date visible after the Planner refreshes.
      if ($('#nx99RoutineSelect')) $('#nx99RoutineSelect').value = id;
      if ($('#nx99ScheduleDate')) $('#nx99ScheduleDate').value = date;
      if ($('#nx99ScheduleStatus')) $('#nx99ScheduleStatus').textContent = 'Added to your planner. Your weekly plan stays unchanged.';
    });
    displaySuggested(suggestedDays(target, preferred), 'Suggested from your saved preferred days. Nothing is scheduled automatically.');
  }
  function displaySuggested(days, note) {
    const title = $('#nx99SuggestedTitle'), text = $('#nx99SuggestedNote'), host = $('#nx99SuggestedDays');
    if (title) title.textContent = `${days.length} preferred ${days.length===1?'day':'days'}`;
    if (text) text.textContent = note;
    if (host) host.innerHTML = days.map(day => `<span class="nx99-suggested-day">${day.slice(0,3)}</span>`).join('');
  }
  function mountPlannerAssist() {
    const planner = $('#plannerView'); if (!planner || $('#nx99PlannerAssist')) return;
    const panel = document.createElement('section'); panel.id = 'nx99PlannerAssist'; panel.className = 'panel nx99-planner-assist';
    const intro = $('.planner-intro', planner);
    (intro || $('.section-heading', planner))?.insertAdjacentElement('afterend', panel);
    renderPlannerAssist();
  }

  function mountTrainingWorkspace() {
    const builder = $('#builderView'); if (!builder || $('#nx99TrainingWorkspace')) return;
    const panel = document.createElement('section'); panel.id = 'nx99TrainingWorkspace'; panel.className = 'panel nx99-workspace';
    const heading = $('.section-heading', builder);
    panel.innerHTML = `<div class="nx99-workspace-top"><div><span class="nx99-kicker">TRAINING WORKSPACE</span><h3>Your next session, ready when you are.</h3><p>Preview your current plan, continue a saved session, or make changes in the planner.</p></div><span class="nx99-workspace-icon" aria-hidden="true">↗</span></div><div class="nx99-workspace-stats"><div><small>EXERCISES</small><b id="nx99ExerciseCount">—</b></div><div><small>PLANNED SETS</small><b id="nx99PlannedSets">—</b></div><div><small>COMPLETED</small><b id="nx99CompletedSets">—</b></div></div><div class="nx99-workspace-actions"><button type="button" class="btn btn-primary btn-small" id="nx99PreviewWorkout">Preview workout</button><button type="button" class="btn btn-outline btn-small" id="nx99OpenPlanner">Open planner</button></div>`;
    (heading || builder.firstChild)?.insertAdjacentElement('afterend', panel);
    $('#nx99PreviewWorkout').addEventListener('click', () => {
      if (recoveryInfo() && !$('#v93ResumeBanner')?.hidden && $('#v93ResumeButton')) $('#v93ResumeButton').click();
      else if ($('#v93OpenPreview')) $('#v93OpenPreview').click();
      else if (typeof window.setTab === 'function') window.setTab('workout');
    });
    $('#nx99OpenPlanner').addEventListener('click', () => window.setTab?.('planner'));
    renderTrainingWorkspace();
  }
  function renderTrainingWorkspace() {
    if (!$('#nx99TrainingWorkspace') || typeof window.getPlan !== 'function') return;
    const plan = window.getPlan() || [];
    const total = plan.reduce((n, ex) => n + (typeof window.getEffectiveSets === 'function' ? window.getEffectiveSets(ex) : Number(ex.sets)||1), 0);
    const data = typeof window.dailyData === 'function' ? window.dailyData() : {};
    const done = Object.values(data.done || {}).filter(Boolean).length;
    $('#nx99ExerciseCount').textContent = String(plan.length);
    $('#nx99PlannedSets').textContent = String(total);
    $('#nx99CompletedSets').textContent = `${done}/${total}`;
  }

  function mountUpdatesHistory() {
    if (!$('#updatesView')) {
      const shell = document.querySelector('main.app-shell'); if (!shell) return;
      const section = document.createElement('section'); section.id = 'updatesView'; section.className = 'view nx99-updates-view'; section.setAttribute('aria-hidden','true'); section.setAttribute('aria-labelledby','nx99UpdatesTitle'); section.tabIndex = -1;
      section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">RELEASE NOTES</p><h2 id="nx99UpdatesTitle">What's new in NEXORA</h2><p class="small-note">A running record of app updates, improvements and fixes.</p></div><span class="pill">UPDATE HISTORY</span></div><section class="panel nx99-updates-intro"><b>Find every update in one place.</b><p>Each release lists what changed. Future versions will be added here so you don't need to search through old conversations.</p><label class="nx99-update-search"><span aria-hidden="true">⌕</span><input id="nx99UpdateSearch" type="search" placeholder="Search release notes…" aria-label="Search update history"></label></section><div class="nx99-release-list" id="nx99ReleaseList"></div><p class="small-note">Release dates are approximate month labels. Update entries describe changes recorded in this project history.</p><button class="btn btn-outline btn-small" id="nx99UpdatesBack">Back to Today</button>`;
      shell.append(section);
    }
    renderUpdates();
    const search = $('#nx99UpdateSearch');
    if (search && !search.dataset.bound) { search.dataset.bound='1'; search.addEventListener('input',renderUpdates); }
    $('#nx99UpdatesBack')?.addEventListener('click',()=>window.setTab?.('workout'));
  }
  function renderUpdates() {
    const host = $('#nx99ReleaseList'); if (!host) return;
    const q = ($('#nx99UpdateSearch')?.value || '').trim().toLowerCase();
    const rows = RELEASES.filter(release => `${release.v} ${release.date} ${release.title} ${release.items.join(' ')}`.toLowerCase().includes(q));
    host.innerHTML = rows.map((release,index) => `<article class="nx99-release-card ${index===0?'is-latest':''}"><div class="nx99-release-meta"><span>${esc(release.v)}</span>${index===0?'<b> LATEST</b>':''}<small>${esc(release.date)}</small></div><h3>${esc(release.title)}</h3><ul>${release.items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></article>`).join('') || '<section class="panel nx99-empty-updates">No matching updates. Try a different search.</section>';
  }
  function addUpdateLinks() {
    const menu = $('#moreMenu');
    if (menu && !menu.querySelector('[data-more-tab="updates"]')) {
      const item = document.createElement('button'); item.type='button'; item.dataset.moreTab='updates'; item.innerHTML='What’s new <small>Every release and fix</small>'; menu.append(item);
    }
    const groups = $('#msBrowseGroups');
    if (groups && !$('#nx99BrowseUpdates')) {
      const group = groups.querySelector('[data-browse-group="personalize"] .ms-browse-items') || groups;
      const item = document.createElement('div'); item.id='nx99BrowseUpdates'; item.className='ms-browse-item';
      item.innerHTML='<button type="button" class="ms-browse-open" id="nx99OpenUpdates"><span class="ms-browse-icon ms-tone-cyan">↻</span><span class="ms-browse-copy"><b>What’s new</b><small>See every release, improvement and fix.</small></span><span class="ms-browse-arrow">›</span></button>';
      group.append(item);
      $('#nx99OpenUpdates').addEventListener('click',()=>window.setTab?.('updates'));
    }
  }
  function wrapNavigation() {
    if (typeof window.setTab !== 'function' || window.setTab.__nx99Wrapped) return;
    const base = window.setTab;
    const wrapped = function (name) {
      const result = base.apply(this, arguments);
      if (name === 'planner') renderPlannerAssist();
      if (name === 'builder') renderTrainingWorkspace();
      if (name === 'workout') refreshRecoveryCard();
      if (name === 'updates') renderUpdates();
      return result;
    };
    wrapped.__nx99Wrapped = true;
    window.setTab = wrapped;
  }
  function updateVersionBrand() {
    const footer = $('.app-footer span'); if (footer) footer.textContent = 'NEXORA FITNESS 9.9.0.1 / TRAINING & PROGRESS';
    const appVersion = $('#xAppVersion'); if (appVersion) appVersion.textContent = 'NEXORA FITNESS 9.9.0.1';
    document.title = 'NEXORA FITNESS 9.9.0.1 — Training & Progress';
    document.documentElement.dataset.nexoraVersion = '9.9.0.1';
    document.body.dataset.nexoraVersion = '9.9.0.1';
  }
  function wrapRenderers() {
    ['renderWorkout','renderProgress','renderTimer'].forEach(key => {
      const base = window[key];
      if (typeof base !== 'function' || base.__nx99Wrapped) return;
      const wrapped = function () {
        const result = base.apply(this, arguments);
        requestAnimationFrame(() => { refreshRecoveryCard(); renderTrainingWorkspace(); updateVersionBrand(); });
        updateVersionBrand();
        return result;
      };
      wrapped.__nx99Wrapped = true;
      window[key] = wrapped;
    });
  }
  function addQualityCheck() {
    window.nexora990Checks = function () {
      const checks = [
        ['Smart planner mounted',!!$('#nx99PlannerAssist')],
        ['Planner target control',!!$('#nx99WeeklyTarget')],
        ['Planner suggested days',!!$('#nx99SuggestedDays')],
        ['Session recovery card',!!$('#nx99RecoveryCard')],
        ['Training Workspace',!!$('#nx99TrainingWorkspace')],
        ['Update History page',!!$('#updatesView')],
        ['Update History menu route',!!$('#moreMenu [data-more-tab="updates"]')],
        ['Legacy storage key preserved',localStorage.getItem('vtaper-pro-v2')!==null || !!window.state],
        ['Old workout functions retained',typeof window.getPlan==='function'&&typeof window.saveWorkout==='function']
      ];
      return {checks,passed:checks.filter(item=>item[1]).length,total:checks.length};
    };
  }
  function boot() {
    if (!ensureState()) return;
    installRecoveryPersistence();
    mountPlannerAssist();
    mountTrainingWorkspace();
    mountRecoveryCard();
    mountUpdatesHistory();
    addUpdateLinks();
    wrapNavigation();
    wrapRenderers();
    refreshRecoveryCard();
    renderTrainingWorkspace();
    addQualityCheck();
    updateVersionBrand();
    if (typeof window.saveState === 'function') window.saveState();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
