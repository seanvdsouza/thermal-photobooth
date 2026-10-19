import { useEffect, useRef, useState } from 'react'
import { applyDither } from '../utils/imageProcessing.js'

function Camera({ onCapture, onBack }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [facingMode, setFacingMode] = useState('user')
  const [error, setError] = useState('')
  const [isStarting, setIsStarting] = useState(true)

  useEffect(() => {
    let active = true

    async function startCamera() {
      setIsStarting(true)
      setError('')

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is not supported in this browser.')
        setIsStarting(false)
        return
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        videoRef.current.srcObject = stream
      } catch {
        setError(
          'Camera access was unavailable. Check your browser permission and try again.',
        )
      } finally {
        if (active) {
          setIsStarting(false)
        }
      }
    }

    startCamera()

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d', { willReadFrequently: true })
    let animationFrame

    function drawThermalPreview() {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const size = Math.min(video.videoWidth, video.videoHeight)
        const sourceX = (video.videoWidth - size) / 2
        const sourceY = (video.videoHeight - size) / 2

        context.save()
        context.clearRect(0, 0, canvas.width, canvas.height)
        if (facingMode === 'user') {
          context.translate(canvas.width, 0)
          context.scale(-1, 1)
        }
        context.drawImage(
          video,
          sourceX,
          sourceY,
          size,
          size,
          0,
          0,
          canvas.width,
          canvas.height,
        )
        context.restore()

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        applyDither(imageData)
        context.putImageData(imageData, 0, 0)
      }

      animationFrame = requestAnimationFrame(drawThermalPreview)
    }

    drawThermalPreview()

    return () => cancelAnimationFrame(animationFrame)
  }, [facingMode])

  function capturePhoto() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      return
    }

    const size = Math.min(video.videoWidth, video.videoHeight)
    const sourceX = (video.videoWidth - size) / 2
    const sourceY = (video.videoHeight - size) / 2
    const canvas = document.createElement('canvas')
    canvas.width = 576
    canvas.height = 576
    const context = canvas.getContext('2d')

    if (facingMode === 'user') {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      size,
      size,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    onCapture(canvas.toDataURL('image/png'))
  }

  return (
    <section>
      <h1>Camera</h1>
      {isStarting && <p>Starting camera...</p>}
      {error && <p role="alert" className="error">{error}</p>}

      <div className="camera-frame">
        <canvas
          ref={canvasRef}
          width="256"
          height="256"
          aria-label="Live thermal camera preview"
        />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
      </div>

      <div className="camera-actions">
        <button type="button" onClick={capturePhoto} disabled={Boolean(error)}>
          Capture Photo
        </button>
        <button
          type="button"
          onClick={() => setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'))}
          disabled={Boolean(error)}
        >
          Switch Camera
        </button>
        <button type="button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  )
}

export default Camera
