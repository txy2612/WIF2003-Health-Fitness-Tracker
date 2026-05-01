// ======================================================
// GLOBAL HELPERS
// ======================================================

function number_format(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getChartOptions(maxTicks = 5) {
    return {
        maintainAspectRatio: false,
        layout: {
            padding: { left: 10, right: 25, top: 25, bottom: 0 }
        },
        scales: {
            xAxes: [{
                gridLines: { display: false, drawBorder: false },
                maxBarThickness: 25
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                    maxTicksLimit: maxTicks,
                    padding: 10,
                    callback: value => number_format(value)
                },
                gridLines: {
                    color: "rgb(234, 236, 244)",
                    zeroLineColor: "rgb(234, 236, 244)",
                    drawBorder: false,
                    borderDash: [2],
                    zeroLineBorderDash: [2]
                }
            }]
        },
        legend: { display: false },
        tooltips: {
            titleMarginBottom: 10,
            titleFontColor: '#6e707e',
            titleFontSize: 14,
            backgroundColor: "rgb(255,255,255)",
            bodyFontColor: "#858796",
            borderColor: '#dddfeb',
            borderWidth: 1,
            xPadding: 15,
            yPadding: 15,
            displayColors: false,
            caretPadding: 10,
            callbacks: {
                label: function(tooltipItem, chart) {
                    return chart.datasets[tooltipItem.datasetIndex].label +
                        ": " + number_format(tooltipItem.yLabel) + " steps";
                }
            }
        }
    };
}


// ======================================================
// DAILY CHART (BLUE — OK)
// ======================================================

var dailyData = [
    0,0,0,0,0,0,
    320,980,450,200,
    150,90,
    600,120,
    80,70,110,95,
    1850,900,
    310,150,60,7
];

var dailyLabels = [
    '12am','1am','2am','3am','4am','5am',
    '6am','7am','8am','9am',
    '10am','11am',
    '12pm','1pm',
    '2pm','3pm','4pm','5pm',
    '6pm','7pm',
    '8pm','9pm','10pm','11pm'
];

var dailyMax = Math.max(...dailyData);

new Chart(document.getElementById('dailyBarChart'), {
    type: 'bar',
    data: {
        labels: dailyLabels,
        datasets: [{
            label: "Steps",
            data: dailyData,
            backgroundColor: dailyData.map(v =>
                v === dailyMax ? "#4e73df" : "rgba(78,115,223,0.4)"
            ),
            hoverBackgroundColor: "#2e59d9",
            borderColor: "#4e73df"
        }]
    },
    options: getChartOptions(6)
});


// ======================================================
// WEEKLY CHART (FIXED → NOW BLUE ✅)
// ======================================================

var weeklyData   = [7200, 8400, 11200, 6800, 9100, 7300, 4210];
var weeklyLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

var weeklyMax = Math.max(...weeklyData);

new Chart(document.getElementById('weeklyBarChart'), {
    type: 'bar',
    data: {
        labels: weeklyLabels,
        datasets: [{
            label: "Steps",
            data: weeklyData,
            // 🔥 FIXED HERE (green → blue)
            backgroundColor: weeklyData.map(v =>
                v === weeklyMax ? "#4e73df" : "rgba(78,115,223,0.4)"
            ),
            hoverBackgroundColor: "#2e59d9",
            borderColor: "#4e73df"
        }]
    },
    options: getChartOptions()
});


// ======================================================
// CUSTOM RANGE CHART (UNCHANGED — BLUE OK)
// ======================================================

var customChart = null;

function applyCustomRange() {
    var startVal = document.getElementById('startDate').value;
    var endVal   = document.getElementById('endDate').value;

    if (!startVal || !endVal) {
        alert('Please select both dates');
        return;
    }

    var start = new Date(startVal);
    var end   = new Date(endVal);

    if (end < start) {
        alert('End date must be after start date');
        return;
    }

    var labels = [];
    var data   = [];

    var total = 0;
    var max   = 0;
    var bestDay = "";

    var current = new Date(start);

    while (current <= end) {
        var label = current.getDate() + ' ' +
            current.toLocaleDateString('en-MY', { month: 'short' });

        var steps = Math.floor(Math.random() * 8000) + 5000;

        labels.push(label);
        data.push(steps);

        total += steps;

        if (steps > max) {
            max = steps;
            bestDay = label;
        }

        current.setDate(current.getDate() + 1);
    }

    var days = data.length;
    var avg  = Math.round(total / days);
    var calories = Math.round(total * 0.04);
    var sessions = Math.round(days * 0.7);

    document.getElementById('customSteps').textContent = number_format(total) + " steps";
    document.getElementById('customCalories').textContent = number_format(calories) + " kcal";
    document.getElementById('customSessions').textContent = sessions + " sessions";

    document.getElementById('customBestDay').innerHTML =
        '<i class="fas fa-trophy text-warning mr-1"></i>' +
        bestDay + ' — ' + number_format(max) + ' steps';

    document.getElementById('customAvg').innerHTML =
        '<i class="fas fa-shoe-prints text-success mr-1"></i>' +
        number_format(avg) + ' steps';

    document.getElementById('customDays').innerHTML =
        '<i class="fas fa-calendar-check text-info mr-1"></i>' +
        days + ' days';

    document.getElementById('customEmptyState').classList.add('d-none');
    document.getElementById('customResults').classList.remove('d-none');

    if (customChart) customChart.destroy();

    customChart = new Chart(document.getElementById('customBarChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: "Steps",
                data: data,
                backgroundColor: data.map(v =>
                    v === max ? "#4e73df" : "rgba(78,115,223,0.4)"
                ),
                hoverBackgroundColor: "#2e59d9",
                borderColor: "#4e73df"
            }]
        },
        options: getChartOptions(6)
    });
}

function clearCustomRange() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value   = '';

    document.getElementById('customResults').classList.add('d-none');
    document.getElementById('customEmptyState').classList.remove('d-none');

    if (customChart) {
        customChart.destroy();
        customChart = null;
    }
}

function resetAll() {
    document.getElementById('daily-tab').click();
    clearCustomRange();
}