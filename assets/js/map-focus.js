// ==================================================
// Vista del mapa / Fondo atenuado y controles externos inactivos
// ==================================================
const card = document.querySelector('.map-card');
const allowedDialogs = new Set(['tracking-dialog', 'location-history-dialog', 'reading-dialog']);
const previous = new Map();
const backdrop = document.createElement('div');
backdrop.className = 'map-focus-backdrop';
backdrop.hidden = true;
backdrop.setAttribute('aria-hidden', 'true');
document.body.append(backdrop);
let active = false;

export function setMapFocus(enabled) {
  if (active === enabled) return;
  active = enabled;
  backdrop.hidden = !enabled;
  card.classList.toggle('map-focused', enabled);

  if (enabled) {
    // Bloqueamos hermanos de cada ancestro, nunca el contenedor del mapa.
    // inert impide clics, tabulacion y acceso de tecnologias de asistencia.
    let branch = card;
    while (branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling === branch || sibling === backdrop || allowedDialogs.has(sibling.id)
          || ['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) continue;
        previous.set(sibling, sibling.inert);
        sibling.inert = true;
        sibling.classList.add('map-muted');
      }
      branch = branch.parentElement;
    }
    if (!card.contains(document.activeElement) && !document.activeElement.closest('dialog[open]')) {
      document.querySelector('#open-tracking').focus({ preventScroll: true });
    }
    card.scrollIntoView({ block: 'start' });
  } else {
    for (const [element, wasInert] of previous) {
      element.inert = wasInert;
      element.classList.remove('map-muted');
    }
    previous.clear();
  }
}
