/**
 * Tasks view — filterable, searchable list of the user's tasks.
 */
import { api } from "../api.js";
import { openTaskModal } from "../task-modal.js";
import {
  confirmDialog,
  dueChip,
  escapeHtml,
  fmtDate,
  icon,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  spinner,
  STATUS_LABELS,
  STATUS_ORDER,
  toast,
} from "../ui.js";

// View state survives re-renders while you stay on the page.
const state = { q: "", status: "", priority: "", sort: "created_desc" };
let tasks = [];

const NEXT_STATUS = {
  pending: "in_progress",
  in_progress: "completed",
  completed: "pending",
};

export async function renderTasks(container) {
  container.innerHTML = `
    <div class="toolbar">
      <div class="search">
        ${icon("search", 17)}
        <input id="task-search" type="search" placeholder="Search tasks…" value="${escapeHtml(state.q)}" />
      </div>
      <div class="chips" id="status-chips">
        <button class="chip ${state.status === "" ? "active" : ""}" data-status="">All</button>
        ${STATUS_ORDER.map(
          (s) =>
            `<button class="chip ${state.status === s ? "active" : ""}" data-status="${s}">${STATUS_LABELS[s]}</button>`
        ).join("")}
      </div>
      <select class="select-inline" id="priority-filter">
        <option value="">All priorities</option>
        ${PRIORITY_ORDER.map(
          (p) => `<option value="${p}" ${state.priority === p ? "selected" : ""}>${PRIORITY_LABELS[p]}</option>`
        ).join("")}
      </select>
      <select class="select-inline" id="sort-select">
        <option value="created_desc" ${state.sort === "created_desc" ? "selected" : ""}>Newest first</option>
        <option value="created_asc" ${state.sort === "created_asc" ? "selected" : ""}>Oldest first</option>
        <option value="priority" ${state.sort === "priority" ? "selected" : ""}>Priority</option>
        <option value="due_date" ${state.sort === "due_date" ? "selected" : ""}>Due date</option>
        <option value="title" ${state.sort === "title" ? "selected" : ""}>Title A–Z</option>
      </select>
    </div>
    <div id="tasks-list">${spinner()}</div>`;

  // --- wire the toolbar -------------------------------------------------
  let searchTimer;
  container.querySelector("#task-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = e.target.value.trim();
      loadList();
    }, 300);
  });

  container.querySelector("#status-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.status = chip.dataset.status;
    container.querySelectorAll("#status-chips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    loadList();
  });

  container.querySelector("#priority-filter").addEventListener("change", (e) => {
    state.priority = e.target.value;
    loadList();
  });
  container.querySelector("#sort-select").addEventListener("change", (e) => {
    state.sort = e.target.value;
    loadList();
  });

  await loadList();
}

async function loadList() {
  const listEl = document.getElementById("tasks-list");
  if (!listEl) return;
  listEl.innerHTML = spinner();

  try {
    tasks = await api("/tasks", {
      params: { status: state.status, priority: state.priority, q: state.q, sort: state.sort },
    });
    renderList(listEl);
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon(
      "alert-circle",
      28
    )}</span><h3>Couldn't load tasks</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderList(listEl) {
  if (tasks.length === 0) {
    const filtered = state.q || state.status || state.priority;
    listEl.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${icon(filtered ? "search" : "inbox", 28)}</span>
        <h3>${filtered ? "No tasks match your filters" : "No tasks yet"}</h3>
        <p>${
          filtered
            ? "Try a different search term or clear the filters."
            : "Create your first task to get the ball rolling."
        }</p>
      </div>`;
    return;
  }

  listEl.innerHTML = `
    <p class="list-meta-line">${tasks.length} task${tasks.length === 1 ? "" : "s"}</p>
    ${tasks
      .map(
        (t) => `
      <div class="task-row ${t.status}" data-id="${t.id}">
        <button class="status-toggle ${t.status}" data-action="toggle"
                title="Click to move to: ${STATUS_LABELS[NEXT_STATUS[t.status]]}">
          ${icon("check", 13)}
        </button>
        <div class="task-main">
          <div class="task-title">${escapeHtml(t.title)}</div>
          ${t.description ? `<div class="task-desc">${escapeHtml(t.description)}</div>` : ""}
          <div class="task-meta">
            <span class="pill status-${t.status}">${STATUS_LABELS[t.status]}</span>
            <span class="pill prio-${t.priority}">${icon("flag", 12)}${PRIORITY_LABELS[t.priority]}</span>
            ${dueChip(t)}
            <span class="muted small">Created ${fmtDate(t.created_at)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit" title="Edit">${icon("edit", 17)}</button>
          <button class="icon-btn danger" data-action="delete" title="Delete">${icon("trash", 17)}</button>
        </div>
      </div>`
      )
      .join("")}`;

  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const row = btn.closest(".task-row");
    const task = tasks.find((t) => t.id === +row.dataset.id);
    if (!task) return;

    const action = btn.dataset.action;
    try {
      if (action === "toggle") {
        const next = NEXT_STATUS[task.status];
        await api(`/tasks/${task.id}`, { method: "PATCH", body: { status: next } });
        toast(`Moved to ${STATUS_LABELS[next]}`);
        loadList();
      } else if (action === "edit") {
        openTaskModal(task, loadList);
      } else if (action === "delete") {
        const ok = await confirmDialog("Delete this task?", `"${task.title}" will be permanently removed.`);
        if (!ok) return;
        await api(`/tasks/${task.id}`, { method: "DELETE" });
        toast("Task deleted");
        loadList();
      }
    } catch (err) {
      toast(err.message, "error");
    }
  });
}
