// ============================================================
//  Nutrition Planner – nutrition-planner.js
// ============================================================

// ---- Meal data ----
const MEALS = [
  {
    id: 'grilled-chicken-breast',
    name: 'Grilled Chicken Breast',
    calories: 320,
    img: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&q=80',
    tags: [{ label: 'High Protein', cls: 'badge-success' }, { label: 'Low Fat', cls: 'badge-info' }],
    macros: { p: '52g', c: '0g', f: '9g' },
    proteinLevel: 'High', carbsLevel: 'Low', fatLevel: 'Low',
    ingredients: ['Chicken breast', 'Olive oil', 'Garlic', 'Fresh herbs'],
    prep: 'Season chicken with garlic and herbs, brush with olive oil, then grill on high heat for 6–8 min per side until cooked through.'
  },
  {
    id: 'mixed-veggie-bowl',
    name: 'Mixed Veggie Bowl',
    calories: 210,
    img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
    tags: [{ label: 'Low Carb', cls: 'badge-warning' }, { label: 'Vegan', cls: 'badge-secondary' }],
    macros: { p: '8g', c: '28g', f: '6g' },
    proteinLevel: 'Medium', carbsLevel: 'Medium', fatLevel: 'Low',
    ingredients: ['Broccoli', 'Carrots', 'Spinach', 'Tofu', 'Sesame dressing'],
    prep: 'Sauté tofu until golden. Steam or stir-fry vegetables, toss together and drizzle with sesame dressing.'
  },
  {
    id: 'oatmeal-with-banana',
    name: 'Oatmeal with Banana',
    calories: 380,
    img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
    tags: [{ label: 'High Carb', cls: 'badge-primary' }, { label: 'Vegetarian', cls: 'badge-light border' }],
    macros: { p: '12g', c: '65g', f: '7g' },
    proteinLevel: 'Medium', carbsLevel: 'High', fatLevel: 'Low',
    ingredients: ['Rolled oats', 'Banana', 'Honey', 'Milk', 'Chia seeds'],
    prep: 'Cook oats with milk for 3–5 min. Top with sliced banana, drizzle honey, and sprinkle chia seeds.'
  },
  {
    id: 'baked-salmon-rice',
    name: 'Baked Salmon & Rice',
    calories: 490,
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    tags: [{ label: 'High Protein', cls: 'badge-success' }, { label: 'Omega-3', cls: 'badge-danger' }],
    macros: { p: '42g', c: '38g', f: '18g' },
    proteinLevel: 'High', carbsLevel: 'Medium', fatLevel: 'Medium',
    ingredients: ['Salmon fillet', 'Brown rice', 'Asparagus', 'Lemon', 'Olive oil'],
    prep: 'Bake salmon at 200°C for 12–15 min. Serve over cooked brown rice with steamed asparagus and a squeeze of lemon.'
  }
];

const GOAL_LABELS = {
    'lose':     'Lose weight',
    'maintain': 'Maintain weight',
    'gain':     'Gain muscle'
};

// ---- State (backed by localStorage) ----
let favourites  = JSON.parse(localStorage.getItem('np_favourites')  || '[]');
const todayKey = 'np_todayPlan_' + new Date().toISOString().split('T')[0];
let todayPlan  = JSON.parse(localStorage.getItem(todayKey) || '{"breakfast":[],"lunch":[],"dinner":[]}');
let calcResult  = JSON.parse(localStorage.getItem('np_calcResult')  || 'null');


function saveFavourites() { localStorage.setItem('np_favourites', JSON.stringify(favourites)); }
function savePlan() { localStorage.setItem(todayKey, JSON.stringify(todayPlan)); }
function saveCalcResult(r){ localStorage.setItem('np_calcResult', JSON.stringify(r));           }

// ---- Helpers ----
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showToast(msg) {
  const t = document.getElementById('npToast');
  document.getElementById('npToastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ---- Meal Cards ----
function renderMealCards() {
  const container = document.getElementById('mealCardsContainer');
  container.innerHTML = '';

  MEALS.forEach(meal => {
    const isFav = favourites.some(f => f.id === meal.id);
    const col   = document.createElement('div');
    col.className = 'col-lg-3 col-md-6 mb-4 meal-card-item';

    col.innerHTML = `
      <div class="card border-0 shadow-sm h-100 meal-card position-relative">

        <!-- Thumbnail + heart overlay -->
        <div class="position-relative">
          <img src="${meal.img}" alt="${meal.name}">
          <button
            class="fav-heart-btn${isFav ? ' active' : ''}"
            onclick="toggleFavourite('${meal.id}')"
            title="${isFav ? 'Remove from Favourites' : 'Add to Favourites'}"
          ><i class="fas fa-heart"></i></button>
        </div>

        <div class="card-body d-flex flex-column">
          <h6 class="font-weight-bold mb-1">${meal.name}</h6>
          <p class="text-muted small mb-1">
            <i class="fas fa-fire text-danger mr-1"></i>${meal.calories} kcal
          </p>

          <!-- Tags -->
          <div class="mb-2">
            ${meal.tags.map(t => `<span class="badge ${t.cls}">${t.label}</span>`).join(' ')}
          </div>

          <!-- Macros -->
          <div class="text-muted small mb-2">
            <span class="macro-pill macro-protein">P: ${meal.macros.p}</span>
            <span class="macro-pill macro-carbs">C: ${meal.macros.c}</span>
            <span class="macro-pill macro-fat">F: ${meal.macros.f}</span>
          </div>

          <!-- Ingredients -->
          <p class="text-muted small mb-3">
            <strong>Ingredients:</strong> ${meal.ingredients.join(', ')}
          </p>

          <!-- Actions -->
          <div class="mt-auto">
            <div class="btn-group btn-block mb-1">
              <button type="button"
                class="btn btn-outline-primary btn-sm dropdown-toggle w-100"
                data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <i class="fas fa-plus mr-1"></i> Add to Plan
              </button>
              <div class="dropdown-menu w-100">
                <button class="dropdown-item" onclick="addToPlan('${meal.id}','breakfast')">
                  <i class="fas fa-sun mr-2 text-warning"></i>Breakfast
                </button>
                <button class="dropdown-item" onclick="addToPlan('${meal.id}','lunch')">
                  <i class="fas fa-cloud-sun mr-2 text-info"></i>Lunch
                </button>
                <button class="dropdown-item" onclick="addToPlan('${meal.id}','dinner')">
                  <i class="fas fa-moon mr-2 text-primary"></i>Dinner
                </button>
              </div>
            </div>
            <button class="btn btn-outline-secondary btn-sm btn-block" onclick="openDetails('${meal.id}')">
              <i class="fas fa-info-circle mr-1"></i> View Details
            </button>
          </div>
        </div>
      </div>`;

    container.appendChild(col);
  });
}

// Toggle favourite heart (white → blue)
function toggleFavourite(id) {
  const meal = MEALS.find(m => m.id === id);
  const idx  = favourites.findIndex(f => f.id === id);

  if (idx >= 0) {
    favourites.splice(idx, 1);
  } else {
    favourites.push({ id: meal.id, name: meal.name, calories: meal.calories, img: meal.img });
  }

  saveFavourites();
  renderMealCards();
  renderFavourites();
}

// Open View Details modal
function openDetails(id) {
  const meal = MEALS.find(m => m.id === id);

  document.getElementById('modalMealName').textContent     = meal.name;
  document.getElementById('modalMealImg').src              = meal.img;
  document.getElementById('modalMealImg').alt              = meal.name;
  document.getElementById('modalCalories').textContent     = meal.calories + ' kcal';
  document.getElementById('modalProteinLevel').textContent = meal.proteinLevel;
  document.getElementById('modalCarbsLevel').textContent   = meal.carbsLevel;
  document.getElementById('modalFatLevel').textContent     = meal.fatLevel;
  document.getElementById('modalIngredients').innerHTML    =
    meal.ingredients.map(i => `<li>${i}</li>`).join('');
  document.getElementById('modalPrep').textContent         = meal.prep;

  $('#mealDetailModal').modal('show');
}

// ---- Today's Plan ----
function addToPlan(mealId, slot) {
  const meal = MEALS.find(m => m.id === mealId);
  if (todayPlan[slot].find(m => m.id === mealId)) {
    showToast(`${meal.name} is already in ${capitalize(slot)}!`);
    return;
  }
  todayPlan[slot].push({ id: meal.id, name: meal.name, calories: meal.calories, img: meal.img });
  savePlan();
  renderTodayPlan();
  showToast(`Added ${meal.name} to ${capitalize(slot)}! ✓`);
}

function removeFromPlan(mealId, slot) {
  todayPlan[slot] = todayPlan[slot].filter(m => m.id !== mealId);
  savePlan();
  renderTodayPlan();
}

function renderTodayPlan() {
  let totalCals = 0;

  ['breakfast', 'lunch', 'dinner'].forEach(slot => {
    const container = document.getElementById(`plan-${slot}`);
    const items     = todayPlan[slot];

    if (items.length === 0) {
      container.innerHTML = `<p class="text-muted small mb-0 font-italic">No meals added yet.</p>`;
    } else {
      container.innerHTML = items.map(m => {
        totalCals += m.calories;
        return `
          <div class="d-flex align-items-center mb-2 p-2 bg-light rounded">
            <img src="${m.img}" alt="${m.name}" class="fav-meal-img mr-2" style="width:44px;height:44px;">
            <div class="flex-grow-1">
              <span class="font-weight-bold small d-block">${m.name}</span>
              <small class="text-muted">
                <i class="fas fa-fire text-danger mr-1"></i>${m.calories} kcal
              </small>
            </div>
            <button class="btn btn-sm btn-outline-danger ml-2"
              onclick="removeFromPlan('${m.id}','${slot}')">
              <i class="fas fa-times"></i>
            </button>
          </div>`;
      }).join('');
      // recalculate properly
      totalCals = ['breakfast','lunch','dinner'].reduce(
        (sum, s) => sum + todayPlan[s].reduce((ss, mm) => ss + mm.calories, 0), 0
      );
    }
  });

  document.getElementById('plan-total-cals').textContent = totalCals + ' kcal';
}

// ---- Favourites Section ----
function renderFavourites() {
  const list = document.getElementById('fav-list');

  if (favourites.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-heart-broken d-block"></i>
        <p class="mb-0">No favourite meals yet.
          Click the <i class="fas fa-heart text-primary"></i> on a meal card to save it!
        </p>
      </div>`;
    return;
  }

  list.innerHTML = `<div class="list-group">
    ${favourites.map(f => `
      <div class="list-group-item list-group-item-action d-flex align-items-center mb-2 rounded shadow-sm">
        <img src="${f.img}" alt="${f.name}" class="fav-meal-img mr-3">
        <div class="flex-grow-1">
          <h6 class="mb-0 font-weight-bold">${f.name}</h6>
          <small class="text-muted">
            <i class="fas fa-fire text-danger mr-1"></i>${f.calories} kcal
          </small>
        </div>
        <div class="d-flex align-items-center">
          <div class="btn-group mr-2">
            <button type="button"
              class="btn btn-outline-primary btn-sm dropdown-toggle"
              data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <i class="fas fa-plus mr-1"></i> Add to Plan
            </button>
            <div class="dropdown-menu dropdown-menu-right">
              <button class="dropdown-item" onclick="addToPlan('${f.id}','breakfast')">
                <i class="fas fa-sun mr-2 text-warning"></i>Breakfast
              </button>
              <button class="dropdown-item" onclick="addToPlan('${f.id}','lunch')">
                <i class="fas fa-cloud-sun mr-2 text-info"></i>Lunch
              </button>
              <button class="dropdown-item" onclick="addToPlan('${f.id}','dinner')">
                <i class="fas fa-moon mr-2 text-primary"></i>Dinner
              </button>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="removeFavourite('${f.id}')">
            <i class="fas fa-trash mr-1"></i> Remove
          </button>
        </div>
      </div>`).join('')}
  </div>`;
}

function removeFavourite(id) {
  favourites = favourites.filter(f => f.id !== id);
  saveFavourites();
  renderMealCards();
  renderFavourites();
}

// ── Cleanup: remove water keys older than 30 days ──
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 30);
Object.keys(localStorage)
    .filter(key => key.startsWith('np_water_'))
    .forEach(key => {
        const dateStr = key.replace('np_water_', '');
        if (new Date(dateStr) < cutoff) {
            localStorage.removeItem(key);
        }
    });

// ---- Water Intake (teammate implementation) ----
const today = new Date().toISOString().split('T')[0];
let waterGlasses = parseInt(localStorage.getItem('np_water_' + today) || '0', 10); // Update water today so it doesn't load yesterday's data -> Start fresh at 0 everyday
const waterMax = 8;
const waterMessages = [
  'Stay hydrated! Start logging your water intake.',
  'Good start! Keep going 💧',
  'Doing well — almost halfway there!',
  'Halfway there! Great job 💪',
  'More than halfway — keep it up!',
  'Almost there — just a few more glasses!',
  'So close! One more glass to go!',
  'Almost at your goal!',
  '🎉 Goal reached! Great hydration today!'
];

function renderWaterGrid() {
  const grid = document.getElementById('waterGrid');
  grid.innerHTML = '';
  for (let i = 0; i < waterMax; i++) {
    const glass = document.createElement('span');
    glass.className = 'water-glass' + (i < waterGlasses ? ' filled' : '');
    glass.textContent = '💧';
    glass.title = 'Glass ' + (i + 1);
    glass.onclick = () => {
    waterGlasses = i + 1;
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('np_water_' + today, waterGlasses);  // add dated key
    renderWaterGrid();
    updateWaterUI();
};
    grid.appendChild(glass);
  }
}

function updateWaterUI() {
  document.getElementById('waterCount').textContent     = waterGlasses;
  document.getElementById('water-badge').textContent    = waterGlasses + ' / ' + waterMax + ' glasses';
  document.getElementById('waterProgressBar').style.width = ((waterGlasses / waterMax) * 100) + '%';
  document.getElementById('waterMsg').textContent       = waterMessages[waterGlasses];
}

function adjustWater(delta) {
  waterGlasses = Math.max(0, Math.min(waterMax, waterGlasses + delta));
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('np_water_' + today, waterGlasses);
  renderWaterGrid();
  updateWaterUI();
}

// ---- Calorie Calculator ----
function toggleCalc() {
  const body    = document.getElementById('calcBody');
  const chevron = document.getElementById('calcChevron');
  const isHidden = body.style.display === 'none' || body.style.display === '';

  body.style.display    = isHidden ? 'block' : 'none';
  chevron.className     = isHidden ? 'fas fa-chevron-up text-muted' : 'fas fa-chevron-down text-muted';
}

// Load profile data into calculator preview on page load
function loadProfileIntoCalc() {
    const profile = JSON.parse(localStorage.getItem('fittrack_profile') || '{}');
    const previewEl = document.getElementById('profileDataText');

    // Pre-fill height/weight inputs from profile
    if (profile.height) document.getElementById('calcHeight').value = profile.height;
    if (profile.weight) document.getElementById('calcWeight').value = profile.weight;

    if (!previewEl) return;

    // Preview text — age, gender, goal only (height/weight have their own inputs)
    const parts = [];
    if (profile.age)    parts.push(`Age: ${profile.age}`);
    if (profile.gender) parts.push(`Gender: ${capitalize(profile.gender)}`);
    if (profile.goal)   parts.push(`Goal: ${GOAL_LABELS[profile.goal] || profile.goal}`);

    previewEl.textContent = parts.length
        ? parts.join(' · ')
        : 'No profile data found. Update your profile for accurate results.';
}


document.getElementById('calcHeight').addEventListener('blur', function() {
    if (!this.value) return;
    const profile = JSON.parse(localStorage.getItem('fittrack_profile') || '{}');
    profile.height = this.value;
    localStorage.setItem('fittrack_profile', JSON.stringify(profile));
});

document.getElementById('calcWeight').addEventListener('blur', function() {
    if (!this.value) return;
    const profile = JSON.parse(localStorage.getItem('fittrack_profile') || '{}');
    profile.weight = this.value;
    localStorage.setItem('fittrack_profile', JSON.stringify(profile));
});

function calculateCalories() {
    const profile     = JSON.parse(localStorage.getItem('fittrack_profile') || '{}');
    const activityVal = document.getElementById('activityLevel').value;

    if (!activityVal) {
        showToast('Please select your activity level.');
        return;
    }

    // Reads from input box,  fallback to profile values if input is empty
    const weight = parseFloat(document.getElementById('calcWeight').value) || parseFloat(profile.weight) || 70;
    const height = parseFloat(document.getElementById('calcHeight').value) || parseFloat(profile.height) || 170;
    const age    = parseFloat(profile.age)    || 25;
    const gender = profile.gender             || 'male';
    const goal   = profile.goal               || 'maintain';

    // Warn user if profile is incomplete
    if (!profile.weight || !profile.height || !profile.age) {
        showToast('Some profile data is missing — using defaults. Update your profile for accurate results.');
    }

    // Mifflin-St Jeor BMR (same formula as fitness-tracker.js)
    const bmrBase = (10 * weight) + (6.25 * height) - (5 * age);
    const bmr     = gender === 'female' ? bmrBase - 161 : bmrBase + 5;

    const activity = parseFloat(activityVal);
    let tdee = Math.round(bmr * activity);

    let adjustment = 0, goalLabel = '';
    if (goal === 'lose') {
        adjustment = -500;
        goalLabel  = '🔻 Calorie deficit for weight loss (-500 kcal from TDEE)';
    } else if (goal === 'gain') {
        adjustment = +300;
        goalLabel  = '💪 Calorie surplus for muscle gain (+300 kcal from TDEE)';
    } else {
        goalLabel  = '⚖️ Maintenance — matching your daily energy expenditure';
    }

    const target  = tdee + adjustment;
    const protein = Math.round((target * 0.30) / 4);
    const carbs   = Math.round((target * 0.45) / 4);
    const fat     = Math.round((target * 0.25) / 9);

    const result = { target, protein, carbs, fat, goalLabel, goal, activity: activityVal };
    const updatedProfile = { ...profile, activityLevel: activityVal };
    localStorage.setItem('fittrack_profile', JSON.stringify(updatedProfile));

    saveCalcResult(result);
    displayCalcResult(result);
    showToast('✓ Height & weight saved to your profile automatically.');
}

function displayCalcResult(r) {
  document.getElementById('calorie-output').textContent = r.target.toLocaleString();
  document.getElementById('goal-label').textContent     = r.goalLabel;
  document.getElementById('macro-pills').innerHTML = `
    <span class="macro-pill macro-protein">Protein: ${r.protein}g</span>
    <span class="macro-pill macro-carbs">Carbs: ${r.carbs}g</span>
    <span class="macro-pill macro-fat">Fat: ${r.fat}g</span>`;

  document.getElementById('calorie-empty').style.display  = 'none';
  document.getElementById('calorie-result').style.display = 'block';
}

// ---- Meal Search ----
function searchMeals() {
  const query = document.getElementById('mealSearchInput').value.toLowerCase().trim();
  document.querySelectorAll('.meal-card-item').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = (!query || text.includes(query)) ? '' : 'none';
  });
}

// ---- Initialise ----
document.addEventListener('DOMContentLoaded', function () {
  renderMealCards();
  renderFavourites();
  renderTodayPlan();
  renderWaterGrid();
  updateWaterUI();
  loadProfileIntoCalc();

  // Restore previous calc result + dropdown selections from localStorage
  if (calcResult) {
    if (calcResult.activity) document.getElementById('activityLevel').value = calcResult.activity;
    displayCalcResult(calcResult);
  }

  // Enter key for search
  document.getElementById('mealSearchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') searchMeals();
  });
});
