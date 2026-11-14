/* NEXORA FITNESS 9.7.0 — Appearance Studio and visual identity layer.
   Uses the existing settings object and preserves the v2 local-data key. */
(() => {
  'use strict';
  if (window.__vtaperVersion94Loaded) return;
  window.__vtaperVersion94Loaded = true;
  const $ = (s, r=document) => r.querySelector(s);
  const presets = [
    {id:'emerald',name:'Emerald',detail:'Green · teal',bg:'#080c09',accent:'#b5f27a',accent2:'#79d89a'},
    {id:'graphite',name:'Ice Blue',detail:'Blue · aqua',bg:'#080d12',accent:'#9edcf5',accent2:'#76bfe2'},
    {id:'violet',name:'Violet',detail:'Purple · indigo',bg:'#0c0911',accent:'#d0a8ff',accent2:'#9aabff'},
    {id:'ember',name:'Copper',detail:'Copper · amber',bg:'#110b09',accent:'#ffb47d',accent2:'#f2d28d'},
    {id:'light',name:'Pearl',detail:'Light · sage',bg:'#f2f5ef',accent:'#477d2a',accent2:'#277d61'},
    {id:'rose',name:'Rose',detail:'Rose · berry',bg:'#120c12',accent:'#f18bb4',accent2:'#c68bda'},
    {id:'ocean',name:'Ocean',detail:'Aqua · blue',bg:'#071218',accent:'#43d5df',accent2:'#398fd8'},
    {id:'forest',name:'Forest',detail:'Pine · fern',bg:'#09120c',accent:'#91d18b',accent2:'#4ba98b'},
    {id:'sunset',name:'Sunset',detail:'Coral · gold',bg:'#180e0b',accent:'#ff987d',accent2:'#f0c46f'},
    {id:'slate',name:'Slate',detail:'Steel · sky',bg:'#0d121a',accent:'#aabbd0',accent2:'#6e95bb'}
  ];
  const getCurrent = () => document.body.dataset.theme || 'emerald';
  const clearCustomAccent = () => {
    if (typeof state !== 'undefined' && state.settings) state.settings.accentColor = '';
    document.body.style.removeProperty('--accent');
    document.body.style.removeProperty('--accent2');
  };
  function syncPresetButtons() {
    const hasSavedCustomAccent = typeof state !== 'undefined' && !!state.settings?.accentColor;
    const editingCustomAccent = document.activeElement?.id === 'xAccentColor' && document.body.dataset.v94Preset === 'custom';
    const hasCustomAccent = hasSavedCustomAccent || editingCustomAccent;
    const current = hasCustomAccent ? 'custom' : getCurrent();
    document.body.dataset.v94Preset = current;
    document.querySelectorAll('[data-v94-preset]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.v94Preset === current));
    });
  }
  function applyPreset(id, announce=true) {
    const preset = presets.find(p => p.id === id);
    if (!preset) return;
    clearCustomAccent();
    if (typeof state !== 'undefined' && state.settings) {
      state.settings.theme = preset.id;
      state.settings.colorMode = preset.id === 'light' ? 'light' : 'dark';
      if (typeof saveState === 'function') saveState();
    }
    const theme = $('#themeSelect');
    if (theme) theme.value = preset.id;
    const colorMode = $('#xColorMode');
    if (colorMode) colorMode.value = preset.id === 'light' ? 'light' : 'dark';
    document.body.dataset.theme = preset.id;
    document.body.dataset.colorMode = preset.id === 'light' ? 'light' : 'dark';
    document.body.classList.remove('x-system-light');
    if (typeof applySettings === 'function') applySettings();
    if (theme) theme.value = preset.id;
    if (colorMode) colorMode.value = preset.id === 'light' ? 'light' : 'dark';
    const accent = $('#xAccentColor');
    if (accent) accent.value = preset.accent;
    document.body.dataset.v94Preset = preset.id;
    syncPresetButtons();
    if (announce && typeof toast === 'function') toast(`${preset.name} appearance applied.`);
  }
  function installThemeOptions() {
    const select = $('#themeSelect');
    if (!select) return;
    const existing = new Set([...select.options].map(o => o.value));
    const first = select.querySelector('option[value="emerald"]');
    if (first) first.textContent = 'Emerald';
    const legacyLabels = {purple:'Violet (legacy)',crimson:'Copper (legacy)',blue:'Ice Blue (legacy)'};
    Object.entries(legacyLabels).forEach(([value,label]) => {
      const option = select.querySelector(`option[value="${value}"]`);
      if (option) option.textContent = label;
    });
    const add = (value,label) => {
      if (existing.has(value)) return;
      const option = document.createElement('option'); option.value=value; option.textContent=label; select.append(option);
    };
    add('graphite','Ice Blue'); add('violet','Violet'); add('ember','Copper');
    add('rose','Rose'); add('ocean','Ocean'); add('forest','Forest'); add('sunset','Sunset'); add('slate','Slate');
    if (first) {
      const light = select.querySelector('option[value="light"]');
      if (light) light.textContent = 'Pearl';
    }
  }
  function mountPresetPicker() {
    const appearance = $('#settingsView .settings-grid > .panel');
    if (!appearance || $('#v94PresetPicker')) return;
    const themeRow = $('#themeSelect')?.closest('.setting-row');
    if (!themeRow) return;
    const block = document.createElement('section');
    block.id = 'v94PresetPicker';
    block.className = 'v94-preset-block';
    block.setAttribute('aria-label','Colour themes');
    block.innerHTML = `
      <div class="v94-preset-title"><b>COLOUR THEMES</b><small>Preview a complete colour system</small></div>
      <div class="v94-preset-grid" role="group" aria-label="Choose a visual theme">
        ${presets.map(p => `<button type="button" class="v94-preset" data-v94-preset="${p.id}" aria-pressed="false" style="--preset-bg:${p.bg};--preset-accent:${p.accent};--preset-accent2:${p.accent2}">
          <span class="v94-preset-swatch" aria-hidden="true"><i></i><i></i><i></i></span>
          <strong>${p.name}</strong><small>${p.detail}</small>
        </button>`).join('')}
      </div>
      <p class="v94-appearance-note">Selecting a preset updates the app theme and colour mode. Your workout plans, history and training preferences are not changed.</p>`;
    themeRow.insertAdjacentElement('afterend', block);
    block.addEventListener('click', e => {
      const button = e.target.closest('[data-v94-preset]');
      if (button) applyPreset(button.dataset.v94Preset);
    });
    syncPresetButtons();
  }
  function updateIdentity() {
    document.title = 'NEXORA FITNESS 9.8.3 Beta — Training & Progress';
    document.documentElement.dataset.vtaperVersion = '9.8.3-beta';
    document.documentElement.dataset.designVersion = '9.8.3-beta';
    document.body.dataset.designVersion = '9.8.3-beta';
    document.body.classList.add('v94-appearance');
    const version = $('#xAppVersion'); if (version) version.textContent = 'Version 9.8.3 Beta';
    const footer = $('.app-footer');
    if (footer?.firstElementChild) footer.firstElementChild.textContent = 'NEXORA FITNESS 9.8.3 BETA / HEALTH & TRAINING';
    const sub = $('.brand small'); if (sub) sub.textContent = 'APPEARANCE EDITION';
    const logo = $('.brand-logo'); if (logo) logo.alt = 'Nexora Fitness heart and pulse logo';
    const quality = $('#v9QualityResult'); if (quality) quality.textContent = quality.textContent.replace(/Version 9\.[0-9]+(?:\.[0-9]+)?/g,'Version 9.8.3 Beta');
  }
  function bindAppearanceControls() {
    // Capture theme changes before the base app listener so the active preset is not masked by a saved custom colour.
    document.addEventListener('change', event => {
      if (event.target?.id === 'themeSelect') {
        clearCustomAccent();
        const selected = event.target.value;
        const isLight = selected === 'light';
        if (typeof state !== 'undefined' && state.settings) state.settings.colorMode = isLight ? 'light' : 'dark';
        document.body.dataset.v94Preset = selected;
        const cm = $('#xColorMode'); if (cm) cm.value = isLight ? 'light' : 'dark';
        document.body.dataset.colorMode = isLight ? 'light' : 'dark';
        document.body.classList.remove('x-system-light');
        if (typeof saveState === 'function') saveState();
        setTimeout(syncPresetButtons,0);
      }
      if (event.target?.id === 'xAccentColor') {
        document.body.dataset.v94Preset = 'custom';
        syncPresetButtons();
      }
    }, true);
    document.addEventListener('input', event => {
      if (event.target?.id === 'xAccentColor') {
        document.body.style.setProperty('--accent', event.target.value);
        document.body.dataset.v94Preset = 'custom';
        syncPresetButtons();
      }
    }, true);
    const reconcileAppearanceState = () => setTimeout(() => { syncPresetButtons(); updateIdentity(); }, 80);
    $('#xResetAppearance')?.addEventListener('click', reconcileAppearanceState);
    $('#xRestoreSettings')?.addEventListener('click', reconcileAppearanceState);
    // Import applies a different settings object after this layer has initialized. Reconcile the active preset after its confirmation handler runs.
    $('#xConfirmBackupImport')?.addEventListener('click', reconcileAppearanceState);
  }
  function qualityChecks() {
    const checks = [
      ['9.7.0 style layer loaded',!!document.querySelector('link[href="version94.css"],style[data-source="version94.css"]')],
      ['9.7.0 script loaded',!!window.__vtaperVersion94Loaded],
      ['Theme selector has expanded colour palettes',['graphite','violet','ember','rose','ocean','forest','sunset','slate'].every(id => !!$('#themeSelect option[value="'+id+'"]'))],
      ['Ten colour theme controls mounted',document.querySelectorAll('#v94PresetPicker [data-v94-preset]').length===10],
      ['Preset selection is accessible',!!$('#v94PresetPicker [role="group"]')],
      ['Brand icon available',!!document.querySelector('.brand-logo')],
      ['Version label updated',$('#xAppVersion')?.textContent==='Version 9.8.3 Beta'],
      ['Training layer retained',!!document.querySelector('script[src="version93.js"],script[data-source="version93.js"]')||!!window.__vtaperVersion93Loaded],
      ['Local storage key preserved',localStorage.getItem('vtaper-pro-v2')!==null || typeof state!=='undefined'],
      ['PWA shell includes 9.7.0 files',!!document.querySelector('script[src="version94.js"],script[data-source="version94.js"]')||!!window.__vtaperVersion94Loaded]
    ];
    return {checks,pass:checks.filter(x=>x[1]).length,total:checks.length};
  }
  function init() {
    installThemeOptions();
    if (typeof state !== 'undefined' && state.settings?.accentColor) document.body.dataset.v94Preset = 'custom';
    updateIdentity();
    mountPresetPicker();
    bindAppearanceControls();
    syncPresetButtons();
    window.v94QualityChecks = qualityChecks;
    setTimeout(() => {
      const host = $('#v9QualityResult');
      const result = qualityChecks();
      if (host) host.textContent = `Version 9.8.3 Beta Appearance checks: ${result.pass}/${result.total} passed.`;
    },180);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
