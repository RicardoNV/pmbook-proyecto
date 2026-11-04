// Dependencias / Vite incluye Leaflet y sus estilos en la compilacion.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let map;
let marker;
let currentLocation = null;
let tilesFailed = false;
let currentPet = null;
let currentPhoto = null;

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
    if (currentLocation) map.setView([currentLocation.latitude, currentLocation.longitude], 16);
  });
  window.addEventListener('online', () => { tilesFailed = false; tiles.redraw(); updateNotice(); });
}

export function showLocation(location) {
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
