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

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setWidth(id, pct) {
    const element = document.getElementById(id);
    if (element) element.style.width = `${pct}%`;
}

// =========================================================================
// 2. REMINDERS
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

    return date.toLocaleString('en-MY', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

async function updateNextReminderCard() {
    const reminderTitle = document.getElementById('next-reminder-title');
    const reminderDesc = document.getElementById('next-reminder-desc');
    if (!reminderTitle || !reminderDesc) return;

    try {
        const reminders = await fetchDashboardReminders();
        const now = new Date();
        const nextReminder = reminders
            .filter((reminder) => !reminder.completed && new Date(reminder.scheduledFor) >= now)
            .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0] || null;

        if (nextReminder) {
            reminderTitle.textContent = nextReminder.title && nextReminder.title !== nextReminder.type
                ? `${nextReminder.type} - ${nextReminder.title}`
                : nextReminder.type;
            reminderDesc.textContent = formatDashboardReminderDate(nextReminder.scheduledFor);
            return;
        }

        reminderTitle.textContent = 'No upcoming reminder';
        reminderDesc.textContent = 'Add a reminder to see it here.';
    } catch (error) {
        reminderTitle.textContent = 'Reminders unavailable';
        reminderDesc.textContent = 'Start the backend to see your next reminder.';
    }
}

// =========================================================================
// 3. UI DRAWING HELPERS
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

function renderTrendChart(trend) {
    const paddedTrend = [...trend];
    while (paddedTrend.length < 7) {
        paddedTrend.push({ score: 0 });
    }

    const scores = paddedTrend.slice(0, 7).map((item) => Number(item.score) || 0);
    const xs = [20, 80, 140, 200, 260, 320, 380];

    const points = scores.map((score, index) => {
        const y = 95 - (score / 100) * 55;
        return `${xs[index]},${y}`;
    }).join(' ');

    const line = document.getElementById('trendLine');
    if (line) line.setAttribute('points', points);

    const dotsGroup = document.getElementById('trendDots');
    if (dotsGroup) {
        dotsGroup.innerHTML = '';
        scores.forEach((score, index) => {
            const y = 95 - (score / 100) * 55;
            dotsGroup.innerHTML += `
                <circle cx="${xs[index]}" cy="${y}" r="4"
                    fill="#fff" stroke="#1cc88a" stroke-width="3"></circle>
            `;
        });
    }
}

function setDashboardLoadingState() {
    setText('today-steps-count', '—');
    setText('stepsPct', '—');
    setWidth('stepsProgressBar', 0);
    setText('stepsRemaining', 'Loading your dashboard...');
    setText('steps-goal-display', '/ —');

    setText('dashboard-water-count', '—');
    setText('dashboard-water-badge', '—');
    setWidth('dashboard-water-bar', 0);
    setText('dashboard-water-text', 'Loading your hydration...');

    setText('today-calories-count', '—');
    setWidth('calProgressBar', 0);
    setText('calorieText', 'Loading your activity...');

    setText('steps-card-value', '—');
    setWidth('stepsCardBar', 0);
    setText('stepsCardLabel', 'Loading daily target...');
    setText('calories-card-value', '—');
    setText('workouts-card-value', '—');

    setText('today-health-score', '—');
    setText('weekly-health-score', '—');
    setText('dashboard-streak', 'Loading streak...');
    setText('dashboard-sessions', 'Loading weekly sessions...');

    const streakBadge = document.getElementById('streak-badge');
    if (streakBadge) {
        streakBadge.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Loading';
    }

    setRing('todayScoreRing', 0);
    setRing('weeklyScoreRing', 0);
    renderTrendChart([]);
}

function renderDashboardOverview(data, options = {}) {
    const goals = data.goals || { steps: 10000, calories: 2000, water: 8 };
    const today = data.today || { steps: 0, calories: 0, workouts: 0, water: 0, healthScore: 0 };
    const weekly = data.weekly || { sessions: 0, streak: 0, averageScore: 0, trend: [] };

    const stepGoal = Number(goals.steps) || 10000;
    const calGoal = Number(goals.calories) || 2000;
    const waterGoal = Number(goals.water) || 8;

    const todaySteps = Number(today.steps) || 0;
    const todayCal = Number(today.calories) || 0;
    const waterGlasses = Number(today.water) || 0;
    const todayWorkoutsCount = Number(today.workouts) || 0;
    const todayHealthScore = Number(today.healthScore) || 0;
    const weeklySessions = Number(weekly.sessions) || 0;
    const weeklyStreak = Number(weekly.streak) || 0;
    const weeklyAverageScore = Number(weekly.averageScore) || 0;

    const stepPct = Math.min(Math.round((todaySteps / stepGoal) * 100), 100);
    const stepRem = Math.max(0, stepGoal - todaySteps).toLocaleString();
    setText('today-steps-count', todaySteps.toLocaleString());
    setText('stepsPct', `${stepPct}%`);
    setWidth('stepsProgressBar', stepPct);
    setText('stepsRemaining', options.stepText || (stepRem === '0' ? 'Goal reached!' : `${stepRem} steps to reach your goal`));
    setText('steps-goal-display', `/ ${stepGoal.toLocaleString()}`);

    const waterPct = Math.min(Math.round((waterGlasses / waterGoal) * 100), 100);
    const waterRem = Math.max(0, waterGoal - waterGlasses);
    setText('dashboard-water-count', waterGlasses.toLocaleString());
    setText('dashboard-water-badge', `${waterPct}%`);
    setWidth('dashboard-water-bar', waterPct);
    setText('dashboard-water-text', options.waterText || (waterRem === 0 ? 'Goal reached!' : `${waterRem} more glasses to go`));

    const calPct = Math.min(Math.round((todayCal / calGoal) * 100), 100);
    setText('today-calories-count', todayCal.toLocaleString());
    setWidth('calProgressBar', calPct);
    setText('calorieText', options.calorieText || (todayWorkoutsCount > 0 ? `From ${todayWorkoutsCount} workout session(s) today` : 'Active calories recorded'));

    setText('steps-card-value', todaySteps.toLocaleString());
    setWidth('stepsCardBar', stepPct);
    setText('stepsCardLabel', stepPct >= 100 ? 'Daily step goal achieved' : `${stepPct}% of daily target`);
    setText('calories-card-value', todayCal.toLocaleString());
    setText('workouts-card-value', weeklySessions.toLocaleString());

    setText('today-health-score', `${todayHealthScore}%`);
    setText('weekly-health-score', `${weeklyAverageScore}%`);
    setText('dashboard-streak', options.streakText || `${weeklyStreak} day streak`);
    setText('dashboard-sessions', options.sessionsText || `${weeklySessions} sessions this week`);

    const streakBadge = document.getElementById('streak-badge');
    if (streakBadge) {
        streakBadge.innerHTML = `<i class="fas fa-fire mr-1"></i> ${options.streakBadgeText || `${weeklyStreak}-Day Streak`}`;
    }

    setRing('todayScoreRing', todayHealthScore);
    setRing('weeklyScoreRing', weeklyAverageScore);
    renderTrendChart(weekly.trend || []);
}

function setDashboardEmptyState() {
    renderDashboardOverview(
        {
            goals: { steps: 10000, calories: 2000, water: 8 },
            today: { steps: 0, calories: 0, workouts: 0, water: 0, healthScore: 0 },
            weekly: { sessions: 0, streak: 0, averageScore: 0, trend: [] },
        },
        {
            streakText: 'No streak yet',
            sessionsText: 'No sessions this week',
            streakBadgeText: 'New account',
            stepText: 'Log your first steps to start tracking progress.',
            waterText: 'Log your water intake to track hydration.',
            calorieText: 'Log your first workout or steps to see calories here.',
        }
    );
}

// =========================================================================
// 4. MAIN
// =========================================================================

document.addEventListener('DOMContentLoaded', async function () {
    setDashboardLoadingState();
    updateNextReminderCard();

    try {
        const data = await window.DashboardService.getOverview();
        renderDashboardOverview(data);
    } catch (error) {
        console.warn('Dashboard could not load:', error.message);
        setDashboardEmptyState();
    }
});
