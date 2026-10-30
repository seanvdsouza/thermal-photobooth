import test from 'node:test';
import assert from 'node:assert/strict';
import { packRaster, rasterCommands, finishCommands, dither } from './escpos.mjs';
import { makePolaroid } from './patterns.mjs';

test('known black pixels pack most significant bit first, white remains zero', () => {
  assert.deepEqual([...packRaster(Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 1]), 8, 1).data], [0x81]);
  assert.deepEqual([...packRaster(new Uint8Array(8), 8, 1).data], [0]);
  assert.throws(() => packRaster(Uint8Array.from([2, 0, 0, 0, 0, 0, 0, 0]), 8, 1));
});

test('576 x 736 image has the specified little-endian header and white margins', () => {
  const raster = makePolaroid(576, 32, 128);
  assert.equal(raster.data.length, 52992);
  const commands = rasterCommands(raster);
  assert.equal(commands.subarray(0, 8).toString('hex'), '1d7630004800e002');
  assert.ok(raster.data.subarray(0, 32 * 72).every(byte => byte === 0));
  assert.ok(raster.data.subarray(608 * 72).every(byte => byte === 0));
  assert.ok(raster.data.subarray(32 * 72, 608 * 72).some(byte => byte !== 0));
});

test('bands preserve every row without inserted feeds or line breaks', () => {
  const raster = makePolaroid(576, 32, 128);
  const bytes = rasterCommands(raster, 128);
  let offset = 0;
  const rows = [];
  while (offset < bytes.length) {
    assert.equal(bytes.subarray(offset, offset + 6).toString('hex'), '1d7630004800');
    const height = bytes.readUInt16LE(offset + 6);
    assert.ok(height > 0 && height <= 128);
    rows.push(bytes.subarray(offset + 8, offset + 8 + height * 72));
    offset += 8 + height * 72;
  }
  assert.deepEqual(Buffer.concat(rows), raster.data);
});

test('feed and cut stay separate from raster whitespace', () => {
  assert.equal(finishCommands(0, 'none').length, 0);
  assert.equal(finishCommands(256, 'partial').toString('hex'), '1b4aff1b4a011d5601');
  assert.equal(finishCommands(0, 'feed-partial').toString('hex'), '1d564200');
  assert.throws(() => finishCommands(-1, 'none'));
  assert.throws(() => finishCommands(0, 'unknown'));
});

test('dithering preserves pure black/white and diffuses a midtone', () => {
  assert.deepEqual([...dither([0, 255, 0, 255], 2, 2)], [1, 0, 1, 0]);
  const output = dither(new Uint8Array(1024).fill(128), 32, 32);
  const black = output.reduce((sum, bit) => sum + bit, 0);
  assert.ok(black > 450 && black < 570);
});

test('180-degree photo rotation preserves white raster margins and reverses pixels', () => {
  const normal = makePolaroid(576, 32, 32);
  const rotated = makePolaroid(576, 32, 32, true);
  const pixel = (raster, x, y) => (raster.data[y * 72 + (x >> 3)] >> (7 - (x & 7))) & 1;
  assert.ok(rotated.data.subarray(0, 32 * 72).every(byte => byte === 0));
  assert.ok(rotated.data.subarray(608 * 72).every(byte => byte === 0));
  for (let y = 0; y < 576; y++) {
    for (let x = 0; x < 576; x++) {
      assert.equal(pixel(rotated, x, y + 32), pixel(normal, 575 - x, 575 - y + 32));
    }
  }
});
