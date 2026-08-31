const BASE_URL = 'https://de1.api.radio-browser.info/json';

const headers = {
  'User-Agent': 'Radio-PWA/1.0',
  'Content-Type': 'application/json'
};

export const radioApi = {
  async getTopStations(limit = 50, offset = 0) {
    try {
      const res = await fetch(
        `${BASE_URL}/stations/topclick/${limit}?offset=${offset}&order=clickcount&reverse=true`,
        { headers }
      );
      return await res.json();
    } catch (e) {
      console.error('Erreur top stations:', e);
      return [];
    }
  },

  async getStationsByCountry(countryCode, limit = 50, offset = 0) {
    try {
      const res = await fetch(
        `${BASE_URL}/stations/bycountrycodeexact/${encodeURIComponent(countryCode)}?limit=${limit}&offset=${offset}&order=clickcount&reverse=true`,
        { headers }
      );
      return await res.json();
    } catch (e) {
      console.error('Erreur pays:', e);
      return [];
    }
  },

  async searchStations(query, limit = 50) {
    try {
      const res = await fetch(
        `${BASE_URL}/stations/byname/${encodeURIComponent(query)}?limit=${limit}&order=clickcount&reverse=true`,
        { headers }
      );
      return await res.json();
    } catch (e) {
      console.error('Erreur recherche:', e);
      return [];
    }
  },

  async getTags(limit = 100) {
    try {
      const res = await fetch(`${BASE_URL}/stats/tags?order=stationcount&reverse=true&limit=${limit}`);
      return await res.json();
    } catch (e) {
      console.error('Erreur tags:', e);
      return [];
    }
  },

  async getCountries(limit = 200) {
    try {
      const res = await fetch(`${BASE_URL}/stats/countries?order=stationcount&reverse=true&limit=${limit}`);
      return await res.json();
    } catch (e) {
      console.error('Erreur pays:', e);
      return [];
    }
  },

  async clickStation(stationId) {
    try {
      await fetch(`${BASE_URL}/url/${stationId}`, { headers });
    } catch (e) {}
  }
};
