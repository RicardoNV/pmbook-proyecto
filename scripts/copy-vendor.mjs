import { cp, mkdir } from 'node:fs/promises';

// Distribuimos Leaflet localmente: no dependemos de un CDN para ejecutar el mapa.
const destination = new URL('../assets/vendor/leaflet/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const file of ['leaflet.js', 'leaflet.css', 'images']) {
  await cp(new URL(`../node_modules/leaflet/dist/${file}`, import.meta.url), new URL(file, destination), { recursive: true });
}
await cp(new URL('../node_modules/leaflet/LICENSE', import.meta.url), new URL('LICENSE', destination));
