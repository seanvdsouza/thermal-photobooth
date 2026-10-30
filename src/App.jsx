import { useRef, useState } from 'react';
import Camera from './components/Camera.jsx';
import Editor from './components/Editor.jsx';
import Receipt from './components/Receipt.jsx';
import { createSamplePhoto, loadPhoto } from './utils/imageProcessing.js';
import { DEFAULT_LOOK } from '../shared/photo-look.js';
import logo from './assets/logo.svg';

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
  function openCamera() { loadId.current++; setLoading(false); setError(''); setSource(null); setLook(DEFAULT_LOOK); setScreen('camera'); }
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
    <div className={`app-shell${screen === 'welcome' ? ' receipt-home' : screen === 'camera' ? ' booth-interior' : screen === 'editor' ? ' receipt-editor' : ''}`}>
      <header className="site-header">
        <div className="header-brand">
          <button className="wordmark" onClick={home} aria-label="Kassenbon home"><img className="brand-logo" src={logo} alt="Kassenbon" /></button>
        </div>
      </header>
      <main>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={selectFile} aria-label="Choose a photo" />
        {loading && <p className="notice" role="status">Opening your photo…</p>}
        {error && <div className="notice error" role="alert">{error} <button className="text-button" onClick={upload}>Choose another</button></div>}
        {screen === 'welcome' && <section className="welcome-ticket" aria-labelledby="receipt-title">
          <h1 id="receipt-title" className="brand-title"><img className="brand-logo brand-logo--hero" src={logo} alt="Kassenbon" /></h1>
          <div className="ticket-rule" aria-hidden="true" />
          <div className="ticket-photo"><Receipt photo={sample.canvas} /></div>
          <div className="ticket-rule" aria-hidden="true" />
          <div className="ticket-actions">
            <button className="primary" disabled={loading} onClick={openCamera}>TAKE A PHOTO <span aria-hidden="true">→</span></button>
            <button className="secondary" disabled={loading} onClick={upload}>UPLOAD A PHOTO <span aria-hidden="true">↑</span></button>
          </div>
          <div className="ticket-total ticket-row"><span>TOTAL</span><strong>ONE GOOD MEMORY</strong></div>
          <div className="ticket-barcode" aria-hidden="true" />
          <p className="ticket-thanks">THANK YOU FOR STOPPING BY</p>
          <p className="ticket-last-line">PLEASE KEEP YOUR LITTLE MOMENT.</p>
        </section>}
        {screen === 'camera' && <Camera onCapture={openEditor} onUpload={upload} />}
        {screen === 'editor' && source && <Editor key={source.id} source={source} look={look} onLookChange={setLook} onHome={home} onReplace={source.kind === 'camera' ? openCamera : upload} />}
      </main>
      {screen === 'welcome' && <footer className="site-footer"><span>A little moment, on paper.</span><span>Made to be kept <span aria-hidden="true">↗</span></span></footer>}
    </div>
  );
}
