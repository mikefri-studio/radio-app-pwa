import { useState, useEffect, useRef } from 'react';
import './App.css';
import { radioApi } from './services/radioApi';
import { useFavorites } from './hooks/useFavorites';
import { useAudio } from './hooks/useAudio';

const COUNTRIES = [
  { code: 'ALL', name: '🌍 Monde' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'US', name: '🇺 USA' },
  { code: 'GB', name: '🇬🇧 UK' },
  { code: 'DE', name: '🇩🇪 Allemagne' },
  { code: 'ES', name: '🇸 Espagne' },
  { code: 'IT', name: '🇮 Italie' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'BR', name: '🇧🇷 Brésil' },
  { code: 'JP', name: '🇵 Japon' }
];

const GENRES = [
  'Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Hip Hop', 'R&B', 
  'Country', 'Folk', 'Blues', 'Metal', 'Reggae', 'Latin', 'News', 'Talk', 'Sports'
];

const themes = {
  light: {
    bg: '#ffffff',
    bgSecondary: '#f5f5f7',
    text: '#000000',
    textMuted: '#666666',
    border: 'rgba(0,0,0,0.1)',
    card: '#ffffff',
    cardHover: '#f0f0f0',
    primary: '#007aff',
    danger: '#ff3b30',
    success: '#34c759',
    shadow: 'rgba(0,0,0,0.1)'
  },
  dark: {
    bg: '#000000',
    bgSecondary: '#1c1c1e',
    text: '#ffffff',
    textMuted: '#8e8e93',
    border: 'rgba(255,255,255,0.1)',
    card: '#1c1c1e',
    cardHover: '#2c2c2e',
    primary: '#0a84ff',
    danger: '#ff453a',
    success: '#30d158',
    shadow: 'rgba(0,0,0,0.3)'
  }
};

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [tab, setTab] = useState('home');
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('ALL');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [displayList, setDisplayList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showCountries, setShowCountries] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connectingStation, setConnectingStation] = useState(null);
  const [sleepSec, setSleepSec] = useState(null);
  const [showSleep, setShowSleep] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmSt, setAlarmSt] = useState(null);
  const [alarmOn, setAlarmOn] = useState(false);
  const [showAlarm, setShowAlarm] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', icon: '️', type: 'error' });
  const [keepAwake, setKeepAwake] = useState(false);
  
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [hist, setHist] = useState([]);
  const { playing, buffering, reconnecting, play, togglePlay } = useAudio();
  
  const sleepRef = useRef(null);
  const alarmRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  const theme = isDark ? themes.dark : themes.light;

  const showCustomAlert = (title, message, type = 'error') => {
    const icons = { error: '⛔', success: '✅', info: 'ℹ️', warning: '️' };
    setCustomAlert({ visible: true, title, message, icon: icons[type] || '⚠️', type });
  };

  const hideCustomAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  const loadData = async () => {
    try {
      const h = localStorage.getItem('radio_hist');
      const a = localStorage.getItem('radio_alarm');
      const k = localStorage.getItem('radio_keep_awake');
      
      if (h) setHist(JSON.parse(h));
      if (a) {
        try {
          const d = JSON.parse(a);
          setAlarmTime(d.time || '');
          setAlarmSt(d.station || null);
          setAlarmOn(Boolean(d.active));
        } catch (e) {}
      }
      if (k !== null) setKeepAwake(JSON.parse(k));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStations = async (reset = true) => {
    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const limit = 50;
      const offset = reset ? 0 : stations.length;
      let data;
      
      if (country === 'ALL') {
        data = await radioApi.getTopStations(limit, offset);
      } else {
        data = await radioApi.getStationsByCountry(country, limit, offset);
      }
      
      if (reset) setStations(data || []);
      else setStations(prev => [...prev, ...(data || [])]);
      
      setHasMore(data && data.length === limit);
    } catch (e) {
      showCustomAlert('Connexion impossible', 'Vérifie ta connexion internet', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) fetchStations(false);
  };

  const applyFilters = () => {
    let list = [];
    
    if (tab === 'favorites') list = favorites;
    else if (tab === 'history') list = hist;
    else list = [...stations];
    
    if (selectedGenre && (tab === 'home' || tab === 'explore')) {
      list = list.filter(s => s.tags && s.tags.toLowerCase().includes(selectedGenre.toLowerCase()));
    }
    
    setDisplayList(list);
  };

  const addHist = async (s) => {
    const n = [s, ...hist.filter(x => x.stationuuid !== s.stationuuid)].slice(0, 20);
    setHist(n);
    localStorage.setItem('radio_hist', JSON.stringify(n));
  };

  const handlePlay = async (s) => {
    setAlarmSt(s);
    setConnectingStation(s.stationuuid);
    
    try {
      await play(s);
      setConnectingStation(null);
      setCurrent(s);
      setShowPlayer(true);
      addHist(s);
      radioApi.clickStation(s.stationuuid);
    } catch (e) {
      setConnectingStation(null);
      showCustomAlert('Stream indisponible', 'Cette radio ne peut pas être lue pour le moment', 'error');
    }
  };

  const startSleep = (min) => {
    if (sleepRef.current) clearInterval(sleepRef.current);
    
    if (min === 0) {
      setSleepSec(null);
      setShowSleep(false);
      showCustomAlert('Minuteur annulé', 'Le minuteur de sommeil a été désactivé', 'info');
      return;
    }
    
    let s = min * 60;
    setSleepSec(s);
    sleepRef.current = setInterval(() => {
      s--;
      setSleepSec(s);
      if (s <= 0) {
        clearInterval(sleepRef.current);
        togglePlay();
        setSleepSec(null);
        showCustomAlert('Bonne nuit 🌙', 'La radio s\'est arrêtée automatiquement', 'info');
      }
    }, 1000);
    
    setShowSleep(false);
    showCustomAlert('Minuteur activé', `La radio s'arrêtera dans ${min} minutes`, 'success');
  };

  const saveAlarm = async (time, station, active) => {
    const isActive = Boolean(active);
    localStorage.setItem('radio_alarm', JSON.stringify({ time, station, active: isActive }));
    setAlarmTime(time);
    setAlarmSt(station);
    setAlarmOn(isActive);
  };

  const handleAlarmToggle = () => {
    if (alarmOn === true) {
      saveAlarm('', null, false);
      showCustomAlert('Réveil désactivé', 'Le réveil a été annulé', 'info');
    } else if (alarmTime && alarmSt) {
      saveAlarm(alarmTime, alarmSt, true);
      showCustomAlert('⏰ Réveil activé', `Vous serez réveillé à ${alarmTime}`, 'success');
    } else {
      showCustomAlert('Erreur', 'Veuillez entrer une heure valide', 'error');
    }
    setShowAlarm(false);
  };

  useEffect(() => {
    loadData();
    fetchStations();
    return () => {
      if (sleepRef.current) clearInterval(sleepRef.current);
      if (alarmRef.current) clearInterval(alarmRef.current);
    };
  }, []);

  useEffect(() => {
    if (tab === 'home' || tab === 'explore') fetchStations(true);
  }, [tab, country]);

  useEffect(() => {
    applyFilters();
  }, [query, stations, selectedGenre, tab, favorites, hist]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query && query.length >= 2) {
        setLoading(true);
        try {
          const data = await radioApi.searchStations(query, 100);
          setStations(data || []);
          setHasMore(false);
        } catch (e) {
          console.error('Erreur recherche:', e);
        } finally {
          setLoading(false);
        }
      } else if (query.length === 0) {
        fetchStations(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (keepAwake && playing) {
      // Keep awake logic - not needed in web
    }
  }, [keepAwake, playing]);

  useEffect(() => {
    localStorage.setItem('radio_keep_awake', JSON.stringify(keepAwake));
  }, [keepAwake]);

  useEffect(() => {
    if (alarmOn === true && alarmTime && alarmSt) {
      alarmRef.current = setInterval(() => {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (time === alarmTime && now.getSeconds() < 30) {
          handlePlay(alarmSt);
          setAlarmOn(false);
          saveAlarm('', null, false);
          showCustomAlert('⏰ Bonjour !', `Lecture de ${alarmSt.name}`, 'info');
        }
      }, 30000);
    }
    return () => { if (alarmRef.current) clearInterval(alarmRef.current); };
  }, [alarmOn, alarmTime, alarmSt]);

  const formatSleepTime = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="app-container" style={{ backgroundColor: theme.bg, color: theme.text, paddingBottom: current && showPlayer ? 280 : 100 }}>
      {/* Header */}
      <header className="header" style={{ borderColor: theme.border }}>
        <div className="header-title">📻 Radio</div>
        <div className="header-actions">
          {alarmOn && (
            <div className="alarm-indicator">
              <span>⏰</span>
              <div className="alarm-badge"></div>
            </div>
          )}
          <button className="icon-btn" onClick={() => setIsDark(!isDark)}>
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {(tab === 'home' || tab === 'explore') && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Rechercher une radio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ 
              backgroundColor: theme.bgSecondary, 
              color: theme.text,
              borderColor: theme.border 
            }}
          />
        </div>
      )}

      {/* Hero Player */}
      {current && !showPlayer && (
        <div 
          className="hero-player" 
          style={{ backgroundColor: theme.card, boxShadow: `0 2px 8px ${theme.shadow}` }}
          onClick={() => setShowPlayer(true)}
        >
          {current.favicon && !imageErrors[current.stationuuid] ? (
            <img 
              src={current.favicon} 
              alt="" 
              className="hero-image"
              onError={() => setImageErrors(prev => ({ ...prev, [current.stationuuid]: true }))}
            />
          ) : (
            <div className="hero-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              📻
            </div>
          )}
          <div className="hero-info">
            <div className="hero-name">{current.name}</div>
            <div className="hero-status" style={{ color: theme.textMuted }}>
              {playing ? '▶️ En lecture' : buffering ? '⏳ Chargement...' : '⏸️ En pause'}
            </div>
          </div>
          <div className="hero-controls">
            <button 
              className="icon-btn"
              onClick={(e) => { e.stopPropagation(); toggleFavorite(current); }}
            >
              {isFavorite(current.stationuuid) ? '❤️' : '🤍'}
            </button>
            <button 
              className="play-btn"
              style={{ backgroundColor: theme.primary, color: 'white' }}
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            >
              {playing ? '' : '▶'}
            </button>
          </div>
        </div>
      )}

      {/* Filter Sections */}
      {(tab === 'home' || tab === 'explore') && (
        <>
          <div className="filter-section">
            <div className="filter-header" onClick={() => setShowCountries(!showCountries)}>
              <div className="filter-title">🌍 Pays</div>
              <div className={`filter-arrow ${showCountries ? 'open' : ''}`}>▼</div>
            </div>
            {showCountries && (
              <div className="filter-chips">
                {COUNTRIES.map(c => (
                  <button
                    key={c.code}
                    className={`filter-chip ${country === c.code ? 'active' : ''}`}
                    onClick={() => setCountry(c.code)}
                    style={{ 
                      borderColor: country === c.code ? theme.primary : theme.border,
                      color: country === c.code ? 'white' : theme.text,
                      backgroundColor: country === c.code ? theme.primary : 'transparent'
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="filter-section">
            <div className="filter-header" onClick={() => setShowGenres(!showGenres)}>
              <div className="filter-title">🎵 Genres</div>
              <div className={`filter-arrow ${showGenres ? 'open' : ''}`}>▼</div>
            </div>
            {showGenres && (
              <div className="filter-chips">
                {GENRES.map(g => (
                  <button
                    key={g}
                    className={`filter-chip ${selectedGenre === g ? 'active' : ''}`}
                    onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                    style={{ 
                      borderColor: selectedGenre === g ? theme.primary : theme.border,
                      color: selectedGenre === g ? 'white' : theme.text,
                      backgroundColor: selectedGenre === g ? theme.primary : 'transparent'
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Stations Grid */}
      <div className="stations-grid">
        {loading && stations.length === 0 ? (
          <div className="loading-container" style={{ gridColumn: '1 / -1' }}>
            <div className="spinner"></div>
          </div>
        ) : displayList.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon"></div>
            <div>Aucune radio trouvée</div>
          </div>
        ) : (
          displayList.map((station, index) => (
            <div
              key={station.stationuuid || index}
              className={`station-card ${connectingStation === station.stationuuid ? 'connecting' : ''}`}
              style={{ 
                backgroundColor: theme.card,
                boxShadow: `0 2px 8px ${theme.shadow}`
              }}
              onClick={() => handlePlay(station)}
            >
              <button
                className="station-fav"
                onClick={(e) => { e.stopPropagation(); toggleFavorite(station); }}
              >
                {isFavorite(station.stationuuid) ? '❤️' : '🤍'}
              </button>
              {station.favicon && !imageErrors[station.stationuuid] ? (
                <img 
                  src={station.favicon} 
                  alt="" 
                  className="station-image"
                  onError={() => setImageErrors(prev => ({ ...prev, [station.stationuuid]: true }))}
                />
              ) : (
                <div className="station-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                  
                </div>
              )}
              <div className="station-name">{station.name}</div>
              <div className="station-country" style={{ color: theme.textMuted }}>
                {station.country}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <button 
            className="modal-btn secondary"
            onClick={loadMore}
            disabled={loadingMore}
            style={{ color: theme.text }}
          >
            {loadingMore ? 'Chargement...' : 'Charger plus'}
          </button>
        </div>
      )}

      {/* Floating Player */}
      {current && showPlayer && (
        <div 
          className="floating-player"
          style={{ 
            backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)',
            color: theme.text
          }}
        >
          {current.favicon && !imageErrors[current.stationuuid] ? (
            <img 
              src={current.favicon} 
              alt="" 
              className="floating-image"
              onError={() => setImageErrors(prev => ({ ...prev, [current.stationuuid]: true }))}
            />
          ) : (
            <div className="floating-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              
            </div>
          )}
          <div className="floating-info">
            <div className="floating-name">{current.name}</div>
            <div className="floating-status" style={{ color: theme.textMuted }}>
              {reconnecting ? '🔄 Reconnexion...' : buffering ? ' Chargement...' : playing ? '▶️ En lecture' : '⏸️ En pause'}
              {sleepSec && ` • ⏱️ ${formatSleepTime(sleepSec)}`}
            </div>
          </div>
          <div className="floating-controls">
            <button 
              className="icon-btn"
              onClick={() => setShowSleep(true)}
              title="Minuteur"
            >
              ⏱️
            </button>
            <button 
              className="icon-btn"
              onClick={() => setKeepAwake(!keepAwake)}
              title="Garder éveillé"
            >
              {keepAwake ? '👁️' : '👁️‍🗨️'}
            </button>
            <button 
              className="play-btn"
              style={{ backgroundColor: theme.primary, color: 'white' }}
              onClick={togglePlay}
            >
              {playing ? '' : '▶'}
            </button>
            <button 
              className="icon-btn"
              onClick={() => setShowPlayer(false)}
              title="Réduire"
            >
              ⬇️
            </button>
          </div>
        </div>
      )}

      {/* Nav Pill */}
      <div 
        className="nav-pill"
        style={{ 
          backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)'
        }}
      >
        {[
          { id: 'home', icon: '', label: 'Accueil' },
          { id: 'explore', icon: '🔍', label: 'Explorer' },
          { id: 'favorites', icon: '❤️', label: 'Favoris' },
          { id: 'history', icon: '🕐', label: 'Historique' }
        ].map(item => (
          <button
            key={item.id}
            className={`nav-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
            style={{ color: tab === item.id ? 'white' : theme.text }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Sleep Modal */}
      {showSleep && (
        <div className="modal-overlay" onClick={() => setShowSleep(false)}>
          <div 
            className="modal-content"
            style={{ backgroundColor: theme.card, color: theme.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">️ Minuteur de sommeil</div>
            <div className="modal-buttons">
              {[15, 30, 45, 60, 90].map(min => (
                <button
                  key={min}
                  className="modal-btn primary"
                  onClick={() => startSleep(min)}
                >
                  {min} minutes
                </button>
              ))}
              {sleepSec && (
                <button
                  className="modal-btn danger"
                  onClick={() => startSleep(0)}
                >
                  Annuler le minuteur
                </button>
              )}
              <button
                className="modal-btn secondary"
                onClick={() => setShowSleep(false)}
                style={{ color: theme.text }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alarm Modal */}
      {showAlarm && (
        <div className="modal-overlay" onClick={() => setShowAlarm(false)}>
          <div 
            className="modal-content"
            style={{ backgroundColor: theme.card, color: theme.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">⏰ Réveil</div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Heure du réveil
              </label>
              <input
                type="time"
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.bgSecondary,
                  color: theme.text,
                  fontSize: '16px'
                }}
              />
            </div>
            {alarmSt && (
              <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '12px', backgroundColor: theme.bgSecondary }}>
                <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '4px' }}>Station</div>
                <div style={{ fontWeight: '600' }}>{alarmSt.name}</div>
              </div>
            )}
            <div className="modal-buttons">
              <button
                className="modal-btn primary"
                onClick={handleAlarmToggle}
              >
                {alarmOn ? 'Désactiver le réveil' : 'Activer le réveil'}
              </button>
              <button
                className="modal-btn secondary"
                onClick={() => setShowAlarm(false)}
                style={{ color: theme.text }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert */}
      {customAlert.visible && (
        <div className="modal-overlay" onClick={hideCustomAlert}>
          <div 
            className="custom-alert"
            style={{ backgroundColor: theme.card, color: theme.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="alert-icon">{customAlert.icon}</div>
            <div className="alert-title">{customAlert.title}</div>
            <div className="alert-message">{customAlert.message}</div>
            <button
              className="modal-btn primary"
              onClick={hideCustomAlert}
              style={{ width: '100%' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
