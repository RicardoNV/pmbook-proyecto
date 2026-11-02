// ==================================================
// Acceso / Prototipo visual sin autenticacion ni BDD
// ==================================================

const views = [...document.querySelectorAll('[data-auth-view]')];
const forms = [...document.querySelectorAll('.auth-form')];
const titles = {
  login: 'Iniciar sesión',
  registro: 'Crear cuenta',
  recuperar: 'Recuperar contraseña',
};

// Navegacion / Permite usar Atras y Adelante del navegador.
function showView(moveFocus = false) {
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

// Validacion local / Nunca se envian, registran ni persisten credenciales.
for (const form of forms) {
  form.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    event.target.removeAttribute('aria-invalid');
    document.getElementById(`${event.target.id}-error`).textContent = '';
    form.querySelector('.auth-result').textContent = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
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

    const messages = {
      'login-form': 'Formulario validado. Esta vista previa no inicia una sesión real. Puedes conocer el panel desde Explorar demo.',
      'register-form': 'Formulario validado. No se creó ninguna cuenta: el registro estará disponible al conectar el servicio de autenticación.',
      'recovery-form': 'Correo validado. No se envió ningún mensaje: la recuperación estará disponible al conectar el servicio de autenticación.',
    };
    result.textContent = messages[form.id];
  });
}

showView();

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
