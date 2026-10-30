import { useRef, useState } from 'react';
import Camera from './components/Camera.jsx';
import Editor from './components/Editor.jsx';
import Receipt from './components/Receipt.jsx';
import { createSamplePhoto, loadPhoto } from './utils/imageProcessing.js';
import { DEFAULT_LOOK } from '../shared/photo-look.js';

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [source, setSource] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sample] = useState(createSamplePhoto);
  const [look, setLook] = useState(DEFAULT_LOOK);
  const fileInput = useRef(null);
  const loadId = useRef(0);

  function home() {
    loadId.current++;
    setLoading(false); setSource(null); setError(''); setScreen('welcome');
  }
  function openCamera() { loadId.current++; setLoading(false); setError(''); setSource(null); setScreen('camera'); }
  function openEditor(photo) { loadId.current++; setLoading(false); setSource({ ...photo, id: loadId.current }); setScreen('editor'); }
  async function selectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const id = ++loadId.current;
    setLoading(true); setError('');
    try {
      const photo = await loadPhoto(file);
      if (loadId.current === id) openEditor(photo);
    } catch (cause) {
      if (loadId.current === id) setError(cause.message);
    } finally {
      if (loadId.current === id) setLoading(false);
    }
  }
  const upload = () => fileInput.current.click();
  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="wordmark" onClick={home} aria-label="Little Moments home"><span className="brand-icon" aria-hidden="true">✳</span> little moments<span className="wordmark-period">.</span></button>
        <span className="mode-badge"><span className="status-dot" /> Thermal photobooth</span>
      </header>
      <main>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={selectFile} aria-label="Choose a photo" />
        {loading && <p className="notice" role="status">Opening your photo…</p>}
        {error && <div className="notice error" role="alert">{error} <button className="text-button" onClick={upload}>Choose another</button></div>}
        {screen === 'welcome' && <section className="welcome">
          <div className="welcome-copy">
            <p className="eyebrow"><span className="short-line" /> The thermal photobooth</p>
            <h1>Big memories.<br /><span>Little prints.</span></h1>
            <p className="welcome-description">Turn a passing moment into something you can hold. A photo, a little grain, a keepsake.</p>
            <div className="welcome-actions">
              <button className="primary" disabled={loading} onClick={openCamera}>Take a photo <span aria-hidden="true">◎</span></button>
              <button className="secondary" disabled={loading} onClick={upload}>Upload a photo <span aria-hidden="true">↥</span></button>
            </div>
            <p className="privacy-note">No sign-up. Photos aren’t saved after printing.</p>
          </div>
          <div className="welcome-art" aria-label="Example thermal receipt">
            <div className="art-cross cross-one" aria-hidden="true">+</div><div className="art-cross cross-two" aria-hidden="true">+</div>
            <div className="sample-receipt"><Receipt photo={sample.canvas} /></div>
            <div className="art-caption"><span aria-hidden="true">↖</span> imperfect in the best way</div>
            <span className="art-label">BLACK & WHITE. FULL OF FEELING.</span>
          </div>
          <div className="welcome-steps"><span><b>01</b> Take or upload</span><span><b>02</b> Make it yours</span><span><b>03</b> Preview your print</span></div>
        </section>}
        {screen === 'camera' && <Camera look={look} onLookChange={setLook} onCapture={openEditor} onBack={home} onUpload={upload} />}
        {screen === 'editor' && source && <Editor key={source.id} source={source} look={look} onLookChange={setLook} onHome={home} onReplace={source.kind === 'camera' ? openCamera : upload} />}
      </main>
      <footer className="site-footer"><span>A little moment, on paper.</span><span>Made to be kept <span aria-hidden="true">↗</span></span></footer>
    </div>
  );
}
