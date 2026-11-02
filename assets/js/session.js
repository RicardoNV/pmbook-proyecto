// ==================================================
// Sesion / Identidad verificada y cierre en este navegador
// ==================================================

const account = document.querySelector('#account-status');
const logout = document.querySelector('#logout-button');
const loginLink = document.querySelector('#account-login');
const message = document.querySelector('#session-message');
let revision = 0;

async function initializeSession() {
  try {
    const { supabase } = await import('./supabase.js');

    // El callback no ejecuta consultas: evita bloquear el cliente Auth.
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        revision += 1;
        showGuest();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setTimeout(() => verifySession(supabase), 0);
      }
    });

    logout.addEventListener('click', async () => {
      if (logout.disabled) return;
      logout.disabled = true;
      logout.textContent = 'Cerrando sesión…';
      message.textContent = '';
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) throw error;
        window.location.replace('./login.html');
      } catch {
        message.textContent = 'No se pudo cerrar la sesión. Revisa tu conexión y vuelve a intentar.';
      } finally {
        logout.disabled = false;
        logout.textContent = 'Cerrar sesión';
      }
    });

    await verifySession(supabase);
  } catch {
    showGuest();
    message.textContent = 'No se pudo comprobar la sesión. Recarga para volver a intentar.';
  }
}

function showGuest() {
  account.textContent = 'Modo demostración · Sin sesión';
  message.textContent = '';
  logout.hidden = true;
  loginLink.hidden = false;
}

async function verifySession(supabase) {
  const current = ++revision;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (current !== revision) return;
    if (!data.session) {
      showGuest();
      return;
    }

    // Verificamos la identidad con el servidor, no solo con el almacenamiento local.
    const verified = await supabase.auth.getUser();
    if (verified.error) throw verified.error;
    if (current !== revision) return;
    account.textContent = `Sesión: ${verified.data.user.email}`;
    logout.hidden = false;
    loginLink.hidden = true;
    message.textContent = 'Los datos de la mascota y las lecturas siguen siendo de demostración.';
  } catch {
    if (current !== revision) return;
    account.textContent = 'No se pudo verificar la sesión';
    logout.hidden = false;
    loginLink.hidden = false;
    message.textContent = 'Revisa tu conexión o vuelve a iniciar sesión.';
  }
}

initializeSession();
