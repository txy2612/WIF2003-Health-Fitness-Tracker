const SIDEBAR_HTML = `
    <ul class="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion" id="accordionSidebar">

        <!-- Brand -->
        <a class="sidebar-brand d-flex align-items-center justify-content-center" href="dashboard.html">
            <div class="sidebar-brand-text" style="font-size:1.25rem; font-weight:800; letter-spacing:-0.5px;">
                Fit<span style="opacity:0.65;">Track</span>
            </div>
        </a>

        <hr class="sidebar-divider my-0">

        <!-- Dashboard -->
        <li class="nav-item">
            <a class="nav-link" href="dashboard.html">
                <i class="fas fa-fw fa-tachometer-alt"></i>
                <span>Dashboard</span>
            </a>
        </li>

        <hr class="sidebar-divider">
        <div class="sidebar-heading">Tracking</div>

        <!-- Log Workout -->
        <li class="nav-item">
            <a class="nav-link" href="fitness-tracker.html">
                <i class="fas fa-fw fa-dumbbell"></i>
                <span>Log Workout</span>
            </a>
        </li>

        <!-- Nutrition Planner -->
        <li class="nav-item">
            <a class="nav-link" href="nutrition-planner.html">
                <i class="fas fa-fw fa-apple-alt"></i>
                <span>Nutrition Planner</span>
            </a>
        </li>

        <!-- Progress Charts -->
        <li class="nav-item">
            <a class="nav-link" href="progress-charts.html">
                <i class="fas fa-fw fa-chart-line"></i>
                <span>Progress Charts</span>
            </a>
        </li>

        <hr class="sidebar-divider">
        <div class="sidebar-heading">Account</div>

        <!-- Notifications -->
        <li class="nav-item">
            <a class="nav-link" href="notification.html">
                <i class="fas fa-fw fa-bell"></i>
                <span>Notifications</span>
            </a>
        </li>

        <!-- Profile -->
        <li class="nav-item">
            <a class="nav-link" href="profile.html">
                <i class="fas fa-fw fa-user"></i>
                <span>Profile</span>
            </a>
        </li>

        <hr class="sidebar-divider d-none d-md-block">


    </ul>`;


const TOPBAR_HTML = `
    <nav class="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">

        <!-- Sidebar Toggle (mobile) -->
        <button id="sidebarToggleTop" class="btn btn-link d-md-none rounded-circle mr-3">
            <i class="fa fa-bars"></i>
        </button>

        <!-- Page title -->
        <span class="topbar-page-title d-none d-sm-inline font-weight-bold text-gray-800"
              style="font-size:0.95rem; letter-spacing:-0.2px;">
        </span>

        <!-- Right side -->
        <ul class="navbar-nav ml-auto">

            <!-- Notifications bell -->
            <li class="nav-item no-arrow mx-1">
                <a class="nav-link" href="notification.html">
                    <i class="fas fa-bell fa-fw"></i>
                    <!-- You can keep the counter badge here! -->
                    <span class="badge badge-danger badge-counter">2</span>
                </a>
            </li>

            <div class="topbar-divider d-none d-sm-block"></div>

            <!-- User dropdown -->
            <li class="nav-item dropdown no-arrow">
                <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button"
                    data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    <span class="mr-2 d-none d-lg-inline text-gray-600 small">My Profile</span>
                    <div id="topbarProfilePic" class="rounded-circle d-flex align-items-center justify-content-center"
                         style="width:32px;height:32px;background:#e8f0fe;overflow:hidden;flex-shrink:0;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4e73df" width="20" height="20">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                    </div>
                </a>
                <div class="dropdown-menu dropdown-menu-right shadow animated--grow-in"
                    aria-labelledby="userDropdown">
                    <a class="dropdown-item" href="profile.html">
                        <i class="fas fa-user fa-sm fa-fw mr-2 text-gray-400"></i> Profile
                    </a>
                    <div class="dropdown-divider"></div>
                    <a class="dropdown-item" href="#" data-toggle="modal" data-target="#logoutModal">
                        <i class="fas fa-sign-out-alt fa-sm fa-fw mr-2 text-gray-400"></i> Logout
                    </a>
                </div>
            </li>

        </ul>
    </nav>`;

const FOOTER_HTML = `
    <footer class="sticky-footer bg-white">
        <div class="container my-auto">
            <div class="copyright text-center my-auto">
                <span>Copyright &copy; FitTrack 2026</span>
            </div>
        </div>
    </footer>`;

const EXTRAS_HTML = `
    <!-- Scroll to Top -->
    <a class="scroll-to-top rounded" href="#page-top">
        <i class="fas fa-angle-up"></i>
    </a>

    <!-- Logout Modal -->
    <div class="modal fade" id="logoutModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Ready to leave?</h5>
                    <button class="close" type="button" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div class="modal-body">
                    Select "Logout" below if you are ready to end your current session.
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" type="button" data-dismiss="modal">Cancel</button>
                    <a class="btn btn-primary" href="login.html">Logout</a>
                </div>
            </div>
        </div>
    </div>`;


// ── LAYOUT FIX ────────────────────────────────────────────────────
// The placeholder divs break sb-admin-2's flex + fixed positioning.
// This patch restores the expected sidebar + topbar behaviour.
(function () {
    const style = document.createElement('style');
    style.textContent = `
        /* Give the sidebar placeholder the same width as the sidebar
           so content-wrapper starts at the right position */
        #sidebar-placeholder {
            width: 224px;
            flex-shrink: 0;
        }

        /* Keep the sidebar fixed to the left, full height, scrollable */
        #sidebar-placeholder .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            overflow-y: auto;
            z-index: 1030;
        }

        /* Stick the topbar to the top as you scroll */
        #topbar-placeholder .navbar {
            position: sticky;
            top: 0;
            z-index: 1020;
        }
    `;
    document.head.appendChild(style);
})();



// functions should exist before called -> placed before DOMContentLoaded
function updateNotificationBadge() {
    const reminders = JSON.parse(localStorage.getItem('fittrack_reminders') || '[]');
    const activeCount = reminders.filter(r => !r.completed).length;

    const badge = document.querySelector('.badge-counter');
    if (badge) {
        badge.textContent = activeCount > 0 ? activeCount : '';
        badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
    }
}

const FITTRACK_REMINDER_STORAGE_KEY = 'fittrack_reminders';
const MAX_REMINDER_TIMEOUT_MS = 2147483647;
let fitTrackReminderTimers = new Map();
let fitTrackReminderInterval = null;

function getStoredFitTrackReminders() {
    try {
        return JSON.parse(localStorage.getItem(FITTRACK_REMINDER_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function getReminderDueDate(reminder) {
    if (reminder.scheduledFor) {
        const scheduledDate = new Date(reminder.scheduledFor);
        if (!Number.isNaN(scheduledDate.getTime())) return scheduledDate;
    }

    if (reminder.datetime) {
        const localDate = new Date(String(reminder.datetime).replace(' ', 'T'));
        if (!Number.isNaN(localDate.getTime())) return localDate;
    }

    return null;
}

function getReminderNotificationText(reminder) {
    const title = reminder.title || reminder.type || 'FitTrack Reminder';
    const body = reminder.note && reminder.note.trim()
        ? reminder.note.trim()
        : `Time for ${reminder.type || 'your activity'}.`;

    return { title, body };
}

function showReminderNotification(reminder) {
    const { title, body } = getReminderNotificationText(reminder);

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            tag: `fittrack-reminder-${reminder.id}`,
        });
        return;
    }

    alert(`${title}\n${body}`);
}

function markReminderNotificationShown(reminderId) {
    const storedReminders = getStoredFitTrackReminders();
    const reminder = storedReminders.find(item => String(item.id) === String(reminderId));

    if (!reminder || reminder.completed || reminder.notificationShownAt) return;

    reminder.notificationShownAt = new Date().toISOString();
    localStorage.setItem(FITTRACK_REMINDER_STORAGE_KEY, JSON.stringify(storedReminders));
    updateNotificationBadge();
}

function processDueFitTrackReminder(reminderId) {
    const reminder = getStoredFitTrackReminders()
        .find(item => String(item.id) === String(reminderId));

    if (!reminder || reminder.completed || reminder.notificationShownAt) return;

    const dueDate = getReminderDueDate(reminder);
    if (!dueDate || dueDate > new Date()) return;

    showReminderNotification(reminder);
    markReminderNotificationShown(reminder.id);
}

function scheduleFitTrackReminders() {
    fitTrackReminderTimers.forEach(timerId => clearTimeout(timerId));
    fitTrackReminderTimers = new Map();

    const now = new Date();
    getStoredFitTrackReminders()
        .filter(reminder => !reminder.completed && !reminder.notificationShownAt)
        .forEach(reminder => {
            const dueDate = getReminderDueDate(reminder);
            if (!dueDate) return;

            const delay = dueDate.getTime() - now.getTime();

            if (delay <= 0) {
                processDueFitTrackReminder(reminder.id);
                return;
            }

            if (delay <= MAX_REMINDER_TIMEOUT_MS) {
                const timerId = setTimeout(() => {
                    processDueFitTrackReminder(reminder.id);
                    fitTrackReminderTimers.delete(String(reminder.id));
                }, delay);

                fitTrackReminderTimers.set(String(reminder.id), timerId);
            }
        });
}

window.scheduleFitTrackReminders = scheduleFitTrackReminders;

document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.remove('layout-ready');

    // Inject shared layout components
    const sidebarEl = document.getElementById('sidebar-placeholder');
    if (sidebarEl) sidebarEl.innerHTML = SIDEBAR_HTML;

    const topbarEl = document.getElementById('topbar-placeholder');
    if (topbarEl) topbarEl.innerHTML = TOPBAR_HTML;

    const footerEl = document.getElementById('footer-placeholder');
    if (footerEl) footerEl.innerHTML = FOOTER_HTML;

    const extrasEl = document.getElementById('extras-placeholder');
    if (extrasEl) extrasEl.innerHTML = EXTRAS_HTML;

    // Highlight the sidebar link that matches the current page
    const page = window.location.pathname.split('/').pop();
    const activeLink = document.querySelector(`.nav-link[href="${page}"]`);
    if (activeLink) activeLink.closest('.nav-item').classList.add('active');

    // Set topbar page title from the active sidebar link
    const activeLinkSpan = document.querySelector('.nav-item.active .nav-link span');
    const titleEl = document.querySelector('.topbar-page-title');
    if (activeLinkSpan && titleEl) titleEl.textContent = activeLinkSpan.textContent.trim();

    // Notification badge — count from saved reminders
    const reminders = JSON.parse(localStorage.getItem('fittrack_reminders') || '[]');
    const activeCount = reminders.filter(r => !r.completed).length;
    const badge = document.querySelector('.badge-counter');
    if (badge) badge.textContent = activeCount > 0 ? activeCount : '';

    scheduleFitTrackReminders();

    if (!fitTrackReminderInterval) {
        fitTrackReminderInterval = setInterval(scheduleFitTrackReminders, 30000);
    }

    // Restore saved profile photo in topbar (works on every page)
    try {
        const profile = JSON.parse(localStorage.getItem('fittrack_profile')) || {};
        if (profile.photo) {
            const pic = document.getElementById('topbarProfilePic');
            if (pic) pic.innerHTML = `<img src="${profile.photo}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
        }
    } catch (e) { }

    document.body.classList.add('layout-ready');
});

window.addEventListener('storage', function (event) {
    if (event.key === FITTRACK_REMINDER_STORAGE_KEY) {
        updateNotificationBadge();
        scheduleFitTrackReminders();
    }
});
