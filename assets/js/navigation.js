// ==================================================
// Sidebar responsive y navegacion entre apartados
// ==================================================

export function initializeNavigation(onDashboardVisible) {
  const sidebar = document.querySelector('#sidebar');
  const toggle = document.querySelector('#toggle-sidebar');
  const close = document.querySelector('#close-sidebar');
  const backdrop = document.querySelector('#sidebar-backdrop');
  const frame = document.querySelector('#app-frame');
  const links = [...document.querySelectorAll('[data-view]')];
  const mobile = window.matchMedia('(max-width: 1100px)');
  let isOpen = false;

  // Apertura y cierre / El contenido de fondo queda inactivo en movil.
  function setOpen(open, returnFocus = false) {
    isOpen = open;
    document.body.classList.toggle('sidebar-open', open);
    document.body.classList.toggle('sidebar-modal', open && mobile.matches);
    sidebar.inert = !open;
    frame.inert = open && mobile.matches;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');

    if (open && mobile.matches) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      close.focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');

      if (returnFocus) {
        toggle.focus();
      }
    }

    requestAnimationFrame(onDashboardVisible);
  }

  // Rutas locales / El hash permite recargar y usar Atras / Adelante.
  function showView(moveFocus = true) {
    const view = window.location.hash === '#mascota' ? 'mascota' : 'dashboard';

    for (const name of ['dashboard', 'mascota']) {
      document.getElementById(name).hidden = name !== view;
    }

    for (const link of links) {
      if (link.dataset.view === view) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }

    if (mobile.matches) {
      setOpen(false);
    }

    document.title = view === 'mascota'
      ? 'Smart Collar · Datos de la mascota'
      : 'Smart Collar · Panel de monitoreo';

    if (moveFocus) {
      document.querySelector(view === 'mascota' ? '#pet-title' : '#dashboard-title').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (view === 'dashboard') {
      requestAnimationFrame(onDashboardVisible);
    }
  }

  // Eventos del menu
  toggle.addEventListener('click', () => setOpen(!isOpen));
  close.addEventListener('click', () => setOpen(false, true));
  backdrop.addEventListener('click', () => setOpen(false, true));
  window.addEventListener('hashchange', () => showView());

  for (const link of links) {
    link.addEventListener('click', () => {
      if (window.location.hash === link.hash) {
        showView();
      }
    });
  }

  // Teclado / Escape cierra y Tab permanece en el menu movil.
  sidebar.addEventListener('keydown', (event) => {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
    }

    if (event.key === 'Tab' && mobile.matches) {
      const first = close;
      const controls = [...sidebar.querySelectorAll('a[href], button:not(:disabled)')]
        .filter(element => !element.hidden && element.getClientRects().length);
      const last = controls.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Ajuste al cambiar el ancho / Leaflet recalcula el espacio disponible.
  mobile.addEventListener('change', () => {
    const hadFocus = sidebar.contains(document.activeElement);
    setOpen(!mobile.matches, hadFocus && mobile.matches);
    requestAnimationFrame(onDashboardVisible);
  });

  frame.addEventListener('transitionend', (event) => {
    if (event.target === frame && event.propertyName === 'margin-left') {
      onDashboardVisible();
    }
  });

  setOpen(!mobile.matches);
  showView(false);
}
