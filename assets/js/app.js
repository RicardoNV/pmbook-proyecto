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

$('#open-form').addEventListener('click', () => {
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
