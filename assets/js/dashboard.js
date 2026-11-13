// ==================================================
// Entrada protegida / Carga el panel solo con identidad verificada
// ==================================================
import { sessionReady } from './session.js';

if (await sessionReady) {
  await import('./app.js');
  document.documentElement.classList.remove('session-pending');
}
