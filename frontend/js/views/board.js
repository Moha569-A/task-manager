/**
 * Board view — a drag & drop kanban (Pending → In Progress → Completed).
 * Status changes go through PATCH /api/tasks/{id}, the same endpoint the
 * list view and the edit modal use.
 */
import { api } from "../api.js";
import { openTaskModal } from "../task-modal.js";
import {
  confirmDialog,
  dueChip,
  escapeHtml,
  icon,
  PRIORITY_LABELS,
  spinner,
  STATUS_LABELS,
  STATUS_ORDER,
  toast,
} from "../ui.js";

let tasks = [];

export async function renderBoard(container) {
  container.innerHTML = spinner();
  try {
    tasks = await api("/tasks");
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon(
      "alert-circle",
      28
    )}</span><h3>Couldn't load the board</h3><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="board">
      ${STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return `
        <section class="board-col" data-status="${status}">
          <header class="col-head">
            <span class="status-dot ${status}"></span>
            ${STATUS_LABELS[status]}
            <span class="col-count">${columnTasks.length}</span>
          </header>
          <div class="col-body">
            ${
              columnTasks.length
                ? columnTasks.map((t) => cardHtml(t)).join("")
                : `<div class="board-empty">Nothing here — drag a task in</div>`
            }
          </div>
        </section>`;
      }).join("")}
    </div>`;

  wireBoard(container);
}

function cardHtml(t) {
  const idx = STATUS_ORDER.indexOf(t.status);
  const prev = idx > 0 ? STATUS_ORDER[idx - 1] : null;
  const next = idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;

  return `
    <article class="task-card" draggable="true" data-id="${t.id}">
      <div class="card-top">
        <span class="pill prio-${t.priority}">${icon("flag", 12)}${PRIORITY_LABELS[t.priority]}</span>
        ${dueChip(t)}
      </div>
      <h4 class="card-title" data-action="edit" title="Click to edit">${escapeHtml(t.title)}</h4>
      <div class="card-foot">
        <div class="card-moves">
          ${prev ? `<button class="icon-btn tiny" data-move="${prev}" title="Move to ${STATUS_LABELS[prev]}">${icon("arrow-left", 14)}</button>` : ""}
          ${next ? `<button class="icon-btn tiny" data-move="${next}" title="Move to ${STATUS_LABELS[next]}">${icon("arrow-right", 14)}</button>` : ""}
        </div>
        <div class="card-tools">
          <button class="icon-btn tiny" data-action="edit" title="Edit">${icon("edit", 14)}</button>
          <button class="icon-btn tiny danger" data-action="delete" title="Delete">${icon("trash", 14)}</button>
        </div>
      </div>
    </article>`;
}

function wireBoard(container) {
  const board = container.querySelector(".board");

  // Drag & drop ---------------------------------------------------------
  board.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.id);
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  board.querySelectorAll(".board-col").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const id = +e.dataTransfer.getData("text/plain");
      const task = tasks.find((t) => t.id === id);
      if (!task || task.status === col.dataset.status) return;
      await moveStatus(task, col.dataset.status, container);
    });
  });

  // Buttons (move arrows, edit, delete) — also work on touch devices -----
  board.addEventListener("click", async (e) => {
    const moveBtn = e.target.closest("[data-move]");
    if (moveBtn) {
      const card = moveBtn.closest(".task-card");
      const task = tasks.find((t) => t.id === +card.dataset.id);
      await moveStatus(task, moveBtn.dataset.move, container);
      return;
    }

    const actionBtn = e.target.closest("[data-action]");
    if (!actionBtn) return;
    const card = actionBtn.closest(".task-card");
    const task = tasks.find((t) => t.id === +card.dataset.id);
    if (!task) return;

    if (actionBtn.dataset.action === "edit") {
      openTaskModal(task, () => renderBoard(container));
    } else if (actionBtn.dataset.action === "delete") {
      const ok = await confirmDialog("Delete this task?", `"${task.title}" will be permanently removed.`);
      if (!ok) return;
      try {
        await api(`/tasks/${task.id}`, { method: "DELETE" });
        toast("Task deleted");
        renderBoard(container);
      } catch (err) {
        toast(err.message, "error");
      }
    }
  });
}

async function moveStatus(task, status, container) {
  try {
    await api(`/tasks/${task.id}`, { method: "PATCH", body: { status } });
    toast(`Moved to ${STATUS_LABELS[status]}`);
    renderBoard(container);
  } catch (err) {
    toast(err.message, "error");
  }
}
