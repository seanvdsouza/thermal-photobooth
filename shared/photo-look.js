import { dither } from './dither.js';
import { ditherOption } from './dither-options.js';
import { portraGrayscale } from './portra-monochrome.js';

export const DEFAULT_LOOK = { method: 'atkinson', strength: 1, threshold: 128, serpentine: false };
export const LOOK_OPTIONS = [
  ['atkinson', 'Atkinson'],
  ['portra', 'Portra-inspired B&W · Atkinson'],
  ['floyd-steinberg', 'Floyd–Steinberg'],
  ['stucki', 'Stucki'],
];

// The camera and editor call this same pure pixel pipeline at the same size.
export function applyThermalEffect(image, brightness = 0, contrast = 0, look = DEFAULT_LOOK) {
  const method = look.method;
  if (!LOOK_OPTIONS.some(([id]) => id === method)) throw new Error('Unknown photo look.');
  const gray = method === 'portra' ? portraGrayscale(image, brightness, contrast) : new Float32Array(image.width * image.height);
  if (method !== 'portra') {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < gray.length; i++) {
      const p = i * 4;
      const luminance = image.data[p] * .299 + image.data[p + 1] * .587 + image.data[p + 2] * .114;
      const lightened = Math.max(0, Math.min(255, luminance + brightness));
      gray[i] = Math.max(0, Math.min(255, factor * (lightened - 128) + 128));
    }
  }
  const black = method === 'floyd-steinberg'
    ? dither(gray, image.width, image.height, look)
    : ditherOption(gray, image.width, image.height, method === 'portra' ? 'atkinson' : method);
  for (let i = 0; i < black.length; i++) {
    const p = i * 4;
    image.data[p] = image.data[p + 1] = image.data[p + 2] = black[i] ? 0 : 255;
    image.data[p + 3] = 255;
  }
  return black;
}
