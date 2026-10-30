import { useEffect, useRef, useState } from 'react';
import { cropGeometry } from '../utils/imageCrop.js';
import { processPhoto } from '../utils/imageProcessing.js';
import Receipt from './Receipt.jsx';
import DitherControls from './DitherControls.jsx';
import { DEFAULT_LOOK } from '../../shared/photo-look.js';
import { submitPrint, readPrintStatus } from '../utils/printClient.js';

const initialCrop = { zoom: 1, x: 0, y: 0 };

export default function Editor({ source, look, onLookChange, onReplace, onHome }) {
  const [crop, setCrop] = useState(initialCrop);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [result, setResult] = useState(null);
  const [printJob, setPrintJob] = useState(null);
  const printRequest = useRef(null);
  const printLock = useRef(false);
  const drag = useRef(null);
  const heading = useRef(null);
  const key = JSON.stringify([crop, brightness, contrast, look]);
  const busy = result?.key !== key;
  const error = !busy && result?.error;
  const printId = printJob?.id;
  const printState = printJob?.state;

  useEffect(() => { heading.current?.focus(); }, [printJob?.state]);
  useEffect(() => {
    if (!printId || !['queued', 'sending'].includes(printState)) return;
    let active = true;
    let timer;
    const deadline = Date.now() + 60000;
    async function poll() {
      try {
        if (Date.now() > deadline) throw new Error('Status wait expired.');
        const next = await readPrintStatus(printId);
        if (!active) return;
        setPrintJob(next);
        if (['queued', 'sending'].includes(next.state)) timer = setTimeout(poll, 700);
      } catch {
        if (active) setPrintJob({ id: printId, state: 'unknown', error: 'Could not confirm the print status. This photo may already have printed. Check the printer before retrying.' });
      }
    }
    timer = setTimeout(poll, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [printId, printState]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const photo = processPhoto(source, crop, brightness, contrast, look);
        setResult({ ...photo, key });
      } catch {
        setResult({ key, error: 'The preview could not be generated. Try choosing another photo.' });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [source, crop, brightness, contrast, look, key]);

  function updateCrop(next) {
    const geometry = cropGeometry(source.width, source.height, next, source.mirrored);
    setCrop({ zoom: geometry.zoom, x: geometry.x, y: geometry.y });
  }
  function reset() { setCrop(initialCrop); setBrightness(0); setContrast(0); onLookChange(DEFAULT_LOOK); }
  async function printPhoto(newJob = false) {
    if (busy || error || printLock.current) return;
    printLock.current = true;
    if (newJob || !printRequest.current || printRequest.current.key !== result.key) {
      printRequest.current = { id: crypto.randomUUID(), key: result.key };
    }
    const id = printRequest.current.id;
    setPrintJob({ id, state: 'requesting' });
    try { setPrintJob(await submitPrint(id, result.black)); }
    catch (cause) {
      setPrintJob({ id, state: cause.notAccepted ? 'error' : 'unknown', error: `${cause.message === 'Failed to fetch' ? 'Could not reach the print service on the MacBook.' : cause.message}${cause.notAccepted ? '' : ' Check the printer before retrying; the original request may have printed.'}` });
    } finally { printLock.current = false; }
  }
  function backToEdit() { printRequest.current = null; setPrintJob(null); }
  const geometry = cropGeometry(source.width, source.height, crop, source.mirrored);
  const handlers = {
    onPointerDown(event) {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, crop, size: geometry.size, viewport: event.currentTarget.getBoundingClientRect().width };
    },
    onPointerMove(event) {
      const start = drag.current;
      if (!start || event.pointerId !== start.id) return;
      updateCrop({ ...start.crop,
        x: start.crop.x + (event.clientX - start.x) * start.size / (start.viewport * source.width),
        y: start.crop.y + (event.clientY - start.y) * start.size / (start.viewport * source.height),
      });
    },
    onPointerUp() { drag.current = null; },
    onPointerCancel() { drag.current = null; },
    onLostPointerCapture() { drag.current = null; },
  };

  if (printJob) {
    const pending = ['requesting', 'queued', 'sending'].includes(printJob.state);
    const submitted = printJob.state === 'submitted';
    const titles = { requesting: 'Sending your photo…', queued: 'You’re in the print queue.', sending: 'Sending to the printer…', submitted: 'Your photo is on its way.', error: 'Printing needs attention.', unknown: 'Let’s check the printer.' };
    return (
    <section className="demo-screen">
      <span className="demo-symbol" aria-hidden="true">{submitted ? '✓' : pending ? '…' : '!'}</span>
      <p className="eyebrow">{submitted ? 'Print submitted' : pending ? 'Print in progress' : 'Check before retrying'}</p>
      <h1 ref={heading} tabIndex="-1">{titles[printJob.state]}</h1>
      <p role="status">{pending ? 'Please wait here while we send your photo.' : submitted ? 'The print data was sent. Check the printer for your receipt.' : printJob.error}</p>
      {submitted && <p className="muted">Paper output and physical completion are not confirmed.</p>}
      <div className="demo-receipt"><Receipt photo={result?.canvas} /></div>
      <div className="action-stack">
        {!pending && !submitted && <button className="primary" onClick={() => printPhoto(printJob.state === 'error')}>{printJob.state === 'unknown' ? 'Retry same request' : 'Try again'}</button>}
        {!pending && <button className={submitted ? 'primary' : 'secondary'} onClick={onHome}>Start another photo ↗</button>}
        {!pending && printJob.state !== 'unknown' && <button className="text-button" onClick={backToEdit}>Back to editing</button>}
      </div>
    </section>
    );
  }

  return (
    <section className="editor-section">
      <div className="editor-intro">
        <button className="text-button" onClick={onHome}>← Start over</button>
        <p className="eyebrow">02 / Make it yours</p>
        <h1 ref={heading} tabIndex="-1">A little fine-tuning.</h1>
        <p className="muted">Your photo, just as it’ll look on paper.</p>
      </div>
      <div className="editor-layout">
        <div className="preview-stage">
          <div className="receipt-holder"><Receipt photo={result?.canvas} interactive handlers={handlers} busy={busy} /></div>
          <p className="preview-caption"><span className="status-dot" /> {busy ? 'Updating preview…' : 'Thermal print preview'}</p>
          <p className="stage-note">Drag the photo to find your frame.</p>
        </div>
        <div className="editor-controls">
          <div className="controls-title"><h2>Your adjustments</h2><button className="text-button" onClick={reset}>Reset</button></div>
          <DitherControls look={look} onChange={onLookChange} />
          <Slider label="Zoom" value={crop.zoom} min={1} max={3} step={0.01} display={`${crop.zoom.toFixed(2)}×`} onChange={zoom => updateCrop({ ...crop, zoom })} />
          <div className="reposition"><span>Reposition</span><div className="nudge-buttons" role="group" aria-label="Reposition photo">
            {[['←', -0.025, 0, 'left'], ['↑', 0, -0.025, 'up'], ['↓', 0, 0.025, 'down'], ['→', 0.025, 0, 'right']].map(([symbol, x, y, name]) => <button key={name} className="nudge" aria-label={`Move photo ${name}`} disabled={(x !== 0 && geometry.limitX === 0) || (y !== 0 && geometry.limitY === 0)} onClick={() => updateCrop({ ...crop, x: crop.x + x, y: crop.y + y })}>{symbol}</button>)}
          </div></div>
          <div className="control-divider" />
          <Slider label="Brightness" value={brightness} min={-100} max={100} display={brightness > 0 ? `+${brightness}` : brightness} onChange={setBrightness} />
          <Slider label="Contrast" value={contrast} min={-100} max={100} display={contrast > 0 ? `+${contrast}` : contrast} onChange={setContrast} />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="editor-bottom">
            <button className="primary" disabled={busy || !!error} onClick={() => printPhoto()}>Print photo <span aria-hidden="true">↗</span></button>
            <p className="demo-note">One photo · one thermal receipt</p>
            <button className="secondary" onClick={onReplace}>{source.kind === 'camera' ? 'Retake photo' : 'Choose another photo'}</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({ label, value, min, max, step = 1, display, onChange }) {
  const id = label.toLowerCase();
  return <div className="slider-control"><div className="slider-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{display}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></div>;
}
