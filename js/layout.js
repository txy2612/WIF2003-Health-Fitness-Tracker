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

        <!-- Sidebar Toggler -->
        <div class="text-center d-none d-md-inline">
            <button class="rounded-circle border-0" id="sidebarToggle"></button>
        </div>

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
            <li class="nav-item dropdown no-arrow mx-1">
                <a class="nav-link dropdown-toggle" href="#" id="alertsDropdown" role="button"
                    data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    <i class="fas fa-bell fa-fw"></i>
                    <span class="badge badge-danger badge-counter">2</span>
                </a>
                <div class="dropdown-list dropdown-menu dropdown-menu-right shadow animated--grow-in"
                    aria-labelledby="alertsDropdown">
                    <h6 class="dropdown-header">Notifications</h6>
                    <a class="dropdown-item d-flex align-items-center" href="notification.html">
                        <div class="mr-3">
                            <div class="icon-circle bg-primary">
                                <i class="fas fa-dumbbell text-white"></i>
                            </div>
                        </div>
                        <div>
                            <div class="small text-gray-500">Today, 7:00 AM</div>
                            <span class="font-weight-bold">Workout reminder — Morning Run</span>
                        </div>
                    </a>
                    <a class="dropdown-item d-flex align-items-center" href="notification.html">
                        <div class="mr-3">
                            <div class="icon-circle bg-success">
                                <i class="fas fa-apple-alt text-white"></i>
                            </div>
                        </div>
                        <div>
                            <div class="small text-gray-500">Today, 12:30 PM</div>
                            <span class="font-weight-bold">Lunch log reminder</span>
                        </div>
                    </a>
                    <a class="dropdown-item text-center small text-gray-500" href="notification.html">
                        View All Notifications
                    </a>
                </div>
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


document.addEventListener('DOMContentLoaded', function () {

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

    // Restore saved profile photo in topbar (works on every page)
    try {
        const profile = JSON.parse(localStorage.getItem('fittrack_profile')) || {};
        if (profile.photo) {
            const pic = document.getElementById('topbarProfilePic');
            if (pic) pic.innerHTML = `<img src="${profile.photo}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
        }
    } catch (e) {}
});