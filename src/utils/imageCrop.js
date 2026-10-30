// x/y are visual image offsets as fractions of the original dimensions.
// Keep crop geometry independent of viewport size and image processing.
export function cropGeometry(width, height, crop = {}, mirrored = false) {
  if (!(width > 0 && height > 0)) throw new Error('The image has no usable dimensions.');
  const zoom = Math.max(1, Math.min(3, crop.zoom ?? 1));
  const size = Math.min(width, height) / zoom;
  const limitX = (width - size) / (2 * width);
  const limitY = (height - size) / (2 * height);
  const x = Math.max(-limitX, Math.min(limitX, crop.x ?? 0));
  const y = Math.max(-limitY, Math.min(limitY, crop.y ?? 0));
  return {
    size, x, y, zoom, limitX, limitY,
    sx: (width - size) / 2 - x * width * (mirrored ? -1 : 1),
    sy: (height - size) / 2 - y * height,
  };
}

export function drawCrop(context, source, crop, size) {
  const geometry = cropGeometry(source.width, source.height, crop, source.mirrored);
  context.save();
  if (source.mirrored) {
    context.translate(size, 0);
    context.scale(-1, 1);
  }
  context.drawImage(source.image, geometry.sx, geometry.sy, geometry.size, geometry.size, 0, 0, size, size);
  context.restore();
}
