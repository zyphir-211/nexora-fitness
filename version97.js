/* NEXORA FITNESS 9.7.0 — Rebrand, restored settings, simple dashboard and heading rhythm. */
(() => {
  'use strict';
  if (window.__nexora97Loaded) return;
  window.__nexora97Loaded = true;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const BRAND = 'NEXORA FITNESS';
  const TAGLINE = 'HEALTH · TRAINING · PROGRESS';
  const ICON = 'nexora-icon-192.png';
  const VERSION = '9.8.3 Beta';
  const PALETTES = {
    emerald: { bg:'#080e10', panel:'#111b20', panel2:'#1b2a30', text:'#f1f7f7', muted:'#a2b6ba', accent:'#42d6a5', accent2:'#45b9d8', line:'#30464d' },
    graphite:{ bg:'#091019', panel:'#121e29', panel2:'#1c2b39', text:'#f0f6fa', muted:'#a4b5c2', accent:'#79c9f2', accent2:'#6fd9dc', line:'#334957' },
    violet:  { bg:'#0d0c16', panel:'#191729', panel2:'#25233a', text:'#f6f2ff', muted:'#b2abc8', accent:'#b79cff', accent2:'#8c9dff', line:'#443d5c' },
    ember:   { bg:'#130f0d', panel:'#201916', panel2:'#30231d', text:'#fff5ec', muted:'#c1a99a', accent:'#e6a16e', accent2:'#e3c078', line:'#574235' },
    light:   { bg:'#f1f5f2', panel:'#ffffff', panel2:'#e7efeb', text:'#182923', muted:'#5b7068', accent:'#178c70', accent2:'#278eb1', line:'#c6d8d1' },
    rose:    { bg:'#120c12', panel:'#201521', panel2:'#302032', text:'#fff2f8', muted:'#c7aabb', accent:'#f18bb4', accent2:'#c68bda', line:'#54364d' },
    ocean:   { bg:'#071218', panel:'#10212a', panel2:'#19313d', text:'#effaff', muted:'#a2c0ca', accent:'#43d5df', accent2:'#398fd8', line:'#2d5261' },
    forest:  { bg:'#09120c', panel:'#142119', panel2:'#203329', text:'#f0f8f0', muted:'#a8bca9', accent:'#91d18b', accent2:'#4ba98b', line:'#365541' },
    sunset:  { bg:'#180e0b', panel:'#251713', panel2:'#38241c', text:'#fff5ef', muted:'#c7a79a', accent:'#ff987d', accent2:'#f0c46f', line:'#624237' },
    slate:   { bg:'#0d121a', panel:'#18212d', panel2:'#243244', text:'#f1f5fa', muted:'#aab8ca', accent:'#aabbd0', accent2:'#6e95bb', line:'#3d4e63' }
  };
  const THEME_MAP = { emerald:'emerald', graphite:'graphite', violet:'violet', purple:'violet', ember:'ember', crimson:'ember', blue:'graphite', light:'light', rose:'rose', ocean:'ocean', forest:'forest', sunset:'sunset', slate:'slate' };
  let migrated = false;

  function getState() { try { return typeof state === 'object' && state ? state : null; } catch (_) { return null; } }
  function cleanTheme(value) { return THEME_MAP[String(value || 'emerald').toLowerCase()] || 'emerald'; }
  function validHex(value) { return /^#[0-9a-f]{6}$/i.test(String(value || '')); }
  function syncBrandState() {
    const s = getState(); if (!s) return;
    s.settings = s.settings && typeof s.settings === 'object' ? s.settings : {};
    s.morphset = s.morphset && typeof s.morphset === 'object' ? s.morphset : {};
    s.morphset.brandName = BRAND;
    s.morphset.tagline = TAGLINE;
    s.morphset.logoData = '';
  }
  function applyPalette(theme, {preserveAccent = true} = {}) {
    const s = getState(); if (!s) return;
    const id = cleanTheme(theme);
    const c = s.morphset || (s.morphset = {});
    const customAccent = preserveAccent && validHex(s.settings?.accentColor) ? s.settings.accentColor : '';
    c.colors = { ...PALETTES[id], ...(customAccent ? { accent: customAccent } : {}) };
    c.preset = id === 'emerald' ? 'obsidian' : id === 'graphite' ? 'classic' : id === 'light' ? 'light' : 'custom';
    const mode = String(s.settings.colorMode || (id === 'light' ? 'light' : 'dark'));
    c.colorMode = mode === 'system' ? 'auto' : (mode === 'light' ? 'light' : 'dark');
    if (Number.isFinite(Number(s.settings.glow))) c.shadow = Math.round(Math.max(0, Math.min(100, Number(s.settings.glow))) * .6);
    s.settings.theme = id;
  }
  function applyBrandDOM() {
    const brand = $('.brand');
    if (brand) {
      brand.setAttribute('aria-label', `${BRAND} home`);
      const logo = $('.brand-logo', brand);
      if (logo) { logo.src = ICON; logo.alt = `${BRAND} logo`; }
      const name = $('.ms-brand-name', brand); if (name) name.textContent = BRAND;
      const sub = $('.ms-brand-sub', brand); if (sub) sub.textContent = TAGLINE;
    }
    const boot = $('.boot-mark img'); if (boot) { boot.src = ICON; boot.alt = ''; }
    const header = $('.topbar'); if (header) header.setAttribute('aria-label', `${BRAND} header`);
    const main = $('#top'); if (main) main.setAttribute('aria-label', `${BRAND} main content`);
    const meta = $('meta[name="description"]'); if (meta) meta.content = `${BRAND} helps you plan workouts, record training and review your progress.`;
    const theme = $('meta[name="theme-color"]'); if (theme) theme.content = PALETTES[cleanTheme(getState()?.settings?.theme)].bg;
    document.title = `${BRAND} ${VERSION} — Training & Progress`;
    document.documentElement.dataset.vtaperVersion = VERSION;
    document.documentElement.dataset.nexoraVersion = VERSION;
    document.body.dataset.nexoraVersion = VERSION;
    const version = $('#xAppVersion'); if (version) version.textContent = `Version ${VERSION}`;
    const footer = $('.app-footer span'); if (footer) footer.textContent = `${BRAND} ${VERSION} / HEALTH & TRAINING`;
    const logoLinks = $$('link[rel="icon"]'); logoLinks.forEach(link => link.href = ICON);
  }
  function migrateState() {
    const s = getState(); if (!s) return;
    s.settings = s.settings && typeof s.settings === 'object' ? s.settings : {};
    s.morphset = s.morphset && typeof s.morphset === 'object' ? s.morphset : {};
    if (!s.settings.nexora97Migration) {
      // New defaults: high contrast is opt-in, and the dashboard starts simplified.
      s.settings.highContrast = false;
      s.settings.contrastLevel = 'standard';
      s.settings.showLaunchpad = false;
      s.settings.nexora97Migration = true;
      const theme = cleanTheme(s.settings.theme);
      applyPalette(theme, { preserveAccent: false });
      s.settings.theme = theme;
      const c = s.morphset;
      c.nav = 'bottom'; c.navStyle = 'glass'; c.layout = 'balanced'; c.width = 'standard';
      c.labels = { workout:'Today', builder:'Train', progress:'Progress', browse:'Browse', history:'History', planner:'Planner', insights:'Insights', guide:'Guide', settings:'Settings' };
      c.navVisible = { workout:true, builder:true, progress:true, browse:true, history:true };
      c.widgets = { welcome:true, insights:true, quick:true };
      c.widgetOrder = ['welcome','insights','quick'];
      c.browsePins = ['planner','history','guide'];
      c.focusMetrics = [];
      migrated = true;
    }
    syncBrandState();
    s.settings.theme = cleanTheme(s.settings.theme);
    // Legacy theme names are migrated to colour names without dropping other settings.
    if (!Array.isArray(s.morphset.browsePins)) s.morphset.browsePins = ['planner','history','guide'];
    s.morphset.browsePins = s.morphset.browsePins.filter(id => id !== 'studio').slice(0,5);
    if (!Array.isArray(s.morphset.focusMetrics)) s.morphset.focusMetrics = [];
  }
  function persistState() {
    try { if (typeof window.saveState === 'function') window.saveState(); } catch (error) { console.warn('Nexora preferences could not be saved', error); }
  }
  function wrapPersistence() {
    if (typeof window.saveState === 'function' && !window.saveState.__nexora97) {
      const base = window.saveState;
      const wrapped = function () { syncBrandState(); return base.apply(this, arguments); };
      wrapped.__nexora97 = true; window.saveState = wrapped;
    }
    if (typeof window.applySettings === 'function' && !window.applySettings.__nexora97) {
      const base = window.applySettings;
      const wrapped = function () {
        migrateState();
        applyPalette(getState()?.settings?.theme || 'emerald');
        const result = base.apply(this, arguments);
        applyBrandDOM(); syncContrastControls(); syncThemeControls();
        return result;
      };
      wrapped.__nexora97 = true; window.applySettings = wrapped;
    }
  }
  function syncContrastControls() {
    const s = getState(); if (!s) return;
    const on = !!s.settings.highContrast;
    document.body.classList.toggle('high-contrast', on);
    document.body.dataset.contrast = on ? 'high' : 'standard';
    const toggle = $('#contrastToggle'); if (toggle) toggle.checked = on;
    const select = $('#xContrastLevel'); if (select) select.value = on ? (s.settings.contrastLevel === 'maximum' ? 'maximum' : 'high') : 'standard';
  }
  function syncThemeControls() {
    const s = getState(); if (!s) return;
    const theme = cleanTheme(s.settings.theme);
    const select = $('#themeSelect'); if (select) select.value = theme;
    $$('[data-v94-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.v94Preset === theme)));
    $$('[data-nx-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.nxTheme === theme)));
  }
  function restoreSettingsAppearance() {
    const appearance = $('#settingsView .nx-appearance-panel'); if (!appearance) return;
    const themeRow = $('#themeSelect')?.closest('.setting-row');
    const glowRow = $('#glowSlider')?.closest('.setting-row');
    themeRow?.removeAttribute('hidden'); glowRow?.removeAttribute('hidden');
    const studioButton = $('#msOpenStudioSettings'); if (studioButton) studioButton.remove();
    const copy = appearance.querySelector('.small-note');
    if (copy) copy.textContent = 'Choose a colour theme and adjust its glow. Your training, display and accessibility preferences remain in their familiar sections.';
    const picker = $('#v94PresetPicker');
    if (picker) {
      const title = $('.v94-preset-title', picker); if (title) { const b = $('b', title); const small = $('small', title); if (b) b.textContent = 'COLOUR THEMES'; if (small) small.textContent = 'Choose the look that suits you'; }
      const count = picker.querySelector('.pill'); if (count) count.textContent = '10 COLOURS';
      $$('[data-v94-preset]', picker).forEach(button => {
        const labels = { emerald:'Emerald', graphite:'Ice Blue', violet:'Violet', ember:'Copper', light:'Pearl', rose:'Rose', ocean:'Ocean', forest:'Forest', sunset:'Sunset', slate:'Slate' };
        const label = $('strong', button); if (label) label.textContent = labels[button.dataset.v94Preset] || label.textContent;
      });
    }
    const theme = $('#themeSelect');
    if (theme) {
      Array.from(theme.options).forEach(option => {
        const mapped = { purple:'violet', crimson:'ember', blue:'graphite' }[option.value];
        if (mapped) { option.hidden = true; option.textContent = `${mapped === 'violet' ? 'Violet' : mapped === 'ember' ? 'Copper' : 'Ice Blue'} (legacy)`; }
        else option.textContent = ({emerald:'Emerald',graphite:'Ice Blue',violet:'Violet',ember:'Copper',light:'Pearl',rose:'Rose',ocean:'Ocean',forest:'Forest',sunset:'Sunset',slate:'Slate'})[option.value] || option.textContent;
      });
    }
  }
  function removeFullStudio() {
    $('#studioView')?.remove();
    $('#msQuickOpen')?.remove();
    $('#msOpenStudioSettings')?.remove();
    $('#moreMenu')?.querySelectorAll('[data-more-tab="studio"]').forEach(node => node.remove());
    $('#browseView')?.querySelectorAll('[data-browse-open="studio"], [data-browse-pin="studio"]').forEach(node => node.closest('[data-browse-item]')?.remove() || node.remove());
    $$('[data-tab="studio"]').forEach(node => node.remove());
  }
  function simplifyDashboard() {
    const heading = $('#workoutView .dashboard-welcome-copy h2'); if (heading) heading.textContent = 'Your day, simplified.';
    const text = $('#workoutView .dashboard-welcome-copy p:not(.eyebrow)'); if (text) text.textContent = 'Your activity, next session and progress — together in one calm view.';
    const launchpad = $('#workoutView .dashboard-launchpad');
    const s = getState();
    if (launchpad && s?.settings?.showLaunchpad === false) launchpad.style.display = 'none';
    const greeting = $('#workoutView .dashboard-welcome'); if (greeting) greeting.setAttribute('aria-label','Nexora Fitness daily summary');
    // Keep the home page as a concise overview. The complete training plan and tools remain available in one accessible disclosure.
    const insights = $('#xDashboardInsights');
    if (insights && !$('#nxTrainingDetails')) {
      const details = document.createElement('details');
      details.id = 'nxTrainingDetails'; details.className = 'nx-training-details';
      details.innerHTML = '<summary><span class="nx-training-summary-icon" aria-hidden="true">↗</span><span class="nx-training-summary-copy"><strong>Open today’s training</strong><small>Workout plan, exercises, timers and recovery tools</small></span><span class="nx-training-summary-action">View plan <span aria-hidden="true">→</span></span></summary><div class="nx-training-details-content"></div>';
      let next = insights.nextElementSibling;
      const content = $('.nx-training-details-content', details);
      while (next) { const following = next.nextElementSibling; content.appendChild(next); next = following; }
      insights.insertAdjacentElement('afterend', details);
      const complete = $('#setsDoneText')?.textContent || '';
      const done = Number((complete.match(/^(\d+)/) || [])[1] || 0);
      details.open = done > 0;
    }
  }
  function syncOldSettings() {
    const s = getState(); if (!s) return;
    const theme = $('#themeSelect'); if (theme) theme.value = cleanTheme(s.settings.theme);
    const glow = $('#glowSlider'); if (glow) glow.value = String(Number.isFinite(Number(s.settings.glow)) ? s.settings.glow : 65);
    const high = $('#contrastToggle'); if (high) high.checked = !!s.settings.highContrast;
    const contrast = $('#xContrastLevel'); if (contrast) contrast.value = s.settings.highContrast ? (s.settings.contrastLevel || 'high') : 'standard';
    const launch = $('#xShowLaunchpad'); if (launch) launch.checked = s.settings.showLaunchpad !== false;
  }
  function applyHeadingRhythm() {
    document.body.classList.add('nexora-97');
    // Set a global typography rhythm, including headings created by dynamic views.
    $$('h1,h2,h3,h4').forEach(el => { if (!el.style.lineHeight) el.style.lineHeight = '1.24'; });
  }
  function bindThemeControls() {
    document.addEventListener('change', event => {
      if (event.target?.id === 'themeSelect') {
        const s = getState(); if (!s) return;
        s.settings.theme = cleanTheme(event.target.value);
        s.settings.accentColor = '';
        applyPalette(s.settings.theme, { preserveAccent:false });
        persistState();
        if (typeof window.applySettings === 'function') window.applySettings();
        else { applyBrandDOM(); syncThemeControls(); }
      }
      if (event.target?.id === 'xAccentColor' && validHex(event.target.value)) {
        const s = getState(); if (!s) return;
        s.settings.accentColor = event.target.value;
        const id = cleanTheme(s.settings.theme);
        s.morphset.colors = { ...PALETTES[id], accent:event.target.value };
        persistState();
      }
      if (event.target?.id === 'xContrastLevel') {
        const s = getState(); if (!s) return;
        const level = ['standard','high','maximum'].includes(event.target.value) ? event.target.value : 'standard';
        s.settings.contrastLevel = level; s.settings.highContrast = level !== 'standard';
        persistState(); syncContrastControls();
      }
    }, true);
    document.addEventListener('change', event => {
      if (event.target?.id === 'glowSlider') {
        const s = getState(); if (!s) return;
        s.settings.glow = Number(event.target.value);
        s.morphset.shadow = Math.round(Math.max(0,Math.min(100,s.settings.glow))*.6);
        persistState();
        if (typeof window.applySettings === 'function') window.applySettings();
      }
      if (event.target?.id === 'contrastToggle') {
        const s = getState(); if (!s) return;
        s.settings.highContrast = !!event.target.checked;
        s.settings.contrastLevel = s.settings.highContrast ? 'high' : 'standard';
        persistState(); syncContrastControls();
      }
    });
    $('#settingsView')?.addEventListener('click', event => {
      const button = event.target.closest('[data-v94-preset]');
      if (button) {
        const s = getState(); if (!s) return;
        const id = cleanTheme(button.dataset.v94Preset);
        s.settings.theme = id; s.settings.accentColor = '';
        applyPalette(id,{preserveAccent:false}); persistState();
      }
    }, true);
  }
  function wrapNavigation() {
    if (typeof window.setTab === 'function' && !window.setTab.__nexora97) {
      const base = window.setTab;
      const wrapped = function (name) {
        const safe = name === 'studio' ? 'settings' : name;
        const result = base.apply(this, [safe, ...Array.prototype.slice.call(arguments,1)]);
        if (safe === 'workout') simplifyDashboard();
        applyBrandDOM();
        return result;
      };
      wrapped.__nexora97 = true; window.setTab = wrapped;
    }
  }
  function runChecks() {
    const checks = {
      brand: $('.ms-brand-name')?.textContent === BRAND,
      logo: $('.brand-logo')?.getAttribute('src') === ICON,
      studioRemoved: !$('#studioView') && !$('#msOpenStudioSettings'),
      oldSettingsRestored: !!$('#themeSelect') && !!$('#glowSlider') && !!$('#contrastToggle'),
      colourNames: ['emerald','graphite','violet','ember','light','rose','ocean','forest','sunset','slate'].every(id => !!$(`#themeSelect option[value="${id}"]`)),
      contrastDefaultOff: !getState()?.settings?.highContrast,
      version: $('#xAppVersion')?.textContent === `Version ${VERSION}`,
      dashboardSimple: $('#workoutView .dashboard-welcome-copy h2')?.textContent === 'Your day, simplified.' && !!$('#nxTrainingDetails'),
      focusMetricsStartEmpty: Array.isArray(getState()?.morphset?.focusMetrics) && getState().morphset.focusMetrics.length === 0
    };
    window.__nexora97Checks = checks;
    return checks;
  }
  function boot() {
    migrateState();
    wrapPersistence();
    wrapNavigation();
    removeFullStudio();
    // Preserve the familiar Settings controls while removing unrestricted, app-wide editing.
    restoreSettingsAppearance();
    bindThemeControls();
    // Ensure the wrapped applySettings uses colour values from the legacy settings selector.
    if (typeof window.applySettings === 'function') {
      const base = window.applySettings;
      if (!base.__nexora97) {
        const wrapped = function () {
          migrateState();
          applyPalette(getState()?.settings?.theme || 'emerald');
          const result = base.apply(this, arguments);
          applyBrandDOM(); syncThemeControls(); syncContrastControls();
          return result;
        };
        wrapped.__nexora97 = true; window.applySettings = wrapped;
      }
    }
    applyHeadingRhythm();
    applyBrandDOM();
    syncOldSettings();
    if (typeof window.applySettings === 'function') window.applySettings();
    syncThemeControls();
    syncContrastControls();
    simplifyDashboard();
    runChecks();
    // Older backups are previewed then explicitly confirmed by the app. Reapply the brand after that restore.
    $('#xConfirmBackupImport')?.addEventListener('click', () => setTimeout(() => {
      migrateState(); syncBrandState(); applyPalette(getState()?.settings?.theme || 'emerald');
      applyBrandDOM(); syncOldSettings(); syncThemeControls(); syncContrastControls(); simplifyDashboard();
      persistState(); runChecks();
    }, 60));
    if (migrated) persistState();
    window.__nexora97Ready = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
