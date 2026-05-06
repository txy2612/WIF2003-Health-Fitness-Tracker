// ══════════════════════════════════════════════════════════════════
//  PROGRESS CHARTS WIRING
//  Append to bottom of progress-charts.js
//  Requires: C_BLUE, C_GREEN etc defined at top of progress-charts.js
// ══════════════════════════════════════════════════════════════════

// ── NAVIGATION STATE ──────────────────────────────────────────────
let weekOffset  = 0; // 0 = this week, -1 = last week
let monthOffset = 0; // 0 = this month, -1 = last month

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

// Get 7 date strings for a given week offset (0 = this week)
function _getWeekDates(offset) {
    const today  = new Date();
    const day    = today.getDay() === 0 ? 7 : today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day - 1) + (offset * 7));
    monday.setHours(0, 0, 0, 0);
    return Array.from({length: 7}, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().split('T')[0];
    });
}

// Get all dates in a given month offset (0 = this month)
function _getMonthDates(offset) {
    const today = new Date();
    const year  = today.getFullYear();
    const month = today.getMonth() + offset;
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const dates = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
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

function _getDayName(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long' });
}

function _getCurrentStreak() {
    const logs = _getLogs().filter(l => l.type === 'workout');
    if (!logs.length) return 0;
    const uniqueDates = [...new Set(logs.map(l => l.date))].sort().reverse();
    let streak = 0;
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 1);
    for (const date of uniqueDates) {
        if (date === cursor.toISOString().split('T')[0]) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else break;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (uniqueDates.includes(todayStr)) streak++;
    return streak;
}

function _getLongestStreak() {
    const logs = _getLogs().filter(l => l.type === 'workout');
    if (!logs.length) return 0;
    const uniqueDates = [...new Set(logs.map(l => l.date))].sort();
    let longest = 1, current = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
        const diff = (new Date(uniqueDates[i]) - new Date(uniqueDates[i-1])) / 86400000;
        if (diff === 1) { current++; longest = Math.max(longest, current); }
        else current = 1;
    }
    return longest;
}

// How many consecutive weeks had at least 1 workout
function _getConsistencyWeeks() {
    let weeks = 0;
    for (let w = 0; w >= -11; w--) {
        const dates   = _getWeekDates(w);
        const logs    = _getLogs().filter(l => l.type === 'workout');
        const hasWork = logs.some(l => dates.includes(l.date));
        if (hasWork) weeks++;
        else break;
    }
    return weeks;
}

// ── CHART INSTANCES ───────────────────────────────────────────────
let _wStepsChart    = null;
let _wSessionsChart = null;
let _wPieChart      = null;
let _mStepsChart    = null;

// ── WEEKLY CHARTS + INSIGHTS ──────────────────────────────────────

function buildWeekly() {
    const logs    = _getLogs();
    const goals   = _getGoals();
    const stepGoal = parseInt(goals.steps) || 10000;
    const dates   = _getWeekDates(weekOffset);
    const prevDates = _getWeekDates(weekOffset - 1);
    const DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    // Navigation label + disable next if at current week
    document.getElementById('weeklyRangeLabel').textContent = _formatWeekLabel(dates);
    document.getElementById('weekNextBtn').disabled = weekOffset >= 0;

    // ── Steps chart ───────────────────────────────────────────────
    const stepsData = _stepsOnDates(logs, dates);
    const maxSteps  = Math.max(...stepsData, 0);
    const hasSteps  = stepsData.some(v => v > 0);

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
            annotation: {
                annotations: maxSteps > 0 ? [{
                    type: 'line', mode: 'horizontal',
                    scaleID: 'y-axis-0', value: maxSteps,
                    borderColor: C_BLUE, borderWidth: 1,
                    borderDash: [4, 4],
                    label: { enabled: true, content: maxSteps.toLocaleString(), position: 'left', fontSize: 10 }
                }, {
                    type: 'line', mode: 'horizontal',
                    scaleID: 'y-axis-0', value: stepGoal,
                    borderColor: C_GREEN, borderWidth: 1.5,
                    borderDash: [6, 3],
                    label: { enabled: true, content: `Goal: ${stepGoal.toLocaleString()}`, position: 'right', fontSize: 10 }
                }] : []
            },
            tooltips: { callbacks: { label: ctx => ` ${ctx.yLabel.toLocaleString()} steps` } },
            scales: {
                xAxes: [{ gridLines: { display: false } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString() } }]
            }
        }
    });

    // ── Sessions chart ────────────────────────────────────────────
    const sessionsData = _workoutsOnDates(logs, dates);
    const hasSessions  = sessionsData.some(v => v > 0);
    const maxSessions  = Math.max(...sessionsData, 0);

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

    // ── This Week insights ────────────────────────────────────────
    const thisAvgSteps  = _avgNonZero(stepsData);
    const prevStepsData = _stepsOnDates(logs, prevDates);
    const prevAvgSteps  = _avgNonZero(prevStepsData);
    const stepsDiff     = thisAvgSteps - prevAvgSteps;

    const wAvgStepsEl = document.getElementById('wAvgSteps');
    if (wAvgStepsEl) wAvgStepsEl.textContent = thisAvgSteps.toLocaleString() + ' steps/day';
    const wAvgVsEl = document.getElementById('wAvgStepsVsLast');
    if (wAvgVsEl) {
        if (prevAvgSteps === 0) {
            wAvgVsEl.textContent = 'No data from previous week';
        } else {
            const dir = stepsDiff >= 0 ? '↑' : '↓';
            wAvgVsEl.textContent = `${dir} ${Math.abs(stepsDiff).toLocaleString()} vs last week's ${prevAvgSteps.toLocaleString()}`;
        }
    }

    const thisWeekWorkouts = logs.filter(l => l.type === 'workout' && dates.includes(l.date));
    const prevWeekWorkouts = logs.filter(l => l.type === 'workout' && prevDates.includes(l.date));
    const sessionsDiff     = thisWeekWorkouts.length - prevWeekWorkouts.length;

    const wSessionsEl = document.getElementById('wSessions');
    if (wSessionsEl) wSessionsEl.textContent = thisWeekWorkouts.length + ' sessions';
    const wSessionsVsEl = document.getElementById('wSessionsVsLast');
    if (wSessionsVsEl) {
        if (prevWeekWorkouts.length === 0) {
            wSessionsVsEl.textContent = 'No data from previous week';
        } else {
            const dir = sessionsDiff >= 0 ? '↑' : '↓';
            wSessionsVsEl.textContent = `${dir} ${Math.abs(sessionsDiff)} vs last week's ${prevWeekWorkouts.length}`;
        }
    }

    const activeDays = dates.filter(date =>
        logs.some(l => (l.type === 'workout' || l.type === 'steps') && l.date === date && (l.steps > 0 || l.type === 'workout'))
    ).length;
    const wActiveDaysEl = document.getElementById('wActiveDays');
    if (wActiveDaysEl) wActiveDaysEl.textContent = activeDays + '/7 days';

    // ── Consistency insights ──────────────────────────────────────
    const currentStreak  = _getCurrentStreak();
    const longestStreak  = _getLongestStreak();
    const consistWeeks   = _getConsistencyWeeks();

    const wStreakEl = document.getElementById('wStreak');
    if (wStreakEl) wStreakEl.textContent = currentStreak + ' day' + (currentStreak !== 1 ? 's' : '') + (currentStreak > 0 ? ' 🔥' : '');
    const wStreakLongestEl = document.getElementById('wStreakLongest');
    if (wStreakLongestEl) wStreakLongestEl.textContent = `Longest ever: ${longestStreak} days`;

    const wHabitEl = document.getElementById('wHabitStability');
    if (wHabitEl) {
        if (consistWeeks >= 4)      wHabitEl.textContent = `You maintained workouts for ${consistWeeks} consecutive weeks 💪`;
        else if (consistWeeks >= 2) wHabitEl.textContent = `${consistWeeks}-week consistency streak 🔥`;
        else if (consistWeeks === 1) wHabitEl.textContent = 'Keep it up — build your weekly streak!';
        else                         wHabitEl.textContent = 'No recent workout streak — start this week!';
    }

    const stepGoalDays = stepsData.filter(s => s >= stepGoal).length;
    const wStepGoalEl  = document.getElementById('wStepGoalDays');
    if (wStepGoalEl) wStepGoalEl.textContent = stepGoalDays + '/7';

    // ── Session breakdown ─────────────────────────────────────────
    const breakdownEl = document.getElementById('wSessionBreakdown');
    if (breakdownEl) {
        if (!thisWeekWorkouts.length) {
            breakdownEl.innerHTML = '<p class="text-muted mb-0">No sessions logged this week.</p>';
        } else {
            breakdownEl.innerHTML = thisWeekWorkouts.map(l => `
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <span class=" font-weight-bold">${l.activity}</span>
                    <div class="text-right">
                        <span class=" text-muted mr-2">${l.duration} min</span>
                        <span class=" text-muted">${l.calories} kcal</span>
                    </div>
                </div>`).join('');
        }
    }

    // ── Workout types donut ───────────────────────────────────────
    buildActivityDonut('weeklyPieChart', 'weeklyPieLegend', thisWeekWorkouts);
}

// ── MONTHLY CHARTS + INSIGHTS ─────────────────────────────────────

function buildMonthly() {
    const logs      = _getLogs();
    const goals     = _getGoals();
    const stepGoal  = parseInt(goals.steps) || 10000;
    const dates     = _getMonthDates(monthOffset);
    const prevDates = _getMonthDates(monthOffset - 1);

    // Navigation label + disable next if at current month
    document.getElementById('monthlyRangeLabel').textContent = _formatMonthLabel(monthOffset);
    document.getElementById('monthNextBtn').disabled = monthOffset >= 0;

    const labels    = dates.map(d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));

    // ── Steps chart ───────────────────────────────────────────────
    const stepsData = _stepsOnDates(logs, dates);
    const maxSteps  = Math.max(...stepsData, 0);
    const hasSteps  = stepsData.some(v => v > 0);

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
            annotation: {
                annotations: maxSteps > 0 ? [{
                    type: 'line', mode: 'horizontal',
                    scaleID: 'y-axis-0', value: maxSteps,
                    borderColor: C_BLUE, borderWidth: 1,
                    borderDash: [4, 4],
                    label: { enabled: true, content: maxSteps.toLocaleString(), position: 'left', fontSize: 9 }
                }, {
                    type: 'line', mode: 'horizontal',
                    scaleID: 'y-axis-0', value: stepGoal,
                    borderColor: C_GREEN, borderWidth: 1.5,
                    borderDash: [6, 3],
                    label: { enabled: true, content: `Goal: ${stepGoal.toLocaleString()}`, position: 'right', fontSize: 9 }
                }] : []
            },
            tooltips: { callbacks: { label: ctx => ` ${ctx.yLabel.toLocaleString()} steps` } },
            scales: {
                xAxes: [{ gridLines: { display: false }, ticks: { maxRotation: 45, fontSize: 9 } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString() } }]
            }
        }
    });

    // ── This Month insights ───────────────────────────────────────
    const thisAvgSteps  = _avgNonZero(stepsData);
    const prevStepsData = _stepsOnDates(logs, prevDates);
    const prevAvgSteps  = _avgNonZero(prevStepsData);
    const stepsDiff     = thisAvgSteps - prevAvgSteps;

    const mAvgEl = document.getElementById('mAvgSteps');
    if (mAvgEl) mAvgEl.textContent = thisAvgSteps.toLocaleString() + ' steps/day';
    const mAvgVsEl = document.getElementById('mAvgStepsVsLast');
    if (mAvgVsEl) {
        if (prevAvgSteps === 0) mAvgVsEl.textContent = 'No data from previous month';
        else {
            const dir = stepsDiff >= 0 ? '↑' : '↓';
            mAvgVsEl.textContent = `${dir} ${Math.abs(stepsDiff).toLocaleString()} vs last month's ${prevAvgSteps.toLocaleString()}`;
        }
    }

    const thisMonthWorkouts = logs.filter(l => l.type === 'workout' && dates.includes(l.date));
    const prevMonthWorkouts = logs.filter(l => l.type === 'workout' && prevDates.includes(l.date));
    const sessionsDiff      = thisMonthWorkouts.length - prevMonthWorkouts.length;

    const mSessionsEl = document.getElementById('mSessions');
    if (mSessionsEl) mSessionsEl.textContent = thisMonthWorkouts.length + ' sessions';
    const mSessionsVsEl = document.getElementById('mSessionsVsLast');
    if (mSessionsVsEl) {
        if (prevMonthWorkouts.length === 0) mSessionsVsEl.textContent = 'No data from previous month';
        else {
            const dir = sessionsDiff >= 0 ? '↑' : '↓';
            mSessionsVsEl.textContent = `${dir} ${Math.abs(sessionsDiff)} vs last month's ${prevMonthWorkouts.length}`;
        }
    }

    const activeDays = dates.filter(date =>
        logs.some(l => l.date === date && (l.type === 'workout' || (l.type === 'steps' && l.steps > 0)))
    ).length;
    const mActiveDaysEl = document.getElementById('mActiveDays');
    if (mActiveDaysEl) mActiveDaysEl.textContent = activeDays + '/' + dates.length;
    const mActiveTotalEl = document.getElementById('mActiveDaysTotal');
    if (mActiveTotalEl) mActiveTotalEl.textContent = `out of ${dates.length} days`;

    // ── Consistency ───────────────────────────────────────────────

    // Most active week in month
    const weeks = [0,1,2,3].map(w => {
        const wDates = dates.slice(w * 7, (w + 1) * 7);
        return { week: w + 1, count: logs.filter(l => l.type === 'workout' && wDates.includes(l.date)).length };
    });
    const bestWeek = weeks.sort((a, b) => b.count - a.count)[0];
    const mMostActiveWeekEl = document.getElementById('mMostActiveWeek');
    if (mMostActiveWeekEl) mMostActiveWeekEl.textContent = bestWeek.count > 0 ? `Week ${bestWeek.week}` : '—';
    const mMostActiveWeekSessionsEl = document.getElementById('mMostActiveWeekSessions');
    if (mMostActiveWeekSessionsEl) mMostActiveWeekSessionsEl.textContent = bestWeek.count > 0 ? `${bestWeek.count} sessions` : 'No workouts logged';

    const mHabitEl = document.getElementById('mHabitStability');
    if (mHabitEl) {
        const pct = Math.round((activeDays / dates.length) * 100);
        if (pct >= 80)      mHabitEl.textContent = `Active ${pct}% of the month — excellent consistency! 💪`;
        else if (pct >= 50) mHabitEl.textContent = `Active ${pct}% of the month — good progress!`;
        else if (pct > 0)   mHabitEl.textContent = `Active ${pct}% of the month — room to improve.`;
        else                mHabitEl.textContent  = 'No activity logged this month.';
    }

    const stepGoalDays = stepsData.filter(s => s >= stepGoal).length;
    const mStepGoalEl  = document.getElementById('mStepGoalDays');
    if (mStepGoalEl) mStepGoalEl.textContent = stepGoalDays + '/' + dates.length;

    // ── Top Activities ────────────────────────────────────────────
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
                grouped[l.activity].totalCals     += l.calories || 0;
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
    '🏃 Running':           '#4e73df',
    '🚴 Cycling':           '#1cc88a',
    '🏊 Swimming':          '#36b9cc',
    '🏋️ Weight Training':  '#f6c23e',
    '🧘 Yoga':              '#858796',
    '🚶 Walking':           '#e74a3b',
    '⚽ Football / Soccer': '#fd7e14',
    '🏸 Badminton':         '#20c9a6',
    'Other':                '#6f42c1'
};

function buildActivityDonut(canvasId, legendId, workoutLogs) {
    const canvas   = document.getElementById(canvasId);
    const legendEl = document.getElementById(legendId);
    if (!canvas) return;

    if (canvasId === 'weeklyPieChart' && _wPieChart) { _wPieChart.destroy(); _wPieChart = null; }

    if (!workoutLogs.length) {
        if (legendEl) legendEl.innerHTML = '<p class="text-muted small text-center mb-0">No workouts logged.</p>';
        return;
    }

    const grouped   = {};
    workoutLogs.forEach(l => { grouped[l.activity] = (grouped[l.activity] || 0) + (l.duration || 0); });
    const labels    = Object.keys(grouped);
    const durations = labels.map(k => grouped[k]);
    const total     = durations.reduce((a, b) => a + b, 0);
    const colors    = labels.map(k => ACTIVITY_COLORS[k] || '#858796');

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
                        const pct  = Math.round((mins / total) * 100);
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
            const mins  = durations[i];
            const hrs   = (mins / 60).toFixed(1);
            const pct   = Math.round((mins / total) * 100);
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
    weekOffset  = 0;
    monthOffset = 0;
    buildWeekly();
    buildMonthly();
    document.querySelector('#progressTabs a[href="#weeklyPanel"]').click();
}

// ── INIT ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    buildWeekly();
    buildMonthly();

    // Rebuild charts when switching tabs
    document.querySelector('a[href="#weeklyPanel"]').addEventListener('shown.bs.tab', buildWeekly);
    document.querySelector('a[href="#monthlyPanel"]').addEventListener('shown.bs.tab', buildMonthly);
});