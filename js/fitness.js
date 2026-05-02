
    // Set today's date as default in the form
    document.addEventListener('DOMContentLoaded', function () {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('activityDate').value = today;
        const now = new Date().toTimeString().slice(0, 5);
        document.getElementById('activityTime').value = now;
    });
 
    function clearForm() {
        document.getElementById('activityType').selectedIndex = 0;
        document.getElementById('duration').value = '';
        document.getElementById('steps').value = '';
        document.getElementById('calories').value = '';
        document.getElementById('notes').value = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('activityDate').value = today;
    }
 
    function logActivity() {
        const type = document.getElementById('activityType').value;
        const duration = document.getElementById('duration').value;
        const date = document.getElementById('activityDate').value;
        const steps = document.getElementById('steps').value || '0';
        const calories = document.getElementById('calories').value || '0';
        const notes = document.getElementById('notes').value || '—';
 
        if (!type || !duration || !date) {
            alert('Please fill in Activity Type, Duration, and Date.');
            return;
        }
 
        // Format date for display
        const d = new Date(date);
        const displayDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
 
        // Badge colour based on type
        const badgeMap = {
            '🏃 Running': 'badge-info',
            '🚴 Cycling': 'badge-success',
            '🏊 Swimming': 'badge-primary',
            '🏋️ Weight Training': 'badge-warning text-dark',
            '🧘 Yoga': 'badge-secondary',
            '🚶 Walking': 'badge-light text-dark',
            '⚽ Football / Soccer': 'badge-danger',
            '🏸 Badminton': 'badge-primary',
            'Other': 'badge-dark'
        };
        const badgeClass = badgeMap[type] || 'badge-secondary';
 
        const tbody = document.getElementById('activityTableBody');
        const newRow = `
            <tr>
                <td>${displayDate}</td>
                <td><span class="badge ${badgeClass}">${type}</span></td>
                <td>${duration} min</td>
                <td>${parseInt(steps).toLocaleString()}</td>
                <td>${parseInt(calories).toLocaleString()} kcal</td>
                <td class="text-muted small">${notes}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm mr-1" onclick="editActivity(this)">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteActivity(this)">
                        <i class="fas fa-trash"></i> Delete
                        <!-- TODO: wire to backend — DELETE /api/activities/:id -->
                    </button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('afterbegin', newRow);
 
        // Update record count badge
        const count = tbody.querySelectorAll('tr').length;
        document.getElementById('activityCount').textContent = count + ' Records';
 
        clearForm();
        alert('Activity logged successfully!');
        // TODO: wire to backend — POST /api/activities
    }
 
    function deleteActivity(btn) {
        if (confirm('Delete this activity record?')) {
            const row = btn.closest('tr');
            row.remove();
            const count = document.getElementById('activityTableBody').querySelectorAll('tr').length;
            document.getElementById('activityCount').textContent = count + ' Records';
            // TODO: wire to backend — DELETE /api/activities/:id
        }
    }
 
    function editActivity(btn) {
        // Placeholder — Phase 2 will open an edit modal or inline edit
        alert('Edit functionality coming in Phase 2.');
        // TODO: wire to backend — PUT /api/activities/:id
    }