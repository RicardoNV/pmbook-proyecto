// ==================================================
// Acceso / Registro con Supabase y vistas en desarrollo
// ==================================================

const views = [...document.querySelectorAll('[data-auth-view]')];
const forms = [...document.querySelectorAll('.auth-form')];
let viewVersion = 0;
let registrationPending = false;
let loginPending = false;
const titles = {
  login: 'Iniciar sesión',
  registro: 'Crear cuenta',
  recuperar: 'Recuperar contraseña',
};

// Navegacion / Permite usar Atras y Adelante del navegador.
function showView(moveFocus = false) {
  viewVersion += 1;
  const requested = location.hash.slice(1);
  const current = Object.hasOwn(titles, requested) ? requested : 'login';

  for (const view of views) {
    view.hidden = view.dataset.authView !== current;
  }

  // Las credenciales no se almacenan ni se conservan entre apartados.
  for (const form of forms) {
    form.reset();
    form.querySelector('.auth-result').textContent = '';

    for (const input of form.querySelectorAll('input')) {
      input.removeAttribute('aria-invalid');
      document.getElementById(`${input.id}-error`).textContent = '';
    }
  }

  for (const button of document.querySelectorAll('[data-password-toggle]')) {
    document.getElementById(button.dataset.passwordToggle).type = 'password';
    button.textContent = 'Mostrar';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', button.dataset.passwordToggle.endsWith('confirm')
      ? 'Mostrar confirmación de contraseña' : 'Mostrar contraseña');
  }

  document.title = `Smart Collar · ${titles[current]}`;

  if (moveFocus) {
    document.querySelector(`[data-auth-view="${current}"] h2`).focus({ preventScroll: true });
  }
}

window.addEventListener('hashchange', () => showView(true));

// Contraseñas / Botones accesibles de mostrar y ocultar.
for (const button of document.querySelectorAll('[data-password-toggle]')) {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const visible = input.type === 'password';
    const label = input.name === 'confirm' ? 'confirmación de contraseña' : 'contraseña';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Ocultar' : 'Mostrar';
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', `${visible ? 'Ocultar' : 'Mostrar'} ${label}`);
  });
}

// Validacion local / Registro e inicio de sesion usan Supabase.
for (const form of forms) {
  form.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    event.target.removeAttribute('aria-invalid');
    document.getElementById(`${event.target.id}-error`).textContent = '';
    form.querySelector('.auth-result').textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.id === 'register-form' && registrationPending) return;
    if (form.id === 'login-form' && loginPending) return;
    let firstInvalid = null;

    for (const input of form.querySelectorAll('input')) {
      let error = '';
      const isPassword = ['password', 'confirm'].includes(input.name);

      if (!isPassword) input.value = input.value.trim();

      if (!input.value) {
        error = 'Completa este campo para continuar.';
      } else if (input.type === 'email' && input.validity.typeMismatch) {
        error = 'Escribe un correo válido, por ejemplo: tu@correo.com.';
      } else if (form.id === 'register-form' && input.name === 'password' && input.value.length < 8) {
        error = 'Usa al menos 8 caracteres.';
      } else if (input.name === 'confirm' && input.value !== form.elements.namedItem('password').value) {
        error = 'Las contraseñas deben coincidir.';
      }

      document.getElementById(`${input.id}-error`).textContent = error;
      input.setAttribute('aria-invalid', String(Boolean(error)));
      if (error && !firstInvalid) firstInvalid = input;
    }

    const result = form.querySelector('.auth-result');
    result.textContent = '';

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (form.id === 'register-form') {
      await registerAccount(form);
      return;
    }

    if (form.id === 'login-form') {
      await loginAccount(form);
      return;
    }

    const messages = {
      'recovery-form': 'Correo validado. No se envió ningún mensaje: la recuperación estará disponible al conectar el servicio de autenticación.',
    };
    result.textContent = messages[form.id];
  });
}

showView();

// ==================================================
// Inicio de sesion / Supabase conserva y renueva tokens
// ==================================================

async function loginAccount(form) {
  const credentials = {
    email: form.elements.namedItem('email').value,
    password: form.elements.namedItem('password').value,
  };
  const version = viewVersion;
  const button = form.querySelector('[type="submit"]');
  const content = button.innerHTML;
  const fields = [...form.querySelectorAll('input')];
  loginPending = true;
  button.disabled = true;
  button.textContent = 'Iniciando sesión…';
  form.setAttribute('aria-busy', 'true');
  fields.forEach(input => { input.readOnly = true; });

  try {
    const { supabase } = await import('./supabase.js');
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    if (!data.session) throw new Error('missing_session');
    if (version === viewVersion) {
      form.reset();
      window.location.assign('./index.html#dashboard');
    }
  } catch (error) {
    const messages = {
      invalid_credentials: 'El correo o la contraseña no son correctos.',
      email_not_confirmed: 'Confirma tu correo antes de iniciar sesión. Revisa también la carpeta de spam.',
      over_request_rate_limit: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.',
      user_banned: 'Esta cuenta no puede iniciar sesión. Contacta al administrador.',
    };
    if (version === viewVersion) {
      form.querySelector('.auth-result').textContent = messages[error.code]
        || 'No se pudo iniciar sesión. Revisa tu conexión y vuelve a intentar.';
    }
  } finally {
    loginPending = false;
    button.disabled = false;
    button.innerHTML = content;
    form.removeAttribute('aria-busy');
    fields.forEach(input => { input.readOnly = false; });
  }
}

// ==================================================
// Registro / Envio unico y mensajes sin exponer cuentas
// ==================================================

function registrationError(error) {
  const messages = {
    weak_password: 'La contraseña no cumple los requisitos del servicio. Usa una más larga con mayúsculas, minúsculas, números y símbolos.',
    email_address_invalid: 'Revisa que el correo electrónico sea válido.',
    email_address_not_authorized: 'El servicio de correo de pruebas no permite enviar a esta dirección. Falta configurar el envío de correos del proyecto.',
    over_email_send_rate_limit: 'Se alcanzó el límite de correos. Espera unos minutos antes de volver a intentar.',
    over_request_rate_limit: 'Hay demasiados intentos. Espera unos minutos y vuelve a intentar.',
    signup_disabled: 'El registro está deshabilitado temporalmente.',
    user_already_exists: 'No se pudo completar el registro. Si ya tienes cuenta, no necesitas registrarte de nuevo.',
  };

  return messages[error.code] || 'No se pudo completar el registro. Revisa tu conexión e inténtalo de nuevo más tarde.';
}

async function registerAccount(form) {
  const result = form.querySelector('.auth-result');
  const button = form.querySelector('[type="submit"]');
  const buttonContent = button.innerHTML;
  const version = viewVersion;
  const fields = [...form.querySelectorAll('input')];
  const registration = {
    email: form.elements.namedItem('email').value,
    password: form.elements.namedItem('password').value,
    options: {
      data: { full_name: form.elements.namedItem('name').value },
      emailRedirectTo: new URL('./login.html', window.location.href).href,
    },
  };
  registrationPending = true;
  button.disabled = true;
  button.textContent = 'Creando cuenta…';
  form.setAttribute('aria-busy', 'true');
  fields.forEach(input => { input.readOnly = true; });

  try {
    // Carga diferida / El SDK se comparte con inicio de sesion y confirmacion.
    const { supabase } = await import('./supabase.js');
    const { data, error } = await supabase.auth.signUp(registration);

    if (error) throw error;
    // Navegacion / Una respuesta tardia no altera otro formulario.
    if (version !== viewVersion) return;

    form.reset();
    form.querySelectorAll('[data-password-toggle]').forEach(toggle => {
      document.getElementById(toggle.dataset.passwordToggle).type = 'password';
      toggle.textContent = 'Mostrar';
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('aria-label', toggle.dataset.passwordToggle.endsWith('confirm')
        ? 'Mostrar confirmación de contraseña' : 'Mostrar contraseña');
    });
    result.textContent = data.session
      ? 'Registro aceptado. Ya puedes acceder al panel desde el inicio de sesión.'
      : 'Solicitud recibida. Si el correo puede registrarse, recibirás un enlace para confirmar tu cuenta. Revisa también la carpeta de spam. Si ya tienes cuenta, no necesitas registrarte de nuevo.';
  } catch (error) {
    if (version === viewVersion) result.textContent = registrationError(error);
  } finally {
    registrationPending = false;
    button.disabled = false;
    button.innerHTML = buttonContent;
    form.removeAttribute('aria-busy');
    fields.forEach(input => { input.readOnly = false; });
  }
}

// Confirmacion / El SDK procesa el enlace antes de limpiar la direccion.
async function handleConfirmation() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has('access_token') && !params.has('error')) return;
  const version = viewVersion;
  let message;

  try {
    if (params.has('error')) throw new Error('confirmation');
    const { supabase } = await import('./supabase.js');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('confirmation');
    const verified = await supabase.auth.getUser();
    if (verified.error || !verified.data.user?.email_confirmed_at) throw new Error('confirmation');
    message = 'Correo confirmado. Tu cuenta está lista; ya puedes iniciar sesión.';
  } catch {
    message = 'No se pudo verificar la confirmación. El enlace puede haber vencido o haberse utilizado. Revisa tu correo y utiliza el enlace más reciente.';
  }

  if (version !== viewVersion) return;
  history.replaceState(null, '', `${location.pathname}${location.search}#login`);
  showView();
  document.querySelector('#login-form .auth-result').textContent = message;
}

handleConfirmation();

// ==================================================
// Fotografias / Rotacion pausada al ocultar la pestaña
// ==================================================

const slides = [...document.querySelectorAll('.auth-slide')];
const photoCredit = document.querySelector('#auth-photo-credit');
const slideshowButton = document.querySelector('#auth-slideshow-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const PHOTO_INTERVAL_MS = 6000;
let photoTimer;
let photoIndex = 0;
let photosPaused = false;

function nextPhoto() {
  // Solo mostramos imagenes ya cargadas; un fallo no deja un cuadro vacio.
  for (let offset = 1; offset < slides.length; offset += 1) {
    const nextIndex = (photoIndex + offset) % slides.length;
    const next = slides[nextIndex];
    if (!next.complete || !next.naturalWidth) continue;

    slides[photoIndex].classList.remove('is-active');
    slides[photoIndex].setAttribute('aria-hidden', 'true');
    next.classList.add('is-active');
    next.removeAttribute('aria-hidden');
    photoCredit.textContent = `Foto: ${next.dataset.credit}`;
    photoCredit.href = next.dataset.source;
    photoIndex = nextIndex;
    break;
  }
}

function updateSlideshow() {
  clearInterval(photoTimer);
  slideshowButton.hidden = reducedMotion.matches;
  slideshowButton.textContent = photosPaused ? 'Reanudar fotos' : 'Pausar fotos';
  slideshowButton.setAttribute('aria-pressed', String(photosPaused));

  if (!document.hidden && !reducedMotion.matches && !photosPaused) {
    photoTimer = setInterval(nextPhoto, PHOTO_INTERVAL_MS);
  }
}

slideshowButton.addEventListener('click', () => {
  photosPaused = !photosPaused;
  updateSlideshow();
});
document.addEventListener('visibilitychange', updateSlideshow);
reducedMotion.addEventListener('change', updateSlideshow);
updateSlideshow();
