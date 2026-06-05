// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const MET_VALUES = {
    '🏃 Running':           8.0,
    '🚴 Cycling':           6.0,
    '🏊 Swimming':          6.0,
    '🏋️ Weight Training':  4.5,
    '🧘 Yoga':              2.5,
    '🚶 Walking':           3.5,
    '⚽ Football / Soccer': 7.0,
    '🏸 Badminton':         5.5,
    'Other':                4.0
};

const KCAL_PER_STEP = 0.04;

const BADGE_MAP = {
    '🏃 Running':           'badge-info',
    '🚴 Cycling':           'badge-success',
    '🏊 Swimming':          'badge-primary',
    '🏋️ Weight Training':  'badge-warning text-dark',
    '🧘 Yoga':              'badge-secondary',
    '🚶 Walking':           'badge-light text-dark',
    '⚽ Football / Soccer': 'badge-danger',
    '🏸 Badminton':         'badge-primary',
    'Other':                'badge-dark'
};

// ── STORAGE BOUNDARIES ────────────────────────────────────────────────────────

// Backend-backed activity logs
let activityLogs = [];
let activitiesLoadStatus = 'idle'; // idle | loading | success | error

// profile data (etc: weight) -> calculate calories
// goals data (etc: steps) -> check progress
// separation -> cleaner
let profileData = {};
let goalsData = {};

// Profile and goals now come from the profile backend endpoint.
const FITNESS_API_URL = 'http://localhost:3000/api/v1/fitness-tracker'
const PROFILE_API_URL = 'http://localhost:3000/api/v1/profile'

// ── BACKEND ACTIVITY API HELPERS ──────────────────────────────────────────────

// Purpose: Prevent crashing if there is nothing in response by API
// const data = await reponse.json()
// may crach if backend returns empty response
// response.json() may fail bcz there's ntg to parse
async function parseApiResponse(response) {
    const text = await response.text();// first read the response as plain text
    if (!text) return {};// if backend sent ntg, just return empty object instead of crashing

    try {
        return JSON.parse(text);// if there is object, convert into JS object
    } catch (error) {
        return {};
    }
}

// Purpose: Reduce amount of times of writing fetch()
// options = {} - allows the helper func to work for GET, POST & DELETE
async function requestFitnessApi(path, options = {}) {
    const response = await fetch(`${FITNESS_API_URL}${path}`, options);
    const data = await parseApiResponse(response);

    if (!response.ok) {
        // priority: data.detail -> data.msg -> fitness failed
        const error = new Error(data.detail || data.message || 'Fitness tracker request failed.');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

// Purpose: loads activity logs from backend
async function loadActivityLogs() {
    const data = await requestFitnessApi('/activities');// calls 
    activityLogs = Array.isArray(data.activities) ? data.activities : []; // data.activities is really an array ,store into activityLogs. Otherwise, use empty array
    return activityLogs;
}

async function loadActivities() {
    activitiesLoadStatus = 'loading';
    showActivitiesLoading();

    try {
        await loadActivityLogs();
        activitiesLoadStatus = 'success';

        renderActivityTable(activityLogs);
        updateQuickSummary();
    } catch (error) {
        activitiesLoadStatus = 'error';
        activityLogs = [];

        showActivitiesError();
        updateQuickSummary();
    }
}

async function createActivityLog(activity) {
    const createdActivity = await requestFitnessApi('/activities', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(activity)
    });

    activityLogs = [createdActivity, ...activityLogs];
    return createdActivity;
}

async function deleteActivityLog(id) {
    await requestFitnessApi(`/activities/${id}`, {
        method: 'DELETE'
    });

    activityLogs = activityLogs.filter(log => String(log.id) !== String(id));
}

function getActivityLogs() {
    return activityLogs;
}

async function loadProfile() {
    try {
        const response = await fetch(PROFILE_API_URL);
        // convert JSON into JS object
        // example: { user: { displayName: 'Xin Yu'}} -> data.user.displayName
        const data = await parseApiResponse(response);

        // check whether response succeeded (etc: 200 = OK, 201 = Created, ...)
        if (!response.ok) {
            throw new Error(data.detail || data.message || 'Profile request failed.');
        }

        // if user data exists, use it. otherwise, use empty object
        const user = data.user || {};
        const healthProfile = data.healthProfile || {};

        // mapper 
        // create front-end profile object & map to back-end
        profileData = {
            name: user.displayName || '',
            // frontend = name, back = user{ disyplayName: 'Xin Yu'}
            email: user.email || '',
            goal: user.goal || '',
            height: healthProfile.heightCm || '',
            // front = height, back = healthProfile{ weightKg: 60 }
            weight: healthProfile.weightKg || '',
            activityLevel: healthProfile.activityLevel || ''
        };

        // if backend return data -> store; othwise, use empty
        goalsData = data.goals || {};
    } catch (error) {
        console.warn('Could not load profile from backend.', error);
    }
}

function getProfile() {
    return profileData;
}

function getGoals() {
    return goalsData;
}


// ── CALORIE CALCULATORS ───────────────────────────────────────────────────────

function getWeightKg() {
    const profile = getProfile();
    return parseFloat(profile.weight) || 70;
}

function calcWorkoutCalories(type, durationMins) {
    const met = MET_VALUES[type];
    if (!met || !durationMins) return null;
    return Math.round(met * getWeightKg() * (durationMins / 60));
}

function calcStepsCalories(steps) {
    if (!steps || steps <= 0) return null;
    return Math.round(steps * KCAL_PER_STEP);
}

// ── BMR / TDEE ────────────────────────────────────────────────────────────────

function calcBMR(age, gender, weightKg, heightCm) {
    if (!age || !weightKg || !heightCm) return null;
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return gender === 'female' ? base - 161 : base + 5;
}

function calcDailyTarget(bmr, goal, workoutCalsBurned = 0) {
    if (!bmr) return null;
    const tdee = Math.round(bmr * 1.2);
    const adjustments = { lose: -500, maintain: 0, gain: 300 };
    const adj = adjustments[goal] ?? 0;
    return tdee + adj + workoutCalsBurned;
}

function getTodayWorkoutCals() {
    const today = new Date().toISOString().split('T')[0];
    return getActivityLogs()
        .filter(l => l.type === 'workout' && l.date === today && l.calories)
        .reduce((sum, l) => sum + l.calories, 0);
}

function getDailyCalorieTarget() {
    const profile = getProfile();
    const bmr = calcBMR(
        parseFloat(profile.age),
        profile.gender,
        parseFloat(profile.weight),
        parseFloat(profile.height)
    );
    if (!bmr) return null;
    return calcDailyTarget(bmr, profile.goal || 'maintain', getTodayWorkoutCals());
}

// ── AUTO-DISPLAY ──────────────────────────────────────────────────────────────

function updateWorkoutCalDisplay() {
    const type     = document.getElementById('activityType').value;
    const duration = parseFloat(document.getElementById('duration').value);
    const display  = document.getElementById('workoutCalDisplay');
    const cal      = calcWorkoutCalories(type, duration);
    display.textContent = cal !== null ? cal + ' kcal' : '—';
}

function updateStepsCalDisplay() {
    const steps   = parseFloat(document.getElementById('stepsCount').value);
    const display = document.getElementById('stepsCalDisplay');
    const cal     = calcStepsCalories(steps);
    display.textContent = cal !== null ? cal + ' kcal' : '—';
}

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function appendRow(id, date, typeBadge, duration, steps, calories, notes) {
    const tbody = document.getElementById('activityTableBody');
    tbody.querySelectorAll('.activity-state-row').forEach(row => row.remove());
    tbody.insertAdjacentHTML('afterbegin', `
        <tr data-id="${id}">
            <td>${date}</td>
            <td>${typeBadge}</td>
            <td>${duration}</td>
            <td>${steps}</td>
            <td>${calories}</td>
            <td class="text-muted small">${notes}</td>
            <td>
                <button class="btn btn-outline-primary btn-sm mr-1" onclick="editActivity(this)">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteActivity(this)">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>`);
    updateActivityCount();
}

function updateActivityCount() {
    const count = getActivityLogs().length;
    document.getElementById('activityCount').textContent = count + (count === 1 ? ' Record' : ' Records');
}

function showActivitiesLoading() {
    const tbody = document.getElementById('activityTableBody');
    tbody.innerHTML = `
        <tr class="activity-state-row">
            <td colspan="7" class="text-center text-muted py-4">
                Loading activities...
            </td>
        </tr>`;
    document.getElementById('activityCount').textContent = 'Loading...';
}

function showActivitiesError() {
    const tbody = document.getElementById('activityTableBody');
    tbody.innerHTML = `
        <tr class="activity-state-row">
            <td colspan="7" class="text-center text-muted py-4">
                <div class="mb-2">Could not load activities from the server.</div>
                <button type="button" class="btn btn-outline-primary btn-sm" onclick="loadActivities()">
                    Retry
                </button>
            </td>
        </tr>`;
    updateActivityCount();
}

function showActivitiesEmpty() {
    const tbody = document.getElementById('activityTableBody');
    tbody.innerHTML = `
        <tr class="activity-state-row">
            <td colspan="7" class="text-center text-muted py-4">
                No activity logged yet.
            </td>
        </tr>`;
    updateActivityCount();
}

// ── LOG WORKOUT ───────────────────────────────────────────────────────────────

async function logWorkout() {
    const type     = document.getElementById('activityType').value;
    const duration = document.getElementById('duration').value;
    const date     = document.getElementById('activityDate').value;
    const notes    = document.getElementById('notes').value || '—';

    if (!type || !duration || !date) {
        alert('Please fill in Activity Type, Duration, and Date.');
        return;
    }

    const calories   = calcWorkoutCalories(type, parseFloat(duration));
    const badgeClass = BADGE_MAP[type] || 'badge-secondary';
    const badge      = `<span class="badge ${badgeClass}">${type}</span>`;
    const id         = generateId();
    const loggedAt   = new Date().toISOString();

    const activity = {
        id,
        type:     'workout',
        activity: type,
        duration: parseFloat(duration),
        calories: calories ?? 0,
        date,
        notes,
        loggedAt
    };

    try {
        await createActivityLog(activity);
    } catch (error) {
        alert(error.message || 'Failed to save workout to database.');
        return;
    }

    appendRow(
        id,
        formatDate(date),
        badge,
        duration + ' min',
        '—',
        (calories !== null ? calories + ' kcal' : '—'),
        notes
    );

    clearWorkoutForm();
    updateQuickSummary();
}

function clearWorkoutForm() {
    document.getElementById('activityType').selectedIndex = 0;
    document.getElementById('duration').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('workoutCalDisplay').textContent = '—';
    document.getElementById('activityDate').value = new Date().toISOString().split('T')[0];
}

// ── LOG STEPS ─────────────────────────────────────────────────────────────────

async function logSteps() {
    const steps = document.getElementById('stepsCount').value;
    const date  = document.getElementById('stepsDate').value;

    if (!steps || !date) {
        alert('Please fill in Steps and Date.');
        return;
    }

    // Prevent duplicate steps for same date
    const existing = getActivityLogs().find(l => l.type === 'steps' && l.date === date);
    if (existing) {
        alert(`Steps already logged for ${formatDate(date)}. Delete the existing entry first to update.`);
        return;
    }

    const calories = calcStepsCalories(parseFloat(steps));
    const badge    = `<span class="badge badge-secondary">🚶 Steps Only</span>`;
    const id       = generateId();
    const loggedAt = new Date().toISOString();

    const activity = {
        id,
        type:     'steps',
        steps:    parseInt(steps),
        calories: calories ?? 0,
        date,
        loggedAt
    };

    try {
        await createActivityLog(activity);
    } catch (error) {
        if (error.status === 409) {
            alert(`Steps already logged for ${formatDate(date)}. Delete the existing entry first to update.`);
        } else {
            alert(error.message || 'Failed to save steps to database.');
        }
        return;
    }

    appendRow(
        id,
        formatDate(date),
        badge,
        '—',
        parseInt(steps).toLocaleString(),
        (calories !== null ? calories + ' kcal' : '—'),
        '—'
    );

    clearStepsForm();
    updateQuickSummary();
}

function clearStepsForm() {
    document.getElementById('stepsCount').value = '';
    document.getElementById('stepsCalDisplay').textContent = '—';
    document.getElementById('stepsDate').value = new Date().toISOString().split('T')[0];
}

// ── HISTORY ACTIONS ───────────────────────────────────────────────────────────

let _rowToDelete = null;

function deleteActivity(btn) {
    _rowToDelete = btn.closest('tr');
    $('#deleteModal').modal('show');
}

function editActivity(btn) {
    alert('Edit functionality coming in Phase 2.');
}

// ── QUICK SUMMARY CARDS ───────────────────────────────────────────────────────

function updateQuickSummary() {
    const logs     = getActivityLogs();
    const goals    = getGoals();
    const today    = new Date().toISOString().split('T')[0];
    const stepGoal = parseInt(goals.steps) || 10000;

    // Total workouts all time
    const totalWorkouts = logs.filter(l => l.type === 'workout').length;
    const twEl = document.getElementById('summaryTotalWorkouts');
    if (twEl) twEl.textContent = totalWorkouts;

    // Today's steps
    const todaySteps = logs
        .filter(l => l.type === 'steps' && l.date === today)
        .reduce((sum, l) => sum + (l.steps || 0), 0);
    const stepPct = Math.min(100, Math.round((todaySteps / stepGoal) * 100));
    const tsEl = document.getElementById('summaryTodaySteps');
    if (tsEl) tsEl.textContent = todaySteps.toLocaleString();
    const sgEl = document.getElementById('summaryStepsGoal');
    if (sgEl) sgEl.textContent = `Goal: ${stepGoal.toLocaleString()} steps`;
    const sbEl = document.getElementById('summaryStepsBar');
    if (sbEl) sbEl.style.width = stepPct + '%';

    // Calories burned today
    const todayWorkouts = logs.filter(l => l.type === 'workout' && l.date === today);
    const todayStepsLog = logs.filter(l => l.type === 'steps'   && l.date === today);
    const workoutCals   = todayWorkouts.reduce((sum, l) => sum + (l.calories || 0), 0);
    const stepsCals     = todayStepsLog.reduce((sum, l) => sum + (l.calories || 0), 0);
    const todayCals     = workoutCals + stepsCals;
    const cbEl = document.getElementById('summaryCalsBurned');
    if (cbEl) cbEl.textContent = todayCals + ' kcal';
    const stEl = document.getElementById('summarySessionsToday');
    if (stEl) {
        const parts = [];
        if (todayWorkouts.length) parts.push(`${todayWorkouts.length} workout session${todayWorkouts.length !== 1 ? 's' : ''}`);
        if (stepsCals) parts.push('steps');
        stEl.textContent = parts.length ? `From ${parts.join(' + ')} today` : 'No activity logged today';
    }
}

// ── RESTORE LOGS ON PAGE LOAD ─────────────────────────────────────────────────

function renderActivityTable(logs = getActivityLogs()) {
    document.getElementById('activityTableBody').innerHTML = '';

    if (logs.length === 0) {
        showActivitiesEmpty();
        return;
    }

    [...logs].sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt)).forEach(log => {
        if (log.type === 'workout') {
            const badgeClass = BADGE_MAP[log.activity] || 'badge-secondary';
            const badge      = `<span class="badge ${badgeClass}">${log.activity}</span>`;
            appendRow(
                log.id,
                formatDate(log.date),
                badge,
                log.duration + ' min',
                '—',
                log.calories ? log.calories + ' kcal' : '—',
                log.notes || '—'
            );
        } else if (log.type === 'steps') {
            const badge = `<span class="badge badge-secondary">🚶 Steps Only</span>`;
            appendRow(
                log.id,
                formatDate(log.date),
                badge,
                '—',
                log.steps ? log.steps.toLocaleString() : '—',
                log.calories ? log.calories + ' kcal' : '—',
                '—'
            );
        }
    });
    updateActivityCount();
}

// ── DASHBOARD INSIGHTS ────────────────────────────────────────────────────────

function getMostActiveHour() {
    const logs = getActivityLogs().filter(l => l.type === 'workout' && l.loggedAt);
    if (!logs.length) return null;
    const hourCounts = {};
    logs.forEach(l => {
        const hour = new Date(l.loggedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0];
    const h = parseInt(peakHour);
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    return `You are most active at ${label}`;
}

function getStepInsight() {
    const goals = getGoals();
    const goal  = parseInt(goals.steps);
    if (!goal) return null;
    const today = new Date().toISOString().split('T')[0];
    const todaySteps = getActivityLogs()
        .filter(l => l.type === 'steps' && l.date === today)
        .reduce((sum, l) => sum + (l.steps || 0), 0);
    const remaining = goal - todaySteps;
    if (remaining <= 0)   return "🎉 You've hit your step goal today!";
    if (remaining < 1000) return `You are close to your step goal — only ${remaining.toLocaleString()} steps left!`;
    return `You are ${remaining.toLocaleString()} steps away from your daily goal`;
}

function getWaterInsight() {
    const today = new Date().toISOString().split('T')[0];
    const waterGlasses = parseInt(localStorage.getItem('np_water_' + today) || '0', 10);
    const waterMax = 8;
    const remaining = waterMax - waterGlasses;
    if (remaining <= 0)  return "🎉 You've hit your water goal today!";
    if (remaining === 1) return "Just 1 more glass of water to hit your goal!";
    return `You need ${remaining} more glasses of water today 💧`;
}

function getWeekendWorkoutInsight() {
    const logs  = getActivityLogs().filter(l => l.type === 'workout');
    const today = new Date();
    const day   = today.getDay();
    if (day < 1 || day > 3) return null;
    const lastSun = new Date(today);
    lastSun.setDate(today.getDate() - day);
    const lastSat = new Date(lastSun);
    lastSat.setDate(lastSun.getDate() - 1);
    const satStr = lastSat.toISOString().split('T')[0];
    const sunStr = lastSun.toISOString().split('T')[0];
    const workedOut = logs.some(l => l.date === satStr || l.date === sunStr);
    if (!workedOut) return "You missed workouts this weekend — want to schedule one?";
    return null;
}

// ── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('activityDate').value = today;
    document.getElementById('stepsDate').value    = today;

    document.getElementById('activityType').addEventListener('change', updateWorkoutCalDisplay);
    document.getElementById('duration').addEventListener('input',  updateWorkoutCalDisplay);
    document.getElementById('stepsCount').addEventListener('input', updateStepsCalDisplay);

    await loadProfile();
    loadActivities();

    // Delete modal confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', async function () {
        if (_rowToDelete) {
            const id = _rowToDelete.dataset.id;

            try {
                await deleteActivityLog(id);
            } catch (error) {
                alert(error.message || 'Failed to delete activity from database.');
                return;
            }

            _rowToDelete.remove();
            updateActivityCount();
            updateQuickSummary();
            _rowToDelete = null;
        }
        $('#deleteModal').modal('hide');
    });
});
