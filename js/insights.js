// ── WEEK HELPERS ──────────────────────────────────────────────────────────────
 
/**
 * Returns an array of date strings [YYYY-MM-DD] for the current week (Mon–today)
 * and last week (Mon–Sun)
 */
function getWeekRanges() {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1, Sun=7
 
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - (dayOfWeek - 1));
    thisMonday.setHours(0, 0, 0, 0);
 
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
 
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
 
    // Generate date strings for this week and last week
    const toDateStr = d => d.toISOString().split('T')[0];
 
    const thisWeekDates = [];
    for (let i = 0; i < dayOfWeek; i++) {
        const d = new Date(thisMonday);
        d.setDate(thisMonday.getDate() + i);
        thisWeekDates.push(toDateStr(d));
    }
 
    const lastWeekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(lastMonday);
        d.setDate(lastMonday.getDate() + i);
        lastWeekDates.push(toDateStr(d));
    }
 
    return { thisWeekDates, lastWeekDates };
}
 
function pctChange(current, previous) {
    if (!previous) return null; // avoid divide by zero
    return Math.round(((current - previous) / previous) * 100);
}
 
// ── INSIGHT: STEPS WEEK VS WEEK ───────────────────────────────────────────────
 
/**
 * "Steps ↑ 12% vs last week"
 * Compares total steps logged this week vs last week
 */
function getStepWeekInsight() {
    const logs = getLogs().filter(l => l.type === 'steps');
    const { thisWeekDates, lastWeekDates } = getWeekRanges();
 
    const thisWeekSteps = logs
        .filter(l => thisWeekDates.includes(l.date))
        .reduce((sum, l) => sum + (l.steps || 0), 0);
 
    const lastWeekSteps = logs
        .filter(l => lastWeekDates.includes(l.date))
        .reduce((sum, l) => sum + (l.steps || 0), 0);
 
    if (!lastWeekSteps && !thisWeekSteps) return null; // no data yet
    if (!lastWeekSteps) return `You logged ${thisWeekSteps.toLocaleString()} steps this week — keep it up!`;
 
    const pct = pctChange(thisWeekSteps, lastWeekSteps);
    if (pct === 0)  return `Same steps as last week — ${thisWeekSteps.toLocaleString()} total.`;
    const arrow = pct > 0 ? '↑' : '↓';
    const abs   = Math.abs(pct);
    return `Steps ${arrow} ${abs}% vs last week`;
}
 
// ── INSIGHT: WORKOUT SESSIONS WEEK VS WEEK ────────────────────────────────────
 
/**
 * "Workouts ↑ 2 sessions vs last week"
 * Compares workout session count this week vs last week
 */
function getWorkoutComparisonInsight() {
    const logs = getLogs().filter(l => l.type === 'workout');
    const { thisWeekDates, lastWeekDates } = getWeekRanges();
 
    const thisWeekCount = logs.filter(l => thisWeekDates.includes(l.date)).length;
    const lastWeekCount = logs.filter(l => lastWeekDates.includes(l.date)).length;
 
    if (!lastWeekCount && !thisWeekCount) return null;
    if (!lastWeekCount) return `You've done ${thisWeekCount} workout${thisWeekCount > 1 ? 's' : ''} this week — great start!`;
 
    const diff = thisWeekCount - lastWeekCount;
    if (diff === 0)  return `Same number of workouts as last week (${thisWeekCount} sessions).`;
    const arrow = diff > 0 ? '↑' : '↓';
    const abs   = Math.abs(diff);
    return `Workouts ${arrow} ${abs} session${abs > 1 ? 's' : ''} vs last week`;
}
 
// ── INSIGHT: LONGEST WORKOUT STREAK ──────────────────────────────────────────
 
/**
 * "Longest streak: 9 consecutive workout days"
 * Walks through all workout log dates and finds the longest consecutive run
 */
function getWorkoutStreakInsight() {
    const logs = getLogs().filter(l => l.type === 'workout');
    if (!logs.length) return null;
 
    // Get unique workout dates, sorted ascending
    const uniqueDates = [...new Set(logs.map(l => l.date))].sort();
 
    let longestStreak = 1;
    let currentStreak = 1;
 
    for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
 
        if (diffDays === 1) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 1; // reset on gap
        }
    }
 
    if (longestStreak === 1) return `You've started your streak — keep working out daily!`;
    return `Longest streak: ${longestStreak} consecutive workout days 🔥`;
}
 
// ── INSIGHT: HYDRATION WEEK VS WEEK ──────────────────────────────────────────
 
/**
 * "Hydration ↑ 10% vs last week (6.2 → 6.8 glasses/day)"
 * Reads np_water_YYYY-MM-DD keys saved by the patched adjustWater()
 */
function getHydrationWeekInsight() {
    const { thisWeekDates, lastWeekDates } = getWeekRanges();
 
    function avgGlasses(dates) {
        const values = dates
            .map(d => parseInt(localStorage.getItem('np_water_' + d) || '0', 10))
            .filter(v => v > 0); // only days with data
        if (!values.length) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
 
    const thisAvg = avgGlasses(thisWeekDates);
    const lastAvg = avgGlasses(lastWeekDates);
 
    if (!thisAvg && !lastAvg) return null;
    if (!lastAvg) return `Avg hydration this week: ${thisAvg.toFixed(1)} glasses/day 💧`;
 
    const pct  = pctChange(thisAvg, lastAvg);
    const arrow = pct >= 0 ? '↑' : '↓';
    const abs   = Math.abs(pct);
    return `Hydration ${arrow} ${abs}% vs last week (${lastAvg.toFixed(1)} → ${thisAvg.toFixed(1)} glasses/day)`;
}