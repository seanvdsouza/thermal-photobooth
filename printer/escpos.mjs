export { dither } from '../shared/dither.js';

export function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

export function packRaster(black, width, height) {
  integer(width, 'width', 8, 832);
  integer(height, 'height', 1, 4096);
  if (width % 8 || black.length !== width * height) throw new Error('Invalid raster dimensions.');
  const data = Buffer.alloc(width / 8 * height);
  for (let i = 0; i < black.length; i++) {
    if (black[i] !== 0 && black[i] !== 1) throw new Error('Raster must contain only 0 or 1.');
    if (black[i]) data[i >> 3] |= 0x80 >> (i & 7);
  }
  return { width, height, data };
}

export function rasterCommands({ width, height, data }, bandHeight = 0) {
  const rowBytes = width / 8;
  if (!Number.isInteger(rowBytes) || data.length !== rowBytes * height) throw new Error('Invalid packed raster.');
  integer(bandHeight, 'bandHeight', 0, 4096);
  const commands = [];
  const rows = bandHeight || height;
  for (let y = 0; y < height; y += rows) {
    const count = Math.min(rows, height - y);
    const header = Buffer.from([0x1d, 0x76, 0x30, 0, rowBytes & 255, rowBytes >> 8, count & 255, count >> 8]);
    commands.push(header, data.subarray(y * rowBytes, (y + count) * rowBytes));
  }
  return Buffer.concat(commands);
}

export function finishCommands(feedDots, cut) {
  integer(feedDots, 'feedDots', 0, 2048);
  const cuts = {
    none: [],
    full: [0x1d, 0x56, 0],
    partial: [0x1d, 0x56, 1],
    'feed-full': [0x1d, 0x56, 65, 0],
    'feed-partial': [0x1d, 0x56, 66, 0],
  };
  if (!Object.hasOwn(cuts, cut)) throw new Error('Unknown cut mode.');
  const commands = [];
  for (let left = feedDots; left > 0; left -= 255) {
    commands.push(0x1b, 0x4a, Math.min(left, 255));
  }
  return Buffer.from([...commands, ...cuts[cut]]);
}

export const initialize = Buffer.from([0x1b, 0x40, 0x1b, 0x61, 1]);
