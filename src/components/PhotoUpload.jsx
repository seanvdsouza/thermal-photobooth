import { useEffect, useRef, useState } from 'react'
import { createSquareCrop } from '../utils/imageCrop.js'
import { processSquarePhoto } from '../utils/imageProcessing.js'

function PhotoUpload({ onBack, onContinue }) {
  const [imageUrl, setImageUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [croppedImageUrl, setCroppedImageUrl] = useState('')
  const [thermalCropUrl, setThermalCropUrl] = useState('')
  const cropAreaRef = useRef(null)
  const cropImageRef = useRef(null)
  const dragStart = useRef(null)

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  useEffect(() => {
    if (!imageUrl) {
      return undefined
    }

    const sourceImage = new Image()
    sourceImage.onload = () => {
      const viewportSize = cropAreaRef.current?.clientWidth

      if (!viewportSize) {
        return
      }

      setCroppedImageUrl(
        createSquareCrop(sourceImage, {
          viewportSize,
          zoom,
          position,
        }),
      )
    }
    sourceImage.src = imageUrl

    return () => {
      sourceImage.onload = null
    }
  }, [imageUrl, zoom, position])

  useEffect(() => {
    if (!croppedImageUrl) {
      return undefined
    }

    let active = true
    processSquarePhoto(croppedImageUrl).then((result) => {
      if (active) {
        setThermalCropUrl(result)
      }
    }).catch(() => {
      if (active) {
        setError('The thermal preview could not be generated.')
      }
    })

    return () => {
      active = false
    }
  }, [croppedImageUrl])

  function handleFileChange(event) {
    const file = event.target.files[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    const nextImageUrl = URL.createObjectURL(file)

    setImageUrl((previousImageUrl) => {
      if (previousImageUrl) {
        URL.revokeObjectURL(previousImageUrl)
      }
      return nextImageUrl
    })
    setFileName(file.name)
    setError('')
    setCroppedImageUrl('')
    setThermalCropUrl('')
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  function handleImageError() {
    setError('That image could not be loaded. Please choose another file.')
    setImageUrl((previousImageUrl) => {
      if (previousImageUrl) {
        URL.revokeObjectURL(previousImageUrl)
      }
      return ''
    })
    setFileName('')
    setCroppedImageUrl('')
    setThermalCropUrl('')
  }

  function handlePointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      position,
    }
  }

  function handlePointerMove(event) {
    if (!dragStart.current) {
      return
    }

    const start = dragStart.current
    const nextPosition = {
      x: start.position.x + event.clientX - start.pointerX,
      y: start.position.y + event.clientY - start.pointerY,
    }
    setPosition(clampPosition(nextPosition, zoom))
  }

  function stopDragging() {
    dragStart.current = null
  }

  function resetCrop() {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  function clampPosition(nextPosition, nextZoom) {
    const cropArea = cropAreaRef.current
    const image = cropImageRef.current

    if (!cropArea || !image?.naturalWidth || !image.naturalHeight) {
      return nextPosition
    }

    const viewportSize = cropArea.clientWidth
    const imageScale = Math.max(
      viewportSize / image.naturalWidth,
      viewportSize / image.naturalHeight,
    )
    const renderedWidth = image.naturalWidth * imageScale * nextZoom
    const renderedHeight = image.naturalHeight * imageScale * nextZoom
    const maxX = Math.max(0, (renderedWidth - viewportSize) / 2)
    const maxY = Math.max(0, (renderedHeight - viewportSize) / 2)

    return {
      x: Math.max(-maxX, Math.min(maxX, nextPosition.x)),
      y: Math.max(-maxY, Math.min(maxY, nextPosition.y)),
    }
  }

  function handleZoomChange(value) {
    const nextZoom = Number(value)
    setZoom(nextZoom)
    setPosition((currentPosition) => clampPosition(currentPosition, nextZoom))
  }

  function moveCrop(deltaX, deltaY) {
    setPosition((currentPosition) =>
      clampPosition(
        {
          x: currentPosition.x + deltaX,
          y: currentPosition.y + deltaY,
        },
        zoom,
      ),
    )
  }

  return (
    <section>
      <h1>Upload Photo</h1>
      <p>Choose an image from your device.</p>

      <label htmlFor="photo-file">Photo file</label>
      <input
        id="photo-file"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      {error && <p role="alert" className="error">{error}</p>}

      {imageUrl && (
        <div className="uploaded-photo">
          <div
            ref={cropAreaRef}
            className="crop-area"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <img
              ref={cropImageRef}
              src={imageUrl}
              alt={fileName}
              onError={handleImageError}
              style={{
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
              }}
            />
          </div>
          <label htmlFor="zoom">Zoom</label>
          <input
            id="zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => handleZoomChange(event.target.value)}
          />
          <div className="crop-nudge-controls" aria-label="Reposition crop">
            <button type="button" onClick={() => moveCrop(0, -10)} aria-label="Move crop up">
              ↑
            </button>
            <button type="button" onClick={() => moveCrop(-10, 0)} aria-label="Move crop left">
              ←
            </button>
            <button type="button" onClick={() => moveCrop(10, 0)} aria-label="Move crop right">
              →
            </button>
            <button type="button" onClick={() => moveCrop(0, 10)} aria-label="Move crop down">
              ↓
            </button>
          </div>
          <button type="button" onClick={resetCrop}>
            Reset Crop
          </button>
          {croppedImageUrl && (
            <div className="cropped-result">
              <h2>Square crop result</h2>
              <img src={croppedImageUrl} alt="Your square cropped photo" />
              {thermalCropUrl && (
                <>
                  <h2>Thermal preview</h2>
                  <img src={thermalCropUrl} alt="Thermal preview of your square crop" />
                </>
              )}
              <button type="button" onClick={() => onContinue(croppedImageUrl)}>
                Continue to Editor
              </button>
            </div>
          )}
          <p>{fileName}</p>
          <label htmlFor="photo-file" className="button-label">
            Choose Another
          </label>
        </div>
      )}

      <button type="button" onClick={onBack}>
        Back
      </button>
    </section>
  )
}

export default PhotoUpload
