/* NEXORA FITNESS 9.9.0.1 — Persistent logo and home shortcut. */
(() => {
  'use strict';
  const brand = document.querySelector('.topbar .brand');
  if (!brand || brand.dataset.nxLogoHomeBound === 'true') return;
  brand.dataset.nxLogoHomeBound = 'true';
  brand.addEventListener('click', (event) => {
    if (typeof window.setTab !== 'function') return;
    event.preventDefault();
    try { window.setTab('workout'); } catch (error) { console.warn('Could not return to Today', error); }
    const menu = document.getElementById('moreMenu');
    if (menu) menu.hidden = true;
    document.getElementById('moreMenuBtn')?.setAttribute('aria-expanded', 'false');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.body.classList.contains('x-reduced-motion') ||
      document.body.dataset.nx983Motion === 'reduced';
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
})();
