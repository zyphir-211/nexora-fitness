/* NEXORA FITNESS 9.7.0 — design consistency, accessible interactions and responsive polish.
   This layer preserves the existing app data model and legacy script contracts. */
(() => {
  'use strict';
  window.__vtaperVersion91Loaded = true;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const labelMap = {
    weeklyFocus: 'Weekly training focus',
    xPlannerFocus: 'Weekly planner intention',
    xWarmupEditor: 'Warm-up routine instructions',
    xCooldownEditor: 'Cool-down routine instructions',
    xSavedTemplateSelect: 'Choose a saved workout template',
    xPresetName: 'Timer preset name',
    xPresetSeconds: 'Timer preset length in seconds',
    exitFocusBtn: 'Exit focus mode',
    xCloseExercise: 'Close exercise editor',
    xSetupClose: 'Close first-time setup',
    moreMenuBtn: 'Open more sections and options',
    focusBtn: 'Open focus mode',
    timerResetBtn: 'Reset session timer',
    xResetAppearance: 'Reset appearance settings',
    v9ResetDashboard: 'Restore the default dashboard layout'
  };
  const glyphLabels = new Map([
    ['✕', 'Close'], ['×', 'Close'], ['←', 'Previous'], ['→', 'Next'],
    ['↑', 'Move up'], ['↓', 'Move down'], ['↔', 'Change card width'],
    ['+', 'Add'], ['−', 'Remove'], ['•••', 'More options'], ['⛶', 'Focus mode']
  ]);
  let observer;
  let currentDialog = null;
  let dialogFocusTimer = 0;

  function addSkipLink() {
    if ($('#v91SkipLink')) return;
    const link = document.createElement('a');
    link.id = 'v91SkipLink';
    link.className = 'v91-skip-link';
    link.href = '#workoutView';
    link.textContent = 'Skip to main content';
    document.body.prepend(link);
    const mainView = $('#workoutView');
    if (mainView && !mainView.hasAttribute('tabindex')) mainView.tabIndex = -1;
    link.addEventListener('click', () => {
      const view = $('#workoutView');
      if (view) setTimeout(() => view.focus({ preventScroll: true }), 0);
    });
  }

  function inferLabel(control) {
    if (control.id && labelMap[control.id]) return labelMap[control.id];
    const placeholder = control.getAttribute('placeholder');
    if (placeholder) return placeholder.replace(/[.…]+$/g, '').trim();
    const id = control.id || control.name || '';
    if (id) return id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^x\s*/i, '').replace(/\b\w/g, c => c.toUpperCase());
    return control.tagName === 'SELECT' ? 'Choose an option' : 'Text entry';
  }

  function labelFormControls(root = document) {
    $$('input:not([type="hidden"]),select,textarea', root).forEach(control => {
      if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return;
      const id = control.id;
      const explicit = id ? $(`label[for="${CSS.escape(id)}"]`) : null;
      const wrapping = control.closest('label');
      if (explicit || wrapping) return;
      control.setAttribute('aria-label', inferLabel(control));
    });
  }

  function labelGlyphButtons(root = document) {
    $$('button', root).forEach(button => {
      if (button.hasAttribute('aria-label') || button.hasAttribute('aria-labelledby')) return;
      const current = (button.textContent || '').replace(/\s+/g, ' ').trim();
      const title = button.getAttribute('title');
      if (title) { button.setAttribute('aria-label', title); return; }
      if (!current) return;
      if (current.length <= 3 && glyphLabels.has(current)) {
        let label = glyphLabels.get(current);
        if (button.value === 'cancel' || button.closest('dialog')) label = 'Close dialog';
        if (button.id && labelMap[button.id]) label = labelMap[button.id];
        const action = button.dataset.v9Move || button.dataset.draftUp || button.dataset.draftDown;
        if (action) label = action === 'up' || action !== undefined && button.hasAttribute('data-draft-up') ? 'Move item up' : 'Move item down';
        button.setAttribute('aria-label', label);
      }
    });
  }

  function enhanceNavigation() {
    const nav = $('.tabs.glass-dock');
    const trigger = $('#moreMenuBtn');
    const menu = $('#moreMenu');
    if (nav) {
      nav.setAttribute('aria-label', 'Main sections');
      const icons = {
        workout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
        builder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8v8M3.5 10v4M18 8v8m2.5-6v4M6 12h12"/></svg>',
        progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 14h17M7 15l4-4 3 2 6-7"/></svg>',
        history: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
      };
      const names = {workout:'Home',builder:'Train',progress:'Progress',history:'History'};
      $$('.tab[data-tab]', nav).forEach(button => {
        const target = `${button.dataset.tab}View`;
        if ($('#' + target)) button.setAttribute('aria-controls', target);
        button.type = 'button';
        button.setAttribute('aria-label', names[button.dataset.tab] || button.textContent.trim());
        const icon = $('.dock-icon', button);
        if (icon && icons[button.dataset.tab]) icon.innerHTML = icons[button.dataset.tab];
        const selected = button.classList.contains('active');
        if (selected) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      const add = $('#createWorkoutBtn');
      if (add) add.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    }
    if (trigger && menu) {
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-controls', 'moreMenu');
      trigger.setAttribute('aria-label', 'Open more sections and options');
      trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';
      const focusButton = $('#focusBtn');
      if (focusButton) { focusButton.setAttribute('aria-label', 'Open focus mode'); focusButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>'; }
      menu.setAttribute('aria-label', 'More sections and settings');
      menu.setAttribute('role', 'menu');
      if (!menu.hidden) trigger.setAttribute('aria-expanded', 'true');
      $$('#moreMenu button').forEach(button => { button.type = 'button'; button.setAttribute('role', 'menuitem'); });
      trigger.addEventListener('click', () => setTimeout(() => trigger.setAttribute('aria-expanded', String(!menu.hidden)), 0));
      menu.addEventListener('click', () => setTimeout(() => trigger.setAttribute('aria-expanded', String(!menu.hidden)), 0));
    }
    updateCurrentView();
  }

  function updateCurrentView() {
    $$('.view').forEach(view => {
      const active = view.classList.contains('active');
      view.setAttribute('aria-hidden', String(!active));
      if (!view.hasAttribute('aria-labelledby')) {
        const heading = $('h1,h2', view);
        if (heading) {
          if (!heading.id) heading.id = `v91-heading-${view.id || 'page'}`;
          view.setAttribute('aria-labelledby', heading.id);
        }
      }
    });
    $$('.tabs .tab[data-tab]').forEach(button => {
      const active = button.classList.contains('active');
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const activeTab = $('.tabs .tab.active[data-tab]')?.dataset.tab;
    $$('#moreMenu [data-more-tab]').forEach(button => {
      if (button.dataset.moreTab === activeTab) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function enhanceDialogs() {
    $$('dialog').forEach(dialog => {
      const heading = $('h1,h2,h3', dialog);
      const description = $('.small-note,p', dialog);
      if (heading) {
        if (!heading.id) heading.id = `${dialog.id || 'dialog'}-title`;
        dialog.setAttribute('aria-labelledby', heading.id);
      }
      if (description) {
        if (!description.id) description.id = `${dialog.id || 'dialog'}-description`;
        dialog.setAttribute('aria-describedby', description.id);
      }
    });
  }

  function describeCharts(root = document) {
    const chartSelectors = [
      ['#xWeeklyActivity', 'Weekly saved workout activity'],
      ['#xWeeklyChart', 'Weekly workout history'],
      ['#xRepTrend', 'Recorded exercise trend'],
      ['#heatmap', 'Monthly workout activity calendar'],
      ['#v9Calendar', 'Planned and completed workout calendar'],
      ['#v9ProgressTrend', 'Exercise progression history']
    ];
    chartSelectors.forEach(([selector, fallback]) => {
      const chart = $(selector, root);
      if (!chart) return;
      chart.setAttribute('role', 'group');
      if (!chart.hasAttribute('aria-label')) chart.setAttribute('aria-label', fallback);
      let summary = chart.nextElementSibling;
      if (!summary || !summary.classList.contains('v91-chart-description')) {
        summary = document.createElement('p');
        summary.className = 'v91-chart-description';
        summary.dataset.v91SummaryFor = chart.id;
        chart.insertAdjacentElement('afterend', summary);
      }
      const values = (chart.innerText || chart.textContent || '').replace(/\s+/g, ' ').trim();
      const label = chart.getAttribute('aria-label') || fallback;
      const content = values ? `${label}. Chart labels and values: ${values.slice(0, 360)}${values.length > 360 ? '…' : ''}` : `${label}. No activity is available to summarize yet.`;
      if (summary.textContent !== content) summary.textContent = content;
      if (summary.id === '') summary.id = `${chart.id}-accessible-summary`;
      chart.setAttribute('aria-describedby', summary.id);
    });
  }

  function installMenuKeyboard() {
    const menu = $('#moreMenu');
    const trigger = $('#moreMenuBtn');
    if (!menu || !trigger || menu.dataset.v91Keyboard === 'true') return;
    menu.dataset.v91Keyboard = 'true';
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        if (menu.hidden) {
          event.preventDefault();
          trigger.click();
          requestAnimationFrame(() => menu.querySelector('button:not([disabled])')?.focus());
        }
      }
    });
    menu.addEventListener('keydown', event => {
      const items = $$('button:not([disabled])', menu);
      if (!items.length) return;
      const index = items.indexOf(document.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        trigger.click();
        trigger.focus();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        let next = index;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next].focus();
      }
    });
  }

  function installValidationFeedback() {
    document.addEventListener('invalid', event => {
      const control = event.target;
      if (!(control instanceof HTMLElement)) return;
      control.setAttribute('aria-invalid', 'true');
      const label = control.getAttribute('aria-label') || control.labels?.[0]?.textContent?.trim() || control.name || control.id || 'This field';
      const live = $('#v91LiveRegion');
      if (live) live.textContent = `${label}. ${control.validationMessage || 'Please check this field.'}`;
    }, true);
    const clearWhenValid = event => {
      const control = event.target;
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        if (control.checkValidity()) control.removeAttribute('aria-invalid');
      }
    };
    document.addEventListener('input', clearWhenValid, true);
    document.addEventListener('change', clearWhenValid, true);
  }

  function addLiveAnnouncements() {
    let live = $('#v91LiveRegion');
    if (!live) {
      live = document.createElement('div');
      live.id = 'v91LiveRegion';
      live.className = 'v91-sr-only';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      document.body.append(live);
    }
    const toast = $('#toast');
    if (toast && !toast.dataset.v91Observed) {
      toast.dataset.v91Observed = 'true';
      const copyToast = () => {
        const message = (toast.innerText || toast.textContent || '').replace(/\s+/g, ' ').trim();
        if (message) live.textContent = message;
      };
      new MutationObserver(copyToast).observe(toast, { childList: true, subtree: true, characterData: true });
    }
  }

  function addAccessibleLandmarks() {
    const header = $('header.topbar');
    if (header) header.setAttribute('aria-label', 'NEXORA FITNESS header');
    const main = $('main.app-shell');
    if (main) main.setAttribute('aria-label', 'NEXORA FITNESS main content');
    const footer = $('footer.app-footer');
    if (footer) footer.setAttribute('aria-label', 'Application information');
    const hero = $('.command-hero');
    if (hero && !hero.hasAttribute('aria-labelledby')) hero.setAttribute('aria-labelledby', 'pageTitle');
  }

  function updateVersionLabels() {
    document.title = 'NEXORA FITNESS 9.7.0 — Training & Progress';
    const version = $('#xAppVersion');
    if (version) version.textContent = 'Version 9.6.2';
    const footer = $('.app-footer');
    if (footer?.firstElementChild) footer.firstElementChild.textContent = 'NEXORA FITNESS 9.7.0 / HEALTH & TRAINING';
    const quality = $('#v9QualityResult');
    if (quality) quality.textContent = quality.textContent.replace(/Version 9\.0/g, 'Version 9.6.2');
    document.documentElement.dataset.vtaperVersion = '9.1';
  }

  function observeDynamicUI() {
    if (observer || !document.body) return;
    observer = new MutationObserver(records => {
      let shouldRefresh = false;
      for (const record of records) {
        if (record.type === 'childList' && (record.addedNodes.length || record.removedNodes.length)) shouldRefresh = true;
        if (record.type === 'attributes' && record.target.classList?.contains('view')) shouldRefresh = true;
      }
      if (!shouldRefresh) return;
      labelFormControls();
      labelGlyphButtons();
      enhanceDialogs();
      describeCharts();
      updateCurrentView();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function bindPageAnnouncements() {
    document.addEventListener('click', event => {
      const tab = event.target.closest('[data-tab]');
      const menuTab = event.target.closest('[data-more-tab]');
      const requested = tab?.dataset.tab || menuTab?.dataset.moreTab;
      if (!requested) return;
      setTimeout(() => {
        updateCurrentView();
        const view = $(`#${requested}View`);
        const heading = view && $('h1,h2', view);
        if (heading) {
          const live = $('#v91LiveRegion');
          if (live) live.textContent = `${heading.textContent.trim()} section opened.`;
        }
      }, 40);
    });
  }

  function enhanceFocusMode() {
    const overlay = $('#focusOverlay');
    if (!overlay) return;
    overlay.setAttribute('role', 'region');
    overlay.setAttribute('aria-label', 'Focus mode controls');
    overlay.setAttribute('aria-labelledby', 'focusExerciseName');
    const close = $('#exitFocusBtn');
    const trigger = $('#focusBtn');
    if (close) close.setAttribute('aria-label', 'Exit focus mode');
    if (trigger) { trigger.setAttribute('aria-controls', 'focusOverlay'); trigger.setAttribute('aria-expanded', 'false'); }
    overlay.setAttribute('aria-hidden', String(overlay.hidden));
    trigger?.addEventListener('click', () => setTimeout(() => { overlay.setAttribute('aria-hidden', 'false'); trigger.setAttribute('aria-expanded', 'true'); $('#focusStartBtn')?.focus(); }, 0));
    close?.addEventListener('click', () => setTimeout(() => { overlay.setAttribute('aria-hidden', 'true'); trigger?.setAttribute('aria-expanded', 'false'); trigger?.focus(); }, 0));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) setTimeout(() => { overlay.setAttribute('aria-hidden', 'true'); trigger?.setAttribute('aria-expanded', 'false'); trigger?.focus(); }, 0); });
  }

  function init() {
    document.documentElement.classList.add('v91-design-system');
    addSkipLink();
    addAccessibleLandmarks();
    labelFormControls();
    labelGlyphButtons();
    enhanceNavigation();
    enhanceDialogs();
    describeCharts();
    enhanceFocusMode();
    installMenuKeyboard();
    addLiveAnnouncements();
    installValidationFeedback();
    updateVersionLabels();
    bindPageAnnouncements();
    observeDynamicUI();
    document.body.dataset.designVersion = '9.1';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
