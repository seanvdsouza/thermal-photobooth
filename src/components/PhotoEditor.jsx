import { useEffect, useState } from 'react'
import { processPhoto } from '../utils/imageProcessing.js'

function PhotoEditor({ sourceImage, sourceType, onBack }) {
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [processedImage, setProcessedImage] = useState('')
  const [processingError, setProcessingError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    let active = true

    processPhoto(sourceImage, { brightness, contrast }).then((result) => {
      if (active) {
        setProcessedImage(result)
        setIsProcessing(false)
      }
    }).catch(() => {
      if (active) {
        setProcessingError('The photo could not be processed. Please try again.')
        setIsProcessing(false)
      }
    })

    return () => {
      active = false
    }
  }, [sourceImage, brightness, contrast])

  function resetControls() {
    setIsProcessing(true)
    setProcessingError('')
    setBrightness(0)
    setContrast(0)
  }

  function changeBrightness(value) {
    setIsProcessing(true)
    setProcessingError('')
    setBrightness(Number(value))
  }

  function changeContrast(value) {
    setIsProcessing(true)
    setProcessingError('')
    setContrast(Number(value))
  }

  function downloadImage() {
    const link = document.createElement('a')
    link.href = processedImage
    link.download = 'thermal-photobooth.png'
    link.click()
  }

  return (
    <section>
      <h1>Edit Photo</h1>

      {processedImage ? (
        <img
          className="processed-photo"
          src={processedImage}
          alt="Black and white thermal photo preview"
        />
      ) : (
        <p>Processing photo...</p>
      )}
      {processingError && <p role="alert" className="error">{processingError}</p>}
      {isProcessing && <p aria-live="polite">Updating preview...</p>}

      <div className="photo-controls">
        <label htmlFor="brightness">
          Brightness: {brightness}
        </label>
        <input
          id="brightness"
          type="range"
          min="-100"
          max="100"
          value={brightness}
          onChange={(event) => changeBrightness(event.target.value)}
        />

        <label htmlFor="contrast">Contrast: {contrast}</label>
        <input
          id="contrast"
          type="range"
          min="-100"
          max="100"
          value={contrast}
          onChange={(event) => changeContrast(event.target.value)}
        />
      </div>

      <div className="editor-actions">
        <button type="button" onClick={resetControls}>
          Reset
        </button>
        <button type="button" onClick={onBack}>
          {sourceType === 'camera' ? 'Retake' : 'Choose Another'}
        </button>
        <button
          type="button"
          onClick={downloadImage}
          disabled={!processedImage || isProcessing}
        >
          Download PNG
        </button>
      </div>
    </section>
  )
}

export default PhotoEditor
