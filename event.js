const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", () => {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  const toggle = $(".menu-toggle");
  const nav = $(".nav-links");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  if ($("#home-events")) loadHomeEvents();
  if ($("#event-list")) loadEventList();
  if ($("#manage-table")) loadManageEvents();
  if ($("#event-form")) setupInsertForm();
  if ($("#load-update-form")) setupUpdateForm();
  if ($("#delete-form")) setupDeleteForm();
});

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function readableDate(value) {
  if (!value) return "Date to be announced";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? escapeHTML(value) : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function readableTime(value) {
  if (!value) return "";
  const parts = String(value).split(":");
  if (parts.length < 2) return escapeHTML(value);
  const d = new Date();
  d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
function eventType(event) {
  const text = `${event.name} ${event.description}`.toLowerCase();
  if (text.includes("sport") || text.includes("game") || text.includes("match")) return "SPORTS";
  if (text.includes("cultur") || text.includes("dance") || text.includes("music") || text.includes("annual")) return "CULTURE";
  if (text.includes("workshop") || text.includes("seminar")) return "WORKSHOP";
  return "CAMPUS EVENT";
}
function notice(message, isError = false, target = $("#notice")) {
  if (!target) return;
  target.textContent = message;
  target.classList.remove("hidden", "notice-error");
  if (isError) target.classList.add("notice-error");
}
function showFormMessage(target, message, isError = false) {
  if (!target) return;
  target.textContent = message;
  target.classList.remove("hidden", "message-error", "message-success");
  target.classList.add(isError ? "message-error" : "message-success");
}
function getFormData(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  return {
    name: values.name.trim(),
    date: values.date,
    time: values.time,
    venue: values.venue.trim(),
    description: values.description.trim()
  };
}

async function loadHomeEvents() {
  const container = $("#home-events");
  try {
    const events = await api("/api/events");
    if (!events.length) {
      container.innerHTML = `<div class="loading-card">No events have been added yet. <a href="insert.html">Create your first event →</a></div>`;
      return;
    }
    container.innerHTML = events.slice(0, 3).map((event, index) => `
      <article class="event-card">
        <div class="event-card-image event-image-${index % 3}"><span class="event-type">${escapeHTML(eventType(event))}</span><span class="event-card-number">${String(index + 1).padStart(2, "0")}</span></div>
        <div class="event-card-body"><p class="event-date">${escapeHTML(readableDate(event.date))} <span>·</span> ${escapeHTML(readableTime(event.time))}</p><h3>${escapeHTML(event.name)}</h3><p class="event-description">${escapeHTML(event.description)}</p><div class="event-card-footer"><span>⌖ ${escapeHTML(event.venue)}</span><a href="list.html" aria-label="See all events">↗</a></div></div>
      </article>`).join("");
  } catch (error) {
    container.innerHTML = `<div class="loading-card error-card">${escapeHTML(error.message)}<br><small>Check that the server is running and your MySQL configuration is correct.</small></div>`;
  }
}

let allEvents = [];
async function loadEventList() {
  const container = $("#event-list");
  try {
    allEvents = await api("/api/events");
    renderEventList(allEvents);
    const search = $("#event-search");
    if (search) search.addEventListener("input", () => {
      const term = search.value.toLowerCase().trim();
      renderEventList(allEvents.filter(e => `${e.name} ${e.venue} ${e.description}`.toLowerCase().includes(term)));
    });
  } catch (error) {
    container.innerHTML = `<div class="loading-card error-card">${escapeHTML(error.message)}</div>`;
    $("#event-count").textContent = "Unable to load events";
  }
}
function renderEventList(events) {
  const container = $("#event-list");
  $("#event-count").textContent = `${events.length} event${events.length === 1 ? "" : "s"} found`;
  $("#empty-state").classList.toggle("hidden", events.length !== 0);
  container.innerHTML = events.map((event, index) => `
    <article class="event-card">
      <div class="event-card-image event-image-${index % 3}"><span class="event-type">${escapeHTML(eventType(event))}</span><span class="event-card-number">${String(event.id).padStart(2, "0")}</span></div>
      <div class="event-card-body"><p class="event-date">${escapeHTML(readableDate(event.date))} <span>·</span> ${escapeHTML(readableTime(event.time))}</p><h3>${escapeHTML(event.name)}</h3><p class="event-description">${escapeHTML(event.description)}</p><div class="event-card-footer"><span>⌖ ${escapeHTML(event.venue)}</span><a href="update.html?id=${encodeURIComponent(event.id)}" title="Update event">Edit ↗</a></div></div>
    </article>`).join("");
}

let managedEvents = [];
async function loadManageEvents() {
  const tbody = $("#manage-table");
  try {
    managedEvents = await api("/api/events");
    renderManageEvents(managedEvents);
    const search = $("#manage-search");
    if (search) search.addEventListener("input", () => {
      const term = search.value.toLowerCase().trim();
      renderManageEvents(managedEvents.filter(e => `${e.id} ${e.name} ${e.venue} ${e.description}`.toLowerCase().includes(term)));
    });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-error">${escapeHTML(error.message)}</td></tr>`;
    $("#manage-count").textContent = "Unable to load events";
  }
}
function renderManageEvents(events) {
  const tbody = $("#manage-table");
  $("#manage-count").textContent = `${events.length} record${events.length === 1 ? "" : "s"}`;
  $("#manage-empty").classList.toggle("hidden", events.length > 0);
  if (!events.length) {
    tbody.innerHTML = `<tr><td colspan="6">No events to display.</td></tr>`;
    return;
  }
  tbody.innerHTML = events.map(event => `<tr>
    <td><span class="id-pill">#${escapeHTML(event.id)}</span></td><td><b>${escapeHTML(event.name)}</b></td>
    <td>${escapeHTML(readableDate(event.date))}<small class="table-sub">${escapeHTML(readableTime(event.time))}</small></td>
    <td>${escapeHTML(event.venue)}</td><td class="table-description">${escapeHTML(event.description)}</td>
    <td><div class="table-actions"><a class="small-action" href="update.html?id=${encodeURIComponent(event.id)}">Edit</a><a class="small-action action-delete" href="delete.html?id=${encodeURIComponent(event.id)}">Delete</a></div></td>
  </tr>`).join("");
}

function setupInsertForm() {
  const form = $("#event-form");
  const message = $("#form-message");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    button.textContent = "Saving…";
    try {
      await api("/api/events", { method: "POST", body: JSON.stringify(getFormData(form)) });
      showFormMessage(message, "Event saved successfully. Opening the event list…");
      form.reset();
      setTimeout(() => location.href = "list.html", 900);
    } catch (error) {
      showFormMessage(message, error.message, true);
    } finally {
      button.disabled = false;
      button.innerHTML = 'Save event <span>→</span>';
    }
  });
}

function setupUpdateForm() {
  const loadForm = $("#load-update-form");
  const updateForm = $("#update-form");
  const loadMessage = $("#load-message");
  const updateMessage = $("#update-message");
  let currentId = null;
  const queryId = new URLSearchParams(location.search).get("id");
  if (queryId) loadForm.elements.id.value = queryId;

  loadForm.addEventListener("submit", async event => {
    event.preventDefault();
    currentId = loadForm.elements.id.value;
    try {
      const item = await api(`/api/events/${encodeURIComponent(currentId)}`);
      updateForm.elements.name.value = item.name;
      updateForm.elements.date.value = String(item.date).slice(0, 10);
      updateForm.elements.time.value = String(item.time).slice(0, 5);
      updateForm.elements.venue.value = item.venue;
      updateForm.elements.description.value = item.description;
      updateForm.classList.remove("hidden");
      loadMessage.classList.add("hidden");
    } catch (error) {
      updateForm.classList.add("hidden");
      showFormMessage(loadMessage, error.message, true);
    }
  });

  updateForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentId) return;
    const button = $('button[type="submit"]', updateForm);
    button.disabled = true;
    try {
      await api(`/api/events/${encodeURIComponent(currentId)}`, { method: "PUT", body: JSON.stringify(getFormData(updateForm)) });
      showFormMessage(updateMessage, "Changes saved successfully. Returning to Manage Events…");
      setTimeout(() => location.href = "list1.html", 900);
    } catch (error) {
      showFormMessage(updateMessage, error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  if (queryId) loadForm.requestSubmit();
}

function setupDeleteForm() {
  const form = $("#delete-form");
  const preview = $("#delete-preview");
  const message = $("#delete-message");
  const queryId = new URLSearchParams(location.search).get("id");
  if (queryId) form.elements.id.value = queryId;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const id = form.elements.id.value;
    const button = $('button[type="submit"]', form);
    try {
      const item = await api(`/api/events/${encodeURIComponent(id)}`);
      preview.innerHTML = `<b>${escapeHTML(item.name)}</b><span>${escapeHTML(readableDate(item.date))} · ${escapeHTML(item.venue)}</span><p>${escapeHTML(item.description)}</p>`;
      preview.classList.remove("hidden");
      button.textContent = "Confirm permanent delete";
      button.classList.remove("button-danger");
      button.classList.add("button-danger-confirm");
      button.dataset.confirm = "true";
      button.onclick = async clickEvent => {
        clickEvent.preventDefault();
        if (!confirm(`Permanently delete "${item.name}" (ID ${id})? This cannot be undone.`)) return;
        button.disabled = true;
        try {
          await api(`/api/events/${encodeURIComponent(id)}`, { method: "DELETE" });
          showFormMessage(message, "Event deleted. Returning to Manage Events…");
          setTimeout(() => location.href = "list1.html", 900);
        } catch (error) {
          showFormMessage(message, error.message, true);
          button.disabled = false;
        }
      };
      showFormMessage(message, "Please check the event above, then confirm the deletion.");
    } catch (error) {
      preview.classList.add("hidden");
      showFormMessage(message, error.message, true);
    }
  });
}
