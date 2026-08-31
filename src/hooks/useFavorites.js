import { useState, useEffect } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('radio_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const isFavorite = (id) => favorites.some(f => f.stationuuid === id);

  const toggleFavorite = (station) => {
    let newFavs;
    if (isFavorite(station.stationuuid)) {
      newFavs = favorites.filter(f => f.stationuuid !== station.stationuuid);
    } else {
      newFavs = [station, ...favorites];
    }
    setFavorites(newFavs);
    localStorage.setItem('radio_favorites', JSON.stringify(newFavs));
  };

  return { favorites, isFavorite, toggleFavorite };
}
