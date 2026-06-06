// =========================================================================
// 1. GLOBAL HELPERS & TIMEZONE SAFETY
// =========================================================================

// Sets the date text at the top of the dashboard
document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
});

function getLocalTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDashboardLogs() {
    try { return JSON.parse(localStorage.getItem('fittrack_logs')) || []; }
    catch (e) { return []; }
}

function getLast7Dates() {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return arr;
}

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
// 2. UI DRAWING HELPERS (Health Rings & Trend Chart)
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

function renderTrendChart(logs) {
    // 1. Find the exact date of Monday for the CURRENT week
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay() === 0 ? 7 : todayDate.getDay();
    const monday = new Date(todayDate);
    monday.setDate(todayDate.getDate() - (dayOfWeek - 1));

    // 2. Create an array of exactly Monday -> Sunday
    const thisWeekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);

        thisWeekDates.push(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        );
    }

    // calculate HEALTH SCORE for each day
    const scores = thisWeekDates.map(date => {

        const steps = logs
            .filter(l => l.type === 'steps' && l.date === date)
            .reduce((sum, l) => sum + (Number(l.steps) || 0), 0);

        const calories = logs
            .filter(l => l.date === date)
            .reduce((sum, l) => sum + (Number(l.calories) || 0), 0);

        const workouts = logs
            .filter(l => l.type === 'workout' && l.date === date)
            .length;

        const water = parseInt(localStorage.getItem('np_water_' + date) || '0', 10);

        const stepScore = Math.min((steps / 10000) * 100, 100);
        const waterScore = Math.min((water / 8) * 100, 100);
        const calorieScore = Math.min((calories / 500) * 100, 100);
        const workoutScore = workouts > 0 ? 100 : 0;

        return Math.round(
            stepScore * 0.35 +
            waterScore * 0.20 +
            calorieScore * 0.20 +
            workoutScore * 0.25
        );
    });

    const xs = [20, 80, 140, 200, 260, 320, 380];

    const points = scores.map((score, i) => {
        const y = 95 - (score / 100) * 55;
        return `${xs[i]},${y}`;
    }).join(' ');

    const line = document.getElementById('trendLine');

    if (line) {
        line.setAttribute('points', points);
    }

    const dotsGroup = document.getElementById('trendDots');

    if (dotsGroup) {
        dotsGroup.innerHTML = '';

        scores.forEach((score, i) => {

            const y = 95 - (score / 100) * 55;

            dotsGroup.innerHTML += `
                <circle 
                    cx="${xs[i]}" 
                    cy="${y}" 
                    r="4"
                    fill="#fff"
                    stroke="#1cc88a"
                    stroke-width="3">
                </circle>
            `;
        });
    }
}

// =========================================================================
// 3. MAIN DASHBOARD LOGIC (Progress, Streaks, Scores)
// =========================================================================

document.addEventListener('DOMContentLoaded', function () {
    const goals = JSON.parse(localStorage.getItem('fittrack_goals') || '{}');
    const logs = getDashboardLogs();
    const todayStr = getLocalTodayDate();

    // --- A. FETCH CORE DATA ---
    const stepGoal = parseInt(goals.steps) || 10000;
    const calGoal = parseInt(goals.calories) || 2000;
    const waterGoal = parseInt(goals.water) || 8;

    const todaySteps = logs.filter(l => l.type === 'steps' && l.date === todayStr).reduce((sum, l) => sum + (l.steps || 0), 0);
    const todayWorkouts = logs.filter(l => l.type === 'workout' && l.date === todayStr);
    const todayCal = logs.filter(l => l.date === todayStr).reduce((sum, l) => sum + (l.calories || 0), 0);
    const waterGlasses = parseInt(localStorage.getItem('np_water_' + todayStr) || '0', 10);

    // --- B. STREAKS & WEEKLY SESSIONS ---
    const workoutLogs = logs.filter(l => l.type === 'workout');
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay() === 0 ? 7 : todayDate.getDay(); // Treat Sunday (0) as day 7

    const monday = new Date(todayDate);
    monday.setDate(todayDate.getDate() - (dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weeklySessions = workoutLogs.filter(l => {
        const logDate = new Date(l.date);
        return logDate >= monday && logDate <= sunday;
    }).length;

    let currentStreak = 0;
    if (workoutLogs.length > 0) {
        const uniqueDates = [...new Set(workoutLogs.map(l => l.date))].sort((a, b) => new Date(b) - new Date(a));

        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

        if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
            currentStreak = 1;
            let checkDate = new Date(uniqueDates[0]);

            for (let i = 1; i < uniqueDates.length; i++) {
                const diffDays = Math.ceil(Math.abs(checkDate - new Date(uniqueDates[i])) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    currentStreak++;
                    checkDate = new Date(uniqueDates[i]);
                } else break;
            }
        }
    }

    // --- C. HEALTH SCORES ---
    const stepScore = Math.min((todaySteps / stepGoal) * 100, 100);
    const waterScore = Math.min((waterGlasses / waterGoal) * 100, 100);
    const calorieScore = Math.min((todayCal / 500) * 100, 100); // Base target of 500 active cals
    const workoutScore = todayWorkouts.length > 0 ? 100 : 0;
    const dailyHealthScore = Math.round(stepScore * 0.35 + waterScore * 0.20 + calorieScore * 0.20 + workoutScore * 0.25);

    const last7 = getLast7Dates();
    let totalScore = 0;
    last7.forEach(date => {
        const dStep = logs.filter(l => l.date === date).reduce((sum, l) => sum + (Number(l.steps) || 0), 0);
        const dCal = logs.filter(l => l.date === date).reduce((sum, l) => sum + (Number(l.calories) || 0), 0);
        const dWork = logs.filter(l => l.type === 'workout' && l.date === date).length;
        const dWater = parseInt(localStorage.getItem('np_water_' + date) || '0', 10);

        const dScStep = Math.min((dStep / stepGoal) * 100, 100);
        const dScWater = Math.min((dWater / waterGoal) * 100, 100);
        const dScCal = Math.min((dCal / 500) * 100, 100);
        const dScWork = dWork > 0 ? 100 : 0;

        totalScore += Math.round(dScStep * 0.35 + dScWater * 0.20 + dScCal * 0.20 + dScWork * 0.25);
    });
    const weeklyHealthScore = Math.round(totalScore / 7);

    // --- D. UPDATE DOM UI ELEMENTS ---

    // 1. Progress Bars
    // steps
    const stepPct = Math.min(Math.round((todaySteps / stepGoal) * 100), 100);
    const stepRem = Math.max(0, stepGoal - todaySteps).toLocaleString();
    if (document.getElementById('today-steps-count')) document.getElementById('today-steps-count').textContent = todaySteps.toLocaleString();
    if (document.getElementById('stepsPct')) document.getElementById('stepsPct').textContent = `${stepPct}%`;
    if (document.getElementById('stepsProgressBar')) document.getElementById('stepsProgressBar').style.width = `${stepPct}%`;
    if (document.getElementById('stepsRemaining')) document.getElementById('stepsRemaining').textContent = stepRem === "0" ? "Goal reached! 🎉" : `${stepRem} steps to reach your goal`;
    if (document.getElementById('steps-goal-display')) document.getElementById('steps-goal-display').textContent = '/ ' + stepGoal.toLocaleString();

    // water
    const waterPct = Math.min(Math.round((waterGlasses / waterGoal) * 100), 100);
    const waterRem = Math.max(0, waterGoal - waterGlasses);
    if (document.getElementById('dashboard-water-count')) document.getElementById('dashboard-water-count').textContent = waterGlasses;
    if (document.getElementById('dashboard-water-badge')) document.getElementById('dashboard-water-badge').textContent = `${waterPct}%`;
    if (document.getElementById('dashboard-water-bar')) document.getElementById('dashboard-water-bar').style.width = `${waterPct}%`;
    if (document.getElementById('dashboard-water-text')) document.getElementById('dashboard-water-text').textContent = waterRem === 0 ? "Goal reached! 💧" : `${waterRem} more glasses to go`;

    // calories
    const calPct = Math.min(Math.round((todayCal / calGoal) * 100), 100);
    if (document.getElementById('today-calories-count')) document.getElementById('today-calories-count').textContent = todayCal.toLocaleString();
    if (document.getElementById('calProgressBar')) document.getElementById('calProgressBar').style.width = `${calPct}%`;
    if (document.getElementById('calorieText')) document.getElementById('calorieText').textContent = todayWorkouts.length > 0 ? `From ${todayWorkouts.length} workout session(s) today` : `Active calories recorded`;

    // Extra dashboard stat cards
    const stepsCardValue = document.getElementById('steps-card-value');
    if (stepsCardValue) stepsCardValue.textContent = todaySteps.toLocaleString();

    const stepsCardBar = document.getElementById('stepsCardBar');
    if (stepsCardBar) stepsCardBar.style.width = `${stepPct}%`;

    const stepsCardLabel = document.getElementById('stepsCardLabel');
    if (stepsCardLabel) {
        stepsCardLabel.textContent = stepPct >= 100
            ? "Daily step goal achieved"
            : `${stepPct}% of daily target`;
    }

    const caloriesCardValue = document.getElementById('calories-card-value');
    if (caloriesCardValue) caloriesCardValue.textContent = todayCal.toLocaleString();

    const workoutsCardValue = document.getElementById('workouts-card-value');
    if (workoutsCardValue) workoutsCardValue.textContent = weeklySessions;

    const goalProgressValue = document.getElementById('goal-progress-value');
    if (goalProgressValue) goalProgressValue.textContent = `${dailyHealthScore}%`;

    const goalProgressBar = document.getElementById('goal-progress-bar');
    if (goalProgressBar) goalProgressBar.style.width = `${dailyHealthScore}%`;

    // 2. Streaks & Sessions
    const streakBadge = document.getElementById('streak-badge');
    if (streakBadge) {
        if (currentStreak > 0) {
            streakBadge.innerHTML = `<i class="fas fa-fire mr-1"></i> ${currentStreak}-Day Streak 🔥`;
            streakBadge.className = "badge badge-success px-3 py-2 mb-1 d-inline-block";
        } else {
            streakBadge.innerHTML = `<i class="fas fa-fire-alt mr-1"></i> No active streak`;
            streakBadge.className = "badge badge-secondary px-3 py-2 mb-1 d-inline-block";
        }
    }
    if (document.getElementById('weekly-sessions-count')) document.getElementById('weekly-sessions-count').textContent = weeklySessions;
    if (document.getElementById('dashboard-streak')) document.getElementById('dashboard-streak').textContent = `${currentStreak} day streak 🔥`;
    if (document.getElementById('dashboard-sessions')) document.getElementById('dashboard-sessions').textContent = `${weeklySessions} sessions this week`;

    // 3. Health Scores & Trend Chart
    if (document.getElementById('today-health-score')) document.getElementById('today-health-score').textContent = `${dailyHealthScore}%`;
    if (document.getElementById('weekly-health-score')) document.getElementById('weekly-health-score').textContent = `${weeklyHealthScore}%`;

    setRing('todayScoreRing', dailyHealthScore);
    setRing('weeklyScoreRing', weeklyHealthScore);
    renderTrendChart(logs);


    // 4. Update "Your Patterns" Text
    if (document.getElementById('pattern-step')) {
        document.getElementById('pattern-step').textContent = todaySteps >= stepGoal
            ? "Great job! You reached your daily step goal."
            : "You may need a short walk to reach your step target.";
    }
    if (document.getElementById('pattern-water')) {
        document.getElementById('pattern-water').textContent = waterGlasses >= waterGoal
            ? "Excellent! You met your water intake goal."
            : "Your water intake is below target today.";
    }

    // 5. Next Reminder
    updateNextReminderCard();
});
