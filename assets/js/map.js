// Dependencias / Vite incluye Leaflet y sus estilos en la compilacion.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map;
let marker;
let currentLocation = null;
let tilesFailed = false;
let currentPet = null;
let currentPhoto = null;
let routeLayer;
let routeEnd = null;

// Marcador / Fotografia de la mascota seleccionada.
function photoIcon() {
  const image = document.createElement('img');
  image.src = currentPhoto || new URL('../favicon.svg', import.meta.url).href;
  image.alt = currentPet?.name || 'Mascota';
  return L.divIcon({ className: 'collar-marker', html: image, iconSize: [48, 48], iconAnchor: [24, 24] });
}

export function setMapPhoto(photo) {
  currentPhoto = photo;
  if (marker) marker.setIcon(photoIcon());
}
const notice = document.querySelector('#map-notice');
const centerButton = document.querySelector('#center-map');

function updateNotice() {
  const message = !map ? 'No se pudo cargar el mapa. Las coordenadas siguen disponibles debajo.'
    : !currentPet ? 'No hay una mascota registrada. Restaura su perfil para consultar el mapa.'
    : !currentLocation ? 'Sin ubicación registrada. Captura coordenadas para colocar a tu mascota en el mapa.'
    : tilesFailed ? 'No se pudo cargar parte del mapa. Revisa tu conexión; las coordenadas siguen disponibles.' : '';
  notice.textContent = message;
  notice.hidden = !message;
}

export function initializeMap() {
  map = L.map('map', { scrollWheelZoom: false }).setView([25.725, -100.315], 15);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  tiles.on('tileerror', () => { tilesFailed = true; updateNotice(); });
  tiles.on('loading', () => { tilesFailed = false; updateNotice(); });
  tiles.addTo(map);
  centerButton.addEventListener('click', () => {
    const target = routeEnd || currentLocation;
    if (target) map.setView([target.latitude, target.longitude], 16);
  });
  window.addEventListener('online', () => { tilesFailed = false; tiles.redraw(); updateNotice(); });
}

export function showLocation(location) {
  clearRoute();
  currentLocation = location;
  centerButton.disabled = !location || !map;
  if (map) {
    if (marker) { marker.remove(); marker = null; }
    if (location) {
      const position = [location.latitude, location.longitude];
      // El nombre editado se inserta como texto, nunca como HTML.
      const popup = document.createElement('div');
      popup.textContent = `${currentPet?.name ?? 'Mascota'} · Collar ${(currentPet?.collar ?? '').replace(/^Demo /, '')} · Ubicación registrada manualmente`;

      marker = L.marker(position, {
        icon: photoIcon(),
        title: `${currentPet?.name ?? 'Mascota'} · ubicación manual`,
        alt: 'Ubicación registrada de la mascota',
      }).addTo(map).bindPopup(popup);
      map.setView(position, map.getZoom());
    }
  }
  updateNotice();
}

// ==================================================
// Rastreo / Puntos cronologicos y ultimo registro del rango
// ==================================================
export function clearRoute() {
  if (routeLayer) routeLayer.remove();
  routeLayer = null;
  routeEnd = null;
}

export function showRoute(points) {
  clearRoute();
  if (!map || !points.length) return;
  routeLayer = L.featureGroup().addTo(map);
  const coordinates = points.map(point => [point.latitude, point.longitude]);
  if (points.length > 1) L.polyline(coordinates, { color: '#dc3545', weight: 4, opacity: .9 }).addTo(routeLayer);
  const formatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  points.forEach((point, index) => {
    const text = document.createElement('div');
    text.textContent = `${index + 1}. ${formatter.format(new Date(point.recordedAt))} · ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}${index === points.length - 1 ? ' · Último punto del rango' : ''}`;
    L.circleMarker(coordinates[index], { radius: 6, color: '#fff', weight: 2, fillColor: '#dc3545', fillOpacity: 1 })
      .addTo(routeLayer).bindPopup(text);
  });
  routeEnd = points.at(-1);
  if (marker) marker.remove();
  marker = L.marker(coordinates.at(-1), { icon: photoIcon(), title: 'Último punto del rango' }).addTo(map);
  const label = document.createElement('div');
  label.textContent = `${currentPet?.name || 'Mascota'} · Último punto del rango · ${formatter.format(new Date(routeEnd.recordedAt))}`;
  marker.bindPopup(label);
  centerButton.disabled = false;
  map.fitBounds(routeLayer.getBounds(), { padding: [40, 50], maxZoom: 17 });
}

// Identificacion del perfil / Compartida con la ficha de la mascota.
export function setMapPet(pet) {
  currentPet = pet;
  document.querySelector('#map').setAttribute('aria-label', pet
    ? `Mapa de la ubicación registrada de ${pet.name}`
    : 'Mapa sin mascota registrada');
}

// Recalcula el mapa al volver del perfil o contraer la barra lateral.
export function resizeMap() {
  if (map && !document.querySelector('#dashboard').hidden) {
    map.invalidateSize({ pan: false });
  }
}
