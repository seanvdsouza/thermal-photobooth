import { drawCrop } from './imageCrop.js';
import { applyThermalEffect } from '../../shared/photo-look.js';
export { applyThermalEffect } from '../../shared/photo-look.js';
import config from '../../printer/config.json';

export const PHOTO_SIZE = config.printableWidthDots;
// Visual paper geometry is upright. Printer feed order/rotation is separate.
// The final physical layout was approved by the user; margins are approximate.
export const PAPER = {
  width: PHOTO_SIZE + config.previewSideMarginDots * 2,
  top: config.previewTopMarginDots,
  bottom: config.previewBottomMarginDots,
  side: config.previewSideMarginDots,
};

export function processPhoto(source, crop, brightness = 0, contrast = 0, look) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PHOTO_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = 'white';
  context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  drawCrop(context, source, crop, PHOTO_SIZE);
  const image = context.getImageData(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  const black = applyThermalEffect(image, brightness, contrast, look);
  context.putImageData(image, 0, 0);
  return { canvas, black };
}

export async function loadPhoto(file) {
  if (!file) return null;
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo smaller than 25 MB.');
  const url = URL.createObjectURL(file);
  try {
    // Modern browser image decoding applies embedded orientation. Keep this
    // decoded original through editing instead of repeatedly encoding PNGs.
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image.');
    return { image, width: image.naturalWidth, height: image.naturalHeight, mirrored: false, kind: 'upload' };
  } catch {
    throw new Error('This photo could not be opened. Try a JPEG, PNG, or another image your browser supports.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createSamplePhoto() {
  const image = document.createElement('canvas');
  image.width = image.height = PHOTO_SIZE;
  const ctx = image.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, PHOTO_SIZE);
  sky.addColorStop(0, '#8d8d8d');
  sky.addColorStop(1, '#efefef');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  ctx.fillStyle = '#fafafa';
  ctx.beginPath(); ctx.arc(408, 150, 61, 0, Math.PI * 2); ctx.fill();
  for (const [color, points] of [
    ['#a0a0a0', [[0, 360], [120, 176], [260, 350], [362, 235], [576, 390]]],
    ['#606060', [[0, 430], [206, 272], [370, 450], [490, 315], [576, 410]]],
    ['#2c2c2c', [[0, 475], [140, 405], [300, 493], [460, 439], [576, 473]]],
  ]) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, PHOTO_SIZE);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(PHOTO_SIZE, PHOTO_SIZE); ctx.closePath(); ctx.fill();
  }
  return processPhoto({ image, width: PHOTO_SIZE, height: PHOTO_SIZE }, { zoom: 1, x: 0, y: 0 });
}
