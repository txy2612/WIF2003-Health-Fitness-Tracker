// ── SHARED PALETTE ────────────────────────────────────────────────────────────
const C_BLUE   = '#4e73df';
const C_GREEN  = '#1cc88a';
const C_CYAN   = '#36b9cc';
const C_YELLOW = '#f6c23e';
const C_RED    = '#e74a3b';
const C_GRAY   = '#858796';
 
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 
// ── DAILY BAR — Steps by Hour ─────────────────────────────────────────────────
(function() {
    const hourlySteps = [120,80,200,350,600,900,750,400,550,800,1200,950,700,500,650,1850,1200,700,400,300,200,150,100,80];
    const hours = Array.from({length:24}, (_,i) => `${i}:00`);
    const maxVal = Math.max(...hourlySteps);
    const colors = hourlySteps.map(v => v === maxVal ? C_BLUE : 'rgba(78,115,223,0.45)');
 
    new Chart(document.getElementById('dailyBarChart'), {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Steps',
                data: hourlySteps,
                backgroundColor: colors,
                borderRadius: 3,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: {
                callbacks: {
                    label: ctx => ` ${ctx.yLabel.toLocaleString()} steps`
                }
            },
            scales: {
                xAxes: [{ gridLines: { display: false }, ticks: { fontSize: 10, maxRotation: 45 } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString() } }]
            }
        }
    });
})();
 
// ── DAILY PIE — Activity Breakdown ───────────────────────────────────────────
(function() {
    new Chart(document.getElementById('dailyPieChart'), {
        type: 'doughnut',
        data: {
            labels: ['Running','Yoga','Walking'],
            datasets: [{
                data: [40, 25, 35],
                backgroundColor: [C_BLUE, C_GREEN, C_CYAN],
                hoverBackgroundColor: ['#2e59d9','#17a673','#2c9faf'],
                hoverBorderColor: 'rgba(234,236,244,1)'
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            tooltips: { bodyFontColor: '#858796', borderColor: '#dddfeb', borderWidth: 1, backgroundColor: '#fff', titleFontColor: '#6e707e' },
            legend: { display: false },
            cutoutPercentage: 70
        }
    });
})();
 
// ── WEEKLY BAR — Steps Per Day ────────────────────────────────────────────────
(function() {
    const weeklySteps = [6200, 9800, 11200, 7500, 8100, 10500, 6400];
    const maxVal = Math.max(...weeklySteps);
    const colors = weeklySteps.map(v => v === maxVal ? C_BLUE : 'rgba(78,115,223,0.5)');
 
    new Chart(document.getElementById('weeklyBarChart'), {
        type: 'bar',
        data: {
            labels: DAYS,
            datasets: [{
                label: 'Steps',
                data: weeklySteps,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: {
                callbacks: { label: ctx => ` ${ctx.yLabel.toLocaleString()} steps` }
            },
            scales: {
                xAxes: [{ gridLines: { display: false } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString() } }]
            }
        }
    });
})();
 
// ── WEEKLY PIE — Workout Types ────────────────────────────────────────────────
(function() {
    new Chart(document.getElementById('weeklyPieChart'), {
        type: 'doughnut',
        data: {
            labels: ['Running','Cycling','Weights','Other'],
            datasets: [{
                data: [3, 1, 2, 1],
                backgroundColor: [C_BLUE, C_GREEN, C_CYAN, C_YELLOW],
                hoverBackgroundColor: ['#2e59d9','#17a673','#2c9faf','#dda20a'],
                hoverBorderColor: 'rgba(234,236,244,1)'
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: { bodyFontColor: '#858796', backgroundColor: '#fff', borderColor: '#dddfeb', borderWidth: 1, titleFontColor: '#6e707e' },
            cutoutPercentage: 70
        }
    });
})();
 
// ── WEEKLY AREA — Calories Burned ─────────────────────────────────────────────
(function() {
    const calories = [320, 580, 720, 410, 540, 720, 310];
 
    new Chart(document.getElementById('weeklyAreaChart'), {
        type: 'line',
        data: {
            labels: DAYS,
            datasets: [{
                label: 'Calories Burned',
                data: calories,
                backgroundColor: 'rgba(78,115,223,0.08)',
                borderColor: C_BLUE,
                pointBackgroundColor: C_BLUE,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: {
                callbacks: { label: ctx => ` ${ctx.yLabel} kcal` }
            },
            scales: {
                xAxes: [{ gridLines: { color: 'rgb(234,236,244)', zeroLineColor: 'rgb(234,236,244)' } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v + ' kcal', padding: 10 }, gridLines: { color: 'rgb(234,236,244)', drawBorder: false } }]
            }
        }
    });
})();
 
// ── WEIGHT AREA — Weight Over Time ────────────────────────────────────────────
(function() {
    const labels = ['Apr 5','Apr 8','Apr 12','Apr 16','Apr 19','Apr 22','Apr 26','Apr 30','May 3'];
    const weights = [71.2, 70.8, 70.5, 70.1, 69.8, 69.4, 69.0, 68.7, 68.5];
 
    new Chart(document.getElementById('weightAreaChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Weight (kg)',
                data: weights,
                backgroundColor: 'rgba(28,200,138,0.08)',
                borderColor: C_GREEN,
                pointBackgroundColor: C_GREEN,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            legend: { display: false },
            tooltips: {
                callbacks: { label: ctx => ` ${ctx.yLabel} kg` }
            },
            scales: {
                xAxes: [{ gridLines: { color: 'rgb(234,236,244)' } }],
                yAxes: [{
                    ticks: {
                        min: 67, max: 73,
                        callback: v => v + ' kg',
                        padding: 10
                    },
                    gridLines: { color: 'rgb(234,236,244)', drawBorder: false }
                }]
            }
        }
    });
})();
 
// ── CUSTOM RANGE ──────────────────────────────────────────────────────────────
let customChart = null;
 
function applyCustomRange() {
    const start = document.getElementById('startDate').value;
    const end   = document.getElementById('endDate').value;
    if (!start || !end || start > end) {
        alert('Please select a valid date range.'); return;
    }
 
    const startDate = new Date(start);
    const endDate   = new Date(end);
    const days      = Math.round((endDate - startDate) / 86400000) + 1;
    const isMonthly = days > 31;
 
    // Mock data generation based on range
    const stepsPerDay  = 7500;
    const calPerDay    = 480;
    const sessPerDay   = 0.85;
    const totalSteps   = Math.round(stepsPerDay * days);
    const totalCal     = Math.round(calPerDay * days);
    const totalSess    = Math.round(sessPerDay * days);
    const avgSteps     = Math.round(totalSteps / days);
 
    document.getElementById('customTotalSteps').textContent  = totalSteps.toLocaleString();
    document.getElementById('customCalories').textContent    = totalCal.toLocaleString() + ' kcal';
    document.getElementById('customSessions').textContent    = totalSess + ' sessions';
    document.getElementById('customAvgSteps').textContent    = avgSteps.toLocaleString();
    document.getElementById('customDays').textContent        = days + ' days';
    document.getElementById('customBestDay').textContent     = '11,200 steps';
    document.getElementById('customAvgInsight').textContent  = avgSteps.toLocaleString();
    document.getElementById('customPeriodText').textContent  =
        startDate.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) +
        ' → ' +
        endDate.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'});
 
    // Build chart labels
    let labels = [];
    if (isMonthly) {
        document.getElementById('customChartTitle').textContent = 'Steps Trend — Monthly View';
        const months = [];
        const cursor = new Date(startDate);
        while (cursor <= endDate) {
            const m = cursor.toLocaleDateString('en-GB', {month:'short', year:'numeric'});
            if (!months.includes(m)) months.push(m);
            cursor.setMonth(cursor.getMonth() + 1);
        }
        labels = months;
    } else {
        document.getElementById('customChartTitle').textContent = 'Steps Trend — Selected Range';
        const cursor = new Date(startDate);
        while (cursor <= endDate) {
            labels.push(cursor.toLocaleDateString('en-GB', {day:'2-digit',month:'short'}));
            cursor.setDate(cursor.getDate() + 1);
        }
    }
 
    const data   = labels.map(() => Math.round(5000 + Math.random() * 8000));
    const maxVal = Math.max(...data);
    const colors = data.map(v => v === maxVal ? C_BLUE : 'rgba(78,115,223,0.5)');
 
    if (customChart) customChart.destroy();
    customChart = new Chart(document.getElementById('customBarChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Steps',
                data,
                backgroundColor: colors,
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
                xAxes: [{ gridLines: { display: false }, ticks: { maxRotation: days > 14 ? 45 : 0, fontSize: 10 } }],
                yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString() } }]
            }
        }
    });
 
    document.getElementById('customEmptyState').classList.add('d-none');
    document.getElementById('customResults').classList.remove('d-none');
}
 
function clearCustomRange() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value   = '';
    document.getElementById('customResults').classList.add('d-none');
    document.getElementById('customEmptyState').classList.remove('d-none');
    if (customChart) { customChart.destroy(); customChart = null; }
}
 
function resetAll() {
    clearCustomRange();
    // switch back to daily tab
    document.querySelector('#progressTabs a[href="#dailyPanel"]').click();
}