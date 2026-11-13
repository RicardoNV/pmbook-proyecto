// ==================================================
// Sesion / Identidad verificada y cierre en este navegador
// ==================================================

const logout = document.querySelector('#logout-button');
const loginLink = document.querySelector('#account-login');
const message = document.querySelector('#session-message');
const accountName = document.querySelector('#account-name');
const logoutDialog = document.querySelector('#logout-dialog');
const confirmLogout = document.querySelector('#confirm-logout');
const cancelLogout = document.querySelector('#cancel-logout');
const logoutError = document.querySelector('#logout-error');
let revision = 0;
let initializing = true;

logout.addEventListener('click', () => { logoutError.textContent = ''; logoutDialog.showModal(); });
cancelLogout.addEventListener('click', () => logoutDialog.close());
logoutDialog.addEventListener('cancel', event => { if (confirmLogout.disabled) event.preventDefault(); });
logoutDialog.addEventListener('close', () => logout.focus());

async function initializeSession() {
  try {
    const { supabase } = await import('./supabase.js');

    // El callback no ejecuta consultas: evita bloquear el cliente Auth.
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        revision += 1;
        showGuest();
      } else if (!initializing && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setTimeout(() => verifySession(supabase), 0);
      }
    });

    confirmLogout.addEventListener('click', async () => {
      if (confirmLogout.disabled) return;
      confirmLogout.disabled = true;
      cancelLogout.disabled = true;
      confirmLogout.textContent = 'Cerrando sesión…';
      message.textContent = '';
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
        window.location.replace('./login.html');
      } catch {
        logoutError.textContent = 'No se pudo cerrar la sesión. Revisa tu conexión y vuelve a intentar.';
      } finally {
        confirmLogout.disabled = false;
        cancelLogout.disabled = false;
        confirmLogout.textContent = 'Cerrar sesión';
      }
    });

    return await verifySession(supabase);
  } catch {
    showGuest();
    return false;
  } finally { initializing = false; }
}

function showGuest() {
  accountName.textContent = 'Invitado';
  message.textContent = '';
  logout.hidden = true;
  loginLink.hidden = false;
  window.location.replace('./login.html#login');
}

async function verifySession(supabase) {
  const current = ++revision;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (current !== revision) return;
    if (!data.session) {
      showGuest();
      return false;
    }

    // Verificamos la identidad con el servidor, no solo con el almacenamiento local.
    const verified = await supabase.auth.getUser();
    if (verified.error) throw verified.error;
    if (current !== revision) return;
    accountName.textContent = verified.data.user.user_metadata?.full_name?.trim() || 'Mi cuenta';
    logout.hidden = false;
    loginLink.hidden = true;
    message.textContent = '';
    return true;
  } catch {
    if (current !== revision) return;
    showGuest();
    return false;
  }
}

export const sessionReady = initializeSession();
