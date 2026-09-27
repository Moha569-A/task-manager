/**
 * Create/edit task modal — shared by the dashboard, list and board views.
 */
import { api } from "./api.js";
import {
  closeModal,
  escapeHtml,
  icon,
  openModal,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  toast,
} from "./ui.js";

export function openTaskModal(task = null, onSaved) {
  const isEdit = !!task;
  const status = task?.status ?? "pending";
  const priority = task?.priority ?? "medium";

  const overlay = openModal(`
    <form class="modal-form" novalidate>
      <div class="modal-head">
        <h3>${isEdit ? "Edit task" : "Create a new task"}</h3>
        <button type="button" class="icon-btn" data-close aria-label="Close">${icon("x", 18)}</button>
      </div>

      <div class="field">
        <label for="tf-title">Title <span class="req">*</span></label>
        <input id="tf-title" name="title" maxlength="200" placeholder="e.g. Ship the beta changelog"
               value="${escapeHtml(task?.title ?? "")}" autocomplete="off" />
        <p class="field-error" data-error="title"></p>
      </div>

      <div class="field">
        <label for="tf-desc">Description</label>
        <textarea id="tf-desc" name="description" rows="3" maxlength="2000"
                  placeholder="Add context, links, acceptance criteria…">${escapeHtml(task?.description ?? "")}</textarea>
      </div>

      <div class="field-row">
        <div class="field">
          <label>Status</label>
          <div class="pill-radio" data-name="status">
            ${STATUS_ORDER.map(
              (v) => `
              <button type="button" class="pill-option ${v === status ? "active" : ""}" data-value="${v}">
                <span class="status-dot ${v}"></span>${STATUS_LABELS[v]}
              </button>`
            ).join("")}
          </div>
        </div>
      </div>

      <div class="field">
        <label>Priority</label>
        <div class="pill-radio" data-name="priority">
          ${PRIORITY_ORDER.map(
            (v) => `
            <button type="button" class="pill-option ${v === priority ? "active" : ""}" data-value="${v}">
              <span class="prio-dot prio-${v}"></span>${PRIORITY_LABELS[v]}
            </button>`
          ).join("")}
        </div>
      </div>

      <div class="field">
        <label for="tf-due">Due date</label>
        <input id="tf-due" type="date" name="due_date" value="${task?.due_date ?? ""}" />
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? "Save changes" : "Create task"}</button>
      </div>
    </form>
  `);

  // Pill-style radio groups
  overlay.querySelectorAll(".pill-radio").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-option");
      if (!btn) return;
      group.querySelectorAll(".pill-option").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const form = overlay.querySelector("form");
  const errorEl = overlay.querySelector('[data-error="title"]');
  const submitBtn = form.querySelector('[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) {
      errorEl.textContent = "Give the task a title first.";
      form.elements.title.focus();
      return;
    }
    errorEl.textContent = "";

    const payload = {
      title,
      description: form.elements.description.value.trim() || null,
      status: overlay.querySelector('.pill-radio[data-name="status"] .active').dataset.value,
      priority: overlay.querySelector('.pill-radio[data-name="priority"] .active').dataset.value,
      due_date: form.elements.due_date.value || null,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? "Saving…" : "Creating…";
    try {
      if (isEdit) {
        await api(`/tasks/${task.id}`, { method: "PATCH", body: payload });
      } else {
        await api("/tasks", { method: "POST", body: payload });
      }
      closeModal();
      toast(isEdit ? "Task updated" : "Task created");
      if (onSaved) onSaved();
    } catch (err) {
      toast(err.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? "Save changes" : "Create task";
    }
  });
}
