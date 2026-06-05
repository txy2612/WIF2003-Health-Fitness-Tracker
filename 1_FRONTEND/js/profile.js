// 1_FRONTEND/js/profile.js

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PROFILE_FIELDS = ['name', 'email', 'age', 'gender', 'weight', 'height', 'goal'];
const BACKEND_URL = 'http://localhost:3000/'; // Used to format photo URLs

// ── TOGGLE EDIT & API SAVE ────────────────────────────────────────────────────

async function toggleEdit(field) {
    const display = document.getElementById('display-' + field);
    const input = document.getElementById('input-' + field);
    const row = display.closest('.profile-field');
    const btn = row.querySelector('.edit-btn i');

    if (input.classList.contains('d-none')) {
        // Enter edit mode
        display.classList.add('d-none');
        input.classList.remove('d-none');
        input.focus();
        btn.classList.remove('fa-pencil-alt');
        btn.classList.add('fa-check');
        btn.closest('button').style.color = '#1cc88a';
        row.style.backgroundColor = '#eaf1fb';
        row.style.borderLeft = '4px solid #4e73df';
        row.style.paddingLeft = '12px';
        row.style.borderRadius = '4px';
        row.style.transition = 'all 0.2s ease';
    } else {
        // Confirm edit & prepare payload
        const rawValue = input.value;
        const originalColor = btn.closest('button').style.color;

        // UI Loading State
        btn.classList.remove('fa-check');
        btn.classList.add('fa-spinner', 'fa-spin');
        btn.closest('button').style.color = '#f6c23e';
        input.disabled = true;

        // API Call to PATCH /profile
        const payload = { [field]: rawValue };
        const result = await window.ProfileService.updateProfile(payload);

        input.disabled = false;

        if (result.success) {
            // Success! Update the UI
            let displayValue = (input.tagName === 'SELECT')
                ? input.options[input.selectedIndex].text
                : input.value;

            if (field === 'age' && displayValue) displayValue += ' years';
            if (field === 'height' && displayValue) displayValue += ' cm';
            if (field === 'weight' && displayValue) displayValue += ' kg';

            // Handle empty state gracefully on the frontend
            display.textContent = displayValue || '—';

            input.classList.add('d-none');
            display.classList.remove('d-none');
            btn.classList.remove('fa-spinner', 'fa-spin');
            btn.classList.add('fa-pencil-alt');
            btn.closest('button').style.color = '#4e73df';
            row.style.backgroundColor = '';
            row.style.borderLeft = '';
            row.style.paddingLeft = '';
            row.style.borderRadius = '';

            if (field === 'goal') updateCalHint();
            if (field === 'name') {
                const nameEl = document.getElementById('profileNameDisplay');
                if (nameEl) nameEl.textContent = displayValue;
            }
        } else {
            // Revert on failure
            alert(result.message || 'Failed to update profile.');
            btn.classList.remove('fa-spinner', 'fa-spin');
            btn.classList.add('fa-check');
            btn.closest('button').style.color = '#1cc88a';
        }
    }
}

// ── RESTORE PROFILE ON PAGE LOAD ─────────────────────────────────────────────

async function restoreProfile() {
    const result = await window.ProfileService.getProfile();

    if (!result.success || !result.data) {
        console.error("Could not load profile:", result.message);
        return;
    }

    // 🚨 THE SMART UN-NESTER 
    // This digs into the object to find your data, no matter how the backend wrapped it
    let profile = result.data;
    if (profile.user) profile = profile.user;
    if (profile.profile) profile = profile.profile;
    if (profile.data) profile = profile.data;

    // Let's print it to the browser console so we can see exactly what arrived!
    console.log("Extracted Profile Data from DB:", profile);

    // Restore avatar image
    if (profile.photo) {
        const avatarDiv = document.getElementById('profileAvatar');
        const photoUrl = profile.photo.startsWith('http') ? profile.photo : BACKEND_URL + profile.photo.replace(/\\/g, '/');

        if (avatarDiv) {
            avatarDiv.innerHTML = `<img src="${photoUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
        const topbar = document.getElementById('topbarProfilePic');
        if (topbar) topbar.innerHTML = `<img src="${photoUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
    }

    // Name display
    const nameEl = document.getElementById('profileNameDisplay');
    if (nameEl && profile.name) nameEl.textContent = profile.name;

    // Restore all editable fields
    PROFILE_FIELDS.forEach(field => {
        const input = document.getElementById('input-' + field);
        const display = document.getElementById('display-' + field);
        if (!input || !display) return;

        // BULLETPROOF EXTRACTION: Don't use || '', explicitly check for null/undefined
        // This ensures that even if a number is 0, it doesn't accidentally get wiped out.
        let dbValue = profile[field];
        if (dbValue === undefined || dbValue === null) {
            dbValue = '';
        }

        input.value = dbValue;
        let displayValue = dbValue;

        // Handle Dropdowns
        if (input.tagName === 'SELECT' && dbValue !== '') {
            const matchedOption = [...input.options].find(o => o.value == dbValue);
            if (matchedOption) displayValue = matchedOption.text;
        }

        // Append text units if a value actually exists
        if (dbValue !== '' && input.tagName !== 'SELECT') {
            if (field === 'age') displayValue += ' years';
            if (field === 'height') displayValue += ' cm';
            if (field === 'weight') displayValue += ' kg';
        }

        display.textContent = displayValue || '—';
    });

    const weightHint = document.getElementById('currentWeightHint');
    if (weightHint) weightHint.textContent = profile.weight ? profile.weight + ' kg' : '—';

    // Check if goal settings exist nested in the profile object
    if (profile.goal && typeof profile.goal === 'object') {
        loadGoalSettings(profile.goal);
    }
}

// ── GOAL CALORIE HINT ─────────────────────────────────────────────────────────

function updateCalHint() {
    const hintEl = document.getElementById('goalCalHint');
    if (!hintEl) return;

    const goalStr = document.getElementById('display-goal')?.textContent?.toLowerCase() || '';
    if (goalStr.includes('lose')) hintEl.textContent = '1,500 – 1,800 kcal';
    else if (goalStr.includes('gain')) hintEl.textContent = '2,500 – 3,000 kcal';
    else hintEl.textContent = '2,000 – 2,200 kcal';
}

// ── GOAL SETTINGS API ─────────────────────────────────────────────────────────

function loadGoalSettings(goals) {
    if (!goals) return;
    if (goals.steps) document.getElementById('goalSteps').value = goals.steps;
    if (goals.calories) document.getElementById('goalCalories').value = goals.calories;
    if (goals.weight) document.getElementById('goalWeight').value = goals.weight;

    // Frontend mock for savedAt since we pull live from DB now
    const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const lastSavedEl = document.getElementById('goalLastSaved');
    if (lastSavedEl) lastSavedEl.textContent = 'Data synced with server';

    showPreview(goals);
}

async function saveGoalSettings() {
    const steps = document.getElementById('goalSteps').value;
    const calories = document.getElementById('goalCalories').value;
    const weight = document.getElementById('goalWeight').value;

    if (!steps && !calories && !weight) {
        alert('Please fill in at least one goal before saving.');
        return;
    }

    const payload = {
        steps: steps || undefined,
        calories: calories || undefined,
        weight: weight || undefined
    };

    const result = await window.ProfileService.updateGoals(payload);

    if (result.success) {
        const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        showPreview(payload);

        const badge = document.getElementById('goalsSavedBadge');
        if (badge) {
            badge.style.display = 'inline-block';
            setTimeout(() => badge.style.display = 'none', 3000);
        }

        const lastSavedEl = document.getElementById('goalLastSaved');
        if (lastSavedEl) lastSavedEl.textContent = 'Last saved: ' + now;
    } else {
        alert(result.message || "Failed to save goals.");
    }
}

async function clearGoalSettings() {
    if (!confirm('Clear all saved goals?')) return;

    const result = await window.ProfileService.clearGoals();

    if (result.success) {
        document.getElementById('goalSteps').value = '';
        document.getElementById('goalCalories').value = '';
        document.getElementById('goalWeight').value = '';
        const lastSavedEl = document.getElementById('goalLastSaved');
        if (lastSavedEl) lastSavedEl.textContent = '';

        const preview = document.getElementById('currentGoalsPreview');
        if (preview) preview.style.display = 'none';

        const badge = document.getElementById('goalsSavedBadge');
        if (badge) badge.style.display = 'none';
    } else {
        alert(result.message || "Failed to clear goals.");
    }
}

function showPreview(goals) {
    const preview = document.getElementById('currentGoalsPreview');
    if (!preview) return;
    preview.style.display = 'block';

    document.getElementById('previewSteps').textContent = goals.steps ? parseInt(goals.steps).toLocaleString() + ' steps' : '—';
    document.getElementById('previewCalories').textContent = goals.calories ? parseInt(goals.calories).toLocaleString() + ' kcal' : '—';
    document.getElementById('previewWeight').textContent = goals.weight ? goals.weight + ' kg' : '—';
}

// ── INIT (DOMContentLoaded) ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {

    // Auth Guard
    if (!window.AuthService || !window.AuthService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    await restoreProfile();
    updateCalHint();

    const goalSelect = document.getElementById('input-goal');
    if (goalSelect) goalSelect.addEventListener('change', updateCalHint);

    // ── PHOTO UPLOAD API ──────────────────────────────────────────────────────
    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
        photoUpload.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Optional: Show immediate UI preview while uploading
            const previewUrl = URL.createObjectURL(file);
            const avatarDiv = document.getElementById('profileAvatar');
            if (avatarDiv) avatarDiv.innerHTML = `<img src="${previewUrl}" alt="Uploading..." style="width:100%;height:100%;object-fit:cover;border-radius:50%; opacity: 0.5;">`;

            // Call Backend
            const result = await window.ProfileService.uploadPhoto(file);

            if (result.success && result.data && result.data.photo) {
                const finalUrl = BACKEND_URL + result.data.photo.replace(/\\/g, '/');

                if (avatarDiv) {
                    avatarDiv.innerHTML = `<img src="${finalUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }
                const topbar = document.getElementById('topbarProfilePic');
                if (topbar) topbar.innerHTML = `<img src="${finalUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                alert(result.message || "Failed to upload photo.");
                // Revert to old profile picture on failure
                await restoreProfile();
            }
        });
    }

    const btnSavePassword = document.getElementById('btnSavePassword');
    if (btnSavePassword) {
        btnSavePassword.addEventListener('click', async function () {
            const currPwInput = document.getElementById('currentPassword');
            const newPwInput = document.getElementById('newPassword');
            const confPwInput = document.getElementById('confirmPassword');

            const currentPw = currPwInput.value;
            const newPw = newPwInput.value;
            const confPw = confPwInput.value;

            if (!currentPw || !newPw || !confPw) {
                alert("Please fill out all password fields.");
                return;
            }
            if (newPw !== confPw) {
                alert("New password and confirm password didn't match!");
                return;
            }
            if (newPw.length < 8) {
                alert("Password need to be atleast 8 characters long.");
                return;
            }

            const originalText = btnSavePassword.innerHTML;
            btnSavePassword.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btnSavePassword.disabled = true;

            const result = await window.ProfileService.changePassword(currentPw, newPw);

            btnSavePassword.innerHTML = originalText;
            btnSavePassword.disabled = false;

            if (result.success) {
                alert("Password updated successfully!")

                currPwInput.value = "";
                newPwInput.value = "";
                confPwInput.value = "";

                if (window.$) {
                    $('#changePasswordSection').collapse('hide');
                }
            } else {
                alert(result.message || "Failed to update password.");
            }

        })
    }

    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async function () {

            const originalText = btnConfirmDelete.innerHTML;
            btnConfirmDelete.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Deleting...';
            btnConfirmDelete.disabled = true;

            const result = await window.ProfileService.deleteProfile();

            if (result.success) {
                if (window.$) {
                    $('#deleteAccountModal').modal('hide');
                }
                alert("Account successfully deleted.");
                window.location.href = 'login.html';
            } else {
                btnConfirmDelete.innerHTML = originalText;
                btnConfirmDelete.disabled = false;
                alert(result.message || "Failed to delete account.");
            }
        })
    }
});