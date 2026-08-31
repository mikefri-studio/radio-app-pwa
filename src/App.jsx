import { useState, useRef } from 'react'

const STREAM_URL = "https://stream.example.com/radio.mp3"

function App() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [status, setStatus] = useState("Prêt")
  const audioRef = useRef(null)

  const handlePlay = () => {
    setStatus("Connexion...")
    audioRef.current.play().then(() => {
      setIsPlaying(true)
      setStatus("En lecture 📡")
    }).catch(err => {
      setStatus("Erreur de lecture")
      console.error(err)
    })
  }

  const handlePause = () => {
    audioRef.current.pause()
    setIsPlaying(false)
    setStatus("En pause ⏸️")
  }

  const togglePlay = () => {
    if (isPlaying) handlePause()
    else handlePlay()
  }

  const handleAudioError = () => {
    setStatus("Reconnexion dans 3s...")
    setIsPlaying(false)
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load()
        handlePlay()
      }
    }, 3000)
  }

  const startSleepTimer = (minutes) => {
    setStatus("Arrêt dans " + minutes + " min ⏱️")
    setTimeout(() => {
      handlePause()
      alert("Minuteur terminé !")
    }, minutes * 60 * 1000)
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>📻 Radio PWA</h1>
      
      <audio ref={audioRef} src={STREAM_URL} onError={handleAudioError} />
      
      <button 
        onClick={togglePlay}
        style={{ padding: '15px 30px', fontSize: '18px', margin: '20px', borderRadius: '10px', border: 'none', background: isPlaying ? '#dc3545' : '#28a745', color: 'white', cursor: 'pointer' }}
      >
        {isPlaying ? '⏸️ Pause' : '▶️ Lecture'}
      </button>
      
      <p>Statut : {status}</p>
      
      <div style={{ marginTop: '30px' }}>
        <p>⏱️ Minuterie :</p>
        <button onClick={() => startSleepTimer(15)} style={{ margin: '5px', padding: '10px' }}>15 min</button>
        <button onClick={() => startSleepTimer(30)} style={{ margin: '5px', padding: '10px' }}>30 min</button>
        <button onClick={() => startSleepTimer(60)} style={{ margin: '5px', padding: '10px' }}>60 min</button>
      </div>
    </div>
  )
}

export default App
