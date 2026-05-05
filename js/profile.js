// ── PROFILE PHOTO ─────────────────────────────────────────────────────────────

document.getElementById('photoUpload').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('profilePhoto').src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// ── PROFILE LOCALSTORAGE ──────────────────────────────────────────────────────

const PROFILE_KEY = 'fittrack_profile';
const GOAL_KEY = 'fittrack_goals';

// Fields that map directly to profile (raw values, no units)
const PROFILE_FIELDS = ['name', 'email','age', 'gender', 'weight', 'height', 'goal', 'phone'];

function getProfile() {
    try {
        return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function saveProfileField(field, rawValue) {
    const profile = getProfile();
    profile[field] = rawValue;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ── TOGGLE EDIT ───────────────────────────────────────────────────────────────

function toggleEdit(field) {
    var display = document.getElementById('display-' + field);
    var input   = document.getElementById('input-' + field);
    var row     = display.closest('.profile-field');
    var btn     = row.querySelector('.edit-btn i');

    if (input.classList.contains('d-none')) {
        // Enter edit mode
        display.classList.add('d-none');
        input.classList.remove('d-none');
        input.focus();
        btn.classList.remove('fa-pencil-alt');
        btn.classList.add('fa-check');
        btn.closest('button').style.color = '#1cc88a';
        row.style.backgroundColor = '#eaf1fb';
        row.style.borderLeft      = '4px solid #4e73df';
        row.style.paddingLeft     = '12px';
        row.style.borderRadius    = '4px';
        row.style.transition      = 'all 0.2s ease';
    } else {
        // Confirm edit — get raw value before adding units
        const rawValue = (input.tagName === 'SELECT')
            ? input.value  // ← raw option value (e.g. "female", "lose")
            : input.value;

        // Display value with units
        var displayValue = (input.tagName === 'SELECT')
            ? input.options[input.selectedIndex].text
            : input.value;
        if (field === 'age')    displayValue = displayValue + ' years';
        if (field === 'height') displayValue = displayValue + ' cm';
        if (field === 'weight') displayValue = displayValue + ' kg';

        display.textContent = displayValue;
        input.classList.add('d-none');
        display.classList.remove('d-none');
        btn.classList.remove('fa-check');
        btn.classList.add('fa-pencil-alt');
        btn.closest('button').style.color = '#4e73df';
        row.style.backgroundColor = '';
        row.style.borderLeft      = '';
        row.style.paddingLeft     = '';
        row.style.borderRadius    = '';

        // Save raw value to localStorage
        if (PROFILE_FIELDS.includes(field)) {
            saveProfileField(field, rawValue);
        }

        // Update calorie hint if goal changed
        if (field === 'goal') updateCalHint();
    }
}

// ── RESTORE PROFILE FROM LOCALSTORAGE ON PAGE LOAD ────────────────────────────

function restoreProfile() {
    const profile = getProfile();

    // name display at top
    const nameEl = document.getElementById('profileNameDisplay');
    if (nameEl && profile.name) nameEl.textContent = profile.name;

    PROFILE_FIELDS.forEach(field => {
        if (!profile[field]) return;

        const input   = document.getElementById('input-'   + field);
        const display = document.getElementById('display-' + field);
        if (!input || !display) return;

        input.value = profile[field];

        let displayValue = (input.tagName === 'SELECT')
            ? input.options[[...input.options].findIndex(o => o.value === profile[field])]?.text || profile[field]
            : profile[field];
        if (field === 'age')    displayValue = displayValue + ' years';
        if (field === 'height') displayValue = displayValue + ' cm';
        if (field === 'weight') displayValue = displayValue + ' kg';

        display.textContent = displayValue;
    });

    const weightHint = document.getElementById('currentWeightHint');
    if (weightHint && profile.weight) weightHint.textContent = profile.weight + ' kg';


}

function getGoals() {
    try { return JSON.parse(localStorage.getItem(GOAL_KEY)) || {}; }
    catch (e) { return {}; }
}

// ── GOAL CALORIE HINT ─────────────────────────────────────────────────────────

function updateCalHint() {
    const profile = getProfile();
    const hintEl  = document.getElementById('goalCalHint');
    if (!hintEl) return;

    // Use saved goal from profile if available
    const goal = profile.goal || document.getElementById('display-goal')?.textContent?.toLowerCase() || '';

    if (goal.includes('lose'))      hintEl.textContent = '1,500 – 1,800 kcal';
    else if (goal.includes('gain')) hintEl.textContent = '2,500 – 3,000 kcal';
    else                            hintEl.textContent = '2,000 – 2,200 kcal';
}

// ── GOAL SETTINGS — localStorage bridge ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    restoreProfile();   // Restore profile fields on page load
    loadGoalSettings();
    updateCalHint();

    const goalSelect = document.getElementById('input-goal');
    if (goalSelect) {
        goalSelect.addEventListener('change', updateCalHint);
    }
});

function loadGoalSettings() {
    const saved = localStorage.getItem(GOAL_KEY);
    if (!saved) return;

    try {
        const goals = JSON.parse(saved);
        if (goals.steps)    document.getElementById('goalSteps').value    = goals.steps;
        if (goals.calories) document.getElementById('goalCalories').value = goals.calories;
        if (goals.weight)   document.getElementById('goalWeight').value   = goals.weight;
        if (goals.savedAt)  document.getElementById('goalLastSaved').textContent = 'Last saved: ' + goals.savedAt;
        showPreview(goals);
    } catch (e) {
        console.warn('Goal settings parse error', e);
    }
}

function saveGoalSettings() {
    const steps    = document.getElementById('goalSteps').value;
    const calories = document.getElementById('goalCalories').value;
    const weight   = document.getElementById('goalWeight').value;

    if (!steps && !calories && !weight) {
        alert('Please fill in at least one goal before saving.');
        return;
    }

    const now   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const goals = { steps, calories, weight, savedAt: now };

    localStorage.setItem(GOAL_KEY, JSON.stringify(goals));
    showPreview(goals);

    const badge = document.getElementById('goalsSavedBadge');
    badge.style.display = 'inline-block';
    document.getElementById('goalLastSaved').textContent = 'Last saved: ' + now;
    setTimeout(() => badge.style.display = 'none', 3000);

    // TODO: Phase 2 — POST /api/user/goals { steps, calories, weight }
}

function clearGoalSettings() {
    if (!confirm('Clear all saved goals?')) return;
    localStorage.removeItem(GOAL_KEY);
    document.getElementById('goalSteps').value    = '';
    document.getElementById('goalCalories').value = '';
    document.getElementById('goalWeight').value   = '';
    document.getElementById('goalLastSaved').textContent = '';
    document.getElementById('currentGoalsPreview').style.display = 'none';
    document.getElementById('goalsSavedBadge').style.display     = 'none';
}

function showPreview(goals) {
    const preview = document.getElementById('currentGoalsPreview');
    preview.style.display = 'block';
    document.getElementById('previewSteps').textContent    = goals.steps    ? parseInt(goals.steps).toLocaleString()    + ' steps' : '—';
    document.getElementById('previewCalories').textContent = goals.calories ? parseInt(goals.calories).toLocaleString() + ' kcal'  : '—';
    document.getElementById('previewWeight').textContent   = goals.weight   ? goals.weight + ' kg' : '—';
}