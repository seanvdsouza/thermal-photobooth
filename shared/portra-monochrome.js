// Original Portra-inspired B&W treatment, not an imported Lightroom preset.
// Keep grain in the final dithering step rather than adding noisy fake grain.
export function portraTone(value) {
  const normalized = Math.max(0, Math.min(255, value)) / 255;
  // Lift the toe and midtones, gently compress the overall tonal range.
  return 12 + 238 * Math.pow(normalized, 0.9);
}

export function portraGrayscale(image, brightness = 0, contrast = 0) {
  const count = image.width * image.height;
  if (image.data.length !== count * 4) throw new Error('Invalid image size.');
  const gray = new Float32Array(count);
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < count; i++) {
    const p = i * 4;
    // Slightly favour red/orange over green for a gentler portrait conversion.
    const luminance = image.data[p] * .38 + image.data[p + 1] * .50 + image.data[p + 2] * .12;
    const lightened = Math.max(0, Math.min(255, portraTone(luminance) + brightness));
    gray[i] = Math.max(0, Math.min(255, factor * (lightened - 128) + 128));
  }
  return gray;
}
