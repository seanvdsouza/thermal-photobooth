import test from 'node:test';
import assert from 'node:assert/strict';
import { cropGeometry, drawCrop } from './imageCrop.js';

test('center crop preserves square composition in portrait and landscape', () => {
  const landscape = cropGeometry(1600, 900);
  assert.equal(landscape.size, 900);
  assert.equal(landscape.sx, 350);
  assert.equal(landscape.sy, 0);
  const portrait = cropGeometry(900, 1600);
  assert.equal(portrait.sx, 0);
  assert.equal(portrait.sy, 350);
});

test('pan remains bounded inside original at every supported zoom, including mirrored sources', () => {
  for (const [width, height] of [[1600, 900], [900, 1600], [576, 576]]) {
    for (const zoom of [1, 1.5, 3]) {
      for (const mirrored of [true, false]) {
        for (const sign of [-1, 1]) {
          const crop = cropGeometry(width, height, { zoom, x: sign * 100, y: -sign * 100 }, mirrored);
          assert.ok(crop.sx >= -1e-8 && crop.sy >= -1e-8);
          assert.ok(crop.sx + crop.size <= width + 1e-8);
          assert.ok(crop.sy + crop.size <= height + 1e-8);
        }
      }
    }
  }
});

test('mirrored drag uses the opposite source edge but the same square size', () => {
  const crop = { zoom: 2, x: 0.1, y: 0.1 };
  const normal = cropGeometry(1200, 800, crop);
  const mirror = cropGeometry(1200, 800, crop, true);
  assert.equal(normal.size, mirror.size);
  assert.equal(mirror.sx - normal.sx, 240);
  assert.equal(mirror.sy, normal.sy);
});

test('camera and editor crop drawing use the same mirror transform', () => {
  const calls = [];
  const context = Object.fromEntries(['save', 'translate', 'scale', 'drawImage', 'restore'].map(name => [name, (...args) => calls.push([name, ...args])]));
  const image = {};
  drawCrop(context, { image, width: 1600, height: 900, mirrored: true }, { zoom: 1 }, 576);
  assert.deepEqual(calls, [
    ['save'], ['translate', 576, 0], ['scale', -1, 1],
    ['drawImage', image, 350, 0, 900, 900, 0, 0, 576, 576], ['restore'],
  ]);
});
