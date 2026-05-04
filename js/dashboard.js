    // Date display
    document.getElementById('dashDate').textContent =
        new Date().toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
 
    // Mini weekly bar chart
    document.addEventListener('DOMContentLoaded', function () {
        const ctx = document.getElementById('dashWeeklyChart');
        if (!ctx) return;
 
        const steps   = [6200, 9800, 11200, 7500, 8450, 0, 0];
        const today   = new Date().getDay(); // 0=Sun
        const todayIdx = today === 0 ? 6 : today - 1;
        const colors  = steps.map((v, i) => {
            if (v === 0)     return 'rgba(200,200,200,0.3)';
            if (i === todayIdx) return '#4e73df';
            return 'rgba(78,115,223,0.5)';
        });
 
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
                datasets: [{
                    label: 'Steps',
                    data: steps,
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
                    callbacks: {
                        label: ctx => ctx.yLabel > 0 ? ` ${ctx.yLabel.toLocaleString()} steps` : ' No data'
                    }
                },
                scales: {
                    xAxes: [{ gridLines: { display: false }, ticks: { fontSize: 11 } }],
                    yAxes: [{ ticks: { beginAtZero: true, callback: v => v.toLocaleString(), fontSize: 10 }, gridLines: { color: 'rgb(234,236,244)' } }]
                }
            }
        });
    });

    //Dashboard bridge
// Reads saved goals from localStorage and wires up Dashboard progress bars
 document.addEventListener('DOMContentLoaded', function () {
    const goals = JSON.parse(localStorage.getItem('fittrack_goals') || '{}');

    const todaySteps = 8450;
    const todayCal   = 560;

    // STEPS
    if (goals.steps) {
        const goal = parseInt(goals.steps);
        const pct  = Math.min(Math.round((todaySteps / goal) * 100), 100);
        const rem  = Math.max(0, goal - todaySteps).toLocaleString();

        document.getElementById('stepsProgressBar').style.width = pct + '%';
        document.getElementById('stepsPct').textContent = pct + '%';
        document.getElementById('stepsRemaining').textContent = rem + ' steps remaining';
    }

    // CALORIES
    if (goals.calories) {
        const goal = parseInt(goals.calories);
        const pct  = Math.min(Math.round((todayCal / goal) * 100), 100);

        document.getElementById('calProgressBar').style.width = pct + '%';
    }
});