/* NEXORA FITNESS 9.7.0 — custom interface engine.
   Keeps the existing workout engine and legacy storage key intact.
   User imports are treated strictly as data; no executable code is imported. */
(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const clone = value => JSON.parse(JSON.stringify(value));
  const DEFAULT_CONFIG = {
    brandName: 'NEXORA FITNESS', tagline: 'HEALTH · TRAINING · PROGRESS', preset: 'obsidian',
    colors: {bg:'#080c10',panel:'#111923',panel2:'#192431',text:'#f1f5f8',muted:'#a2afbd',accent:'#b7f36c',accent2:'#72d6c2',line:'#33434e'},
    radius:22, blur:24, shadow:26, scale:1, density:'comfortable', font:'system', width:'wide',
    cardStyle:'glass', nav:'bottom', navStyle:'glass', motion:'smooth', layout:'wide', backgroundStyle:'aurora', buttonStyle:'rounded', colorMode:'dark', welcomeTitle:'Your training, at a glance.', welcomeText:'A clear snapshot of today, your recent activity, and what comes next. Build consistency at a pace that works for you.',
    labels:{workout:'Today',builder:'Train',progress:'Progress',browse:'Browse',history:'History',planner:'Planner',insights:'Insights',guide:'Guide',settings:'Settings',studio:'Studio'},
    widgets:{welcome:true,insights:true,quick:true}, widgetOrder:['welcome','insights','quick'],
    navVisible:{workout:true,builder:true,progress:true,browse:true,history:true}, browsePins:['planner','history','studio'], focusMetrics:['weeklySessions','weeklySets','level'], logoData:''
  };
  const PRESETS = {
    classic:{label:'Ice Blue',desc:'Clean, understated and compact',colors:{bg:'#0b1016',panel:'#141d27',panel2:'#1d2a36',text:'#eef3f7',muted:'#a7b4c2',accent:'#73dcb0',accent2:'#6ebbe6',line:'#354553'},radius:16,blur:8,shadow:12,density:'comfortable',font:'system',cardStyle:'outlined',nav:'top',layout:'balanced'},
    training:{label:'Emerald',desc:'Focused, bold and workout-first',colors:{bg:'#0a0f12',panel:'#121b20',panel2:'#1d2b31',text:'#f0f7f4',muted:'#a4b7b1',accent:'#a9f16b',accent2:'#69d9c1',line:'#344c4a'},radius:18,blur:12,shadow:20,density:'compact',font:'rounded',cardStyle:'flat',nav:'bottom',layout:'balanced'},
    obsidian:{label:'Emerald',desc:'Deep black, bright lime and soft glass',colors:{bg:'#080c10',panel:'#111923',panel2:'#192431',text:'#f1f5f8',muted:'#a2afbd',accent:'#b7f36c',accent2:'#72d6c2',line:'#33434e'},radius:22,blur:24,shadow:28,density:'comfortable',font:'system',cardStyle:'glass',nav:'bottom',layout:'wide'},
    light:{label:'Pearl',desc:'Bright surfaces and calm contrast',colors:{bg:'#f1f5ee',panel:'#ffffff',panel2:'#e7eee4',text:'#172219',muted:'#566657',accent:'#477d2a',accent2:'#277d61',line:'#bdcbb8'},radius:20,blur:8,shadow:12,density:'comfortable',font:'system',cardStyle:'outlined',nav:'top',layout:'balanced',colorMode:'light'},
    custom:{label:'Custom colour',desc:'Your own design system',colors:null}
  };
  let undoStack=[]; let redoStack=[]; let pendingBefore=null; let activeSection='all';
  let statusTimer=0;
  function defaults(){return clone(DEFAULT_CONFIG);}
  function ensureState(){
    if(typeof state==='undefined' || !state || typeof state!=='object') return;
    const existing=state.morphset && typeof state.morphset==='object' ? state.morphset : {};
    const base=defaults();
    const merged={...base,...existing,colors:{...base.colors,...(existing.colors||{})},labels:{...base.labels,...(existing.labels||{})},widgets:{...base.widgets,...(existing.widgets||{})},navVisible:{...base.navVisible,...(existing.navVisible||{})},browsePins:Array.isArray(existing.browsePins)?existing.browsePins.filter((x,i,a)=>['planner','builder','guide','history','progress','insights','studio','settings'].includes(x)&&a.indexOf(x)===i).slice(0,5):base.browsePins,focusMetrics:Array.isArray(existing.focusMetrics)?existing.focusMetrics.filter((x,i,a)=>['weeklySessions','weeklySets','level','totalSessions'].includes(x)&&a.indexOf(x)===i).slice(0,4):base.focusMetrics,widgetOrder:Array.isArray(existing.widgetOrder)?existing.widgetOrder.filter((x,i,a)=>['welcome','insights','quick'].includes(x)&&a.indexOf(x)===i):base.widgetOrder};
    Object.keys(base.colors).forEach(k=>{if(!validHex(merged.colors[k]))merged.colors[k]=base.colors[k];});
    merged.brandName=safeName(merged.brandName);merged.tagline=safeText(merged.tagline,42)||base.tagline;
    merged.preset=['classic','training','obsidian','light','custom'].includes(merged.preset)?merged.preset:'custom';
    merged.radius=Math.max(8,Math.min(32,Number(merged.radius)||22));merged.blur=Math.max(0,Math.min(32,Number(merged.blur)||0));merged.shadow=Math.max(0,Math.min(60,Number(merged.shadow)||0));merged.scale=Math.max(.9,Math.min(1.15,Number(merged.scale)||1));
    const allowed={density:['comfortable','compact','spacious'],font:['system','rounded','serif','mono'],width:['standard','wide','compact'],cardStyle:['glass','outlined','flat'],nav:['bottom','top','sidebar'],navStyle:['glass','solid','minimal'],motion:['smooth','soft','none'],layout:['wide','balanced','compact'],backgroundStyle:['aurora','gradient','solid'],buttonStyle:['rounded','pill','square'],colorMode:['dark','light','auto']};
    Object.entries(allowed).forEach(([k,values])=>{if(!values.includes(merged[k]))merged[k]=base[k];});
    merged.welcomeTitle=safeText(merged.welcomeTitle,54)||base.welcomeTitle;merged.welcomeText=safeText(merged.welcomeText,180)||base.welcomeText;
    merged.logoData=typeof merged.logoData==='string'&&merged.logoData.startsWith('data:image/webp;base64,')&&merged.logoData.length<250000?merged.logoData:'';
    merged.brandName='NEXORA FITNESS';merged.tagline='HEALTH · TRAINING · PROGRESS';merged.logoData='';
    state.morphset=merged;
    state.morphsetProfiles=(Array.isArray(state.morphsetProfiles)?state.morphsetProfiles:[]).slice(0,12).filter(p=>p&&typeof p==='object').map((p,i)=>({id:(/^ms-safe-[a-zA-Z0-9_-]+$/.test(String(p.id||''))?p.id:`ms-safe-${i}-${String(p.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32)}`),name:safeText(p.name,28)||`Profile ${i+1}`,config:(p.config&&typeof p.config==='object')?sanitizeImportedConfig(p.config):base,createdAt:typeof p.createdAt==='string'?p.createdAt:''}));
  }
  function safeName(value){return String(value||'NEXORA FITNESS').replace(/[<>"'`]/g,'').trim().slice(0,28)||'NEXORA FITNESS';}
  function safeText(value,max=60){return String(value||'').replace(/[<>"'`]/g,'').trim().slice(0,max);}
  function validHex(value){return /^#[0-9a-fA-F]{6}$/.test(String(value||''));}
  function config(){ensureState();return state.morphset;}
  function tell(message){if(typeof toast==='function')toast(message);else {const live=$('#toast');if(live)live.textContent=message;}}
  function setStatus(message='Saved on this device'){
    const el=$('#msSaveStatus');if(!el)return;el.textContent=message;el.dataset.state=message.toLowerCase().includes('failed')?'error':'saved';
    clearTimeout(statusTimer);statusTimer=setTimeout(()=>{if(el.dataset.state==='saved')el.textContent='All changes saved';},1800);
  }
  function persist(){try{saveState();setStatus();return true;}catch(error){console.warn('NEXORA preference save failed',error);setStatus('Save failed — export a backup');return false;}}
  function snapshot(){return clone(config());}
  function change(mutator,{save=true,history=true}={}){
    if(history)commitPending();
    const before=snapshot();mutator(config());
    if(history){undoStack.push(before);if(undoStack.length>40)undoStack.shift();redoStack=[];}else if(!pendingBefore){pendingBefore=before;}
    applyDesign();if(save)persist();
  }
  function commitPending(){if(pendingBefore){undoStack.push(pendingBefore);if(undoStack.length>40)undoStack.shift();redoStack=[];pendingBefore=null;}}
  function undo(){commitPending();if(!undoStack.length){tell('Nothing to undo yet.');return;}redoStack.push(snapshot());state.morphset=undoStack.pop();applyDesign();persist();renderStudioState();tell('Previous design restored.');}
  function redo(){commitPending();if(!redoStack.length){tell('Nothing to redo yet.');return;}undoStack.push(snapshot());state.morphset=redoStack.pop();applyDesign();persist();renderStudioState();tell('Design change restored.');}

  function applyBrand(){
    const c=config(),name=safeName(c.brandName);
    const brand=$('.brand');if(brand){brand.setAttribute('aria-label',`${name} home`);const img=$('.brand-logo',brand);if(img){img.src=c.logoData||'nexora-icon-192.png';img.classList.add('ms-logo-plain');img.alt='';}let word=$('.ms-brand-wrap',brand);if(!word){const original=$('span',brand);if(original){original.classList.add('ms-brand-wrap');original.innerHTML='<span class="ms-brand-name"></span><small class="ms-brand-sub"></small>';word=original;}}if(word){$('.ms-brand-name',word).textContent=name;$('.ms-brand-sub',word).textContent=safeText(c.tagline,42)||'HEALTH · TRAINING · PROGRESS';}}
    const boot=$('.boot-mark');if(boot)boot.innerHTML=`<img src="${c.logoData||'nexora-icon-192.png'}" alt="" style="width:54px;height:54px;border-radius:15px;vertical-align:middle">`;
    const top=$('.topbar');if(top)top.setAttribute('aria-label',`${name} header`);
    const main=$('#top');if(main)main.setAttribute('aria-label',`${name} main content`);
    const title=`NEXORA FITNESS 9.7.0 — Training & Progress`;document.title=title;const version=$('#xAppVersion');if(version)version.textContent='Version 9.7.0';
    const footer=$('.app-footer');if(footer){const left=footer.querySelector('span');if(left)left.textContent='NEXORA FITNESS 9.7.0 / HEALTH & TRAINING';}
    const manifest=$('link[rel="manifest"]');if(manifest)manifest.setAttribute('aria-label',`${name} app manifest`);
  }
  function applyColors(){
    const c=config(),body=document.body,colors=c.colors;
    body.dataset.theme='morphset';body.removeAttribute('data-color-mode');body.classList.toggle('x-system-light',c.colorMode==='light'||(c.colorMode==='auto'&&window.matchMedia?.('(prefers-color-scheme: light)').matches));
    body.dataset.msPreset=c.preset;body.dataset.msNav=c.nav;body.dataset.msNavStyle=c.navStyle;body.dataset.msDensity=c.density;body.dataset.msWidth=c.width;body.dataset.msMotion=c.motion;body.dataset.msLayout=c.layout;body.dataset.msCard=c.cardStyle;body.dataset.msBgStyle=c.backgroundStyle;body.dataset.msButtonStyle=c.buttonStyle;body.dataset.msColorMode=c.colorMode;
    body.style.setProperty('--bg',colors.bg);body.style.setProperty('--panel',colors.panel);body.style.setProperty('--panel2',colors.panel2);body.style.setProperty('--text',colors.text);const forcedContrast=!!state.settings?.highContrast;body.style.setProperty('--muted',forcedContrast?colors.text:colors.muted);body.style.setProperty('--accent',colors.accent);body.style.setProperty('--accent2',colors.accent2);body.style.setProperty('--line',forcedContrast?(c.colorMode==='light'?'#647164':'#9eacb5'):colors.line);body.style.setProperty('--radius',`${c.radius}px`);body.style.setProperty('--ms-radius',`${c.radius}px`);body.style.setProperty('--glow',String(Math.min(1,c.shadow/60)));body.style.setProperty('--ms-shadow',String(c.shadow/100));body.style.setProperty('--ms-blur',`${c.blur}px`);body.style.setProperty('--ms-scale',String(c.scale));body.style.setProperty('--ms-card-opacity','1');
    const fonts={system:'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',rounded:'ui-rounded,"SF Pro Rounded",system-ui,sans-serif',serif:'Georgia,"Times New Roman",serif',mono:'ui-monospace,SFMono-Regular,Consolas,monospace'};body.style.setProperty('font-family',fonts[c.font]||fonts.system);
    document.documentElement.style.colorScheme=c.colorMode==='light'?'light':c.colorMode==='dark'?'dark':'normal';body.style.colorScheme=c.colorMode==='light'?'light':c.colorMode==='dark'?'dark':'normal';
    const welcomeTitle=$('.dashboard-welcome-copy h2');if(welcomeTitle)welcomeTitle.textContent=safeText(c.welcomeTitle,54)||DEFAULT_CONFIG.welcomeTitle;const welcomeText=$('.dashboard-welcome-copy p:not(.eyebrow)');if(welcomeText)welcomeText.textContent=safeText(c.welcomeText,180)||DEFAULT_CONFIG.welcomeText;
    const meta=$('meta[name="theme-color"]');if(meta)meta.content=colors.bg;
  }
  function dashboardNodes(){return {welcome:$('.dashboard-welcome'),insights:$('#xDashboardInsights'),quick:$('.dashboard-launchpad')};}
  function applyWidgets(){
    const c=config(),nodes=dashboardNodes();
    Object.entries(nodes).forEach(([key,node])=>{if(node)node.classList.toggle('ms-hidden',!c.widgets[key]);});
    if(!c.widgets.welcome && nodes.welcome)nodes.welcome.setAttribute('aria-hidden','true');else nodes.welcome?.removeAttribute('aria-hidden');
    const ordered=(c.widgetOrder||[]).filter(k=>nodes[k]);
    const parent=$('#workoutView');
    if(parent){parent.dataset.msOrderEnabled='true';Array.from(parent.children).forEach(node=>{node.style.order='10';});Object.entries(nodes).forEach(([key,node])=>{if(node)node.style.order=String(ordered.indexOf(key)>=0?ordered.indexOf(key)+1:10);});}
  }
  function applyNav(){
    const c=config();
    $$('.tabs [data-tab]').forEach(button=>{
      const key=button.dataset.tab,visible=c.navVisible[key]!==false;
      button.classList.toggle('ms-hidden',!visible);button.setAttribute('aria-hidden',String(!visible));button.tabIndex=visible?0:-1;
      const label=c.labels[key];const target=button.querySelector('.dock-label')||Array.from(button.children).find(el=>el.tagName==='SPAN'&&!el.classList.contains('dock-icon')&&!el.classList.contains('x-tab-count'));if(target&&label)target.textContent=label;
      if(label)button.setAttribute('aria-label',label);
    });
    const menu=$('#moreMenu');
    if(menu){
      const wanted=[['browse','Browse'],['builder','Train'],['progress','Progress']];
      wanted.forEach(([key,def])=>{
        let item=menu.querySelector(`[data-more-tab="${key}"]`);
        if(c.navVisible[key]===false){if(!item){menu.insertAdjacentHTML('afterbegin',`<button data-more-tab="${key}">${safeText(c.labels[key]||def)} <small>Open section</small></button>`);item=menu.querySelector(`[data-more-tab="${key}"]`);}else item.firstChild.textContent=`${safeText(c.labels[key]||def)} `;}
        else if(item && ['builder','progress','history'].includes(key))item.remove();
      });
      const settings=menu.querySelector('[data-more-tab="settings"]');if(settings)settings.firstChild.textContent=`${safeText(c.labels.settings||'Settings')} `;
      const guide=menu.querySelector('[data-more-tab="guide"]');if(guide)guide.firstChild.textContent=`${safeText(c.labels.guide||'Guide')} `;
      const planner=menu.querySelector('[data-more-tab="planner"]');if(planner)planner.firstChild.textContent=`${safeText(c.labels.planner||'Planner')} `;
      const insights=menu.querySelector('[data-more-tab="insights"]');if(insights)insights.firstChild.textContent=`${safeText(c.labels.insights||'Insights')} `;
      const studio=menu.querySelector('[data-more-tab="studio"]');if(studio)studio.firstChild.textContent=`${safeText(c.labels.studio||'Studio')} `;
    }
    const nav=$('.tabs.glass-dock');if(nav)nav.setAttribute('aria-label','Nexora Fitness primary navigation');
  }
  function applyDesign(){applyBrand();applyColors();applyWidgets();applyNav();syncLegacyAppearanceControls();renderPreview();}
  function syncLegacyAppearanceControls(){const c=config(),theme=$('#themeSelect'),glow=$('#glowSlider');if(theme){const accent=c.colors.accent.toLowerCase();const match={'#bca2ff':'violet','#ffb477':'ember','#c4a5ff':'purple','#ff7886':'crimson','#70c7ff':'blue'}[accent];const value=c.preset==='classic'?'graphite':c.preset==='training'||c.preset==='obsidian'?'emerald':c.preset==='light'?'light':match||'morphset-custom';if(Array.from(theme.options).some(o=>o.value===value))theme.value=value;}if(glow)glow.value=String(Math.round(c.shadow/60*100));}
  function applyLegacyTheme(value){const map={emerald:'obsidian',graphite:'classic',light:'light'};if(map[value]){choosePreset(map[value]);return;}const accents={violet:['#bca2ff','#8e9aff'],ember:['#ffb477','#ff806f'],purple:['#c4a5ff','#9376e8'],crimson:['#ff7886','#ffad7b'],blue:['#70c7ff','#78a8ff']};if(accents[value]){const [accent,accent2]=accents[value];change(c=>{c.preset='custom';c.colors.accent=accent;c.colors.accent2=accent2;});renderStudioState();}}

  function addStudioPage(){
    if($('#studioView'))return;
    const settings=$('#settingsView');if(!settings)return;
    settings.insertAdjacentHTML('beforebegin',`
      <section id="studioView" class="view" aria-hidden="true" aria-labelledby="msStudioTitle" tabindex="-1">
        <div class="ms-hero"><p class="eyebrow">PERSONAL DESIGN ENVIRONMENT · NEXORA FITNESS 9.7.0</p><h2 id="msStudioTitle">Make the app yours.</h2><p>Change the look, layout, navigation, branding and dashboard. Your workouts, saved exercises and history stay separate from these design choices.</p><div class="ms-action-row"><button class="btn btn-primary" id="msUndo">↶ Undo</button><button class="btn btn-outline" id="msRedo">↷ Redo</button><span id="msSaveStatus" class="ms-version-badge" role="status" aria-live="polite">All changes saved</span></div></div>
        <div class="ms-studio">
          <div class="ms-studio-main">
            <section class="panel"><div class="ms-card-title"><div><h3>Choose your interface</h3><p>Pick a visual direction. These are presentation presets inspired by earlier designs, not separate software builds.</p></div><span class="pill">5 PRESETS</span></div><div class="ms-preset-grid" id="msPresetGrid"></div><div class="ms-notice" style="margin-top:12px">All presets run on the current NEXORA engine. Your workout features and stored records do not change when you switch designs.</div></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Brand & identity</h3><p>Rename the app, customize the tagline or upload your own icon.</p></div></div><div class="ms-brand-row"><img id="msLogoPreview" class="ms-brand-preview" src="nexora-icon-192.png" alt="App icon preview"><div style="flex:1;min-width:180px;display:grid;gap:9px"><label class="ms-control"><span>App name</span><input id="msBrandName" maxlength="28" value="NEXORA FITNESS"></label><label class="ms-control"><span>Tagline</span><input id="msTagline" maxlength="42" value="YOUR TRAINING. YOUR DESIGN"></label><label class="ms-control"><span>Upload logo (PNG, JPG or WebP)</span><input id="msLogoUpload" type="file" accept="image/png,image/jpeg,image/webp"></label><div class="ms-action-row"><button class="btn btn-outline btn-small" id="msResetLogo" type="button">Restore NEXORA logo</button></div></div></div><p class="small-note">A custom logo is resized before being saved. App name changes apply inside the interface; the installed PWA shortcut name uses the default NEXORA manifest name.</p></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Theme studio</h3><p>Control the exact palette used across the app.</p></div><span class="pill">LIVE</span></div><div class="ms-grid-2" id="msColorsGrid">
              <label class="ms-control"><span>Background</span><input type="color" data-ms-color="bg"></label><label class="ms-control"><span>Card surface</span><input type="color" data-ms-color="panel"></label><label class="ms-control"><span>Raised surface</span><input type="color" data-ms-color="panel2"></label><label class="ms-control"><span>Main accent</span><input type="color" data-ms-color="accent"></label><label class="ms-control"><span>Secondary accent</span><input type="color" data-ms-color="accent2"></label><label class="ms-control"><span>Main text</span><input type="color" data-ms-color="text"></label><label class="ms-control"><span>Muted text</span><input type="color" data-ms-color="muted"></label><label class="ms-control"><span>Card borders</span><input type="color" data-ms-color="line"></label>
            </div></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Shape, depth & motion</h3><p>Fine-tune the feel of every component.</p></div></div><div class="ms-grid-2">
              <label class="ms-control"><span>Corner radius</span><div class="ms-range-row"><input type="range" min="8" max="32" step="1" id="msRadius"><output id="msRadiusOut">22 px</output></div></label>
              <label class="ms-control"><span>Glass blur</span><div class="ms-range-row"><input type="range" min="0" max="32" step="1" id="msBlur"><output id="msBlurOut">24 px</output></div></label>
              <label class="ms-control"><span>Shadow strength</span><div class="ms-range-row"><input type="range" min="0" max="60" step="1" id="msShadow"><output id="msShadowOut">26%</output></div></label>
              <label class="ms-control"><span>Interface scale</span><div class="ms-range-row"><input type="range" min="0.9" max="1.15" step="0.01" id="msScale"><output id="msScaleOut">100%</output></div></label>
              <label class="ms-control"><span>Typography</span><select id="msFont"><option value="system">System</option><option value="rounded">Rounded</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
              <label class="ms-control"><span>Card treatment</span><select id="msCardStyle"><option value="glass">Glass</option><option value="outlined">Outlined</option><option value="flat">Flat</option></select></label>
              <label class="ms-control"><span>Interface density</span><select id="msDensity"><option value="comfortable">Comfortable</option><option value="compact">Compact</option><option value="spacious">Spacious</option></select></label>
              <label class="ms-control"><span>Background style</span><select id="msBackgroundStyle"><option value="aurora">Aurora gradient</option><option value="gradient">Linear gradient</option><option value="solid">Solid colour</option></select></label>
              <label class="ms-control"><span>Button shape</span><select id="msButtonStyle"><option value="rounded">Rounded</option><option value="pill">Pill</option><option value="square">Square</option></select></label>
              <label class="ms-control"><span>Motion style</span><select id="msMotion"><option value="smooth">Smooth</option><option value="soft">Soft / minimal</option><option value="none">No animations</option></select></label>
            </div></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Layout & navigation</h3><p>Choose how the app is arranged on your screen.</p></div></div><div class="ms-grid-2">
              <label class="ms-control"><span>Navigation placement</span><select id="msNav"><option value="bottom">Floating bottom bar</option><option value="top">Top navigation</option><option value="sidebar">Left sidebar</option></select></label>
              <label class="ms-control"><span>Content width</span><select id="msWidth"><option value="standard">Standard</option><option value="wide">Wide</option><option value="compact">Compact</option></select></label>
              <label class="ms-control"><span>Dashboard layout</span><select id="msLayout"><option value="balanced">Balanced</option><option value="wide">Wide / expanded</option><option value="compact">Compact / dense</option></select></label>
              <label class="ms-control"><span>Navigation surface</span><select id="msNavStyle"><option value="glass">Liquid glass</option><option value="solid">Solid</option><option value="minimal">Minimal</option></select></label>
              <label class="ms-control"><span>Control colour mode</span><select id="msColorMode"><option value="dark">Dark controls</option><option value="light">Light controls</option><option value="auto">Automatic</option></select></label>
            </div><div class="ms-card-title" style="margin-top:16px"><div><h3>Navigation labels</h3><p>Rename the main destinations without removing their functions.</p></div></div><div class="ms-grid-2" id="msLabelsGrid"></div><div class="ms-card-title" style="margin-top:14px"><div><h3>Visible shortcuts</h3><p>Choose which main navigation buttons stay on screen.</p></div></div><div class="ms-grid-2" id="msNavVisibility"></div><div class="ms-card-title" style="margin-top:14px"><div><h3>Dashboard introduction</h3><p>Change the welcome message on your Home page.</p></div></div><div class="ms-grid-2"><label class="ms-control"><span>Welcome heading</span><input id="msWelcomeTitle" maxlength="54"></label><label class="ms-control"><span>Welcome description</span><input id="msWelcomeText" maxlength="180"></label></div><div class="ms-notice" style="margin-top:12px">Home and essential workout controls stay available. Hidden navigation shortcuts move into the More menu so a section cannot become unreachable.</div></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Dashboard creator</h3><p>Show, hide and reorder your main dashboard sections.</p></div><span class="pill">YOUR HOME</span></div><div id="msWidgetList" class="ms-widget-list"></div></section>
          </div>
          <aside class="ms-studio-side">
            <section class="panel"><div class="ms-card-title"><div><h3>Live preview</h3><p>Preview updates as you change settings.</p></div><span class="ms-version-badge">PREVIEW</span></div><div class="ms-live-preview" id="msLivePreview"><div class="ms-brand-row"><img class="ms-brand-preview" id="msPreviewLogo" src="nexora-icon-192.png" alt=""><div><strong id="msPreviewName">NEXORA FITNESS</strong><small class="ms-brand-sub" id="msPreviewTag">YOUR TRAINING. YOUR DESIGN</small></div></div><div class="ms-preview-card"><p class="eyebrow">YOUR DASHBOARD</p><h3 style="margin:4px 0">A space that fits you.</h3><p class="small-note">Cards, type and colour update together.</p><div class="ms-preview-bar"></div></div></div></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Design profiles</h3><p>Save several complete looks and switch between them.</p></div></div><label class="ms-control"><span>Profile name</span><input id="msProfileName" maxlength="28" placeholder="e.g. Clean studio"></label><div class="ms-action-row" style="margin-top:9px"><button class="btn btn-primary btn-small" id="msSaveProfile" type="button">Save current profile</button></div><div id="msProfiles" class="ms-profile-list" style="margin-top:12px"></div></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Undo, export & reset</h3><p>Move between designs or share your setup.</p></div></div><div class="ms-action-row"><button class="btn btn-outline btn-small" id="msUndoSide" type="button">Undo</button><button class="btn btn-outline btn-small" id="msRedoSide" type="button">Redo</button><button class="btn btn-outline btn-small" id="msExportTheme" type="button">Export theme</button><button class="btn btn-outline btn-small" id="msImportThemeBtn" type="button">Import theme</button><input id="msImportThemeFile" type="file" accept="application/json,.json" hidden></div><button class="btn btn-quiet btn-small" id="msResetDesign" type="button" style="margin-top:10px">Reset visual design</button><p class="small-note" style="margin-top:10px">Theme packages contain only visual settings and branding. They do not contain workouts, history or personal training records.</p></section>
            <section class="panel"><div class="ms-card-title"><div><h3>Protection rules</h3><p>Customization stays separate from your training records.</p></div></div><ul class="guide-bullets"><li>Workout history and routines are not edited by theme controls.</li><li>Imported theme files are checked before applying.</li><li>Saved profiles are included in normal app backups.</li><li>Contrast, keyboard focus and reduced-motion options remain available.</li></ul></section>
          </aside>
        </div>
      </section>`);
    const menu=$('#moreMenu');if(menu&&!menu.querySelector('[data-more-tab="studio"]'))menu.insertAdjacentHTML('beforeend','<button data-more-tab="studio">Customization Studio <small>Design your entire app</small></button>');
    const topActions=$('.top-actions');if(topActions&&!$('#msQuickOpen'))topActions.insertAdjacentHTML('afterbegin','<button class="icon-btn" id="msQuickOpen" title="Open Customization Studio" aria-label="Open Customization Studio">✧</button>');
    const brand=$('.brand');if(brand){const word=$('span',brand);if(word){word.classList.add('ms-brand-wrap');word.innerHTML='<span class="ms-brand-name">NEXORA FITNESS</span><small class="ms-brand-sub">YOUR TRAINING. YOUR DESIGN</small>';}}
  }
  function renderPresets(){
    const grid=$('#msPresetGrid');if(!grid)return;
    grid.innerHTML=Object.entries(PRESETS).map(([key,p])=>{const colors=p.colors||config().colors;return `<button type="button" class="ms-preset" data-ms-preset="${key}" aria-pressed="${config().preset===key}"><span class="ms-swatch" style="--sw-bg:${colors.bg};--sw-accent:${colors.accent}"></span><span><strong>${p.label}</strong><small>${p.desc}</small></span></button>`;}).join('');
  }
  function renderLabels(){
    const grid=$('#msLabelsGrid');if(!grid)return;
    const keys=[['workout','Today tab'],['builder','Training tab'],['progress','Progress tab'],['browse','Browse tab'],['planner','Planner menu'],['insights','Insights menu'],['guide','Guide menu'],['settings','Settings menu'],['studio','Studio menu']];
    grid.innerHTML=keys.map(([key,label])=>`<label class="ms-control"><span>${label}</span><input maxlength="16" data-ms-label="${key}" value="${String(config().labels[key]||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></label>`).join('');
  }
  function renderNavVisibility(){const el=$('#msNavVisibility');if(!el)return;const labels={workout:'Today',builder:'Train',progress:'Progress',browse:'Browse'};el.innerHTML=Object.keys(labels).map(key=>`<label class="checkline"><input type="checkbox" data-ms-nav-visible="${key}" ${config().navVisible[key]!==false?'checked':''}><span><b>${labels[key]}</b><small>Show in primary navigation</small></span></label>`).join('');}
  function renderWidgets(){
    const list=$('#msWidgetList');if(!list)return;
    const labels={welcome:'Welcome / summary hero',insights:'Weekly insights cards',quick:'Quick-start cards'};
    const order=config().widgetOrder||['welcome','insights','quick'];
    list.innerHTML=order.map((key,i)=>`<div class="ms-widget-row" data-ms-widget-row="${key}"><input type="checkbox" aria-label="Show ${labels[key]}" data-ms-widget-toggle="${key}" ${config().widgets[key]?'checked':''}><span>${labels[key]}</span><button type="button" class="btn btn-quiet btn-small" data-ms-widget-up="${key}" ${i===0?'disabled':''} aria-label="Move ${labels[key]} up">↑</button><button type="button" class="btn btn-quiet btn-small" data-ms-widget-down="${key}" ${i===order.length-1?'disabled':''} aria-label="Move ${labels[key]} down">↓</button></div>`).join('');
  }
  function renderProfiles(){
    const list=$('#msProfiles');if(!list)return;
    const profiles=state.morphsetProfiles||[];
    list.innerHTML=profiles.length?profiles.map(p=>`<div class="ms-profile-row"><span title="${String(p.name).replace(/"/g,'&quot;')}">${String(p.name).replace(/</g,'&lt;')}</span><button type="button" class="btn btn-outline btn-small" data-ms-profile-use="${p.id}">Apply</button><button type="button" class="btn btn-quiet btn-small ms-profile-delete" data-ms-profile-delete="${p.id}" aria-label="Delete ${String(p.name).replace(/"/g,'&quot;')}">×</button></div>`).join(''):'<p class="small-note">No saved profiles yet. Save your current design above.</p>';
  }
  function renderInputs(){
    const c=config();
    $$('[data-ms-color]').forEach(el=>el.value=c.colors[el.dataset.msColor]||'#000000');
    const values={msBrandName:c.brandName,msTagline:c.tagline,msRadius:c.radius,msBlur:c.blur,msShadow:c.shadow,msScale:c.scale,msFont:c.font,msCardStyle:c.cardStyle,msDensity:c.density,msMotion:c.motion,msNav:c.nav,msNavStyle:c.navStyle,msWidth:c.width,msLayout:c.layout,msBackgroundStyle:c.backgroundStyle,msButtonStyle:c.buttonStyle,msColorMode:c.colorMode,msWelcomeTitle:c.welcomeTitle,msWelcomeText:c.welcomeText};
    Object.entries(values).forEach(([id,value])=>{const el=$(`#${id}`);if(el)el.value=String(value);});
    $('#msLogoPreview')?.setAttribute('src',c.logoData||'nexora-icon-192.png');
    const outputs={msRadiusOut:`${c.radius} px`,msBlurOut:`${c.blur} px`,msShadowOut:`${c.shadow}%`,msScaleOut:`${Math.round(c.scale*100)}%`};Object.entries(outputs).forEach(([id,value])=>{const el=$(`#${id}`);if(el)el.textContent=value;});
    renderPresets();renderLabels();renderNavVisibility();renderWidgets();renderProfiles();
  }
  function renderPreview(){
    const c=config();const name=$('#msPreviewName');if(name)name.textContent=c.brandName;
    const tag=$('#msPreviewTag');if(tag)tag.textContent=c.tagline;
    const logo=$('#msPreviewLogo');if(logo)logo.src=c.logoData||'nexora-icon-192.png';
  }
  function renderStudioState(){renderInputs();renderPreview();}
  function updateLabel(key,value){change(c=>{c.labels[key]=safeText(value,16)||DEFAULT_CONFIG.labels[key];});}
  function choosePreset(preset){
    if(!PRESETS[preset])return;commitPending();
    change(c=>{c.preset=preset;if(PRESETS[preset].colors)c.colors=clone(PRESETS[preset].colors);if(PRESETS[preset].radius)c.radius=PRESETS[preset].radius;if(PRESETS[preset].blur!==undefined)c.blur=PRESETS[preset].blur;if(PRESETS[preset].shadow!==undefined)c.shadow=PRESETS[preset].shadow;if(PRESETS[preset].density)c.density=PRESETS[preset].density;if(PRESETS[preset].font)c.font=PRESETS[preset].font;if(PRESETS[preset].cardStyle)c.cardStyle=PRESETS[preset].cardStyle;if(PRESETS[preset].nav)c.nav=PRESETS[preset].nav;if(PRESETS[preset].layout)c.layout=PRESETS[preset].layout;if(PRESETS[preset].colorMode)c.colorMode=PRESETS[preset].colorMode;else c.colorMode='dark';});renderStudioState();
    tell(`${PRESETS[preset].label} appearance applied.`);
  }
  function imageToSmallData(file){
    return new Promise((resolve,reject)=>{
      if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)){reject(new Error('Choose a PNG, JPG or WebP image.'));return;}
      if(file.size>5*1024*1024){reject(new Error('Logo file must be under 5 MB.'));return;}
      const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read that image.'));
      reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('That image could not be decoded.'));img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');const scale=Math.min(256/img.width,256/img.height);const w=img.width*scale,h=img.height*scale;ctx.clearRect(0,0,256,256);ctx.drawImage(img,(256-w)/2,(256-h)/2,w,h);resolve(canvas.toDataURL('image/webp',.82));};img.src=reader.result;};reader.readAsDataURL(file);
    });
  }
  async function uploadLogo(file){try{const data=await imageToSmallData(file);change(c=>{c.logoData=data;});renderStudioState();tell('Your new app icon is saved.');}catch(err){tell(err.message||'Logo could not be saved.');}}
  function saveProfile(){
    const name=safeText($('#msProfileName')?.value,28);if(!name){tell('Enter a name for this design profile.');$('#msProfileName')?.focus();return;}
    const list=state.morphsetProfiles||[];if(list.length>=12){tell('You can save up to 12 profiles. Delete one before adding another.');return;}
    list.push({id:`ms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,name,config:snapshot(),createdAt:new Date().toISOString()});state.morphsetProfiles=list;persist();renderProfiles();$('#msProfileName').value='';tell(`Profile “${name}” saved.`);
  }
  function applyProfile(id){const p=(state.morphsetProfiles||[]).find(x=>x.id===id);if(!p||!p.config)return;change(c=>{Object.assign(c,clone(p.config));},{history:true});renderStudioState();tell(`Applied ${p.name}.`);}
  function deleteProfile(id){const p=(state.morphsetProfiles||[]).find(x=>x.id===id);if(!p)return;if(!confirm(`Delete the “${p.name}” design profile? Your active design will not change.`))return;state.morphsetProfiles=state.morphsetProfiles.filter(x=>x.id!==id);persist();renderProfiles();tell('Profile deleted.');}
  function exportTheme(){
    const payload={type:'morphset-theme',schemaVersion:1,createdAt:new Date().toISOString(),app:'NEXORA FITNESS',config:snapshot()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`nexora-theme-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);tell('Theme package exported.');
  }
  function sanitizeImportedConfig(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid theme settings.');
    const next=defaults();
    next.brandName=safeName(raw.brandName);next.tagline=safeText(raw.tagline,42)||next.tagline;
    next.preset=['classic','training','obsidian','light','custom'].includes(raw.preset)?raw.preset:'custom';
    for(const key of Object.keys(next.colors)){if(validHex(raw.colors?.[key]))next.colors[key]=raw.colors[key].toLowerCase();}
    next.radius=Math.max(8,Math.min(32,Number(raw.radius)||22));next.blur=Math.max(0,Math.min(32,Number(raw.blur)||0));next.shadow=Math.max(0,Math.min(60,Number(raw.shadow)||0));next.scale=Math.max(.9,Math.min(1.15,Number(raw.scale)||1));
    for(const key of ['density','font','width','cardStyle','nav','navStyle','motion','layout','backgroundStyle','buttonStyle','colorMode']){if(typeof raw[key]==='string'&&['comfortable','compact','spacious','system','rounded','serif','mono','wide','standard','glass','flat','outlined','bottom','top','sidebar','minimal','solid','smooth','soft','none','balanced','aurora','gradient','solid','pill','square','dark','light','auto'].includes(raw[key]))next[key]=raw[key];}
    next.welcomeTitle=safeText(raw.welcomeTitle,54)||next.welcomeTitle;next.welcomeText=safeText(raw.welcomeText,180)||next.welcomeText;
    if(raw.labels&&typeof raw.labels==='object')Object.keys(next.labels).forEach(key=>{next.labels[key]=safeText(raw.labels[key],16)||next.labels[key];});
    if(raw.widgets&&typeof raw.widgets==='object')Object.keys(next.widgets).forEach(key=>{if(typeof raw.widgets[key]==='boolean')next.widgets[key]=raw.widgets[key];});
    if(Array.isArray(raw.widgetOrder))next.widgetOrder=raw.widgetOrder.filter(x=>['welcome','insights','quick'].includes(x)).filter((x,i,a)=>a.indexOf(x)===i);
    if(raw.navVisible&&typeof raw.navVisible==='object')Object.keys(next.navVisible).forEach(key=>{if(typeof raw.navVisible[key]==='boolean')next.navVisible[key]=raw.navVisible[key];});
    if(Array.isArray(raw.browsePins))next.browsePins=raw.browsePins.filter(x=>['planner','builder','guide','history','progress','insights','studio','settings'].includes(x)).filter((x,i,a)=>a.indexOf(x)===i).slice(0,5);
    if(Array.isArray(raw.focusMetrics))next.focusMetrics=raw.focusMetrics.filter(x=>['weeklySessions','weeklySets','level','totalSessions'].includes(x)).filter((x,i,a)=>a.indexOf(x)===i).slice(0,4);
    if(typeof raw.logoData==='string'&&raw.logoData.startsWith('data:image/webp;base64,')&&raw.logoData.length<250000)next.logoData=raw.logoData;
    return next;
  }
  async function importTheme(file){
    try{if(!file||file.size>350000)throw new Error('Theme packages must be smaller than 350 KB.');const raw=JSON.parse(await file.text());if(raw.type!=='morphset-theme'||raw.schemaVersion!==1)throw new Error('That file is not a supported NEXORA theme package.');const incoming=sanitizeImportedConfig(raw.config);change(c=>Object.assign(c,incoming));renderStudioState();tell('Theme package imported.');}
    catch(error){tell(error.message||'Theme import failed.');}
  }
  function resetDesign(){if(!confirm('Reset the visual design, app name and dashboard layout to the NEXORA defaults? Workout history, saved plans and exercises will stay untouched.'))return;change(c=>Object.assign(c,defaults()));renderStudioState();tell('NEXORA default design restored.');}
  function moveWidget(key,direction){const order=[...config().widgetOrder];const index=order.indexOf(key),next=index+direction;if(index<0||next<0||next>=order.length)return;[order[index],order[next]]=[order[next],order[index]];change(c=>{c.widgetOrder=order;});renderWidgets();}
  function updateRange(id,key,format){const el=$(`#${id}`);if(!el)return;el.addEventListener('input',()=>{const value=Number(el.value);change(c=>{c[key]=value;},{history:false});const out=$(`#${id}Out`);if(out)out.textContent=format(value);});el.addEventListener('change',()=>{commitPending();persist();});}
  function bindStudio(){
    $('#msQuickOpen')?.addEventListener('click',openStudio);
    $('#msOpenStudioSettings')?.addEventListener('click',openStudio);
    $('#msPresetGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-ms-preset]');if(b)choosePreset(b.dataset.msPreset);});
    $('#msBrandName')?.addEventListener('input',e=>change(c=>{c.brandName=safeName(e.target.value);},{history:false}));
    $('#msBrandName')?.addEventListener('change',()=>{commitPending();persist();renderStudioState();});
    $('#msTagline')?.addEventListener('input',e=>change(c=>{c.tagline=safeText(e.target.value,42)||DEFAULT_CONFIG.tagline;},{history:false}));
    $('#msTagline')?.addEventListener('change',()=>{commitPending();persist();renderStudioState();});
    $('#msLogoUpload')?.addEventListener('change',e=>{if(e.target.files?.[0])uploadLogo(e.target.files[0]);e.target.value='';});
    $('#msResetLogo')?.addEventListener('click',()=>change(c=>{c.logoData='';}));
    $('#msColorsGrid')?.addEventListener('input',e=>{const input=e.target.closest('[data-ms-color]');if(!input||!validHex(input.value))return;change(c=>{c.colors[input.dataset.msColor]=input.value;c.preset='custom';},{history:false});});
    $('#msColorsGrid')?.addEventListener('change',()=>{commitPending();persist();renderPresets();});
    const selectMap={msFont:'font',msCardStyle:'cardStyle',msDensity:'density',msMotion:'motion',msNav:'nav',msNavStyle:'navStyle',msWidth:'width',msLayout:'layout',msBackgroundStyle:'backgroundStyle',msButtonStyle:'buttonStyle',msColorMode:'colorMode'};
    Object.entries(selectMap).forEach(([id,key])=>$(`#${id}`)?.addEventListener('change',e=>change(c=>{c[key]=e.target.value;c.preset='custom';})));
    updateRange('msRadius','radius',v=>`${v} px`);updateRange('msBlur','blur',v=>`${v} px`);updateRange('msShadow','shadow',v=>`${v}%`);updateRange('msScale','scale',v=>`${Math.round(v*100)}%`);
    $('#msLabelsGrid')?.addEventListener('change',e=>{const input=e.target.closest('[data-ms-label]');if(input)updateLabel(input.dataset.msLabel,input.value);});
    $('#msNavVisibility')?.addEventListener('change',e=>{const input=e.target.closest('[data-ms-nav-visible]');if(!input)return;const key=input.dataset.msNavVisible;if(key==='workout'&&!input.checked){input.checked=true;tell('Home stays available as a safe navigation destination.');return;}change(c=>{c.navVisible[key]=input.checked;});});
    ['msWelcomeTitle','msWelcomeText'].forEach((id)=>{const el=$(`#${id}`);el?.addEventListener('input',()=>change(c=>{c[id==='msWelcomeTitle'?'welcomeTitle':'welcomeText']=safeText(el.value,id==='msWelcomeTitle'?54:180)||DEFAULT_CONFIG[id==='msWelcomeTitle'?'welcomeTitle':'welcomeText'];},{history:false}));el?.addEventListener('change',commitPending);});
    $('#msWidgetList')?.addEventListener('change',e=>{const input=e.target.closest('[data-ms-widget-toggle]');if(input)change(c=>{c.widgets[input.dataset.msWidgetToggle]=input.checked;});});
    $('#msWidgetList')?.addEventListener('click',e=>{const up=e.target.closest('[data-ms-widget-up]'),down=e.target.closest('[data-ms-widget-down]');if(up)moveWidget(up.dataset.msWidgetUp,-1);if(down)moveWidget(down.dataset.msWidgetDown,1);});
    $('#msSaveProfile')?.addEventListener('click',saveProfile);
    $('#msProfiles')?.addEventListener('click',e=>{const use=e.target.closest('[data-ms-profile-use]'),del=e.target.closest('[data-ms-profile-delete]');if(use)applyProfile(use.dataset.msProfileUse);if(del)deleteProfile(del.dataset.msProfileDelete);});
    $('#msUndo')?.addEventListener('click',undo);$('#msUndoSide')?.addEventListener('click',undo);$('#msRedo')?.addEventListener('click',redo);$('#msRedoSide')?.addEventListener('click',redo);
    $('#msExportTheme')?.addEventListener('click',exportTheme);$('#msImportThemeBtn')?.addEventListener('click',()=>$('#msImportThemeFile')?.click());
    $('#msImportThemeFile')?.addEventListener('change',e=>{if(e.target.files?.[0])importTheme(e.target.files[0]);e.target.value='';});
    $('#msResetDesign')?.addEventListener('click',resetDesign);
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();e.shiftKey?redo():undo();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();redo();}});
  }
  function openStudio(){setTab('studio');if($('#moreMenu'))$('#moreMenu').hidden=true;renderStudioState();$('#msStudioTitle')?.scrollIntoView({block:'start',behavior:config().motion==='none'?'auto':'smooth'});}
  function boot(){
    if(typeof state==='undefined')return;
    ensureState();
    applyDesign();
    if(typeof applySettings==='function'){const baseApplySettings=applySettings;applySettings=function(){baseApplySettings.apply(this,arguments);applyColors();};}
    // The former unrestricted Customization Studio is intentionally not mounted in 9.7.
    // Existing morphset preference data remains in the backup for safe migration.
    const studio=$('#studioView');if(studio)studio.remove();
    const more=$('#moreMenu');more?.querySelectorAll('[data-more-tab="studio"]').forEach(node=>node.remove());
    // Keep backups compatible with older data while using the new brand in filenames.
    if(typeof exportBackup==='function'){exportBackup=function(){const payload=JSON.stringify(state,null,2);const blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`nexora-fitness-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);tell('Nexora Fitness backup exported.');};}
    // Preserve branding and the design controls after an older backup is imported.
    if(typeof importBackup==='function'){
      const originalImport=importBackup;
      importBackup=function(file){originalImport(file);};
    }
    $('#xConfirmBackupImport')?.addEventListener('click',()=>setTimeout(()=>{ensureState();applyDesign();renderStudioState();setStatus('Backup restored · design ready');},220));
    // Keep profile and visual settings included in the normal backup, while leaving the legacy storage key unchanged.
    setStatus();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
