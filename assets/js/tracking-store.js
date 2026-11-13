// ==================================================
// Historial manual / Persistencia local por cuenta y mascota
// ==================================================

const keyFor = (pet) => `smart-collar:routes:${pet.user_id}:${pet.id}`;

// Cambios de ubicacion / Distancia geodesica entre puntos, en metros.
export const SIGNIFICANT_DISTANCE = 20;

export function distanceMeters(a, b) {
  const radians = value => value * Math.PI / 180;
  const latitude = radians(b.latitude - a.latitude);
  const longitude = radians(b.longitude - a.longitude);
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a.latitude))
    * Math.cos(radians(b.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function recentMovements(points) {
  const ordered = [...points].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  let reference = ordered[0];
  const movements = [];
  for (const point of ordered.slice(1)) {
    const distance = distanceMeters(reference, point);
    if (distance >= SIGNIFICANT_DISTANCE) {
      movements.push({ ...point, distance });
      reference = point;
    }
  }
  return movements.slice(-10).reverse();
}

export function loadPoints(pet, storage = localStorage) {
  if (!pet?.user_id) return [];
  const points = JSON.parse(storage.getItem(keyFor(pet)) || '[]');
  if (!Array.isArray(points) || points.some(point => !Number.isFinite(point.latitude)
    || Math.abs(point.latitude) > 90 || !Number.isFinite(point.longitude)
    || Math.abs(point.longitude) > 180 || !Number.isFinite(Date.parse(point.recordedAt)))) {
    throw new Error('Historial inválido');
  }
  return points.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

export function savePoint(pet, point, storage = localStorage) {
  if (!pet?.user_id) throw new Error('Selecciona una mascota');
  const points = loadPoints(pet, storage);
  points.push({ ...point, id: crypto.randomUUID() });
  points.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  storage.setItem(keyFor(pet), JSON.stringify(points));
  return points;
}

export function removePoints(pet, storage = localStorage) {
  storage.removeItem(keyFor(pet));
}

// Reinicio temporal / Conserva el primer punto cronologico del historial completo.
export function resetPoints(pet, storage = localStorage) {
  if (!pet?.user_id) throw new Error('Selecciona una mascota');
  const points = loadPoints(pet, storage).slice(0, 1);
  storage.setItem(keyFor(pet), JSON.stringify(points));
  return points;
}

export function pointsInRange(points, start, end) {
  const from = Date.parse(start);
  // El selector tiene precision de minutos: incluye todo el ultimo minuto.
  const to = Date.parse(end) + 59999;
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error('Rango inválido');
  return points.filter(point => Date.parse(point.recordedAt) >= from && Date.parse(point.recordedAt) <= to)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}
