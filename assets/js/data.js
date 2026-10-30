// Datos de demostración en memoria; no representan mediciones del dispositivo.
export const STALE_AFTER_MS = 5 * 60 * 1000;

export function createExample(now = Date.now()) {
  const recordedAt = new Date(now).toISOString();
  return {
    location: { latitude: 25.725, longitude: -100.315, recordedAt },
    pulse: { bpm: 84, recordedAt },
  };
}

export function readingStatus(reading, now = Date.now()) {
  if (!reading) return { key: 'empty', label: 'Sin datos' };
  return now - Date.parse(reading.recordedAt) >= STALE_AFTER_MS
    ? { key: 'stale', label: 'Desactualizada' }
    : { key: 'available', label: 'Disponible' };
}

// datetime-local usa la zona del navegador, no UTC.
export function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function validateReading(values, now = Date.now()) {
  const errors = {};
  const clean = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value).trim()]));
  const hasLocation = Boolean(clean.latitude || clean.longitude);
  const hasPulse = Boolean(clean.heartRate);
  function timestamp(field, active) {
    if (!active) return null;
    const time = Date.parse(clean[field]);
    if (!clean[field] || !Number.isFinite(time)) errors[field] = 'Indica una fecha y hora válida.';
    else if (time > now) errors[field] = 'La lectura no puede tener una fecha futura.';
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  }
  const latitude = Number(clean.latitude);
  const longitude = Number(clean.longitude);
  if (hasLocation) {
    if (!clean.latitude || !Number.isFinite(latitude) || Math.abs(latitude) > 90) errors.latitude = 'Ingresa una latitud entre −90 y 90.';
    if (!clean.longitude || !Number.isFinite(longitude) || Math.abs(longitude) > 180) errors.longitude = 'Ingresa una longitud entre −180 y 180.';
  }
  const bpm = Number(clean.heartRate);
  if (hasPulse && (!Number.isSafeInteger(bpm) || bpm <= 0)) errors.heartRate = 'Ingresa un número entero positivo de latidos por minuto.';
  const locationAt = timestamp('locationAt', hasLocation);
  const heartAt = timestamp('heartAt', hasPulse);
  return { errors, data: {
    location: hasLocation ? { latitude, longitude, recordedAt: locationAt } : null,
    pulse: hasPulse ? { bpm, recordedAt: heartAt } : null,
  } };
}
