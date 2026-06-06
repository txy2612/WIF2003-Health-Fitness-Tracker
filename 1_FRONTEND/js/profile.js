// 1_FRONTEND/js/profile.js

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PROFILE_FIELDS = ['name', 'email', 'age', 'gender', 'weight', 'height', 'goal'];
const BACKEND_URL = 'http://localhost:3000/';

let currentProfileData = {};

function getProfileFromResponse(data) {
    if (!data) return {};
    return data.user || data.profile || data.data || data;
}

function getGoalsFromResponse(data) {
    if (!data) return {};
    return data.goals || data.user?.goals || data.profile?.goals || {};
}

function getDisplayValue(field, input, value) {
    if (value === undefined || value === null || value === '') return '—';

    if (input.tagName === 'SELECT') {
        const matchedOption = [...input.options].find(option => option.value == value);
        return matchedOption ? matchedOption.text : value;
    }

    if (field === 'age') return value + ' years';
    if (field === 'height') return value + ' cm';
    if (field === 'weight') return value + ' kg';
    return value;
}

function getPhotoUrl(photo) {
    if (!photo) return '';
    return photo.startsWith('http') ? photo : BACKEND_URL + photo.replace(/\\/g, '/');
}

// ── TOGGLE EDIT & API SAVE ────────────────────────────────────────────────────

async function toggleEdit(field) {
    const display = document.getElementById('display-' + field);
    const input = document.getElementById('input-' + field);
    const row = display.closest('.profile-field');
    const btn = row.querySelector('.edit-btn i');
    const button = btn.closest('button');

    if (input.classList.contains('d-none')) {
        // Enter edit mode
        display.classList.add('d-none');
        input.classList.remove('d-none');
        input.focus();
        btn.classList.remove('fa-pencil-alt');
        btn.classList.add('fa-check');
        button.style.color = '#1cc88a';
        row.style.backgroundColor = '#eaf1fb';
        row.style.borderLeft = '4px solid #4e73df';
        row.style.paddingLeft = '12px';
        row.style.borderRadius = '4px';
        row.style.transition = 'all 0.2s ease';
        return;
    }

    const rawValue = input.value;

    btn.classList.remove('fa-check');
    btn.classList.add('fa-spinner', 'fa-spin');
    button.style.color = '#f6c23e';
    input.disabled = true;

    const result = await window.ProfileService.updateProfile({ [field]: rawValue });
    input.disabled = false;

    if (!result.success) {
        alert(result.message || 'Failed to update profile.');
        btn.classList.remove('fa-spinner', 'fa-spin');
        btn.classList.add('fa-check');
        button.style.color = '#1cc88a';
        return;
    }

    currentProfileData[field] = rawValue;
    display.textContent = getDisplayValue(field, input, rawValue);
    input.classList.add('d-none');
    display.classList.remove('d-none');
    btn.classList.remove('fa-spinner', 'fa-spin');
    btn.classList.add('fa-pencil-alt');
    button.style.color = '#4e73df';
    row.style.backgroundColor = '';
    row.style.borderLeft = '';
    row.style.paddingLeft = '';
    row.style.borderRadius = '';

    if (field === 'goal') updateCalHint();
    if (field === 'name') {
        const nameEl = document.getElementById('profileNameDisplay');
        if (nameEl) nameEl.textContent = rawValue || '—';
    }
}

// ── RESTORE PROFILE ON PAGE LOAD ─────────────────────────────────────────────

async function restoreProfile() {
    const result = await window.ProfileService.getProfile();

    if (!result.success || !result.data) {
        console.error('Could not load profile:', result.message);
        return;
    }

    const profile = getProfileFromResponse(result.data);
    const goals = getGoalsFromResponse(result.data);
    currentProfileData = profile;

    const photoUrl = getPhotoUrl(profile.photo);
    if (photoUrl) {
        const avatarDiv = document.getElementById('profileAvatar');
        if (avatarDiv) {
            avatarDiv.innerHTML = `<img src="${photoUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }

        const topbar = document.getElementById('topbarProfilePic');
        if (topbar) {
            topbar.innerHTML = `<img src="${photoUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
        }
    }

    const nameEl = document.getElementById('profileNameDisplay');
    if (nameEl) nameEl.textContent = profile.name || profile.displayName || '—';

    PROFILE_FIELDS.forEach(field => {
        const input = document.getElementById('input-' + field);
        const display = document.getElementById('display-' + field);
        if (!input || !display) return;

        const value = profile[field] ?? '';
        input.value = value;
        display.textContent = getDisplayValue(field, input, value);
    });

    const weightHint = document.getElementById('currentWeightHint');
    if (weightHint) weightHint.textContent = profile.weight ? profile.weight + ' kg' : '—';

    loadGoalSettings(goals);
}

// ── GOAL CALORIE HINT ─────────────────────────────────────────────────────────

function updateCalHint() {
    const hintEl = document.getElementById('goalCalHint');
    if (!hintEl) return;

    const goal = currentProfileData.goal || document.getElementById('display-goal')?.textContent?.toLowerCase() || '';
    if (goal.includes('lose')) hintEl.textContent = '1,500 – 1,800 kcal';
    else if (goal.includes('gain')) hintEl.textContent = '2,500 – 3,000 kcal';
    else hintEl.textContent = '2,000 – 2,200 kcal';
}

// ── GOAL SETTINGS API ─────────────────────────────────────────────────────────

function loadGoalSettings(goals = {}) {
    if (goals.steps) document.getElementById('goalSteps').value = goals.steps;
    if (goals.calories) document.getElementById('goalCalories').value = goals.calories;
    if (goals.weight) document.getElementById('goalWeight').value = goals.weight;

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

    const goals = {
        steps: steps || undefined,
        calories: calories || undefined,
        weight: weight || undefined,
    };

    const result = await window.ProfileService.updateGoals(goals);

    if (!result.success) {
        alert(result.message || 'Failed to save goals.');
        return;
    }

    const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    showPreview(goals);

    const badge = document.getElementById('goalsSavedBadge');
    if (badge) {
        badge.style.display = 'inline-block';
        setTimeout(() => badge.style.display = 'none', 3000);
    }

    const lastSavedEl = document.getElementById('goalLastSaved');
    if (lastSavedEl) lastSavedEl.textContent = 'Last saved: ' + now;
}

async function clearGoalSettings() {
    if (!confirm('Clear all saved goals?')) return;

    const result = await window.ProfileService.clearGoals();

    if (!result.success) {
        alert(result.message || 'Failed to clear goals.');
        return;
    }

    document.getElementById('goalSteps').value = '';
    document.getElementById('goalCalories').value = '';
    document.getElementById('goalWeight').value = '';

    const lastSavedEl = document.getElementById('goalLastSaved');
    if (lastSavedEl) lastSavedEl.textContent = '';

    const preview = document.getElementById('currentGoalsPreview');
    if (preview) preview.style.display = 'none';

    const badge = document.getElementById('goalsSavedBadge');
    if (badge) badge.style.display = 'none';
}

function showPreview(goals = {}) {
    const preview = document.getElementById('currentGoalsPreview');
    if (!preview) return;

    preview.style.display = 'block';
    document.getElementById('previewSteps').textContent = goals.steps ? parseInt(goals.steps).toLocaleString() + ' steps' : '—';
    document.getElementById('previewCalories').textContent = goals.calories ? parseInt(goals.calories).toLocaleString() + ' kcal' : '—';
    document.getElementById('previewWeight').textContent = goals.weight ? goals.weight + ' kg' : '—';
}

// ── INIT (DOMContentLoaded) ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    if (!window.AuthService || !window.AuthService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    await restoreProfile();
    updateCalHint();

    const goalSelect = document.getElementById('input-goal');
    if (goalSelect) goalSelect.addEventListener('change', updateCalHint);

    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
        photoUpload.addEventListener('change', async function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const previewUrl = URL.createObjectURL(file);
            const avatarDiv = document.getElementById('profileAvatar');
            if (avatarDiv) {
                avatarDiv.innerHTML = `<img src="${previewUrl}" alt="Uploading..." style="width:100%;height:100%;object-fit:cover;border-radius:50%; opacity: 0.5;">`;
            }

            const result = await window.ProfileService.uploadPhoto(file);

            if (result.success && result.data?.photo) {
                const finalUrl = getPhotoUrl(result.data.photo);

                if (avatarDiv) {
                    avatarDiv.innerHTML = `<img src="${finalUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }

                const topbar = document.getElementById('topbarProfilePic');
                if (topbar) {
                    topbar.innerHTML = `<img src="${finalUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
                }
            } else {
                alert(result.message || 'Failed to upload photo.');
                await restoreProfile();
            }
        });
    }

    const btnSavePassword = document.getElementById('btnSavePassword');
    if (btnSavePassword) {
        btnSavePassword.addEventListener('click', async function () {
            const currentInput = document.getElementById('currentPassword');
            const newInput = document.getElementById('newPassword');
            const confirmInput = document.getElementById('confirmPassword');

            if (!currentInput.value || !newInput.value || !confirmInput.value) {
                alert('Please fill out all password fields.');
                return;
            }

            if (newInput.value !== confirmInput.value) {
                alert("New password and confirm password didn't match!");
                return;
            }

            if (newInput.value.length < 8) {
                alert('Password needs to be at least 8 characters long.');
                return;
            }

            const originalText = btnSavePassword.innerHTML;
            btnSavePassword.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btnSavePassword.disabled = true;

            const result = await window.ProfileService.changePassword(currentInput.value, newInput.value);

            btnSavePassword.innerHTML = originalText;
            btnSavePassword.disabled = false;

            if (!result.success) {
                alert(result.message || 'Failed to update password.');
                return;
            }

            alert('Password updated successfully!');
            currentInput.value = '';
            newInput.value = '';
            confirmInput.value = '';

            if (window.$) {
                $('#changePasswordSection').collapse('hide');
            }
        });
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
                alert('Account successfully deleted.');
                window.AuthService.logout();
                return;
            }

            btnConfirmDelete.innerHTML = originalText;
            btnConfirmDelete.disabled = false;
            alert(result.message || 'Failed to delete account.');
        });
    }
});
