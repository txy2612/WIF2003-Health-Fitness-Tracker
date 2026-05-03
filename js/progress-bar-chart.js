// ================================================================
// progress-charts.js
// Place this file at: js/progress-charts.js
// ================================================================

// Ensures charts redraw correctly and fill their containers when switching between Bootstrap tabs
$(function() {
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        window.dispatchEvent(new Event('resize'));
    });
});

// ----------------------------------------------------------------
// ROUNDED BAR CORNERS — applies to all charts on this page
// Chart.js 2.x does not support border-radius natively.
// ----------------------------------------------------------------
Chart.helpers.drawRoundedTopRect = function (ctx, x, y, width, height, radius) {
    if (height < 0) height = 0;
    if (radius > height / 2) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};
Chart.elements.Rectangle.prototype.draw = function () {
    var ctx    = this._chart.ctx;
    var vm     = this._view;
    var left   = vm.x - vm.width / 2;
    var top    = vm.y;
    var width  = vm.width;
    var height = vm.base - top;
    ctx.fillStyle   = vm.backgroundColor;
    ctx.strokeStyle = vm.borderColor;
    ctx.lineWidth   = vm.borderWidth || 0;
    Chart.helpers.drawRoundedTopRect(ctx, left, top, width, height, 4);
    ctx.fill();
    if (vm.borderWidth) ctx.stroke();
};

// ----------------------------------------------------------------
// BAR THICKNESS HELPER
// Fewer bars = thicker bars. More bars = thinner bars.
// Formula: clamp(400 / numBars, 8, 50)
// ----------------------------------------------------------------
function getBarThickness(numBars) {
    return Math.max(8, Math.min(50, Math.round(400 / numBars)));
}

// ----------------------------------------------------------------
// FOOD EQUIVALENT HELPER
// < 100 kcal  → egg (50 kcal)
// 100–300 kcal → drumstick (170 kcal)
// > 300 kcal  → bowl of rice (210 kcal)
// Always shows the fewest possible items.
// ----------------------------------------------------------------
function getFoodEquiv(kcal) {
    var foods = [
        { emoji: '🥚', name: 'egg', plural: 'eggs', kcal: 50 },
        { emoji: '🍗', name: 'drumstick', plural: 'drumsticks', kcal: 170 },
        { emoji: '🍚', name: 'bowl of rice', plural: 'bowls of rice', kcal: 210 }
    ];
    
    var bestFood = foods[0];
    var minCount = Infinity;
    
    for (var i = 0; i < foods.length; i++) {
        var count = Math.round(kcal / foods[i].kcal);
        if (count >= 1 && count < minCount) {
            minCount = count;
            bestFood = foods[i];
        }
    }
    
    var label = minCount === 1 ? bestFood.name : bestFood.plural;
    return bestFood.emoji + ' Equivalent to ' + minCount.toLocaleString() + ' ' + label;
}

// ----------------------------------------------------------------
// STEPS GOAL — DYNAMIC PROGRESS LOGIC
// Each tab tracks its own goal and progress bar independently.
// Value is initialized to 0 so the progress bar stays hidden initially.
// ----------------------------------------------------------------
var goals = {
    daily:   { value: 0, steps: 8542,  barId: 'dailyStepsBar',  containerId: 'dailyProgressContainer',  displayId: 'dailyGoalDisplay',  inputId: 'dailyGoalInput',  areaId: 'dailyGoalEditArea',  btnId: 'dailyEditGoalBtn' },
    weekly:  { value: 0, steps: 54210, barId: 'weeklyStepsBar', containerId: 'weeklyProgressContainer', displayId: 'weeklyGoalDisplay', inputId: 'weeklyGoalInput', areaId: 'weeklyGoalEditArea', btnId: 'weeklyEditGoalBtn' },
    custom:  { value: 0, steps: 0,     barId: 'customStepsBar', containerId: 'customProgressContainer', displayId: 'customGoalDisplay', inputId: 'customGoalInput', areaId: 'customGoalEditArea', btnId: 'customEditGoalBtn' }
};

// Helper function to update the bar width and change color dynamically
function setProgressBarVisuals(barId, pct) {
    var barEl = document.getElementById(barId);
    if (!barEl) return;
    
    barEl.style.width = pct + '%';
    
    // Clear previous color classes
    barEl.classList.remove('bg-success', 'bg-info', 'bg-warning', 'bg-danger');
    
    // Apply new color class based on the calculated percentage
    if (pct >= 100) {
        barEl.classList.add('bg-success'); // Green if goal met
    } else if (pct >= 50) {
        barEl.classList.add('bg-info');    // Blue if over halfway
    } else {
        barEl.classList.add('bg-warning'); // Yellow if under halfway
    }
}

function toggleGoalEdit(tab) {
    var g    = goals[tab];
    var area = document.getElementById(g.areaId);
    var disp = document.getElementById(g.displayId);
    var btn  = document.getElementById(g.btnId);
    if (area.classList.contains('d-none')) {
        area.classList.remove('d-none');
        disp.classList.add('d-none');
        // Only prepopulate if they previously set a goal
        if (g.value > 0) {
            document.getElementById(g.inputId).value = g.value;
        }
        btn.innerHTML = '<i class="fas fa-times fa-xs"></i>';
    } else {
        area.classList.add('d-none');
        disp.classList.remove('d-none');
        btn.innerHTML = '<i class="fas fa-pencil-alt fa-xs"></i>';
    }
}

function saveGoal(tab) {
    var g   = goals[tab];
    var val = parseInt(document.getElementById(g.inputId).value);
    
    if (isNaN(val) || val < 1000) { 
        alert('Please enter a valid goal (min 1,000).'); 
        return; 
    }
    
    // Update the system value
    g.value = val;
    var pct = Math.min((g.steps / g.value * 100), 100).toFixed(1);
    
    // Update text display
    var metric = tab === 'custom' ? ' steps/day' : ' steps';
    document.getElementById(g.displayId).textContent = 'Goal: ' + g.value.toLocaleString() + metric;
    
    // Unhide the progress bar container now that a goal exists
    document.getElementById(g.containerId).classList.remove('d-none');
    
    // Update visual width and color
    setProgressBarVisuals(g.barId, pct);
    
    // Close the edit mode
    toggleGoalEdit(tab);
}

// Check on initial load (Will remain hidden because initial values are 0)
(function initGoalBars() {
    Object.keys(goals).forEach(function (tab) {
        var g   = goals[tab];
        if (g.value > 0) {
            var pct = Math.min((g.steps / g.value * 100), 100).toFixed(1);
            setProgressBarVisuals(g.barId, pct);
            document.getElementById(g.containerId).classList.remove('d-none');
        }
    });
}());

// ----------------------------------------------------------------
// SHARED CHART OPTIONS FACTORY
// Keeps all charts looking consistent (font sizes, grid, tooltip).
// ----------------------------------------------------------------
function makeChartOptions(yTickCallback) {
    return {
        maintainAspectRatio: false,
        responsive: true,
        tooltips: {
            callbacks: {
                label: function (item) { return item.yLabel.toLocaleString() + ' steps'; }
            }
        },
        scales: {
            xAxes: [{
                gridLines: { display: false },
                ticks: { fontSize: 13, fontStyle: 'bold' },
                categoryPercentage: 0.9, 
                barPercentage: 0.7
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                    fontSize: 13,
                    callback: yTickCallback || function (v) { return v.toLocaleString(); }
                },
                gridLines: { color: 'rgba(0,0,0,0.05)' }
            }]
        },
        legend: { display: false }
    };
}

// ----------------------------------------------------------------
// DAILY CHART — 24 bars, 12am → 11pm
// Total = 8,542 | Peak = 6pm = 1,850 steps
// Peak bar shows floating tooltip on hover only.
// ----------------------------------------------------------------
document.getElementById('dailyFoodEquiv').textContent = getFoodEquiv(342);

var dailyData = [
    0,   0,   0,   0,   0,   0,     // 12am–5am  sleeping
    320, 980, 450, 200,              // 6am–9am   morning
    150, 90,                         // 10am–11am office
    600, 120,                        // 12pm–1pm  lunch walk
    80,  70,  110, 95,              // 2pm–5pm   afternoon
    1850, 900,                       // 6pm–7pm   peak workout
    310, 150, 60, 7                 // 8pm–11pm  wind down
];
var dailyLabels = [
    '12am','1am','2am','3am','4am','5am',
    '6am','7am','8am','9am','10am','11am',
    '12pm','1pm','2pm','3pm','4pm','5pm',
    '6pm','7pm','8pm','9pm','10pm','11pm'
];
var dailyMax     = Math.max.apply(null, dailyData);
var dailyPeakIdx = dailyData.indexOf(dailyMax);

var dailyOpts = makeChartOptions();
dailyOpts.tooltips = { enabled: false }; // replaced by custom peakTooltip
dailyOpts.hover    = { animationDuration: 0 };

var dailyCtx   = document.getElementById('dailyBarChart').getContext('2d');
var dailyChart = new Chart(dailyCtx, {
    type: 'bar',
    data: {
        labels: dailyLabels,
        datasets: [{
            label: 'Steps',
            data: dailyData,
            backgroundColor: dailyData.map(function (v) {
                return v === dailyMax ? 'rgba(78,115,223,1)' : 'rgba(78,115,223,0.35)';
            }),
            borderColor: 'rgba(78,115,223,0.5)',
            borderWidth: 1
        }]
    },
    options: dailyOpts
});

// Floating "Most Active Hour" on peak bar hover only
var peakTip = document.getElementById('peakTooltip');
document.getElementById('dailyBarChart').addEventListener('mousemove', function (e) {
    var els = dailyChart.getElementsAtEvent(e);
    if (els.length && els[0]._index === dailyPeakIdx) {
        var vm = els[0]._model;
        peakTip.style.left    = vm.x + 'px';
        peakTip.style.top     = (vm.y - 8) + 'px';
        peakTip.style.display = 'block';
    } else {
        peakTip.style.display = 'none';
    }
});
document.getElementById('dailyBarChart').addEventListener('mouseleave', function () {
    peakTip.style.display = 'none';
});

// ----------------------------------------------------------------
// WEEKLY CHART — 7 bars Mon → Sun
// Sum = 54,210 | Wed = 11,200 | Avg = 7,744
// ----------------------------------------------------------------
document.getElementById('weeklyFoodEquiv').textContent = getFoodEquiv(3850);

var weeklyData   = [7200, 8400, 11200, 6800, 9100, 7300, 4210];
var weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var weeklyMax    = Math.max.apply(null, weeklyData);

var weeklyCtx = document.getElementById('weeklyBarChart').getContext('2d');
new Chart(weeklyCtx, {
    type: 'bar',
    data: {
        labels: weeklyLabels,
        datasets: [{
            label: 'Steps',
            data: weeklyData,
            backgroundColor: weeklyData.map(function (v) {
                return v === weeklyMax ? 'rgba(28,200,138,1)' : 'rgba(28,200,138,0.45)';
            }),
            borderColor: 'rgba(28,200,138,0.7)',
            borderWidth: 1
        }]
    },
    options: makeChartOptions()
});

// ----------------------------------------------------------------
// CUSTOM RANGE
// Dynamic Switch: <= 31 days shows Daily Bars. > 31 days shows Monthly Bars.
// ----------------------------------------------------------------
var customChartInstance = null;

function applyCustomRange() {
    var startVal = document.getElementById('startDate').value;
    var endVal   = document.getElementById('endDate').value;
    if (!startVal || !endVal) { alert('Please select both a start and end date.'); return; }

    var start = new Date(startVal);
    var end   = new Date(endVal);
    if (end < start) { alert('End date must be after start date.'); return; }

    // Check if the range is greater than 31 days
    var diffTime = Math.abs(end - start);
    var days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    var isMonthly = days > 31;

    var allLabels  = [];
    var stepsData  = [];
    var totalSteps = 0;
    var maxSteps   = 0;
    var maxLabel   = '';
    var current    = new Date(start);

    if (!isMonthly) {
        // Daily Data Generation
        while (current <= end) {
            var label = current.getDate() + ' ' + current.toLocaleDateString('en-MY', { month: 'short' });
            allLabels.push(label);
            var s = Math.floor(Math.random() * 8000) + 5000;
            stepsData.push(s);
            totalSteps += s;
            if (s > maxSteps) { maxSteps = s; maxLabel = label; }
            current.setDate(current.getDate() + 1);
        }
    } else {
        // Monthly Data Aggregation
        var monthlyAgg = {};
        var labelOrder = [];
        
        while (current <= end) {
            var mLabel = current.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
            if (!monthlyAgg[mLabel]) {
                monthlyAgg[mLabel] = 0;
                labelOrder.push(mLabel);
            }
            // Generate daily steps and add to month bucket
            var dailyS = Math.floor(Math.random() * 8000) + 5000;
            monthlyAgg[mLabel] += dailyS;
            totalSteps += dailyS;
            current.setDate(current.getDate() + 1);
        }

        for (var i = 0; i < labelOrder.length; i++) {
            var l = labelOrder[i];
            allLabels.push(l);
            stepsData.push(monthlyAgg[l]);
            if (monthlyAgg[l] > maxSteps) { 
                maxSteps = monthlyAgg[l]; 
                maxLabel = l; 
            }
        }
    }

    var avgStepsDaily = Math.round(totalSteps / days);
    var totalCals     = Math.round(totalSteps * 0.04);
    var totalSessions = Math.round(days * 0.7);

    // Track the new step value inside goals state
    goals.custom.steps = avgStepsDaily;
    
    // If a custom goal was already set previously, visually update the progress bar
    if (goals.custom.value > 0) {
        var customPct = Math.min((avgStepsDaily / goals.custom.value * 100), 100).toFixed(1);
        setProgressBarVisuals('customStepsBar', customPct);
        document.getElementById('customProgressContainer').classList.remove('d-none');
    }

    // Top Summary Banner
    document.getElementById('customPeriodText').textContent =
        allLabels[0] + ' – ' + allLabels[allLabels.length - 1] + ' (' + days + ' days)';

    // Summary Cards
    document.getElementById('customTotalSteps').textContent  = totalSteps.toLocaleString() + ' steps';
    document.getElementById('customCalories').textContent    = totalCals.toLocaleString() + ' kcal';
    document.getElementById('customFoodEquiv').textContent   = getFoodEquiv(totalCals);
    document.getElementById('customSessions').textContent    = totalSessions + ' Sessions';
    document.getElementById('customAvgSteps').textContent    = avgStepsDaily.toLocaleString() + ' steps / day';

    // Dynamic Insights UI
    if (isMonthly) {
        document.getElementById('customChartTitle').textContent = 'Monthly Steps — ' + allLabels[0] + ' to ' + allLabels[allLabels.length - 1];
        
        document.getElementById('customDaysLabel').textContent = 'Months Tracked';
        document.getElementById('customDays').innerHTML = '<i class="fas fa-calendar-check text-info mr-1"></i>' + allLabels.length + ' months';

        document.getElementById('customBestLabel').textContent = 'Best Month';
        document.getElementById('customBestDay').innerHTML = '<i class="fas fa-trophy text-warning mr-1"></i>' + maxLabel + ' — ' + maxSteps.toLocaleString() + ' steps';
        
        var avgPerMonth = Math.round(totalSteps / allLabels.length);
        document.getElementById('customAvgLabel').textContent = 'Average Steps / Month';
        document.getElementById('customAvgInsight').innerHTML = '<i class="fas fa-shoe-prints text-success mr-1"></i>' + avgPerMonth.toLocaleString() + ' steps';
    } else {
        document.getElementById('customChartTitle').textContent = 'Daily Steps — ' + allLabels[0] + ' to ' + allLabels[allLabels.length - 1];
        
        document.getElementById('customDaysLabel').textContent = 'Days Tracked';
        document.getElementById('customDays').innerHTML = '<i class="fas fa-calendar-check text-info mr-1"></i>' + days + ' days';
        
        document.getElementById('customBestLabel').textContent = 'Best Day in Range';
        document.getElementById('customBestDay').innerHTML = '<i class="fas fa-trophy text-warning mr-1"></i>' + maxLabel + ' — ' + maxSteps.toLocaleString() + ' steps';
        
        document.getElementById('customAvgLabel').textContent = 'Average Steps / Day';
        document.getElementById('customAvgInsight').innerHTML = '<i class="fas fa-shoe-prints text-success mr-1"></i>' + avgStepsDaily.toLocaleString() + ' steps';
    }

    document.getElementById('customEmptyState').classList.add('d-none');
    document.getElementById('customResults').classList.remove('d-none');

    // X-axis: skip labels for long daily ranges only (keep all month labels)
    var displayLabels = allLabels;
    if (!isMonthly) {
        displayLabels = allLabels.map(function (l, i) {
            return (days <= 14 || i % 7 === 0) ? l : '';
        });
    }

    if (customChartInstance) { customChartInstance.destroy(); }

    var customCtx = document.getElementById('customBarChart').getContext('2d');
    customChartInstance = new Chart(customCtx, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'Steps',
                data: stepsData,
                backgroundColor: stepsData.map(function (v) {
                    return v === maxSteps ? 'rgba(78,115,223,1)' : 'rgba(78,115,223,0.4)';
                }),
                borderColor: 'rgba(78,115,223,0.5)',
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            tooltips: {
                enabled: true,
                mode: 'index',
                intersect: true,
                callbacks: {
                    title: function (items) { return allLabels[items[0].index]; },
                    label: function (item)  { return item.yLabel.toLocaleString() + ' steps'; }
                }
            },
            scales: {
                xAxes: [{
                    gridLines: { display: false },
                    ticks: { fontSize: 13, fontStyle: 'bold', autoSkip: false },
                    categoryPercentage: 0.9, 
                    barPercentage: 0.7
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        fontSize: 13,
                        callback: function (v) { 
                            // Format large numbers elegantly for monthly view
                            return isMonthly && v >= 10000 ? (v / 1000).toFixed(0) + 'k' : v.toLocaleString(); 
                        }
                    },
                    gridLines: { color: 'rgba(0,0,0,0.05)' }
                }]
            },
            legend: { display: false }
        }
    });
}

function clearCustomRange() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value   = '';
    document.getElementById('customResults').classList.add('d-none');
    document.getElementById('customEmptyState').classList.remove('d-none');
    if (customChartInstance) { customChartInstance.destroy(); customChartInstance = null; }
}

function resetAll() {
    document.getElementById('daily-tab').click();
    clearCustomRange();
}