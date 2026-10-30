import { useEffect, useRef, useState } from 'react';
import { drawCrop } from '../utils/imageCrop.js';
import { applyThermalEffect, PHOTO_SIZE } from '../utils/imageProcessing.js';
import { DEFAULT_LOOK } from '../../shared/photo-look.js';

const PREVIEW_SIZE = PHOTO_SIZE;
const PREVIEW_INTERVAL_MS = 125; // Match print detail, limit processing to 8 fps.

export default function Camera({ onCapture, onUpload }) {
  const video = useRef(null);
  const preview = useRef(null);
  const streamRef = useRef(null);
  const mirroredRef = useRef(true);
  const countdownTimer = useRef(null);
  const [facing, setFacing] = useState('user');
  const [status, setStatus] = useState({ ready: false, error: '' });
  const [countdown, setCountdown] = useState(0);

  useEffect(() => () => clearInterval(countdownTimer.current), []);

  useEffect(() => {
    let active = true;
    let frame;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs a supported browser and a secure connection. You can upload a photo instead.');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1600 }, height: { ideal: 1200 } } });
        if (!active) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        const actualFacing = stream.getVideoTracks()[0].getSettings().facingMode;
        mirroredRef.current = (actualFacing || facing) === 'user';
        video.current.srcObject = stream;
        await video.current.play();
        if (!active) return;
        setStatus({ ready: true, error: '' });
        const ctx = preview.current.getContext('2d', { willReadFrequently: true });
        let lastDraw = -Infinity;
        function draw(timestamp = 0) {
          const element = video.current;
          if (element?.videoWidth && element.readyState >= 2 && timestamp - lastDraw >= PREVIEW_INTERVAL_MS) {
            lastDraw = timestamp;
            drawCrop(ctx, { image: element, width: element.videoWidth, height: element.videoHeight, mirrored: mirroredRef.current }, { zoom: 1 }, PREVIEW_SIZE);
            const image = ctx.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
            applyThermalEffect(image, 0, 0, DEFAULT_LOOK);
            ctx.putImageData(image, 0, 0);
          }
          frame = requestAnimationFrame(draw);
        }
        draw();
      } catch (error) {
        if (active) {
          streamRef.current?.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (active) setStatus({ ready: false, error: error.name === 'NotAllowedError'
          ? 'Camera permission was declined. Allow camera access in your browser, or upload a photo.'
          : error.name === 'NotFoundError' ? 'No camera was found. You can upload a photo instead.'
            : error.message || 'The camera could not start. Try uploading a photo.' });
      }
    }
    start();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [facing]);

  function capture() {
    const element = video.current;
    if (!element?.videoWidth || element.readyState < 2 || !streamRef.current?.getVideoTracks().some(track => track.readyState === 'live')) {
      setStatus({ ready: false, error: 'The camera stopped before capture. Switch cameras to try again, or upload a photo.' });
      return;
    }
    const image = document.createElement('canvas');
    const scale = Math.min(1, 2048 / Math.max(element.videoWidth, element.videoHeight));
    image.width = Math.round(element.videoWidth * scale);
    image.height = Math.round(element.videoHeight * scale);
    image.getContext('2d').drawImage(element, 0, 0, image.width, image.height);
    onCapture({ image, width: image.width, height: image.height, mirrored: mirroredRef.current, kind: 'camera', look: { ...DEFAULT_LOOK } });
  }

  function startCountdown() {
    if (!status.ready || countdownTimer.current !== null) return;
    let remaining = 3;
    setCountdown(remaining);
    countdownTimer.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        capture();
      }
    }, 1000);
  }

  function cancelCountdown() {
    clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    setCountdown(0);
  }

  return (
    <section className="camera-section booth-scene" aria-label="Take a photo">
      <div className="camera-workspace">
        <div className="booth-stage">
          <div className="booth-mirror">
            <div className="booth-lights" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i} />)}</div>
            <div className="camera-view">
              <video ref={video} autoPlay playsInline muted hidden />
              <canvas ref={preview} width={PREVIEW_SIZE} height={PREVIEW_SIZE} aria-label="Live dithered black-and-white camera preview" />
              {!status.ready && <div className="camera-message" role="status">{status.error || 'Opening your camera…'}</div>}
              {countdown > 0 && <div className="camera-countdown" role="status" aria-live="assertive" aria-atomic="true"><span aria-label={`Capturing in ${countdown} ${countdown === 1 ? 'second' : 'seconds'}`}>{countdown}</span></div>}
            </div>
          </div>
          {status.error && <p role="alert" className="error">{status.error}</p>}
          <div className="camera-actions">
            <button className="secondary booth-aux" disabled={countdown > 0} onClick={() => { setStatus({ ready: false, error: '' }); setFacing(value => value === 'user' ? 'environment' : 'user'); }}>SWITCH CAMERA</button>
            <div className="booth-shutter-control">
              <button className="primary booth-shutter" aria-label={countdown > 0 ? 'Get ready…' : 'Capture photo'} disabled={!status.ready || countdown > 0} onClick={startCountdown}><span className="booth-shutter-icon" aria-hidden="true" /></button>
            </div>
            <button className="secondary booth-aux" onClick={() => { cancelCountdown(); onUpload(); }}>UPLOAD PHOTO</button>
          </div>
        </div>
      </div>
    </section>
  );
}
