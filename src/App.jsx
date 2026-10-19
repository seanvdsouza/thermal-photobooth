import { useState } from 'react'
import Camera from './components/Camera.jsx'
import PhotoEditor from './components/PhotoEditor.jsx'
import PhotoUpload from './components/PhotoUpload.jsx'
import './App.css'

function SourcePicker({ onChooseSource }) {
  return (
    <section>
      <h1>Thermal Photobooth</h1>
      <p>Choose how you want to add a photo.</p>

      <div className="source-actions">
        <button type="button" onClick={() => onChooseSource('camera')}>
          Take Photo
        </button>
        <button type="button" onClick={() => onChooseSource('upload')}>
          Upload Photo
        </button>
      </div>
    </section>
  )
}

function PlaceholderScreen({ onBack }) {
  return (
    <section>
      <h1>Camera</h1>
      <p>This screen will be implemented next.</p>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </section>
  )
}

function App() {
  const [screen, setScreen] = useState('source')
  const [selectedImage, setSelectedImage] = useState('')

  function openEditor(image) {
    setSelectedImage(image)
    setScreen('editor')
  }

  return (
    <main>
      {screen === 'source' ? (
        <SourcePicker onChooseSource={setScreen} />
      ) : screen === 'camera' ? (
        <Camera onCapture={openEditor} onBack={() => setScreen('source')} />
      ) : screen === 'upload' ? (
        <PhotoUpload
          onBack={() => setScreen('source')}
          onContinue={openEditor}
        />
      ) : screen === 'editor' ? (
        <PhotoEditor
          sourceImage={selectedImage}
          onBack={() => setScreen('upload')}
        />
      ) : (
        <PlaceholderScreen onBack={() => setScreen('source')} />
      )}
    </main>
  )
}

export default App
