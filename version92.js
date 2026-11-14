/* NEXORA FITNESS 9.7.0 — settings refinement, responsive polish and smooth finishing layer. */
(() => {
  'use strict';
  if (window.__vtaperVersion92Loaded) return;
  window.__vtaperVersion92Loaded = true;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const categories = [
    { id: 'all', label: 'All settings', hint: 'Browse every preference' },
    { id: 'appearance', label: 'Appearance', hint: 'Theme, colour and layout' },
    { id: 'training', label: 'Training', hint: 'Schedule and workout defaults' },
    { id: 'timers', label: 'Timers', hint: 'Rest, sound and intervals' },
    { id: 'data', label: 'Data & tools', hint: 'Backups and diagnostics' }
  ];
  let activeCategory = 'all';
  let statusTimer = 0;
  let settingsCards = [];

  function categoryFor(title) {
    const name = (title || '').trim().toLowerCase();
    if (/appearance|accessibility|interface & layout/.test(name)) return 'appearance';
    if (/workout preferences|equipment available|dashboard preferences|personal preferences|training profile/.test(name)) return 'training';
    if (/timer|interval builder/.test(name)) return 'timers';
    if (/data|diagnostics|quality/.test(name)) return 'data';
    return 'training';
  }

  function mountSettingsChrome() {
    const view = $('#settingsView');
    const grid = $('.settings-grid', view);
    const searchRow = $('.settings-search-row', view);
    if (!view || !grid || !searchRow || $('#v92SettingsStatus')) return;

    const status = document.createElement('section');
    status.className = 'v92-settings-overview';
    status.innerHTML = `
      <div class="v92-settings-overview-copy">
        <span class="v92-settings-kicker">YOUR WORKSPACE</span>
        <h3>Make the app feel right.</h3>
        <p>Preferences apply as you change them and save automatically in this browser.</p>
      </div>
      <div class="v92-settings-live" id="v92SettingsStatus" role="status" aria-live="polite" aria-atomic="true">
        <span class="v92-save-dot" aria-hidden="true"></span>
        <span id="v92SettingsStatusText">All changes saved</span>
      </div>`;
    searchRow.insertAdjacentElement('afterend', status);

    const filter = document.createElement('nav');
    filter.className = 'v92-settings-categories';
    filter.setAttribute('aria-label', 'Settings categories');
    filter.setAttribute('role', 'group');
    filter.innerHTML = categories.map(item => `
      <button type="button" class="v92-category-chip" data-v92-category="${item.id}" aria-pressed="${item.id === 'all'}">
        <span>${item.label}</span><small data-v92-count="${item.id}">0</small>
      </button>`).join('');
    status.insertAdjacentElement('afterend', filter);

    const result = document.createElement('div');
    result.className = 'v92-settings-result-row';
    result.innerHTML = '<span id="v92SettingsResult" aria-live="polite">All preferences</span><span class="v92-settings-hint">Changes are stored on this device</span>';
    filter.insertAdjacentElement('afterend', result);

    const empty = document.createElement('div');
    empty.className = 'v92-settings-empty';
    empty.hidden = true;
    empty.innerHTML = '<strong>No settings found</strong><p>Try another search or choose a different category.</p><button type="button" class="btn btn-outline btn-small" id="v92ClearSettingsSearch">Clear search</button>';
    grid.insertAdjacentElement('afterend', empty);

    settingsCards = $$('.settings-grid > .panel', view);
    settingsCards.forEach((card, index) => {
      const heading = $('h3', card);
      const name = heading?.textContent.trim() || `Settings group ${index + 1}`;
      card.dataset.v92Category = categoryFor(name);
      card.classList.add('v92-settings-card');
      if (heading) {
        if (!heading.id) heading.id = `v92-settings-heading-${index + 1}`;
        card.setAttribute('aria-labelledby', heading.id);
      }
      const existing = card.querySelector('h3');
      if (existing && !existing.dataset.v92Enhanced) {
        existing.dataset.v92Enhanced = 'true';
        existing.insertAdjacentHTML('afterend', '<span class="v92-settings-card-rule" aria-hidden="true"></span>');
      }
    });

    filter.addEventListener('click', event => {
      const button = event.target.closest('[data-v92-category]');
      if (!button) return;
      activeCategory = button.dataset.v92Category;
      filter.querySelectorAll('[data-v92-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      applySettingsFilter();
    });
    $('#v92ClearSettingsSearch')?.addEventListener('click', () => {
      const search = $('#xSettingsSearch');
      if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); search.focus(); }
    });
    $('#xSettingsSearch')?.addEventListener('input', applySettingsFilter);

    const clearSearch = document.createElement('button');
    clearSearch.type = 'button';
    clearSearch.className = 'v92-clear-search';
    clearSearch.textContent = 'Clear';
    clearSearch.setAttribute('aria-label', 'Clear settings search');
    clearSearch.hidden = true;
    searchRow.append(clearSearch);
    clearSearch.addEventListener('click', () => {
      const search = $('#xSettingsSearch');
      if (search) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); search.focus(); }
    });
    $('#xSettingsSearch')?.addEventListener('input', () => { clearSearch.hidden = !$('#xSettingsSearch').value; });

    applySettingsFilter();
    updateAppearanceSummary();
  }

  function applySettingsFilter() {
    const query = ($('#xSettingsSearch')?.value || '').trim().toLowerCase();
    let visible = 0;
    const counts = Object.fromEntries(categories.map(item => [item.id, 0]));
    settingsCards.forEach(card => {
      const matchCategory = activeCategory === 'all' || card.dataset.v92Category === activeCategory;
      const matchQuery = !query || card.textContent.toLowerCase().includes(query);
      const show = matchCategory && matchQuery;
      card.hidden = !show;
      card.style.removeProperty('display');
      if (show) visible += 1;
      if (matchQuery) {
        counts.all += 1;
        counts[card.dataset.v92Category] = (counts[card.dataset.v92Category] || 0) + 1;
      }
    });
    categories.forEach(item => {
      const count = $(`[data-v92-count="${item.id}"]`);
      if (count) count.textContent = counts[item.id] || 0;
    });
    const empty = $('.v92-settings-empty');
    if (empty) empty.hidden = visible !== 0;
    const result = $('#v92SettingsResult');
    if (result) {
      const label = categories.find(item => item.id === activeCategory)?.label || 'All settings';
      result.textContent = query ? `${visible} matching ${visible === 1 ? 'section' : 'sections'} · ${label}` : `${label} · ${visible} ${visible === 1 ? 'section' : 'sections'}`;
    }
  }

  function announceSaved(message = 'Saved just now') {
    const host = $('#v92SettingsStatusText');
    const status = $('#v92SettingsStatus');
    if (!host || !status) return;
    host.textContent = message;
    status.dataset.state = /saving|pending/i.test(message) ? 'saving' : 'saved';
    clearTimeout(statusTimer);
    if (status.dataset.state === 'saved') {
      statusTimer = setTimeout(() => {
        if (!status.isConnected) return;
        host.textContent = 'All changes saved';
      }, 2600);
    }
  }

  function updateAppearanceSummary() {
    const root = document.body;
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#7cfa9b';
    const theme = root.dataset.theme || 'emerald';
    const density = root.dataset.density || 'comfortable';
    const contentWidth = root.dataset.contentWidth || 'standard';
    root.dataset.finishVersion = '9.2';
    const overview = $('.v92-settings-overview');
    if (!overview) return;
    overview.style.setProperty('--v92-current-accent', accent);
    const themeLabel = theme.charAt(0).toUpperCase() + theme.slice(1);
    let summary = $('#v92AppearanceSummary');
    if (!summary) {
      summary = document.createElement('div');
      summary.id = 'v92AppearanceSummary';
      summary.className = 'v92-appearance-summary';
      overview.append(summary);
    }
    summary.innerHTML = `<span class="v92-summary-swatch" aria-hidden="true"></span><span><b>${themeLabel} theme</b><small>${density} spacing · ${contentWidth} width</small></span>`;
  }

  function previewControl(event) {
    const control = event.target;
    if (!(control instanceof HTMLElement)) return;
    if (control.id === 'glowSlider') document.documentElement.style.setProperty('--glow', String(Math.max(0, Math.min(100, Number(control.value) || 0)) / 100));
    if (control.id === 'xAccentColor') document.body.style.setProperty('--accent', control.value);
    if (control.id === 'xSoundVolume') control.style.setProperty('--v92-range-value', `${control.value}%`);
  }

  function onSettingInput(event) {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
    if (!control.closest('#settingsView .settings-grid')) return;
    if (control.type === 'range' || control.type === 'color' || control.tagName === 'TEXTAREA' || control.type === 'text' || control.type === 'search') announceSaved('Pending change');
  }

  function onSettingChanged(event) {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
    if (!control.closest('#settingsView .settings-grid')) return;
    announceSaved('Saved just now');
    updateAppearanceSummary();
  }

  function installShortcuts() {
    document.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === ',') {
        event.preventDefault();
        if (typeof window.setTab === 'function') window.setTab('settings');
        setTimeout(() => $('#xSettingsSearch')?.focus(), 60);
      } else if (event.key === 'Escape' && document.activeElement?.id === 'xSettingsSearch' && $('#xSettingsSearch').value) {
        $('#xSettingsSearch').value = '';
        applySettingsFilter();
      }
    });
  }

  function smoothFinish() {
    document.documentElement.dataset.finishVersion = '9.2';
    const style = document.createElement('style');
    style.id = 'v92-inline-motion-guard';
    style.textContent = `
      @media (prefers-reduced-motion: reduce) {
        html:focus-within { scroll-behavior: auto !important; }
        .v92-settings-card, .v92-category-chip, .v92-settings-live, .view.active { animation: none !important; transition: none !important; }
      }
    `;
    document.head.append(style);
    document.body.classList.add('v92-finish');
    setSectionContext();
  }

  function setSectionContext(name) {
    const section = name || $('.view.active')?.id?.replace(/View$/, '') || 'workout';
    document.body.classList.toggle('v92-view-secondary', section !== 'workout');
    document.body.dataset.currentSection = section;
  }

  function updateVersionLabels() {
    document.title = 'NEXORA FITNESS 9.7.0 — Training & Progress';
    const version = $('#xAppVersion');
    if (version) version.textContent = 'Version 9.7.0';
    const footer = $('.app-footer');
    if (footer?.firstElementChild) footer.firstElementChild.textContent = 'NEXORA FITNESS 9.7.0 / HEALTH & TRAINING';
    const quality = $('#v9QualityResult');
    if (quality) quality.textContent = quality.textContent.replace(/Version 9\.[01]/g, 'Version 9.7.0');
    document.documentElement.dataset.vtaperVersion = '9.7.0';
    document.body.dataset.designVersion = '9.7.0';
  }

  function init() {
    smoothFinish();
    mountSettingsChrome();
    updateVersionLabels();
    document.addEventListener('change', onSettingChanged);
    document.addEventListener('input', previewControl, { passive: true });
    document.addEventListener('input', onSettingInput);
    document.addEventListener('click', event => {
      if (event.target.closest('#xResetAppearance,#xRestoreSettings,#xRunDiagnostics,#xSavePreset,#xNotificationPermission,#v9SaveProfile,#v9AddGoal,#v9ResetDashboard')) {
        setTimeout(() => { announceSaved('Settings updated'); updateAppearanceSummary(); applySettingsFilter(); }, 80);
      }
    });
    installShortcuts();
    window.addEventListener('pageshow', updateAppearanceSummary);
    const originalSetTab = window.setTab;
    if (typeof originalSetTab === 'function' && !originalSetTab.__v92Wrapped) {
      const wrapped = function (name) {
        const result = originalSetTab.apply(this, arguments);
        setSectionContext(name);
        if (name === 'settings') {
          requestAnimationFrame(() => { updateAppearanceSummary(); applySettingsFilter(); });
        }
        return result;
      };
      wrapped.__v92Wrapped = true;
      window.setTab = wrapped;
    }
    announceSaved('All changes saved');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
