import { integer, initialize, rasterCommands, finishCommands } from '../printer/escpos.mjs';

const reverseByte = Uint8Array.from({ length: 256 }, (_, value) => {
  let reversed = 0;
  for (let bit = 0; bit < 8; bit++) reversed = (reversed << 1) | ((value >> bit) & 1);
  return reversed;
});

export function validateConfig(config) {
  integer(config.printableWidthDots, 'printableWidthDots', 8, 832);
  if (config.printableWidthDots % 8) throw new Error('Printable width must be a multiple of 8.');
  integer(config.topMarginDots, 'topMarginDots', 0, 1024);
  integer(config.bottomMarginDots, 'bottomMarginDots', 0, 1024);
  integer(config.bandHeight, 'bandHeight', 0, 4096);
  if (typeof config.rotate180 !== 'boolean') throw new Error('rotate180 must be a boolean.');
  finishCommands(config.feedDots, config.cut);
}

// The browser submits only the upright, packed square photo. The backend owns
// whitespace, transport rotation and all ESC/POS commands. Never re-dither it.
export function encodeJob(photo, config) {
  const width = config.printableWidthDots;
  const rowBytes = width / 8;
  if (!Buffer.isBuffer(photo) || photo.length !== rowBytes * width) throw new Error('Invalid packed photo size.');
  const height = config.topMarginDots + width + config.bottomMarginDots;
  const data = Buffer.alloc(rowBytes * height);
  const start = config.topMarginDots * rowBytes;
  if (config.rotate180) {
    for (let i = 0; i < photo.length; i++) data[start + i] = reverseByte[photo[photo.length - 1 - i]];
  } else photo.copy(data, start);
  return Buffer.concat([
    initialize,
    rasterCommands({ width, height, data }, config.bandHeight),
    finishCommands(config.feedDots, config.cut),
  ]);
}
