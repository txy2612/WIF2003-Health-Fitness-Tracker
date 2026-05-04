let reminders = [];
let idCounter = 1;

const form = document.getElementById("reminderForm");
const list = document.getElementById("reminderList");
const emptyState = document.getElementById("emptyState");
const count = document.getElementById("count");

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    const reminder = {
        id: idCounter++,
        type: document.getElementById("type").value,
        title: document.getElementById("title").value,
        datetime: date + " " + time,
        note: document.getElementById("note").value,
        completed: false
    };

    reminders.push(reminder);
    render();
    form.reset();
});

function render() {
    list.innerHTML = "";
    count.textContent = reminders.length;

    if (reminders.length === 0) {
        emptyState.style.display = "block";
        return;
    } else {
        emptyState.style.display = "none";
    }

    reminders.forEach(r => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center";

        li.innerHTML = `
            <div>
                <strong style="${r.completed ? 'text-decoration: line-through;' : ''}">
                    ${r.type} - ${r.title}
                </strong><br>
                <small class="text-muted">${r.datetime}</small>
                ${r.completed 
                    ? '<span class="badge badge-success ml-2">Done</span>' 
                    : '<span class="badge badge-secondary ml-2">Active</span>'}
            </div>

            <div>
                <button class="btn btn-outline-primary btn-sm mr-1" onclick="toggle(${r.id})">
                    <i class="fas fa-check"></i>
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

function toggle(id) {
    const r = reminders.find(x => x.id === id);
    r.completed = !r.completed;
    render();
}

function removeItem(id) {
    reminders = reminders.filter(x => x.id !== id);
    render();
}

function edit(id) {
    const r = reminders.find(x => x.id === id);
    const newTitle = prompt("Edit title:", r.title);

    if (newTitle && newTitle.trim() !== "") {
        r.title = newTitle;
        render();
    }
}
