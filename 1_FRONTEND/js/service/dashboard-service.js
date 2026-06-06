// ── DASHBOARD BACKEND SERVICE ─────────────────────────────────────────────────
// Fetches the dashboard overview (goals, today's stats, weekly trend) from the
// backend, scoped to the logged-in user. Exposes window.DashboardService.

(function () {
  const DASHBOARD_API_URL = 'http://localhost:3000/api/v1/dashboard';

  function authHeaders() {
    const token = window.AuthService
      ? window.AuthService.getToken()
      : localStorage.getItem('fittrack_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function parseApiResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      return {};
    }
  }

  async function getOverview() {
    const response = await fetch(DASHBOARD_API_URL, { headers: authHeaders() });
    const data = await parseApiResponse(response);

    if (!response.ok) {
      const error = new Error(data.detail || data.message || 'Could not load dashboard.');
      error.status = response.status;
      throw error;
    }

    return data;
  }

  window.DashboardService = {
    getOverview,
  };
})();
