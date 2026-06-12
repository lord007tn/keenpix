/*
 * Shared behaviour for the Keenpix IA mockups.
 * Pure data-attribute driven, no dependencies. Lets each static prototype feel
 * navigable without a framework.
 *
 *   data-action="theme"          -> toggle light/dark on <html> (persisted)
 *   data-nav="VIEW"              -> activate [data-view="VIEW"]; nav items in the
 *                                   same [data-navgroup] get .is-active swapped
 *   data-views (container)       -> scopes which [data-view] panels are swapped
 *   data-tab="T" / data-tabpanel -> local tab groups inside a [data-tabs] block
 *   data-toggle (switch)         -> flips .switch--on for demo toggles
 */
(function () {
  const root = document.documentElement;

  // ---- theme ----
  const stored = localStorage.getItem('kp-theme');
  if (stored === 'dark') root.classList.add('dark');
  if (stored === 'light') root.classList.remove('dark');

  function setActive(el, group, attr) {
    if (!group) return;
    document
      .querySelectorAll(`[data-${attr}][data-navgroup="${group}"]`)
      .forEach((n) => n.classList.toggle('is-active', n === el));
    document
      .querySelectorAll(`[data-${attr}][data-navgroup="${group}"]`)
      .forEach((n) => {
        if (n.classList.contains('navitem')) n.classList.toggle('navitem--active', n === el);
        if (n.classList.contains('topnav__item')) n.classList.toggle('topnav__item--active', n === el);
        if (n.classList.contains('subnav__item')) n.classList.toggle('subnav__item--active', n === el);
      });
  }

  document.addEventListener('click', (e) => {
    const themeBtn = e.target.closest('[data-action="theme"]');
    if (themeBtn) {
      const dark = root.classList.toggle('dark');
      localStorage.setItem('kp-theme', dark ? 'dark' : 'light');
      return;
    }

    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      toggle.classList.toggle('switch--on');
      return;
    }

    const nav = e.target.closest('[data-nav]');
    if (nav) {
      e.preventDefault();
      const view = nav.getAttribute('data-nav');
      const group = nav.getAttribute('data-navgroup');
      const scope = nav.closest('[data-app]') || document;
      scope.querySelectorAll('[data-view]').forEach((p) => {
        p.classList.toggle('is-active', p.getAttribute('data-view') === view);
      });
      setActive(nav, group, 'nav');
      // optional: update a breadcrumb / title hook
      const titleTarget = scope.querySelector('[data-active-title]');
      if (titleTarget && nav.hasAttribute('data-title')) {
        titleTarget.textContent = nav.getAttribute('data-title');
      }
      window.scrollTo({ top: 0 });
      return;
    }

    const tab = e.target.closest('[data-tab]');
    if (tab) {
      const name = tab.getAttribute('data-tab');
      const group = tab.closest('[data-tabs]') || document;
      group.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('tab--active', t === tab));
      group.querySelectorAll('[data-tabpanel]').forEach((p) => {
        p.style.display = p.getAttribute('data-tabpanel') === name ? '' : 'none';
      });
      return;
    }
  });

  // init tab groups (show first panel)
  document.querySelectorAll('[data-tabs]').forEach((group) => {
    const panels = group.querySelectorAll('[data-tabpanel]');
    panels.forEach((p, i) => (p.style.display = i === 0 ? '' : 'none'));
  });
})();
