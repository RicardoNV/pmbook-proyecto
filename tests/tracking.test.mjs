import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPoints, savePoint, pointsInRange, removePoints } from '../assets/js/tracking-store.js';

test('historial independiente, persistente y cronologico; rango inclusivo y eliminacion', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const pet = { id: 'pet', user_id: 'owner' };
  const point = { latitude: 25, longitude: -100, recordedAt: '2026-01-01T10:20:55Z' };
  savePoint(pet, point, storage);
  savePoint(pet, { ...point, recordedAt: '2026-01-01T10:10:00Z' }, storage);
  const points = loadPoints(pet, storage);
  assert.equal(points[0].recordedAt, '2026-01-01T10:10:00Z');
  assert.equal(loadPoints({ ...pet, user_id: 'other' }, storage).length, 0);
  assert.equal(loadPoints({ ...pet, id: 'other' }, storage).length, 0);
  assert.equal(pointsInRange(points, '2026-01-01T10:10:00Z', '2026-01-01T10:20:00Z').length, 2);
  assert.equal(pointsInRange(points, '2025-01-01T10:10:00Z', '2025-01-01T10:20:00Z').length, 0);
  assert.throws(() => pointsInRange(points, '2026-01-02', '2026-01-01'));
  removePoints(pet, storage);
  assert.equal(loadPoints(pet, storage).length, 0);
});

test('reinicio conserva solo el punto mas antiguo sin afectar otra mascota', async () => {
  const { resetPoints } = await import('../assets/js/tracking-store.js');
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const pet = { id: 'pet', user_id: 'owner' };
  const other = { ...pet, id: 'other' };
  const point = { latitude: 25, longitude: -100, recordedAt: '2026-01-02T10:00:00Z' };
  savePoint(pet, point, storage);
  savePoint(pet, { ...point, recordedAt: '2026-01-01T10:00:00Z' }, storage);
  savePoint(other, point, storage);
  assert.equal(resetPoints(pet, storage)[0].recordedAt, '2026-01-01T10:00:00Z');
  assert.equal(loadPoints(pet, storage).length, 1);
  assert.equal(loadPoints(other, storage).length, 1);
  assert.equal(resetPoints({ ...pet, id: 'empty' }, storage).length, 0);
});

test('movimientos: distancia, acumulacion, limite de diez y orden reciente', async () => {
  const { recentMovements, distanceMeters } = await import('../assets/js/tracking-store.js');
  const point = { latitude: 0, longitude: 0, recordedAt: '2026-01-01T00:00:00Z' };
  assert.equal(distanceMeters(point, point), 0);
  assert.ok(Math.abs(distanceMeters(point, { ...point, latitude: 1 }) - 111195) < 1);
  assert.deepEqual(recentMovements([point]), []);
  const nearby = [0, .0001, .0002].map((latitude, i) => ({ ...point, latitude, recordedAt: new Date(Date.parse(point.recordedAt) + i * 60000).toISOString() }));
  assert.equal(recentMovements(nearby).length, 1);
  const many = Array.from({ length: 15 }, (_, i) => ({ ...point, latitude: i * .001, recordedAt: new Date(Date.parse(point.recordedAt) + i * 60000).toISOString() }));
  const result = recentMovements(many.reverse());
  assert.equal(result.length, 10);
  assert.equal(result[0].latitude, .014);
  assert.equal(result.at(-1).latitude, .005);
});
