import test from 'node:test';
import assert from 'node:assert/strict';
import { portraTone, portraGrayscale } from './portra-monochrome.js';
import { ditherOption } from './dither-options.js';

test('film-inspired curve is monotonic, lifts shadows and compresses endpoints', () => {
  assert.equal(portraTone(0), 12);
  assert.equal(portraTone(255), 250);
  assert.ok(portraTone(32) > 32);
  assert.ok(portraTone(128) > 128);
  for (let value = 1; value <= 255; value++) assert.ok(portraTone(value) > portraTone(value - 1));
});

test('portrait monochrome mix favours red and preserves the original pixels', () => {
  const data = Uint8ClampedArray.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]);
  const original = data.slice();
  const image = { width: 3, height: 1, data };
  const gray = portraGrayscale(image);
  assert.ok(gray[0] > portraTone(255 * .299));
  assert.ok(gray[1] < portraTone(255 * .587));
  assert.deepEqual(data, original);
  assert.ok(portraGrayscale(image, 100, 100).every(value => value >= 0 && value <= 255));
  assert.throws(() => portraGrayscale({ ...image, width: 4 }));
});

test('film-inspired Atkinson output remains pure monochrome for printing', () => {
  const width = 32, height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([i % 256, i % 256, i % 256, 255], i * 4);
  const output = ditherOption(portraGrayscale({ width, height, data }), width, height, 'atkinson');
  assert.equal(output.length, width * height);
  assert.ok(output.every(bit => bit === 0 || bit === 1));
  assert.ok(output.some(bit => bit === 0) && output.some(bit => bit === 1));
});
