const API_URL = "http://localhost:3000/api/v1/notification";
const OLD_STORAGE_KEY = "fittrack_reminders";

let reminders = [];
let reminderToDeleteId = null;
let reminderToEditId = null;

const form = document.getElementById("reminderForm");
const list = document.getElementById("reminderList");
const emptyState = document.getElementById("emptyState");
const count = document.getElementById("count");
const statusBox = document.getElementById("reminderStatus");
const editForm = document.getElementById("editReminderForm");

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function api(path = "", options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(data.detail || data.message || "Notification request failed.");
    }

    return data;
}

function showStatus(message, type = "danger") {
    statusBox.className = `alert alert-${type} mb-3`;
    statusBox.textContent = message;
}

function clearStatus() {
    statusBox.className = "alert mb-3 d-none";
    statusBox.textContent = "";
}

function setBusy(isBusy) {
    document
        .querySelectorAll("#reminderList button, #confirmDeleteBtn, #editReminderForm button")
        .forEach(button => {
            button.disabled = isBusy;
        });
}

// calls window.scheduleFitTrackReminders()
// to refresj 'shared browder notification scheduling' after creating a reminder
function refreshSharedReminderUi() {
    if (typeof updateNotificationBadge === "function") updateNotificationBadge();
    if (typeof window.scheduleFitTrackReminders === "function") window.scheduleFitTrackReminders();
}

function getChannel(type) {
    return type === "Other" ? "other" : "workout";
}

function getReminderDate(reminder) {
    const dateValue = reminder.scheduledFor || String(reminder.datetime || "").replace(" ", "T");
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInput(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function toTimeInput(date) {
    return [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
    ].join(":");
}

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

// Purpose: creayes backend reminder object
// Frontend must send backend consistent data shape
function buildReminderPayload({ type, title, note, scheduledFor, completed = false }) {
    const message = note && note.trim() ? note.trim() : `Time for ${type}.`;

    return {
        channel: getChannel(type),
        type,
        title: title || type,
        message,
        scheduledFor,// used to calculate delay
        completed,// used to track if sent
    };
}

async function migrateOldLocalReminders() {
    const saved = localStorage.getItem(OLD_STORAGE_KEY);
    if (!saved) return;

    let oldReminders = [];
    try {
        oldReminders = JSON.parse(saved) || [];
    } catch (error) {
        localStorage.removeItem(OLD_STORAGE_KEY);
        return;
    }

    try {
        for (const oldReminder of oldReminders) {
            const scheduledDate = getReminderDate(oldReminder);

            // Past reminders cannot be created in the backend, so skip them.
            if (!scheduledDate || scheduledDate <= new Date()) continue;

            // sends reminder to backend, must be stored in DB for email scheduler to find them later
            await api("", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildReminderPayload({
                    type: oldReminder.type,
                    title: oldReminder.title || oldReminder.type,
                    note: oldReminder.note,
                    scheduledFor: scheduledDate.toISOString(),
                    completed: Boolean(oldReminder.completed),
                })),
            });
        }

        localStorage.removeItem(OLD_STORAGE_KEY);
    } catch (error) {
        showStatus("Could not migrate old browser reminders. Start the backend and refresh.");
    }
}

async function loadReminders() {
    clearStatus();
    list.innerHTML = `
        <li class="list-group-item text-center text-muted py-4">
            Loading reminders...
        </li>
    `;
    emptyState.style.display = "none";

    try {
        await migrateOldLocalReminders();
        const data = await api("");
        reminders = Array.isArray(data) ? data : [];
        reminders.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
        render();
        refreshSharedReminderUi();
    } catch (error) {
        reminders = [];
        render();
        showStatus("Could not load reminders from the backend. Start the backend and try again.");
    }
}

function render() {
    list.innerHTML = "";
    count.textContent = reminders.filter(reminder => !reminder.completed).length;

    if (reminders.length === 0) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    reminders.forEach(reminder => {
        const titleText = reminder.title && reminder.title !== reminder.type
            ? ` - ${reminder.title}`
            : "";

        const item = document.createElement("li");
        item.className = "list-group-item d-flex justify-content-between align-items-center";
        item.innerHTML = `
            <div>
                <strong style="${reminder.completed ? "text-decoration: line-through; color: #a1a1a1;" : ""}">
                    ${escapeHtml(reminder.type)}${escapeHtml(titleText)}
                </strong><br>
                <small class="text-muted">${escapeHtml(formatDateTime(reminder.scheduledFor))}</small>
                ${reminder.completed
                    ? '<span class="badge badge-success ml-2">Done</span>'
                    : '<span class="badge badge-secondary ml-2">Active</span>'}
            </div>

            <div>
                <button class="btn btn-outline-primary btn-sm mr-1" onclick="toggle('${escapeHtml(reminder.id)}')">
                    <i class="fas ${reminder.completed ? "fa-undo" : "fa-check"}"></i>
                </button>
                <button class="btn btn-sm mr-1" onclick="edit('${escapeHtml(reminder.id)}')" style="color:#4e73df;">
                    <i class="fas fa-pencil-alt"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${escapeHtml(reminder.id)}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

//  request for browser permission
async function requestBrowserNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
    }
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearStatus();

    // collects type , date, time, and note
    const type = document.getElementById("type").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const note = document.getElementById("note").value;
    const scheduledDate = new Date(`${date}T${time}`);

    if (!type || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        showStatus("Please choose a reminder type and an upcoming date and time.");
        return;
    }

    try {
        setBusy(true);
        await requestBrowserNotificationPermission();

        const createdReminder = await api("", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildReminderPayload({
                type,
                title: type,
                note,
                scheduledFor: scheduledDate.toISOString(),
            })),
        });

        reminders.push(createdReminder);
        reminders.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
        form.reset();
        render();
        refreshSharedReminderUi();
    } catch (error) {
        showStatus(error.message || "Failed to create reminder.");
    } finally {
        setBusy(false);
    }
});

async function toggle(id) {
    const reminder = reminders.find(item => item.id === id);
    if (!reminder) return;

    try {
        setBusy(true);
        const updatedReminder = await api(`/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: !reminder.completed }),
        });

        reminders = reminders.map(item => item.id === id ? updatedReminder : item);
        render();
        refreshSharedReminderUi();
    } catch (error) {
        showStatus(error.message || "Failed to update reminder.");
    } finally {
        setBusy(false);
    }
}

function openDeleteModal(id) {
    reminderToDeleteId = id;
    $("#deleteModal").modal("show");
}

document.getElementById("confirmDeleteBtn").addEventListener("click", async function () {
    if (!reminderToDeleteId) return;

    try {
        setBusy(true);
        await api(`/${reminderToDeleteId}`, { method: "DELETE" });
        reminders = reminders.filter(item => item.id !== reminderToDeleteId);
        reminderToDeleteId = null;
        $("#deleteModal").modal("hide");
        render();
        refreshSharedReminderUi();
    } catch (error) {
        showStatus(error.message || "Failed to delete reminder.");
    } finally {
        setBusy(false);
    }
});

function edit(id) {
    const reminder = reminders.find(item => item.id === id);
    if (!reminder) return;

    const scheduledDate = getReminderDate(reminder);
    if (!scheduledDate) {
        showStatus("This reminder has an invalid time and cannot be edited.");
        return;
    }

    reminderToEditId = id;
    document.getElementById("editTitle").value = reminder.title || reminder.type;
    document.getElementById("editDate").value = toDateInput(scheduledDate);
    document.getElementById("editTime").value = toTimeInput(scheduledDate);
    $("#editModal").modal("show");
}

editForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!reminderToEditId) return;

    const title = document.getElementById("editTitle").value.trim();
    const date = document.getElementById("editDate").value;
    const time = document.getElementById("editTime").value;
    const scheduledDate = new Date(`${date}T${time}`);

    if (!title || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        showStatus("Please enter a name and an upcoming date and time.");
        return;
    }

    try {
        setBusy(true);
        const updatedReminder = await api(`/${reminderToEditId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                scheduledFor: scheduledDate.toISOString(),
                browserNotifiedAt: null,
            }),
        });

        reminders = reminders.map(item => item.id === reminderToEditId ? updatedReminder : item);
        reminders.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
        reminderToEditId = null;
        $("#editModal").modal("hide");
        render();
        refreshSharedReminderUi();
    } catch (error) {
        showStatus(error.message || "Failed to edit reminder.");
    } finally {
        setBusy(false);
    }
});

loadReminders();

document.addEventListener("DOMContentLoaded", function () {
    const insightsList = document.getElementById("insightsList");
    if (!insightsList) return;

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
    ].filter(text => text !== null && text !== "");

    if (insights.length === 0) {
        insightsList.innerHTML = `
            <li class="list-group-item text-center text-muted py-4">
                <i class="fas fa-check-circle fa-2x text-gray-300 mb-2"></i>
                <p class="mb-0">You're all caught up! No new insights right now.</p>
            </li>
        `;
        return;
    }

    const MAX_SHOW = 5;
    let showingAll = false;

    function renderInsights() {
        insightsList.innerHTML = "";
        const visibleInsights = showingAll ? insights : insights.slice(0, MAX_SHOW);

        visibleInsights.forEach(text => {
            const item = document.createElement("li");
            item.className = "list-group-item d-flex align-items-center";
            item.innerHTML = `
                <i class="fas fa-fw fa-info-circle text-primary mr-3"></i>
                <span>${text}</span>
            `;
            insightsList.appendChild(item);
        });

        if (insights.length > MAX_SHOW) {
            const buttonItem = document.createElement("li");
            buttonItem.className = "list-group-item text-center";
            buttonItem.innerHTML = `
                <button class="btn btn-outline-primary btn-sm" id="toggleInsightsBtn">
                    ${showingAll ? "Show less" : `Show ${insights.length - MAX_SHOW} more insights`}
                </button>
            `;
            insightsList.appendChild(buttonItem);

            document.getElementById("toggleInsightsBtn").addEventListener("click", function () {
                showingAll = !showingAll;
                renderInsights();
            });
        }
    }

    renderInsights();
});
