/* NEXORA FITNESS 9.6.2 — layout correction and interactive setting previews. */
(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const safe = value => String(value ?? '').replace(/[<>]/g,'').trim().slice(0,120);
  const help = {
    msBrandName:'Changes the app name shown in the header, page title and saved design.',
    msTagline:'Changes the short brand message below the app name.',
    msLogoUpload:'Replaces the app icon and brand mark with an image you choose.',
    msRadius:'Changes how rounded cards, panels and dialogs appear.',
    msBlur:'Controls the glass blur used by translucent navigation and panels.',
    msShadow:'Controls how much depth and shadow appear around interface surfaces.',
    msScale:'Scales interface text and controls together while keeping the layout responsive.',
    msFont:'Changes the typeface used throughout the interface.',
    msCardStyle:'Switches cards between glass, outlined and flat treatments.',
    msDensity:'Controls the amount of space inside cards and between content.',
    msBackgroundStyle:'Changes the page background between aurora, gradient and solid colour.',
    msButtonStyle:'Changes the shape of buttons and other interactive controls.',
    msMotion:'Sets how strongly the interface animates when you interact with it.',
    msNav:'Moves the primary navigation to the bottom, top or left side.',
    msWidth:'Changes the maximum width of the main content area.',
    msLayout:'Changes how dashboard cards are arranged into columns.',
    msNavStyle:'Changes the surface treatment of the navigation bar.',
    msColorMode:'Chooses dark controls, light controls or follows the system.',
    msWelcomeTitle:'Changes the heading shown at the top of your dashboard.',
    msWelcomeText:'Changes the description under your dashboard heading.',
    msProfileName:'Names the design profile that stores your current appearance.',
    preset:'Applies a coordinated set of colours, shapes, spacing and navigation settings.',
    widget:'Shows, hides or reorders a dashboard section without deleting its data.',
    navVisible:'Shows this destination in the primary navigation. Hidden destinations remain available in More.',
    label:'Changes the text shown for this navigation destination.',
    color:'Changes this specific colour token across the app and its components.'
  };
  const colorNames={bg:'Page background',panel:'Card surface',panel2:'Raised surface',accent:'Main accent',accent2:'Secondary accent',text:'Main text',muted:'Muted text',line:'Borders and dividers'};
  const controlNames={msRadius:'Corner radius',msBlur:'Glass blur',msShadow:'Shadow strength',msScale:'Interface scale',msFont:'Typography',msCardStyle:'Card treatment',msDensity:'Interface density',msBackgroundStyle:'Background style',msButtonStyle:'Button shape',msMotion:'Motion style',msNav:'Navigation placement',msWidth:'Content width',msLayout:'Dashboard layout',msNavStyle:'Navigation surface',msColorMode:'Control colour mode',msBrandName:'App name',msTagline:'Tagline',msLogoUpload:'App logo',msWelcomeTitle:'Welcome heading',msWelcomeText:'Welcome description',msProfileName:'Profile name'};
  let activeSetting=null;

  function studio(){return $('#studioView');}
  function ensurePreview(){
    const root=studio();if(!root)return null;
    let preview=$('#msSettingPreview',root);if(preview)return preview;
    const side=$('.ms-studio-side',root);if(!side)return null;
    side.insertAdjacentHTML('afterbegin',`<section class="panel ms-setting-preview" id="msSettingPreview" aria-live="polite" aria-atomic="true"><div class="ms-setting-preview-head"><div><span class="ms-setting-preview-kicker">SETTING PREVIEW</span><strong id="msSettingPreviewTitle">Explore a setting</strong></div><span class="ms-setting-preview-value" id="msSettingPreviewValue">HOVER OR FOCUS</span></div><p class="ms-setting-preview-description" id="msSettingPreviewDescription">Hover over or keyboard-focus any setting to see what it changes. The example below updates for that setting.</p><div class="ms-setting-demo" id="msSettingDemo"><div class="ms-peek-window"><div class="ms-peek-top"><div class="ms-peek-brand"><img class="ms-peek-logo" id="msPeekLogo" src="nexora-icon-192.png" alt=""><span class="ms-peek-brand-copy"><span id="msPeekBrand">NEXORA FITNESS</span><small id="msPeekTagline">YOUR TRAINING. YOUR DESIGN.</small></span></div><i class="ms-peek-pill"></i></div><div class="ms-peek-grid"><div class="ms-peek-card"><b id="msPeekCardTitle">Weekly activity</b><small id="msPeekCardText">A compact sample of the current design.</small><div class="ms-peek-meter"><i></i></div></div><div class="ms-peek-card"><b>Progress</b><small>Preview panel</small><div class="ms-peek-meter"><i></i></div></div></div><div class="ms-peek-actions"><button class="ms-peek-button" type="button" tabindex="-1">Primary action</button><button class="ms-peek-button secondary" type="button" tabindex="-1">Secondary</button></div><div class="ms-peek-nav"><span>Home</span><span>Train</span><span>Progress</span><span>History</span></div></div></div></section>`);
    return preview;
  }
  function getCandidate(target){
    if(!(target instanceof Element))return null;
    return target.closest('#studioView .ms-control, #studioView .ms-preset, #studioView .ms-widget-row, #studioView [data-ms-nav-visible], #studioView .ms-profile-row, #studioView [data-ms-label]');
  }
  function fieldFor(candidate){
    if(!candidate)return null;
    if(candidate.matches('.ms-control'))return $('input,select,textarea',candidate);
    if(candidate.matches('.ms-preset'))return candidate;
    if(candidate.matches('.ms-widget-row'))return $('input,button',candidate);
    if(candidate.matches('[data-ms-nav-visible]'))return candidate;
    if(candidate.matches('.ms-profile-row'))return candidate;
    if(candidate.matches('[data-ms-label]'))return candidate;
    return $('input,select,textarea',candidate);
  }
  function labelFor(candidate,field){
    if(candidate.matches('.ms-preset'))return $('strong',candidate)?.textContent||'Interface preset';
    if(candidate.matches('.ms-widget-row'))return $('span',candidate)?.textContent||'Dashboard section';
    if(candidate.matches('.ms-profile-row'))return $('span',candidate)?.textContent||'Saved profile';
    if(field?.dataset?.msColor)return colorNames[field.dataset.msColor]||'Theme colour';
    if(field?.id&&controlNames[field.id])return controlNames[field.id];
    if(field?.dataset?.msLabel)return `${field.dataset.msLabel} navigation label`;
    if(field?.dataset?.msNavVisible)return `${field.parentElement?.querySelector('b')?.textContent||'Navigation'} visibility`;
    return candidate.querySelector(':scope > span')?.textContent||candidate.textContent.trim().slice(0,60)||'Design setting';
  }
  function settingKey(candidate,field){
    if(candidate.matches('.ms-preset'))return 'preset';
    if(candidate.matches('.ms-widget-row'))return 'widget';
    if(field?.dataset?.msColor)return 'color';
    if(field?.dataset?.msLabel)return 'label';
    if(field?.dataset?.msNavVisible)return 'navVisible';
    if(field?.id)return field.id;
    return 'widget';
  }
  function currentValue(candidate,field,key){
    if(candidate.matches('.ms-preset'))return $('small',candidate)?.textContent||'Preset';
    if(candidate.matches('.ms-widget-row'))return $('input',candidate)?.checked?'Visible':'Hidden';
    if(field?.type==='color')return field.value.toUpperCase();
    if(field?.type==='checkbox')return field.checked?'Enabled':'Disabled';
    if(field?.type==='file')return 'Custom image';
    if(field?.tagName==='SELECT')return field.selectedOptions?.[0]?.textContent||field.value;
    if(field?.type==='range')return field.id==='msRadius'?`${field.value} px`:field.id==='msBlur'?`${field.value} px`:field.id==='msShadow'?`${field.value}%`:field.id==='msScale'?`${Math.round(Number(field.value)*100)}%`:field.value;
    if(field?.dataset?.msNavVisible)return field.checked?'Shown in main navigation':'Moved to More menu';
    if(field?.dataset?.msLabel)return field.value||'Default label';
    if(field?.value)return safe(field.value);
    if(candidate.matches('.ms-profile-row'))return 'Saved design profile';
    return key==='preset'?'Appearance preset':'Current setting';
  }
  function descriptionFor(key,label){
    if(help[key])return help[key];
    if(key==='color')return help.color;
    if(key==='label')return help.label;
    if(key==='navVisible')return help.navVisible;
    if(key==='preset')return help.preset;
    if(key==='widget')return help.widget;
    return `Controls ${label.toLowerCase()} in your NEXORA FITNESS design. The preview below illustrates the current choice.`;
  }
  function setDemoStyle(demo,candidate,field,key){
    const body=getComputedStyle(document.body),read=(v,fallback)=>body.getPropertyValue(v).trim()||fallback;
    demo.style.setProperty('--peek-bg',read('--bg','#080c10'));
    demo.style.setProperty('--peek-panel',read('--panel','#111923'));
    demo.style.setProperty('--peek-panel2',read('--panel2','#192431'));
    demo.style.setProperty('--peek-text',read('--text','#f1f5f8'));
    demo.style.setProperty('--peek-muted',read('--muted','#a2afbd'));
    demo.style.setProperty('--peek-accent',read('--accent','#b7f36c'));
    demo.style.setProperty('--peek-line',read('--line','#33434e'));
    demo.style.setProperty('--peek-radius',`${Number($('#msRadius')?.value||22)}px`);
    demo.style.setProperty('--peek-blur',`${Number($('#msBlur')?.value||12)}px`);
    demo.style.setProperty('--peek-shadow',String(Number($('#msShadow')?.value||20)/100));
    demo.style.setProperty('--peek-scale',String(Number($('#msScale')?.value||1)));
    const selected=field?.tagName==='SELECT'?field.value:'';
    const value=selected||field?.value||'';
    demo.dataset.kind=key;demo.dataset.value=value;
    if(key==='color'&&field?.type==='color'){
      const cssMap={bg:'--peek-bg',panel:'--peek-panel',panel2:'--peek-panel2',accent:'--peek-accent',accent2:'--peek-accent',text:'--peek-text',muted:'--peek-muted',line:'--peek-line'};
      demo.style.setProperty(cssMap[field.dataset.msColor]||'--peek-accent',field.value);
    }
    if(key==='msRadius')demo.style.setProperty('--peek-radius',`${Number(value)||22}px`);
    if(key==='msBlur')demo.style.setProperty('--peek-blur',`${Number(value)||0}px`);
    if(key==='msShadow')demo.style.setProperty('--peek-shadow',String((Number(value)||0)/100));
    if(key==='msScale')demo.style.setProperty('--peek-scale',String(Number(value)||1));
    if(key==='msFont')demo.style.setProperty('--peek-font',({system:'Inter,system-ui,sans-serif',rounded:'ui-rounded,system-ui,sans-serif',serif:'Georgia,serif',mono:'ui-monospace,monospace'})[value]||'inherit');
    if(key==='msDensity')demo.style.setProperty('--peek-padding',value==='compact'?'6px':value==='spacious'?'18px':'12px');
    if(key==='msLayout')demo.style.setProperty('--peek-cols',value==='wide'?'3':'2');
    if(key==='msWidth')demo.style.setProperty('--peek-width',value==='compact'?'170px':value==='wide'?'100%':'220px');
    if(key==='msButtonStyle')demo.style.setProperty('--peek-button-radius',value==='pill'?'999px':value==='square'?'3px':'10px');
    if(key==='msColorMode'&&value==='light'){
      demo.style.setProperty('--peek-bg','#f1f5ee');demo.style.setProperty('--peek-panel','#ffffff');demo.style.setProperty('--peek-panel2','#e7eee4');demo.style.setProperty('--peek-text','#172219');demo.style.setProperty('--peek-muted','#566657');demo.style.setProperty('--peek-line','#bdcbb8');
    }
    if(key==='msBackgroundStyle')demo.dataset.value=value;
    if(key==='msCardStyle')demo.dataset.value=value;
    if(key==='msNav')demo.dataset.value=value;
    if(key==='msNavStyle')demo.dataset.value=value;
    if(key==='msMotion')demo.dataset.value=value;
    if(key==='msBrandName')$('#msPeekBrand').textContent=safe(value)||'NEXORA FITNESS';
    else $('#msPeekBrand').textContent=$('#msBrandName')?.value||'NEXORA FITNESS';
    if(key==='msTagline')$('#msPeekTagline').textContent=safe(value)||'YOUR TRAINING. YOUR DESIGN.';
    else $('#msPeekTagline').textContent=$('#msTagline')?.value||'YOUR TRAINING. YOUR DESIGN.';
    const logo=$('#msLogoPreview'),peekLogo=$('#msPeekLogo');if(logo&&peekLogo)peekLogo.src=logo.src;
    if(key==='msWelcomeTitle')$('#msPeekCardTitle').textContent=safe(value)||'Weekly activity';
    else $('#msPeekCardTitle').textContent='Weekly activity';
    if(key==='msWelcomeText')$('#msPeekCardText').textContent=safe(value)||'A compact sample of the current design.';
    else $('#msPeekCardText').textContent='A compact sample of the current design.';
    if(key==='msNav'){
      const nav=$('.ms-peek-nav',demo);nav.style.flexDirection=value==='sidebar'?'column':'row';nav.style.width=value==='sidebar'?'60px':'auto';nav.style.margin=value==='sidebar'?'8px auto 0 0':'9px 0 0';
    } else {
      const nav=$('.ms-peek-nav',demo);nav.style.flexDirection='row';nav.style.width='auto';nav.style.margin='9px 0 0';
    }
    if(field?.dataset?.msNavVisible){const order=['workout','builder','progress','history'];const itemIndex=order.indexOf(field.dataset.msNavVisible);const tabs=$$('.ms-peek-nav span',demo);if(itemIndex>=0&&tabs[itemIndex])tabs[itemIndex].style.opacity=field.checked?'1':'.25';}
    if(field?.dataset?.msLabel){const order=['workout','builder','progress','history'];const itemIndex=order.indexOf(field.dataset.msLabel);const tabs=$$('.ms-peek-nav span',demo);if(itemIndex>=0&&tabs[itemIndex])tabs[itemIndex].textContent=safe(value)||['Home','Train','Progress','History'][itemIndex];}
    if(key==='widget'){$('.ms-peek-grid',demo).style.opacity=$('input',candidate)?.checked?'1':'.35';}
    if(candidate.matches('.ms-preset')){
      const swatch=$('.ms-swatch',candidate);if(swatch){demo.style.setProperty('--peek-bg',swatch.style.getPropertyValue('--sw-bg'));demo.style.setProperty('--peek-accent',swatch.style.getPropertyValue('--sw-accent'));}
    }
  }
  function showPreview(candidate){
    if(!candidate)return;
    const panel=ensurePreview();if(!panel)return;
    const field=fieldFor(candidate),label=labelFor(candidate,field),key=settingKey(candidate,field),value=currentValue(candidate,field,key);
    $('#msSettingPreviewTitle').textContent=label;
    $('#msSettingPreviewValue').textContent=value||'Current choice';
    $('#msSettingPreviewDescription').textContent=descriptionFor(key,label);
    const demo=$('#msSettingDemo');setDemoStyle(demo,candidate,field,key);
    panel.dataset.source=key==='preset'?'preset':key==='color'?'color':'setting';panel.classList.add('is-active');
    if(field&&field.id)field.setAttribute('aria-describedby','msSettingPreviewDescription');
    activeSetting=candidate;
  }
  function install(){
    if(!studio())return;
    ensurePreview();
    const hero=$('.ms-hero',studio());if(hero&&!$('#ms96PreviewHint'))hero.insertAdjacentHTML('beforeend','<div class="ms96-preview-hint" id="ms96PreviewHint"><b>LIVE SETTING PREVIEWS</b><span>Hover over any option, or move keyboard focus to it, to see an example of the change.</span></div>');
    // Delegated handlers cover dynamically rendered presets, labels, checkboxes and widgets too.
    studio().addEventListener('pointerover',event=>{const candidate=getCandidate(event.target);if(candidate)showPreview(candidate);});
    studio().addEventListener('focusin',event=>{const candidate=getCandidate(event.target);if(candidate)showPreview(candidate);});
    studio().addEventListener('input',event=>{if(activeSetting&&activeSetting.contains(event.target))showPreview(activeSetting);});
    studio().addEventListener('change',event=>{if(activeSetting&&activeSetting.contains(event.target))showPreview(activeSetting);});
    const mo=new MutationObserver(()=>normalizeVersion());mo.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    normalizeVersion();
    document.documentElement.dataset.morphsetVersion='9.6.2';document.body.dataset.morphsetVersion='9.6.2';
    window.__morphset96Loaded=true;
  }
  function normalizeVersion(){
    const name=$('.ms-brand-name')?.textContent||'NEXORA FITNESS';
    const title=`${name} 9.6.2 — Customizable Training Studio`;
    if(document.title!==title&&!/\d{2}:\d{2}/.test(document.title))document.title=title;
    const version=$('#xAppVersion');if(version&&version.textContent!=='Version 9.6.2')version.textContent='Version 9.6.2';
    const footer=$('.app-footer span');if(footer&&!footer.textContent.includes('9.6.2'))footer.textContent=`${name} 9.6.2 / YOUR TRAINING. YOUR DESIGN.`;
    const eyebrow=$('#msStudioTitle')?.parentElement?.querySelector('.eyebrow');if(eyebrow&&!eyebrow.textContent.includes('9.6.2'))eyebrow.textContent='PERSONAL DESIGN ENVIRONMENT · NEXORA FITNESS 9.6.2';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
