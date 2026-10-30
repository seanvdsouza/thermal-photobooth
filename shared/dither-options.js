// Additional monochrome algorithms shared by the app and comparison page.
// Kernels: https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html
export function ditherOption(grayscale, width, height, method) {
  if (grayscale.length !== width * height) throw new Error('Invalid grayscale size.');
  const kernels = {
    serpentine: { divisor: 16, points: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
    atkinson: { divisor: 8, points: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] },
    stucki: { divisor: 42, points: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2], [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]] },
  };
  const kernel = kernels[method];
  if (!kernel) throw new Error('Unknown comparison method.');
  const pixels = Float32Array.from(grayscale);
  const black = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) {
    const direction = method === 'serpentine' && y % 2 ? -1 : 1;
    for (let step = 0; step < width; step++) {
      const x = direction === 1 ? step : width - 1 - step;
      const i = y * width + x;
      const next = pixels[i] < 128 ? 0 : 255;
      black[i] = next === 0 ? 1 : 0;
      const error = (pixels[i] - next) / kernel.divisor;
      for (const [dx, dy, weight] of kernel.points) {
        const nx = x + dx * direction, ny = y + dy;
        if (nx >= 0 && nx < width && ny < height) pixels[ny * width + nx] += error * weight;
      }
    }
  }
  return black;
}
