 const MET_VALUES = {
        '🏃 Running':           8.0,
        '🚴 Cycling':           6.0,
        '🏊 Swimming':          6.0,
        '🏋️ Weight Training':  4.5,
        '🧘 Yoga':              2.5,
        '🚶 Walking':           3.5,
        '⚽ Football / Soccer': 7.0,
        '🏸 Badminton':         5.5,
        'Other':                4.0
    };
    const DEFAULT_WEIGHT_KG = 70; // TODO: Phase 2 — pull from profile
    const KCAL_PER_STEP = 0.04;
 
    const BADGE_MAP = {
        '🏃 Running':           'badge-info',
        '🚴 Cycling':           'badge-success',
        '🏊 Swimming':          'badge-primary',
        '🏋️ Weight Training':  'badge-warning text-dark',
        '🧘 Yoga':              'badge-secondary',
        '🚶 Walking':           'badge-light text-dark',
        '⚽ Football / Soccer': 'badge-danger',
        '🏸 Badminton':         'badge-primary',
        'Other':                'badge-dark'
    };
 
    // ── CALORIE CALCULATORS ───────────────────────────────────────────────────
 
    function calcWorkoutCalories(type, durationMins) {
        const met = MET_VALUES[type];
        if (!met || !durationMins) return null;
        return Math.round(met * DEFAULT_WEIGHT_KG * (durationMins / 60));
    }
 
    function calcStepsCalories(steps) {
        if (!steps || steps <= 0) return null;
        return Math.round(steps * KCAL_PER_STEP);
    }
 
    // ── AUTO-DISPLAY (not editable by user) ──────────────────────────────────
 
    function updateWorkoutCalDisplay() {
        const type     = document.getElementById('activityType').value;
        const duration = parseFloat(document.getElementById('duration').value);
        const display  = document.getElementById('workoutCalDisplay');
        const cal      = calcWorkoutCalories(type, duration);
        display.textContent = cal !== null ? cal + ' kcal' : '—';
    }
 
    function updateStepsCalDisplay() {
        const steps   = parseFloat(document.getElementById('stepsCount').value);
        const display = document.getElementById('stepsCalDisplay');
        const cal     = calcStepsCalories(steps);
        display.textContent = cal !== null ? cal + ' kcal' : '—';
    }
 
    // ── SHARED HELPERS ────────────────────────────────────────────────────────
 
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
 
    function appendRow(date, typeBadge, duration, steps, calories, notes) {
        const tbody = document.getElementById('activityTableBody');
        tbody.insertAdjacentHTML('afterbegin', `
            <tr>
                <td>${date}</td>
                <td>${typeBadge}</td>
                <td>${duration}</td>
                <td>${steps}</td>
                <td>${calories}</td>
                <td class="text-muted small">${notes}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm mr-1" onclick="editActivity(this)">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteActivity(this)">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>`);
        const count = tbody.querySelectorAll('tr').length;
        document.getElementById('activityCount').textContent = count + ' Records';
        // TODO: wire to backend — POST /api/activities
    }
 
    // ── LOG WORKOUT ───────────────────────────────────────────────────────────
 
    function logWorkout() {
        const type     = document.getElementById('activityType').value;
        const duration = document.getElementById('duration').value;
        const date     = document.getElementById('activityDate').value;
        const notes    = document.getElementById('notes').value || '—';
 
        if (!type || !duration || !date) {
            alert('Please fill in Activity Type, Duration, and Date.');
            return;
        }
 
        const calories   = calcWorkoutCalories(type, parseFloat(duration));
        const badgeClass = BADGE_MAP[type] || 'badge-secondary';
        const badge      = `<span class="badge ${badgeClass}">${type}</span>`;
 
        appendRow(
            formatDate(date),
            badge,
            duration + ' min',
            '—',
            (calories !== null ? calories + ' kcal' : '—'),
            notes
        );
 
        clearWorkoutForm();
    }
 
    function clearWorkoutForm() {
        document.getElementById('activityType').selectedIndex = 0;
        document.getElementById('duration').value = '';
        document.getElementById('notes').value = '';
        document.getElementById('workoutCalDisplay').textContent = '—';
        document.getElementById('activityDate').value = new Date().toISOString().split('T')[0];
    }
 
    // ── LOG STEPS ─────────────────────────────────────────────────────────────
 
    function logSteps() {
        const steps = document.getElementById('stepsCount').value;
        const date  = document.getElementById('stepsDate').value;
 
        if (!steps || !date) {
            alert('Please fill in Steps and Date.');
            return;
        }
 
        const calories = calcStepsCalories(parseFloat(steps));
        const badge    = `<span class="badge badge-secondary">🚶 Steps Only</span>`;
 
        appendRow(
            formatDate(date),
            badge,
            '—',
            parseInt(steps).toLocaleString(),
            (calories !== null ? calories + ' kcal' : '—'),
            '—'
        );
 
        clearStepsForm();
    }
 
    function clearStepsForm() {
        document.getElementById('stepsCount').value = '';
        document.getElementById('stepsCalDisplay').textContent = '—';
        document.getElementById('stepsDate').value = new Date().toISOString().split('T')[0];
    }
 
    // ── HISTORY ACTIONS ───────────────────────────────────────────────────────
 
    function deleteActivity(btn) {
        if (confirm('Delete this activity record?')) {
            btn.closest('tr').remove();
            const count = document.getElementById('activityTableBody').querySelectorAll('tr').length;
            document.getElementById('activityCount').textContent = count + ' Records';
            // TODO: wire to backend — DELETE /api/activities/:id
        }
    }
 
    function editActivity(btn) {
        alert('Edit functionality coming in Phase 2.');
        // TODO: wire to backend — PUT /api/activities/:id
    }
 
    // ── INIT ──────────────────────────────────────────────────────────────────
 
    document.addEventListener('DOMContentLoaded', function () {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('activityDate').value = today;
        document.getElementById('stepsDate').value = today;
 
        document.getElementById('activityType').addEventListener('change', updateWorkoutCalDisplay);
        document.getElementById('duration').addEventListener('input', updateWorkoutCalDisplay);
        document.getElementById('stepsCount').addEventListener('input', updateStepsCalDisplay);
    });