import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encodeJob, validateConfig } from './encode-job.js';

const config = JSON.parse(await readFile(new URL('../printer/config.json', import.meta.url), 'utf8'));

test('approved encoder rotates only photo pixels and retains 32-row whitespace and cut', () => {
  validateConfig(config);
  const rowBytes = 72;
  const photo = Buffer.alloc(576 * rowBytes);
  photo[0] = 0x80; // Top-left pixel.
  photo[photo.length - 1] = 0x02; // Near bottom-right.
  const job = encodeJob(photo, config);
  assert.equal(job.subarray(0, 5).toString('hex'), '1b401b6101');
  assert.equal(job.subarray(5, 13).toString('hex'), '1d76300048008002');
  const raster = job.subarray(13, -4);
  assert.equal(raster.length, 640 * rowBytes);
  assert.ok(raster.subarray(0, 32 * rowBytes).every(byte => byte === 0));
  assert.equal(raster[32 * rowBytes], 0x40);
  assert.equal(raster[(32 + 576) * rowBytes - 1], 0x01);
  assert.ok(raster.subarray((32 + 576) * rowBytes).every(byte => byte === 0));
  assert.equal(job.subarray(-4).toString('hex'), '1d564200');
  assert.equal(photo[0], 0x80);
});

test('malformed raster sizes and invalid layout configuration are rejected', () => {
  assert.throws(() => encodeJob(Buffer.alloc(5), config));
  assert.throws(() => validateConfig({ ...config, printableWidthDots: 575 }));
  assert.throws(() => validateConfig({ ...config, topMarginDots: -1 }));
});
