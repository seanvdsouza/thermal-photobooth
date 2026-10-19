export function createSquareCrop(
  image,
  { outputSize = 576, viewportSize, zoom = 1, position = { x: 0, y: 0 } },
) {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  const imageScale = Math.max(
    viewportSize / image.naturalWidth,
    viewportSize / image.naturalHeight,
  )
  const outputScale = outputSize / viewportSize

  context.translate(
    outputSize / 2 + position.x * outputScale,
    outputSize / 2 + position.y * outputScale,
  )
  context.scale(imageScale * zoom * outputScale, imageScale * zoom * outputScale)
  context.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2,
  )

  return canvas.toDataURL('image/png')
}
