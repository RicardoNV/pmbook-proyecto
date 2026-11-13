import { createExample, readingStatus, STALE_AFTER_MS, toLocalInput, validateReading } from './data.js';
import { initializeMap, showLocation, setMapPet, resizeMap, showRoute } from './map.js';
import { loadPoints, savePoint, pointsInRange, resetPoints, recentMovements } from './tracking-store.js';
import { initializeNavigation } from './navigation.js';
import { initializePet } from './pet.js';
import { setMapFocus } from './map-focus.js';

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
let points = [];
let activeRange = null;
let previewPoint = null;

function renderTime(selector, reading) {
  const element = $(selector);
  element.textContent = reading ? dateFormatter.format(new Date(reading.recordedAt)) : 'Sin datos';
  if (reading) element.dateTime = reading.recordedAt;
  else element.removeAttribute('datetime');
}

function visibleLocation() {
  if (previewPoint) return previewPoint;
  return activeRange ? pointsInRange(points, ...activeRange).at(-1) || null : state.location;
}

function renderStatuses() {
  clearTimeout(staleTimer);
  const now = Date.now();
  for (const [selector, reading] of [['#location-status', visibleLocation()], ['#pulse-status', state.pulse]]) {
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
  const location = visibleLocation();
  $('#latitude').textContent = location ? location.latitude.toFixed(6) : '—';
  $('#longitude').textContent = location ? location.longitude.toFixed(6) : '—';
  $('#heart-rate').textContent = state.pulse ? String(state.pulse.bpm) : '—';
  renderTime('#location-time', location);
  renderTime('#pulse-time', state.pulse);
  renderStatuses();
  showLocation(location);
  $('#location-preview').hidden = !previewPoint;
  $('#tracking-summary').hidden = !activeRange || Boolean(previewPoint);
  if (activeRange && !previewPoint) displayTracking();
  setMapFocus(Boolean(activeRange || previewPoint));
}

// La navegacion del navegador tambien debe liberar el fondo al salir del panel.
window.addEventListener('hashchange', () => {
  if (location.hash === '#mascota') {
    activeRange = null;
    previewPoint = null;
    render();
  }
});

// ==================================================
// Historial / Lista de movimientos y consulta de un punto
// ==================================================
const historyDialog = $('#location-history-dialog');

function openHistory() {
  if (!currentPet) return;
  const list = $('#location-history-list');
  list.replaceChildren();
  const movements = recentMovements(points);
  if (!movements.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Aún no hay cambios de al menos 20 metros. Registra nuevas ubicaciones para consultarlas aquí.';
    list.append(empty);
  }
  for (const point of movements) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'location-history-item';
    const date = document.createElement('strong');
    date.textContent = dateFormatter.format(new Date(point.recordedAt));
    const location = document.createElement('span');
    location.textContent = `Latitud ${point.latitude.toFixed(6)} · Longitud ${point.longitude.toFixed(6)}`;
    const distance = document.createElement('small');
    distance.textContent = `${Math.round(point.distance)} m de desplazamiento · Ver en el mapa →`;
    button.append(date, location, distance);
    button.addEventListener('click', () => {
      previewPoint = point;
      historyDialog.close();
      $('#location-preview-label').textContent = `Ubicación histórica · ${date.textContent} · ${location.textContent}`;
      render();
      $('#center-map').click();
      $('#location-preview').scrollIntoView({ block: 'center' });
      $('#back-location-history').focus({ preventScroll: true });
    });
    list.append(button);
  }
  historyDialog.showModal();
}

$('#open-location-history').addEventListener('click', openHistory);
$('#back-location-history').addEventListener('click', openHistory);
$('#close-location-history').addEventListener('click', () => historyDialog.close());
historyDialog.addEventListener('close', () => {
  (previewPoint ? $('#back-location-history') : $('#open-location-history')).focus({ preventScroll: true });
});
$('#exit-location-preview').addEventListener('click', () => {
  previewPoint = null;
  render();
  $('#open-location-history').focus({ preventScroll: true });
});

// ==================================================
// Rastreo / Ventana de fechas y vista del recorrido
// ==================================================
const trackingDialog = $('#tracking-dialog');

function displayTracking() {
  const selected = pointsInRange(points, ...activeRange);
  showRoute(selected);
  $('#tracking-summary').hidden = false;
  $('#tracking-result').textContent = selected.length
    ? `${selected.length} ${selected.length === 1 ? 'punto registrado (se necesitan dos para trazar una línea)' : 'puntos registrados'} · Último punto: ${dateFormatter.format(new Date(selected.at(-1).recordedAt))}. Rango: ${dateFormatter.format(new Date(activeRange[0]))} — ${dateFormatter.format(new Date(activeRange[1]))}.`
    : 'No hay ubicaciones registradas en este intervalo. Elige otro rango o agrega un punto.';
}

function openTracking() {
  if (!currentPet) return;
  $('#tracking-error').textContent = '';
  $('#tracking-from').value = activeRange?.[0] || toLocalInput(points[0]?.recordedAt || new Date().toISOString());
  $('#tracking-to').value = activeRange?.[1] || toLocalInput(points.at(-1)?.recordedAt || new Date().toISOString());
  trackingDialog.showModal();
}

$('#open-tracking').addEventListener('click', openTracking);
$('#change-tracking').addEventListener('click', openTracking);
$('#close-tracking').addEventListener('click', () => trackingDialog.close());
trackingDialog.addEventListener('close', () => $('#open-tracking').focus());
$('#exit-tracking').addEventListener('click', () => {
  activeRange = null;
  $('#tracking-summary').hidden = true;
  render();
  $('#open-tracking').focus();
});

// Control temporal / Limpia solo el historial de la mascota seleccionada.
$('#reset-tracking').addEventListener('click', () => {
  if (!currentPet || !activeRange) return;
  try {
    points = resetPoints(currentPet);
    state.location = points[0] || null;
    $('#exit-tracking').click();
    $('#feedback').textContent = points.length
      ? 'Historial reiniciado. Se conservó únicamente el punto más antiguo de esta mascota.'
      : 'No había registros que eliminar. Rastreo cerrado.';
  } catch {
    $('#tracking-result').textContent = 'No se pudo reiniciar el historial. Revisa los permisos de almacenamiento del navegador e intenta de nuevo.';
  }
});
$('#tracking-add-point').addEventListener('click', () => {
  trackingDialog.close();
  $('#open-form').click();
  $('#input-heartRate').value = '';
});
$('#tracking-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const range = [$('#tracking-from').value, $('#tracking-to').value];
  try {
    pointsInRange(points, ...range);
    previewPoint = null;
    activeRange = range;
    render();
    trackingDialog.close();
  } catch {
    $('#tracking-error').textContent = 'La fecha de inicio debe ser anterior o igual a la fecha final.';
  }
});

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

    locationMessage.textContent = `Ubicación del equipo obtenida. Precisión estimada: ${Math.round(position.coords.accuracy)} m. Pulsa Guardar lectura para mostrarla en el mapa.`;
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
  $('#reading-save-error').textContent = '';
  resetLocationRequest();
  clearErrors();
  const now = new Date().toISOString();
  const values = {
    latitude: state.location?.latitude ?? '', longitude: state.location?.longitude ?? '',
    locationAt: toLocalInput(now),
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
  if (!currentPet) return;
  $('#reading-save-error').textContent = '';
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
  if (!data.location && !data.pulse) {
    $('#reading-save-error').textContent = 'Ingresa una ubicación o una lectura de pulso.';
    return;
  }
  if (data.location) {
    try { points = savePoint(currentPet, data.location); }
    catch {
      $('#reading-save-error').textContent = 'No se pudo guardar el punto. Revisa el espacio y los permisos de almacenamiento del navegador. Tus campos se conservan.';
      return;
    }
  }
  state = { location: points.at(-1) || state.location, pulse: data.pulse || state.pulse };
  render();
  dialog.close();
  $('#feedback').textContent = data.location ? 'Punto guardado en el historial de esta mascota en este navegador.' : 'Pulso actualizado en esta sesión.';
});

$('#reset-data').addEventListener('click', () => {
  state = { ...createExample(), location: points.at(-1) || null }; render();
  $('#feedback').textContent = 'Lecturas restablecidas con la hora actual.';
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
  const changed = currentPet?.id !== pet?.id || currentPet?.user_id !== pet?.user_id;
  let historyError = '';
  if (changed) {
    previewPoint = null;
    historyDialog.close();
    activeRange = null;
    $('#tracking-summary').hidden = true;
    trackingDialog.close();
    dialog.close();
    try { points = loadPoints(pet); }
    catch { points = []; historyError = 'No se pudo leer el historial local de esta mascota.'; }
  }
  if (!pet) {
    state = { location: null, pulse: null };
  } else if (changed) {
    state = { location: points.at(-1) || null, pulse: createExample().pulse };
  }

  currentPet = pet;
  $('#open-form').disabled = !pet;
  $('#reset-data').disabled = !pet;
  $('#open-tracking').disabled = !pet;
  $('#open-location-history').disabled = !pet;
  $('#feedback').textContent = historyError;
  setMapPet(pet);
  render();
});

initializeNavigation(resizeMap);
