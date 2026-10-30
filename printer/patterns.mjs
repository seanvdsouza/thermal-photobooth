import { dither, packRaster } from './escpos.mjs';

export function makePattern(width) {
  const height = 192;
  const black = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Edge rules reveal clipping; 8-dot checks reveal scaling and polarity.
      black[y * width + x] = Number(x < 2 || x >= width - 2 || y < 2 || y >= height - 2 ||
        (y >= 32 && y < 160 && ((x >> 3) + (y >> 3)) % 2 === 0));
    }
  }
  return packRaster(black, width, height);
}

export function makePolaroid(width, top, bottom, rotate = false) {
  // Synthetic shaded sphere and gradient exercise photographic halftones,
  // without an image decoder or storing a guest photo during Phase 1.
  const gray = new Float32Array(width * width);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x / (width - 1) - 0.5) * 2;
      const ny = (y / (width - 1) - 0.5) * 2;
      const radius = nx * nx + ny * ny;
      gray[y * width + x] = radius < 0.55
        ? Math.max(15, Math.min(240, 95 + 130 * Math.sqrt(1 - radius / 0.55) - 65 * nx - 65 * ny))
        : 40 + 180 * x / (width - 1);
    }
  }
  const height = top + width + bottom;
  const black = new Uint8Array(width * height);
  const photo = dither(gray, width, width);
  // Printing upside down moves the mechanical leading margin below the
  // photo when the guest turns the finished receipt upright.
  if (rotate) photo.reverse();
  black.set(photo, top * width);
  return packRaster(black, width, height);
}
