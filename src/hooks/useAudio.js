import { useState, useRef, useEffect } from 'react';

export function useAudio() {
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const audioRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'none';

    audioRef.current.addEventListener('playing', () => {
      setPlaying(true);
      setBuffering(false);
      setReconnecting(false);
    });

    audioRef.current.addEventListener('pause', () => {
      setPlaying(false);
    });

    audioRef.current.addEventListener('waiting', () => {
      setBuffering(true);
    });

    audioRef.current.addEventListener('error', () => {
      setPlaying(false);
      setBuffering(false);
      handleReconnect();
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const handleReconnect = () => {
    setReconnecting(true);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
      }
    }, 3000);
  };

  const play = async (station) => {
    if (!audioRef.current) return;
    
    setBuffering(true);
    setReconnecting(false);
    
    const url = station.urlResolved || station.url;
    
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
    }
    
    try {
      await audioRef.current.play();
    } catch (e) {
      console.error('Erreur lecture:', e);
      throw e;
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (e) {
        console.error('Erreur toggle:', e);
      }
    }
  };

  return { audioRef, playing, buffering, reconnecting, play, togglePlay };
}
