// ── STATE (Load from localStorage) ──
const REMINDER_STORAGE_KEY = "fittrack_reminders";
const NOTIFICATION_API_URL = "http://localhost:3000/api/v1/notification";

// Fetch saved reminders, or start with an empty array if none exist
let reminders = readStoredReminders();

// Calculate the next available ID so we don't overwrite existing ones
let idCounter = reminders.length > 0 ? Math.max(...reminders.map(r => r.id)) + 1 : 1;

const form = document.getElementById("reminderForm");
const list = document.getElementById("reminderList");
const emptyState = document.getElementById("emptyState");
const count = document.getElementById("count");
let reminderToDeleteId = null;

function readStoredReminders() {
    try {
        return JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

async function parseApiResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (error) {
        return {};
    }
}

async function requestNotificationApi(path, options = {}) {
    const response = await fetch(`${NOTIFICATION_API_URL}${path}`, options);
    const data = await parseApiResponse(response);

    if (!response.ok) {
        const error = new Error(data.detail || data.message || "Notification request failed.");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

function getReminderChannel(type) {
    if (type === "Other") return "other";
    return "workout";
}

function buildReminderMessage(reminder) {
    return reminder.note && reminder.note.trim()
        ? reminder.note.trim()
        : `Time for ${reminder.type}.`;
}

async function createBackendReminder(reminder) {
    const data = await requestNotificationApi("", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            channel: getReminderChannel(reminder.type),
            title: reminder.title || reminder.type,
            message: buildReminderMessage(reminder),
            scheduledFor: reminder.scheduledFor,
            completed: reminder.completed
        })
    });

    return data._id || data.id || null;
}

async function updateBackendReminder(reminder, updates) {
    if (!reminder.backendId) return;
    
    await requestNotificationApi(`/${reminder.backendId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
    });
}

async function deleteBackendReminder(reminder) {
    if (!reminder.backendId) return;

    await requestNotificationApi(`/${reminder.backendId}`, {
        method: "DELETE"
    });
}

async function requestBrowserNotificationPermission() {
    if (!("Notification" in window) || Notification.permission !== "default") return;

    try {
        await Notification.requestPermission();
    } catch (error) {
        console.warn("Browser notification permission request failed", error);
    }
}

// ── LOCAL STORAGE HELPER ──
// We call this function every time the array changes
function saveReminders() {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));

    //  updates the bell instantly 
    // only call if this function exists (layout.js is called before notification.js in html)
    if (typeof updateNotificationBadge === "function") {
        updateNotificationBadge();
    }

    if (typeof window.scheduleFitTrackReminders === "function") {
        window.scheduleFitTrackReminders();
    }
}

// ── ADD REMINDER ──
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const type = document.getElementById("type").value;

    // only allow upcoming date/time to be selected
    const selectedDateTime = new Date(date + "T" + time);// takes 2026-05-12 + T + 18:30
    const now = new Date();// creaye a real Date object

    if (selectedDateTime <= now) {// reject 
        alert("Please choose an upcoming date and time.");
        return;
    }

    // Safety check in case the title input is removed
    const titleEl = document.getElementById("title");
    const titleVal = titleEl ? titleEl.value : "";

    const reminder = {
        id: idCounter++,
        backendId: null,
        type: type,
        title: titleVal || type,
        datetime: date + " " + time,
        scheduledFor: selectedDateTime.toISOString(),
        note: document.getElementById("note").value,
        completed: false,
        notificationShownAt: null
    };

    await requestBrowserNotificationPermission();

    try {
        reminder.backendId = await createBackendReminder(reminder);
    } catch (error) {
        console.warn("Reminder saved locally, but backend scheduling failed", error);
    }

    reminders.push(reminder);
    saveReminders(); // Save to local storage
    render();
    form.reset();
});

// ── RENDER LIST ──
function render() {
    list.innerHTML = "";

    // UPDATED COUNT LOGIC: Only count reminders that are NOT completed
    const activeReminders = reminders.filter(r => !r.completed);
    count.textContent = activeReminders.length;

    if (reminders.length === 0) {
        emptyState.style.display = "block";
        return;
    } else {
        emptyState.style.display = "none";
    }

    reminders.forEach(r => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        // Display logic for the title
        const displayTitle = r.title ? ` - ${r.title}` : '';

        li.innerHTML = `
            <div>
                <strong style="${r.completed ? 'text-decoration: line-through; color: #a1a1a1;' : ''}">
                    ${r.type}${displayTitle}
                </strong><br>
                <small class="text-muted">${r.datetime}</small>
                ${r.completed
                ? '<span class="badge badge-success ml-2">Done</span>'
                : '<span class="badge badge-secondary ml-2">Active</span>'}
            </div>

            <div>
                <button class="btn btn-outline-primary btn-sm mr-1" onclick="toggle(${r.id})">
                    <i class="fas ${r.completed ? 'fa-undo' : 'fa-check'}"></i>
                </button>

                <button class="btn btn-sm mr-1" onclick="edit(${r.id})" style="color:#4e73df;">
                    <i class="fas fa-pencil-alt"></i>
                </button>

                <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${r.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        list.appendChild(li);
    });
}

// ── ACTIONS ──
function toggle(id) {
    const r = reminders.find(x => x.id === id);
    if (r) {
        r.completed = !r.completed;
        saveReminders(); // Save change
        render();

        updateBackendReminder(r, { completed: r.completed }).catch(error => {
            console.warn("Failed to update backend reminder", error);
        });
    }
}

function removeItem(id) {
    const reminder = reminders.find(x => x.id === id);
    reminders = reminders.filter(x => x.id !== id);
    saveReminders(); // Save change
    render();

    if (reminder) {
        deleteBackendReminder(reminder).catch(error => {
            console.warn("Failed to delete backend reminder", error);
        });
    }
}

function openDeleteModal(id) {
    reminderToDeleteId = id;
    $('#deleteModal').modal('show');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    if (reminderToDeleteId !== null) {
        removeItem(reminderToDeleteId);
        reminderToDeleteId = null;
    }

    $('#deleteModal').modal('hide');
});

function edit(id) {
    const r = reminders.find(x => x.id === id);
    if (r) {
        const newTitle = prompt("Edit title:", r.title);
        if (newTitle !== null && newTitle.trim() !== "") {
            r.title = newTitle;
            saveReminders(); // Save change
            render();

            updateBackendReminder(r, { title: r.title }).catch(error => {
                console.warn("Failed to update backend reminder title", error);
            });
        }
    }
}

render(); // Initial render on page load

document.addEventListener("DOMContentLoaded", function () {
    const list = document.getElementById("insightsList");
    if (!list) return;

    const insights = [
        getStepWeekInsight(),
        getWorkoutComparisonInsight(),
        getWorkoutStreakInsight(),
        getHydrationWeekInsight(),
        getWeekendWorkoutInsight(),
        getStepGoalInsight(),
        getWorkoutReminderInsight(),
        getWaterInsight(),
        getMealReminderInsight()
    ];

    const filtered = insights.filter(i => i !== null && i !== "");

    if (filtered.length === 0) {// shows 'You're all caught up!'
        list.innerHTML = `
            <li class="list-group-item text-center text-muted py-4">
                <i class="fas fa-check-circle fa-2x text-gray-300 mb-2"></i>
                <p class="mb-0">You're all caught up! No new insights right now.</p>
            </li>
        `;
        return;
    }

    const MAX_SHOW = 5;
    let showingAll = false; //show more/less toggle logic

    function renderInsights() {
        list.innerHTML = "";

        // when showingAll boolean -> true -> filtered
        //                         -> false -> filtered.slice(0, MAX_SHOW)
        const itemsToShow = showingAll ? filtered : filtered.slice(0, MAX_SHOW);

        itemsToShow.forEach(text => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex align-items-center";
            li.innerHTML = `
                <i class="fas fa-fw fa-info-circle text-primary mr-3"></i>
                <span>${text}</span>
            `;
            list.appendChild(li);
        });

        if (filtered.length > MAX_SHOW) {
            const btnLi = document.createElement("li");
            btnLi.className = "list-group-item text-center";

            btnLi.innerHTML = `
                <button class="btn btn-outline-primary btn-sm" id="toggleInsightsBtn">
                    ${showingAll ? "Show less" : `Show ${filtered.length - MAX_SHOW} more insights`}
                </button>
            `;// if collapese -> "Show 3 or more insights"; if expanded -> "Show less"

            list.appendChild(btnLi);

            document.getElementById("toggleInsightsBtn").addEventListener("click", function () {
                showingAll = !showingAll;
                renderInsights();
            });
        }
    }

    renderInsights();
});
