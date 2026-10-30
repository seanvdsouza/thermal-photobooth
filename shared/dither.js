// Input: grayscale 0 (black) through 255 (white). Output: 1 means black.
export function dither(grayscale, width, height, { threshold = 128, strength = 1, serpentine = false } = {}) {
  if (grayscale.length !== width * height) throw new Error('Invalid grayscale size.');
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > 254) throw new Error('Threshold must be from 1 to 254.');
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) throw new Error('Diffusion strength must be from 0 to 1.');
  const pixels = Float32Array.from(grayscale);
  const black = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) {
    const direction = serpentine && y % 2 ? -1 : 1;
    for (let step = 0; step < width; step++) {
      const x = direction === 1 ? step : width - 1 - step;
      const i = y * width + x;
      const next = pixels[i] < threshold ? 0 : 255;
      black[i] = next === 0 ? 1 : 0;
      const error = (pixels[i] - next) * strength;
      const forward = x + direction;
      const behind = x - direction;
      if (forward >= 0 && forward < width) pixels[i + direction] += error * 7 / 16;
      if (y + 1 < height) {
        if (behind >= 0 && behind < width) pixels[i + width - direction] += error * 3 / 16;
        pixels[i + width] += error * 5 / 16;
        if (forward >= 0 && forward < width) pixels[i + width + direction] += error / 16;
      }
    }
  }
  return black;
}
