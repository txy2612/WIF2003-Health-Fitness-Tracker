// ── NUTRITION PLANNER BACKEND SERVICE ─────────────────────────────────────────
// Shared API layer for the nutrition planner page. Mirrors the fitness-tracker
// fetch helpers in fitness.js. Exposes a global: window.NutritionService
//
// Note on naming: the backend stores a favourite's meal id under `mealId`, but
// the page uses `id`. This service maps between the two so the page code can
// keep using `id` everywhere unchanged.

(function () {
  const NUTRITION_API_URL = 'http://localhost:3000/api/v1/nutrition-planner';

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

  function jsonOptions(method, body) {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  // backend favourite { mealId, ... }  ->  page favourite { id, ... }
  function toPageFavourite(fav) {
    return { id: fav.mealId, name: fav.name, calories: fav.calories, img: fav.img };
  }

  // ── favourites ──
  async function getFavourites() {
    const data = await requestNutritionApi('/favourites');
    const list = Array.isArray(data.favourites) ? data.favourites : [];
    return list.map(toPageFavourite);
  }

  async function addFavourite(fav) {
    // fav arrives from the page as { id, name, calories, img }
    const created = await requestNutritionApi('/favourites', jsonOptions('POST', {
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
    });
  }

  // ── today's plan ──
  async function getPlan(date) {
    const data = await requestNutritionApi(`/plan?date=${encodeURIComponent(date)}`);
    return {
      breakfast: Array.isArray(data.breakfast) ? data.breakfast : [],
      lunch: Array.isArray(data.lunch) ? data.lunch : [],
      dinner: Array.isArray(data.dinner) ? data.dinner : [],
    };
  }

  async function savePlan(date, plan) {
    await requestNutritionApi('/plan', jsonOptions('PUT', {
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
