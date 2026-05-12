// ── STATE (Load from localStorage) ──
// Fetch saved reminders, or start with an empty array if none exist
let reminders = JSON.parse(localStorage.getItem("fittrack_reminders")) || [];

// Calculate the next available ID so we don't overwrite existing ones
let idCounter = reminders.length > 0 ? Math.max(...reminders.map(r => r.id)) + 1 : 1;

const form = document.getElementById("reminderForm");
const list = document.getElementById("reminderList");
const emptyState = document.getElementById("emptyState");
const count = document.getElementById("count");

// ── LOCAL STORAGE HELPER ──
// We call this function every time the array changes
function saveReminders() {
    localStorage.setItem("fittrack_reminders", JSON.stringify(reminders));
}

// ── ADD REMINDER ──
form.addEventListener("submit", function (e) {
    e.preventDefault();

    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    // Safety check in case the title input is removed
    const titleEl = document.getElementById("title");
    const titleVal = titleEl ? titleEl.value : "";

    const reminder = {
        id: idCounter++,
        type: document.getElementById("type").value,
        title: titleVal,
        datetime: date + " " + time,
        note: document.getElementById("note").value,
        completed: false
    };

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

                <button class="btn btn-danger btn-sm" onclick="removeItem(${r.id})">
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
    }
}

function removeItem(id) {
    reminders = reminders.filter(x => x.id !== id);
    saveReminders(); // Save change
    render();
}

function edit(id) {
    const r = reminders.find(x => x.id === id);
    if (r) {
        const newTitle = prompt("Edit title:", r.title);
        if (newTitle !== null && newTitle.trim() !== "") {
            r.title = newTitle;
            saveReminders(); // Save change
            render();
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