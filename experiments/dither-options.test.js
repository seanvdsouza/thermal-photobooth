import test from 'node:test';
import assert from 'node:assert/strict';
import { ditherOption } from './dither-options.js';

for (const method of ['serpentine', 'atkinson', 'stucki']) {
  test(`${method}: preserves black and white, leaves original untouched, handles narrow images`, () => {
    for (const [width, height] of [[1, 8], [8, 1], [16, 16]]) {
      for (const value of [0, 255]) {
        const gray = new Uint8Array(width * height).fill(value);
        const output = ditherOption(gray, width, height, method);
        assert.equal(output.length, gray.length);
        assert.ok(output.every(bit => bit === (value === 0 ? 1 : 0)));
        assert.ok(gray.every(pixel => pixel === value));
      }
    }
  });
  test(`${method}: midtone output is binary and retains approximately half black dots`, () => {
    const output = ditherOption(new Uint8Array(64 * 64).fill(128), 64, 64, method);
    assert.ok(output.every(bit => bit === 0 || bit === 1));
    const density = output.reduce((sum, bit) => sum + bit, 0) / output.length;
    assert.ok(density > .4 && density < .6);
  });
}

test('comparison methods reject invalid lengths and unknown algorithms', () => {
  assert.throws(() => ditherOption([], 3, 2, 'stucki'));
  assert.throws(() => ditherOption([128], 1, 1, 'unknown'));
});
