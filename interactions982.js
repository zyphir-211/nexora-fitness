/* NEXORA FITNESS 9.8.2 — interaction pass.
   Gives brand, internal links, empty states and dashboard shortcuts clear destinations.
   Existing training handlers remain the source of truth for workout actions. */
(() => {
  'use strict';
  if (window.__nexora982Loaded) return;
  window.__nexora982Loaded = true;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const ROUTES = new Set(['workout','builder','progress','browse','history','planner','insights','guide','settings']);
  const getState = () => { try { return typeof state === 'object' && state ? state : null; } catch (_) { return null; } };

  function releaseLabels() {
    const version = '9.8.2 Beta';
    document.title = `NEXORA FITNESS ${version} — Training & Progress`;
    document.documentElement.dataset.nexoraVersion = '9.8.2-beta';
    document.body.dataset.nexoraVersion = '9.8.2-beta';
    const appVersion = $('#xAppVersion'); if (appVersion) appVersion.textContent = `Version ${version}`;
    const footer = $('.app-footer span'); if (footer) footer.textContent = `NEXORA FITNESS ${version.toUpperCase()} / HEALTH & TRAINING`;
    const description = $('meta[name="description"]'); if (description) description.content = 'NEXORA FITNESS — your daily training, progress and movement companion.';
  }

  function closeMenu() {
    const menu = $('#moreMenu'), trigger = $('#moreMenuBtn');
    if (menu && !menu.hidden) menu.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
  }

  function route(name, targetId = '') {
    const normalized = String(name || '').toLowerCase();
    const aliases = {home:'workout',today:'workout',main:'workout',train:'builder',training:'builder',exercise:'guide',calendar:'planner',plan:'planner'};
    const page = aliases[normalized] || normalized;
    if (!ROUTES.has(page)) return false;
    closeMenu();
    if (typeof window.setTab === 'function') window.setTab(page);
    const view = $(`#${page}View`);
    const target = targetId ? document.getElementById(targetId) : null;
    requestAnimationFrame(() => {
      const destination = target && (target.closest('.view') === view || !target.closest('.view')) ? target : view;
      if (destination) {
        if (destination === view) {
          const heading = $('h1,h2', view) || view;
          if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
          heading.focus({preventScroll:true});
        }
        destination.scrollIntoView({behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
      }
    });
    return true;
  }

  function addFirstWorkoutCard() {
    const view = $('#workoutView');
    const welcome = $('.dashboard-welcome', view);
    if (!view || !welcome) return;
    const s = getState();
    const hasHistory = Array.isArray(s?.logs) && s.logs.length > 0;
    const dismissed = !!s?.nx982?.firstWorkoutPromptDismissed;
    let card = $('#nx982FirstWorkout');
    if (hasHistory || dismissed) { card?.remove(); return; }
    if (card) return;
    card = document.createElement('section');
    card.id = 'nx982FirstWorkout';
    card.className = 'nx982-first-workout';
    card.setAttribute('aria-labelledby', 'nx982FirstWorkoutTitle');
    card.innerHTML = `
      <div class="nx982-first-mark" aria-hidden="true">↗</div>
      <div class="nx982-first-copy">
        <p class="eyebrow">A GOOD PLACE TO BEGIN</p>
        <h2 id="nx982FirstWorkoutTitle">Ready for your first workout?</h2>
        <p>Set up a session that fits your time, space and equipment. You can review everything before you begin.</p>
      </div>
      <div class="nx982-first-actions">
        <button type="button" class="btn btn-primary" data-nx982-route="planner">Start your first workout <span aria-hidden="true">→</span></button>
        <button type="button" class="btn btn-quiet" data-nx982-route="guide">Explore exercises</button>
        <button type="button" class="nx982-dismiss" data-nx982-dismiss aria-label="Dismiss first workout suggestion" title="Dismiss">×</button>
      </div>`;
    welcome.insertAdjacentElement('afterend', card);
  }

  function syncFirstWorkoutCard() {
    addFirstWorkoutCard();
  }

  function bindRenderRefresh() {
    ['renderWorkout','saveWorkout'].forEach(key => {
      const base = window[key];
      if (typeof base !== 'function' || base.__nx982Interactions) return;
      const wrapped = function () {
        const result = base.apply(this, arguments);
        releaseLabels();
        if (key === 'renderWorkout' || key === 'saveWorkout') requestAnimationFrame(syncFirstWorkoutCard);
        return result;
      };
      wrapped.__nx982Interactions = true;
      window[key] = wrapped;
    });
  }

  function handleInternalAnchor(event, link) {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) return false;
    const rawId = href.slice(1);
    const id = rawId ? decodeURIComponent(rawId) : '';
    const target = id ? document.getElementById(id) : null;
    if (link.classList.contains('brand') || id === 'top' || id === 'workoutView') {
      event.preventDefault();
      route('workout', id === 'top' ? 'workoutView' : id);
      return true;
    }
    if (!target) return false;
    const owningView = target.closest('.view');
    if (owningView) {
      const page = owningView.id.replace(/View$/, '');
      if (ROUTES.has(page)) {
        event.preventDefault();
        route(page, id);
        return true;
      }
    }
    if (id === 'workoutHeading') {
      event.preventDefault();
      route('workout', id);
      return true;
    }
    return false;
  }

  function addDashboardShortcuts() {
    const mappings = [
      ['.dashboard-activity','insights','View training insights'],
      ['.dashboard-milestone','progress','View progress milestones']
    ];
    mappings.forEach(([selector, page, label]) => {
      const card = $(selector);
      if (!card || card.dataset.nx982RouteBound === '1') return;
      card.dataset.nx982RouteBound = '1';
      card.classList.add('nx982-route-card');
      card.setAttribute('role','link');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label',label);
      card.addEventListener('click', event => {
        if (event.target.closest('button,a,input,select,textarea')) return;
        route(page);
      });
      card.addEventListener('keydown', event => {
        if (event.target !== card || !['Enter',' '].includes(event.key)) return;
        event.preventDefault(); route(page);
      });
    });
  }

  function bindInteractions() {
    document.addEventListener('click', event => {
      const brand = event.target.closest('.brand');
      if (brand) {
        event.preventDefault();
        route('workout', 'workoutView');
        return;
      }

      const routeButton = event.target.closest('[data-nx982-route]');
      if (routeButton) {
        const target = routeButton.dataset.nx982Route;
        if (route(target)) event.preventDefault();
        return;
      }

      const dismiss = event.target.closest('[data-nx982-dismiss]');
      if (dismiss) {
        const s = getState();
        if (s) { s.nx982 = s.nx982 && typeof s.nx982 === 'object' ? s.nx982 : {}; s.nx982.firstWorkoutPromptDismissed = true; window.saveState?.(); }
        $('#nx982FirstWorkout')?.remove();
        if (typeof window.toast === 'function') window.toast('Suggestion hidden. You can still start a workout from Train or Planner.');
        return;
      }

      const link = event.target.closest('a[href^="#"]');
      if (link) { handleInternalAnchor(event, link); return; }

      // Text-led onboarding CTAs should route to the planner rather than silently doing nothing.
      const actionable = event.target.closest('button,a,[role="button"],[role="link"]');
      if (actionable && !actionable.disabled) {
        const text = (actionable.getAttribute('aria-label') || actionable.innerText || actionable.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
        if (/^(start|plan|create) your first workout\b/.test(text)) {
          event.preventDefault(); route('planner');
        }
      }
    }, true);
  }

  function wrapNavigationLabels() {
    if (typeof window.setTab === 'function' && !window.setTab.__nx982) {
      const base = window.setTab;
      const wrapped = function () { const result = base.apply(this, arguments); releaseLabels(); return result; };
      wrapped.__nx982 = true; window.setTab = wrapped;
    }
  }

  function updateBrandAction() {
    const brand = $('.brand');
    if (brand) {
      brand.href = '#workoutView';
      brand.title = 'Go to Today — main dashboard';
      brand.setAttribute('aria-label','NEXORA FITNESS — go to Today, the main dashboard');
    }
  }

  function diagnostics() {
    const controls = $$('button,a[href],[role="button"],[role="link"]');
    const unlabeled = controls.filter(el => !el.disabled && !el.getAttribute('aria-label') && !el.title && !(el.innerText || el.textContent || '').trim());
    const deadHashLinks = $$('a[href="#"],a:not([href])');
    return {
      logoRoutesHome: !!$('.brand[href="#workoutView"]'),
      firstWorkoutRoutesPlanner: !!$('#nx982FirstWorkout [data-nx982-route="planner"]'),
      internalHashLinks: $$('a[href^="#"]').length,
      actionableControls: controls.length,
      unlabeledControls: unlabeled.length,
      emptyOrHashLinks: deadHashLinks.length
    };
  }

  function boot() {
    updateBrandAction();
    releaseLabels();
    wrapNavigationLabels();
    addFirstWorkoutCard();
    addDashboardShortcuts();
    bindRenderRefresh();
    bindInteractions();
    window.__nexora982Ready = true;
    window.__nexora982Diagnostics = diagnostics;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
