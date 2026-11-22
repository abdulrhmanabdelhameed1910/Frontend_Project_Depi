/* ==========================================================
   MediCare – Main.js
   Each page section only runs if its root element exists.
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
    applyProfileToPage(loadProfile());
    initBooking();
    initMyAppointments();
    initMedicalHistory();
    initAllergies();
    initProfileSettings();
    initExportButtons();
    initAnalytics();
    initDoctorManagement();
    initPatientManagement();
    initSpecialtyManagement();
    initAllAppointments();
    initClinicSettings();
});

/* ---------- Patient profile (temporary localStorage storage) ---------- */
// Will be replaced by the .NET API: the profile will come from the database.

const PROFILE_KEY = "medicare_patient_profile";
const DEFAULT_PROFILE = {
    fullName: "Liam Anderson",
    age: "34",
    phone: "+1 (555) 892-3341",
    email: "liam.anderson@email.com",
    address: "1280 Oakridge Avenue, Suite 14, Boston, MA"
};

function loadProfile() {
    try {
        return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(PROFILE_KEY)) };
    } catch (err) {
        return { ...DEFAULT_PROFILE };
    }
}

function saveProfile(profile) {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (err) {
        console.warn("Could not save the profile in this browser.", err);
    }
}

// Updates the sidebar card and the "Welcome back" line on every patient page
function applyProfileToPage(profile) {
    const card = document.querySelector(".profile-card");
    if (!card) return;

    const initials = profile.fullName
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map(word => word[0].toUpperCase()).join("");

    card.querySelector(".avatar").textContent = initials;
    card.querySelector(".profile-name").textContent = profile.fullName;
    card.querySelector(".profile-meta").textContent = `ID: #PT-20489 • Age ${profile.age}`;

    const sub = document.querySelector(".page-sub");
    if (sub) {
        sub.textContent = sub.textContent.replace(/^Welcome back, [^•]+/, `Welcome back, ${profile.fullName} `);
    }
}

/* ---------- Book Appointment page ---------- */

// Temporary data – will be replaced by the .NET API later
const DOCTORS = [
    { id: 1, name: "Dr. Elena Harrison, MD, FACC", specialty: "Cardiology", years: 14, fee: 150 },
    { id: 2, name: "Dr. Nadia Al-Mansoor, MD", specialty: "Dermatology", years: 10, fee: 130 },
    { id: 3, name: "Dr. Julian Mercer, MD", specialty: "Pediatrics", years: 12, fee: 110 },
    { id: 4, name: "Dr. Henrik Lindqvist, MD", specialty: "Orthopedics", years: 16, fee: 160 },
    { id: 5, name: "Dr. Claire Beaumont, MD, PhD", specialty: "Neurology", years: 11, fee: 155 },
    { id: 6, name: "Dr. Samuel Okafor, MD, FACP", specialty: "Internal Medicine", years: 15, fee: 120 }
];

const DATES = [
    { day: "FRI", num: 20 }, { day: "SAT", num: 21 }, { day: "MON", num: 23 },
    { day: "TUE", num: 24 }, { day: "WED", num: 25 }, { day: "THU", num: 26 },
    { day: "FRI", num: 27 }
];

const SLOTS = ["09:00 AM", "10:00 AM", "11:30 AM", "01:00 PM", "02:30 PM", "04:00 PM", "05:15 PM"];

// The patient's existing appointments (used for conflict detection)
const MY_APPOINTMENTS = [
    { date: 20, time: "10:00 AM" },
    { date: 24, time: "02:30 PM" }
];

function initBooking() {
    const root = document.getElementById("bookingPage");
    if (!root) return;

    const state = { doctor: DOCTORS[0], date: 20, time: "11:30 AM" };

    const doctorList = document.getElementById("doctorList");
    const dateList = document.getElementById("dateList");
    const slotList = document.getElementById("slotList");
    const searchInput = document.getElementById("doctorSearch");
    const specialtyFilter = document.getElementById("specialtyFilter");
    const selectedLine = document.getElementById("selectedLine");
    const summaryBox = document.getElementById("summaryBox");
    const summaryText = document.getElementById("summaryText");
    const confirmBtn = document.getElementById("confirmBtn");

    const hasConflict = (date, time) =>
        MY_APPOINTMENTS.some(a => a.date === date && a.time === time);

    function renderDoctors() {
        const q = searchInput.value.trim().toLowerCase();
        const spec = specialtyFilter.value;
        const list = DOCTORS.filter(d =>
            (spec === "all" || d.specialty === spec) && d.name.toLowerCase().includes(q)
        );

        doctorList.innerHTML = list.length
            ? list.map(d => `
          <button type="button" class="doctor-item ${d.id === state.doctor.id ? "selected" : ""}" data-id="${d.id}">
            <span>
              <span class="cell-strong">${d.name}</span><br>
              <span class="cell-muted">${d.specialty} • ${d.years} yrs exp</span>
            </span>
            <span class="doctor-fee">$${d.fee}</span>
          </button>`).join("")
            : `<p class="cell-muted">No doctors match your search.</p>`;
    }

    function renderDates() {
        dateList.innerHTML = DATES.map(d => `
      <button type="button" class="date-tile ${d.num === state.date ? "selected" : ""}" data-date="${d.num}">
        <span class="date-day">${d.day}</span>
        <span class="date-num">${d.num}</span>
      </button>`).join("");
    }

    function renderSlots() {
        slotList.innerHTML = SLOTS.map(t => {
            const conflict = hasConflict(state.date, t);
            const cls = conflict ? "conflict" : t === state.time ? "selected" : "";
            return `
        <button type="button" class="slot ${cls}" data-time="${t}" ${conflict ? 'aria-disabled="true"' : ""}>
          ${t}${conflict ? '<span class="slot-flag">CONFLICT</span>' : ""}
        </button>`;
        }).join("");
    }

    function renderSummary() {
        const d = state.doctor;
        selectedLine.textContent = `Selected: ${d.name} (${d.specialty}) • $${d.fee}`;

        summaryBox.classList.remove("is-done");
        if (state.time) {
            summaryText.textContent = `Nov ${state.date}, 2026 at ${state.time} • ${d.name}`;
            confirmBtn.disabled = false;
        } else {
            summaryText.textContent = "Choose an available time slot to continue.";
            confirmBtn.disabled = true;
        }
    }

    function renderAll() {
        renderDoctors();
        renderDates();
        renderSlots();
        renderSummary();
    }

    /* --- Events --- */
    doctorList.addEventListener("click", e => {
        const item = e.target.closest(".doctor-item");
        if (!item) return;
        state.doctor = DOCTORS.find(d => d.id === Number(item.dataset.id));
        renderAll();
    });

    dateList.addEventListener("click", e => {
        const tile = e.target.closest(".date-tile");
        if (!tile) return;
        state.date = Number(tile.dataset.date);
        if (state.time && hasConflict(state.date, state.time)) state.time = null;
        renderAll();
    });

    slotList.addEventListener("click", e => {
        const slot = e.target.closest(".slot");
        if (!slot) return;
        const time = slot.dataset.time;
        if (hasConflict(state.date, time)) {
            state.time = null;
            renderSlots();
            summaryText.textContent = `You already have an appointment on Nov ${state.date} at ${time}. Please choose another slot.`;
            confirmBtn.disabled = true;
            return;
        }
        state.time = time;
        renderAll();
    });

    searchInput.addEventListener("input", renderDoctors);
    specialtyFilter.addEventListener("change", renderDoctors);

    confirmBtn.addEventListener("click", () => {
        // TODO: send to the .NET API (fetch POST) when the backend is ready
        summaryText.textContent = `Appointment confirmed: Nov ${state.date}, 2026 at ${state.time} with ${state.doctor.name}.`;
        summaryBox.classList.add("is-done");
        confirmBtn.disabled = true;
    });

    renderAll();
}

/* ---------- My Appointments page ---------- */

function initMyAppointments() {
    const table = document.getElementById("appointmentsTable");
    if (!table) return;

    table.addEventListener("click", e => {
        const btn = e.target.closest(".js-cancel");
        if (!btn) return;

        const row = btn.closest("tr");
        const doctor = row.querySelector(".cell-strong").textContent;
        if (!confirm(`Cancel your appointment with ${doctor}?`)) return;

        // TODO: send the cancellation to the .NET API when the backend is ready
        const status = row.querySelector(".js-status");
        status.textContent = "Cancelled";
        status.className = "badge badge-cancelled js-status";

        const actions = row.querySelector(".col-actions");
        actions.innerHTML = '<span class="cell-muted">Cancelled</span>';
    });
}

/* ---------- Medical History page ---------- */

function initMedicalHistory() {
    const form = document.getElementById("historyForm");
    if (!form) return;

    form.addEventListener("submit", e => {
        e.preventDefault();

        // TODO: send the form data to the .NET API when the backend is ready
        const btn = form.querySelector("button[type='submit']");
        const original = btn.textContent;
        btn.textContent = "Saved to EHR";
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
        }, 2000);
    });
}

/* ---------- Allergies page ---------- */

const ALLERGY_CATEGORIES = [
    { title: "Medications", items: ["Penicillin", "Amoxicillin", "Aspirin", "Ibuprofen", "Sulfa Drugs", "Codeine"] },
    { title: "Foods", items: ["Peanuts", "Tree Nuts", "Shellfish", "Dairy / Lactose", "Eggs", "Soy"] },
    { title: "Environmental & Pollen", items: ["Pollen", "Ragweed", "Mold Spores", "Pet Dander"] },
    { title: "Dust, Latex & Stings", items: ["Dust Mites", "Latex", "Bee / Wasp Stings", "Nickel"] }
];

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}

function initAllergies() {
    const root = document.getElementById("allergyPage");
    if (!root) return;

    const selected = new Set(["Penicillin", "Peanuts", "Dust Mites"]);

    const activeList = document.getElementById("activeAllergies");
    const activeCount = document.getElementById("activeCount");
    const categories = document.getElementById("allergyCategories");
    const searchInput = document.getElementById("allergySearch");
    const customInput = document.getElementById("customAllergy");
    const addBtn = document.getElementById("addCustomBtn");
    const syncBtn = document.getElementById("syncBtn");

    function renderActive() {
        activeCount.textContent = selected.size;
        activeList.innerHTML = selected.size
            ? [...selected].map(name => `
          <span class="chip chip-active">${escapeHtml(name)}
            <button type="button" class="chip-remove" data-name="${escapeHtml(name)}" aria-label="Remove ${escapeHtml(name)}">&times;</button>
          </span>`).join("")
            : `<span class="cell-muted">No allergies recorded.</span>`;
    }

    function renderCategories() {
        const q = searchInput.value.trim().toLowerCase();

        const html = ALLERGY_CATEGORIES.map(cat => {
            const items = cat.items.filter(i => i.toLowerCase().includes(q));
            if (!items.length) return "";
            return `
        <div class="allergy-box">
          <div class="allergy-box-title">${escapeHtml(cat.title)}</div>
          <div class="chip-list">
            ${items.map(name => {
                const on = selected.has(name);
                return `<button type="button" class="chip allergen ${on ? "selected" : ""}" data-name="${escapeHtml(name)}">${on ? "✓" : "+"} ${escapeHtml(name)}</button>`;
            }).join("")}
          </div>
        </div>`;
        }).join("");

        categories.innerHTML = html || `<p class="cell-muted">No allergens match your search.</p>`;
    }

    function renderAll() {
        renderActive();
        renderCategories();
    }

    /* --- Events --- */
    root.addEventListener("click", e => {
        const remove = e.target.closest(".chip-remove");
        if (remove) {
            selected.delete(remove.dataset.name);
            renderAll();
            return;
        }

        const chip = e.target.closest(".allergen");
        if (chip) {
            const name = chip.dataset.name;
            selected.has(name) ? selected.delete(name) : selected.add(name);
            renderAll();
        }
    });

    searchInput.addEventListener("input", renderCategories);

    function addCustom() {
        const value = customInput.value.trim();
        if (!value) return;

        // Reuse the official spelling if it already exists in a category or in the active list
        const known = [...ALLERGY_CATEGORIES.flatMap(c => c.items), ...selected]
            .find(n => n.toLowerCase() === value.toLowerCase());

        selected.add(known || value);
        customInput.value = "";
        renderAll();
    }

    addBtn.addEventListener("click", addCustom);
    customInput.addEventListener("keydown", e => {
        if (e.key === "Enter") addCustom();
    });

    syncBtn.addEventListener("click", () => {
        // TODO: send [...selected] to the .NET API when the backend is ready
        const original = syncBtn.textContent;
        syncBtn.textContent = "Allergy Profile Synced";
        syncBtn.disabled = true;
        setTimeout(() => {
            syncBtn.textContent = original;
            syncBtn.disabled = false;
        }, 2000);
    });

    renderAll();
}

/* ---------- Profile Settings page ---------- */

function initProfileSettings() {
    const form = document.getElementById("profileForm");
    if (!form) return;

    const fields = ["fullName", "age", "phone", "email", "address"];

    // Fill the form with the saved profile
    const saved = loadProfile();
    fields.forEach(name => { form.elements[name].value = saved[name]; });

    form.addEventListener("submit", e => {
        e.preventDefault();

        const updated = {};
        fields.forEach(name => { updated[name] = form.elements[name].value.trim(); });

        if (!updated.fullName) {
            form.elements.fullName.focus();
            return;
        }

        // TODO: send the updated profile to the .NET API when the backend is ready
        saveProfile(updated);
        applyProfileToPage(updated);

        const btn = form.querySelector("button[type='submit']");
        const original = btn.textContent;
        btn.textContent = "Profile Updated";
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
        }, 2000);
    });
}

/* ---------- Admin: Export buttons (shared by all admin pages) ---------- */

function initExportButtons() {
    document.querySelectorAll("[data-export]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.export === "pdf") {
                window.print();
            } else {
                exportTableToCsv();
            }
        });
    });
}

// Exports the first table on the page as a CSV file (opens in Excel)
function exportTableToCsv() {
    const table = document.querySelector("table.table");
    if (!table) {
        alert("There is no table to export on this page.");
        return;
    }

    const rows = [...table.querySelectorAll("tr")].map(tr =>
        [...tr.children]
            .map(cell => `"${cell.innerText.replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`)
            .join(",")
    );

    const blob = new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "medicare-export.csv";
    link.click();
    URL.revokeObjectURL(url);
}

/* ---------- Admin: Analytics page (Chart.js) ---------- */

function initAnalytics() {
    const monthlyCanvas = document.getElementById("monthlyChart");
    if (!monthlyCanvas) return;
    if (typeof Chart === "undefined") {
        console.warn("Chart.js did not load. Check your internet connection.");
        return;
    }

    const C = {
        blue: "#4A90D9", cyan: "#61C4D8", navy: "#1D3048", mid: "#8DBCEB",
        sky: "#B9DDF5", amber: "#F59E0B", grey: "#CBD5E1", text: "#5B6B7C", grid: "#E3ECF4"
    };

    Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = C.text;

    // Temporary data – will be replaced by the .NET API later
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const appointments = [300, 325, 350, 375, 395, 410, 380, 410, 440, 450, 480, 505];
    const revenue = [40, 44, 47, 51, 54, 57, 51, 55, 58, 60, 64, 68].map(v => v * 1000);

    // 1) Monthly appointments (bars) + revenue (line, right axis)
    new Chart(monthlyCanvas, {
        data: {
            labels: months,
            datasets: [
                {
                    type: "bar", label: "Appointments", data: appointments, backgroundColor: C.blue,
                    borderRadius: 4, yAxisID: "y", order: 2
                },
                {
                    type: "line", label: "Revenue ($)", data: revenue, borderColor: C.cyan, backgroundColor: C.cyan,
                    tension: 0.35, pointRadius: 3, yAxisID: "y1", order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { position: "top", labels: { usePointStyle: true, boxWidth: 10 } },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.yAxisID === "y1"
                            ? `Revenue: $${ctx.parsed.y.toLocaleString("en-US")}`
                            : `Appointments: ${ctx.parsed.y}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, max: 600, grid: { color: C.grid } },
                y1: {
                    position: "right", beginAtZero: true, max: 80000,
                    grid: { drawOnChartArea: false },
                    ticks: { callback: v => v.toLocaleString("en-US") }
                }
            }
        }
    });

    // 2) Most requested specialties (doughnut)
    new Chart(document.getElementById("specialtyChart"), {
        type: "doughnut",
        data: {
            labels: ["Cardiology", "Internal Med", "Pediatrics", "Dermatology", "Orthopedics"],
            datasets: [{ data: [30, 22, 20, 16, 12], backgroundColor: [C.blue, C.cyan, C.navy, C.mid, C.sky], borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "58%",
            plugins: {
                legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}%` } }
            }
        }
    });

    // 3) Appointment status statistics (horizontal bars)
    new Chart(document.getElementById("statusChart"), {
        type: "bar",
        data: {
            labels: ["Completed", "Confirmed", "Pending", "Cancelled"],
            datasets: [{
                data: [4420, 210, 100, 90], backgroundColor: [C.blue, C.cyan, C.amber, C.grey],
                borderRadius: 4, barThickness: 22
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, max: 4500, grid: { color: C.grid } },
                y: { grid: { display: false } }
            }
        }
    });
}

/* ---------- Admin: Doctor Management page ---------- */

function initDoctorManagement() {
    const pendingList = document.getElementById("pendingList");
    if (!pendingList) return;

    const activeBody = document.getElementById("activeDoctors");
    const navBadge = document.getElementById("pendingBadge");

    // Keeps the sidebar badge and the empty message in sync with the pending rows
    function refreshPending() {
        const count = pendingList.querySelectorAll(".pending-row").length;
        navBadge.textContent = count;
        navBadge.classList.toggle("hidden", count === 0);

        if (count === 0 && !pendingList.querySelector(".empty-note")) {
            pendingList.insertAdjacentHTML("beforeend",
                '<p class="empty-note">No pending credential approvals.</p>');
        }
    }

    pendingList.addEventListener("click", e => {
        const approveBtn = e.target.closest(".js-approve");
        const rejectBtn = e.target.closest(".js-reject");
        if (!approveBtn && !rejectBtn) return;

        const row = (approveBtn || rejectBtn).closest(".pending-row");
        const doctor = row.dataset;

        if (approveBtn) {
            // TODO: send the approval to the .NET API when the backend is ready
            activeBody.insertAdjacentHTML("beforeend", `
        <tr>
          <td class="cell-strong">${escapeHtml(doctor.name)}</td>
          <td class="cell-link">${escapeHtml(doctor.specialty)}</td>
          <td>${escapeHtml(doctor.years)} Years</td>
          <td class="cell-strong">$${escapeHtml(doctor.fee)}</td>
          <td><span class="badge badge-active">Active</span></td>
          <td class="col-actions"><button class="btn btn-sm" type="button">Edit Profile</button></td>
        </tr>`);
        } else if (!confirm(`Reject the credential application of ${doctor.name}?`)) {
            return;
        }

        row.remove();
        refreshPending();
    });
}

/* ---------- Admin: Patient Management page ---------- */

function initPatientManagement() {
    const search = document.getElementById("patientSearch");
    if (!search) return;

    const rows = [...document.querySelectorAll("#patientRows tr:not(#patientEmpty)")];
    const emptyRow = document.getElementById("patientEmpty");

    search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        let visible = 0;

        rows.forEach(row => {
            // Search by patient name or ID only (first column)
            const match = row.cells[0].textContent.toLowerCase().includes(query);
            row.classList.toggle("hidden", !match);
            if (match) visible++;
        });

        emptyRow.classList.toggle("hidden", visible > 0);
    });
}

/* ---------- Admin: Specialty Management page ---------- */

function initSpecialtyManagement() {
    const form = document.getElementById("specialtyForm");
    if (!form) return;

    const body = document.getElementById("specialtyRows");
    const emptyRow = document.getElementById("specialtyEmpty");
    const nameInput = document.getElementById("specialtyName");
    const descInput = document.getElementById("specialtyDesc");
    const error = document.getElementById("specialtyError");

    const getRows = () => [...body.querySelectorAll(".specialty-row")];

    function refreshEmpty() {
        emptyRow.classList.toggle("hidden", getRows().length > 0);
    }

    form.addEventListener("submit", e => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const description = descInput.value.trim();

        if (!name || !description) {
            error.textContent = "Please fill in both the specialty name and description.";
            return;
        }

        const exists = getRows().some(r => r.dataset.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            error.textContent = `"${name}" already exists.`;
            return;
        }

        // TODO: send the new specialty to the .NET API when the backend is ready
        body.insertAdjacentHTML("beforeend", `
      <tr class="specialty-row" data-name="${escapeHtml(name)}" data-doctors="0">
        <td class="cell-strong">${escapeHtml(name)}</td>
        <td class="cell-desc">${escapeHtml(description)}</td>
        <td class="doctor-count">0</td>
        <td class="col-actions"><button class="btn btn-sm btn-danger-outline js-delete" type="button">Delete</button></td>
      </tr>`);

        form.reset();
        error.textContent = "";
        refreshEmpty();
    });

    [nameInput, descInput].forEach(input =>
        input.addEventListener("input", () => { error.textContent = ""; })
    );

    body.addEventListener("click", e => {
        const btn = e.target.closest(".js-delete");
        if (!btn) return;

        const row = btn.closest(".specialty-row");
        const doctors = Number(row.dataset.doctors);
        const warning = doctors > 0
            ? `${doctors} doctor(s) are assigned to ${row.dataset.name}. Delete this specialty anyway?`
            : `Delete the ${row.dataset.name} specialty?`;

        if (!confirm(warning)) return;

        // TODO: send the deletion to the .NET API when the backend is ready
        row.remove();
        refreshEmpty();
    });
}

/* ---------- Admin: All Appointments page ---------- */

function initAllAppointments() {
    const search = document.getElementById("appointmentSearch");
    if (!search) return;

    const statusFilter = document.getElementById("statusFilter");
    const rows = [...document.querySelectorAll("#appointmentRows tr:not(#appointmentEmpty)")];
    const emptyRow = document.getElementById("appointmentEmpty");

    function applyFilters() {
        const query = search.value.trim().toLowerCase();
        const status = statusFilter.value;
        let visible = 0;

        rows.forEach(row => {
            // Text search covers ID, patient and doctor & specialty (first three columns)
            const text = [row.cells[0], row.cells[1], row.cells[2]]
                .map(cell => cell.textContent)
                .join(" ")
                .toLowerCase();

            const match = text.includes(query) && (status === "all" || row.dataset.status === status);
            row.classList.toggle("hidden", !match);
            if (match) visible++;
        });

        emptyRow.classList.toggle("hidden", visible > 0);
    }

    search.addEventListener("input", applyFilters);
    statusFilter.addEventListener("change", applyFilters);
}

/* ---------- Admin: Clinic Settings page ---------- */

function initClinicSettings() {
    const form = document.getElementById("clinicSettingsForm");
    if (!form) return;

    form.addEventListener("submit", e => {
        e.preventDefault();

        // TODO: send the settings to the .NET API when the backend is ready
        const btn = form.querySelector("button[type='submit']");
        const original = btn.textContent;
        btn.textContent = "Settings Saved";
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
        }, 2000);
    });
}