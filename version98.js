/* NEXORA FITNESS 9.8 BETA — Fusion redesign. Keeps the 9.7 data model and workout engine. */
(() => {
  'use strict';
  if (window.__nexora98Loaded) return;
  window.__nexora98Loaded = true;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const BRAND = 'NEXORA FITNESS';
  const VERSION = '9.8.3 Beta';
  const ICON = 'nexora-icon-192.png';
  const THEME_NAMES = { emerald:'Emerald', graphite:'Ice Blue', violet:'Violet', ember:'Copper', light:'Pearl', rose:'Rose', ocean:'Ocean', forest:'Forest', sunset:'Sunset', slate:'Slate', purple:'Violet', crimson:'Copper', blue:'Ice Blue' };
  const getState = () => { try { return typeof state === 'object' && state ? state : null; } catch (_) { return null; } };
  let modeMedia = null;

  function getMode() {
    const s = getState();
    const mode = s?.settings?.nx98DisplayMode;
    return ['system','light','dark'].includes(mode) ? mode : 'system';
  }
  function currentTheme() {
    const s = getState();
    const raw = String(s?.settings?.theme || 'emerald').toLowerCase();
    return ({ purple:'violet', crimson:'ember', blue:'graphite' })[raw] || raw;
  }
  function save() { try { if (typeof window.saveState === 'function') window.saveState(); } catch (e) { console.warn('NEXORA preferences could not be saved', e); } }
  function applyMode() {
    const mode = getMode();
    document.body.dataset.nx98Mode = mode;
    document.body.dataset.nx98Theme = currentTheme();
    const resolved = mode === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
    document.documentElement.style.colorScheme = resolved;
    document.body.style.colorScheme = resolved;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#0d151a' : '#f4f7f8';
    const picker = $('#nx98AppearanceMode'); if (picker) picker.value = mode;
  }
  function migrate() {
    const s = getState(); if (!s) return;
    s.settings = s.settings && typeof s.settings === 'object' ? s.settings : {};
    s.morphset = s.morphset && typeof s.morphset === 'object' ? s.morphset : {};
    if (!s.settings.nx98ModeMigrated) {
      // The 9.8 beta starts by following the device; users can override this below.
      s.settings.nx98DisplayMode = 'system';
      s.settings.nx98ModeMigrated = true;
      s.morphset.colorMode = 'auto';
    }
    if (!['system','light','dark'].includes(s.settings.nx98DisplayMode)) s.settings.nx98DisplayMode = 'system';
    if (s.settings.highContrast == null) s.settings.highContrast = false;
  }
  function brand() {
    const brandLink = $('.brand');
    if (brandLink) {
      brandLink.setAttribute('aria-label', `${BRAND} home`);
      const logo = $('.brand-logo', brandLink); if (logo) { logo.src = ICON; logo.alt = `${BRAND} logo`; }
      const name = $('.ms-brand-name', brandLink); if (name) name.textContent = BRAND;
      const sub = $('.ms-brand-sub', brandLink); if (sub) sub.textContent = 'HEALTH · TRAINING · PROGRESS';
    }
    const boot = $('.boot-mark img'); if (boot) boot.src = ICON;
    const footer = $('.app-footer span'); if (footer) footer.textContent = `${BRAND} ${VERSION.toUpperCase()}`;
    const phase = $('#phaseEyebrow'); if (phase) phase.textContent = 'YOUR DAILY SNAPSHOT'; 
    const appVersion = $('#xAppVersion'); if (appVersion) appVersion.textContent = `Version ${VERSION}`;
    const meta = $('meta[name="description"]'); if (meta) meta.content = 'NEXORA FITNESS brings daily training, progress insights and movement guidance into one personal space.';
    document.title = `${BRAND} ${VERSION} — Training & Progress`;
    document.documentElement.dataset.nexoraVersion = '9.8.1-beta';
    document.body.dataset.nexoraVersion = '9.8.1-beta';
    $$('link[rel="icon"]').forEach(link => link.href = ICON);
  }
  function moveHeroIntoToday() {
    const hero = $('.app-shell > .command-hero');
    const today = $('#workoutView');
    if (hero && today && hero.parentElement !== today) today.insertBefore(hero, today.firstChild);
    const title = $('#pageTitle'); if (title) title.innerHTML = 'Move well.<br><span>Feel ready.</span>';
    const subtitle = $('.command-hero .hero-sub');
    if (subtitle) subtitle.textContent = 'Your training, activity and progress — brought together in one clear daily view.';
    const phase = $('#phaseEyebrow'); if (phase) phase.textContent = 'YOUR DAILY SNAPSHOT';
    const welcome = $('.dashboard-welcome-copy h2'); if (welcome) welcome.textContent = 'Your day at a glance';
    const welcomeText = $('.dashboard-welcome-copy p:not(.eyebrow)');
    if (welcomeText) welcomeText.textContent = 'A quick look at what you have planned and how your week is going.';
    const sessionButton = $('#timerStartBtn'); if (sessionButton) sessionButton.textContent = 'Start session timer';
    const label = $('.dashboard-launchpad .launch-primary .launch-label'); if (label) label.textContent = 'PICK UP YOUR PLAN';
  }
  function addModeSetting() {
    const appearance = $('#settingsView .nx-appearance-panel');
    if (!appearance || $('#nx98AppearanceMode')) return;
    const row = document.createElement('label');
    row.className = 'setting-row nx98-mode-row';
    row.innerHTML = '<span><strong>Appearance mode</strong><small>Follow your device, or choose light or dark.</small></span><select id="nx98AppearanceMode" aria-label="Appearance mode"><option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option></select>';
    const heading = $('h3', appearance);
    if (heading?.nextElementSibling) heading.nextElementSibling.insertAdjacentElement('afterend', row);
    else appearance.appendChild(row);
    const oldModeRow = $('#xColorMode')?.closest('.setting-row');
    if (oldModeRow) oldModeRow.hidden = true;
    row.addEventListener('change', event => {
      if (event.target.id !== 'nx98AppearanceMode') return;
      const s = getState(); if (!s) return;
      const mode = ['system','light','dark'].includes(event.target.value) ? event.target.value : 'system';
      s.settings.nx98DisplayMode = mode;
      s.morphset.colorMode = mode === 'system' ? 'auto' : mode;
      save(); applyMode();
    });
  }
  function addModeQuickToggle() {
    const actions = $('.top-actions'); if (!actions || $('#nx98ModeToggle')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'icon-btn nx98-mode-toggle'; button.id = 'nx98ModeToggle';
    button.title = 'Change appearance mode'; button.setAttribute('aria-label','Change appearance mode');
    button.innerHTML = '<span aria-hidden="true">◐</span>';
    button.addEventListener('click', () => {
      const s = getState(); if (!s) return;
      const order = ['system','light','dark'];
      const next = order[(order.indexOf(getMode()) + 1) % order.length];
      s.settings.nx98DisplayMode = next; s.morphset.colorMode = next === 'system' ? 'auto' : next;
      save(); applyMode();
      if (typeof window.toast === 'function') window.toast(`Appearance: ${next === 'system' ? 'Follow device' : next[0].toUpperCase()+next.slice(1)}`);
    });
    actions.insertBefore(button, $('#focusBtn', actions) || actions.firstChild);
  }
  function syncDashboardEmptyState() {
    const host = $('#xWeeklyActivity'); if (!host) return;
    const totalText = $('#xWeekTotal')?.textContent || '';
    const total = Number((totalText.match(/\d+/) || [])[0] || 0);
    let empty = $('#nx98WeeklyEmpty');
    if (total === 0) {
      if (!empty) { empty = document.createElement('div'); empty.id = 'nx98WeeklyEmpty'; empty.className = 'nx98-chart-empty'; empty.innerHTML = '<div><strong>Your week starts here</strong><span>Save a workout to see your activity appear in this chart.</span></div>'; }
      host.hidden = true; host.style.display = 'none';
      const legend = host.nextElementSibling; if (legend) legend.style.display = 'none';
      host.parentElement?.insertBefore(empty, host.nextSibling);
    } else {
      host.hidden = false; host.style.display = '';
      const legend = host.nextElementSibling; if (legend) legend.style.display = '';
      empty?.remove();
    }
  }
  function updateNavigation() {
    const labels = {workout:'Today',builder:'Train',progress:'Progress',browse:'Browse'};
    Object.entries(labels).forEach(([id,label]) => {
      const button = $(`.tabs [data-tab="${id}"]`); if (!button) return;
      const text = $('.dock-label', button); if (text) text.textContent = label;
    });
    const more = $('#moreMenu');
    if (more) {
      const labelMap = {planner:['Planner','Plan your week'],insights:['Insights','Patterns and comparisons'],guide:['Exercise guide','Movement library'],settings:['Settings','Preferences and data']};
      $$('[data-more-tab]', more).forEach(button => {
        const item = labelMap[button.dataset.moreTab]; if (!item) return;
        const small = $('small', button); button.firstChild.textContent = item[0] + ' ';
        if (small) small.textContent = item[1];
      });
    }
    const add = $('#createWorkoutBtn'); if (add) { add.setAttribute('aria-label','Create a new workout'); add.title='Create a new workout'; }
  }
  function updatePageCopy() {
    const copy = {
      builder:['YOUR TRAINING','Build and shape your sessions.'],
      progress:['YOUR PROGRESS','See the patterns behind your training.'],
      browse:['YOUR NEXORA LIBRARY','Find the tools and details you need.'],
      history:['YOUR ACTIVITY','Your completed sessions, in one place.'],
      planner:['PLAN AHEAD','Make a week that works for you.'],
      insights:['YOUR TRENDS','Explore your training over time.'],
      guide:['MOVEMENT LIBRARY','Learn the movements and find alternatives.'],
      settings:['MAKE IT YOURS','Your preferences, data and accessibility.']
    };
    Object.entries(copy).forEach(([id,items]) => {
      const view = $(`#${id}View`); if (!view) return;
      const eyebrow = $('.section-heading .eyebrow', view); if (eyebrow) eyebrow.textContent = items[0];
      const desc = $('.nx98-page-intro', view);
      if (desc) desc.textContent = items[1];
    });
    const pageTitle = $('#pageTitle');
    if (pageTitle) pageTitle.setAttribute('aria-label','Move well. Feel ready.');
  }
  function applyShell() {
    document.body.classList.add('nx98');
    moveHeroIntoToday();
    addModeSetting();
    addModeQuickToggle();
    installMoreMenuPositioning();
    updateNavigation();
    updatePageCopy();
    brand();
    applyMode();
  }
  function wrapRenderers() {
    if (typeof window.renderWorkout === 'function' && !window.renderWorkout.__nx98) {
      const base = window.renderWorkout;
      const wrapped = function () { const result = base.apply(this, arguments); brand(); applyMode(); syncDashboardEmptyState(); return result; };
      wrapped.__nx98 = true; window.renderWorkout = wrapped;
    }
    if (typeof window.renderProgress === 'function' && !window.renderProgress.__nx98) {
      const base = window.renderProgress;
      const wrapped = function () { const result = base.apply(this, arguments); syncDashboardEmptyState(); return result; };
      wrapped.__nx98 = true; window.renderProgress = wrapped;
    }
  }
  function wrapApplySettings() {
    if (typeof window.applySettings !== 'function' || window.applySettings.__nx98) return;
    const base = window.applySettings;
    const wrapped = function () { const result = base.apply(this, arguments); applyMode(); brand(); return result; };
    wrapped.__nx98 = true; window.applySettings = wrapped;
  }
  function wrapTab() {
    if (typeof window.setTab !== 'function' || window.setTab.__nx98) return;
    const base = window.setTab;
    const wrapped = function(name) {
      const result = base.apply(this, arguments);
      brand();
      applyMode();
      const viewId = `${name}View`;
      const view = $(`#${viewId}`);
      if (view) {
        const heading = $('h1,h2', view);
        if (heading) heading.setAttribute('tabindex','-1');
        if (window.matchMedia?.('(max-width: 820px)').matches) window.scrollTo({top:0,behavior:'smooth'});
      }
      return result;
    };
    wrapped.__nx98 = true; window.setTab = wrapped;
  }
  function installMoreMenuPositioning() {
    const menu = $('#moreMenu');
    const trigger = $('#moreMenuBtn');
    if (!menu || !trigger || trigger.dataset.nx98PositionBound === '1') return;
    trigger.dataset.nx98PositionBound = '1';
    const place = () => {
      if (menu.hidden) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(300, window.innerWidth - 24);
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
      const below = rect.bottom + 8;
      const availableBelow = window.innerHeight - below - 12;
      const menuHeight = Math.min(menu.scrollHeight || 360, Math.max(180, window.innerHeight * .68));
      const top = availableBelow >= Math.min(menuHeight, 220)
        ? below
        : Math.max(12, rect.top - menuHeight - 8);
      menu.style.setProperty('left', `${left}px`, 'important');
      menu.style.setProperty('right', 'auto', 'important');
      menu.style.setProperty('top', `${top}px`, 'important');
      menu.style.setProperty('bottom', 'auto', 'important');
      menu.style.setProperty('max-height', `${Math.max(160, Math.min(window.innerHeight - top - 12, 520))}px`, 'important');
    };
    trigger.addEventListener('click', () => requestAnimationFrame(place));
    window.addEventListener('resize', place, {passive:true});
    window.addEventListener('scroll', place, {passive:true, capture:true});
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });
  }
  function systemListener() {
    try {
      modeMedia = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => { if (getMode() === 'system') applyMode(); };
      if (modeMedia.addEventListener) modeMedia.addEventListener('change', handler);
      else if (modeMedia.addListener) modeMedia.addListener(handler);
    } catch (_) {}
  }
  function checks() {
    const s = getState();
    const ids = ['workoutView','builderView','progressView','browseView','historyView','plannerView','insightsView','guideView','settingsView'];
    return {
      betaTitle: document.title.includes('9.8 Beta'),
      bodyRedesign: document.body.classList.contains('nx98'),
      currentLogo: $('.brand-logo')?.getAttribute('src') === ICON,
      heroInsideToday: $('#workoutView > .command-hero') !== null,
      navLabels: ['Today','Train','Progress','Browse'].every(text => $$('.dock-label').some(el => el.textContent.trim() === text)),
      allViewsPresent: ids.every(id => !!$(`#${id}`)),
      dataKeyPreserved: localStorage.getItem('vtaper-pro-v2') !== null || !!s,
      systemMode: getMode() === 'system',
      contrastPreferencePreserved: typeof s?.settings?.highContrast === 'boolean'
    };
  }
  function boot() {
    migrate();
    applyShell();
    wrapRenderers();
    wrapApplySettings();
    wrapTab();
    systemListener();
    if (typeof window.applySettings === 'function') window.applySettings();
    applyMode();
    syncDashboardEmptyState();
    window.__nexora98Checks = checks();
    window.__nexora98Ready = true;
    if (typeof window.saveState === 'function') save();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
