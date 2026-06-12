/*
 * Tiny inline-icon registry for the mockups. Usage in markup:
 *   <i data-icon="chart" class="icon"></i>
 * Swapped to inline SVG on load so it works over file:// and http alike.
 * Simple stroke icons in a 24x24 box, Lucide-ish, consistent across approaches.
 */
(function () {
  const P = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
    projects: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6" rx="0.5"/><rect x="12" y="7" width="3" height="10" rx="0.5"/><rect x="17" y="13" width="3" height="4" rx="0.5"/>',
    logs: '<path d="M5 4h11l3 3v13H5Z"/><path d="M8 9h6"/><path d="M8 12.5h8"/><path d="M8 16h5"/>',
    activity: '<path d="M3 12h4l2 6 4-14 2 8h6"/>',
    settings: '<path d="M4 7h10"/><circle cx="17" cy="7" r="2.4"/><path d="M20 12H10"/><circle cx="7" cy="12" r="2.4"/><path d="M4 17h7"/><circle cx="14" cy="17" r="2.4"/>',
    sliders: '<path d="M4 7h10"/><circle cx="17" cy="7" r="2.4"/><path d="M20 12H10"/><circle cx="7" cy="12" r="2.4"/><path d="M4 17h7"/><circle cx="14" cy="17" r="2.4"/>',
    shield: '<path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6Z"/><path d="m9.5 12 2 2 3.5-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none"/>',
    key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.2 11h9"/><path d="M17 11v3"/><path d="M20 11v4"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M16 6a3 3 0 0 1 0 6"/><path d="M15 14.5c2.4.5 4 2.3 4 4.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    disk: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 13h18"/><circle cx="8" cy="16" r="0.7" fill="currentColor" stroke="none"/>',
    database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    package: '<path d="M12 3 4 7v10l8 4 8-4V7Z"/><path d="m4 7 8 4 8-4"/><path d="M12 11v10"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m5 18 5-5 4 4 2-2 3 3"/>',
    docs: '<path d="M5 4h9l5 5v11H5Z"/><path d="M14 4v5h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 5 5 9-11"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    download: '<path d="M12 4v11"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/>',
    arrowLeft: '<path d="M20 12H4"/><path d="m10 6-6 6 6 6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    selector: '<path d="m8 9 4-4 4 4"/><path d="m8 15 4 4 4-4"/>',
    external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M19 13v6H5V5h6"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><circle cx="7" cy="7.5" r="0.7" fill="currentColor" stroke="none"/><circle cx="7" cy="16.5" r="0.7" fill="currentColor" stroke="none"/>',
    gauge: '<path d="M5 18a8 8 0 1 1 14 0"/><path d="m12 14 4-4"/>',
    zap: '<path d="M13 3 5 13h6l-1 8 8-10h-6Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    moon: '<path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4-2v-4Z"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const svg = (d) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  function render(root) {
    (root || document).querySelectorAll('i[data-icon]').forEach((el) => {
      const name = el.getAttribute('data-icon');
      if (P[name]) el.innerHTML = svg(P[name]);
    });
  }
  if (document.readyState !== 'loading') render();
  else document.addEventListener('DOMContentLoaded', () => render());
  window.kpIcons = render;
})();
