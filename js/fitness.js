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

// ── LOCALSTORAGE KEYS ─────────────────────────────────────────────────────────

const LOGS_KEY    = 'fittrack_logs';
const PROFILE_KEY = 'fittrack_profile';
const GOALS_KEY   = 'fittrack_goals';

// ── LOCALSTORAGE HELPERS ──────────────────────────────────────────────────────

// localStorage stores strings, so we parse it back to an array
function getLogs() {
    try { return JSON.parse(localStorage.getItem(LOGS_KEY)) || []; } 
    catch (e) { return []; }
}

function saveLogs(logs) {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function addLog(entry) {
    const logs = getLogs();  // 1. read existing array from localStorage
    logs.push(entry);        // 2. add new entry to the array
    saveLogs(logs);          // 3. write the whole array back
}

function deleteLog(id) {
    saveLogs(getLogs().filter(l => l.id !== id));
}

function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch (e) { return {}; }
}

function getGoals() {
    try { return JSON.parse(localStorage.getItem(GOALS_KEY)) || {}; }
    catch (e) { return {}; }
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
    return getLogs()
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
    const count = document.getElementById('activityTableBody').querySelectorAll('tr').length;
    document.getElementById('activityCount').textContent = count + ' Records';
}

// ── LOG WORKOUT ───────────────────────────────────────────────────────────────

function logWorkout() {
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

    // Save to localStorage
    addLog({
        id,
        type:     'workout',
        activity: type,
        duration: parseFloat(duration),
        calories: calories ?? 0,
        date,
        notes,
        loggedAt
    });

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

function logSteps() {
    const steps = document.getElementById('stepsCount').value;
    const date  = document.getElementById('stepsDate').value;

    if (!steps || !date) {
        alert('Please fill in Steps and Date.');
        return;
    }

    // Prevent duplicate steps for same date
    const existing = getLogs().find(l => l.type === 'steps' && l.date === date);
    if (existing) {
        alert(`Steps already logged for ${formatDate(date)}. Delete the existing entry first to update.`);
        return;
    }

    const calories = calcStepsCalories(parseFloat(steps));
    const badge    = `<span class="badge badge-secondary">🚶 Steps Only</span>`;
    const id       = generateId();
    const loggedAt = new Date().toISOString();

    // Save to localStorage
    addLog({
        id,
        type:     'steps',
        steps:    parseInt(steps),
        calories: calories ?? 0,
        date,
        loggedAt
    });

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
    const logs     = getLogs();
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

function restoreLogs() {
    const logs = getLogs();
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
}

// ── DASHBOARD INSIGHTS ────────────────────────────────────────────────────────

function getMostActiveHour() {
    const logs = getLogs().filter(l => l.type === 'workout' && l.loggedAt);
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
    const todaySteps = getLogs()
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
    const logs  = getLogs().filter(l => l.type === 'workout');
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

document.addEventListener('DOMContentLoaded', function () {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('activityDate').value = today;
    document.getElementById('stepsDate').value    = today;

    document.getElementById('activityType').addEventListener('change', updateWorkoutCalDisplay);
    document.getElementById('duration').addEventListener('input',  updateWorkoutCalDisplay);
    document.getElementById('stepsCount').addEventListener('input', updateStepsCalDisplay);

    // Restore persisted logs on page load
    restoreLogs();
    updateQuickSummary();

    // Delete modal confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
        if (_rowToDelete) {
            const id = _rowToDelete.dataset.id;
            deleteLog(id);
            _rowToDelete.remove();
            updateActivityCount();
            updateQuickSummary();
            _rowToDelete = null;
        }
        $('#deleteModal').modal('hide');
    });
});