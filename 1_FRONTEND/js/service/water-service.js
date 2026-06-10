// ── WATER SERVICE ─────────────────────────────────────────────────────────────
// Saves/reads the user's daily water glasses via the progress-charts module.
// Exposes window.WaterService. Requires window.AuthService for the token.

(function () {
  const WATER_API_URL = 'http://localhost:3000/api/v1/progress-charts/water';

  function authHeaders() {
    const token = window.AuthService
      ? window.AuthService.getToken()
      : localStorage.getItem('fittrack_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function parse(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch (e) { return {}; }
  }

  async function getWater(date) {
    const response = await fetch(`${WATER_API_URL}?date=${encodeURIComponent(date)}`, {
      headers: authHeaders(),
    });
    const data = await parse(response);
    if (!response.ok) throw new Error(data.detail || data.message || 'Could not load water.');
    return data.glasses ?? 0;
  }

  async function setWater(date, glasses) {
    const response = await fetch(WATER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ date, glasses }),
    });
    const data = await parse(response);
    if (!response.ok) throw new Error(data.detail || data.message || 'Could not save water.');
    return data.glasses ?? glasses;
  }

  window.WaterService = { getWater, setWater };
})();
