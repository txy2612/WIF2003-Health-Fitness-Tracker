// =========================================================================
// 1. GLOBAL HELPERS
// =========================================================================

document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
});

const DASHBOARD_NOTIFICATION_API_URL = 'http://localhost:3000/api/v1/notification';

async function parseDashboardApiResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (error) {
        return {};
    }
}

// =========================================================================
// 2. REMINDERS (already backend-wired)
// =========================================================================

async function fetchDashboardReminders() {
    const token = window.AuthService?.getToken?.() || localStorage.getItem('fittrack_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(DASHBOARD_NOTIFICATION_API_URL, { headers });
    const data = await parseDashboardApiResponse(response);

    if (!response.ok) {
        throw new Error(data.detail || data.message || 'Could not load reminders.');
    }

    return Array.isArray(data) ? data : [];
}

function formatDashboardReminderDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
}

async function updateNextReminderCard() {
    const reminderTitle = document.getElementById('next-reminder-title');
    const reminderDesc = document.getElementById('next-reminder-desc');
    if (!reminderTitle || !reminderDesc) return;

    try {
        const reminders = await fetchDashboardReminders();
        const now = new Date();
        const nextReminder = reminders
            .filter(reminder => !reminder.completed && new Date(reminder.scheduledFor) >= now)
            .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0] || null;

        if (nextReminder) {
            reminderTitle.textContent = nextReminder.title && nextReminder.title !== nextReminder.type
                ? `${nextReminder.type} - ${nextReminder.title}`
                : nextReminder.type;
            reminderDesc.textContent = formatDashboardReminderDate(nextReminder.scheduledFor);
        } else {
            reminderTitle.textContent = 'No upcoming reminder';
            reminderDesc.textContent = 'Add a reminder to see it here.';
        }
    } catch (error) {
        reminderTitle.textContent = 'Reminders unavailable';
        reminderDesc.textContent = 'Start the backend to see your next reminder.';
    }
}

// =========================================================================
// 3. UI DRAWING HELPERS (rings & trend chart)
// =========================================================================

function setRing(id, percent) {
    const ring = document.getElementById(id);
    if (!ring) return;
    ring.style.background =
        `conic-gradient(
            #1cc88a 0% ${Math.min(percent * 0.35, percent)}%,
            #36b9cc ${Math.min(percent * 0.35, percent)}% ${Math.min(percent * 0.70, percent)}%,
            #f6c23e ${Math.min(percent * 0.70, percent)}% ${percent}%,
            #eaecf4 ${percent}% 100%
        )`;
}

// Draws the weekly trend from an array of { date, score } (Mon..Sun).
function renderTrendChart(trend) {
    const scores = trend.map(t => t.score);
    const xs = [20, 80, 140, 200, 260, 320, 380];

    const points = scores.map((score, i) => {
        const y = 95 - (score / 100) * 55;
        return `${xs[i]},${y}`;
    }).join(' ');

    const line = document.getElementById('trendLine');
    if (line) line.setAttribute('points', points);

    const dotsGroup = document.getElementById('trendDots');
    if (dotsGroup) {
        dotsGroup.innerHTML = '';
        scores.forEach((score, i) => {
            const y = 95 - (score / 100) * 55;
            dotsGroup.innerHTML += `
                <circle cx="${xs[i]}" cy="${y}" r="4"
                    fill="#fff" stroke="#1cc88a" stroke-width="3"></circle>
            `;
        });
    }
}

// =========================================================================
// 4. MAIN — load everything from the backend
// =========================================================================

document.addEventListener('DOMContentLoaded', async function () {
    // Reminders (independent call)
    updateNextReminderCard();

    let data;
    try {
        data = await window.DashboardService.getOverview();
    } catch (error) {
        // Not logged in or server down — leave the page in its default state.
        console.warn('Dashboard could not load:', error.message);
        return;
    }

    const goals = data.goals || { steps: 10000, calories: 2000, water: 8 };
    const today = data.today || { steps: 0, calories: 0, workouts: 0, water: 0, healthScore: 0 };
    const weekly = data.weekly || { sessions: 0, streak: 0, averageScore: 0, trend: [] };

    const stepGoal = goals.steps;
    const calGoal = goals.calories;
    const waterGoal = goals.water;

    const todaySteps = today.steps;
    const todayCal = today.calories;
    const waterGlasses = today.water;
    const todayWorkoutsCount = today.workouts;

    // --- Progress bars ---

    // steps
    const stepPct = Math.min(Math.round((todaySteps / stepGoal) * 100), 100);
    const stepRem = Math.max(0, stepGoal - todaySteps).toLocaleString();
    setText('today-steps-count', todaySteps.toLocaleString());
    setText('stepsPct', `${stepPct}%`);
    setWidth('stepsProgressBar', stepPct);
    setText('stepsRemaining', stepRem === "0" ? "Goal reached! 🎉" : `${stepRem} steps to reach your goal`);
    setText('steps-goal-display', '/ ' + stepGoal.toLocaleString());

    // water
    const waterPct = Math.min(Math.round((waterGlasses / waterGoal) * 100), 100);
    const waterRem = Math.max(0, waterGoal - waterGlasses);
    setText('dashboard-water-count', waterGlasses);
    setText('dashboard-water-badge', `${waterPct}%`);
    setWidth('dashboard-water-bar', waterPct);
    setText('dashboard-water-text', waterRem === 0 ? "Goal reached! 💧" : `${waterRem} more glasses to go`);

    // calories
    const calPct = Math.min(Math.round((todayCal / calGoal) * 100), 100);
    setText('today-calories-count', todayCal.toLocaleString());
    setWidth('calProgressBar', calPct);
    setText('calorieText', todayWorkoutsCount > 0 ? `From ${todayWorkoutsCount} workout session(s) today` : `Active calories recorded`);

    // --- Stat cards ---
    setText('steps-card-value', todaySteps.toLocaleString());
    setWidth('stepsCardBar', stepPct);
    setText('stepsCardLabel', stepPct >= 100 ? "Daily step goal achieved" : `${stepPct}% of daily target`);
    setText('calories-card-value', todayCal.toLocaleString());
    setText('workouts-card-value', weekly.sessions);

    // --- Health scores, streak, rings, trend ---
    setText('today-health-score', `${today.healthScore}%`);
    setText('weekly-health-score', `${weekly.averageScore}%`);
    setText('dashboard-streak', `${weekly.streak} day streak 🔥`);
    setText('dashboard-sessions', `${weekly.sessions} sessions this week`);

    // top "streak badge" pill
    const streakBadge = document.getElementById('streak-badge');
    if (streakBadge) {
        streakBadge.innerHTML = `<i class="fas fa-fire mr-1"></i> ${weekly.streak}-Day Streak 🔥`;
    }

    setRing('todayScoreRing', today.healthScore);
    setRing('weeklyScoreRing', weekly.averageScore);

    renderTrendChart(weekly.trend || []);
});

// small DOM helpers (no-op if element missing)
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}
function setWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${pct}%`;
}