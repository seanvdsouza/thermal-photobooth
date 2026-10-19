import {
  PHOTO_BOTTOM_MARGIN,
  PHOTO_MARGIN,
  PRINTER_WIDTH,
} from './imageConfig.js'

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The image could not be processed.'))
    image.src = source
  })
}

export function applyDither(imageData, brightness = 0, contrast = 0) {
  const { data, width, height } = imageData
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const grayscale = new Array(width * height)

  for (let index = 0; index < grayscale.length; index += 1) {
    const pixelIndex = index * 4
    const average =
      0.299 * data[pixelIndex] +
      0.587 * data[pixelIndex + 1] +
      0.114 * data[pixelIndex + 2]
    const adjusted = Math.max(
      0,
      Math.min(255, factor * (average - 128) + 128 + brightness),
    )
    grayscale[index] = adjusted
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      const oldValue = grayscale[index]
      const newValue = oldValue < 128 ? 0 : 255
      const error = oldValue - newValue
      grayscale[index] = newValue

      if (x + 1 < width) grayscale[index + 1] += (error * 7) / 16
      if (y + 1 < height) {
        if (x > 0) grayscale[index + width - 1] += (error * 3) / 16
        grayscale[index + width] += (error * 5) / 16
        if (x + 1 < width) grayscale[index + width + 1] += error / 16
      }
    }
  }

  for (let index = 0; index < grayscale.length; index += 1) {
    const pixelIndex = index * 4
    const value = grayscale[index] < 128 ? 0 : 255
    data[pixelIndex] = value
    data[pixelIndex + 1] = value
    data[pixelIndex + 2] = value
    data[pixelIndex + 3] = 255
  }
}

export async function processPhoto(
  source,
  { brightness = 0, contrast = 0, photoSize = PRINTER_WIDTH } = {},
) {
  const image = await loadImage(source)
  const photoCanvas = createProcessedPhotoCanvas(image, {
    brightness,
    contrast,
    photoSize,
  })

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = photoSize + PHOTO_MARGIN * 2
  outputCanvas.height = photoSize + PHOTO_MARGIN + PHOTO_BOTTOM_MARGIN
  const outputContext = outputCanvas.getContext('2d')
  outputContext.fillStyle = 'white'
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
  outputContext.drawImage(photoCanvas, PHOTO_MARGIN, PHOTO_MARGIN)

  return outputCanvas.toDataURL('image/png')
}

function createProcessedPhotoCanvas(
  image,
  { brightness = 0, contrast = 0, photoSize = 576 },
) {
  const photoCanvas = document.createElement('canvas')
  photoCanvas.width = photoSize
  photoCanvas.height = photoSize
  const photoContext = photoCanvas.getContext('2d')
  photoContext.drawImage(image, 0, 0, photoSize, photoSize)

  const imageData = photoContext.getImageData(0, 0, photoSize, photoSize)
  applyDither(imageData, brightness, contrast)
  photoContext.putImageData(imageData, 0, 0)

  return photoCanvas
}

export async function processSquarePhoto(
  source,
  { brightness = 0, contrast = 0, photoSize = PRINTER_WIDTH } = {},
) {
  const image = await loadImage(source)
  const photoCanvas = createProcessedPhotoCanvas(image, {
    brightness,
    contrast,
    photoSize,
  })
  return photoCanvas.toDataURL('image/png')
}
