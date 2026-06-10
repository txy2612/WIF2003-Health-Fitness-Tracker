// ══════════════════════════════════════════════════════════════════
//  PROGRESS CHARTS WIRING
//  Requires: C_BLUE, C_GREEN etc defined in progress-charts.js
// ══════════════════════════════════════════════════════════════════
// ADD THIS ↓
const API_BASE = 'http://localhost:3000/api/v1'
const USER_ID  = localStorage.getItem('userId') || 'test-user'
// ↑ Change 'test-user' to the real user ID once auth is connected
// ── NAVIGATION STATE ──────────────────────────────────────────────
let weekOffset  = 0;
let monthOffset = 0;

// ── HELPERS ───────────────────────────────────────────────────────

function _getLogs() {
    return JSON.parse(localStorage.getItem('fittrack_logs') || '[]');
}
function _getGoals() {
    return JSON.parse(localStorage.getItem('fittrack_goals') || '{}');
}
function _getProfile() {
    return JSON.parse(localStorage.getItem('fittrack_profile') || '{}');
}

// use user's local time-zone instead of UTC time
// show only date
function _toLocalDateString(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function _getWeekDates(offset) {
    const today  = new Date();
    const day    = today.getDay() === 0 ? 7 : today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day - 1) + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return _toLocalDateString(d);
    });
}

function _getMonthDates(offset) {
    const today = new Date();
    const year  = today.getFullYear();
    const month = today.getMonth() + offset;
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const dates = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
        dates.push(_toLocalDateString(d));
    }
    return dates;
}

function _formatWeekLabel(dates) {
    const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `${fmt(dates[0])} – ${fmt(dates[6])}`;
}

function _formatMonthLabel(offset) {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function _stepsOnDates(logs, dates) {
    return dates.map(date =>
        logs.filter(l => l.type === 'steps' && l.date === date)
            .reduce((sum, l) => sum + (l.steps || 0), 0)
    );
}

function _workoutsOnDates(logs, dates) {
    return dates.map(date =>
        logs.filter(l => l.type === 'workout' && l.date === date).length
    );
}

function _avgNonZero(arr) {
    const vals = arr.filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

function _getCurrentStreak(rows = []) {
    const logs = rows.filter(r => r.workouts && r.workouts.length > 0).map(r => ({ date: r.date }));
    if (!logs.length) return 0;
    const uniqueDates = [...new Set(logs.map(l => l.date))].sort().reverse();
    let streak = 0;
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 1);
    for (const date of uniqueDates) {
        if (date === _toLocalDateString(cursor)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else break;
    }
    const todayStr = _toLocalDateString(new Date());
    if (uniqueDates.includes(todayStr)) streak++;
    return streak;
}

function _getLongestStreak(rows = []) {
    const logs = rows.filter(r => r.workouts && r.workouts.length > 0).map(r => ({ date: r.date }));
    const uniqueDates = [...new Set(logs.map(l => l.date))].sort();
    let longest = 1, current = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
        const diff = (new Date(uniqueDates[i]) - new Date(uniqueDates[i-1])) / 86400000;
        if (diff === 1) { current++; longest = Math.max(longest, current); }
        else current = 1;
    }
    return longest;
}

function _getConsistencyWeeks() {
    let weeks = 0;
    for (let w = 0; w >= -11; w--) {
        const dates = _getWeekDates(w);
        const logs  = _getLogs().filter(l => l.type === 'workout');
        if (logs.some(l => dates.includes(l.date))) weeks++;
        else break;
    }
    return weeks;
}

// ── CHART INSTANCES ───────────────────────────────────────────────
let _wStepsChart    = null;
let _wSessionsChart = null;
let _wPieChart      = null;
let _mStepsChart    = null;
let _mSessionsChart = null;

// ── WEEKLY ────────────────────────────────────────────────────────

async function buildWeekly() {            // ← add async
    const goals    = _getGoals();
    const stepGoal = parseInt(goals.steps) || 10000;
    const DAYS     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 
    // BEFORE: const logs = _getLogs() then _getWeekDates() + _stepsOnDates() etc.
    // AFTER:  one fetch replaces all of that
    let dates, rows, prevRows
    try {
       const res  = await fetch(`${API_BASE}/progress-charts/weekly?offset=${weekOffset}`, {
            headers: { Authorization: `Bearer ${window.AuthService.getToken()}` }
        })
        const data = await res.json()
        dates    = data.dates
        rows     = data.rows
        prevRows = data.prevRows
    } catch (err) {
        console.warn('API failed, falling back to localStorage', err)
        // offline fallback — keeps working if server is down
        const logs = _getLogs()
        dates    = _getWeekDates(weekOffset)
        const prevDates = _getWeekDates(weekOffset - 1)
        rows = dates.map(date => {
            const dayLogs = logs.filter(l => l.date === date)
            return {
                date,
                steps:    dayLogs.filter(l => l.type === 'steps').reduce((s, l) => s + (l.steps||0), 0),
                calories: dayLogs.reduce((s, l) => s + (l.calories||0), 0),
                workouts: dayLogs.filter(l => l.type === 'workout').map(l => ({ activity: l.activity, duration: l.duration, calories: l.calories })),
            }
        })
        prevRows = prevDates.map(date => {
            const dayLogs = logs.filter(l => l.date === date)
            return {
                date,
                steps:    dayLogs.filter(l => l.type === 'steps').reduce((s, l) => s + (l.steps||0), 0),
                workouts: dayLogs.filter(l => l.type === 'workout').map(l => ({ activity: l.activity, duration: l.duration, calories: l.calories })),
            }
        })
    }

    document.getElementById('weeklyRangeLabel').textContent = _formatWeekLabel(dates);
    document.getElementById('weekNextBtn').disabled = weekOffset >= 0;

    // Steps chart
    const stepsData  = rows.map(r => r.steps);
    const maxSteps   = Math.max(...stepsData, 0);
    const hasSteps   = stepsData.some(v => v > 0);

    document.getElementById('weeklyStepsEmpty').classList.toggle('d-none', hasSteps);
    document.getElementById('weeklyStepsPeak').textContent = maxSteps > 0
        ? `Peak: ${maxSteps.toLocaleString()} steps` : '';

    const stepsColors = stepsData.map(v =>
        v === maxSteps && maxSteps > 0 ? C_BLUE : 'rgba(78,115,223,0.35)'
    );

    if (_wStepsChart) _wStepsChart.destroy();
    _wStepsChart = new Chart(document.getElementById('weeklyStepsChart'), {
        type: 'bar',
        data: {
            labels: DAYS,
            datasets: [{
                label: 'Steps',
                data: stepsData,
                backgroundColor: stepsColors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: { callbacks: { label: ctx => ` ${ctx.yLabel.toLocaleString()} steps` } },
            scales: {
                xAxes: [{ gridLines: { display: false } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString() } }]
            }
        }
    });

    // Sessions chart
    const sessionsData = rows.map(r => r.workouts ? r.workouts.length : 0);
    const hasSessions = sessionsData.some(v => v > 0);
    const maxSessions = Math.max(...sessionsData, 0);

    document.getElementById('weeklySessionsEmpty').classList.toggle('d-none', hasSessions);

    const sessColors = sessionsData.map(v =>
        v === maxSessions && maxSessions > 0 ? C_GREEN : 'rgba(28,200,138,0.35)'
    );

    if (_wSessionsChart) _wSessionsChart.destroy();
    _wSessionsChart = new Chart(document.getElementById('weeklySessionsChart'), {
        type: 'bar',
        data: {
            labels: DAYS,
            datasets: [{
                label: 'Sessions',
                data: sessionsData,
                backgroundColor: sessColors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: { callbacks: { label: ctx => ` ${ctx.yLabel} session${ctx.yLabel !== 1 ? 's' : ''}` } },
            scales: {
                xAxes: [{ gridLines: { display: false } }],
                yAxes: [{ ticks: { beginAtZero: true, stepSize: 1 } }]
            }
        }
    });

    // This Week insights
    const thisAvgSteps = _avgNonZero(stepsData);
    const prevStepsData = prevRows.map(r => r.steps);
    const prevAvgSteps = _avgNonZero(prevStepsData);
    const stepsDiff = thisAvgSteps - prevAvgSteps;

    const wAvgStepsEl = document.getElementById('wAvgSteps');
    if (wAvgStepsEl) wAvgStepsEl.textContent = thisAvgSteps.toLocaleString() + ' steps/day';
    const wAvgVsEl = document.getElementById('wAvgStepsVsLast');
    if (wAvgVsEl) {
        wAvgVsEl.textContent = prevAvgSteps === 0
            ? 'No data from previous week'
            : `${stepsDiff >= 0 ? '↑' : '↓'} ${Math.abs(stepsDiff).toLocaleString()} vs last week's ${prevAvgSteps.toLocaleString()}`;
    }

    const thisWeekWorkouts = rows.flatMap(r => r.workouts || []);
    const prevWeekWorkouts = prevRows.flatMap(r => r.workouts || []);
    const sessionsDiff = thisWeekWorkouts.length - prevWeekWorkouts.length;

    const wSessionsEl = document.getElementById('wSessions');
    if (wSessionsEl) wSessionsEl.textContent = thisWeekWorkouts.length + ' sessions';
    const wSessionsVsEl = document.getElementById('wSessionsVsLast');
    if (wSessionsVsEl) {
        wSessionsVsEl.textContent = prevWeekWorkouts.length === 0
            ? 'No data from previous week'
            : `${sessionsDiff >= 0 ? '↑' : '↓'} ${Math.abs(sessionsDiff)} vs last week's ${prevWeekWorkouts.length}`;
    }

    const activeDays = rows.filter(r => r.steps > 0 || (r.workouts && r.workouts.length > 0)).length;
    const wActiveDaysEl = document.getElementById('wActiveDays');
    if (wActiveDaysEl) wActiveDaysEl.textContent = activeDays + '/7 days';

    // Consistency insights
    const allRows       = [...prevRows, ...rows];
    const currentStreak = _getCurrentStreak(allRows);
    const longestStreak = _getLongestStreak(allRows);
    const consistWeeks = _getConsistencyWeeks();

    const wStreakEl = document.getElementById('wStreak');
    if (wStreakEl) wStreakEl.textContent = currentStreak + ' day' + (currentStreak !== 1 ? 's' : '') + (currentStreak > 0 ? ' 🔥' : '');
    const wStreakLongestEl = document.getElementById('wStreakLongest');
    if (wStreakLongestEl) wStreakLongestEl.textContent = `Longest ever: ${longestStreak} days`;

    const wHabitEl = document.getElementById('wHabitStability');
    if (wHabitEl) {
        if (consistWeeks >= 4) wHabitEl.textContent = `You maintained workouts for ${consistWeeks} consecutive weeks 💪`;
        else if (consistWeeks >= 2) wHabitEl.textContent = `${consistWeeks}-week consistency streak 🔥`;
        else if (consistWeeks === 1) wHabitEl.textContent = 'Keep it up — build your weekly streak!';
        else wHabitEl.textContent = 'No recent workout streak — start this week!';
    }

    const stepGoalDays = stepsData.filter(s => s >= stepGoal).length;
    const wStepGoalEl = document.getElementById('wStepGoalDays');
    if (wStepGoalEl) wStepGoalEl.textContent = stepGoalDays + '/7';

    // Session breakdown
    const breakdownEl = document.getElementById('wSessionBreakdown');
    if (breakdownEl) {
        if (!thisWeekWorkouts.length) {
            breakdownEl.innerHTML = '<p class="text-muted mb-0">No sessions logged this week.</p>';
        } else {
            breakdownEl.innerHTML = thisWeekWorkouts.map(l => `
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class="font-weight-bold">${l.activity}</span>
                    <div class="text-right">
                        <span class="text-muted mr-2">${l.duration} min</span>
                        <span class="text-muted">${l.calories} kcal</span>
                    </div>
                </div>`).join('');
        }
    }

    buildActivityDonut('weeklyPieChart', 'weeklyPieLegend', thisWeekWorkouts);
}

// ── MONTHLY ───────────────────────────────────────────────────────

async function buildMonthly() {            // ← add async
    const goals    = _getGoals();
    const stepGoal = parseInt(goals.steps) || 10000;
 
    let dates, rows, prevRows
    try {
        const res  = await fetch(`${API_BASE}/progress-charts/monthly?offset=${monthOffset}`, {
            headers: { Authorization: `Bearer ${window.AuthService.getToken()}` }
        })
        const data = await res.json()
        dates    = data.dates
        rows     = data.rows
        prevRows = data.prevRows
    } catch (err) {
        console.warn('API failed, falling back to localStorage', err)
        const logs = _getLogs()
        dates    = _getMonthDates(monthOffset)
        const prevDates = _getMonthDates(monthOffset - 1)
        rows = dates.map(date => {
            const dayLogs = logs.filter(l => l.date === date)
            return {
                date,
                steps:    dayLogs.filter(l => l.type === 'steps').reduce((s, l) => s + (l.steps||0), 0),
                calories: dayLogs.reduce((s, l) => s + (l.calories||0), 0),
                workouts: dayLogs.filter(l => l.type === 'workout').map(l => ({ activity: l.activity, duration: l.duration, calories: l.calories })),
            }
        })
        prevRows = prevDates.map(date => {
            const dayLogs = logs.filter(l => l.date === date)
            return {
                date,
                steps:    dayLogs.filter(l => l.type === 'steps').reduce((s, l) => s + (l.steps||0), 0),
                workouts: dayLogs.filter(l => l.type === 'workout').map(l => ({ activity: l.activity, duration: l.duration, calories: l.calories })),
            }
        })
    }

    document.getElementById('monthlyRangeLabel').textContent = _formatMonthLabel(monthOffset);
    document.getElementById('monthNextBtn').disabled = monthOffset >= 0;

    const labels = dates.map(d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));

    // Steps chart
    const stepsData = rows.map(r => r.steps);
    const maxSteps = Math.max(...stepsData, 0);
    const hasSteps = stepsData.some(v => v > 0);

    document.getElementById('monthlyStepsEmpty').classList.toggle('d-none', hasSteps);
    document.getElementById('monthlyStepsPeak').textContent = maxSteps > 0
        ? `Peak: ${maxSteps.toLocaleString()} steps` : '';

    const stepsColors = stepsData.map(v =>
        v === maxSteps && maxSteps > 0 ? C_BLUE : 'rgba(78,115,223,0.35)'
    );

    if (_mStepsChart) _mStepsChart.destroy();
    _mStepsChart = new Chart(document.getElementById('monthlyStepsChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Steps',
                data: stepsData,
                backgroundColor: stepsColors,
                borderRadius: 2,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: { callbacks: { label: ctx => ` ${ctx.yLabel.toLocaleString()} steps` } },
            scales: {
                xAxes: [{ gridLines: { display: false }, ticks: { maxRotation: 45, fontSize: 9, callback: (val, i) => i % 7 === 0 ? val : null } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString() } }]
            }
        }
    });

    // Workout Sessions Per Week chart
    const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const weekSessionCounts = [0, 1, 2, 3].map(w => {
        const wRows = rows.slice(w * 7, (w + 1) * 7);
        return wRows.reduce((sum, r) => sum + (r.workouts ? r.workouts.length : 0), 0);
    });
    const maxMSessions = Math.max(...weekSessionCounts, 0);
    const hasMSessions = weekSessionCounts.some(v => v > 0);

    document.getElementById('monthlySessionsEmpty').classList.toggle('d-none', hasMSessions);
    document.getElementById('monthlySessionsPeak').textContent = maxMSessions > 0
        ? `Peak: ${maxMSessions} session${maxMSessions !== 1 ? 's' : ''}` : '';

    const mSessColors = weekSessionCounts.map(v =>
        v === maxMSessions && maxMSessions > 0 ? C_GREEN : 'rgba(28,200,138,0.35)'
    );

    if (_mSessionsChart) _mSessionsChart.destroy();
    _mSessionsChart = new Chart(document.getElementById('monthlySessionsChart'), {
        type: 'bar',
        data: {
            labels: weekLabels,
            datasets: [{
                label: 'Sessions',
                data: weekSessionCounts,
                backgroundColor: mSessColors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: {
                callbacks: {
                    label: ctx => ` ${ctx.yLabel} session${ctx.yLabel !== 1 ? 's' : ''}`
                }
            },
            scales: {
                xAxes: [{ gridLines: { display: false } }],
                yAxes: [{ ticks: { beginAtZero: true, stepSize: 1 } }]
            }
        }
    });

    // This Month insights
    const thisAvgSteps = _avgNonZero(stepsData);
    const prevStepsData = prevRows.map(r => r.steps);
    const prevAvgSteps = _avgNonZero(prevStepsData);
    const stepsDiff = thisAvgSteps - prevAvgSteps;

    const mAvgEl = document.getElementById('mAvgSteps');
    if (mAvgEl) mAvgEl.textContent = thisAvgSteps.toLocaleString() + ' steps/day';
    const mAvgVsEl = document.getElementById('mAvgStepsVsLast');
    if (mAvgVsEl) {
        mAvgVsEl.textContent = prevAvgSteps === 0
            ? 'No data from previous month'
            : `${stepsDiff >= 0 ? '↑' : '↓'} ${Math.abs(stepsDiff).toLocaleString()} vs last month's ${prevAvgSteps.toLocaleString()}`;
    }

    const thisMonthWorkouts = rows.flatMap(r => r.workouts || []);
    const prevMonthWorkouts = prevRows.flatMap(r => r.workouts || []);
    const sessionsDiff = thisMonthWorkouts.length - prevMonthWorkouts.length;

    const mSessionsEl = document.getElementById('mSessions');
    if (mSessionsEl) mSessionsEl.textContent = thisMonthWorkouts.length + ' sessions';
    const mSessionsVsEl = document.getElementById('mSessionsVsLast');
    if (mSessionsVsEl) {
        mSessionsVsEl.textContent = prevMonthWorkouts.length === 0
            ? 'No data from previous month'
            : `${sessionsDiff >= 0 ? '↑' : '↓'} ${Math.abs(sessionsDiff)} vs last month's ${prevMonthWorkouts.length}`;
    }

    const activeDays = rows.filter(r => r.steps > 0 || (r.workouts && r.workouts.length > 0)).length;
    const mActiveDaysEl = document.getElementById('mActiveDays');
    if (mActiveDaysEl) mActiveDaysEl.textContent = activeDays + '/' + dates.length;
    const mActiveTotalEl = document.getElementById('mActiveDaysTotal');
    if (mActiveTotalEl) mActiveTotalEl.textContent = `out of ${dates.length} days`;

    // Consistency
    const weeks = [0, 1, 2, 3].map(w => {
        const wRows = rows.slice(w * 7, (w + 1) * 7);
        return { week: w + 1, count: wRows.reduce((sum, r) => sum + (r.workouts ? r.workouts.length : 0), 0) };
    });
    const bestWeek = [...weeks].sort((a, b) => b.count - a.count)[0];

    const mMostActiveWeekEl = document.getElementById('mMostActiveWeek');
    if (mMostActiveWeekEl) mMostActiveWeekEl.textContent = bestWeek.count > 0 ? `Week ${bestWeek.week}` : '—';
    const mMostActiveWeekSessionsEl = document.getElementById('mMostActiveWeekSessions');
    if (mMostActiveWeekSessionsEl) mMostActiveWeekSessionsEl.textContent = bestWeek.count > 0
        ? `${bestWeek.count} sessions` : 'No workouts logged';

    const mHabitEl = document.getElementById('mHabitStability');
    if (mHabitEl) {
        const pct = Math.round((activeDays / dates.length) * 100);
        if (pct >= 80) mHabitEl.textContent = `Active ${pct}% of the month — excellent consistency! 💪`;
        else if (pct >= 50) mHabitEl.textContent = `Active ${pct}% of the month — good progress!`;
        else if (pct > 0) mHabitEl.textContent = `Active ${pct}% of the month — room to improve.`;
        else mHabitEl.textContent = 'No activity logged this month.';
    }

    const stepGoalDays = stepsData.filter(s => s >= stepGoal).length;
    const mStepGoalEl = document.getElementById('mStepGoalDays');
    if (mStepGoalEl) mStepGoalEl.textContent = stepGoalDays + '/' + dates.length;

    // Top Activities
    const topEl = document.getElementById('mTopActivities');
    if (topEl) {
        if (!thisMonthWorkouts.length) {
            topEl.innerHTML = '<p class="text-muted small mb-0">No sessions logged this month.</p>';
        } else {
            const grouped = {};
            thisMonthWorkouts.forEach(l => {
                if (!grouped[l.activity]) grouped[l.activity] = { count: 0, totalDuration: 0, totalCals: 0 };
                grouped[l.activity].count++;
                grouped[l.activity].totalDuration += l.duration || 0;
                grouped[l.activity].totalCals += l.calories || 0;
            });
            topEl.innerHTML = Object.entries(grouped)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([activity, data]) => `
                    <div class="d-flex align-items-center justify-content-between mb-3" style="font-size:0.95rem; line-height:1.6;">
                        <span class="font-weight-bold">${activity}</span>
                        <div class="text-right text-muted">
                            <span class="mr-2">${data.count}x</span>
                            <span>avg ${Math.round(data.totalDuration / data.count)} min</span>
                        </div>
                    </div>`).join('');
        }
    }
}

// ── ACTIVITY DONUT ────────────────────────────────────────────────

const ACTIVITY_COLORS = {
    '🏃 Running': '#4e73df',
    '🚴 Cycling': '#1cc88a',
    '🏊 Swimming': '#36b9cc',
    '🏋️ Weight Training': '#f6c23e',
    '🧘 Yoga': '#858796',
    '🚶 Walking': '#e74a3b',
    '⚽ Football / Soccer': '#fd7e14',
    '🏸 Badminton': '#20c9a6',
    'Other': '#6f42c1'
};

function buildActivityDonut(canvasId, legendId, workoutLogs) {
    const canvas = document.getElementById(canvasId);
    const legendEl = document.getElementById(legendId);
    if (!canvas) return;

    if (canvasId === 'weeklyPieChart' && _wPieChart) { _wPieChart.destroy(); _wPieChart = null; }

    if (!workoutLogs.length) {
        if (legendEl) legendEl.innerHTML = '<p class="text-muted small text-center mb-0">No workouts logged.</p>';
        return;
    }

    const grouped = {};
    workoutLogs.forEach(l => { grouped[l.activity] = (grouped[l.activity] || 0) + (l.duration || 0); });
    const labels = Object.keys(grouped);
    const durations = labels.map(k => grouped[k]);
    const total = durations.reduce((a, b) => a + b, 0);
    const colors = labels.map(k => ACTIVITY_COLORS[k] || '#858796');

    const chart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: durations, backgroundColor: colors, hoverBorderColor: 'rgba(234,236,244,1)' }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: {
                bodyFontColor: '#858796', borderColor: '#dddfeb', borderWidth: 1,
                backgroundColor: '#fff', titleFontColor: '#6e707e',
                callbacks: {
                    label: ctx => {
                        const mins = durations[ctx.index];
                        const pct = Math.round((mins / total) * 100);
                        return ` ${labels[ctx.index]}: ${mins} min (${pct}%)`;
                    }
                }
            },
            cutoutPercentage: 70
        }
    });

    if (canvasId === 'weeklyPieChart') _wPieChart = chart;

    if (legendEl) {
        legendEl.innerHTML = labels.map((label, i) => {
            const mins = durations[i];
            const hrs = (mins / 60).toFixed(1);
            const pct = Math.round((mins / total) * 100);
            const color = colors[i];
            return `
                <div class="d-flex align-items-center justify-content-between mb-1">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-circle mr-2" style="color:${color};font-size:8px;"></i>
                        <span class="small">${label}</span>
                    </div>
                    <div>
                        <span class="small text-muted mr-1">${hrs}h</span>
                        <span class="badge badge-secondary">${pct}%</span>
                    </div>
                </div>`;
        }).join('');
    }
}

// ── NAVIGATION ────────────────────────────────────────────────────

function changeWeek(dir) {
    weekOffset = Math.min(0, weekOffset + dir);
    buildWeekly();
}

function changeMonth(dir) {
    monthOffset = Math.min(0, monthOffset + dir);
    buildMonthly();
}

function resetAll() {
    weekOffset = 0;
    monthOffset = 0;
    buildWeekly();
    buildMonthly();
    document.querySelector('#progressTabs a[href="#weeklyPanel"]').click();
}

// ── INIT ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {   // ← add async
    await buildWeekly();
    await buildMonthly();

    document.querySelector('a[href="#weeklyPanel"]').addEventListener('shown.bs.tab', buildWeekly);
    document.querySelector('a[href="#monthlyPanel"]').addEventListener('shown.bs.tab', buildMonthly);
});