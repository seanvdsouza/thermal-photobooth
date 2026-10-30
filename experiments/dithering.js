import { loadPhoto, applyThermalEffect } from '../src/utils/imageProcessing.js';
import { drawCrop } from '../src/utils/imageCrop.js';
import { applyDither as legacyDither } from './legacy/imageProcessing.js';
import { ditherOption } from './dither-options.js';
import { portraGrayscale } from './portra-monochrome.js';

const methods = [
  ['original', 'Grayscale reference', 'Continuous tones for comparison; this is not printable as 1-bit output.'],
  ['legacy', 'Previous version', 'The actual old Floyd–Steinberg code, including its adjustment order.'],
  ['current', 'Floyd–Steinberg baseline', 'Standard Floyd–Steinberg before tuning. Compare against the previous version at neutral settings.'],
  ['serpentine', 'Alternating-row Floyd–Steinberg', 'Reverses scan direction each row. Worth comparing for directional texture.'],
  ['atkinson', 'Atkinson', 'Bolder shapes and fewer midtone dots. Can lose detail in deep shadows and highlights.'],
  ['portra', 'Portra-inspired B&W · Atkinson', 'A portrait-friendly monochrome mix, lifted shadows, brighter midtones and softened highlights, finished with Atkinson. An original treatment, not an exact Lightroom preset.'],
  ['stucki', 'Stucki', 'Spreads error across more neighbours. A candidate for smoother photographic texture.'],
];
const elements = Object.fromEntries(['file', 'resolution', 'brightness', 'contrast', 'brightness-value', 'contrast-value', 'reset', 'status', 'source-name', 'grid'].map(id => [id, document.getElementById(id)]));
const cards = methods.map(([id, title, description]) => {
  const article = document.createElement('article');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', title);
  const heading = document.createElement('h2'); heading.textContent = title;
  const paragraph = document.createElement('p'); paragraph.textContent = description;
  article.append(canvas, heading, paragraph); elements.grid.append(article);
  return { id, canvas };
});
const sample = document.createElement('canvas');
sample.width = sample.height = 576;
let source = { image: sample, width: sample.width, height: sample.height };
// A neutral gradient gives the initial view a useful smooth-tone reference.
const context = sample.getContext('2d');
const gradient = context.createLinearGradient(0, 0, sample.width, sample.height);
gradient.addColorStop(0, '#181818'); gradient.addColorStop(1, '#fafafa');
context.fillStyle = gradient; context.fillRect(0, 0, sample.width, sample.height);
context.fillStyle = '#eee'; context.beginPath(); context.arc(205, 205, 100, 0, Math.PI * 2); context.fill();
elements['source-name'].textContent = 'Source: generated gradient sample (choose a portrait for a useful photo comparison)';
let timer;
let generation = 0;

function render() {
  const size = Number(elements.resolution.value);
  const brightness = Number(elements.brightness.value);
  const contrast = Number(elements.contrast.value);
  elements['brightness-value'].textContent = brightness;
  elements['contrast-value'].textContent = contrast;
  const input = document.createElement('canvas'); input.width = input.height = size;
  const ctx = input.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, size, size);
  drawCrop(ctx, source, { zoom: 1 }, size);
  const original = ctx.getImageData(0, 0, size, size);
  const gray = new Float32Array(size * size);
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < gray.length; i++) {
    const p = i * 4;
    const luminance = original.data[p] * .299 + original.data[p + 1] * .587 + original.data[p + 2] * .114;
    const lightened = Math.max(0, Math.min(255, luminance + brightness));
    gray[i] = Math.max(0, Math.min(255, factor * (lightened - 128) + 128));
  }
  for (const { id, canvas } of cards) {
    canvas.width = canvas.height = size;
    const output = new ImageData(new Uint8ClampedArray(original.data), size, size);
    if (id === 'legacy') legacyDither(output, brightness, contrast);
    else if (id === 'current') applyThermalEffect(output, brightness, contrast, { method: 'floyd-steinberg' });
    else {
      const tones = id === 'portra' ? portraGrayscale(original, brightness, contrast) : gray;
      const black = id === 'original' ? null : ditherOption(tones, size, size, id === 'portra' ? 'atkinson' : id);
      for (let i = 0; i < gray.length; i++) {
        const value = black ? (black[i] ? 0 : 255) : gray[i];
        output.data.set([value, value, value, 255], i * 4);
      }
    }
    canvas.getContext('2d').putImageData(output, 0, 0);
  }
  elements.status.textContent = `Same centre crop · ${size} × ${size} pixels · all ${methods.length - 1} dithered candidates are pure black and white`;
}
function schedule() { clearTimeout(timer); timer = setTimeout(render, 80); }
for (const id of ['brightness', 'contrast', 'resolution']) elements[id].addEventListener('input', schedule);
elements.reset.addEventListener('click', () => { elements.brightness.value = elements.contrast.value = '0'; render(); });
elements.file.addEventListener('change', async event => {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file) return;
  const id = ++generation;
  elements.status.textContent = 'Opening photo…';
  try {
    const next = await loadPhoto(file);
    if (id !== generation) return;
    source = next; elements['source-name'].textContent = `Source: ${file.name}`; render();
  } catch (error) {
    if (id === generation) elements.status.textContent = error.message;
  }
});
render();
