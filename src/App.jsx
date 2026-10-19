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
  const [sourceType, setSourceType] = useState('')

  function openEditor(image, source) {
    setSelectedImage(image)
    setSourceType(source)
    setScreen('editor')
  }

  function goHome() {
    setSelectedImage('')
    setSourceType('')
    setScreen('source')
  }

  return (
    <main>
      {screen !== 'source' && (
        <button type="button" className="home-button" onClick={goHome}>
          Home
        </button>
      )}
      {screen === 'source' ? (
        <SourcePicker onChooseSource={setScreen} />
      ) : screen === 'camera' ? (
        <Camera
          onCapture={(image) => openEditor(image, 'camera')}
          onBack={() => setScreen('source')}
        />
      ) : screen === 'upload' ? (
        <PhotoUpload
          onBack={() => setScreen('source')}
          onContinue={(image) => openEditor(image, 'upload')}
        />
      ) : screen === 'editor' ? (
        <PhotoEditor
          sourceImage={selectedImage}
          sourceType={sourceType}
          onBack={() => setScreen(sourceType)}
        />
      ) : (
        <PlaceholderScreen onBack={() => setScreen('source')} />
      )}
    </main>
  )
}

export default App
