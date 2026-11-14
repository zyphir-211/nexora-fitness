/* NEXORA FITNESS 9.8.3 — additional controlled appearance options. */
(() => {
  'use strict';
  if (window.__nexora983AppearanceLoaded) return;
  window.__nexora983AppearanceLoaded = true;
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const defaults = {
    nx983Density:'comfortable', nx983CardStyle:'elevated', nx983Corners:'rounded',
    nx983Background:'soft', nx983ButtonStyle:'gradient', nx983IconStyle:'tiles',
    nx983Motion:'balanced'
  };
  const getState = () => { try { return typeof state === 'object' && state ? state : null; } catch (_) { return null; } };
  const save = () => { try { if (typeof window.saveState === 'function') window.saveState(); } catch (e) { console.warn('Appearance settings could not be saved', e); } };
  function normalize() {
    const s=getState(); if(!s) return;
    s.settings=s.settings&&typeof s.settings==='object'?s.settings:{};
    Object.entries(defaults).forEach(([k,v])=>{ if(!(k in s.settings)) s.settings[k]=v; });
  }
  function apply(sync=true) {
    const s=getState(); if(!s) return;
    const st=s.settings||{};
    const valid=(key,values,fallback)=>values.includes(st[key])?st[key]:fallback;
    document.body.dataset.nx983Density=valid('nx983Density',['compact','comfortable','spacious'],'comfortable');
    document.body.dataset.nx983Cards=valid('nx983CardStyle',['elevated','flat','outlined'],'elevated');
    document.body.dataset.nx983Corners=valid('nx983Corners',['soft','rounded','crisp'],'rounded');
    document.body.dataset.nx983Background=valid('nx983Background',['clean','soft','ambient'],'soft');
    document.body.dataset.nx983Buttons=valid('nx983ButtonStyle',['gradient','solid','outline'],'gradient');
    document.body.dataset.nx983Icons=valid('nx983IconStyle',['tiles','simple'],'tiles');
    document.body.dataset.nx983Motion=valid('nx983Motion',['full','balanced','reduced'],'balanced');
    if(sync) syncControls();
  }
  function syncControls() {
    const s=getState(); if(!s) return;
    Object.keys(defaults).forEach(key=>{ const el=$('#'+key); if(el && document.activeElement!==el) el.value=s.settings[key]||defaults[key]; });
    const card=$('#nx983PreviewCard'); if(card) card.dataset.style=s.settings.nx983CardStyle||defaults.nx983CardStyle;
    const density=$('#nx983DensityHint'); if(density) density.textContent=({compact:'Compact spacing',comfortable:'Comfortable spacing',spacious:'Spacious layout'})[s.settings.nx983Density]||'Comfortable spacing';
  }
  function mount() {
    const panel=$('#settingsView .nx-appearance-panel'); if(!panel || $('#nx983MoreAppearance')) return;
    const block=document.createElement('section');
    block.id='nx983MoreAppearance'; block.className='nx983-appearance-options';
    block.innerHTML=`
      <div class="nx983-head"><div><span class="nx983-kicker">PERSONALIZE THE LOOK</span><h4>More appearance options</h4><p>Fine-tune the feel of NEXORA without changing its layout or training features.</p></div><span class="nx983-mark" aria-hidden="true">✦</span></div>
      <div class="nx983-controls">
        <label class="nx983-control"><span><b>Interface density</b><small id="nx983DensityHint">Comfortable spacing</small></span><select id="nx983Density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
        <label class="nx983-control"><span><b>Card appearance</b><small>Choose how information panels feel</small></span><select id="nx983CardStyle"><option value="elevated">Soft elevation</option><option value="flat">Flat</option><option value="outlined">Outlined</option></select></label>
        <label class="nx983-control"><span><b>Corner shape</b><small>Control the roundness of cards</small></span><select id="nx983Corners"><option value="soft">Soft</option><option value="rounded">Rounded</option><option value="crisp">Crisp</option></select></label>
        <label class="nx983-control"><span><b>Background finish</b><small>Set the page's visual atmosphere</small></span><select id="nx983Background"><option value="clean">Clean</option><option value="soft">Soft tint</option><option value="ambient">Ambient glow</option></select></label>
        <label class="nx983-control"><span><b>Button style</b><small>Choose the emphasis for main actions</small></span><select id="nx983ButtonStyle"><option value="gradient">Gradient</option><option value="solid">Solid</option><option value="outline">Outline</option></select></label>
        <label class="nx983-control"><span><b>Navigation icons</b><small>Set the icon presentation</small></span><select id="nx983IconStyle"><option value="tiles">Soft tiles</option><option value="simple">Simple icons</option></select></label>
        <label class="nx983-control"><span><b>Motion level</b><small>Controls interface transitions</small></span><select id="nx983Motion"><option value="full">Expressive</option><option value="balanced">Balanced</option><option value="reduced">Reduced</option></select></label>
      </div>
      <div class="nx983-preview-wrap"><div><span class="nx983-kicker">LIVE PREVIEW</span><b>Card preview</b></div><article id="nx983PreviewCard" class="nx983-preview-card"><div class="nx983-preview-icon">↗</div><div><small>WEEKLY ACTIVITY</small><strong>4 sessions</strong><span>You're building consistency.</span></div><i>● ● ●</i></article></div>
      <div class="nx983-actions"><span id="nx983SaveStatus" role="status" aria-live="polite">Changes save automatically</span><button type="button" class="btn btn-outline btn-small" id="nx983Reset">Reset these options</button></div>`;
    const picker=$('#v94PresetPicker',panel);
    if(picker) picker.insertAdjacentElement('afterend',block); else panel.append(block);
    block.addEventListener('change',event=>{
      const key=event.target?.id;
      if(!Object.prototype.hasOwnProperty.call(defaults,key)) return;
      const s=getState(); if(!s) return;
      s.settings[key]=event.target.value; apply(false); syncControls(); save();
      const status=$('#nx983SaveStatus'); if(status) status.textContent='Appearance saved';
      if(typeof window.toast==='function') window.toast('Appearance updated.');
    });
    $('#nx983Reset',block)?.addEventListener('click',()=>{
      const s=getState(); if(!s) return;
      Object.assign(s.settings,defaults); apply(); save();
      const status=$('#nx983SaveStatus'); if(status) status.textContent='Appearance options reset';
      if(typeof window.toast==='function') window.toast('Additional appearance options reset.');
    });
    syncControls();
  }
  function boot() {
    normalize();
    mount();
    apply();
    // Reapply after the app's existing theme/settings logic updates CSS variables.
    if(typeof window.applySettings==='function'&&!window.applySettings.__nexora983){
      const base=window.applySettings;
      const wrapped=function(){ const result=base.apply(this,arguments); apply(); return result; };
      wrapped.__nexora983=true; window.applySettings=wrapped;
    }
    if(typeof window.setTab==='function'&&!window.setTab.__nexora983){
      const base=window.setTab;
      const wrapped=function(){ const result=base.apply(this,arguments); apply(); return result; };
      wrapped.__nexora983=true; window.setTab=wrapped;
    }
    window.__nexora983Checks={panel:!!$('#nx983MoreAppearance'),controls:Object.keys(defaults).every(k=>!!$('#'+k)),reset:!!$('#nx983Reset')};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
