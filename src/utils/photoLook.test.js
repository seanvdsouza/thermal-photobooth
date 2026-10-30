import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dither } from '../../shared/dither.js';
import { applyThermalEffect, LOOK_OPTIONS, DEFAULT_LOOK } from '../../shared/photo-look.js';

test('standard Floyd–Steinberg retains its pre-tuning pixel result', () => {
  const gray = Float32Array.from({ length: 1280 }, (_, i) => (i * 37 + i % 11 * 13) % 256);
  assert.equal(createHash('sha256').update(dither(gray, 40, 32)).digest('hex'), '73d2b291e04b0ca37edc4934085ce2803b4468898b8942c5c544e8a6487ca23f');
});

test('zero diffusion uses only the selected threshold', () => {
  const gray = [80, 100, 120, 140, 160, 180, 200, 220];
  assert.deepEqual([...dither(gray, 4, 2, { strength: 0, threshold: 128 })], [1, 1, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual([...dither(gray, 4, 2, { strength: 0, threshold: 160, serpentine: true })], [1, 1, 1, 1, 0, 0, 0, 0]);
});

test('diffusion strength and alternating direction change texture without mutating the original', () => {
  const gray = new Uint8Array(32 * 32).fill(100);
  const standard = dither(gray, 32, 32);
  assert.notDeepEqual(dither(gray, 32, 32, { strength: .75 }), standard);
  assert.notDeepEqual(dither(gray, 32, 32, { serpentine: true }), standard);
  assert.ok(gray.every(value => value === 100));
  assert.throws(() => dither(gray, 32, 32, { strength: NaN }));
  assert.throws(() => dither(gray, 32, 32, { strength: 1.1 }));
  assert.throws(() => dither(gray, 32, 32, { threshold: 0 }));
});

test('every selectable look produces the same pixels for live/captured copies of one frame', () => {
  const width = 32, height = 32;
  const input = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) input.set([i % 256, (i * 3) % 256, (i * 7) % 256, 255], i * 4);
  for (const [method] of LOOK_OPTIONS) {
    const look = { ...DEFAULT_LOOK, method, strength: .75, threshold: 140, serpentine: true };
    const live = { width, height, data: input.slice() };
    const captured = { width, height, data: input.slice() };
    const liveBits = applyThermalEffect(live, 0, 0, look);
    const capturedBits = applyThermalEffect(captured, 0, 0, look);
    assert.deepEqual(liveBits, capturedBits);
    assert.deepEqual(live.data, captured.data);
    assert.ok(liveBits.every(bit => bit === 0 || bit === 1));
  }
});
