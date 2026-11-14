/* NEXORA FITNESS 9.7.0 — Health-inspired Today, Browse, and pinned focus navigation. */
(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const DESTINATIONS = [
    {id:'planner',title:'Training planner',description:'Organize your week and session days.',group:'training'},
    {id:'builder',title:'Workout builder',description:'Edit plans, exercises and reusable templates.',group:'training'},
    {id:'guide',title:'Exercise guide',description:'Browse movement notes and alternatives.',group:'training'},
    {id:'history',title:'Workout history',description:'Review completed sessions and notes.',group:'progress'},
    {id:'progress',title:'Progress overview',description:'See milestones and training progress.',group:'progress'},
    {id:'insights',title:'Training insights',description:'Explore trends and compare sessions.',group:'progress'},
    {id:'settings',title:'Settings & data',description:'Manage preferences, backups and accessibility.',group:'personalize'}
  ];
  const METRICS = [
    {id:'weeklySessions',title:'Sessions this week',short:'WEEKLY SESSIONS',description:'Saved workouts in the last seven days.',icon:'◷'},
    {id:'weeklySets',title:'Sets this week',short:'WEEKLY SETS',description:'Sets recorded in saved workouts over the last seven days.',icon:'▤'},
    {id:'level',title:'Current level',short:'CURRENT LEVEL',description:'Your current Nexora Fitness level from saved XP.',icon:'✧'},
    {id:'totalSessions',title:'All-time sessions',short:'ALL-TIME SESSIONS',description:'Total workouts currently in your history.',icon:'↗'}
  ];
  let browseDrilldown = false;
  let installed = false;

  function cfg(){
    if(typeof state==='undefined'||!state) return null;
    state.morphset = state.morphset && typeof state.morphset==='object' ? state.morphset : {};
    const c=state.morphset;
    c.browsePins=Array.isArray(c.browsePins)?c.browsePins.filter((x,i,a)=>DESTINATIONS.some(d=>d.id===x)&&a.indexOf(x)===i).slice(0,5):['planner','history','guide'];
    c.focusMetrics=Array.isArray(c.focusMetrics)?c.focusMetrics.filter((x,i,a)=>METRICS.some(m=>m.id===x)&&a.indexOf(x)===i).slice(0,4):['weeklySessions','weeklySets','level'];
    return c;
  }
  function persist(){try{if(typeof window.saveState==='function')window.saveState();}catch(error){console.warn('Nexora Browse preferences could not be saved',error);}}
  function notify(message){if(typeof window.toast==='function')window.toast(message);else {const t=$('#toast');if(t)t.textContent=message;}}
  function escapeText(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

  function dateWithinWeek(dateString){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString||'')))return false;
    const date=new Date(`${dateString}T12:00:00`);if(Number.isNaN(date.getTime()))return false;
    const today=new Date();today.setHours(12,0,0,0);const start=new Date(today);start.setDate(today.getDate()-6);
    return date>=start&&date<=today;
  }
  function metricValue(id){
    const logs=Array.isArray(state.logs)?state.logs:[];
    const week=logs.filter(log=>dateWithinWeek(log.date));
    if(id==='weeklySessions')return {value:String(week.length),sub:'Saved sessions · 7 days'};
    if(id==='weeklySets')return {value:String(week.reduce((sum,log)=>sum+Math.max(0,Number(log.setsDone)||0),0)),sub:'Recorded sets · 7 days'};
    if(id==='level')return {value:`Level ${Math.min(50,1+Math.floor(Math.max(0,Number(state.xp)||0)/500))}`,sub:`${Math.max(0,Number(state.xp)||0).toLocaleString()} total XP`};
    return {value:String(logs.length),sub:'Saved in your history'};
  }
  function renderFocusMetrics(){
    const host=$('#msTodayFocus');if(!host||typeof state==='undefined'||!state)return;
    const c=cfg(),selected=c?.focusMetrics||[];
    if(!selected.length){host.hidden=true;host.innerHTML='';return;}
    host.hidden=false;
    host.innerHTML=`<div class="ms-today-focus-heading"><div><p class="eyebrow">YOUR FOCUS</p><h3>At a glance</h3></div><button class="ms-focus-edit" type="button" data-ms-open-browse>Edit in Browse <span aria-hidden="true">→</span></button></div><div class="ms-today-focus-grid">${selected.map(id=>{const metric=METRICS.find(m=>m.id===id);if(!metric)return '';const data=metricValue(id);return `<article class="ms-focus-metric"><span class="ms-focus-icon" aria-hidden="true">${metric.icon}</span><div class="ms-focus-metric-copy"><small>${metric.short}</small><strong>${escapeText(data.value)}</strong><span>${escapeText(data.sub)}</span></div></article>`;}).join('')}</div>`;
  }
  function syncDestinationPinButtons(){
    const pins=cfg()?.browsePins||[];
    $$('[data-browse-pin]').forEach(button=>{
      const id=button.dataset.browsePin,on=pins.includes(id),title=DESTINATIONS.find(d=>d.id===id)?.title||'destination';
      button.setAttribute('aria-pressed',String(on));
      button.setAttribute('aria-label',`${on?'Unpin':'Pin'} ${title}`);
      button.textContent=on?'★':'☆';
    });
  }
  function renderPinnedDestinations(){
    const host=$('#msBrowsePinned');if(!host)return;
    const c=cfg(),pins=c?.browsePins||[];
    $('#msBrowsePinCount').textContent=`${pins.length} PINNED`;
    if(!pins.length){host.innerHTML='<p class="ms-browse-empty">No pinned destinations yet. Use the ☆ buttons in Browse to add shortcuts here.</p>';return;}
    host.innerHTML=pins.map((id,index)=>{const d=DESTINATIONS.find(x=>x.id===id);if(!d)return '';return `<div class="ms-pinned-destination"><button class="ms-pinned-open" type="button" data-browse-open="${d.id}"><span class="ms-browse-mini-icon">${d.id==='history'?'◷':d.id==='planner'?'▦':d.id==='builder'?'▤':d.id==='guide'?'⌁':d.id==='progress'?'↗':d.id==='insights'?'⌁':'⚙'}</span><span>${escapeText(d.title)}</span><b aria-hidden="true">›</b></button><div class="ms-pinned-controls"><button type="button" data-pin-move="${id}" data-direction="up" aria-label="Move ${escapeText(d.title)} earlier" ${index===0?'disabled':''}>↑</button><button type="button" data-pin-move="${id}" data-direction="down" aria-label="Move ${escapeText(d.title)} later" ${index===pins.length-1?'disabled':''}>↓</button><button type="button" data-browse-pin="${id}" aria-label="Unpin ${escapeText(d.title)}" aria-pressed="true">★</button></div></div>`;}).join('');
    syncDestinationPinButtons();
  }
  function renderFocusOptions(){
    const host=$('#msBrowseFocusOptions');if(!host)return;
    const selected=cfg()?.focusMetrics||[];
    $('#msFocusCount').textContent=`${selected.length} ON TODAY`;
    host.innerHTML=METRICS.map(metric=>{const on=selected.includes(metric.id);const data=metricValue(metric.id);return `<div class="ms-focus-option"><span class="ms-browse-icon ms-tone-green">${metric.icon}</span><span class="ms-focus-option-copy"><b>${metric.title}</b><small>${metric.description}</small><em>Current value: ${escapeText(data.value)}</em></span><button type="button" class="ms-focus-toggle" data-focus-toggle="${metric.id}" aria-pressed="${on}">${on?'Pinned':'Pin to Today'}</button></div>`;}).join('');
  }
  function renderBrowse(){
    if(!$('#browseView'))return;
    renderPinnedDestinations();renderFocusOptions();
    const query=$('#msBrowseSearch')?.value?.trim().toLowerCase()||'';filterBrowse(query);
    $('#msBrowseCount').textContent=String(DESTINATIONS.length);
  }
  function filterBrowse(query){
    let visible=0;
    $$('[data-browse-item]').forEach(item=>{const text=`${item.textContent} ${item.dataset.search||''}`.toLowerCase();const match=!query||text.includes(query);item.hidden=!match;if(match)visible++;});
    $$('[data-browse-group]').forEach(group=>{group.hidden=!$('[data-browse-item]:not([hidden])',group);});
    const no=$('#msBrowseNoResults');if(no)no.hidden=visible>0;
    const pinned=$('.ms-browse-pinned-panel');if(pinned)pinned.hidden=!!query;
    const focus=$('.ms-browse-focus-panel');if(focus)focus.hidden=!!query;
  }
  function toggleDestinationPin(id){
    const c=cfg();if(!c)return;const pins=c.browsePins||[],index=pins.indexOf(id);
    if(index>=0)pins.splice(index,1);else{if(pins.length>=5){notify('You can pin up to five destinations. Remove one to add another.');return;}pins.push(id);}
    c.browsePins=pins;persist();renderPinnedDestinations();
    syncDestinationPinButtons();
    notify(index>=0?'Shortcut removed from Browse.':'Shortcut pinned to Browse.');
  }
  function toggleFocusMetric(id){
    const c=cfg();if(!c)return;const list=c.focusMetrics||[],index=list.indexOf(id);
    if(index>=0)list.splice(index,1);else{if(list.length>=4){notify('Today can show up to four focus metrics. Unpin one first.');return;}list.push(id);}
    c.focusMetrics=list;persist();renderFocusOptions();renderFocusMetrics();
    notify(index>=0?'Metric removed from Today.':'Metric pinned to Today.');
  }
  function movePin(id,direction){
    const c=cfg();if(!c)return;const list=[...c.browsePins],index=list.indexOf(id),next=index+(direction==='up'?-1:1);if(index<0||next<0||next>=list.length)return;[list[index],list[next]]=[list[next],list[index]];c.browsePins=list;persist();renderPinnedDestinations();
  }
  function activateBrowseTab(){
    $$('.tabs [data-tab]').forEach(button=>{const selected=button.dataset.tab==='browse';button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  }
  function ensureBrowseCrumbs(){
    $$('.view').forEach(view=>{
      if(['workoutView','browseView'].includes(view.id)||$('#'+view.id+' .ms-browse-back'))return;
      const crumb=document.createElement('div');crumb.className='ms-browse-back-wrap';crumb.innerHTML='<button class="ms-browse-back" type="button"><span aria-hidden="true">←</span> Browse all sections</button>';
      view.insertBefore(crumb,view.firstElementChild);
      crumb.querySelector('button').addEventListener('click',()=>{browseDrilldown=false;window.setTab('browse');});
    });
  }
  function updateBrowseCrumbs(){
    ensureBrowseCrumbs();
    $$('.view .ms-browse-back-wrap').forEach(crumb=>{crumb.hidden=!browseDrilldown;});
  }
  function navigateFromBrowse(name){browseDrilldown=true;if(typeof window.setTab==='function')window.setTab(name);}
  function installEvents(){
    const browse=$('#browseView');if(browse){
      browse.addEventListener('click',event=>{
        const open=event.target.closest('[data-browse-open]');if(open){navigateFromBrowse(open.dataset.browseOpen);return;}
        const pin=event.target.closest('[data-browse-pin]');if(pin){toggleDestinationPin(pin.dataset.browsePin);return;}
        const focus=event.target.closest('[data-focus-toggle]');if(focus){toggleFocusMetric(focus.dataset.focusToggle);return;}
        const move=event.target.closest('[data-pin-move]');if(move){movePin(move.dataset.pinMove,move.dataset.direction);}
      });
      $('#msBrowseSearch')?.addEventListener('input',event=>filterBrowse(event.target.value.trim().toLowerCase()));
      $('#msBrowseSearch')?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.target.value='';filterBrowse('');event.target.blur();}});
    }
    $('#msTodayFocus')?.addEventListener('click',event=>{if(event.target.closest('[data-ms-open-browse]'))window.setTab('browse');});
    document.addEventListener('keydown',event=>{
      if((event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))){if($('#browseView')?.classList.contains('active')){event.preventDefault();$('#msBrowseSearch')?.focus();}}
    });
    // A direct primary-tab or More-menu choice exits the Browse drill-down context.
    $('.tabs')?.addEventListener('click',event=>{if(event.target.closest('[data-tab]')){browseDrilldown=false;updateBrowseCrumbs();}},true);
    $('#moreMenu')?.addEventListener('click',event=>{if(event.target.closest('[data-more-tab]')){browseDrilldown=false;updateBrowseCrumbs();}},true);
  }
  function wrapSetTab(){
    if(typeof window.setTab!=='function'||window.setTab.__m962)return;
    const original=window.setTab;
    const wrapped=function(name){
      if(name==='browse')browseDrilldown=false;
      const result=original.apply(this,arguments);
      if(name==='browse'){renderBrowse();$('#msBrowseSearch')?.setAttribute('value',$('#msBrowseSearch')?.value||'');}
      if(browseDrilldown&&name!=='browse')activateBrowseTab();
      if(name==='workout')renderFocusMetrics();
      updateBrowseCrumbs();
      return result;
    };
    wrapped.__m962=true;window.setTab=wrapped;
  }
  function install(){
    if(installed)return;installed=true;cfg();wrapSetTab();installEvents();ensureBrowseCrumbs();renderBrowse();renderFocusMetrics();updateBrowseCrumbs();
    // Keep pinned focus values synchronized after any existing workout or preference save.
    if(typeof window.saveState==='function'&&!window.saveState.__m962){const original=window.saveState;const wrapped=function(){const result=original.apply(this,arguments);if(document.readyState!=='loading')renderFocusMetrics();return result;};wrapped.__m962=true;window.saveState=wrapped;}
    // Re-wrap if the app rebuilds a page or the studio initializes its own view after this file.
    const observer=new MutationObserver(()=>{if(!$('#browseView'))return;ensureBrowseCrumbs();});observer.observe(document.body,{childList:true,subtree:true});
    document.title='NEXORA FITNESS 9.7.0 — Today & Browse';document.documentElement.dataset.morphsetVersion='9.7.0';document.body.dataset.morphsetVersion='9.7.0';
    const version=$('#xAppVersion');if(version)version.textContent='Version 9.7.0';
    const footer=$('.app-footer span');if(footer)footer.textContent='NEXORA FITNESS 9.7.0 / HEALTH & TRAINING';
    window.__morphset962Loaded=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
