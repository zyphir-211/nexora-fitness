/* NEXORA FITNESS 10.0 Beta — Nebula full-app visual rebuild.
   Brand asset stays unchanged; app logic, IDs, localStorage key and workout records are preserved. */
(() => {
  'use strict';
  if (window.__nexora100Loaded) return;
  window.__nexora100Loaded = true;
  const VERSION = '10.0 Beta';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));

  function applySystemAppearance() {
    const mode = document.body.dataset.nx98Mode || 'system';
    const systemLight = mode === 'system' && !!window.matchMedia?.('(prefers-color-scheme: light)').matches;
    const isLight = mode === 'light' || systemLight;
    document.body.classList.toggle('nx10-system-light', isLight);
    let saved = {};
    try { saved = (typeof state !== 'undefined' && state?.morphset?.colors) || window.state?.morphset?.colors || {}; } catch (_) {}
    const palette = isLight ? {
      '--bg':'#f1f4fc','--panel':'#ffffff','--panel2':'#e9eef9','--surface':'#f8faff',
      '--text':'#17203b','--muted':'#52617d','--line':'rgba(57,74,130,.18)'
    } : {
      '--bg':saved.bg || '#080b18','--panel':saved.panel || '#11182a','--panel2':saved.panel2 || '#19233d',
      '--surface':saved.panel2 || '#121b30','--text':saved.text || '#f4f5ff',
      '--muted':saved.muted || '#a4aecb','--line':saved.line || 'rgba(160,174,236,.18)'
    };
    Object.entries(palette).forEach(([key,value])=>document.body.style.setProperty(key,value));
  }

  function updateBrandAndVersion() {
    document.body.classList.add('nx10');
    document.body.dataset.nx100Design = 'nebula';
    const name = $('.ms-brand-name');
    const sub = $('.ms-brand-sub');
    if (name) name.textContent = 'NEXORA FITNESS';
    if (sub) sub.textContent = 'MOVE · GROW · DISCOVER';
    const brand = $('.topbar .brand');
    if (brand) brand.setAttribute('aria-label', 'NEXORA FITNESS home');
    const logo = $('.topbar .brand-logo');
    if (logo) logo.alt = 'NEXORA FITNESS logo';
    const version = $('#xAppVersion');
    if (version) version.textContent = `Version ${VERSION}`;
    const footer = $('.app-footer span');
    if (footer) footer.textContent = `NEXORA FITNESS ${VERSION.toUpperCase()}`;
    const footerTwo = $('.app-footer span + span');
    if (footerTwo) footerTwo.textContent = 'A fresh space for training and progress.';
    const eyebrow = $('#phaseEyebrow');
    if (eyebrow && $('#workoutView')?.classList.contains('active')) eyebrow.textContent = 'YOUR DAILY COMMAND CENTER';
    const meta = $('meta[name="description"]');
    if (meta) meta.content = 'NEXORA FITNESS 10.0 Beta — a complete new training, progress and wellness experience.';
    const themeMeta = $('meta[name="theme-color"]');
    if (themeMeta && document.body.dataset.nx98Mode !== 'light') themeMeta.content = '#080b18';
    document.title = `NEXORA FITNESS ${VERSION} — Nebula Design Preview`;
    document.documentElement.dataset.nexoraVersion = '10.0-beta';
    document.body.dataset.nexoraVersion = '10.0-beta';
    if (!$('#nx100VersionPill')) {
      const pill = document.createElement('span');
      pill.id = 'nx100VersionPill';
      pill.className = 'nx10-version-pill';
      pill.textContent = '10.0 DESIGN BETA';
      const status = $('.top-status');
      if (status) status.append(pill);
    }
    applySystemAppearance();
  }


  function wrap(name, after) {
    const base = window[name];
    if (typeof base !== 'function' || base.__nx100Wrapped) return;
    const wrapped = function (...args) {
      const result = base.apply(this, args);
      try { after?.(); updateBrandAndVersion(); } catch (error) { console.warn(`NEXORA 10.0 refresh after ${name} failed`, error); }
      return result;
    };
    wrapped.__nx100Wrapped = true;
    window[name] = wrapped;
  }

  function checks() {
    const ids = ['workoutView','builderView','progressView','browseView','historyView','plannerView','insightsView','guideView','settingsView','moreMenu','createWorkoutBtn'];
    return {
      redesignLoaded: document.body.classList.contains('nx10'),
      redesignStylesheet: !!$('link[href="v100-redesign.css"]'),
      officialLogoPreserved: $('.brand-logo')?.getAttribute('src') === 'nexora-icon-192.png',
      bottomNavigationPresent: !!$('nav.tabs.glass-dock'),
      allAppSectionsPresent: ids.every(id => !!document.getElementById(id)),
      existingStorageKeyPreserved: localStorage.getItem('vtaper-pro-v2') !== null || !!window.state,
      workoutEnginePreserved: typeof window.getPlan === 'function' && typeof window.renderWorkout === 'function',
      releaseNotesPagePresent: !!$('#updatesView')
    };
  }

  function boot() {
    updateBrandAndVersion();
    wrap('renderWorkout');
    wrap('renderProgress');
    wrap('renderTimer');
    wrap('applySettings');
    wrap('setTab');
    applySystemAppearance();
    try {
      const media = window.matchMedia?.('(prefers-color-scheme: light)');
      const update = () => { applySystemAppearance(); };
      if (media?.addEventListener) media.addEventListener('change', update);
      else if (media?.addListener) media.addListener(update);
    } catch (_) {}
    window.addEventListener('pageshow', updateBrandAndVersion);
    window.__nexora100Checks = checks();
    window.__nexora100Ready = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
