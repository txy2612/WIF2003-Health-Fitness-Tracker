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

function getLast7Dates() {
    return Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });
}

// -- INSIGHT: STEPS REMINDER

function getStepGoalInsight() {
    const logs      = getLogs();
    const goals     = JSON.parse(localStorage.getItem('fittrack_goals') || '{}');
    const today     = new Date().toISOString().split('T')[0];
    const stepGoal  = parseInt(goals.steps) || 10000;

    const totalLogs     = logs.length;
    const hasStepsToday = logs.some(l => l.type === 'steps' && l.date === today);
    const currentHour   = new Date().getHours();

    // already logged steps today — show progress insight
    if (hasStepsToday) {
        const todaySteps = logs
            .filter(l => l.type === 'steps' && l.date === today)
            .reduce((sum, l) => sum + (l.steps || 0), 0);

        const remaining = stepGoal - todaySteps;

        if (remaining <= 0)    return `🎉 You've hit your step goal! (${todaySteps.toLocaleString()} steps)`;
        if (remaining <= 1000) return `Almost there — just ${remaining.toLocaleString()} steps to go!`;
        return `You are ${remaining.toLocaleString()} steps away from your daily goal.`;
    }

    // no steps logged today — decide whether to remind
    if (totalLogs < 7) {
        // new user — always remind regardless of time
        return "Don't forget to log your steps today!";
    }

    if (currentHour >= 20) {
        // established user — only remind after 8 PM
        return "You haven't logged your steps today — still time before midnight!";
    }

    // established user, before 8 PM — no reminder yet
    return null;
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
 

// -- INSIGHT： WORKOUT REMINDER
function getWorkoutReminderInsight() {
    const logs  = getLogs();
    const today = new Date().toISOString().split('T')[0];

    const workoutLogs = logs
        .filter(l => l.type === 'workout')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // never worked out
    if (!workoutLogs.length) return "Log your first workout to get started! 💪";

    const lastWorkoutDate = workoutLogs[0].date;
    const daysSince = Math.floor(
        (new Date(today) - new Date(lastWorkoutDate)) / (1000 * 60 * 60 * 24)
    );

    if (daysSince === 0) return null; // worked out today, no reminder
    if (daysSince === 1) return null; // worked out yesterday, still fine
    if (daysSince === 2) return `Last workout was 2 days ago — time to move! 🏃`;
    if (daysSince >= 3)  return `You haven't worked out in ${daysSince} days — want to log one?`;

    return null;
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

// -- INSIGHT: WATER WEEKLY INSIGHT

function getWaterInsight() {
    const today = new Date().toISOString().split('T')[0];
    const last7 = getLast7Dates();
    
    const weeklyWater = last7.map(date =>
        parseInt(localStorage.getItem('np_water_' + date) || '0', 10)
    );
    
    const avg = Math.round(weeklyWater.reduce((a, b) => a + b, 0) / 7);

    if (avg <= 3)      return `Your avg water intake last week was ${avg} glasses/day — try to drink more! 💧`;
    if (avg <= 6)      return `Your avg water intake last week was ${avg} glasses/day — getting better! 💧`;
    return `Your avg water intake last week was ${avg} glasses/day — great, keep it up! 💧`;
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

// -- LOG MEAL REMINDER
function getMealReminderInsight() {
    const today = new Date().toISOString().split('T')[0];
    
    // check if user has ever used meal planner
    const hasUsedPlanner = Object.keys(localStorage)
        .some(key => key.startsWith('np_todayPlan_'));
    
    if (!hasUsedPlanner) return null;
    
    // check if logged today
    const todayPlan = JSON.parse(
        localStorage.getItem('np_todayPlan_' + today) || 'null'
    );
    
    const hasLoggedToday = todayPlan && 
        ['breakfast','lunch','dinner']
        .some(slot => todayPlan[slot]?.length > 0);
    
    if (!hasLoggedToday) return "You haven't planned your meals today! 🍽️";
    return null;
}