import { createExample, readingStatus, STALE_AFTER_MS, toLocalInput, validateReading } from './data.js';
import { initializeMap, showLocation, setMapPet, resizeMap } from './map.js';
import { initializeNavigation } from './navigation.js';
import { initializePet } from './pet.js';

// ==================================================
// Elementos y estado / Panel de monitoreo
// ==================================================

const $ = (selector) => document.querySelector(selector);
const dialog = $('#reading-dialog');
const form = $('#reading-form');
const fields = ['latitude', 'longitude', 'locationAt', 'heartRate', 'heartAt'];
const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let state = createExample();
let staleTimer;
let currentPet = null;

function renderTime(selector, reading) {
  const element = $(selector);
  element.textContent = reading ? dateFormatter.format(new Date(reading.recordedAt)) : 'Sin datos';
  if (reading) element.dateTime = reading.recordedAt;
  else element.removeAttribute('datetime');
}

function renderStatuses() {
  clearTimeout(staleTimer);
  const now = Date.now();
  for (const [selector, reading] of [['#location-status', state.location], ['#pulse-status', state.pulse]]) {
    const status = readingStatus(reading, now);
    $(selector).textContent = status.label;
    $(selector).dataset.state = status.key;
  }
  // Un único temporizador al próximo vencimiento; no consultamos sensores ni hacemos polling.
  const deadlines = [state.location, state.pulse].filter(Boolean)
    .map((reading) => Date.parse(reading.recordedAt) + STALE_AFTER_MS - now).filter((delay) => delay > 0);
  if (deadlines.length && !document.hidden) staleTimer = setTimeout(renderStatuses, Math.min(...deadlines) + 10);
}

function render() {
  $('#latitude').textContent = state.location ? state.location.latitude.toFixed(6) : '—';
  $('#longitude').textContent = state.location ? state.location.longitude.toFixed(6) : '—';
  $('#heart-rate').textContent = state.pulse ? String(state.pulse.bpm) : '—';
  renderTime('#location-time', state.location);
  renderTime('#pulse-time', state.pulse);
  renderStatuses();
  showLocation(state.location);
}

function clearErrors() {
  for (const field of fields) {
    $(`#error-${field}`).textContent = '';
    $(`#input-${field}`).removeAttribute('aria-invalid');
  }
}

// ==================================================
// Ubicacion del equipo / Consulta unica bajo solicitud
// ==================================================

const locationButton = $('#use-my-location');
const locationMessage = $('#geolocation-status');
let locationRequest = 0;

function resetLocationRequest() {
  // getCurrentPosition no permite cancelar: ignoramos respuestas anteriores.
  locationRequest += 1;
  locationButton.disabled = false;
  locationButton.textContent = 'Usar mi ubicación';
  locationMessage.textContent = '';
}

locationButton.addEventListener('click', () => {
  if (!window.isSecureContext || !navigator.geolocation) {
    locationMessage.textContent = 'Ubicación no disponible. Usa HTTPS o localhost, o captura las coordenadas manualmente.';
    return;
  }

  const request = ++locationRequest;
  locationButton.disabled = true;
  locationButton.textContent = 'Obteniendo ubicación…';
  locationMessage.textContent = 'Autoriza la ubicación en el navegador. Puedes cancelar cerrando el formulario.';

  navigator.geolocation.getCurrentPosition((position) => {
    if (request !== locationRequest || !dialog.open) return;

    resetLocationRequest();
    $('#input-latitude').value = position.coords.latitude.toFixed(6);
    $('#input-longitude').value = position.coords.longitude.toFixed(6);
    $('#input-locationAt').value = toLocalInput(new Date(position.timestamp).toISOString());

    for (const field of ['latitude', 'longitude', 'locationAt']) {
      $(`#error-${field}`).textContent = '';
      $(`#input-${field}`).removeAttribute('aria-invalid');
    }

    locationMessage.textContent = `Ubicación del equipo obtenida. Precisión estimada: ${Math.round(position.coords.accuracy)} m. Pulsa Guardar lectura para usarla como prueba en el mapa.`;
  }, (error) => {
    if (request !== locationRequest || !dialog.open) return;

    resetLocationRequest();
    const messages = {
      1: 'Permiso denegado. Puedes habilitar la ubicación en los permisos del sitio o ingresar las coordenadas manualmente.',
      2: 'No se pudo determinar tu ubicación. Intenta de nuevo o ingresa las coordenadas manualmente.',
      3: 'La búsqueda tardó demasiado. Intenta de nuevo o ingresa las coordenadas manualmente.',
    };
    locationMessage.textContent = messages[error.code] ?? 'No se pudo obtener la ubicación. Puedes capturarla manualmente.';
  }, {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 0,
  });
});

// Cerrar, vaciar o editar impide que una respuesta tardia cambie los campos.
dialog.addEventListener('close', resetLocationRequest);
$('#clear-fields').addEventListener('click', resetLocationRequest);
form.addEventListener('input', () => {
  if (locationButton.disabled) resetLocationRequest();
});

// ==================================================
// Captura manual / Apertura del formulario
// ==================================================

$('#open-form').addEventListener('click', () => {
  resetLocationRequest();
  clearErrors();
  const now = new Date().toISOString();
  const values = {
    latitude: state.location?.latitude ?? '', longitude: state.location?.longitude ?? '',
    locationAt: toLocalInput(state.location?.recordedAt ?? now),
    heartRate: state.pulse?.bpm ?? '', heartAt: toLocalInput(state.pulse?.recordedAt ?? now),
  };
  for (const field of fields) $(`#input-${field}`).value = values[field];
  dialog.showModal();
  $('#input-latitude').focus();
});

for (const selector of ['#close-form', '#cancel-form']) $(selector).addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => $('#open-form').focus());
$('#clear-fields').addEventListener('click', () => {
  form.reset(); clearErrors(); $('#input-latitude').focus();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearErrors();
  const values = Object.fromEntries(new FormData(form));
  const { data, errors } = validateReading(values);
  // Algunos navegadores exponen un número mal escrito como cadena vacía.
  for (const field of fields) {
    if ($(`#input-${field}`).validity.badInput) errors[field] = 'Introduce un valor válido.';
  }
  if (Object.keys(errors).length) {
    for (const [field, message] of Object.entries(errors)) {
      $(`#error-${field}`).textContent = message;
      $(`#input-${field}`).setAttribute('aria-invalid', 'true');
    }
    $(`#input-${Object.keys(errors)[0]}`).focus();
    return;
  }
  state = data;
  render();
  dialog.close();
  $('#feedback').textContent = 'Lectura manual guardada en esta sesión.';
});

$('#reset-data').addEventListener('click', () => {
  state = createExample(); render();
  $('#feedback').textContent = 'Datos de ejemplo restablecidos con la hora actual.';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(staleTimer);
  else renderStatuses();
});

// ==================================================
// Inicio / Sincronizacion del perfil y el dashboard
// ==================================================

initializeMap();

initializePet((pet) => {
  if (!pet) {
    state = { location: null, pulse: null };
  } else if (!currentPet) {
    state = createExample();
  }

  currentPet = pet;
  $('#open-form').disabled = !pet;
  $('#reset-data').disabled = !pet;
  $('#feedback').textContent = '';
  setMapPet(pet);
  render();
});

initializeNavigation(resizeMap);
