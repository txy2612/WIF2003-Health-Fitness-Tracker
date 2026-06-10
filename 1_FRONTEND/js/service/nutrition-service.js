// ── NUTRITION PLANNER BACKEND SERVICE ─────────────────────────────────────────
// Shared API layer for the nutrition planner page. Mirrors the merged
// profile-service / auth-service token pattern. Exposes window.NutritionService
//
// Favourites + plan are per-user, so those calls send the JWT token via
// Authorization: Bearer (from window.AuthService). The catalogue + calorie
// calculator are public and don't need a token.

(function () {
  const NUTRITION_API_URL = 'http://localhost:3000/api/v1/nutrition-planner';

  function authHeaders() {
    const token = window.AuthService ? window.AuthService.getToken() : null;
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

  async function requestNutritionApi(path, options = {}) {
    const response = await fetch(`${NUTRITION_API_URL}${path}`, options);
    const data = await parseApiResponse(response);

    if (!response.ok) {
      const error = new Error(data.detail || data.message || 'Nutrition planner request failed.');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function jsonAuthOptions(method, body) {
    return {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    };
  }

  // backend favourite { mealId, ... }  ->  page favourite { id, ... }
  function toPageFavourite(fav) {
    return { id: fav.mealId, name: fav.name, calories: fav.calories, img: fav.img };
  }

  // ── favourites ──
  async function getFavourites() {
    const data = await requestNutritionApi('/favourites', { headers: authHeaders() });
    const list = Array.isArray(data.favourites) ? data.favourites : [];
    return list.map(toPageFavourite);
  }

  async function addFavourite(fav) {
    const created = await requestNutritionApi('/favourites', jsonAuthOptions('POST', {
      mealId: fav.id,
      name: fav.name,
      calories: fav.calories,
      img: fav.img || '',
    }));
    return toPageFavourite(created);
  }

  async function removeFavourite(id) {
    await requestNutritionApi(`/favourites/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  }

  // ── today's plan ──
  async function getPlan(date) {
    const data = await requestNutritionApi(`/plan?date=${encodeURIComponent(date)}`, {
      headers: authHeaders(),
    });
    return {
      breakfast: Array.isArray(data.breakfast) ? data.breakfast : [],
      lunch: Array.isArray(data.lunch) ? data.lunch : [],
      dinner: Array.isArray(data.dinner) ? data.dinner : [],
    };
  }

  async function savePlan(date, plan) {
    await requestNutritionApi('/plan', jsonAuthOptions('PUT', {
      date,
      breakfast: plan.breakfast || [],
      lunch: plan.lunch || [],
      dinner: plan.dinner || [],
    }));
  }

  window.NutritionService = {
    getFavourites,
    addFavourite,
    removeFavourite,
    getPlan,
    savePlan,
  };
})();
